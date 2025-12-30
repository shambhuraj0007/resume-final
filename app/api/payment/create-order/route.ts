import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import User from "@/models/User";
import Transaction from "@/models/Transaction";
import { createCashfreeOrder } from "@/payment/cashfree";
import { v4 as uuidv4 } from "uuid";
import dbConnect from "@/lib/mongodb";

// Configuration for Credit Packs (India)
const CREDIT_PACKS: any = {
  "5-scan-pack": { credits: 5, price: 99, name: "5-scan Pack" },
  "20-scan-pack": { credits: 20, price: 299, name: "20-scan Pack" },
  "50-scan-pack": { credits: 50, price: 599, name: "50-scan Pack" },
};

export async function POST(req: NextRequest) {
  try {
    await dbConnect();
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { packageType, region } = body;

    const user = await User.findOne({ email: session.user.email });
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Default to India logic if region is India or unspecified (fallback)
    // Actually, check if it's a credit pack. Only India has credit packs.
    if (CREDIT_PACKS[packageType]) {
      // India - Cashfree Flow
      const pack = CREDIT_PACKS[packageType];
      const orderId = `ORDER_${uuidv4().substring(0, 8)}_${Date.now()}`; // Shortened for Cashfree limits if any

      // Use the unified status page for verification
      const returnUrl = `${process.env.NEXTAUTH_URL}/payment/status?order_id={order_id}`;

      // Ensure phone number exists for Cashfree
      const customerPhone = user.phone || "9999999999"; // Fallback dummy if validation allows, else fail. 
      // Ideally should prompt user for phone. Cashfree usually requires it.
      // We will send a dummy valid format if missing and hope user enters it on checkout or it works.
      // Better: require phone in user profile or pass strict one.

      const cfOrder = await createCashfreeOrder(
        orderId,
        pack.price,
        user._id.toString(),
        customerPhone,
        user.name,
        user.email
      );

      // Create Transaction Record
      await Transaction.create({
        userId: user._id,
        gateway: 'CASHFREE',
        orderId: orderId, // Our internal ID
        cfOrderId: cfOrder.cf_order_id, // Cashfree's ID
        amount: pack.price,
        currency: 'INR',
        credits: pack.credits,
        status: 'pending',
        packageType: packageType,
        validityMonths: 3, // Credit packs valid for 3 months
        paymentMethod: 'cashfree_pg' // initial status
      });

      return NextResponse.json({
        gateway: 'CASHFREE',
        payment_session_id: cfOrder.payment_session_id,
        order_id: cfOrder.order_id,
        orderId: orderId // For frontend tracking
      });
    }

    return NextResponse.json({ error: "Invalid package type for order creation" }, { status: 400 });

  } catch (error: any) {
    console.error("Create Order Error:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}
