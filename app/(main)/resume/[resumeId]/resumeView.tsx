"use client";
import { useEffect, useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Download, Edit, Loader2, Save, X, MoveUp, MoveDown, Eye, EyeOff } from 'lucide-react';
import type { ResumeData } from './types';
import { useSession } from 'next-auth/react';
import { ModernTemplate } from '@/components/resume/templates/Modern';
import { OldModernTemplate } from '@/components/resume/templates/Modern-old';
import { CreativeTemplate } from '@/components/resume/templates/CreativeTemplate';
import { MinimalTemplate } from '@/components/resume/templates/Minimal';
import { ProfessionalTemplate } from '@/components/resume/templates/Professional';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Card,
  CardContent,
} from '@/components/ui/card';
import { toast } from '@/hooks/use-toast';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { DragDropContext, Droppable, Draggable, DraggableProvided, DroppableProvided } from 'react-beautiful-dnd';
import { motion } from 'framer-motion';
import debounce from 'lodash/debounce';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';


const TEMPLATES = {
  modern: ModernTemplate,
  modern_old: OldModernTemplate,
  minimal: MinimalTemplate,
  professional: ProfessionalTemplate,
  creative: CreativeTemplate,
} as const;


type TemplateKey = keyof typeof TEMPLATES;


const DEFAULT_SECTION_ORDER = [
  'objective',
  'workExperience',
  'projects',
  'education',
  'skills',
  'certifications',
  'languages',
  'customSections',
];


const FONT_OPTIONS = [
  { value: 'DM Sans', label: 'DM Sans' },
  { value: 'Arial', label: 'Arial' },
  { value: 'Times New Roman', label: 'Times New Roman' },
  { value: 'Helvetica', label: 'Helvetica' },
  { value: 'Georgia', label: 'Georgia' },
  { value: 'Roboto', label: 'Roboto' },
  { value: 'Lato', label: 'Lato' },
  { value: 'Open Sans', label: 'Open Sans' },
  { value: 'Verdana', label: 'Verdana' },
  { value: 'Calibri', label: 'Calibri' },
];


export default function ResumeView({
  resumeData: initialResumeData,
  resumeId,
}: {
  resumeData: ResumeData & {
    accentColor?: string;
    fontFamily?: string;
    sectionOrder?: string[];
    showIcons?: boolean;
  };
  resumeId: string;
}) {
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [isDownloading, setIsDownloading] = useState<boolean>(false);
  const [resumeData, setResumeData] = useState(initialResumeData);
  const [selectedTemplate, setSelectedTemplate] = useState<TemplateKey>('modern');
  const [accentColor, setAccentColor] = useState(initialResumeData.accentColor || '#000000');
  const [fontFamily, setFontFamily] = useState(initialResumeData.fontFamily || 'DM Sans');
  const [sectionOrder, setSectionOrder] = useState<string[]>(
    initialResumeData.sectionOrder || DEFAULT_SECTION_ORDER
  );
  const [isReorderModalOpen, setIsReorderModalOpen] = useState(false);
  const [tempSectionOrder, setTempSectionOrder] = useState<string[]>(sectionOrder);
  const [showIcons, setShowIcons] = useState(initialResumeData.showIcons ?? true);
  const [showPdfPreview, setShowPdfPreview] = useState(false);
  const [previewPdfUrl, setPreviewPdfUrl] = useState<string | null>(null);
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);
  const { data: session } = useSession();


  useEffect(() => {
    const initial = (initialResumeData as any).template as string | undefined;
    if (initial && (initial as string) in TEMPLATES) {
      setSelectedTemplate(initial as TemplateKey);
      return;
    }
    const savedTemplate = localStorage.getItem('resumeitnow_template');
    if (savedTemplate && savedTemplate in TEMPLATES) {
      setSelectedTemplate(savedTemplate as TemplateKey);
    }
  }, [initialResumeData]);


  useEffect(() => {
    if (!showPdfPreview) {
      setPreviewPdfUrl((prev) => {
        if (prev) {
          window.URL.revokeObjectURL(prev);
        }
        return null;
      });
      return;
    }


    let isCancelled = false;


    const generatePreview = async () => {
      try {
        setIsPreviewLoading(true);
        const queryParams = new URLSearchParams({
          data: JSON.stringify(resumeData),
          template: selectedTemplate,
          accentColor,
          fontFamily,
          sectionOrder: JSON.stringify(sectionOrder),
          showIcons: showIcons.toString(),
        }).toString();


        const response = await fetch(`/api/pdf?${queryParams}`, {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
        });


        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(errorText || 'Failed to generate PDF preview');
        }


        const blob = await response.blob();
        if (blob.size === 0) {
          throw new Error('Generated PDF preview is empty');
        }


        const url = window.URL.createObjectURL(blob);
        if (isCancelled) {
          window.URL.revokeObjectURL(url);
          return;
        }


        setPreviewPdfUrl((prev) => {
          if (prev) {
            window.URL.revokeObjectURL(prev);
          }
          return url;
        });
      } catch (error) {
        console.error('Error generating PDF preview:', error);
        toast({
          title: 'Preview Failed',
          description: 'Unable to load PDF preview. Please try again.',
          variant: 'destructive',
          duration: 3000,
        });
      } finally {
        if (!isCancelled) {
          setIsPreviewLoading(false);
        }
      }
    };


    generatePreview();


    return () => {
      isCancelled = true;
    };
  }, [showPdfPreview, selectedTemplate, accentColor, fontFamily, sectionOrder, showIcons, resumeData]);


  const handleDownload = async () => {
    setIsDownloading(true);
    try {
      const queryParams = new URLSearchParams({
        data: JSON.stringify(resumeData),
        template: selectedTemplate,
        accentColor: accentColor,
        fontFamily: fontFamily,
        sectionOrder: JSON.stringify(sectionOrder),
        showIcons: showIcons.toString(),
      }).toString();


      const response = await fetch(`/api/pdf?${queryParams}`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });


      if (!response.ok) {
        const errorText = await response.text();
        try {
          const errorJson = JSON.parse(errorText);
          throw new Error(`PDF generation failed: ${errorJson.message || errorJson.error || errorText}`);
        } catch (parseError) {
          throw new Error(`Failed to generate PDF: ${response.status} - ${errorText}`);
        }
      }


      const blob = await response.blob();
      if (blob.size === 0) throw new Error('Generated PDF is empty');

      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${resumeData.personalDetails.fullName}'s Resume - Made Using ResumeItNow.pdf`;
      a.click();
      window.URL.revokeObjectURL(url);


      toast({
        title: 'Success',
        description: 'PDF downloaded successfully!',
        duration: 3000,
      });
    } catch (error) {
      toast({
        title: 'Failed',
        description: 'Failed to download PDF!',
        duration: 3000,
      });
      console.error('Error downloading PDF:', error);
    } finally {
      setIsDownloading(false);
    }
  };


  const handleSave = async () => {
    try {
      setIsSaving(true);
      const userEmail = session?.user?.email;
      if (!userEmail) throw new Error('User email not found');

      const response = await fetch(`/api/resumes/${resumeId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...resumeData,
          template: selectedTemplate,
          accentColor,
          fontFamily,
          sectionOrder,
          showIcons,
        }),
      });


      if (!response.ok) throw new Error('Failed to save resume');


      localStorage.setItem('resumeitnow_template', selectedTemplate);
      setIsEditing(false);
      toast({
        title: 'Success',
        description: 'Resume saved successfully!',
        duration: 3000,
      });
    } catch (error) {
      console.error('Error saving resume:', error);
      toast({
        title: 'Error',
        description: 'Failed to save changes. Please try again.',
        variant: 'destructive',
        duration: 3000,
      });
    } finally {
      setIsSaving(false);
    }
  };


  const updateField = <T extends keyof ResumeData>(
    section: T,
    index: number | null,
    field: string,
    value: string
  ) => {
    setResumeData((prev) => {
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


  const onDragEnd = (result: any) => {
    if (!result.destination) return;
    const newOrder = Array.from(tempSectionOrder);
    const [reorderedItem] = newOrder.splice(result.source.index, 1);
    newOrder.splice(result.destination.index, 0, reorderedItem);
    setTempSectionOrder(newOrder);
  };


  const moveSectionUp = (index: number) => {
    if (index === 0) return;
    const newOrder = [...tempSectionOrder];
    [newOrder[index - 1], newOrder[index]] = [newOrder[index], newOrder[index - 1]];
    setTempSectionOrder(newOrder);
  };


  const moveSectionDown = (index: number) => {
    if (index === tempSectionOrder.length - 1) return;
    const newOrder = [...tempSectionOrder];
    [newOrder[index], newOrder[index + 1]] = [newOrder[index + 1], newOrder[index]];
    setTempSectionOrder(newOrder);
  };


  const saveSectionOrder = () => {
    setSectionOrder(tempSectionOrder);
    setIsReorderModalOpen(false);
  };


  const debouncedSetAccentColor = useCallback(
    debounce((color: string) => setAccentColor(color), 100),
    []
  );


  const handleAccentColorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    debouncedSetAccentColor(e.target.value);
  };


  const TemplateComponent = TEMPLATES[selectedTemplate];


  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900 py-4 px-4 sm:px-6 flex flex-col items-center">
      {/* Controls Card */}
      <Card className="w-full max-w-[21cm] mb-6 print:hidden border-slate-200 dark:border-slate-800 shadow-lg">
        <CardContent className="p-4">
          <div className="flex flex-col">
            <div className="flex flex-col space-y-2 sm:flex-row sm:space-y-0 sm:space-x-4 justify-between">
              <div className="flex space-x-2">
                <Select
                  value={selectedTemplate}
                  onValueChange={(value: TemplateKey) => setSelectedTemplate(value)}
                  disabled={isEditing}
                >
                  <SelectTrigger className="w-full sm:w-[180px]">
                    <SelectValue placeholder="Select Template" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="modern">Modern Template</SelectItem>
                    <SelectItem value="modern_old">Modern(old) Template</SelectItem>
                    <SelectItem value="minimal">Minimal Template</SelectItem>
                    <SelectItem value="professional">Professional Template</SelectItem>
                    <SelectItem value="creative">Creative Template</SelectItem>
                  </SelectContent>
                </Select>
                <Button
                  variant="outline"
                  onClick={handleDownload}
                  className="w-full sm:w-auto flex items-center justify-center gap-2 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 hover:from-blue-600 hover:via-purple-600 hover:to-pink-600 text-white border-0 shadow-md hover:shadow-lg transition-all duration-300"
                  disabled={isDownloading}
                >
                  {isDownloading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Downloading...
                    </>
                  ) : (
                    <>
                      <Download className="h-4 w-4" />
                      Download PDF
                    </>
                  )}
                </Button>
              </div>
              <div className="flex flex-col space-y-2 sm:flex-row sm:space-y-0 sm:space-x-2">
                {isEditing ? (
                  <>
                    <Button
                      variant="default"
                      onClick={handleSave}
                      disabled={isSaving}
                      className="w-full sm:w-auto flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 text-white shadow-md"
                    >
                      <Save className="h-4 w-4" />
                      {isSaving ? 'Saving...' : 'Save Changes'}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setResumeData(initialResumeData);
                        setAccentColor(initialResumeData.accentColor || '#000000');
                        setFontFamily(initialResumeData.fontFamily || 'DM Sans');
                        setSectionOrder(initialResumeData.sectionOrder || DEFAULT_SECTION_ORDER);
                        setIsEditing(false);
                      }}
                      className="w-full sm:w-auto flex items-center justify-center gap-2 border-red-300 dark:border-red-700 hover:bg-red-50 dark:hover:bg-red-950/30"
                    >
                      <X className="h-4 w-4" />
                      Cancel
                    </Button>
                  </>
                ) : (
                  <>
                    <Button
                      variant="outline"
                      onClick={() => setIsEditing(true)}
                      className="w-full sm:w-auto flex items-center justify-center gap-2 border-purple-300 dark:border-purple-700 hover:bg-purple-50 dark:hover:bg-purple-950/30"
                    >
                      <Edit className="h-4 w-4" />
                      Edit Resume
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => setShowPdfPreview((prev) => !prev)}
                      className="w-full sm:w-auto flex items-center justify-center gap-2 border-blue-300 dark:border-blue-700 hover:bg-blue-50 dark:hover:bg-blue-950/30"
                    >
                      {showPdfPreview ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                      {showPdfPreview ? 'Hide PDF Preview' : 'PDF Preview'}
                    </Button>
                  </>
                )}
              </div>
            </div>


            {isEditing && (
              <div className="flex max-md:flex-col items-center justify-between w-full gap-4 border-t border-slate-200 dark:border-slate-700 mt-4 pt-4">
                <div className="flex flex-col">
                  <label className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-1">Accent Color:</label>
                  <Input
                    type="color"
                    value={accentColor}
                    onChange={handleAccentColorChange}
                    className="w-full sm:w-20 h-10 cursor-pointer"
                  />
                </div>
                <div className="flex flex-col">
                  <label className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-1">Font Family:</label>
                  <Select value={fontFamily} onValueChange={setFontFamily}>
                    <SelectTrigger className="w-full sm:w-[180px]">
                      <SelectValue placeholder="Select Font" />
                    </SelectTrigger>
                    <SelectContent>
                      {FONT_OPTIONS.map((font) => (
                        <SelectItem key={font.value} value={font.value}>
                          <span style={{ fontFamily: font.value }}>{font.label}</span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center space-x-2">
                  <Switch
                    id="icon-toggle"
                    checked={showIcons}
                    onCheckedChange={setShowIcons}
                  />
                  <Label htmlFor="icon-toggle" className="flex items-center gap-2 text-gray-900 dark:text-gray-100">
                    {showIcons ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                    Show Icons
                  </Label>
                </div>
                <Button
                  variant="outline"
                  onClick={() => setIsReorderModalOpen(true)}
                  className="w-full sm:w-auto border-blue-300 dark:border-blue-700 hover:bg-blue-50 dark:hover:bg-blue-950/30"
                >
                  Rearrange Sections
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>


      {/* Resume Preview */}
      <div className="w-full max-w-[21cm] print:max-w-none mx-auto">
        <div
          id="resume-content"
          className="resume-preview"
          style={{
            fontFamily: fontFamily || 'DM Sans',
            width: '21cm',
            minHeight: '29.7cm',
            background: 'white',
            margin: '0.5cm auto',
            padding: '1.5cm 2cm',
            boxSizing: 'border-box',
            position: 'relative',
          }}
        >
          {showPdfPreview ? (
            isPreviewLoading || !previewPdfUrl ? (
              <div className="flex flex-col items-center justify-center w-full h-[29.7cm] gap-3 bg-white rounded-lg">
                <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
                <p className="text-sm text-slate-600">Generating PDF preview...</p>
              </div>
            ) : (
              <div className="w-full h-[29.7cm] bg-white rounded-lg overflow-hidden border-0">
                <iframe
                  src={`${previewPdfUrl}#toolbar=0&navpanes=0&scrollbar=0`}
                  className="w-full h-full border-0"
                  title="PDF Preview"
                  style={{
                    border: 'none',
                    outline: 'none',
                    background: 'white',
                  }}
                />
              </div>
            )
          ) : (
            <TemplateComponent
              resumeData={{
                ...resumeData,
                accentColor,
                fontFamily,
                sectionOrder,
                showIcons,
              }}
              isEditing={isEditing}
              updateField={updateField}
            />
          )}
        </div>
      </div>


      {/* Reorder Modal */}
      <Dialog open={isReorderModalOpen} onOpenChange={setIsReorderModalOpen}>
        <DialogContent className="print:hidden border-purple-200 dark:border-purple-800">
          <DialogHeader>
            <DialogTitle className="text-purple-900 dark:text-purple-100">Rearrange Sections</DialogTitle>
          </DialogHeader>
          <DragDropContext onDragEnd={onDragEnd}>
            <Droppable droppableId="sections">
              {(provided: DroppableProvided) => (
                <div
                  {...provided.droppableProps}
                  ref={provided.innerRef}
                  className="space-y-2 max-h-[60vh] overflow-y-auto"
                >
                  {tempSectionOrder.map((section, index) => (
                    <Draggable key={section} draggableId={section} index={index}>
                      {(provided: DraggableProvided, snapshot) => (
                        <motion.div
                          {...provided.draggableProps}
                          ref={provided.innerRef}
                          className={`flex items-center justify-between p-3 border rounded-lg shadow-sm transition-all ${snapshot.isDragging
                              ? 'shadow-lg border-purple-400 dark:border-purple-600 bg-purple-50 dark:bg-purple-950/30'
                              : 'border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800'
                            }`}
                          layout
                          transition={{ duration: 0.2 }}
                        >
                          <div
                            {...provided.dragHandleProps}
                            className="flex items-center space-x-2 cursor-grab active:cursor-grabbing"
                          >
                            <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                              {section.replace(/([A-Z])/g, ' $1').trim().replace(/^\w/, (c) => c.toUpperCase())}
                            </span>
                          </div>
                          <div className="flex space-x-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => moveSectionUp(index)}
                              disabled={index === 0}
                              className="border-blue-300 dark:border-blue-700 hover:bg-blue-50 dark:hover:bg-blue-950/30"
                              aria-label="Move section up"
                            >
                              <MoveUp className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => moveSectionDown(index)}
                              disabled={index === tempSectionOrder.length - 1}
                              className="border-blue-300 dark:border-blue-700 hover:bg-blue-50 dark:hover:bg-blue-950/30"
                              aria-label="Move section down"
                            >
                              <MoveDown className="h-4 w-4" />
                            </Button>
                          </div>
                        </motion.div>
                      )}
                    </Draggable>
                  ))}
                  {provided.placeholder}
                </div>
              )}
            </Droppable>
          </DragDropContext>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setTempSectionOrder(sectionOrder);
                setIsReorderModalOpen(false);
              }}
              className="border-slate-300 dark:border-slate-700"
            >
              Cancel
            </Button>
            <Button
              onClick={saveSectionOrder}
              className="bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 hover:from-blue-600 hover:via-purple-600 hover:to-pink-600 text-white"
            >
              Save Order
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <style jsx global>{`
        /* ✅ EXACT match with download page and Puppeteer PDF */
        @page {
          size: A4;
          margin: 20px 10px;
        }

        * {
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
        }

        .resume-preview {
          width: 21cm;
          min-height: 29.7cm;
          background: white;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
          margin: 0.5cm auto 2rem;
          padding: 1.5cm 2cm;
          box-sizing: border-box;
          position: relative;
          font-size: 12px;
          line-height: 1.4;
        }

        @media screen {
          .resume-preview {
            background-image: 
              linear-gradient(to bottom, 
                transparent 0, 
                transparent calc(29.7cm - 1.5cm - 2px),
                rgba(239, 68, 68, 0.3) calc(29.7cm - 1.5cm - 2px), 
                rgba(239, 68, 68, 0.6) calc(29.7cm - 1.5cm - 1px),
                rgba(220, 38, 38, 0.8) calc(29.7cm - 1.5cm),
                rgba(239, 68, 68, 0.6) calc(29.7cm - 1.5cm + 1px),
                rgba(239, 68, 68, 0.3) calc(29.7cm - 1.5cm + 2px),
                transparent calc(29.7cm - 1.5cm + 2px)
              );
            background-repeat: repeat-y;
          }

          .resume-preview::after {
            content: '';
            position: absolute;
            top: calc(29.7cm - 1.5cm - 12px);
            left: 50%;
            transform: translateX(-50%);
            background: linear-gradient(135deg, #dc2626, #ef4444);
            color: white;
            padding: 4px 12px;
            border-radius: 12px;
            font-size: 9px;
            font-weight: 700;
            letter-spacing: 0.3px;
            box-shadow: 0 2px 8px rgba(220, 38, 38, 0.4);
            z-index: 100;
            pointer-events: none;
            white-space: nowrap;
          }

          .work-item, .education-item, .project-item {
            page-break-inside: avoid;
            break-inside: avoid;
            margin-bottom: 1rem;
          }

          h1, h2, h3, h4, h5, h6 {
            page-break-after: avoid;
            break-after: avoid;
            page-break-inside: avoid;
            break-inside: avoid;
          }

          p, li {
            orphans: 2;
            widows: 2;
          }
        }

        @media print {
          body {
            background: white !important;
            margin: 0 !important;
            padding: 0 !important;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }

          html, body {
            margin: 0;
            padding: 0;
            width: 21cm;
            background: white;
          }

          .resume-preview {
            box-shadow: none !important;
            background-image: none !important;
            margin: 0 !important;
            width: 21cm !important;
            min-height: 29.7cm !important;
            padding: 0 !important;
          }

          .resume-preview::after {
            display: none !important;
          }

          nav,
          footer,
          .print\\:hidden {
            display: none !important;
          }

          h1, h2, h3, h4, h5, h6 {
            page-break-after: avoid;
            break-after: avoid;
          }

          * {
            page-break-inside: avoid;
            break-inside: avoid;
          }

          a {
            text-decoration: none !important;
          }

          input,
          textarea {
            border: none !important;
            padding: 0 !important;
            background: transparent !important;
          }
        }

        @media (max-width: 640px) {
          .resume-preview {
            width: 100% !important;
            min-height: auto;
          }

          .resume-preview::after {
            display: none !important;
          }
        }
      `}</style>
    </div>
  );
}
