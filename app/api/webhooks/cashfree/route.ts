import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import dbConnect from "@/lib/mongodb";
import Transaction from "@/models/Transaction";
import User from "@/models/User";
import { addCredits } from "@/payment/creditService";
import { withRetry } from "@/lib/retry";

// Plan Configuration
const PLAN_CONFIG: Record<string, { credits: number; validity: number; type: string; name: string }> = {
  "pro-monthly-inr": { credits: 200, validity: 1, type: "pro", name: "Pro Monthly" },
  "pro-quarterly-inr": { credits: 600, validity: 3, type: "pro", name: "Pro Quarterly" },
  "shortlistai_pro_monthly": { credits: 200, validity: 1, type: "pro", name: "Pro Monthly" },
  "shortlistai_pro_quarterly": { credits: 600, validity: 3, type: "pro", name: "Pro Quarterly" },
  "pro_monthly_599": { credits: 200, validity: 1, type: "pro", name: "Pro Monthly" },
  "pro_quarterly_1499": { credits: 600, validity: 3, type: "pro", name: "Pro Quarterly" },
  "PRO_MONTHLY": { credits: 200, validity: 1, type: "pro", name: "Pro Monthly" },
  "PRO_QUARTERLY": { credits: 600, validity: 3, type: "pro", name: "Pro Quarterly" },
  "pack-10": { credits: 10, validity: 3, type: "pack", name: "10 Credits Pack" },
  "pack-50": { credits: 50, validity: 3, type: "pack", name: "50 Credits Pack" },
  "pack-100": { credits: 100, validity: 3, type: "pack", name: "100 Credits Pack" },
  "pack-200": { credits: 200, validity: 3, type: "pack", name: "200 Credits Pack" },
};

// Verify Cashfree Signature
function verifyCashfreeSignature(
  timestamp: string,
  rawBody: string,
  signature: string
): boolean {
  try {
    const secretKey = process.env.CASHFREE_SECRET_KEY || "";
    const expectedSignature = crypto
      .createHmac("sha256", secretKey)
      .update(timestamp + rawBody)
      .digest("base64");

    return signature === expectedSignature;
  } catch (error) {
    console.error("[WEBHOOK] Signature verification error:", error);
    return false;
  }
}

export async function POST(req: NextRequest) {
  const startTime = Date.now();
  const webhookId = `WH_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  try {
    const rawBody = await req.text();
    const signature = req.headers.get("x-webhook-signature");
    const timestamp = req.headers.get("x-webhook-timestamp");

    console.log(`[WEBHOOK ${webhookId}] ==================== START ====================`);
    console.log(`[WEBHOOK ${webhookId}] Timestamp:`, timestamp);
    console.log(`[WEBHOOK ${webhookId}] Signature:`, signature ? "Present" : "Missing");

    // Verify signature in production
    if (process.env.NODE_ENV === "production") {
      if (!signature || !timestamp) {
        console.error(`[WEBHOOK ${webhookId}] Missing signature or timestamp`);
        return NextResponse.json({ error: "Missing signature" }, { status: 401 });
      }

      const isValid = verifyCashfreeSignature(timestamp, rawBody, signature);
      if (!isValid) {
        console.error(`[WEBHOOK ${webhookId}] Invalid signature`);
        return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
      }
      console.log(`[WEBHOOK ${webhookId}] ✅ Signature verified`);
    }

    const payload = JSON.parse(rawBody);
    const eventType = payload.type;

    console.log(`[WEBHOOK ${webhookId}] Event Type:`, eventType);
    console.log(`[WEBHOOK ${webhookId}] Payload:`, JSON.stringify(payload, null, 2));

    await dbConnect();

    let result;
    switch (eventType) {
      case "PAYMENT_SUCCESS_WEBHOOK":
        result = await handleOneTimePayment(payload, webhookId);
        break;
      
      case "SUBSCRIPTION_AUTHORIZATION_SUCCESS":
        result = await handleSubscriptionAuth(payload, webhookId);
        break;
      
      case "SUBSCRIPTION_PAYMENT_SUCCESS":
      case "SUBSCRIPTION_NEW_PAYMENT":
        result = await handleSubscriptionPayment(payload, webhookId);
        break;
      
      case "SUBSCRIPTION_PAYMENT_FAILED":
        result = await handleSubscriptionFailed(payload, webhookId);
        break;
      
      case "SUBSCRIPTION_CANCELLED":
      case "SUBSCRIPTION_EXPIRED":
        result = await handleSubscriptionCancelled(payload, webhookId);
        break;
      
      default:
        console.log(`[WEBHOOK ${webhookId}] ⚠️ Unhandled event type: ${eventType}`);
        result = { status: "ignored", reason: "unhandled_event" };
    }

    const duration = Date.now() - startTime;
    console.log(`[WEBHOOK ${webhookId}] ==================== END (${duration}ms) ====================`);

    return NextResponse.json(result);

  } catch (error: any) {
    const duration = Date.now() - startTime;
    console.error(`[WEBHOOK ${webhookId}] ❌ ERROR (${duration}ms):`, error);
    
    return NextResponse.json(
      { error: "Webhook processing failed", message: error.message },
      { status: 500 }
    );
  }
}

// Handler: One-Time Payment
async function handleOneTimePayment(payload: any, webhookId: string) {
  const { order, payment } = payload.data;
  const orderId = order.order_id;
  const paymentId = payment.cf_payment_id;

  console.log(`[WEBHOOK ${webhookId}] Processing one-time payment: ${orderId}`);

  const existingTx = await Transaction.findOne({ 
    $or: [
      { orderId: orderId },
      { cfPaymentId: paymentId }
    ]
  });

  if (existingTx && existingTx.status === 'completed') {
    console.log(`[WEBHOOK ${webhookId}] ✅ Transaction already processed`);
    return { status: "already_processed", transactionId: existingTx._id };
  }

  const transaction = await Transaction.findOne({ orderId: orderId });

  if (!transaction) {
    console.error(`[WEBHOOK ${webhookId}] ❌ Transaction not found: ${orderId}`);
    return { status: "error", reason: "transaction_not_found" };
  }

  await withRetry(
    async () => {
      transaction.status = 'completed';
      transaction.cfPaymentId = paymentId;
      transaction.paymentMethod = payment.payment_method;
      transaction.completedAt = new Date();
      await transaction.save();
    },
    {
      maxAttempts: 3,
      delayMs: 500,
      onRetry: (attempt: number) => {
        console.log(`[WEBHOOK ${webhookId}] Retry ${attempt} - Saving transaction`);
      },
    }
  );

  if (transaction.credits > 0) {
    await withRetry(
      async () => {
        await addCredits(
          transaction.userId.toString(),
          transaction.credits,
          transaction.validityMonths || 3
        );
      },
      {
        maxAttempts: 3,
        delayMs: 500,
        onRetry: (attempt: number) => {
          console.log(`[WEBHOOK ${webhookId}] Retry ${attempt} - Adding credits`);
        },
      }
    );
  }

  return { status: "success", transactionId: transaction._id };
}

// Handler: Subscription Authorization
async function handleSubscriptionAuth(payload: any, webhookId: string) {
  const { subscription } = payload.data;
  const cfSubscriptionId = subscription.cf_subscription_id;
  const subscriptionId = subscription.subscription_id;
  const planId = subscription.plan_details?.plan_id;

  console.log(`[WEBHOOK ${webhookId}] Processing subscription auth: ${cfSubscriptionId}`);

  const user = await User.findOne({ 
    $or: [
      { cashfreeSubscriptionId: cfSubscriptionId },
      { subscriptionId: subscriptionId }
    ]
  });

  if (!user) {
    console.error(`[WEBHOOK ${webhookId}] ❌ User not found`);
    return { status: "error", reason: "user_not_found" };
  }

  const planConfig = PLAN_CONFIG[planId] || { credits: 200, validity: 1, type: "pro", name: "Pro" };

  await withRetry(
    async () => {
      user.subscriptionStatus = "active";
      user.isPaidUser = true;
      user.cashfreeSubscriptionId = cfSubscriptionId;
      user.subscriptionPlanId = planId;
      user.subscriptionPlanName = planConfig.name;
      user.subscriptionStartDate = new Date();
      user.subscriptionAmount = subscription.plan_details?.plan_recurring_amount;
      await user.save();
    },
    {
      maxAttempts: 3,
      delayMs: 500,
      onRetry: (attempt: number) => {
        console.log(`[WEBHOOK ${webhookId}] Retry ${attempt} - Updating user`);
      },
    }
  );

  await withRetry(
    async () => {
      await addCredits(user._id.toString(), planConfig.credits, planConfig.validity);
    },
    {
      maxAttempts: 3,
      delayMs: 500,
      onRetry: (attempt: number) => {
        console.log(`[WEBHOOK ${webhookId}] Retry ${attempt} - Adding credits`);
      },
    }
  );

  return { status: "success", userId: user._id };
}

// Handler: Subscription Payment
async function handleSubscriptionPayment(payload: any, webhookId: string) {
  const { subscription, payment } = payload.data;
  const cfSubscriptionId = subscription.cf_subscription_id;
  const subscriptionId = subscription.subscription_id;
  const planId = subscription.plan_details?.plan_id;
  const paymentId = payment?.cf_payment_id;

  console.log(`[WEBHOOK ${webhookId}] Processing subscription payment: ${cfSubscriptionId}`);

  if (paymentId) {
    const existingTx = await Transaction.findOne({ cfPaymentId: paymentId });
    if (existingTx) {
      console.log(`[WEBHOOK ${webhookId}] ✅ Already processed`);
      return { status: "already_processed" };
    }
  }

  const user = await User.findOne({
    $or: [
      { cashfreeSubscriptionId: cfSubscriptionId },
      { subscriptionId: subscriptionId }
    ]
  });

  if (!user) {
    console.error(`[WEBHOOK ${webhookId}] ❌ User not found`);
    return { status: "error", reason: "user_not_found" };
  }

  const planConfig = PLAN_CONFIG[planId] || { credits: 200, validity: 1, type: "pro", name: "Pro" };

  const transaction = new Transaction({
    userId: user._id,
    orderId: `SUB_ORD_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    cfPaymentId: paymentId,
    cfSubscriptionId: cfSubscriptionId,
    gateway: "CASHFREE",
    amount: payment?.payment_amount || subscription.plan_details?.plan_recurring_amount,
    currency: payment?.payment_currency || "INR",
    credits: planConfig.credits,
    status: "completed",
    packageType: planConfig.type,
    validityMonths: planConfig.validity,
    paymentMethod: "subscription_auto",
    completedAt: new Date(),
  });

  await withRetry(
    async () => {
      await transaction.save();
    },
    {
      maxAttempts: 3,
      delayMs: 500,
      onRetry: (attempt: number) => {
        console.log(`[WEBHOOK ${webhookId}] Retry ${attempt} - Saving transaction`);
      },
    }
  );

  await withRetry(
    async () => {
      await addCredits(user._id.toString(), planConfig.credits, planConfig.validity);
    },
    {
      maxAttempts: 3,
      delayMs: 500,
      onRetry: (attempt: number) => {
        console.log(`[WEBHOOK ${webhookId}] Retry ${attempt} - Adding credits`);
      },
    }
  );

  await withRetry(
    async () => {
      user.subscriptionStatus = "active";
      user.isPaidUser = true;
      await user.save();
    },
    {
      maxAttempts: 3,
      delayMs: 500,
      onRetry: (attempt: number) => {
        console.log(`[WEBHOOK ${webhookId}] Retry ${attempt} - Updating user`);
      },
    }
  );

  return { status: "success", transactionId: transaction._id };
}

// Handler: Subscription Failed
async function handleSubscriptionFailed(payload: any, webhookId: string) {
  const { subscription } = payload.data;
  const cfSubscriptionId = subscription.cf_subscription_id;

  const user = await User.findOne({ cashfreeSubscriptionId: cfSubscriptionId });
  if (!user) {
    return { status: "error", reason: "user_not_found" };
  }

  await withRetry(
    async () => {
      user.subscriptionStatus = "past_due"; // ✅ Fixed: Use valid status
      await user.save();
    },
    { maxAttempts: 3, delayMs: 500 }
  );

  return { status: "success", action: "marked_past_due" };
}

// Handler: Subscription Cancelled
async function handleSubscriptionCancelled(payload: any, webhookId: string) {
  const { subscription } = payload.data;
  const cfSubscriptionId = subscription.cf_subscription_id;

  const user = await User.findOne({ cashfreeSubscriptionId: cfSubscriptionId });
  if (!user) {
    return { status: "error", reason: "user_not_found" };
  }

  await withRetry(
    async () => {
      user.subscriptionStatus = "cancelled";
      user.isPaidUser = false;
      await user.save();
    },
    { maxAttempts: 3, delayMs: 500 }
  );

  return { status: "success", action: "cancelled" };
}
