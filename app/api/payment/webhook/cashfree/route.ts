import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import Transaction from "@/models/Transaction";
import User from "@/models/User";
import { addCredits } from "@/payment/creditService";
import dbConnect from "@/lib/mongodb";

const CASHFREE_PLAN_MONTHLY_ID = process.env.CASHFREE_PLAN_MONTHLY_ID || "pro_monthly_599";
const CASHFREE_PLAN_QUARTERLY_ID = process.env.CASHFREE_PLAN_QUARTERLY_ID || "pro_quarterly_1499";

type PlanConfig = {
  credits: number;
  validity: number;
  type: string;
  name: string;
  canonicalId: string;
};

const PLAN_CONFIG: Record<string, PlanConfig> = {
  "pro-monthly-inr": { credits: 200, validity: 1, type: "pro", name: "Pro Monthly", canonicalId: "pro-monthly-inr" },
  "pro-quarterly-inr": { credits: 700, validity: 3, type: "pro", name: "Pro Quarterly", canonicalId: "pro-quarterly-inr" },
  "pro_monthly_599": { credits: 200, validity: 1, type: "pro", name: "Pro Monthly", canonicalId: "pro-monthly-inr" },
  "pro_quarterly_1499": { credits: 700, validity: 3, type: "pro", name: "Pro Quarterly", canonicalId: "pro-quarterly-inr" },
  "PRO_MONTHLY": { credits: 200, validity: 1, type: "pro", name: "Pro Monthly", canonicalId: "pro-monthly-inr" },
  "PRO_QUARTERLY": { credits: 700, validity: 3, type: "pro", name: "Pro Quarterly", canonicalId: "pro-quarterly-inr" },
  [CASHFREE_PLAN_MONTHLY_ID]: { credits: 200, validity: 1, type: "pro", name: "Pro Monthly", canonicalId: "pro-monthly-inr" },
  [CASHFREE_PLAN_QUARTERLY_ID]: { credits: 700, validity: 3, type: "pro", name: "Pro Quarterly", canonicalId: "pro-quarterly-inr" },
};

// Verify Cashfree webhook signature
function verifySignature(rawBody: string, signature: string, timestamp: string): boolean {
  const signatureData = timestamp + rawBody;
  const expectedSignature = crypto
    .createHmac('sha256', process.env.CASHFREE_SECRET_KEY!)
    .update(signatureData)
    .digest('base64');
  
  return expectedSignature === signature;
}

export async function POST(req: NextRequest) {
  try {
    // 1. Get raw body and headers
    const rawBody = await req.text();
    const signature = req.headers.get("x-webhook-signature");
    const timestamp = req.headers.get("x-webhook-timestamp");

    console.log("🔐 Webhook received:", {
      hasSignature: !!signature,
      hasTimestamp: !!timestamp,
      hasSecretKey: !!process.env.CASHFREE_SECRET_KEY
    });

    // 2. Verify signature (if available)
    if (signature && timestamp) {
      const isValid = verifySignature(rawBody, signature, timestamp);
      console.log("🔐 Signature valid:", isValid);
      
      if (!isValid) {
        console.error("[WEBHOOK] Invalid signature");
        return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
      }
    } else {
      console.warn("[WEBHOOK] No signature headers - proceeding without verification (TEST MODE?)");
    }

    await dbConnect();
    
    const body = JSON.parse(rawBody);
    const eventType = body.type;

    console.log(`[CASHFREE WEBHOOK] Event: ${eventType}`);
    console.log(`[WEBHOOK] Full payload:`, JSON.stringify(body, null, 2));

    // 3. Handle subscription payment success
    if (eventType === "SUBSCRIPTION_PAYMENT_SUCCESS") {
      const { subscription, payment } = body.data;
      const subscriptionId = subscription.subscription_id;
      const planId = subscription.plan_id;

      console.log(`[WEBHOOK] Processing payment for subscription: ${subscriptionId}, plan: ${planId}`);

      // Find user by subscription ID
      const user = await User.findOne({ subscriptionId: subscriptionId });
      if (!user) {
        console.error(`[WEBHOOK] User not found for subscription: ${subscriptionId}`);
        return NextResponse.json({ status: "user_not_found" }, { status: 404 });
      }

      console.log(`[WEBHOOK] Found user: ${user.email}`);

      // Idempotency check
      const existingTx = await Transaction.findOne({ 
        cfPaymentId: payment?.cf_payment_id 
      });

      if (existingTx) {
        console.log(`[WEBHOOK] Payment already processed: ${payment?.cf_payment_id}`);
        return NextResponse.json({ status: "already_processed" });
      }

      // Get plan configuration
      const planConfig = PLAN_CONFIG[planId] || { 
        credits: 200, 
        validity: 1, 
        type: "pro", 
        name: "Pro Monthly", 
        canonicalId: "pro-monthly-inr" 
      };

      console.log(`[WEBHOOK] Plan config:`, planConfig);

      // Create transaction record
      const newTx = await Transaction.create({
        userId: user._id,
        gateway: "CASHFREE",
        orderId: `SUB_PAY_${Date.now()}`,
        cfPaymentId: payment?.cf_payment_id,
        cfOrderId: payment?.cf_order_id,
        cfSubscriptionId: subscriptionId,
        amount: payment?.payment_amount || planConfig.credits * 2.995,
        currency: payment?.payment_currency || "INR",
        credits: planConfig.credits,
        status: "completed",
        packageType: planConfig.canonicalId,
        validityMonths: planConfig.validity,
        paymentMethod: "subscription_auto",
      });

      console.log(`[WEBHOOK] Transaction created:`, newTx._id);

      // Add credits to user
      await addCredits(user._id.toString(), planConfig.credits, planConfig.validity);
      console.log(`[WEBHOOK] Credits added: ${planConfig.credits}`);

      // Update user subscription details
      user.subscriptionStatus = 'active';
      user.subscriptionPlanName = planConfig.name;
      user.isPaidUser = true;
      await user.save();

      console.log(`[WEBHOOK] ✅ User updated: ${user.email} - ${planConfig.name}`);
      
      return NextResponse.json({ status: "success", creditsAdded: planConfig.credits });
    }

    // 4. Handle subscription status changes
  // 4. Handle subscription status changes
else if (eventType === "SUBSCRIPTION_STATUS_CHANGED") {
  const { subscription } = body.data;
  const subscriptionId = subscription.subscription_id;
  const newStatus = subscription.subscription_status;

  console.log(`[WEBHOOK] Status changed for ${subscriptionId}: ${newStatus}`);

  const user = await User.findOne({ subscriptionId: subscriptionId });
  if (!user) {
    console.error(`[WEBHOOK] User not found for subscription: ${subscriptionId}`);
    return NextResponse.json({ status: "user_not_found" }, { status: 404 });
  }

  // Map Cashfree status to internal status
  // ✅ Fix: Use proper types that match User model
  type UserSubscriptionStatus = 'active' | 'past_due' | 'unpaid' | 'cancelled' | 'expired' | null;
  
  const statusMap: Record<string, UserSubscriptionStatus> = {
    'ACTIVE': 'active',
    'CANCELLED': 'cancelled',
    'EXPIRED': 'expired',
    'INITIALIZED': null,
    'BANK_APPROVAL_PENDING': null,
    'PAST_DUE': 'past_due',
    'UNPAID': 'unpaid',
  };

  const mappedStatus = statusMap[newStatus] ?? null; // ✅ Default to null if unknown

  console.log(`[WEBHOOK] Mapping ${newStatus} -> ${mappedStatus}`);

  user.subscriptionStatus = mappedStatus;
  
  // If cancelled/expired, revoke paid status
  if (mappedStatus === 'cancelled' || mappedStatus === 'expired') {
    user.isPaidUser = false;
    user.subscriptionPlanName = null;
  }
  // If active, ensure paid status is set
  else if (mappedStatus === 'active') {
    user.isPaidUser = true;
  }

  await user.save();
  console.log(`[WEBHOOK] User status updated to: ${mappedStatus}`);
  
  return NextResponse.json({ status: "success", newStatus: mappedStatus });
}


    // 5. Handle payment failures
    else if (eventType === "SUBSCRIPTION_PAYMENT_FAILED") {
      const { subscription, payment } = body.data;
      const subscriptionId = subscription.subscription_id;

      console.log(`[WEBHOOK] ⚠️ Payment failed for subscription: ${subscriptionId}`);

      const user = await User.findOne({ subscriptionId: subscriptionId });
      if (user) {
        console.log(`[WEBHOOK] Payment failed for user: ${user.email}`);
        // TODO: Send email notification to user
      }
      
      return NextResponse.json({ status: "logged" });
    }

    // 6. Handle payment cancellations
    else if (eventType === "SUBSCRIPTION_PAYMENT_CANCELLED") {
      const { subscription } = body.data;
      const subscriptionId = subscription.subscription_id;

      console.log(`[WEBHOOK] Payment cancelled for subscription: ${subscriptionId}`);

      await User.findOneAndUpdate(
        { subscriptionId: subscriptionId },
        { subscriptionStatus: 'cancelled', isPaidUser: false }
      );
      
      return NextResponse.json({ status: "success" });
    }

    // 7. Handle auth status (optional)
    else if (eventType === "SUBSCRIPTION_AUTH_STATUS") {
      const { subscription } = body.data;
      console.log(`[WEBHOOK] Auth status update:`, subscription.subscription_id);
      return NextResponse.json({ status: "logged" });
    }

    // 8. Handle card expiry reminder (optional)
    else if (eventType === "SUBSCRIPTION_CARD_EXPIRY_REMINDER") {
      const { subscription } = body.data;
      console.log(`[WEBHOOK] Card expiry reminder:`, subscription.subscription_id);
      // TODO: Send email to user about expiring card
      return NextResponse.json({ status: "logged" });
    }

    // Unknown event type
    console.log(`[WEBHOOK] Unknown event type: ${eventType}`);
    return NextResponse.json({ status: "ignored", eventType });

  } catch (error: any) {
    console.error("[CASHFREE WEBHOOK] Error:", error);
    console.error("[WEBHOOK] Stack:", error.stack);
    return NextResponse.json({ error: "Webhook processing failed", message: error.message }, { status: 500 });
  }
}

// Optional: Handle GET for webhook verification/health check
export async function GET(req: NextRequest) {
  return NextResponse.json({ 
    message: "Cashfree webhook endpoint", 
    status: "active",
    timestamp: new Date().toISOString()
  });
}
