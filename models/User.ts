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
  settings: IUserSettings;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema: Schema<IUser> = new Schema(
  {
    email: {
      type: String,
      required: function(this: IUser) {
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
    credits: {
      type: Number,
      default: 5, // Give 5 free credits to new users
      min: 0,
    },
    settings: {
      displayName: {
        type: String,
        default: function(this: IUser) {
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
