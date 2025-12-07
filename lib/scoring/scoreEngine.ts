/**
 * Deterministic Scoring Engine for ShortlistAI
 * Contains all mathematical functions for calculating resume scores
 */

import {
    MatchType,
    RequiredSkill,
    ResumeSkill,
    ExperienceInfo,
    EducationInfo,
    ResponsibilityInfo,
    TitlesInfo,
    FormatSignals,
    DegreeLevel,
    Seniority,
    ScoreBreakdown,
    ScoringResult,
    LLMExtractionResult,
} from "./interfaces";

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Returns base weight for skill match type
 */
/**
 * Returns base weight for skill match type
 */
export function baseMatchWeight(matchType: MatchType): number {
    if (matchType === "exact") return 1.0;
    if (matchType === "synonym") return 0.9; // Increased from 0.7
    if (matchType === "related") return 0.6; // Increased from 0.5
    return 0.0;
}

/**
 * Calculates location boost multiplier based on where skill appears
 */
export function locationBoost(locations: string[]): number {
    const set = new Set((locations || []).map((l) => l.toLowerCase()));
    let boost = 1.0;

    if (set.has("title")) boost += 0.3;
    if (set.has("summary")) boost += 0.2;
    if (set.has("skills")) boost += 0.2;
    if (set.has("recent_experience")) boost += 0.2;

    // Cap maximum boost
    if (boost > 1.6) boost = 1.6;
    return boost;
}

/**
 * Converts degree level to numeric rank
 */
export function degreeRank(level: DegreeLevel): number {
    if (level === "none") return 0;
    if (level === "diploma") return 1;
    if (level === "bachelor") return 2;
    if (level === "master") return 3;
    return 4; // phd
}

/**
 * Converts seniority to numeric level
 */
export function seniorityLevel(s: Seniority): number {
    if (s === "junior") return 1;
    if (s === "mid") return 2;
    if (s === "senior") return 3;
    return 4; // lead
}

// ============================================================================
// STRUCTURAL FIT CALCULATOR
// ============================================================================

/**
 * Determines if candidate meets fundamental requirements
 * This is a boolean gate used to cap potential scores
 */
export function computeStructuralFit(
    missingSkills: string[],
    requiredSkills: RequiredSkill[],
    experience: ExperienceInfo,
    education: EducationInfo
): boolean {
    // Only check for missing MUST-HAVE skills (importance = 3)
    const criticalMissing = missingSkills.filter(missing => {
        const req = requiredSkills.find(r => r.name === missing);
        return req && req.importance === 3;
    });

    const hasAllMustHaves = criticalMissing.length === 0;

    const yearsRatio =
        experience.requiredYears > 0
            ? experience.candidateYears / experience.requiredYears
            : 1;
    const enoughYears = yearsRatio >= 0.7; // 70% of required is threshold

    const meetsDegree = education.meetsMinimum === true;

    return hasAllMustHaves && enoughYears && meetsDegree;
}

/**
 * Calculate skills score (0-35 points)
 * Weighted by importance, match quality, and location
 * NOW: Boosts weight for top 10 skills
 */
export function computeSkillsScore(
    requiredSkills: RequiredSkill[],
    resumeSkills: ResumeSkill[],
    missingSkills: string[]
): number {
    let raw = 0;
    let importanceSum = 0;

    // Identify top 10 skills by importance
    const sortedSkills = [...requiredSkills].sort((a, b) => b.importance - a.importance);
    const top10Names = new Set(sortedSkills.slice(0, 10).map(s => s.name));

    for (const jdSkill of requiredSkills) {
        const matches = resumeSkills.filter(
            (rs) => rs.jdSkillName === jdSkill.name
        );
        let bestCoverage = 0;

        for (const m of matches) {
            const w = baseMatchWeight(m.matchType) * locationBoost(m.locations);
            if (w > bestCoverage) bestCoverage = w;
        }

        // Apply weight boost for top skills
        let weight = jdSkill.importance;
        if (top10Names.has(jdSkill.name)) {
            weight *= 1.5; // 50% more weight for top 10 skills
        }

        raw += bestCoverage * weight;
        importanceSum += weight;
    }

    const coverage = importanceSum > 0 ? raw / importanceSum : 0;
    let score = Math.floor(35 * Math.min(coverage, 1));

    // Penalties for missing must-haves (using criticalMissing passed as missingSkills)
    if (missingSkills.length >= 1) score = Math.max(0, score - 5);
    if (missingSkills.length >= 2) score = Math.min(score, 22); // cap ~65% of 35

    return score;
}

/**
 * Calculate experience score (0-20 points)  
 * BINARY SCORING: Full marks if candidate meets years, 0 if not
 */
export function computeExperienceScore(exp: ExperienceInfo): number {
    // Simple logic: if candidate has required years or more → 20 pts, else → 0 pts
    return exp.candidateYears >= exp.requiredYears ? 20 : 0;
}

/**
 * Calculate education score (0-15 points)
 * Based on degree level and institution tier
 */
export function computeEducationScore(ed: EducationInfo): number {
    const reqRank = degreeRank(ed.requiredDegreeLevel);
    const candRank = degreeRank(ed.candidateDegreeLevel);

    if (!ed.meetsMinimum) {
        // below requirement
        if (candRank + 1 === reqRank) return 6; // close (e.g., diploma for bachelor)
        if (candRank + 2 === reqRank) return 3;
        return 0;
    }

    // meets minimum
    let score = 13;
    if (candRank > reqRank) score = 14;
    if (ed.bonusTierInstitution) score = Math.min(15, score + 1);

    return score;
}

/**
 * Calculate responsibilities score (0-15 points)
 * Linear scale based on matched/total ratio
 */
export function computeResponsibilityScore(r: ResponsibilityInfo): number {
    const denom = Math.max(1, r.totalResponsibilitiesConsidered);
    const p = Math.min(1, r.matchedResponsibilitiesCount / denom);
    return Math.floor(15 * p);
}

/**
 * Calculate title score (0-10 points)
 * Based on similarity percentage
 */
export function computeTitleScore(t: TitlesInfo): number {
    const s = t.titleSimilarity || 0;
    if (s >= 0.9) return 10;
    if (s >= 0.7) return 8;
    if (s >= 0.5) return 5;
    if (s >= 0.3) return 3;
    return 0;
}

/**
 * Calculate format score (0-5 points)
 * Deductions for poor formatting
 */
export function computeFormatScore(f: FormatSignals): number {
    let score = 5;
    if (!f.hasStandardSections) score -= 2;
    if (!f.isParseable) score -= 3;
    if (!f.hasContactInfo) score -= 1;
    return Math.max(0, score);
}

// ============================================================================
// SCORE AGGREGATION
// ============================================================================

/**
 * Combine all component scores into current score (0-100)
 */
export function computeCurrentScore(
    skillsScore: number,
    experienceScore: number,
    educationScore: number,
    responsibilityScore: number,
    titleScore: number,
    formatScore: number
): number {
    let total =
        skillsScore +
        experienceScore +
        educationScore +
        responsibilityScore +
        titleScore +
        formatScore;

    if (total > 100) total = 100;
    if (total < 0) total = 0;
    return total;
}

/**
 * Apply caps to potential score based on structural fit
 */
export function capPotentialScore(
    currentScore: number,
    afterScore: number,
    structuralFit: boolean,
    missingSkills: string[]
): number {
    let potential = afterScore;

    if (!structuralFit) {
        // Missing fundamentals: stay conservative
        potential = Math.min(potential, 60);
    } else {
        // Good fundamentals: allow strong uplift
        // Avoid showing 100 too often
        const maxCap = missingSkills.length === 0 ? 95 : 90;
        potential = Math.min(potential, maxCap);
    }

    // Ensure potential is never less than current
    if (potential < currentScore) potential = currentScore;

    return potential;
}

// ============================================================================
// INTERVIEW PROBABILITY
// ============================================================================

/**
 * Base callback probability from score
 * IMPORTANT: Always returns a value at least 5 points below the score
 */
export function baseCallbackProbability(score: number): number {
    let probability: number;

    if (score < 30) probability = Math.floor(10 + (score / 30) * 15); // 10-25
    else if (score < 50) probability = Math.floor(25 + ((score - 30) / 20) * 20); // 25-45
    else if (score < 70) probability = Math.floor(45 + ((score - 50) / 20) * 25); // 45-70
    else if (score < 85) probability = Math.floor(70 + ((score - 70) / 15) * 17); // 70-87
    else probability = Math.min(95, Math.floor(87 + ((score - 85) / 15) * 8)); // 87-95

    // Ensure probability is always at least 5 points below the score
    return Math.min(probability, score - 5);
}

/**
 * Adjust probability based on structural fit and missing skills
 */
export function adjustProbability(
    base: number,
    structuralFit: boolean,
    missingSkills: string[]
): number {
    let p = base;

    if (structuralFit && missingSkills.length === 0) {
        p += 5; // slight boost for perfect fit
    }

    if (missingSkills.length >= 1) p -= 5;

    if (p > 100) p = 100;
    if (p < 0) p = 0;
    return p;
}

// ============================================================================
// MAIN SCORING FUNCTION
// ============================================================================

/**
 * Complete scoring pipeline
 * Takes LLM extraction result and returns all scores
 */
export function calculateScores(data: LLMExtractionResult): ScoringResult {
    // Identify critical missing skills (importance = 3)
    const criticalMissingSkills = data.missingSkills.filter(missing => {
        const req = data.requiredSkills.find(r => r.name === missing);
        return req && req.importance === 3;
    });

    // Calculate structural fit
    const structuralFit = computeStructuralFit(
        data.missingSkills,
        data.requiredSkills,
        data.experience,
        data.education
    );

    // Calculate component scores for CURRENT state
    const skillsScore = computeSkillsScore(
        data.requiredSkills,
        data.resumeSkills,
        criticalMissingSkills // Only penalize for critical missing
    );
    const experienceScore = computeExperienceScore(data.experience);
    const educationScore = computeEducationScore(data.education);
    const responsibilityScore = computeResponsibilityScore(data.responsibilities);
    const titleScore = computeTitleScore(data.titles);
    const formatScore = computeFormatScore(data.formatSignals);

    // Calculate current score
    const currentScore = computeCurrentScore(
        skillsScore,
        experienceScore,
        educationScore,
        responsibilityScore,
        titleScore,
        formatScore
    );

    // ==========================================================================
    // POTENTIAL SCORE CALCULATION (Simulation-Based)
    // ==========================================================================
    // Simulate what the data would look like if suggestions were applied
    // Import is at the top of this file
    const { simulateAggressiveImprovements } = require("./simulateImprovement");
    const improvedData = simulateAggressiveImprovements(data);

    // Recalculate critical missing for improved data
    const improvedCriticalMissing = improvedData.missingSkills.filter((missing: string) => {
        const req = improvedData.requiredSkills.find((r: RequiredSkill) => r.name === missing);
        return req && req.importance === 3;
    });

    // Recalculate structural fit for improved data
    const improvedStructuralFit = computeStructuralFit(
        improvedData.missingSkills,
        improvedData.requiredSkills,
        improvedData.experience,
        improvedData.education
    );

    // Calculate component scores for IMPROVED state
    const improvedSkillsScore = computeSkillsScore(
        improvedData.requiredSkills,
        improvedData.resumeSkills,
        improvedCriticalMissing
    );
    const improvedExperienceScore = computeExperienceScore(improvedData.experience);
    const improvedEducationScore = computeEducationScore(improvedData.education);
    const improvedResponsibilityScore = computeResponsibilityScore(improvedData.responsibilities);
    const improvedTitleScore = computeTitleScore(improvedData.titles);
    const improvedFormatScore = computeFormatScore(improvedData.formatSignals);

    // Calculate potential score
    let potentialScore = computeCurrentScore(
        improvedSkillsScore,
        improvedExperienceScore,
        improvedEducationScore,
        improvedResponsibilityScore,
        improvedTitleScore,
        improvedFormatScore
    );

    // Apply caps based on structural fit
    potentialScore = capPotentialScore(
        currentScore,
        potentialScore,
        structuralFit,
        criticalMissingSkills
    );

    // Ensure minimum 5% improvement
    if (potentialScore < currentScore + 5) {
        potentialScore = Math.min(currentScore + 5, 100);
    }
    // ==========================================================================

    // Calculate callback probabilities
    const currentCallback = adjustProbability(
        baseCallbackProbability(currentScore),
        structuralFit,
        criticalMissingSkills
    );

    const potentialCallback = adjustProbability(
        baseCallbackProbability(potentialScore),
        improvedStructuralFit,
        improvedCriticalMissing
    );

    return {
        structuralFit,
        currentScore,
        potentialScore,
        currentCallback,
        potentialCallback,
        scoreBreakdown: {
            skills: skillsScore,
            experience: experienceScore,
            education: educationScore,
            responsibilities: responsibilityScore,
            title: titleScore,
            format: formatScore,
        },
    };
}
