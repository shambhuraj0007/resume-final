import { NextRequest, NextResponse } from "next/server";
import { verifyCashfreeSignature } from "@/payment/cashfree";
import Transaction from "@/models/Transaction";
import User from "@/models/User";
import { addCredits } from "@/payment/creditService";
import dbConnect from "@/lib/mongodb";

// Map plans to credits/validity
const PLAN_CONFIG: Record<string, { credits: number, validity: number, type: string }> = {
    // Current frontend Plan IDs
    "pro-monthly-inr": { credits: 200, validity: 1, type: "pro" },
    "pro-quarterly-inr": { credits: 600, validity: 3, type: "pro" },

    // Fallback/Legacy IDs (Cashfree might return the internal Plan ID)
    "pro_monthly_599": { credits: 200, validity: 1, type: "pro" },
    "pro_quarterly_1499": { credits: 600, validity: 3, type: "pro" },
    "PRO_MONTHLY": { credits: 200, validity: 1, type: "pro" },
    "PRO_QUARTERLY": { credits: 600, validity: 3, type: "pro" }
};

export async function POST(req: NextRequest) {
    try {
        await dbConnect();

        const body = await req.json();
        const type = body.type;

        console.log(`[CASHFREE WEBHOOK] Received event: ${type}`);

        if (type === "PAYMENT_SUCCESS_WEBHOOK") {
            // ... existing logic for PG ...
            const { order, payment } = body.data;
            const orderId = order.order_id;

            const transaction = await Transaction.findOne({ orderId: orderId });

            if (transaction && transaction.status !== 'completed') {
                transaction.status = 'completed';
                transaction.cfPaymentId = payment.cf_payment_id;
                transaction.paymentMethod = payment.payment_method;
                await transaction.save();

                if (transaction.credits > 0) {
                    await addCredits(transaction.userId.toString(), transaction.credits, transaction.validityMonths || 3);
                }
            }
        }
        else if (type === "SUBSCRIPTION_NEW_PAYMENT" || type === "SUBSCRIPTION_PAYMENT_SUCCESS") {
            // Handle Subscription Payment
            const { subscription, payment } = body.data;
            const subscriptionId = subscription.subscription_id;
            const planId = subscription.plan_id;

            console.log(`[CASHFREE WEBHOOK] Processing subscription payment: ${subscriptionId}`);

            // Find User by Subscription ID
            const user = await User.findOne({ subscriptionId: subscriptionId });

            if (!user) {
                console.error(`[CASHFREE WEBHOOK] User not found for subscription: ${subscriptionId}`);
                // Try finding by customer_id if it's the user ID
                // But subscription payload might not have customer_id in root data
                return NextResponse.json({ status: "ignored", reason: "user_not_found" });
            }

            // Check if transaction already exists (avoid duplicates)
            // Use payment.cf_payment_id or payment.payment_id as unique key
            const existingTx = await Transaction.findOne({ cfPaymentId: payment.cf_payment_id });
            if (existingTx) {
                console.log(`[CASHFREE WEBHOOK] Transaction already processed: ${payment.cf_payment_id}`);
                return NextResponse.json({ status: "already_processed" });
            }

            // Determine credits
            const planConfig = PLAN_CONFIG[planId] || { credits: 50, validity: 1, type: "basic" };

            // Create Transaction Record
            const newTx = new Transaction({
                userId: user._id,
                orderId: `SUB_ORD_${Date.now()}_${Math.floor(Math.random() * 1000)}`, // Generate a unique order ID
                cfPaymentId: payment.cf_payment_id,
                cfOrderId: payment.cf_order_id, // If available
                gateway: "CASHFREE",
                amount: payment.payment_amount,
                currency: payment.payment_currency || "INR",
                credits: planConfig.credits,
                status: "completed",
                packageType: planConfig.type,
                validityMonths: planConfig.validity,
                paymentMethod: "subscription_auto",
                paypalSubscriptionId: subscriptionId // Using this field or adding a new one? Transaction model has cfSubscriptionId? No. 
                // We'll reuse valid fields or ignore subscriptionId on Transaction if not present.
                // Model has `paypalSubscriptionId`, we can add `cfSubscriptionId` to model or just rely on user link.
            });

            await newTx.save();
            console.log(`[CASHFREE WEBHOOK] Created transaction: ${newTx._id}`);

            // Add Credits
            await addCredits(user._id.toString(), planConfig.credits, planConfig.validity);
            console.log(`[CASHFREE WEBHOOK] Credits added to user: ${user._id}`);

            // Update User Subscription Status if needed
            if (user.subscriptionStatus !== 'active') {
                user.subscriptionStatus = 'active';
                await user.save();
            }
        }

        return NextResponse.json({ status: "ok" });

    } catch (error) {
        console.error("Cashfree Webhook Error:", error);
        return NextResponse.json({ error: "Webhook Failed" }, { status: 500 });
    }
}
