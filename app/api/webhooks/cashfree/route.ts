import { NextRequest, NextResponse } from "next/server";
import { verifyCashfreeSignature } from "@/payment/cashfree";
import Transaction from "@/models/Transaction";
import User from "@/models/User";
import { addCredits } from "@/payment/creditService";
import dbConnect from "@/lib/mongodb";

// Map plans to credits/validity
const PLAN_CONFIG: Record<string, { credits: number, validity: number, type: string, name: string }> = {
    "pro-monthly-inr": { credits: 200, validity: 1, type: "pro", name: "Pro Monthly" },
    "pro-quarterly-inr": { credits: 700, validity: 3, type: "pro", name: "Pro Quarterly" },
    "pro_monthly_599": { credits: 200, validity: 1, type: "pro", name: "Pro Monthly" },
    "pro_quarterly_1499": { credits: 700, validity: 3, type: "pro", name: "Pro Quarterly" },
    "PRO_MONTHLY": { credits: 200, validity: 1, type: "pro", name: "Pro Monthly" },
    "PRO_QUARTERLY": { credits: 700, validity: 3, type: "pro", name: "Pro Quarterly" }
};

export async function POST(req: NextRequest) {
    try {
        await dbConnect();

        const body = await req.json();
        const type = body.type;

        console.log(`[CASHFREE WEBHOOK] Received event: ${type}`);

        if (type === "PAYMENT_SUCCESS_WEBHOOK") {
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

                // Update User Plan Name if it's a pro subscription package
                if (transaction.packageType === 'pro-monthly-inr' || transaction.packageType === 'pro-quarterly-inr') {
                    const planConfig = PLAN_CONFIG[transaction.packageType];
                    if (planConfig) {
                        await User.findByIdAndUpdate(transaction.userId, {
                            subscriptionPlanName: planConfig.name,
                            subscriptionStatus: 'active'
                        });
                    }
                }
            }
        }
        else if (type === "SUBSCRIPTION_NEW_PAYMENT" || type === "SUBSCRIPTION_PAYMENT_SUCCESS") {
            // Handle Subscription Payment
            const { subscription, payment } = body.data;
            const subscriptionId = subscription.subscription_id;
            const planId = subscription.plan_id;
            const customerId = subscription.customer_details.customer_id;

            console.log(`[CASHFREE WEBHOOK] Processing subscription payment: ${subscriptionId}`);

            // Find User by Subscription ID or customerId (user._id)
            const user = await User.findOne({ $or: [{ subscriptionId: subscriptionId }, { _id: customerId }] });

            if (!user) {
                console.error(`[CASHFREE WEBHOOK] User not found for subscription: ${subscriptionId} or customerId: ${customerId}`);
                return NextResponse.json({ status: "ignored", reason: "user_not_found" });
            }

            // Check if transaction already exists (avoid duplicates)
            const existingTx = await Transaction.findOne({ cfPaymentId: payment.cf_payment_id });
            if (existingTx) {
                console.log(`[CASHFREE WEBHOOK] Transaction already processed: ${payment.cf_payment_id}`);
                return NextResponse.json({ status: "already_processed" });
            }

            // Determine credits
            const planConfig = PLAN_CONFIG[planId] || { credits: 200, validity: 1, type: "pro", name: "Pro Monthly" };

            // Create Transaction Record
            const newTx = new Transaction({
                userId: user._id,
                orderId: `SUB_ORD_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
                cfPaymentId: payment.cf_payment_id,
                cfOrderId: payment.cf_order_id,
                cfSubscriptionId: subscriptionId,
                gateway: "CASHFREE",
                amount: payment.payment_amount,
                currency: payment.payment_currency || "INR",
                credits: planConfig.credits,
                status: "completed",
                packageType: planId,
                validityMonths: planConfig.validity,
                paymentMethod: "subscription_auto"
            });

            await newTx.save();
            console.log(`[CASHFREE WEBHOOK] Created transaction: ${newTx._id}`);

            // Add Credits
            await addCredits(user._id.toString(), planConfig.credits, planConfig.validity);
            console.log(`[CASHFREE WEBHOOK] Credits added to user: ${user._id}`);

            // Update User Subscription Status & Plan Name
            user.subscriptionId = subscriptionId; // Ensure it's the correct ID
            user.subscriptionStatus = 'active';
            user.subscriptionPlanName = planConfig.name;
            await user.save();
        }
        else if (type === "SUBSCRIPTION_STATUS_UPDATE") {
            const { subscription } = body.data;
            const { subscription_id, plan_id, customer_details, status } = subscription;

            if (status === 'ACTIVE') {
                const user = await User.findOne({ $or: [{ subscriptionId: subscription_id }, { _id: customer_details.customer_id }] });

                if (user && user.subscriptionStatus !== 'active') {
                    console.log(`[CASHFREE WEBHOOK] Activating subscription ${subscription_id} for user ${user._id}`);

                    // Check if a transaction for this subscription already exists to avoid double-crediting
                    const existingTx = await Transaction.findOne({ cfSubscriptionId: subscription_id, status: 'completed' });

                    if (!existingTx) {
                        const planConfig = PLAN_CONFIG[plan_id] || { credits: 200, validity: 1, type: "pro", name: "Pro Monthly" };

                        // This is likely the first payment, so create a transaction and add credits
                        await Transaction.create({
                            userId: user._id,
                            orderId: `SUB_ACTIVATE_${Date.now()}`,
                            cfSubscriptionId: subscription_id,
                            gateway: "CASHFREE",
                            amount: 0, // Amount might not be in this webhook, log as 0
                            currency: "INR",
                            credits: planConfig.credits,
                            status: "completed",
                            packageType: plan_id,
                            validityMonths: planConfig.validity,
                            paymentMethod: "subscription_activation"
                        });

                        await addCredits(user._id.toString(), planConfig.credits, planConfig.validity);
                        console.log(`[CASHFREE WEBHOOK] Credits added on activation for user: ${user._id}`);
                    }

                    // Update user's subscription status
                    user.subscriptionId = subscription_id;
                    user.subscriptionStatus = 'active';
                    user.subscriptionPlanName = PLAN_CONFIG[plan_id]?.name || 'Pro Plan';
                    await user.save();
                }
            }
        }

        return NextResponse.json({ status: "ok" });

    } catch (error) {
        console.error("Cashfree Webhook Error:", error);
        return NextResponse.json({ error: "Webhook Failed" }, { status: 500 });
    }
}
