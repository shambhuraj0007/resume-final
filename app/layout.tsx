import './globals.css';
import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import { ThemeWrapper } from '@/components/ThemeWrapper';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import SessionProvider from '@/components/SessionProvider';
import { Analytics } from "@vercel/analytics/react"

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
})

// 1. Viewport Export
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#ffffff',
}

// 2. Metadata Export
export const metadata: Metadata = {
  metadataBase: new URL('https://shortlistai.xyz'),
  title: 'Free ATS Resume Checker | AI Resume Score & Optimization Tool - ShortlistAI',
  description: "Analyze your resume's ATS compatibility in 10 seconds. Get instant feedback, callback probability score, and personalized tips. 100% free, no signup required.",
  keywords: ['ATS resume checker', 'resume ATS score', 'ATS optimization', 'resume callback rate', 'ATS-friendly resume'],
  alternates: {
    canonical: 'https://shortlistai.xyz/',
  },
  openGraph: {
    type: 'website',
    url: 'https://shortlistai.xyz/',
    title: 'Free ATS Resume Checker | Boost Your Interview Chances to 100%',
    description: 'Get instant ATS score, callback probability, and actionable tips. Analyze your resume against any job description in under 10 seconds.',
    images: [
      {
        url: 'https://shortlistai.xyz/og-image.png',
        width: 1200,
        height: 630,
        alt: 'ShortlistAI - ATS Resume Checker',
      },
    ],
    siteName: 'ShortlistAI',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Free ATS Resume Checker | AI Resume Optimization',
    description: 'Analyze your resume in 10 seconds. Get ATS score + callback rate + personalized feedback.',
    images: ['https://shortlistai.xyz/twitter-image.png'],
    creator: '@shortlistai',
  },
}

// 3. JSON-LD Data Definitions
const jsonLdSoftware = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  "name": "ShortlistAI",
  "applicationCategory": "BusinessApplication",
  "applicationSubCategory": "Resume Analysis Tool",
  "operatingSystem": "Web Browser",
  "offers": { "@type": "Offer", "price": "0", "priceCurrency": "USD" },
  "aggregateRating": {
    "@type": "AggregateRating",
    "ratingValue": "4.8",
    "ratingCount": "127",
    "bestRating": "5",
    "worstRating": "1"
  },
  "description": "AI-powered ATS resume checker that analyzes your resume against job descriptions in under 10 seconds.",
  "featureList": [
    "ATS Compatibility Score",
    "Callback Probability Analysis",
    "Keyword Matching",
    "Personalized Feedback",
    "Job Description Comparison",
    "Instant Analysis (10 seconds)"
  ],
  "screenshot": "https://shortlistai.xyz/screenshot.png",
  "softwareVersion": "1.0",
  "url": "https://shortlistai.xyz/",
  "author": { "@type": "Organization", "name": "ShortlistAI", "url": "https://shortlistai.xyz/" }
};

const jsonLdFaq = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  "mainEntity": [
    {
      "@type": "Question",
      "name": "What is an ATS resume checker?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "An ATS (Applicant Tracking System) resume checker analyzes your resume to determine how well it will perform when scanned by automated hiring software."
      }
    },
    {
      "@type": "Question",
      "name": "How does ATS software work?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "ATS software scans resumes for specific keywords from job descriptions, filters candidates based on qualifications, and ranks applications."
      }
    },
    {
      "@type": "Question",
      "name": "Do I need an ATS-friendly resume?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Yes, over 98% of Fortune 500 companies and 75% of mid-sized companies use ATS systems to filter resumes."
      }
    },
    {
      "@type": "Question",
      "name": "How accurate is ShortlistAI's ATS checker?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "ShortlistAI uses AI trained on thousands of real ATS systems and hiring patterns to provide 95%+ accuracy."
      }
    },
    {
      "@type": "Question",
      "name": "Is ShortlistAI free to use?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Yes, ShortlistAI offers free ATS resume analysis with no signup required."
      }
    }
  ]
};

const jsonLdWebSite = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  "name": "ShortlistAI",
  "url": "https://shortlistai.xyz/",
  "potentialAction": {
    "@type": "SearchAction",
    "target": {
      "@type": "EntryPoint",
      "urlTemplate": "https://shortlistai.xyz/search?q={search_term_string}"
    },
    "query-input": "required name=search_term_string"
  }
};

const jsonLdOrg = {
  "@context": "https://schema.org",
  "@type": "Organization",
  "name": "ShortlistAI",
  "url": "https://shortlistai.xyz/",
  "logo": "https://shortlistai.xyz/logo.png",
  "sameAs": [
    "https://www.linkedin.com/company/shortlistai",
    "https://twitter.com/shortlistai"
  ],
  "contactPoint": {
    "@type": "ContactPoint",
    "contactType": "Customer Support",
    "email": "support@shortlistai.com",
    "availableLanguage": ["English", "Hindi"]
  }
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await getServerSession(authOptions);

  return (
    <html lang="en" className={inter.variable} suppressHydrationWarning>
      <head>
        {/* Critical Performance Optimization */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link rel="dns-prefetch" href="https://www.googletagmanager.com" />
        <link rel="dns-prefetch" href="https://www.google-analytics.com" />
        <link rel="dns-prefetch" href="https://vitals.vercel-insights.com" />
        <link rel="dns-prefetch" href="https://checkout.razorpay.com" />
        <link rel="manifest" href="/manifest.json" />
      </head>
      <body>
        <SessionProvider session={session}>
          <ThemeWrapper>
            {children}
          </ThemeWrapper>
        </SessionProvider>

        <Analytics />

        {/* Inject JSON-LD Data */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdSoftware) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdFaq) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdWebSite) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdOrg) }}
        />
      </body>
    </html>
  )
}
