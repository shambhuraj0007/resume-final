import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import ResumeView from './resumeView';

// Types remain the same as in your original code
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

interface CustomSection {
  sectionTitle: string;
  content: string;
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
  customSections: CustomSection[];
  accentColor?: string;
  fontFamily?: string;
  sectionOrder?: string[];
  showIcons?: boolean;
}

async function getResumeData(resumeId: string): Promise<ResumeData | null> {
  try {
    // Use direct database query instead of API fetch for server-side rendering
    const { default: connectDB } = await import('@/lib/mongodb');
    const { default: Resume } = await import('@/models/Resume');
    
    await connectDB();
    const resume = await Resume.findOne({ resumeId }).lean();
    
    if (!resume) {
      console.error(`Resume not found: ${resumeId}`);
      return null;
    }
    
    // Convert MongoDB document to plain object
    return JSON.parse(JSON.stringify(resume)) as ResumeData;
  } catch (error) {
    console.error('Error fetching resume:', error);
    return null;
  }
}

export default async function Page({
  params: { resumeId },
}: {
  params: { resumeId: string };
}) {
  const resumeData = await getResumeData(resumeId);
  const session = await getServerSession(authOptions);

  if (!resumeData) {
    return (
      <div className="p-8 text-center dark:bg-gray-800 min-h-[80vh]">
        <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-200 mb-4">Resume Not Found</h2>
        <p className="text-gray-600 dark:text-gray-400 mb-2">The requested resume could not be found in the database.</p>
        <div className="mt-4 p-4 bg-gray-100 dark:bg-gray-700 rounded-lg inline-block text-left">
          <p className="text-sm text-gray-600 dark:text-gray-400"><strong>Resume ID:</strong> {resumeId}</p>
          <p className="text-sm text-gray-600 dark:text-gray-400"><strong>User:</strong> {session?.user?.email || 'Not logged in'}</p>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-2"><strong>Environment:</strong> {process.env.NODE_ENV}</p>
        </div>
        <p className="text-sm text-gray-500 mt-4">Please check if the resume ID is correct or create a new resume.</p>
      </div>
    );
  }

  return <ResumeView resumeData={resumeData} resumeId={resumeId} />;
}