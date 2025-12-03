
export interface ValidationResult {
    isValid: boolean;
    reason?: string;
    code?: "TOO_SHORT" | "TOO_LONG" | "NOT_RESUME" | "NOT_JD" | "LOOKS_LIKE_JD" | "LOOKS_LIKE_RESUME";
}

const YEAR_REGEX = /20\d{2}/;
const DATE_RANGE_REGEX = /20\d{2}\s*[-–]\s*(20\d{2}|Present|present|CURRENT|Current)/;
const EMAIL_REGEX = /\b\S+@\S+\.\S+\b/;
const PHONE_REGEX = /(\+?\d[\d\s\-()]{7,})/;
const BULLET_LINE_REGEX = /^\s*[-•·*]\s+/m;

// Phrases that strongly suggest "this is a JD"
const JD_RED_FLAGS = [
    "we are looking for",
    "responsibilities include",
    "you will",
    "the ideal candidate",
    "job description",
    "what you will do",
];

// Typical resume section keywords
const RESUME_SECTION_KEYWORDS = [
    "experience",
    "work experience",
    "professional experience",
    "employment history",
    "education",
    "skills",
    "technical skills",
    "projects",
    "certifications",
    "summary",
    "profile",
];

// Typical JD section keywords
const JD_SECTION_KEYWORDS = [
    "responsibilities",
    "key responsibilities",
    "duties",
    "what you will do",
    "requirements",
    "qualifications",
    "must have",
    "nice to have",
    "skills & qualifications",
    "about the role",
    "about us",
    "about the company",
    "who you are",
];

function countMatches(text: string, keywords: string[]): number {
    const lower = text.toLowerCase();
    return keywords.reduce((count, kw) => {
        return lower.includes(kw.toLowerCase()) ? count + 1 : count;
    }, 0);
}

/**
 * Validate resume text heuristically.
 * Use for text extracted from uploaded CVs.
 */
export function validateResumeText(text: string): ValidationResult {
    const trimmed = (text || "").trim();
    const len = trimmed.length;

    // Length checks (rough, MVP-level)
    if (len < 400) {
        return {
            isValid: false,
            code: "TOO_SHORT",
            reason: "Your resume text looks too short. Paste the full CV including experience, education and skills.",
        };
    }
    if (len > 25000) {
        return {
            isValid: false,
            code: "TOO_LONG",
            reason: "Your resume text looks unusually long. Please upload only your CV, not full books or long documents.",
        };
    }

    const lower = trimmed.toLowerCase();

    // Check for typical resume sections (at least 2)
    const sectionHits = countMatches(lower, RESUME_SECTION_KEYWORDS);
    if (sectionHits < 2) {
        return {
            isValid: false,
            code: "NOT_RESUME",
            reason: "This doesn’t seem like a resume. Please double-check and paste only your CV (experience, education, skills).",
        };
    }

    // Patterns: years, date ranges, bullets, contacts
    const hasYear = YEAR_REGEX.test(trimmed);
    const hasDateRange = DATE_RANGE_REGEX.test(trimmed);
    const hasBullet = BULLET_LINE_REGEX.test(trimmed);
    const hasEmail = EMAIL_REGEX.test(trimmed);
    const hasPhone = PHONE_REGEX.test(trimmed);

    if (!hasYear || (!hasDateRange && !hasBullet && !hasEmail && !hasPhone)) {
        return {
            isValid: false,
            code: "NOT_RESUME",
            reason: "This doesn’t seem like a resume. Please double-check and paste only your CV (experience, education, skills).",
        };
    }

    // Check for JD-like phrases that suggest the user pasted a job posting instead of CV
    const jdRedFlagsCount = countMatches(lower, JD_RED_FLAGS);
    if (jdRedFlagsCount >= 2) {
        return {
            isValid: false,
            code: "LOOKS_LIKE_JD",
            reason: "This text looks more like a job description than a resume. Please paste your own CV.",
        };
    }

    return { isValid: true };
}

/**
 * Validate job description text heuristically.
 * Use for text pasted into JD textarea.
 */
export function validateJobDescriptionText(text: string): ValidationResult {
    const trimmed = (text || "").trim();
    const len = trimmed.length;

    // Length checks
    if (len < 250) {
        return {
            isValid: false,
            code: "TOO_SHORT",
            reason: "The job description seems too short. Paste the full posting with responsibilities and requirements.",
        };
    }
    if (len > 15000) {
        return {
            isValid: false,
            code: "TOO_LONG",
            reason: "The job description looks unusually long. Please paste only one role’s posting, not an entire document.",
        };
    }

    const lower = trimmed.toLowerCase();

    // Check for typical JD sections (at least 2)
    const jdSectionHits = countMatches(lower, JD_SECTION_KEYWORDS);
    if (jdSectionHits < 2) {
        return {
            isValid: false,
            code: "NOT_JD",
            reason: "This doesn’t seem like a job description. Please double-check and paste a single role’s JD (responsibilities, requirements, about the role).",
        };
    }

    // Check if it looks more like a resume (sections + heavy first-person)
    const resumeSectionHits = countMatches(lower, RESUME_SECTION_KEYWORDS);
    const firstPersonCount = (lower.match(/\b(i|my|me)\b/g) || []).length;

    if (resumeSectionHits >= 2 && firstPersonCount > 5) {
        return {
            isValid: false,
            code: "LOOKS_LIKE_RESUME",
            reason: "This text looks more like a candidate resume than a job description. Please paste the actual job posting.",
        };
    }

    return { isValid: true };
}
