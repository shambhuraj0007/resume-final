/**
 * TypeScript interfaces for the Deterministic Scoring System
 * These match the JSON schema expected from the LLM data extraction
 */

export type MatchType = "exact" | "synonym" | "related" | "none";
export type SkillType = "hard" | "soft";
export type Seniority = "junior" | "mid" | "senior" | "lead";
export type DegreeLevel = "none" | "diploma" | "bachelor" | "master" | "phd";
export type SuggestionCategory = "text" | "keyword" | "other";

/**
 * Required skill from job description
 */
export interface RequiredSkill {
    name: string;
    importance: number; // 1=nice-to-have, 2=important, 3=critical
    type: SkillType;
}

/**
 * Skill found in resume with match details
 */
export interface ResumeSkill {
    name: string;
    jdSkillName: string; // Links to RequiredSkill.name, or "" if not linked
    matchType: MatchType;
    locations: string[]; // e.g., ["title", "summary", "skills", "recent_experience"]
}

/**
 * Experience information comparison
 */
export interface ExperienceInfo {
    candidateSeniority: any;
    requiredSeniority: any;
    requiredYears: number;
    candidateYears: number; // Full-time experience only, excluding internships
}

/**
 * Education information comparison
 */
export interface EducationInfo {
    requiredDegreeLevel: DegreeLevel;
    candidateDegreeLevel: DegreeLevel;
    meetsMinimum: boolean;
    bonusTierInstitution: boolean; // e.g., IIT, IIMA, top-tier school
}

/**
 * Responsibilities matching information
 */
export interface ResponsibilityInfo {
    topJDResponsibilities: string[];
    matchedResponsibilitiesCount: number;
    totalResponsibilitiesConsidered: number;
}

/**
 * Job title similarity information
 */
export interface TitlesInfo {
    jdTitle: string;
    candidateCurrentTitle: string;
    candidateRecentTitles: string[];
    titleSimilarity: number; // 0.0 - 1.0 (LLM-inferred)
    suggestedTitle?: string; // Optimized title from LLM
}

/**
 * Resume format quality signals
 */
export interface FormatSignals {
    hasStandardSections: boolean; // experience/education/skills detected
    isParseable: boolean;
    hasContactInfo: boolean;
}

/**
 * Suggestion for resume improvement
 */
export interface Suggestion {
    suggestion: string;
    originalText: string;
    improvedText: string;
    category: SuggestionCategory;
    requiresUserConfirmation?: boolean; // true = needs user to confirm they have this
}

/**
 * Complete JSON structure expected from LLM
 */
export interface LLMExtractionResult {
    requiredSkills: RequiredSkill[];
    resumeSkills: ResumeSkill[];
    mustHaveSkills: string[];
    missingSkills: string[];
    experience: ExperienceInfo;
    education: EducationInfo;
    responsibilities: ResponsibilityInfo;
    titles: TitlesInfo;
    formatSignals: FormatSignals;
    suggestions: Suggestion[];
    candidateTitle?: string;
    suggestedTitle?: string; // LLM suggested better title
}

/**
 * Score breakdown by component
 */
export interface ScoreBreakdown {
    skills: number;          // 0-35 points
    experience: number;      // 0-20 points
    education: number;       // 0-15 points
    responsibilities: number; // 0-15 points
    title: number;           // 0-10 points
    format: number;          // 0-5 points
}

/**
 * Final scoring result
 */
export interface ScoringResult {
    structuralFit: boolean;
    currentScore: number;
    potentialScore: number;
    currentCallback: number;
    potentialCallback: number;
    scoreBreakdown: ScoreBreakdown;
}
