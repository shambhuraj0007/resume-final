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
    requiredSkills: number;
    experience: number;
    responsibilities: number;
    education: number;
    industry: number;
  };
  confidence: number;
  isValidJD: boolean;
  isValidCV: boolean;
  validationWarning?: string;
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
      requiredSkills: Number,
      experience: Number,
      responsibilities: Number,
      education: Number,
      industry: Number,
    },
    confidence: Number,
    isValidJD: Boolean,
    isValidCV: Boolean,
    validationWarning: String,
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
