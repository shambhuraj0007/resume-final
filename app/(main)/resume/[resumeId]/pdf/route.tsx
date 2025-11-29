import { NextResponse } from 'next/server';
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
})

// Updated styles for single-page layout
const minimal = StyleSheet.create({
    page: {
        padding: 20,
        fontSize: 8,
    },
    section: {
        marginBottom: 4,
    },
    bold: {
        fontFamily: 'Helvetica-Bold'
    },
    header: {
        marginBottom: 8,
        textAlign: 'center',
    },
    name: {
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 2,
    },
    jobTitle: {
        fontSize: 10,
        color: '#666',
        marginBottom: 4,
    },
    contactInfo: {
        flexDirection: 'row',
        justifyContent: 'center',
        gap: 8,
        fontSize: 7,
        color: '#666',
    },
    sectionTitle: {
        fontSize: 11,
        fontFamily: 'Helvetica-Bold',
        marginBottom: 3,
        borderBottomWidth: 0.5,
        borderBottomColor: '#000',
        paddingBottom: 1,
    },
    experienceItem: {
        paddingBottom: 2,
    },
    experienceLastItem: {
        marginBottom: 3,
        borderBottom: 0.5,
        borderBottomStyle: "dashed",
        borderBottomWidth: 0.5,
        borderBottomColor: "#d1d5db",
        paddingBottom: 2
    },
    experienceHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 1,
    },
    companyName: {
        fontFamily: 'Helvetica-Bold',
        fontSize: 8,
    },
    dates: {
        color: '#666',
        fontSize: 7,
    },
    description: {
        flexDirection: "column",
        fontSize: 7,
        color: '#444',
        lineHeight: 1.3,
        paddingLeft: "8px",
        textAlign: "justify"
    },
    p: {
        flexDirection: "column",
        fontSize: 7,
        color: '#444',
        lineHeight: 1.3,
    },
    skills: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 3,
    },
    skillCategory: {
        fontFamily: 'Helvetica-Bold',
        marginRight: 3,
        fontSize: 7,
    },
});

const modern = StyleSheet.create({
    page: {
        padding: 20,
        fontSize: 8,
    },
    section: {
        marginBottom: 4,
    },
    bold: {
        fontFamily: 'Helvetica-Bold'
    },
    header: {
        marginBottom: 8,
        textAlign: 'center',
    },
    headerName: {
        display: "flex",
        flexDirection: "row",
        alignContent: "flex-start",
        gap: 5,
    },
    name: {
        fontSize: 18,
        marginBottom: 2,
        fontFamily: "Helvetica-Bold",
        color: "#0e7490"
    },
    jobTitle: {
        fontSize: 10,
        color: '#155e75',
        alignSelf: "center"
    },
    contact: {
        flexDirection: "column",
        gap: 3,
        fontSize: 7,
        justifyContent: "flex-start",
        color: '#666',
    },
    contactInfo: {
        flexDirection: 'row',
        gap: 5
    },
    sectionTitle: {
        fontSize: 11,
        fontFamily: 'Helvetica-Bold',
        marginBottom: 3,
        color: "#0e7490",
        paddingBottom: 1,
    },
    row: {
        display: "flex",
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 4
    },
    border: {
        height: 1.5,
        flex: 1,
        backgroundColor: "#0e7490",
        marginBottom: 3,
    },
    experienceItem: {
        marginBottom: 2,
    },
    experienceLastItem: {
        marginBottom: 3,
        borderBottom: 0.5,
        borderBottomStyle: "dashed",
        borderBottomWidth: 0.5,
        borderBottomColor: "#0891b2",
        paddingBottom: 2
    },
    experienceHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 1,
    },
    companyName: {
        color: "#155e75",
        fontSize: 8,
    },
    dates: {
        color: '#155e75',
        fontSize: 7,
    },
    description: {
        flexDirection: "column",
        fontSize: 7,
        color: '#444',
        lineHeight: 1.3,
        paddingLeft: "8px",
        textAlign: "justify"
    },
    p: {
        flexDirection: "column",
        fontSize: 7,
        color: '#444',
        lineHeight: 1.3,
    },
    subHeading: {
        fontSize: 9
    },
    skills: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 3,
    },
    skillCategory: {
        fontFamily: 'Helvetica',
        color: "#155e75",
        marginRight: 2,
        fontSize: 7,
    },
});

const professional = StyleSheet.create({
    page: {
        padding: 20,
        fontSize: 8,
    },
    section: {
        marginBottom: 4,
    },
    bold: {
        fontFamily: 'Helvetica-Bold'
    },
    header: {
        marginBottom: 8,
        textAlign: 'center',
        display: "flex",
        flexDirection: "row",
        justifyContent: "space-between"
    },
    headerName: {
        display: "flex",
        fontFamily: "Helvetica-Bold"
    },
    name: {
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 2,
    },
    jobTitle: {
        fontSize: 10,
        color: '#000',
        marginBottom: 4,
        fontFamily: "Helvetica"
    },
    contactInfo: {
        display: "flex",
        flexDirection: "column",
        fontSize: 7,
        color: '#666',
        alignItems: "flex-end"
    },
    sectionTitle: {
        fontSize: 11,
        fontFamily: 'Helvetica-Bold',
        marginBottom: 3,
        borderBottomWidth: 0.5,
        borderBottomColor: '#000',
        paddingBottom: 1,
        textAlign: "center"
    },
    experienceItem: {
        marginBottom: 2,
    },
    experienceLastItem: {
        marginBottom: 3,
        borderBottom: 0.5,
        borderBottomStyle: "dashed",
        borderBottomWidth: 0.5,
        borderBottomColor: "#d1d5db",
        paddingBottom: 2
    },
    experienceHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 1,
    },
    companyName: {
        fontFamily: 'Helvetica-Bold',
        fontSize: 8,
    },
    dates: {
        color: '#666',
        fontFamily: "Times-Italic",
        fontSize: 7,
    },
    description: {
        flexDirection: "column",
        fontSize: 7,
        color: '#444',
        lineHeight: 1.3,
        paddingLeft: "8px",
        textAlign: "justify"
    },
    p: {
        flexDirection: "column",
        fontSize: 7,
        color: '#444',
        lineHeight: 1.3,
    },
    skills: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 3,
    },
    skillCategory: {
        fontFamily: 'Helvetica-Bold',
        marginRight: 3,
        fontSize: 7,
    },
});

// Helper function to process bold text
const processBoldText = (text: string) => {
    const parts = text.split(/(\*\*.*?\*\*)/g);
    
    return parts.map((part, index) => {
        if (part.startsWith('**') && part.endsWith('**')) {
            const boldText = part.slice(2, -2);
            return <Text key={index} style={minimal.bold}>{boldText}</Text>;
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
                <View key={lineIndex} style={{ flexDirection: 'row', marginBottom: 1 }}>
                    <Text style={{ width: 8 }}>{lineIndex !== 0 && <Br/>}• </Text>
                    <Text style={{ flex: 1 }}>
                        {processBoldText(trimmedLine.substring(2))}
                    </Text>
                </View>
            );
        }
        
        return trimmedLine ? (
            <Text key={lineIndex} style={{ marginBottom: 1 }}>
                {processBoldText(trimmedLine)}
            </Text>
        ) : (
            <Text key={lineIndex} style={{ marginBottom: 2 }}>{' '}</Text>
        );
    });
};

// Minimal Template Component
const MinimalTemplate = ({ resumeData }: { resumeData: ResumeData }) => (
    <Document>
        <Page size="A4" style={minimal.page} wrap={false}>
            {/* Header */}
            <View style={minimal.header}>
                <Text style={minimal.name}>{resumeData.personalDetails.fullName}</Text>
                <Text style={minimal.jobTitle}>{resumeData.jobTitle}</Text>
                <View style={minimal.contactInfo}>
                    <Text>{resumeData.personalDetails.email}</Text>
                    <Text>{resumeData.personalDetails.phone}</Text>
                    <Text>{resumeData.personalDetails.location}</Text>
                </View>
                {(resumeData.personalDetails.linkedin || resumeData.personalDetails.github) && (
                    <View style={[minimal.contactInfo, { marginTop: 2 }]}>
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
                <View style={minimal.section}>
                    <Text style={minimal.sectionTitle}>Professional Summary</Text>
                    <Text style={minimal.p}>{renderPDFContent(resumeData.objective)}</Text>
                </View>
            )}

            {/* Work Experience */}
            {resumeData.workExperience.length > 0 && (
                <View style={minimal.section}>
                    <Text style={minimal.sectionTitle}>Work Experience</Text>
                    {resumeData.workExperience.map((exp, index) => (
                        <View key={index} style={index === (resumeData.workExperience.length - 1) ? minimal.experienceItem : minimal.experienceLastItem}>
                            <View style={minimal.experienceHeader}>
                                <Text style={minimal.companyName}>{exp.jobTitle}</Text>
                                <Text style={minimal.dates}>{`${exp.startDate} - ${exp.endDate}`}</Text>
                            </View>
                            <Text style={{ fontSize: 7 }}>{exp.companyName}</Text>
                            <Text style={minimal.description}>{renderPDFContent(exp.description)}</Text>
                        </View>
                    ))}
                </View>
            )}

            {/* Projects Section */}
            {resumeData.projects.length > 0 && (
                <View style={minimal.section}>
                    <Text style={minimal.sectionTitle}>Projects</Text>
                    {resumeData.projects.map((project, index) => ( 
                        <View key={index} style={index === (resumeData.projects.length - 1) ? minimal.experienceItem : minimal.experienceLastItem}>
                            <View style={minimal.experienceHeader}>
                                <Text style={minimal.companyName}>{project.projectName}</Text>
                            </View>
                            {project.link && (
                                <Text style={{ color: '#0077B5', fontSize: 7, marginBottom: 1 }}>
                                    {project.link}
                                </Text>
                            )}
                            <Text style={minimal.description}>{renderPDFContent(project.description)}</Text>
                        </View>
                    ))}
                </View>
            )}

            {/* Education Section */}
            {resumeData.education.length > 0 && (
                <View style={minimal.section}>
                    <Text style={minimal.sectionTitle}>Education</Text>
                    {resumeData.education.map((edu, index) => (
                        <View key={index} style={minimal.experienceItem}>
                            <View style={minimal.experienceHeader}>
                                <Text style={minimal.companyName}>{edu.degree}</Text>
                                <Text style={minimal.dates}>{`${edu.startDate} - ${edu.endDate}`}</Text>
                            </View>
                            <Text style={{ fontSize: 7 }}>{edu.institution}</Text>
                            {edu.description && (
                                <Text style={minimal.p}>{edu.description}</Text>
                            )}
                        </View>
                    ))}
                </View>
            )}

            {/* Skills Section */}
            {resumeData.skills.length > 0 && (
                <View style={minimal.section}>
                    <Text style={minimal.sectionTitle}>Technical Skills</Text>
                    <View style={{ flexDirection: 'column', gap: 2 }}>
                        {resumeData.skills.map((skill, index) => (
                            <View key={index} style={{ flexDirection: 'row', gap: 3 }}>
                                {skill.skillType === 'individual' ? (
                                    <Text style={[minimal.skillCategory, { flex: 1 }]}>{skill.skill}</Text>
                                ) : (
                                    <>
                                        <Text style={minimal.skillCategory}>{skill.category}:</Text>
                                        <Text style={[minimal.p, { flex: 1 }]}>{skill.skills}</Text>
                                    </>
                                )}
                            </View>
                        ))}
                    </View>
                </View>
            )}

            {/* Certifications Section */}
            {resumeData.certifications.length > 0 && (
                <View style={minimal.section}>
                    <Text style={minimal.sectionTitle}>Certifications</Text>
                    {resumeData.certifications.map((cert, index) => (
                        <View key={index} style={minimal.experienceItem}>
                            <View style={minimal.experienceHeader}>
                                <Text style={minimal.companyName}>{cert.certificationName}</Text>
                                <Text style={minimal.dates}>{cert.issueDate}</Text>
                            </View>
                            <Text style={minimal.p}>{cert.issuingOrganization}</Text>
                        </View>
                    ))}
                </View>
            )}

            {/* Languages Section */}
            {resumeData.languages.length > 0 && (
                <View style={minimal.section}>
                    <Text style={minimal.sectionTitle}>Languages</Text>
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 5 }}>
                        {resumeData.languages.map((lang, index) => (
                            <View key={index} style={{ flexDirection: 'row', width: '45%', gap: 3 }}>
                                <Text style={minimal.skillCategory}>{lang.language}:</Text>
                                <Text style={minimal.p}>{lang.proficiency}</Text>
                            </View>
                        ))}
                    </View>
                </View>
            )}
        </Page>
    </Document>
);

// Modern Template Component
const ModernTemplate = ({ resumeData }: { resumeData: ResumeData }) => (
    <Document>
        <Page size="A4" style={modern.page} wrap={false}>
            {/* Header */}
            <View style={modern.header}>
                <View style={modern.headerName}>
                    <Text style={modern.name}>{resumeData.personalDetails.fullName}</Text>
                    <Text style={modern.jobTitle}>{resumeData.jobTitle}</Text>
                </View>
                <View style={modern.contact}>
                    <View style={modern.contactInfo}>
                        <Text>{resumeData.personalDetails.email}</Text>
                        <Text>{resumeData.personalDetails.phone}</Text>
                        <Text>{resumeData.personalDetails.location}</Text>
                    </View>
                    {(resumeData.personalDetails.linkedin || resumeData.personalDetails.github) && (
                        <View style={modern.contactInfo}>
                            {resumeData.personalDetails.linkedin && (
                                <Text style={{ color: '#0077B5' }}>{resumeData.personalDetails.linkedin}</Text>
                            )}
                            {resumeData.personalDetails.github && (
                                <Text style={{ color: '#0077B5' }}>{resumeData.personalDetails.github}</Text>
                            )}
                        </View>
                    )}
                </View>
            </View>

            {/* Professional Summary */}
            {resumeData.objective && (
                <View style={modern.section}>
                    <View style={modern.row}>
                        <Text style={modern.sectionTitle}>Professional Summary</Text>
                        <Text style={modern.border}> </Text>
                    </View>
                    <Text style={modern.p}>{renderPDFContent(resumeData.objective)}</Text>
                </View>
            )}

            {/* Work Experience */}
            {resumeData.workExperience.length > 0 && (
                <View style={modern.section}>
                    <View style={modern.row}>
                        <Text style={modern.sectionTitle}>Work Experience</Text>
                        <Text style={modern.border}> </Text>
                    </View>
                    {resumeData.workExperience.map((exp, index) => (
                        <View key={index} style={index === (resumeData.workExperience.length - 1) ? modern.experienceItem : modern.experienceLastItem}>
                            <View style={modern.experienceHeader}>
                                <Text style={modern.bold}>{exp.jobTitle}</Text>
                                <Text style={modern.dates}>{`${exp.startDate} - ${exp.endDate}`}</Text>
                            </View>
                            <Text style={modern.companyName}>{exp.companyName}</Text>
                            <Text style={modern.description}>{renderPDFContent(exp.description)}</Text>
                        </View>
                    ))}
                </View>
            )}

            {/* Projects Section */}
            {resumeData.projects.length > 0 && (
                <View style={modern.section}>
                    <View style={modern.row}>
                        <Text style={modern.sectionTitle}>Projects</Text>
                        <Text style={modern.border}> </Text>
                    </View>
                    {resumeData.projects.map((project, index) => (
                        <View key={index} style={index === (resumeData.projects.length - 1) ? modern.experienceItem : modern.experienceLastItem}>
                            <View style={modern.experienceHeader}>
                                <Text style={modern.companyName}>{project.projectName}</Text>
                                {project.link && (
                                    <Text style={{ color: '#0077B5', fontSize: 7, fontFamily:"Times-Italic" }}>
                                        {project.link}
                                    </Text>
                                )}
                            </View>
                            <Text style={modern.description}>{renderPDFContent(project.description)}</Text>
                        </View>
                    ))}
                </View>
            )}

            {/* Education Section */}
            {resumeData.education.length > 0 && (
                <View style={modern.section}>
                    <View style={modern.row}>
                        <Text style={modern.sectionTitle}>Education</Text>
                        <Text style={modern.border}> </Text>
                    </View>
                    {resumeData.education.map((edu, index) => (
                        <View key={index} style={modern.experienceItem}>
                            <View style={modern.experienceHeader}>
                                <Text style={modern.bold}>{edu.degree}</Text>
                                <Text style={modern.dates}>{`${edu.startDate} - ${edu.endDate}`}</Text>
                            </View>
                            <Text style={modern.companyName}>{edu.institution}</Text>
                            {edu.description && (
                                <Text style={modern.p}>{edu.description}</Text>
                            )}
                        </View>
                    ))}
                </View>
            )}

            {/* Skills Section */}
            {resumeData.skills.length > 0 && (
                <View style={modern.section}>
                    <View style={modern.row}>
                        <Text style={modern.sectionTitle}>Skills</Text>
                        <Text style={modern.border}> </Text>
                    </View>
                    <View style={{ flexDirection: 'column', gap: 2 }}>
                        {resumeData.skills.map((skill, index) => (
                            <View key={index} style={{ flexDirection: 'row', gap: 3 }}>
                                {skill.skillType === 'individual' ? (
                                    <Text style={[modern.skillCategory, { flex: 1 }]}>{skill.skill}</Text>
                                ) : (
                                    <>
                                        <Text style={modern.skillCategory}>{skill.category}:</Text>
                                        <Text style={[modern.p, { flex: 1 }]}>{skill.skills}</Text>
                                    </>
                                )}
                            </View>
                        ))}
                    </View>
                </View>
            )}

            {/* Certifications Section */}
            {resumeData.certifications.length > 0 && (
                <View style={modern.section}>
                    <View style={modern.row}>
                        <Text style={modern.sectionTitle}>Certifications</Text>
                        <Text style={modern.border}> </Text>
                    </View>
                    {resumeData.certifications.map((cert, index) => (
                        <View key={index} style={modern.experienceItem}>
                            <View style={modern.experienceHeader}>
                                <Text style={modern.subHeading}>{cert.certificationName}</Text>
                                <Text style={modern.dates}>{cert.issueDate}</Text>
                            </View>
                            <Text style={modern.companyName}>{cert.issuingOrganization}</Text>
                        </View>
                    ))}
                </View>
            )}

            {/* Languages Section */}
            {resumeData.languages.length > 0 && (
                <View style={modern.section}>
                    <View style={modern.row}>
                        <Text style={modern.sectionTitle}>Languages</Text>
                        <Text style={modern.border}> </Text>
                    </View>
                    <View style={{ flexDirection: 'column', gap: 2 }}>
                        {resumeData.languages.map((lang, index) => (
                            <View key={index} style={{ flexDirection: 'row', gap: 2 }}>
                                <Text style={modern.skillCategory}>{lang.language}:</Text>
                                <Text style={modern.p}>{lang.proficiency}</Text>
                            </View>
                        ))}
                    </View>
                </View>
            )}
        </Page>
    </Document>
);

// Professional Template Component
const ProfessionalTemplate = ({ resumeData }: { resumeData: ResumeData }) => (
    <Document>
        <Page size="A4" style={professional.page} wrap={false}>
            {/* Header */}
            <View style={professional.header}>
                <View style={professional.headerName}>          
                    <Text style={professional.name}>{resumeData.personalDetails.fullName}</Text>
                    <Text style={professional.jobTitle}>{resumeData.jobTitle}</Text>
                </View>
                <View style={professional.contactInfo}>
                    <Text>{resumeData.personalDetails.email}</Text>
                    <Text>{resumeData.personalDetails.phone}</Text>
                    <Text>{resumeData.personalDetails.location}</Text>
                    {(resumeData.personalDetails.linkedin || resumeData.personalDetails.github) && (
                        <View style={professional.contactInfo}>
                            {resumeData.personalDetails.linkedin && (
                                <Text style={{ color: '#0077B5' }}>{resumeData.personalDetails.linkedin}</Text>
                            )}
                            {resumeData.personalDetails.github && (
                                <Text style={{ color: '#0077B5' }}>{resumeData.personalDetails.github}</Text>
                            )}
                        </View>
                    )}
                </View>
            </View>

            {/* Professional Summary */}
            {resumeData.objective && (
                <View style={professional.section}>
                    <Text style={professional.sectionTitle}>Professional Summary</Text>
                    <Text style={professional.p}>{renderPDFContent(resumeData.objective)}</Text>
                </View>
            )}

            {/* Work Experience */}
            {resumeData.workExperience.length > 0 && (
                <View style={professional.section}>
                    <Text style={professional.sectionTitle}>Work Experience</Text>
                    {resumeData.workExperience.map((exp, index) => (
                        <View key={index} style={index === (resumeData.workExperience.length - 1) ? professional.experienceItem : professional.experienceLastItem}>
                            <View style={professional.experienceHeader}>
                                <Text style={professional.companyName}>{exp.jobTitle}</Text>
                                <Text style={professional.dates}>{`${exp.startDate} - ${exp.endDate}`}</Text>
                            </View>
                            <Text style={{ fontSize: 7 }}>{exp.companyName}</Text>
                            <Text style={professional.description}>{renderPDFContent(exp.description)}</Text>
                        </View>
                    ))}
                </View>
            )}

            {/* Projects Section */}
            {resumeData.projects.length > 0 && (
                <View style={professional.section}>
                    <Text style={professional.sectionTitle}>Projects</Text>
                    {resumeData.projects.map((project, index) => (
                        <View key={index} style={index === (resumeData.projects.length - 1) ? professional.experienceItem : professional.experienceLastItem}>
                            <View style={professional.experienceHeader}>
                                <Text style={professional.companyName}>{project.projectName}</Text>
                                {project.link && (
                                    <Text style={{ color: '#0077B5', fontSize: 7, marginBottom: 1, fontFamily: "Times-Italic" }}>
                                        {project.link}
                                    </Text>
                                )}
                            </View>
                            <Text style={professional.description}>{renderPDFContent(project.description)}</Text>
                        </View>
                    ))}
                </View>
            )}

            {/* Education Section */}
            {resumeData.education.length > 0 && (
                <View style={professional.section}>
                    <Text style={professional.sectionTitle}>Education</Text>
                    {resumeData.education.map((edu, index) => (
                        <View key={index} style={professional.experienceItem}>
                            <View style={professional.experienceHeader}>
                                <Text style={professional.companyName}>{edu.degree}</Text>
                                <Text style={professional.dates}>{`${edu.startDate} - ${edu.endDate}`}</Text>
                            </View>
                            <Text style={{ fontSize: 7 }}>{edu.institution}</Text>
                            {edu.description && (
                                <Text style={professional.p}>{edu.description}</Text>
                            )}
                        </View>
                    ))}
                </View>
            )}

            {/* Skills Section */}
            {resumeData.skills.length > 0 && (
                <View style={professional.section}>
                    <Text style={professional.sectionTitle}>Technical Skills</Text>
                    <View style={{ flexDirection: 'column', gap: 2 }}>
                        {resumeData.skills.map((skill, index) => (
                            <View key={index} style={{ flexDirection: 'row', gap: 3 }}>
                                {skill.skillType === 'individual' ? (
                                    <Text style={[professional.skillCategory, { flex: 1 }]}>{skill.skill}</Text>
                                ) : (
                                    <>
                                        <Text style={professional.skillCategory}>{skill.category}:</Text>
                                        <Text style={[professional.p, { flex: 1 }]}>{skill.skills}</Text>
                                    </>
                                )}
                            </View>
                        ))}
                    </View>
                </View>
            )}

            {/* Certifications Section */}
            {resumeData.certifications.length > 0 && (
                <View style={professional.section}>
                    <Text style={professional.sectionTitle}>Certifications</Text>
                    {resumeData.certifications.map((cert, index) => (
                        <View key={index} style={index < resumeData.certifications.length - 1 ?  professional.experienceItem : {}}>
                            <View style={professional.experienceHeader}>
                                <Text style={professional.companyName}>{cert.certificationName}</Text>
                                <Text style={professional.dates}>{cert.issueDate}</Text>
                            </View>
                            <Text style={{ fontSize: 7 }}>{cert.issuingOrganization}</Text>
                        </View>
                    ))}
                </View>
            )}

            {/* Languages Section */}
            {resumeData.languages.length > 0 && (
                <View style={professional.section}>
                    <Text style={professional.sectionTitle}>Languages</Text>
                    <View style={{ flexDirection: 'column', gap: 2 }}>
                        {resumeData.languages.map((lang, index) => (
                            <View key={index} style={{ flexDirection: 'row', gap: 2 }}>
                                <Text style={professional.skillCategory}>{lang.language}:</Text>
                                <Text style={professional.p}>{lang.proficiency}</Text>
                            </View>
                        ))}
                    </View>
                </View>
            )}
        </Page>
    </Document>
);

// Template registry
const templates = {
    minimal: MinimalTemplate,
    modern: ModernTemplate,
    professional: ProfessionalTemplate,
} as const;

// Alias unsupported UI keys to existing PDF templates
const templateAlias: Record<string, keyof typeof templates> = {
    creative: 'modern',
    modern_old: 'modern',
};

export async function GET(
    request: Request, 
    { params }: { params: { resumeId: string } }
) {
    try {
        const { searchParams } = new URL(request.url);
        const templateName = searchParams.get('template') || 'minimal';

        const { default: connectDB } = await import('@/lib/mongodb');
        const { default: Resume } = await import('@/models/Resume');
        
        await connectDB();
        const resume = await Resume.findOne({ resumeId: params.resumeId }).lean();
        
        if (!resume) {
            return new Response('Resume not found', { status: 404 });
        }
        
        const resumeData = JSON.parse(JSON.stringify(resume)) as ResumeData;

        const normalizedName = (templateAlias[templateName] || templateName) as keyof typeof templates;
        const TemplateComponent = templates[normalizedName] || templates.minimal;

        const stream = await renderToStream(<TemplateComponent resumeData={resumeData} />);

        return new NextResponse(stream as unknown as ReadableStream, {
            headers: {
                'Content-Type': 'application/pdf',
                'Content-Disposition': `attachment; filename="${resumeData.personalDetails.fullName}'s Resume - Made using ResumeItNow.pdf"`,
            },
        });

    } catch (error) {
        console.error('Error generating PDF:', error);
        return new Response('Error generating PDF', { status: 500 });
    }
}
