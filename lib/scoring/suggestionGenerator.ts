import { LLMExtractionResult, Suggestion } from './interfaces';

/**
 * Generates deterministic suggestions based on scoring engine analysis
 */
export function generateDeterministicSuggestions(
    data: LLMExtractionResult,
    structuralFit: boolean,
    titleSimilarity: number,
    jdTitle: string
): Suggestion[] {
    const suggestions: Suggestion[] = [];

    // 1. Missing Skills Suggestions (Tickable)
    // Filter for important missing skills
    const importantMissingSkills = data.missingSkills.filter(skillName => {
        const requiredSkill = data.requiredSkills.find(
            req => req.name.toLowerCase() === skillName.toLowerCase()
        );
        // Suggest if importance is high (3) or medium (2), or if we have few suggestions
        return requiredSkill ? requiredSkill.importance >= 2 : true;
    });

    importantMissingSkills.forEach(skillName => {
        suggestions.push({
            suggestion: `Add "${skillName}" to your skills section if you have this skill`,
            originalText: "",
            improvedText: `Skill: ${skillName}`, // Used for simulation extraction
            category: 'keyword', // Maps to 'tickable' in UI logic
        });
    });

    // 2. Title Mismatch Suggestion (Tickable)
    // If title similarity is low, suggest updating it
    if (titleSimilarity < 0.7) {
        const bestTitle = data.titles.suggestedTitle || jdTitle;
        suggestions.push({
            suggestion: `Update your title to match the job: "${bestTitle}"`,
            originalText: data.candidateTitle || "Current Title",
            improvedText: bestTitle,
            category: 'keyword', // Treated as tickable/simulatable
        });
    }

    // 3. Structural/Format Suggestions (Informational)
    if (!structuralFit) {
        suggestions.push({
            suggestion: "⚠️ Your resume structure doesn't meet ATS requirements. Use ShortlistAI's ATS-friendly template.",
            originalText: "Current Structure",
            improvedText: "ATS Friendly Structure",
            category: 'other', // Maps to 'critical/informational'
        });
    }

    // Check for standard sections
    const hasSkillsSection = data.resumeSkills.some(s => s.locations.includes('skills'));
    if (!hasSkillsSection) {
        suggestions.push({
            suggestion: "Add a dedicated 'Skills' section for better ATS parsing",
            originalText: "",
            improvedText: "Skills Section",
            category: 'other',
        });
    }

    return suggestions;
}
