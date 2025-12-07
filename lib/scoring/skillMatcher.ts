/**
 * Skill Matching Utility
 * Handles fuzzy matching, acronyms, and normalization for skill comparison
 */

// Common tech acronyms mapping (bidirectional)
const ACRONYMS: Record<string, string[]> = {
    "aws": ["amazon web services"],
    "gcp": ["google cloud platform"],
    "azure": ["microsoft azure"],
    "js": ["javascript"],
    "ts": ["typescript"],
    "ml": ["machine learning"],
    "ai": ["artificial intelligence"],
    "ui": ["user interface"],
    "ux": ["user experience"],
    "ci/cd": ["continuous integration", "continuous deployment"],
    "k8s": ["kubernetes"],
    "react": ["reactjs", "react.js"],
    "node": ["nodejs", "node.js"],
    "vue": ["vuejs", "vue.js"],
    "dotnet": [".net"],
    "c#": ["c sharp"],
    "cpp": ["c++", "c plus plus"],
    "qa": ["quality assurance"],
    "seo": ["search engine optimization"],
    "llm": ["large language model"],
    "nlp": ["natural language processing"],
    "db": ["database"],
    "sql": ["structured query language"],
    "nosql": ["non relational", "non-relational"],
    "rest": ["restful"],
    "api": ["application programming interface"],
};

/**
 * Normalize skill string for comparison
 * - Lowercase
 * - Remove special chars (except +, #, .)
 * - Trim
 */
export function normalizeSkill(skill: string): string {
    return skill
        .toLowerCase()
        .replace(/[^a-z0-9+#.]/g, " ") // keep +, #, . for C++, C#, Node.js
        .replace(/\s+/g, " ")
        .trim();
}

/**
 * Check if two skills are a match using fuzzy logic and acronyms
 */
export function areSkillsMatch(skill1: string, skill2: string): boolean {
    const s1 = normalizeSkill(skill1);
    const s2 = normalizeSkill(skill2);

    // 1. Exact match (normalized)
    if (s1 === s2) return true;

    // 2. Acronym check
    if (checkAcronymMatch(s1, s2)) return true;

    // 3. Substring match (if length is sufficient to avoid false positives)
    // e.g. "react" matches "reactjs"
    if (s1.length > 2 && s2.length > 2) {
        if (s1.includes(s2) || s2.includes(s1)) return true;
    }

    // 4. Levenshtein distance (simple implementation for small typos)
    if (Math.abs(s1.length - s2.length) <= 2) {
        const dist = levenshteinDistance(s1, s2);
        if (dist <= 1 && Math.min(s1.length, s2.length) > 3) return true; // 1 typo allowed for >3 chars
    }

    return false;
}

/**
 * Check if one skill is an acronym/full-form of the other
 */
function checkAcronymMatch(s1: string, s2: string): boolean {
    // Check if s1 is a key
    if (ACRONYMS[s1] && ACRONYMS[s1].some(full => full.includes(s2) || s2.includes(full))) return true;

    // Check if s2 is a key
    if (ACRONYMS[s2] && ACRONYMS[s2].some(full => full.includes(s1) || s1.includes(full))) return true;

    return false;
}

/**
 * Calculate Levenshtein distance between two strings
 */
function levenshteinDistance(a: string, b: string): number {
    if (a.length === 0) return b.length;
    if (b.length === 0) return a.length;

    const matrix = [];

    // increment along the first column of each row
    for (let i = 0; i <= b.length; i++) {
        matrix[i] = [i];
    }

    // increment each column in the first row
    for (let j = 0; j <= a.length; j++) {
        matrix[0][j] = j;
    }

    // Fill in the rest of the matrix
    for (let i = 1; i <= b.length; i++) {
        for (let j = 1; j <= a.length; j++) {
            if (b.charAt(i - 1) === a.charAt(j - 1)) {
                matrix[i][j] = matrix[i - 1][j - 1];
            } else {
                matrix[i][j] = Math.min(
                    matrix[i - 1][j - 1] + 1, // substitution
                    Math.min(
                        matrix[i][j - 1] + 1, // insertion
                        matrix[i - 1][j] + 1 // deletion
                    )
                );
            }
        }
    }

    return matrix[b.length][a.length];
}

/**
 * Process lists to find matches and missing skills
 */
export function matchSkillLists(
    requiredSkills: string[],
    candidateSkills: string[]
): { matched: { required: string; candidate: string }[]; missing: string[] } {
    const matched: { required: string; candidate: string }[] = [];
    const missing: string[] = [];

    for (const req of requiredSkills) {
        let bestMatch = "";

        // Find best match in candidate skills
        for (const cand of candidateSkills) {
            if (areSkillsMatch(req, cand)) {
                bestMatch = cand;
                break; // Stop at first match
            }
        }

        if (bestMatch) {
            matched.push({ required: req, candidate: bestMatch });
        } else {
            missing.push(req);
        }
    }

    return { matched, missing };
}
