"use client";

import { Github, Mail } from "lucide-react";
import Link from "next/link";

export function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="w-full border-t border-gray-200 dark:border-gray-700/30 backdrop-blur-xl bg-white/80 dark:bg-gray-900/80 shadow-sm">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-3">
        <div className="flex flex-col sm:flex-row items-center sm:justify-between gap-3 text-sm text-gray-600 dark:text-gray-400">
          {/* Left: Copyright & Quick Links */}
          <div className="flex flex-col sm:flex-row items-center gap-3 sm:gap-6">
            <p className="text-xs sm:text-sm">
              © {currentYear} ShortlistAI.xyz. A brand of MindMach Technologies Pvt Ltd. All rights reserved
            </p>

            <div className="flex items-center gap-4">
              <Link
                href="/privacy"
                className="relative text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors text-xs sm:text-sm group"
              >
                Privacy
                <span className="absolute left-0 -bottom-1 h-[2px] w-0 bg-gradient-to-r from-blue-500 to-purple-500 transition-all group-hover:w-full" />
              </Link>
              <Link
                href="/terms"
                className="relative text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors text-xs sm:text-sm group"
              >
                Terms
                <span className="absolute left-0 -bottom-1 h-[2px] w-0 bg-gradient-to-r from-blue-500 to-purple-500 transition-all group-hover:w-full" />
              </Link>
              <Link
                href="/contact"
                className="relative text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors text-xs sm:text-sm group"
              >
                Contact
                <span className="absolute left-0 -bottom-1 h-[2px] w-0 bg-gradient-to-r from-blue-500 to-purple-500 transition-all group-hover:w-full" />
              </Link>
              <Link
                href="/faq"
                className="relative text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors text-xs sm:text-sm group"
              >
                FAQ's
                <span className="absolute left-0 -bottom-1 h-[2px] w-0 bg-gradient-to-r from-blue-500 to-purple-500 transition-all group-hover:w-full" />
              </Link>
            </div>
          </div>

          {/* Right: Social Icons */}
          <div className="flex items-center gap-3">
            <Link
              href="mailto:shambhuraj960410054@gmail.com"
              aria-label="Email"
              className="text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors"
            >
              <Mail className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
