import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IUserSettings {
  displayName: string;
  defaultTemplate: 'modern' | 'professional' | 'minimal' | 'creative';
}

export interface IUser extends Document {
  email: string;
  name: string;
  phone?: string; // Phone number for SMS auth
  password?: string; // Optional for OAuth users
  image?: string;
  emailVerified?: Date | null;
  isVerified?: boolean; // Phone/email verification status
  provider: 'credentials' | 'google' | 'phone'; // Track auth provider
  credits: number; // User credits for premium features
  isPaidUser: boolean; // Flag for users who have purchased credits or subscription
  region?: string;
  subscriptionId?: string;
  subscriptionStatus?: 'active' | 'past_due' | 'unpaid' | 'cancelled' | 'expired' | null;
  subscriptionProvider?: 'CASHFREE' | 'PAYPAL' | null;
  settings: IUserSettings;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema: Schema<IUser> = new Schema(
  {
    email: {
      type: String,
      required: function (this: IUser) {
        return !this.phone; // Email required only if no phone
      },
      unique: true,
      sparse: true, // Allow null/undefined values to be non-unique
      lowercase: true,
      trim: true,
    },
    name: {
      type: String,
      required: true,
    },
    phone: {
      type: String,
      unique: true,
      sparse: true, // Allow null/undefined values to be non-unique
      trim: true,
    },
    password: {
      type: String,
      select: false, // Don't include password in queries by default
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
      default: 'INDIA', // Default to India, will be updated by GeoIP
    },
    subscriptionId: String,
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
    credits: {
      type: Number,
      default: 3, // Give 3 free credits to new users
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

const User: Model<IUser> = mongoose.models.User || mongoose.model<IUser>('User', UserSchema);

export default User;
