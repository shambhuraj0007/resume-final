"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Upload, FileText, Copy, Loader2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { useCredits } from "@/hooks/useCredits";
import InsufficientCreditsModal from "@/components/credits/InsufficientCreditsModal";
import UpgradeModal from "@/components/credits/UpgradeModal";
import { useSession } from "next-auth/react";

const MAX_FILE_SIZE = 5 * 1024 * 1024;

// ========== SIZE CONFIGURATION - ADJUST THESE VALUES ==========
const SIZES = {
  // Resume upload box and paste textarea
  resumeMinHeight: "150px",  // Options: "200px", "300px", "400px"
  resumeMaxHeight: "400px",  // Options: "500px", "600px", "800px"
  resumeRows: 10,            // Options: 8, 12, 15

  // Job description textarea
  jdMinHeight: "190px",      // Options: "100px", "150px", "200px"
  jdMaxHeight: "400px",      // Options: "300px", "500px", "600px"
  jdRows: 5,                 // Options: 4, 6, 8
};
// ================================================================

function HomeResumeUploader() {
  const router = useRouter();
  const { status } = useSession();
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [resumeText, setResumeText] = useState("");
  const [jobDescription, setJobDescription] = useState("");
  const [inputMode, setInputMode] = useState<"upload" | "paste">("upload");
  const [isNavigating, setIsNavigating] = useState(false);
  const [showInsufficientModal, setShowInsufficientModal] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);

  const { balance, refreshBalance } = useCredits();

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
      toast({
        title: "Resume Selected",
        description: `${file.name} uploaded successfully!`,
      });
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file && validateFile(file)) {
      setPdfFile(file);
      setResumeText("");
      toast({
        title: "Resume Uploaded",
        description: `${file.name} uploaded successfully!`,
      });
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
  };

  const toggleInputMode = () => {
    const newMode = inputMode === "upload" ? "paste" : "upload";
    setInputMode(newMode);

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
        description: "Please paste the job description to analyze compatibility.",
        variant: "destructive",
      });
      return;
    }

    // Auth Check
    if (status === "unauthenticated") {
      toast({
        title: "Sign In Required",
        description: "Please sign in to analyze your resume.",
        variant: "destructive",
      });
      router.push("/signin");
      return;
    }

    // Credit Check
    if (!balance || balance.credits === 0 || balance.hasExpired) {
      setShowInsufficientModal(true);
      return;
    }

    setIsNavigating(true);

    try {
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
    } catch (error) {
      // console.error("Error preparing analysis:", error);
      toast({
        title: "Error",
        description: "Failed to prepare analysis. Please try again.",
        variant: "destructive",
      });
      setIsNavigating(false);
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl sm:rounded-2xl overflow-hidden shadow-2xl relative p-1 sm:p-1.5 md:p-2 lg:p-2">
      {isNavigating && (
        <div className="absolute inset-0 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm z-50 flex items-center justify-center rounded-xl sm:rounded-2xl">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4" />
            <p className="text-sm font-medium">Opening Analyzer...</p>
          </div>
        </div>
      )}

      <Card className="max-w-2xl mx-auto border-0 shadow-none">
        <CardContent className="pt-2 pb-3">
          <form onSubmit={handleSubmit} className="space-y-3">
            {/* Resume Input */}
            <div className="mb-12">
              <div className="flex items-center justify-between mb-2">
                <label className="block text-m font-medium">
                  Your Resume <span className="text-red-500">*</span>
                </label>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={toggleInputMode}
                  className="text-xs"
                  aria-label={inputMode === "upload" ? "Switch to paste text mode" : "Switch to file upload mode"}
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
                <>
                  <Input
                    id="resume-upload"
                    type="file"
                    accept=".pdf"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                  <label
                    htmlFor="resume-upload"
                    className={`block border-2 border-dashed rounded-lg text-center transition-all cursor-pointer flex flex-col items-center justify-center p-6 ${pdfFile
                      ? "border-green-400 bg-green-50/10"
                      : "border-muted-foreground/25 hover:border-muted-foreground/50 hover:bg-muted/5"
                      }`}
                    style={{ minHeight: SIZES.resumeMinHeight }}
                    onDrop={handleDrop}
                    onDragOver={handleDragOver}
                  >
                    <Upload
                      className={`w-10 h-10 mx-auto mb-3 ${pdfFile ? "text-green-500" : "text-muted-foreground"
                        }`}
                    />
                    <p className="text-sm font-medium mb-1">
                      {pdfFile
                        ? pdfFile.name
                        : "Click here or drag & drop your resume PDF"}
                    </p>
                    <p className="text-xs text-muted-foreground mb-3">
                      {pdfFile
                        ? `${(pdfFile.size / (1024 * 1024)).toFixed(2)} MB`
                        : "Maximum file size: 5MB"}
                    </p>
                    <span className="inline-block px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm font-medium hover:bg-primary/90 transition-colors">
                      Browse Files
                    </span>
                  </label>
                </>
              ) : (
                <div>
                  <textarea
                    value={resumeText}
                    onChange={(e) => setResumeText(e.target.value)}
                    placeholder="Paste your complete resume text here including all sections: contact info, summary, experience, education, skills, etc..."
                    className="w-full p-3 border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-ring bg-background resize-y"
                    style={{
                      minHeight: SIZES.resumeMinHeight,
                      maxHeight: SIZES.resumeMaxHeight
                    }}
                    rows={SIZES.resumeRows}
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Paste the complete text from your resume for best results
                  </p>
                </div>
              )}
            </div>

            {/* Job Description */}
            <div className="mt-9">
              <label
                htmlFor="jobDescription"
                className="block text-m font-medium mb-2"
              >
                Job Description <span className="text-red-500">*</span>
              </label>
              <textarea
                id="jobDescription"
                value={jobDescription}
                onChange={(e) => setJobDescription(e.target.value)}
                placeholder="Paste the complete job description here including responsibilities, requirements, and qualifications..."
                className="w-full p-3 border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-ring bg-background resize-y"
                style={{
                  minHeight: SIZES.jdMinHeight,
                  maxHeight: SIZES.jdMaxHeight
                }}
                rows={SIZES.jdRows}
                required
              />
              <p className="text-xs text-muted-foreground mt-4">
                Include all job requirements, skills, and qualifications for
                accurate matching
              </p>
            </div>

            <Button
              type="submit"
              disabled={
                isNavigating ||
                (inputMode === "upload" && !pdfFile) ||
                (inputMode === "paste" && !resumeText.trim()) ||
                !jobDescription.trim()
              }
              className="w-full rounded-full bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 text-white px-6 sm:px-8 py-2.5 sm:py-3 text-base sm:text-lg font-semibold shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 mt-12"
              size="lg"
            >
              {isNavigating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Preparing Analysis...
                </>
              ) : (
                "Analyze My Resume"
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

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
          setShowUpgradeModal(false);
        }}
      />
    </div>
  );
}

export default HomeResumeUploader;
