
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import dbConnect from "@/lib/mongodb";
import User from "@/models/User";
import Transaction from "@/models/Transaction";
import { getSubscriptionDetails } from "@/payment/paypal";
import { addCredits } from "@/payment/creditService";

// Plan Configurations (Sync with create-subscription/route.ts)
const PAYPAL_PLANS: Record<string, { credits: number, validity: number, amount: number, currency: string }> = {
    // USA
    "P-03734607T4219344GNFFW47A": { credits: 200, validity: 1, amount: 15, currency: "USD" },
    "P-2GF314033P139074HNFFW5NA": { credits: 600, validity: 3, amount: 39, currency: "USD" },
    // EUR
    "P-7JE10424P3529311VNFFW5YY": { credits: 200, validity: 1, amount: 14, currency: "EUR" },
    "P-5TT83749C44797628NFFW6FY": { credits: 600, validity: 3, amount: 36, currency: "EUR" },
    // GBP
    "P-8CY85830BD0723543NFFW6QA": { credits: 200, validity: 1, amount: 13, currency: "GBP" },
    "P-6H5833252X1261013NFFW6YQ": { credits: 600, validity: 3, amount: 33, currency: "GBP" }
};

export async function POST(req: NextRequest) {
    try {
        await dbConnect();
        const session = await getServerSession(authOptions);
        if (!session?.user?.email) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await req.json();
        const { subscriptionId } = body;

        if (!subscriptionId) {
            return NextResponse.json({ error: "Missing subscriptionId" }, { status: 400 });
        }

        const subDetails = await getSubscriptionDetails(subscriptionId);

        // PayPal states: APPROVAL_PENDING, APPROVED, ACTIVE, SUSPENDED, CANCELLED, EXPIRED
        if (subDetails.status !== "ACTIVE" && subDetails.status !== "APPROVED") {
            return NextResponse.json({
                success: false,
                status: subDetails.status,
                message: "Subscription is not active yet"
            });
        }

        const user = await User.findOne({ email: session.user.email });
        if (!user) {
            return NextResponse.json({ error: "User not found" }, { status: 404 });
        }

        // Idempotency check: Already processed this subscription?
        const existingTx = await Transaction.findOne({ paypalSubscriptionId: subscriptionId });
        if (existingTx) {
            return NextResponse.json({ success: true, message: "Already processed" });
        }

        const planId = subDetails.plan_id;
        const planConfig = PAYPAL_PLANS[planId];

        if (!planConfig) {
            console.warn(`Unknown PayPal Plan ID: ${planId}`);
        }

        const credits = planConfig?.credits || 200;
        const validity = planConfig?.validity || 1;

        // Create Transaction
        await Transaction.create({
            userId: user._id,
            gateway: 'PAYPAL',
            orderId: `PP_${subscriptionId}_${Date.now()}`,
            paypalSubscriptionId: subscriptionId,
            amount: planConfig?.amount || 0,
            currency: planConfig?.currency || "USD",
            credits: credits,
            status: 'completed',
            packageType: 'pro',
            validityMonths: validity,
            paymentMethod: 'paypal_subscription'
        });

        // Add Credits
        await addCredits(String(user._id), credits, validity);

        // Update User Status
        user.subscriptionId = subscriptionId;
        user.subscriptionProvider = 'PAYPAL';
        user.subscriptionStatus = 'active';
        user.isPaidUser = true; // Ensure they are treated as Pro
        await user.save();

        return NextResponse.json({ success: true });

    } catch (error: any) {
        console.error("PayPal Verification Error:", error);
        return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
    }
}
