import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IUserSettings {
  displayName: string;
  defaultTemplate: 'modern' | 'professional' | 'minimal' | 'creative';
}

export interface IUser extends Document {
  _id: any;
  email: string;
  name: string;
  phone?: string;
  password?: string;
  image?: string;
  emailVerified?: Date | null;
  isVerified?: boolean;
  provider: 'credentials' | 'google' | 'phone';
  credits: number;
  isPaidUser: boolean;
  region?: string;
  subscriptionId?: string;
  subscriptionStatus?: 'active' | 'past_due' | 'unpaid' | 'cancelled' | 'expired' | null;
  subscriptionProvider?: 'CASHFREE' | 'PAYPAL' | null;
  subscriptionPlanName?: string | null;
  subscriptionPlanId?: string | null;
  subscriptionStartDate?: Date | null;
  subscriptionEndDate?: Date | null;
  subscriptionAmount?: number | null;
  cashfreeSubscriptionId?: string | null;
  paypalSubscriptionId?: string | null;
  settings: IUserSettings;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema: Schema<IUser> = new Schema(
  {
    email: {
      type: String,
      required: function (this: IUser) {
        return !this.phone;
      },
      unique: true,
      sparse: true,
      lowercase: true,
      trim: true,
      // ❌ Remove: index: true (duplicate with unique: true)
    },
    name: {
      type: String,
      required: true,
    },
    phone: {
      type: String,
      unique: true,
      sparse: true,
      trim: true,
      // ❌ Remove: index: true (duplicate with unique: true)
    },
    password: {
      type: String,
      select: false,
    },
    image: String,
    emailVerified: {
      type: Date,
      default: null,
    },
    isVerified: {
      type: Boolean,
      default: false,
    },
    provider: {
      type: String,
      enum: ['credentials', 'google', 'phone'],
      default: 'credentials',
    },
    region: {
      type: String,
      default: 'INDIA',
    },
    subscriptionId: {
      type: String,
      default: null,
    },
    subscriptionStatus: {
      type: String,
      enum: ['active', 'past_due', 'unpaid', 'cancelled', 'expired', null],
      default: null,
    },
    subscriptionProvider: {
      type: String,
      enum: ['CASHFREE', 'PAYPAL', null],
      default: null,
    },
    subscriptionPlanName: {
      type: String,
      default: null,
    },
    subscriptionPlanId: {
      type: String,
      default: null,
    },
    subscriptionStartDate: {
      type: Date,
      default: null,
    },
    subscriptionEndDate: {
      type: Date,
      default: null,
    },
    subscriptionAmount: {
      type: Number,
      default: null,
    },
    cashfreeSubscriptionId: {
      type: String,
      default: null,
      // ❌ Remove: index: true (will be added below)
    },
    paypalSubscriptionId: {
      type: String,
      default: null,
      // ❌ Remove: index: true (will be added below)
    },
    credits: {
      type: Number,
      default: 3,
      min: 0,
    },
    isPaidUser: {
      type: Boolean,
      default: false,
    },
    settings: {
      displayName: {
        type: String,
        default: function (this: IUser) {
          return this.name || '';
        },
      },
      defaultTemplate: {
        type: String,
        enum: ['modern', 'professional', 'minimal', 'creative'],
        default: 'modern',
      },
    },
  },
  {
    timestamps: true,
  }
);

// ✅ Define indexes only here (avoid duplicates with unique fields)
UserSchema.index({ cashfreeSubscriptionId: 1 });
UserSchema.index({ paypalSubscriptionId: 1 });
UserSchema.index({ subscriptionStatus: 1 });

const User: Model<IUser> = mongoose.models.User || mongoose.model<IUser>('User', UserSchema);

export default User;
