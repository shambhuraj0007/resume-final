"use client";
import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { ModernTemplate } from '@/components/resume/templates/Modern';
import { MinimalTemplate } from '@/components/resume/templates/Minimal';
import { ProfessionalTemplate } from '@/components/resume/templates/Professional';
import { OldModernTemplate } from '@/components/resume/templates/Modern-old';
import { CreativeTemplate } from '@/components/resume/templates/CreativeTemplate';
import { DM_Sans, Roboto, Lato, Open_Sans } from 'next/font/google';

const dmSans = DM_Sans({ subsets: ['latin'], weight: ['400', '500', '700'], variable: '--font-dm-sans', display: 'swap' });
const roboto = Roboto({ subsets: ['latin'], weight: ['400', '500', '700'], variable: '--font-roboto', display: 'swap' });
const lato = Lato({ subsets: ['latin'], weight: ['400', '700'], variable: '--font-lato', display: 'swap' });
const openSans = Open_Sans({ subsets: ['latin'], weight: ['400', '600', '700'], variable: '--font-open-sans', display: 'swap' });

const TEMPLATES = {
  modern: ModernTemplate,
  modern_old: OldModernTemplate,
  minimal: MinimalTemplate,
  professional: ProfessionalTemplate,
  creative: CreativeTemplate,
} as const;

type TemplateKey = keyof typeof TEMPLATES;

const DownloadPage = () => {
  const searchParams = useSearchParams();
  const [resumeData, setResumeData] = useState<any>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<TemplateKey | null>(null);
  const [accentColor, setAccentColor] = useState<string | undefined>(undefined);
  const [fontFamily, setFontFamily] = useState<string | undefined>(undefined);
  const [sectionOrder, setSectionOrder] = useState<string[] | undefined>(undefined);
  const [showIcons, setShowIcons] = useState<boolean | undefined>(undefined);

  useEffect(() => {
    const data = searchParams.get('data');
    const template = searchParams.get('template');
    const color = searchParams.get('accentColor');
    const font = searchParams.get('fontFamily');
    const order = searchParams.get('sectionOrder');
    const showIconsParam = searchParams.get('showIcons');

    if (Array.isArray(data) || Array.isArray(template) || Array.isArray(color) || Array.isArray(font) || Array.isArray(order)) {
      console.error('Invalid query parameters');
      return;
    }

    if (data && template && template in TEMPLATES) {
      try {
        setResumeData(JSON.parse(data));
        setSelectedTemplate(template as TemplateKey);
        setAccentColor(color || undefined);
        setFontFamily(font || undefined);
        if (order) {
          setSectionOrder(JSON.parse(order));
        } else {
          setSectionOrder(undefined);
        }
        if (showIconsParam === null) {
          setShowIcons(undefined);
        } else {
          setShowIcons(showIconsParam === 'true');
        }
      } catch (error) {
        console.error('Error parsing query parameters:', error);
      }
    }
  }, [searchParams]);

  if (!resumeData || !selectedTemplate) {
    return <div>Loading...</div>;
  }

  const TemplateComponent = TEMPLATES[selectedTemplate];
  const mergedResumeData = {
    ...resumeData,
    accentColor,
    fontFamily,
    sectionOrder,
    showIcons,
  };

  return (
    <>
      {/* Font loaders to ensure they are active */}
      <div className={`${dmSans.variable} ${roboto.variable} ${lato.variable} ${openSans.variable}`} style={{ display: 'none' }} />

      {/* Backup Google Fonts Link */}
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,400;500;700&family=Lato:wght@400;700&family=Open+Sans:wght@400;600;700&family=Roboto:wght@400;500;700&display=swap" rel="stylesheet" />

      <div
        id="resume-content"
        style={{
          fontFamily: fontFamily || 'DM Sans',
          width: '21cm',
          minHeight: 'auto',
          background: 'white',
          margin: '0.5cm',
          padding: '1.5cm 2cm',
          boxSizing: 'border-box',
        }}
      >
        <TemplateComponent
          resumeData={mergedResumeData}
          isEditing={false}
          updateField={() => { }}
        />
      </div>

      {/* Critical: Exact Puppeteer PDF styling */}
      <style jsx global>{`
        @page {
          size: A4;
          margin: 0.5cm;
        }

        * {
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
          box-sizing: border-box;
        }

        html, body {
          margin: 0;
          padding: 0;
          width: 100vw;
          height: 100vh;
          background: white;
          font-size: 12px;
          line-height: 1.4;
        }

        #resume-content {
          width: 21cm;
          min-height: auto;
          background: white;
          margin: 0.5cm;
          padding: 1.5cm 2cm;
          box-sizing: border-box;
          position: relative;
        }

        /* Smart page break handling */
        .section-break {
          page-break-before: auto;
          break-before: auto;
        }

        .avoid-break {
          page-break-inside: avoid;
          break-inside: avoid;
        }

        /* Headers should not break */
        h1, h2, h3, h4, h5, h6 {
          page-break-after: avoid;
          break-after: avoid;
          page-break-inside: avoid;
          break-inside: avoid;
        }

        /* Keep related content together */
        .work-item, .education-item, .project-item {
          page-break-inside: avoid;
          break-inside: avoid;
          margin-bottom: 1rem;
        }

        /* Prevent orphaned lines */
        p, li {
          orphans: 2;
          widows: 2;
        }
      `}</style>
    </>
  );
};

export default DownloadPage;
