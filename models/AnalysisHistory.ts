import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IAnalysisHistory extends Document {
  userId: mongoose.Types.ObjectId;
  resumeId?: mongoose.Types.ObjectId;
  analysisType: 'resume_analysis' | 'resume_creation' | 'resume_edit' | 'resume_optimization';
  creditsUsed: number;
  fileName?: string;
  status: 'success' | 'failed';
  errorMessage?: string;
  createdAt: Date;
}

const AnalysisHistorySchema: Schema<IAnalysisHistory> = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    resumeId: {
      type: Schema.Types.ObjectId,
      ref: 'Resume',
    },
    analysisType: {
      type: String,
      enum: ['resume_analysis', 'resume_creation', 'resume_edit', 'resume_optimization'],
      required: true,
    },
    creditsUsed: {
      type: Number,
      required: true,
      default: 1,
    },
    fileName: String,
    status: {
      type: String,
      enum: ['success', 'failed'],
      default: 'success',
    },
    errorMessage: String,
  },
  {
    timestamps: true,
  }
);

// Indexes for efficient queries
AnalysisHistorySchema.index({ userId: 1, createdAt: -1 });

const AnalysisHistory: Model<IAnalysisHistory> = mongoose.models.AnalysisHistory || mongoose.model<IAnalysisHistory>('AnalysisHistory', AnalysisHistorySchema);

export default AnalysisHistory;
