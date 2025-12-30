import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { verifyAuth } from "@/lib/auth"; // Add verifyAuth
import dbConnect from "@/lib/mongodb";
import User from "@/models/User";
import { getUserCredits } from "@/payment/creditService";

export async function GET(req: NextRequest) {
    try {
        await dbConnect();

        // 1. Check for NextAuth session
        const session = await getServerSession(authOptions);
        let userEmail = session?.user?.email;

        // 2. Fallback to Phone/JWT auth if no session
        if (!userEmail) {
            const phoneUser = await verifyAuth(req);
            if (phoneUser) {
                // Find user by ID from JWT
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

        // Trigger lazy reset and get current credits
        const creditDoc = await getUserCredits(user._id.toString());

        // Calculate next reset date (30 days after last reset)
        const nextResetDate = new Date(creditDoc.lastResetDate);
        nextResetDate.setDate(nextResetDate.getDate() + 30);

        return NextResponse.json({
            credits: creditDoc.credits,
            subscriptionStatus: user.subscriptionStatus || null,
            subscriptionProvider: user.subscriptionProvider || null,
            isPaidUser: user.isPaidUser || false,
            isPro: user.subscriptionStatus === 'active' || user.isPaidUser === true,
            isSubscriber: user.subscriptionStatus === 'active',
            subscriptionPlanName: user.subscriptionPlanName || null,
            nextCreditReset: nextResetDate,
            lastCreditReset: creditDoc.lastResetDate
        });
    } catch (error: any) {
        console.error("Get User Status Error:", error);
        return NextResponse.json(
            { error: error.message || "Internal Server Error" },
            { status: 500 }
        );
    }
}
