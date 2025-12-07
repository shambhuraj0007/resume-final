import mongoose, { Schema, Document, Model } from 'mongoose';

export interface Suggestion {
  suggestion: string;
  originalText: string;
  improvedText: string;
  category: 'text' | 'keyword' | 'other';
}

export interface IAnalysisResult extends Document {
  userId: mongoose.Types.ObjectId;
  resumeText: string;
  jobDescription: string;
  fileName?: string;
  currentScore: number;
  potentialScore: number;
  currentCallback: number;
  potentialCallback: number;
  keywords: string[];
  topRequiredKeywords: string[];
  missingKeywords: string[];
  suggestions: Suggestion[];
  textSuggestions: Suggestion[];
  keywordSuggestions: Suggestion[];
  otherSuggestions: Suggestion[];
  evidence: {
    matchedResponsibilities: Array<{ jdFragment: string; resumeFragment: string }>;
    matchedSkills: Array<{ skill: string; resumeFragment: string }>;
  };
  scoreBreakdown: {
    skills?: number;          // 0-35 points (new deterministic)
    experience?: number;      // 0-20 points (new deterministic)
    education?: number;       // 0-15 points (new deterministic)
    responsibilities?: number; // 0-15 points (new deterministic)
    title?: number;           // 0-10 points (new deterministic)
    format?: number;          // 0-5 points (new deterministic)
    // Old fields (kept for backward compatibility)
    requiredSkills?: number;
    industry?: number;
  };
  confidence: number;
  isValidJD: boolean;
  isValidCV: boolean;
  validationWarning?: string;
  // New fields for deterministic scoring
  structuralFit?: boolean;
  requiredSkills?: Array<{ name: string; importance: number; type: 'hard' | 'soft' }>;
  matchedSkills?: Array<{ skill: string; matchType: string; locations: string[] }>;
  experienceBreakdown?: {
    requiredYears: number;
    candidateYears: number;
    requiredSeniority: string;
    candidateSeniority: string;
  };
  educationBreakdown?: {
    requiredDegree: string;
    candidateDegree: string;
    meetsMinimum: boolean;
    bonusTierInstitution: boolean;
  };
  createdAt: Date;
  updatedAt: Date;
}

const AnalysisResultSchema: Schema<IAnalysisResult> = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    resumeText: {
      type: String,
      required: true,
    },
    jobDescription: {
      type: String,
      required: true,
    },
    fileName: String,
    currentScore: {
      type: Number,
      required: true,
    },
    potentialScore: {
      type: Number,
      required: true,
    },
    currentCallback: {
      type: Number,
      required: true,
    },
    potentialCallback: {
      type: Number,
      required: true,
    },
    keywords: [String],
    topRequiredKeywords: [String],
    missingKeywords: [String],
    suggestions: [
      {
        suggestion: String,
        originalText: String,
        improvedText: String,
        category: {
          type: String,
          enum: ['text', 'keyword', 'other'],
        },
      },
    ],
    textSuggestions: [
      {
        suggestion: String,
        originalText: String,
        improvedText: String,
        category: {
          type: String,
          enum: ['text', 'keyword', 'other'],
        },
      },
    ],
    keywordSuggestions: [
      {
        suggestion: String,
        originalText: String,
        improvedText: String,
        category: {
          type: String,
          enum: ['text', 'keyword', 'other'],
        },
      },
    ],
    otherSuggestions: [
      {
        suggestion: String,
        originalText: String,
        improvedText: String,
        category: {
          type: String,
          enum: ['text', 'keyword', 'other'],
        },
      },
    ],
    evidence: {
      matchedResponsibilities: [
        {
          jdFragment: String,
          resumeFragment: String,
        },
      ],
      matchedSkills: [
        {
          skill: String,
          resumeFragment: String,
        },
      ],
    },
    scoreBreakdown: {
      skills: Number,          // 0-35 (new)
      experience: Number,      // 0-20 (new)
      education: Number,       // 0-15 (new)
      responsibilities: Number, // 0-15 (new)
      title: Number,           // 0-10 (new)
      format: Number,          // 0-5 (new)
      requiredSkills: Number,  // old (backward compat)
      industry: Number,        // old (backward compat)
    },
    confidence: Number,
    isValidJD: Boolean,
    isValidCV: Boolean,
    validationWarning: String,
    // New fields for deterministic scoring
    structuralFit: Boolean,
    requiredSkills: [
      {
        name: String,
        importance: Number,
        type: {
          type: String,
          enum: ['hard', 'soft'],
        },
      },
    ],
    matchedSkills: [
      {
        skill: String,
        matchType: String,
        locations: [String],
      },
    ],
    experienceBreakdown: {
      requiredYears: Number,
      candidateYears: Number,
      requiredSeniority: String,
      candidateSeniority: String,
    },
    educationBreakdown: {
      requiredDegree: String,
      candidateDegree: String,
      meetsMinimum: Boolean,
      bonusTierInstitution: Boolean,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for efficient queries
AnalysisResultSchema.index({ userId: 1, createdAt: -1 });
AnalysisResultSchema.index({ userId: 1, currentScore: -1 });

const AnalysisResult: Model<IAnalysisResult> = mongoose.models.AnalysisResult || mongoose.model<IAnalysisResult>('AnalysisResult', AnalysisResultSchema);

export default AnalysisResult;
