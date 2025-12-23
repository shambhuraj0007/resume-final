import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import Transaction from "@/models/Transaction";
import User from "@/models/User";
import dbConnect from "@/lib/mongodb";

export async function GET(req: NextRequest) {
    try {
        await dbConnect();
        const session = await getServerSession(authOptions);

        if (!session || !session.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const user = await User.findOne({ email: session.user.email });
        if (!user) {
            return NextResponse.json({ error: "User not found" }, { status: 404 });
        }

        // Find the most recent pending transaction for this user
        // Created within the last 30 minutes to avoid waking up old dead transactions
        const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);

        const latestPending = await Transaction.findOne({
            userId: user._id,
            status: 'pending',
            createdAt: { $gte: thirtyMinutesAgo }
        })
            .sort({ createdAt: -1 })
            .select('orderId createdAt packageType amount');

        if (!latestPending) {
            return NextResponse.json({ pending: false });
        }

        return NextResponse.json({
            pending: true,
            transaction: latestPending
        });

    } catch (error: any) {
        console.error("Get Pending Transaction Error:", error);
        return NextResponse.json({ error: "Internal Error" }, { status: 500 });
    }
}
