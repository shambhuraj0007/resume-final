'use client'
import { useSession } from 'next-auth/react'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { FileText, Mail, User, Trash2, Coins, TrendingUp, Calendar, Eye, Download } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { Toaster } from "@/components/ui/toaster"
import { useCredits } from '@/hooks/useCredits'
import UpgradeModal from '@/components/credits/UpgradeModal'
import { format } from 'date-fns'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"

interface Resume {
  id: string
  title: string
  createdAt: string
  updatedAt: string
}

function ProfileSkeleton() {
  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[300px_1fr]">
        <Skeleton className="h-[400px]" />
        <Skeleton className="h-[500px]" />
      </div>
    </div>
  )
}

export default function Page() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [resumes, setResumes] = useState<Resume[]>([]);
  const [loading, setLoading] = useState(true);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const { toast } = useToast();
  const { balance, refreshBalance } = useCredits();

  // Inline email formatter - hides @gmail.com for phone pattern emails
  const formatEmailDisplay = (email: string | null | undefined): string => {
    if (!email) return '';

    const [localPart, domain] = email.split('@');

    // Detect if local part looks like a phone number (with optional from+/+91/91)
    const phoneLike = /^(from\+)?(\+91)?(91)?\d{8,12}$/i;

    return phoneLike.test(localPart) ? localPart : email;
  };



  // Guard localStorage for SSR
  const settings = {
    displayName:
      typeof window !== 'undefined'
        ? window.localStorage.getItem("resumeitnow_name") || session?.user?.name
        : session?.user?.name,
    defaultTemplate:
      typeof window !== 'undefined'
        ? window.localStorage.getItem("resumeitnow_template") || 'modern'
        : 'modern'
  };

  const deleteResume = async (resumeId: string) => {
    try {
      const response = await fetch(`/api/resumes/${resumeId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete resume');
      }

      toast({
        title: "Success",
        description: "Resume deleted successfully!",
        duration: 3000,
      });

      setResumes((prevResumes) => prevResumes.filter((resume) => resume.id !== resumeId));
    } catch (error) {
      console.error("Error deleting resume:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Error deleting resume. Please try again.",
        variant: "destructive",
        duration: 5000,
      });
    }
  };

  useEffect(() => {
    const fetchResumes = async () => {
      if (!session?.user?.email) return;

      try {
        const response = await fetch(`/api/resumes/user/${encodeURIComponent(session.user.email)}`);

        if (!response.ok) {
          throw new Error('Failed to fetch resumes');
        }

        const data = await response.json();
        const resumeData = data.resumes.map((resume: any) => ({
          id: resume.resumeId,
          createdAt: resume.createdAt,
          updatedAt: resume.updatedAt,
        }));

        setResumes(resumeData);
      } catch (error) {
        console.error('Error fetching resumes:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchResumes();
  }, [session?.user?.email]);

  if (status === 'loading') {
    return <ProfileSkeleton />;
  }

  if (!session) {
    router.push('/signin');
    return null;
  }

  return (
    <div className="container min-h-screen mx-auto px-4 py-8 max-w-7xl">
      {/* Header - matching dashboard style */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">My Profile</h1>
        <p className="text-muted-foreground">
          Manage your profile information and resumes
        </p>
      </div>

      {/* Grid: Single column mobile, sidebar + content on large screens */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[300px_1fr]">
        {/* Sidebar: Profile + Credits */}
        <div className="space-y-6">
          {/* Profile Card */}
          <Card className="h-fit">
            <CardHeader className="text-center pb-4">
              <Avatar className="w-24 h-24 mx-auto mb-4">
                <AvatarImage src={session.user?.image ?? ''} alt={session.user?.name ?? ''} />
                <AvatarFallback className="text-2xl">
                  {session.user?.name?.charAt(0) ?? 'U'}
                </AvatarFallback>
              </Avatar>
              <CardTitle className="text-xl">
                {(settings.displayName !== '' ? settings.displayName : session.user?.name)}
              </CardTitle>
              <CardDescription className="space-y-2">
                <div className="flex items-center justify-center gap-2">
                  <User className="w-4 h-4 flex-shrink-0" />
                  <span className="text-sm">@{session.user?.name ?? 'username'}</span>
                </div>
                <div className="flex items-center justify-center gap-2">
                  <Mail className="w-4 h-4 flex-shrink-0" />
                  <span className="text-xs sm:text-sm break-all px-2">
                    {formatEmailDisplay(session.user?.email)}
                  </span>
                </div>
              </CardDescription>
            </CardHeader>
          </Card>

          {/* Credit Balance Card */}
          <Card className="border-primary/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Coins className="h-5 w-5 text-primary" />
                Credits
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <div className="flex items-baseline gap-2 flex-wrap">
                  <span className="text-4xl font-bold">{balance?.credits ?? 0}</span>
                  <span className="text-muted-foreground text-sm">
                    {balance?.credits === 1 ? 'credit' : 'credits'} remaining
                  </span>
                </div>

                {balance?.expiryDate && !balance?.hasExpired && (
                  <div className="flex items-center gap-2 mt-3 text-sm text-muted-foreground">
                    <Calendar className="h-4 w-4 flex-shrink-0" />
                    <span>Expires {format(new Date(balance.expiryDate), 'MMM dd, yyyy')}</span>
                  </div>
                )}

                {balance?.hasExpired && (
                  <p className="text-sm text-red-500 mt-3">
                    Your credits have expired
                  </p>
                )}
              </div>

              <Button
                onClick={() => setShowUpgradeModal(true)}
                className="w-full"
                variant="default"
              >
                <TrendingUp className="h-4 w-4 mr-2" />
                Buy More Credits
              </Button>

              <Button
                onClick={() => router.push('/dashboard')}
                variant="outline"
                className="w-full"
              >
                View Dashboard
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Main Content: Resumes List */}
        <Card>
          <CardHeader>
            <CardTitle>My Resumes</CardTitle>
            <CardDescription>Manage your created resumes</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-20 w-full" />
                ))}
              </div>
            ) : resumes.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p className="mb-2">No resumes found. Create your first resume!</p>
                <Button
                  className="mt-4"
                  onClick={() => router.push('/resume/create')}
                >
                  Create Resume
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {resumes
                  .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
                  .map((resume) => (
                    <Card
                      key={resume.id}
                      className="hover:bg-accent/50 transition-colors border-muted"
                    >
                      <CardContent className="pt-6">
                        {/* Stack on mobile, row on md+ */}
                        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                          {/* Resume info */}
                          <div className="flex items-start gap-3 min-w-0 flex-1">
                            <FileText className="w-8 h-8 text-primary flex-shrink-0 mt-1" />
                            <div className="min-w-0 flex-1">
                              <h3 className="font-semibold text-base sm:text-lg break-all">
                                {resume.id}
                              </h3>
                              <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                                Created: {new Date(resume.createdAt).toLocaleDateString()}
                              </p>
                              <p className="text-xs sm:text-sm text-muted-foreground">
                                Updated: {new Date(resume.updatedAt).toLocaleDateString()}
                              </p>
                            </div>
                          </div>

                          {/* Action buttons - stack on xs, row on sm+ */}
                          <div className="flex flex-col gap-2 sm:flex-row sm:flex-shrink-0">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => router.push(`/resume/${resume.id}`)}
                              className="gap-2 w-full sm:w-auto"
                            >
                              <Eye className="w-4 h-4" />
                              <span>View</span>
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={async () => {
                                try {


                                  toast({
                                    title: "Generating PDF...",
                                    description: "Your resume is being prepared for download",
                                  });

                                  // First try the direct PDF route
                                  let response = await fetch(`/resume/${resume.id}/pdf`);


                                  // If direct route fails, try fetching resume data and using API route
                                  if (!response.ok) {


                                    // Fetch resume data
                                    const resumeResponse = await fetch(`/api/resumes/${resume.id}`);
                                    if (!resumeResponse.ok) {
                                      throw new Error('Failed to fetch resume data');
                                    }

                                    const resumeData = await resumeResponse.json();


                                    // Use the API PDF route with query parameters
                                    const queryParams = new URLSearchParams({
                                      data: JSON.stringify(resumeData),
                                      template: resumeData.template || 'modern',
                                      accentColor: resumeData.accentColor || '#3b82f6',
                                      fontFamily: resumeData.fontFamily || 'Inter',
                                      sectionOrder: JSON.stringify(resumeData.sectionOrder || []),
                                      showIcons: (resumeData.showIcons || true).toString(),
                                    }).toString();

                                    response = await fetch(`/api/pdf?${queryParams}`, {
                                      method: 'GET',
                                      headers: { 'Content-Type': 'application/json' },
                                    });
                                  }




                                  if (!response.ok) {
                                    const errorText = await response.text();
                                    console.error('PDF generation failed:', errorText);
                                    console.error('Response headers:', Object.fromEntries(response.headers.entries()));

                                    // Try to parse JSON error if it's JSON
                                    try {
                                      const errorJson = JSON.parse(errorText);
                                      console.error('Parsed error JSON:', errorJson);
                                      throw new Error(`PDF generation failed: ${errorJson.message || errorJson.error || errorText}`);
                                    } catch (parseError) {
                                      throw new Error(`Failed to generate PDF: ${response.status} - ${errorText}`);
                                    }
                                  }

                                  const blob = await response.blob();


                                  if (blob.size === 0) {
                                    throw new Error('Generated PDF is empty');
                                  }

                                  // Create download link
                                  const url = window.URL.createObjectURL(blob);
                                  const a = document.createElement('a');
                                  a.href = url;
                                  a.download = `Resume-${resume.id}.pdf`;
                                  a.style.display = 'none';

                                  document.body.appendChild(a);
                                  a.click();

                                  // Cleanup
                                  setTimeout(() => {
                                    window.URL.revokeObjectURL(url);
                                    document.body.removeChild(a);
                                  }, 100);



                                  toast({
                                    title: "Download Complete!",
                                    description: "Your resume has been downloaded successfully",
                                  });
                                } catch (error) {
                                  console.error('Download error:', error);
                                  toast({
                                    title: "Download Failed",
                                    description: error instanceof Error ? error.message : "There was an error downloading your resume. Please try again.",
                                    variant: "destructive",
                                  });
                                }
                              }}
                              className="gap-2 w-full sm:w-auto"
                            >
                              <Download className="w-4 h-4" />
                              <span>Download</span>
                            </Button>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950 w-full sm:w-auto gap-2"
                                >
                                  <Trash2 className="w-4 h-4" />
                                  <span className="sm:hidden">Delete</span>
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent className="max-w-[90vw] sm:max-w-lg">
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    This action cannot be undone. This will permanently delete your resume.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter className="flex-col gap-2 sm:flex-row">
                                  <AlertDialogCancel className="w-full sm:w-auto m-0">
                                    Cancel
                                  </AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => deleteResume(resume.id)}
                                    className="bg-red-500 hover:bg-red-600 w-full sm:w-auto m-0"
                                  >
                                    Delete
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Upgrade Modal */}
      <UpgradeModal
        open={showUpgradeModal}
        onOpenChange={setShowUpgradeModal}
        onSuccess={() => {
          refreshBalance();
          toast({
            title: "Credits Added!",
            description: "Your credits have been successfully added to your account.",
          });
        }}
      />

      <Toaster />
    </div>
  );
}
