# ADR 0002: Tenant auth — cookies, single session, device trust, capability cookies

| | |
|---|---|
| **Status** | Proposed |
| **Date** | 2026-10-20 |
| **Deciders** | Platform / security |
| **Related** | [ADR 0001](./0001-one-d1-database-per-account.md) (one API Worker + Worker D1 + SPA assets per env) |

## Context

Each tenant environment is one Cloudflare Worker (APIs) + three Remix SPAs on the **same hostname**, all using the **same auth logic**:

| SPA | Principal | Domain record |
|-----|-----------|----------------|
| **CRM** | Adviser / staff | `users` |
| **Client** | Client | `clients` |
| **Contact** | Introducer | contact individual |

They call `/api/*` on the same origin.

Goals:

- Cookie-based auth for all three SPAs (no tokens in `localStorage`).
- **Per-worker signing keys** — compromise of one env’s secret must not forge cookies for another.
- **Single active login** — a new successful login bumps `session_version` and invalidates any previous cookie for that login.
- **Idle auto-logout ~30 minutes** — sensitive data; warning in the UI; activity in any tab keeps the session alive.
- **Performance** — after a full ACL check (e.g. “can this user read client 23?”), issue a short-lived **capability cookie** so follow-up requests for that resource can skip a heavy ACL recompute.
- **New device** — email one-time code before establishing trust; remember the device afterwards.
- Stay compatible with Workers + D1.

## Decision

### 1. Cookie model (all SPAs)

| Cookie       | Purpose                       | Lifetime                                     | HttpOnly             | Notes                                                                                 |
| ------------ | ----------------------------- | -------------------------------------------- | -------------------- | ------------------------------------------------------------------------------------- |
| `tf_session` | Primary session               | Sliding **30 min idle** (see §7)             | Yes                  | Sealed. Bound to `login_id`, `principal_type`, `session_version`, `device_id`. |
| `tf_csrf`    | Double-submit CSRF            | Matches session                              | **No** (JS-readable) | Required for state-changing API calls.                                                |
| `tf_cap_*`   | Capability / “access” cookies | **≤ 30 minutes**                             | Yes                  | Scoped: resource type + id + actions. See §5.                                         |
| `tf_device`  | Trusted-device marker         | Long-lived (e.g. 90d)                        | Yes                  | Device public id + rotation counter; **not** sufficient alone to authenticate.        |

All cookies: `Secure`, `SameSite=Lax` (or `Strict` if UX allows), `Path=/`, host-only (no parent-domain sharing across tenants).

Each SPA has its **own login screen**. The client screen only creates a session when `principal_type = client`; CRM only `user`; contact only `introducer`. The API repeats that check on every route.

If the SPAs are path-prefixed, set the session cookie `Path` to that SPA so a client cookie is not sent to CRM. Still enforce `principal_type` on the server. Do **not** put session secrets in SPA JS.

### 2. Per-worker signing key

Each deployed environment has its own secret:

```text
SESSION_SIGNING_KEY   # Worker secret / encrypted env — unique per workers.id
```

- Generated at provision time; stored only as a Worker secret (never in Shared D1 plaintext).
- Platform registry may store a **key id** / rotation metadata, not the key material.
- Rotate by issuing a new key id; accept previous key for a short overlap window, then drop.
- Platform Worker uses a **different** secret — never reuse tenant keys.
- Provisioning also installs this env’s **CSP and security headers** (see §9). They are part of the worker deploy, not a later manual step.

Blast radius of a leaked key = **one environment**, not the whole platform.

### 3. Shared `logins` table (not embedded credentials)

All three SPAs use one auth implementation. Credentials live in a `logins` table in Worker D1, linked to exactly one principal:

| Column | Notes |
|--------|--------|
| `id` | Login id (cookie subject) |
| `principal_type` | `user` \| `client` \| `introducer` |
| `principal_id` | Id in `users`, `clients`, or contact individuals |
| `email` | Unique **with** `principal_type` (same address may be a client and an introducer) |
| `password_hash` | bcrypt / Argon2id; null when a client login is passkey-only |
| `session_version` | Integer; see §4 |
| `enabled` | Disable without deleting the domain row |
| lockout / `failed_attempts` | Shared by all SPAs |

**Unique indexes**

```sql
CREATE UNIQUE INDEX idx_logins_principal ON logins(principal_type, principal_id);
CREATE UNIQUE INDEX idx_logins_email ON logins(principal_type, email);
```

One login per domain row. The same email may exist once per principal type, not twice for two clients.

**Login screens (same auth code, different gate)**

| SPA | Accepts |
|-----|---------|
| CRM | `principal_type = user` |
| Client | `principal_type = client` |
| Contact (introducer) | `principal_type = introducer` |

A correct password for a `user` row submitted on the client screen is a failed login. Do not redirect them to the other app.

**Why a link table, not columns on user / client / contact**

- One code path for password, OTP, `session_version`, and lockout.
- A client or introducer row often exists **before** they have a portal login.
- Fact-find and contact JSON stay free of password hashes.
- Uniqueness is declared once, as the two indexes above.

Domain tables stay the profile (`users`, `clients`, contacts). Today’s nested `LoginDetailSchema` on the CRM user should move here; the user row keeps adviser settings only.

`trusted_devices.login_id` → `logins.id` (see §6).

### 4. Session validity — `session_version` is enough

**Request auth does not read a sessions table.**

A request is valid when all of these hold:

1. `tf_session` signature verifies with this worker’s key.
2. Cookie `exp` is in the future (idle window; §7).
3. `cookie.session_version === logins.session_version` for `cookie.login_id`.
4. `logins.enabled` is true.

**Login (any SPA):** verify password (+ device/OTP if required) → `session_version += 1` → set cookie `{ login_id, principal_type, principal_id, session_version, device_id, exp }`.

Any earlier cookie fails the version check. That is the single-active-session rule. Logout, password change, and admin force-logout also bump `session_version` and clear cookies.

`auth_events` **(append-only audit, not on the accept path):** login, logout, otp, device trusted, session replaced. Useful for support and FCA trace. Do not SELECT it to decide whether the cookie is valid.

Cache `session_version` briefly (Worker memory / Cache API) keyed by `login_id`; drop the cache entry whenever the version is bumped.

### 5. Capability cookies (skip heavy ACL on repeat access)

**Idea:** After a successful full ACL check for `client_id=23` with `read` (and/or `write`), set a short-lived capability cookie so the next request can skip recomputing group/linkage rules.

**Decision: allow as an optimisation, with hard safety rules — never as the only auth.**

Every API request still:

1. Validates `tf_session` (signature, expiry, `session_version` on `logins`).
2. Then **either** validates a matching capability cookie **or** runs full ACL.

**Capability cookie payload (signed, HttpOnly), example:**

```ts
{
  sv: session_version,      // must match logins.session_version
  login_id: login_id,
  typ: "client",
  id: "23",
  act: ["read"],            // or ["read","write"] — least privilege
  ver: acl_generation,      // optional: bump when roles/group access change
  exp: now + 30min
}
```

**Safety rules:**

| Rule | Why |
|------|-----|
| Bind to `login_id` + `session_version` | Stolen cap cookie useless after re-login / logout. |
| Max TTL **30 minutes** (or less) | Limits stale grant window. |
| Scope to **one resource** (+ actions) | No “god mode” capability cookie. |
| Cap cookie **never** replaces session auth | Only skips ACL **recompute**. |
| On permission change, bump `acl_generation` (user or group) and ignore old caps | Prevents retained write after access revoked. |
| Sensitive / irreversible actions (delete, export, send to lender) **always** full ACL | Defence in depth. |
| `SameSite` + CSRF on mutations | Cap cookie alone must not enable CSRF write. |

**Naming:** e.g. `tf_cap_client_23` or a single `tf_cap` bag with a small sealed map (watch cookie size limits ~4KB). Prefer few active caps; LRU discard server-side if needed.

**Missed risk if done naively:** “skip auth check” must **not** mean skip session validation — only skip **authorisation graph** walk.

### 6. New device → email code → remember device

**Decision:**

1. On login, compute a **device fingerprint id** (stable random id in `tf_device` cookie + server record). First visit: no trusted device → after password OK, require **email OTP** (6-digit, 10 min, single-use, rate-limited).
2. On OTP success: insert `trusted_devices` (`device_id`, `login_id`, `label`, `created_at`, `last_seen_at`, `revoked_at`).
3. Later logins from that device: password without OTP, unless the device row is revoked.
4. Revoke a device → next login from it needs OTP again. Existing cookie stays valid until idle expiry or `session_version` bump (logout / new login / password change).
5. A new successful login still bumps `session_version`, so the previous browser’s cookie dies even on a trusted device.

**Email OTP hardening:** rate limit per user + IP; invalidate on password change; do not reveal whether email exists beyond generic messaging where possible.

**Remember device ≠ remember password.** Device cookie is not a session.

### 7. Auto-logout (30 minutes, multi-tab)

Data is highly sensitive. **Idle timeout is 30 minutes** of no user activity.

| Layer | Behaviour |
|-------|-----------|
| **UI (all 3 SPAs)** | Shared idle clock. At **25 minutes** show a logout warning (“Stay signed in”). At **30 minutes** call logout and return to the login screen. |
| **API** | `tf_session.exp` is at most 30 minutes ahead. Expired cookie → `401`. The UI timer is not the only control. |
| **What counts as activity** | User input (click, key, touch) and user-driven API calls. Background polling must **not** refresh `exp` or the idle clock. |

**Multiple tabs**

- Store `lastActivityAt` in `localStorage` (same origin). Every tab listens for `storage` events (or `BroadcastChannel`).
- Activity in **any** tab resets the 30-minute clock in **all** tabs and may refresh the session cookie (`exp = now + 30m`) once, not on a tight poll.
- The warning shows only when the shared clock hits 25 minutes. “Stay signed in” writes a new `lastActivityAt` and refreshes the cookie.
- Logout in one tab broadcasts logout; other tabs clear state and redirect. Server bumps `session_version` so a leftover tab cannot keep calling APIs.

### 8. Crypto and transport baseline

- Argon2id or bcrypt (cost ≥ 12) for passwords; never store reversible passwords.
- Prefer **sealed** cookies (encrypt + MAC, e.g. iron-session style) over signed-only JWT in cookies — hides `user_id` / caps from casual inspection.
- TLS only; HSTS on tenant hostnames.
- Lockout / progressive delay after failed passwords.
- Audit: `auth_events` (login, logout, otp_sent, otp_ok, otp_fail, device_trust, session_replaced).

### 9. Strict CSP (set when each worker is provisioned)

Each SPA is served by that environment’s Worker. **Strict CSP is a response header on those asset responses**, written into the worker config at **provision** (and kept on every upgrade). A missing header on one env is a gap; do not rely on a `<meta>` tag alone.

Minimum for all three SPAs:

- `Content-Security-Policy` with `default-src 'self'`, `object-src 'none'`, `base-uri 'self'`, `frame-ancestors 'none'`, `form-action 'self'`
- No `unsafe-inline` / `unsafe-eval` in `script-src` (nonces or hashes if a bootstrap script needs them)
- `X-Content-Type-Options: nosniff`
- `Referrer-Policy: strict-origin-when-cross-origin`
- HSTS on the tenant hostname

Third-party script, font, or connect hosts are an explicit allowlist change, not a relaxed default. The provision template is the place this is applied so every new worker/env gets it.

### 10. Passkeys and authenticator MFA

Session cookies stay as they are. This section is how someone **proves** who they are before `session_version` is bumped.

| Principal | Target | Why |
|-----------|--------|-----|
| **Client** | **Passkey-first** (WebAuthn) | Phishing-resistant. No password to reuse or phish. Right default for a client portal in 2026. |
| **User** (adviser) | **Mandatory MFA**. Prefer a passkey or security key. Authenticator TOTP is the fallback. | Staff see many clients’ data. Password-only is not acceptable. |
| **Introducer** | Same as advisers: mandatory MFA, passkey/security key preferred, TOTP fallback. | External party with access to case data. |

**Do not make client login passkey-only with no way back.** Passkey-first means everyday login is a passkey. It does not mean a client who loses every device is locked out, or that a vulnerable customer with no smartphone cannot be served.

Limits to design for:

| Limit | What to do |
|-------|------------|
| **First enrollment** | There is no passkey until one is registered. Send a single-use email link to register the first passkey. |
| **Recovery** | Lost phone and no synced passkey needs a second path (email one-time code, or adviser-assisted reset). That path is the weak point: rate-limit it, audit it, and do not make it easier than the passkey. |
| **Synced passkeys** | iCloud / Google sync is good UX and means the cloud account is part of the trust chain. Still stronger than a shared password. |
| **In-app browsers** | WebViews (some email and social apps) often cannot run WebAuthn. Tell the client to open the link in the system browser. |
| **No suitable device** | Consumer Duty: do not block a client who cannot use a passkey. Supervised fallback (one-time email code, or in-branch with the adviser) stays available and is logged. |
| **Support** | Staff cannot ask for “the password”. Reset is “revoke credentials and send a new enrollment link”. |
| **What a passkey does not replace** | Idle logout, CSP, `principal_type` checks, `session_version`, and capability-cookie rules still apply after login. |

**Authenticator (TOTP) vs passkey.** A TOTP app stops reused stolen passwords. It does **not** stop a real-time phishing site that relays the code. A passkey or hardware key does. For advisers and introducers, ship TOTP so MFA is mandatory immediately, and allow a passkey/security key to satisfy MFA without the TOTP prompt. SMS is not the MFA method (SIM swap).

Store WebAuthn credentials in a `login_credentials` table (`login_id`, credential id, public key, sign counter) so one login can hold more than one passkey. Client `password_hash` may be null.

## Consequences

### Benefits

- Tenant key isolation matches one-Worker-per-env (ADR 0001).
- One `logins` row and one auth path for CRM, client, and introducer SPAs.
- Single session is a `session_version` compare — no sessions read on the request path.
- Idle logout is 30 minutes, shared across tabs, and enforced by cookie `exp` as well as the UI.
- Client login can be passkey-first without giving up recovery or staff MFA.

### Costs / complexity

- `session_version` lookup on the hot path (cache briefly; invalidate on bump).
- Capability cookies need careful invalidation (`acl_generation`).
- Email delivery dependency for new devices.
- Cookie size limits if too many caps are issued.
- Idle clock must stay in sync across tabs or one idle tab can log the user out while another is in use.

## What you might have missed

| Gap | Guidance |
|-----|----------|
| **CSRF** | Cookie auth ⇒ CSRF tokens (or `SameSite=Strict` + careful UX) on all state-changing APIs. |
| **XSS** | HttpOnly session/cap cookies; strict CSP on SPAs; treat XSS as session theft. |
| **Cap cookie ≠ skip auth** | Always verify session; caps only shortcut ACL. |
| **Stale permissions** | Bind caps to `acl_generation` / session version; short TTL. |
| **Logout** | Bump `session_version`, clear session + cap cookies, broadcast to other tabs. |
| **Password change / disable login** | Bump `session_version`; revoke devices optionally. |
| **Session fixation** | Bump `session_version` on every successful login. |
| **Clock skew** | Idle enforced by server `exp` as well as the UI clock. |
| **Multi-SPA / shared cookie** | Same auth code; cookie carries `principal_type` so client/introducer tokens cannot call CRM routes. |
| **Client vs adviser** | Authorise by `principal_type` on every route. Separate cookie names are unnecessary if that check is mandatory. |
| **Admin impersonation** | Separate short-lived, audited impersonation token — never reuse normal session. |
| **Export / bulk download** | Always full ACL + rate limit; no cap-only. |
| **WAF / IP allowlist** | Complementary (ADR 0001); not a substitute for auth. |
| **Key storage** | Worker secrets only; plan rotation; never commit keys. |
| **Email OTP phishing** | Show device/location in email; cooldown; optional “deny” link that revokes pending login. |
| **Shared computers** | Shorter idle timeout for advisers; “this is a public device” skips trust. |
| **Concurrent tabs** | Shared `lastActivityAt`; a second **login** elsewhere bumps `session_version` and kills every tab. |
| **D1 latency** | Cache session validation briefly; still re-check version on sensitive actions. |
| **Legal / FCA** | Retain auth audit events; access to client data may need logging beyond caps. |

## Alternatives considered

| Alternative | Why not (for v1) |
|-------------|------------------|
| Cookie JWT only, no `session_version` in D1 | Cannot kill an existing cookie on new login or logout. |
| Live `sessions` row checked on every request | Extra read for no extra validity guarantee once `session_version` is compared. Use `auth_events` for audit only. |
| Embed password + `session_version` on user, client, and contact | Three copies of auth logic; logins often created later than the domain row. |
| Capability token in memory (SPA) | XSS-exposed; worse than HttpOnly cookie. |
| One signing key for all tenants | Cross-tenant forge risk — rejected. |
| Redis/KV session store | Optional later for global platform; Worker D1 is enough per env. |
| Passkey-only clients, no recovery | Best phishing resistance, but locks out lost devices, in-app browsers, and some vulnerable customers. |
| SMS as MFA | SIM swap; weaker than TOTP and much weaker than WebAuthn. |

## Follow-up work

- [ ] DDL: `logins` with unique `(principal_type, principal_id)` and `(principal_type, email)`; `trusted_devices`; `login_credentials` (passkeys); `auth_events` (audit only)
- [ ] Move CRM `LoginDetailSchema` credentials onto `logins`
- [ ] Provisioning: per-worker `SESSION_SIGNING_KEY` **and** strict CSP / security headers on the SPA asset responses
- [ ] Three login screens; each rejects the other `principal_type`s
- [ ] Auth routes: login, logout, OTP challenge, device revoke, passkey register/assert, TOTP enroll (shared code)
- [ ] Middleware: session verify (`session_version`) → `principal_type` → optional cap verify → else ACL
- [ ] Shared idle module: 25 min warning, 30 min logout, `localStorage` activity across tabs
- [ ] CSRF for all three SPAs

## References

- [ADR 0001](./0001-one-d1-database-per-account.md)
- [OWASP Session Management Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html)
- [OWASP CSRF Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html)
- [Cloudflare Workers — Secrets](https://developers.cloudflare.com/workers/configuration/secrets/)
- [WebAuthn / passkeys](https://www.w3.org/TR/webauthn-3/)
- [OWASP Content Security Policy Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Content_Security_Policy_Cheat_Sheet.html)
