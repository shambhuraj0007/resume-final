"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Check, Loader2, ChevronDown } from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

interface Package {
  id: string;
  name: string;
  credits: number;
  price: number;
  originalPrice?: number;
  currency: string;
  validityMonths: number;
  description: string;
  features: string[];
  popular?: boolean;
  savePercentage?: string;
}

declare global {
  interface Window {
    Razorpay: any;
  }
}

export default function PricingPage() {
  const [packages, setPackages] = useState<Package[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingPackage, setProcessingPackage] = useState<string | null>(null);
  const [scriptLoaded, setScriptLoaded] = useState(false);
  const [isClient, setIsClient] = useState(false);
  const { toast } = useToast();
  const { data: session, status } = useSession();
  const router = useRouter();

  const activeOrderRef = useRef<string | null>(null);
  const dismissHandledRef = useRef(false);
  const razorpayInstanceRef = useRef<any>(null);

  // Helper to calculate discount
  const calculateDiscount = (price: number, originalPrice: number) => {
    if (!originalPrice || originalPrice <= price) return null;
    const discount = Math.round(((originalPrice - price) / originalPrice) * 100);
    return `${discount}%`;
  };

  // Helper to clean package name
  const cleanPackageName = (name: string) => {
    return name.replace(/\s*pack$/i, '').trim();
  };

  const fetchPackages = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/payment/packages", {
        next: { revalidate: 3600 },
      } as any);

      if (!response.ok) throw new Error("Failed to fetch packages");

      const data = await response.json();
      
      const mappedPackages = (data.packages || []).map((pkg: any) => {
        const originalPrice = pkg.price * 2; 
        const savePercentage = calculateDiscount(pkg.price, originalPrice);

        return {
          ...pkg,
          name: cleanPackageName(pkg.name), // Remove "Pack" from name
          originalPrice, 
          savePercentage,
        };
      });
      
      setPackages(mappedPackages);
    } catch (error) {
      console.error("Error fetching packages:", error);
      toast({
        title: "Error",
        description: "Failed to load pricing.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  const loadRazorpayScript = useCallback(() => {
    if (scriptLoaded || typeof window === "undefined" || window.Razorpay) {
      setScriptLoaded(true);
      return Promise.resolve(true);
    }
    return new Promise((resolve) => {
      const script = document.createElement("script");
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      script.async = true;
      script.onload = () => {
        setScriptLoaded(true);
        resolve(true);
      };
      script.onerror = () => {
        console.error("Failed to load Razorpay script");
        resolve(false);
      };
      document.body.appendChild(script);
    });
  }, [scriptLoaded]);

  const handlePurchase = useCallback(async (packageId: string) => {
    if (status === "loading") return; // Wait until session status is resolved

    if (status === "unauthenticated") {
      toast({
        title: "Sign In Required",
        description: "Please sign in to purchase credits.",
        variant: "destructive",
      });
      router.push("/signin");
      return;
    }

    if (activeOrderRef.current) return;
    if (!scriptLoaded && (typeof window === "undefined" || !window.Razorpay)) {
        await loadRazorpayScript();
        return;
    }
    if (!process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID) {
        toast({ title: "Configuration Error", description: "Payment system not configured.", variant: "destructive" });
        return;
    }
    setProcessingPackage(packageId);
    dismissHandledRef.current = false;

    try {
        const orderResponse = await fetch("/api/payment/create-order", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ packageType: packageId }),
        });
        const orderData = await orderResponse.json();
        if (!orderResponse.ok) throw new Error(orderData.error || "Failed to create order");
        
        activeOrderRef.current = orderData.orderId;
        const selectedPackage = packages.find((p) => p.id === packageId);
        
        const options = {
            key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
            amount: orderData.amount,
            currency: orderData.currency,
            name: "ShortlistAI",
            description: selectedPackage ? `Buy ${selectedPackage.name}` : "Buy Credits",
            order_id: orderData.orderId,
            theme: { color: "#4f46e5" },
            handler: async function (response: any) {
                activeOrderRef.current = null;
                dismissHandledRef.current = true;
                try {
                    const verifyResponse = await fetch("/api/payment/verify", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                            razorpay_order_id: response.razorpay_order_id,
                            razorpay_payment_id: response.razorpay_payment_id,
                            razorpay_signature: response.razorpay_signature,
                        }),
                    });
                    if (verifyResponse.ok) toast({ title: "Success", description: "Credits added." });
                } finally {
                    setProcessingPackage(null);
                }
            },
            modal: {
                ondismiss: function () {
                    if (dismissHandledRef.current) return;
                    dismissHandledRef.current = true;
                    activeOrderRef.current = null;
                    setProcessingPackage(null);
                }
            }
        };
        const razorpay = new window.Razorpay(options);
        razorpayInstanceRef.current = razorpay;
        razorpay.open();
    } catch (error) {
        activeOrderRef.current = null;
        setProcessingPackage(null);
        toast({ title: "Payment Failed", description: "Could not process payment.", variant: "destructive" });
    }
  }, [packages, scriptLoaded, loadRazorpayScript, toast]);

  useEffect(() => {
    setIsClient(true);
    fetchPackages();
    loadRazorpayScript();
    return () => {
        if (razorpayInstanceRef.current) try { razorpayInstanceRef.current.close(); } catch(e) {}
    };
  }, [fetchPackages, loadRazorpayScript]);

  return (
    <main className="min-h-screen bg-slate-50 dark:bg-slate-950 pt-12 pb-12 font-sans">
      <section className="max-w-7xl mx-auto px-4 sm:px-6">
        
        <div className="text-center max-w-3xl mx-auto mb-8">
          <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-slate-900 dark:text-white mb-2">
            Flexible, pay-as-you-go pricing
          </h1>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
             {[1, 2, 3, 4].map(i => <div key={i} className="h-[600px] rounded-[2rem] bg-white animate-pulse" />)}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 items-start">
            {packages.map((pkg, index) => (
              <motion.div
                key={pkg.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className="relative flex flex-col h-full min-h-[640px] p-6 rounded-[2.5rem] bg-white dark:bg-slate-900 border-[1.5px] border-amber-400 dark:border-amber-500/50 shadow-xl shadow-amber-500/5 transition-all duration-300"
              >
                {/* HEADER SECTION */}
                <div className="mb-4 flex justify-between items-start">
                  <h3 className="text-2xl font-bold text-slate-900 dark:text-white">
                    {pkg.name}
                  </h3>
                  {pkg.savePercentage && (
                    <span className="bg-amber-400 text-slate-900 text-xs font-extrabold px-3 py-1 rounded-full">
                      Save {pkg.savePercentage}
                    </span>
                  )}
                </div>

                {/* DROPDOWN BOX */}
                <div className="border border-slate-400 rounded-lg p-3 mb-8 flex justify-between items-center bg-white">
                  <div className="flex flex-col">
                    <span className="text-[10px] text-slate-500 font-medium uppercase tracking-wider">
                      Amount
                    </span>
                    <span className="text-base font-medium text-slate-900">
                      {pkg.credits} credits
                    </span>
                  </div>
                </div>

                {/* PRICE SECTION */}
                <div className="mb-8">
                  <div className="flex flex-col">
                    {pkg.originalPrice && (
                      <span className="text-xl text-slate-400 font-bold line-through decoration-black-800 mb-1">
                        ₹{pkg.originalPrice}
                      </span>
                    )}
                    <div className="flex items-baseline gap-1">
                      <span className="text-4xl font-extrabold text-slate-900 dark:text-white">
                        ₹{pkg.price}
                      </span>
                    </div>
                  </div>
                </div>

                {/* BUTTON */}
                <Button
                  onClick={() => !processingPackage && handlePurchase(pkg.id)}
                  disabled={processingPackage !== null}
                  className="w-full h-12 rounded-full text-base font-bold mb-8 bg-[#1877F2] hover:bg-blue-600 text-white shadow-sm transition-all"
                >
                  {processingPackage === pkg.id ? (
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  ) : (
                    "Buy now"
                  )}
                </Button>

                {/* FEATURES */}
                <div className="mt-2">
                  <div className="w-full h-px bg-slate-100 dark:bg-slate-800 mb-6" />
                  <ul className="space-y-3">
                    {pkg.features.slice(0, 4).map((feature, idx) => (
                      <li key={idx} className="flex items-start gap-3 text-sm text-slate-600 dark:text-slate-400">
                        <span className="leading-snug">{feature}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
