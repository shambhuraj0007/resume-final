// Standalone test script with embedded logic to avoid ts-node configuration issues

interface ValidationResult {
    isValid: boolean;
    score: number;
    reason?: string;
    details?: {
        pageCount?: number;
        wordCount?: number;
        scoreBreakdown?: Record<string, number>;
    };
}

function isValidResume(text: string, numPages?: number): ValidationResult {
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

    // Phone
    const phoneRegex = /(\+\d{1,3}[- ]?)?\(?\d{3}\)?[- ]?\d{3}[- ]?\d{4}/;
    if (phoneRegex.test(text)) {
        addScore(3, "phone");
    }

    // Links
    if (lowerText.includes("linkedin.com") || lowerText.includes("github.com") || lowerText.includes("portfolio")) {
        addScore(2, "links");
    }

    // Date Ranges
    const dateRangeRegex = /\b(20\d{2}|19\d{2})\s*[-–]\s*(20\d{2}|19\d{2}|present|current|now)\b/i;
    if (dateRangeRegex.test(text)) {
        addScore(3, "date_ranges");
    }

    // 3. Structural Signals (Bonus)

    // Bullet points
    const bulletCount = (text.match(/^[\s]*[•\-*]/gm) || []).length;
    if (bulletCount > 5) {
        addScore(2, "structure_bullets");
    }

    // Job Role Patterns
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

const testCases = [
    {
        name: "Valid Resume",
        text: `
      John Doe
      Software Engineer
      john.doe@example.com
      (123) 456-7890
      
      Experience
      Software Engineer at Tech Corp
      2020 - Present
      • Developed web applications
      • optimized database queries
      
      Education
      BS in Computer Science
      
      Skills
      JavaScript, TypeScript, React
    `,
        expected: true
    },
    {
        name: "Invalid - Too Short",
        text: "This is just a short text.",
        expected: false
    },
    {
        name: "Invalid - No Keywords/Patterns",
        text: `
      This is a random document. It has some length to it so it passes the length check.
      However, it does not contain any resume keywords or patterns.
      It is just a plain text file that might be an article or a blog post.
      We expect this to fail the validation because the score will be low.
    `.repeat(5),
        expected: false
    },
    {
        name: "Valid - CV Format",
        text: `
      Jane Smith
      Curriculum Vitae
      jane@example.com
      
      Summary
      Experienced researcher.
      
      Publications
      ...
    `,
        expected: true
    },
    {
        name: "Invalid - Too Many Pages",
        text: `Valid Resume Text...`.repeat(10),
        numPages: 6,
        expected: false
    },
    {
        name: "Invalid - Too Many Words",
        text: `word `.repeat(10001),
        expected: false
    }
];

console.log("Running Validation Tests...\n");

testCases.forEach(test => {
    const result = isValidResume(test.text, test.numPages);
    const passed = result.isValid === test.expected;
    console.log(`Test: ${test.name}`);
    console.log(`Expected: ${test.expected}, Got: ${result.isValid}`);
    console.log(`Score: ${result.score}`);
    if (!passed) {
        console.log(`Reason: ${result.reason}`);
        console.log(`FAILED ❌`);
    } else {
        console.log(`PASSED ✅`);
    }
    console.log("-".repeat(20));
});
