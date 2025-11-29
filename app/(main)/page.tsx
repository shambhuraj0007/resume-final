"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ArrowRight, CheckCircle2, Target, Zap } from "lucide-react";
import { motion, useScroll, useTransform } from "framer-motion";
import HomeResumeUploader from "./HomeResumeUploader";

export default function HomePage() {
  const router = useRouter();
  const [isClient, setIsClient] = useState(false);
  const { scrollYProgress } = useScroll();
  const heroOpacity = useTransform(scrollYProgress, [0, 0.3], [1, 0.7]);

  useEffect(() => {
    setIsClient(true);
  }, []);

  return (
    <main className="flex flex-col min-h-screen bg-gradient-to-br from-white via-gray-50 to-white dark:from-gray-950 dark:via-gray-900 dark:to-gray-950">
      {/* Hero Section - Split with Analyzer */}
      <section className="relative overflow-hidden">
        <motion.div
  style={isClient ? { opacity: heroOpacity } : undefined}
  className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8"
>

          <div className="flex flex-col lg:grid lg:grid-cols-12 gap-4 sm:gap-6 lg:gap-8 pt-0 sm:pt-0 lg:pt-0">
            {/* Left Side / Top on Mobile - Value Proposition */}
            <div className="lg:col-span-5 flex flex-col justify-start order-1 lg:order-1 pt-2">
              <div className="space-y-1 sm:space-y-3">
                {/* Main Headline - Optimized H1 */}
               <h1 className="text-3xl sm:text-4xl lg:text-5xl xl:text-6xl font-black tracking-tight text-gray-900 dark:text-white leading-[0.95] sm:leading-[0.9] pt-10">
  Improve Your Interview Chances to{" "}
  <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 dark:from-blue-400 dark:via-purple-400 dark:to-pink-400 text-5xl sm:text-6xl lg:text-7xl xl:text-8xl">
    100%
  </span>
</h1>

                {/* Subheadline */}
                <p className="text-base pt-6 sm:text-lg lg:text-xl text-gray-600 dark:text-gray-300 leading-relaxed font-medium">
                  Get your ATS score instantly and fix what's blocking
                  callbacks. AI-powered analysis in seconds.
                </p>

                {/* Benefits List */}
                <div className="space-y-2.5 sm:space-y-3 pt-4 sm:pt-5">
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 h-5 w-5 rounded-full bg-blue-500/20 dark:bg-blue-500/20 backdrop-blur-sm border border-blue-400/30 dark:border-blue-400/30 flex items-center justify-center shrink-0">
                      <CheckCircle2 className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-blue-600 dark:text-blue-400" />
                    </div>
                    <p className="text-gray-700 dark:text-gray-200 text-sm sm:text-base">
                      <strong className="font-semibold text-gray-900 dark:text-white">
                        Know your callback probability
                      </strong>{" "}
                      before applying
                    </p>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 h-5 w-5 rounded-full bg-blue-500/20 dark:bg-blue-500/20 backdrop-blur-sm border border-blue-400/30 dark:border-blue-400/30 flex items-center justify-center shrink-0">
                      <CheckCircle2 className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-blue-600 dark:text-blue-400" />
                    </div>
                    <p className="text-gray-700 dark:text-gray-200 text-sm sm:text-base">
                      <strong className="font-semibold text-gray-900 dark:text-white">
                        Get actionable tips
                      </strong>{" "}
                      to beat ATS filters
                    </p>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 h-5 w-5 rounded-full bg-blue-500/20 dark:bg-blue-500/20 backdrop-blur-sm border border-blue-400/30 dark:border-blue-400/30 flex items-center justify-center shrink-0">
                      <CheckCircle2 className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-blue-600 dark:text-blue-400" />
                    </div>
                    <p className="text-gray-700 dark:text-gray-200 text-sm sm:text-base">
                      <strong className="font-semibold text-gray-900 dark:text-white">
                        AI-powered insights
                      </strong>{" "}
                      in under 10 seconds
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Side / Bottom on Mobile - Simplified Upload Form */}
            <div className="lg:col-span-7 order-2 lg:order-2">
              <div className="lg:ml-6 py-[40px]">
                <HomeResumeUploader />
              </div>
            </div>
          </div>
        </motion.div>
      </section>

      {/* New H2 Section - ATS Score Feature Highlight */}
      <section className="py-12 sm:py-16 bg-gradient-to-b from-white to-gray-50 dark:from-gray-950 dark:to-gray-900">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 dark:text-white mb-4 sm:mb-6">
              Check Your Resume ATS Score & Callback Probability in 10 Seconds
            </h2>
            <p className="text-base sm:text-lg lg:text-xl text-gray-600 dark:text-gray-300 max-w-3xl mx-auto leading-relaxed mb-8">
              Our AI analyzes your resume against industry standards and provides instant feedback on formatting, keywords, and compatibility with Applicant Tracking Systems used by top companies.
            </p>
            
            {/* Feature Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-10">
              <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-lg border border-gray-100 dark:border-gray-700">
                <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center mx-auto mb-4">
                  <Target className="h-6 w-6 text-white" />
                </div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">
                  ATS Compatibility Score
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-300">
                  See how well your resume passes through automated screening systems
                </p>
              </div>

              <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-lg border border-gray-100 dark:border-gray-700">
                <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center mx-auto mb-4">
                  <Zap className="h-6 w-6 text-white" />
                </div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">
                  Instant AI Analysis
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-300">
                  Upload and get comprehensive feedback in less than 10 seconds
                </p>
              </div>

              <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-lg border border-gray-100 dark:border-gray-700">
                <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-pink-500 to-pink-600 flex items-center justify-center mx-auto mb-4">
                  <CheckCircle2 className="h-6 w-6 text-white" />
                </div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">
                  Actionable Improvements
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-300">
                  Get specific recommendations to increase your callback chances
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA Section */}
      <section className="py-5 sm:py-6 bg-gray-100 dark:bg-gray-800 flex flex-col items-center">
        <div className="container px-4 max-w-3xl text-center">
          <div>
            <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold mb-1 sm:mb-1.5 text-gray-900 dark:text-white">
              Ready to Shine?
            </h2>
            <p className="text-gray-600 dark:text-gray-300 mb-3 leading-relaxed text-sm sm:text-base">
              Join thousands who've built their perfect resume with ResumeAI.
              Start now, no credit card needed.
            </p>
            <Link
              href="/ats-checker"
              className="inline-flex items-center justify-center rounded-full bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 text-white px-5 sm:px-6 py-2 sm:py-2.5 text-sm sm:text-base font-semibold shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105"
            >
              Analyze your Resume{" "}
              <ArrowRight className="ml-2 h-3.5 w-3.5 sm:h-4 sm:w-4" />
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
