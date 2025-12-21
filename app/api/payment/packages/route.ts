import { NextRequest, NextResponse } from "next/server";
import { getRegionFromIP } from "@/lib/geo";

// Define Packages Data
// Note: Frontend currently expects a specific format. We will update it.
// We'll normalize the response to have sections: 'credit_packs' and 'subscription_plans'

export async function GET(req: NextRequest) {
  try {
    // 1. Detect Region
    // Use 'x-forwarded-for' header or fallback
    let ip = req.headers.get("x-forwarded-for") || req.ip || "127.0.0.1";
    if (ip.includes(',')) ip = ip.split(',')[0].trim();

    const region = await getRegionFromIP(ip);

    // 2. Define data per region
    let data;

    if (region === 'INDIA') {
      data = {
        region: 'INDIA',
        currency: '₹',
        free_tier: {
          title: "Free",
          price: 0,
          features: ["3 CV↔JD scans/month", "Watermarked Resume", "Skills Check"]
        },
        credit_packs: [
          { id: "5-scan-pack", name: "5-scan Pack", price: 99, credits: 5, save: "save ~17%" },
          { id: "20-scan-pack", name: "20-scan Pack", price: 299, credits: 20, save: "save ~37%" },
          { id: "50-scan-pack", name: "50-scan Pack", price: 599, credits: 50, save: "save ~50%" }
        ],
        subscriptions: [
          { id: "pro-monthly-inr", name: "Pro Monthly", price: 599, period: "month", billing: "Monthly" },
          { id: "pro-quarterly-inr", name: "Pro Quarterly", price: 1499, period: "3 months", billing: "Every 3 months" }
        ]
      };
    } else if (region === 'USA') {
      data = {
        region: 'USA',
        currency: '$',
        free_tier: { title: "Free", price: 0, features: ["3 CV↔JD scans/month", "Watermarked Resume"] },
        credit_packs: [], // No credit packs
        subscriptions: [
          { id: "pro-monthly-usd", name: "Pro Monthly", price: 15, period: "month", billing: "Monthly" },
          { id: "pro-quarterly-usd", name: "Pro Quarterly", price: 39, period: "3 months", billing: "Every 3 months" }
        ]
      };
    } else if (region === 'EUROPE') {
      data = {
        region: 'EUROPE',
        currency: '€',
        free_tier: { title: "Free", price: 0, features: ["3 CV↔JD scans/month"] },
        credit_packs: [],
        subscriptions: [
          { id: "pro-monthly-eur", name: "Pro Monthly", price: 14, period: "month", billing: "Monthly" },
          { id: "pro-quarterly-eur", name: "Pro Quarterly", price: 36, period: "3 months", billing: "Every 3 months" }
        ]
      };
    } else if (region === 'UK') {
      data = {
        region: 'UK',
        currency: '£',
        free_tier: { title: "Free", price: 0, features: ["3 CV↔JD scans/month"] },
        credit_packs: [],
        subscriptions: [
          { id: "pro-monthly-gbp", name: "Pro Monthly", price: 13, period: "month", billing: "Monthly" },
          { id: "pro-quarterly-gbp", name: "Pro Quarterly", price: 33, period: "3 months", billing: "Every 3 months" }
        ]
      };
    } else {
      // Fallback / International
      data = {
        region: 'INTERNATIONAL',
        currency: '$',
        free_tier: { title: "Free", price: 0, features: ["3 CV↔JD scans/month"] },
        credit_packs: [],
        subscriptions: [
          { id: "pro-monthly-usd", name: "Pro Monthly", price: 15, period: "month", billing: "Monthly" },
          { id: "pro-quarterly-usd", name: "Pro Quarterly", price: 39, period: "3 months", billing: "Every 3 months" }
        ]
      };
    }

    return NextResponse.json({ ...data });

  } catch (error) {
    console.error("Fetch Packages Error:", error);
    return NextResponse.json({ error: "Failed to fetch packages" }, { status: 500 });
  }
}
