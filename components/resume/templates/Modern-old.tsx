import { Input } from '@/components/ui/input';
import type { TemplateProps } from './types';
import { Textarea } from '@/components/ui/textarea';
import { Inter } from 'next/font/google';

const inter = Inter({
  subsets: ['latin'],
  weight: ['400', '600', '700'],
});

export function OldModernTemplate({ resumeData, isEditing, updateField }: TemplateProps) {
  const renderMarkdown = (text: string): string => {
    if (!text) return '';
    
    return text
      .split('\n')
      .map((line, index) => {
        // Convert bold text
        line = line.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
        
        // Convert bullet points
        if (line.trim().startsWith('- ') && index === 0) {
          line = `• ${line.substring(2)}`;
        } else if(line.trim().startsWith('- ') && index > 0){
          line = `<br/>• ${line.substring(2)}`;
        }
        return line;
      })
      .join('\n');
  };
  
  const renderInput = ({ 
    value, 
    onChange, 
    multiline = false,
    className = "",
    link = false,
    ariaLabel = ""
  }: { 
    value: string, 
    onChange: (value: string) => void,
    multiline?: boolean,
    className?: string,
    link?: boolean,
    ariaLabel?: string
  }) => {
    if (!isEditing) {
      if (link) {
        return (
          <a 
            href={value} 
            target="_blank" 
            rel="noopener noreferrer" 
            className={`hover:underline ${className}`}
            aria-label={ariaLabel}
          >
            {value}
          </a>
        );
      }
      
      return (
        <span 
          className={className}
          dangerouslySetInnerHTML={{ __html: renderMarkdown(value) }}
        />
      );
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
  };

  const hasContent = (section: unknown): boolean => {
    if (!section) return false;
    if (Array.isArray(section)) return section.length > 0;
    if (typeof section === 'object' && section !== null) {
      return Object.values(section).some(value => 
        typeof value === 'string' ? value.trim() !== '' : Boolean(value)
      );
    }
    return typeof section === 'string' ? section.trim() !== '' : Boolean(section);
  };

  return (
    <div className={`w-full max-w-[8.5in] mx-auto bg-white p-12 ${inter.className}`} style={{ 
      fontSize: '9pt',
      lineHeight: '1.15',
    }}>
      {/* Personal Details Section - ATS optimized header */}
      <div className="mb-6 border-b-2 border-gray-800 pb-4">
        <h1 className="text-[20pt] font-bold text-gray-900 mb-2 tracking-tight">
          {renderInput({
            value: resumeData.personalDetails.fullName,
            onChange: (value) => updateField('personalDetails', null, 'fullName', value),
            className: "text-gray-900 uppercase",
            ariaLabel: "Full name"
          })}
        </h1>
        <div className="text-[16pt] font-semibold text-gray-700 mb-3">
          {renderInput({
            value: resumeData.jobTitle,
            onChange: (value) => updateField('jobTitle', null, 'jobTitle', value),
            className: "text-gray-700",
            ariaLabel: "Job Title"
          })}
        </div>
        
        {/* Contact Information - Single line for ATS */}
        <div className="text-[11pt] text-gray-700 flex flex-wrap gap-x-4 gap-y-1">
          {resumeData.personalDetails.email && (
            <div className="flex items-center gap-1">
              <span className="font-semibold">Email:</span>
              {renderInput({
                value: resumeData.personalDetails.email,
                onChange: (value) => updateField('personalDetails', null, 'email', value),
                className: "inline-block",
                ariaLabel: "Email address"
              })}
            </div>
          )}
          {resumeData.personalDetails.phone && (
            <div className="flex items-center gap-1">
              <span className="font-semibold">Phone:</span>
              {renderInput({
                value: resumeData.personalDetails.phone,
                onChange: (value) => updateField('personalDetails', null, 'phone', value),
                className: "inline-block",
                ariaLabel: "Phone number"
              })}
            </div>
          )}
          {resumeData.personalDetails.location && (
            <div className="flex items-center gap-1">
              <span className="font-semibold">Location:</span>
              {renderInput({
                value: resumeData.personalDetails.location,
                onChange: (value) => updateField('personalDetails', null, 'location', value),
                className: "inline-block",
                ariaLabel: "Location"
              })}
            </div>
          )}
          {resumeData.personalDetails.linkedin && (
            <div className="flex items-center gap-1">
              <span className="font-semibold">LinkedIn:</span>
              {renderInput({
                value: resumeData.personalDetails.linkedin,
                onChange: (value) => updateField('personalDetails', null, 'linkedin', value),
                className: "text-blue-600 inline-block",
                link: true,
                ariaLabel: "LinkedIn profile"
              })}
            </div>
          )}
          {resumeData.personalDetails.github && (
            <div className="flex items-center gap-1">
              <span className="font-semibold">GitHub:</span>
              {renderInput({
                value: resumeData.personalDetails.github,
                onChange: (value) => updateField('personalDetails', null, 'github', value),
                className: "text-blue-600 inline-block",
                link: true,
                ariaLabel: "GitHub profile"
              })}
            </div>
          )}
        </div>
      </div>

      {/* Professional Summary - Standard ATS heading */}
      {hasContent(resumeData.objective) && (
        <div className="mb-5">
          <h2 className="text-[14pt] font-bold text-gray-900 mb-2 uppercase border-b border-gray-400 pb-1">
            Professional Summary
          </h2>
          <div className="text-[11pt] leading-relaxed">
            {renderInput({
              value: resumeData.objective,
              onChange: (value) => updateField('objective', null, 'objective', value),
              multiline: true,
              className: "text-gray-800 text-justify",
              ariaLabel: "Professional summary"
            })}
          </div>
        </div>
      )}

      {/* Work Experience Section - Standard ATS heading */}
      {hasContent(resumeData.workExperience) && (
        <div className="mb-5">
          <h2 className="text-[14pt] font-bold text-gray-900 mb-3 uppercase border-b border-gray-400 pb-1">
            Work Experience
          </h2>
          {resumeData.workExperience.map((experience, index) => (
            <div 
              key={index} 
              className={`mb-4 ${index !== resumeData.workExperience.length - 1 ? "pb-2" : ""}`}
            >
              <div className="flex justify-between items-baseline mb-1">
                <div className="font-bold text-[12pt] text-gray-900">
                  {renderInput({
                    value: experience.jobTitle,
                    onChange: (value) => updateField('workExperience', index, 'jobTitle', value),
                    className: "font-bold",
                    ariaLabel: "Job title"
                  })}
                </div>
                <div className="text-[11pt] text-gray-700 font-semibold whitespace-nowrap ml-4">
                  {renderInput({
                    value: experience.startDate,
                    onChange: (value) => updateField('workExperience', index, 'startDate', value),
                    className: "inline-block",
                    ariaLabel: "Start date"
                  })}
                  <span className="mx-1">–</span>
                  {renderInput({
                    value: experience.endDate,
                    onChange: (value) => updateField('workExperience', index, 'endDate', value),
                    className: "inline-block",
                    ariaLabel: "End date"
                  })}
                </div>
              </div>
              
              <div className="text-[11pt] font-semibold text-gray-700 mb-1">
                {renderInput({
                  value: experience.companyName,
                  onChange: (value) => updateField('workExperience', index, 'companyName', value),
                  className: "inline-block",
                  ariaLabel: "Company name"
                })}
                {experience.location && (
                  <>
                    <span className="mx-2">|</span>
                    {renderInput({
                      value: experience.location,
                      onChange: (value) => updateField('workExperience', index, 'location', value),
                      className: "inline-block font-normal",
                      ariaLabel: "Location"
                    })}
                  </>
                )}
              </div>
              
              <div className="text-[11pt] leading-relaxed ml-5">
                {renderInput({
                  value: experience.description,
                  onChange: (value) => updateField('workExperience', index, 'description', value),
                  multiline: true,
                  className: "text-gray-800 text-justify",
                  ariaLabel: "Job description"
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Projects Section - Standard ATS heading */}
      {hasContent(resumeData.projects) && (
        <div className="mb-5">
          <h2 className="text-[14pt] font-bold text-gray-900 mb-3 uppercase border-b border-gray-400 pb-1">
            Projects
          </h2>
          {resumeData.projects.map((project, index) => (
            <div 
              key={index} 
              className={`mb-4 ${index !== resumeData.projects.length - 1 ? "pb-2" : ""}`}
            >
              <div className="flex justify-between items-baseline mb-1">
                <div className="font-bold text-[12pt] text-gray-900">
                  {renderInput({
                    value: project.projectName,
                    onChange: (value) => updateField('projects', index, 'projectName', value),
                    className: "font-bold",
                    ariaLabel: "Project name"
                  })}
                </div>
                {project.link && (
                  <div className="text-[10pt] text-blue-600 ml-4">
                    {renderInput({
                      value: project.link,
                      onChange: (value) => updateField('projects', index, 'link', value),
                      className: "text-blue-600",
                      link: true,
                      ariaLabel: "Project link"
                    })}
                  </div>
                )}
              </div>
              
              <div className="text-[11pt] leading-relaxed ml-5">
                {renderInput({
                  value: project.description,
                  onChange: (value) => updateField('projects', index, 'description', value),
                  multiline: true,
                  className: "text-gray-800 text-justify",
                  ariaLabel: "Project description"
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Education Section - Standard ATS heading */}
      {hasContent(resumeData.education) && (
        <div className="mb-5">
          <h2 className="text-[14pt] font-bold text-gray-900 mb-3 uppercase border-b border-gray-400 pb-1">
            Education
          </h2>
          {resumeData.education.map((edu, index) => (
            <div key={index} className="mb-3">
              <div className="flex justify-between items-baseline mb-1">
                <div className="font-bold text-[12pt] text-gray-900">
                  {renderInput({
                    value: edu.degree,
                    onChange: (value) => updateField('education', index, 'degree', value),
                    className: "font-bold",
                    ariaLabel: "Degree"
                  })}
                </div>
                <div className="text-[11pt] text-gray-700 font-semibold whitespace-nowrap ml-4">
                  {renderInput({
                    value: edu.startDate,
                    onChange: (value) => updateField('education', index, 'startDate', value),
                    className: "inline-block",
                    ariaLabel: "Start date"
                  })}
                  {edu.startDate && <span className="mx-1">–</span>}
                  {renderInput({
                    value: edu.endDate,
                    onChange: (value) => updateField('education', index, 'endDate', value),
                    className: "inline-block",
                    ariaLabel: "End date"
                  })}
                </div>
              </div>
              
              <div className="text-[11pt] font-semibold text-gray-700">
                {renderInput({
                  value: edu.institution,
                  onChange: (value) => updateField('education', index, 'institution', value),
                  className: "inline-block",
                  ariaLabel: "Institution"
                })}
                {edu.location && (
                  <>
                    <span className="mx-2">|</span>
                    {renderInput({
                      value: edu.location,
                      onChange: (value) => updateField('education', index, 'location', value),
                      className: "inline-block font-normal",
                      ariaLabel: "Location"
                    })}
                  </>
                )}
              </div>
              
              {edu.description && (
                <div className="text-[11pt] text-gray-700 mt-1">
                  {renderInput({
                    value: edu.description,
                    onChange: (value) => updateField('education', index, 'description', value),
                    className: "inline-block",
                    ariaLabel: "Education description"
                  })}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Skills Section - Standard ATS heading */}
      {hasContent(resumeData.skills) && (
        <div className="mb-5">
          <h2 className="text-[14pt] font-bold text-gray-900 mb-3 uppercase border-b border-gray-400 pb-1">
            Skills
          </h2>
          <div className="space-y-2">
            {resumeData.skills.map((skill, index) => (
              <div key={index} className="flex items-start text-[11pt]">
                {skill.skillType === 'individual' ? (
                  <div className="text-gray-800">
                    {renderInput({
                      value: skill.skill,
                      onChange: (value) => updateField('skills', index, 'skill', value),
                      className: "font-semibold",
                      ariaLabel: "Skill"
                    })}
                  </div>
                ) : (
                  <>
                    <div className="font-bold text-gray-900 min-w-fit">
                      {renderInput({
                        value: skill.category,
                        onChange: (value) => updateField('skills', index, 'category', value),
                        className: "font-bold",
                        ariaLabel: "Skill category"
                      })}
                      <span className="mx-1">:</span>
                    </div>
                    <div className="text-gray-800 flex-1">
                      {renderInput({
                        value: skill.skills,
                        onChange: (value) => updateField('skills', index, 'skills', value),
                        className: "",
                        ariaLabel: "Skills"
                      })}
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Certifications Section - Standard ATS heading */}
      {hasContent(resumeData.certifications) && (
        <div className="mb-5">
          <h2 className="text-[14pt] font-bold text-gray-900 mb-3 uppercase border-b border-gray-400 pb-1">
            Certifications
          </h2>
          {resumeData.certifications.map((cert, index) => (
            <div key={index} className="mb-3">
              <div className="flex justify-between items-baseline">
                <div className="font-bold text-[11pt] text-gray-900">
                  {renderInput({
                    value: cert.certificationName,
                    onChange: (value) => updateField('certifications', index, 'certificationName', value),
                    className: "font-bold",
                    ariaLabel: "Certification name"
                  })}
                </div>
                <div className="text-[11pt] text-gray-700 font-semibold whitespace-nowrap ml-4">
                  {renderInput({
                    value: cert.issueDate,
                    onChange: (value) => updateField('certifications', index, 'issueDate', value),
                    className: "",
                    ariaLabel: "Issue date"
                  })}
                </div>
              </div>
              <div className="text-[11pt] text-gray-700">
                {renderInput({
                  value: cert.issuingOrganization,
                  onChange: (value) => updateField('certifications', index, 'issuingOrganization', value),
                  className: "",
                  ariaLabel: "Issuing organization"
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Languages Section - Standard ATS heading */}
      {hasContent(resumeData.languages) && (
        <div className="mb-5">
          <h2 className="text-[14pt] font-bold text-gray-900 mb-3 uppercase border-b border-gray-400 pb-1">
            Languages
          </h2>
          <div className="grid grid-cols-2 gap-2">
            {resumeData.languages.map((language, index) => (
              <div key={index} className="text-[11pt] flex items-center gap-2">
                <span className="font-bold text-gray-900">
                  {renderInput({
                    value: language.language,
                    onChange: (value) => updateField('languages', index, 'language', value),
                    className: "font-bold inline-block",
                    ariaLabel: "Language name"
                  })}:
                </span>
                <span className="text-gray-800">
                  {renderInput({
                    value: language.proficiency,
                    onChange: (value) => updateField('languages', index, 'proficiency', value),
                    className: "inline-block",
                    ariaLabel: "Language proficiency"
                  })}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
