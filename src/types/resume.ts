export interface PersonalInfo {
  fullName: string;
  jobTitle?: string;
  specialization?: string;
  tagline?: string;
  email: string;
  phone: string;
  secondaryPhone?: string;
  additionalPhone?: string;
  dateOfBirth?: string;
  additionalInfo?: string;
  photoUrl?: string;
  photoShape?: 'portrait' | 'square' | 'circle';
  streetAddress?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  country?: string;
  location?: string; // fallback or legacy
  website?: string;
  linkedin?: string;
  github?: string;
  twitter?: string;
  orcid?: string;
  gitlab?: string;
  mastodon?: string;
  nationality?: string;
  customLinks?: Array<{ id: string; label: string; url: string }>;
  otherProfiles?: string; // Google Scholar, ORCID, ResearchGate, etc.
}

export type ExperienceCategory = 'Vocational' | 'Professional' | 'Other';

export interface ExperienceSubHighlights {
  id: string;
  parentIndex: number;
  items: string[];
}

export type ExperienceEntryKind =
  | 'internship'
  | 'training'
  | 'workshop'
  | 'industrial_visit'
  | 'employment';

export interface ExperienceItem {
  id: string;
  company: string;
  position: string;
  entryKind?: ExperienceEntryKind;
  department?: string;
  teamSize?: string;
  location?: string;
  employmentType?: string; // Full-time, Internship, Industrial Training, Workshop, Industrial Visit, etc.
  category?: ExperienceCategory;
  description?: string;
  results?: string;
  startDate: string;
  endDate: string;
  current: boolean;
  highlights: string[];
  subHighlights?: ExperienceSubHighlights[];
  technologies?: string[];
  skillsDemonstrated?: string[];
  skillsLearned?: string[];
}

export interface ResearchExperienceItem {
  id: string;
  title: string;
  institution: string;
  supervisor?: string;
  role?: string;
  domain?: string;
  location?: string;
  startDate: string;
  endDate: string;
  current?: boolean;
  objectives?: string;
  methodology?: string;
  technologies?: string[];
  findings?: string;
  outcomes?: string;
  publications?: string;
}

export interface EducationItem {
  id: string;
  institution: string;
  degree: string;
  department?: string;
  specialization?: string; // Field of Study / Major / Concentration
  location?: string;
  startDate: string;
  endDate: string;
  current: boolean;
  grade?: string; // GPA / CGPA / Grade
  gradingScale?: string; // e.g. 4.00, 10.00, Percentage
  board?: string; // Optional high school / board / university system
  thesisTitle?: string; // Optional Thesis title (Harvard & Academic)
  dissertationDetails?: string;
  coursework?: string[] | string; // Optional per-entry relevant coursework
  honors?: string; // Optional academic awards and honors
  achievements?: string; // Thesis title, Advisor, Honors (legacy / combined)
  description?: string;
}

export interface StudyAbroadItem {
  id: string;
  institution: string;
  cityCountry?: string; // City and country
  location?: string; // City and country alias
  coursework?: string; // Coursework or academic description
  startDate: string;
  endDate: string;
}

export interface HighSchoolItem {
  id: string;
  qualification?: string; // e.g. Senior Secondary Education, High School Diploma, Secondary Education
  schoolName: string;
  board?: string; // e.g. Central Board of Secondary Education, ICSE, State Board
  location?: string; // City and state / country
  graduationDate: string;
  gpa?: string;
  testScores?: string; // Optional SAT / ACT scores
  honors?: string; // Optional academic honors
}

export interface MasterThesisInfo {
  title: string;
  supervisors?: string;
  institution?: string;
  year?: string;
  description?: string;
}

export type SkillMatrixLevel = 1 | 2 | 3 | 4 | 5;

export interface SkillCategory {
  id: string;
  category: string;
  skills: string[];
  proficiency?: SkillMatrixLevel | null; // Optional explicit user-confirmed rating (1..5); null/undefined renders NO dots
}

export interface SkillMatrixItem {
  id: string;
  category: string;
  skill: string;
  level: SkillMatrixLevel | null;
  yearsOfExperience?: string;
  comment?: string;
}

export interface InterestItem {
  id: string;
  name: string;
  description?: string;
}

export interface CustomSectionItem {
  id: string;
  title: string;
  bullets: string[];
}

export interface DailyActivityItem {
  id: string;
  activity: string;
  hours: number;
}

export type ReferencesDisplayMode = 'detailed' | 'on-request' | 'hidden';

export interface ProjectItem {
  id: string;
  title: string;
  projectType?: string; // Academic, Mini Project, Final-Year, Research, Industrial, Personal, Prototype, Engineering Design
  teamType?: 'Individual' | 'Team';
  domain?: string; // e.g. Thermal Engineering, Robotics, Embedded Systems, Full-Stack Web
  institution?: string; // Funding agency / institution
  mentor?: string;
  technologies: string[];
  frameworks?: string[];
  database?: string;
  tools?: string[];
  componentsMaterials?: string[]; // Physical components, materials, sensors, actuators
  link?: string;
  githubUrl?: string;
  startDate?: string;
  endDate?: string;
  current?: boolean;
  objective?: string;
  description?: string;
  methodology?: string;
  designApproach?: string;
  problemSolved?: string;
  contribution?: string;
  testingValidation?: string;
  results?: string;
  technicalChallenges?: string;
  keyFeatures?: string[];
  achievements?: string[];
  highlights: string[];
}

export type PublicationType =
  | 'book'
  | 'journal'
  | 'conference'
  | 'research_paper'
  | 'patent'
  | 'manuscript'
  | 'book_chapter'
  | 'thesis'
  | 'other';

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
  url?: string;
  description?: string;
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
  category?: string;
  participationType?: string; // Competition, Hackathon, Club, Volunteer Event, Scholarship, Organization
  teamType?: 'Individual' | 'Team';
  role?: string;
  responsibilities?: string;
  outcome?: string;
  rank?: string;
  url?: string;
  achievementDetails?: string;
  description?: string;
  icon?: 'trophy' | 'heart' | 'award' | 'star';
}

export type LearningActivityType =
  | 'Course'
  | 'Workshop'
  | 'Bootcamp'
  | 'Lab Training'
  | 'Industrial Training'
  | 'Industrial Visit'
  | 'Online Course'
  | 'Certification Prep'
  | 'Other';

export interface LearningActivityItem {
  id: string;
  title: string;
  activityType?: LearningActivityType;
  subject?: string;
  provider?: string;
  instructor?: string;
  completionDate?: string;
  certificateId?: string;
  credentialUrl?: string;
  skillsAcquired?: string[];
  description?: string;
}

export type InternshipTrack =
  | 'cs'
  | 'cybersecurity'
  | 'ece'
  | 'research'
  | 'non-technical';

export type EngineeringBranch =
  | 'mechanical'
  | 'cse-it'
  | 'ece'
  | 'ee'
  | 'civil'
  | 'chemical'
  | 'other';

export type CreativeProfession =
  | 'developer'
  | 'cybersecurity'
  | 'designer'
  | 'marketing'
  | 'researcher'
  | 'engineer'
  | 'other';

export interface CreativeSkillDetailItem {
  id: string;
  category: string; // e.g., Technical, Professional, Creative, National / International, or custom
  name: string;
  description?: string;
  organization?: string;
}

export interface CreativeCircularProficiencyItem {
  id: string;
  name: string;
  shortLabel: string; // Shown inside circular progress ring (e.g., TS, UX, SEC)
  description?: string;
  percentage: number; // 0 - 100
}

export interface CreativeSkillBarItem {
  id: string;
  name: string;
  percentage: number; // 0 - 100
}

export interface CreativeCommunicationSkillItem {
  id: string;
  skill: string;
  proficiency?: string;
  context?: string;
}

export interface InternshipPreferences {
  targetRole?: string;
  preferredIndustry?: string;
  duration?: string;
  workArrangement?: 'Remote' | 'Hybrid' | 'Onsite' | 'Flexible' | '';
  availabilityDate?: string;
  preferredTechnologies?: string[];
}

export type AchievementItem = AwardItem;

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
  skillsCovered?: string[];
}

export interface LanguageItem {
  id: string;
  language: string;
  proficiency: string; // Beginner, Elementary, Intermediate, Upper Intermediate, Advanced, Fluent, Native, 1..5, or '' if unconfirmed
  comment?: string;
}

export interface ReferenceItem {
  id: string;
  fullName: string;
  jobTitle: string;
  department?: string;
  organization: string;
  email: string;
  phone?: string;
  address?: string;
  relationship?: string;
}

export type CvFontFamily = 'serif' | 'sans';

export type TemplateId =
  | 'academic-cv'
  | 'jakes-resume'
  | 'classic-professional'
  | 'modern-minimalist'
  | 'two-column-professional'
  | 'software-developer'
  | 'harvard-style'
  | 'elegant-serif'
  | 'modern-corporate'
  | 'fresher-resume'
  | 'internship-resume'
  | 'engineering-resume'
  | 'creative-professional'
  | 'executive-resume'
  | 'research-scholar'
  | 'simple-one-page';

export type TemplateCategory =
  | 'All Templates'
  | 'Academic CV'
  | 'Professional'
  | 'ATS-Friendly'
  | 'Student & Fresher'
  | 'Technical & Developer'
  | 'Research'
  | 'Creative';

export type TemplateFontSize = 'compact' | 'standard' | 'large';
export type TemplateSpacing = 'tight' | 'balanced' | 'relaxed';
export type TemplateMarginSize = 'narrow' | 'standard' | 'wide';
export type TemplateHeadingStyle =
  | 'uppercase-rule'
  | 'title-rule'
  | 'classic-blue-rule'
  | 'moderncv-bar'
  | 'burgundy-gold-rule'
  | 'left-accent'
  | 'filled-band'
  | 'clean-caps'
  | 'italic-serif'
  | 'internship-rule'
  | 'creative-blue-rule';

export interface TemplateCustomization {
  fontFamily: CvFontFamily;
  fontSize: TemplateFontSize;
  textColor: string;
  accentColor: string;
  sectionSpacing: TemplateSpacing;
  pageMargins: TemplateMarginSize;
  headingStyle: TemplateHeadingStyle;
}

export interface Resume {
  id: string;
  userId: string;
  title: string;
  targetRole?: string;
  personalInfo: PersonalInfo;
  personalQuote?: string;
  objective?: string;
  academicInterests?: string;
  careerGoals?: string;
  education: EducationItem[];
  thesis?: MasterThesisInfo;
  studyAbroad?: StudyAbroadItem[];
  highSchool?: HighSchoolItem[];
  coursework?: string[];
  experience: ExperienceItem[];
  researchExperience?: ResearchExperienceItem[];
  projects: ProjectItem[];
  dailyActivities?: DailyActivityItem[];
  showDailyActivityChart?: boolean;
  publications?: PublicationItem[];
  skills: SkillCategory[];
  labSkills?: string[];
  skillMatrix?: SkillMatrixItem[];
  strengths?: string[];
  achievements: AwardItem[];
  leadership?: LeadershipItem[];
  harvardLeadershipFirst?: boolean;
  targetBackground?:
    | 'student'
    | 'fresher'
    | 'experienced'
    | 'researcher'
    | 'corporate'
    | 'technical';
  fresherTrack?:
    | 'engineering'
    | 'cs'
    | 'cybersecurity'
    | 'non-technical'
    | 'graduate';
  internshipTrack?: InternshipTrack;
  engineeringBranch?: EngineeringBranch;
  customEngineeringBranch?: string;
  creativeProfession?: CreativeProfession;
  customCreativeProfession?: string;
  creativeSkillItems?: CreativeSkillDetailItem[];
  circularProficiencies?: CreativeCircularProficiencyItem[];
  creativeSkillBars?: CreativeSkillBarItem[];
  communicationSkills?: CreativeCommunicationSkillItem[];
  proficiencyHeadingOverride?: string;
  learningActivities?: LearningActivityItem[];
  careerInterests?: string[];
  internshipPreferences?: InternshipPreferences;
  volunteer?: VolunteerItem[];
  memberships?: MembershipItem[];
  certifications: CertificationItem[];
  languages?: LanguageItem[];
  interests?: string;
  interestItems?: InterestItem[];
  customSections?: CustomSectionItem[];
  references?: ReferenceItem[];
  referencesDisplayMode?: ReferencesDisplayMode;
  fontFamily?: CvFontFamily;
  hiddenSections?: string[];
  sectionOrderOverride?: string[];
  createdAt: string;
  updatedAt: string;
  template?: TemplateId | string;
  themeColor?: string;
  customization?: TemplateCustomization;
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

