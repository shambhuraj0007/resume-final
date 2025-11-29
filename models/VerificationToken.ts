import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IVerificationToken extends Document {
  email: string;
  token: string;
  expiresAt: Date;
  createdAt: Date;
}

const VerificationTokenSchema: Schema<IVerificationToken> = new Schema({
  email: {
    type: String,
    required: true,
    lowercase: true,
    trim: true,
  },
  token: {
    type: String,
    required: true,
    unique: true,
  },
  expiresAt: {
    type: Date,
    required: true,
    index: { expires: 0 }, // TTL index - MongoDB will auto-delete expired documents
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

// Index for faster lookups
VerificationTokenSchema.index({ email: 1, token: 1 });

const VerificationToken: Model<IVerificationToken> =
  mongoose.models.VerificationToken ||
  mongoose.model<IVerificationToken>('VerificationToken', VerificationTokenSchema);

export default VerificationToken;
