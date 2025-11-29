import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IResumeCounter extends Document {
  count: number;
}

const ResumeCounterSchema: Schema<IResumeCounter> = new Schema({
  count: {
    type: Number,
    default: 0,
    required: true,
  },
});

const ResumeCounter: Model<IResumeCounter> =
  mongoose.models.ResumeCounter ||
  mongoose.model<IResumeCounter>('ResumeCounter', ResumeCounterSchema);

export default ResumeCounter;
