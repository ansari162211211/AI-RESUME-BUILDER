export interface PersonalInfo {
  fullName: string;
  jobTitle?: string;
  email: string;
  phone: string;
  city?: string;
  state?: string;
  postalCode?: string;
  country?: string;
  location?: string; // fallback or legacy
  website?: string;
  linkedin?: string;
  github?: string;
  otherProfiles?: string; // Google Scholar, ORCID, ResearchGate, etc.
}

export interface ExperienceItem {
  id: string;
  company: string;
  position: string;
  location?: string;
  employmentType?: string; // Full-time, Internship, Postdoctoral Fellow, Graduate Assistant, etc.
  startDate: string;
  endDate: string;
  current: boolean;
  highlights: string[];
}

export interface EducationItem {
  id: string;
  institution: string;
  degree: string;
  specialization?: string; // Field of Study / Major
  location?: string;
  startDate: string;
  endDate: string;
  current: boolean;
  grade?: string; // GPA / CGPA / Grade
  achievements?: string; // Thesis title, Advisor, Honors
}

export interface SkillCategory {
  id: string;
  category: string;
  skills: string[];
}

export interface ProjectItem {
  id: string;
  title: string;
  technologies: string[];
  link?: string;
  githubUrl?: string;
  startDate?: string;
  endDate?: string;
  description: string;
  highlights: string[];
}

export type PublicationType =
  | 'journal'
  | 'conference'
  | 'patent'
  | 'manuscript'
  | 'book_chapter'
  | 'thesis';

export interface PublicationItem {
  id: string;
  type: PublicationType;
  title: string;
  authors: string;
  year: string;
  journalOrConference?: string;
  publisher?: string;
  volume?: string;
  issue?: string;
  pages?: string;
  doi?: string;
  location?: string;
  patentNumber?: string;
  publicationDate?: string;
  status?: string; // Published, Accepted, Under Review, Filed
}

export interface AwardItem {
  id: string;
  title: string;
  issuer: string;
  date: string;
  description?: string;
}

export interface LeadershipItem {
  id: string;
  role: string;
  organization: string;
  startDate: string;
  endDate: string;
  current?: boolean;
  location?: string;
  highlights: string[];
}

export interface VolunteerItem {
  id: string;
  role: string;
  organization: string;
  startDate: string;
  endDate: string;
  current?: boolean;
  location?: string;
  highlights: string[];
}

export interface MembershipItem {
  id: string;
  organization: string;
  membershipId?: string;
  membershipType?: string; // Member, Senior Member, Fellow, Student Member
  startDate: string;
  endDate?: string;
  current?: boolean;
}

export interface CertificationItem {
  id: string;
  name: string;
  issuer: string;
  issueDate: string;
  expirationDate?: string;
  credentialId?: string;
  link?: string;
}

export interface LanguageItem {
  id: string;
  language: string;
  proficiency: string; // Native, Fluent, Professional, Intermediate, Elementary
}

export interface ReferenceItem {
  id: string;
  fullName: string;
  jobTitle: string;
  department?: string;
  organization: string;
  email: string;
  phone?: string;
  relationship?: string;
}

export type CvFontFamily = 'serif' | 'sans';

export interface Resume {
  id: string;
  userId: string;
  title: string;
  targetRole?: string;
  personalInfo: PersonalInfo;
  objective?: string;
  education: EducationItem[];
  experience: ExperienceItem[];
  projects: ProjectItem[];
  publications?: PublicationItem[];
  skills: SkillCategory[];
  achievements: AwardItem[];
  leadership?: LeadershipItem[];
  volunteer?: VolunteerItem[];
  memberships?: MembershipItem[];
  certifications: CertificationItem[];
  languages?: LanguageItem[];
  interests?: string;
  references?: ReferenceItem[];
  fontFamily?: CvFontFamily;
  hiddenSections?: string[];
  createdAt: string;
  updatedAt: string;
  // Legacy fields kept for backward compatibility:
  template?: string;
  themeColor?: string;
}

export interface AuthUser {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL?: string | null;
  isAnonymous?: boolean;
}

export type SectionStatus =
  | 'complete'
  | 'needs_details'
  | 'optional_empty'
  | 'needs_review';

export interface SectionAnalysis {
  sectionId: string;
  name: string;
  status: SectionStatus;
  statusLabel: string;
  isOptional: boolean;
  score: number; // 0 - 100
  issues: string[];
  suggestions: string[];
}

export interface CvCompletenessReport {
  overallScore: number;
  overallStatus: 'excellent' | 'good' | 'in_progress' | 'needs_work';
  sections: SectionAnalysis[];
  topRecommendations: string[];
}

export interface AiImproveResult {
  original: string;
  improved: string;
  alternative?: string;
  explanation: string;
}

export interface InterviewChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  suggestedChips?: string[];
  structuredUpdates?: Partial<Resume>;
}

export interface CvExtractionResult {
  extractedData: Partial<Resume> & { extractionNotes?: string[] };
  confidence?: 'high' | 'medium' | 'low';
}

