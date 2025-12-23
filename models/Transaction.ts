import mongoose, { Schema, Document, Model } from 'mongoose';

export interface ITransaction extends Document {
  userId: mongoose.Types.ObjectId;
  orderId: string;
  paymentId?: string;
  razorpayOrderId?: string;
  razorpayPaymentId?: string;
  razorpaySignature?: string;
  // Cashfree fields
  cfOrderId?: string;
  cfPaymentId?: string;
  // PayPal fields
  paypalOrderId?: string;
  paypalSubscriptionId?: string;

  gateway: 'RAZORPAY' | 'CASHFREE' | 'PAYPAL';
  amount: number;
  currency: string;
  credits: number;
  status: 'pending' | 'completed' | 'failed' | 'refunded';
  packageType: string; // Changed to string to support various pack names
  validityMonths: number;
  paymentMethod?: string;
  failureReason?: string;
  rawResponse?: any;
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
    },
    paymentId: String,
    razorpayOrderId: String,
    razorpayPaymentId: String,
    razorpaySignature: String,

    // Cashfree
    cfOrderId: String,
    cfPaymentId: String,

    // PayPal
    paypalOrderId: String,
    paypalSubscriptionId: String,

    gateway: {
      type: String,
      enum: ['RAZORPAY', 'CASHFREE', 'PAYPAL'],
      required: true,
      default: 'RAZORPAY' // For backward compatibility
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
  },
  {
    timestamps: true,
  }
);

// Indexes for efficient queries
TransactionSchema.index({ userId: 1, createdAt: -1 });

TransactionSchema.index({ razorpayOrderId: 1 });

const Transaction: Model<ITransaction> = mongoose.models.Transaction || mongoose.model<ITransaction>('Transaction', TransactionSchema);

export default Transaction;
