import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import User from "@/models/User";
import { createCashfreeSubscription } from "@/payment/cashfree";
import dbConnect from "@/lib/mongodb";

// Plan Configurations
const SUBSCRIPTION_PLANS: any = {
    // India (Cashfree)
    "pro-monthly-inr": {
        provider: "CASHFREE",
        planId: process.env.CASHFREE_PLAN_MONTHLY_ID || "PRO_MONTHLY",
        price: 599,
        currency: "INR"
    },
    "pro-quarterly-inr": {
        provider: "CASHFREE",
        planId: process.env.CASHFREE_PLAN_QUARTERLY_ID || "PRO_QUARTERLY",
        price: 1499,
        currency: "INR"
    },
    // International (PayPal)
    "pro-monthly-usd": {
        provider: "PAYPAL",
        planId: process.env.PAYPAL_PLAN_MONTHLY_ID || "P-MONTHLY-USD",
        price: 15,
        currency: "USD"
    },
    "pro-quarterly-usd": {
        provider: "PAYPAL",
        planId: process.env.PAYPAL_PLAN_QUARTERLY_ID || "P-QUARTERLY-USD",
        price: 39,
        currency: "USD"
    },
    // Europe (PayPal) - Mapping to same PayPal plans but maybe different plan ID if multi-currency plans needed
    // For simplicity, assuming PayPal handles currency conversion or distinct plans
    "pro-monthly-eur": {
        provider: "PAYPAL",
        planId: process.env.PAYPAL_PLAN_MONTHLY_EUR_ID,
        price: 14,
        currency: "EUR"
    },
    "pro-quarterly-eur": {
        provider: "PAYPAL",
        planId: process.env.PAYPAL_PLAN_QUARTERLY_EUR_ID,
        price: 36,
        currency: "EUR"
    },
    "pro-monthly-gbp": {
        provider: "PAYPAL",
        planId: process.env.PAYPAL_PLAN_MONTHLY_GBP_ID,
        price: 13,
        currency: "GBP"
    },
    "pro-quarterly-gbp": {
        provider: "PAYPAL",
        planId: process.env.PAYPAL_PLAN_QUARTERLY_GBP_ID,
        price: 33,
        currency: "GBP"
    }
};

export async function POST(req: NextRequest) {
    try {
        await dbConnect();
        const session = await getServerSession(authOptions);
        if (!session || !session.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await req.json();
        const { planKey } = body; // e.g., 'pro-monthly-inr'

        // ✅ DEBUG: Log to verify env vars are loaded
        console.log("ENV CHECK:", {
            monthly: process.env.CASHFREE_PLAN_MONTHLY_ID,
            quarterly: process.env.CASHFREE_PLAN_QUARTERLY_ID
        });

        const plan = SUBSCRIPTION_PLANS[planKey];
        if (!plan) {
            return NextResponse.json({ error: "Invalid plan selected" }, { status: 400 });
        }

        // ✅ DEBUG: Log the plan being used
        console.log("Using plan:", { planKey, planId: plan.planId });

        const user = await User.findOne({ email: session.user.email });
        if (!user) {
            return NextResponse.json({ error: "User not found" }, { status: 404 });
        }

        const subscriptionId = `SUB_${Date.now()}`; // Internal ID reference if needed, usually Gateway generates one

        if (plan.provider === "CASHFREE") {
            // Ensure planId is valid in Cashfree dashboard
            if (!plan.planId) return NextResponse.json({ error: "Configuration Error: Missing Cashfree Plan ID" }, { status: 500 });

            const customerPhone = user.phone || "9999999999";
            const returnUrl = `${process.env.NEXTAUTH_URL}/payment`;

            const cfSub = await createCashfreeSubscription(
                plan.planId,
                subscriptionId,
                String(user._id),
                customerPhone,
                user.email,
                returnUrl
            );

            // Frontend will use subscriptionSessionId with Cashfree SDK
            // No URL construction needed - SDK handles the checkout flow

            return NextResponse.json({
                provider: "CASHFREE",
                subscriptionId: cfSub.subscriptionId,
                cfSubscriptionId: cfSub.cfSubscriptionId,
                subscriptionSessionId: cfSub.subscriptionSessionId, // ✅ For SDK
                status: cfSub.status
            });

        } else if (plan.provider === "PAYPAL") {
            // For PayPal, we usually just return the Plan ID and let the frontend SDK handle the subscription flow flow
            // (Smart Payment Buttons).
            // However, if we need server-side initiation, it's complex. 
            // Standard practice with React-PayPal-JS: Frontend calls 'createSubscription' with Plan ID.
            // So this endpoint might just confirm "Yes, use this Plan ID for this user".

            if (!plan.planId) return NextResponse.json({ error: "Configuration Error: Missing PayPal Plan ID" }, { status: 500 });

            return NextResponse.json({
                provider: "PAYPAL",
                planId: plan.planId
            });
        }

        return NextResponse.json({ error: "Provider not supported" }, { status: 400 });

    } catch (error: any) {
        console.error("Create Subscription Error:", error);
        return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
    }
}
