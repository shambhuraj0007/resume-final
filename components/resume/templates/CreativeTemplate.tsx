"use client";
import { useCallback } from 'react';
import { Input } from '@/components/ui/input';
import type { TemplateProps } from './types';
import { Textarea } from '@/components/ui/textarea';
import DOMPurify from 'isomorphic-dompurify';

export function CreativeTemplate({ resumeData, isEditing, updateField }: TemplateProps) {
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
              className={`text-purple-600 hover:underline ${className}`}
              aria-label={ariaLabel}
            >
              {value}
            </a>
          );
        }
        if (type === 'mail' || type === 'phone') {
          return (
            <a
              href={type === 'mail' ? `mailto:${value}` : `tel:${value}`}
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
    <div className="w-full mx-auto bg-white" style={{ fontFamily: 'Helvetica, Arial, sans-serif' }}>
      {/* Creative Header with Purple Accent */}
      <div className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white px-10 py-8 avoid-break">
        <div className="flex items-end gap-4">
          <div className="w-2 h-20 bg-white"></div>
          <div>
            <h1 className="text-5xl font-black tracking-tight mb-2">
              {renderInput({
                value: resumeData.personalDetails.fullName,
                onChange: (value) => updateField('personalDetails', null, 'fullName', value),
                className: 'text-white font-black bg-transparent border-white',
                ariaLabel: 'Full name',
              })}
            </h1>
            <p className="text-2xl font-light text-purple-100">
              {renderInput({
                value: resumeData.jobTitle,
                onChange: (value) => updateField('jobTitle', null, 'jobTitle', value),
                className: 'text-purple-100 bg-transparent border-purple-100',
                ariaLabel: 'Job title',
              })}
            </p>
          </div>
        </div>
        <div className="mt-6 flex flex-wrap gap-4 text-sm">
          {resumeData.personalDetails.email && (
            <span>
              {renderInput({
                value: resumeData.personalDetails.email,
                onChange: (value) => updateField('personalDetails', null, 'email', value),
                type: 'mail',
                className: 'text-white',
                ariaLabel: 'Email',
              })}
            </span>
          )}
          {resumeData.personalDetails.phone && (
            <span>
              {renderInput({
                value: resumeData.personalDetails.phone,
                onChange: (value) => updateField('personalDetails', null, 'phone', value),
                type: 'phone',
                className: 'text-white',
                ariaLabel: 'Phone',
              })}
            </span>
          )}
          {resumeData.personalDetails.location && (
            <span>
              {renderInput({
                value: resumeData.personalDetails.location,
                onChange: (value) => updateField('personalDetails', null, 'location', value),
                className: 'text-white',
                ariaLabel: 'Location',
              })}
            </span>
          )}
          {resumeData.personalDetails.linkedin && (
            <span>
              {renderInput({
                value: resumeData.personalDetails.linkedin,
                onChange: (value) => updateField('personalDetails', null, 'linkedin', value),
                type: 'link',
                className: 'text-white underline',
                ariaLabel: 'LinkedIn',
              })}
            </span>
          )}
          {resumeData.personalDetails.github && (
            <span>
              {renderInput({
                value: resumeData.personalDetails.github,
                onChange: (value) => updateField('personalDetails', null, 'github', value),
                type: 'link',
                className: 'text-white underline',
                ariaLabel: 'GitHub',
              })}
            </span>
          )}
        </div>
      </div>

      <div className="px-10 py-8">
        {/* Professional Summary */}
        {hasContent(resumeData.objective) && (
          <section aria-labelledby="summary" className="mb-8 break-inside-avoid">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-1 h-8 bg-purple-600"></div>
              <h2 id="summary" className="text-2xl font-bold text-gray-900">
                About Me
              </h2>
            </div>
            {renderInput({
              value: resumeData.objective,
              onChange: (value) => updateField('objective', null, 'objective', value),
              multiline: true,
              className: 'text-gray-700 leading-relaxed pl-4',
              ariaLabel: 'Professional summary',
            })}
          </section>
        )}

        {/* Work Experience */}
        {hasContent(resumeData.workExperience) && (
          <section aria-labelledby="experience" className="mb-8">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-1 h-8 bg-purple-600"></div>
              <h2 id="experience" className="text-2xl font-bold text-gray-900">
                Experience
              </h2>
            </div>
            <div className="space-y-6 pl-4">
              {resumeData.workExperience.map((exp, index) => (
                <article key={index} className="work-item relative pl-6 avoid-break">
                  <div className="absolute left-0 top-2 w-3 h-3 bg-purple-600 rounded-full"></div>
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h3 className="text-xl font-bold text-gray-900">
                        {renderInput({
                          value: exp.jobTitle,
                          onChange: (value) => updateField('workExperience', index, 'jobTitle', value),
                          ariaLabel: 'Job title',
                        })}
                      </h3>
                      <p className="text-purple-600 font-semibold">
                        {renderInput({
                          value: exp.companyName,
                          onChange: (value) => updateField('workExperience', index, 'companyName', value),
                          ariaLabel: 'Company name',
                        })}
                        {exp.location && (
                          <>
                            <span className="mx-2 text-gray-400">|</span>
                            {renderInput({
                              value: exp.location,
                              onChange: (value) => updateField('workExperience', index, 'location', value),
                              className: 'inline-block text-gray-600',
                              ariaLabel: 'Location',
                            })}
                          </>
                        )}
                      </p>
                    </div>
                    <div className="text-sm text-gray-500 flex items-center gap-2">
                      {renderInput({
                        value: exp.startDate,
                        onChange: (value) => updateField('workExperience', index, 'startDate', value),
                        className: 'text-xs',
                        ariaLabel: 'Start date',
                      })}
                      <span>-</span>
                      {renderInput({
                        value: exp.endDate,
                        onChange: (value) => updateField('workExperience', index, 'endDate', value),
                        className: 'text-xs',
                        ariaLabel: 'End date',
                      })}
                    </div>
                  </div>
                  {renderInput({
                    value: exp.description,
                    onChange: (value) => updateField('workExperience', index, 'description', value),
                    multiline: true,
                    className: 'text-gray-700 leading-relaxed',
                    ariaLabel: 'Job description',
                  })}
                </article>
              ))}
            </div>
          </section>
        )}

        {/* Projects */}
        {hasContent(resumeData.projects) && (
          <section aria-labelledby="projects" className="mb-8">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-1 h-8 bg-purple-600"></div>
              <h2 id="projects" className="text-2xl font-bold text-gray-900">
                Projects
              </h2>
            </div>
            <div className="space-y-6 pl-4">
              {resumeData.projects.map((project, index) => (
                <article key={index} className="project-item avoid-break">
                  <h3 className="text-xl font-bold text-gray-900 mb-1">
                    {renderInput({
                      value: project.projectName,
                      onChange: (value) => updateField('projects', index, 'projectName', value),
                      ariaLabel: 'Project name',
                    })}
                  </h3>
                  {project.link && (
                    <div className="text-sm mb-2">
                      {renderInput({
                        value: project.link,
                        onChange: (value) => updateField('projects', index, 'link', value),
                        type: 'link',
                        ariaLabel: 'Project link',
                      })}
                    </div>
                  )}
                  {renderInput({
                    value: project.description,
                    onChange: (value) => updateField('projects', index, 'description', value),
                    multiline: true,
                    className: 'text-gray-700 leading-relaxed',
                    ariaLabel: 'Project description',
                  })}
                </article>
              ))}
            </div>
          </section>
        )}

        {/* Education */}
        {hasContent(resumeData.education) && (
          <section aria-labelledby="education" className="mb-8">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-1 h-8 bg-purple-600"></div>
              <h2 id="education" className="text-2xl font-bold text-gray-900">
                Education
              </h2>
            </div>
            <div className="space-y-4 pl-4">
              {resumeData.education.map((edu, index) => (
                <article key={index} className="education-item avoid-break">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="text-lg font-bold text-gray-900">
                        {renderInput({
                          value: edu.degree,
                          onChange: (value) => updateField('education', index, 'degree', value),
                          ariaLabel: 'Degree',
                        })}
                      </h3>
                      <p className="text-purple-600 font-semibold">
                        {renderInput({
                          value: edu.institution,
                          onChange: (value) => updateField('education', index, 'institution', value),
                          ariaLabel: 'Institution',
                        })}
                        {edu.location && (
                          <>
                            <span className="mx-2 text-gray-400">|</span>
                            {renderInput({
                              value: edu.location,
                              onChange: (value) => updateField('education', index, 'location', value),
                              className: 'inline-block text-gray-600',
                              ariaLabel: 'Location',
                            })}
                          </>
                        )}
                      </p>
                    </div>
                    <div className="text-sm text-gray-500 flex items-center gap-2">
                      {renderInput({
                        value: edu.startDate,
                        onChange: (value) => updateField('education', index, 'startDate', value),
                        className: 'text-xs',
                        ariaLabel: 'Start date',
                      })}
                      {edu.startDate && <span>-</span>}
                      {renderInput({
                        value: edu.endDate,
                        onChange: (value) => updateField('education', index, 'endDate', value),
                        className: 'text-xs',
                        ariaLabel: 'End date',
                      })}
                    </div>
                  </div>
                  {edu.description && (
                    <div className="text-gray-700 mt-2">
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

        {/* Skills & Other Sections */}
        <div className="grid grid-cols-2 gap-8">
          {/* Skills */}
          {hasContent(resumeData.skills) && (
            <section aria-labelledby="skills" className="break-inside-avoid">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-1 h-8 bg-purple-600"></div>
                <h2 id="skills" className="text-2xl font-bold text-gray-900">
                  Skills
                </h2>
              </div>
              <div className="space-y-3 pl-4">
                {resumeData.skills.map((skill, index) => (
                  <div key={index}>
                    {skill.skillType === 'individual' ? (
                      <div className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full inline-block text-sm font-semibold">
                        {renderInput({
                          value: skill.skill,
                          onChange: (value) => updateField('skills', index, 'skill', value),
                          className: 'bg-transparent',
                          ariaLabel: 'Skill',
                        })}
                      </div>
                    ) : (
                      <>
                        <div className="font-bold text-gray-900 mb-1">
                          {renderInput({
                            value: skill.category,
                            onChange: (value) => updateField('skills', index, 'category', value),
                            ariaLabel: 'Skill category',
                          })}
                        </div>
                        {renderInput({
                          value: skill.skills,
                          onChange: (value) => updateField('skills', index, 'skills', value),
                          className: 'text-gray-700 text-sm',
                          ariaLabel: 'Skills',
                        })}
                      </>
                    )}
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Certifications */}
          {hasContent(resumeData.certifications) && (
            <section aria-labelledby="certifications" className="break-inside-avoid">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-1 h-8 bg-purple-600"></div>
                <h2 id="certifications" className="text-2xl font-bold text-gray-900">
                  Certifications
                </h2>
              </div>
              <div className="space-y-3 pl-4">
                {resumeData.certifications.map((cert, index) => (
                  <article key={index}>
                    <div className="font-bold text-gray-900">
                      {renderInput({
                        value: cert.certificationName,
                        onChange: (value) => updateField('certifications', index, 'certificationName', value),
                        ariaLabel: 'Certification name',
                      })}
                    </div>
                    <div className="text-sm text-gray-600">
                      {renderInput({
                        value: cert.issuingOrganization,
                        onChange: (value) => updateField('certifications', index, 'issuingOrganization', value),
                        ariaLabel: 'Issuing organization',
                      })}
                    </div>
                    <div className="text-xs text-gray-500">
                      {renderInput({
                        value: cert.issueDate,
                        onChange: (value) => updateField('certifications', index, 'issueDate', value),
                        ariaLabel: 'Issue date',
                      })}
                    </div>
                  </article>
                ))}
              </div>
            </section>
          )}
        </div>

        {/* Languages */}
        {hasContent(resumeData.languages) && (
          <section aria-labelledby="languages" className="mt-8 break-inside-avoid">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-1 h-8 bg-purple-600"></div>
              <h2 id="languages" className="text-2xl font-bold text-gray-900">
                Languages
              </h2>
            </div>
            <div className="flex flex-wrap gap-3 pl-4">
              {resumeData.languages.map((language, index) => (
                <div key={index} className="px-4 py-2 bg-gray-100 rounded-lg">
                  <span className="font-bold text-gray-900">
                    {renderInput({
                      value: language.language,
                      onChange: (value) => updateField('languages', index, 'language', value),
                      className: 'inline-block',
                      ariaLabel: 'Language',
                    })}
                  </span>
                  <span className="mx-2">•</span>
                  <span className="text-gray-600">
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
    </div>
  );
}
