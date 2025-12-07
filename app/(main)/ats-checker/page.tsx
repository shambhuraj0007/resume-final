"use client";

import { useState, useEffect } from "react";
import { useNavigationContext } from "@/contexts/NavigationContext";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";

import { useSession } from "next-auth/react";
import {
  Upload,
  CheckCircle,
  AlertCircle,
  ArrowLeft,
  Loader2,
  Coins,
  TrendingUp,
  Briefcase,
  FileText,
  Copy,
  Info,
  Sparkles,
  Target,
  AlertTriangle,
  XCircle,
  Check,
  ArrowUp,
} from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { useCredits } from "@/hooks/useCredits";
import InsufficientCreditsModal from "@/components/credits/InsufficientCreditsModal";
import UpgradeModal from "@/components/credits/UpgradeModal";
import AnimatedRoundedLoader from "./AnimatedRoundedLoader";
import { useAnalysis } from "@/contexts/AnalysisContext";
import { baseCallbackProbability, calculateScores, adjustProbability } from "@/lib/scoring/scoreEngine";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const MAX_FILE_SIZE = 5 * 1024 * 1024;

interface Suggestion {
  suggestion: string;
  originalText: string;
  improvedText: string;
  category: "text" | "keyword" | "other";
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
  insufficentExperience?: boolean;
  experienceRequired?: number;
  experienceHas?: number;
  rawLLMData?: any;
}

export default function JobMatchPage() {
  const router = useRouter();
  const { status } = useSession();
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [resumeText, setResumeText] = useState("");
  const [jobDescription, setJobDescription] = useState("");
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [showInsufficientModal, setShowInsufficientModal] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [inputMode, setInputMode] = useState<"upload" | "paste">("upload");
  const { shouldNavigateOnAnalyze } = useNavigationContext?.() ?? {
    shouldNavigateOnAnalyze: false,
  };

  const { balance, checkCredits, refreshBalance } = useCredits();
  const { isAnalyzing, result, startAnalysis, clearResult } = useAnalysis();

  // Validation State
  const [isResumeValid, setIsResumeValid] = useState(false);
  const [resumeValidationError, setResumeValidationError] = useState<string | null>(null);
  const [isJDValid, setIsJDValid] = useState(false);
  const [jdValidationError, setJdValidationError] = useState<string | null>(null);
  const [isValidatingResume, setIsValidatingResume] = useState(false);
  const [isValidatingJD, setIsValidatingJD] = useState(false);

  // Interactive Suggestions State
  const [appliedSuggestions, setAppliedSuggestions] = useState<number[]>([]);
  const [liveScore, setLiveScore] = useState<number>(0);
  const [liveCallback, setLiveCallback] = useState<number>(0);

  // Reset live score when result changes
  useEffect(() => {
    if (result) {
      setLiveScore(result.currentScore);
      setLiveCallback(result.currentCallback);
      setAppliedSuggestions([]);
    }
  }, [result]);

  // Validation Helpers
  const validateResumeContent = async (text: string) => {
    if (!text.trim()) {
      setIsResumeValid(false);
      setResumeValidationError(null);
      return;
    }

    setIsValidatingResume(true);
    try {
      const resp = await fetch("/api/validate-resume", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      const data = await resp.json();

      if (!resp.ok || !data.ok) {
        setResumeValidationError(data.reason || "Invalid resume content.");
        setIsResumeValid(false);
      } else {
        setResumeValidationError(null);
        setIsResumeValid(true);
      }
    } catch (e) {
      setResumeValidationError("Validation failed. Please try again.");
      setIsResumeValid(false);
    } finally {
      setIsValidatingResume(false);
    }
  };

  const validateJDContent = async (text: string) => {
    if (!text.trim()) {
      setIsJDValid(false);
      setJdValidationError(null);
      return;
    }

    setIsValidatingJD(true);
    try {
      const resp = await fetch("/api/validate-jd", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      const data = await resp.json();

      if (!resp.ok || !data.ok) {
        setJdValidationError(data.reason || "Invalid job description.");
        setIsJDValid(false);
      } else {
        setJdValidationError(null);
        setIsJDValid(true);
      }
    } catch (e) {
      setJdValidationError("Validation failed. Please try again.");
      setIsJDValid(false);
    } finally {
      setIsValidatingJD(false);
    }
  };

  const handleFileValidation = async (file: File) => {
    setIsValidatingResume(true);
    setResumeValidationError(null);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/api/extract-pdf-text", {
        method: "POST",
        body: formData,
      });

      if (response.ok) {
        const data = await response.json();
        await validateResumeContent(data.text);
      } else {
        const errorData = await response.json();
        setResumeValidationError(errorData.error || "Failed to extract text from PDF");
        setIsResumeValid(false);
        setIsValidatingResume(false);
      }
    } catch (error) {
      setResumeValidationError("Failed to process PDF. Please try again.");
      setIsResumeValid(false);
      setLiveCallback(result?.currentCallback ?? 0);
    }
  };

  // Save draft on changes
  useEffect(() => {
    const saveDraft = async () => {
      const fileToStore = pdfFile
        ? {
          name: pdfFile.name,
          type: pdfFile.type,
          dataUrl: await new Promise<string>((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.readAsDataURL(pdfFile);
          }),
        }
        : null;

      const draft = {
        resumeData: resumeText,
        resumeFile: fileToStore,
        jobDescription,
        inputMode,
        timestamp: Date.now(),
      };
      sessionStorage.setItem("atsCheckerDraft", JSON.stringify(draft));
    };

    const timeoutId = setTimeout(saveDraft, 1000); // Debounce
    return () => clearTimeout(timeoutId);
  }, [resumeText, jobDescription, inputMode, pdfFile]);

  // Restore state on mount
  useEffect(() => {
    const initializeState = async () => {
      const pendingAnalysisStr = sessionStorage.getItem("pendingAnalysis");
      const draftStr = sessionStorage.getItem("atsCheckerDraft");

      if (pendingAnalysisStr) {
        try {
          const payload = JSON.parse(pendingAnalysisStr);
          // Check if it's recent (within last 5 minutes)
          if (Date.now() - payload.timestamp < 300000) {
            sessionStorage.removeItem("pendingAnalysis");

            // Restore inputs
            if (typeof payload.resumeData === "string") {
              setInputMode("paste");
              setResumeText(payload.resumeData);
              validateResumeContent(payload.resumeData);
            } else if (payload.resumeFile) {
              setInputMode("upload");
              const res = await fetch(payload.resumeFile.dataUrl);
              const blob = await res.blob();
              const file = new File([blob], payload.resumeFile.name, { type: payload.resumeFile.type });
              setPdfFile(file);
              handleFileValidation(file);
            }

            setJobDescription(payload.jobDescription);
            validateJDContent(payload.jobDescription);

            // Auto-start if requested
            if (payload.autoStart) {
              setTimeout(async () => {
                const formData = new FormData();
                if (typeof payload.resumeData === "string") {
                  const blob = new Blob([payload.resumeData], { type: "text/plain" });
                  const textFile = new File([blob], "resume.txt", { type: "text/plain" });
                  formData.append("resume", textFile);
                } else if (payload.resumeFile) {
                  const res = await fetch(payload.resumeFile.dataUrl);
                  const blob = await res.blob();
                  const file = new File([blob], payload.resumeFile.name, { type: payload.resumeFile.type });
                  formData.append("resume", file);
                }
                formData.append("jobDescription", payload.jobDescription);
                await startAnalysis(formData, () => refreshBalance());
              }, 50);
            }
            return; // Stop here if pending analysis was handled
          }
        } catch (e) {
          sessionStorage.removeItem("pendingAnalysis");
        }
      }

      // If no pending analysis, check for draft
      if (draftStr) {
        try {
          const draft = JSON.parse(draftStr);
          // Check if draft is recent (e.g., 24 hours)
          if (Date.now() - draft.timestamp < 86400000) {
            if (draft.inputMode) setInputMode(draft.inputMode);

            if (draft.resumeData) {
              setResumeText(draft.resumeData);
              validateResumeContent(draft.resumeData);
            }

            if (draft.resumeFile) {
              const res = await fetch(draft.resumeFile.dataUrl);
              const blob = await res.blob();
              const file = new File([blob], draft.resumeFile.name, { type: draft.resumeFile.type });
              setPdfFile(file);
              handleFileValidation(file);
            }

            if (draft.jobDescription) {
              setJobDescription(draft.jobDescription);
              validateJDContent(draft.jobDescription);
            }
          }
        } catch (e) {
          // console.error("Error loading draft:", e);
        }
      }
    };

    initializeState();
  }, []);

  useEffect(() => {
    if (result) {
      refreshBalance();
    }
  }, [result, refreshBalance]);

  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-green-600 dark:text-green-400";
    if (score >= 60) return "text-yellow-600 dark:text-yellow-400";
    if (score >= 40) return "text-orange-500 dark:text-orange-400";
    return "text-red-500 dark:text-red-400";
  };

  const getScoreLabel = (score: number) => {
    if (score >= 80) return "Excellent Match";
    if (score >= 60) return "Good Match";
    if (score >= 40) return "Partial Match";
    return "Weak Match";
  };

  const validateFile = (file: File) => {
    if (file.type !== "application/pdf") {
      toast({
        title: "Invalid File",
        description: "Please upload a PDF file.",
        variant: "destructive",
      });
      return false;
    }

    if (file.size > MAX_FILE_SIZE) {
      toast({
        title: "File Too Large",
        description: "Maximum file size is 5MB.",
        variant: "destructive",
      });
      return false;
    }

    return true;
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && validateFile(file)) {
      setPdfFile(file);
      setResumeText("");
      handleFileValidation(file); // Trigger validation
      if (result) {
        clearResult();
        toast({
          title: "Resume Changed",
          description: "Previous analysis cleared. Ready for new analysis.",
        });
      } else {
        toast({
          title: "Resume Selected",
          description: `${file.name} uploaded successfully!`,
        });
      }
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file && validateFile(file)) {
      setPdfFile(file);
      setResumeText("");
      handleFileValidation(file); // Trigger validation
      if (result) {
        clearResult();
        toast({
          title: "Resume Changed",
          description: "Previous analysis cleared. Ready for new analysis.",
        });
      } else {
        toast({
          title: "Resume Uploaded",
          description: `${file.name} uploaded successfully!`,
        });
      }
    }
  };

  // Calculate point values for each suggestion
  const calculateSuggestionPointValues = () => {
    if (!result || !result.rawLLMData) return {};

    const pointValues: Record<number, number> = {};
    const scoreGap = result.potentialScore - result.currentScore;

    // Group suggestions by type for proportional distribution
    const keywordSuggestions = result.suggestions
      .map((item, idx) => ({ item, idx }))
      .filter(({ item }) => item.category === 'keyword' && !item.suggestion.toLowerCase().includes("title"));

    const titleSuggestions = result.suggestions
      .map((item, idx) => ({ item, idx }))
      .filter(({ item }) => item.suggestion.toLowerCase().includes("title"));

    const criticalSuggestions = result.suggestions
      .map((item, idx) => ({ item, idx }))
      .filter(({ item }) => item.category === 'other' && item.suggestion.includes("⚠️"));

    // Calculate weights (critical items get 150% weight)
    const keywordWeight = 1.0;
    const titleWeight = 1.5; // Critical: 150%
    const structuralWeight = 1.5; // Critical: 150%

    const totalWeightedItems =
      (keywordSuggestions.length * keywordWeight) +
      (titleSuggestions.length * titleWeight) +
      (criticalSuggestions.length * structuralWeight);

    if (totalWeightedItems === 0 || scoreGap === 0) return {};

    const basePointValue = scoreGap / totalWeightedItems;

    // Assign point values
    keywordSuggestions.forEach(({ idx }) => {
      pointValues[idx] = Math.max(1, Math.round(basePointValue * keywordWeight));
    });

    titleSuggestions.forEach(({ idx }) => {
      pointValues[idx] = Math.max(1, Math.round(basePointValue * titleWeight));
    });

    criticalSuggestions.forEach(({ idx }) => {
      pointValues[idx] = Math.max(1, Math.round(basePointValue * structuralWeight));
    });

    return pointValues;
  };

  const suggestionPointValues = calculateSuggestionPointValues();

  // Interactive Suggestions Handlers
  const handleToggleSuggestion = (index: number) => {
    setAppliedSuggestions(prev => {
      let newApplied = [...prev];
      const suggestion = result?.suggestions[index];
      const isTitleSuggestion = suggestion?.suggestion.toLowerCase().includes("title");

      if (newApplied.includes(index)) {
        // If it's already checked, uncheck it
        newApplied = newApplied.filter(i => i !== index);
      } else {
        // If it's not checked, add it
        newApplied.push(index);
        // If it's a title suggestion, uncheck all other title suggestions
        if (isTitleSuggestion && result) {
          result.suggestions.forEach((s, idx) => {
            if (idx !== index && s.suggestion.toLowerCase().includes("title")) {
              newApplied = newApplied.filter(i => i !== idx);
            }
          });
        }
      }

      // Calculate new score based on point values
      if (result) {
        let addedPoints = 0;
        newApplied.forEach(idx => {
          addedPoints += suggestionPointValues[idx] || 0;
        });

        const newScore = Math.min(result.potentialScore, result.currentScore + addedPoints);
        setLiveScore(newScore);

        // Update callback probability using adjustProbability to match "Current" logic
        // We assume critical missing skills are resolved (passed as []) to reflect potential improvement
        // This ensures we get the same +5 boost if structural fit is good
        const newProb = adjustProbability(
          baseCallbackProbability(newScore),
          result.structuralFit ?? false,
          []
        );
        setLiveCallback(newProb);
      }

      return newApplied;
    });
  };

  const handleResetApplied = () => {
    setAppliedSuggestions([]);
    if (result) {
      setLiveScore(result.currentScore);
      setLiveCallback(result.currentCallback);
    }
  };

  const toggleInputMode = () => {
    const newMode = inputMode === "upload" ? "paste" : "upload";
    setInputMode(newMode);

    // Clear validation state
    setIsResumeValid(false);
    setResumeValidationError(null);

    if (result) {
      clearResult();
      toast({
        title: "Input Mode Changed",
        description: "Previous analysis cleared. Ready for new analysis.",
      });
    }

    if (newMode === "upload") {
      setResumeText("");
    } else {
      setPdfFile(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (inputMode === "upload" && !pdfFile) {
      toast({
        title: "Missing Resume",
        description: "Please upload your resume PDF.",
        variant: "destructive",
      });
      return;
    }

    if (inputMode === "paste" && !resumeText.trim()) {
      toast({
        title: "Missing Resume",
        description: "Please paste your resume text.",
        variant: "destructive",
      });
      return;
    }

    if (!jobDescription.trim()) {
      toast({
        title: "Missing Job Description",
        description:
          "Please paste the job description to analyze compatibility.",
        variant: "destructive",
      });
      return;
    }

    // Validation Checks
    if (!isResumeValid) {
      toast({
        title: "Invalid Resume",
        description: resumeValidationError || "Please provide a valid resume.",
        variant: "destructive",
      });
      return;
    }

    if (!isJDValid) {
      toast({
        title: "Invalid Job Description",
        description: jdValidationError || "Please provide a valid job description.",
        variant: "destructive",
      });
      return;
    }

    // Auth Check
    if (status === "unauthenticated") {
      // Save current state before redirecting
      const fileToStore = pdfFile
        ? {
          name: pdfFile.name,
          type: pdfFile.type,
          dataUrl: await new Promise<string>((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.readAsDataURL(pdfFile);
          }),
        }
        : null;

      const resumeData = inputMode === "paste" ? resumeText : null;

      const payload = {
        resumeData,
        resumeFile: fileToStore,
        jobDescription: jobDescription.trim(),
        autoStart: false, // Don't auto-start, just restore state
        timestamp: Date.now(),
      };

      sessionStorage.setItem("pendingAnalysis", JSON.stringify(payload));

      toast({
        title: "Sign In Required",
        description: "Please sign in to analyze your resume.",
        variant: "destructive",
      });
      router.push(`/signin?callbackUrl=${encodeURIComponent(window.location.href)}`);
      return;
    }

    const hasSufficientCredits = await checkCredits(1);
    if (!hasSufficientCredits) {
      setShowInsufficientModal(true);
      return;
    }

    setShowConfirmDialog(true);
  };

  const handleConfirmAnalysis = async () => {
    setShowConfirmDialog(false);

    if (shouldNavigateOnAnalyze) {
      const fileToStore = pdfFile
        ? {
          name: pdfFile.name,
          type: pdfFile.type,
          dataUrl: await new Promise<string>((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.readAsDataURL(pdfFile);
          }),
        }
        : null;

      const resumeData = inputMode === "paste" ? resumeText : null;

      const payload = {
        resumeData,
        resumeFile: fileToStore,
        jobDescription: jobDescription.trim(),
        autoStart: true,
        timestamp: Date.now(),
      };

      sessionStorage.setItem("pendingAnalysis", JSON.stringify(payload));
      router.push("/ats-checker");
      return;
    }

    const formData = new FormData();

    if (inputMode === "upload" && pdfFile) {
      formData.append("resume", pdfFile);
    } else if (inputMode === "paste" && resumeText.trim()) {
      const blob = new Blob([resumeText], { type: "text/plain" });
      const textFile = new File([blob], "resume.txt", { type: "text/plain" });
      formData.append("resume", textFile);
    }

    formData.append("jobDescription", jobDescription.trim());

    await startAnalysis(formData, () => {
      refreshBalance();
    });
  };

  const resetForm = () => {
    clearResult();
    setPdfFile(null);
    setResumeText("");
    setJobDescription("");
    setInputMode("upload");
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied!",
      description: "Text copied to clipboard",
    });
  };

  const navigateToOptimizer = async () => {
    let extractedText = resumeText;

    if (inputMode === "upload" && pdfFile) {
      try {
        toast({
          title: "Processing PDF...",
          description: "Extracting text from your resume",
        });

        const formData = new FormData();
        formData.append("file", pdfFile);

        const response = await fetch("/api/extract-pdf-text", {
          method: "POST",
          body: formData,
        });

        if (response.ok) {
          const data = await response.json();
          extractedText = data.text;
        } else {
          const errorData = await response.json();
          toast({
            title: "Invalid Resume",
            description: errorData.error || "Failed to extract text from PDF",
            variant: "destructive",
          });
          return; // Stop execution if validation fails
        }
      } catch (error) {
        // console.error("Error extracting PDF text:", error);
        toast({
          title: "Error",
          description: "Failed to process PDF. Please try again.",
          variant: "destructive",
        });
        return;
      }
    }

    // Filter suggestions:
    // 1. Include items with checkboxes ONLY if they are checked (in appliedSuggestions)
    // 2. Include items without checkboxes (AI Improvements, generic warnings) ALWAYS
    const filteredSuggestions = result?.suggestions.filter((item, idx) => {
      const hasCheckbox =
        (item.category === 'keyword' && !item.suggestion.toLowerCase().includes("title")) || // Quick Win
        (item.suggestion.toLowerCase().includes("title")) || // Title
        (item.suggestion.includes("ShortlistAI")); // Structure Fix

      if (hasCheckbox) {
        return appliedSuggestions.includes(idx);
      }
      return true; // Keep AI improvements and other non-interactive suggestions
    }) || [];

    const analysisData = {
      resumeText: extractedText,
      jobDescription,
      result: {
        ...result,
        suggestions: filteredSuggestions
      },
    };

    sessionStorage.setItem("atsAnalysisData", JSON.stringify(analysisData));

    toast({
      title: "Redirecting...",
      description: "Opening Resume Optimizer with your selected improvements",
    });

    router.push("/resume-optimizer");
  };

  if (isAnalyzing && !result) {
    return <AnimatedRoundedLoader />;
  }

  return (
    <div className="container min-h-screen mx-auto py-8 px-4">
      {!result ? (
        <Card className="max-w-2xl mx-auto border-slate-200 dark:border-slate-800 shadow-lg">
          <CardContent className="pt-6">
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Resume Input */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-medium text-gray-900 dark:text-gray-100">
                    Your Resume <span className="text-pink-500">*</span>
                  </label>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={toggleInputMode}
                    className="text-xs text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300"
                  >
                    {inputMode === "upload" ? (
                      <>
                        <Copy className="h-3 w-3 mr-1" />
                        Paste Text Instead
                      </>
                    ) : (
                      <>
                        <FileText className="h-3 w-3 mr-1" />
                        Upload PDF Instead
                      </>
                    )}
                  </Button>
                </div>

                {inputMode === "upload" ? (
                  <div
                    className={`border-2 border-dashed rounded-lg p-8 text-center transition-all ${resumeValidationError
                      ? "border-red-500 bg-red-50/10"
                      : isResumeValid
                        ? "border-green-400 dark:border-green-500 bg-green-50/50 dark:bg-green-950/20"
                        : "border-slate-300 dark:border-slate-700 hover:border-purple-400 dark:hover:border-purple-500 bg-slate-50/50 dark:bg-slate-900/50"
                      }`}
                    onDrop={handleDrop}
                    onDragOver={(e) => e.preventDefault()}
                  >
                    <Upload
                      className={`w-10 h-10 mx-auto mb-3 ${resumeValidationError
                        ? "text-red-500"
                        : pdfFile
                          ? "text-green-500"
                          : "text-purple-500 dark:text-purple-400"
                        }`}
                    />


                    <p className="text-sm font-medium mb-1 text-gray-900 dark:text-gray-100">
                      {pdfFile
                        ? pdfFile.name
                        : "Drag & drop your resume PDF here"}
                    </p>
                    <p className="text-xs text-gray-600 dark:text-gray-400 mb-3">
                      {pdfFile
                        ? `${(pdfFile.size / (1024 * 1024)).toFixed(2)} MB`
                        : "or click to browse (max 5MB)"}
                    </p>
                    <Input
                      id="resume"
                      type="file"
                      accept=".pdf"
                      onChange={handleFileChange}
                      className="hidden"
                    />
                    <label htmlFor="resume">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        asChild
                        className="border-purple-300 dark:border-purple-700 hover:bg-purple-50 dark:hover:bg-purple-950/30"
                      >
                        <span>Choose File</span>
                      </Button>
                    </label>
                    {resumeValidationError && inputMode === "upload" && (
                      <p className="text-sm text-red-500 mt-2 flex items-center justify-center gap-1">
                        <AlertCircle className="h-4 w-4" />
                        {resumeValidationError}
                      </p>
                    )}
                  </div>
                ) : (
                  <div>
                    <textarea
                      value={resumeText}
                      onChange={(e) => {
                        setResumeText(e.target.value);
                        if (
                          result &&
                          Math.abs(e.target.value.length - resumeText.length) >
                          10
                        ) {
                          clearResult();
                        }
                      }}
                      placeholder="Paste your complete resume text here including all sections: contact info, summary, experience, education, skills, etc..."
                      className={`w-full p-4 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 dark:focus:ring-purple-400 bg-white dark:bg-slate-900 text-gray-900 dark:text-gray-100 resize-y min-h-[200px] ${resumeValidationError
                        ? "border-red-500"
                        : isResumeValid
                          ? "border-green-500"
                          : "border-slate-300 dark:border-slate-700"
                        }`}
                      rows={12}
                      onBlur={() => validateResumeContent(resumeText)}
                    />
                    {resumeValidationError && (
                      <p className="text-sm text-red-500 mt-1 flex items-center gap-1">
                        <AlertCircle className="h-4 w-4" />
                        {resumeValidationError}
                      </p>
                    )}
                    <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                      Paste the complete text from your resume for best results
                    </p>
                  </div>
                )}
              </div>

              {/* Job Description */}
              <div>
                <label
                  htmlFor="jobDescription"
                  className="block text-sm font-medium mb-2 text-gray-900 dark:text-gray-100"
                >
                  Job Description <span className="text-pink-500">*</span>
                </label>
                <textarea
                  id="jobDescription"
                  value={jobDescription}
                  onChange={(e) => {
                    setJobDescription(e.target.value);
                    if (
                      result &&
                      Math.abs(e.target.value.length - jobDescription.length) >
                      10
                    ) {
                      clearResult();
                    }
                  }}
                  placeholder="Paste the complete job description here including responsibilities, requirements, and qualifications..."
                  className={`w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 dark:focus:ring-purple-400 bg-white dark:bg-slate-900 text-gray-900 dark:text-gray-100 resize-y min-h-[160px] ${jdValidationError ? "border-red-500" : "border-slate-300 dark:border-slate-700"
                    }`}
                  rows={8}
                  required
                  onBlur={() => validateJDContent(jobDescription)}
                />
                {jdValidationError && (
                  <p className="text-sm text-red-500 mt-1 flex items-center gap-1">
                    <AlertCircle className="h-4 w-4" />
                    {jdValidationError}
                  </p>
                )}
                <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                  Include all job requirements, skills, and qualifications for
                  accurate matching
                </p>
              </div>

              <Button
                type="submit"
                disabled={
                  isAnalyzing ||
                  isValidatingResume ||
                  isValidatingJD ||
                  (inputMode === "upload" && (!pdfFile || !isResumeValid)) ||
                  (inputMode === "paste" && (!resumeText.trim() || !isResumeValid)) ||
                  !jobDescription.trim() ||
                  !isJDValid
                }
                className="w-full bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 hover:from-blue-600 hover:via-purple-600 hover:to-pink-600 text-white font-semibold shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                size="lg"
              >
                {isAnalyzing ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Analyzing Match...
                  </>
                ) : (
                  "Analyze My Resume (1 Credit)"
                )}
              </Button>

              <p className="text-xs text-center text-gray-600 dark:text-gray-400">
                This analysis uses 1 credit and provides detailed compatibility
                insights
              </p>
            </form>
          </CardContent>
        </Card>
      ) : (
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Validation Warning */}
          {result.validationWarning &&
            (!result.isValidCV || !result.isValidJD) && (
              <Card className="border-amber-400 dark:border-amber-600 bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/20 dark:to-orange-950/20 shadow-md">
                <CardContent className="pt-6">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="h-6 w-6 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                    <div className="space-y-2">
                      <h3 className="font-semibold text-amber-900 dark:text-amber-100">
                        Input Validation Warning
                      </h3>
                      <p className="text-sm text-amber-800 dark:text-amber-200">
                        {result.validationWarning}
                      </p>
                      <div className="flex gap-2 text-xs text-amber-700 dark:text-amber-300">
                        <span
                          className={
                            result.isValidCV
                              ? "text-green-600 dark:text-green-400"
                              : "text-red-600 dark:text-red-400"
                          }
                        >
                          {result.isValidCV
                            ? "✓ Resume Valid"
                            : "✗ Resume Invalid"}
                        </span>
                        <span>•</span>
                        <span
                          className={
                            result.isValidJD
                              ? "text-green-600 dark:text-green-400"
                              : "text-red-600 dark:text-red-400"
                          }
                        >
                          {result.isValidJD
                            ? "✓ Job Description Valid"
                            : "✗ Job Description Invalid"}
                        </span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

          {/* Low Match Score Warning */}
          {result.currentScore < 30 && (
            <Card className="border-red-400 dark:border-red-600 bg-gradient-to-br from-red-50 to-pink-50 dark:from-red-950/20 dark:to-pink-950/20 shadow-md">
              <CardContent className="pt-6">
                <div className="flex items-start gap-3">
                  <XCircle className="h-6 w-6 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
                  <div className="space-y-2">
                    <h3 className="font-semibold text-red-900 dark:text-red-100">
                      Not Recommended to Apply
                    </h3>
                    <p className="text-sm text-red-800 dark:text-red-200">
                      Your current match score is{" "}
                      <strong>{result.currentScore}%</strong>, which is below
                      the recommended threshold. This job may not align well
                      with your skills and experience. Consider:
                    </p>
                    <ul className="text-sm text-red-800 dark:text-red-200 list-disc list-inside space-y-1 ml-2">
                      <li>
                        Looking for positions that better match your current
                        skillset
                      </li>
                      <li>Acquiring the missing skills before applying</li>
                      <li>
                        Focusing on roles where you have a higher match score
                        (60%+)
                      </li>
                    </ul>
                    <p className="text-xs text-red-700 dark:text-red-300 mt-3">
                      💡 If you still want to apply, review the improvement
                      suggestions below to maximize your chances.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}


          {/* Experience Warning Alert */}
          {result.insufficentExperience && (
            <div className="mb-4 p-4 border-2 border-orange-500 dark:border-orange-600 rounded-lg bg-orange-50 dark:bg-orange-950/30">
              <div className="flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-orange-600 dark:text-orange-400 mt-0.5 shrink-0" />
                <div className="flex-1">
                  <h3 className="font-semibold text-orange-900 dark:text-orange-100 mb-1">
                    Insufficient Experience
                  </h3>
                  <p className="text-sm text-orange-800 dark:text-orange-200">
                    This position requires <strong>{result.experienceRequired} years</strong> of full-time experience,
                    but you have <strong>{result.experienceHas} year{result.experienceHas !== 1 ? 's' : ''}</strong>.
                    Your experience score is <strong>0/20 points</strong>.
                  </p>
                  <p className="text-xs text-orange-700 dark:text-orange-300 mt-2">
                    💡 Consider applying for positions requiring {result.experienceHas} years or less, or gain more experience before applying to this role.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Match Score Comparison */}
          {/* Job Match Score */}
          <Card className="border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-shadow">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-1.5 text-sm font-semibold text-slate-900 dark:text-slate-100">
                <div className="p-1 rounded-md bg-blue-100 dark:bg-blue-900/30">
                  <Briefcase className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
                </div>
                Job Match Score
              </CardTitle>
            </CardHeader>
            <CardContent className="grid md:grid-cols-2 gap-3">
              {/* Current Match */}
              <div className="space-y-2 p-2.5 rounded-lg bg-gradient-to-br from-slate-50 to-gray-50 dark:from-slate-900/20 dark:to-gray-900/20 border border-slate-200 dark:border-slate-700">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-slate-700 dark:text-slate-300">
                    Current
                  </span>
                  <span className="text-xs px-1.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                    {getScoreLabel(result.currentScore)}
                  </span>
                </div>
                <div className={`text-2xl font-bold ${getScoreColor(result.currentScore)}`}>
                  {result.currentScore}%
                </div>
                <Progress value={result.currentScore} className="h-1.5" />
              </div>

              {/* Potential Match */}
              <div className="space-y-2 p-2.5 rounded-lg bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/20 dark:to-emerald-950/20 border border-green-200 dark:border-green-700">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1">
                    <span className="text-xs font-medium text-slate-700 dark:text-slate-300">
                      Potential
                    </span>
                    <TrendingUp className="h-3 w-3 text-green-600 dark:text-green-400" />
                  </div>
                  <span className="text-xs px-1.5 py-0.5 rounded-full bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300">
                    {getScoreLabel(result.potentialScore)}
                  </span>
                </div>
                <div className="flex items-baseline gap-1.5">
                  <span className={`text-2xl font-bold ${getScoreColor(result.potentialScore)}`}>
                    {result.potentialScore}%
                  </span>
                  {result.potentialScore > result.currentScore && (
                    <span className="text-xs font-bold px-1.5 py-0.5 rounded bg-green-600 dark:bg-green-500 text-white">
                      +{result.potentialScore - result.currentScore}%
                    </span>
                  )}
                </div>
                <Progress value={result.potentialScore} className="h-1.5" />
              </div>
            </CardContent>
          </Card>

          {/* Interview Probability - Compact */}
          <Card className="border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-shadow">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-1.5 text-sm font-semibold text-slate-900 dark:text-slate-100">
                <div className="p-1 rounded-md bg-purple-100 dark:bg-purple-900/30">
                  <Briefcase className="h-3.5 w-3.5 text-purple-600 dark:text-purple-400" />
                </div>
                Interview Probability
              </CardTitle>
            </CardHeader>
            <CardContent className="grid md:grid-cols-2 gap-3">
              {/* Current Chances */}
              <div className="space-y-2 p-2.5 rounded-lg bg-gradient-to-br from-slate-50 to-gray-50 dark:from-slate-900/20 dark:to-gray-900/20 border border-slate-200 dark:border-slate-700">
                <span className="text-xs font-medium text-slate-700 dark:text-slate-300 block">
                  Current
                </span>
                <div className="flex items-baseline gap-1">
                  <span className={`text-2xl font-bold ${getScoreColor(result.currentCallback)}`}>
                    {result.currentCallback}%
                  </span>
                  <span className="text-xs text-slate-500 dark:text-slate-400">
                    callback
                  </span>
                </div>
                <Progress value={result.currentCallback} className="h-1.5" />
              </div>

              {/* After Improvements */}
              <div className="space-y-2 p-2.5 rounded-lg bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-950/20 dark:to-teal-950/20 border border-emerald-200 dark:border-emerald-700">
                <div className="flex items-center gap-1">
                  <span className="text-xs font-medium text-slate-700 dark:text-slate-300">
                    Improved
                  </span>
                  <TrendingUp className="h-3 w-3 text-emerald-600 dark:text-emerald-400" />
                </div>
                <div className="flex items-baseline gap-1.5">
                  <span className={`text-2xl font-bold ${getScoreColor(result.potentialCallback)}`}>
                    {result.potentialCallback}%
                  </span>
                  {result.potentialCallback > result.currentCallback && (
                    <span className="text-xs font-bold px-1.5 py-0.5 rounded bg-emerald-600 dark:bg-emerald-500 text-white">
                      +{result.potentialCallback - result.currentCallback}%
                    </span>
                  )}
                </div>
                <Progress value={result.potentialCallback} className="h-1.5" />
              </div>
            </CardContent>
          </Card>



          {/* Keywords Section */}
          <div className="grid md:grid-cols-3 gap-4">
            {/* Top Required Keywords */}
            {result.topRequiredKeywords && result.topRequiredKeywords.length > 0 && (
              <Card className="border border-blue-300/60 dark:border-blue-700/60 shadow-lg bg-gradient-to-br from-blue-50/90 via-blue-100/50 to-indigo-50/70 dark:from-blue-950/50 dark:via-blue-900/30 dark:to-indigo-950/40 backdrop-blur-sm hover:shadow-xl transition-all duration-300">
                <CardHeader className="pb-3 pt-4 border-b border-blue-200/40 dark:border-blue-800/40">
                  <CardTitle className="flex items-center gap-2 text-sm font-semibold text-blue-900 dark:text-blue-50">
                    <Target className="h-4.5 w-4.5 text-blue-600 dark:text-blue-400" />
                    Top Required Skills
                  </CardTitle>
                </CardHeader>
                <CardContent className="py-4">
                  <div className="flex flex-wrap gap-2">
                    {result.topRequiredKeywords.slice(0, 10).map((keyword, idx) => (
                      <span
                        key={idx}
                        className="px-3 py-1.5 bg-blue-100 dark:bg-blue-900/60 text-blue-900 dark:text-blue-100 text-xs font-semibold rounded-lg border border-blue-300/70 dark:border-blue-700/70 shadow-sm hover:shadow-md hover:scale-105 transition-all duration-200"
                      >
                        {keyword}
                      </span>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Matched Keywords */}
            <Card className="border border-green-300/60 dark:border-green-700/60 shadow-lg bg-gradient-to-br from-green-50/90 via-emerald-100/50 to-teal-50/70 dark:from-green-950/50 dark:via-emerald-900/30 dark:to-teal-950/40 backdrop-blur-sm hover:shadow-xl transition-all duration-300">
              <CardHeader className="pb-3 pt-4 border-b border-green-200/40 dark:border-green-800/40">
                <CardTitle className="flex items-center gap-2 text-sm font-semibold text-green-900 dark:text-green-50">
                  <CheckCircle className="h-4.5 w-4.5 text-green-600 dark:text-green-400" />
                  Matched Skills
                </CardTitle>
              </CardHeader>
              <CardContent className="py-4">
                {result.keywords.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {result.keywords.slice(0, 10).map((keyword, idx) => (
                      <span
                        key={idx}
                        className="px-3 py-1.5 bg-green-100 dark:bg-green-900/60 text-green-900 dark:text-green-100 text-xs font-semibold rounded-lg border border-green-300/70 dark:border-green-700/70 shadow-sm hover:shadow-md hover:scale-105 transition-all duration-200"
                      >
                        {keyword}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-600 dark:text-gray-400 italic py-2">
                    No matching keywords found
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Missing Keywords */}
            {result.missingKeywords && result.missingKeywords.length > 0 && (
              <Card className="border border-amber-300/60 dark:border-amber-700/60 shadow-lg bg-gradient-to-br from-amber-50/90 via-orange-100/50 to-yellow-50/70 dark:from-amber-950/50 dark:via-orange-900/30 dark:to-yellow-950/40 backdrop-blur-sm hover:shadow-xl transition-all duration-300">
                <CardHeader className="pb-3 pt-4 border-b border-amber-200/40 dark:border-amber-800/40">
                  <CardTitle className="flex items-center gap-2 text-sm font-semibold text-amber-900 dark:text-amber-50">
                    <AlertCircle className="h-4.5 w-4.5 text-amber-600 dark:text-amber-400" />
                    Missing Skills
                  </CardTitle>
                </CardHeader>
                <CardContent className="py-4">
                  <div className="flex flex-wrap gap-2">
                    {result.missingKeywords.slice(0, 10).map((keyword, idx) => (
                      <span
                        key={idx}
                        className="px-3 py-1.5 bg-amber-100 dark:bg-amber-900/60 text-amber-900 dark:text-amber-100 text-xs font-semibold rounded-lg border border-amber-300/70 dark:border-amber-700/70 shadow-sm hover:shadow-md hover:scale-105 transition-all duration-200"
                      >
                        {keyword}
                      </span>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
          {/* Interactive Score Preview - Shows score if suggestions are applied */}

          {/* --- COMPACT DASHBOARD SECTION (Replaces previous top section) --- */}
          {result.suggestions && result.suggestions.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-12 gap-4 mb-6">

              {/* COLUMN 1: COMPACT SCORE CARD (Takes up 4/12 columns) */}
              <div className="md:col-span-4">
                <Card className="h-full border-green-300/60 dark:border-green-700/60 shadow-md bg-gradient-to-br from-green-50/90 via-emerald-100/50 to-teal-50/70 dark:from-green-950/50 backdrop-blur-sm">
                  <CardHeader className="pb-2 pt-4 px-4">
                    <CardTitle className="flex items-center gap-2 text-sm font-bold text-green-900 dark:text-green-50">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      Live Score
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="px-4 pb-4">
                    <div className="flex flex-col justify-between h-full gap-4">
                      {/* Big Score Display */}
                      <div className="text-center py-2 bg-white/50 dark:bg-black/20 rounded-lg border border-green-100/50">
                        <span className="text-xs font-medium text-gray-500 uppercase">Current</span>
                        <div className="text-3xl font-black text-gray-700 dark:text-gray-200">{result.currentScore}%</div>
                        {appliedSuggestions.length > 0 && (
                          <>
                            <div className="text-green-600 dark:text-green-400 font-bold text-sm flex justify-center items-center mt-1">
                              <ArrowUp className="h-3 w-3 mr-1" />
                              {liveScore}% Potential
                            </div>
                            <Progress value={liveScore} className="h-1.5 mt-2 w-3/4 mx-auto" />
                          </>
                        )}
                      </div>

                      {/* Stats Grid */}
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div className="bg-white/40 dark:bg-black/20 p-2 rounded border border-green-100/50">
                          <span className="text-gray-500 bloHighlight any experience withck">Applied</span>
                          <span className="font-bold text-green-700 dark:text-green-400 text-lg">
                            {appliedSuggestions.length}
                            <span className="text-gray-400 text-xs font-normal">/{result.suggestions.length}</span>
                          </span>
                        </div>
                        <div className="bg-white/40 dark:bg-black/20 p-2 rounded border border-green-100/50">
                          <span className="text-gray-500 block">Interview</span>
                          <span className="font-bold text-blue-700 dark:text-blue-400 text-lg">
                            {appliedSuggestions.length > 0 ? liveCallback : result.currentCallback}%
                          </span>
                        </div>
                      </div>

                      {appliedSuggestions.length > 0 && (
                        <Button onClick={handleResetApplied} variant="outline" size="sm" className="w-full text-xs h-7 bg-blue-600 text-white">
                          Reset
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* COLUMN 2: TABBED ACTION CENTER (Takes up 8/12 columns) */}
              <div className="md:col-span-8">
                <Tabs defaultValue="quick-wins" className="h-full flex flex-col">
                  <div className="flex items-center justify-between mb-2">
                    <TabsList className="h-8 bg-slate-100 dark:bg-slate-800 p-0.5">
                      <TabsTrigger value="quick-wins" className="text-xs h-7 px-3 data-[state=active]:bg-blue-600-[state=active]:shadow-sm">
                        Quick Wins ({result.suggestions.filter(s => s.category === 'keyword' && !s.suggestion.toLowerCase().includes("title")).length})
                      </TabsTrigger>
                      <TabsTrigger value="critical" className="text-xs h-7 px-3 data-[state=active]:bg-white data-[state=active]:text-red-600 data-[state=active]:shadow-sm">
                        Critical ({result.suggestions.filter(s => (s.category === 'other' && s.suggestion.includes("⚠️")) || s.suggestion.toLowerCase().includes("title")).length})
                      </TabsTrigger>
                    </TabsList>
                  </div>

                  {/* TAB 1: QUICK WINS (Keywords) */}
                  <TabsContent value="quick-wins" className="mt-0 h-full">
                    <Card className="h-full border-green-200 dark:border-green-800 bg-green-50/30 dark:bg-green-950/10">
                      <CardContent className="p-0">
                        {/* Scrollable List Area */}
                        <div className="max-h-[220px] overflow-y-auto p-3 space-y-2 custom-scrollbar">
                          {result.suggestions.some(s => s.category === 'keyword' && !s.suggestion.toLowerCase().includes("title")) ? (
                            result.suggestions.map((item, idx) => ({ item, idx }))
                              .filter(({ item }) => item.category === 'keyword' && !item.suggestion.toLowerCase().includes("title"))
                              .map(({ item, idx }) => (
                                <div key={idx} className="flex items-center gap-3 p-2 bg-white dark:bg-slate-900 rounded border border-green-100 dark:border-green-800/50 hover:shadow-sm transition-all group">
                                  <input
                                    type="checkbox"
                                    checked={appliedSuggestions.includes(idx)}
                                    onChange={() => handleToggleSuggestion(idx)}
                                    className="h-4 w-4 rounded border-gray-300 text-green-600 focus:ring-green-500 cursor-pointer"
                                  />
                                  <div className="flex-1 flex justify-between items-center">
                                    <span className="text-sm font-medium text-gray-700 dark:text-gray-200 group-hover:text-green-700">{item.suggestion}</span>
                                    <span className="text-[10px] font-bold text-green-600 bg-green-100 px-1.5 py-0.5 rounded">+{suggestionPointValues[idx] || 0} pts</span>

                                  </div>
                                </div>
                              ))
                          ) : (
                            <div className="text-center py-8 text-sm text-gray-500">No missing keywords found! 🎉</div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  </TabsContent>

                  {/* TAB 2: CRITICAL ACTIONS */}
                  <TabsContent value="critical" className="mt-0 h-full">
                    <Card className="h-full border-red-200 dark:border-red-800 bg-red-50/30 dark:bg-red-950/10">
                      <CardContent className="p-0">
                        {/* Scrollable List Area */}
                        <div className="max-h-[220px] overflow-y-auto p-3 space-y-2 custom-scrollbar">
                          {/* Title Check */}
                          {result.suggestions.map((item, idx) => ({ item, idx }))
                            .filter(({ item }) => item.suggestion.toLowerCase().includes("title"))
                            .map(({ item, idx }) => (
                              <div key={idx} className="flex items-center gap-3 p-2 bg-white dark:bg-slate-900 rounded border-l-4 border-l-orange-500 border-y border-r border-gray-100 shadow-sm">
                                <input
                                  type="checkbox"
                                  checked={appliedSuggestions.includes(idx)}
                                  onChange={() => handleToggleSuggestion(idx)}
                                  className="h-4 w-4 rounded border-gray-300 text-orange-600 cursor-pointer"
                                />
                                <div className="flex-1 flex justify-between items-center">
                                  <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">{item.suggestion}</p>
                                  <span className="text-[10px] font-bold text-orange-600 bg-orange-100 px-1.5 py-0.5 rounded">+{suggestionPointValues[idx] || 0} pts</span>
                                </div>

                              </div>
                            ))}

                          {/* Other Warnings */}
                          {result.suggestions.map((item, idx) => ({ item, idx }))
                            .filter(({ item }) => item.category === 'other' && item.suggestion.includes("⚠️"))
                            .map(({ item, idx }) => (
                              <div key={idx} className="flex items-start gap-3 p-2 bg-white dark:bg-slate-900 rounded border border-red-100">
                                {item.suggestion.includes("ShortlistAI") ? (
                                  <input type="checkbox" checked={appliedSuggestions.includes(idx)} onChange={() => handleToggleSuggestion(idx)} className="mt-1 h-4 w-4 text-red-600 rounded" />
                                ) : (<AlertCircle className="h-4 w-4 text-red-500 mt-0.5" />)}

                                <div className="flex-1">
                                  <p className="text-sm text-gray-800 dark:text-gray-200 leading-tight">{item.suggestion}</p>
                                  {item.suggestion.includes("ShortlistAI") && (
                                    <Button variant="link" className="h-auto p-0 text-red-600 text-[10px] font-bold" onClick={() => router.push('/resume-optimizer')}>Fix Structure &rarr;</Button>
                                  )}
                                </div>
                              </div>
                            ))}

                          {!result.suggestions.some(s => s.category === 'other' && s.suggestion.includes("⚠️")) && !result.suggestions.some(s => s.suggestion.toLowerCase().includes("title")) && (
                            <div className="text-center py-8 text-sm text-gray-500">No critical errors found! ✅</div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  </TabsContent>
                </Tabs>
              </div>
            </div>
          )}


          {/* --- 3. AI Improvements (Original Layout - Kept at Bottom) --- */}
          {result.suggestions && result.suggestions.length > 0 && (
            <Card className="border-purple-200 dark:border-purple-800 shadow-lg mt-6 bg-white dark:bg-slate-900">
              <CardHeader className="pb-4 border-b border-slate-100 dark:border-slate-800">
                <CardTitle className="flex items-center gap-2 text-purple-900 dark:text-purple-100">
                  <Sparkles className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                  Improvement Suggestions
                </CardTitle>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  Comprehensive recommendations categorized by type. Click each to see before/after text.
                </p>
              </CardHeader>
              <CardContent className="pt-6">
                <Tabs defaultValue="all" className="w-full">
                  <TabsList className="grid w-full grid-cols-4 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
                    <TabsTrigger
                      value="all"
                      className="rounded-lg py-2 text-sm font-semibold transition-all
      data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:via-purple-500 data-[state=active]:to-pink-500 
      data-[state=active]:text-white data-[state=active]:shadow-md
      text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/50 dark:hover:bg-slate-700/50"
                    >
                      All ({result.suggestions.length})
                    </TabsTrigger>

                    <TabsTrigger
                      value="text"
                      className="rounded-lg py-2 text-sm font-semibold transition-all
      data-[state=active]:bg-blue-500 data-[state=active]:text-white data-[state=active]:shadow-md
      text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/50 dark:hover:bg-slate-700/50"
                    >
                      Text ({result.suggestions.filter(s => s.category === 'text').length})
                    </TabsTrigger>

                    <TabsTrigger
                      value="keyword"
                      className="rounded-lg py-2 text-sm font-semibold transition-all
      data-[state=active]:bg-purple-500 data-[state=active]:text-white data-[state=active]:shadow-md
      text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/50 dark:hover:bg-slate-700/50"
                    >
                      Keywords ({result.suggestions.filter(s => s.category === 'keyword').length})
                    </TabsTrigger>

                    <TabsTrigger
                      value="other"
                      className="rounded-lg py-2 text-sm font-semibold transition-all
      data-[state=active]:bg-pink-500 data-[state=active]:text-white data-[state=active]:shadow-md
      text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/50 dark:hover:bg-slate-700/50"
                    >
                      Other ({result.suggestions.filter(s => s.category === 'other').length})
                    </TabsTrigger>
                  </TabsList>




                  {/* All Suggestions Tab */}
                  <TabsContent value="all" className="mt-4">
                    <Accordion type="single" collapsible className="w-full">
                      {result.suggestions.map((item, idx) => (
                        <AccordionItem
                          key={idx}
                          value={`all-${idx}`}
                          className="border-slate-200 dark:border-slate-700"
                        >
                          <AccordionTrigger className="text-left hover:no-underline">
                            <div className="flex items-start gap-2 w-full">
                              <span className="text-purple-600 dark:text-purple-400 mt-0.5 shrink-0 font-semibold">
                                {idx + 1}.
                              </span>
                              <div className="flex-1">
                                <span className="text-sm text-gray-900 dark:text-gray-100">
                                  {item.suggestion}
                                </span>
                                <span
                                  className={`ml-2 px-2 py-0.5 text-xs rounded-full ${item.category === "text"
                                    ? "bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800"
                                    : item.category === "keyword"
                                      ? "bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800"
                                      : "bg-pink-100 dark:bg-pink-900/40 text-pink-700 dark:text-pink-300 border border-pink-200 dark:border-pink-800"
                                    }`}
                                >
                                  {item.category}
                                </span>
                              </div>
                            </div>
                          </AccordionTrigger>
                          <AccordionContent>
                            <div className="space-y-4 pt-2">
                              {/* Original Text */}
                              <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                  <label className="text-xs font-semibold text-red-600 dark:text-red-400 uppercase tracking-wide">
                                    {item.originalText === "MISSING"
                                      ? "Missing from Resume"
                                      : "Current Text (Replace This)"}
                                  </label>
                                  {item.originalText !== "MISSING" && (
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      onClick={() =>
                                        copyToClipboard(item.originalText)
                                      }
                                      className="h-6 text-xs text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30"
                                    >
                                      <Copy className="h-3 w-3 mr-1" />
                                      Copy
                                    </Button>
                                  )}
                                </div>
                                <div className="p-3 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-md">
                                  <p className="text-sm text-red-900 dark:text-red-100">
                                    {item.originalText === "MISSING"
                                      ? "⚠️ This content is not present in your current resume"
                                      : item.originalText}
                                  </p>
                                </div>
                              </div>

                              {/* Improved Text */}
                              <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                  <label className="text-xs font-semibold text-green-600 dark:text-green-400 uppercase tracking-wide">
                                    Suggested Text (Use This)
                                  </label>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() =>
                                      copyToClipboard(item.improvedText)
                                    }
                                    className="h-6 text-xs text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-950/30"
                                  >
                                    <Copy className="h-3 w-3 mr-1" />
                                    Copy
                                  </Button>
                                </div>
                                <div className="p-3 bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 rounded-md">
                                  <p className="text-sm text-green-900 dark:text-green-100">
                                    {item.improvedText}
                                  </p>
                                </div>
                              </div>

                              <div className="flex items-start gap-2 p-2 bg-blue-50 dark:bg-blue-950/30 rounded-md border border-blue-200 dark:border-blue-800">
                                <Info className="h-4 w-4 text-blue-600 dark:text-blue-400 mt-0.5 shrink-0" />
                                <p className="text-xs text-blue-900 dark:text-blue-100">
                                  Copy the Suggested text and replace it in your
                                  resume for better ATS optimization
                                </p>
                              </div>
                            </div>
                          </AccordionContent>
                        </AccordionItem>
                      ))}
                    </Accordion>
                  </TabsContent>

                  {/* Text Improvements Tab */}
                  <TabsContent value="text" className="mt-4">
                    {result.textSuggestions &&
                      result.textSuggestions.length > 0 ? (
                      <Accordion type="single" collapsible className="w-full">
                        {result.textSuggestions.map((item, idx) => (
                          <AccordionItem
                            key={idx}
                            value={`text-${idx}`}
                            className="border-slate-200 dark:border-slate-700"
                          >
                            <AccordionTrigger className="text-left hover:no-underline">
                              <div className="flex items-start gap-2">
                                <span className="text-blue-600 dark:text-blue-400 mt-0.5 shrink-0 font-semibold">
                                  {idx + 1}.
                                </span>
                                <span className="text-sm text-gray-900 dark:text-gray-100">
                                  {item.suggestion}
                                </span>
                              </div>
                            </AccordionTrigger>
                            <AccordionContent>
                              <div className="space-y-4 pt-2">
                                <div className="space-y-2">
                                  <div className="flex items-center justify-between">
                                    <label className="text-xs font-semibold text-red-600 dark:text-red-400 uppercase tracking-wide">
                                      {item.originalText === "MISSING"
                                        ? "Missing from Resume"
                                        : "Current Text"}
                                    </label>
                                    {item.originalText !== "MISSING" && (
                                      <Button
                                        size="sm"
                                        variant="ghost"
                                        onClick={() =>
                                          copyToClipboard(item.originalText)
                                        }
                                        className="h-6 text-xs text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30"
                                      >
                                        <Copy className="h-3 w-3 mr-1" />
                                        Copy
                                      </Button>
                                    )}
                                  </div>
                                  <div className="p-3 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-md">
                                    <p className="text-sm text-red-900 dark:text-red-100">
                                      {item.originalText === "MISSING"
                                        ? "⚠️ This content is not present in your current resume"
                                        : item.originalText}
                                    </p>
                                  </div>
                                </div>
                                <div className="space-y-2">
                                  <div className="flex items-center justify-between">
                                    <label className="text-xs font-semibold text-green-600 dark:text-green-400 uppercase tracking-wide">
                                      Suggested Text
                                    </label>
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      onClick={() =>
                                        copyToClipboard(item.improvedText)
                                      }
                                      className="h-6 text-xs text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-950/30"
                                    >
                                      <Copy className="h-3 w-3 mr-1" />
                                      Copy
                                    </Button>
                                  </div>
                                  <div className="p-3 bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 rounded-md">
                                    <p className="text-sm text-green-900 dark:text-green-100">
                                      {item.improvedText}
                                    </p>
                                  </div>
                                </div>
                              </div>
                            </AccordionContent>
                          </AccordionItem>
                        ))}
                      </Accordion>
                    ) : (
                      <p className="text-sm text-gray-600 dark:text-gray-400 text-center py-8">
                        No text improvement suggestions available.
                      </p>
                    )}
                  </TabsContent>

                  {/* Keyword Improvements Tab */}
                  <TabsContent value="keyword" className="mt-4">
                    {result.keywordSuggestions &&
                      result.keywordSuggestions.length > 0 ? (
                      <Accordion type="single" collapsible className="w-full">
                        {result.keywordSuggestions.map((item, idx) => (
                          <AccordionItem
                            key={idx}
                            value={`keyword-${idx}`}
                            className="border-slate-200 dark:border-slate-700"
                          >
                            <AccordionTrigger className="text-left hover:no-underline">
                              <div className="flex items-start gap-2">
                                <span className="text-purple-600 dark:text-purple-400 mt-0.5 shrink-0 font-semibold">
                                  {idx + 1}.
                                </span>
                                <span className="text-sm text-gray-900 dark:text-gray-100">
                                  {item.suggestion}
                                </span>
                              </div>
                            </AccordionTrigger>
                            <AccordionContent>
                              <div className="space-y-4 pt-2">
                                <div className="space-y-2">
                                  <div className="flex items-center justify-between">
                                    <label className="text-xs font-semibold text-red-600 dark:text-red-400 uppercase tracking-wide">
                                      {item.originalText === "MISSING"
                                        ? "Missing from Resume"
                                        : "Current Text"}
                                    </label>
                                    {item.originalText !== "MISSING" && (
                                      <Button
                                        size="sm"
                                        variant="ghost"
                                        onClick={() =>
                                          copyToClipboard(item.originalText)
                                        }
                                        className="h-6 text-xs text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30"
                                      >
                                        <Copy className="h-3 w-3 mr-1" />
                                        Copy
                                      </Button>
                                    )}
                                  </div>
                                  <div className="p-3 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-md">
                                    <p className="text-sm text-red-900 dark:text-red-100">
                                      {item.originalText === "MISSING"
                                        ? "⚠️ This content is not present in your current resume"
                                        : item.originalText}
                                    </p>
                                  </div>
                                </div>
                                <div className="space-y-2">
                                  <div className="flex items-center justify-between">
                                    <label className="text-xs font-semibold text-green-600 dark:text-green-400 uppercase tracking-wide">
                                      Suggested Text
                                    </label>
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      onClick={() =>
                                        copyToClipboard(item.improvedText)
                                      }
                                      className="h-6 text-xs text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-950/30"
                                    >
                                      <Copy className="h-3 w-3 mr-1" />
                                      Copy
                                    </Button>
                                  </div>
                                  <div className="p-3 bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 rounded-md">
                                    <p className="text-sm text-green-900 dark:text-green-100">
                                      {item.improvedText}
                                    </p>
                                  </div>
                                </div>
                              </div>
                            </AccordionContent>
                          </AccordionItem>
                        ))}
                      </Accordion>
                    ) : (
                      <p className="text-sm text-gray-600 dark:text-gray-400 text-center py-8">
                        No keyword improvement suggestions available.
                      </p>
                    )}
                  </TabsContent>

                  {/* Other Improvements Tab */}
                  <TabsContent value="other" className="mt-4">
                    {result.otherSuggestions &&
                      result.otherSuggestions.length > 0 ? (
                      <Accordion type="single" collapsible className="w-full">
                        {result.otherSuggestions.map((item, idx) => (
                          <AccordionItem
                            key={idx}
                            value={`other-${idx}`}
                            className="border-slate-200 dark:border-slate-700"
                          >
                            <AccordionTrigger className="text-left hover:no-underline">
                              <div className="flex items-start gap-2">
                                <span className="text-pink-600 dark:text-pink-400 mt-0.5 shrink-0 font-semibold">
                                  {idx + 1}.
                                </span>
                                <span className="text-sm text-gray-900 dark:text-gray-100">
                                  {item.suggestion}
                                </span>
                              </div>
                            </AccordionTrigger>
                            <AccordionContent>
                              <div className="space-y-4 pt-2">
                                <div className="space-y-2">
                                  <div className="flex items-center justify-between">
                                    <label className="text-xs font-semibold text-red-600 dark:text-red-400 uppercase tracking-wide">
                                      {item.originalText === "MISSING"
                                        ? "Missing from Resume"
                                        : "Current Text"}
                                    </label>
                                    {item.originalText !== "MISSING" && (
                                      <Button
                                        size="sm"
                                        variant="ghost"
                                        onClick={() =>
                                          copyToClipboard(item.originalText)
                                        }
                                        className="h-6 text-xs text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30"
                                      >
                                        <Copy className="h-3 w-3 mr-1" />
                                        Copy
                                      </Button>
                                    )}
                                  </div>
                                  <div className="p-3 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-md">
                                    <p className="text-sm text-red-900 dark:text-red-100">
                                      {item.originalText === "MISSING"
                                        ? "⚠️ This content is not present in your current resume"
                                        : item.originalText}
                                    </p>
                                  </div>
                                </div>
                                <div className="space-y-2">
                                  <div className="flex items-center justify-between">
                                    <label className="text-xs font-semibold text-green-600 dark:text-green-400 uppercase tracking-wide">
                                      Suggested Text
                                    </label>
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      onClick={() =>
                                        copyToClipboard(item.improvedText)
                                      }
                                      className="h-6 text-xs text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-950/30"
                                    >
                                      <Copy className="h-3 w-3 mr-1" />
                                      Copy
                                    </Button>
                                  </div>
                                  <div className="p-3 bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 rounded-md">
                                    <p className="text-sm text-green-900 dark:text-green-100">
                                      {item.improvedText}
                                    </p>
                                  </div>
                                </div>
                              </div>
                            </AccordionContent>
                          </AccordionItem>
                        ))}
                      </Accordion>
                    ) : (
                      <p className="text-sm text-gray-600 dark:text-gray-400 text-center py-8">
                        No other improvement suggestions available.
                      </p>
                    )}
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          )}




          {/* Action Buttons */}
          <div className="grid md:grid-cols-2 gap-4">
            <Button
              onClick={navigateToOptimizer}
              className="w-full bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 hover:from-blue-600 hover:via-purple-600 hover:to-pink-600 text-white font-semibold shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-[1.02]"
              size="lg"
            >
              <Sparkles className="mr-2 h-4 w-4" />
              Generate Optimized Resume
            </Button>

            <Button
              onClick={resetForm}
              variant="outline"
              className="w-full border-purple-300 dark:border-purple-700 text-purple-700 dark:text-purple-300 hover:bg-purple-50 dark:hover:bg-purple-950/30 font-semibold shadow-md hover:shadow-lg transition-all duration-300"
              size="lg"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Analyze Another Job (1 Credit)
            </Button>
          </div>

          <p className="text-xs text-center text-gray-600 dark:text-gray-400">
            💡 Generate an AI-optimized resume that incorporates all suggestions
            to maximize your ATS score
          </p>
        </div >
      )}

      {/* Dialogs */}
      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent className="border-purple-200 dark:border-purple-800">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-gray-900 dark:text-gray-100">
              <Coins className="h-5 w-5 text-purple-600 dark:text-purple-400" />
              Confirm Job Match Analysis
            </AlertDialogTitle>
            <AlertDialogDescription className="text-gray-700 dark:text-gray-300">
              This will use <strong>1 credit</strong> to analyze how well your
              resume matches this job.
              <br />
              <br />
              You currently have <strong>{balance?.credits ?? 0}</strong>{" "}
              {balance?.credits === 1 ? "credit" : "credits"} remaining.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-slate-300 dark:border-slate-700">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmAnalysis}
              className="bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 hover:from-blue-600 hover:via-purple-600 hover:to-pink-600 text-white"
            >
              Use 1 Credit
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <InsufficientCreditsModal
        open={showInsufficientModal}
        onOpenChange={setShowInsufficientModal}
        onUpgrade={() => {
          setShowInsufficientModal(false);
          setShowUpgradeModal(true);
        }}
        requiredCredits={1}
      />

      <UpgradeModal
        open={showUpgradeModal}
        onOpenChange={setShowUpgradeModal}
        onSuccess={() => {
          refreshBalance();
          toast({
            title: "Credits Added!",
            description: "You can now analyze job compatibility.",
          });
        }}
      />
    </div >
  );
}
