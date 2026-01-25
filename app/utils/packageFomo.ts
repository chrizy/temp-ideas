/**
 * BUSINESS REQUIREMENTS SPECIFICATION
 * 
 * Purpose: Analyze npm packages to determine upgrade value and calculate FOMO scores.
 * 
 * Requirements:
 * 1. Fetch npm package metadata to get latest version and repository URL
 * 2. Calculate how many major versions behind the current version is
 * 3. If GitHub repository is available, fetch releases or CHANGELOG.md
 * 4. Extract release notes between currentVersion and latestVersion
 * 5. Use Cloudflare Workers AI to summarize real benefits from changelog content
 * 6. Compute two scores: Updateness Score (0-100) and Upgrade Value Score (0-100)
 * 7. Return structured JSON response with all analysis results
 * 
 * Constraints:
 * - Designed for Cloudflare Workers (fetch API, no Node APIs)
 * - Single AI call using Workers AI
 * - Parallelize external fetches where possible
 * - Fail gracefully if changelog or GitHub data is unavailable
 * - Prefer explainable heuristics over magic
 */

import { fetchChangelogFromUrl } from "./changelogParser";

/**
 * NPM package metadata response structure
 */
interface NpmPackageMetadata {
    "dist-tags": {
        latest: string;
    };
    repository?: {
        type: string;
        url: string;
    };
    versions: Record<string, {
        version: string;
    }>;
}

/**
 * GitHub release structure
 */
interface GitHubRelease {
    tag_name: string;
    name: string;
    body: string;
    published_at: string;
    prerelease: boolean;
}

/**
 * Package FOMO analysis result
 */
export interface PackageFomoResult {
    latestVersion: string;
    versionsBehind: string; // Format: "major.minor" (e.g., "1.5" for 1 major and 5 minor versions behind)
    updatenessScore: number;
    upgradeValueScore: number;
    benefitsSummary: string[];
    verdict: string;
}

/**
 * Extract GitHub owner and repo from repository URL
 * Supports formats:
 * - https://github.com/owner/repo
 * - https://github.com/owner/repo.git
 * - git+https://github.com/owner/repo.git
 * - git://github.com/owner/repo.git
 */
function extractGitHubRepo(repoUrl: string): { owner: string; repo: string } | null {
    // Handle various GitHub URL formats
    const patterns = [
        /github\.com[\/:]([^\/]+)\/([^\/\.]+)(?:\.git)?/i,
        /^([^\/]+)\/([^\/\.]+)$/i, // owner/repo format
    ];

    for (const pattern of patterns) {
        const match = repoUrl.match(pattern);
        if (match) {
            return {
                owner: match[1],
                repo: match[2].replace(/\.git$/, ""),
            };
        }
    }

    return null;
}

/**
 * Parse semantic version string into parts
 */
function parseVersion(version: string): { major: number; minor: number; patch: number } | null {
    // Remove leading 'v' if present and extract version numbers
    const cleaned = version.replace(/^v/i, "");
    const match = cleaned.match(/^(\d+)\.(\d+)\.(\d+)/);
    if (!match) return null;

    return {
        major: parseInt(match[1], 10),
        minor: parseInt(match[2], 10),
        patch: parseInt(match[3], 10),
    };
}

/**
 * Calculate how many major and minor versions behind current version is from latest
 * Returns "major.minor" format (e.g., "1.5" for 1 major and 5 minor versions behind)
 * Returns "0.0" if current is same or newer
 */
function calculateVersionsBehind(currentVersion: string, latestVersion: string): string {
    const current = parseVersion(currentVersion);
    const latest = parseVersion(latestVersion);

    if (!current || !latest) return "0.0";

    // If current is newer, return 0.0
    if (current.major > latest.major) return "0.0";
    if (current.major === latest.major && current.minor > latest.minor) return "0.0";
    if (current.major === latest.major && current.minor === latest.minor && current.patch >= latest.patch) {
        return "0.0";
    }

    // Calculate major versions behind
    const majorBehind = latest.major - current.major;

    // Calculate minor versions behind
    let minorBehind = 0;
    if (majorBehind === 0) {
        // Same major version, calculate minor difference
        minorBehind = latest.minor - current.minor;
    } else {
        // Different major versions: show the minor version of the latest as an indicator
        // This represents the minor versions in the latest major release
        minorBehind = latest.minor;
    }

    return `${majorBehind}.${minorBehind}`;
}

/**
 * Convert versions behind string to a numeric score for calculations
 * "major.minor" -> numeric value where major is weighted more heavily
 */
function versionsBehindToNumeric(versionsBehind: string): number {
    const [major, minor] = versionsBehind.split('.').map(Number);
    // Weight major versions 100x more than minor versions
    return major * 100 + minor;
}

/**
 * Fetch npm package metadata
 */
async function fetchNpmMetadata(packageName: string): Promise<NpmPackageMetadata | null> {
    try {
        console.log(`[fetchNpmMetadata] Fetching metadata for ${packageName}`);
        const response = await fetch(`https://registry.npmjs.org/${encodeURIComponent(packageName)}`);
        if (!response.ok) {
            console.error(`[fetchNpmMetadata] HTTP error: ${response.status} ${response.statusText}`);
            return null;
        }
        const metadata = await response.json() as NpmPackageMetadata;
        console.log(`[fetchNpmMetadata] Successfully fetched metadata, latest version: ${metadata["dist-tags"]?.latest}`);
        return metadata;
    } catch (error) {
        console.error(`[fetchNpmMetadata] Failed to fetch npm metadata for ${packageName}:`, error);
        return null;
    }
}

/**
 * Fetch GitHub releases for a repository
 */
async function fetchGitHubReleases(owner: string, repo: string): Promise<GitHubRelease[]> {
    try {
        console.log(`[fetchGitHubReleases] Fetching releases for ${owner}/${repo}`);
        const response = await fetch(
            `https://api.github.com/repos/${owner}/${repo}/releases?per_page=30`,
            {
                headers: {
                    Accept: "application/vnd.github.v3+json",
                    "User-Agent": "Package-FOMO-Worker",
                },
            }
        );
        if (!response.ok) {
            console.error(`[fetchGitHubReleases] HTTP error: ${response.status} ${response.statusText}`);
            return [];
        }
        const releases = await response.json() as GitHubRelease[];
        console.log(`[fetchGitHubReleases] Fetched ${releases.length} releases`);
        return releases;
    } catch (error) {
        console.error(`[fetchGitHubReleases] Failed to fetch GitHub releases for ${owner}/${repo}:`, error);
        return [];
    }
}

/**
 * Fetch a file from GitHub repository
 */
async function fetchGitHubFile(
    owner: string,
    repo: string,
    filePath: string,
    branch: string = "main"
): Promise<string | null> {
    try {
        const response = await fetch(
            `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${filePath}`,
            {
                headers: {
                    Accept: "text/plain",
                    "User-Agent": "Package-FOMO-Worker",
                },
            }
        );
        if (response && response.ok) {
            const content = await response.text();
            // Make sure we got actual content, not just an error page
            if (content && content.length > 100 && !content.includes("404: Not Found")) {
                return content;
            }
        }
        return null;
    } catch (error) {
        return null;
    }
}

/**
 * Fetch CHANGELOG.md from GitHub repository
 * Tries multiple branches (main, master) and file names
 */
async function fetchChangelog(owner: string, repo: string): Promise<string | null> {
    try {
        // Try common changelog file locations
        const paths = ["CHANGELOG.md", "CHANGES.md", "CHANGELOG", "HISTORY.md"];
        // Try common branch names
        const branches = ["main", "master", "latest"];

        for (const branch of branches) {
            for (const path of paths) {
                const content = await fetchGitHubFile(owner, repo, path, branch);
                if (content) {
                    return content;
                }
            }
        }
        return null;
    } catch (error) {
        console.error(`Failed to fetch changelog for ${owner}/${repo}:`, error);
        return null;
    }
}

/**
 * Extract version-specific changelog path from main changelog
 * Looks for patterns like: "See [3.0 changelog](./changelogs/CHANGELOG-3.0.md)"
 */
function extractVersionChangelogPath(mainChangelog: string, majorVersion: number): string | null {
    // Look for patterns like:
    // - "See [3.0 changelog](./changelogs/CHANGELOG-3.0.md)"
    // - "See [3.0.x changelog](./changelogs/CHANGELOG-3.0.md)"
    // - "./changelogs/CHANGELOG-3.0.md"
    // We need to match the exact major version, not just any version containing that number
    // Use word boundaries or ensure we match the full version number
    const patterns = [
        // Match "See [3.0 changelog](./changelogs/CHANGELOG-3.0.md)" - must have .0 or .0.x after major version
        new RegExp(`(?:See|see)\\s+\\[.*?${majorVersion}\\.0[^\\]]*\\]\\(([^)]+CHANGELOG[^)]*${majorVersion}\\.0[^)]*)\\)`, "i"),
        // Match "./changelogs/CHANGELOG-3.0.md" - exact major version match
        new RegExp(`\\./changelogs/CHANGELOG-${majorVersion}\\.0[^\\s\\)]+`, "i"),
        new RegExp(`changelogs/CHANGELOG-${majorVersion}\\.0[^\\s\\)]+`, "i"),
        // Fallback: match any CHANGELOG with the major version (but prefer .0 versions)
        new RegExp(`\\./changelogs/CHANGELOG-${majorVersion}[^\\s\\)]+`, "i"),
    ];

    for (const pattern of patterns) {
        const match = mainChangelog.match(pattern);
        if (match) {
            // Extract the path (could be in group 1 or the full match)
            const path = match[1] || match[0];
            // Clean up the path (remove leading ./ if present, ensure it's a valid path)
            const cleanedPath = path.replace(/^\.\//, "").trim();
            // Verify it contains the major version we're looking for
            if (cleanedPath.includes(`CHANGELOG-${majorVersion}`)) {
                return cleanedPath;
            }
        }
    }

    return null;
}

/**
 * Fetch version-specific changelog for a major version
 */
async function fetchVersionChangelog(
    owner: string,
    repo: string,
    majorVersion: number,
    mainChangelog: string
): Promise<string | null> {
    console.log(`[fetchVersionChangelog] Looking for version-specific changelog for v${majorVersion}.0`);
    const versionPath = extractVersionChangelogPath(mainChangelog, majorVersion);
    if (!versionPath) {
        console.log(`[fetchVersionChangelog] No version-specific changelog path found in main changelog`);
        return null;
    }
    console.log(`[fetchVersionChangelog] Found version changelog path: ${versionPath}`);

    // Try multiple branches
    const branches = ["main", "master", "latest"];
    for (const branch of branches) {
        console.log(`[fetchVersionChangelog] Trying to fetch from ${branch} branch...`);
        const content = await fetchGitHubFile(owner, repo, versionPath, branch);
        if (content) {
            console.log(`[fetchVersionChangelog] Successfully fetched version changelog, length: ${content.length} characters`);
            return content;
        }
    }

    console.log(`[fetchVersionChangelog] Failed to fetch version-specific changelog from any branch`);
    return null;
}

/**
 * Check if a release body is just a placeholder pointing to CHANGELOG.md
 */
function isPlaceholderRelease(body: string): boolean {
    if (!body || body.trim().length < 20) return true;

    const lowerBody = body.toLowerCase();
    // Check for common placeholder patterns
    const placeholderPatterns = [
        /please refer to changelog/i,
        /see changelog/i,
        /refer to changelog\.md/i,
        /for details.*changelog/i,
        /changelog\.md for details/i,
        /for stable releases.*please refer to changelog/i,
        /for pre-releases.*please refer to changelog/i,
        /for stable releases.*refer to/i,
        /for pre-releases.*refer to/i,
    ];

    // If it matches placeholder patterns, it's a placeholder
    // Also check if the body is mostly just placeholder text (less than 200 chars is a strong indicator)
    const matchesPlaceholder = placeholderPatterns.some(pattern => pattern.test(lowerBody));
    const isShortPlaceholder = matchesPlaceholder && body.length < 200;

    // Also check if the body is ONLY placeholder text (even if longer)
    // This handles cases where there might be some extra whitespace but no actual content
    const nonEmptyLines = body.split('\n').filter(line => {
        const trimmed = line.trim();
        return trimmed.length > 0 && !trimmed.match(/^#+\s+/); // Exclude headers
    });

    const hasOnlyPlaceholderContent = matchesPlaceholder &&
        nonEmptyLines.length > 0 &&
        nonEmptyLines.every(line => {
            const lower = line.toLowerCase();
            return placeholderPatterns.some(p => p.test(lower)) || line.trim().length === 0;
        });

    // Also check if body doesn't contain actual changelog content indicators
    // Real changelogs usually have: bug fixes, features, breaking changes, etc.
    const hasRealContent = /(bug\s+fix|feature|breaking|security|performance|fix:|feat:)/i.test(lowerBody) &&
        !lowerBody.match(/^(for\s+(stable|pre-)?releases?|please\s+refer)/i);

    const isPlaceholder = (isShortPlaceholder || hasOnlyPlaceholderContent) && !hasRealContent;

    // Only log detailed info for debugging if needed (reduce verbosity)
    // Uncomment for debugging:
    // console.log(`[isPlaceholderRelease] Body length: ${body.length}, matchesPlaceholder: ${matchesPlaceholder}, isShortPlaceholder: ${isShortPlaceholder}, hasOnlyPlaceholderContent: ${hasOnlyPlaceholderContent}, hasRealContent: ${hasRealContent}, result: ${isPlaceholder}`);

    return isPlaceholder;
}

/**
 * Strip URLs and links from changelog content to optimize for AI processing
 * Only removes URLs, keeps the actual content
 */
function stripUrlsFromChangelog(content: string): string {
    if (!content || content.trim().length === 0) return content;

    // Remove markdown links: [text](url) -> text (keep the text)
    content = content.replace(/\[([^\]]+)\]\([^\)]+\)/g, "$1");

    // Remove plain URLs: http://... or https://... (but keep surrounding text)
    content = content.replace(/https?:\/\/[^\s\)]+/g, "");

    // Remove GitHub issue/PR references: #123 or closes #123 (but keep the sentence)
    content = content.replace(/(?:closes?|fixes?|resolves?)\s*#\d+/gi, "");
    content = content.replace(/#\d+/g, "");

    // Remove commit hash references: (abc1234) or [abc1234]
    content = content.replace(/\[?[a-f0-9]{7,}\]?/gi, "");

    // Remove empty parentheses and brackets that were left after removing links/URLs
    content = content.replace(/\s*\(\s*\)/g, ""); // Remove empty parentheses
    content = content.replace(/\s*\[\s*\]/g, ""); // Remove empty brackets
    content = content.replace(/\s*,\s*,\s*/g, ","); // Remove double commas
    content = content.replace(/\s*,\s*$/gm, ""); // Remove trailing commas at end of lines

    // Clean up extra whitespace but preserve structure
    content = content.replace(/\n{3,}/g, "\n\n");
    // Only collapse multiple spaces, not all whitespace
    content = content.replace(/[ \t]{2,}/g, " ");

    return content.trim();
}

/**
 * Extract release notes between currentVersion and latestVersion
 * Prioritizes GitHub releases, falls back to CHANGELOG.md parsing
 * For major upgrades, prioritizes the major version release (e.g., 3.0.0)
 */
async function extractReleaseNotes(
    owner: string,
    repo: string,
    currentVersion: string,
    latestVersion: string
): Promise<string> {
    console.log(`[extractReleaseNotes] Extracting notes for ${owner}/${repo} from ${currentVersion} to ${latestVersion}`);
    const current = parseVersion(currentVersion);
    const latest = parseVersion(latestVersion);
    const isMajorUpgrade = current && latest && latest.major > current.major;
    console.log(`[extractReleaseNotes] Is major upgrade: ${isMajorUpgrade}, Current: ${JSON.stringify(current)}, Latest: ${JSON.stringify(latest)}`);

    // Try to fetch releases first (more structured)
    console.log(`[extractReleaseNotes] Fetching GitHub releases...`);
    const releases = await fetchGitHubReleases(owner, repo);
    console.log(`[extractReleaseNotes] Found ${releases.length} releases`);

    if (releases.length > 0) {
        // Filter releases between current and latest versions
        let relevantReleases = releases
            .filter((releaseItem) => {
                if (releaseItem.prerelease) return false;
                const releaseVersion = releaseItem.tag_name.replace(/^v/i, "");
                const releaseVersionParsed = parseVersion(releaseVersion);

                if (!current || !latest || !releaseVersionParsed) return false;

                // Include if release is between current and latest
                if (releaseVersionParsed.major < current.major) return false;
                if (releaseVersionParsed.major > latest.major) return false;
                if (releaseVersionParsed.major === current.major && releaseVersionParsed.minor < current.minor) return false;
                if (releaseVersionParsed.major === latest.major && releaseVersionParsed.minor > latest.minor) return false;

                return true;
            });

        // Check if releases have actual content (not just placeholders)
        const releasesWithContent = relevantReleases.filter(r => !isPlaceholderRelease(r.body));
        console.log(`[extractReleaseNotes] Relevant releases: ${relevantReleases.length}, With content: ${releasesWithContent.length}`);

        // Debug: log sample release body only if all are placeholders
        if (relevantReleases.length > 0 && releasesWithContent.length === 0) {
            console.log(`[extractReleaseNotes] All releases are placeholders. Sample:`, relevantReleases[0].body?.substring(0, 200));
        }

        // Only use releases if at least some have actual content
        if (releasesWithContent.length > 0) {
            console.log(`[extractReleaseNotes] Using GitHub releases with content`);
            // For major upgrades, prioritize the major version release (e.g., 3.0.0)
            if (isMajorUpgrade) {
                const majorVersionRelease = releasesWithContent.find((r) => {
                    const releaseVersion = r.tag_name.replace(/^v/i, "");
                    const parsed = parseVersion(releaseVersion);
                    return parsed && parsed.major === latest.major && parsed.minor === 0 && parsed.patch === 0;
                });

                if (majorVersionRelease) {
                    // Return the major version release plus a few recent releases
                    const otherReleases = releasesWithContent
                        .filter((r) => r.tag_name !== majorVersionRelease.tag_name)
                        .slice(0, 3); // Get top 3 other releases

                    const allReleases = [majorVersionRelease, ...otherReleases];
                    const content = allReleases
                        .map((r) => `## ${r.name || r.tag_name}\n\n${r.body}`)
                        .join("\n\n---\n\n");
                    console.log(`[extractReleaseNotes] Returning ${allReleases.length} releases with content, total length: ${content.length}`);
                    return content;
                }
            }

            // Limit to most recent releases with content to control latency
            const limitedReleases = releasesWithContent.slice(0, 10);
            const content = limitedReleases
                .map((r) => `## ${r.name || r.tag_name}\n\n${r.body}`)
                .join("\n\n---\n\n");
            console.log(`[extractReleaseNotes] Returning ${limitedReleases.length} releases with content, total length: ${content.length}`);
            return content;
        }
        // If all releases are placeholders, try using the new changelog parser to fetch CHANGELOG.md directly
        console.log(`[extractReleaseNotes] All ${relevantReleases.length} relevant releases are placeholders, trying changelog parser...`);

        // Try to fetch and parse CHANGELOG.md using the new parser
        try {
            const changelogUrl = `https://github.com/${owner}/${repo}/blob/main/CHANGELOG.md`;
            console.log(`[extractReleaseNotes] Attempting to fetch and parse CHANGELOG.md from ${changelogUrl}`);

            const changelogText = await fetchChangelogFromUrl(changelogUrl);
            if (changelogText && changelogText.length > 100) {
                // Use the existing parsing logic but with the fetched content
                // This ensures we get the actual changelog content, not placeholder text
                console.log(`[extractReleaseNotes] Successfully fetched CHANGELOG.md via parser, length: ${changelogText.length}`);
                // Continue with existing parsing logic below
            } else {
                console.log(`[extractReleaseNotes] Changelog parser returned empty or short content, falling back to manual fetch`);
            }
        } catch (error) {
            console.log(`[extractReleaseNotes] Changelog parser failed, falling back to manual fetch:`, error);
        }

        // Fall through to manual CHANGELOG.md fetch below
    } else {
        console.log(`[extractReleaseNotes] No releases found, falling back to CHANGELOG.md`);
    }

    // Fallback to CHANGELOG.md - try using changelog parser first for better parsing
    console.log(`[extractReleaseNotes] Fetching CHANGELOG.md from ${owner}/${repo}...`);

    // Try using the new changelog parser which handles URLs better
    let mainChangelog: string | null = null;
    try {
        const changelogUrl = `https://github.com/${owner}/${repo}/blob/main/CHANGELOG.md`;
        mainChangelog = await fetchChangelogFromUrl(changelogUrl);
        if (mainChangelog) {
            console.log(`[extractReleaseNotes] Fetched CHANGELOG.md via parser, length: ${mainChangelog.length} characters`);
        }
    } catch (error) {
        console.log(`[extractReleaseNotes] Parser fetch failed, trying manual fetch:`, error);
    }

    // Fallback to manual fetch if parser didn't work
    if (!mainChangelog) {
        mainChangelog = await fetchChangelog(owner, repo);
        if (mainChangelog) {
            console.log(`[extractReleaseNotes] Fetched main changelog manually, length: ${mainChangelog.length} characters`);
        }
    }

    if (mainChangelog) {
        let extractedContent = "";

        // For major upgrades, check if there's a separate version-specific changelog
        if (isMajorUpgrade && latest) {
            console.log(`[extractReleaseNotes] Major upgrade detected, looking for version-specific changelog for v${latest.major}.0`);
            // First, try to fetch the version-specific changelog (e.g., CHANGELOG-3.0.md)
            const versionChangelog = await fetchVersionChangelog(owner, repo, latest.major, mainChangelog);
            if (versionChangelog) {
                console.log(`[extractReleaseNotes] Found version-specific changelog, length: ${versionChangelog.length} characters`);
            } else {
                console.log(`[extractReleaseNotes] No version-specific changelog found, using main changelog`);
            }
            const changelogToUse = versionChangelog || mainChangelog;

            // Try multiple patterns for major version header
            const majorVersionPatterns = [
                new RegExp(`(?:^|\\n)#+\\s+.*?\\[?v?${latest.major}\\.0\\.0[^\\d\\]]`, "i"),
                new RegExp(`(?:^|\\n)##?\\s+.*?v?${latest.major}\\.0\\.0[^\\d]`, "i"),
                new RegExp(`(?:^|\\n)##?\\s+.*?v?${latest.major}\\.0[^\\d]`, "i"),
                new RegExp(`(?:^|\\n)##?\\s+.*?${latest.major}\\.0\\.0`, "i"),
                new RegExp(`(?:^|\\n)#+\\s+.*?${latest.major}\\.0`, "i"),
            ];

            let majorStartIndex = -1;
            for (const pattern of majorVersionPatterns) {
                const match = changelogToUse.match(pattern);
                if (match && match.index !== undefined) {
                    majorStartIndex = match.index;
                    break;
                }
            }

            if (majorStartIndex >= 0) {
                console.log(`[extractReleaseNotes] Found major version header at index ${majorStartIndex}`);
                // Extract from major version release to latest, or a large chunk
                const latestPattern = new RegExp(`(?:^|\\n)##?\\s+.*?v?${latestVersion.replace(/\./g, "\\.")}`, "i");
                const latestMatch = changelogToUse.substring(majorStartIndex).match(latestPattern);

                if (latestMatch && latestMatch.index !== undefined) {
                    const endIndex = majorStartIndex + latestMatch.index + latestMatch[0].length;
                    extractedContent = changelogToUse.substring(majorStartIndex, endIndex);
                    console.log(`[extractReleaseNotes] Extracted content from major version to latest, length: ${extractedContent.length}`);
                } else {
                    // If no latest match, get a large chunk from major version (up to 20000 chars)
                    // This ensures we get the full major version release notes with all features
                    const endIndex = Math.min(majorStartIndex + 20000, changelogToUse.length);
                    extractedContent = changelogToUse.substring(majorStartIndex, endIndex);
                    console.log(`[extractReleaseNotes] Extracted large chunk from major version, length: ${extractedContent.length}`);
                }
            } else if (versionChangelog) {
                // If we have a version-specific changelog but couldn't find the exact version header,
                // use the first substantial portion (likely contains the major version release)
                extractedContent = versionChangelog.substring(0, Math.min(20000, versionChangelog.length));
                console.log(`[extractReleaseNotes] Using version-specific changelog content, length: ${extractedContent.length}`);
            } else {
                console.log(`[extractReleaseNotes] Could not find major version header in changelog`);
            }
        }

        // If we didn't extract major version content, try standard extraction
        if (!extractedContent) {
            console.log(`[extractReleaseNotes] Trying standard extraction between ${currentVersion} and ${latestVersion}`);
            const currentPattern = new RegExp(`(?:^|\\n)##?\\s+.*?${currentVersion.replace(/\./g, "\\.")}`, "i");
            const latestPattern = new RegExp(`(?:^|\\n)##?\\s+.*?${latestVersion.replace(/\./g, "\\.")}`, "i");

            const currentMatch = mainChangelog.match(currentPattern);
            const latestMatch = mainChangelog.match(latestPattern);

            if (currentMatch && latestMatch) {
                const startIndex = currentMatch.index!;
                const endIndex = latestMatch.index! + latestMatch[0].length;
                extractedContent = mainChangelog.substring(startIndex, endIndex);
                console.log(`[extractReleaseNotes] Standard extraction successful, length: ${extractedContent.length}`);
            } else {
                // If exact match fails, return recent portion of changelog
                extractedContent = mainChangelog.split("\n").slice(0, 200).join("\n");
                console.log(`[extractReleaseNotes] Using recent portion of changelog, length: ${extractedContent.length}`);
            }
        }

        console.log(`[extractReleaseNotes] Final extracted content length: ${extractedContent.length} characters`);
        return extractedContent;
    } else {
        console.log(`[extractReleaseNotes] No changelog found`);
    }

    return "";
}

/**
 * Extract benefits manually from changelog when AI is unavailable
 * Looks for common patterns like "Features", "New", "Added", etc.
 */
function extractBenefitsManually(changelogContent: string): string[] {
    console.log(`[extractBenefitsManually] Starting manual extraction, content length: ${changelogContent.length}`);
    const benefits: string[] = [];
    const content = changelogContent.toLowerCase();
    const originalContent = changelogContent; // Keep original for case-sensitive searches

    // Look for feature sections (case-insensitive)
    const featurePatterns = [
        /##\s+features?/i,
        /###\s+features?/i,
        /#\s+features?/i,
        /features?:/i,
    ];
    const hasFeatures = featurePatterns.some(pattern => pattern.test(originalContent));
    if (hasFeatures) {
        benefits.push("AI Summary not available");
    }

    // Look for breaking changes (important to mention)
    const breakingPatterns = [
        /breaking\s+changes?/i,
        /##\s+breaking/i,
        /###\s+breaking/i,
        /\*\s*\*\*breaking\*\*/i,
    ];
    const hasBreaking = breakingPatterns.some(pattern => pattern.test(originalContent));
    if (hasBreaking) {
        benefits.push("Breaking changes - review migration guide before upgrading");
    }

    // Look for security fixes
    const securityPatterns = [
        /security/i,
        /vulnerability/i,
        /cve-\d+/i,
        /security\s+fix/i,
    ];
    const hasSecurity = securityPatterns.some(pattern => pattern.test(originalContent));
    if (hasSecurity) {
        benefits.push("Security fixes and vulnerability patches");
    }

    // Look for performance improvements
    const performancePatterns = [
        /performance/i,
        /optimize/i,
        /faster/i,
        /speed/i,
        /performance\s+improvement/i,
    ];
    const hasPerformance = performancePatterns.some(pattern => pattern.test(originalContent));
    if (hasPerformance) {
        benefits.push("Performance improvements and optimizations");
    }

    // Look for bug fixes
    const bugFixPatterns = [
        /bug\s+fix/i,
        /bugfix/i,
        /fixed\s+.*bug/i,
        /fixes\s+.*issue/i,
        /##\s+bug\s+fixes/i,
    ];
    const hasBugFixes = bugFixPatterns.some(pattern => pattern.test(originalContent));
    if (hasBugFixes) {
        benefits.push("Bug fixes and stability improvements");
    }

    // Look for new APIs or additions
    const newApiPatterns = [
        /new\s+api/i,
        /added\s+.*api/i,
        /introduces\s+.*api/i,
        /new\s+.*endpoint/i,
        /new\s+.*method/i,
    ];
    const hasNewApi = newApiPatterns.some(pattern => pattern.test(originalContent));
    if (hasNewApi) {
        benefits.push("New APIs and capabilities added");
    }

    // Look for improvements or enhancements
    const improvementPatterns = [
        /improvement/i,
        /enhancement/i,
        /better\s+.*support/i,
        /improved\s+.*experience/i,
    ];
    const hasImprovements = improvementPatterns.some(pattern => pattern.test(originalContent)) && benefits.length < 3;
    if (hasImprovements) {
        benefits.push("General improvements and enhancements");
    }

    // Try to extract specific feature mentions from changelog
    // Look for bullet points or list items that mention new features
    const featureLines = originalContent.split('\n')
        .filter(line => {
            const lower = line.toLowerCase();
            return (
                (lower.includes('*') || lower.includes('-') || lower.startsWith('#')) &&
                (lower.includes('new') || lower.includes('add') || lower.includes('introduce') || lower.includes('support')) &&
                !lower.includes('bug') &&
                !lower.includes('fix') &&
                line.trim().length > 20
            );
        })
        .slice(0, 3); // Get up to 3 feature lines

    if (featureLines.length > 0 && benefits.length < 5) {
        // Extract concise benefit from feature lines
        featureLines.forEach(line => {
            if (benefits.length >= 5) return;
            // Clean up the line and make it a benefit statement
            const cleaned = line
                .replace(/^[#\*\-\s]+/, '') // Remove markdown formatting
                .replace(/\[.*?\]\(.*?\)/g, '') // Remove links
                .trim();
            if (cleaned.length > 10 && cleaned.length < 100) {
                // Capitalize first letter
                const benefit = cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
                if (!benefits.includes(benefit)) {
                    benefits.push(benefit);
                }
            }
        });
    }

    // If we found some benefits, return them
    if (benefits.length > 0) {
        console.log(`[extractBenefitsManually] Found ${benefits.length} benefits:`, benefits);
        return benefits.slice(0, 5);
    }

    console.log(`[extractBenefitsManually] No benefits found with pattern matching`);

    // Fallback: try to provide at least some useful information
    // Check if there's substantial content (not just headers)
    const hasSubstantialContent = originalContent.split('\n')
        .filter(line => line.trim().length > 20 && !line.match(/^#+\s/))
        .length > 5;

    if (hasSubstantialContent) {
        return [
            "Changelog contains detailed release notes",
            "Review the changelog for specific upgrade benefits",
            "Consider checking the package documentation for migration guides"
        ];
    }

    // Final fallback message
    return ["Changelog content available but AI analysis unavailable. Review changelog manually for upgrade benefits."];
}

/**
 * Use Cloudflare Workers AI to summarize benefits from changelog content
 */
async function summarizeBenefitsWithAI(
    ai: any, // Workers AI binding
    packageName: string,
    currentVersion: string,
    latestVersion: string,
    changelogContent: string
): Promise<string[]> {
    if (!changelogContent.trim()) {
        return ["No changelog information available to analyze."];
    }

    // Strip URLs and optimize changelog content before sending to AI
    console.log(`[summarizeBenefitsWithAI] Original changelog length: ${changelogContent.length} characters`);
    let optimizedContent = stripUrlsFromChangelog(changelogContent);
    console.log(`[summarizeBenefitsWithAI] After URL stripping: ${optimizedContent.length} characters`);

    // Limit content length to avoid token limits
    // Workers AI has token limits (~4000 tokens for free tier, ~32000 for paid)
    // Estimate: ~4 characters per token, so 3000 tokens ≈ 12000 chars
    // Be very conservative: use 3000 chars to leave room for prompt (~400 chars) and response
    // This reduces the chance of hitting token limits
    const maxLength = 3000;
    if (optimizedContent.length > maxLength) {
        // Try to keep the beginning (usually most important for major releases)
        // Focus on the first part which typically contains the major version release notes
        optimizedContent = optimizedContent.substring(0, maxLength) + "\n\n[... truncated for length ...]";
        console.log(`[summarizeBenefitsWithAI] Truncated to ${maxLength} characters`);
    }

    const prompt = `Analyze upgrade benefits for ${packageName} ${currentVersion} → ${latestVersion}.

Extract ONLY real benefits from the changelog. Be factual.

Rules:
- Only use information from the changelog below
- Do NOT invent features
- If mostly bug fixes, say so
- Provide 5 concise benefit lines (or fewer)

Changelog:
${optimizedContent}

Provide 5 benefit lines, one per line, no bullets:`;

    const promptLength = prompt.length;
    const estimatedTokens = Math.ceil(promptLength / 4); // Rough estimate: 4 chars per token
    console.log(`[summarizeBenefitsWithAI] Prompt length: ${promptLength} chars, estimated tokens: ${estimatedTokens}`);

    // Retry logic for transient errors (rate limiting, service unavailable)
    const maxRetries = 2;
    let lastError: any = null;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
            if (attempt > 0) {
                // Exponential backoff: wait 1s, then 2s
                const waitTime = Math.pow(2, attempt - 1) * 1000;
                console.log(`[summarizeBenefitsWithAI] Retry attempt ${attempt}/${maxRetries} after ${waitTime}ms delay`);
                await new Promise(resolve => setTimeout(resolve, waitTime));
            }

            console.log(`[summarizeBenefitsWithAI] Calling AI with model @cf/meta/llama-3.1-8b-instruct (attempt ${attempt + 1}/${maxRetries + 1})`);
            const response = await ai.run("@cf/meta/llama-3.1-8b-instruct", {
                messages: [
                    {
                        role: "user",
                        content: prompt,
                    },
                ],
                max_tokens: 300, // Reduced to avoid token limits
            });

            const summary = response.response || "";
            console.log(`[summarizeBenefitsWithAI] AI response received, length: ${summary.length} characters`);
            console.log(`[summarizeBenefitsWithAI] Full AI summary:`, summary);

            // Split into lines and clean up
            const benefits = summary
                .split("\n")
                .map((line: string) => line.trim())
                .filter((line: string) => line.length > 0 && !line.match(/^(benefits?:|summary:)/i))
                .slice(0, 5);

            console.log(`[summarizeBenefitsWithAI] Extracted ${benefits.length} benefit lines:`, benefits);
            return benefits.length > 0 ? benefits : [""];
        } catch (error: any) {
            lastError = error;

            // Check if this is a retryable error (1031 - rate limit/service error)
            const errorMessage = error?.message || error?.toString() || String(error);
            const errorCode = error?.code ||
                error?.errorCode ||
                (errorMessage.match(/error code: (\d+)/i)?.[1]) ||
                (errorMessage.match(/code[:\s]+(\d+)/i)?.[1]);

            const isRetryableError = errorCode === "1031" ||
                errorCode === 1031 ||
                errorMessage.includes("1031") ||
                errorMessage.includes("InferenceUpstreamError");

            // If it's a retryable error and we have retries left, continue the loop
            if (isRetryableError && attempt < maxRetries) {
                console.log(`[summarizeBenefitsWithAI] Retryable error on attempt ${attempt + 1}, will retry...`);
                continue;
            }

            // If not retryable or out of retries, break and handle error
            break;
        }
    }

    // If we get here, all retries failed or it was a non-retryable error
    // Fall back to manual extraction
    const error: any = lastError;
    if (error) {
        console.error("[summarizeBenefitsWithAI] AI summarization failed after retries:", error);
        console.error("[summarizeBenefitsWithAI] Error type:", error?.constructor?.name);
        console.error("[summarizeBenefitsWithAI] Error message:", error?.message);
        console.error("[summarizeBenefitsWithAI] Error code:", error?.code);
        console.error("[summarizeBenefitsWithAI] Error stack:", error?.stack);

        // Check for specific error codes - handle InferenceUpstreamError and other error types
        const errorMessage = error?.message || error?.toString() || String(error);
        const errorCode = error?.code ||
            error?.errorCode ||
            (errorMessage.match(/error code: (\d+)/i)?.[1]) ||
            (errorMessage.match(/code[:\s]+(\d+)/i)?.[1]);

        console.log(`[summarizeBenefitsWithAI] Extracted error code: ${errorCode}, error message contains '1031': ${errorMessage.includes("1031")}`);

        // Error code 1031 is typically one of:
        // - Rate limiting (too many requests)
        // - Service unavailable
        // - Token limit exceeded
        // - Invalid request format
        // Also check for InferenceUpstreamError which contains the error code
        const hasError1031 = errorCode === "1031" ||
            errorCode === 1031 ||
            errorMessage.includes("1031") ||
            errorMessage.includes("InferenceUpstreamError");

        if (hasError1031) {
            console.log("[summarizeBenefitsWithAI] AI service error 1031 detected");
            console.log("[summarizeBenefitsWithAI] Possible causes:");
            console.log("  - Rate limiting: Too many requests in short time");
            console.log("  - Service unavailable: Cloudflare AI service temporarily down");
            console.log(`  - Token limit exceeded: Prompt too long (estimated: ${estimatedTokens} tokens)`);
            console.log("  - Account limits: Free tier limits reached");
            console.log("[summarizeBenefitsWithAI] Using manual extraction fallback");
            // Fallback: try to extract benefits manually from changelog
            const manualBenefits = extractBenefitsManually(optimizedContent);
            console.log(`[summarizeBenefitsWithAI] Manual extraction returned ${manualBenefits.length} benefits`);
            return manualBenefits;
        }

        // For other errors, also try manual extraction as fallback
        console.log("[summarizeBenefitsWithAI] AI error occurred (not 1031), attempting manual extraction");
        const manualBenefits = extractBenefitsManually(optimizedContent);
        console.log(`[summarizeBenefitsWithAI] Manual extraction returned ${manualBenefits.length} benefits`);
        if (manualBenefits.length > 0 && !manualBenefits[0].includes("unavailable")) {
            return manualBenefits;
        }

        // Final fallback message
        console.log("[summarizeBenefitsWithAI] No benefits found, returning fallback message");
        return ["Unable to analyze changelog content with AI. Please try again later or review the changelog manually."];
    }

    // If no error occurred but we somehow reached here, fall back to manual extraction
    console.log("[summarizeBenefitsWithAI] Unexpected state, using manual extraction fallback");
    return extractBenefitsManually(optimizedContent);
}

/**
 * Calculate Updateness Score (0-100)
 * Based on how far behind the dependency is (major.minor format)
 * - 0.0 versions behind = 100
 * - 0.x (minor only) = 90-95 (scaled by minor versions)
 * - 1.0 = 70
 * - 1.x = 60-70 (scaled by minor versions)
 * - 2.0 = 40
 * - 2.x = 30-40 (scaled by minor versions)
 * - 3+ major versions = 10
 */
function calculateUpdatenessScore(versionsBehind: string): number {
    const [major, minor] = versionsBehind.split('.').map(Number);

    if (major === 0 && minor === 0) return 100;

    if (major === 0) {
        // Only minor versions behind: 90-95 based on minor count
        return Math.max(90 - (minor * 0.5), 85);
    }

    if (major === 1) {
        // 1 major version behind: 60-70 based on minor count
        const baseScore = 70;
        const minorPenalty = Math.min(minor * 2, 10);
        return Math.max(baseScore - minorPenalty, 60);
    }

    if (major === 2) {
        // 2 major versions behind: 30-40 based on minor count
        const baseScore = 40;
        const minorPenalty = Math.min(minor * 2, 10);
        return Math.max(baseScore - minorPenalty, 30);
    }

    // 3+ major versions behind
    return 10;
}

/**
 * Calculate Upgrade Value Score (0-100)
 * Based on the significance of changes found in the changelog
 * Uses heuristics: presence of features, breaking changes, security fixes, etc.
 */
function calculateUpgradeValueScore(changelogContent: string, versionsBehind: string): number {
    const numericVersionsBehind = versionsBehindToNumeric(versionsBehind);

    if (!changelogContent.trim()) {
        // No changelog available - moderate score based on versions behind
        return numericVersionsBehind > 0 ? 50 : 0;
    }

    const content = changelogContent.toLowerCase();
    let score = 30; // Base score for having changelog

    // Detect significant indicators
    if (content.includes("breaking") || content.includes("major")) {
        score += 20; // Breaking changes indicate significant updates
    }
    if (content.includes("security") || content.includes("vulnerability") || content.includes("cve")) {
        score += 25; // Security fixes are high value
    }
    if (content.includes("feature") || content.includes("new") || content.includes("add")) {
        score += 15; // New features add value
    }
    if (content.includes("performance") || content.includes("speed") || content.includes("optimize")) {
        score += 10; // Performance improvements
    }
    if (content.includes("bug") || content.includes("fix")) {
        score += 5; // Bug fixes are valuable but less exciting
    }

    // Adjust based on versions behind (more versions = potentially more value)
    if (numericVersionsBehind > 0) {
        const [major, minor] = versionsBehind.split('.').map(Number);
        // Weight major versions more heavily
        const versionBonus = (major * 5) + Math.min(minor * 0.5, 5);
        score += Math.min(versionBonus, 20);
    }

    // Cap at 100
    return Math.min(score, 100);
}

/**
 * Generate verdict sentence based on scores
 */
function generateVerdict(updatenessScore: number, upgradeValueScore: number, versionsBehind: string): string {
    const [major, minor] = versionsBehind.split('.').map(Number);
    if (major === 0 && minor === 0) {
        return "You're up to date - no upgrade needed.";
    }

    if (upgradeValueScore >= 70 && updatenessScore <= 40) {
        return "High-value upgrade recommended - significant improvements available.";
    }

    if (upgradeValueScore >= 50) {
        return "Moderate upgrade value - consider updating when convenient.";
    }

    if (updatenessScore <= 40) {
        return "You're significantly behind - upgrade recommended for security and compatibility.";
    }

    return "Low priority upgrade - mostly internal changes or minor improvements.";
}

/**
 * Main Package FOMO analysis function
 * 
 * @param packageName - Name of the npm package
 * @param currentVersion - Current version being used
 * @param ai - Cloudflare Workers AI binding (from env.AI)
 * @returns Package FOMO analysis result
 */
export async function analyzePackageFomo(
    packageName: string,
    currentVersion: string,
    ai: any // Workers AI binding
): Promise<PackageFomoResult> {
    console.log(`[PackageFomo] Starting analysis for ${packageName}@${currentVersion}`);

    // Step 1: Fetch npm package metadata
    console.log(`[PackageFomo] Fetching npm metadata for ${packageName}...`);
    const npmMetadata = await fetchNpmMetadata(packageName);

    if (!npmMetadata) {
        console.error(`[PackageFomo] Failed to fetch npm metadata for ${packageName}`);
        throw new Error(`Failed to fetch metadata for package: ${packageName}`);
    }

    const latestVersion = npmMetadata["dist-tags"].latest;
    console.log(`[PackageFomo] Latest version: ${latestVersion}, Current: ${currentVersion}`);

    // Step 2: Calculate versions behind (major.minor format)
    const versionsBehind = calculateVersionsBehind(currentVersion, latestVersion);
    console.log(`[PackageFomo] Versions behind: ${versionsBehind}`);

    // Step 3: Extract repository information
    const repoUrl = npmMetadata.repository?.url || "";
    console.log(`[PackageFomo] Repository URL: ${repoUrl || "none"}`);
    const githubRepo = repoUrl ? extractGitHubRepo(repoUrl) : null;
    if (githubRepo) {
        console.log(`[PackageFomo] Extracted GitHub repo: ${githubRepo.owner}/${githubRepo.repo}`);
    } else {
        console.log(`[PackageFomo] No GitHub repository found`);
    }

    // Step 4: Fetch changelog/releases in parallel with other operations
    let changelogContent = "";
    if (githubRepo) {
        console.log(`[PackageFomo] Fetching release notes from GitHub...`);
        changelogContent = await extractReleaseNotes(
            githubRepo.owner,
            githubRepo.repo,
            currentVersion,
            latestVersion
        );
        console.log(`[PackageFomo] Changelog content length: ${changelogContent.length} characters`);
    } else {
        console.log(`[PackageFomo] Skipping changelog fetch - no GitHub repo`);
    }

    // Step 5: Use AI to summarize benefits (single AI call)
    console.log(`[PackageFomo] Summarizing benefits with AI...`);
    const benefitsSummary = await summarizeBenefitsWithAI(
        ai,
        packageName,
        currentVersion,
        latestVersion,
        changelogContent
    );
    console.log(`[PackageFomo] Benefits summary (${benefitsSummary.length} items):`, benefitsSummary);

    // Step 6: Calculate scores
    const updatenessScore = calculateUpdatenessScore(versionsBehind);
    const upgradeValueScore = calculateUpgradeValueScore(changelogContent, versionsBehind);
    console.log(`[PackageFomo] Scores - Updateness: ${updatenessScore}, Upgrade Value: ${upgradeValueScore}`);

    // Step 7: Generate verdict
    const verdict = generateVerdict(updatenessScore, upgradeValueScore, versionsBehind);
    console.log(`[PackageFomo] Verdict: ${verdict}`);

    return {
        latestVersion,
        versionsBehind,
        updatenessScore,
        upgradeValueScore,
        benefitsSummary,
        verdict,
    };
}
