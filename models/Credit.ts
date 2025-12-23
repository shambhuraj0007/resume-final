import mongoose, { Schema, Document, Model } from 'mongoose';

export interface ICredit extends Document {
  userId: mongoose.Types.ObjectId;
  credits: number;
  expiryDate: Date | null;
  lastResetDate: Date;
  createdAt: Date;
  updatedAt: Date;
}

const CreditSchema: Schema<ICredit> = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    credits: {
      type: Number,
      required: true,
      default: 3, // 3 free credits for new users
      min: 0,
    },
    lastResetDate: {
      type: Date,
      default: Date.now,
    },
    expiryDate: {
      type: Date,
      default: null, // null means no expiry (for free credits)
    },
  },
  {
    timestamps: true,
  }
);

// Index for efficient queries
CreditSchema.index({ userId: 1 }, { unique: true });

const Credit: Model<ICredit> = mongoose.models.Credit || mongoose.model<ICredit>('Credit', CreditSchema);

export default Credit;
