import { describe, it, expect, vi, beforeEach } from "vitest";
import {
    parseChangelog,
    parseChangelogFromUrl,
    fetchChangelogFromUrl,
    filterEntriesByVersionRange,
    isPrerelease,
    type ChangelogEntry,
} from "./changelogParser";

describe("changelogParser", () => {
    describe("isPrerelease", () => {
        it("should identify alpha versions", () => {
            expect(isPrerelease("3.5.0-alpha.1")).toBe(true);
            expect(isPrerelease("3.5.0-alpha1")).toBe(true);
            expect(isPrerelease("v3.5.0-alpha.2")).toBe(true);
        });

        it("should identify beta versions", () => {
            expect(isPrerelease("3.5.0-beta.2")).toBe(true);
            expect(isPrerelease("3.5.0-beta1")).toBe(true);
            expect(isPrerelease("v3.5.0-beta.2")).toBe(true);
        });

        it("should identify rc versions", () => {
            expect(isPrerelease("3.5.0-rc.1")).toBe(true);
            expect(isPrerelease("3.5.0-rc1")).toBe(true);
        });

        it("should identify other pre-release versions", () => {
            expect(isPrerelease("3.5.0-pre.1")).toBe(true);
            expect(isPrerelease("3.5.0-dev")).toBe(true);
            expect(isPrerelease("3.5.0-snapshot")).toBe(true);
            expect(isPrerelease("3.5.0-canary")).toBe(true);
            expect(isPrerelease("3.5.0-next")).toBe(true);
        });

        it("should not identify stable versions as pre-release", () => {
            expect(isPrerelease("3.5.0")).toBe(false);
            expect(isPrerelease("3.5.26")).toBe(false);
            expect(isPrerelease("v3.5.0")).toBe(false);
            expect(isPrerelease("1.0.0")).toBe(false);
        });
    });

    describe("parseChangelog", () => {
        it("should parse a simple changelog with version header", () => {
            const changelog = `## [3.5.26](https://github.com/vuejs/core/compare/v3.5.25...v3.5.26) (2025-12-18)

### Bug Fixes

* fix: handle edge case in compiler
* fix: resolve memory leak

### Features

* feat: add new API endpoint
* feat: support new configuration option`;

            const entries = parseChangelog(changelog);

            expect(entries).toHaveLength(1);
            expect(entries[0].version).toBe("3.5.26");
            expect(entries[0].date).toBe("2025-12-18");
            expect(entries[0].link).toBe("https://github.com/vuejs/core/compare/v3.5.25...v3.5.26");
            expect(entries[0].fixes).toHaveLength(2);
            expect(entries[0].feat).toHaveLength(2);
            expect(entries[0].fixes[0]).toContain("edge case");
            expect(entries[0].feat[0]).toContain("new API endpoint");
        });

        it("should parse changelog with security fixes", () => {
            const changelog = `## [3.5.26](https://github.com/vuejs/core/compare/v3.5.25...v3.5.26) (2025-12-18)

### Security

* security: fix CVE-2024-1234
* security: patch vulnerability in parser

### Bug Fixes

* fix: minor bug fix`;

            const entries = parseChangelog(changelog);

            expect(entries).toHaveLength(1);
            expect(entries[0].security).toHaveLength(2);
            expect(entries[0].security[0]).toContain("CVE-2024-1234");
        });

        it("should parse changelog with breaking changes", () => {
            const changelog = `## [3.5.26](https://github.com/vuejs/core/compare/v3.5.25...v3.5.26) (2025-12-18)

### Breaking Changes

* breaking: remove deprecated API
* breaking: change default behavior

### Features

* feat: new feature`;

            const entries = parseChangelog(changelog);

            expect(entries).toHaveLength(1);
            expect(entries[0].breaking).toHaveLength(2);
            expect(entries[0].breaking[0]).toContain("deprecated API");
        });

        it("should parse changelog with performance improvements", () => {
            const changelog = `## [3.5.26](https://github.com/vuejs/core/compare/v3.5.25...v3.5.26) (2025-12-18)

### Performance Improvements

* performance: optimize query execution
* performance: reduce memory usage

### Bug Fixes

* fix: minor fix`;

            const entries = parseChangelog(changelog);

            expect(entries).toHaveLength(1);
            expect(entries[0].performance).toHaveLength(2);
            expect(entries[0].performance[0]).toContain("query execution");
        });

        it("should ignore pre-release versions", () => {
            const changelog = `## [3.5.26](https://github.com/vuejs/core/compare/v3.5.25...v3.5.26) (2025-12-18)

### Bug Fixes

* fix: stable release fix

## [3.5.0-beta.2](https://github.com/vuejs/core/compare/v3.5.0-beta.1...v3.5.0-beta.2) (2025-11-01)

### Features

* feat: beta feature

## [3.5.0-alpha.1](https://github.com/vuejs/core/compare/v3.4.33...v3.5.0-alpha.1) (2025-10-01)

### Features

* feat: alpha feature`;

            const entries = parseChangelog(changelog);

            expect(entries).toHaveLength(1);
            expect(entries[0].version).toBe("3.5.26");
            expect(entries[0].fixes).toHaveLength(1);
        });

        it("should parse multiple versions", () => {
            const changelog = `## [3.5.26](https://github.com/vuejs/core/compare/v3.5.25...v3.5.26) (2025-12-18)

### Bug Fixes

* fix: bug fix 1

## [3.5.25](https://github.com/vuejs/core/compare/v3.5.24...v3.5.25) (2025-11-24)

### Bug Fixes

* fix: bug fix 2

## [3.5.24](https://github.com/vuejs/core/compare/v3.5.23...v3.5.24) (2025-11-07)

### Bug Fixes

* fix: bug fix 3`;

            const entries = parseChangelog(changelog);

            expect(entries).toHaveLength(3);
            expect(entries[0].version).toBe("3.5.26");
            expect(entries[1].version).toBe("3.5.25");
            expect(entries[2].version).toBe("3.5.24");
        });

        it("should parse version without link or date", () => {
            const changelog = `## 3.5.26

### Bug Fixes

* fix: bug fix`;

            const entries = parseChangelog(changelog);

            expect(entries).toHaveLength(1);
            expect(entries[0].version).toBe("3.5.26");
            expect(entries[0].link).toBeUndefined();
            expect(entries[0].date).toBeUndefined();
        });

        it("should parse version with date but no link", () => {
            const changelog = `## 3.5.26 (2025-12-18)

### Bug Fixes

* fix: bug fix`;

            const entries = parseChangelog(changelog);

            expect(entries).toHaveLength(1);
            expect(entries[0].version).toBe("3.5.26");
            expect(entries[0].date).toBe("2025-12-18");
        });

        it("should handle Vue-style changelog format", () => {
            const changelog = `## [3.5.26](https://github.com/vuejs/core/compare/v3.5.25...v3.5.26) (2025-12-18)

### Bug Fixes

* **compat:** fix compat handler of draggable ([#12445](https://github.com/vuejs/core/issues/12445)) ([ed85953](https://github.com/vuejs/core/commit/ed85953e28741ae1913cfc92b7b66e1a8da47f8c)), closes [#12444](https://github.com/vuejs/core/issues/12444)
* **compiler-sfc:** demote const reactive bindings used in v-model ([#14214](https://github.com/vuejs/core/issues/14214)) ([e24ff7d](https://github.com/vuejs/core/commit/e24ff7d302a887ea532571c231a385362fa17279)), closes [#11265](https://github.com/vuejs/core/issues/11265) [#11275](https://github.com/vuejs/core/issues/11275)

### Performance Improvements

* **compiler-core:** use binary-search to get line and column ([#14222](https://github.com/vuejs/core/issues/14222)) ([1904053](https://github.com/vuejs/core/commit/1904053f1f7986c2d6dbe858ee1b594b4b229c17))`;

            const entries = parseChangelog(changelog);

            expect(entries).toHaveLength(1);
            expect(entries[0].version).toBe("3.5.26");
            expect(entries[0].fixes.length).toBeGreaterThan(0);
            expect(entries[0].performance.length).toBeGreaterThan(0);
        });

        it("should categorize changes correctly without section headers", () => {
            const changelog = `## [3.5.26](https://github.com/vuejs/core/compare/v3.5.25...v3.5.26) (2025-12-18)

* security: fix CVE-2024-1234
* feat: add new feature
* fix: bug fix
* performance: optimize queries
* breaking: remove deprecated API`;

            const entries = parseChangelog(changelog);

            expect(entries).toHaveLength(1);
            expect(entries[0].security.length).toBeGreaterThan(0);
            expect(entries[0].feat.length).toBeGreaterThan(0);
            expect(entries[0].fixes.length).toBeGreaterThan(0);
            expect(entries[0].performance.length).toBeGreaterThan(0);
            expect(entries[0].breaking.length).toBeGreaterThan(0);
        });

        it("should handle empty changelog", () => {
            const entries = parseChangelog("");
            expect(entries).toHaveLength(0);
        });

        it("should handle changelog with no valid versions", () => {
            const changelog = `# Changelog

This is just a header with no versions.`;
            const entries = parseChangelog(changelog);
            expect(entries).toHaveLength(0);
        });
    });

    describe("filterEntriesByVersionRange", () => {
        const entries: ChangelogEntry[] = [
            { version: "3.5.24", fixes: [], feat: [], security: [], performance: [], breaking: [], other: [] },
            { version: "3.5.25", fixes: [], feat: [], security: [], performance: [], breaking: [], other: [] },
            { version: "3.5.26", fixes: [], feat: [], security: [], performance: [], breaking: [], other: [] },
            { version: "3.6.0", fixes: [], feat: [], security: [], performance: [], breaking: [], other: [] },
            { version: "4.0.0", fixes: [], feat: [], security: [], performance: [], breaking: [], other: [] },
        ];

        it("should filter entries within version range", () => {
            const filtered = filterEntriesByVersionRange(entries, "3.5.24", "3.5.26");
            expect(filtered).toHaveLength(3);
            expect(filtered.map(e => e.version)).toEqual(["3.5.24", "3.5.25", "3.5.26"]);
        });

        it("should filter entries from version to latest", () => {
            const filtered = filterEntriesByVersionRange(entries, "3.5.25", "3.6.0");
            expect(filtered).toHaveLength(3);
            expect(filtered.map(e => e.version)).toEqual(["3.5.25", "3.5.26", "3.6.0"]);
        });

        it("should handle single version range", () => {
            const filtered = filterEntriesByVersionRange(entries, "3.5.26", "3.5.26");
            expect(filtered).toHaveLength(1);
            expect(filtered[0].version).toBe("3.5.26");
        });

        it("should return empty array for invalid range", () => {
            const filtered = filterEntriesByVersionRange(entries, "5.0.0", "6.0.0");
            expect(filtered).toHaveLength(0);
        });

        it("should handle empty entries array", () => {
            const filtered = filterEntriesByVersionRange([], "3.5.24", "3.5.26");
            expect(filtered).toHaveLength(0);
        });
    });

    describe("fetchChangelogFromUrl", () => {
        beforeEach(() => {
            vi.clearAllMocks();
        });

        it("should fetch changelog from raw URL", async () => {
            const mockChangelog = `## [3.5.26](https://github.com/vuejs/core/compare/v3.5.25...v3.5.26) (2025-12-18)

### Bug Fixes

* fix: bug fix`;

            global.fetch = vi.fn().mockResolvedValue({
                ok: true,
                text: async () => mockChangelog,
            });

            const result = await fetchChangelogFromUrl("https://raw.githubusercontent.com/vuejs/core/main/CHANGELOG.md");

            expect(result).toBe(mockChangelog);
            expect(global.fetch).toHaveBeenCalledWith(
                "https://raw.githubusercontent.com/vuejs/core/main/CHANGELOG.md",
                expect.any(Object)
            );
        });

        it("should convert GitHub blob URL to raw URL", async () => {
            const mockChangelog = `## [3.5.26](https://github.com/vuejs/core/compare/v3.5.25...v3.5.26) (2025-12-18)

### Bug Fixes

* fix: bug fix in parser
* fix: resolve memory leak issue
* fix: handle edge cases properly

### Features

* feat: add new API endpoint
* feat: support new configuration option`;

            global.fetch = vi.fn().mockImplementation((url) => {
                if (url === "https://raw.githubusercontent.com/vuejs/core/main/CHANGELOG.md") {
                    return Promise.resolve({
                        ok: true,
                        text: async () => mockChangelog,
                    });
                }
                return Promise.resolve({
                    ok: false,
                    status: 404,
                });
            });

            const result = await fetchChangelogFromUrl("https://github.com/vuejs/core/blob/main/CHANGELOG.md");

            expect(result).toBe(mockChangelog);
            expect(global.fetch).toHaveBeenCalledWith(
                "https://raw.githubusercontent.com/vuejs/core/main/CHANGELOG.md",
                expect.any(Object)
            );
        });

        it("should return null for 404 response", async () => {
            global.fetch = vi.fn().mockResolvedValue({
                ok: false,
                status: 404,
            });

            const result = await fetchChangelogFromUrl("https://example.com/CHANGELOG.md");

            expect(result).toBeNull();
        });

        it("should return null for error response", async () => {
            global.fetch = vi.fn().mockResolvedValue({
                ok: true,
                text: async () => "404: Not Found",
            });

            const result = await fetchChangelogFromUrl("https://example.com/CHANGELOG.md");

            expect(result).toBeNull();
        });

        it("should handle fetch errors gracefully", async () => {
            global.fetch = vi.fn().mockRejectedValue(new Error("Network error"));

            const result = await fetchChangelogFromUrl("https://example.com/CHANGELOG.md");

            expect(result).toBeNull();
        });
    });

    describe("parseChangelogFromUrl", () => {
        beforeEach(() => {
            vi.clearAllMocks();
        });

        it("should parse changelog from URL", async () => {
            const mockChangelog = `## [3.5.26](https://github.com/vuejs/core/compare/v3.5.25...v3.5.26) (2025-12-18)

### Bug Fixes

* fix: bug fix 1

## [3.5.25](https://github.com/vuejs/core/compare/v3.5.24...v3.5.25) (2025-11-24)

### Bug Fixes

* fix: bug fix 2`;

            global.fetch = vi.fn().mockResolvedValue({
                ok: true,
                text: async () => mockChangelog,
            });

            const entries = await parseChangelogFromUrl("https://raw.githubusercontent.com/vuejs/core/main/CHANGELOG.md");

            expect(entries).toHaveLength(2);
            expect(entries[0].version).toBe("3.5.26");
            expect(entries[1].version).toBe("3.5.25");
        });

        it("should return empty array for failed fetch", async () => {
            global.fetch = vi.fn().mockResolvedValue({
                ok: false,
            });

            const entries = await parseChangelogFromUrl("https://example.com/CHANGELOG.md");

            expect(entries).toHaveLength(0);
        });
    });

    describe("real-world changelog formats", () => {
        it("should parse Keep a Changelog format", () => {
            const changelog = `# Changelog

All notable changes to this project will be documented in this file.

## [Unreleased]

## [1.0.0] - 2024-01-01

### Added
- Initial release
- Feature A
- Feature B

### Changed
- Improved performance

### Fixed
- Bug fix 1
- Bug fix 2

### Security
- Security fix 1

## [0.9.0] - 2023-12-01

### Added
- Beta feature`;

            const entries = parseChangelog(changelog);

            expect(entries.length).toBeGreaterThan(0);
            const v1Entry = entries.find(e => e.version === "1.0.0");
            expect(v1Entry).toBeDefined();
            if (v1Entry) {
                expect(v1Entry.feat.length).toBeGreaterThan(0);
                expect(v1Entry.fixes.length).toBeGreaterThan(0);
                expect(v1Entry.security.length).toBeGreaterThan(0);
            }
        });

        it("should parse GitHub release notes format", () => {
            const changelog = `# Release Notes

## v2.1.0 (2024-03-15)

### 🚀 Features
- Added new authentication method
- Support for custom themes

### 🐛 Bug Fixes
- Fixed memory leak in parser
- Resolved issue with date formatting

### 🔒 Security
- Patched XSS vulnerability (CVE-2024-5678)

### ⚡ Performance
- Optimized database queries
- Reduced bundle size by 20%

### 💥 Breaking Changes
- Removed deprecated API endpoint
- Changed default timeout value

## v2.0.0 (2024-01-01)

### Features
- Major rewrite
- New architecture`;

            const entries = parseChangelog(changelog);

            expect(entries.length).toBeGreaterThan(0);
            const v2Entry = entries.find(e => e.version === "2.1.0");
            expect(v2Entry).toBeDefined();
            if (v2Entry) {
                expect(v2Entry.feat.length).toBeGreaterThan(0);
                expect(v2Entry.fixes.length).toBeGreaterThan(0);
                expect(v2Entry.security.length).toBeGreaterThan(0);
                expect(v2Entry.performance.length).toBeGreaterThan(0);
                expect(v2Entry.breaking.length).toBeGreaterThan(0);
            }
        });
    });
});
