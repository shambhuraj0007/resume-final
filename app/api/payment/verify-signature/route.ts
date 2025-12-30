import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import dbConnect from '@/lib/mongodb';
import User from '@/models/User';
import { verifyCashfreeSubscription } from "@/payment/cashfree";
import { addCredits } from "@/payment/creditService";
import Transaction from "@/models/Transaction";

const CASHFREE_PLAN_MONTHLY_ID = process.env.CASHFREE_PLAN_MONTHLY_ID || "shortlistai_pro_monthly";
const CASHFREE_PLAN_QUARTERLY_ID = process.env.CASHFREE_PLAN_QUARTERLY_ID || "shortlistai_pro_quarterly";

type PlanConfig = {
  credits: number;
  validity: number;
  type: string;
  name: string;
  amount: number;
  currency: string;
  canonicalId: string;
};

const PLAN_CONFIG: Record<string, PlanConfig> = {
  "pro-monthly-inr": { credits: 200, validity: 1, type: "pro", name: "Pro Monthly", amount: 599, currency: "INR", canonicalId: "pro-monthly-inr" },
  "pro-quarterly-inr": { credits: 700, validity: 3, type: "pro", name: "Pro Quarterly", amount: 1499, currency: "INR", canonicalId: "pro-quarterly-inr" },
  "pro_monthly_599": { credits: 200, validity: 1, type: "pro", name: "Pro Monthly", amount: 599, currency: "INR", canonicalId: "pro-monthly-inr" },
  "pro_quarterly_1499": { credits: 700, validity: 3, type: "pro", name: "Pro Quarterly", amount: 1499, currency: "INR", canonicalId: "pro-quarterly-inr" },
  "PRO_MONTHLY": { credits: 200, validity: 1, type: "pro", name: "Pro Monthly", amount: 599, currency: "INR", canonicalId: "pro-monthly-inr" },
  "PRO_QUARTERLY": { credits: 700, validity: 3, type: "pro", name: "Pro Quarterly", amount: 1499, currency: "INR", canonicalId: "pro-quarterly-inr" },
  "shortlistai_pro_monthly": { credits: 200, validity: 1, type: "pro", name: "Pro Monthly", amount: 599, currency: "INR", canonicalId: "pro-monthly-inr" },
  "shortlistai_pro_quarterly": { credits: 700, validity: 3, type: "pro", name: "Pro Quarterly", amount: 1499, currency: "INR", canonicalId: "pro-quarterly-inr" },
  [CASHFREE_PLAN_MONTHLY_ID]: { credits: 200, validity: 1, type: "pro", name: "Pro Monthly", amount: 599, currency: "INR", canonicalId: "pro-monthly-inr" },
  [CASHFREE_PLAN_QUARTERLY_ID]: { credits: 700, validity: 3, type: "pro", name: "Pro Quarterly", amount: 1499, currency: "INR", canonicalId: "pro-quarterly-inr" },
};

export async function GET(req: NextRequest) {
  try {
    await dbConnect();
    
    const searchParams = req.nextUrl.searchParams;
    const cfSubscriptionId = searchParams.get('cf_subscriptionId') || searchParams.get('subscription_id');
    const userId = searchParams.get('user_id');

    console.log(`[VERIFY_SIGNATURE] ===== VERIFICATION START =====`);
    console.log(`[VERIFY_SIGNATURE] Subscription ID: ${cfSubscriptionId}, User ID: ${userId}`);
    console.log(`[VERIFY_SIGNATURE] All params:`, searchParams.toString());

    let user;
    if (userId) {
      user = await User.findById(userId);
    } else if (cfSubscriptionId) {
      user = await User.findOne({ subscriptionId: cfSubscriptionId });
    } else {
      const session = await getServerSession(authOptions);
      if (session?.user?.email) {
        user = await User.findOne({ email: session.user.email });
      }
    }

    if (!user) {
      console.error(`[VERIFY_SIGNATURE] User not found`);
      const redirectUrl = new URL('/pricing?error=user_not_found', req.url);
      return NextResponse.redirect(redirectUrl);
    }

    const subscriptionIdToVerify = cfSubscriptionId || user.subscriptionId;

    if (!subscriptionIdToVerify) {
      console.error(`[VERIFY_SIGNATURE] No subscription ID available`);
      const redirectUrl = new URL('/pricing?error=no_subscription', req.url);
      return NextResponse.redirect(redirectUrl);
    }

    console.log(`[VERIFY_SIGNATURE] Verifying subscription: ${subscriptionIdToVerify} for user: ${user.email}`);

    // Verify subscription with Cashfree API
    let subDetails;
    try {
      subDetails = await verifyCashfreeSubscription(subscriptionIdToVerify);
      console.log(`[VERIFY_SIGNATURE] Cashfree Status: ${subDetails.subscription_status}`);
      console.log(`[VERIFY_SIGNATURE] Plan ID: ${subDetails.plan_details?.plan_id}`);
    } catch (error: any) {
      console.error(`[VERIFY_SIGNATURE] Cashfree API error:`, error);
      const redirectUrl = new URL(`/pricing?error=verification_failed&msg=${encodeURIComponent(error.message)}`, req.url);
      return NextResponse.redirect(redirectUrl);
    }

    if (subDetails.subscription_status === "ACTIVE") {
      const planId = subDetails.plan_details?.plan_id;
      const planConfig = PLAN_CONFIG[planId] || PLAN_CONFIG["shortlistai_pro_monthly"];

      console.log(`[VERIFY_SIGNATURE] ✅ ACTIVE - Plan: ${planConfig.name}, Credits: ${planConfig.credits}`);

      const existingTx = await Transaction.findOne({
        cfSubscriptionId: subscriptionIdToVerify
      });

      if (!existingTx) {
        await Transaction.create({
          userId: user._id,
          gateway: 'CASHFREE',
          orderId: `SUB_VERIFY_${Date.now()}`,
          cfSubscriptionId: subscriptionIdToVerify,
          amount: planConfig.amount,
          currency: planConfig.currency,
          credits: planConfig.credits,
          status: 'completed',
          packageType: planConfig.canonicalId,
          validityMonths: planConfig.validity,
          paymentMethod: 'subscription_verify',
        });

        await addCredits(user._id.toString(), planConfig.credits, planConfig.validity);
        console.log(`[VERIFY_SIGNATURE] ✅ Credits added: ${planConfig.credits}`);
      }

      user.subscriptionStatus = 'active';
      user.subscriptionPlanName = planConfig.name;
      user.isPaidUser = true;
      await user.save();

      const redirectUrl = new URL('/pricing', req.url);
      redirectUrl.searchParams.set('success', 'true');
      redirectUrl.searchParams.set('plan', planConfig.name);
      redirectUrl.searchParams.set('credits', planConfig.credits.toString());
      
      return NextResponse.redirect(redirectUrl);
    } else {
      const redirectUrl = new URL('/pricing', req.url);
      redirectUrl.searchParams.set('status', 'pending');
      return NextResponse.redirect(redirectUrl);
    }

  } catch (error: any) {
    console.error("[VERIFY_SIGNATURE] ❌ Error:", error);
    const redirectUrl = new URL('/pricing', req.url);
    redirectUrl.searchParams.set('error', 'verification_error');
    return NextResponse.redirect(redirectUrl);
  }
}
