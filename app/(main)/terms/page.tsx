"use client";

import React, { useState, useEffect } from 'react';
import { Scale, FileText, AlertTriangle, CreditCard, ShieldCheck, UserX, Gavel, BookOpen, Mail, ChevronRight, Moon, Sun } from 'lucide-react';

export default function TermsPage() {
  const [activeSection, setActiveSection] = useState('acceptance');
  const [theme, setTheme] = useState<'light' | 'dark'>('light');

  useEffect(() => {
    // Check for saved theme preference or default to system preference
    const savedTheme = localStorage.getItem('theme') as 'light' | 'dark' | null;
    const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    const initialTheme = savedTheme || systemTheme;
    
    setTheme(initialTheme);
    document.documentElement.classList.toggle('dark', initialTheme === 'dark');
  }, []);

  useEffect(() => {
    const handleScroll = () => {
      const sections = document.querySelectorAll('section[id]');
      sections.forEach((section) => {
        const rect = section.getBoundingClientRect();
        if (rect.top <= 150 && rect.bottom >= 150) {
          setActiveSection(section.id);
        }
      });
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    localStorage.setItem('theme', newTheme);
    document.documentElement.classList.toggle('dark', newTheme === 'dark');
  };

  const scrollToSection = (sectionId: string) => {
    const element = document.getElementById(sectionId);
    if (element) {
      const offset = 100;
      const elementPosition = element.getBoundingClientRect().top;
      const offsetPosition = elementPosition + window.pageYOffset - offset;
      
      window.scrollTo({
        top: offsetPosition,
        behavior: 'smooth'
      });
    }
  };

  const tableOfContents = [
    { id: 'acceptance', title: 'Acceptance of Terms', icon: Scale },
    { id: 'service', title: 'Service Overview', icon: FileText },
    { id: 'accounts', title: 'User Accounts', icon: ShieldCheck },
    { id: 'responsibilities', title: 'User Responsibilities', icon: AlertTriangle },
    { id: 'content', title: 'Use of Uploaded Content', icon: BookOpen },
    { id: 'payments', title: 'Payments & Billing', icon: CreditCard },
    { id: 'intellectual', title: 'Intellectual Property', icon: Gavel },
    { id: 'termination', title: 'Termination', icon: UserX },
    { id: 'liability', title: 'Limitation of Liability', icon: ShieldCheck },
    { id: 'contact', title: 'Contact', icon: Mail },
  ];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-300">
      {/* Theme Toggle Button */}
      

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 dark:text-white mb-4">
            Terms & Conditions
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-300">
            Last updated: November 26, 2025
          </p>
        </div>

        <div className="flex flex-col lg:flex-row gap-8">
          {/* Table of Contents - Sidebar */}
          <aside className="lg:w-64 flex-shrink-0">
            <div className="lg:sticky lg:top-24">
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4 transition-colors duration-300">
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3 uppercase tracking-wide">
                  Contents
                </h3>
                <nav className="space-y-1">
                  {tableOfContents.map((item) => {
                    const Icon = item.icon;
                    return (
                      <button
                        key={item.id}
                        onClick={() => scrollToSection(item.id)}
                        className={`w-full flex items-center gap-2 px-3 py-2 text-sm rounded-md transition-all ${
                          activeSection === item.id
                            ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 font-medium'
                            : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50'
                        }`}
                      >
                        <Icon className="w-4 h-4 flex-shrink-0" />
                        <span className="text-left">{item.title}</span>
                      </button>
                    );
                  })}
                </nav>
              </div>
            </div>
          </aside>

          {/* Main Content Area */}
          <main className="flex-1 max-w-3xl">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-8 md:p-12 transition-colors duration-300">
              
              {/* Acceptance of Terms */}
              <section id="acceptance" className="mb-12 scroll-mt-24">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg">
                    <Scale className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
                  </div>
                  <h2 className="text-3xl font-bold text-gray-900 dark:text-white">Acceptance of Terms</h2>
                </div>
                <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                  By using ShortlistAI, you agree to these Terms & Conditions. If you do not agree, discontinue use of the platform.
                </p>
              </section>

              {/* Service Overview */}
              <section id="service" className="mb-12 scroll-mt-24">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                    <FileText className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                  </div>
                  <h2 className="text-3xl font-bold text-gray-900 dark:text-white">Service Overview</h2>
                </div>
                <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-4">
                  ShortlistAI is a web application by <strong>Mindmach Technologies</strong> that allows users to upload documents and receive AI-powered insights, matching, and analysis.
                </p>
                <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                  We reserve the right to modify, enhance, or discontinue any part of the service.
                </p>
              </section>

              {/* User Accounts */}
              <section id="accounts" className="mb-12 scroll-mt-24">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                    <ShieldCheck className="w-6 h-6 text-green-600 dark:text-green-400" />
                  </div>
                  <h2 className="text-3xl font-bold text-gray-900 dark:text-white">User Accounts</h2>
                </div>
                <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-4">
                  You must create an account to use the service.
                </p>
                <div className="p-4 bg-green-50 dark:bg-green-900/20 border-l-4 border-green-500 dark:border-green-400 rounded">
                  <p className="text-sm text-green-900 dark:text-green-300">
                    <strong>Important:</strong> You are responsible for maintaining the confidentiality of your login credentials and all activity under your account.
                  </p>
                </div>
              </section>

              {/* User Responsibilities */}
              <section id="responsibilities" className="mb-12 scroll-mt-24">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg">
                    <AlertTriangle className="w-6 h-6 text-yellow-600 dark:text-yellow-400" />
                  </div>
                  <h2 className="text-3xl font-bold text-gray-900 dark:text-white">User Responsibilities</h2>
                </div>
                <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-4">
                  You agree not to:
                </p>
                <ul className="space-y-3 ml-5">
                  <li className="text-gray-700 dark:text-gray-300 leading-relaxed flex items-start">
                    <ChevronRight className="w-5 h-5 text-indigo-600 dark:text-indigo-400 mr-2 flex-shrink-0 mt-0.5" />
                    <span>Upload unlawful, harmful, or copyrighted material without permission</span>
                  </li>
                  <li className="text-gray-700 dark:text-gray-300 leading-relaxed flex items-start">
                    <ChevronRight className="w-5 h-5 text-indigo-600 dark:text-indigo-400 mr-2 flex-shrink-0 mt-0.5" />
                    <span>Attempt to reverse engineer, bypass access controls, or misuse the service</span>
                  </li>
                  <li className="text-gray-700 dark:text-gray-300 leading-relaxed flex items-start">
                    <ChevronRight className="w-5 h-5 text-indigo-600 dark:text-indigo-400 mr-2 flex-shrink-0 mt-0.5" />
                    <span>Deploy the system for fraudulent, discriminatory, or abusive purposes</span>
                  </li>
                </ul>
              </section>

              {/* Use of Uploaded Content */}
              <section id="content" className="mb-12 scroll-mt-24">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                    <BookOpen className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                  </div>
                  <h2 className="text-3xl font-bold text-gray-900 dark:text-white">Use of Uploaded Content</h2>
                </div>
                <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-4">
                  By uploading content (CVs, JDs, text, etc.), you grant Mindmach Technologies a licence to:
                </p>
                <ul className="space-y-3 ml-5 mb-4">
                  <li className="text-gray-700 dark:text-gray-300 leading-relaxed flex items-start">
                    <ChevronRight className="w-5 h-5 text-indigo-600 dark:text-indigo-400 mr-2 flex-shrink-0 mt-0.5" />
                    <span>Process the content for generating outputs</span>
                  </li>
                  <li className="text-gray-700 dark:text-gray-300 leading-relaxed flex items-start">
                    <ChevronRight className="w-5 h-5 text-indigo-600 dark:text-indigo-400 mr-2 flex-shrink-0 mt-0.5" />
                    <span>Use anonymised versions for improving product performance</span>
                  </li>
                </ul>
                <div className="p-4 bg-purple-50 dark:bg-purple-900/20 border-l-4 border-purple-500 dark:border-purple-400 rounded">
                  <p className="text-sm text-purple-900 dark:text-purple-300">
                    We do not share raw content with advertisers or sell your data.
                  </p>
                </div>
              </section>

              {/* Payments & Billing */}
              <section id="payments" className="mb-12 scroll-mt-24">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 bg-teal-100 dark:bg-teal-900/30 rounded-lg">
                    <CreditCard className="w-6 h-6 text-teal-600 dark:text-teal-400" />
                  </div>
                  <h2 className="text-3xl font-bold text-gray-900 dark:text-white">Payments & Billing</h2>
                </div>
                <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-4">
                  Paid plans may apply and are billed according to prices displayed within the product.
                </p>
                <ul className="space-y-3 ml-5 mb-4">
                  <li className="text-gray-700 dark:text-gray-300 leading-relaxed flex items-start">
                    <ChevronRight className="w-5 h-5 text-indigo-600 dark:text-indigo-400 mr-2 flex-shrink-0 mt-0.5" />
                    <span>We may modify pricing with prior notice</span>
                  </li>
                  <li className="text-gray-700 dark:text-gray-300 leading-relaxed flex items-start">
                    <ChevronRight className="w-5 h-5 text-indigo-600 dark:text-indigo-400 mr-2 flex-shrink-0 mt-0.5" />
                    <span>Taxes may be applicable depending on your jurisdiction</span>
                  </li>
                </ul>
                
                <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-3 mt-6">Refunds</h3>
                <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-3">
                  Refund eligibility, if offered, will follow the policy stated on our pricing page.
                </p>
                <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                  Content generated or processed through the platform is non-returnable.
                </p>
              </section>

              {/* Intellectual Property */}
              <section id="intellectual" className="mb-12 scroll-mt-24">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-lg">
                    <Gavel className="w-6 h-6 text-red-600 dark:text-red-400" />
                  </div>
                  <h2 className="text-3xl font-bold text-gray-900 dark:text-white">Intellectual Property</h2>
                </div>
                <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-4">
                  All technology, algorithms, designs, and service content are owned by <strong>Mindmach Technologies</strong>.
                </p>
                <div className="p-4 bg-red-50 dark:bg-red-900/20 border-l-4 border-red-500 dark:border-red-400 rounded">
                  <p className="text-sm text-red-900 dark:text-red-300">
                    <strong>Important:</strong> Users may not copy, redistribute, or commercially exploit the platform without permission.
                  </p>
                </div>
              </section>

              {/* Termination */}
              <section id="termination" className="mb-12 scroll-mt-24">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 bg-orange-100 dark:bg-orange-900/30 rounded-lg">
                    <UserX className="w-6 h-6 text-orange-600 dark:text-orange-400" />
                  </div>
                  <h2 className="text-3xl font-bold text-gray-900 dark:text-white">Termination</h2>
                </div>
                <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-4">
                  We may suspend or terminate accounts that violate these Terms, misuse the platform, or pose security risks.
                </p>
                <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                  Users may close their accounts at any time by contacting support.
                </p>
              </section>

              {/* Limitation of Liability */}
              <section id="liability" className="mb-12 scroll-mt-24">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 bg-pink-100 dark:bg-pink-900/30 rounded-lg">
                    <ShieldCheck className="w-6 h-6 text-pink-600 dark:text-pink-400" />
                  </div>
                  <h2 className="text-3xl font-bold text-gray-900 dark:text-white">Limitation of Liability</h2>
                </div>
                <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-4">
                  ShortlistAI is provided on an <strong>&quot;as is&quot;</strong> and <strong>&quot;as available&quot;</strong> basis.
                </p>
                <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-4">
                  Mindmach Technologies is not liable for:
                </p>
                <ul className="space-y-3 ml-5 mb-4">
                  <li className="text-gray-700 dark:text-gray-300 leading-relaxed flex items-start">
                    <ChevronRight className="w-5 h-5 text-indigo-600 dark:text-indigo-400 mr-2 flex-shrink-0 mt-0.5" />
                    <span>Loss of data</span>
                  </li>
                  <li className="text-gray-700 dark:text-gray-300 leading-relaxed flex items-start">
                    <ChevronRight className="w-5 h-5 text-indigo-600 dark:text-indigo-400 mr-2 flex-shrink-0 mt-0.5" />
                    <span>Business interruption</span>
                  </li>
                  <li className="text-gray-700 dark:text-gray-300 leading-relaxed flex items-start">
                    <ChevronRight className="w-5 h-5 text-indigo-600 dark:text-indigo-400 mr-2 flex-shrink-0 mt-0.5" />
                    <span>Errors in AI-generated output</span>
                  </li>
                  <li className="text-gray-700 dark:text-gray-300 leading-relaxed flex items-start">
                    <ChevronRight className="w-5 h-5 text-indigo-600 dark:text-indigo-400 mr-2 flex-shrink-0 mt-0.5" />
                    <span>Indirect, incidental, or consequential damages</span>
                  </li>
                </ul>
                <div className="p-4 bg-pink-50 dark:bg-pink-900/20 border-l-4 border-pink-500 dark:border-pink-400 rounded">
                  <p className="text-sm text-pink-900 dark:text-pink-300">
                    Your use of the platform is at your own discretion and risk.
                  </p>
                </div>
              </section>

              {/* Governing Law */}
              <section id="governing" className="mb-12 scroll-mt-24">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg">
                    <Gavel className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
                  </div>
                  <h2 className="text-3xl font-bold text-gray-900 dark:text-white">Governing Law</h2>
                </div>
                <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                  These Terms are governed by the applicable laws of <strong>India</strong> unless otherwise required by local regulations.
                </p>
                <p className="text-gray-700 pt-2 dark:text-gray-300 leading-relaxed">
                 ShortlistAI.xyz is a product built and operated by MindMach Technologies Private Limited.
                </p>
              </section>

              {/* Contact Section */}
              <section id="contact" className="scroll-mt-24">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                    <Mail className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                  </div>
                  <h2 className="text-3xl font-bold text-gray-900 dark:text-white">Contact</h2>
                </div>
                
                <div className="bg-gradient-to-br from-indigo-50 to-blue-50 dark:from-indigo-900/20 dark:to-blue-900/20 rounded-lg p-6 border border-indigo-100 dark:border-indigo-800">
                  <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-4">
                    For support or legal queries:
                  </p>
                  <div className="space-y-2">
                    <p className="text-gray-900 dark:text-white font-semibold">Mindmach Technologies</p>
                    <p className="text-gray-700 dark:text-gray-300">
                      Email: <a href="mailto:hello@shortlistAI.xyz" 
                      className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 font-medium underline">
                        hello@shortlistAI.xyz
                      </a>
                    </p>
                  </div>
                </div>
              </section>

            </div>

            {/* Privacy Policy Preview Card */}
            <div className="mt-8 bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 transition-colors duration-300">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
                    Privacy Policy
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Learn how we collect, use, and protect your personal data
                  </p>
                </div>
                <a 
                  href="/privacy" 
                  className="px-4 py-2 bg-indigo-600 dark:bg-indigo-500 text-white rounded-lg hover:bg-indigo-700 dark:hover:bg-indigo-600 transition-colors flex items-center gap-2"
                >
                  View Privacy
                  <ChevronRight className="w-4 h-4" />
                </a>
              </div>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
