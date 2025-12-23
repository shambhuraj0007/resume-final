"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Loader2, Check, ChevronDown, ChevronUp } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useSearchParams } from "next/navigation"
import Script from "next/script";
import { useAuth } from "@/hooks/useAuth";
import { useCredits } from "@/hooks/useCredits";
import { PayPalScriptProvider, PayPalButtons } from "@paypal/react-paypal-js";

type Region = "INDIA" | "USA" | "EUROPE" | "UK";

export default function PricingPage() {
  const [pricingData, setPricingData] = useState<any>(null);
  const [region, setRegion] = useState<Region>("USA");
  const [loading, setLoading] = useState(true);
  const [processingPackage, setProcessingPackage] = useState<string | null>(null);

  // Custom Dropdown State
  const [selectedPackId, setSelectedPackId] = useState<string>("");
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const { toast } = useToast();
  const { data: session } = useSession();
  const router = useRouter();
  // 2) Detect region
  const searchParams = useSearchParams();

  const cleanPackageName = (name: string) => name.replace(/\s*pack$/i, "").trim();

  // ... existing hooks

  // Pending Transaction Logic
  const [pendingOrder, setPendingOrder] = useState<any>(null);
  const [isVerifyingPending, setIsVerifyingPending] = useState(false);

  const { isAuthenticated } = useAuth();
  const { refreshBalance } = useCredits();

  const checkPending = useCallback(async () => {
    try {
      const res = await fetch('/api/payment/latest-pending');
      const data = await res.json();

      // If we have a pending order ID in URL, prioritize that
      const urlOrderId = searchParams.get('order_id');
      if (urlOrderId) {
        setPendingOrder({ orderId: urlOrderId });
        return;
      }

      // Otherwise check for subscription params in URL
      const cfSubId = searchParams.get('cf_subscriptionId') || searchParams.get('subscription_id');
      if (cfSubId) {
        setPendingOrder({ cfSubscriptionId: cfSubId, isSubscription: true });
        return;
      }

      if (data.pending && data.transaction) {
        setPendingOrder(data.transaction);
      }
    } catch (e) {
      console.error("Error checking pending:", e);
    }
  }, [searchParams]);

  // Check for pending transaction on mount
  useEffect(() => {
    if (!session && !isAuthenticated) return;
    checkPending();
  }, [session, isAuthenticated, checkPending]);

  // Auto-verify if pending order exists
  useEffect(() => {
    if (!pendingOrder || isVerifyingPending) return;

    const verifyPending = async () => {
      setIsVerifyingPending(true);
      const orderId = pendingOrder.orderId;
      const cfSubscriptionId = pendingOrder.cfSubscriptionId;
      const isSubscription = pendingOrder.isSubscription || !!cfSubscriptionId;

      let retries = isSubscription ? 1 : 20; // Subscriptions usually don't need polling if we have params

      while (retries > 0) {
        try {
          const verifyUrl = isSubscription
            ? `/api/payment/verify-signature?${searchParams.toString()}`
            : '/api/payment/verify-cashfree';

          const res = await fetch(verifyUrl, {
            method: isSubscription ? 'GET' : 'POST',
            headers: { 'Content-Type': 'application/json' },
            ...(isSubscription ? {} : { body: JSON.stringify({ orderId }) })
          });
          const data = await res.json();

          if (res.ok && (data.success || data.message === "Already completed" || data.subscriptionStatus === 'active')) {
            toast({
              title: "Payment Successful",
              description: "Credits added!",
              className: "bg-green-600 text-white border-green-700"
            });
            setPendingOrder(null);
            refreshBalance(); // Update context

            // Auto redirect to dashboard after 2 seconds
            setTimeout(() => {
              router.push('/');
            }, 2000);
            break;
          }

          if (data.status === 'FAILED' || data.cfCheckoutStatus === 'FAILED') {
            setPendingOrder(null);
            toast({ title: "Payment Failed", description: "The transaction failed.", variant: "destructive" });
            break;
          }
        } catch (e) {
          console.warn("Verify poll error", e);
        }

        retries--;
        if (retries > 0) await new Promise(r => setTimeout(r, 2000));
      }
      setIsVerifyingPending(false);
    };

    verifyPending();
  }, [pendingOrder]); // Removed isVerifyingPending from deps to avoid loop, handled by ref/state check

  // ... rest of component

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

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [dropdownRef]);

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

    const mode = process.env.NODE_ENV === "production" ? "production" : "sandbox";
    const cashfree = window.Cashfree({ mode });

    const checkoutOptions = {
      paymentSessionId: sessionId,
      redirectTarget: "_modal" as "_modal",
    };

    cashfree.checkout(checkoutOptions).then(() => {
      console.log("Checkout opened/closed");
      // Give it a moment then check for pending orders
      setTimeout(() => {
        checkPending();
      }, 2000);
    }).catch((error: any) => {
      console.error("Checkout error:", error);
      toast({ title: "Checkout Error", description: "Failed to open payment page.", variant: "destructive" });
    });
  };

  const handlePackPurchase = async () => {
    if (!session && !isAuthenticated) return router.push("/signin?callbackUrl=/pricing");
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

      openCashfreeCheckout(data.payment_session_id);

    } catch (error: any) {
      toast({ title: "Purchase Failed", description: error.message, variant: "destructive" });
    } finally {
      setProcessingPackage(null);
    }
  };

  const handleSubscriptionCashfree = async (planKey: string) => {
    if (!session && !isAuthenticated) return router.push("/signin?callbackUrl=/pricing");

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

      // @ts-ignore
      const cashfree = (window as any).Cashfree({
        mode: process.env.NODE_ENV === "production" ? "production" : "sandbox",
      });

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

  // --- STRICT ALIGNMENT CLASSES ---
  const CARD_MIN_H = "min-h-[640px]";
  const TITLE_H = "h-[48px] mb-2 flex items-center";
  const DESC_H = "h-[40px] mb-4";

  // ✅ FIX: Fixed Height (88px) + Bottom Alignment (items-end)
  // This forces the "Select Pack" dropdown and the "Use up to..." text to sit on the same baseline
  const SELECTION_AREA_H = "h-[88px] mb-2 flex items-end pb-2";

  // ✅ FIX: Fixed Height (60px) + Top Alignment (items-start)
  // Ensures prices start at the exact same vertical pixel below the selection area
  const PRICE_AREA_H = "h-[60px] mb-6 flex items-start";

  return (
    <main className="min-h-screen bg-slate-50 dark:bg-slate-950 pt-16 pb-12 font-sans">
      <Script
        src="https://sdk.cashfree.com/js/v3/cashfree.js"
        strategy="lazyOnload"
        onLoad={() => console.log("Cashfree SDK Loaded")}
      />
      <section className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="text-center max-w-3xl mx-auto mb-14">
          <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-slate-900 dark:text-white mb-2">
            Flexible, pay-as-you-go pricing
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">Showing pricing for: {pricingData.region}</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 items-stretch pt-4">
          {isIndia ? (
            <>
              {/* FREE */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className={`relative flex flex-col h-full ${CARD_MIN_H} p-6 rounded-[2rem] bg-white dark:bg-slate-900 border-[1.5px] border-slate-200 dark:border-slate-800 shadow-xl transition-all duration-300`}
              >
                <div className={TITLE_H}>
                  <h3 className="text-2xl font-bold text-slate-900 dark:text-white">Free</h3>
                </div>
                <div className={DESC_H}>
                  <p className="text-sm text-slate-500">Try ShortlistAI with no commitment.</p>
                </div>

                {/* 1. SELECTION AREA - Updated text to match other cards */}
                <div className={SELECTION_AREA_H}>
                  <div className="w-full">
                    <p className="text-xl text-slate-500 dark:text-slate-400 leading-normal">
                      Up to <span className="font-bold text-slate-900 dark:text-white">3 CV↔JD scans</span> per month
                    </p>
                  </div>
                </div>

                {/* 2. PRICE AREA */}
                <div className={PRICE_AREA_H}>
                  <span className="text-5xl font-extrabold tracking-tighter text-slate-900 dark:text-white">₹0</span>
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

              {/* CREDITS (Custom Dropdown + Style) */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className={`relative flex flex-col h-full ${CARD_MIN_H} p-6 rounded-[2rem] bg-white dark:bg-slate-900 border-[1.5px] border-amber-400 dark:border-amber-500/50 shadow-xl shadow-amber-500/5 transition-all duration-300`}
              >
                <div className={TITLE_H}>
                  <h3 className="text-2xl font-bold text-slate-900 dark:text-white">Pay-as-you-go</h3>
                </div>
                <div className={DESC_H}>
                  <p className="text-sm text-slate-500 mb-2">Buy once, use within 3 months.</p>
                </div>

                {/* 1. SELECTION AREA (Dropdown) */}
                <div className={SELECTION_AREA_H}>
                  <div className="w-full relative group" ref={dropdownRef}>
                    <div
                      onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                      className={`
                            relative w-full rounded-xl py-3 pl-4 pr-12 cursor-pointer transition-all duration-300 ease-out
                            border backdrop-blur-sm
                            ${isDropdownOpen
                          ? 'border-blue-500 bg-blue-500/5 dark:bg-blue-500/10 shadow-[0_0_15px_-3px_rgba(59,130,246,0.5)]'
                          : 'border-slate-300 dark:border-slate-700 bg-white/50 dark:bg-slate-900/50 hover:border-slate-400 dark:hover:border-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800'
                        }
                          `}
                    >
                      <span className="block text-[11px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-widest mb-0.5">
                        Select Pack
                      </span>
                      <span className="block text-lg font-bold text-slate-900 dark:text-white tracking-tight leading-none">
                        {cleanPackageName(selectedPack?.name || "")}
                      </span>

                      <div className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 transition-transform duration-300 ease-in-out"
                        style={{ transform: isDropdownOpen ? 'translateY(-50%) rotate(180deg)' : 'translateY(-50%) rotate(0deg)' }}>
                        <ChevronDown className={`h-5 w-5 ${isDropdownOpen ? 'text-blue-500' : ''}`} />
                      </div>
                    </div>

                    {/* DROPDOWN MENU */}
                    <AnimatePresence>
                      {isDropdownOpen && (
                        <motion.div
                          initial={{ opacity: 0, y: 8, scale: 0.98 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, y: 8, scale: 0.98 }}
                          transition={{ duration: 0.15, ease: "easeOut" }}
                          className="absolute left-0 right-0 top-[calc(100%+8px)] bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-slate-700/80 rounded-xl shadow-2xl shadow-slate-400/20 dark:shadow-black/50 z-50 overflow-hidden ring-1 ring-black/5"
                        >
                          <div className="max-h-[260px] overflow-y-auto scrollbar-thin scrollbar-thumb-slate-200 dark:scrollbar-thumb-slate-700 py-2">
                            {pricingData.credit_packs.map((pack: any) => {
                              const isSelected = selectedPackId === pack.id;
                              return (
                                <div
                                  key={pack.id}
                                  onClick={() => {
                                    setSelectedPackId(pack.id);
                                    setIsDropdownOpen(false);
                                  }}
                                  className={`
                                        relative flex items-center justify-between px-4 py-3.5 cursor-pointer transition-all duration-200
                                        border-l-2
                                        ${isSelected
                                      ? 'bg-blue-50/80 dark:bg-blue-900/20 border-blue-600'
                                      : 'border-transparent hover:bg-slate-50 dark:hover:bg-slate-800 hover:border-slate-300 dark:hover:border-slate-600'
                                    }
                                      `}
                                >
                                  <div className="flex flex-col gap-0.5">
                                    <span className={`text-sm font-bold tracking-tight ${isSelected ? 'text-blue-700 dark:text-blue-400' : 'text-slate-700 dark:text-slate-200'}`}>
                                      {cleanPackageName(pack.name)}
                                    </span>
                                    <span className={`text-xs ${isSelected ? 'text-blue-600/80 dark:text-blue-400/70' : 'text-slate-400'}`}>
                                      ₹{pack.price}
                                    </span>
                                  </div>

                                  {isSelected && (
                                    <motion.div
                                      initial={{ scale: 0 }}
                                      animate={{ scale: 1 }}
                                      className="bg-blue-600 text-white rounded-full p-0.5"
                                    >
                                      <Check className="h-3 w-3 stroke-[3]" />
                                    </motion.div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>

                {/* 2. PRICE AREA */}
                <div className={PRICE_AREA_H}>
                  <span className="text-5xl font-extrabold tracking-tighter text-slate-900 dark:text-white">
                    ₹{selectedPack?.price}
                  </span>
                  <span className="text-sm text-slate-500 font-medium ml-1 mt-auto pb-1">/ one-time</span>
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

              {/* SUBSCRIPTIONS */}
              {pricingData.subscriptions.map((sub: any, idx: number) => {
                const isQuarterly = sub.id?.toLowerCase?.().includes("quarter");
                const isMonthly = !isQuarterly;
                const cta = isQuarterly ? "Go Pro for 3 Months" : "Go Pro Monthly";

                return (
                  <motion.div
                    key={sub.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 + idx * 0.1 }}
                    className={`relative flex flex-col h-full ${CARD_MIN_H} p-6 rounded-[2rem] bg-white dark:bg-slate-900 border-[1.5px] ${isQuarterly || isMonthly ? 'border-indigo-400 dark:border-indigo-500' : 'border-indigo-200 dark:border-indigo-800'} shadow-xl transition-all duration-300`}
                  >
                    {isMonthly && (
                      <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1.5 rounded-full bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-[11px] font-bold uppercase tracking-widest shadow-lg z-20 border-2 border-white dark:border-slate-900">
                        Most Popular
                      </div>
                    )}
                    {isQuarterly && (
                      <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1.5 rounded-full bg-gradient-to-r from-violet-600 to-indigo-600 text-white text-[11px] font-bold uppercase tracking-widest shadow-lg z-20 border-2 border-white dark:border-slate-900">
                        Best Value
                      </div>
                    )}

                    <div className={TITLE_H}>
                      <div className="flex items-center flex-wrap gap-2">
                        <h3 className="text-2xl font-bold text-slate-900 dark:text-white">{sub.name}</h3>
                        <span className="bg-[#5c3bfa] text-white text-[10px] font-bold px-2 py-1 rounded-sm">75% OFF</span>
                      </div>
                    </div>
                    <div className={DESC_H}>
                      <p className="text-sm text-slate-500">Flexible – cancel anytime</p>
                    </div>

                    {/* 1. SELECTION AREA (Text) */}
                    <div className={SELECTION_AREA_H}>
                      <div className="w-full">
                        {isMonthly ? (
                          <p className="text-xl text-slate-500 dark:text-slate-400 leading-normal">
                            Use up to <span className="font-bold text-slate-900 dark:text-white">200 credits</span> per month
                          </p>
                        ) : (
                          <p className="text-xl text-slate-500 dark:text-slate-400 leading-normal">
                            Includes <span className="font-bold text-slate-900 dark:text-white">600 credits</span> for 3 months
                          </p>
                        )}
                      </div>
                    </div>

                    {/* 2. PRICE AREA */}
                    <div className={PRICE_AREA_H}>
                      <span className="text-5xl font-extrabold tracking-tighter text-slate-900 dark:text-white">
                        ₹{sub.price}
                      </span>
                      <span className="text-sm text-slate-500 font-medium ml-1 mt-auto pb-1">/{sub.period}</span>
                    </div>

                    <div>
                      <Button
                        onClick={() => handleSubscriptionCashfree(sub.id)}
                        className={`w-full h-12 rounded-full text-base font-bold mb-2 shadow-sm transition-all ${isQuarterly || isMonthly ? 'bg-indigo-600 hover:bg-indigo-700 text-white' : 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100'}`}
                      >
                        {cta}
                      </Button>

                      <p className="text-xs text-center text-slate-500 dark:text-slate-400 mb-6 font-medium">

                      </p>

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
            // ... [PayPal Section remains untouched but uses same layout classes]
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
                className={`relative flex flex-col h-full ${CARD_MIN_H} p-6 rounded-[2rem] bg-white dark:bg-slate-900 border-[1.5px] border-slate-200 dark:border-slate-800 shadow-xl transition-all duration-300`}
              >
                <div className={TITLE_H}>
                  <h3 className="text-2xl font-bold text-slate-900 dark:text-white">{pricingData.free_tier.title}</h3>
                </div>
                <div className={DESC_H}>
                  <p className="text-sm text-slate-500">Try ShortlistAI with no commitment.</p>
                </div>

                {/* 1. SELECTION AREA (International Free Text) */}
                <div className={SELECTION_AREA_H}>
                  <div className="w-full">
                    <p className="text-xl text-slate-500 dark:text-slate-400 leading-normal">
                      Up to <span className="font-bold text-slate-900 dark:text-white">3 CV↔JD scans</span> per month
                    </p>
                  </div>
                </div>

                {/* 2. PRICE AREA */}
                <div className={PRICE_AREA_H}>
                  <span className="text-5xl font-extrabold tracking-tighter text-slate-900 dark:text-white">
                    {pricingData.currency}{pricingData.free_tier.price}
                  </span>
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
                return (
                  <motion.div
                    key={sub.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 + idx * 0.1 }}
                    className={`relative flex flex-col h-full ${CARD_MIN_H} p-6 rounded-[2rem] bg-white dark:bg-slate-900 border-[1.5px] ${isQuarterly ? 'border-blue-400 dark:border-blue-500' : 'border-blue-200 dark:border-blue-900'} shadow-xl transition-all duration-300`}
                  >
                    {isQuarterly && (
                      <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1.5 rounded-full bg-gradient-to-r from-blue-600 to-cyan-600 text-white text-[11px] font-bold uppercase tracking-widest shadow-lg z-20 border-2 border-white dark:border-slate-900">
                        Best Value
                      </div>
                    )}

                    <div className={TITLE_H}>
                      <div className="flex items-center flex-wrap gap-2">
                        <h3 className="text-2xl font-bold text-slate-900 dark:text-white">{sub.name}</h3>
                        <span className="bg-[#5c3bfa] text-white text-[10px] font-bold px-2 py-1 rounded-sm">75% OFF</span>
                      </div>
                    </div>
                    <div className={DESC_H}>
                      <p className="text-sm text-slate-500">Auto-renews {sub.billing}</p>
                    </div>

                    {/* 1. SELECTION AREA (Empty Spacer for consistent button position) */}
                    <div className={SELECTION_AREA_H}></div>

                    {/* 2. PRICE AREA */}
                    <div className={PRICE_AREA_H}>
                      <div className="flex items-baseline gap-1 mt-auto">
                        <span className="text-5xl font-extrabold tracking-tighter text-slate-900 dark:text-white">
                          {pricingData.currency}{sub.price}
                        </span>
                        <span className="text-sm text-slate-500 font-medium">/{sub.period}</span>
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

      {/* Auto-Monitoring Sticky Status */}
      <AnimatePresence>
        {pendingOrder && (
          <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            className="fixed bottom-6 right-6 z-50"
          >
            <div className="bg-white dark:bg-slate-800 shadow-2xl rounded-xl p-4 border border-blue-200 dark:border-blue-900 flex items-center gap-4 max-w-sm">
              <div className="relative">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
              </div>
              <div>
                <h4 className="font-bold text-slate-900 dark:text-white text-sm">Checking Payment Status...</h4>
                <p className="text-xs text-slate-500">
                  {pendingOrder.cfSubscriptionId ? `Subscription: ${pendingOrder.cfSubscriptionId}` : `Order: ${pendingOrder.orderId}`}
                </p>
              </div>
              <Button
                size="sm"
                variant="outline"
                className="ml-auto text-xs h-8"
                onClick={() => setPendingOrder(null)} // Allow dismiss
              >
                Hide
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  );
}
