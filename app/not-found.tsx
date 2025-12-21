"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { FileSearch, ArrowLeft, Home, FileQuestion } from "lucide-react";
import { motion } from "framer-motion";

export default function NotFound() {
  const router = useRouter();

  // Animation variants for smooth entrance
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.2,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" } },
  };

  const floatAnimation = {
    animate: {
      y: [0, -15, 0],
      rotate: [0, 5, -5, 0],
      transition: {
        duration: 6,
        repeat: Infinity,
        ease: "easeInOut",
      },
    },
  };

  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-950 relative overflow-hidden font-sans selection:bg-indigo-100 selection:text-indigo-900">

      {/* Background Grid Pattern */}
      <div className="absolute inset-0 w-full h-full bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)] pointer-events-none" />

      {/* Glowing Orb Effect */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-indigo-500/20 rounded-full blur-[100px] pointer-events-none dark:bg-indigo-500/10" />

      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="relative z-10 flex flex-col items-center text-center px-4 max-w-2xl mx-auto"
      >
        {/* Animated Icon */}
        <motion.div
          variants={floatAnimation}
          animate="animate"
          className="mb-8 relative"
        >
          <div className="relative flex items-center justify-center w-32 h-32 rounded-3xl bg-gradient-to-tr from-white to-slate-100 dark:from-slate-800 dark:to-slate-900 shadow-2xl shadow-indigo-500/20 border border-white/50 dark:border-slate-700">
            <FileQuestion className="w-16 h-16 text-indigo-600 dark:text-indigo-400" strokeWidth={1.5} />
          </div>

          {/* Decorative elements around icon */}
          <div className="absolute -right-4 -top-4 bg-white dark:bg-slate-800 p-3 rounded-2xl shadow-lg border border-slate-100 dark:border-slate-700 animate-bounce delay-700">
            <span className="text-2xl">404</span>
          </div>
        </motion.div>

        {/* Main Text */}
        <motion.h1
          variants={itemVariants}
          className="text-xl sm:text-xl font-bold tracking-tight text-slate-900 dark:text-white mb-4"
        >
          The page you are looking for does not exist. How you got here is a mystery. But you can click the button below to go back to the homepage.
        </motion.h1>

        <motion.p
          variants={itemVariants}
          className="text-lg text-slate-600 dark:text-slate-400 mb-8 leading-relaxed"
        >

        </motion.p>

        {/* Action Buttons */}
        <motion.div
          variants={itemVariants}
          className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto"
        >
          <Button
            asChild
            size="lg"
            className="h-12 px-8 rounded-full bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 text-white shadow-lg shadow-indigo-500/25 transition-all hover:scale-105"
          >
            <Link href="/">
              <Home className="mr-2 h-4 w-4" />
              Back to Home
            </Link>
          </Button>

          <Button
            onClick={() => router.back()}
            variant="outline"
            size="lg"
            className="h-12 px-8 rounded-full border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 backdrop-blur-sm transition-all"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Go Back
          </Button>
        </motion.div>

        {/* Footer Support Links */}
        <motion.div
          variants={itemVariants}
          className="mt-12 pt-8 border-t border-slate-200/60 dark:border-slate-800/60 flex items-center justify-center gap-6 text-sm font-medium text-slate-500 dark:text-slate-500"
        >
          <Link href="/contact" className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors flex items-center gap-1.5">
            <FileSearch className="w-4 h-4" />
            Report a bug
          </Link>

        </motion.div>
      </motion.div>
    </div>
  );
}
