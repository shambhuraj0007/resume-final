import { NextRequest, NextResponse } from "next/server";
import User from "@/models/User";
import Transaction from "@/models/Transaction";
import dbConnect from "@/lib/mongodb";

export async function POST(req: NextRequest) {
    try {
        await dbConnect();
        const body = await req.json();
        const eventType = body.event_type;
        const resource = body.resource;

        // Verify Signature (skipped for MVP - ensure to add for Prod)

        if (eventType === "BILLING.SUBSCRIPTION.ACTIVATED") {
            const subscriptionId = resource.id;
            // The custom_id usually contains user ID if we passed it. 
            // If not, we might need to look up by email match or pending state?
            // PayPal 'custom_id' field in subscription setup is best place to store userId.
            const userId = resource.custom_id;

            if (userId) {
                await User.findByIdAndUpdate(userId, {
                    subscriptionId: subscriptionId,
                    subscriptionStatus: 'active',
                    subscriptionProvider: 'PAYPAL',
                    region: 'INTERNATIONAL' // or specific
                });
            }
        }
        else if (eventType === "PAYMENT.SALE.COMPLETED") {
            // Subscription payment received (recurring)
            const subscriptionId = resource.billing_agreement_id;
            if (subscriptionId) {
                // Log transaction
                const user = await User.findOne({ subscriptionId });
                if (user) {
                    await Transaction.create({
                        userId: user._id,
                        gateway: 'PAYPAL',
                        paypalSubscriptionId: subscriptionId,
                        paypalOrderId: resource.id, // transaction id
                        amount: resource.amount.total,
                        currency: resource.amount.currency,
                        credits: 9999, // Unlimited (?) or just log it
                        status: 'completed',
                        packageType: 'subscription_renewal',
                        validityMonths: 1
                    });

                    // Extend/Ensure status is active
                    user.subscriptionStatus = 'active';
                    await user.save();
                }
            }
        }
        else if (eventType === "BILLING.SUBSCRIPTION.CANCELLED") {
            const subscriptionId = resource.id;
            await User.findOneAndUpdate({ subscriptionId }, {
                subscriptionStatus: 'cancelled'
            });
        }

        return NextResponse.json({ status: "ok" });
    } catch (error) {
        console.error("PayPal Webhook Error:", error);
        return NextResponse.json({ error: "Webhook Failed" }, { status: 500 });
    }
}
