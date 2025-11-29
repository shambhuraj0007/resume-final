import mongoose, { Schema, Document, Model } from 'mongoose';

interface IPersonalDetails {
  fullName: string;
  email: string;
  phone: string;
  linkedin: string;
  github: string;
  website: string;
  location: string;
}

interface IWorkExperience {
  jobTitle: string;
  companyName: string;
  location: string;
  startDate: string;
  endDate: string;
  description: string;
}

interface IEducation {
  degree: string;
  institution: string;
  location: string;
  startDate: string;
  endDate: string;
  description: string;
}

interface ISkill {
  skillType?: 'group' | 'individual';
  category: string;
  skills: string;
  skill: string;
}

interface IProject {
  projectName: string;
  description: string;
  link: string;
}

interface ILanguage {
  language: string;
  proficiency: string;
}

interface ICertification {
  certificationName: string;
  issuingOrganization: string;
  issueDate: string;
}

interface ICustomSection {
  title: string;
  content: string;
}

export interface IResume extends Document {
  userId: string;
  userEmail: string;
  resumeId: string;
  personalDetails: IPersonalDetails;
  objective: string;
  jobTitle: string;
  workExperience: IWorkExperience[];
  education: IEducation[];
  skills: ISkill[];
  projects: IProject[];
  languages: ILanguage[];
  certifications: ICertification[];
  customSections?: ICustomSection[];
  template?: string;
  accentColor?: string;
  fontFamily?: string;
  sectionOrder?: string[];
  showIcons?: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const ResumeSchema: Schema<IResume> = new Schema(
  {
    userId: {
      type: String,
      required: true,
      index: true,
    },
    userEmail: {
      type: String,
      required: true,
      index: true,
    },
    resumeId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    personalDetails: {
      fullName: { type: String, required: true },
      email: { type: String, required: true },
      phone: String,
      linkedin: String,
      github: String,
      website: String,
      location: String,
    },
    objective: String,
    jobTitle: String,
    workExperience: [
      {
        jobTitle: String,
        companyName: String,
        location: String,
        startDate: String,
        endDate: String,
        description: String,
      },
    ],
    education: [
      {
        degree: String,
        institution: String,
        location: String,
        startDate: String,
        endDate: String,
        description: String,
      },
    ],
    skills: [
      {
        skillType: {
          type: String,
          enum: ['group', 'individual'],
        },
        category: String,
        skills: String,
        skill: String,
      },
    ],
    projects: [
      {
        projectName: String,
        description: String,
        link: String,
      },
    ],
    languages: [
      {
        language: String,
        proficiency: String,
      },
    ],
    certifications: [
      {
        certificationName: String,
        issuingOrganization: String,
        issueDate: String,
      },
    ],
    customSections: [
      {
        title: String,
        content: String,
      },
    ],
    template: {
      type: String,
      default: 'modern',
    },
    accentColor: {
      type: String,
      default: '#000000',
    },
    fontFamily: {
      type: String,
      default: 'DM Sans',
    },
    sectionOrder: [String],
    showIcons: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

const Resume: Model<IResume> =
  mongoose.models.Resume || mongoose.model<IResume>('Resume', ResumeSchema);

export default Resume;
