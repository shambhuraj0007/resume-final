import { NextRequest, NextResponse } from "next/server";
import { getRegionFromIP } from "@/lib/geo";


type Region = "INDIA" | "USA" | "EUROPE" | "UK";

// Define Packages Data
// Note: Frontend currently expects a specific format. We will update it.
// We'll normalize the response to have sections: 'credit_packs' and 'subscription_plans'

export async function GET(req: NextRequest) {
  try {
    // 1. Check for test override FIRST
    const testRegion = req.nextUrl.searchParams.get("test_region");
    let region: string;

    if (testRegion) {
      region = testRegion.toUpperCase();
      console.log(`🎯 Using test_region override: ${region}`);
    } else {
      // 2. Fallback to IP detection
      let ip = req.headers.get("x-forwarded-for") || req.ip || "127.0.0.1";
      if (ip.includes(',')) ip = ip.split(',')[0].trim();
      region = await getRegionFromIP(ip);
    }

    // 3. Return pricing for detected region
    const data = buildPricingForRegion(region as Region);
    return NextResponse.json(data);

  } catch (error) {
    console.error("Fetch Packages Error:", error);
    return NextResponse.json({ error: "Failed to fetch packages" }, { status: 500 });
  }
}

// Helper function to avoid duplication
function buildPricingForRegion(region: Region) {
  if (region === 'INDIA') {
    return {
      region: 'INDIA', currency: '₹', currencyCode: 'INR',
      free_tier: { title: "Free", price: 0, features: ["3 CV↔JD scans/month", "Watermarked Resume", "Skills Check"] },
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
  } else if (region === 'EUROPE') {
    return {
      region: 'EUROPE', currency: '€', currencyCode: 'EUR',
      free_tier: { title: "Free", price: 0, features: ["3 CV↔JD scans/month", "Watermarked Resume"] },
      credit_packs: [],
      subscriptions: [
        { id: "pro-monthly-eur", name: "Pro Monthly", price: 14, period: "month", billing: "Monthly" },
        { id: "pro-quarterly-eur", name: "Pro Quarterly", price: 36, period: "3 months", billing: "Every 3 months" }
      ]
    };
  } else if (region === 'UK') {
    return {
      region: 'UK', currency: '£', currencyCode: 'GBP',
      free_tier: { title: "Free", price: 0, features: ["3 CV↔JD scans/month", "Watermarked Resume"] },
      credit_packs: [],
      subscriptions: [
        { id: "pro-monthly-gbp", name: "Pro Monthly", price: 13, period: "month", billing: "Monthly" },
        { id: "pro-quarterly-gbp", name: "Pro Quarterly", price: 33, period: "3 months", billing: "Every 3 months" }
      ]
    };
  }
  // Default to USA if unknown
  return {
    region: 'USA', currency: '$', currencyCode: 'USD',
    free_tier: { title: "Free", price: 0, features: ["3 CV↔JD scans/month", "Watermarked Resume"] },
    credit_packs: [],
    subscriptions: [
      { id: "pro-monthly-usd", name: "Pro Monthly", price: 15, period: "month", billing: "Monthly" },
      { id: "pro-quarterly-usd", name: "Pro Quarterly", price: 39, period: "3 months", billing: "Every 3 months" }
    ]
  };
}

