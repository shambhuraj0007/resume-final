"use client";

import React, { useState, useEffect } from 'react';
import { Shield, Lock, Eye, Mail, FileText, Users, AlertCircle, ChevronRight, Moon, Sun } from 'lucide-react';

export default function PrivacyPage() {
  const [activeSection, setActiveSection] = useState('introduction');
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
    { id: 'introduction', title: 'Introduction', icon: FileText },
    { id: 'information-collect', title: 'Information We Collect', icon: Eye },
    { id: 'usage', title: 'How We Use Your Information', icon: Users },
    { id: 'advertising', title: 'Advertising & Monetisation', icon: AlertCircle },
    { id: 'retention', title: 'Data Retention', icon: Lock },
    { id: 'deletion', title: 'Data Deletion & User Rights', icon: Shield },
    { id: 'sharing', title: 'Sharing of Information', icon: Users },
    { id: 'security', title: 'Security', icon: Lock },
    { id: 'contact', title: 'Contact', icon: Mail },
  ];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-300">


      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 dark:text-white mb-4">
            Privacy Policy
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-300">
            Last updated: November 20, 2025
          </p>
        </div>

        <div className="flex flex-col lg:flex-row gap-8">          {/* Table of Contents - Sidebar */}
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
              
              {/* Introduction Section */}
              <section id="introduction" className="mb-12 scroll-mt-24">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg">
                    <FileText className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
                  </div>
                  <h2 className="text-3xl font-bold text-gray-900 dark:text-white">Introduction</h2>
                </div>
                <div className="prose prose-gray dark:prose-invert max-w-none">
                  <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                    ShortlistAI (&quot;we&quot;, &quot;us&quot;, or &quot;our&quot;) is a product of <strong>Mindmach Technologies</strong>. 
                    This Privacy Policy explains how we collect, use, store, and protect your personal information 
                    when you use our web application.
                  </p>
                  <p className="text-gray-700 dark:text-gray-300 leading-relaxed mt-4">
                    By accessing or using ShortlistAI, you agree to the practices described here.
                  </p>
                </div>
              </section>

              {/* Information We Collect */}
              <section id="information-collect" className="mb-12 scroll-mt-24">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                    <Eye className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                  </div>
                  <h2 className="text-3xl font-bold text-gray-900 dark:text-white">Information We Collect</h2>
                </div>
                
                <div className="space-y-6">
                  <div>
                    <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-3">2.1 User-Provided Data</h3>
                    <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-3">
                      We collect the following information when you use our platform:
                    </p>
                    <ul className="space-y-2 ml-5">
                      <li className="text-gray-700 dark:text-gray-300 leading-relaxed flex items-start">
                        <ChevronRight className="w-5 h-5 text-indigo-600 dark:text-indigo-400 mr-2 flex-shrink-0 mt-0.5" />
                        <span><strong>Uploaded documents:</strong> CVs, resumes, job descriptions, personal inputs, and any text uploaded to the system.</span>
                      </li>
                      <li className="text-gray-700 dark:text-gray-300 leading-relaxed flex items-start">
                        <ChevronRight className="w-5 h-5 text-indigo-600 dark:text-indigo-400 mr-2 flex-shrink-0 mt-0.5" />
                        <span><strong>Account information:</strong> Name, email, and login-related data.</span>
                      </li>
                    </ul>
                    <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 border-l-4 border-blue-500 dark:border-blue-400 rounded">
                      <p className="text-sm text-blue-900 dark:text-blue-300">
                        <strong>Note:</strong> All uploaded files are stored in encrypted form.
                      </p>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-3">2.2 Usage Data</h3>
                    <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                      We collect aggregated, cohort-level information about how users interact with the platform, 
                      including feature usage statistics.
                    </p>
                  </div>

                  <div>
                    <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-3">2.3 Technical Data</h3>
                    <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-3">
                      We automatically collect:
                    </p>
                    <ul className="space-y-2 ml-5">
                      <li className="text-gray-700 dark:text-gray-300 leading-relaxed flex items-start">
                        <ChevronRight className="w-5 h-5 text-indigo-600 dark:text-indigo-400 mr-2 flex-shrink-0 mt-0.5" />
                        <span>IP address and device information</span>
                      </li>
                      <li className="text-gray-700 dark:text-gray-300 leading-relaxed flex items-start">
                        <ChevronRight className="w-5 h-5 text-indigo-600 dark:text-indigo-400 mr-2 flex-shrink-0 mt-0.5" />
                        <span>Browser and system metadata</span>
                      </li>
                      <li className="text-gray-700 dark:text-gray-300 leading-relaxed flex items-start">
                        <ChevronRight className="w-5 h-5 text-indigo-600 dark:text-indigo-400 mr-2 flex-shrink-0 mt-0.5" />
                        <span>Cookies and similar tracking technologies</span>
                      </li>
                    </ul>
                  </div>

                  <div>
                    <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-3">2.4 Third-Party Tools</h3>
                    <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                      We use third-party analytics and operational tools such as Google Analytics and other service 
                      providers for performance monitoring, metrics, and feature improvements.
                    </p>
                  </div>
                </div>
              </section>

              {/* How We Use Your Information */}
              <section id="usage" className="mb-12 scroll-mt-24">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                    <Users className="w-6 h-6 text-green-600 dark:text-green-400" />
                  </div>
                  <h2 className="text-3xl font-bold text-gray-900 dark:text-white">How We Use Your Information</h2>
                </div>
                
                <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-4">
                  We use your data to:
                </p>
                <ul className="space-y-3 ml-5">
                  <li className="text-gray-700 dark:text-gray-300 leading-relaxed flex items-start">
                    <ChevronRight className="w-5 h-5 text-indigo-600 dark:text-indigo-400 mr-2 flex-shrink-0 mt-0.5" />
                    <span>Provide and improve ShortlistAI&apos;s features</span>
                  </li>
                  <li className="text-gray-700 dark:text-gray-300 leading-relaxed flex items-start">
                    <ChevronRight className="w-5 h-5 text-indigo-600 dark:text-indigo-400 mr-2 flex-shrink-0 mt-0.5" />
                    <span>Enhance model performance and service quality (in a privacy-safe, aggregated manner)</span>
                  </li>
                  <li className="text-gray-700 dark:text-gray-300 leading-relaxed flex items-start">
                    <ChevronRight className="w-5 h-5 text-indigo-600 dark:text-indigo-400 mr-2 flex-shrink-0 mt-0.5" />
                    <span>Deliver contextual advertising and personalised content</span>
                  </li>
                  <li className="text-gray-700 dark:text-gray-300 leading-relaxed flex items-start">
                    <ChevronRight className="w-5 h-5 text-indigo-600 dark:text-indigo-400 mr-2 flex-shrink-0 mt-0.5" />
                    <span>Analyse usage patterns to improve product experience</span>
                  </li>
                  <li className="text-gray-700 dark:text-gray-300 leading-relaxed flex items-start">
                    <ChevronRight className="w-5 h-5 text-indigo-600 dark:text-indigo-400 mr-2 flex-shrink-0 mt-0.5" />
                    <span>Communicate updates, feature releases, and transactional emails</span>
                  </li>
                  <li className="text-gray-700 dark:text-gray-300 leading-relaxed flex items-start">
                    <ChevronRight className="w-5 h-5 text-indigo-600 dark:text-indigo-400 mr-2 flex-shrink-0 mt-0.5" />
                    <span>Prevent abuse, security breaches, or misuse of the platform</span>
                  </li>
                </ul>
                
                <div className="mt-6 p-4 bg-green-50 dark:bg-green-900/20 border-l-4 border-green-500 dark:border-green-400 rounded">
                  <p className="text-sm text-green-900 dark:text-green-300 font-medium">
                    We do not sell your personal data.
                  </p>
                  <p className="text-sm text-green-900 dark:text-green-300 mt-2">
                    We may, however, use your data to power future monetisation strategies such as 
                    contextual advertising and insights.
                  </p>
                </div>
              </section>

              {/* Advertising and Monetisation */}
              <section id="advertising" className="mb-12 scroll-mt-24">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg">
                    <AlertCircle className="w-6 h-6 text-yellow-600 dark:text-yellow-400" />
                  </div>
                  <h2 className="text-3xl font-bold text-gray-900 dark:text-white">Advertising & Monetisation</h2>
                </div>
                
                <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-4">
                  We may show ads within the product or through partner ecosystems using:
                </p>
                <ul className="space-y-3 ml-5">
                  <li className="text-gray-700 dark:text-gray-300 leading-relaxed flex items-start">
                    <ChevronRight className="w-5 h-5 text-indigo-600 dark:text-indigo-400 mr-2 flex-shrink-0 mt-0.5" />
                    <span>Contextual advertising (based on content, not personal identity)</span>
                  </li>
                  <li className="text-gray-700 dark:text-gray-300 leading-relaxed flex items-start">
                    <ChevronRight className="w-5 h-5 text-indigo-600 dark:text-indigo-400 mr-2 flex-shrink-0 mt-0.5" />
                    <span>Third-party ad networks that may process technical or cookie-level information</span>
                  </li>
                </ul>
                
                <div className="mt-4 p-4 bg-yellow-50 dark:bg-yellow-900/20 border-l-4 border-yellow-500 dark:border-yellow-400 rounded">
                  <p className="text-sm text-yellow-900 dark:text-yellow-300">
                    We do not provide direct access to your uploaded documents or identifiable data to advertisers.
                  </p>
                </div>
              </section>

              {/* Data Retention */}
              <section id="retention" className="mb-12 scroll-mt-24">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                    <Lock className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                  </div>
                  <h2 className="text-3xl font-bold text-gray-900 dark:text-white">Data Retention</h2>
                </div>
                
                <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                  We retain collected data <strong>indefinitely</strong> unless you request deletion. 
                  Uploaded files, account details, and usage logs are stored securely using industry-standard encryption.
                </p>
              </section>

              {/* Data Deletion & User Rights */}
              <section id="deletion" className="mb-12 scroll-mt-24">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-lg">
                    <Shield className="w-6 h-6 text-red-600 dark:text-red-400" />
                  </div>
                  <h2 className="text-3xl font-bold text-gray-900 dark:text-white">Data Deletion & User Rights</h2>
                </div>
                
                <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-4">
                  You may request:
                </p>
                <ul className="space-y-3 ml-5 mb-4">
                  <li className="text-gray-700 dark:text-gray-300 leading-relaxed flex items-start">
                    <ChevronRight className="w-5 h-5 text-indigo-600 dark:text-indigo-400 mr-2 flex-shrink-0 mt-0.5" />
                    <span>Data deletion</span>
                  </li>
                  <li className="text-gray-700 dark:text-gray-300 leading-relaxed flex items-start">
                    <ChevronRight className="w-5 h-5 text-indigo-600 dark:text-indigo-400 mr-2 flex-shrink-0 mt-0.5" />
                    <span>Correction of inaccurate information</span>
                  </li>
                  <li className="text-gray-700 dark:text-gray-300 leading-relaxed flex items-start">
                    <ChevronRight className="w-5 h-5 text-indigo-600 dark:text-indigo-400 mr-2 flex-shrink-0 mt-0.5" />
                    <span>Access to stored personal information</span>
                  </li>
                </ul>
                
                <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                  To exercise these rights, email us at: <a href="mailto:hello@shortlistAI.xyz" 
                  className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 font-medium underline">hello@shortlistAI.xyz</a>
                </p>
                <p className="text-gray-700 dark:text-gray-300 leading-relaxed mt-3">
                  We will respond within reasonable timelines.
                </p>
              </section>

              {/* Sharing of Information */}
              <section id="sharing" className="mb-12 scroll-mt-24">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 bg-teal-100 dark:bg-teal-900/30 rounded-lg">
                    <Users className="w-6 h-6 text-teal-600 dark:text-teal-400" />
                  </div>
                  <h2 className="text-3xl font-bold text-gray-900 dark:text-white">Sharing of Information</h2>
                </div>
                
                <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-4">
                  We may share limited data with trusted partners who assist us in delivering the service, including:
                </p>
                <ul className="space-y-3 ml-5 mb-4">
                  <li className="text-gray-700 dark:text-gray-300 leading-relaxed flex items-start">
                    <ChevronRight className="w-5 h-5 text-indigo-600 dark:text-indigo-400 mr-2 flex-shrink-0 mt-0.5" />
                    <span>Analytics providers</span>
                  </li>
                  <li className="text-gray-700 dark:text-gray-300 leading-relaxed flex items-start">
                    <ChevronRight className="w-5 h-5 text-indigo-600 dark:text-indigo-400 mr-2 flex-shrink-0 mt-0.5" />
                    <span>Cloud infrastructure and hosting vendors</span>
                  </li>
                  <li className="text-gray-700 dark:text-gray-300 leading-relaxed flex items-start">
                    <ChevronRight className="w-5 h-5 text-indigo-600 dark:text-indigo-400 mr-2 flex-shrink-0 mt-0.5" />
                    <span>Advertising partners</span>
                  </li>
                </ul>
                
                <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-4">
                  All third parties operate under strict confidentiality and data-protection agreements.
                </p>
                
                <div className="p-4 bg-teal-50 dark:bg-teal-900/20 border-l-4 border-teal-500 dark:border-teal-400 rounded">
                  <p className="text-sm text-teal-900 dark:text-teal-300 font-medium">
                    We do not sell personal data or grant access to user-uploaded documents.
                  </p>
                </div>
              </section>

              {/* Security */}
              <section id="security" className="mb-12 scroll-mt-24">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg">
                    <Lock className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
                  </div>
                  <h2 className="text-3xl font-bold text-gray-900 dark:text-white">Security</h2>
                </div>
                
                <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                  We use technical and organisational measures including encryption, access controls, monitoring, 
                  and audit logs to protect your data from unauthorised access or misuse.
                </p>
              </section>

              {/* Contact Section */}
              <section id="contact" className="scroll-mt-24">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 bg-pink-100 dark:bg-pink-900/30 rounded-lg">
                    <Mail className="w-6 h-6 text-pink-600 dark:text-pink-400" />
                  </div>
                  <h2 className="text-3xl font-bold text-gray-900 dark:text-white">Contact</h2>
                </div>
                
                <div className="bg-gradient-to-br from-indigo-50 to-blue-50 dark:from-indigo-900/20 dark:to-blue-900/20 rounded-lg p-6 border border-indigo-100 dark:border-indigo-800">
                  <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-4">
                    For privacy concerns or deletion requests:
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

            {/* Terms & Conditions Preview Card */}
            <div className="mt-8 bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 transition-colors duration-300">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
                    Terms & Conditions
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Read our complete terms of service and user agreement
                  </p>
                </div>
                <a 
                  href="/terms" 
                  className="px-4 py-2 bg-indigo-600 dark:bg-indigo-500 text-white rounded-lg hover:bg-indigo-700 dark:hover:bg-indigo-600 transition-colors flex items-center gap-2"
                >
                  View Terms
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
