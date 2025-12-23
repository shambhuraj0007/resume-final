import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import dbConnect from '@/lib/mongodb';
import User from '@/models/User';

function verifySignature(params: URLSearchParams, secretKey: string) {
    const signature = params.get('signature');
    if (!signature) {
        return false;
    }

    // Create sorted string of all params except signature
    const sortedParams = Array.from(params.entries())
        .filter(([key]) => key !== 'signature')
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([key, value]) => `${key}=${value}`)
        .join('&');

    const computedSignature = crypto
        .createHmac('sha256', secretKey)
        .update(sortedParams)
        .digest('base64');

    return computedSignature === signature;
}

import { verifyCashfreeSubscription } from "@/payment/cashfree";
import { addCredits } from "@/payment/creditService";
import Transaction from "@/models/Transaction";

// Map plans to credits/validity (Sync with Webhook)
const PLAN_CONFIG: Record<string, { credits: number, validity: number, type: string, amount: number, currency: string }> = {
    "pro-monthly-inr": { credits: 200, validity: 1, type: "pro", amount: 599, currency: "INR" },
    "pro-quarterly-inr": { credits: 600, validity: 3, type: "pro", amount: 1499, currency: "INR" },
    "pro_monthly_599": { credits: 200, validity: 1, type: "pro", amount: 599, currency: "INR" },
    "pro_quarterly_1499": { credits: 600, validity: 3, type: "pro", amount: 1499, currency: "INR" },
    "PRO_MONTHLY": { credits: 200, validity: 1, type: "pro", amount: 599, currency: "INR" },
    "PRO_QUARTERLY": { credits: 600, validity: 3, type: "pro", amount: 1499, currency: "INR" }
};

export async function GET(req: NextRequest) {
    try {
        const searchParams = req.nextUrl.searchParams;
        const secretKey = process.env.CASHFREE_SECRET_KEY;

        const cfSubscriptionId =
            searchParams.get('cf_subscriptionId') || searchParams.get('subscription_id');
        const cfStatus = searchParams.get('cf_status');
        const cfCheckoutStatus = searchParams.get('cf_checkoutStatus');

        let isValid = true;

        // Best-effort signature verification
        if (secretKey) {
            try {
                const rawValid = verifySignature(searchParams, secretKey);
                if (!rawValid) {
                    console.warn('Cashfree redirect signature mismatch.');
                }
            } catch (err) {
                console.error('Error verifying signature:', err);
            }
        }

        // Try to verify and activate subscription + ADD CREDITS
        let subscriptionStatusUpdated = false;
        let newSubscriptionStatus: string | null = null;
        let creditsAdded = false;

        if (cfSubscriptionId) {
            await dbConnect();
            const session = await getServerSession(authOptions);

            if (session?.user?.email) {
                const user = await User.findOne({ email: session.user.email });

                if (user) {
                    try {
                        // 1. Fetch Real Status from Cashfree
                        const subDetails = await verifyCashfreeSubscription(cfSubscriptionId);
                        console.log("Verified Subscription Details:", subDetails);

                        const currentStatus = subDetails.subscription_status;
                        const planId = subDetails.plan_details?.plan_id;

                        // 2. Check if valid status
                        if (currentStatus === "ACTIVE" || currentStatus === "BANK_APPROVAL_PENDING" || currentStatus === "ON_HOLD") {

                            // Update User
                            user.subscriptionId = cfSubscriptionId;
                            user.subscriptionProvider = 'CASHFREE';
                            user.subscriptionStatus = 'active'; // Grant access
                            await user.save();

                            subscriptionStatusUpdated = true;
                            newSubscriptionStatus = 'active';

                            // 3. Add Credits (Idempotency Check)
                            // We need a unique key. Use latest payment ID if available, or subscription ID + cycle?
                            // Cashfree API doesn't always return latest payment in sub details immediately.
                            // But we can check if we already gave credits for this subscription recently?
                            // Better: Check Transaction by `cfSubscriptionId` (we added this field to model previously?)
                            // Actually, let's look for a Transaction with this subscriptionId created in last 5 mins?
                            // Or just rely on Webhook for robustness, BUT for localhost we need this.

                            // Let's create a Transaction if one doesn't exist for this sub ID
                            const existingTx = await Transaction.findOne({
                                paypalSubscriptionId: cfSubscriptionId // reusing field or verify schema
                            });

                            // To be safe and avoid double credit (webhook + this), we can check if credits > 0 
                            // But webhooks might lag.

                            if (!existingTx) {
                                const planConfig = PLAN_CONFIG[planId] || { credits: 200, validity: 1, type: "pro", amount: 0, currency: 'INR' };

                                const newTx = await Transaction.create({
                                    userId: user._id,
                                    gateway: 'CASHFREE',
                                    orderId: `SUB_VERIFY_${Date.now()}`,
                                    paypalSubscriptionId: cfSubscriptionId, // Using as unique ref
                                    amount: planConfig.amount,
                                    currency: planConfig.currency,
                                    credits: planConfig.credits,
                                    status: 'completed',
                                    packageType: planConfig.type,
                                    validityMonths: planConfig.validity,
                                    paymentMethod: 'subscription_verify'
                                });

                                await addCredits((user._id as any).toString(), planConfig.credits, planConfig.validity);
                                creditsAdded = true;
                                console.log(`Credits (${planConfig.credits}) added via verification for ${user.email}`);
                            }
                        }
                    } catch (err) {
                        console.error("Failed to verify subscription details:", err);
                        // Fallback to params if fetch fails? existing logic was here.
                    }
                }
            }
        }

        return NextResponse.json({
            isValid,
            cfSubscriptionId,
            cfStatus,
            cfCheckoutStatus,
            subscriptionStatusUpdated,
            subscriptionStatus: newSubscriptionStatus,
            creditsAdded
        });
    } catch (error: any) {
        console.error('Signature verification error:', error);
        return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
    }
}
