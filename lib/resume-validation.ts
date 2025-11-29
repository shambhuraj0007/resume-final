export interface ValidationResult {
    isValid: boolean;
    score: number;
    reason?: string;
    details?: {
        pageCount?: number;
        wordCount?: number;
        scoreBreakdown?: Record<string, number>;
    };
}

export function isValidResume(text: string, numPages?: number): ValidationResult {
    // --- Hard Limits ---

    // 1. Page Count Limit (if provided)
    if (numPages && numPages > 5) {
        return {
            isValid: false,
            score: 0,
            reason: `Resume exceeds the maximum page limit (5 pages). Your document has ${numPages} pages.`,
            details: { pageCount: numPages }
        };
    }

    // 2. Word Count Limit
    const wordCount = text.trim().split(/\s+/).length;
    if (wordCount > 10000) {
        return {
            isValid: false,
            score: 0,
            reason: `Resume exceeds the maximum word count (10,000 words). Your document has approx. ${wordCount} words.`,
            details: { wordCount }
        };
    }

    // 3. Minimum Length
    if (text.length < 100) {
        return {
            isValid: false,
            score: 0,
            reason: "The document text is too short to be a valid resume (less than 100 characters).",
            details: { wordCount }
        };
    }

    // --- Scoring System ---
    let score = 0;
    const scoreBreakdown: Record<string, number> = {};

    // Helper to add score
    const addScore = (points: number, category: string) => {
        score += points;
        scoreBreakdown[category] = (scoreBreakdown[category] || 0) + points;
    };

    const lowerText = text.toLowerCase();

    // 1. Section Headers (Strong Indicators) - Max 12 points
    // We look for these keywords appearing as headers (often followed by newline or colon)
    // or just present in the text if we can't easily detect headers.
    // For simplicity and robustness against parsing issues, we'll check for presence 
    // but weight them if they look like headers or distinct sections.

    const sections = [
        "education", "experience", "work experience", "projects",
        "skills", "certifications", "achievements", "summary", "objective"
    ];

    let sectionScore = 0;
    sections.forEach(section => {
        if (lowerText.includes(section)) {
            sectionScore += 4;
        }
    });

    // Cap section score at 12
    addScore(Math.min(sectionScore, 12), "sections");

    // CV Keyword Bonus
    if (lowerText.includes("curriculum vitae") || lowerText.includes("resume")) {
        addScore(10, "cv_keyword");
    }

    // 2. Patterns (Super Strong)

    // Email
    const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/;
    if (emailRegex.test(text)) {
        addScore(3, "email");
    }

    // Phone (simple check for common formats)
    // Matches: (123) 456-7890, 123-456-7890, +1 123 456 7890, etc.
    const phoneRegex = /(\+\d{1,3}[- ]?)?\(?\d{3}\)?[- ]?\d{3}[- ]?\d{4}/;
    if (phoneRegex.test(text)) {
        addScore(3, "phone");
    }

    // Links
    if (lowerText.includes("linkedin.com") || lowerText.includes("github.com") || lowerText.includes("portfolio")) {
        addScore(2, "links");
    }

    // Date Ranges (e.g., 2019-2023, 2020 - Present)
    const dateRangeRegex = /\b(20\d{2}|19\d{2})\s*[-–]\s*(20\d{2}|19\d{2}|present|current|now)\b/i;
    if (dateRangeRegex.test(text)) {
        addScore(3, "date_ranges");
    }

    // 3. Structural Signals (Bonus)

    // Bullet points (•, -, *)
    // We count lines starting with these characters
    const bulletCount = (text.match(/^[\s]*[•\-*]/gm) || []).length;
    if (bulletCount > 5) {
        addScore(2, "structure_bullets");
    }

    // Job Role Patterns (e.g., "Software Engineer at")
    if (/\b(at|@)\s+[A-Z][a-zA-Z0-9\s,.]+/.test(text) && /(engineer|developer|manager|analyst|consultant|intern|director|lead)/i.test(text)) {
        addScore(2, "structure_roles");
    }

    // --- Final Decision ---
    const threshold = 7;
    const isValid = score >= threshold;

    let reason = undefined;
    if (!isValid) {
        reason = `The document does not appear to be a valid resume. It lacks common resume sections and patterns (Score: ${score}/${threshold}). Please ensure you uploaded the correct file.`;
    }

    return {
        isValid,
        score,
        reason,
        details: {
            pageCount: numPages,
            wordCount,
            scoreBreakdown
        }
    };
}
