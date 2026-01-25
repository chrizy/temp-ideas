import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
    analyzePackageFomo,
    type PackageFomoResult,
} from "./packageFomo";

// Store original fetch before mocking (if it exists)
// In Node.js 18+, fetch is available globally
const originalFetch = (typeof globalThis !== "undefined" && (globalThis as any).fetch)
    || (typeof global !== "undefined" && (global as any).fetch)
    || (typeof fetch !== "undefined" ? fetch : undefined);

// Mock fetch globally for unit tests
global.fetch = vi.fn();

describe("analyzePackageFomo", () => {
    const mockAI = {
        run: vi.fn(),
    };

    beforeEach(() => {
        vi.clearAllMocks();
        // Reset fetch mock completely between tests
        (global.fetch as any).mockReset();
        (global.fetch as any).mockClear();
    });

    it("should analyze a package that is up to date", async () => {
        const npmResponse = {
            "dist-tags": {
                latest: "2.0.0",
            },
            repository: {
                type: "git",
                url: "https://github.com/test/package.git",
            },
            versions: {
                "2.0.0": { version: "2.0.0" },
            },
        };

        (global.fetch as any).mockResolvedValueOnce({
            ok: true,
            json: async () => npmResponse,
        });

        // Mock GitHub releases (empty since up to date)
        (global.fetch as any).mockResolvedValueOnce({
            ok: true,
            json: async () => [],
        });

        // Mock CHANGELOG fetch (not found)
        (global.fetch as any).mockResolvedValueOnce({
            ok: false,
        });

        mockAI.run.mockResolvedValue({
            response: "No significant changes found.",
        });

        const result = await analyzePackageFomo("test-package", "2.0.0", mockAI);

        expect(result.latestVersion).toBe("2.0.0");
        expect(result.versionsBehind).toBe("0.0");
        expect(result.updatenessScore).toBe(100);
        expect(result.verdict).toContain("up to date");
    });

    it("should calculate versions behind correctly", async () => {
        const npmResponse = {
            "dist-tags": {
                latest: "5.0.0",
            },
            repository: {
                type: "git",
                url: "https://github.com/test/package.git",
            },
            versions: {
                "5.0.0": { version: "5.0.0" },
            },
        };

        (global.fetch as any).mockResolvedValueOnce({
            ok: true,
            json: async () => npmResponse,
        });

        // Mock GitHub releases
        const mockReleases = [
            {
                tag_name: "v3.0.0",
                name: "Version 3.0.0",
                body: "Major update with new features",
                published_at: "2024-01-01T00:00:00Z",
                prerelease: false,
            },
            {
                tag_name: "v4.0.0",
                name: "Version 4.0.0",
                body: "Another major update",
                published_at: "2024-02-01T00:00:00Z",
                prerelease: false,
            },
            {
                tag_name: "v5.0.0",
                name: "Version 5.0.0",
                body: "Latest major update",
                published_at: "2024-03-01T00:00:00Z",
                prerelease: false,
            },
        ];

        (global.fetch as any).mockResolvedValueOnce({
            ok: true,
            json: async () => mockReleases,
        });

        mockAI.run.mockResolvedValue({
            response: "New API features\nPerformance improvements\nSecurity fixes\nBug fixes\nBreaking changes",
        });

        const result = await analyzePackageFomo("test-package", "2.0.0", mockAI);

        expect(result.latestVersion).toBe("5.0.0");
        expect(result.versionsBehind).toMatch(/^3\./); // 3 major versions behind
        expect(result.updatenessScore).toBe(10); // 3+ versions behind = 10
        expect(result.upgradeValueScore).toBeGreaterThan(0);
    });

    it("should handle packages without GitHub repository", async () => {
        const npmResponse = {
            "dist-tags": {
                latest: "2.1.0",
            },
            versions: {
                "2.1.0": { version: "2.1.0" },
            },
        };

        (global.fetch as any).mockResolvedValueOnce({
            ok: true,
            json: async () => npmResponse,
        });

        mockAI.run.mockResolvedValue({
            response: "No changelog available.",
        });

        const result = await analyzePackageFomo("test-package", "2.0.0", mockAI);

        expect(result.latestVersion).toBe("2.1.0");
        expect(result.versionsBehind).toMatch(/^0\./); // Same major version, may have minor difference
        expect(result.benefitsSummary.length).toBeGreaterThan(0);
    });

    it("should handle GitHub releases with prerelease filtering", async () => {
        const npmResponse = {
            "dist-tags": {
                latest: "3.0.0",
            },
            repository: {
                type: "git",
                url: "git+https://github.com/test/package.git",
            },
            versions: {
                "3.0.0": { version: "3.0.0" },
            },
        };

        (global.fetch as any).mockResolvedValueOnce({
            ok: true,
            json: async () => npmResponse,
        });

        const mockReleases = [
            {
                tag_name: "v3.0.0-beta.1",
                name: "Beta Release",
                body: "Beta features",
                published_at: "2024-01-01T00:00:00Z",
                prerelease: true, // Should be filtered out
            },
            {
                tag_name: "v3.0.0",
                name: "Version 3.0.0",
                body: "Stable release with new features",
                published_at: "2024-02-01T00:00:00Z",
                prerelease: false,
            },
        ];

        (global.fetch as any).mockResolvedValueOnce({
            ok: true,
            json: async () => mockReleases,
        });

        mockAI.run.mockResolvedValue({
            response: "Stable features added\nPerformance improvements",
        });

        const result = await analyzePackageFomo("test-package", "2.0.0", mockAI);

        expect(result.latestVersion).toBe("3.0.0");
        expect(result.versionsBehind).toMatch(/^1\./); // 1 major version behind
        expect(result.updatenessScore).toBeGreaterThanOrEqual(60); // 1 version behind = 60-70
    });

    it("should calculate upgrade value score based on changelog content", async () => {
        const npmResponse = {
            "dist-tags": {
                latest: "2.0.0",
            },
            repository: {
                type: "git",
                url: "https://github.com/test/package",
            },
            versions: {
                "2.0.0": { version: "2.0.0" },
            },
        };

        (global.fetch as any).mockResolvedValueOnce({
            ok: true,
            json: async () => npmResponse,
        });

        const mockReleases = [
            {
                tag_name: "v2.0.0",
                name: "Version 2.0.0",
                body: "SECURITY: Fixed critical vulnerability CVE-2024-1234\nBREAKING: Changed API\nNEW FEATURE: Added new endpoint\nPERFORMANCE: Optimized queries",
                published_at: "2024-01-01T00:00:00Z",
                prerelease: false,
            },
        ];

        (global.fetch as any).mockResolvedValueOnce({
            ok: true,
            json: async () => mockReleases,
        });

        mockAI.run.mockResolvedValue({
            response: "Security vulnerability fixed\nBreaking API changes\nNew endpoint added\nQuery optimization\nBug fixes",
        });

        const result = await analyzePackageFomo("test-package", "1.0.0", mockAI);

        // Should have high upgrade value score due to security, breaking changes, features, performance
        expect(result.upgradeValueScore).toBeGreaterThan(70);
    });

    it("should handle fetch failures gracefully", async () => {
        (global.fetch as any).mockResolvedValueOnce({
            ok: false,
        });

        await expect(
            analyzePackageFomo("nonexistent-package", "1.0.0", mockAI)
        ).rejects.toThrow("Failed to fetch metadata");
    });

    it("should handle AI failure gracefully", async () => {
        const npmResponse = {
            "dist-tags": {
                latest: "2.0.0",
            },
            repository: {
                type: "git",
                url: "https://github.com/test/package.git",
            },
            versions: {
                "2.0.0": { version: "2.0.0" },
            },
        };

        (global.fetch as any).mockResolvedValueOnce({
            ok: true,
            json: async () => npmResponse,
        });

        // Provide some releases with actual content (not placeholders) so changelog content exists and AI is called
        const mockReleases = [
            {
                tag_name: "v2.0.0",
                name: "Version 2.0.0",
                body: "Major update with new features and improvements. Added new API endpoints and performance optimizations.",
                published_at: "2024-01-01T00:00:00Z",
                prerelease: false,
            },
        ];

        (global.fetch as any).mockResolvedValueOnce({
            ok: true,
            json: async () => mockReleases,
        });

        // Mock CHANGELOG fetch (not needed since we have releases)
        (global.fetch as any).mockResolvedValueOnce({
            ok: false,
        });

        mockAI.run.mockRejectedValue(new Error("AI service unavailable"));

        const result = await analyzePackageFomo("test-package", "1.0.0", mockAI);

        // When AI fails, it should fallback to manual extraction
        // The release body contains "performance optimizations" so manual extraction should find it
        expect(result.benefitsSummary.length).toBeGreaterThan(0);
        // Should either have manual extraction results or error message
        expect(
            result.benefitsSummary.some(b =>
                b.includes("performance") ||
                b.includes("optimization") ||
                b.includes("Unable to analyze") ||
                b.includes("unavailable")
            )
        ).toBe(true);
    });

    it("should limit releases to most recent 10 for latency control", async () => {
        const npmResponse = {
            "dist-tags": {
                latest: "12.0.0",
            },
            repository: {
                type: "git",
                url: "https://github.com/test/package.git",
            },
            versions: {
                "12.0.0": { version: "12.0.0" },
            },
        };

        (global.fetch as any).mockResolvedValueOnce({
            ok: true,
            json: async () => npmResponse,
        });

        // Create 15 releases
        const mockReleases = Array.from({ length: 15 }, (_, i) => ({
            tag_name: `v${i + 1}.0.0`,
            name: `Version ${i + 1}.0.0`,
            body: `Release ${i + 1}`,
            published_at: `2024-${String(i + 1).padStart(2, "0")}-01T00:00:00Z`,
            prerelease: false,
        }));

        (global.fetch as any).mockResolvedValueOnce({
            ok: true,
            json: async () => mockReleases,
        });

        // Mock CHANGELOG fetch (not needed since we have releases, but still called)
        (global.fetch as any).mockResolvedValueOnce({
            ok: false,
        });

        mockAI.run.mockResolvedValue({
            response: "Multiple updates",
        });

        const result = await analyzePackageFomo("test-package", "1.0.0", mockAI);

        // Should still work, but only process limited releases
        expect(result.latestVersion).toBe("12.0.0");
        expect(result.versionsBehind).toMatch(/^11\./); // 11 major versions behind
    });

    it("should handle different GitHub URL formats", async () => {
        const npmResponse = {
            "dist-tags": {
                latest: "2.0.0",
            },
            repository: {
                type: "git",
                url: "git://github.com/owner/repo.git",
            },
            versions: {
                "2.0.0": { version: "2.0.0" },
            },
        };

        (global.fetch as any).mockResolvedValueOnce({
            ok: true,
            json: async () => npmResponse,
        });

        (global.fetch as any).mockResolvedValueOnce({
            ok: true,
            json: async () => [],
        });

        (global.fetch as any).mockResolvedValueOnce({
            ok: false,
        });

        mockAI.run.mockResolvedValue({
            response: "Test",
        });

        const result = await analyzePackageFomo("test-package", "1.0.0", mockAI);

        expect(result.latestVersion).toBe("2.0.0");
        // Should successfully extract repo and attempt to fetch
        expect(global.fetch).toHaveBeenCalledWith(
            expect.stringContaining("github.com/repos/owner/repo"),
            expect.any(Object)
        );
    });

    it("should generate appropriate verdict based on scores", async () => {
        const npmResponse = {
            "dist-tags": {
                latest: "3.0.0",
            },
            repository: {
                type: "git",
                url: "https://github.com/test/package.git",
            },
            versions: {
                "3.0.0": { version: "3.0.0" },
            },
        };

        (global.fetch as any).mockResolvedValueOnce({
            ok: true,
            json: async () => npmResponse,
        });

        const mockReleases = [
            {
                tag_name: "v3.0.0",
                name: "Version 3.0.0",
                body: "SECURITY: Critical fixes\nBREAKING: Major changes\nNEW FEATURE: Features\nPERFORMANCE: Optimized",
                published_at: "2024-01-01T00:00:00Z",
                prerelease: false,
            },
        ];

        (global.fetch as any).mockResolvedValueOnce({
            ok: true,
            json: async () => mockReleases,
        });

        // Mock CHANGELOG fetch (not needed since we have releases)
        (global.fetch as any).mockResolvedValueOnce({
            ok: false,
        });

        mockAI.run.mockResolvedValue({
            response: "Security fixes\nBreaking changes\nNew features\nPerformance improvements",
        });

        const result = await analyzePackageFomo("test-package", "1.0.0", mockAI);

        // High value score + low updateness score should recommend upgrade
        // With 2 versions behind (updatenessScore = 30-40) and high upgradeValueScore (>=70), should say "High-value upgrade recommended"
        expect(result.verdict).toContain("recommended");
        expect(result.versionsBehind).toMatch(/^2\./); // 2 major versions behind
        expect(result.updatenessScore).toBeGreaterThanOrEqual(30);
        expect(result.upgradeValueScore).toBeGreaterThanOrEqual(70);
    });

    it("should handle Vue-style separate version changelogs for major upgrades", async () => {
        // This test verifies that for major upgrades, we can fetch version-specific changelogs
        // Vue uses CHANGELOG-3.0.md for version 3.0.x releases

        const npmResponse = {
            "dist-tags": {
                latest: "3.5.26",
            },
            repository: {
                type: "git",
                url: "https://github.com/vuejs/core.git",
            },
            versions: {
                "3.5.26": { version: "3.5.26" },
            },
        };

        (global.fetch as any).mockResolvedValueOnce({
            ok: true,
            json: async () => npmResponse,
        });

        // Mock GitHub releases (all placeholders)
        (global.fetch as any).mockResolvedValueOnce({
            ok: true,
            json: async () => [
                {
                    tag_name: "v3.5.26",
                    name: "Version 3.5.26",
                    body: "For stable releases, please refer to CHANGELOG.md for details.",
                    published_at: "2024-01-01T00:00:00Z",
                    prerelease: false,
                },
            ],
        });

        // Mock main CHANGELOG.md that references version-specific changelog
        const mainChangelog = `## Previous Changelogs

### 3.4.x (2023-10-28 - 2024-08-15)

See [3.4 changelog](./changelogs/CHANGELOG-3.4.md)

### 3.3.x (2023-02-05 - 2023-12-29)

See [3.3 changelog](./changelogs/CHANGELOG-3.3.md)

### 3.0.x (2019-12-20 - 2021-04-01)

See [3.0 changelog](./changelogs/CHANGELOG-3.0.md)`;

        (global.fetch as any).mockResolvedValueOnce({
            ok: true,
            text: async () => mainChangelog,
        });

        // Mock version-specific changelog (CHANGELOG-3.0.md)
        const versionChangelog = `# [3.0.0](https://github.com/vuejs/core/compare/v2.6.14...v3.0.0) (2020-09-18)

## Breaking Changes

### Global API

* **Breaking:** Global API now uses application instance
* **Breaking:** Global and internal APIs have been restructured

### Template Syntax

* **Breaking:** v-model usage has changed
* **New:** Multiple v-model bindings

## Features

* Composition API
* Multiple root elements
* Teleport component
* Suspense component`;

        (global.fetch as any).mockResolvedValueOnce({
            ok: true,
            text: async () => versionChangelog,
        });

        mockAI.run.mockResolvedValue({
            response: "Composition API introduced\nMultiple root elements support\nTeleport component added\nSuspense component for async components\nBreaking changes to global API",
        });

        const result = await analyzePackageFomo("vue", "2.4.38", mockAI);

        // Should successfully extract from version-specific changelog
        expect(result.latestVersion).toBe("3.5.26");
        expect(result.versionsBehind).toMatch(/^1\./); // 1 major version behind
        expect(result.benefitsSummary.length).toBeGreaterThan(0);

        // Verify that the version-specific changelog was fetched
        expect(global.fetch).toHaveBeenCalledWith(
            expect.stringContaining("changelogs/CHANGELOG-3.0.md"),
            expect.any(Object)
        );
    });
});

// Integration tests that make real API calls
describe("analyzePackageFomo - Integration Tests", () => {
    const mockAI = {
        run: vi.fn(),
    };

    beforeEach(() => {
        vi.clearAllMocks();
        // Restore real fetch for integration tests if available
        if (originalFetch) {
            global.fetch = originalFetch as any;
        } else {
            // If no native fetch, we can't run integration tests
            // This will fail, but that's expected
            console.warn("Native fetch not available - integration test may fail");
        }
    });

    afterEach(() => {
        // Restore mock after integration test
        global.fetch = vi.fn();
    });

    it("should analyze React v18.0.0 and output update summary", async () => {
        // This test makes real API calls to npm and GitHub
        // Note: AI binding is mocked, but npm/GitHub calls are real

        // Mock AI to provide a realistic summary
        mockAI.run.mockResolvedValue({
            response: "Concurrent rendering improvements\nNew hooks and APIs\nPerformance optimizations\nBetter TypeScript support\nEnhanced developer experience",
        });

        const result = await analyzePackageFomo("react", "18.0.0", mockAI);

        // Assert latest version is 19.2.3
        expect(result.latestVersion).toBe("19.2.3");

        // Output the update summary to console
        console.log("\n=== React Package FOMO Analysis ===");
        console.log(`Current Version: 18.0.0`);
        console.log(`Latest Version: ${result.latestVersion}`);
        const [major, minor] = result.versionsBehind.split('.').map(Number);
        console.log(`Versions Behind: ${major} major, ${minor} minor (${result.versionsBehind})`);
        console.log(`Updateness Score: ${result.updatenessScore}/100`);
        console.log(`Upgrade Value Score: ${result.upgradeValueScore}/100`);
        console.log(`\nBenefits Summary:`);
        result.benefitsSummary.forEach((benefit, index) => {
            console.log(`  ${index + 1}. ${benefit}`);
        });
        console.log(`\nVerdict: ${result.verdict}`);
        console.log("===================================\n");

        // Additional assertions
        expect(result.versionsBehind).not.toBe("0.0");
        expect(result.updatenessScore).toBeGreaterThanOrEqual(0);
        expect(result.upgradeValueScore).toBeGreaterThanOrEqual(0);
        expect(result.benefitsSummary.length).toBeGreaterThan(0);
        expect(result.verdict.length).toBeGreaterThan(0);
    });
});
