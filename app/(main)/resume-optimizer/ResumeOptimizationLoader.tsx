"use client";

import { useState, useEffect } from "react";
import { Sparkles, Zap, CheckCircle, FileText, Brain, Target, TrendingUp, Rocket, Wand2, RefreshCw } from "lucide-react";

interface LoaderText {
  id: string;
  text: string;
  icon: JSX.Element;
}

export default function ResumeOptimizationLoader() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFinished, setIsFinished] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      sessionStorage.removeItem("optimizerLoaderCurrentIndex");
      sessionStorage.removeItem("optimizerLoaderIsFinished");
    }
  }, []);

  const loaderTexts: LoaderText[] = [
    { id: "1", text: "Analyzing Resume Structure", icon: <FileText className="w-5 h-5" /> },
    { id: "2", text: "Applying AI Suggestions", icon: <Brain className="w-5 h-5" /> },
    { id: "3", text: "Integrating Keywords", icon: <Target className="w-5 h-5" /> },
    { id: "4", text: "Optimizing Experience Section", icon: <Sparkles className="w-5 h-5" /> },
    { id: "5", text: "Enhancing Skills Section", icon: <Zap className="w-5 h-5" /> },
    { id: "6", text: "Refining Professional Summary", icon: <Wand2 className="w-5 h-5" /> },
    { id: "7", text: "ATS-Optimizing Format", icon: <RefreshCw className="w-5 h-5" /> },
    { id: "8", text: "Calculating Score Improvement", icon: <TrendingUp className="w-5 h-5" /> },
    { id: "9", text: "Finalizing Resume", icon: <Rocket className="w-5 h-5" /> },
    { id: "10", text: "Resume Optimized!", icon: <CheckCircle className="w-5 h-5" /> },
  ];

  useEffect(() => {
    if (isFinished) return;

    const interval = setInterval(() => {
      setCurrentIndex((prev) => {
        if (prev === loaderTexts.length - 1) {
          setIsFinished(true);
          return prev;
        }
        return prev + 1;
      });
    }, 3500); // 2 seconds per step (total ~20 seconds)

    return () => clearInterval(interval);
  }, [isFinished, loaderTexts.length]);

  const currentText = loaderTexts[currentIndex];
  const progress = ((currentIndex + 1) / loaderTexts.length) * 100;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-10 flex items-center justify-center p-4">
      <style>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: scale(0.9);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }

        @keyframes gentleFloat {
          0%, 100% {
            transform: translateY(0);
          }
          50% {
            transform: translateY(-10px);
          }
        }

        @keyframes softPulse {
          0%, 100% {
            opacity: 0.5;
          }
          50% {
            opacity: 1;
          }
        }

        @keyframes smoothRotate {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }

        @keyframes iconPop {
          0%, 100% {
            transform: scale(1);
          }
          50% {
            transform: scale(1.2);
          }
        }

        .fade-in {
          animation: fadeIn 0.4s ease-out forwards;
        }

        .gentle-float {
          animation: gentleFloat 3.5s ease-in-out infinite;
        }

        .soft-pulse {
          animation: softPulse 2s ease-in-out infinite;
        }

        .smooth-rotate {
          animation: smoothRotate 20s linear infinite;
        }

        .icon-pop {
          animation: iconPop 0.6s ease-in-out;
        }

        .progress-ring {
          transition: stroke-dashoffset 0.5s cubic-bezier(0.4, 0, 0.2, 1);
        }
      `}</style>

      {/* Main Circle Container */}
      <div className="relative w-96 h-96 gentle-float">
        
        {/* SVG Circle - Progress Ring */}
        <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 200 200">
          <defs>
            <linearGradient id="optimizerGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#10b981" />
              <stop offset="50%" stopColor="#14b8a6" />
              <stop offset="100%" stopColor="#06b6d4" />
            </linearGradient>
            <filter id="optimizerGlow">
              <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
              <feMerge>
                <feMergeNode in="coloredBlur"/>
                <feMergeNode in="SourceGraphic"/>
              </feMerge>
            </filter>
          </defs>
          
          {/* Background Circle */}
          <circle
            cx="100"
            cy="100"
            r="90"
            fill="rgba(15, 23, 42, 0.95)"
            stroke="rgba(16, 185, 129, 0.15)"
            strokeWidth="2"
          />
          
          {/* Progress Circle */}
          <circle
            cx="100"
            cy="100"
            r="85"
            fill="none"
            stroke="url(#optimizerGradient)"
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={`${2 * Math.PI * 85}`}
            strokeDashoffset={`${2 * Math.PI * 85 * (1 - progress / 100)}`}
            className="progress-ring"
            filter="url(#optimizerGlow)"
            opacity={isFinished ? 0.4 : 1}
          />
        </svg>

        {/* Inner Content */}
        <div className="absolute inset-0 flex flex-col items-center justify-center p-8">
          
          {/* Animated Icon */}
          <div className={`mb-4 p-4 rounded-full bg-gradient-to-br from-emerald-500/25 to-teal-500/25 backdrop-blur-sm ${!isFinished && "soft-pulse"}`}>
            <div key={currentIndex} className="text-emerald-300 icon-pop">
              {isFinished ? (
                <CheckCircle className="w-12 h-12 animate-bounce" />
              ) : (
                currentText.icon
              )}
            </div>
          </div>

          {/* Percentage */}
          <div className={`text-6xl font-bold bg-gradient-to-r from-emerald-300 via-teal-300 to-cyan-300 bg-clip-text text-transparent mb-3 transition-opacity ${isFinished && "opacity-40"}`}>
            {Math.round(progress)}%
          </div>

          {/* Dynamic Text */}
          <div key={currentIndex} className="fade-in text-center mb-4">
            <p className="text-lg font-semibold text-slate-200">
              {isFinished ? "Resume Ready!" : currentText.text}
            </p>
            {isFinished && (
              <p className="text-sm text-emerald-400 mt-1">Your optimized resume has been generated</p>
            )}
          </div>

          {/* Step Counter */}
          <div className={`text-xs font-medium text-slate-400 tracking-wider transition-opacity ${isFinished && "opacity-30"}`}>
            {isFinished ? "OPTIMIZATION COMPLETE" : `STEP ${currentIndex + 1} / ${loaderTexts.length}`}
          </div>

          {/* Progress Dots */}
          <div className="flex gap-1.5 justify-center mt-6 flex-wrap max-w-xs">
            {loaderTexts.map((_, index) => (
              <div
                key={index}
                className={`rounded-full transition-all duration-500 ${
                  index === currentIndex
                    ? "h-2 w-8 bg-gradient-to-r from-emerald-400 to-teal-400 shadow-lg shadow-emerald-500/50"
                    : index < currentIndex
                      ? "h-1.5 w-1.5 bg-emerald-400/70"
                      : "h-1.5 w-1.5 bg-slate-600/40"
                } ${isFinished && "opacity-30"}`}
              />
            ))}
          </div>

          {/* Status Text */}
          <div className={`mt-6 flex items-center gap-2 text-xs text-slate-400 transition-opacity ${isFinished && "opacity-30"}`}>
            <Sparkles className={`w-3.5 h-3.5 text-emerald-400 ${!isFinished && "smooth-rotate"}`} />
            <span>
              {isFinished ? "Ready to preview" : "AI is Working..."}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
