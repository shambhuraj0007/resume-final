"use client";

import React, { createContext, useContext, useState, useCallback } from "react";
import { toast } from "@/hooks/use-toast";

interface Suggestion {
  suggestion: string;
  originalText: string;
  improvedText: string;
  category: 'text' | 'keyword' | 'other';
}

interface CompatibilityResult {
  currentScore: number;
  potentialScore: number;
  currentCallback: number;
  potentialCallback: number;
  keywords: string[];
  topRequiredKeywords?: string[];
  missingKeywords?: string[];
  suggestions: Suggestion[];
  textSuggestions?: Suggestion[];
  keywordSuggestions?: Suggestion[];
  otherSuggestions?: Suggestion[];
  scoreBreakdown?: {
    requiredSkills: number;
    experience: number;
    responsibilities: number;
    education: number;
    industry: number;
  };
  confidence?: number;
  isValidJD?: boolean;
  isValidCV?: boolean;
  validationWarning?: string;
  analysisId?: string;
  resumeText?: string;
  jobDescription?: string;
}

interface AnalysisContextType {
  isAnalyzing: boolean;
  result: CompatibilityResult | null;
  startAnalysis: (formData: FormData, onComplete?: () => void) => Promise<void>;
  clearResult: () => void;
}

const AnalysisContext = createContext<AnalysisContextType | undefined>(undefined);

export function AnalysisProvider({ children }: { children: React.ReactNode }) {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState<CompatibilityResult | null>(null);

  const startAnalysis = useCallback(async (formData: FormData, onComplete?: () => void) => {
    setIsAnalyzing(true);
    setResult(null);

    try {
      const response = await fetch("/api/ats-check", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Analysis failed");
      }

      const data = await response.json();
      if (data.error) throw new Error(data.error);

      // Set result
      setResult(data);
      setIsAnalyzing(false);
      
      // Save to sessionStorage for persistence across navigation
      try {
        sessionStorage.setItem('currentAnalysisResult', JSON.stringify(data));
        console.log('✅ Analysis result saved to sessionStorage');
      } catch (error) {
        console.error('Error saving to sessionStorage:', error);
      }

      // Show validation warning if present
      if (data.validationWarning) {
        toast({
          title: "Validation Warning",
          description: data.validationWarning,
          variant: "destructive",
        });
      }

      // Call completion callback if provided
      if (onComplete) {
        onComplete();
      }
    } catch (error) {
      console.error("Error checking compatibility:", error);
      setIsAnalyzing(false);
      toast({
        title: "Analysis Failed",
        description: error instanceof Error ? error.message : "Something went wrong.",
        variant: "destructive",
      });
    }
  }, []);

  const clearResult = useCallback(() => {
    setResult(null);
    setIsAnalyzing(false);
  }, []);

  return (
    <AnalysisContext.Provider
      value={{
        isAnalyzing,
        result,
        startAnalysis,
        clearResult,
      }}
    >
      {children}
    </AnalysisContext.Provider>
  );
}

export function useAnalysis() {
  const context = useContext(AnalysisContext);
  if (context === undefined) {
    throw new Error("useAnalysis must be used within an AnalysisProvider");
  }
  return context;
}
