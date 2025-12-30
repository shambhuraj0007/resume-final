
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import dbConnect from "@/lib/mongodb";
import Transaction from "@/models/Transaction";
import User from "@/models/User";
import { verifyCashfreeOrder } from "@/payment/cashfree";
import { addCredits } from "@/payment/creditService";

// Map plans to credits/validity (Consistency with Webhook)
const PLAN_CONFIG: Record<string, { name: string }> = {
    "pro-monthly-inr": { name: "Pro Monthly" },
    "pro-quarterly-inr": { name: "Pro Quarterly" },
    "pro_monthly_599": { name: "Pro Monthly" },
    "pro_quarterly_1499": { name: "Pro Quarterly" },
    "PRO_MONTHLY": { name: "Pro Monthly" },
    "PRO_QUARTERLY": { name: "Pro Quarterly" }
};

export async function POST(req: NextRequest) {
    try {
        await dbConnect();
        // ... (auth logic) ...
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

        const { orderId } = await req.json();

        if (!orderId) {
            console.error("Verify Cashfree: Missing orderId");
            return NextResponse.json({ error: "Missing orderId" }, { status: 400 });
        }

        console.log(`[VERIFY CASHFREE] Verifying order: ${orderId}`);

        // 1. Find Transaction locally
        const transaction = await Transaction.findOne({ orderId: orderId });
        if (!transaction) {
            console.error(`[VERIFY CASHFREE] Transaction not found for orderId: ${orderId}`);
            return NextResponse.json({ error: "Transaction not found" }, { status: 404 });
        }
        console.log(`[VERIFY CASHFREE] Local transaction found: ${transaction.orderId}, Status: ${transaction.status}`);

        // 2. If already completed, return success immediately (Idempotency)
        if (transaction.status === "completed") {
            console.log(`[VERIFY CASHFREE] Order already completed: ${orderId}`);
            return NextResponse.json({ success: true, message: "Already completed" });
        }

        // 3. Verify with Cashfree
        console.log(`[VERIFY CASHFREE] Fetching status from Cashfree API...`);
        const cfOrder = await verifyCashfreeOrder(orderId);
        console.log(`[VERIFY CASHFREE] Cashfree Status: ${cfOrder.order_status}`);

        // Check if PAID
        if (cfOrder.order_status === "PAID") {
            // Update Transaction
            transaction.status = "completed";
            transaction.paymentId = cfOrder.cf_order_id; // or payment_session_id or a generic payment id
            transaction.rawResponse = cfOrder; // optional: save raw response
            await transaction.save();

            // Add Credits
            const user = await User.findById(transaction.userId);
            if (user) {
                await addCredits(
                    (user._id as any).toString(),
                    transaction.credits,
                    transaction.validityMonths
                );

                // Update User Plan Name if it's a pro subscription package
                const planInfo = PLAN_CONFIG[transaction.packageType];
                if (planInfo) {
                    user.subscriptionPlanName = planInfo.name;
                    user.subscriptionStatus = 'active';
                    await user.save();
                }
            }

            return NextResponse.json({ success: true });
        } else {
            console.warn(`[VERIFY CASHFREE] Payment not PAID. Status: ${cfOrder.order_status}`);
            // Return status to frontend so it can decide to poll or show error
            return NextResponse.json({
                success: false,
                status: cfOrder.order_status,
                error: `Payment status: ${cfOrder.order_status}`
            });
        }

    } catch (error: any) {
        console.error("Verify Cashfree Error:", error);
        return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
    }
}
