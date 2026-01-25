/**
 * Changelog Parser
 * 
 * Parses markdown changelogs into structured data, ignoring alpha/beta versions.
 * Supports common changelog formats like Keep a Changelog, GitHub releases, etc.
 */

/**
 * Structured changelog entry for a version
 */
export interface ChangelogEntry {
    /** Version string (e.g., "3.5.26") */
    version: string;
    /** Release date if available */
    date?: string;
    /** General comment/description for this version */
    comment?: string;
    /** Array of bug fixes */
    fixes: string[];
    /** Array of new features */
    feat: string[];
    /** Array of security-related changes */
    security: string[];
    /** Array of performance improvements */
    performance: string[];
    /** Array of breaking changes */
    breaking: string[];
    /** Array of other changes (deprecations, refactors, etc.) */
    other: string[];
    /** Link to release/compare URL if available */
    link?: string;
}

/**
 * Check if a version string is a pre-release (alpha, beta, rc, etc.)
 */
export function isPrerelease(version: string): boolean {
    const cleaned = version.replace(/^v/i, "").toLowerCase();
    // Match patterns like: 3.5.0-alpha.1, 3.5.0-beta.2, 3.5.0-rc.1, 3.5.0-alpha1, etc.
    return /[-.](alpha|beta|rc|pre|dev|snapshot|canary|next)/i.test(cleaned) ||
           /-\d+$/.test(cleaned) && !/^\d+\.\d+\.\d+$/.test(cleaned.split('-')[0]);
}

/**
 * Parse semantic version string into parts
 */
function parseVersion(version: string): { major: number; minor: number; patch: number } | null {
    const cleaned = version.replace(/^v/i, "");
    // Extract base version before any pre-release suffix
    const baseVersion = cleaned.split(/[-+]/)[0];
    const match = baseVersion.match(/^(\d+)\.(\d+)\.(\d+)/);
    if (!match) return null;

    return {
        major: parseInt(match[1], 10),
        minor: parseInt(match[2], 10),
        patch: parseInt(match[3], 10),
    };
}

/**
 * Extract version number and optional link from a changelog header
 * Handles formats like:
 * - ## [3.5.26](https://github.com/vuejs/core/compare/v3.5.25...v3.5.26) (2025-12-18)
 * - ## 3.5.26 (2025-12-18)
 * - ## [3.5.26]
 * - ### 3.5.26
 * - ## v2.1.0 (2024-03-15)
 */
function parseVersionHeader(line: string): { version: string; date?: string; link?: string } | null {
    // Match markdown headers with version and optional link/date
    // Pattern: ## [version](link) (date) or ## version (date) or ## version
    const patterns = [
        // ## [3.5.26](https://...) (2025-12-18)
        /^#{1,6}\s+\[([^\]]+)\]\(([^)]+)\)\s*(?:\(([^)]+)\))?/i,
        // ## 3.5.26 (2025-12-18) or ## v2.1.0 (2024-03-15)
        /^#{1,6}\s+(?:v)?(\d+\.\d+\.\d+[^\s]*)\s*(?:\(([^)]+)\))?/i,
        // ## [3.5.26]
        /^#{1,6}\s+\[([^\]]+)\]/i,
    ];

    for (const pattern of patterns) {
        const match = line.match(pattern);
        if (match) {
            let version: string | undefined;
            let link: string | undefined;
            let date: string | undefined;

            if (pattern.source.includes('\\[')) {
                // Pattern with brackets: [version](link) (date)
                version = match[1];
                link = match[2] && match[2].startsWith('http') ? match[2] : undefined;
                date = match[3];
            } else if (pattern.source.includes('v)?')) {
                // Pattern without brackets: version (date) or v2.1.0 (date)
                version = match[1];
                date = match[2];
            } else {
                // Pattern with just brackets: [version]
                version = match[1];
            }
            
            // Only return if it looks like a version number
            if (version && /^\d+\.\d+\.\d+/.test(version.replace(/^v/i, ""))) {
                return { version: version.replace(/^v/i, ""), date, link };
            }
        }
    }

    return null;
}

/**
 * Categorize a changelog line into a category
 */
function categorizeChange(line: string): { category: keyof ChangelogEntry; text: string } | null {
    const trimmed = line.trim();
    if (!trimmed || trimmed.length < 5) return null;

    // Remove markdown list markers and common prefixes
    // Also handle Vue-style entries like "**compat:** fix ..."
    let cleaned = trimmed
        .replace(/^[-*+]\s+/, '')
        .replace(/^\d+\.\s+/, '')
        .replace(/^#{1,6}\s+/, '')
        .replace(/^\*\*[^*]+\*\*:\s*/, '') // Remove **prefix:** from Vue-style entries
        .trim();

    if (!cleaned) return null;

    const lower = cleaned.toLowerCase();

    // Security changes
    if (/security|vulnerability|cve-\d+|security\s+fix|security\s+patch/i.test(lower)) {
        return { category: 'security', text: cleaned };
    }

    // Breaking changes
    if (/breaking|breaking\s+change|migration|deprecat/i.test(lower) && 
        !/non-breaking|not\s+breaking/i.test(lower)) {
        return { category: 'breaking', text: cleaned };
    }

    // Performance improvements - also handle Vue-style "performance:" prefix
    if (/^performance|performance|optimize|optimization|faster|speed|improve.*performance|^compiler.*performance/i.test(lower)) {
        return { category: 'performance', text: cleaned };
    }

    // Features (new functionality)
    if (/^feat|^feature|^new|^add|^introduce|^support/i.test(lower) ||
        /adds?\s+.*support|introduces?\s+.*feature|new\s+.*api|new\s+.*endpoint/i.test(lower)) {
        return { category: 'feat', text: cleaned };
    }

    // Bug fixes - also handle Vue-style "fix:" prefix
    if (/^fix|^bug|^patch|fixes?\s+.*issue|fixes?\s+.*bug|resolves?\s+.*issue|^compat.*fix/i.test(lower)) {
        return { category: 'fixes', text: cleaned };
    }

    // Default to other
    return { category: 'other', text: cleaned };
}

/**
 * Parse a markdown changelog into structured entries
 * Filters out pre-release versions (alpha, beta, rc, etc.)
 */
export function parseChangelog(changelogText: string): ChangelogEntry[] {
    const entries: ChangelogEntry[] = [];
    const lines = changelogText.split('\n');
    
    let currentEntry: ChangelogEntry | null = null;
    let currentSection: string | null = null;
    let inVersionBlock = false;

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const trimmed = line.trim();

        // Check if this is a version header
        const versionInfo = parseVersionHeader(line);
        if (versionInfo) {
            // Save previous entry if exists
            if (currentEntry) {
                entries.push(currentEntry);
            }

            // Skip pre-release versions
            if (isPrerelease(versionInfo.version)) {
                currentEntry = null;
                inVersionBlock = false;
                currentSection = null;
                continue;
            }

            // Start new entry
            currentEntry = {
                version: versionInfo.version,
                date: versionInfo.date,
                link: versionInfo.link,
                fixes: [],
                feat: [],
                security: [],
                performance: [],
                breaking: [],
                other: [],
            };
            inVersionBlock = true;
            currentSection = null;
            continue;
        }

        // If we're not in a version block, skip
        if (!inVersionBlock || !currentEntry) {
            continue;
        }

        // Check for section headers (Features, Bug Fixes, etc.)
        const sectionMatch = trimmed.match(/^#{1,6}\s+(.+)/i);
        if (sectionMatch) {
            const sectionName = sectionMatch[1].toLowerCase();
            if (sectionName.includes('feature') || sectionName.includes('added') || sectionName.includes('new')) {
                currentSection = 'feat';
            } else if (sectionName.includes('fix') || sectionName.includes('bug')) {
                currentSection = 'fixes';
            } else if (sectionName.includes('security')) {
                currentSection = 'security';
            } else if (sectionName.includes('performance') || sectionName.includes('optimization')) {
                currentSection = 'performance';
            } else if (sectionName.includes('breaking')) {
                currentSection = 'breaking';
            } else {
                currentSection = 'other';
            }
            continue;
        }

        // Check if this is a change item (list item or regular line)
        if (trimmed.match(/^[-*+]\s+/) || trimmed.match(/^\d+\.\s+/) || 
            (trimmed.length > 10 && !trimmed.startsWith('#') && !trimmed.match(/^#{1,6}\s+/))) {
            const categorized = categorizeChange(line);
            if (categorized) {
                // Use section context if available, otherwise use categorized
                const targetCategory = currentSection || categorized.category;
                if (targetCategory in currentEntry) {
                    (currentEntry[targetCategory] as string[]).push(categorized.text);
                }
            }
        }
        // Note: We don't reset section context on empty lines - it persists until a new section header
    }

    // Don't forget the last entry
    if (currentEntry) {
        entries.push(currentEntry);
    }

    return entries;
}

/**
 * Fetch changelog from a URL
 */
export async function fetchChangelogFromUrl(url: string): Promise<string | null> {
    try {
        // Convert GitHub blob URL to raw URL if needed
        // https://github.com/owner/repo/blob/branch/file -> https://raw.githubusercontent.com/owner/repo/branch/file
        let fetchUrl = url;
        if (url.includes('github.com') && url.includes('/blob/')) {
            fetchUrl = url.replace('github.com', 'raw.githubusercontent.com').replace('/blob/', '/');
        }

        const response = await fetch(fetchUrl, {
            headers: {
                Accept: "text/plain, text/markdown",
                "User-Agent": "Changelog-Parser",
            },
        });

        if (response.ok) {
            const content = await response.text();
            // Make sure we got actual content, not an error page
            if (content && content.length > 100 && !content.includes("404: Not Found")) {
                return content;
            }
        }
        return null;
    } catch (error) {
        console.error(`[fetchChangelogFromUrl] Failed to fetch changelog from ${url}:`, error);
        return null;
    }
}

/**
 * Parse changelog from a URL
 */
export async function parseChangelogFromUrl(url: string): Promise<ChangelogEntry[]> {
    const changelogText = await fetchChangelogFromUrl(url);
    if (!changelogText) {
        return [];
    }
    return parseChangelog(changelogText);
}

/**
 * Filter changelog entries by version range
 * Includes entries from fromVersion (inclusive) to toVersion (inclusive)
 */
export function filterEntriesByVersionRange(
    entries: ChangelogEntry[],
    fromVersion: string,
    toVersion: string
): ChangelogEntry[] {
    const from = parseVersion(fromVersion);
    const to = parseVersion(toVersion);
    
    if (!from || !to) {
        return entries;
    }

    return entries.filter(entry => {
        const entryVersion = parseVersion(entry.version);
        if (!entryVersion) return false;

        // Entry version should be >= fromVersion and <= toVersion
        // Compare major versions
        if (entryVersion.major < from.major) return false;
        if (entryVersion.major > to.major) return false;
        
        // If same major as from, check minor and patch
        if (entryVersion.major === from.major) {
            if (entryVersion.minor < from.minor) return false;
            if (entryVersion.minor === from.minor && entryVersion.patch < from.patch) return false;
        }
        
        // If same major as to, check minor and patch
        if (entryVersion.major === to.major) {
            if (entryVersion.minor > to.minor) return false;
            if (entryVersion.minor === to.minor && entryVersion.patch > to.patch) return false;
        }

        return true;
    });
}
