/**
 * Simulation Engine for Potential Score Calculation
 * Simulates applying suggestions to create "improved" resume data
 */

import type {
    LLMExtractionResult,
    ResumeSkill,
    Suggestion,
} from "./interfaces";

/**
 * Simulates what the resume data would look like if suggestions were applied
 * This creates an "improved" version of the extraction result
 */
export function simulateImprovements(
    original: LLMExtractionResult,
    suggestions: Suggestion[]
): LLMExtractionResult {
    // Deep clone the original data
    const improved: LLMExtractionResult = JSON.parse(JSON.stringify(original));

    // Identify which suggestions would add missing skills
    const keywordSuggestions = suggestions.filter(s => s.category === "keyword");

    // For each keyword suggestion, simulate adding it to the resume
    keywordSuggestions.forEach(suggestion => {
        // Extract skill name from the suggestion text
        const skillMatch = suggestion.improvedText.match(/\b[A-Z][a-zA-Z0-9+#.]*\b/g);

        if (skillMatch && skillMatch.length > 0) {
            const newSkillName = skillMatch[0];

            // Check if this skill is in the missing skills list
            const missingIndex = improved.missingSkills.indexOf(newSkillName);

            if (missingIndex !== -1) {
                // Remove from missing skills
                improved.missingSkills.splice(missingIndex, 1);

                // Find the corresponding required skill
                const requiredSkill = improved.requiredSkills.find(
                    rs => rs.name === newSkillName || rs.name.toLowerCase() === newSkillName.toLowerCase()
                );

                if (requiredSkill) {
                    // Add to resume skills with a good match
                    const newResumeSkill: ResumeSkill = {
                        name: newSkillName,
                        jdSkillName: requiredSkill.name,
                        matchType: "exact",
                        locations: ["skills"] // Assume it would be added to skills section
                    };

                    improved.resumeSkills.push(newResumeSkill);
                }
            }
        }
    });

    // Simulate text improvements (responsibilities, format)
    const textSuggestions = suggestions.filter(s => s.category === "text");

    if (textSuggestions.length > 0) {
        // Assume text improvements help with responsibilities matching
        const currentMatched = improved.responsibilities.matchedResponsibilitiesCount;
        const total = improved.responsibilities.totalResponsibilitiesConsidered;

        if (currentMatched < total) {
            // Improve by 1-2 responsibilities based on number of text suggestions
            const improvement = Math.min(2, textSuggestions.length, total - currentMatched);
            improved.responsibilities.matchedResponsibilitiesCount += improvement;
        }

        // Assume format improvements
        if (!improved.formatSignals.hasStandardSections) {
            improved.formatSignals.hasStandardSections = true;
        }
        if (!improved.formatSignals.isParseable) {
            improved.formatSignals.isParseable = true;
        }
    }

    return improved;
}

/**
 * Simulates aggressive improvements (assumes user applies ALL suggestions)
 */
export function simulateAggressiveImprovements(
    original: LLMExtractionResult
): LLMExtractionResult {
    const improved: LLMExtractionResult = JSON.parse(JSON.stringify(original));

    // Add ALL missing critical skills (importance >= 2)
    const criticalMissing = improved.missingSkills.filter(missing => {
        const req = improved.requiredSkills.find(r => r.name === missing);
        return req && req.importance >= 2;
    });

    criticalMissing.forEach(skillName => {
        const requiredSkill = improved.requiredSkills.find(rs => rs.name === skillName);

        if (requiredSkill) {
            // Add to resume skills
            const newResumeSkill: ResumeSkill = {
                name: skillName,
                jdSkillName: requiredSkill.name,
                matchType: "exact",
                locations: ["skills", "recent_experience"]
            };

            improved.resumeSkills.push(newResumeSkill);
        }
    });

    // Clear all critical missing skills
    improved.missingSkills = improved.missingSkills.filter(missing => {
        const req = improved.requiredSkills.find(r => r.name === missing);
        return req && req.importance === 1; // Keep only nice-to-haves
    });

    // Max out responsibilities
    improved.responsibilities.matchedResponsibilitiesCount =
        improved.responsibilities.totalResponsibilitiesConsidered;

    // Perfect format
    improved.formatSignals.hasStandardSections = true;
    improved.formatSignals.isParseable = true;
    improved.formatSignals.hasContactInfo = true;

    return improved;
}
