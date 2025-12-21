"use client";

import { useState, useEffect, useCallback } from "react";
import { Loader2, Check } from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useSearchParams } from "next/navigation"
import Script from "next/script";
import { PayPalScriptProvider, PayPalButtons } from "@paypal/react-paypal-js";

type Region = "INDIA" | "USA" | "EUROPE" | "UK";

export default function PricingPage() {
  const [pricingData, setPricingData] = useState<any>(null);
  const [region, setRegion] = useState<Region>("USA");
  const [loading, setLoading] = useState(true);
  const [processingPackage, setProcessingPackage] = useState<string | null>(null);
  const [selectedPackId, setSelectedPackId] = useState<string>("");

  const { toast } = useToast();
  const { data: session } = useSession();
  const router = useRouter();

  const cleanPackageName = (name: string) => name.replace(/\s*pack$/i, "").trim();

  // 2) Detect region
  const searchParams = useSearchParams();

  useEffect(() => {
    const detect = async () => {
      try {
        const params = searchParams.toString();
        const r = await fetch(`/api/region?${params}`, { cache: "no-store" });
        const j = await r.json();

        if (j?.region) {
          setRegion(j.region as Region);
          return;
        }
      } catch {
        // keep default USA
      }
    };
    detect();
  }, [searchParams]);

  // 3) Fetch pricing data based on region
  const fetchPricing = useCallback(async (regionToUse: Region) => {
    setLoading(true);
    try {
      const response = await fetch(`/api/payment/packages?region=${regionToUse}`, { cache: "no-store" });
      const data = await response.json();
      setPricingData(data);

      if (data.credit_packs && data.credit_packs.length > 0) {
        setSelectedPackId(data.credit_packs[0].id);
      }
    } catch (error) {
      toast({ title: "Error", description: "Failed to load pricing.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchPricing(region);
  }, [fetchPricing, region]);

  // 4) Handlers
  const openCashfreeCheckout = (sessionId: string) => {
    if (typeof window === "undefined" || !window.Cashfree) {
      console.error("Cashfree SDK not loaded");
      return;
    }

    // Force sandbox for dev, production for prod
    const mode = process.env.NODE_ENV === "production" ? "production" : "sandbox";

    // Initialize Cashfree
    const cashfree = window.Cashfree({ mode });

    const checkoutOptions = {
      paymentSessionId: sessionId,
      redirectTarget: "_modal" as "_modal",
    };

    cashfree.checkout(checkoutOptions).then(() => {
      console.log("Checkout opened successfully");
    }).catch((error: any) => {
      console.error("Checkout error:", error);
      toast({ title: "Checkout Error", description: "Failed to open payment page.", variant: "destructive" });
    });
  };

  const handlePackPurchase = async () => {
    if (!session) return router.push("/signin?callbackUrl=/pricing");
    if (!selectedPackId) return;

    setProcessingPackage(selectedPackId);
    try {
      const res = await fetch("/api/payment/create-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ packageType: selectedPackId, region }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);

      // Open Checkout
      openCashfreeCheckout(data.payment_session_id);

    } catch (error: any) {
      toast({ title: "Purchase Failed", description: error.message, variant: "destructive" });
    } finally {
      setProcessingPackage(null);
    }
  };

  const handleSubscriptionCashfree = async (planKey: string) => {
    if (!session) return router.push("/signin?callbackUrl=/pricing");

    try {
      const res = await fetch("/api/payment/create-subscription", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planKey, region }),
      });
      const data = await res.json();

      if (data.error) throw new Error(data.error);

      if (!data.subscriptionSessionId) {
        throw new Error("No subscription session ID returned");
      }

      // ✅ Use Cashfree SDK for subscription checkout
      // @ts-ignore - Cashfree is loaded via Script tag
      const cashfree = (window as any).Cashfree({
        mode: process.env.NODE_ENV === "production" ? "production" : "sandbox",
      });

      // ✅ Use subscriptionsCheckout for subscription flows
      cashfree.subscriptionsCheckout({
        subsSessionId: data.subscriptionSessionId,
        redirectTarget: "_self"
      }).then((result: any) => {
        if (result?.error) {
          console.error("Checkout error:", result.error);
          toast({
            title: "Checkout Failed",
            description: result.error.message || "Failed to open checkout",
            variant: "destructive"
          });
        }
      });

    } catch (error: any) {
      toast({ title: "Subscription Failed", description: error.message, variant: "destructive" });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 w-full max-w-7xl px-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-[600px] rounded-[2rem] bg-white animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (!pricingData) return <div className="p-8 text-center">Failed to load pricing</div>;

  const isIndia = pricingData.region === "INDIA";
  const selectedPack =
    pricingData.credit_packs?.find((p: any) => p.id === selectedPackId) || pricingData.credit_packs?.[0];

  const freeFeatures = [
    "3 CV↔JD scans per month",
    "Realistic ATS match % and interview chance",
    "Skills matched & missing overview",
    "Watermarked optimized resume preview",
  ];

  const creditsFeatures = [
    "Full analysis for each scan",
    "All improvement suggestions unlocked",
    "Optimized resume PDF download",
    "Credits valid for 3 months",
    "No auto-renewal",
  ];

  const proFeatures = [
    "Unlimited CV↔JD scans",
    "Current & potential match %, interview chances",
    "All improvement suggestions (Text, Keywords, Other)",
    "Optimized resume PDF for every JD (unlimited downloads)",
    "History of recent scans & JDs",
    "Priority support",
  ];

  // --- UPDATED HELPER CLASSES ---
  // Increased min-h to 64px to comfortably fit 2 lines of title text ("Pay-as-you-go Credits")
  // Removed mb-2 to pull description closer
  const SECTION_TITLE_H = "min-h-[64px] flex justify-between items-start";

  // Reduced min-h from 80px to 40px to significantly reduce gap
  // Added mb-6 to maintain separation from the Plan Box below
  const SECTION_DESC_H = "min-h-[40px] mb-6";

  const SECTION_BOX_H = "h-[88px] mb-8 flex items-center";

  return (
    <main className="min-h-screen bg-slate-50 dark:bg-slate-950 pt-12 pb-12 font-sans">
      <Script
        src="https://sdk.cashfree.com/js/v3/cashfree.js"
        strategy="lazyOnload"
        onLoad={() => console.log("Cashfree SDK Loaded")}
      />
      <section className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="text-center max-w-3xl mx-auto mb-8">
          <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-slate-900 dark:text-white mb-2">
            Flexible, pay-as-you-go pricing
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">Showing pricing for: {pricingData.region}</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 items-stretch">
          {isIndia ? (
            <>
              {/* FREE */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="relative flex flex-col h-full min-h-[640px] p-6 rounded-[2.5rem] bg-white dark:bg-slate-900 border-[1.5px] border-slate-200 dark:border-slate-800 shadow-xl transition-all duration-300"
              >
                <div className="flex-1">
                  <div className={SECTION_TITLE_H}>
                    <h3 className="text-2xl font-bold text-slate-900 dark:text-white">Free</h3>
                  </div>
                  <div className={SECTION_DESC_H}>
                    <p className="text-sm text-slate-500">Try ShortlistAI with no commitment.</p>
                  </div>

                  <div className={`${SECTION_BOX_H} border border-slate-200 rounded-lg p-3 bg-white`}>
                    <div className="flex flex-col w-full">
                      <span className="text-[10px] text-slate-500 font-medium uppercase tracking-wider">Plan</span>
                      <span className="text-base font-medium text-slate-900">Forever</span>
                    </div>
                  </div>

                  <div className="mb-8 min-h-[40px] flex items-baseline">
                    <span className="text-4xl font-extrabold text-slate-900 dark:text-white">₹0</span>
                  </div>
                </div>

                <div>
                  <Button
                    onClick={() => router.push("/dashboard")}
                    className="w-full h-12 rounded-full text-base font-bold mb-8 bg-slate-100 text-slate-900 hover:bg-slate-200 shadow-sm transition-all"
                  >
                    Start for free
                  </Button>
                  <div className="mt-2">
                    <div className="w-full h-px bg-slate-100 dark:bg-slate-800 mb-6" />
                    <ul className="space-y-3">
                      {freeFeatures.map((f) => (
                        <li key={f} className="flex items-start gap-3 text-sm text-slate-600 dark:text-slate-400">
                          <Check className="w-4 h-4 mt-0.5 text-green-500" />
                          <span className="leading-snug">{f}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </motion.div>

              {/* CREDITS (India only) */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="relative flex flex-col h-full min-h-[640px] p-6 rounded-[2.5rem] bg-white dark:bg-slate-900 border-[1.5px] border-amber-400 dark:border-amber-500/50 shadow-xl shadow-amber-500/5 transition-all duration-300"
              >
                <div className="flex-1">
                  <div className={SECTION_TITLE_H}>
                    <h3 className="text-2xl font-bold text-slate-900 dark:text-white">Pay-as-you-go Credits</h3>
                    <span className="bg-amber-400 text-slate-900 text-xs font-extrabold px-3 py-1 rounded-full whitespace-nowrap ml-2">POPULAR</span>
                  </div>
                  <div className={SECTION_DESC_H}>
                    <p className="text-sm text-slate-500 mb-2">Buy once, use within 3 months.</p>
                  </div>

                  <div className={`${SECTION_BOX_H} border border-slate-400 rounded-lg p-3 bg-white`}>
                    <div className="flex flex-col w-full">
                      <span className="text-[10px] text-slate-500 font-medium uppercase tracking-wider mb-1">Select Pack</span>
                      <select
                        className="w-full bg-transparent border-none outline-none text-base font-medium text-slate-900 cursor-pointer p-0"
                        value={selectedPackId}
                        onChange={(e) => setSelectedPackId(e.target.value)}
                      >
                        {pricingData.credit_packs.map((pack: any) => (
                          <option key={pack.id} value={pack.id}>
                            {cleanPackageName(pack.name)} - ₹{pack.price}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="mb-8 min-h-[40px] flex items-baseline gap-1">
                    <span className="text-4xl font-extrabold text-slate-900 dark:text-white">₹{selectedPack?.price}</span>
                    <span className="text-sm text-slate-500">one-time</span>
                  </div>
                </div>

                <div>
                  <Button
                    onClick={handlePackPurchase}
                    disabled={processingPackage !== null}
                    className="w-full h-12 rounded-full text-base font-bold mb-8 bg-[#1877F2] hover:bg-blue-600 text-white shadow-sm transition-all"
                  >
                    {processingPackage ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : "Select & Buy"}
                  </Button>
                  <div className="mt-2">
                    <div className="w-full h-px bg-slate-100 dark:bg-slate-800 mb-6" />
                    <ul className="space-y-3">
                      {creditsFeatures.slice(0, 5).map((f) => (
                        <li key={f} className="flex items-start gap-3 text-sm text-slate-600 dark:text-slate-400">
                          <Check className="w-4 h-4 mt-0.5 text-blue-500" />
                          <span className="leading-snug">{f}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </motion.div>

              {/* SUBSCRIPTIONS (Cashfree) */}
              {pricingData.subscriptions.map((sub: any, idx: number) => {
                const isQuarterly = sub.id?.toLowerCase?.().includes("quarter");
                const cta = isQuarterly ? "Go Pro for 3 Months" : "Go Pro Monthly";
                const badge = isQuarterly ? "⭐ Best Value" : null;

                return (
                  <motion.div
                    key={sub.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 + idx * 0.1 }}
                    className="relative flex flex-col h-full min-h-[640px] p-6 rounded-[2.5rem] bg-white dark:bg-slate-900 border-[1.5px] border-indigo-200 dark:border-indigo-800 shadow-xl transition-all duration-300"
                  >
                    <div className="flex-1">
                      <div className={SECTION_TITLE_H}>
                        <h3 className="text-2xl font-bold text-slate-900 dark:text-white">{sub.name}</h3>
                        {badge && (
                          <span className="bg-indigo-100 text-indigo-700 text-xs font-extrabold px-3 py-1 rounded-full whitespace-nowrap ml-2">
                            {badge}
                          </span>
                        )}
                      </div>
                      <div className={SECTION_DESC_H}>
                        <p className="text-sm text-slate-500">Flexible – cancel anytime</p>
                      </div>

                      <div className={`${SECTION_BOX_H} border border-indigo-200 rounded-lg p-3 bg-white`}>
                        <div className="flex flex-col w-full">
                          <span className="text-[10px] text-slate-500 font-medium uppercase tracking-wider">Billing</span>
                          <span className="text-base font-medium text-slate-900">{sub.billing}</span>
                        </div>
                      </div>

                      <div className="mb-8 min-h-[40px] flex items-baseline gap-1">
                        <span className="text-4xl font-extrabold text-slate-900 dark:text-white">₹{sub.price}</span>
                        <span className="text-sm text-slate-500">/{sub.period}</span>
                      </div>
                    </div>

                    <div>
                      <Button
                        onClick={() => handleSubscriptionCashfree(sub.id)}
                        className="w-full h-12 rounded-full text-base font-bold mb-8 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 shadow-sm transition-all"
                      >
                        {cta}
                      </Button>
                      <div className="mt-2">
                        <div className="w-full h-px bg-slate-100 dark:bg-slate-800 mb-6" />
                        <ul className="space-y-3">
                          {proFeatures.slice(0, 4).map((f) => (
                            <li key={f} className="flex items-start gap-3 text-sm text-slate-600 dark:text-slate-400">
                              <Check className="w-4 h-4 mt-0.5 text-indigo-500" />
                              <span className="leading-snug">{f}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </>
          ) : (
            <PayPalScriptProvider
              options={{
                clientId: process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID || "",
                intent: "subscription",
                vault: true,
              }}
            >
              {/* FREE TIER (International) */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="relative flex flex-col h-full min-h-[640px] p-6 rounded-[2.5rem] bg-white dark:bg-slate-900 border-[1.5px] border-slate-200 dark:border-slate-800 shadow-xl transition-all duration-300"
              >
                <div className="flex-1">
                  <div className={SECTION_TITLE_H}>
                    <h3 className="text-2xl font-bold text-slate-900 dark:text-white">{pricingData.free_tier.title}</h3>
                  </div>
                  <div className={SECTION_DESC_H}>
                    <p className="text-sm text-slate-500">Try ShortlistAI with no commitment.</p>
                  </div>

                  <div className={`${SECTION_BOX_H} border border-slate-200 rounded-lg p-3 bg-white`}>
                    <div className="flex flex-col w-full">
                      <span className="text-[10px] text-slate-500 font-medium uppercase tracking-wider">Plan</span>
                      <span className="text-base font-medium text-slate-900">Forever</span>
                    </div>
                  </div>

                  <div className="mb-8 min-h-[40px] flex items-baseline">
                    <span className="text-4xl font-extrabold text-slate-900 dark:text-white">
                      {pricingData.currency}{pricingData.free_tier.price}
                    </span>
                  </div>
                </div>

                <div>
                  <Button
                    onClick={() => router.push("/dashboard")}
                    className="w-full h-12 rounded-full text-base font-bold mb-8 bg-slate-100 text-slate-900 hover:bg-slate-200 shadow-sm transition-all"
                  >
                    Start for free
                  </Button>
                  <div className="mt-2">
                    <div className="w-full h-px bg-slate-100 dark:bg-slate-800 mb-6" />
                    <ul className="space-y-3">
                      {pricingData.free_tier.features.map((f: string) => (
                        <li key={f} className="flex items-start gap-3 text-sm text-slate-600 dark:text-slate-400">
                          <Check className="w-4 h-4 mt-0.5 text-green-500" />
                          <span className="leading-snug">{f}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </motion.div>

              {/* SUBSCRIPTIONS (PayPal) */}
              {pricingData.subscriptions.map((sub: any, idx: number) => {
                const isQuarterly = sub.id?.toLowerCase?.().includes("quarter");
                const badge = isQuarterly ? "⭐ Best Value" : null;

                return (
                  <motion.div
                    key={sub.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 + idx * 0.1 }}
                    className="relative flex flex-col h-full min-h-[640px] p-6 rounded-[2.5rem] bg-white dark:bg-slate-900 border-[1.5px] border-blue-200 dark:border-blue-900 shadow-xl transition-all duration-300"
                  >
                    <div className="flex-1">
                      <div className={SECTION_TITLE_H}>
                        <h3 className="text-2xl font-bold text-slate-900 dark:text-white">{sub.name}</h3>
                        {badge && (
                          <span className="bg-blue-100 text-blue-700 text-xs font-extrabold px-3 py-1 rounded-full whitespace-nowrap ml-2">
                            {badge}
                          </span>
                        )}
                      </div>
                      <div className={SECTION_DESC_H}>
                        <p className="text-sm text-slate-500">Auto-renews {sub.billing}</p>
                      </div>

                      <div className={`${SECTION_BOX_H} border border-blue-200 rounded-lg p-3 bg-white`}>
                        <div className="flex flex-col w-full">
                          <span className="text-[10px] text-slate-500 font-medium uppercase tracking-wider">Billing</span>
                          <span className="text-base font-medium text-slate-900">{sub.billing}</span>
                        </div>
                      </div>

                      <div className="mb-8 min-h-[40px] flex items-baseline gap-1">
                        <span className="text-4xl font-extrabold text-slate-900 dark:text-white">
                          {pricingData.currency}{sub.price}
                        </span>
                        <span className="text-sm text-slate-500">/{sub.period}</span>
                      </div>
                    </div>

                    <div>
                      <div className="w-full mb-8 relative z-0 min-h-[48px]">
                        <PayPalButtons
                          style={{ shape: 'rect', color: 'blue', layout: 'vertical', label: 'subscribe' }}
                          createSubscription={async (data, actions) => {
                            try {
                              const res = await fetch("/api/payment/create-subscription", {
                                method: "POST",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify({ planKey: sub.id, region })
                              });
                              const json = await res.json();
                              if (json.error) throw new Error(json.error);
                              return actions.subscription.create({
                                plan_id: json.planId
                              });
                            } catch (err: any) {
                              toast({ title: "Error", description: err.message || "Failed to initiate subscription", variant: "destructive" });
                              throw err;
                            }
                          }}
                          onApprove={async (data, actions) => {
                            try {
                              toast({ title: "Subscription Active!", description: "Welcome to Pro." });
                              router.push('/dashboard');
                            } catch (e) {
                              console.error(e);
                            }
                          }}
                        />
                      </div>
                      <div className="mt-2 text-left">
                        <div className="w-full h-px bg-slate-100 dark:bg-slate-800 mb-6" />
                        <ul className="space-y-3">
                          {proFeatures.slice(0, 4).map((f) => (
                            <li key={f} className="flex items-start gap-3 text-sm text-slate-600 dark:text-slate-400">
                              <Check className="w-4 h-4 mt-0.5 text-blue-500" />
                              <span className="leading-snug">{f}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </PayPalScriptProvider>
          )}
        </div>
      </section>
    </main>
  );
}
