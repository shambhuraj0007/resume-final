import { Cashfree } from "cashfree-pg";
import crypto from "crypto";

// 1. Initialize Credentials
// @ts-ignore: The SDK has these static properties in JS, but the d.ts file may be incomplete.
Cashfree.XClientId = process.env.CASHFREE_APP_ID!;
// @ts-ignore
Cashfree.XClientSecret = process.env.CASHFREE_SECRET_KEY!;

// 2. Set Environment
// Use @ts-ignore to handle the missing type definition for XEnvironment and Environment enum
// @ts-ignore
Cashfree.XEnvironment = process.env.NODE_ENV === "production"
    ? "PRODUCTION"
    : "SANDBOX";


/**
 * Create Order (PG)
 */
export const createCashfreeOrder = async (
    orderId: string,
    amount: number,
    customerId: string,
    customerPhone: string,
    customerName: string,
    customerEmail: string
) => {
    // API Version
    const apiVersion = "2023-08-01";

    // Determine Environment based on Key or Node Env
    const isProdKey = process.env.CASHFREE_SECRET_KEY?.includes("_prod_");
    const isProduction = process.env.NODE_ENV === "production" || isProdKey;

    const baseUrl = isProduction
        ? "https://api.cashfree.com/pg"
        : "https://sandbox.cashfree.com/pg";

    const request = {
        order_amount: amount,
        order_currency: "INR",
        order_id: orderId,
        customer_details: {
            customer_id: customerId,
            customer_phone: customerPhone,
            customer_name: customerName,
            customer_email: customerEmail
        },
        order_meta: {
            return_url: `${process.env.NEXTAUTH_URL}/payment/status?order_id={order_id}`
        }
    };

    console.log("Cashfree Create Order Payload:", JSON.stringify(request, null, 2));
    if (!process.env.NEXTAUTH_URL) {
        console.warn("WARNING: NEXTAUTH_URL is not defined! Return URL will be invalid.");
    }

    try {
        const response = await fetch(`${baseUrl}/orders`, {
            method: 'POST',
            headers: {
                'x-client-id': process.env.CASHFREE_APP_ID!,
                'x-client-secret': process.env.CASHFREE_SECRET_KEY!,
                'x-api-version': apiVersion,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(request)
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.message || "Failed to create Cashfree order");
        }

        return data; // returns structure like { payment_session_id: "...", order_id: "..." }
    } catch (error: any) {
        console.error("Cashfree Create Order Error:", error.message);
        throw error;
    }
};

/**
 * Verify Signature
 */
export const verifyCashfreeSignature = (rawBody: string, signature: string, timestamp: string) => {
    try {
        const body = timestamp + rawBody;
        const secretKey = process.env.CASHFREE_SECRET_KEY!;
        const genSignature = crypto.createHmac('sha256', secretKey).update(body).digest("base64");
        return genSignature === signature;
    } catch (error) {
        console.error("Signature Verification Failed", error);
        return false;
    }
};

/**
 * Create Subscription (Direct API)
 */
export const createCashfreeSubscription = async (
    planId: string,
    subscriptionId: string,
    customerId: string,
    customerPhone: string,
    customerEmail: string,
    returnUrl: string,
    customerName: string,
    authorizationAmount?: number
) => {
    // Determine Environment based on Key or Node Env
    const isProdKey = process.env.CASHFREE_SECRET_KEY?.includes("_prod_");
    const isProduction = process.env.NODE_ENV === "production" || isProdKey;

    // Use PG Base URL as per user suggestion
    const baseUrl = isProduction
        ? "https://api.cashfree.com/pg"
        : "https://sandbox.cashfree.com/pg";

    // ✅ FINAL FIX: Cashfree PG Subscription API (2023-08-01) 
    // Requires snake_case and specific nesting for plan and customer
    const payload = {
        subscription_id: subscriptionId,
        plan_details: {
            plan_id: planId
        },
        authorization_amount: authorizationAmount || 1,
        customer_details: {
            customer_id: customerId,
            customer_email: customerEmail,
            customer_phone: customerPhone,
            customer_name: customerName || "Customer"
        },
        subscription_meta: {
            return_url: returnUrl
        }
    };

    console.log("CreateSubscription Payload:", JSON.stringify(payload, null, 2));

    try {
        const response = await fetch(`${baseUrl}/subscriptions`, {
            method: 'POST',
            headers: {
                'x-client-id': process.env.CASHFREE_APP_ID!,
                'x-client-secret': process.env.CASHFREE_SECRET_KEY!,
                'x-api-version': '2023-08-01',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });

        const data = await response.json();
        console.log("Cashfree API Response:", JSON.stringify(data, null, 2));

        if (!response.ok) {
            throw new Error(data.message || `HTTP ${response.status}: ${JSON.stringify(data)}`);
        }

        // ✅ Return session ID for SDK usage (no URL needed)
        return {
            subscriptionId: data.subscription_id,
            cfSubscriptionId: data.cf_subscription_id,
            subscriptionSessionId: data.subscription_session_id,
            status: data.subscription_status
        };
    } catch (error: any) {
        console.error("Cashfree Subscription Error:", error.message);
        throw error;
    }
};

/**
 * Verify Order (Get Status)
 */
export const verifyCashfreeOrder = async (orderId: string) => {
    // API Version
    const apiVersion = "2023-08-01";

    // Determine Environment based on Key or Node Env
    const isProdKey = process.env.CASHFREE_SECRET_KEY?.includes("_prod_");
    const isProduction = process.env.NODE_ENV === "production" || isProdKey;

    const baseUrl = isProduction
        ? "https://api.cashfree.com/pg"
        : "https://sandbox.cashfree.com/pg";

    try {
        const response = await fetch(`${baseUrl}/orders/${orderId}`, {
            method: 'GET',
            headers: {
                'x-client-id': process.env.CASHFREE_APP_ID!,
                'x-client-secret': process.env.CASHFREE_SECRET_KEY!,
                'x-api-version': apiVersion
            }
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.message || "Failed to fetch Cashfree order status");
        }

        return data;
    } catch (error: any) {
        console.error("Cashfree Verify Order Error:", error.message);
        throw error;
    }
};

// Cancel Subscription
export const cancelCashfreeSubscription = async (subscriptionId: string) => {
    try {
        const isProdKey = process.env.CASHFREE_SECRET_KEY?.includes("_prod_");
        const isProduction = process.env.NODE_ENV === "production" || isProdKey;

        const baseUrl = isProduction
            ? "https://api.cashfree.com/pg"
            : "https://sandbox.cashfree.com/pg";

        // POST /subscriptions/{subscription_id}/manage
        const url = `${baseUrl}/subscriptions/${subscriptionId}/manage`;

        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'x-client-id': process.env.CASHFREE_APP_ID!,
                'x-client-secret': process.env.CASHFREE_SECRET_KEY!,
                'x-api-version': '2023-08-01',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                action: 'CANCEL'
            })
        });

        const data = await response.json();

        if (!response.ok) {
            // If already cancelled or other error
            console.error("Cashfree Cancel Error Response:", data);
            throw new Error(data.message || 'Failed to cancel subscription');
        }

        return data;

    } catch (error: any) {
        console.error("Error cancelling subscription:", error);
        throw error;
    }
};

/**
 * Verify Subscription (Get Status)
 */
export const verifyCashfreeSubscription = async (subscriptionId: string) => {
    // API Version
    const apiVersion = "2023-08-01";

    // Determine Environment based on Key or Node Env
    const isProdKey = process.env.CASHFREE_SECRET_KEY?.includes("_prod_");
    const isProduction = process.env.NODE_ENV === "production" || isProdKey;

    const baseUrl = isProduction
        ? "https://api.cashfree.com/pg"
        : "https://sandbox.cashfree.com/pg";

    try {
        const response = await fetch(`${baseUrl}/subscriptions/${subscriptionId}`, {
            method: 'GET',
            headers: {
                'x-client-id': process.env.CASHFREE_APP_ID!,
                'x-client-secret': process.env.CASHFREE_SECRET_KEY!,
                'x-api-version': apiVersion
            }
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.message || "Failed to fetch Cashfree subscription status");
        }

        return data;
    } catch (error: any) {
        console.error("Cashfree Verify Subscription Error:", error.message);
        throw error;
    }
};

export default Cashfree;
