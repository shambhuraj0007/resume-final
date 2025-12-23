// Credit packages configuration
export const CREDIT_PACKAGES = {
  starter: {
    id: 'starter',
    name: 'Starter Pack',
    credits: 1,
    price: 49,
    currency: 'INR',
    validityMonths: 3,
    description: 'Perfect for trying out',
    features: ['1 Resume Analysis', '3 Months Validity', 'Full Feature Access'],
  },
  basic: {
    id: 'basic',
    name: 'Basic Pack',
    credits: 5,
    price: 199,
    currency: 'INR',
    validityMonths: 3,
    description: 'Great for job seekers',
    features: ['5 Resume Analyses', '3 Months Validity', 'Full Feature Access', 'Priority Support'],
    popular: true,
  },
  pro: {
    id: 'pro',
    name: 'Pro Pack',
    credits: 15,
    price: 499,
    currency: 'INR',
    validityMonths: 3,
    description: 'Best value for professionals',
    features: ['15 Resume Analyses', '3 Months Validity', 'Full Feature Access', 'Priority Support', 'Advanced Templates'],
  },
  premium: {
    id: 'premium',
    name: 'Premium Pack',
    credits: 20,
    price: 699,
    currency: 'INR',
    validityMonths: 3,
    description: 'Ultimate package',
    features: ['20 Resume Analyses', '3 Months Validity', 'Full Feature Access', 'Priority Support', 'Advanced Templates', 'Career Consultation'],
  },
} as const;

export type PackageType = keyof typeof CREDIT_PACKAGES;

// Razorpay configuration
export const RAZORPAY_CONFIG = {
  keyId: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID!,
  keySecret: process.env.RAZORPAY_KEY_SECRET!,
};

// Free credits for new users
export const FREE_CREDITS_ON_SIGNUP = 3;

// Credit costs for different actions
export const CREDIT_COSTS = {
  RESUME_ANALYSIS: 1,
  ATS_CHECK: 1,
  RESUME_CREATION: 1,
  RESUME_EDIT: 1,
  RESUME_OPTIMIZATION: 5,
} as const;
