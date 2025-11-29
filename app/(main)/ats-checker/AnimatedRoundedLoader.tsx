"use client";

import { useState, useEffect } from "react";
import { Sparkles, Zap, CheckCircle, FileText, Brain, Target, TrendingUp, AlertCircle } from "lucide-react";

interface LoaderText {
  id: string;
  text: string;
  icon: JSX.Element;
}

export default function AnimatedRoundedLoader() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFinished, setIsFinished] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      sessionStorage.removeItem("loaderCurrentIndex");
      sessionStorage.removeItem("loaderIsFinished");
    }
  }, []);

  const loaderTexts: LoaderText[] = [
    { id: "1", text: "Processing Resume", icon: <FileText className="w-5 h-5" /> },
    { id: "2", text: "Extracting Content", icon: <Zap className="w-5 h-5" /> },
    { id: "3", text: "Analyzing Job Description", icon: <Sparkles className="w-5 h-5" /> },
    { id: "4", text: "Parsing Skills", icon: <Target className="w-5 h-5" /> },
    { id: "5", text: "Extracting Keywords", icon: <Zap className="w-5 h-5" /> },
    { id: "6", text: "ATS Analysis", icon: <Brain className="w-5 h-5" /> },
    { id: "7", text: "Matching Skills", icon: <CheckCircle className="w-5 h-5" /> },
    { id: "8", text: "Calculating Score", icon: <TrendingUp className="w-5 h-5" /> },
    { id: "9", text: "Identifying Gaps", icon: <AlertCircle className="w-5 h-5" /> },
    { id: "10", text: "Calculating Probability", icon: <Zap className="w-5 h-5" /> },
    { id: "11", text: "Generating Suggestions", icon: <Sparkles className="w-5 h-5" /> },
    { id: "12", text: "Finalizing Results", icon: <CheckCircle className="w-5 h-5" /> },
  ];

  // Function to get duration based on step index
  const getDuration = (index: number): number => {
    const stepId = index + 1; // Convert 0-based index to 1-based ID
    
    if (stepId >= 1 && stepId <= 3) {
      return 3300; // 3.3s for steps 1-3
    } else if (stepId >= 4 && stepId <= 6) {
      return 3500; // 3.5s for steps 4-6
    } else if (stepId >= 7 && stepId <= 11) {
      return 3300; // 3.3s for steps 7-11
    } else if (stepId === 12) {
      return 4000; // 4s for step 12
    }
    return 3300; // Default fallback
  };

  useEffect(() => {
    if (isFinished) return;

    const duration = getDuration(currentIndex);
    
    const timeout = setTimeout(() => {
      setCurrentIndex((prev) => {
        if (prev === loaderTexts.length - 1) {
          setIsFinished(true);
          return prev;
        }
        return prev + 1;
      });
    }, duration);

    return () => clearTimeout(timeout);
  }, [currentIndex, isFinished, loaderTexts.length]);

  const currentText = loaderTexts[currentIndex];
  const progress = ((currentIndex + 1) / loaderTexts.length) * 100;

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4">
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
            transform: translateY(-8px);
          }
        }

        @keyframes softPulse {
          0%, 100% {
            opacity: 0.6;
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

        .fade-in {
          animation: fadeIn 0.4s ease-out forwards;
        }

        .gentle-float {
          animation: gentleFloat 4s ease-in-out infinite;
        }

        .soft-pulse {
          animation: softPulse 2s ease-in-out infinite;
        }

        .smooth-rotate {
          animation: smoothRotate 20s linear infinite;
        }

        .progress-ring {
          transition: stroke-dashoffset 0.5s cubic-bezier(0.4, 0, 0.2, 1);
        }
      `}</style>

      {/* Single Circle Container - Everything Inside */}
      <div className="relative w-96 h-96 gentle-float">
        
        {/* SVG Circle - Progress Ring */}
        <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 200 200">
          <defs>
            <linearGradient id="progressGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#8b5cf6" />
              <stop offset="50%" stopColor="#6366f1" />
              <stop offset="100%" stopColor="#7c3aed" />
            </linearGradient>
            <filter id="glow">
              <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
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
            fill="rgba(30, 41, 59, 0.5)"
            stroke="rgba(139, 92, 246, 0.1)"
            strokeWidth="2"
          />
          
          {/* Progress Circle */}
          <circle
            cx="100"
            cy="100"
            r="85"
            fill="none"
            stroke="url(#progressGradient)"
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={`${2 * Math.PI * 85}`}
            strokeDashoffset={`${2 * Math.PI * 85 * (1 - progress / 100)}`}
            className="progress-ring"
            filter="url(#glow)"
            opacity={isFinished ? 0.3 : 1}
          />
        </svg>

        {/* Inner Content Layer */}
        <div className="absolute inset-0 flex flex-col items-center justify-center p-8">
          
          {/* Icon */}
          <div className={`mb-4 p-4 rounded-full bg-gradient-to-br from-indigo-500/20 to-violet-500/20 backdrop-blur-sm ${!isFinished && "soft-pulse"}`}>
            <div className="text-indigo-300">
              {isFinished ? (
                <CheckCircle className="w-12 h-12 animate-bounce" />
              ) : (
                currentText.icon
              )}
            </div>
          </div>

          {/* Percentage */}
          <div className={`text-6xl font-bold bg-gradient-to-r from-indigo-300 via-violet-300 to-purple-300 bg-clip-text text-transparent mb-2 ${isFinished && "opacity-30"}`}>
            {Math.round(progress)}%
          </div>

          {/* Text */}
          <div key={currentIndex} className="fade-in text-center mb-4">
            <p className="text-lg font-semibold text-slate-300">
              {isFinished ? "Analysis Complete!" : currentText.text}
            </p>
          </div>

          {/* Step Counter */}
          <div className={`text-xs font-medium text-slate-400 tracking-wider ${isFinished && "opacity-30"}`}>
            {isFinished ? "ALL STEPS COMPLETED" : `STEP ${currentIndex + 1} / ${loaderTexts.length}`}
          </div>

          {/* Progress Dots */}
          <div className="flex gap-1.5 justify-center mt-6">
            {loaderTexts.map((_, index) => (
              <div
                key={index}
                className={`rounded-full transition-all duration-500 ${
                  index === currentIndex
                    ? "h-2 w-8 bg-gradient-to-r from-indigo-400 to-violet-400"
                    : index < currentIndex
                      ? "h-1.5 w-1.5 bg-emerald-400/60"
                      : "h-1.5 w-1.5 bg-slate-600/30"
                } ${isFinished && "opacity-25"}`}
              />
            ))}
          </div>

          {/* Small Status Text at Bottom */}
          <div className={`mt-6 flex items-center gap-2 text-xs text-slate-400 ${isFinished && "opacity-25"}`}>
            <Sparkles className={`w-3.5 h-3.5 text-indigo-400 ${!isFinished && "smooth-rotate"}`} />
            <span>
              {isFinished ? "Ready to view results" : "AI processing..."}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
