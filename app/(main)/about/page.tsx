import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function AboutPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-start bg-gray-50 text-gray-900 dark:bg-gray-900 dark:text-gray-100 transition-colors duration-500">
      <section className="container px-4 py-20">
        <div className="max-w-4xl mx-auto text-center">
          <Badge className="mb-6 text-lg px-4 py-2 bg-blue-200 text-blue-800 dark:bg-blue-800 dark:text-blue-200 rounded-full transition-colors duration-500">
            About Us
          </Badge>

          <h1 className="text-5xl md:text-6xl font-extrabold mb-6 text-gray-900 dark:text-white transition-colors duration-500">
            Build Your Resume, Effortlessly
          </h1>
          <p className="text-lg md:text-xl text-gray-700 dark:text-gray-300 mb-16 leading-relaxed transition-colors duration-500">
            Our platform helps you create professional, eye-catching resumes in minutes. 
            Leveraging AI-powered suggestions, we ensure your experience and skills stand out 
            to employers while keeping formatting simple and ATS-friendly.
          </p>

          <div className="grid gap-10 md:grid-cols-3">
            <Card className="bg-white border border-gray-200 dark:bg-gray-800 dark:border-gray-700 hover:shadow-2xl transition-shadow duration-300">
              <CardHeader className="pb-0">
                <CardTitle className="text-xl font-semibold text-gray-900 dark:text-white transition-colors duration-500">
                  ATS-Friendly Templates
                </CardTitle>
                <CardDescription className="text-gray-500 dark:text-gray-400 mt-2 transition-colors duration-500">
                  Templates designed to pass Applicant Tracking Systems without losing their professional look.
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-4">
                <p className="text-gray-700 dark:text-gray-300 transition-colors duration-500">
                  Choose from a variety of professionally designed templates that optimize your resume for recruiters.
                </p>
              </CardContent>
            </Card>

            <Card className="bg-white border border-gray-200 dark:bg-gray-800 dark:border-gray-700 hover:shadow-2xl transition-shadow duration-300">
              <CardHeader className="pb-0">
                <CardTitle className="text-xl font-semibold text-gray-900 dark:text-white transition-colors duration-500">
                  AI-Powered Suggestions
                </CardTitle>
                <CardDescription className="text-gray-500 dark:text-gray-400 mt-2 transition-colors duration-500">
                  Improve your resume content using our AI assistant powered by Llama 3.1.
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-4">
                <p className="text-gray-700 dark:text-gray-300 transition-colors duration-500">
                  Receive intelligent recommendations that highlight your skills and achievements, helping you stand out in applications.
                </p>
              </CardContent>
            </Card>

            <Card className="bg-white border border-gray-200 dark:bg-gray-800 dark:border-gray-700 hover:shadow-2xl transition-shadow duration-300">
              <CardHeader className="pb-0">
                <CardTitle className="text-xl font-semibold text-gray-900 dark:text-white transition-colors duration-500">
                  Easy Export & Sharing
                </CardTitle>
                <CardDescription className="text-gray-500 dark:text-gray-400 mt-2 transition-colors duration-500">
                  Download your resume as a polished PDF, ready to submit to employers immediately.
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-4">
                <p className="text-gray-700 dark:text-gray-300 transition-colors duration-500">
                  Share your resume directly or keep it saved for future opportunities. Simple, quick, and professional.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>
    </main>
  );
}
