import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import User from "@/models/User";
import { createCashfreeSubscription } from "@/payment/cashfree";
import dbConnect from "@/lib/mongodb";

// Plan Configurations
// const SUBSCRIPTION_PLANS: any = {
//     // India (Cashfree)
//     "pro-monthly-inr": {
//         provider: "CASHFREE",
//         planId: process.env.CASHFREE_PLAN_MONTHLY_ID || "PRO_MONTHLY",
//         price: 599,
//         currency: "INR"
//     },
//     "pro-quarterly-inr": {
//         provider: "CASHFREE",
//         planId: process.env.CASHFREE_PLAN_QUARTERLY_ID || "PRO_QUARTERLY",
//         price: 1499,
//         currency: "INR"
//     },
//     // International (PayPal)
//     "pro-monthly-usd": {
//         provider: "PAYPAL",
//         planId: "P-05M666451V631953LNFFLHDY",
//         price: 15,
//         currency: "USD"
//     },
//     "pro-quarterly-usd": {
//         provider: "PAYPAL",
//         planId: "P-4M9785276H958822KNFFLIJA",
//         price: 39,
//         currency: "USD"
//     },
//     // Europe (PayPal)
//     "pro-monthly-eur": {
//         provider: "PAYPAL",
//         planId: "P-6M580881VM893674TNFFLI2Y",
//         price: 14,
//         currency: "EUR"
//     },
//     "pro-quarterly-eur": {
//         provider: "PAYPAL",
//         planId: "P-4X993862FS1550934NFFLJKY",
//         price: 36,
//         currency: "EUR"
//     },
//     "pro-monthly-gbp": {
//         provider: "PAYPAL",
//         planId: "P-09G239902Y3340720NFFLJXY",
//         price: 13,
//         currency: "GBP"
//     },
//     "pro-quarterly-gbp": {
//         provider: "PAYPAL",
//         planId: "P-10X49417336220825NFFLKJA",
//         price: 33,
//         currency: "GBP"
//     }
// };
const SUBSCRIPTION_PLANS: any = {
    // India (Cashfree)
    "pro-monthly-inr": {
        provider: "CASHFREE",
        planId: process.env.CASHFREE_PLAN_MONTHLY_ID || "PRO_MONTHLY",
        price: 599,
        currency: "INR",
    },
    "pro-quarterly-inr": {
        provider: "CASHFREE",
        planId: process.env.CASHFREE_PLAN_QUARTERLY_ID || "PRO_QUARTERLY",
        price: 1499,
        currency: "INR",
    },

    // USA (PayPal – sandbox)
    "pro-monthly-usd": {
        provider: "PAYPAL",
        planId: "P-03734607T4219344GNFFW47A",
        price: 15,
        currency: "USD",
    },
    "pro-quarterly-usd": {
        provider: "PAYPAL",
        planId: "P-2GF314033P139074HNFFW5NA",
        price: 39,
        currency: "USD",
    },

    // Europe (PayPal – sandbox)
    "pro-monthly-eur": {
        provider: "PAYPAL",
        planId: "P-7JE10424P3529311VNFFW5YY",
        price: 14,
        currency: "EUR",
    },
    "pro-quarterly-eur": {
        provider: "PAYPAL",
        planId: "P-5TT83749C44797628NFFW6FY",
        price: 36,
        currency: "EUR",
    },

    // UK (PayPal – sandbox)
    "pro-monthly-gbp": {
        provider: "PAYPAL",
        planId: "P-8CY85830BD0723543NFFW6QA",
        price: 13,
        currency: "GBP",
    },
    "pro-quarterly-gbp": {
        provider: "PAYPAL",
        planId: "P-6H5833252X1261013NFFW6YQ",
        price: 33,
        currency: "GBP",
    },
};


export async function POST(req: NextRequest) {
    try {
        await dbConnect();
        // 1. Check for NextAuth session
        const session = await getServerSession(authOptions);
        let userEmail = session?.user?.email;

        // 2. Fallback to Phone/JWT auth if no session
        if (!userEmail) {
            const { verifyAuth } = await import("@/lib/auth");
            const phoneUser = await verifyAuth(req);
            if (phoneUser) {
                const userDoc = await User.findById(phoneUser.userId);
                userEmail = userDoc?.email;
            }
        }

        if (!userEmail) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const user = await User.findOne({ email: userEmail });
        if (!user) {
            return NextResponse.json({ error: "User not found" }, { status: 404 });
        }

        const body = await req.json();
        const { planKey } = body;

        const plan = SUBSCRIPTION_PLANS[planKey];
        if (!plan) {
            return NextResponse.json({ error: "Invalid plan selected" }, { status: 400 });
        }

        const subscriptionId = `SUB_${Date.now()}`; // Internal ID reference if needed, usually Gateway generates one

        if (plan.provider === "CASHFREE") {
            if (!plan.planId) return NextResponse.json({ error: "Configuration Error: Missing Cashfree Plan ID" }, { status: 500 });

            const customerPhone = user.phone || "9999999999";

            const returnUrl = `${process.env.NEXTAUTH_URL}/payment/status?cf_subscription_id={subscription_id}`;

            const cfSub = await createCashfreeSubscription(
                plan.planId,
                subscriptionId,
                String(user._id),
                customerPhone,
                user.email,
                returnUrl,
                user.name || "Customer",
                plan.price
            );

            user.subscriptionId = cfSub.cfSubscriptionId;
            user.subscriptionProvider = "CASHFREE";
            user.subscriptionStatus = null; // Will be updated by webhook
            await user.save();

            console.log(`[CREATE_SUBSCRIPTION] Saved subscription ID: ${cfSub.cfSubscriptionId} for user: ${user.email}`);

            return NextResponse.json({
                provider: "CASHFREE",
                subscriptionId: cfSub.subscriptionId,
                cfSubscriptionId: cfSub.cfSubscriptionId,
                subscriptionSessionId: cfSub.subscriptionSessionId,
                status: cfSub.status
            });
        }
        else if (plan.provider === "PAYPAL") {
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
