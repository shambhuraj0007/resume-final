import Credit from '@/models/Credit';
import AnalysisHistory from '@/models/AnalysisHistory';
import User from '@/models/User';
import { FREE_CREDITS_ON_SIGNUP } from './config';

// Initialize credits for new user
export async function initializeUserCredits(userId: string) {
  try {
    const existingCredit = await Credit.findOne({ userId });

    if (!existingCredit) {
      const credit = new Credit({
        userId,
        credits: FREE_CREDITS_ON_SIGNUP,
        lastResetDate: new Date(),
        expiryDate: null, // Free credits don't expire
      });
      await credit.save();
      return credit;
    }

    return existingCredit;
  } catch (error) {
    console.error('Error initializing user credits:', error);
    throw error;
  }
}

// Get user credits
export async function getUserCredits(userId: string) {
  try {
    let credit = await Credit.findOne({ userId });

    if (!credit) {
      credit = await initializeUserCredits(userId);
    }

    // Lazy Monthly Reset for Free Users
    // Check if 30 days have passed since last reset
    const now = new Date();
    const lastReset = credit.lastResetDate ? new Date(credit.lastResetDate) : new Date(credit.createdAt);
    const thirtyDaysInMs = 30 * 24 * 60 * 60 * 1000;

    if (now.getTime() - lastReset.getTime() >= thirtyDaysInMs) {
      // It's time to reset free credits
      // We set it to 3 as a fresh start for the month
      credit.credits = Math.max(credit.credits, 3);
      credit.lastResetDate = now;
      await credit.save();

      // Also sync to User model
      await User.findByIdAndUpdate(userId, { credits: credit.credits });
    }

    // Check if credits are expired (bought credits)
    if (credit.expiryDate && new Date() > credit.expiryDate) {
      // If expired, ensure they at least have the 3 free ones for the month
      if (credit.credits > 3) {
        credit.credits = 3;
        await credit.save();
        await User.findByIdAndUpdate(userId, { credits: credit.credits });
      } else if (credit.credits < 3) {
        // This shouldn't happen if monthly reset is working, but safety first
        credit.credits = 3;
        await credit.save();
        await User.findByIdAndUpdate(userId, { credits: credit.credits });
      }
    }

    return credit;
  } catch (error) {
    console.error('Error getting user credits:', error);
    throw error;
  }
}

// Check if user has sufficient credits
export async function hasCredits(userId: string, requiredCredits: number = 1): Promise<boolean> {
  try {
    const credit = await getUserCredits(userId);
    return credit.credits >= requiredCredits;
  } catch (error) {
    console.error('Error checking credits:', error);
    return false;
  }
}

// Deduct credits from user
export async function deductCredits(
  userId: string,
  amount: number = 1,
  analysisType: 'resume_analysis' | 'resume_creation' | 'resume_edit' | 'resume_optimization' | 'ats_check',
  resumeId?: string,
  fileName?: string
) {
  try {
    const credit = await getUserCredits(userId);

    if (credit.credits < amount) {
      throw new Error('Insufficient credits');
    }

    // Check if credits are expired
    if (credit.expiryDate && new Date() > credit.expiryDate) {
      throw new Error('Credits have expired');
    }

    credit.credits -= amount;
    await credit.save();

    // Record in analysis history
    // Only include resumeId if it's a valid ObjectId string (24 hex characters)
    const historyData: any = {
      userId,
      analysisType,
      creditsUsed: amount,
      fileName,
      status: 'success',
    };

    // Add resumeId only if it's a valid MongoDB ObjectId format
    if (resumeId && /^[0-9a-fA-F]{24}$/.test(resumeId)) {
      historyData.resumeId = resumeId;
    }

    const history = new AnalysisHistory(historyData);
    await history.save();

    return { success: true, remainingCredits: credit.credits };
  } catch (error) {
    console.error('Error deducting credits:', error);

    // Record failed attempt
    try {
      const historyData: any = {
        userId,
        analysisType,
        creditsUsed: 0,
        fileName,
        status: 'failed',
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
      };

      // Add resumeId only if it's a valid MongoDB ObjectId format
      if (resumeId && /^[0-9a-fA-F]{24}$/.test(resumeId)) {
        historyData.resumeId = resumeId;
      }

      const history = new AnalysisHistory(historyData);
      await history.save();
    } catch (historyError) {
      console.error('Error recording failed analysis:', historyError);
    }

    throw error;
  }
}

// Add credits to user (after successful payment)
export async function addCredits(
  userId: string,
  amount: number,
  validityMonths: number = 3
) {
  try {
    const credit = await getUserCredits(userId);

    credit.credits += amount;

    // Set expiry date (3 months from now)
    const expiryDate = new Date();
    expiryDate.setMonth(expiryDate.getMonth() + validityMonths);

    // If there's an existing expiry date and it's later than the new one, keep it
    if (!credit.expiryDate || credit.expiryDate < expiryDate) {
      credit.expiryDate = expiryDate;
    }

    await credit.save();

    // Mark user as a Paid User (Pro status for downloads)
    await User.findByIdAndUpdate(userId, { isPaidUser: true, credits: credit.credits });

    return credit;
  } catch (error) {
    console.error('Error adding credits:', error);
    throw error;
  }
}

// Get user analysis history
export async function getUserAnalysisHistory(userId: string, limit: number = 50) {
  try {
    const history = await AnalysisHistory.find({ userId })
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();

    return history;
  } catch (error) {
    console.error('Error getting analysis history:', error);
    throw error;
  }
}

// Get user statistics
export async function getUserStats(userId: string) {
  try {
    const credit = await getUserCredits(userId);
    const totalAnalyses = await AnalysisHistory.countDocuments({ userId, status: 'success' });
    const recentHistory = await getUserAnalysisHistory(userId, 10);

    return {
      credits: credit.credits,
      expiryDate: credit.expiryDate,
      totalAnalyses,
      recentHistory,
    };
  } catch (error) {
    console.error('Error getting user stats:', error);
    throw error;
  }
}
