"use client";
import { useCallback } from 'react';
import { Input } from '@/components/ui/input';
import type { TemplateProps } from './types';
import { Textarea } from '@/components/ui/textarea';
import DOMPurify from 'isomorphic-dompurify';


import { Inter } from 'next/font/google';

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
});

export function MinimalTemplate({ resumeData, isEditing, updateField }: TemplateProps) {
  // ... (renderMarkdown and renderInput implementation remains same) ...
  const renderMarkdown = useCallback((text: string): string => {
    if (!text) return '';
    const processed = text
      .split('\n')
      .map((line, index) => {
        line = line.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
        if (line.trim().startsWith('- ') && index === 0) {
          line = `• ${line.substring(2)}`;
        } else if (line.trim().startsWith('- ') && index > 0) {
          line = `<br/>• ${line.substring(2)}`;
        }
        return line;
      })
      .join('\n');
    return DOMPurify.sanitize(processed);
  }, []);


  const renderInput = useCallback(
    ({
      value,
      onChange,
      multiline = false,
      className = '',
      type = '',
      ariaLabel = '',
    }: {
      value: string;
      onChange: (value: string) => void;
      multiline?: boolean;
      className?: string;
      type?: string;
      ariaLabel?: string;
    }) => {
      if (!isEditing) {
        if (type === 'link') {
          return (
            <a
              href={value}
              target="_blank"
              rel="noopener noreferrer"
              className={`text-[#1e40af] hover:text-[#1e3a8a] hover:underline transition-colors ${className}`}
              aria-label={ariaLabel}
            >
              {value}
            </a>
          );
        }
        if (type === 'mail') {
          return (
            <a
              href={`mailto:${value}`}
              className={`text-gray-700 hover:text-[#1e40af] transition-colors ${className}`}
              aria-label={ariaLabel}
            >
              {value}
            </a>
          );
        }
        if (type === 'phone') {
          return (
            <a
              href={`tel:${value}`}
              className={`text-gray-700 hover:text-[#1e40af] transition-colors ${className}`}
              aria-label={ariaLabel}
            >
              {value}
            </a>
          );
        }
        return <span className={className} dangerouslySetInnerHTML={{ __html: renderMarkdown(value) }} />;
      }


      if (multiline) {
        return (
          <Textarea
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
            className={`w-full min-h-[60px] ${className}`}
            aria-label={ariaLabel}
          />
        );
      }


      return (
        <Input
          type="text"
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
          className={`focus-visible:ring-2 ${className}`}
          aria-label={ariaLabel}
        />
      );
    },
    [isEditing, renderMarkdown]
  );


  const hasContent = useCallback((section: unknown): boolean => {
    if (!section) return false;
    if (Array.isArray(section)) return section.length > 0;
    if (typeof section === 'object' && section !== null) {
      return Object.values(section).some((value) =>
        typeof value === 'string' ? value.trim() !== '' : Boolean(value)
      );
    }
    return typeof section === 'string' ? section.trim() !== '' : Boolean(section);
  }, []);


  return (
    <>
      {/* PDF Print Styles */}
      <style jsx global>{`
        @media print {
          @page {
            size: letter;
            margin: 0.5in 0.75in;
          }
          
          body {
            print-color-adjust: exact;
            -webkit-print-color-adjust: exact;
          }
          
          .resume-page {
            page-break-after: always;
            min-height: 10in;
            height: auto;
          }
          
          .resume-page:last-child {
            page-break-after: auto;
          }
          
          section {
            page-break-inside: avoid;
          }
          
          article {
            page-break-inside: avoid;
          }
          
          h2 {
            page-break-after: avoid;
          }
        }
        
        /* Screen view - simulate pages */
        @media screen {
          .resume-page {
            min-height: auto;
            box-shadow: 0 2px 8px rgba(0,0,0,0.1);
            margin-bottom: 20px;
            background: white;
          }
          
          .resume-page:last-child {
            margin-bottom: 0;
          }
        }
      `}</style>

      <div
        className={`resume-page w-full max-w-[8.5in] mx-auto bg-white px-12 py-10 ${inter.className}`}
        style={{
          fontSize: '11pt',
          lineHeight: '1.15'
        }}
      >
        {/* Header - Navy Blue & Gold Accents */}
        <header className="mb-6 pb-4 border-b-[3px] border-[#1e40af]">
          <h1 className="text-[26pt] font-bold text-[#0f172a] mb-2 tracking-wide">
            {renderInput({
              value: resumeData.personalDetails.fullName,
              onChange: (value) => updateField('personalDetails', null, 'fullName', value),
              className: 'text-[#0f172a] font-bold uppercase',
              ariaLabel: 'Full name',
            })}
          </h1>
          <div className="text-[16pt] font-semibold text-[#1e40af] mb-3">
            {renderInput({
              value: resumeData.jobTitle,
              onChange: (value) => updateField('jobTitle', null, 'jobTitle', value),
              className: 'text-[#1e40af]',
              ariaLabel: 'Job title',
            })}
          </div>

          {/* Contact Information */}
          <div className="text-[10.5pt] text-gray-700 flex flex-wrap gap-x-4 gap-y-1">
            {resumeData.personalDetails.email && (
              <div className="flex items-center gap-1.5">
                <span className="font-semibold text-[#1e40af]">📧</span>
                {renderInput({
                  value: resumeData.personalDetails.email,
                  onChange: (value) => updateField('personalDetails', null, 'email', value),
                  type: 'mail',
                  className: 'inline-block',
                  ariaLabel: 'Email',
                })}
              </div>
            )}
            {resumeData.personalDetails.phone && (
              <div className="flex items-center gap-1.5">
                <span className="font-semibold text-[#1e40af]">📞</span>
                {renderInput({
                  value: resumeData.personalDetails.phone,
                  onChange: (value) => updateField('personalDetails', null, 'phone', value),
                  type: 'phone',
                  className: 'inline-block',
                  ariaLabel: 'Phone',
                })}
              </div>
            )}
            {resumeData.personalDetails.location && (
              <div className="flex items-center gap-1.5">
                <span className="font-semibold text-[#1e40af]">📍</span>
                {renderInput({
                  value: resumeData.personalDetails.location,
                  onChange: (value) => updateField('personalDetails', null, 'location', value),
                  className: 'inline-block',
                  ariaLabel: 'Location',
                })}
              </div>
            )}
            {resumeData.personalDetails.linkedin && (
              <div className="flex items-center gap-1.5">
                <span className="font-semibold text-[#1e40af]">💼</span>
                {renderInput({
                  value: resumeData.personalDetails.linkedin,
                  onChange: (value) => updateField('personalDetails', null, 'linkedin', value),
                  type: 'link',
                  className: 'inline-block',
                  ariaLabel: 'LinkedIn',
                })}
              </div>
            )}
            {resumeData.personalDetails.github && (
              <div className="flex items-center gap-1.5">
                <span className="font-semibold text-[#1e40af]">💻</span>
                {renderInput({
                  value: resumeData.personalDetails.github,
                  onChange: (value) => updateField('personalDetails', null, 'github', value),
                  type: 'link',
                  className: 'inline-block',
                  ariaLabel: 'GitHub',
                })}
              </div>
            )}
            {resumeData.personalDetails.website && (
              <div className="flex items-center gap-1.5">
                <span className="font-semibold text-[#1e40af]">🌐</span>
                {renderInput({
                  value: resumeData.personalDetails.website,
                  onChange: (value) => updateField('personalDetails', null, 'website', value),
                  type: 'link',
                  className: 'inline-block',
                  ariaLabel: 'Website',
                })}
              </div>
            )}
          </div>
        </header>


        {/* Professional Summary */}
        {hasContent(resumeData.objective) && (
          <section aria-labelledby="summary" className="mb-5">
            <div className="flex items-center gap-3 mb-2">
              <h2
                id="summary"
                className="text-[14pt] font-bold text-[#1e40af] uppercase tracking-wide whitespace-nowrap"
              >
                Professional Summary
              </h2>
              <div className="flex-1 h-[2px] bg-gradient-to-r from-[#1e40af] to-transparent"></div>
            </div>
            <div className="text-[11pt] leading-relaxed pl-1">
              {renderInput({
                value: resumeData.objective,
                onChange: (value) => updateField('objective', null, 'objective', value),
                multiline: true,
                className: 'text-gray-800 text-justify',
                ariaLabel: 'Professional summary',
              })}
            </div>
          </section>
        )}


        {/* Work Experience */}
        {hasContent(resumeData.workExperience) && (
          <section aria-labelledby="experience" className="mb-5">
            <div className="flex items-center gap-3 mb-3">
              <h2
                id="experience"
                className="text-[14pt] font-bold text-[#1e40af] uppercase tracking-wide whitespace-nowrap"
              >
                Work Experience
              </h2>
              <div className="flex-1 h-[2px] bg-gradient-to-r from-[#1e40af] to-transparent"></div>
            </div>
            <div className="space-y-4">
              {resumeData.workExperience.map((exp, index) => (
                <article key={index} className="break-inside-avoid pl-1">
                  <div className="flex justify-between items-baseline mb-1">
                    <h3 className="text-[12pt] font-bold text-[#0f172a]">
                      {renderInput({
                        value: exp.jobTitle,
                        onChange: (value) => updateField('workExperience', index, 'jobTitle', value),
                        className: 'font-bold',
                        ariaLabel: 'Job title',
                      })}
                    </h3>
                    <div className="text-[10.5pt] text-[#64748b] font-semibold whitespace-nowrap ml-4 flex items-center gap-1">
                      {renderInput({
                        value: exp.startDate,
                        onChange: (value) => updateField('workExperience', index, 'startDate', value),
                        className: 'inline-block',
                        ariaLabel: 'Start date',
                      })}
                      <span>–</span>
                      {renderInput({
                        value: exp.endDate,
                        onChange: (value) => updateField('workExperience', index, 'endDate', value),
                        className: 'inline-block',
                        ariaLabel: 'End date',
                      })}
                    </div>
                  </div>
                  <div className="text-[11pt] font-semibold text-[#1e40af] mb-1">
                    {renderInput({
                      value: exp.companyName,
                      onChange: (value) => updateField('workExperience', index, 'companyName', value),
                      className: 'inline-block',
                      ariaLabel: 'Company name',
                    })}
                    {exp.location && (
                      <>
                        <span className="mx-2 text-gray-400">|</span>
                        {renderInput({
                          value: exp.location,
                          onChange: (value) => updateField('workExperience', index, 'location', value),
                          className: 'inline-block font-normal text-[#64748b]',
                          ariaLabel: 'Location',
                        })}
                      </>
                    )}
                  </div>
                  <div className="text-[11pt] leading-relaxed ml-5">
                    {renderInput({
                      value: exp.description,
                      onChange: (value) => updateField('workExperience', index, 'description', value),
                      multiline: true,
                      className: 'text-gray-700 text-justify',
                      ariaLabel: 'Job description',
                    })}
                  </div>
                </article>
              ))}
            </div>
          </section>
        )}


        {/* Education */}
        {hasContent(resumeData.education) && (
          <section aria-labelledby="education" className="mb-5">
            <div className="flex items-center gap-3 mb-3">
              <h2
                id="education"
                className="text-[14pt] font-bold text-[#1e40af] uppercase tracking-wide whitespace-nowrap"
              >
                Education
              </h2>
              <div className="flex-1 h-[2px] bg-gradient-to-r from-[#1e40af] to-transparent"></div>
            </div>
            <div className="space-y-3">
              {resumeData.education.map((edu, index) => (
                <article key={index} className="break-inside-avoid pl-1">
                  <div className="flex justify-between items-baseline mb-1">
                    <h3 className="text-[12pt] font-bold text-[#0f172a]">
                      {renderInput({
                        value: edu.degree,
                        onChange: (value) => updateField('education', index, 'degree', value),
                        className: 'font-bold',
                        ariaLabel: 'Degree',
                      })}
                    </h3>
                    <div className="text-[10.5pt] text-[#64748b] font-semibold whitespace-nowrap ml-4 flex items-center gap-1">
                      {renderInput({
                        value: edu.startDate,
                        onChange: (value) => updateField('education', index, 'startDate', value),
                        className: 'inline-block',
                        ariaLabel: 'Start date',
                      })}
                      {edu.startDate && <span>–</span>}
                      {renderInput({
                        value: edu.endDate,
                        onChange: (value) => updateField('education', index, 'endDate', value),
                        className: 'inline-block',
                        ariaLabel: 'End date',
                      })}
                    </div>
                  </div>
                  <div className="text-[11pt] font-semibold text-[#1e40af]">
                    {renderInput({
                      value: edu.institution,
                      onChange: (value) => updateField('education', index, 'institution', value),
                      className: 'inline-block',
                      ariaLabel: 'Institution',
                    })}
                    {edu.location && (
                      <>
                        <span className="mx-2 text-gray-400">|</span>
                        {renderInput({
                          value: edu.location,
                          onChange: (value) => updateField('education', index, 'location', value),
                          className: 'inline-block font-normal text-[#64748b]',
                          ariaLabel: 'Location',
                        })}
                      </>
                    )}
                  </div>
                  {edu.description && (
                    <div className="text-[11pt] text-gray-700 mt-1">
                      {renderInput({
                        value: edu.description,
                        onChange: (value) => updateField('education', index, 'description', value),
                        className: 'inline-block',
                        ariaLabel: 'Description',
                      })}
                    </div>
                  )}
                </article>
              ))}
            </div>
          </section>
        )}


        {/* Projects */}
        {hasContent(resumeData.projects) && (
          <section aria-labelledby="projects" className="mb-5">
            <div className="flex items-center gap-3 mb-3">
              <h2
                id="projects"
                className="text-[14pt] font-bold text-[#1e40af] uppercase tracking-wide whitespace-nowrap"
              >
                Projects
              </h2>
              <div className="flex-1 h-[2px] bg-gradient-to-r from-[#1e40af] to-transparent"></div>
            </div>
            <div className="space-y-4">
              {resumeData.projects.map((project, index) => (
                <article key={index} className="break-inside-avoid pl-1">
                  <div className="flex justify-between items-baseline mb-1">
                    <h3 className="text-[12pt] font-bold text-[#0f172a]">
                      {renderInput({
                        value: project.projectName,
                        onChange: (value) => updateField('projects', index, 'projectName', value),
                        className: 'font-bold',
                        ariaLabel: 'Project name',
                      })}
                    </h3>
                    {project.link && (
                      <div className="text-[10pt] ml-4">
                        {renderInput({
                          value: project.link,
                          onChange: (value) => updateField('projects', index, 'link', value),
                          type: 'link',
                          className: 'text-[10pt]',
                          ariaLabel: 'Project link',
                        })}
                      </div>
                    )}
                  </div>
                  <div className="text-[11pt] leading-relaxed ml-5">
                    {renderInput({
                      value: project.description,
                      onChange: (value) => updateField('projects', index, 'description', value),
                      multiline: true,
                      className: 'text-gray-700 text-justify',
                      ariaLabel: 'Project description',
                    })}
                  </div>
                </article>
              ))}
            </div>
          </section>
        )}


        {/* Skills */}
        {hasContent(resumeData.skills) && (
          <section aria-labelledby="skills" className="mb-5">
            <div className="flex items-center gap-3 mb-3">
              <h2
                id="skills"
                className="text-[14pt] font-bold text-[#1e40af] uppercase tracking-wide whitespace-nowrap"
              >
                Skills
              </h2>
              <div className="flex-1 h-[2px] bg-gradient-to-r from-[#1e40af] to-transparent"></div>
            </div>
            <div className="space-y-2 pl-1">
              {resumeData.skills.map((skill, index) => (
                <div key={index} className="flex items-start text-[11pt] break-inside-avoid">
                  {skill.skillType === 'individual' ? (
                    <div className="text-gray-800 font-semibold">
                      {renderInput({
                        value: skill.skill,
                        onChange: (value) => updateField('skills', index, 'skill', value),
                        className: 'font-semibold',
                        ariaLabel: 'Skill',
                      })}
                    </div>
                  ) : (
                    <>
                      <div className="font-bold text-[#0f172a] min-w-fit">
                        {renderInput({
                          value: skill.category,
                          onChange: (value) => updateField('skills', index, 'category', value),
                          className: 'font-bold',
                          ariaLabel: 'Skill category',
                        })}
                        <span className="mx-1">:</span>
                      </div>
                      <div className="text-gray-700 flex-1">
                        {renderInput({
                          value: skill.skills,
                          onChange: (value) => updateField('skills', index, 'skills', value),
                          className: '',
                          ariaLabel: 'Skills',
                        })}
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}


        {/* Certifications */}
        {hasContent(resumeData.certifications) && (
          <section aria-labelledby="certifications" className="mb-5">
            <div className="flex items-center gap-3 mb-3">
              <h2
                id="certifications"
                className="text-[14pt] font-bold text-[#1e40af] uppercase tracking-wide whitespace-nowrap"
              >
                Certifications
              </h2>
              <div className="flex-1 h-[2px] bg-gradient-to-r from-[#1e40af] to-transparent"></div>
            </div>
            <div className="space-y-3 pl-1">
              {resumeData.certifications.map((cert, index) => (
                <article key={index} className="break-inside-avoid">
                  <div className="flex justify-between items-baseline">
                    <div className="font-bold text-[11pt] text-[#0f172a]">
                      {renderInput({
                        value: cert.certificationName,
                        onChange: (value) => updateField('certifications', index, 'certificationName', value),
                        className: 'font-bold',
                        ariaLabel: 'Certification name',
                      })}
                    </div>
                    <div className="text-[10.5pt] text-[#64748b] font-semibold whitespace-nowrap ml-4">
                      {renderInput({
                        value: cert.issueDate,
                        onChange: (value) => updateField('certifications', index, 'issueDate', value),
                        className: '',
                        ariaLabel: 'Issue date',
                      })}
                    </div>
                  </div>
                  <div className="text-[11pt] text-[#1e40af] font-medium">
                    {renderInput({
                      value: cert.issuingOrganization,
                      onChange: (value) => updateField('certifications', index, 'issuingOrganization', value),
                      className: '',
                      ariaLabel: 'Issuing organization',
                    })}
                  </div>
                </article>
              ))}
            </div>
          </section>
        )}


        {/* Languages */}
        {hasContent(resumeData.languages) && (
          <section aria-labelledby="languages" className="mb-5">
            <div className="flex items-center gap-3 mb-3">
              <h2
                id="languages"
                className="text-[14pt] font-bold text-[#1e40af] uppercase tracking-wide whitespace-nowrap"
              >
                Languages
              </h2>
              <div className="flex-1 h-[2px] bg-gradient-to-r from-[#1e40af] to-transparent"></div>
            </div>
            <div className="grid grid-cols-2 gap-2 pl-1">
              {resumeData.languages.map((language, index) => (
                <div key={index} className="text-[11pt] flex items-center gap-2 break-inside-avoid">
                  <span className="font-bold text-[#0f172a]">
                    {renderInput({
                      value: language.language,
                      onChange: (value) => updateField('languages', index, 'language', value),
                      className: 'font-bold inline-block',
                      ariaLabel: 'Language',
                    })}:
                  </span>
                  <span className="text-gray-700">
                    {renderInput({
                      value: language.proficiency,
                      onChange: (value) => updateField('languages', index, 'proficiency', value),
                      className: 'inline-block',
                      ariaLabel: 'Proficiency',
                    })}
                  </span>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
    </>
  );
}
