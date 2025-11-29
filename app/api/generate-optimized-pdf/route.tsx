import { NextRequest, NextResponse } from "next/server";
import React from 'react';
import { Document, Page, StyleSheet, renderToStream, View, Text, Font } from '@react-pdf/renderer';

interface PersonalDetails {
  fullName: string;
  email: string;
  phone: string;
  linkedin: string;
  github: string;
  website: string;
  location: string;
}

interface WorkExperience {
  jobTitle: string;
  companyName: string;
  location: string;
  startDate: string;
  endDate: string;
  description: string;
}

interface Education {
  degree: string;
  institution: string;
  location: string;
  startDate: string;
  endDate: string;
  description: string;
}

interface Skill {
  skillType?: "group" | "individual";
  category: string;
  skills: string;
  skill: string;
}

interface Project {
  projectName: string;
  description: string;
  link: string;
}

interface Language {
  language: string;
  proficiency: string;
}

interface Certification {
  certificationName: string;
  issuingOrganization: string;
  issueDate: string;
}

interface ResumeData {
  personalDetails: PersonalDetails;
  objective: string;
  jobTitle: string;
  workExperience: WorkExperience[];
  education: Education[];
  skills: Skill[];
  projects: Project[];
  languages: Language[];
  certifications: Certification[];
}

Font.register({
  family: 'Open Sans',
  fonts: [
    { src: 'https://cdn.jsdelivr.net/npm/open-sans-all@0.1.3/fonts/open-sans-regular.ttf' },
    { src: 'https://cdn.jsdelivr.net/npm/open-sans-all@0.1.3/fonts/open-sans-600.ttf', fontWeight: 600 }
  ]
});

const styles = StyleSheet.create({
  page: {
    padding: 30,
    fontSize: 11,
  },
  section: {
    marginBottom: 10,
  },
  bold: {
    fontFamily: 'Helvetica-Bold'
  },
  header: {
    marginBottom: 20,
    textAlign: 'center',
  },
  name: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  jobTitle: {
    fontSize: 12,
    color: '#666',
    marginBottom: 10,
  },
  contactInfo: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 15,
    fontSize: 10,
    color: '#666',
  },
  sectionTitle: {
    fontSize: 14,
    fontFamily: 'Helvetica-Bold',
    marginBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#000',
    paddingBottom: 2,
  },
  experienceItem: {
    paddingBottom: 8,
  },
  experienceLastItem: {
    marginBottom: 12,
    borderBottom: 1,
    borderBottomStyle: "dashed",
    borderBottomWidth: 1,
    borderBottomColor: "#d1d5db",
    paddingBottom: 8
  },
  experienceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 3,
  },
  companyName: {
    fontFamily: 'Helvetica-Bold'
  },
  dates: {
    color: '#666',
  },
  description: {
    flexDirection: "column",
    fontSize: 10,
    color: '#444',
    lineHeight: 1.5,
    paddingLeft: "12px",
    textAlign: "justify"
  },
  p: {
    flexDirection: "column",
    fontSize: 10,
    color: '#444',
    lineHeight: 1.5,
  },
  skills: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 5,
  },
  skillCategory: {
    fontFamily: 'Helvetica-Bold',
    marginRight: 5,
  },
});

const processBoldText = (text: string) => {
  const parts = text.split(/(\*\*.*?\*\*)/g);
  
  return parts.map((part, index) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      const boldText = part.slice(2, -2);
      return <Text key={index} style={styles.bold}>{boldText}</Text>;
    }
    return <Text key={index}>{part}</Text>;
  });
};

const Br = () => "\n";

const renderPDFContent = (content: string | undefined | null) => {
  if (!content) return null;

  const lines = content.split('\n');
  
  return lines.map((line, lineIndex) => {
    const trimmedLine = line.trim();
    
    if (trimmedLine.startsWith('- ')) {
      return (
        <View key={lineIndex} style={{ flexDirection: 'row', marginBottom: 2 }}>
          <Text style={{ width: 10 }}>{lineIndex !== 0 && <Br/>}• </Text>
          <Text style={{ flex: 1 }}>
            {processBoldText(trimmedLine.substring(2))}
          </Text>
        </View>
      );
    }
    
    return trimmedLine ? (
      <Text key={lineIndex} style={{ marginBottom: 2 }}>
        {processBoldText(trimmedLine)}
      </Text>
    ) : (
      <Text key={lineIndex} style={{ marginBottom: 4 }}>{' '}</Text>
    );
  });
};

const OptimizedResumeTemplate = ({ resumeData }: { resumeData: ResumeData }) => (
  <Document>
    <Page size="A4" style={styles.page}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.name}>{resumeData.personalDetails.fullName}</Text>
        <Text style={styles.jobTitle}>{resumeData.jobTitle}</Text>
        <View style={styles.contactInfo}>
          <Text>{resumeData.personalDetails.email}</Text>
          <Text>{resumeData.personalDetails.phone}</Text>
          <Text>{resumeData.personalDetails.location}</Text>
        </View>
        {(resumeData.personalDetails.linkedin || resumeData.personalDetails.github) && (
          <View style={[styles.contactInfo, { marginTop: 5 }]}>
            {resumeData.personalDetails.linkedin && (
              <Text style={{ color: '#0077B5' }}>{resumeData.personalDetails.linkedin}</Text>
            )}
            {resumeData.personalDetails.github && (
              <Text style={{ color: '#0077B5' }}>{resumeData.personalDetails.github}</Text>
            )}
          </View>
        )}
      </View>

      {/* Professional Summary */}
      {resumeData.objective && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Professional Summary</Text>
          <Text style={styles.p}>{renderPDFContent(resumeData.objective)}</Text>
        </View>
      )}

      {/* Work Experience */}
      {resumeData.workExperience.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Work Experience</Text>
          {resumeData.workExperience.map((exp, index) => (
            <View key={index} style={index === (resumeData.workExperience.length - 1) ? styles.experienceItem : styles.experienceLastItem} wrap={false}>
              <View style={styles.experienceHeader}>
                <Text style={styles.companyName}>{exp.jobTitle}</Text>
                <Text style={styles.dates}>{`${exp.startDate} - ${exp.endDate}`}</Text>
              </View>
              <Text>{exp.companyName}</Text>
              <Text style={styles.description}>{renderPDFContent(exp.description)}</Text>
            </View>
          ))}
        </View>
      )}

      {/* Projects Section */}
      {resumeData.projects.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Projects</Text>
          {resumeData.projects.map((project, index) => ( 
            <View key={index} style={index === (resumeData.projects.length - 1) ? styles.experienceItem : styles.experienceLastItem} wrap={false}>
              <View style={styles.experienceHeader}>
                <Text style={styles.companyName}>{project.projectName}</Text>
              </View>
              {project.link && (
                <Text style={{ color: '#0077B5', fontSize: 10, marginBottom: 3 }}>
                  {project.link}
                </Text>
              )}
              <Text style={styles.description}>{renderPDFContent(project.description)}</Text>
            </View>
          ))}
        </View>
      )}

      {/* Education Section */}
      {resumeData.education.length > 0 && (
        <View style={styles.section} wrap={false}>
          <Text style={styles.sectionTitle}>Education</Text>
          {resumeData.education.map((edu, index) => (
            <View key={index} style={styles.experienceItem} wrap={false}>
              <View style={styles.experienceHeader}>
                <Text style={styles.companyName}>{edu.degree}</Text>
                <Text style={styles.dates}>{`${edu.startDate} - ${edu.endDate}`}</Text>
              </View>
              <Text>{edu.institution}</Text>
              {edu.description && (
                <Text style={styles.p}>{edu.description}</Text>
              )}
            </View>
          ))}
        </View>
      )}

      {/* Skills Section */}
      {resumeData.skills.length > 0 && (
        <View style={styles.section} wrap={false}>
          <Text style={styles.sectionTitle}>Technical Skills</Text>
          <View style={{ flexDirection: 'column', gap: 5 }}>
            {resumeData.skills.map((skill, index) => (
              <View key={index} style={{ flexDirection: 'row', gap: 5 }}>
                {skill.skillType === 'individual' ? (
                  <Text style={[styles.skillCategory, { flex: 1 }]}>{skill.skill}</Text>
                ) : (
                  <>
                    <Text style={styles.skillCategory}>{skill.category}:</Text>
                    <Text style={[styles.p, { flex: 1 }]}>{skill.skills}</Text>
                  </>
                )}
              </View>
            ))}
          </View>
        </View>
      )}

      {/* Certifications Section */}
      {resumeData.certifications.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Certifications</Text>
          {resumeData.certifications.map((cert, index) => (
            <View key={index} style={styles.experienceItem}>
              <View style={styles.experienceHeader}>
                <Text style={styles.companyName}>{cert.certificationName}</Text>
                <Text style={styles.dates}>{cert.issueDate}</Text>
              </View>
              <Text style={styles.p}>{cert.issuingOrganization}</Text>
            </View>
          ))}
        </View>
      )}

      {/* Languages Section */}
      {resumeData.languages.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Languages</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
            {resumeData.languages.map((lang, index) => (
              <View key={index} style={{ flexDirection: 'row', width: '45%', gap: 5 }}>
                <Text style={styles.skillCategory}>{lang.language}:</Text>
                <Text style={styles.p}>{lang.proficiency}</Text>
              </View>
            ))}
          </View>
        </View>
      )}
    </Page>
  </Document>
);

export async function POST(req: NextRequest) {
  try {
    const payload = await req.json();
    const resumeData: ResumeData = payload;
    const templateName: string | undefined = payload.template;

    if (!resumeData || !resumeData.personalDetails) {
      return NextResponse.json(
        { error: "Invalid resume data" },
        { status: 400 }
      );
    }

    // Template registry
    const templates = {
      minimal: ({ resumeData }: { resumeData: ResumeData }) => (
        <Document>
          <Page size="A4" style={styles.page}>
            {/* Reuse styles-based minimal look */}
            <View style={styles.header}>
              <Text style={styles.name}>{resumeData.personalDetails.fullName}</Text>
              <Text style={styles.jobTitle}>{resumeData.jobTitle}</Text>
              <View style={styles.contactInfo}>
                <Text>{resumeData.personalDetails.email}</Text>
                <Text>{resumeData.personalDetails.phone}</Text>
                <Text>{resumeData.personalDetails.location}</Text>
              </View>
            </View>
            {resumeData.objective && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Professional Summary</Text>
                <Text style={styles.p}>{renderPDFContent(resumeData.objective)}</Text>
              </View>
            )}
            {resumeData.workExperience.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Work Experience</Text>
                {resumeData.workExperience.map((exp, index) => (
                  <View key={index} style={index === (resumeData.workExperience.length - 1) ? styles.experienceItem : styles.experienceLastItem} wrap={false}>
                    <View style={styles.experienceHeader}>
                      <Text style={styles.companyName}>{exp.jobTitle}</Text>
                      <Text style={styles.dates}>{`${exp.startDate} - ${exp.endDate}`}</Text>
                    </View>
                    <Text>{exp.companyName}</Text>
                    <Text style={styles.description}>{renderPDFContent(exp.description)}</Text>
                  </View>
                ))}
              </View>
            )}
            {resumeData.projects.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Projects</Text>
                {resumeData.projects.map((project, index) => (
                  <View key={index} style={index === (resumeData.projects.length - 1) ? styles.experienceItem : styles.experienceLastItem} wrap={false}>
                    <View style={styles.experienceHeader}>
                      <Text style={styles.companyName}>{project.projectName}</Text>
                    </View>
                    {project.link && (
                      <Text style={{ color: '#0077B5', fontSize: 10, marginBottom: 3 }}>
                        {project.link}
                      </Text>
                    )}
                    <Text style={styles.description}>{renderPDFContent(project.description)}</Text>
                  </View>
                ))}
              </View>
            )}
            {resumeData.education.length > 0 && (
              <View style={styles.section} wrap={false}>
                <Text style={styles.sectionTitle}>Education</Text>
                {resumeData.education.map((edu, index) => (
                  <View key={index} style={styles.experienceItem} wrap={false}>
                    <View style={styles.experienceHeader}>
                      <Text style={styles.companyName}>{edu.degree}</Text>
                      <Text style={styles.dates}>{`${edu.startDate} - ${edu.endDate}`}</Text>
                    </View>
                    <Text>{edu.institution}</Text>
                    {edu.description && (
                      <Text style={styles.p}>{edu.description}</Text>
                    )}
                  </View>
                ))}
              </View>
            )}
            {resumeData.skills.length > 0 && (
              <View style={styles.section} wrap={false}>
                <Text style={styles.sectionTitle}>Technical Skills</Text>
                <View style={{ flexDirection: 'column', gap: 5 }}>
                  {resumeData.skills.map((skill, index) => (
                    <View key={index} style={{ flexDirection: 'row', gap: 5 }}>
                      {skill.skillType === 'individual' ? (
                        <Text style={[styles.skillCategory, { flex: 1 }]}>{skill.skill}</Text>
                      ) : (
                        <>
                          <Text style={styles.skillCategory}>{skill.category}:</Text>
                          <Text style={[styles.p, { flex: 1 }]}>{skill.skills}</Text>
                        </>
                      )}
                    </View>
                  ))}
                </View>
              </View>
            )}
          </Page>
        </Document>
      ),
      modern: OptimizedResumeTemplate,
      professional: OptimizedResumeTemplate,
    } as const;

    const templateAlias: Record<string, keyof typeof templates> = {
      creative: 'modern',
      modern_old: 'modern',
      latex: 'modern',
    };

    const normalized = (templateName && (templateAlias[templateName] || templateName)) || 'modern';
    const TemplateComponent = templates[normalized as keyof typeof templates] || templates.modern;

    const stream = await renderToStream(<TemplateComponent resumeData={resumeData} />);

    // Return PDF stream with appropriate headers
    return new NextResponse(stream as unknown as ReadableStream, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${resumeData.personalDetails.fullName}'s Optimized Resume.pdf"`,
      },
    });

  } catch (error) {
    console.error('Error generating PDF:', error);
    return NextResponse.json(
      { error: "Error generating PDF" },
      { status: 500 }
    );
  }
}
