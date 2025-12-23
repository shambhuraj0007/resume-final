'use client';

import { Check, Sparkles, ArrowRight } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';

interface UpgradeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  // onSuccess prop is no longer strictly needed here since we redirect, 
  // but kept for compatibility if you use it elsewhere
  onSuccess?: () => void;
}

export default function UpgradeModal({ open, onOpenChange }: UpgradeModalProps) {
  const router = useRouter();

  const handleRedirect = () => {
    onOpenChange(false);
    // Optional: Add a small delay for the modal close animation before pushing
    setTimeout(() => {
      router.push('/pricing');
    }, 200);
  };

  const benefits = [
    "more Resume Scans",
    "Detailed ATS Score & Match %",
    "Keyword Gap Analysis",
    "Unlimited PDF Downloads",
    "Priority Support"
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px] p-0 border-0 overflow-hidden rounded-3xl bg-white dark:bg-slate-950 shadow-2xl">

        {/* Decorative Header Background */}
        <div className="relative h-32 bg-gradient-to-br from-blue-600 via-indigo-600 to-violet-600 overflow-hidden">
          <div className="absolute inset-0 bg-[url('/grid-pattern.svg')] opacity-20" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-24 h-24 bg-white/20 rounded-full blur-3xl" />

          <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-white dark:from-slate-950 to-transparent" />

          <div className="absolute inset-0 flex items-center justify-center">
            <div className="bg-white/10 backdrop-blur-md p-3 rounded-2xl border border-white/20 shadow-xl">
              <Sparkles className="h-8 w-8 text-yellow-300 fill-yellow-300" />
            </div>
          </div>
        </div>

        <div className="px-8 pb-8 pt-2 text-center relative z-10">
          <DialogHeader>
            <DialogTitle className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white mb-2">
              Unlock Full <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-violet-600">Potential</span>
            </DialogTitle>
            <p className="text-slate-500 dark:text-slate-400 text-sm">
              Upgrade now to remove all restrictions and land your dream job faster.
            </p>
          </DialogHeader>

          <div className="mt-8 space-y-4">
            {/* Benefits List */}
            <div className="bg-slate-50 dark:bg-slate-900/50 rounded-2xl p-5 border border-slate-100 dark:border-slate-800 text-left">
              <ul className="space-y-3">
                {benefits.map((benefit, index) => (
                  <motion.li
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.1 + index * 0.1 }}
                    key={index}
                    className="flex items-center gap-3 text-sm font-medium text-slate-700 dark:text-slate-300"
                  >
                    <div className="h-5 w-5 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center flex-shrink-0">
                      <Check className="h-3 w-3 text-green-600 dark:text-green-400 stroke-[3]" />
                    </div>
                    {benefit}
                  </motion.li>
                ))}
              </ul>
            </div>

            <Button
              onClick={handleRedirect}
              className="w-full h-14 text-lg font-bold rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-lg shadow-blue-500/25 transition-all hover:scale-[1.02] active:scale-[0.98] group"
            >
              View Upgrade Options
              <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
            </Button>

            <button
              onClick={() => onOpenChange(false)}
              className="text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 font-medium transition-colors"
            >
              Maybe later
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
