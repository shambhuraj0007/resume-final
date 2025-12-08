"use client";
import { useCallback } from 'react';
import { Input } from '@/components/ui/input';
import type { TemplateProps } from './types';
import { Textarea } from '@/components/ui/textarea';
import DOMPurify from 'isomorphic-dompurify';

import { Roboto } from 'next/font/google';

const roboto = Roboto({
  subsets: ['latin'],
  weight: ['400', '700'],
  display: 'swap',
});

export function ProfessionalTemplate({ resumeData, isEditing, updateField }: TemplateProps) {
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
              className={`text-gray-900 underline hover:text-gray-700 ${className}`}
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
              className={`hover:underline ${className}`}
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
              className={`hover:underline ${className}`}
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
            className={`w-full min-h-[50px] ${className}`}
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
    <div
      className={`w-full max-w-[8.5in] mx-auto bg-white px-[0.75in] py-[0.75in] ${roboto.className}`}
      style={{
        fontSize: '10pt',
        lineHeight: '1.3',
        color: '#000000'
      }}
    >
      {/* Header Section - LaTeX style */}
      <header className="mb-6 break-inside-avoid">
        <h1
          className="text-center font-bold mb-2"
          style={{ fontSize: '20pt', letterSpacing: '0.5px' }}
        >
          {renderInput({
            value: resumeData.personalDetails.fullName,
            onChange: (value) => updateField('personalDetails', null, 'fullName', value),
            className: 'text-center font-bold',
            ariaLabel: 'Full name',
          })}
        </h1>

        {/* Contact Info - Compact LaTeX style */}
        <div className="text-center text-gray-900" style={{ fontSize: '9pt' }}>
          <div className="flex justify-center items-center flex-wrap gap-x-3 gap-y-1">
            {resumeData.personalDetails.location && (
              <span>
                {renderInput({
                  value: resumeData.personalDetails.location,
                  onChange: (value) => updateField('personalDetails', null, 'location', value),
                  ariaLabel: 'Location',
                })}
              </span>
            )}
            {resumeData.personalDetails.phone && (
              <>
                {resumeData.personalDetails.location && <span>•</span>}
                {renderInput({
                  value: resumeData.personalDetails.phone,
                  onChange: (value) => updateField('personalDetails', null, 'phone', value),
                  type: 'phone',
                  ariaLabel: 'Phone',
                })}
              </>
            )}
            {resumeData.personalDetails.email && (
              <>
                {(resumeData.personalDetails.location || resumeData.personalDetails.phone) && <span>•</span>}
                {renderInput({
                  value: resumeData.personalDetails.email,
                  onChange: (value) => updateField('personalDetails', null, 'email', value),
                  type: 'mail',
                  ariaLabel: 'Email',
                })}
              </>
            )}
          </div>
          <div className="flex justify-center items-center flex-wrap gap-x-3 gap-y-1 mt-1">
            {resumeData.personalDetails.linkedin && (
              <span>
                {renderInput({
                  value: resumeData.personalDetails.linkedin,
                  onChange: (value) => updateField('personalDetails', null, 'linkedin', value),
                  type: 'link',
                  ariaLabel: 'LinkedIn',
                })}
              </span>
            )}
            {resumeData.personalDetails.github && (
              <>
                {resumeData.personalDetails.linkedin && <span>•</span>}
                {renderInput({
                  value: resumeData.personalDetails.github,
                  onChange: (value) => updateField('personalDetails', null, 'github', value),
                  type: 'link',
                  ariaLabel: 'GitHub',
                })}
              </>
            )}
            {resumeData.personalDetails.website && (
              <>
                {(resumeData.personalDetails.linkedin || resumeData.personalDetails.github) && <span>•</span>}
                {renderInput({
                  value: resumeData.personalDetails.website,
                  onChange: (value) => updateField('personalDetails', null, 'website', value),
                  type: 'link',
                  ariaLabel: 'Website',
                })}
              </>
            )}
          </div>
        </div>
      </header>

      {/* Professional Summary */}
      {hasContent(resumeData.objective) && (
        <section aria-labelledby="summary" className="mb-5 break-inside-avoid">
          <h2
            id="summary"
            className="font-bold mb-2 pb-1 border-b border-gray-900"
            style={{ fontSize: '11pt', letterSpacing: '0.3px' }}
          >
            SUMMARY
          </h2>
          {renderInput({
            value: resumeData.objective,
            onChange: (value) => updateField('objective', null, 'objective', value),
            multiline: true,
            className: 'text-gray-900 text-justify leading-tight',
            ariaLabel: 'Professional summary',
          })}
        </section>
      )}

      {/* Education Section */}
      {hasContent(resumeData.education) && (
        <section aria-labelledby="education" className="mb-5">
          <h2
            id="education"
            className="font-bold mb-2 pb-1 border-b border-gray-900"
            style={{ fontSize: '11pt', letterSpacing: '0.3px' }}
          >
            EDUCATION
          </h2>
          <div className="space-y-3">
            {resumeData.education.map((edu, index) => (
              <article key={index} className="break-inside-avoid">
                <div className="flex justify-between items-baseline mb-0.5">
                  <div className="font-bold text-gray-900">
                    {renderInput({
                      value: edu.institution,
                      onChange: (value) => updateField('education', index, 'institution', value),
                      ariaLabel: 'Institution',
                    })}
                  </div>
                  <div className="text-gray-900" style={{ fontSize: '9pt' }}>
                    {edu.location && renderInput({
                      value: edu.location,
                      onChange: (value) => updateField('education', index, 'location', value),
                      ariaLabel: 'Location',
                    })}
                  </div>
                </div>
                <div className="flex justify-between items-baseline">
                  <div className="italic text-gray-900">
                    {renderInput({
                      value: edu.degree,
                      onChange: (value) => updateField('education', index, 'degree', value),
                      ariaLabel: 'Degree',
                    })}
                  </div>
                  <div className="text-gray-900" style={{ fontSize: '9pt' }}>
                    {renderInput({
                      value: edu.startDate,
                      onChange: (value) => updateField('education', index, 'startDate', value),
                      className: 'inline-block',
                      ariaLabel: 'Start date',
                    })}
                    {edu.startDate && <span className="mx-1">–</span>}
                    {renderInput({
                      value: edu.endDate,
                      onChange: (value) => updateField('education', index, 'endDate', value),
                      className: 'inline-block',
                      ariaLabel: 'End date',
                    })}
                  </div>
                </div>
                {edu.description && (
                  <div className="text-gray-900 mt-1" style={{ fontSize: '9pt' }}>
                    {renderInput({
                      value: edu.description,
                      onChange: (value) => updateField('education', index, 'description', value),
                      ariaLabel: 'Description',
                    })}
                  </div>
                )}
              </article>
            ))}
          </div>
        </section>
      )}

      {/* Work Experience Section */}
      {hasContent(resumeData.workExperience) && (
        <section aria-labelledby="experience" className="mb-5">
          <h2
            id="experience"
            className="font-bold mb-2 pb-1 border-b border-gray-900"
            style={{ fontSize: '11pt', letterSpacing: '0.3px' }}
          >
            EXPERIENCE
          </h2>
          <div className="space-y-3">
            {resumeData.workExperience.map((exp, index) => (
              <article key={index} className="break-inside-avoid">
                <div className="flex justify-between items-baseline mb-0.5">
                  <div className="font-bold text-gray-900">
                    {renderInput({
                      value: exp.companyName,
                      onChange: (value) => updateField('workExperience', index, 'companyName', value),
                      ariaLabel: 'Company name',
                    })}
                  </div>
                  <div className="text-gray-900" style={{ fontSize: '9pt' }}>
                    {exp.location && renderInput({
                      value: exp.location,
                      onChange: (value) => updateField('workExperience', index, 'location', value),
                      ariaLabel: 'Location',
                    })}
                  </div>
                </div>
                <div className="flex justify-between items-baseline mb-1">
                  <div className="italic text-gray-900">
                    {renderInput({
                      value: exp.jobTitle,
                      onChange: (value) => updateField('workExperience', index, 'jobTitle', value),
                      ariaLabel: 'Job title',
                    })}
                  </div>
                  <div className="text-gray-900" style={{ fontSize: '9pt' }}>
                    {renderInput({
                      value: exp.startDate,
                      onChange: (value) => updateField('workExperience', index, 'startDate', value),
                      className: 'inline-block',
                      ariaLabel: 'Start date',
                    })}
                    <span className="mx-1">–</span>
                    {renderInput({
                      value: exp.endDate,
                      onChange: (value) => updateField('workExperience', index, 'endDate', value),
                      className: 'inline-block',
                      ariaLabel: 'End date',
                    })}
                  </div>
                </div>
                {renderInput({
                  value: exp.description,
                  onChange: (value) => updateField('workExperience', index, 'description', value),
                  multiline: true,
                  className: 'text-gray-900 leading-tight text-justify',
                  ariaLabel: 'Job description',
                })}
              </article>
            ))}
          </div>
        </section>
      )}

      {/* Projects Section */}
      {hasContent(resumeData.projects) && (
        <section aria-labelledby="projects" className="mb-5">
          <h2
            id="projects"
            className="font-bold mb-2 pb-1 border-b border-gray-900"
            style={{ fontSize: '11pt', letterSpacing: '0.3px' }}
          >
            PROJECTS
          </h2>
          <div className="space-y-3">
            {resumeData.projects.map((project, index) => (
              <article key={index} className="break-inside-avoid">
                <div className="flex justify-between items-baseline mb-1">
                  <div className="font-bold text-gray-900">
                    {renderInput({
                      value: project.projectName,
                      onChange: (value) => updateField('projects', index, 'projectName', value),
                      ariaLabel: 'Project name',
                    })}
                  </div>
                  {project.link && (
                    <div style={{ fontSize: '9pt' }}>
                      {renderInput({
                        value: project.link,
                        onChange: (value) => updateField('projects', index, 'link', value),
                        type: 'link',
                        className: 'text-xs',
                        ariaLabel: 'Project link',
                      })}
                    </div>
                  )}
                </div>
                {renderInput({
                  value: project.description,
                  onChange: (value) => updateField('projects', index, 'description', value),
                  multiline: true,
                  className: 'text-gray-900 leading-tight text-justify',
                  ariaLabel: 'Project description',
                })}
              </article>
            ))}
          </div>
        </section>
      )}

      {/* Skills Section */}
      {hasContent(resumeData.skills) && (
        <section aria-labelledby="skills" className="mb-5">
          <h2
            id="skills"
            className="font-bold mb-2 pb-1 border-b border-gray-900"
            style={{ fontSize: '11pt', letterSpacing: '0.3px' }}
          >
            TECHNICAL SKILLS
          </h2>
          <div className="space-y-1.5">
            {resumeData.skills.map((skill, index) => (
              <div key={index} className="break-inside-avoid">
                {skill.skillType === 'individual' ? (
                  <span className="text-gray-900">
                    {renderInput({
                      value: skill.skill,
                      onChange: (value) => updateField('skills', index, 'skill', value),
                      ariaLabel: 'Skill',
                    })}
                  </span>
                ) : (
                  <div className="flex items-start">
                    <span className="font-semibold text-gray-900 min-w-[120px]">
                      {renderInput({
                        value: skill.category,
                        onChange: (value) => updateField('skills', index, 'category', value),
                        ariaLabel: 'Skill category',
                      })}
                      :
                    </span>
                    <span className="text-gray-900 flex-1 ml-2">
                      {renderInput({
                        value: skill.skills,
                        onChange: (value) => updateField('skills', index, 'skills', value),
                        ariaLabel: 'Skills',
                      })}
                    </span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Certifications Section */}
      {hasContent(resumeData.certifications) && (
        <section aria-labelledby="certifications" className="mb-5">
          <h2
            id="certifications"
            className="font-bold mb-2 pb-1 border-b border-gray-900"
            style={{ fontSize: '11pt', letterSpacing: '0.3px' }}
          >
            CERTIFICATIONS
          </h2>
          <div className="space-y-2">
            {resumeData.certifications.map((cert, index) => (
              <article key={index} className="break-inside-avoid">
                <div className="flex justify-between items-baseline">
                  <div>
                    <span className="font-semibold text-gray-900">
                      {renderInput({
                        value: cert.certificationName,
                        onChange: (value) => updateField('certifications', index, 'certificationName', value),
                        ariaLabel: 'Certification name',
                      })}
                    </span>
                    <span className="mx-2">–</span>
                    <span className="text-gray-900">
                      {renderInput({
                        value: cert.issuingOrganization,
                        onChange: (value) => updateField('certifications', index, 'issuingOrganization', value),
                        className: 'inline-block',
                        ariaLabel: 'Issuing organization',
                      })}
                    </span>
                  </div>
                  <div className="text-gray-900" style={{ fontSize: '9pt' }}>
                    {renderInput({
                      value: cert.issueDate,
                      onChange: (value) => updateField('certifications', index, 'issueDate', value),
                      ariaLabel: 'Issue date',
                    })}
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>
      )}

      {/* Languages Section */}
      {hasContent(resumeData.languages) && (
        <section aria-labelledby="languages" className="mb-5">
          <h2
            id="languages"
            className="font-bold mb-2 pb-1 border-b border-gray-900"
            style={{ fontSize: '11pt', letterSpacing: '0.3px' }}
          >
            LANGUAGES
          </h2>
          <div className="flex flex-wrap gap-x-4 gap-y-1">
            {resumeData.languages.map((language, index) => (
              <span key={index} className="text-gray-900">
                {renderInput({
                  value: language.language,
                  onChange: (value) => updateField('languages', index, 'language', value),
                  className: 'inline-block font-semibold',
                  ariaLabel: 'Language',
                })}
                <span className="mx-1">–</span>
                {renderInput({
                  value: language.proficiency,
                  onChange: (value) => updateField('languages', index, 'proficiency', value),
                  className: 'inline-block',
                  ariaLabel: 'Proficiency',
                })}
              </span>
            ))}
          </div>
        </section>
      )}

      {/* Custom Sections */}
      {hasContent(resumeData.customSections) && (
        <>
          {resumeData.customSections.map((custom, idx) => (
            <section key={idx} aria-labelledby={`custom-${idx}`} className="mb-5 break-inside-avoid">
              <h2
                id={`custom-${idx}`}
                className="font-bold mb-2 pb-1 border-b border-gray-900 uppercase"
                style={{ fontSize: '11pt', letterSpacing: '0.3px' }}
              >
                {custom.sectionTitle}
              </h2>
              {renderInput({
                value: custom.content,
                onChange: (value) => updateField('customSections', idx, 'content', value),
                multiline: true,
                className: 'text-gray-900 leading-tight',
                ariaLabel: 'Custom section content',
              })}
            </section>
          ))}
        </>
      )}
    </div>
  );
}
