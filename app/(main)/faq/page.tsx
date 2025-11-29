"use client";

import { useState } from "react";
import Link from "next/link";

const FAQ_ITEMS = [
  {
    question: "What is an ATS resume checker?",
    answer: (
      <>
        An <strong>ATS (Applicant Tracking System) resume checker</strong> analyzes your resume for how well it will perform when scanned by automated hiring software used by most large companies. It evaluates keyword matches, formatting compatibility, and provides an <strong>ATS score</strong>. ShortlistAI's AI-powered checker compares your resume against job descriptions, giving a <strong>callback probability percentage</strong> and optimization tips instantly.
      </>
    ),
  },
  {
    question: "How does ATS software work in 2025?",
    answer: (
      <>
        Modern <strong>ATS software</strong> uses advanced semantic analysis and AI to scan resumes beyond exact keyword matching. It understands context, synonyms, and ranks candidates by skills, education, job titles, certifications, and experience. An <strong>ATS-friendly resume format</strong> is critical to avoid misreading by these systems.
      </>
    ),
  },
  {
    question: "Do I really need an ATS-optimized resume?",
    answer: (
      <>
        Absolutely. Over <strong>75% of resumes are rejected</strong> before human review at companies with over 50 employees. An <strong>ATS-friendly resume</strong> ensures your qualifications are detected properly. <Link href="https://shortlistai.xyz/" className="text-indigo-500 dark:text-indigo-300 underline">ShortlistAI</Link> shows what keywords and formatting changes you need.
      </>
    ),
  },
  {
    question: "What keywords should I include in my resume?",
    answer: (
      <>
        Use <strong>exact phrases</strong> from the job description focused on hard skills, certifications, and tools. For tech roles, include programming languages and frameworks; for marketing roles, include terms like SEO and analytics. <Link href="https://shortlistai.xyz/" className="text-indigo-500 dark:text-indigo-300 underline">ShortlistAI</Link> automatically detects missing keywords.
      </>
    ),
  },
  {
    question: "How accurate is ShortlistAI's ATS analysis?",
    answer: (
      <>
        ShortlistAI's AI models predict ATS compatibility with <strong>95%+ accuracy</strong>, analyzing structure, keyword density, and context. It estimates callback chances using real hiring trend data focused on Indian tech candidates targeting global roles.
      </>
    ),
  },
  {
    question: "Is ShortlistAI free to use?",
    answer: (
      <>
        Yes. <strong>ShortlistAI is free</strong> with no signup. Paste your resume and job description for instant analysis. Premium plans for unlimited scans and coaching are also available for Indian job seekers.
      </>
    ),
  },
];

export default function FaqPage() {
  const [search, setSearch] = useState("");

  // Filter FAQs by search input (questions only now)
  const filteredFaqs = FAQ_ITEMS.filter(
    (item) =>
      search.trim() === "" ||
      item.question.toLowerCase().includes(search.trim().toLowerCase()) ||
      item.answer.toString().toLowerCase().includes(search.trim().toLowerCase())
  );

  return (
    <main className="min-h-screen bg-gradient-to-br from-[#e8ebf9] to-[#f6f8fc] dark:from-[#171936] dark:to-[#23243a] px-4 py-12 sm:px-8 flex justify-center">
      <section className="w-full max-w-5xl backdrop-blur-xl bg-white/70 dark:bg-[#1a1c2d]/60 rounded-3xl shadow-2xl p-6 sm:p-12 border border-white/30 dark:border-white/20 transition-colors duration-500">
        <header className="mb-12 text-center max-w-3xl mx-auto">
          <h2 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-[#22223b] dark:text-white leading-tight">
            Frequently Asked Questions About ATS Resume Checkers
          </h2>
          <p className="mt-6 text-sm text-[#4a4e69] dark:text-white/80 max-w-xl mx-auto leading-relaxed">
            Get clear, actionable answers about ATS optimization for your resume.
          </p>
        </header>

        {/* Search only */}
        <div className="flex items-center justify-end mb-10">
          <div className="flex items-center max-w-xs w-full ml-auto">
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search questions..."
              className="w-full py-2 pl-4 pr-10 rounded-full bg-white/70 dark:bg-[#23243a]/80 border border-[#c9cbe0]/50 dark:border-[#23243a] text-[#22223b] dark:text-white placeholder-[#9a9ab3] dark:placeholder-white/50 transition-all focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
            />
            <span className="-ml-8 pointer-events-none">
              <svg
                className="w-5 h-5 text-[#9a9ab3] dark:text-white/50"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M21 21l-4.35-4.35M11 17a6 6 0 100-12 6 6 0 000 12z"
                ></path>
              </svg>
            </span>
          </div>
        </div>

        {/* FAQ List */}
        <div className="flex flex-col space-y-4">
          {filteredFaqs.length === 0 && (
            <p className="text-center text-[#4a4e69] dark:text-white/60">No questions found.</p>
          )}
          {filteredFaqs.map(({ question, answer }, idx) => (
            <details
              key={idx}
              className="group transition hover:bg-[#f2eefc]/60 dark:hover:bg-indigo-900/10 rounded-2xl px-5 py-5 border border-[#f0ebfc]/50 dark:border-white/10"
            >
              <summary className="flex items-center cursor-pointer list-none text-lg font-semibold text-[#22223b] dark:text-white select-none group-open:text-indigo-600 dark:group-open:text-indigo-400">
                <span className="inline-block mr-3">
                  <svg
                    className="w-5 h-5 text-indigo-600 dark:text-indigo-400 shrink-0 transition-transform group-open:rotate-90"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M9 5l7 7-7 7"
                    />
                  </svg>
                </span>
                {question}
              </summary>
              <div className="mt-4 ml-8 text-[#2d3256] dark:text-white/90 text-base leading-relaxed">
                {answer}
              </div>
            </details>
          ))}
        </div>
      </section>
    </main>
  );
}
