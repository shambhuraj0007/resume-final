import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import User from "@/models/User";
import { cancelCashfreeSubscription } from "@/payment/cashfree";
import dbConnect from "@/lib/mongodb";

export async function POST(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);

        if (!session || !session.user?.email) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        await dbConnect();
        const user = await User.findOne({ email: session.user.email });

        if (!user) {
            return NextResponse.json({ error: "User not found" }, { status: 404 });
        }

        if (!user.subscriptionId) {
            return NextResponse.json({ error: "No active subscription found" }, { status: 400 });
        }

        // Call Cashfree to cancel
        try {
            await cancelCashfreeSubscription(user.subscriptionId);
        } catch (apiError: any) {
            console.error("Cashfree Cancellation Error:", apiError);
            // Even if API fails (e.g. already cancelled), we might want to update local state if confirmed? 
            // For now, return error.
            return NextResponse.json({ error: apiError.message || "Failed to cancel with provider" }, { status: 500 });
        }

        // Update local DB
        user.subscriptionStatus = "cancelled"; // Or 'pending_cancellation' depending on immediate effect
        await user.save();

        return NextResponse.json({ message: "Subscription cancelled successfully", status: "cancelled" });

    } catch (error) {
        console.error("Cancel Subscription Error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
