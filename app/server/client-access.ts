import type { Client } from "~/models/client/client";
import type { User, ClientAccessCapabilities } from "~/models/admin/user";
import type { UserSession } from "./UserSession";

const EMPTY_CAPABILITIES: ClientAccessCapabilities = {
    read: false,
    write: false,
    delete: false,
};

function orCapabilities(
    a: ClientAccessCapabilities | null | undefined,
    b: ClientAccessCapabilities | null | undefined
): ClientAccessCapabilities {
    const cap = (c: ClientAccessCapabilities | null | undefined, k: keyof ClientAccessCapabilities) =>
        c?.[k] === true;
    return {
        read: cap(a, "read") || cap(b, "read"),
        write: cap(a, "write") || cap(b, "write"),
        delete: cap(a, "delete") || cap(b, "delete"),
    };
}

function mergeCapsFromUserEntries(
    caps: ClientAccessCapabilities,
    primaryAdvisorId: string | null | undefined,
    userEntries: User["access_to_user_entries"]
): ClientAccessCapabilities {
    if (primaryAdvisorId == null) return caps;
    let out = caps;
    for (const entry of userEntries ?? []) {
        const ids = entry?.user_ids ?? [];
        if (ids.includes(primaryAdvisorId) && entry.capabilities) {
            out = orCapabilities(out, entry.capabilities);
        }
    }
    return out;
}

function mergeCapsFromGroupEntries(
    caps: ClientAccessCapabilities,
    groupId: string | null | undefined,
    groupEntries: User["access_to_sub_group_entries"]
): ClientAccessCapabilities {
    if (groupId == null) return caps;
    let out = caps;
    for (const entry of groupEntries ?? []) {
        const linkages = entry?.group_linkages ?? [];
        if (linkages.includes(groupId) && entry.capabilities) {
            out = orCapabilities(out, entry.capabilities);
        }
    }
    return out;
}

/**
 * Returns the current user's capabilities for a client (read, write, delete, edit_compliance).
 * - Primary advisor gets all capabilities.
 * - Otherwise capabilities are merged from: access_to_all_users_in_group (same group),
 *   access_to_all_sub_groups (sub-groups), access_to_user_entries (specific users),
 *   access_to_sub_group_entries (specific groups). Multiple matching entries are ORed.
 */
export function userClientPermission(
    session: UserSession,
    client: Client,
    user: User
): ClientAccessCapabilities {
    if (client.primary_advisor_id === session.user_id) {
        return { read: true, write: true, delete: true };
    }

    // TODO - if user has access to case that user s linked to then allow access to this client

    let caps: ClientAccessCapabilities = { ...EMPTY_CAPABILITIES };
    const groupMatch = client.group_id === session.group_id;
    if (groupMatch && user.access_to_all_users_in_group) {
        caps = orCapabilities(caps, user.access_to_all_users_in_group);
    }

    const subGroupMatch =
        client.group_id != null &&
        session.group_id != null &&
        client.group_id.startsWith(session.group_id + ".");
    if (subGroupMatch && user.access_to_all_sub_groups) {
        caps = orCapabilities(caps, user.access_to_all_sub_groups);
    }

    caps = mergeCapsFromUserEntries(caps, client.primary_advisor_id, user.access_to_user_entries);
    caps = mergeCapsFromGroupEntries(caps, client.group_id, user.access_to_sub_group_entries);
    return caps;
}
