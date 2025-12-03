"use client";

import { useState, useEffect } from "react";
import ResumeOptimizationLoader from "./ResumeOptimizationLoader";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Sparkles, FileText, Download, Eye, ArrowLeft, CheckCircle, Copy, EyeOff, Zap } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { useSession } from "next-auth/react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";
import { useCredits } from "@/hooks/useCredits";
import InsufficientCreditsModal from "@/components/credits/InsufficientCreditsModal";
import UpgradeModal from "@/components/credits/UpgradeModal";
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

// Import resume templates
import { ModernTemplate } from "@/components/resume/templates/Modern";
import { ProfessionalTemplate } from "@/components/resume/templates/Professional";
import { CreativeTemplate } from "@/components/resume/templates/CreativeTemplate";
import { MinimalTemplate } from "@/components/resume/templates/Minimal";
import { ResumeData } from "@/components/resume/templates/types";

const TEMPLATES = {
  modern: ModernTemplate,
  professional: ProfessionalTemplate,
  creative: CreativeTemplate,
  minimal: MinimalTemplate,
};

export default function ResumeOptimizerPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session, status } = useSession();

  const [isGenerating, setIsGenerating] = useState(false);
  const [optimizedResume, setOptimizedResume] = useState<ResumeData | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<keyof typeof TEMPLATES | "latex">("modern");
  const [showPreview, setShowPreview] = useState(false);
  const [analysisData, setAnalysisData] = useState<any>(null);
  const [isGeneratingLatex, setIsGeneratingLatex] = useState(false);
  const [latexCode, setLatexCode] = useState<string | null>(null);
  const [showLatexPreview, setShowLatexPreview] = useState(false);
  const [showOptimizationLoader, setShowOptimizationLoader] = useState(false);
  const [showInsufficientModal, setShowInsufficientModal] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  // New state for inline editing and PDF preview
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [resumeId, setResumeId] = useState<string | null>(null);
  const [previewPdfUrl, setPreviewPdfUrl] = useState<string | null>(null);
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);

  const { balance, checkCredits, refreshBalance } = useCredits();

  const updateField = <T extends keyof ResumeData>(
    section: T,
    index: number | null,
    field: string,
    value: string
  ) => {
    setOptimizedResume((prev) => {
      if (!prev) return null;
      if (index === null) {
        if (section === 'personalDetails') {
          return {
            ...prev,
            personalDetails: { ...prev.personalDetails, [field]: value },
          };
        }
        if (section === 'objective') return { ...prev, objective: value };
        if (section === 'jobTitle') return { ...prev, jobTitle: value };
        return prev;
      }
      const sectionArray = [...(prev[section] as any[])];
      sectionArray[index] = { ...sectionArray[index], [field]: value };
      return { ...prev, [section]: sectionArray };
    });
  };

  useEffect(() => {
    const storedData = sessionStorage.getItem('atsAnalysisData');
    if (storedData) {
      try {
        const data = JSON.parse(storedData);
        setAnalysisData(data);
      } catch (error) {
        // console.error("Error parsing analysis data:", error);
        toast({
          title: "Error",
          description: "Failed to load analysis data. Please run ATS analysis again.",
          variant: "destructive",
        });
      }
    } else {
      toast({
        title: "No Analysis Data",
        description: "Please run an ATS analysis first.",
        variant: "destructive",
      });
    }
  }, []);

  // Generate PDF Preview
  useEffect(() => {
    if (!showPreview || !optimizedResume) {
      setPreviewPdfUrl((prev) => {
        if (prev) window.URL.revokeObjectURL(prev);
        return null;
      });
      return;
    }

    let isCancelled = false;

    const generatePreview = async () => {
      try {
        setIsPreviewLoading(true);
        const queryParams = new URLSearchParams({
          data: JSON.stringify(optimizedResume),
          template: selectedTemplate !== 'latex' ? selectedTemplate : 'modern',
          accentColor: optimizedResume.accentColor || '#3b82f6',
          fontFamily: optimizedResume.fontFamily || 'Inter',
          sectionOrder: JSON.stringify(optimizedResume.sectionOrder || []),
          showIcons: (optimizedResume.showIcons ?? true).toString(),
        }).toString();

        const response = await fetch(`/api/pdf?${queryParams}`, {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
        });

        if (!response.ok) throw new Error('Failed to generate PDF preview');

        const blob = await response.blob();
        if (blob.size === 0) throw new Error('Generated PDF preview is empty');

        const url = window.URL.createObjectURL(blob);
        if (isCancelled) {
          window.URL.revokeObjectURL(url);
          return;
        }

        setPreviewPdfUrl((prev) => {
          if (prev) window.URL.revokeObjectURL(prev);
          return url;
        });
      } catch (error) {
        // console.error('Error generating PDF preview:', error);
        toast({
          title: 'Preview Failed',
          description: 'Unable to load PDF preview.',
          variant: 'destructive',
        });
      } finally {
        if (!isCancelled) setIsPreviewLoading(false);
      }
    };

    // Debounce preview generation if editing
    const timeoutId = setTimeout(generatePreview, isEditing ? 1000 : 0);

    return () => {
      isCancelled = true;
      clearTimeout(timeoutId);
    };
  }, [showPreview, optimizedResume, selectedTemplate, isEditing]);

  const handleSave = async () => {
    if (!optimizedResume || !session?.user?.email) return;

    try {
      setIsSaving(true);

      if (resumeId) {
        // Update existing resume
        const response = await fetch(`/api/resumes/${resumeId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(optimizedResume),
        });

        if (!response.ok) throw new Error('Failed to update resume');
      } else {
        // Create new resume
        const response = await fetch('/api/resumes/create', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: (session.user as any).id, // Assuming session has user ID, or backend handles it
            userEmail: session.user.email,
            resumeData: optimizedResume,
          }),
        });

        if (!response.ok) throw new Error('Failed to create resume');

        const data = await response.json();
        setResumeId(data.resumeId);
      }

      setIsEditing(false);
      toast({
        title: "Success",
        description: "Resume saved successfully!",
      });

      // Refresh profile resumes list if needed (optional, but good practice)
    } catch (error) {
      // console.error("Error saving resume:", error);
      toast({
        title: "Error",
        description: "Failed to save resume. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const generateOptimizedResumeLatex = async () => {
    if (!analysisData) {
      toast({
        title: "Missing Data",
        description: "Analysis data not found. Please run ATS analysis first.",
        variant: "destructive",
      });
      return;
    }

    setIsGeneratingLatex(true);

    try {
      // Handle both data structures
      const result = analysisData.result || analysisData;
      const suggestions = result.suggestions || [];
      const missingKeywords = result.missingKeywords || [];

      toast({
        title: "Generating LaTeX Code...",
        description: "Converting to LaTeX and applying improvements. This may take 20-30 seconds.",
      });

      const response = await fetch("/api/optimize-resume-latex", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          resumeText: analysisData.resumeText,
          suggestions: suggestions,
          missingKeywords: missingKeywords,
          action: "preview",
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to generate LaTeX code");
      }

      const data = await response.json();
      setLatexCode(data.latexCode);
      setShowLatexPreview(true);

      toast({
        title: "LaTeX Code Generated! 📄",
        description: "Review the code below. You can copy it or download the .tex file.",
      });
    } catch (error) {
      // console.error("Error generating LaTeX code:", error);
      toast({
        title: "Generation Failed",
        description: error instanceof Error ? error.message : "Failed to generate LaTeX code. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsGeneratingLatex(false);
    }
  };

  const copyLatexToClipboard = async () => {
    if (!latexCode) return;

    try {
      await navigator.clipboard.writeText(latexCode);
      toast({
        title: "Copied to Clipboard! 📋",
        description: "LaTeX code has been copied. You can paste it into Overleaf or any LaTeX editor.",
      });
    } catch (error) {
      // console.error("Error copying to clipboard:", error);
      toast({
        title: "Copy Failed",
        description: "Failed to copy to clipboard. Please select and copy manually.",
        variant: "destructive",
      });
    }
  };

  const downloadLatexCodeOnly = async () => {
    try {
      // Handle both data structures
      const result = analysisData.result || analysisData;
      const suggestions = result.suggestions || [];
      const missingKeywords = result.missingKeywords || [];

      toast({
        title: "Generating LaTeX Code...",
        description: "Creating optimized LaTeX code for your resume.",
      });

      const response = await fetch("/api/optimize-resume-latex-code", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          resumeText: analysisData.resumeText,
          suggestions: suggestions,
          missingKeywords: missingKeywords,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to generate LaTeX code");
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);

      const link = document.createElement('a');
      link.href = url;
      link.download = 'optimized-resume.tex';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      window.URL.revokeObjectURL(url);

      toast({
        title: "LaTeX Code Downloaded! 📄",
        description: "You can compile this .tex file using Overleaf (overleaf.com) or any LaTeX editor.",
      });
    } catch (error) {
      // console.error("Error downloading LaTeX code:", error);
      toast({
        title: "Download Failed",
        description: "Failed to generate LaTeX code. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleGenerateClick = async () => {
    if (!analysisData) {
      toast({
        title: "Missing Data",
        description: "Analysis data not found. Please run ATS analysis first.",
        variant: "destructive",
      });
      return;
    }

    // Auth Check
    if (status === "unauthenticated") {
      toast({
        title: "Sign In Required",
        description: "Please sign in to optimize your resume.",
        variant: "destructive",
      });
      router.push("/signin");
      return;
    }

    const hasEnoughCredits = await checkCredits(5);
    if (!hasEnoughCredits) {
      setShowInsufficientModal(true);
      return;
    }

    setShowConfirmModal(true);
  };

  const generateOptimizedResume = async () => {
    setShowConfirmModal(false);
    setShowOptimizationLoader(true);
    setIsGenerating(true);

    try {
      // Handle both data structures: from ATS checker (with result object) and from analysis history (direct fields)
      const result = analysisData.result || analysisData;
      const suggestions = result.suggestions || [];
      const missingKeywords = result.missingKeywords || [];
      const analysisId = analysisData.analysisId || result.analysisId;

      // If we have neither analysisId nor enough inline data, block with a clear message
      if (!analysisId && (!analysisData.resumeText || !analysisData.jobDescription || suggestions.length === 0)) {
        throw new Error("Missing analysis reference. Please run an ATS analysis first.");
      }

      const response = await fetch("/api/optimize-resume", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          analysisId,
          // These are optional now; backend will fall back to AnalysisResult when missing
          resumeText: analysisData.resumeText,
          jobDescription: analysisData.jobDescription,
          suggestions,
          missingKeywords,
          currentScore: result.currentScore,
          potentialScore: result.potentialScore,
        }),
      });

      if (!response.ok) {
        const error = await response.json();

        if (response.status === 402) {
          setShowInsufficientModal(true);
          throw new Error(error.message || "Insufficient credits");
        }

        throw new Error(error.error || "Failed to generate optimized resume");
      }

      const data = await response.json();

      await refreshBalance();

      const resumeData: ResumeData = {
        personalDetails: data.personalDetails,
        objective: data.objective || "",
        jobTitle: data.jobTitle || "",
        workExperience: data.workExperience || [],
        education: data.education || [],
        skills: data.skills || [],
        projects: data.projects || [],
        languages: data.languages || [],
        certifications: data.certifications || [],
        customSections: data.customSections || [],
        accentColor: "#3b82f6",
        fontFamily: "Inter",
        showIcons: true,
      };

      setOptimizedResume(resumeData);
      setShowPreview(true);

      toast({
        title: "Resume Optimized & Saved! 🎉",
        description: `Your resume has been optimized and saved. View it in your profile.`,
      });
    } catch (error) {
      // console.error("Error generating optimized resume:", error);
      toast({
        title: "Generation Failed",
        description: error instanceof Error ? error.message : "Failed to generate optimized resume",
        variant: "destructive",
      });
    } finally {
      setTimeout(() => {
        setShowOptimizationLoader(false);
        setIsGenerating(false);
      }, 3000);
    }
  };

  const downloadPDF = async () => {
    if (!optimizedResume) {
      toast({
        title: "No Resume Found",
        description: "Please generate an optimized resume first.",
        variant: "destructive",
      });
      return;
    }

    try {
      // Dynamic import to avoid SSR issues
      const html2pdf = (await import('html2pdf.js')).default;

      toast({
        title: "Generating PDF...",
        description: "Rendering your resume. This may take 30-60 seconds on mobile...",
      });

      let element = document.getElementById('resume-content');
      if (!element) {
        // If element is not found, it might be because preview is hidden
        setShowPreview(true);
        // Wait a tick for React to render
        await new Promise(resolve => setTimeout(resolve, 100));
        element = document.getElementById('resume-content');
        if (!element) {
          throw new Error('Resume preview must be visible to download. Please click "Show Preview".');
        }
      }

      const opt = {
        margin: [0, 0, 0, 0], // Minimal margin, let CSS handle it
        filename: `${optimizedResume.personalDetails.fullName.replace(/\s+/g, '_')}_Optimized_Resume.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        enableLinks: true, // Enable hyperlinks
        html2canvas: {
          scale: 2, // High quality
          useCORS: true, // Critical for external images
          letterRendering: true,
          allowTaint: true,
          timeout: 60000, // 60 seconds
          imageTimeout: 15000, // 15 seconds for images
        },
        jsPDF: {
          unit: 'mm',
          format: 'a4',
          orientation: 'portrait',
          compress: true,
        },
        pagebreak: {
          mode: ['avoid-all', 'css', 'legacy'],
          avoid: ['.work-item', '.education-item', '.project-item', 'section', 'article']
        },
      };

      // Add loading indicator
      const loadingToast = toast({
        title: "Processing...",
        description: "Converting HTML to PDF canvas. Please do not close this tab.",
        duration: 60000,
      });

      await html2pdf().set(opt).from(element).save();

      toast({
        title: "PDF Downloaded! 🎉",
        description: "Your optimized resume has been saved successfully.",
      });

    } catch (error) {
      // console.error("Error downloading PDF:", error);
      toast({
        title: "Download Failed",
        description: error instanceof Error ? error.message : "Failed to generate PDF. Please try again.",
        variant: "destructive",
      });
    }
  };


  const saveResume = async () => {
    if (!optimizedResume) return;

    if (!session) {
      toast({
        title: "Sign In Required",
        description: "Please sign in to save your resume.",
        variant: "destructive",
      });
      router.push('/signin');
      return;
    }

    try {
      sessionStorage.setItem('optimizedResumeData', JSON.stringify(optimizedResume));
      router.push('/resume/create?optimized=true');
    } catch (error) {
      // console.error("Error saving resume:", error);
      toast({
        title: "Save Failed",
        description: "Failed to save resume. Please try again.",
        variant: "destructive",
      });
    }
  };

  const TemplateComponent = selectedTemplate !== "latex"
    ? TEMPLATES[selectedTemplate]
    : null;

  if (status === "loading") {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-gradient-to-br from-slate-50 via-white to-indigo-50/30 dark:from-slate-950 dark:via-slate-900 dark:to-indigo-950/30">
      {showOptimizationLoader && <ResumeOptimizationLoader />}

      {/* Confirmation Dialog */}
      <AlertDialog open={showConfirmModal} onOpenChange={setShowConfirmModal}>
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-lg">
              <div className="p-2 bg-gradient-to-br from-violet-500 to-purple-600 rounded-lg">
                <Sparkles className="h-4 w-4 text-white" />
              </div>
              Generate Optimized
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3 pt-3">
                <div className="flex items-center justify-between p-4 bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-orange-950/30 rounded-xl border border-amber-200/50 dark:border-amber-800/50 shadow-sm">
                  <span className="text-sm font-medium text-amber-900 dark:text-amber-100">Credit Cost</span>
                  <div className="flex items-center gap-1.5">
                    <Zap className="h-4 w-4 text-amber-600" />
                    <span className="text-xl font-bold bg-gradient-to-r from-amber-600 to-orange-600 bg-clip-text text-transparent">5</span>
                  </div>
                </div>

                <div className="space-y-2 text-sm">
                  <div className="font-medium text-slate-900 dark:text-slate-100">What you'll get:</div>
                  <ul className="space-y-1.5 text-slate-600 dark:text-slate-400">
                    <li className="flex items-start gap-2">
                      <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 shrink-0" />
                      <span>AI-powered content optimization</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 shrink-0" />
                      <span>Strategic keyword integration</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 shrink-0" />
                      <span>ATS-optimized formatting</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 shrink-0" />
                      <span>Professional resume templates</span>
                    </li>
                  </ul>
                </div>

                <div className="flex items-center gap-2 p-3 bg-slate-100 dark:bg-slate-800 rounded-lg">
                  <div className="p-1.5 bg-white dark:bg-slate-700 rounded">
                    <Zap className="h-3.5 w-3.5 text-slate-600 dark:text-slate-400" />
                  </div>
                  <span className="text-xs text-slate-600 dark:text-slate-400">
                    Balance: <strong className="text-slate-900 dark:text-slate-100">{balance?.credits || 0} credits</strong>
                  </span>
                </div>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={generateOptimizedResume}
              className="bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 text-white shadow-lg"
            >
              <Sparkles className="mr-1.5 h-3.5 w-3.5" />
              Generate Resume
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Credit Modals */}
      <InsufficientCreditsModal
        open={showInsufficientModal}
        onOpenChange={setShowInsufficientModal}
        onUpgrade={() => {
          setShowInsufficientModal(false);
          setShowUpgradeModal(true);
        }}
        requiredCredits={5}
      />

      <UpgradeModal open={showUpgradeModal} onOpenChange={setShowUpgradeModal} />

      {/* Minimal Header */}


      {/* Main Content - Split Screen */}
      <div className="flex-1 overflow-hidden">
        <div className="h-full grid grid-cols-1 lg:grid-cols-2 gap-0">
          {/* Left Panel - Controls */}
          <div className="h-full flex flex-col bg-white dark:bg-slate-900 p-3 lg:p-4 overflow-hidden">
            <div className="max-w-xl mx-auto w-full flex-1 flex flex-col min-h-0">
              {!optimizedResume ? (
                <div className="flex flex-col gap-3 min-h-0 flex-1">
                  {/* Hero Section - Compact */}
                  <div className="text-center space-y-2 py-2">
                    <div className="inline-flex p-2 bg-gradient-to-br from-violet-500 to-purple-600 rounded-xl shadow-lg">
                      <Sparkles className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <h1 className="text-xl font-bold bg-gradient-to-r from-violet-600 to-purple-600 bg-clip-text text-transparent">
                        AI Resume Optimizer
                      </h1>
                      <p className="text-xs text-slate-600 dark:text-slate-400">
                        Transform your resume with AI-powered optimization
                      </p>
                    </div>
                  </div>

                  {/* Score Display - Compact */}
                  {analysisData && (
                    <Card className="border-2 border-violet-100 dark:border-violet-900/30 bg-gradient-to-br from-violet-50/50 to-purple-50/50 dark:from-violet-950/20 dark:to-purple-950/20 shadow-sm">
                      <CardContent className="p-3">
                        <div className="flex items-center justify-between">
                          <div className="text-center flex-1">
                            <div className="text-2xl font-bold text-slate-700 dark:text-slate-300">
                              {analysisData.result.currentScore}%
                            </div>
                            <div className="text-xs font-medium text-slate-500 dark:text-slate-400">
                              Current
                            </div>
                          </div>

                          <div className="flex flex-col items-center px-3">
                            <div className="p-1.5 bg-gradient-to-br from-green-400 to-emerald-500 rounded-full shadow-md mb-1">
                              <ArrowLeft className="h-3 w-3 text-white rotate-180" />
                            </div>
                            <div className="px-2 py-0.5 bg-gradient-to-r from-green-500 to-emerald-600 rounded-full shadow-sm">
                              <span className="text-xs font-bold text-white">
                                +{analysisData.result.potentialScore - analysisData.result.currentScore}%
                              </span>
                            </div>
                          </div>

                          <div className="text-center flex-1">
                            <div className="text-2xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">
                              {analysisData.result.potentialScore}%
                            </div>
                            <div className="text-xs font-medium text-slate-500 dark:text-slate-400">
                              Optimized
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {/* Main CTA Card - Scrollable Only Here */}
                  <Card className="border-2 border-slate-200 dark:border-slate-700 shadow-md">
                    <CardContent className="p-3 pb-3 space-y-2">
                      <div className="flex items-start gap-2 p-2 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 rounded-lg border border-blue-100 dark:border-blue-900/30">
                        <CheckCircle className="h-3.5 w-3.5 text-blue-600 mt-0.5 shrink-0" />
                        <div className="space-y-1 flex-1">
                          <p className="text-xs font-semibold text-blue-900 dark:text-blue-100">
                            What happens next:
                          </p>
                          <ul className="text-xs text-blue-800 dark:text-blue-200 space-y-0.5">
                            <li className="flex items-start gap-1">
                              <span className="text-blue-600 dark:text-blue-400">•</span>
                              <span>AI applies all improvements</span>
                            </li>
                            <li className="flex items-start gap-1">
                              <span className="text-blue-600 dark:text-blue-400">•</span>
                              <span>Keywords integrated naturally</span>
                            </li>
                            <li className="flex items-start gap-1">
                              <span className="text-blue-600 dark:text-blue-400">•</span>
                              <span>ATS-optimized formatting</span>
                            </li>
                            <li className="flex items-start gap-1">
                              <span className="text-blue-600 dark:text-blue-400">•</span>
                              <span>Multiple templates available</span>
                            </li>
                          </ul>
                        </div>
                      </div>

                      {!session && (
                        <Alert className="border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/20 py-1.5">
                          <AlertCircle className="h-3 w-3 text-amber-600" />
                          <AlertTitle className="text-xs font-semibold text-amber-900 dark:text-amber-100">
                            Not signed in
                          </AlertTitle>
                          <AlertDescription className="text-xs text-amber-800 dark:text-amber-200">
                            Sign in to save your optimized resume
                          </AlertDescription>
                        </Alert>
                      )}

                      <Button
                        onClick={handleGenerateClick}
                        disabled={isGenerating || !analysisData}
                        className="w-full h-9 bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 text-white shadow-lg text-sm"
                      >
                        {isGenerating ? (
                          <>
                            <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                            Generating...
                          </>
                        ) : (
                          <>
                            <Sparkles className="mr-2 h-3.5 w-3.5" />
                            Generate Optimized Resume
                          </>
                        )}
                      </Button>
                    </CardContent>
                  </Card>



                  {/* Analyze Another Job Button */}
                  <Button
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      try {
                        if (typeof window !== 'undefined') {
                          sessionStorage.removeItem('atsAnalysisData');
                          sessionStorage.removeItem('currentAnalysisResult');
                          sessionStorage.removeItem('atsFormData');
                        }
                        if (router && router.push) {
                          router.push('/ats-checker');
                        } else {
                          window.location.href = '/ats-checker';
                        }
                      } catch (error) {
                        console.error('Error:', error);
                        window.location.href = '/ats-checker';
                      }
                    }}
                    variant="outline"
                    size="sm"
                    className="w-full h-9 text-xs border-2"
                    type="button"
                  >
                    Analyze Another Job
                  </Button>
                </div>
              ) : (
                <div className="flex flex-col gap-3 min-h-0 flex-1 overflow-y-auto">
                  {/* Success Message - Compact */}
                  <div className="text-center space-y-1.5 py-2">
                    <div className="inline-flex p-2 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl shadow-lg">
                      <CheckCircle className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">
                        Resume Optimized!
                      </h2>
                      <p className="text-xs text-slate-600 dark:text-slate-400">
                        Choose a template and download
                      </p>
                    </div>
                  </div>

                  {/* Actions Card */}
                  <Card className="border-2 border-violet-200 dark:border-violet-800 shadow-md">
                    <CardHeader className="pb-2 pt-3">
                      <CardTitle className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                        Download Options
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2 pb-3">
                      {selectedTemplate === "latex" ? (
                        <>
                          <Button
                            onClick={copyLatexToClipboard}
                            size="sm"
                            className="w-full h-8 text-xs bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white"
                            disabled={!latexCode}
                          >
                            <Copy className="mr-1.5 h-3 w-3" />
                            Copy LaTeX Code
                          </Button>

                          <Button
                            onClick={downloadLatexCodeOnly}
                            variant="outline"
                            size="sm"
                            className="w-full h-8 text-xs border-2"
                          >
                            <Download className="mr-1.5 h-3 w-3" />
                            Download .tex File
                          </Button>

                          <Alert className="border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/20 py-1.5">
                            <AlertCircle className="h-3 w-3 text-amber-600" />
                            <AlertDescription className="text-xs text-amber-800 dark:text-amber-200">
                              Use <a href="https://overleaf.com" target="_blank" rel="noopener noreferrer" className="underline font-semibold">Overleaf</a> to compile
                            </AlertDescription>
                          </Alert>
                        </>
                      ) : (
                        <>
                          <Button
                            onClick={downloadPDF}
                            size="sm"
                            className="w-full h-8 text-xs bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 text-white"
                            disabled={isEditing}
                          >
                            <Download className="mr-1.5 h-3 w-3" />
                            Download PDF
                          </Button>

                          <Button
                            onClick={() => setShowPreview((prev) => !prev)}
                            variant="outline"
                            size="sm"
                            className="w-full h-8 text-xs border-2"
                            disabled={isEditing}
                          >
                            {showPreview ? (
                              <>
                                <EyeOff className="mr-1.5 h-3 w-3" />
                                Hide Preview
                              </>
                            ) : (
                              <>
                                <Eye className="mr-1.5 h-3 w-3" />
                                PDF Preview
                              </>
                            )}
                          </Button>

                          {session && (
                            <>
                              {isEditing ? (
                                <div className="flex gap-2">
                                  <Button
                                    onClick={handleSave}
                                    size="sm"
                                    className="flex-1 h-8 text-xs bg-green-600 hover:bg-green-700 text-white"
                                    disabled={isSaving}
                                  >
                                    {isSaving ? (
                                      <Loader2 className="mr-1.5 h-3 w-3 animate-spin" />
                                    ) : (
                                      <CheckCircle className="mr-1.5 h-3 w-3" />
                                    )}
                                    Save
                                  </Button>
                                  <Button
                                    onClick={() => setIsEditing(false)}
                                    variant="outline"
                                    size="sm"
                                    className="flex-1 h-8 text-xs border-red-200 hover:bg-red-50 text-red-600"
                                    disabled={isSaving}
                                  >
                                    Cancel
                                  </Button>
                                </div>
                              ) : (
                                <Button
                                  onClick={() => {
                                    setIsEditing(true);
                                    setShowPreview(false);
                                  }}
                                  variant="outline"
                                  size="sm"
                                  className="w-full h-8 text-xs border-2"
                                >
                                  <FileText className="mr-1.5 h-3 w-3" />
                                  Edit Resume
                                </Button>
                              )}
                            </>
                          )}
                        </>
                      )}
                    </CardContent>
                  </Card>

                  {/* Template Selection */}
                  <Card className="border-2 border-slate-200 dark:border-slate-700">
                    <CardHeader className="pb-2 pt-3">
                      <CardTitle className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                        Select Template
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2 pb-3">
                      <div className="grid grid-cols-2 gap-2">
                        {Object.keys(TEMPLATES).map((template) => (
                          <button
                            key={template}
                            onClick={() => setSelectedTemplate(template as keyof typeof TEMPLATES)}
                            className={`p-2 border-2 rounded-lg transition-all text-xs font-medium capitalize ${selectedTemplate === template
                              ? "border-violet-500 bg-gradient-to-br from-violet-50 to-purple-50 dark:from-violet-950/30 dark:to-purple-950/30 text-violet-900 dark:text-violet-100"
                              : "border-slate-200 dark:border-slate-700 hover:border-violet-300 dark:hover:border-violet-700 text-slate-600 dark:text-slate-400"
                              }`}
                          >
                            {template}
                          </button>
                        ))}
                      </div>

                      <button
                        onClick={() => {
                          setSelectedTemplate("latex");
                          if (!latexCode && !isGeneratingLatex) {
                            generateOptimizedResumeLatex();
                          }
                        }}
                        className={`w-full p-2 border-2 rounded-lg transition-all ${selectedTemplate === "latex"
                          ? "border-amber-500 bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-orange-950/30"
                          : "border-slate-200 dark:border-slate-700 hover:border-amber-300 dark:hover:border-amber-700"
                          }`}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-xs font-semibold text-amber-900 dark:text-amber-100 text-left">
                              LaTeX Template
                            </p>
                            <p className="text-xs text-amber-700 dark:text-amber-300 text-left">
                              Advanced
                            </p>
                          </div>
                          <span className="text-base">⭐</span>
                        </div>
                      </button>
                    </CardContent>
                  </Card>

                  {/* Action Buttons */}
                  <div className="space-y-2">
                    {selectedTemplate !== "latex" && (
                      <Button
                        onClick={() => setShowPreview(!showPreview)}
                        variant="outline"
                        size="sm"
                        className="w-full border-2 h-8 text-xs"
                      >
                        {showPreview ? (
                          <>
                            <EyeOff className="mr-1.5 h-3 w-3" />
                            Hide Preview
                          </>
                        ) : (
                          <>
                            <Eye className="mr-1.5 h-3 w-3" />
                            Show Preview
                          </>
                        )}
                      </Button>
                    )}

                    <Button
                      onClick={() => {
                        setOptimizedResume(null);
                        setShowPreview(false);
                        setLatexCode(null);
                      }}
                      variant="ghost"
                      size="sm"
                      className="w-full h-8 text-xs"
                    >
                      Generate New Resume
                    </Button>

                    <Button
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        try {
                          if (typeof window !== 'undefined') {
                            sessionStorage.removeItem('atsAnalysisData');
                            sessionStorage.removeItem('currentAnalysisResult');
                            sessionStorage.removeItem('atsFormData');
                          }
                          if (router && router.push) {
                            router.push('/ats-checker');
                          } else {
                            window.location.href = '/ats-checker';
                          }
                        } catch (error) {
                          console.error('Error:', error);
                          window.location.href = '/ats-checker';
                        }
                      }}
                      variant="outline"
                      size="sm"
                      className="w-full h-8 text-xs border-2"
                      type="button"
                    >
                      Analyze Another Job
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>


          {/* Right Panel - Scrollable Preview */}
          <div className="h-full overflow-y-auto overflow-x-hidden bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900 p-6">
            {optimizedResume ? (
              <>
                {selectedTemplate === "latex" ? (
                  <Card className="border-2 border-slate-200 dark:border-slate-700 h-full flex flex-col">
                    <CardHeader className="pb-3 border-b flex-none">
                      <CardTitle className="flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-300">
                        <FileText className="h-4 w-4 text-amber-600" />
                        LaTeX Code
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-0 flex-1 min-h-0">
                      {isGeneratingLatex ? (
                        <div className="flex flex-col items-center justify-center h-full px-4">
                          <div className="relative w-16 h-16 mb-4">
                            <div className="absolute inset-0 border-4 border-amber-200 dark:border-amber-900 rounded-full" />
                            <div className="absolute inset-0 border-4 border-amber-600 border-t-transparent rounded-full animate-spin" />
                          </div>
                          <h3 className="text-base font-semibold text-amber-900 dark:text-amber-100 mb-1">
                            Generating LaTeX...
                          </h3>
                          <p className="text-xs text-slate-600 dark:text-slate-400 text-center">
                            Converting your resume to LaTeX format
                          </p>
                        </div>
                      ) : latexCode ? (
                        <div className="h-full bg-slate-900 dark:bg-black overflow-auto">
                          <pre className="text-xs font-mono text-green-400 whitespace-pre-wrap break-words leading-relaxed p-4">
                            {latexCode}
                          </pre>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center justify-center h-full px-4">
                          <FileText className="w-12 h-12 text-amber-300 mb-3 opacity-50" />
                          <p className="text-sm text-slate-600 dark:text-slate-400">
                            Select LaTeX template to generate code
                          </p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ) : showPreview ? (
                  <div className="w-full max-w-[21cm] mx-auto">
                    {isPreviewLoading || !previewPdfUrl ? (
                      <div className="flex flex-col items-center justify-center h-full min-h-[400px]">
                        <div className="relative w-16 h-16 mb-4">
                          <div className="absolute inset-0 border-4 border-violet-200 dark:border-violet-900 rounded-full" />
                          <div className="absolute inset-0 border-4 border-violet-600 border-t-transparent rounded-full animate-spin" />
                        </div>
                        <h3 className="text-base font-semibold text-violet-900 dark:text-violet-100 mb-1">
                          Generating PDF Preview...
                        </h3>
                        <p className="text-xs text-slate-600 dark:text-slate-400 text-center">
                          Creating your optimized resume
                        </p>
                      </div>
                    ) : (
                      <div className="w-full h-full">
                        <iframe
                          src={`${previewPdfUrl}#toolbar=0&navpanes=0&scrollbar=0`}
                          className="w-full h-[calc(100vh-8rem)] border-2 border-slate-200 dark:border-slate-700 rounded-lg shadow-lg"
                          title="PDF Preview"
                        />
                      </div>
                    )}
                  </div>
                ) : isEditing && TemplateComponent ? (
                  <div className="w-full max-w-[21cm] mx-auto">
                    <div
                      id="resume-content"
                      className="resume-preview-optimizer bg-white"
                      style={{
                        fontFamily: optimizedResume.fontFamily || 'DM Sans',
                        width: '21cm',
                        minHeight: 'auto',
                        margin: '0.5cm auto',
                        padding: '1.5cm 2cm',
                        boxSizing: 'border-box',
                        position: 'relative',
                      }}
                    >
                      <div className="transform scale-[0.8] origin-top">
                        <TemplateComponent
                          resumeData={optimizedResume}
                          isEditing={isEditing}
                          updateField={updateField}
                        />
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-full">
                    <div className="text-center space-y-3 p-8">
                      <Eye className="h-12 w-12 text-slate-300 dark:text-slate-700 mx-auto" />
                      <div>
                        <p className="text-sm font-medium text-slate-600 dark:text-slate-400 mb-1">
                          Preview Hidden
                        </p>
                        <p className="text-xs text-slate-500 dark:text-slate-500">
                          Click "Show Preview" to view your resume
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="flex items-center justify-center h-full">
                <div className="text-center space-y-4 p-8">
                  <div className="inline-flex p-4 bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-900 rounded-2xl">
                    <FileText className="h-16 w-16 text-slate-400 dark:text-slate-600" />
                  </div>
                  <div>
                    <p className="text-base font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Ready to Optimize
                    </p>
                    <p className="text-sm text-slate-500 dark:text-slate-500">
                      Generate your resume to see the preview
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
