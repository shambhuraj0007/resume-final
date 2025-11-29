"use client";
import { useCallback } from 'react';
import { Input } from '@/components/ui/input';
import type { TemplateProps } from './types';
import { Textarea } from '@/components/ui/textarea';
import { Mail, Phone, MapPin, Linkedin, Github, Globe } from 'lucide-react';
import DOMPurify from 'isomorphic-dompurify';

export function ModernTemplate({ resumeData, isEditing, updateField }: TemplateProps) {
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
              className={`text-blue-600 hover:underline ${className}`}
              aria-label={ariaLabel}
            >
              {value}
            </a>
          );
        }
        if (type === 'mail') {
          return (
            <a href={`mailto:${value}`} className={`hover:underline ${className}`} aria-label={ariaLabel}>
              {value}
            </a>
          );
        }
        if (type === 'phone') {
          return (
            <a href={`tel:${value}`} className={`hover:underline ${className}`} aria-label={ariaLabel}>
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
    <div className="w-full max-w-[8.5in] mx-auto bg-white" style={{ fontFamily: 'Arial, sans-serif', fontSize: '11pt' }}>
      {/* Header Section */}
      <div className="bg-gray-900 text-white px-8 py-5 break-inside-avoid">
        <h1 className="text-3xl font-bold mb-1.5 tracking-tight">
          {renderInput({
            value: resumeData.personalDetails.fullName,
            onChange: (value) => updateField('personalDetails', null, 'fullName', value),
            className: 'text-white bg-transparent border-white uppercase',
            ariaLabel: 'Full name',
          })}
        </h1>
        <p className="text-lg text-gray-300 font-medium">
          {renderInput({
            value: resumeData.jobTitle,
            onChange: (value) => updateField('jobTitle', null, 'jobTitle', value),
            className: 'text-gray-300 bg-transparent border-gray-300',
            ariaLabel: 'Job title',
          })}
        </p>
      </div>

      {/* Two Column Layout */}
      <div className="grid grid-cols-[35%_65%] gap-0">
        {/* Left Sidebar (35%) */}
        <div className="bg-gray-50 px-6 py-6 space-y-5">
          {/* Contact Info */}
          <section aria-labelledby="contact-info" className="break-inside-avoid">
            <h2 id="contact-info" className="text-sm font-bold text-gray-900 mb-3 pb-1.5 border-b-2 border-gray-800 uppercase tracking-wide">
              Contact
            </h2>
            <div className="space-y-2.5 text-xs">
              {resumeData.personalDetails.email && (
                <div className="flex items-start gap-2">
                  <Mail className="w-3.5 h-3.5 mt-0.5 flex-shrink-0 text-gray-600" />
                  <div className="flex-1 break-words">
                    {renderInput({
                      value: resumeData.personalDetails.email,
                      onChange: (value) => updateField('personalDetails', null, 'email', value),
                      type: 'mail',
                      className: 'text-gray-700',
                      ariaLabel: 'Email',
                    })}
                  </div>
                </div>
              )}
              {resumeData.personalDetails.phone && (
                <div className="flex items-start gap-2">
                  <Phone className="w-3.5 h-3.5 mt-0.5 flex-shrink-0 text-gray-600" />
                  {renderInput({
                    value: resumeData.personalDetails.phone,
                    onChange: (value) => updateField('personalDetails', null, 'phone', value),
                    type: 'phone',
                    className: 'text-gray-700',
                    ariaLabel: 'Phone',
                  })}
                </div>
              )}
              {resumeData.personalDetails.location && (
                <div className="flex items-start gap-2">
                  <MapPin className="w-3.5 h-3.5 mt-0.5 flex-shrink-0 text-gray-600" />
                  {renderInput({
                    value: resumeData.personalDetails.location,
                    onChange: (value) => updateField('personalDetails', null, 'location', value),
                    className: 'text-gray-700',
                    ariaLabel: 'Location',
                  })}
                </div>
              )}
              {resumeData.personalDetails.linkedin && (
                <div className="flex items-start gap-2">
                  <Linkedin className="w-3.5 h-3.5 mt-0.5 flex-shrink-0 text-gray-600" />
                  <div className="flex-1 break-all">
                    {renderInput({
                      value: resumeData.personalDetails.linkedin,
                      onChange: (value) => updateField('personalDetails', null, 'linkedin', value),
                      type: 'link',
                      className: 'text-xs',
                      ariaLabel: 'LinkedIn',
                    })}
                  </div>
                </div>
              )}
              {resumeData.personalDetails.github && (
                <div className="flex items-start gap-2">
                  <Github className="w-3.5 h-3.5 mt-0.5 flex-shrink-0 text-gray-600" />
                  <div className="flex-1 break-all">
                    {renderInput({
                      value: resumeData.personalDetails.github,
                      onChange: (value) => updateField('personalDetails', null, 'github', value),
                      type: 'link',
                      className: 'text-xs',
                      ariaLabel: 'GitHub',
                    })}
                  </div>
                </div>
              )}
              {resumeData.personalDetails.website && (
                <div className="flex items-start gap-2">
                  <Globe className="w-3.5 h-3.5 mt-0.5 flex-shrink-0 text-gray-600" />
                  <div className="flex-1 break-all">
                    {renderInput({
                      value: resumeData.personalDetails.website,
                      onChange: (value) => updateField('personalDetails', null, 'website', value),
                      type: 'link',
                      className: 'text-xs',
                      ariaLabel: 'Website',
                    })}
                  </div>
                </div>
              )}
            </div>
          </section>

          {/* Skills */}
          {hasContent(resumeData.skills) && (
            <section aria-labelledby="skills" className="break-inside-avoid">
              <h2 id="skills" className="text-sm font-bold text-gray-900 mb-3 pb-1.5 border-b-2 border-gray-800 uppercase tracking-wide">
                Skills
              </h2>
              <div className="space-y-3.5">
                {resumeData.skills.map((skill, index) => (
                  <div key={index} className="text-xs leading-relaxed">
                    {skill.skillType === 'individual' ? (
                      renderInput({
                        value: skill.skill,
                        onChange: (value) => updateField('skills', index, 'skill', value),
                        className: 'text-gray-700',
                        ariaLabel: 'Skill',
                      })
                    ) : (
                      <>
                        <div className="font-bold text-gray-900 mb-1">
                          {renderInput({
                            value: skill.category,
                            onChange: (value) => updateField('skills', index, 'category', value),
                            ariaLabel: 'Skill category',
                          })}
                        </div>
                        <div className="text-gray-600 leading-relaxed">
                          {renderInput({
                            value: skill.skills,
                            onChange: (value) => updateField('skills', index, 'skills', value),
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

          {/* Languages */}
          {hasContent(resumeData.languages) && (
            <section aria-labelledby="languages" className="break-inside-avoid">
              <h2 id="languages" className="text-sm font-bold text-gray-900 mb-3 pb-1.5 border-b-2 border-gray-800 uppercase tracking-wide">
                Languages
              </h2>
              <div className="space-y-2">
                {resumeData.languages.map((language, index) => (
                  <div key={index} className="text-xs">
                    <div className="font-bold text-gray-900">
                      {renderInput({
                        value: language.language,
                        onChange: (value) => updateField('languages', index, 'language', value),
                        ariaLabel: 'Language',
                      })}
                    </div>
                    <div className="text-gray-600">
                      {renderInput({
                        value: language.proficiency,
                        onChange: (value) => updateField('languages', index, 'proficiency', value),
                        ariaLabel: 'Proficiency',
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Certifications */}
          {hasContent(resumeData.certifications) && (
            <section aria-labelledby="certifications" className="break-inside-avoid">
              <h2 id="certifications" className="text-sm font-bold text-gray-900 mb-3 pb-1.5 border-b-2 border-gray-800 uppercase tracking-wide">
                Certifications
              </h2>
              <div className="space-y-3">
                {resumeData.certifications.map((cert, index) => (
                  <div key={index} className="text-xs">
                    <div className="font-bold text-gray-900">
                      {renderInput({
                        value: cert.certificationName,
                        onChange: (value) => updateField('certifications', index, 'certificationName', value),
                        ariaLabel: 'Certification name',
                      })}
                    </div>
                    <div className="text-gray-600">
                      {renderInput({
                        value: cert.issuingOrganization,
                        onChange: (value) => updateField('certifications', index, 'issuingOrganization', value),
                        ariaLabel: 'Issuing organization',
                      })}
                    </div>
                    <div className="text-gray-500 text-xs">
                      {renderInput({
                        value: cert.issueDate,
                        onChange: (value) => updateField('certifications', index, 'issueDate', value),
                        ariaLabel: 'Issue date',
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>

        {/* Right Column (65%) */}
        <div className="px-8 py-6 space-y-5">
          {/* Professional Summary */}
          {hasContent(resumeData.objective) && (
            <section aria-labelledby="summary" className="break-inside-avoid">
              <h2 id="summary" className="text-sm font-bold text-gray-900 mb-3 pb-1.5 border-b-2 border-gray-800 uppercase tracking-wide">
                Professional Summary
              </h2>
              <div className="text-xs text-gray-700 leading-relaxed text-justify">
                {renderInput({
                  value: resumeData.objective,
                  onChange: (value) => updateField('objective', null, 'objective', value),
                  multiline: true,
                  className: 'text-xs leading-relaxed',
                  ariaLabel: 'Professional summary',
                })}
              </div>
            </section>
          )}

          {/* Work Experience */}
          {hasContent(resumeData.workExperience) && (
            <section aria-labelledby="experience" className="break-inside-avoid">
              <h2 id="experience" className="text-sm font-bold text-gray-900 mb-3 pb-1.5 border-b-2 border-gray-800 uppercase tracking-wide">
                Work Experience
              </h2>
              <div className="space-y-4">
                {resumeData.workExperience.map((exp, index) => (
                  <article key={index} className="break-inside-avoid">
                    <div className="flex justify-between items-start mb-0.5">
                      <div className="font-bold text-gray-900 text-sm">
                        {renderInput({
                          value: exp.jobTitle,
                          onChange: (value) => updateField('workExperience', index, 'jobTitle', value),
                          ariaLabel: 'Job title',
                        })}
                      </div>
                      <div className="text-xs text-gray-600 flex items-center gap-1 whitespace-nowrap ml-2">
                        {renderInput({
                          value: exp.startDate,
                          onChange: (value) => updateField('workExperience', index, 'startDate', value),
                          className: 'text-xs w-20',
                          ariaLabel: 'Start date',
                        })}
                        <span>—</span>
                        {renderInput({
                          value: exp.endDate,
                          onChange: (value) => updateField('workExperience', index, 'endDate', value),
                          className: 'text-xs w-20',
                          ariaLabel: 'End date',
                        })}
                      </div>
                    </div>
                    <div className="text-xs text-gray-700 mb-2 italic">
                      {renderInput({
                        value: exp.companyName,
                        onChange: (value) => updateField('workExperience', index, 'companyName', value),
                        ariaLabel: 'Company name',
                      })}
                      {exp.location && (
                        <>
                          <span className="mx-1.5">•</span>
                          {renderInput({
                            value: exp.location,
                            onChange: (value) => updateField('workExperience', index, 'location', value),
                            className: 'inline-block',
                            ariaLabel: 'Location',
                          })}
                        </>
                      )}
                    </div>
                    <div className="text-xs text-gray-600 leading-relaxed">
                      {renderInput({
                        value: exp.description,
                        onChange: (value) => updateField('workExperience', index, 'description', value),
                        multiline: true,
                        className: 'text-xs leading-relaxed',
                        ariaLabel: 'Job description',
                      })}
                    </div>
                  </article>
                ))}
              </div>
            </section>
          )}

          {/* Projects */}
          {hasContent(resumeData.projects) && (
            <section aria-labelledby="projects" className="break-inside-avoid">
              <h2 id="projects" className="text-sm font-bold text-gray-900 mb-3 pb-1.5 border-b-2 border-gray-800 uppercase tracking-wide">
                Projects
              </h2>
              <div className="space-y-4">
                {resumeData.projects.map((project, index) => (
                  <article key={index} className="break-inside-avoid">
                    <div className="font-bold text-gray-900 mb-1 text-sm">
                      {renderInput({
                        value: project.projectName,
                        onChange: (value) => updateField('projects', index, 'projectName', value),
                        ariaLabel: 'Project name',
                      })}
                    </div>
                    {project.link && (
                      <div className="text-xs text-blue-600 mb-1.5">
                        {renderInput({
                          value: project.link,
                          onChange: (value) => updateField('projects', index, 'link', value),
                          type: 'link',
                          ariaLabel: 'Project link',
                        })}
                      </div>
                    )}
                    <div className="text-xs text-gray-600 leading-relaxed">
                      {renderInput({
                        value: project.description,
                        onChange: (value) => updateField('projects', index, 'description', value),
                        multiline: true,
                        className: 'text-xs leading-relaxed',
                        ariaLabel: 'Project description',
                      })}
                    </div>
                  </article>
                ))}
              </div>
            </section>
          )}

          {/* Education */}
          {hasContent(resumeData.education) && (
            <section aria-labelledby="education" className="break-inside-avoid">
              <h2 id="education" className="text-sm font-bold text-gray-900 mb-3 pb-1.5 border-b-2 border-gray-800 uppercase tracking-wide">
                Education
              </h2>
              <div className="space-y-4">
                {resumeData.education.map((edu, index) => (
                  <article key={index} className="break-inside-avoid">
                    <div className="flex justify-between items-start mb-0.5">
                      <div className="font-bold text-gray-900 text-sm">
                        {renderInput({
                          value: edu.degree,
                          onChange: (value) => updateField('education', index, 'degree', value),
                          ariaLabel: 'Degree',
                        })}
                      </div>
                      <div className="text-xs text-gray-600 flex items-center gap-1 whitespace-nowrap ml-2">
                        {renderInput({
                          value: edu.startDate,
                          onChange: (value) => updateField('education', index, 'startDate', value),
                          className: 'text-xs w-16',
                          ariaLabel: 'Start date',
                        })}
                        {edu.startDate && <span>—</span>}
                        {renderInput({
                          value: edu.endDate,
                          onChange: (value) => updateField('education', index, 'endDate', value),
                          className: 'text-xs w-16',
                          ariaLabel: 'End date',
                        })}
                      </div>
                    </div>
                    <div className="text-xs text-gray-700 italic">
                      {renderInput({
                        value: edu.institution,
                        onChange: (value) => updateField('education', index, 'institution', value),
                        ariaLabel: 'Institution',
                      })}
                      {edu.location && (
                        <>
                          <span className="mx-1.5">•</span>
                          {renderInput({
                            value: edu.location,
                            onChange: (value) => updateField('education', index, 'location', value),
                            className: 'inline-block',
                            ariaLabel: 'Location',
                          })}
                        </>
                      )}
                    </div>
                    {edu.description && (
                      <div className="text-xs text-gray-600 mt-1.5">
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
        </div>
      </div>
    </div>
  );
}
