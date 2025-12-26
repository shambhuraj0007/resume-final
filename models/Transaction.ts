import mongoose, { Schema, Document, Model } from 'mongoose';

export interface ITransaction extends Document {
  userId: mongoose.Types.ObjectId;
  orderId: string;
  paymentId?: string;
  razorpayOrderId?: string;
  razorpayPaymentId?: string;
  razorpaySignature?: string;
  cfOrderId?: string;
  cfPaymentId?: string;
  cfSubscriptionId?: string;
  paypalOrderId?: string;
  paypalSubscriptionId?: string;
  gateway: 'RAZORPAY' | 'CASHFREE' | 'PAYPAL';
  amount: number;
  currency: string;
  credits: number;
  status: 'pending' | 'completed' | 'failed' | 'refunded';
  packageType: string;
  validityMonths: number;
  paymentMethod?: string;
  failureReason?: string;
  rawResponse?: any;
  completedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const TransactionSchema: Schema<ITransaction> = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    orderId: {
      type: String,
      required: true,
      unique: true,
      // ❌ Remove this: index: true (duplicate with unique: true)
    },
    paymentId: String,
    razorpayOrderId: String,
    razorpayPaymentId: String,
    razorpaySignature: String,
    cfOrderId: String,
    cfPaymentId: String,
    cfSubscriptionId: String,
    paypalOrderId: String,
    paypalSubscriptionId: String,
    gateway: {
      type: String,
      enum: ['RAZORPAY', 'CASHFREE', 'PAYPAL'],
      required: true,
      default: 'RAZORPAY'
    },
    amount: {
      type: Number,
      required: true,
    },
    currency: {
      type: String,
      default: 'INR',
    },
    credits: {
      type: Number,
      required: true,
    },
    status: {
      type: String,
      enum: ['pending', 'completed', 'failed', 'refunded'],
      default: 'pending',
    },
    packageType: {
      type: String,
      required: true,
    },
    validityMonths: {
      type: Number,
      default: 3,
    },
    paymentMethod: String,
    failureReason: String,
    rawResponse: Schema.Types.Mixed,
    completedAt: Date,
  },
  {
    timestamps: true,
  }
);

// ✅ Define indexes only here (remove from field definitions above)
TransactionSchema.index({ userId: 1, createdAt: -1 });
TransactionSchema.index({ razorpayOrderId: 1 });
TransactionSchema.index({ cfPaymentId: 1 });
TransactionSchema.index({ cfSubscriptionId: 1 });

const Transaction: Model<ITransaction> = mongoose.models.Transaction || mongoose.model<ITransaction>('Transaction', TransactionSchema);

export default Transaction;
