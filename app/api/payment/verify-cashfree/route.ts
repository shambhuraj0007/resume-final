
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import dbConnect from "@/lib/mongodb";
import Transaction from "@/models/Transaction";
import User from "@/models/User";
import { verifyCashfreeOrder } from "@/payment/cashfree";
import { addCredits } from "@/payment/creditService";

export async function POST(req: NextRequest) {
    try {
        await dbConnect();
        const session = await getServerSession(authOptions);

        if (!session || !session.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { orderId } = await req.json();

        if (!orderId) {
            return NextResponse.json({ error: "Missing orderId" }, { status: 400 });
        }

        // 1. Find Transaction locally
        const transaction = await Transaction.findOne({ orderId: orderId });
        if (!transaction) {
            return NextResponse.json({ error: "Transaction not found" }, { status: 404 });
        }

        // 2. If already completed, return success immediately (Idempotency)
        if (transaction.status === "completed") {
            return NextResponse.json({ success: true, message: "Already completed" });
        }

        // 3. Verify with Cashfree
        const cfOrder = await verifyCashfreeOrder(orderId);

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
                    user._id.toString(),
                    transaction.credits,
                    transaction.validityMonths
                );
            }

            return NextResponse.json({ success: true });
        } else {
            // If failed or pending
            return NextResponse.json({ error: `Payment status: ${cfOrder.order_status}` }, { status: 400 });
        }

    } catch (error: any) {
        console.error("Verify Cashfree Error:", error);
        return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
    }
}
