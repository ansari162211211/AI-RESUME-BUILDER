import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  User,
  GraduationCap,
  Briefcase,
  BookOpen,
  FolderGit2,
  Wrench,
  Trophy,
  Users,
  HeartHandshake,
  BadgeCheck,
  Award,
  Globe,
  Contact,
  FileText,
  Plus,
  Trash2,
  ArrowRight,
  ArrowLeft,
  Save,
  Check,
  Eye,
  Sparkles,
  EyeOff,
  UploadCloud,
  MessageSquare,
  TrendingUp,
  LayoutTemplate,
  Camera,
  SlidersHorizontal,
  Heart,
  Layers,
  BookMarked,
  Crop,
  PieChart,
  Quote,
  Star,
  AlertCircle,
  Link2,
  ChevronUp,
  ChevronDown,
  Terminal,
  Cpu,
  Code2,
  FlaskConical,
  RotateCcw,
  Compass,
  CheckCircle2,
  Clock,
  MinusCircle,
  Loader2,
} from 'lucide-react';
import type {
  Resume,
  PersonalInfo,
  EngineeringBranch,
  ExperienceCategory,
  ExperienceEntryKind,
  ExperienceItem,
  ExperienceSubHighlights,
  ResearchExperienceItem,
  EducationItem,
  StudyAbroadItem,
  HighSchoolItem,
  MasterThesisInfo,
  SkillCategory,
  SkillMatrixItem,
  SkillMatrixLevel,
  InterestItem,
  CustomSectionItem,
  DailyActivityItem,
  ReferencesDisplayMode,
  ProjectItem,
  PublicationItem,
  PublicationType,
  AwardItem,
  LearningActivityItem,
  LearningActivityType,
  CreativeProfession,
  CreativeSkillDetailItem,
  CreativeCircularProficiencyItem,
  CreativeSkillBarItem,
  CreativeCommunicationSkillItem,
  InternshipTrack,
  InternshipPreferences,
  LeadershipItem,
  VolunteerItem,
  MembershipItem,
  CertificationItem,
  LanguageItem,
  ReferenceItem,
} from '../../types/resume';
import { saveResume } from '../../services/resumeService';
import {
  TEMPLATE_DEFINITIONS,
  ELEGANT_SERIF_ORDER,
  MODERN_CORPORATE_ORDER,
  FRESHER_RESUME_ORDER,
  INTERNSHIP_RESUME_ORDER,
  ENGINEERING_RESUME_ORDER,
  CREATIVE_PROFESSIONAL_ORDER,
  getTemplateById,
  resolveTemplateId,
  type ResumeSectionKey,
} from '../../data/templates';
import {
  SAMPLE_ACADEMIC_CV,
  SAMPLE_CLASSIC_PROFESSIONAL_CV,
  SAMPLE_TWO_COLUMN_CV,
  SAMPLE_SOFTWARE_DEVELOPER_CV,
  SAMPLE_HARVARD_CV,
  SAMPLE_ELEGANT_SERIF_CV,
  SAMPLE_MODERN_CORPORATE_CV,
  SAMPLE_FRESHER_RESUME_CV,
  SAMPLE_INTERNSHIP_RESUME_CV,
  SAMPLE_ENGINEERING_RESUME_CV,
  SAMPLE_ENGINEERING_MECHANICAL_CV,
  SAMPLE_ENGINEERING_CSE_CV,
  SAMPLE_ENGINEERING_ECE_CV,
  SAMPLE_CREATIVE_PROFESSIONAL_CV,
  SAMPLE_CREATIVE_DESIGNER_CV,
  SAMPLE_CREATIVE_CYBERSECURITY_CV,
  SAMPLE_CREATIVE_MARKETING_CV,
  SAMPLE_EXPERIENCED_CV,
  SAMPLE_FRESHER_CV,
  SAMPLE_STUDENT_CV,
  BLANK_ACADEMIC_CV,
} from '../../data/sampleResumes';
import { analyzeResumeSections } from '../../utils/validation';
import {
  SKILL_MATRIX_LEGEND,
  getCreativeProficiencyHeading,
  getEffectiveInterests,
  getSkillMatrixLevelLabel,
  matchSoftwareDevSkillBucket,
  getSoftwareDevSkillBucketItems,
  type SoftwareDevSkillBucketKey,
} from '../../utils/resumePresentation';
import { getLanguageDotScore, validateDailyActivities } from '../../utils/dailyActivities';
import { validatePhotoFile, type PhotoCropShape } from '../../utils/photoCrop';
import { AiImproveModal } from '../AiAssistant/AiImproveModal';
import { AiInterviewModal } from '../AiAssistant/AiInterviewModal';
import { UploadCvModal } from '../AiExtraction/UploadCvModal';
import { CompletenessReportModal } from '../Completeness/CompletenessReportModal';
import { PhotoCropModal } from '../Common/PhotoCropModal';

const formatArrayField = (val: string[] | string | undefined): string => {
  if (Array.isArray(val)) return val.join(', ');
  return typeof val === 'string' ? val : '';
};

interface CommaArrayInputProps {
  value: string[] | string | undefined;
  onChange: (items: string[]) => void;
  placeholder?: string;
  className?: string;
  ariaLabel?: string;
}

const CommaArrayInput: React.FC<CommaArrayInputProps> = ({
  value,
  onChange,
  placeholder,
  className,
  ariaLabel,
}) => {
  const formatted = formatArrayField(value);
  const [draft, setDraft] = React.useState(formatted);
  const [focused, setFocused] = React.useState(false);

  React.useEffect(() => {
    if (!focused) {
      setDraft(formatted);
    }
  }, [formatted, focused]);

  return (
    <input
      type="text"
      value={draft}
      aria-label={ariaLabel}
      onFocus={() => setFocused(true)}
      onChange={(e) => {
        const next = e.target.value;
        setDraft(next);
        onChange(
          next
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean)
        );
      }}
      onBlur={() => {
        setFocused(false);
        const parsed = draft
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean);
        setDraft(parsed.join(', '));
        onChange(parsed);
      }}
      placeholder={placeholder}
      className={className}
    />
  );
};

interface ResumeEditorPageProps {
  initialResume: Resume;
  onSave: (resume: Resume) => void;
  onPreview: (resume: Resume) => void;
  onOpenTemplates?: (resume: Resume) => void;
  onBackToDashboard: () => void;
}

type EditorSectionId =
  | 'header'
  | 'objective'
  | 'experience'
  | 'research'
  | 'education'
  | 'study-abroad'
  | 'high-school'
  | 'thesis'
  | 'coursework'
  | 'projects'
  | 'daily-life'
  | 'publications'
  | 'philosophy'
  | 'languages'
  | 'skills'
  | 'lab-skills'
  | 'programming-languages'
  | 'developer-tools'
  | 'technologies-frameworks'
  | 'skill-matrix'
  | 'proficiency-circles'
  | 'skill-bars'
  | 'communication'
  | 'strengths'
  | 'learning'
  | 'interests'
  | 'career-interests'
  | 'custom-sections'
  | 'awards'
  | 'leadership'
  | 'volunteer'
  | 'memberships'
  | 'certifications'
  | 'additional'
  | 'references';

interface SectionConfig {
  id: EditorSectionId;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

const SECTIONS: SectionConfig[] = [
  { id: 'header', label: '1. Personal Information', icon: User },
  { id: 'objective', label: '2. Career Objective', icon: FileText },
  { id: 'experience', label: '3. Work Experience', icon: Briefcase },
  { id: 'education', label: '4. Education', icon: GraduationCap },
  { id: 'coursework', label: '4b. Relevant Coursework', icon: BookOpen },
  { id: 'projects', label: '5. Projects', icon: FolderGit2 },
  { id: 'publications', label: '6. Patents & Publications', icon: BookOpen },
  { id: 'skills', label: '7. Technical Skills', icon: Wrench },
  { id: 'awards', label: '8. Honors & Awards', icon: Trophy },
  { id: 'leadership', label: '9. Leadership Experience', icon: Users },
  { id: 'volunteer', label: '10. Volunteer Experience', icon: HeartHandshake },
  { id: 'memberships', label: '11. Professional Memberships', icon: BadgeCheck },
  { id: 'certifications', label: '12. Certifications', icon: Award },
  { id: 'additional', label: '13. Additional Information', icon: Globe },
  { id: 'references', label: '14. References', icon: Contact },
];

const CLASSIC_SECTIONS: SectionConfig[] = [
  { id: 'header', label: '1. Personal Info & Photo', icon: User },
  { id: 'objective', label: '2. Summary & Quote', icon: FileText },
  { id: 'education', label: '3. Education', icon: GraduationCap },
  { id: 'thesis', label: "4. Master's Thesis", icon: BookMarked },
  { id: 'experience', label: '5. Experience', icon: Briefcase },
  { id: 'languages', label: '6. Languages', icon: Globe },
  { id: 'skills', label: '7. Computer Skills', icon: Wrench },
  { id: 'skill-matrix', label: '8. Skill Matrix (1–5)', icon: SlidersHorizontal },
  { id: 'interests', label: '9. Interests', icon: Heart },
  { id: 'custom-sections', label: '10. Additional Info', icon: Layers },
  { id: 'references', label: '11. References', icon: Contact },
];

const TWO_COLUMN_SECTIONS: SectionConfig[] = [
  { id: 'header', label: '1. Header, Contact & Photo', icon: User },
  { id: 'experience', label: '2. Experience', icon: Briefcase },
  { id: 'projects', label: '3. Projects', icon: FolderGit2 },
  { id: 'daily-life', label: '4. A Day of My Life', icon: PieChart },
  { id: 'publications', label: '5. Publications', icon: BookOpen },
  { id: 'philosophy', label: '6. My Life Philosophy', icon: Quote },
  { id: 'awards', label: '7. Most Proud Of', icon: Trophy },
  { id: 'strengths', label: '8. Strengths', icon: Sparkles },
  { id: 'languages', label: '9. Languages', icon: Globe },
  { id: 'education', label: '10. Education', icon: GraduationCap },
  { id: 'references', label: '11. Referees', icon: Contact },
  { id: 'custom-sections', label: '12. Additional Sections', icon: Layers },
];

const SOFTWARE_DEV_SECTIONS: SectionConfig[] = [
  { id: 'header', label: '1. Header & Contact Links', icon: User },
  { id: 'education', label: '2. Education', icon: GraduationCap },
  { id: 'experience', label: '3. Experience', icon: Briefcase },
  { id: 'projects', label: '4. Projects', icon: FolderGit2 },
  { id: 'coursework', label: '5. Relevant Coursework', icon: BookOpen },
  { id: 'programming-languages', label: '6. Programming Languages', icon: Code2 },
  { id: 'developer-tools', label: '7. Developer Tools', icon: Terminal },
  { id: 'technologies-frameworks', label: '8. Technologies & Frameworks', icon: Cpu },
  { id: 'leadership', label: '9. Leadership & Activities', icon: Users },
  { id: 'certifications', label: '10. Certifications', icon: Award },
  { id: 'awards', label: '11. Achievements', icon: Trophy },
  { id: 'custom-sections', label: '12. Additional Subsections', icon: Layers },
];

const HARVARD_SECTIONS: SectionConfig[] = [
  { id: 'header', label: '1. Header & Contact Info', icon: User },
  { id: 'education', label: '2. Education', icon: GraduationCap },
  { id: 'study-abroad', label: '3. Study Abroad (Opt.)', icon: Globe },
  { id: 'high-school', label: '4. High School (Opt.)', icon: BookOpen },
  { id: 'experience', label: '5. Experience', icon: Briefcase },
  { id: 'leadership', label: '6. Leadership & Activities', icon: Users },
  { id: 'skills', label: '7. Technical Skills', icon: Wrench },
  { id: 'languages', label: '8. Languages', icon: Globe },
  { id: 'lab-skills', label: '9. Lab / Research Skills', icon: BookMarked },
  { id: 'interests', label: '10. Interests', icon: Heart },
  { id: 'awards', label: '11. Awards & Honors', icon: Trophy },
  { id: 'custom-sections', label: '12. Additional Information', icon: Layers },
];

const ELEGANT_SERIF_SECTION_CATALOG: Partial<
  Record<
    ResumeSectionKey,
    { editorId: EditorSectionId; baseLabel: string; icon: React.ComponentType<{ className?: string }>; optional?: boolean }
  >
> = {
  objective: { editorId: 'objective', baseLabel: 'Professional Profile', icon: FileText, optional: true },
  education: { editorId: 'education', baseLabel: 'Education', icon: GraduationCap },
  experience: { editorId: 'experience', baseLabel: 'Experience', icon: Briefcase },
  research: { editorId: 'research', baseLabel: 'Research Experience', icon: FlaskConical, optional: true },
  projects: { editorId: 'projects', baseLabel: 'Projects', icon: FolderGit2, optional: true },
  publications: { editorId: 'publications', baseLabel: 'Publications', icon: BookOpen, optional: true },
  achievements: { editorId: 'awards', baseLabel: 'Awards & Honors', icon: Trophy, optional: true },
  skills: { editorId: 'skills', baseLabel: 'Skills', icon: Wrench },
  languages: { editorId: 'languages', baseLabel: 'Languages', icon: Globe, optional: true },
  certifications: { editorId: 'certifications', baseLabel: 'Certifications', icon: Award, optional: true },
  leadership: { editorId: 'leadership', baseLabel: 'Leadership & Activities', icon: Users, optional: true },
  memberships: { editorId: 'memberships', baseLabel: 'Professional Memberships', icon: BadgeCheck, optional: true },
  interests: { editorId: 'interests', baseLabel: 'Interests', icon: Heart, optional: true },
  references: { editorId: 'references', baseLabel: 'References', icon: Contact, optional: true },
  'custom-sections': { editorId: 'custom-sections', baseLabel: 'Custom Sections', icon: Layers, optional: true },
};

const getNormalizedElegantSerifOrder = (orderOverride?: string[]): ResumeSectionKey[] => {
  const validSet = new Set<ResumeSectionKey>(ELEGANT_SERIF_ORDER);
  const custom = (orderOverride || []).filter(
    (k): k is ResumeSectionKey => validSet.has(k as ResumeSectionKey)
  );
  const seen = new Set<ResumeSectionKey>(custom);
  return [...custom, ...ELEGANT_SERIF_ORDER.filter((k) => !seen.has(k))];
};

const getElegantSerifSections = (orderOverride?: string[]): SectionConfig[] => {
  const orderedKeys = getNormalizedElegantSerifOrder(orderOverride);
  return [
    { id: 'header', label: '1. Header & Personal Info', icon: User },
    ...orderedKeys.map((key, idx) => {
      const meta = ELEGANT_SERIF_SECTION_CATALOG[key]!;
      return {
        id: meta.editorId,
        label: `${idx + 2}. ${meta.baseLabel}`,
        icon: meta.icon,
      };
    }),
  ];
};

const MODERN_CORPORATE_SECTION_CATALOG: Partial<
  Record<
    ResumeSectionKey,
    { editorId: EditorSectionId; baseLabel: string; icon: React.ComponentType<{ className?: string }>; optional?: boolean }
  >
> = {
  objective: { editorId: 'objective', baseLabel: 'Professional Summary', icon: FileText, optional: true },
  experience: { editorId: 'experience', baseLabel: 'Work Experience', icon: Briefcase },
  strengths: { editorId: 'strengths', baseLabel: 'Core Competencies', icon: Sparkles, optional: true },
  education: { editorId: 'education', baseLabel: 'Education', icon: GraduationCap },
  skills: { editorId: 'skills', baseLabel: 'Technical Skills', icon: Wrench, optional: true },
  projects: { editorId: 'projects', baseLabel: 'Projects', icon: FolderGit2, optional: true },
  certifications: { editorId: 'certifications', baseLabel: 'Certifications', icon: Award, optional: true },
  achievements: { editorId: 'awards', baseLabel: 'Awards & Achievements', icon: Trophy, optional: true },
  languages: { editorId: 'languages', baseLabel: 'Languages', icon: Globe, optional: true },
  leadership: { editorId: 'leadership', baseLabel: 'Leadership & Activities', icon: Users, optional: true },
  memberships: { editorId: 'memberships', baseLabel: 'Professional Memberships', icon: BadgeCheck, optional: true },
  interests: { editorId: 'interests', baseLabel: 'Interests', icon: Heart, optional: true },
  references: { editorId: 'references', baseLabel: 'References', icon: Contact, optional: true },
  'custom-sections': { editorId: 'custom-sections', baseLabel: 'Custom Sections', icon: Layers, optional: true },
};

const getNormalizedModernCorporateOrder = (orderOverride?: string[]): ResumeSectionKey[] => {
  const validSet = new Set<ResumeSectionKey>(MODERN_CORPORATE_ORDER);
  const custom = (orderOverride || []).filter(
    (k): k is ResumeSectionKey => validSet.has(k as ResumeSectionKey)
  );
  const seen = new Set<ResumeSectionKey>(custom);
  return [...custom, ...MODERN_CORPORATE_ORDER.filter((k) => !seen.has(k))];
};

const getModernCorporateSections = (orderOverride?: string[]): SectionConfig[] => {
  const orderedKeys = getNormalizedModernCorporateOrder(orderOverride);
  return [
    { id: 'header', label: '1. Header, Contacts & Photo', icon: User },
    ...orderedKeys.map((key, idx) => {
      const meta = MODERN_CORPORATE_SECTION_CATALOG[key]!;
      return {
        id: meta.editorId,
        label: `${idx + 2}. ${meta.baseLabel}`,
        icon: meta.icon,
      };
    }),
  ];
};

const FRESHER_RESUME_SECTION_CATALOG: Partial<
  Record<
    ResumeSectionKey,
    { editorId: EditorSectionId; baseLabel: string; icon: React.ComponentType<{ className?: string }>; optional?: boolean }
  >
> = {
  education: { editorId: 'education', baseLabel: 'Education', icon: GraduationCap },
  projects: { editorId: 'projects', baseLabel: 'Projects', icon: FolderGit2 },
  experience: { editorId: 'experience', baseLabel: 'Experience / Internships', icon: Briefcase, optional: true },
  coursework: { editorId: 'coursework', baseLabel: 'Relevant Coursework', icon: BookOpen, optional: true },
  skills: { editorId: 'skills', baseLabel: 'Skills', icon: Wrench },
  publications: { editorId: 'publications', baseLabel: 'Publications', icon: BookMarked, optional: true },
  achievements: { editorId: 'awards', baseLabel: 'Awards & Honors', icon: Trophy, optional: true },
  certifications: { editorId: 'certifications', baseLabel: 'Certifications', icon: Award, optional: true },
  leadership: { editorId: 'leadership', baseLabel: 'Leadership & Activities', icon: Users, optional: true },
  volunteer: { editorId: 'volunteer', baseLabel: 'Volunteer Experience', icon: HeartHandshake, optional: true },
  languages: { editorId: 'languages', baseLabel: 'Languages', icon: Globe, optional: true },
  additional: { editorId: 'additional', baseLabel: 'Interests & Additional Info', icon: Heart, optional: true },
  'custom-sections': { editorId: 'custom-sections', baseLabel: 'Custom Sections', icon: Layers, optional: true },
};

const getNormalizedFresherResumeOrder = (orderOverride?: string[]): ResumeSectionKey[] => {
  const validSet = new Set<ResumeSectionKey>(FRESHER_RESUME_ORDER);
  const custom = (orderOverride || []).filter(
    (k): k is ResumeSectionKey => validSet.has(k as ResumeSectionKey)
  );
  const seen = new Set<ResumeSectionKey>(custom);
  return [...custom, ...FRESHER_RESUME_ORDER.filter((k) => !seen.has(k))];
};

const getFresherResumeSections = (orderOverride?: string[]): SectionConfig[] => {
  const orderedKeys = getNormalizedFresherResumeOrder(orderOverride);
  return [
    { id: 'header', label: '1. Header & Contact Links', icon: User },
    { id: 'objective', label: '2. Highlights & Impact Summary', icon: FileText },
    ...orderedKeys.map((key, idx) => {
      const meta = FRESHER_RESUME_SECTION_CATALOG[key]!;
      return {
        id: meta.editorId,
        label: `${idx + 3}. ${meta.baseLabel}`,
        icon: meta.icon,
      };
    }),
  ];
};

const INTERNSHIP_RESUME_SECTIONS: SectionConfig[] = [
  { id: 'header', label: '1. Personal Info', icon: User },
  { id: 'education', label: '2. Education', icon: GraduationCap },
  { id: 'learning', label: '3. Learning & Training', icon: BookOpen },
  { id: 'interests', label: '4. Interests', icon: Heart },
  { id: 'research', label: '5. Research Work & Projects', icon: FlaskConical },
  { id: 'career-interests', label: '6. Career Interests', icon: Compass },
  { id: 'awards', label: '7. Co-Curricular & Events', icon: Trophy },
  { id: 'skills', label: '8. Technical Skills', icon: Wrench },
  { id: 'experience', label: '9. Internship Experience (Opt.)', icon: Briefcase },
  { id: 'custom-sections', label: '10. Additional Info & Review', icon: Layers },
];

const INTERNSHIP_RESUME_SECTION_CATALOG: Partial<
  Record<
    ResumeSectionKey,
    { editorId: EditorSectionId; baseLabel: string; icon: React.ComponentType<{ className?: string }>; optional?: boolean }
  >
> = {
  education: { editorId: 'education', baseLabel: 'Education', icon: GraduationCap },
  learning: { editorId: 'learning', baseLabel: 'Learning', icon: BookOpen, optional: true },
  interests: { editorId: 'interests', baseLabel: 'Interests', icon: Heart, optional: true },
  achievements: { editorId: 'awards', baseLabel: 'Co-Curricular / Events', icon: Trophy, optional: true },
  research: { editorId: 'research', baseLabel: 'Research Work & Projects', icon: FlaskConical },
  skills: { editorId: 'skills', baseLabel: 'Skills', icon: Wrench },
  'career-interests': { editorId: 'career-interests', baseLabel: 'Career Interests', icon: Compass, optional: true },
  experience: { editorId: 'experience', baseLabel: 'Internship Experience', icon: Briefcase, optional: true },
  certifications: { editorId: 'custom-sections', baseLabel: 'Certifications', icon: Award, optional: true },
  languages: { editorId: 'custom-sections', baseLabel: 'Languages', icon: Globe, optional: true },
  'custom-sections': { editorId: 'custom-sections', baseLabel: 'Additional Info & Custom', icon: Layers, optional: true },
};

const getNormalizedInternshipResumeOrder = (orderOverride?: string[]): ResumeSectionKey[] => {
  const validSet = new Set<ResumeSectionKey>(INTERNSHIP_RESUME_ORDER);
  const custom = (orderOverride || []).filter(
    (k): k is ResumeSectionKey => validSet.has(k as ResumeSectionKey)
  );
  const seen = new Set<ResumeSectionKey>(custom);
  return [...custom, ...INTERNSHIP_RESUME_ORDER.filter((k) => !seen.has(k))];
};

const ENGINEERING_SECTIONS: SectionConfig[] = [
  { id: 'header', label: '1. Personal Info', icon: User },
  { id: 'objective', label: '2. Career Objective', icon: FileText },
  { id: 'education', label: '3. Education', icon: GraduationCap },
  { id: 'skills', label: '4. Skills & Interests', icon: Wrench },
  { id: 'projects', label: '5. Projects', icon: FolderGit2 },
  { id: 'experience', label: '6. Internship & Trainings', icon: Briefcase },
  { id: 'leadership', label: '7. Position of Responsibility', icon: Users },
  { id: 'awards', label: '8. Extra-Curricular Activities', icon: Trophy },
  { id: 'custom-sections', label: '9. Additional Info', icon: Layers },
];

const ENGINEERING_RESUME_SECTION_CATALOG: Partial<
  Record<
    ResumeSectionKey,
    { editorId: EditorSectionId; baseLabel: string; icon: React.ComponentType<{ className?: string }>; optional?: boolean }
  >
> = {
  objective: { editorId: 'objective', baseLabel: 'Objective', icon: FileText, optional: true },
  education: { editorId: 'education', baseLabel: 'Education', icon: GraduationCap },
  skills: { editorId: 'skills', baseLabel: 'Skills and Interests', icon: Wrench },
  projects: { editorId: 'projects', baseLabel: 'Projects', icon: FolderGit2 },
  experience: { editorId: 'experience', baseLabel: 'Internship / Trainings', icon: Briefcase, optional: true },
  leadership: { editorId: 'leadership', baseLabel: 'Position of Responsibility', icon: Users, optional: true },
  achievements: { editorId: 'awards', baseLabel: 'Extra-Curricular Activities', icon: Trophy, optional: true },
  'custom-sections': { editorId: 'custom-sections', baseLabel: 'Additional Info', icon: Layers, optional: true },
};

const getNormalizedEngineeringResumeOrder = (orderOverride?: string[]): ResumeSectionKey[] => {
  const validSet = new Set<ResumeSectionKey>(ENGINEERING_RESUME_ORDER);
  const custom = (orderOverride || []).filter(
    (k): k is ResumeSectionKey => validSet.has(k as ResumeSectionKey)
  );
  const seen = new Set<ResumeSectionKey>(custom);
  return [...custom, ...ENGINEERING_RESUME_ORDER.filter((k) => !seen.has(k))];
};

const CREATIVE_PROFESSIONAL_SECTIONS: SectionConfig[] = [
  { id: 'header', label: '1. Header, Title & Quote', icon: User },
  { id: 'experience', label: '2. Short Resume', icon: Briefcase },
  { id: 'education', label: '3. Degrees', icon: GraduationCap },
  { id: 'skills', label: '4. Categorized Skills', icon: Wrench },
  { id: 'proficiency-circles', label: '5. Circular Proficiencies', icon: PieChart },
  { id: 'skill-bars', label: '6. Skills & Proficiency Bars', icon: SlidersHorizontal },
  { id: 'communication', label: '7. Communication Skills', icon: MessageSquare },
  { id: 'certifications', label: '8. Certificates & Grants', icon: Award },
  { id: 'languages', label: '9. Languages (5-Dot)', icon: Globe },
  { id: 'publications', label: '10. Talks & Publications', icon: BookOpen },
  { id: 'custom-sections', label: '11. Projects & Additional', icon: Layers },
];

const CREATIVE_PROFESSIONAL_SECTION_CATALOG: Partial<
  Record<
    ResumeSectionKey,
    { editorId: EditorSectionId; baseLabel: string; icon: React.ComponentType<{ className?: string }>; optional?: boolean }
  >
> = {
  experience: { editorId: 'experience', baseLabel: 'Short Resume (Experience)', icon: Briefcase },
  skills: { editorId: 'skills', baseLabel: 'Categorized Skills', icon: Wrench },
  'proficiency-circles': { editorId: 'proficiency-circles', baseLabel: 'Circular Proficiencies', icon: PieChart },
  communication: { editorId: 'communication', baseLabel: 'Communication Skills', icon: MessageSquare, optional: true },
  projects: { editorId: 'projects', baseLabel: 'Projects (Overflow)', icon: FolderGit2, optional: true },
  leadership: { editorId: 'leadership', baseLabel: 'Leadership (Overflow)', icon: Users, optional: true },
  education: { editorId: 'education', baseLabel: 'Degrees (Education)', icon: GraduationCap },
  'skill-bars': { editorId: 'skill-bars', baseLabel: 'Skills & Proficiency Bars', icon: SlidersHorizontal },
  certifications: { editorId: 'certifications', baseLabel: 'Certificates & Grants', icon: Award, optional: true },
  languages: { editorId: 'languages', baseLabel: 'Languages', icon: Globe, optional: true },
  publications: { editorId: 'publications', baseLabel: 'Talks & Publications', icon: BookOpen, optional: true },
  volunteer: { editorId: 'volunteer', baseLabel: 'Volunteer & Community', icon: HeartHandshake, optional: true },
  memberships: { editorId: 'memberships', baseLabel: 'Memberships', icon: BadgeCheck, optional: true },
  'custom-sections': { editorId: 'custom-sections', baseLabel: 'Custom Sections', icon: Layers, optional: true },
};

const getNormalizedCreativeProfessionalOrder = (orderOverride?: string[]): ResumeSectionKey[] => {
  const validSet = new Set<ResumeSectionKey>(CREATIVE_PROFESSIONAL_ORDER);
  const custom = (orderOverride || []).filter(
    (k): k is ResumeSectionKey => validSet.has(k as ResumeSectionKey)
  );
  const seen = new Set<ResumeSectionKey>(custom);
  return [...custom, ...CREATIVE_PROFESSIONAL_ORDER.filter((k) => !seen.has(k))];
};

const JAKES_EDITOR_SECTIONS = new Set<EditorSectionId>([
  'header',
  'education',
  'coursework',
  'experience',
  'projects',
  'skills',
  'leadership',
]);

const computeResumeFingerprint = (r: Resume): string =>
  JSON.stringify({ ...r, updatedAt: '' });

export const ResumeEditorPage: React.FC<ResumeEditorPageProps> = ({
  initialResume,
  onSave,
  onPreview,
  onOpenTemplates,
  onBackToDashboard,
}) => {
  const [resume, setResume] = useState<Resume>(initialResume);
  const [activeSection, setActiveSection] = useState<EditorSectionId>('header');
  const [saving, setSaving] = useState(false);
  const [justSaved, setJustSaved] = useState(false);
  const [autoSaveState, setAutoSaveState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [autoSaveError, setAutoSaveError] = useState<string | null>(null);
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [isInterviewOpen, setIsInterviewOpen] = useState(false);
  const [isCompletenessOpen, setIsCompletenessOpen] = useState(false);
  const [showSectionManager, setShowSectionManager] = useState(false);

  const latestResumeRef = useRef<Resume>(resume);
  latestResumeRef.current = resume;
  const onSaveRef = useRef(onSave);
  onSaveRef.current = onSave;
  const lastSavedFingerprintRef = useRef<string>(computeResumeFingerprint(initialResume));
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const saveQueueRef = useRef<Promise<void>>(Promise.resolve());
  const saveTokenRef = useRef<number>(0);
  const [courseworkDraft, setCourseworkDraft] = useState('');
  const [strengthDraft, setStrengthDraft] = useState('');
  const [labSkillDraft, setLabSkillDraft] = useState('');
  const [careerInterestDraft, setCareerInterestDraft] = useState('');
  const [skillBucketDraft, setSkillBucketDraft] = useState<Record<SoftwareDevSkillBucketKey, string>>({
    'programming-languages': '',
    'developer-tools': '',
    'technologies-frameworks': '',
  });
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [photoCropModal, setPhotoCropModal] = useState<{
    isOpen: boolean;
    imageSrc: string;
  }>({ isOpen: false, imageSrc: '' });
  const [improveModal, setImproveModal] = useState<{
    isOpen: boolean;
    originalText: string;
    sectionType: string;
    context?: string;
    onApply: (text: string) => void;
  }>({
    isOpen: false,
    originalText: '',
    sectionType: 'general',
    onApply: () => {},
  });
  const [lastImproveUndo, setLastImproveUndo] = useState<{
    label: string;
    originalText: string;
    onRestore: () => void;
  } | null>(null);

  const activeTemplateId = resolveTemplateId(resume.template);
  const activeTemplate = getTemplateById(activeTemplateId);
  const isJakesTemplate = activeTemplateId === 'jakes-resume';
  const isClassicTemplate = activeTemplateId === 'classic-professional';
  const isTwoColumnTemplate = activeTemplateId === 'two-column-professional';
  const isSoftwareDevTemplate = activeTemplateId === 'software-developer';
  const isHarvardTemplate = activeTemplateId === 'harvard-style';
  const isElegantSerifTemplate = activeTemplateId === 'elegant-serif';
  const isModernCorporateTemplate = activeTemplateId === 'modern-corporate';
  const isFresherResumeTemplate = activeTemplateId === 'fresher-resume';
  const isInternshipResumeTemplate = activeTemplateId === 'internship-resume';
  const isEngineeringResumeTemplate = activeTemplateId === 'engineering-resume';
  const isCreativeProfessionalTemplate = activeTemplateId === 'creative-professional';
  const ELEGANT_SERIF_SECTIONS = getElegantSerifSections(resume.sectionOrderOverride);
  const MODERN_CORPORATE_SECTIONS = getModernCorporateSections(resume.sectionOrderOverride);
  const FRESHER_RESUME_SECTIONS = getFresherResumeSections(resume.sectionOrderOverride);
  const sidebarSections = isTwoColumnTemplate
    ? TWO_COLUMN_SECTIONS
    : isClassicTemplate
    ? CLASSIC_SECTIONS
    : isSoftwareDevTemplate
    ? SOFTWARE_DEV_SECTIONS
    : isHarvardTemplate
    ? HARVARD_SECTIONS
    : isElegantSerifTemplate
    ? ELEGANT_SERIF_SECTIONS
    : isModernCorporateTemplate
    ? MODERN_CORPORATE_SECTIONS
    : isFresherResumeTemplate
    ? FRESHER_RESUME_SECTIONS
    : isInternshipResumeTemplate
    ? INTERNSHIP_RESUME_SECTIONS
    : isEngineeringResumeTemplate
    ? ENGINEERING_SECTIONS
    : isCreativeProfessionalTemplate
    ? CREATIVE_PROFESSIONAL_SECTIONS
    : SECTIONS;
  const navSections = isTwoColumnTemplate
    ? TWO_COLUMN_SECTIONS
    : isClassicTemplate
    ? CLASSIC_SECTIONS
    : isSoftwareDevTemplate
    ? SOFTWARE_DEV_SECTIONS
    : isHarvardTemplate
    ? HARVARD_SECTIONS
    : isElegantSerifTemplate
    ? ELEGANT_SERIF_SECTIONS
    : isModernCorporateTemplate
    ? MODERN_CORPORATE_SECTIONS
    : isFresherResumeTemplate
    ? FRESHER_RESUME_SECTIONS
    : isInternshipResumeTemplate
    ? INTERNSHIP_RESUME_SECTIONS
    : isEngineeringResumeTemplate
    ? ENGINEERING_SECTIONS
    : isCreativeProfessionalTemplate
    ? CREATIVE_PROFESSIONAL_SECTIONS
    : isJakesTemplate
    ? SECTIONS.filter((s) => JAKES_EDITOR_SECTIONS.has(s.id))
    : SECTIONS;
  const completenessReport = analyzeResumeSections(resume);
  const dailyValidation = validateDailyActivities(resume.dailyActivities || []);

  const sectionReportToEditorId = (sectionId: string): EditorSectionId => {
    if (
      isTwoColumnTemplate ||
      isSoftwareDevTemplate ||
      isHarvardTemplate ||
      isElegantSerifTemplate ||
      isModernCorporateTemplate ||
      isFresherResumeTemplate ||
      isInternshipResumeTemplate ||
      isEngineeringResumeTemplate ||
      isCreativeProfessionalTemplate
    ) {
      if (sectionId === 'personalInfo' || sectionId === 'header') return 'header';
      if (sectionId === 'achievements') return 'awards';
      if (isFresherResumeTemplate && sectionId === 'strengths') return 'objective';
      return sectionId as EditorSectionId;
    }
    if (isClassicTemplate) {
      if (sectionId === 'personalInfo' || sectionId === 'header') return 'header';
      return sectionId as EditorSectionId;
    }
    switch (sectionId) {
      case 'personalInfo':
        return 'header';
      case 'achievements':
        return 'awards';
      case 'languages':
        return 'additional';
      default:
        return sectionId as EditorSectionId;
    }
  };

  const getEditorSectionStatus = (editorId: EditorSectionId) => {
    if (isCreativeProfessionalTemplate && editorId === 'proficiency-circles') {
      const hasCircles = Boolean(
        resume.circularProficiencies && resume.circularProficiencies.some((c) => c.name?.trim())
      );
      return {
        sectionId: 'proficiency-circles',
        name: '5. Circular Proficiencies',
        status: hasCircles ? ('complete' as const) : ('needs_details' as const),
        statusLabel: hasCircles ? 'Completed' : 'In Progress',
        isOptional: false,
        score: hasCircles ? 100 : 0,
        issues: [],
        suggestions: [],
      };
    }
    if (isCreativeProfessionalTemplate && editorId === 'skill-bars') {
      const hasBars = Boolean(
        resume.creativeSkillBars && resume.creativeSkillBars.some((b) => b.name?.trim())
      );
      return {
        sectionId: 'skill-bars',
        name: '6. Skills & Proficiency Bars',
        status: hasBars ? ('complete' as const) : ('needs_details' as const),
        statusLabel: hasBars ? 'Completed' : 'In Progress',
        isOptional: false,
        score: hasBars ? 100 : 0,
        issues: [],
        suggestions: [],
      };
    }
    if (isHarvardTemplate && editorId === 'awards') {
      const hasAwards = Boolean(
        resume.achievements && resume.achievements.some((a) => a.title?.trim() || a.description?.trim())
      );
      return {
        sectionId: 'awards',
        name: '11. Awards & Honors',
        status: hasAwards ? ('complete' as const) : ('optional_empty' as const),
        statusLabel: hasAwards ? 'Completed' : 'Optional / Skipped',
        isOptional: true,
        score: hasAwards ? 100 : 0,
        issues: [],
        suggestions: [],
      };
    }
    if (
      isTwoColumnTemplate ||
      isSoftwareDevTemplate ||
      isHarvardTemplate ||
      isElegantSerifTemplate ||
      isModernCorporateTemplate ||
      isFresherResumeTemplate ||
      isInternshipResumeTemplate ||
      isEngineeringResumeTemplate ||
      isCreativeProfessionalTemplate
    ) {
      const mapped = editorId === 'awards' ? 'achievements' : editorId;
      return completenessReport.sections.find(
        (s) => s.sectionId === editorId || s.sectionId === mapped
      );
    }
    if (isClassicTemplate) {
      return completenessReport.sections.find((s) => s.sectionId === editorId);
    }
    const mappedId =
      editorId === 'header'
        ? isJakesTemplate
          ? 'header'
          : 'personalInfo'
        : editorId === 'awards'
        ? 'achievements'
        : editorId === 'additional'
        ? 'languages'
        : editorId;
    return completenessReport.sections.find((s) => s.sectionId === mappedId);
  };

  const jakesMissingPrompts = isJakesTemplate
    ? completenessReport.sections.filter((s) => s.status !== 'complete')
    : [];

  const handleOpenImprove = (
    originalText: string,
    sectionType: string,
    context?: string,
    onApplyCallback?: (improved: string) => void
  ) => {
    if (!originalText || originalText.trim().length === 0) return;
    const applyWithUndo = (improved: string) => {
      if (onApplyCallback) {
        onApplyCallback(improved);
        setLastImproveUndo({
          label: sectionType,
          originalText,
          onRestore: () => {
            onApplyCallback(originalText);
            setLastImproveUndo(null);
          },
        });
      }
    };
    setImproveModal({
      isOpen: true,
      originalText,
      sectionType,
      context,
      onApply: applyWithUndo,
    });
  };

  const enqueueSave = useCallback(
    (
      candidate: Resume,
      opts?: { syncParent?: boolean; showManualSavedBadge?: boolean; force?: boolean }
    ) => {
      if (!candidate.id?.trim() || !candidate.userId?.trim()) {
        return Promise.resolve();
      }
      const fp = computeResumeFingerprint(candidate);
      if (!opts?.force && fp === lastSavedFingerprintRef.current) {
        return saveQueueRef.current;
      }
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
        debounceTimerRef.current = null;
      }

      const token = ++saveTokenRef.current;
      setAutoSaveState('saving');
      setAutoSaveError(null);

      const task = saveQueueRef.current
        .catch(() => undefined)
        .then(async () => {
          // Skip superseded snapshots if a newer edit has already queued behind this task
          if (token !== saveTokenRef.current) return;
          await saveResume(candidate.userId, candidate);
          if (token === saveTokenRef.current) {
            lastSavedFingerprintRef.current = fp;
            setAutoSaveState('saved');
            setAutoSaveError(null);
            if (opts?.syncParent !== false) {
              onSaveRef.current(candidate);
            }
            if (opts?.showManualSavedBadge) {
              setJustSaved(true);
              setTimeout(() => setJustSaved(false), 2000);
            }
          }
        })
        .catch((e: unknown) => {
          if (token === saveTokenRef.current) {
            console.error('Save failed:', e);
            setAutoSaveState('error');
            setAutoSaveError(e instanceof Error ? e.message : 'Unable to save changes.');
          }
        });

      saveQueueRef.current = task;
      return task;
    },
    []
  );

  const flushPendingSave = useCallback(
    async (candidate?: Resume, force = false) => {
      const target = candidate || latestResumeRef.current;
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
        debounceTimerRef.current = null;
      }
      await enqueueSave(target, { force });
    },
    [enqueueSave]
  );

  useEffect(() => {
    if (!resume.id?.trim() || !resume.userId?.trim()) return;
    const fp = computeResumeFingerprint(resume);
    if (fp === lastSavedFingerprintRef.current) return;

    setAutoSaveState('saving');
    setAutoSaveError(null);
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    debounceTimerRef.current = setTimeout(() => {
      debounceTimerRef.current = null;
      void enqueueSave(latestResumeRef.current);
    }, 650);

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
        debounceTimerRef.current = null;
      }
    };
  }, [resume, enqueueSave]);

  useEffect(() => {
    const flushOnExit = () => {
      const current = latestResumeRef.current;
      if (!current.id?.trim() || !current.userId?.trim()) return;
      if (computeResumeFingerprint(current) === lastSavedFingerprintRef.current) return;
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
        debounceTimerRef.current = null;
      }
      void saveResume(current.userId, current);
      onSaveRef.current(current);
      lastSavedFingerprintRef.current = computeResumeFingerprint(current);
    };

    window.addEventListener('beforeunload', flushOnExit);
    window.addEventListener('pagehide', flushOnExit);
    return () => {
      window.removeEventListener('beforeunload', flushOnExit);
      window.removeEventListener('pagehide', flushOnExit);
      flushOnExit();
    };
  }, []);

  const updateField = <K extends keyof Resume>(field: K, val: Resume[K]) => {
    setResume((prev) => ({
      ...prev,
      [field]: val,
      updatedAt: new Date().toISOString(),
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await enqueueSave(latestResumeRef.current, {
        force: true,
        showManualSavedBadge: true,
      });
    } finally {
      setSaving(false);
    }
  };

  const handlePreviewClick = async () => {
    await flushPendingSave(latestResumeRef.current);
    onPreview(latestResumeRef.current);
  };

  const handleOpenTemplatesClick = async () => {
    if (!onOpenTemplates) return;
    await flushPendingSave(latestResumeRef.current);
    onOpenTemplates(latestResumeRef.current);
  };

  const handleBackToDashboardClick = async () => {
    await flushPendingSave(latestResumeRef.current);
    onBackToDashboard();
  };

  const handleSwitchTemplate = async (newTemplateId: string) => {
    await flushPendingSave(latestResumeRef.current);
    const current = latestResumeRef.current;
    const nextTemplate = getTemplateById(newTemplateId);
    const updated: Resume = {
      ...current,
      template: nextTemplate.id,
      fontFamily: nextTemplate.defaultCustomization.fontFamily,
      themeColor: nextTemplate.defaultCustomization.accentColor,
      customization: { ...nextTemplate.defaultCustomization },
      updatedAt: new Date().toISOString(),
    };
    const nextSections =
      nextTemplate.id === 'two-column-professional'
        ? TWO_COLUMN_SECTIONS
        : nextTemplate.id === 'classic-professional'
        ? CLASSIC_SECTIONS
        : nextTemplate.id === 'software-developer'
        ? SOFTWARE_DEV_SECTIONS
        : nextTemplate.id === 'harvard-style'
        ? HARVARD_SECTIONS
        : nextTemplate.id === 'elegant-serif'
        ? getElegantSerifSections(updated.sectionOrderOverride)
        : nextTemplate.id === 'modern-corporate'
        ? getModernCorporateSections(updated.sectionOrderOverride)
        : nextTemplate.id === 'fresher-resume'
        ? getFresherResumeSections(updated.sectionOrderOverride)
        : nextTemplate.id === 'internship-resume'
        ? INTERNSHIP_RESUME_SECTIONS
        : nextTemplate.id === 'engineering-resume'
        ? ENGINEERING_SECTIONS
        : nextTemplate.id === 'creative-professional'
        ? CREATIVE_PROFESSIONAL_SECTIONS
        : nextTemplate.id === 'jakes-resume'
        ? SECTIONS.filter((s) => JAKES_EDITOR_SECTIONS.has(s.id))
        : SECTIONS;
    if (!nextSections.some((s) => s.id === activeSection)) {
      setActiveSection('header');
    }
    setResume(updated);
    await enqueueSave(updated, { force: true });
  };

  const handleLoadProfile = (
    type:
      | 'academic'
      | 'classic'
      | 'two-column'
      | 'software-developer'
      | 'harvard'
      | 'elegant-serif'
      | 'modern-corporate'
      | 'fresher-resume'
      | 'internship-resume'
      | 'engineering-resume'
      | 'engineering-mechanical'
      | 'engineering-cse'
      | 'engineering-ece'
      | 'creative-professional'
      | 'creative-designer'
      | 'creative-cybersecurity'
      | 'creative-marketing'
      | 'experienced'
      | 'fresher'
      | 'student'
      | 'blank'
  ) => {
    const confirmation = window.confirm(
      `Load sample profile for "${type.toUpperCase()}"? This will populate fields with standard CV data.`
    );
    if (!confirmation) return;

    let sampleBase: Omit<Resume, 'id' | 'userId' | 'createdAt' | 'updatedAt'>;
    switch (type) {
      case 'academic':
        sampleBase = SAMPLE_ACADEMIC_CV;
        break;
      case 'classic':
        sampleBase = SAMPLE_CLASSIC_PROFESSIONAL_CV;
        break;
      case 'two-column':
        sampleBase = SAMPLE_TWO_COLUMN_CV;
        break;
      case 'software-developer':
        sampleBase = SAMPLE_SOFTWARE_DEVELOPER_CV;
        break;
      case 'harvard':
        sampleBase = SAMPLE_HARVARD_CV;
        break;
      case 'elegant-serif':
        sampleBase = SAMPLE_ELEGANT_SERIF_CV;
        break;
      case 'modern-corporate':
        sampleBase = SAMPLE_MODERN_CORPORATE_CV;
        break;
      case 'fresher-resume':
        sampleBase = SAMPLE_FRESHER_RESUME_CV;
        break;
      case 'internship-resume':
        sampleBase = SAMPLE_INTERNSHIP_RESUME_CV;
        break;
      case 'engineering-resume':
      case 'engineering-mechanical':
        sampleBase = SAMPLE_ENGINEERING_MECHANICAL_CV;
        break;
      case 'engineering-cse':
        sampleBase = SAMPLE_ENGINEERING_CSE_CV;
        break;
      case 'engineering-ece':
        sampleBase = SAMPLE_ENGINEERING_ECE_CV;
        break;
      case 'creative-professional':
        sampleBase = SAMPLE_CREATIVE_PROFESSIONAL_CV;
        break;
      case 'creative-designer':
        sampleBase = SAMPLE_CREATIVE_DESIGNER_CV;
        break;
      case 'creative-cybersecurity':
        sampleBase = SAMPLE_CREATIVE_CYBERSECURITY_CV;
        break;
      case 'creative-marketing':
        sampleBase = SAMPLE_CREATIVE_MARKETING_CV;
        break;
      case 'experienced':
        sampleBase = SAMPLE_EXPERIENCED_CV;
        break;
      case 'fresher':
        sampleBase = SAMPLE_FRESHER_CV;
        break;
      case 'student':
        sampleBase = SAMPLE_STUDENT_CV;
        break;
      case 'blank':
        sampleBase = BLANK_ACADEMIC_CV;
        break;
    }

    const updated: Resume = {
      ...BLANK_ACADEMIC_CV,
      ...sampleBase,
      id: resume.id,
      userId: resume.userId,
      createdAt: resume.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    setActiveSection('header');
    setResume(updated);
    void enqueueSave(updated, { force: true });
  };

  const isManagedAwardsAliasTemplate =
    isElegantSerifTemplate ||
    isModernCorporateTemplate ||
    isFresherResumeTemplate ||
    isInternshipResumeTemplate ||
    isEngineeringResumeTemplate;

  const toCanonicalSectionKey = (sectionId: string): string =>
    isManagedAwardsAliasTemplate && sectionId === 'awards' ? 'achievements' : sectionId;

  const toggleSectionVisibility = (sectionId: string) => {
    const hidden = resume.hiddenSections || [];
    const canonical = toCanonicalSectionKey(sectionId);
    const isCurrentlyHidden =
      hidden.includes(sectionId) ||
      (isManagedAwardsAliasTemplate &&
        (hidden.includes(canonical) ||
          (canonical === 'achievements' && hidden.includes('awards'))));
    const cleaned = hidden.filter(
      (id) =>
        id !== sectionId &&
        id !== canonical &&
        !(isManagedAwardsAliasTemplate && canonical === 'achievements' && id === 'awards')
    );
    const newHidden = isCurrentlyHidden ? cleaned : [...cleaned, canonical];
    updateField('hiddenSections', newHidden);
  };

  const isSectionHidden = (sectionId: string) => {
    const hidden = resume.hiddenSections || [];
    if (hidden.includes(sectionId)) return true;
    if (isManagedAwardsAliasTemplate && sectionId === 'awards') {
      return hidden.includes('achievements');
    }
    if (isManagedAwardsAliasTemplate && sectionId === 'achievements') {
      return hidden.includes('awards');
    }
    return false;
  };

  const moveElegantSerifSection = (key: ResumeSectionKey, delta: -1 | 1) => {
    const currentOrder = isModernCorporateTemplate
      ? getNormalizedModernCorporateOrder(resume.sectionOrderOverride)
      : isFresherResumeTemplate
      ? getNormalizedFresherResumeOrder(resume.sectionOrderOverride)
      : isInternshipResumeTemplate
      ? getNormalizedInternshipResumeOrder(resume.sectionOrderOverride)
      : isEngineeringResumeTemplate
      ? getNormalizedEngineeringResumeOrder(resume.sectionOrderOverride)
      : isCreativeProfessionalTemplate
      ? getNormalizedCreativeProfessionalOrder(resume.sectionOrderOverride)
      : getNormalizedElegantSerifOrder(resume.sectionOrderOverride);
    const idx = currentOrder.indexOf(key);
    const target = idx + delta;
    if (idx < 0 || target < 0 || target >= currentOrder.length) return;
    const next = [...currentOrder];
    const [moved] = next.splice(idx, 1);
    next.splice(target, 0, moved);
    updateField('sectionOrderOverride', next);
  };

  const resetElegantSerifLayout = () => {
    setResume((prev) => ({
      ...prev,
      sectionOrderOverride: undefined,
      hiddenSections: [],
      updatedAt: new Date().toISOString(),
    }));
  };

  const moveArrayItem = <
    K extends
      | 'education'
      | 'experience'
      | 'researchExperience'
      | 'projects'
      | 'publications'
      | 'leadership'
      | 'certifications'
      | 'achievements'
      | 'creativeSkillItems'
      | 'circularProficiencies'
      | 'creativeSkillBars'
      | 'communicationSkills'
  >(
    field: K,
    index: number,
    delta: -1 | 1
  ) => {
    const arr = [...((resume[field] as any[]) || [])];
    const target = index + delta;
    if (target < 0 || target >= arr.length) return;
    const [moved] = arr.splice(index, 1);
    arr.splice(target, 0, moved);
    updateField(field, arr as Resume[K]);
  };

  const SOFTWARE_DEV_BUCKET_TITLES: Record<SoftwareDevSkillBucketKey, string> = {
    'programming-languages': 'Programming Languages',
    'developer-tools': 'Developer Tools',
    'technologies-frameworks': 'Technologies & Frameworks',
  };

  const setSoftwareDevBucketSkills = (bucket: SoftwareDevSkillBucketKey, nextSkills: string[]) => {
    const canonicalTitle = SOFTWARE_DEV_BUCKET_TITLES[bucket];
    const seen = new Set<string>();
    const deduped = nextSkills
      .map((s) => s.trim())
      .filter((s) => {
        if (!s || seen.has(s.toLowerCase())) return false;
        seen.add(s.toLowerCase());
        return true;
      });
    const otherCategories = (resume.skills || []).filter(
      (cat) => matchSoftwareDevSkillBucket(cat.category) !== bucket
    );
    const existingMatch = (resume.skills || []).find(
      (cat) => matchSoftwareDevSkillBucket(cat.category) === bucket
    );
    const nextSkillCategories: SkillCategory[] =
      deduped.length > 0
        ? [
            ...otherCategories,
            {
              id: existingMatch?.id || `skill_${bucket}`,
              category: canonicalTitle,
              skills: deduped,
            },
          ]
        : otherCategories;
    updateField('skills', nextSkillCategories);
  };

  const addSoftwareDevSkillTags = (bucket: SoftwareDevSkillBucketKey, rawInput: string) => {
    const incoming = rawInput
      .split(/[,;\n]+/)
      .map((s) => s.trim())
      .filter(Boolean);
    if (incoming.length === 0) return;
    const current = getSoftwareDevSkillBucketItems(resume.skills, bucket);
    setSoftwareDevBucketSkills(bucket, [...current, ...incoming]);
    setSkillBucketDraft((prev) => ({ ...prev, [bucket]: '' }));
  };

  const removeSoftwareDevSkillTag = (bucket: SoftwareDevSkillBucketKey, index: number) => {
    const current = getSoftwareDevSkillBucketItems(resume.skills, bucket);
    setSoftwareDevBucketSkills(
      bucket,
      current.filter((_, i) => i !== index)
    );
  };

  /* ====================== SUB-SECTION HANDLERS ====================== */
  // Personal Info
  const updatePersonalInfo = (field: keyof PersonalInfo, val: string) => {
    updateField('personalInfo', {
      ...resume.personalInfo,
      [field]: val,
    });
  };

  const handlePhotoFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const check = validatePhotoFile(file);
    if (!check.valid) {
      setPhotoError(check.error || 'Unsupported image file.');
      e.target.value = '';
      return;
    }
    setPhotoError(null);
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setPhotoCropModal({ isOpen: true, imageSrc: reader.result });
      }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleApplyCroppedPhoto = (dataUrl: string, shape: PhotoCropShape) => {
    updateField('personalInfo', {
      ...resume.personalInfo,
      photoUrl: dataUrl,
      photoShape: shape,
    });
    setPhotoCropModal({ isOpen: false, imageSrc: '' });
  };

  const handleRemovePhoto = () => {
    updateField('personalInfo', {
      ...resume.personalInfo,
      photoUrl: '',
    });
    setPhotoCropModal({ isOpen: false, imageSrc: '' });
  };

  // Education
  const addEducation = () => {
    const item: EducationItem = {
      id: `edu_${Date.now()}`,
      institution: '',
      degree: '',
      specialization: '',
      location: '',
      startDate: '',
      endDate: '',
      current: false,
      grade: '',
      achievements: '',
    };
    updateField('education', [...(resume.education || []), item]);
  };
  const updateEducation = (id: string, updates: Partial<EducationItem>) => {
    updateField(
      'education',
      (resume.education || []).map((e) => (e.id === id ? { ...e, ...updates } : e))
    );
  };
  const deleteEducation = (id: string) => {
    updateField(
      'education',
      (resume.education || []).filter((e) => e.id !== id)
    );
  };

  // Study Abroad (Harvard optional)
  const addStudyAbroad = () => {
    const item: StudyAbroadItem = {
      id: `abroad_${Date.now()}`,
      institution: '',
      cityCountry: '',
      coursework: '',
      startDate: '',
      endDate: '',
    };
    updateField('studyAbroad', [...(resume.studyAbroad || []), item]);
  };
  const updateStudyAbroad = (id: string, updates: Partial<StudyAbroadItem>) => {
    updateField(
      'studyAbroad',
      (resume.studyAbroad || []).map((s) => (s.id === id ? { ...s, ...updates } : s))
    );
  };
  const deleteStudyAbroad = (id: string) => {
    updateField(
      'studyAbroad',
      (resume.studyAbroad || []).filter((s) => s.id !== id)
    );
  };

  // High School Education (Harvard optional)
  const addHighSchool = () => {
    const item: HighSchoolItem = {
      id: `hs_${Date.now()}`,
      schoolName: '',
      location: '',
      graduationDate: '',
      gpa: '',
      testScores: '',
      honors: '',
    };
    updateField('highSchool', [...(resume.highSchool || []), item]);
  };
  const updateHighSchool = (id: string, updates: Partial<HighSchoolItem>) => {
    updateField(
      'highSchool',
      (resume.highSchool || []).map((h) => (h.id === id ? { ...h, ...updates } : h))
    );
  };
  const deleteHighSchool = (id: string) => {
    updateField(
      'highSchool',
      (resume.highSchool || []).filter((h) => h.id !== id)
    );
  };

  // Laboratory & Research Skills (Harvard optional)
  const addLabSkillsFromDraft = () => {
    const incoming = labSkillDraft
      .split(/[,;\n]+/)
      .map((s) => s.trim())
      .filter(Boolean);
    if (incoming.length === 0) return;
    const existing = resume.labSkills || [];
    const seen = new Set(existing.map((s) => s.toLowerCase()));
    const next = [...existing];
    for (const item of incoming) {
      if (!seen.has(item.toLowerCase())) {
        next.push(item);
        seen.add(item.toLowerCase());
      }
    }
    updateField('labSkills', next);
    setLabSkillDraft('');
  };
  const removeLabSkill = (index: number) => {
    updateField(
      'labSkills',
      (resume.labSkills || []).filter((_, i) => i !== index)
    );
  };

  // Relevant Coursework
  const addCourseworkFromDraft = () => {
    const items = courseworkDraft
      .split(/[,;\n]+/)
      .map((s) => s.trim())
      .filter(Boolean);
    if (items.length === 0) return;
    const existing = resume.coursework || [];
    const existingSet = new Set(existing.map((c) => c.toLowerCase()));
    const merged = [...existing];
    for (const item of items) {
      if (!existingSet.has(item.toLowerCase())) {
        merged.push(item);
        existingSet.add(item.toLowerCase());
      }
    }
    updateField('coursework', merged);
    setCourseworkDraft('');
  };
  const updateCourseworkItem = (index: number, value: string) => {
    const next = [...(resume.coursework || [])];
    next[index] = value;
    updateField('coursework', next);
  };
  const deleteCourseworkItem = (index: number) => {
    updateField(
      'coursework',
      (resume.coursework || []).filter((_, i) => i !== index)
    );
  };

  // Experience
  const addExperience = () => {
    const item: ExperienceItem = {
      id: `exp_${Date.now()}`,
      company: '',
      position: '',
      location: '',
      employmentType: 'Full-Time',
      startDate: '',
      endDate: '',
      current: false,
      highlights: [''],
    };
    updateField('experience', [...(resume.experience || []), item]);
  };
  const updateExperience = (id: string, updates: Partial<ExperienceItem>) => {
    updateField(
      'experience',
      (resume.experience || []).map((e) => (e.id === id ? { ...e, ...updates } : e))
    );
  };
  const deleteExperience = (id: string) => {
    updateField(
      'experience',
      (resume.experience || []).filter((e) => e.id !== id)
    );
  };
  const updateExperienceSubHighlight = (
    expId: string,
    parentIndex: number,
    items: string[]
  ) => {
    const nextExp = (resume.experience || []).map((exp) => {
      if (exp.id !== expId) return exp;
      const existing = exp.subHighlights || [];
      const found = existing.find((s) => s.parentIndex === parentIndex);
      let nextSubs: ExperienceSubHighlights[];
      if (items.length === 0) {
        nextSubs = existing.filter((s) => s.parentIndex !== parentIndex);
      } else if (found) {
        nextSubs = existing.map((s) =>
          s.parentIndex === parentIndex ? { ...s, items } : s
        );
      } else {
        nextSubs = [
          ...existing,
          { id: `sub_${Date.now()}_${parentIndex}`, parentIndex, items },
        ];
      }
      return { ...exp, subHighlights: nextSubs };
    });
    updateField('experience', nextExp);
  };

  // Research Experience
  const addResearch = () => {
    const item: ResearchExperienceItem = {
      id: `res_${Date.now()}`,
      title: '',
      institution: '',
      role: '',
      domain: '',
      location: '',
      supervisor: '',
      startDate: '',
      endDate: '',
      current: false,
      objectives: '',
      methodology: '',
      technologies: [],
      findings: '',
      outcomes: '',
      publications: '',
    };
    updateField('researchExperience', [...(resume.researchExperience || []), item]);
  };
  const updateResearch = (id: string, updates: Partial<ResearchExperienceItem>) => {
    updateField(
      'researchExperience',
      (resume.researchExperience || []).map((r) => (r.id === id ? { ...r, ...updates } : r))
    );
  };
  const deleteResearch = (id: string) => {
    updateField(
      'researchExperience',
      (resume.researchExperience || []).filter((r) => r.id !== id)
    );
  };

  // Master's Thesis
  const updateThesisField = (field: keyof MasterThesisInfo, val: string) => {
    const currentThesis: MasterThesisInfo = resume.thesis || { title: '' };
    updateField('thesis', { ...currentThesis, [field]: val });
  };
  const clearThesis = () => {
    updateField('thesis', undefined);
  };

  // Publications & Patents
  const addPublication = () => {
    const item: PublicationItem = {
      id: `pub_${Date.now()}`,
      type: 'journal',
      title: '',
      authors: '',
      year: new Date().getFullYear().toString(),
      journalOrConference: '',
      volume: '',
      issue: '',
      pages: '',
      doi: '',
      status: 'Published',
    };
    updateField('publications', [...(resume.publications || []), item]);
  };
  const updatePublication = (id: string, updates: Partial<PublicationItem>) => {
    updateField(
      'publications',
      (resume.publications || []).map((p) => (p.id === id ? { ...p, ...updates } : p))
    );
  };
  const deletePublication = (id: string) => {
    updateField(
      'publications',
      (resume.publications || []).filter((p) => p.id !== id)
    );
  };

  // Projects
  const addProject = () => {
    const item: ProjectItem = {
      id: `proj_${Date.now()}`,
      title: '',
      technologies: [],
      link: '',
      githubUrl: '',
      startDate: '',
      endDate: '',
      description: '',
      highlights: [''],
    };
    updateField('projects', [...(resume.projects || []), item]);
  };
  const updateProject = (id: string, updates: Partial<ProjectItem>) => {
    updateField(
      'projects',
      (resume.projects || []).map((p) => (p.id === id ? { ...p, ...updates } : p))
    );
  };
  const deleteProject = (id: string) => {
    updateField(
      'projects',
      (resume.projects || []).filter((p) => p.id !== id)
    );
  };

  // Skills
  const addSkillCategory = (presetCategoryName = 'New Category') => {
    const existing = resume.skills || [];
    if (
      presetCategoryName !== 'New Category' &&
      existing.some(
        (c) => c.category.trim().toLowerCase() === presetCategoryName.toLowerCase()
      )
    ) {
      return;
    }
    const item: SkillCategory = {
      id: `skill_${Date.now()}_${Math.random().toString(36).slice(2, 5)}`,
      category: presetCategoryName,
      skills: [],
    };
    updateField('skills', [...existing, item]);
  };
  const updateSkillCategory = (id: string, category: string, rawSkills: string) => {
    const list = rawSkills
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    updateField(
      'skills',
      (resume.skills || []).map((c) => (c.id === id ? { ...c, category, skills: list } : c))
    );
  };
  const deleteSkillCategory = (id: string) => {
    updateField(
      'skills',
      (resume.skills || []).filter((c) => c.id !== id)
    );
  };
  const updateSkillCategoryProficiency = (id: string, proficiency: SkillMatrixLevel | null) => {
    updateField(
      'skills',
      (resume.skills || []).map((c) => (c.id === id ? { ...c, proficiency } : c))
    );
  };

  // Learning Activities (Internship Resume)
  const addLearningActivity = () => {
    const item: LearningActivityItem = {
      id: `learn_${Date.now()}`,
      title: '',
      activityType: 'Course',
      subject: '',
      provider: '',
      instructor: '',
      completionDate: '',
      certificateId: '',
      credentialUrl: '',
      skillsAcquired: [],
      description: '',
    };
    updateField('learningActivities', [...(resume.learningActivities || []), item]);
  };
  const updateLearningActivity = (id: string, updates: Partial<LearningActivityItem>) => {
    updateField(
      'learningActivities',
      (resume.learningActivities || []).map((l) => (l.id === id ? { ...l, ...updates } : l))
    );
  };
  const deleteLearningActivity = (id: string) => {
    updateField(
      'learningActivities',
      (resume.learningActivities || []).filter((l) => l.id !== id)
    );
  };
  const moveLearningActivity = (index: number, delta: -1 | 1) => {
    const arr = [...(resume.learningActivities || [])];
    const target = index + delta;
    if (target < 0 || target >= arr.length) return;
    const [moved] = arr.splice(index, 1);
    arr.splice(target, 0, moved);
    updateField('learningActivities', arr);
  };

  // Internship Career Interests & Preferences (Template 10)
  const updateInternshipPreferences = (updates: Partial<InternshipPreferences>) => {
    updateField('internshipPreferences', {
      ...(resume.internshipPreferences || {}),
      ...updates,
    });
  };
  const addCareerInterestsFromDraft = () => {
    const incoming = careerInterestDraft
      .split(/[,;\n]+/)
      .map((s) => s.trim())
      .filter(Boolean);
    if (incoming.length === 0) return;
    const existing = resume.careerInterests || [];
    const seen = new Set(existing.map((c) => c.toLowerCase()));
    const next = [...existing];
    for (const item of incoming) {
      if (!seen.has(item.toLowerCase())) {
        next.push(item);
        seen.add(item.toLowerCase());
      }
    }
    updateField('careerInterests', next);
    setCareerInterestDraft('');
  };
  const removeCareerInterestTag = (index: number) => {
    updateField(
      'careerInterests',
      (resume.careerInterests || []).filter((_, i) => i !== index)
    );
  };

  // Awards
  const addAward = () => {
    const item: AwardItem = {
      id: `ach_${Date.now()}`,
      title: '',
      issuer: '',
      date: '',
      description: '',
    };
    updateField('achievements', [...(resume.achievements || []), item]);
  };
  const updateAward = (id: string, updates: Partial<AwardItem>) => {
    updateField(
      'achievements',
      (resume.achievements || []).map((a) => (a.id === id ? { ...a, ...updates } : a))
    );
  };
  const deleteAward = (id: string) => {
    updateField(
      'achievements',
      (resume.achievements || []).filter((a) => a.id !== id)
    );
  };

  // Leadership
  const addLeadership = () => {
    const item: LeadershipItem = {
      id: `lead_${Date.now()}`,
      role: '',
      organization: '',
      startDate: '',
      endDate: '',
      current: false,
      highlights: [''],
    };
    updateField('leadership', [...(resume.leadership || []), item]);
  };
  const updateLeadership = (id: string, updates: Partial<LeadershipItem>) => {
    updateField(
      'leadership',
      (resume.leadership || []).map((l) => (l.id === id ? { ...l, ...updates } : l))
    );
  };
  const deleteLeadership = (id: string) => {
    updateField(
      'leadership',
      (resume.leadership || []).filter((l) => l.id !== id)
    );
  };

  // Volunteer
  const addVolunteer = () => {
    const item: VolunteerItem = {
      id: `vol_${Date.now()}`,
      role: '',
      organization: '',
      startDate: '',
      endDate: '',
      current: false,
      highlights: [''],
    };
    updateField('volunteer', [...(resume.volunteer || []), item]);
  };
  const updateVolunteer = (id: string, updates: Partial<VolunteerItem>) => {
    updateField(
      'volunteer',
      (resume.volunteer || []).map((v) => (v.id === id ? { ...v, ...updates } : v))
    );
  };
  const deleteVolunteer = (id: string) => {
    updateField(
      'volunteer',
      (resume.volunteer || []).filter((v) => v.id !== id)
    );
  };

  // Memberships
  const addMembership = () => {
    const item: MembershipItem = {
      id: `mem_${Date.now()}`,
      organization: '',
      membershipType: 'Member',
      startDate: '',
      current: true,
    };
    updateField('memberships', [...(resume.memberships || []), item]);
  };
  const updateMembership = (id: string, updates: Partial<MembershipItem>) => {
    updateField(
      'memberships',
      (resume.memberships || []).map((m) => (m.id === id ? { ...m, ...updates } : m))
    );
  };
  const deleteMembership = (id: string) => {
    updateField(
      'memberships',
      (resume.memberships || []).filter((m) => m.id !== id)
    );
  };

  // Certifications
  const addCertification = () => {
    const item: CertificationItem = {
      id: `cert_${Date.now()}`,
      name: '',
      issuer: '',
      issueDate: '',
    };
    updateField('certifications', [...(resume.certifications || []), item]);
  };
  const updateCertification = (id: string, updates: Partial<CertificationItem>) => {
    updateField(
      'certifications',
      (resume.certifications || []).map((c) => (c.id === id ? { ...c, ...updates } : c))
    );
  };
  const deleteCertification = (id: string) => {
    updateField(
      'certifications',
      (resume.certifications || []).filter((c) => c.id !== id)
    );
  };

  // Languages
  const addLanguage = () => {
    const item: LanguageItem = {
      id: `lang_${Date.now()}`,
      language: '',
      proficiency: 'Fluent',
    };
    updateField('languages', [...(resume.languages || []), item]);
  };
  const updateLanguage = (id: string, updates: Partial<LanguageItem>) => {
    updateField(
      'languages',
      (resume.languages || []).map((l) => (l.id === id ? { ...l, ...updates } : l))
    );
  };
  const deleteLanguage = (id: string) => {
    updateField(
      'languages',
      (resume.languages || []).filter((l) => l.id !== id)
    );
  };

  // Skill Matrix (5-Level Scale, NO auto-assigned rating)
  const addSkillMatrixRow = () => {
    const item: SkillMatrixItem = {
      id: `mat_${Date.now()}_${Math.random().toString(36).slice(2, 5)}`,
      category: 'Core',
      skill: '',
      level: null,
      yearsOfExperience: '',
      comment: '',
    };
    updateField('skillMatrix', [...(resume.skillMatrix || []), item]);
  };
  const updateSkillMatrixRow = (id: string, updates: Partial<SkillMatrixItem>) => {
    updateField(
      'skillMatrix',
      (resume.skillMatrix || []).map((m) => (m.id === id ? { ...m, ...updates } : m))
    );
  };
  const deleteSkillMatrixRow = (id: string) => {
    updateField(
      'skillMatrix',
      (resume.skillMatrix || []).filter((m) => m.id !== id)
    );
  };

  // Structured Interests
  const syncInterestsToResume = (items: InterestItem[]) => {
    const summaryText = items
      .filter((i) => i.name.trim())
      .map((i) => (i.description?.trim() ? `${i.name.trim()} (${i.description.trim()})` : i.name.trim()))
      .join(', ');
    setResume((prev) => ({
      ...prev,
      interestItems: items,
      interests: summaryText,
      updatedAt: new Date().toISOString(),
    }));
  };
  const addInterestItem = (initialName = '') => {
    const base = resume.interestItems || [];
    const next: InterestItem[] = [
      ...base,
      { id: `int_${Date.now()}_${Math.random().toString(36).slice(2, 5)}`, name: initialName, description: '' },
    ];
    syncInterestsToResume(next);
  };
  const updateInterestItem = (id: string, updates: Partial<InterestItem>) => {
    const next = (resume.interestItems || []).map((i) =>
      i.id === id ? { ...i, ...updates } : i
    );
    syncInterestsToResume(next);
  };
  const deleteInterestItem = (id: string) => {
    const next = (resume.interestItems || []).filter((i) => i.id !== id);
    syncInterestsToResume(next);
  };

  // Custom / Additional Sections
  const addCustomSection = (presetTitle = '') => {
    const item: CustomSectionItem = {
      id: `cust_${Date.now()}_${Math.random().toString(36).slice(2, 5)}`,
      title: presetTitle,
      bullets: [''],
    };
    updateField('customSections', [...(resume.customSections || []), item]);
  };
  const updateCustomSection = (id: string, updates: Partial<CustomSectionItem>) => {
    updateField(
      'customSections',
      (resume.customSections || []).map((cs) => (cs.id === id ? { ...cs, ...updates } : cs))
    );
  };
  const deleteCustomSection = (id: string) => {
    updateField(
      'customSections',
      (resume.customSections || []).filter((cs) => cs.id !== id)
    );
  };

  // Daily Activities ("A Day of My Life", max 24h)
  const addDailyActivity = () => {
    const item: DailyActivityItem = {
      id: `day_${Date.now()}_${Math.random().toString(36).slice(2, 5)}`,
      activity: '',
      hours: 1,
    };
    updateField('dailyActivities', [...(resume.dailyActivities || []), item]);
  };
  const updateDailyActivity = (id: string, updates: Partial<DailyActivityItem>) => {
    updateField(
      'dailyActivities',
      (resume.dailyActivities || []).map((d) => (d.id === id ? { ...d, ...updates } : d))
    );
  };
  const deleteDailyActivity = (id: string) => {
    updateField(
      'dailyActivities',
      (resume.dailyActivities || []).filter((d) => d.id !== id)
    );
  };

  // Strengths Keyword Chips (user-defined only; never prefilled/auto-assigned)
  const addStrengthChip = () => {
    const raw = strengthDraft.trim();
    if (!raw) return;
    const parts = raw
      .split(/[,;\n]+/)
      .map((s) => s.trim())
      .filter(Boolean);
    if (parts.length === 0) return;
    const existing = resume.strengths || [];
    const seen = new Set(existing.map((s) => s.toLowerCase()));
    const next = [...existing];
    for (const p of parts) {
      if (!seen.has(p.toLowerCase())) {
        next.push(p);
        seen.add(p.toLowerCase());
      }
    }
    updateField('strengths', next);
    setStrengthDraft('');
  };
  const deleteStrengthChip = (index: number) => {
    updateField(
      'strengths',
      (resume.strengths || []).filter((_, i) => i !== index)
    );
  };

  // References
  const addReference = () => {
    const item: ReferenceItem = {
      id: `ref_${Date.now()}`,
      fullName: '',
      jobTitle: '',
      organization: '',
      email: '',
      relationship: '',
    };
    updateField('references', [...(resume.references || []), item]);
  };
  const updateReference = (id: string, updates: Partial<ReferenceItem>) => {
    updateField(
      'references',
      (resume.references || []).map((r) => (r.id === id ? { ...r, ...updates } : r))
    );
  };
  const deleteReference = (id: string) => {
    updateField(
      'references',
      (resume.references || []).filter((r) => r.id !== id)
    );
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6">
      {/* Top Header Bar */}
      <div className="bg-white border border-slate-200 rounded-lg p-4 mb-6 shadow-xs space-y-3">
        {/* Row 1: Title & Primary Save / Preview / Template Switch */}
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-3">
          <div className="flex-1 min-w-0">
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
              Curriculum Vitae Title
            </label>
            <input
              type="text"
              value={resume.title}
              onChange={(e) => updateField('title', e.target.value)}
              placeholder="e.g. Academic Research Curriculum Vitae"
              className="w-full px-3 py-1.5 border border-slate-300 rounded text-sm font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900"
            />
          </div>

          <div className="flex items-center flex-wrap gap-2 shrink-0">
            <label htmlFor="editor-template-select" className="sr-only">
              Active Resume Template
            </label>
            <select
              id="editor-template-select"
              value={activeTemplateId}
              onChange={(e) => handleSwitchTemplate(e.target.value)}
              className="px-2.5 py-1.5 text-xs font-semibold text-slate-800 bg-slate-50 border border-slate-300 rounded hover:border-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0f2b5c] cursor-pointer"
              title="Switch active template while keeping all resume data"
            >
              {TEMPLATE_DEFINITIONS.map((tpl) => (
                <option key={tpl.id} value={tpl.id}>
                  Template: {tpl.name}
                </option>
              ))}
            </select>

            {onOpenTemplates && (
              <button
                type="button"
                onClick={handleOpenTemplatesClick}
                className="inline-flex items-center px-3 py-1.5 text-xs font-semibold text-[#0f2b5c] bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded transition-colors cursor-pointer"
                title="Browse resume templates with previews"
              >
                <LayoutTemplate className="w-3.5 h-3.5 mr-1.5" />
                <span>Templates</span>
              </button>
            )}

            {autoSaveState !== 'idle' && (
              <span
                role="status"
                aria-live="polite"
                className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-1 rounded ${
                  autoSaveState === 'saving'
                    ? 'text-slate-600 bg-slate-100'
                    : autoSaveState === 'saved'
                    ? 'text-emerald-700 bg-emerald-50'
                    : 'text-red-700 bg-red-50'
                }`}
                title={autoSaveError || undefined}
              >
                {autoSaveState === 'saving' ? (
                  <>
                    <Loader2 className="w-3 h-3 animate-spin" />
                    <span>Saving...</span>
                  </>
                ) : autoSaveState === 'saved' ? (
                  <>
                    <CheckCircle2 className="w-3 h-3" />
                    <span>All changes saved</span>
                  </>
                ) : (
                  <>
                    <AlertCircle className="w-3 h-3" />
                    <span>Save failed</span>
                    <button
                      type="button"
                      onClick={() => void flushPendingSave(latestResumeRef.current, true)}
                      className="underline font-semibold ml-1 hover:text-red-900 cursor-pointer"
                    >
                      Retry
                    </button>
                  </>
                )}
              </span>
            )}

            <button
              onClick={handleSave}
              disabled={saving}
              className={`inline-flex items-center px-3.5 py-1.5 text-xs font-semibold rounded shadow-xs transition-colors ${
                justSaved
                  ? 'bg-emerald-700 text-white'
                  : 'bg-white border border-slate-300 text-slate-700 hover:bg-slate-50'
              }`}
            >
              {justSaved ? (
                <>
                  <Check className="w-3.5 h-3.5 mr-1.5" />
                  <span>Saved</span>
                </>
              ) : (
                <>
                  <Save className="w-3.5 h-3.5 mr-1.5 text-slate-500" />
                  <span>Save</span>
                </>
              )}
            </button>

            <button
              onClick={handlePreviewClick}
              className="inline-flex items-center px-4 py-1.5 text-xs font-semibold text-white bg-slate-900 hover:bg-black rounded shadow-xs transition-colors cursor-pointer"
            >
              <Eye className="w-3.5 h-3.5 mr-1.5" />
              <span>Preview &amp; Download PDF</span>
            </button>
          </div>
        </div>

        {/* Row 2: Preset Profiles & AI / Completeness Tools */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-slate-100">
          <div className="flex items-center flex-wrap gap-1 bg-slate-100 p-1 rounded text-xs">
            <span className="font-semibold text-slate-600 px-1.5">Load Preset:</span>
            <button
              onClick={() => handleLoadProfile('academic')}
              className="px-2 py-1 bg-white hover:bg-slate-50 text-slate-800 font-medium rounded shadow-xs"
              title="Researcher / PhD / Postdoc"
            >
              Academic
            </button>
            <button
              onClick={() => handleLoadProfile('experienced')}
              className="px-2 py-1 bg-white hover:bg-slate-50 text-slate-800 font-medium rounded shadow-xs"
              title="Experienced Professional"
            >
              Professional
            </button>
            <button
              onClick={() => handleLoadProfile('fresher')}
              className="px-2 py-1 bg-white hover:bg-slate-50 text-slate-800 font-medium rounded shadow-xs"
              title="Fresh Graduate / Internship"
            >
              Fresher
            </button>
            <button
              onClick={() => handleLoadProfile('classic')}
              className="px-2 py-1 bg-white hover:bg-slate-50 text-[#1e4e8c] font-semibold rounded shadow-xs"
              title="Classic Professional CV Sample"
            >
              Classic
            </button>
            <button
              onClick={() => handleLoadProfile('two-column')}
              className="px-2 py-1 bg-white hover:bg-slate-50 text-[#8f131b] font-semibold rounded shadow-xs"
              title="Two Column Professional CV Sample"
            >
              Two Column
            </button>
            <button
              onClick={() => handleLoadProfile('software-developer')}
              className="px-2 py-1 bg-white hover:bg-slate-50 text-[#1e4e8c] font-semibold rounded shadow-xs"
              title="Software Developer Resume Sample"
            >
              Software Dev
            </button>
            <button
              onClick={() => handleLoadProfile('harvard')}
              className="px-2 py-1 bg-white hover:bg-slate-50 text-slate-900 font-semibold rounded shadow-xs"
              title="Harvard Style Resume Sample"
            >
              Harvard
            </button>
            <button
              onClick={() => handleLoadProfile('elegant-serif')}
              className="px-2 py-1 bg-white hover:bg-slate-50 text-slate-900 font-semibold rounded shadow-xs"
              title="Elegant Serif (Modern Simple CV) Sample"
            >
              Elegant Serif
            </button>
            <button
              onClick={() => handleLoadProfile('modern-corporate')}
              className="px-2 py-1 bg-white hover:bg-slate-50 text-[#3873b3] font-semibold rounded shadow-xs"
              title="Modern Corporate (ModernCV Classic) Sample"
            >
              Modern Corporate
            </button>
            <button
              onClick={() => handleLoadProfile('fresher-resume')}
              className="px-2 py-1 bg-white hover:bg-slate-50 text-[#3b6998] font-semibold rounded shadow-xs"
              title="Fresher Resume (Overleaf Students & Fresh Graduates) Sample"
            >
              Fresher Resume
            </button>
            <button
              onClick={() => handleLoadProfile('internship-resume')}
              className="px-2 py-1 bg-white hover:bg-slate-50 text-slate-900 font-semibold rounded shadow-xs"
              title="Internship Resume (Two-Column Student Application) Sample"
            >
              Internship
            </button>
            <button
              onClick={() => handleLoadProfile('engineering-resume')}
              className="px-2 py-1 bg-white hover:bg-slate-50 text-black font-semibold rounded shadow-xs"
              title="Engineering Resume (Mechanical / CSE / ECE Sample)"
            >
              Engineering
            </button>
            <button
              onClick={() => handleLoadProfile('creative-professional')}
              className="px-2 py-1 bg-white hover:bg-slate-50 text-blue-700 font-semibold rounded shadow-xs"
              title="Creative Professional Two-Column CV Sample"
            >
              Creative Prof.
            </button>
            <button
              onClick={() => handleLoadProfile('student')}
              className="px-2 py-1 bg-white hover:bg-slate-50 text-slate-800 font-medium rounded shadow-xs"
              title="Undergraduate Student"
            >
              Student
            </button>
          </div>

          <div className="flex items-center flex-wrap gap-1.5">
            <button
              type="button"
              onClick={() => setIsUploadOpen(true)}
              className="inline-flex items-center px-2.5 py-1 text-xs font-semibold text-indigo-900 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded transition-colors cursor-pointer"
              title="Upload existing CV PDF and extract with AI"
            >
              <UploadCloud className="w-3.5 h-3.5 mr-1 text-indigo-700" />
              <span>Upload PDF</span>
            </button>

            <button
              type="button"
              onClick={() => setIsInterviewOpen(true)}
              className="inline-flex items-center px-2.5 py-1 text-xs font-semibold text-purple-900 bg-purple-50 hover:bg-purple-100 border border-purple-200 rounded transition-colors cursor-pointer"
              title="Interactive conversational interview"
            >
              <MessageSquare className="w-3.5 h-3.5 mr-1 text-purple-700" />
              <span>AI Chat</span>
            </button>

            <button
              type="button"
              onClick={() => setIsCompletenessOpen(true)}
              className="inline-flex items-center px-2.5 py-1 text-xs font-bold text-emerald-900 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded transition-colors cursor-pointer"
              title={`Click to view ${completenessReport.sections.length}-section completeness audit`}
            >
              <TrendingUp className="w-3.5 h-3.5 mr-1 text-emerald-700" />
              <span>{completenessReport.overallScore}% Ready</span>
            </button>
          </div>
        </div>
      </div>

      {/* Template-Aware Suggested Details Banner when using Jake's Resume */}
      {isJakesTemplate && jakesMissingPrompts.length > 0 && (
        <div className="bg-slate-50 border border-slate-200 rounded-lg px-4 py-3 mb-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5">
          <div className="text-xs text-slate-700">
            <span className="font-bold text-slate-900">
              Suggested for {activeTemplate.name}:
            </span>{' '}
            <span className="text-slate-600">
              Click any section below to complete or refine it (empty optional sections remain hidden automatically):
            </span>
            <div className="flex flex-wrap gap-1.5 mt-1.5">
              {jakesMissingPrompts.map((sec) => (
                <button
                  key={sec.sectionId}
                  type="button"
                  onClick={() => setActiveSection(sectionReportToEditorId(sec.sectionId))}
                  className={`px-2 py-0.5 rounded text-[11px] font-semibold border transition-colors cursor-pointer ${
                    sec.isOptional
                      ? 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                      : 'bg-amber-50 text-amber-900 border-amber-200 hover:bg-amber-100'
                  }`}
                >
                  {sec.name} ({sec.statusLabel})
                </button>
              ))}
            </div>
          </div>
          <button
            type="button"
            onClick={() => setIsInterviewOpen(true)}
            className="inline-flex items-center px-3 py-1.5 text-xs font-semibold text-purple-900 bg-purple-50 hover:bg-purple-100 border border-purple-200 rounded shrink-0 transition-colors cursor-pointer"
          >
            <MessageSquare className="w-3.5 h-3.5 mr-1.5 text-purple-700" />
            <span>Complete with AI Chat</span>
          </button>
        </div>
      )}

      {/* Harvard Style Context & Target Background Banner */}
      {isHarvardTemplate && (
        <div className="bg-slate-50 border border-slate-200 rounded-lg px-4 py-3 mb-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="text-xs text-slate-700">
            <span className="font-bold text-slate-900">Harvard Style Profile Mode:</span>{' '}
            <span className="text-slate-600">
              Select your background so optional sections (Study Abroad, High School, Lab Skills, Additional Info) adapt cleanly without forcing irrelevant fields.
            </span>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            {(
              [
                { value: 'student', label: 'College Student' },
                { value: 'fresher', label: 'Fresher / Grad' },
                { value: 'experienced', label: 'Experienced' },
              ] as const
            ).map((opt) => {
              const active = (resume.targetBackground || 'student') === opt.value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => updateField('targetBackground', opt.value)}
                  className={`px-2.5 py-1 rounded text-[11px] font-semibold border transition-colors cursor-pointer ${
                    active
                      ? 'bg-slate-900 text-white border-slate-900'
                      : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                  }`}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Elegant Serif Context, Persona Mode & Section Manager Banner */}
      {isElegantSerifTemplate && (
        <div className="bg-slate-50 border border-slate-200 rounded-lg px-4 py-3 mb-5 space-y-3">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
            <div className="text-xs text-slate-700">
              <span className="font-bold text-slate-900">Elegant Serif (Modern Simple CV) Mode:</span>{' '}
              <span className="text-slate-600">
                Choose your profile focus and manage displayed sections. Empty optional sections remain hidden automatically without deleting saved data.
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-1.5 shrink-0">
              {(
                [
                  { value: 'student', label: 'Student' },
                  { value: 'fresher', label: 'Fresher' },
                  { value: 'experienced', label: 'Experienced' },
                  { value: 'researcher', label: 'Researcher' },
                ] as const
              ).map((opt) => {
                const active = (resume.targetBackground || 'researcher') === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => updateField('targetBackground', opt.value)}
                    className={`px-2.5 py-1 rounded text-[11px] font-semibold border transition-colors cursor-pointer ${
                      active
                        ? 'bg-slate-900 text-white border-slate-900'
                        : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                    }`}
                  >
                    {opt.label}
                  </button>
                );
              })}
              <button
                type="button"
                onClick={() => setShowSectionManager((prev) => !prev)}
                aria-expanded={showSectionManager}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded text-[11px] font-semibold border border-slate-300 bg-white text-slate-800 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <SlidersHorizontal className="w-3 h-3" />
                <span>{showSectionManager ? 'Hide Section Manager' : 'Manage Sections'}</span>
              </button>
            </div>
          </div>

          {showSectionManager && (
            <div className="pt-3 border-t border-slate-200 space-y-2.5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="text-[11px] font-bold uppercase tracking-wider text-slate-600">
                  Section Order &amp; Visibility (Hidden sections keep all saved entries)
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setActiveSection('custom-sections')}
                    className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold text-slate-800 bg-white border border-slate-300 hover:bg-slate-100 rounded cursor-pointer"
                  >
                    <Plus className="w-3 h-3" />
                    <span>Add Custom Section</span>
                  </button>
                  <button
                    type="button"
                    onClick={resetElegantSerifLayout}
                    className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-100 rounded cursor-pointer"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>Reset Order &amp; Visibility</span>
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                {getNormalizedElegantSerifOrder(resume.sectionOrderOverride).map((secKey, idx, arr) => {
                  const meta = ELEGANT_SERIF_SECTION_CATALOG[secKey];
                  if (!meta) return null;
                  const hidden = isSectionHidden(secKey);
                  return (
                    <div
                      key={secKey}
                      className={`flex items-center justify-between gap-1.5 px-2.5 py-1.5 rounded border text-xs bg-white ${
                        hidden ? 'border-slate-200 opacity-65' : 'border-slate-300'
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => setActiveSection(meta.editorId)}
                        className={`text-left truncate font-medium flex-1 cursor-pointer hover:underline ${
                          hidden ? 'line-through text-slate-500' : 'text-slate-800'
                        }`}
                      >
                        {idx + 1}. {meta.baseLabel}
                      </button>
                      <div className="flex items-center gap-0.5 shrink-0">
                        <button
                          type="button"
                          onClick={() => moveElegantSerifSection(secKey, -1)}
                          disabled={idx === 0}
                          aria-label={`Move ${meta.baseLabel} up`}
                          title="Move section up"
                          className="p-1 text-slate-500 hover:text-slate-900 disabled:opacity-30 cursor-pointer"
                        >
                          <ChevronUp className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => moveElegantSerifSection(secKey, 1)}
                          disabled={idx === arr.length - 1}
                          aria-label={`Move ${meta.baseLabel} down`}
                          title="Move section down"
                          className="p-1 text-slate-500 hover:text-slate-900 disabled:opacity-30 cursor-pointer"
                        >
                          <ChevronDown className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => toggleSectionVisibility(secKey)}
                          aria-label={hidden ? `Show ${meta.baseLabel}` : `Hide ${meta.baseLabel}`}
                          title={hidden ? 'Show section' : 'Hide section without deleting data'}
                          className={`p-1 rounded cursor-pointer ${
                            hidden
                              ? 'text-amber-600 hover:text-amber-800'
                              : 'text-slate-500 hover:text-slate-900'
                          }`}
                        >
                          {hidden ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Modern Corporate Context, Persona Mode & Section Manager Banner */}
      {isModernCorporateTemplate && (
        <div className="bg-slate-50 border border-slate-200 rounded-lg px-4 py-3 mb-5 space-y-3">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
            <div className="text-xs text-slate-700">
              <span className="font-bold text-[#3873b3]">Modern Corporate (ModernCV Classic) Mode:</span>{' '}
              <span className="text-slate-600">
                Select your career profile and reorder or hide sections cleanly. Empty optional sections are omitted automatically without deleting saved data.
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-1.5 shrink-0">
              {(
                [
                  { value: 'corporate', label: 'Corporate & Mgmt' },
                  { value: 'experienced', label: 'Experienced' },
                  { value: 'student', label: 'Student' },
                  { value: 'fresher', label: 'Fresher' },
                  { value: 'technical', label: 'Technical' },
                ] as const
              ).map((opt) => {
                const active = (resume.targetBackground || 'corporate') === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => updateField('targetBackground', opt.value)}
                    className={`px-2.5 py-1 rounded text-[11px] font-semibold border transition-colors cursor-pointer ${
                      active
                        ? 'bg-[#3873b3] text-white border-[#3873b3]'
                        : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                    }`}
                  >
                    {opt.label}
                  </button>
                );
              })}
              <button
                type="button"
                onClick={() => setShowSectionManager((prev) => !prev)}
                aria-expanded={showSectionManager}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded text-[11px] font-semibold border border-slate-300 bg-white text-slate-800 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <SlidersHorizontal className="w-3 h-3" />
                <span>{showSectionManager ? 'Hide Section Manager' : 'Manage Sections'}</span>
              </button>
            </div>
          </div>

          {showSectionManager && (
            <div className="pt-3 border-t border-slate-200 space-y-2.5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="text-[11px] font-bold uppercase tracking-wider text-slate-600">
                  Section Order &amp; Visibility (Hidden sections keep all saved entries)
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setActiveSection('custom-sections')}
                    className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold text-slate-800 bg-white border border-slate-300 hover:bg-slate-100 rounded cursor-pointer"
                  >
                    <Plus className="w-3 h-3" />
                    <span>Add Custom Section</span>
                  </button>
                  <button
                    type="button"
                    onClick={resetElegantSerifLayout}
                    className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-100 rounded cursor-pointer"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>Reset Order &amp; Visibility</span>
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                {getNormalizedModernCorporateOrder(resume.sectionOrderOverride).map((secKey, idx, arr) => {
                  const meta = MODERN_CORPORATE_SECTION_CATALOG[secKey];
                  if (!meta) return null;
                  const hidden = isSectionHidden(secKey);
                  return (
                    <div
                      key={secKey}
                      className={`flex items-center justify-between gap-1.5 px-2.5 py-1.5 rounded border text-xs bg-white ${
                        hidden ? 'border-slate-200 opacity-65' : 'border-slate-300'
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => setActiveSection(meta.editorId)}
                        className={`text-left truncate font-medium flex-1 cursor-pointer hover:underline ${
                          hidden ? 'line-through text-slate-500' : 'text-slate-800'
                        }`}
                      >
                        {idx + 1}. {meta.baseLabel}
                      </button>
                      <div className="flex items-center gap-0.5 shrink-0">
                        <button
                          type="button"
                          onClick={() => moveElegantSerifSection(secKey, -1)}
                          disabled={idx === 0}
                          aria-label={`Move ${meta.baseLabel} up`}
                          title="Move section up"
                          className="p-1 text-slate-500 hover:text-slate-900 disabled:opacity-30 cursor-pointer"
                        >
                          <ChevronUp className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => moveElegantSerifSection(secKey, 1)}
                          disabled={idx === arr.length - 1}
                          aria-label={`Move ${meta.baseLabel} down`}
                          title="Move section down"
                          className="p-1 text-slate-500 hover:text-slate-900 disabled:opacity-30 cursor-pointer"
                        >
                          <ChevronDown className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => toggleSectionVisibility(secKey)}
                          aria-label={hidden ? `Show ${meta.baseLabel}` : `Hide ${meta.baseLabel}`}
                          title={hidden ? 'Show section' : 'Hide section without deleting data'}
                          className={`p-1 rounded cursor-pointer ${
                            hidden
                              ? 'text-amber-600 hover:text-amber-800'
                              : 'text-slate-500 hover:text-slate-900'
                          }`}
                        >
                          {hidden ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Fresher Resume Track Selector & Section Manager Banner */}
      {isFresherResumeTemplate && (
        <div className="bg-slate-50 border border-slate-200 rounded-lg px-4 py-3 mb-5 space-y-3">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
            <div className="text-xs text-slate-700">
              <span className="font-bold text-[#3b6998]">Fresher Resume Track &amp; Layout:</span>{' '}
              <span className="text-slate-600">
                Select your academic/career track and reorder or hide sections cleanly. Empty optional sections (including Internships if none) omit automatically without deleting data.
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-1.5 shrink-0">
              {(
                [
                  { value: 'engineering', label: 'Engineering' },
                  { value: 'cs', label: 'Computer Science' },
                  { value: 'cybersecurity', label: 'Cybersecurity' },
                  { value: 'non-technical', label: 'Non-Technical' },
                  { value: 'graduate', label: 'Recent Graduate' },
                ] as const
              ).map((opt) => {
                const active = (resume.fresherTrack || 'cs') === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => updateField('fresherTrack', opt.value)}
                    className={`px-2.5 py-1 rounded text-[11px] font-semibold border transition-colors cursor-pointer ${
                      active
                        ? 'bg-[#3b6998] text-white border-[#3b6998]'
                        : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                    }`}
                  >
                    {opt.label}
                  </button>
                );
              })}
              <button
                type="button"
                onClick={() => setShowSectionManager((prev) => !prev)}
                aria-expanded={showSectionManager}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded text-[11px] font-semibold border border-slate-300 bg-white text-slate-800 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <SlidersHorizontal className="w-3 h-3" />
                <span>{showSectionManager ? 'Hide Section Manager' : 'Manage Sections'}</span>
              </button>
            </div>
          </div>

          {showSectionManager && (
            <div className="pt-3 border-t border-slate-200 space-y-2.5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="text-[11px] font-bold uppercase tracking-wider text-slate-600">
                  Section Order &amp; Visibility (Hidden sections keep all saved entries)
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setActiveSection('custom-sections')}
                    className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold text-slate-800 bg-white border border-slate-300 hover:bg-slate-100 rounded cursor-pointer"
                  >
                    <Plus className="w-3 h-3" />
                    <span>Add Custom Section</span>
                  </button>
                  <button
                    type="button"
                    onClick={resetElegantSerifLayout}
                    className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-100 rounded cursor-pointer"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>Reset Order &amp; Visibility</span>
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                {getNormalizedFresherResumeOrder(resume.sectionOrderOverride).map((secKey, idx, arr) => {
                  const meta = FRESHER_RESUME_SECTION_CATALOG[secKey];
                  if (!meta) return null;
                  const hidden = isSectionHidden(secKey);
                  return (
                    <div
                      key={secKey}
                      className={`flex items-center justify-between gap-1.5 px-2.5 py-1.5 rounded border text-xs bg-white ${
                        hidden ? 'border-slate-200 opacity-65' : 'border-slate-300'
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => setActiveSection(meta.editorId)}
                        className={`text-left truncate font-medium flex-1 cursor-pointer hover:underline ${
                          hidden ? 'line-through text-slate-500' : 'text-slate-800'
                        }`}
                      >
                        {idx + 1}. {meta.baseLabel}
                      </button>
                      <div className="flex items-center gap-0.5 shrink-0">
                        <button
                          type="button"
                          onClick={() => moveElegantSerifSection(secKey, -1)}
                          disabled={idx === 0}
                          aria-label={`Move ${meta.baseLabel} up`}
                          title="Move section up"
                          className="p-1 text-slate-500 hover:text-slate-900 disabled:opacity-30 cursor-pointer"
                        >
                          <ChevronUp className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => moveElegantSerifSection(secKey, 1)}
                          disabled={idx === arr.length - 1}
                          aria-label={`Move ${meta.baseLabel} down`}
                          title="Move section down"
                          className="p-1 text-slate-500 hover:text-slate-900 disabled:opacity-30 cursor-pointer"
                        >
                          <ChevronDown className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => toggleSectionVisibility(secKey)}
                          aria-label={hidden ? `Show ${meta.baseLabel}` : `Hide ${meta.baseLabel}`}
                          title={hidden ? 'Show section' : 'Hide section without deleting data'}
                          className={`p-1 rounded cursor-pointer ${
                            hidden
                              ? 'text-amber-600 hover:text-amber-800'
                              : 'text-slate-500 hover:text-slate-900'
                          }`}
                        >
                          {hidden ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Internship Resume (Template 10) Track Selector, 10-Step Completion Tracker & Section Manager */}
      {isInternshipResumeTemplate && (
        <div className="bg-slate-50 border border-slate-200 rounded-lg px-4 py-3.5 mb-5 space-y-3">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
            <div className="text-xs text-slate-700">
              <span className="font-bold text-slate-900">
                Internship Resume — Guided 10-Step Track:
              </span>{' '}
              <span className="text-slate-600">
                Select your internship track. Empty optional sections (Learning, Co-Curricular, Career Interests, Prior Internships) hide automatically with zero penalty.
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-1.5 shrink-0">
              {(
                [
                  { value: 'cs', label: 'CS / Software' },
                  { value: 'cybersecurity', label: 'Cybersecurity' },
                  { value: 'ece', label: 'ECE / Hardware' },
                  { value: 'research', label: 'Research' },
                  { value: 'non-technical', label: 'Non-Technical' },
                ] as { value: InternshipTrack; label: string }[]
              ).map((opt) => {
                const active = (resume.internshipTrack || 'cs') === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => updateField('internshipTrack', opt.value)}
                    className={`px-2.5 py-1 rounded text-[11px] font-semibold border transition-colors cursor-pointer ${
                      active
                        ? 'bg-slate-900 text-white border-slate-900'
                        : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                    }`}
                  >
                    {opt.label}
                  </button>
                );
              })}
              <button
                type="button"
                onClick={() => setShowSectionManager((prev) => !prev)}
                aria-expanded={showSectionManager}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded text-[11px] font-semibold border border-slate-300 bg-white text-slate-800 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <SlidersHorizontal className="w-3 h-3" />
                <span>{showSectionManager ? 'Hide Section Manager' : 'Manage Sections'}</span>
              </button>
            </div>
          </div>

          {/* 10-Step Guided Completion Tracker */}
          <div className="pt-2.5 border-t border-slate-200">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-600">
                10-Step Guided Progress ({completenessReport.overallScore}% Ready)
              </span>
              <span className="text-[11px] text-slate-500">
                Click any step to jump directly
              </span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5">
              {INTERNSHIP_RESUME_SECTIONS.map((step) => {
                const statusInfo = getEditorSectionStatus(step.id);
                const statusLabel = statusInfo?.statusLabel || 'Optional / Skipped';
                const isCurrent = activeSection === step.id;
                const badgeStyle =
                  statusLabel === 'Completed'
                    ? 'text-emerald-700 bg-emerald-50 border-emerald-200'
                    : statusLabel === 'In Progress'
                    ? 'text-amber-700 bg-amber-50 border-amber-200'
                    : statusLabel === 'Not Started'
                    ? 'text-rose-700 bg-rose-50 border-rose-200'
                    : 'text-slate-500 bg-slate-100 border-slate-200';
                return (
                  <button
                    key={step.id}
                    type="button"
                    onClick={() => setActiveSection(step.id)}
                    className={`flex flex-col items-start justify-between p-2 rounded border text-left transition-all cursor-pointer ${
                      isCurrent
                        ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                        : 'bg-white text-slate-800 border-slate-200 hover:border-slate-400'
                    }`}
                  >
                    <span className="text-[11px] font-semibold truncate w-full">
                      {step.label.replace(' (Opt.)', '')}
                    </span>
                    <span
                      className={`mt-1 inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold border ${
                        isCurrent
                          ? 'bg-white/15 text-white border-white/25'
                          : badgeStyle
                      }`}
                    >
                      {statusLabel === 'Completed' ? (
                        <CheckCircle2 className="w-2.5 h-2.5" />
                      ) : statusLabel === 'In Progress' ? (
                        <Clock className="w-2.5 h-2.5" />
                      ) : statusLabel === 'Not Started' ? (
                        <AlertCircle className="w-2.5 h-2.5" />
                      ) : (
                        <MinusCircle className="w-2.5 h-2.5" />
                      )}
                      <span>{statusLabel}</span>
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {showSectionManager && (
            <div className="pt-3 border-t border-slate-200 space-y-2.5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="text-[11px] font-bold uppercase tracking-wider text-slate-600">
                  Section Order &amp; Visibility (Hidden sections preserve all saved entries)
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setActiveSection('custom-sections')}
                    className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold text-slate-800 bg-white border border-slate-300 hover:bg-slate-100 rounded cursor-pointer"
                  >
                    <Plus className="w-3 h-3" />
                    <span>Add Custom Section</span>
                  </button>
                  <button
                    type="button"
                    onClick={resetElegantSerifLayout}
                    className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-100 rounded cursor-pointer"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>Reset Order &amp; Visibility</span>
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                {getNormalizedInternshipResumeOrder(resume.sectionOrderOverride).map((secKey, idx, arr) => {
                  const meta = INTERNSHIP_RESUME_SECTION_CATALOG[secKey];
                  if (!meta) return null;
                  const hidden = isSectionHidden(secKey);
                  return (
                    <div
                      key={secKey}
                      className={`flex items-center justify-between gap-1.5 px-2.5 py-1.5 rounded border text-xs bg-white ${
                        hidden ? 'border-slate-200 opacity-65' : 'border-slate-300'
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => setActiveSection(meta.editorId)}
                        className={`text-left truncate font-medium flex-1 cursor-pointer hover:underline ${
                          hidden ? 'line-through text-slate-500' : 'text-slate-800'
                        }`}
                      >
                        {idx + 1}. {meta.baseLabel}
                      </button>
                      <div className="flex items-center gap-0.5 shrink-0">
                        <button
                          type="button"
                          onClick={() => moveElegantSerifSection(secKey, -1)}
                          disabled={idx === 0}
                          aria-label={`Move ${meta.baseLabel} up`}
                          title="Move section up"
                          className="p-1 text-slate-500 hover:text-slate-900 disabled:opacity-30 cursor-pointer"
                        >
                          <ChevronUp className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => moveElegantSerifSection(secKey, 1)}
                          disabled={idx === arr.length - 1}
                          aria-label={`Move ${meta.baseLabel} down`}
                          title="Move section down"
                          className="p-1 text-slate-500 hover:text-slate-900 disabled:opacity-30 cursor-pointer"
                        >
                          <ChevronDown className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => toggleSectionVisibility(secKey)}
                          aria-label={hidden ? `Show ${meta.baseLabel}` : `Hide ${meta.baseLabel}`}
                          title={hidden ? 'Show section' : 'Hide section without deleting data'}
                          className={`p-1 rounded cursor-pointer ${
                            hidden
                              ? 'text-amber-600 hover:text-amber-800'
                              : 'text-slate-500 hover:text-slate-900'
                          }`}
                        >
                          {hidden ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Engineering Resume (Template 11) Branch Selector, Sample Switcher & 9-Step Completion Tracker */}
      {isEngineeringResumeTemplate && (
        <div className="bg-slate-50 border border-slate-200 rounded-lg px-4 py-3.5 mb-5 space-y-3">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
            <div className="text-xs text-slate-700">
              <span className="font-bold text-black">
                Engineering Resume — Branch &amp; Guided 9-Step Workflow:
              </span>{' '}
              <span className="text-slate-600">
                Clean monochrome single-column layout. Empty optional sections (Internships/Trainings, POR, Extra-Curricular, Additional Info) hide automatically.
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-1.5 shrink-0">
              {(
                [
                  { value: 'mechanical', label: 'Mechanical' },
                  { value: 'cse-it', label: 'CSE / IT' },
                  { value: 'ece', label: 'ECE' },
                  { value: 'ee', label: 'EE / EEE' },
                  { value: 'civil', label: 'Civil' },
                  { value: 'chemical', label: 'Chemical' },
                  { value: 'other', label: 'Other' },
                ] as { value: EngineeringBranch; label: string }[]
              ).map((opt) => {
                const active = (resume.engineeringBranch || 'mechanical') === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => updateField('engineeringBranch', opt.value)}
                    className={`px-2.5 py-1 rounded text-[11px] font-semibold border transition-colors cursor-pointer ${
                      active
                        ? 'bg-black text-white border-black'
                        : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                    }`}
                  >
                    {opt.label}
                  </button>
                );
              })}
              <button
                type="button"
                onClick={() => setShowSectionManager((prev) => !prev)}
                aria-expanded={showSectionManager}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded text-[11px] font-semibold border border-slate-300 bg-white text-slate-800 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <SlidersHorizontal className="w-3 h-3" />
                <span>{showSectionManager ? 'Hide Section Manager' : 'Manage Sections'}</span>
              </button>
            </div>
          </div>

          {(resume.engineeringBranch === 'other' || Boolean(resume.customEngineeringBranch)) && (
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 pt-2 border-t border-slate-200">
              <label
                htmlFor="custom-engineering-branch"
                className="text-[11px] font-semibold text-slate-700 shrink-0"
              >
                Custom Engineering Branch Name:
              </label>
              <input
                id="custom-engineering-branch"
                type="text"
                value={resume.customEngineeringBranch || ''}
                onChange={(e) => updateField('customEngineeringBranch', e.target.value)}
                placeholder="e.g. Aerospace Engineering, Biotechnology, Mechatronics"
                className="flex-1 px-2.5 py-1 text-xs border border-slate-300 rounded bg-white"
              />
            </div>
          )}

          {/* Branch Sample Quick Switcher */}
          <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-200 text-[11px]">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="font-semibold text-slate-600">Load Branch Sample:</span>
              <button
                type="button"
                onClick={() => handleLoadProfile('engineering-mechanical')}
                className="px-2 py-0.5 rounded border border-slate-300 bg-white hover:bg-slate-100 font-semibold text-slate-800 cursor-pointer"
              >
                Mechanical Sample
              </button>
              <button
                type="button"
                onClick={() => handleLoadProfile('engineering-cse')}
                className="px-2 py-0.5 rounded border border-slate-300 bg-white hover:bg-slate-100 font-semibold text-slate-800 cursor-pointer"
              >
                CSE / IT Sample
              </button>
              <button
                type="button"
                onClick={() => handleLoadProfile('engineering-ece')}
                className="px-2 py-0.5 rounded border border-slate-300 bg-white hover:bg-slate-100 font-semibold text-slate-800 cursor-pointer"
              >
                ECE Sample
              </button>
            </div>
            <span className="text-slate-500">
              ATS-clean typography · Zero bars or rating dots
            </span>
          </div>

          {/* 9-Step Guided Completion Tracker */}
          <div className="pt-2.5 border-t border-slate-200">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-600">
                9-Step Engineering Resume Progress ({completenessReport.overallScore}% Ready)
              </span>
              <span className="text-[11px] text-slate-500">
                Click any step to jump directly
              </span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-1.5">
              {ENGINEERING_SECTIONS.map((step) => {
                const statusInfo = getEditorSectionStatus(step.id);
                const statusLabel = statusInfo?.statusLabel || 'Optional / Skipped';
                const isCurrent = activeSection === step.id;
                const badgeStyle =
                  statusLabel === 'Completed'
                    ? 'text-emerald-700 bg-emerald-50 border-emerald-200'
                    : statusLabel === 'In Progress'
                    ? 'text-amber-700 bg-amber-50 border-amber-200'
                    : statusLabel === 'Not Started'
                    ? 'text-rose-700 bg-rose-50 border-rose-200'
                    : 'text-slate-500 bg-slate-100 border-slate-200';
                return (
                  <button
                    key={step.id}
                    type="button"
                    onClick={() => setActiveSection(step.id)}
                    className={`flex flex-col items-start justify-between p-2 rounded border text-left transition-all cursor-pointer ${
                      isCurrent
                        ? 'bg-black text-white border-black shadow-xs'
                        : 'bg-white text-slate-800 border-slate-200 hover:border-slate-400'
                    }`}
                  >
                    <span className="text-[11px] font-semibold truncate w-full">
                      {step.label}
                    </span>
                    <span
                      className={`mt-1 inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold border ${
                        isCurrent
                          ? 'bg-white/15 text-white border-white/25'
                          : badgeStyle
                      }`}
                    >
                      {statusLabel === 'Completed' ? (
                        <CheckCircle2 className="w-2.5 h-2.5" />
                      ) : statusLabel === 'In Progress' ? (
                        <Clock className="w-2.5 h-2.5" />
                      ) : statusLabel === 'Not Started' ? (
                        <AlertCircle className="w-2.5 h-2.5" />
                      ) : (
                        <MinusCircle className="w-2.5 h-2.5" />
                      )}
                      <span>{statusLabel}</span>
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {showSectionManager && (
            <div className="pt-3 border-t border-slate-200 space-y-2.5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="text-[11px] font-bold uppercase tracking-wider text-slate-600">
                  Section Order &amp; Visibility (Hidden sections preserve all saved entries)
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setActiveSection('custom-sections')}
                    className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold text-slate-800 bg-white border border-slate-300 hover:bg-slate-100 rounded cursor-pointer"
                  >
                    <Plus className="w-3 h-3" />
                    <span>Add Custom Section</span>
                  </button>
                  <button
                    type="button"
                    onClick={resetElegantSerifLayout}
                    className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-100 rounded cursor-pointer"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>Reset Order &amp; Visibility</span>
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                {getNormalizedEngineeringResumeOrder(resume.sectionOrderOverride).map((secKey, idx, arr) => {
                  const meta = ENGINEERING_RESUME_SECTION_CATALOG[secKey];
                  if (!meta) return null;
                  const hidden = isSectionHidden(secKey);
                  return (
                    <div
                      key={secKey}
                      className={`flex items-center justify-between gap-1.5 px-2.5 py-1.5 rounded border text-xs bg-white ${
                        hidden ? 'border-slate-200 opacity-65' : 'border-slate-300'
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => setActiveSection(meta.editorId)}
                        className={`text-left truncate font-medium flex-1 cursor-pointer hover:underline ${
                          hidden ? 'line-through text-slate-500' : 'text-slate-800'
                        }`}
                      >
                        {idx + 1}. {meta.baseLabel}
                      </button>
                      <div className="flex items-center gap-0.5 shrink-0">
                        <button
                          type="button"
                          onClick={() => moveElegantSerifSection(secKey, -1)}
                          disabled={idx === 0}
                          aria-label={`Move ${meta.baseLabel} up`}
                          title="Move section up"
                          className="p-1 text-slate-500 hover:text-slate-900 disabled:opacity-30 cursor-pointer"
                        >
                          <ChevronUp className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => moveElegantSerifSection(secKey, 1)}
                          disabled={idx === arr.length - 1}
                          aria-label={`Move ${meta.baseLabel} down`}
                          title="Move section down"
                          className="p-1 text-slate-500 hover:text-slate-900 disabled:opacity-30 cursor-pointer"
                        >
                          <ChevronDown className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => toggleSectionVisibility(secKey)}
                          aria-label={hidden ? `Show ${meta.baseLabel}` : `Hide ${meta.baseLabel}`}
                          title={hidden ? 'Show section' : 'Hide section without deleting data'}
                          className={`p-1 rounded cursor-pointer ${
                            hidden
                              ? 'text-amber-600 hover:text-amber-800'
                              : 'text-slate-500 hover:text-slate-900'
                          }`}
                        >
                          {hidden ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Creative Professional (Template 12) Profession Switcher, Sample Switcher & 11-Step Tracker */}
      {isCreativeProfessionalTemplate && (
        <div className="bg-blue-50/50 border border-blue-200 rounded-lg px-4 py-3.5 mb-5 space-y-3">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
            <div className="text-xs text-slate-700">
              <span className="font-bold text-blue-900">
                Creative Professional — Profession &amp; Visual Proficiency Setup:
              </span>{' '}
              <span className="text-slate-600">
                Balanced 2-column A4 editorial layout. Visual heading updates cleanly to match your profession ({getCreativeProficiencyHeading(resume)}).
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-1.5 shrink-0">
              {(
                [
                  { value: 'developer', label: 'Developer' },
                  { value: 'designer', label: 'Designer' },
                  { value: 'cybersecurity', label: 'Cybersecurity' },
                  { value: 'marketing', label: 'Marketing' },
                  { value: 'researcher', label: 'Researcher' },
                  { value: 'engineer', label: 'Engineer' },
                  { value: 'other', label: 'Custom' },
                ] as { value: CreativeProfession; label: string }[]
              ).map((opt) => {
                const active = (resume.creativeProfession || 'developer') === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => updateField('creativeProfession', opt.value)}
                    className={`px-2.5 py-1 rounded text-[11px] font-semibold border transition-colors cursor-pointer ${
                      active
                        ? 'bg-blue-700 text-white border-blue-700'
                        : 'bg-white text-slate-700 border-slate-300 hover:bg-blue-50'
                    }`}
                  >
                    {opt.label}
                  </button>
                );
              })}
              <button
                type="button"
                onClick={() => setShowSectionManager((prev) => !prev)}
                aria-expanded={showSectionManager}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded text-[11px] font-semibold border border-slate-300 bg-white text-slate-800 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <SlidersHorizontal className="w-3 h-3" />
                <span>{showSectionManager ? 'Hide Section Manager' : 'Manage Sections'}</span>
              </button>
            </div>
          </div>

          {(resume.creativeProfession === 'other' || Boolean(resume.customCreativeProfession)) && (
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 pt-2 border-t border-blue-200/80">
              <label
                htmlFor="custom-creative-profession"
                className="text-[11px] font-semibold text-slate-700 shrink-0"
              >
                Custom Profession Label:
              </label>
              <input
                id="custom-creative-profession"
                type="text"
                value={resume.customCreativeProfession || ''}
                onChange={(e) => updateField('customCreativeProfession', e.target.value)}
                placeholder="e.g. Data Journalist, Sound Designer, Biotech Lead"
                className="flex-1 px-2.5 py-1 text-xs border border-slate-300 rounded bg-white"
              />
            </div>
          )}

          {/* Sample Presets Quick Switcher */}
          <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-blue-200/80 text-[11px]">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="font-semibold text-slate-600">Load Creative Sample:</span>
              <button
                type="button"
                onClick={() => handleLoadProfile('creative-professional')}
                className="px-2 py-0.5 rounded border border-slate-300 bg-white hover:bg-blue-50 font-semibold text-slate-800 cursor-pointer"
              >
                Developer Sample
              </button>
              <button
                type="button"
                onClick={() => handleLoadProfile('creative-designer')}
                className="px-2 py-0.5 rounded border border-slate-300 bg-white hover:bg-blue-50 font-semibold text-slate-800 cursor-pointer"
              >
                Designer Sample
              </button>
              <button
                type="button"
                onClick={() => handleLoadProfile('creative-cybersecurity')}
                className="px-2 py-0.5 rounded border border-slate-300 bg-white hover:bg-blue-50 font-semibold text-slate-800 cursor-pointer"
              >
                Cybersecurity Sample
              </button>
              <button
                type="button"
                onClick={() => handleLoadProfile('creative-marketing')}
                className="px-2 py-0.5 rounded border border-slate-300 bg-white hover:bg-blue-50 font-semibold text-slate-800 cursor-pointer"
              >
                Marketing Sample
              </button>
            </div>
            <span className="text-slate-500">
              Circular Proficiency &amp; Horizontal Bar Sliders · Zero auto-fabricated ratings
            </span>
          </div>

          {/* 11-Step Guided Completion Tracker */}
          <div className="pt-2.5 border-t border-blue-200/80">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-600">
                Creative Professional Progress ({completenessReport.overallScore}% Ready)
              </span>
              <span className="text-[11px] text-slate-500">
                Click any step to edit directly
              </span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-1.5">
              {CREATIVE_PROFESSIONAL_SECTIONS.map((step) => {
                const statusInfo = getEditorSectionStatus(step.id);
                const statusLabel = statusInfo?.statusLabel || 'Optional / Skipped';
                const isCurrent = activeSection === step.id;
                const badgeStyle =
                  statusLabel === 'Completed'
                    ? 'text-emerald-700 bg-emerald-50 border-emerald-200'
                    : statusLabel === 'In Progress'
                    ? 'text-amber-700 bg-amber-50 border-amber-200'
                    : statusLabel === 'Not Started'
                    ? 'text-rose-700 bg-rose-50 border-rose-200'
                    : 'text-slate-500 bg-slate-100 border-slate-200';
                return (
                  <button
                    key={step.id}
                    type="button"
                    onClick={() => setActiveSection(step.id)}
                    className={`flex flex-col items-start justify-between p-2 rounded border text-left transition-all cursor-pointer ${
                      isCurrent
                        ? 'bg-blue-700 text-white border-blue-700 shadow-xs'
                        : 'bg-white text-slate-800 border-slate-200 hover:border-blue-400'
                    }`}
                  >
                    <span className="text-[11px] font-semibold truncate w-full">
                      {step.label}
                    </span>
                    <span
                      className={`mt-1 inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold border ${
                        isCurrent
                          ? 'bg-white/15 text-white border-white/25'
                          : badgeStyle
                      }`}
                    >
                      {statusLabel === 'Completed' ? (
                        <CheckCircle2 className="w-2.5 h-2.5" />
                      ) : statusLabel === 'In Progress' ? (
                        <Clock className="w-2.5 h-2.5" />
                      ) : statusLabel === 'Not Started' ? (
                        <AlertCircle className="w-2.5 h-2.5" />
                      ) : (
                        <MinusCircle className="w-2.5 h-2.5" />
                      )}
                      <span>{statusLabel}</span>
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {showSectionManager && (
            <div className="pt-3 border-t border-blue-200/80 space-y-2.5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="text-[11px] font-bold uppercase tracking-wider text-slate-600">
                  Section Order &amp; Visibility (Hidden sections preserve all saved entries)
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setActiveSection('custom-sections')}
                    className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold text-slate-800 bg-white border border-slate-300 hover:bg-slate-100 rounded cursor-pointer"
                  >
                    <Plus className="w-3 h-3" />
                    <span>Add Custom Section</span>
                  </button>
                  <button
                    type="button"
                    onClick={resetElegantSerifLayout}
                    className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-100 rounded cursor-pointer"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>Reset Order &amp; Visibility</span>
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                {getNormalizedCreativeProfessionalOrder(resume.sectionOrderOverride).map((secKey, idx, arr) => {
                  const meta = CREATIVE_PROFESSIONAL_SECTION_CATALOG[secKey];
                  if (!meta) return null;
                  const hidden = isSectionHidden(secKey);
                  return (
                    <div
                      key={secKey}
                      className={`flex items-center justify-between gap-1.5 px-2.5 py-1.5 rounded border text-xs bg-white ${
                        hidden ? 'border-slate-200 opacity-65' : 'border-slate-300'
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => setActiveSection(meta.editorId)}
                        className={`text-left truncate font-medium flex-1 cursor-pointer hover:underline ${
                          hidden ? 'line-through text-slate-500' : 'text-slate-800'
                        }`}
                      >
                        {idx + 1}. {meta.baseLabel}
                      </button>
                      <div className="flex items-center gap-0.5 shrink-0">
                        <button
                          type="button"
                          onClick={() => moveElegantSerifSection(secKey, -1)}
                          disabled={idx === 0}
                          aria-label={`Move ${meta.baseLabel} up`}
                          title="Move section up"
                          className="p-1 text-slate-500 hover:text-slate-900 disabled:opacity-30 cursor-pointer"
                        >
                          <ChevronUp className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => moveElegantSerifSection(secKey, 1)}
                          disabled={idx === arr.length - 1}
                          aria-label={`Move ${meta.baseLabel} down`}
                          title="Move section down"
                          className="p-1 text-slate-500 hover:text-slate-900 disabled:opacity-30 cursor-pointer"
                        >
                          <ChevronDown className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => toggleSectionVisibility(secKey)}
                          aria-label={hidden ? `Show ${meta.baseLabel}` : `Hide ${meta.baseLabel}`}
                          title={hidden ? 'Show section' : 'Hide section without deleting data'}
                          className={`p-1 rounded cursor-pointer ${
                            hidden
                              ? 'text-amber-600 hover:text-amber-800'
                              : 'text-slate-500 hover:text-slate-900'
                          }`}
                        >
                          {hidden ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Editor Body: Sidebar + Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Navigation Sidebar */}
        <nav
          className="lg:col-span-4 bg-white border border-slate-200 rounded-lg p-2.5 shadow-xs space-y-1"
          aria-label="CV sections"
        >
          <div className="px-3 py-2 text-xs font-bold uppercase tracking-wider text-slate-500 flex justify-between items-center">
            <span>
              {isTwoColumnTemplate
                ? 'Two Column Sections'
                : isSoftwareDevTemplate
                ? 'Software Dev Sections'
                : isHarvardTemplate
                ? 'Harvard Style Sections'
                : isElegantSerifTemplate
                ? 'Elegant Serif Sections'
                : isModernCorporateTemplate
                ? 'Modern Corporate Sections'
                : isFresherResumeTemplate
                ? 'Fresher Resume Sections'
                : isInternshipResumeTemplate
                ? 'Internship Resume (10 Steps)'
                : isEngineeringResumeTemplate
                ? 'Engineering Resume (9 Steps)'
                : isCreativeProfessionalTemplate
                ? 'Creative Prof. Sections'
                : isJakesTemplate
                ? "Resume Sections (Jake's)"
                : isClassicTemplate
                ? 'Classic CV Sections'
                : 'CV Sections'}
            </span>
            <button
              type="button"
              onClick={() => setIsCompletenessOpen(true)}
              className="text-[11px] font-bold text-indigo-600 hover:text-indigo-800 cursor-pointer"
              title="View full completeness audit"
            >
              Audit ({completenessReport.overallScore}%)
            </button>
          </div>

          {sidebarSections.map((sec) => {
            const Icon = sec.icon;
            const isActive = activeSection === sec.id;
            const hidden = isSectionHidden(sec.id);
            const statusInfo = getEditorSectionStatus(sec.id);
            const inActiveTemplate =
              isTwoColumnTemplate ||
              isClassicTemplate ||
              isSoftwareDevTemplate ||
              isHarvardTemplate ||
              isElegantSerifTemplate ||
              isModernCorporateTemplate ||
              isFresherResumeTemplate ||
              isInternshipResumeTemplate ||
              isEngineeringResumeTemplate ||
              isCreativeProfessionalTemplate ||
              !isJakesTemplate ||
              JAKES_EDITOR_SECTIONS.has(sec.id);

            return (
              <div
                key={sec.id}
                className={`flex items-center justify-between rounded text-sm transition-colors ${
                  isActive
                    ? 'bg-slate-900 text-white shadow-xs font-semibold'
                    : inActiveTemplate
                    ? 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
                    : 'text-slate-400 hover:bg-slate-50 hover:text-slate-600'
                }`}
              >
                <button
                  type="button"
                  onClick={() => setActiveSection(sec.id)}
                  className="flex-1 flex items-center space-x-2.5 px-3 py-2 text-left min-w-0"
                >
                  <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                  <span className={`truncate text-xs ${hidden ? 'line-through opacity-60' : ''}`}>
                    {sec.label}
                  </span>
                  {statusInfo && inActiveTemplate && (
                    <span
                      className={`w-2 h-2 rounded-full shrink-0 ml-auto ${
                        statusInfo.status === 'complete'
                          ? 'bg-emerald-500'
                          : statusInfo.status === 'optional_empty'
                          ? 'bg-slate-300'
                          : 'bg-amber-400'
                      }`}
                      title={statusInfo.statusLabel}
                    />
                  )}
                </button>

                {sec.id !== 'header' && (
                  <button
                    type="button"
                    onClick={() => toggleSectionVisibility(sec.id)}
                    className={`p-2 transition-colors mr-1 rounded ${
                      isActive
                        ? 'text-slate-300 hover:text-white'
                        : 'text-slate-400 hover:text-slate-700'
                    }`}
                    title={hidden ? 'Show this section' : 'Hide this section in final CV'}
                    aria-label={`Toggle visibility of ${sec.label}`}
                  >
                    {hidden ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                )}
              </div>
            );
          })}

          <div className="pt-3 mt-3 border-t border-slate-200 px-3">
            <button
              onClick={handleBackToDashboardClick}
              className="w-full inline-flex items-center text-xs font-semibold text-slate-600 hover:text-slate-900 py-1.5 cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5 mr-1.5" />
              <span>Back to Dashboard</span>
            </button>
          </div>
        </nav>

        {/* Section Forms Container */}
        <main className="lg:col-span-8 bg-white border border-slate-200 rounded-lg p-6 sm:p-8 shadow-xs">
          {lastImproveUndo && (
            <div
              role="status"
              className="mb-5 px-3.5 py-2.5 rounded-lg border border-indigo-200 bg-indigo-50/80 flex flex-wrap items-center justify-between gap-2 text-xs"
            >
              <div className="flex items-center gap-2 text-indigo-950">
                <Sparkles className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                <span>
                  AI suggestion applied to <strong className="uppercase">{lastImproveUndo.label}</strong>.
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={lastImproveUndo.onRestore}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-white border border-indigo-300 text-indigo-800 hover:bg-indigo-100 font-semibold cursor-pointer"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Restore Original</span>
                </button>
                <button
                  type="button"
                  onClick={() => setLastImproveUndo(null)}
                  className="px-2 py-1 text-slate-500 hover:text-slate-800 font-medium cursor-pointer"
                >
                  Dismiss
                </button>
              </div>
            </div>
          )}

          {/* 1. Header / Personal Info */}
          {activeSection === 'header' && (
            <section aria-labelledby="section-header-title">
              <div className="border-b border-slate-200 pb-3 mb-5">
                <h2 id="section-header-title" className="text-lg font-bold text-slate-900">
                  {isClassicTemplate || isTwoColumnTemplate || isElegantSerifTemplate || isModernCorporateTemplate
                    ? 'Personal Header & Optional Photo'
                    : 'Personal Header'}
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  {isJakesTemplate
                    ? "Displayed centered at the top of Jake's Resume with small caps, address, and contact links."
                    : isSoftwareDevTemplate
                    ? 'Centered large blue full name, street/city address below, and horizontal icon contact links.'
                    : isHarvardTemplate
                    ? 'Centered full name with a single compact horizontal contact line below (street/city/postal/country, email, phone, and optional links). No photograph is displayed.'
                    : isElegantSerifTemplate
                    ? 'Monochrome editorial light-grey banner with centered large serif name, tagline, metadata (location, nationality, DOB), and clickable contact links. No photo is shown unless you upload one.'
                    : isModernCorporateTemplate
                    ? 'Overleaf ModernCV Classic split header: two-tone light sans-serif name and italic title on left, right-aligned italic icon contact stack and optional framed portrait on right.'
                    : isFresherResumeTemplate
                    ? 'Overleaf 3-column fresher header: Phone & Email on left, centered Name & Target Job Role in middle, and clickable LinkedIn / GitHub / Portfolio links on right. No photograph.'
                    : isInternshipResumeTemplate
                    ? 'Two-column Internship Resume header: bold uppercase name, headline below, and compact horizontal icon contact row (email, phone, location, LinkedIn, GitHub, portfolio). No photograph.'
                    : isEngineeringResumeTemplate
                    ? 'Monochrome Engineering Resume header: centered bold name with compact horizontal clickable contacts separated by "|" (location | phone | email | LinkedIn | GitHub | portfolio). No photograph.'
                    : isCreativeProfessionalTemplate
                    ? 'Centered Creative Professional editorial header: bold surname split name, blue professional headline + specialization, tagline, horizontal contact icons, and optional personal quote.'
                    : isClassicTemplate
                    ? 'Structured Classic Professional header with contact details, multiple phones, and an optional framed portrait photo.'
                    : isTwoColumnTemplate
                    ? 'Bold top header with tagline, compact icon contact links, and an optional circular profile photograph.'
                    : 'Displayed at the top-center of the formal academic CV.'}
                </p>
              </div>

              {(isClassicTemplate || isTwoColumnTemplate || isElegantSerifTemplate || isModernCorporateTemplate) && (
                <div className="mb-5 p-4 rounded-xl border border-slate-200 bg-slate-50/70">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                      {resume.personalInfo.photoUrl ? (
                        <img
                          src={resume.personalInfo.photoUrl}
                          alt="Profile portrait preview"
                          className={`bg-white object-cover shrink-0 shadow-xs ${
                            isTwoColumnTemplate || resume.personalInfo.photoShape === 'circle'
                              ? isElegantSerifTemplate
                                ? 'w-16 h-16 rounded-full border-2 border-slate-800'
                                : 'w-16 h-16 rounded-full border-2 border-[#e5c57a] ring-1 ring-[#8f131b]/30'
                              : resume.personalInfo.photoShape === 'square'
                              ? isElegantSerifTemplate
                                ? 'w-16 h-16 border border-slate-800'
                                : isModernCorporateTemplate
                                ? 'w-16 h-16 border-2 border-[#3873b3]'
                                : 'w-16 h-16 border-2 border-[#1e4e8c]'
                              : isElegantSerifTemplate
                              ? 'w-14 h-18 border border-slate-800'
                              : isModernCorporateTemplate
                              ? 'w-14 h-18 border-2 border-[#3873b3]'
                              : 'w-14 h-18 border-2 border-[#1e4e8c]'
                          }`}
                        />
                      ) : (
                        <div
                          className={`border border-dashed border-slate-300 bg-white flex flex-col items-center justify-center text-slate-400 shrink-0 ${
                            isTwoColumnTemplate ? 'w-16 h-16 rounded-full' : 'w-14 h-18 rounded'
                          }`}
                        >
                          <Camera className="w-5 h-5 mb-0.5" />
                          <span className="text-[9px] font-medium">Optional</span>
                        </div>
                      )}
                      <div>
                        <div className="text-xs font-bold text-slate-800">
                          Profile Photograph (Optional)
                        </div>
                        <p className="text-[11px] text-slate-500 mt-0.5 max-w-md">
                          {isElegantSerifTemplate
                            ? 'Hidden by default in Modern Simple CV. Upload an optional monochrome/portrait headshot only if required; leave empty for the clean borderless banner.'
                            : isModernCorporateTemplate
                            ? 'Optional in ModernCV Classic. Upload a framed corporate portrait on the top right only if desired; leave empty to omit cleanly.'
                            : isTwoColumnTemplate
                            ? 'Upload a JPG, PNG, or WebP headshot cropped to Circle (1:1), Square, or Portrait. Leave empty to omit cleanly.'
                            : 'Upload a JPG, PNG, or WebP headshot and crop to Classic Portrait (3:4) or Square (1:1). Leave empty to omit the photo cleanly.'}
                        </p>
                        {photoError && (
                          <p className="text-[11px] font-medium text-rose-600 mt-1">{photoError}</p>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 shrink-0">
                      <label
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white rounded-lg shadow-xs cursor-pointer transition-colors ${
                          isTwoColumnTemplate
                            ? 'bg-[#8f131b] hover:bg-[#700d14]'
                            : isElegantSerifTemplate
                            ? 'bg-slate-900 hover:bg-black'
                            : isModernCorporateTemplate
                            ? 'bg-[#3873b3] hover:bg-[#2b5c91]'
                            : 'bg-[#1e4e8c] hover:bg-[#173d6e]'
                        }`}
                      >
                        <Camera className="w-3.5 h-3.5" />
                        <span>{resume.personalInfo.photoUrl ? 'Replace Photo' : 'Upload Photo'}</span>
                        <input
                          type="file"
                          accept="image/png,image/jpeg,image/webp"
                          onChange={handlePhotoFileSelect}
                          className="hidden"
                        />
                      </label>
                      {resume.personalInfo.photoUrl && (
                        <>
                          <button
                            type="button"
                            onClick={() =>
                              setPhotoCropModal({
                                isOpen: true,
                                imageSrc: resume.personalInfo.photoUrl || '',
                              })
                            }
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg cursor-pointer"
                          >
                            <Crop className="w-3.5 h-3.5" />
                            <span>Crop</span>
                          </button>
                          <button
                            type="button"
                            onClick={handleRemovePhoto}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-rose-700 bg-white border border-rose-200 hover:bg-rose-50 rounded-lg cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>Remove</span>
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Full Name *
                  </label>
                  <input
                    type="text"
                    value={resume.personalInfo.fullName}
                    onChange={(e) => updatePersonalInfo('fullName', e.target.value)}
                    placeholder="e.g. Dr. Eleanor V. Chen or Alex Morgan"
                    className="w-full px-3 py-2 border border-slate-300 rounded text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-slate-900"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Academic / Professional Headline (Optional)
                  </label>
                  <input
                    type="text"
                    value={resume.personalInfo.jobTitle || ''}
                    onChange={(e) => updatePersonalInfo('jobTitle', e.target.value)}
                    placeholder="e.g. Research Scientist in Computational Biology"
                    className="w-full px-3 py-2 border border-slate-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Email Address *
                  </label>
                  <input
                    type="email"
                    value={resume.personalInfo.email}
                    onChange={(e) => updatePersonalInfo('email', e.target.value)}
                    placeholder="eleanor.chen@stanford.edu"
                    className="w-full px-3 py-2 border border-slate-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Phone Number *
                  </label>
                  <input
                    type="tel"
                    value={resume.personalInfo.phone}
                    onChange={(e) => updatePersonalInfo('phone', e.target.value)}
                    placeholder="+1 (650) 723-2300"
                    className="w-full px-3 py-2 border border-slate-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    {isHarvardTemplate
                      ? 'Home or Campus Street Address (Optional)'
                      : "Street Address (Optional — displayed under name in Jake's Resume)"}
                  </label>
                  <input
                    type="text"
                    value={resume.personalInfo.streetAddress || ''}
                    onChange={(e) => updatePersonalInfo('streetAddress', e.target.value)}
                    placeholder="123 Street Name"
                    className="w-full px-3 py-2 border border-slate-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">City</label>
                  <input
                    type="text"
                    value={resume.personalInfo.city || ''}
                    onChange={(e) => updatePersonalInfo('city', e.target.value)}
                    placeholder="Stanford"
                    className="w-full px-3 py-2 border border-slate-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    State / Province
                  </label>
                  <input
                    type="text"
                    value={resume.personalInfo.state || ''}
                    onChange={(e) => updatePersonalInfo('state', e.target.value)}
                    placeholder="CA"
                    className="w-full px-3 py-2 border border-slate-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    ZIP / Postal Code
                  </label>
                  <input
                    type="text"
                    value={resume.personalInfo.postalCode || ''}
                    onChange={(e) => updatePersonalInfo('postalCode', e.target.value)}
                    placeholder="94305"
                    className="w-full px-3 py-2 border border-slate-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Country</label>
                  <input
                    type="text"
                    value={resume.personalInfo.country || ''}
                    onChange={(e) => updatePersonalInfo('country', e.target.value)}
                    placeholder="United States"
                    className="w-full px-3 py-2 border border-slate-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Personal / Lab Website
                  </label>
                  <input
                    type="url"
                    value={resume.personalInfo.website || ''}
                    onChange={(e) => updatePersonalInfo('website', e.target.value)}
                    placeholder="https://eleanorchen.lab.stanford.edu"
                    className="w-full px-3 py-2 border border-slate-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    LinkedIn Profile
                  </label>
                  <input
                    type="text"
                    value={resume.personalInfo.linkedin || ''}
                    onChange={(e) => updatePersonalInfo('linkedin', e.target.value)}
                    placeholder="linkedin.com/in/eleanor-v-chen"
                    className="w-full px-3 py-2 border border-slate-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    GitHub / Code Repository
                  </label>
                  <input
                    type="text"
                    value={resume.personalInfo.github || ''}
                    onChange={(e) => updatePersonalInfo('github', e.target.value)}
                    placeholder="github.com/eleanor-chen-lab"
                    className="w-full px-3 py-2 border border-slate-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Academic Profiles (Google Scholar, ORCID, etc.)
                  </label>
                  <input
                    type="text"
                    value={resume.personalInfo.otherProfiles || ''}
                    onChange={(e) => updatePersonalInfo('otherProfiles', e.target.value)}
                    placeholder="ORCID: 0000-0002-1825-0097 | Google Scholar: EVCHEN99"
                    className="w-full px-3 py-2 border border-slate-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
                  />
                </div>

                {isTwoColumnTemplate && (
                  <>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Twitter / X Handle (Optional)
                      </label>
                      <input
                        type="text"
                        value={resume.personalInfo.twitter || ''}
                        onChange={(e) => updatePersonalInfo('twitter', e.target.value)}
                        placeholder="e.g. @elenavance_sys"
                        className="w-full px-3 py-2 border border-slate-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        ORCID iD (Optional)
                      </label>
                      <input
                        type="text"
                        value={resume.personalInfo.orcid || ''}
                        onChange={(e) => updatePersonalInfo('orcid', e.target.value)}
                        placeholder="e.g. 0000-0002-1825-0097"
                        className="w-full px-3 py-2 border border-slate-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        GitLab Username (Optional)
                      </label>
                      <input
                        type="text"
                        value={resume.personalInfo.gitlab || ''}
                        onChange={(e) => updatePersonalInfo('gitlab', e.target.value)}
                        placeholder="e.g. evance-lab"
                        className="w-full px-3 py-2 border border-slate-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Mastodon Handle (Optional)
                      </label>
                      <input
                        type="text"
                        value={resume.personalInfo.mastodon || ''}
                        onChange={(e) => updatePersonalInfo('mastodon', e.target.value)}
                        placeholder="e.g. @evance@fosstodon.org"
                        className="w-full px-3 py-2 border border-slate-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
                      />
                    </div>

                    <div className="sm:col-span-2 pt-3 border-t border-slate-200">
                      <div className="flex items-center justify-between mb-2">
                        <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                          <Link2 className="w-3.5 h-3.5 text-slate-500" />
                          <span>Additional Social / Profile Links (Optional)</span>
                        </label>
                        <button
                          type="button"
                          onClick={() =>
                            updateField('personalInfo', {
                              ...resume.personalInfo,
                              customLinks: [
                                ...(resume.personalInfo.customLinks || []),
                                { id: `lnk_${Date.now()}`, label: '', url: '' },
                              ],
                            })
                          }
                          className="text-xs font-semibold text-[#8f131b] hover:underline cursor-pointer"
                        >
                          + Add Custom Link
                        </button>
                      </div>
                      {(resume.personalInfo.customLinks || []).length > 0 && (
                        <div className="space-y-2">
                          {(resume.personalInfo.customLinks || []).map((lnk) => (
                            <div key={lnk.id} className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-center">
                              <input
                                type="text"
                                value={lnk.label}
                                onChange={(e) =>
                                  updateField('personalInfo', {
                                    ...resume.personalInfo,
                                    customLinks: (resume.personalInfo.customLinks || []).map((x) =>
                                      x.id === lnk.id ? { ...x, label: e.target.value } : x
                                    ),
                                  })
                                }
                                placeholder="Label (e.g. Google Scholar)"
                                className="sm:col-span-5 px-2.5 py-1.5 border border-slate-300 rounded text-xs bg-white"
                              />
                              <input
                                type="url"
                                value={lnk.url}
                                onChange={(e) =>
                                  updateField('personalInfo', {
                                    ...resume.personalInfo,
                                    customLinks: (resume.personalInfo.customLinks || []).map((x) =>
                                      x.id === lnk.id ? { ...x, url: e.target.value } : x
                                    ),
                                  })
                                }
                                placeholder="https://scholar.google.com/..."
                                className="sm:col-span-6 px-2.5 py-1.5 border border-slate-300 rounded text-xs bg-white"
                              />
                              <button
                                type="button"
                                onClick={() =>
                                  updateField('personalInfo', {
                                    ...resume.personalInfo,
                                    customLinks: (resume.personalInfo.customLinks || []).filter(
                                      (x) => x.id !== lnk.id
                                    ),
                                  })
                                }
                                className="sm:col-span-1 p-1.5 text-slate-400 hover:text-rose-600 rounded justify-self-end"
                                title="Remove custom link"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </>
                )}

                {(isSoftwareDevTemplate ||
                  isHarvardTemplate ||
                  isElegantSerifTemplate ||
                  isModernCorporateTemplate ||
                  isFresherResumeTemplate ||
                  isInternshipResumeTemplate ||
                  isEngineeringResumeTemplate ||
                  isCreativeProfessionalTemplate) &&
                  !isTwoColumnTemplate && (
                  <div className="sm:col-span-2 pt-3 border-t border-slate-200">
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                        <Link2 className="w-3.5 h-3.5 text-slate-500" />
                        <span>Additional Portfolio / Profile Links (Optional)</span>
                      </label>
                      <button
                        type="button"
                        onClick={() =>
                          updateField('personalInfo', {
                            ...resume.personalInfo,
                            customLinks: [
                              ...(resume.personalInfo.customLinks || []),
                              { id: `lnk_${Date.now()}`, label: '', url: '' },
                            ],
                          })
                        }
                        className="text-xs font-semibold text-[#1e4e8c] hover:underline cursor-pointer"
                      >
                        + Add Custom Link
                      </button>
                    </div>
                    {(resume.personalInfo.customLinks || []).length > 0 && (
                      <div className="space-y-2">
                        {(resume.personalInfo.customLinks || []).map((lnk) => (
                          <div key={lnk.id} className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-center">
                            <input
                              type="text"
                              value={lnk.label}
                              onChange={(e) =>
                                updateField('personalInfo', {
                                  ...resume.personalInfo,
                                  customLinks: (resume.personalInfo.customLinks || []).map((x) =>
                                    x.id === lnk.id ? { ...x, label: e.target.value } : x
                                  ),
                                })
                              }
                              placeholder="Label (e.g. Google Scholar / Portfolio)"
                              className="sm:col-span-5 px-2.5 py-1.5 border border-slate-300 rounded text-xs bg-white"
                            />
                            <input
                              type="url"
                              value={lnk.url}
                              onChange={(e) =>
                                updateField('personalInfo', {
                                  ...resume.personalInfo,
                                  customLinks: (resume.personalInfo.customLinks || []).map((x) =>
                                    x.id === lnk.id ? { ...x, url: e.target.value } : x
                                  ),
                                })
                              }
                              placeholder="https://..."
                              className="sm:col-span-6 px-2.5 py-1.5 border border-slate-300 rounded text-xs bg-white"
                            />
                            <button
                              type="button"
                              onClick={() =>
                                updateField('personalInfo', {
                                  ...resume.personalInfo,
                                  customLinks: (resume.personalInfo.customLinks || []).filter(
                                    (x) => x.id !== lnk.id
                                  ),
                                })
                              }
                              className="sm:col-span-1 p-1.5 text-slate-400 hover:text-rose-600 rounded justify-self-end"
                              title="Remove custom link"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {isElegantSerifTemplate && (
                  <>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        ORCID iD (Optional)
                      </label>
                      <input
                        type="text"
                        value={resume.personalInfo.orcid || ''}
                        onChange={(e) => updatePersonalInfo('orcid', e.target.value)}
                        placeholder="e.g. 0000-0002-8412-9017"
                        className="w-full px-3 py-2 border border-slate-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Nationality / Citizenship (Optional)
                      </label>
                      <input
                        type="text"
                        value={resume.personalInfo.nationality || ''}
                        onChange={(e) => updatePersonalInfo('nationality', e.target.value)}
                        placeholder="e.g. British / German"
                        className="w-full px-3 py-2 border border-slate-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Date of Birth (Optional)
                      </label>
                      <input
                        type="text"
                        value={resume.personalInfo.dateOfBirth || ''}
                        onChange={(e) => updatePersonalInfo('dateOfBirth', e.target.value)}
                        placeholder="e.g. 14 May 1994"
                        className="w-full px-3 py-2 border border-slate-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Additional Header Note (Optional)
                      </label>
                      <input
                        type="text"
                        value={resume.personalInfo.additionalInfo || ''}
                        onChange={(e) => updatePersonalInfo('additionalInfo', e.target.value)}
                        placeholder="e.g. EU & UK Work Authorization"
                        className="w-full px-3 py-2 border border-slate-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
                      />
                    </div>
                  </>
                )}

                {(isClassicTemplate || isModernCorporateTemplate) && (
                  <>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Secondary Phone (Optional)
                      </label>
                      <input
                        type="tel"
                        value={resume.personalInfo.secondaryPhone || ''}
                        onChange={(e) => updatePersonalInfo('secondaryPhone', e.target.value)}
                        placeholder="+49 89 1234 5678"
                        className="w-full px-3 py-2 border border-slate-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Additional / Home Phone (Optional)
                      </label>
                      <input
                        type="tel"
                        value={resume.personalInfo.additionalPhone || ''}
                        onChange={(e) => updatePersonalInfo('additionalPhone', e.target.value)}
                        placeholder="+49 170 9876 543"
                        className="w-full px-3 py-2 border border-slate-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Date of Birth (Optional)
                      </label>
                      <input
                        type="text"
                        value={resume.personalInfo.dateOfBirth || ''}
                        onChange={(e) => updatePersonalInfo('dateOfBirth', e.target.value)}
                        placeholder="e.g. 14 May 1995 (optional)"
                        className="w-full px-3 py-2 border border-slate-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Additional Personal Details (Optional)
                      </label>
                      <input
                        type="text"
                        value={resume.personalInfo.additionalInfo || ''}
                        onChange={(e) => updatePersonalInfo('additionalInfo', e.target.value)}
                        placeholder="e.g. CFA Charterholder · EU & UK Work Authorization"
                        className="w-full px-3 py-2 border border-slate-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
                      />
                    </div>
                  </>
                )}

                {isCreativeProfessionalTemplate && (
                  <>
                    <div>
                      <label
                        htmlFor="creative-specialization-input"
                        className="block text-xs font-semibold text-slate-700 mb-1"
                      >
                        Specialization / Focus (Optional)
                      </label>
                      <input
                        id="creative-specialization-input"
                        type="text"
                        value={resume.personalInfo.specialization || ''}
                        onChange={(e) => updatePersonalInfo('specialization', e.target.value)}
                        placeholder="e.g. Design Systems · Distributed Web Architecture"
                        className="w-full px-3 py-2 border border-slate-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-700"
                      />
                    </div>

                    <div>
                      <label
                        htmlFor="creative-tagline-input"
                        className="block text-xs font-semibold text-slate-700 mb-1"
                      >
                        Tagline / Sub-headline (Optional)
                      </label>
                      <input
                        id="creative-tagline-input"
                        type="text"
                        value={resume.personalInfo.tagline || ''}
                        onChange={(e) => updatePersonalInfo('tagline', e.target.value)}
                        placeholder="e.g. Building resilient products where engineering meets craft."
                        className="w-full px-3 py-2 border border-slate-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-700"
                      />
                    </div>

                    <div className="sm:col-span-2">
                      <div className="flex items-center justify-between mb-1">
                        <label
                          htmlFor="creative-quote-input"
                          className="block text-xs font-semibold text-slate-700"
                        >
                          Centered Personal Quote (Optional — leave blank to omit cleanly)
                        </label>
                        {resume.personalQuote?.trim() && (
                          <button
                            type="button"
                            onClick={() =>
                              handleOpenImprove(
                                resume.personalQuote || '',
                                'quote',
                                `Creative Professional tagline quote for ${resume.personalInfo.jobTitle || 'creative role'}`,
                                (improved) => updateField('personalQuote', improved)
                              )
                            }
                            className="inline-flex items-center gap-1 text-[11px] font-semibold text-indigo-700 hover:underline cursor-pointer"
                          >
                            <Sparkles className="w-3 h-3" />
                            <span>AI Improve</span>
                          </button>
                        )}
                      </div>
                      <input
                        id="creative-quote-input"
                        type="text"
                        value={resume.personalQuote || ''}
                        onChange={(e) => updateField('personalQuote', e.target.value)}
                        placeholder='e.g. “Thoughtful software respects both human attention and engineering simplicity.”'
                        className="w-full px-3 py-2 border border-slate-300 rounded text-sm italic focus:outline-none focus:ring-2 focus:ring-blue-700"
                      />
                    </div>
                  </>
                )}
              </div>
            </section>
          )}

          {/* 2. Objective / Summary */}
          {activeSection === 'objective' && (
            <section aria-labelledby="section-objective-title">
              <div className="border-b border-slate-200 pb-3 mb-5 flex items-center justify-between">
                <div>
                  <h2 id="section-objective-title" className="text-lg font-bold text-slate-900">
                    {isClassicTemplate || isModernCorporateTemplate
                      ? 'Professional Summary & Personal Quote'
                      : isElegantSerifTemplate
                      ? 'Professional Profile'
                      : isFresherResumeTemplate
                      ? 'Career Highlights & Impact Summary'
                      : isEngineeringResumeTemplate
                      ? 'Career Objective'
                      : 'Career Objective / Professional Summary'}
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {isClassicTemplate || isModernCorporateTemplate
                      ? 'Concise executive summary plus an optional centered italic opening motto / quote displayed beneath your header.'
                      : isElegantSerifTemplate
                      ? 'Optional concise editorial profile statement, academic interests, and career goals.'
                      : isFresherResumeTemplate
                      ? 'Centered keyword highlights (separated by •) and concise 1–2 line Impact statement below the Overleaf 3-column header. Leave blank to hide.'
                      : isEngineeringResumeTemplate
                      ? 'Concise 1–3 line engineering career objective naming your branch, core tools, and target roles. Leave blank to omit.'
                      : 'Displayed underneath the OBJECTIVE section heading as a clean paragraph.'}
                  </p>
                </div>
                {resume.objective?.trim() && (
                  <button
                    type="button"
                    onClick={() =>
                      handleOpenImprove(
                        resume.objective || '',
                        isClassicTemplate || isModernCorporateTemplate
                          ? 'Professional Summary'
                          : isElegantSerifTemplate
                          ? 'Professional Profile'
                          : isFresherResumeTemplate
                          ? 'Impact Statement'
                          : 'Career Objective',
                        resume.targetRole,
                        (improved) => updateField('objective', improved)
                      )
                    }
                    className="inline-flex items-center text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 px-3 py-1.5 rounded-lg shadow-2xs transition-colors cursor-pointer"
                  >
                    <Sparkles className="w-3.5 h-3.5 mr-1.5 text-indigo-600" />
                    <span>AI Improve</span>
                  </button>
                )}
              </div>

              <div className="space-y-4">
                {isFresherResumeTemplate && (
                  <div className="p-3.5 rounded-lg border border-slate-200 bg-slate-50/70 space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="block text-xs font-semibold text-slate-700">
                        Header Keywords / Core Highlights (Optional, comma-separated)
                      </label>
                      <button
                        type="button"
                        onClick={() => toggleSectionVisibility('strengths')}
                        className="text-[11px] font-semibold text-slate-600 hover:text-slate-900 underline cursor-pointer"
                      >
                        {isSectionHidden('strengths') ? 'Show Keywords Line' : 'Hide Keywords Line'}
                      </button>
                    </div>
                    <CommaArrayInput
                      ariaLabel="Fresher Highlights Keywords"
                      value={resume.strengths}
                      onChange={(items) => updateField('strengths', items)}
                      placeholder="e.g. Full-Stack Engineering, Distributed Systems, Cloud Infrastructure"
                      className="w-full px-3 py-2 border border-slate-300 rounded text-sm bg-white focus:outline-none focus:ring-2 focus:ring-slate-900"
                    />
                    <p className="text-[11px] text-slate-500">
                      Rendered centered below the header divider as bold bullet-separated keywords. Only items you enter are shown.
                    </p>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    {isClassicTemplate || isModernCorporateTemplate
                      ? 'Professional Summary'
                      : isElegantSerifTemplate
                      ? 'Profile Summary'
                      : isFresherResumeTemplate
                      ? 'Impact Statement / Career Summary (Optional)'
                      : isEngineeringResumeTemplate
                      ? 'Career Objective (Optional — 1 to 3 concise sentences)'
                      : 'Objective / Summary'}
                  </label>
                  <textarea
                    rows={5}
                    value={resume.objective || ''}
                    onChange={(e) => updateField('objective', e.target.value)}
                    placeholder={
                      isFresherResumeTemplate
                        ? 'e.g. Final-year Computer Science undergraduate experienced in shipping backend APIs and open-source developer tools.'
                        : isEngineeringResumeTemplate
                        ? 'e.g. Final-year Mechanical Engineering undergraduate proficient in SolidWorks, ANSYS FEA, and GD&T, seeking a Design or Manufacturing Engineer role.'
                        : 'Dedicated corporate strategy executive or engineering leader with 8+ years of experience...'
                    }
                    className="w-full p-3 border border-slate-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-slate-900 leading-relaxed font-serif"
                  />
                  <p className="text-xs text-slate-400 mt-1.5">
                    Leave empty if you prefer not to include a summary statement.
                  </p>
                </div>

                {(isClassicTemplate || isModernCorporateTemplate) && (
                  <div className="pt-3 border-t border-slate-200">
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-xs font-semibold text-slate-700">
                        Opening Personal Quote / Motto (Optional)
                      </label>
                      {resume.personalQuote?.trim() && (
                        <button
                          type="button"
                          onClick={() =>
                            handleOpenImprove(
                              resume.personalQuote || '',
                              'Personal Quote',
                              resume.targetRole,
                              (improved) => updateField('personalQuote', improved)
                            )
                          }
                          className="inline-flex items-center text-[11px] font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 px-2 py-0.5 rounded transition-colors cursor-pointer"
                        >
                          <Sparkles className="w-3 h-3 mr-1 text-indigo-600" />
                          <span>AI Improve</span>
                        </button>
                      )}
                    </div>
                    <input
                      type="text"
                      value={resume.personalQuote || ''}
                      onChange={(e) => updateField('personalQuote', e.target.value)}
                      placeholder="e.g. Turning complex capital allocation decisions into durable operational performance."
                      className="w-full px-3 py-2 border border-slate-300 rounded text-sm italic bg-white focus:outline-none focus:ring-2 focus:ring-slate-900"
                    />
                  </div>
                )}

                {isElegantSerifTemplate && (
                  <div className="pt-3 border-t border-slate-200 grid grid-cols-1 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Academic / Research Interests (Optional)
                      </label>
                      <input
                        type="text"
                        value={resume.academicInterests || ''}
                        onChange={(e) => updateField('academicInterests', e.target.value)}
                        placeholder="e.g. Human-Computer Interaction, Editorial Typography, Interpretability"
                        className="w-full px-3 py-2 border border-slate-300 rounded text-sm bg-white focus:outline-none focus:ring-2 focus:ring-slate-900"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Career Goals (Optional)
                      </label>
                      <input
                        type="text"
                        value={resume.careerGoals || ''}
                        onChange={(e) => updateField('careerGoals', e.target.value)}
                        placeholder="e.g. Seeking senior research leadership or principal faculty appointments"
                        className="w-full px-3 py-2 border border-slate-300 rounded text-sm bg-white focus:outline-none focus:ring-2 focus:ring-slate-900"
                      />
                    </div>
                  </div>
                )}
              </div>
            </section>
          )}

          {/* 3. Education */}
          {activeSection === 'education' && (
            <section aria-labelledby="section-edu-title">
              <div className="border-b border-slate-200 pb-3 mb-5 flex items-center justify-between">
                <div>
                  <h2 id="section-edu-title" className="text-lg font-bold text-slate-900">
                    {isCreativeProfessionalTemplate ? 'Degrees (Education)' : 'Education'}
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {isCreativeProfessionalTemplate
                      ? 'Rendered in the right column under DEGREES with a clean date rail and vertical divider.'
                      : 'Degrees, universities, specializations, graduation dates, and achievements.'}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={addEducation}
                  className="inline-flex items-center px-3 py-1.5 text-xs font-semibold text-white bg-slate-900 hover:bg-black rounded shadow-xs"
                >
                  <Plus className="w-3.5 h-3.5 mr-1" />
                  <span>Add Degree</span>
                </button>
              </div>

              {(!resume.education || resume.education.length === 0) ? (
                <div className="p-8 text-center border border-dashed border-slate-300 rounded-lg">
                  <p className="text-xs text-slate-500">No education entries added yet.</p>
                  <button
                    onClick={addEducation}
                    className="mt-2 text-xs font-bold text-slate-900 hover:underline"
                  >
                    + Add your first degree
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  {resume.education.map((edu, idx) => (
                    <div
                      key={edu.id}
                      className="p-4 border border-slate-200 rounded-lg bg-slate-50/50 space-y-3"
                    >
                      <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                        <span className="text-xs font-bold uppercase text-slate-600">
                          Degree #{idx + 1}
                        </span>
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => moveArrayItem('education', idx, -1)}
                            disabled={idx === 0}
                            className="p-1 text-slate-400 hover:text-slate-700 disabled:opacity-30 rounded cursor-pointer"
                            title="Move up"
                            aria-label={`Move degree ${idx + 1} up`}
                          >
                            <ChevronUp className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => moveArrayItem('education', idx, 1)}
                            disabled={idx === resume.education.length - 1}
                            className="p-1 text-slate-400 hover:text-slate-700 disabled:opacity-30 rounded cursor-pointer"
                            title="Move down"
                            aria-label={`Move degree ${idx + 1} down`}
                          >
                            <ChevronDown className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => deleteEducation(edu.id)}
                            className="p-1 text-slate-400 hover:text-red-600 rounded"
                            title="Delete entry"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-semibold text-slate-700 mb-1">
                            Institution / University *
                          </label>
                          <input
                            type="text"
                            value={edu.institution}
                            onChange={(e) => updateEducation(edu.id, { institution: e.target.value })}
                            placeholder="e.g. Stanford University"
                            className="w-full px-3 py-1.5 border border-slate-300 rounded text-sm bg-white"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-semibold text-slate-700 mb-1">
                            Degree Title *
                          </label>
                          <input
                            type="text"
                            value={edu.degree}
                            onChange={(e) => updateEducation(edu.id, { degree: e.target.value })}
                            placeholder="e.g. Ph.D. in Computer Science"
                            className="w-full px-3 py-1.5 border border-slate-300 rounded text-sm bg-white"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-semibold text-slate-700 mb-1">
                            Specialization / Major
                          </label>
                          <input
                            type="text"
                            value={edu.specialization || ''}
                            onChange={(e) =>
                              updateEducation(edu.id, { specialization: e.target.value })
                            }
                            placeholder="e.g. Computational Biology & AI"
                            className="w-full px-3 py-1.5 border border-slate-300 rounded text-sm bg-white"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-semibold text-slate-700 mb-1">
                            Location
                          </label>
                          <input
                            type="text"
                            value={edu.location || ''}
                            onChange={(e) => updateEducation(edu.id, { location: e.target.value })}
                            placeholder="e.g. Stanford, CA"
                            className="w-full px-3 py-1.5 border border-slate-300 rounded text-sm bg-white"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-semibold text-slate-700 mb-1">
                            Start Date
                          </label>
                          <input
                            type="text"
                            value={edu.startDate}
                            onChange={(e) => updateEducation(edu.id, { startDate: e.target.value })}
                            placeholder="e.g. 2019"
                            className="w-full px-3 py-1.5 border border-slate-300 rounded text-sm bg-white"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-semibold text-slate-700 mb-1">
                            Graduation Date
                          </label>
                          <input
                            type="text"
                            value={edu.endDate}
                            onChange={(e) => updateEducation(edu.id, { endDate: e.target.value })}
                            placeholder="e.g. 2024 or Expected May 2026"
                            className="w-full px-3 py-1.5 border border-slate-300 rounded text-sm bg-white"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-semibold text-slate-700 mb-1">
                            GPA / Grade (Optional)
                          </label>
                          <input
                            type="text"
                            value={edu.grade || ''}
                            onChange={(e) => updateEducation(edu.id, { grade: e.target.value })}
                            placeholder="e.g. GPA: 3.96 / 4.0 (Summa Cum Laude)"
                            className="w-full px-3 py-1.5 border border-slate-300 rounded text-sm bg-white"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-semibold text-slate-700 mb-1">
                            {isHarvardTemplate || isElegantSerifTemplate
                              ? 'Thesis Title (Optional)'
                              : 'Thesis / Honors / Advisor'}
                          </label>
                          <input
                            type="text"
                            value={
                              isHarvardTemplate || isElegantSerifTemplate
                                ? edu.thesisTitle || ''
                                : edu.achievements || ''
                            }
                            onChange={(e) =>
                              updateEducation(
                                edu.id,
                                isHarvardTemplate || isElegantSerifTemplate
                                  ? { thesisTitle: e.target.value }
                                  : { achievements: e.target.value }
                              )
                            }
                            placeholder={
                              isHarvardTemplate || isElegantSerifTemplate
                                ? 'e.g. Monetary Policy Transmission and Regional Labor Elasticity'
                                : 'e.g. Dissertation: Geometric Deep Learning | Advisor: Prof. Vance'
                            }
                            className="w-full px-3 py-1.5 border border-slate-300 rounded text-sm bg-white"
                          />
                        </div>

                        {(isHarvardTemplate ||
                          isElegantSerifTemplate ||
                          isFresherResumeTemplate ||
                          isInternshipResumeTemplate ||
                          isEngineeringResumeTemplate) && (
                          <>
                            <div>
                              <label className="block text-xs font-semibold text-slate-700 mb-1">
                                Academic Awards &amp; Honors (Optional)
                              </label>
                              <input
                                type="text"
                                value={edu.honors || ''}
                                onChange={(e) => updateEducation(edu.id, { honors: e.target.value })}
                                placeholder="e.g. Magna Cum Laude, First-Class Honours"
                                className="w-full px-3 py-1.5 border border-slate-300 rounded text-sm bg-white"
                              />
                            </div>
                            <div className="sm:col-span-2">
                              <label className="block text-xs font-semibold text-slate-700 mb-1">
                                Relevant Coursework (Optional, comma-separated)
                              </label>
                              <CommaArrayInput
                                ariaLabel="Degree Relevant Coursework"
                                value={edu.coursework}
                                onChange={(items) => updateEducation(edu.id, { coursework: items })}
                                placeholder="e.g. Econometrics, Microeconomic Theory, Algorithms, Corporate Finance"
                                className="w-full px-3 py-1.5 border border-slate-300 rounded text-sm bg-white"
                              />
                            </div>
                          </>
                        )}

                        {(isFresherResumeTemplate || isInternshipResumeTemplate || isEngineeringResumeTemplate) && (
                          <>
                            <div>
                              <label className="block text-xs font-semibold text-slate-700 mb-1">
                                Grading Scale (Optional)
                              </label>
                              <input
                                type="text"
                                value={edu.gradingScale || ''}
                                onChange={(e) => updateEducation(edu.id, { gradingScale: e.target.value })}
                                placeholder="e.g. 10.0, 4.0, or %"
                                className="w-full px-3 py-1.5 border border-slate-300 rounded text-sm bg-white"
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-semibold text-slate-700 mb-1">
                                University / Board (Optional)
                              </label>
                              <input
                                type="text"
                                value={edu.board || ''}
                                onChange={(e) => updateEducation(edu.id, { board: e.target.value })}
                                placeholder="e.g. IIT Bombay Senate, CBSE"
                                className="w-full px-3 py-1.5 border border-slate-300 rounded text-sm bg-white"
                              />
                            </div>
                          </>
                        )}

                        {isElegantSerifTemplate && (
                          <>
                            <div>
                              <label className="block text-xs font-semibold text-slate-700 mb-1">
                                Department / Faculty (Optional)
                              </label>
                              <input
                                type="text"
                                value={edu.department || ''}
                                onChange={(e) => updateEducation(edu.id, { department: e.target.value })}
                                placeholder="e.g. Department of Computer Science"
                                className="w-full px-3 py-1.5 border border-slate-300 rounded text-sm bg-white"
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-semibold text-slate-700 mb-1">
                                Dissertation Details / Advisors (Optional)
                              </label>
                              <input
                                type="text"
                                value={edu.dissertationDetails || ''}
                                onChange={(e) =>
                                  updateEducation(edu.id, { dissertationDetails: e.target.value })
                                }
                                placeholder="e.g. Advisors: Prof. M. Vance; Distinction"
                                className="w-full px-3 py-1.5 border border-slate-300 rounded text-sm bg-white"
                              />
                            </div>
                          </>
                        )}

                        {(isClassicTemplate || isElegantSerifTemplate || isModernCorporateTemplate || isFresherResumeTemplate) && (
                          <div className="sm:col-span-2">
                            <div className="flex items-center justify-between mb-1">
                              <label className="text-xs font-semibold text-slate-700">
                                Degree Description / Coursework Focus (Optional)
                              </label>
                              {edu.description?.trim() && (
                                <button
                                  type="button"
                                  onClick={() =>
                                    handleOpenImprove(
                                      edu.description || '',
                                      'Education Description',
                                      `${edu.degree} at ${edu.institution}`,
                                      (improved) => updateEducation(edu.id, { description: improved })
                                    )
                                  }
                                  className="inline-flex items-center text-[11px] font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 px-2 py-0.5 rounded transition-colors cursor-pointer"
                                >
                                  <Sparkles className="w-3 h-3 mr-1 text-indigo-600" />
                                  <span>AI Improve</span>
                                </button>
                              )}
                            </div>
                            <textarea
                              rows={2}
                              value={edu.description || ''}
                              onChange={(e) =>
                                updateEducation(edu.id, { description: e.target.value })
                              }
                              placeholder="e.g. Focus on distributed systems, applied cryptography, and editorial engineering."
                              className="w-full p-2.5 border border-slate-300 rounded text-xs bg-white leading-relaxed"
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {(isInternshipResumeTemplate || isEngineeringResumeTemplate) && (
                <div className="mt-6 pt-5 border-t border-slate-200 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-bold text-slate-900">
                        {isEngineeringResumeTemplate
                          ? 'Class 12 / Diploma / Class 10 Education (Optional)'
                          : 'Senior Secondary / High School Education (Optional)'}
                      </h3>
                      <p className="text-[11px] text-slate-500">
                        {isEngineeringResumeTemplate
                          ? 'Renders cleanly beneath your engineering degree inside EDUCATION (Class 12 PCM, Diploma, or Class 10). Leave empty to omit.'
                          : 'Renders neatly beneath your university degree inside EDUCATION (e.g. Class XII / A-Levels). Leave empty to omit.'}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={addHighSchool}
                      className="inline-flex items-center px-2.5 py-1 text-xs font-semibold text-slate-800 bg-white border border-slate-300 hover:bg-slate-100 rounded cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5 mr-1" />
                      <span>{isEngineeringResumeTemplate ? 'Add School / Diploma' : 'Add High School'}</span>
                    </button>
                  </div>
                  {(resume.highSchool || []).length > 0 && (
                    <div className="space-y-3">
                      {(resume.highSchool || []).map((hs, hsIdx) => (
                        <div
                          key={hs.id}
                          className="p-3.5 border border-slate-200 rounded-lg bg-slate-50/50 space-y-2.5"
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold uppercase text-slate-600">
                              {isEngineeringResumeTemplate
                                ? `Secondary / Diploma #${hsIdx + 1}`
                                : `High School / Secondary #${hsIdx + 1}`}
                            </span>
                            <button
                              type="button"
                              onClick={() => deleteHighSchool(hs.id)}
                              className="p-1 text-slate-400 hover:text-red-600 rounded cursor-pointer"
                              title="Remove high school"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                            <div>
                              <label className="block text-[11px] font-semibold text-slate-700 mb-0.5">
                                Qualification / Stream
                              </label>
                              <input
                                type="text"
                                value={hs.qualification || ''}
                                onChange={(e) =>
                                  updateHighSchool(hs.id, { qualification: e.target.value })
                                }
                                placeholder={
                                  isEngineeringResumeTemplate
                                    ? 'e.g. Class XII (MPC/PCM), Diploma in ME, or Class X'
                                    : 'e.g. Senior Secondary (Class XII, PCM)'
                                }
                                className="w-full px-2.5 py-1.5 border border-slate-300 rounded text-xs bg-white"
                              />
                            </div>
                            <div>
                              <label className="block text-[11px] font-semibold text-slate-700 mb-0.5">
                                School Name
                              </label>
                              <input
                                type="text"
                                value={hs.schoolName}
                                onChange={(e) =>
                                  updateHighSchool(hs.id, { schoolName: e.target.value })
                                }
                                placeholder="e.g. Delhi Public School"
                                className="w-full px-2.5 py-1.5 border border-slate-300 rounded text-xs bg-white"
                              />
                            </div>
                            <div>
                              <label className="block text-[11px] font-semibold text-slate-700 mb-0.5">
                                Board (Optional)
                              </label>
                              <input
                                type="text"
                                value={hs.board || ''}
                                onChange={(e) => updateHighSchool(hs.id, { board: e.target.value })}
                                placeholder="e.g. CBSE, ISC, IB"
                                className="w-full px-2.5 py-1.5 border border-slate-300 rounded text-xs bg-white"
                              />
                            </div>
                            <div>
                              <label className="block text-[11px] font-semibold text-slate-700 mb-0.5">
                                Graduation Year / Dates
                              </label>
                              <input
                                type="text"
                                value={hs.graduationDate}
                                onChange={(e) =>
                                  updateHighSchool(hs.id, { graduationDate: e.target.value })
                                }
                                placeholder="e.g. 2023"
                                className="w-full px-2.5 py-1.5 border border-slate-300 rounded text-xs bg-white"
                              />
                            </div>
                            <div>
                              <label className="block text-[11px] font-semibold text-slate-700 mb-0.5">
                                Location
                              </label>
                              <input
                                type="text"
                                value={hs.location || ''}
                                onChange={(e) => updateHighSchool(hs.id, { location: e.target.value })}
                                placeholder="e.g. Jaipur, India"
                                className="w-full px-2.5 py-1.5 border border-slate-300 rounded text-xs bg-white"
                              />
                            </div>
                            <div>
                              <label className="block text-[11px] font-semibold text-slate-700 mb-0.5">
                                Score / Percentage / GPA
                              </label>
                              <input
                                type="text"
                                value={hs.gpa || ''}
                                onChange={(e) => updateHighSchool(hs.id, { gpa: e.target.value })}
                                placeholder="e.g. 95.4%"
                                className="w-full px-2.5 py-1.5 border border-slate-300 rounded text-xs bg-white"
                              />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </section>
          )}

          {/* 3a. Study Abroad (Harvard Style Optional) */}
          {activeSection === 'study-abroad' && (
            <section aria-labelledby="section-study-abroad-title">
              <div className="border-b border-slate-200 pb-3 mb-5 flex items-center justify-between">
                <div>
                  <h2 id="section-study-abroad-title" className="text-lg font-bold text-slate-900">
                    Study Abroad (Optional)
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Displayed beneath University Education in Harvard Style. Leave empty to hide automatically.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={addStudyAbroad}
                  className="inline-flex items-center px-3 py-1.5 text-xs font-semibold text-white bg-slate-900 hover:bg-black rounded shadow-xs cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5 mr-1" />
                  <span>Add Study Abroad</span>
                </button>
              </div>

              {(!resume.studyAbroad || resume.studyAbroad.length === 0) ? (
                <div className="p-8 text-center border border-dashed border-slate-300 rounded-lg">
                  <p className="text-xs text-slate-500">
                    No study abroad programs added. Leave empty if you did not participate in study abroad.
                  </p>
                  <button
                    type="button"
                    onClick={addStudyAbroad}
                    className="mt-2 text-xs font-bold text-slate-900 hover:underline cursor-pointer"
                  >
                    + Add a study abroad program
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  {resume.studyAbroad.map((sa, idx) => (
                    <div
                      key={sa.id}
                      className="p-4 border border-slate-200 rounded-lg bg-slate-50/50 space-y-3"
                    >
                      <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                        <span className="text-xs font-bold uppercase text-slate-600">
                          Study Abroad #{idx + 1}
                        </span>
                        <button
                          type="button"
                          onClick={() => deleteStudyAbroad(sa.id)}
                          className="p-1 text-slate-400 hover:text-red-600 rounded cursor-pointer"
                          title="Delete entry"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-semibold text-slate-700 mb-1">
                            Institution Name *
                          </label>
                          <input
                            type="text"
                            value={sa.institution}
                            onChange={(e) => updateStudyAbroad(sa.id, { institution: e.target.value })}
                            placeholder="e.g. London School of Economics"
                            className="w-full px-3 py-1.5 border border-slate-300 rounded text-sm bg-white"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-slate-700 mb-1">
                            City &amp; Country
                          </label>
                          <input
                            type="text"
                            value={sa.cityCountry || sa.location || ''}
                            onChange={(e) =>
                              updateStudyAbroad(sa.id, {
                                cityCountry: e.target.value,
                                location: e.target.value,
                              })
                            }
                            placeholder="e.g. London, United Kingdom"
                            className="w-full px-3 py-1.5 border border-slate-300 rounded text-sm bg-white"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-slate-700 mb-1">
                            Start Date
                          </label>
                          <input
                            type="text"
                            value={sa.startDate}
                            onChange={(e) => updateStudyAbroad(sa.id, { startDate: e.target.value })}
                            placeholder="e.g. Jan 2025"
                            className="w-full px-3 py-1.5 border border-slate-300 rounded text-sm bg-white"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-slate-700 mb-1">
                            End Date
                          </label>
                          <input
                            type="text"
                            value={sa.endDate}
                            onChange={(e) => updateStudyAbroad(sa.id, { endDate: e.target.value })}
                            placeholder="e.g. Apr 2025"
                            className="w-full px-3 py-1.5 border border-slate-300 rounded text-sm bg-white"
                          />
                        </div>
                        <div className="sm:col-span-2">
                          <label className="block text-xs font-semibold text-slate-700 mb-1">
                            Coursework or Academic Description
                          </label>
                          <input
                            type="text"
                            value={sa.coursework || ''}
                            onChange={(e) => updateStudyAbroad(sa.id, { coursework: e.target.value })}
                            placeholder="e.g. Coursework in International Macroeconomics and Quantitative Finance"
                            className="w-full px-3 py-1.5 border border-slate-300 rounded text-sm bg-white"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          )}

          {/* 3b. High School Education (Harvard Style Optional) */}
          {activeSection === 'high-school' && (
            <section aria-labelledby="section-high-school-title">
              <div className="border-b border-slate-200 pb-3 mb-5 flex items-center justify-between">
                <div>
                  <h2 id="section-high-school-title" className="text-lg font-bold text-slate-900">
                    High School Education (Optional)
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Recommended only for early-year undergraduates; professionals and upperclassmen may leave this empty to hide automatically.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={addHighSchool}
                  className="inline-flex items-center px-3 py-1.5 text-xs font-semibold text-white bg-slate-900 hover:bg-black rounded shadow-xs cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5 mr-1" />
                  <span>Add High School</span>
                </button>
              </div>

              {(!resume.highSchool || resume.highSchool.length === 0) ? (
                <div className="p-8 text-center border border-dashed border-slate-300 rounded-lg">
                  <p className="text-xs text-slate-500">
                    No high school entry added. Leave empty if not needed for your career stage.
                  </p>
                  <button
                    type="button"
                    onClick={addHighSchool}
                    className="mt-2 text-xs font-bold text-slate-900 hover:underline cursor-pointer"
                  >
                    + Add high school education
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  {resume.highSchool.map((hs, idx) => (
                    <div
                      key={hs.id}
                      className="p-4 border border-slate-200 rounded-lg bg-slate-50/50 space-y-3"
                    >
                      <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                        <span className="text-xs font-bold uppercase text-slate-600">
                          High School #{idx + 1}
                        </span>
                        <button
                          type="button"
                          onClick={() => deleteHighSchool(hs.id)}
                          className="p-1 text-slate-400 hover:text-red-600 rounded cursor-pointer"
                          title="Delete entry"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-semibold text-slate-700 mb-1">
                            High School Name *
                          </label>
                          <input
                            type="text"
                            value={hs.schoolName}
                            onChange={(e) => updateHighSchool(hs.id, { schoolName: e.target.value })}
                            placeholder="e.g. Phillips Exeter Academy"
                            className="w-full px-3 py-1.5 border border-slate-300 rounded text-sm bg-white"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-slate-700 mb-1">
                            City &amp; State / Country
                          </label>
                          <input
                            type="text"
                            value={hs.location || ''}
                            onChange={(e) => updateHighSchool(hs.id, { location: e.target.value })}
                            placeholder="e.g. Exeter, NH"
                            className="w-full px-3 py-1.5 border border-slate-300 rounded text-sm bg-white"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-slate-700 mb-1">
                            Graduation Date
                          </label>
                          <input
                            type="text"
                            value={hs.graduationDate}
                            onChange={(e) => updateHighSchool(hs.id, { graduationDate: e.target.value })}
                            placeholder="e.g. Jun 2022"
                            className="w-full px-3 py-1.5 border border-slate-300 rounded text-sm bg-white"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-slate-700 mb-1">
                            GPA (Optional)
                          </label>
                          <input
                            type="text"
                            value={hs.gpa || ''}
                            onChange={(e) => updateHighSchool(hs.id, { gpa: e.target.value })}
                            placeholder="e.g. 4.00 / 4.00 (Unweighted)"
                            className="w-full px-3 py-1.5 border border-slate-300 rounded text-sm bg-white"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-slate-700 mb-1">
                            SAT / ACT Scores (Optional)
                          </label>
                          <input
                            type="text"
                            value={hs.testScores || ''}
                            onChange={(e) => updateHighSchool(hs.id, { testScores: e.target.value })}
                            placeholder="e.g. SAT: 1570 (790 Math, 780 EBRW)"
                            className="w-full px-3 py-1.5 border border-slate-300 rounded text-sm bg-white"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-slate-700 mb-1">
                            Academic Honors (Optional)
                          </label>
                          <input
                            type="text"
                            value={hs.honors || ''}
                            onChange={(e) => updateHighSchool(hs.id, { honors: e.target.value })}
                            placeholder="e.g. Valedictorian, National Merit Scholar"
                            className="w-full px-3 py-1.5 border border-slate-300 rounded text-sm bg-white"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          )}

          {/* 4a. Master's Thesis (Classic Professional) */}
          {activeSection === 'thesis' && (
            <section aria-labelledby="section-thesis-title">
              <div className="border-b border-slate-200 pb-3 mb-5 flex items-center justify-between">
                <div>
                  <h2 id="section-thesis-title" className="text-lg font-bold text-slate-900">
                    Master&apos;s Thesis (Optional)
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Highlight your Master&apos;s or Diploma thesis title, supervisors, institution, and abstract. Hidden automatically when left blank.
                  </p>
                </div>
                {resume.thesis?.title && (
                  <button
                    type="button"
                    onClick={clearThesis}
                    className="inline-flex items-center px-2.5 py-1.5 text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5 mr-1" />
                    <span>Clear Thesis</span>
                  </button>
                )}
              </div>

              <div className="p-4 border border-slate-200 rounded-lg bg-slate-50/50 space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Thesis Title
                  </label>
                  <input
                    type="text"
                    value={resume.thesis?.title || ''}
                    onChange={(e) => updateThesisField('title', e.target.value)}
                    placeholder="e.g. Zero-Trust Service Mesh Authorization in Multi-Cluster Kubernetes Environments"
                    className="w-full px-3 py-1.5 border border-slate-300 rounded text-sm bg-white"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Supervisors
                    </label>
                    <input
                      type="text"
                      value={resume.thesis?.supervisors || ''}
                      onChange={(e) => updateThesisField('supervisors', e.target.value)}
                      placeholder="e.g. Prof. Dr. H. Richter, Dr. K. Lindner"
                      className="w-full px-3 py-1.5 border border-slate-300 rounded text-sm bg-white"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Year
                    </label>
                    <input
                      type="text"
                      value={resume.thesis?.year || ''}
                      onChange={(e) => updateThesisField('year', e.target.value)}
                      placeholder="e.g. 2020"
                      className="w-full px-3 py-1.5 border border-slate-300 rounded text-sm bg-white"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Department / Institution
                    </label>
                    <input
                      type="text"
                      value={resume.thesis?.institution || ''}
                      onChange={(e) => updateThesisField('institution', e.target.value)}
                      placeholder="e.g. Technical University of Munich · Chair of Network Architectures"
                      className="w-full px-3 py-1.5 border border-slate-300 rounded text-sm bg-white"
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-semibold text-slate-700">
                      Thesis Abstract / Key Findings (Optional)
                    </label>
                    {resume.thesis?.description?.trim() && (
                      <button
                        type="button"
                        onClick={() =>
                          handleOpenImprove(
                            resume.thesis?.description || '',
                            'Master Thesis Description',
                            resume.thesis?.title,
                            (improved) => updateThesisField('description', improved)
                          )
                        }
                        className="inline-flex items-center text-[11px] font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 px-2 py-0.5 rounded transition-colors cursor-pointer"
                      >
                        <Sparkles className="w-3 h-3 mr-1 text-indigo-600" />
                        <span>AI Improve</span>
                      </button>
                    )}
                  </div>
                  <textarea
                    rows={3}
                    value={resume.thesis?.description || ''}
                    onChange={(e) => updateThesisField('description', e.target.value)}
                    placeholder="Concise summary of research question, methodology, and measured outcome..."
                    className="w-full p-2.5 border border-slate-300 rounded text-xs bg-white leading-relaxed"
                  />
                </div>
              </div>
            </section>
          )}

          {/* 4b. Relevant Coursework */}
          {activeSection === 'coursework' && (
            <section aria-labelledby="section-coursework-title">
              <div className="border-b border-slate-200 pb-3 mb-5">
                <h2 id="section-coursework-title" className="text-lg font-bold text-slate-900">
                  Relevant Coursework
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  {isSoftwareDevTemplate
                    ? 'Rendered as a crisp 4-column grid under ADDITIONAL → Relevant Coursework. Leave empty to hide automatically.'
                    : "Rendered in a clean 4-column grid on Jake's Resume. Leave empty to hide this section automatically."}
                </p>
              </div>

              <div className="flex flex-col sm:flex-row gap-2 mb-4">
                <input
                  type="text"
                  value={courseworkDraft}
                  onChange={(e) => setCourseworkDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      addCourseworkFromDraft();
                    }
                  }}
                  placeholder="Add courses (comma-separated, e.g. Data Structures, Algorithms, Operating Systems)"
                  className="flex-1 px-3 py-2 border border-slate-300 rounded text-sm bg-white focus:outline-none focus:ring-2 focus:ring-slate-900"
                />
                <button
                  type="button"
                  onClick={addCourseworkFromDraft}
                  className="inline-flex items-center justify-center px-4 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-black rounded shadow-xs shrink-0 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5 mr-1" />
                  <span>Add Course(s)</span>
                </button>
              </div>

              {(!resume.coursework || resume.coursework.length === 0) ? (
                <div className="p-8 text-center border border-dashed border-slate-300 rounded-lg">
                  <p className="text-xs text-slate-500">
                    No coursework added yet. Optional — if left empty, this section is hidden automatically.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {resume.coursework.map((course, idx) => (
                    <div
                      key={idx}
                      className="flex items-center space-x-2 bg-slate-50 border border-slate-200 rounded px-2.5 py-1.5"
                    >
                      <input
                        type="text"
                        value={course}
                        onChange={(e) => updateCourseworkItem(idx, e.target.value)}
                        aria-label={`Course ${idx + 1}`}
                        className="flex-1 text-xs bg-white border border-slate-300 rounded px-2 py-1 text-slate-900"
                      />
                      <button
                        type="button"
                        onClick={() => deleteCourseworkItem(idx)}
                        className="p-1 text-slate-400 hover:text-red-600 rounded cursor-pointer"
                        aria-label={`Delete course ${course || idx + 1}`}
                        title="Remove course"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </section>
          )}

          {/* 4. Experience */}
          {activeSection === 'experience' && (
            <section aria-labelledby="section-exp-title">
              <div className="border-b border-slate-200 pb-3 mb-5 flex items-center justify-between">
                <div>
                  <h2 id="section-exp-title" className="text-lg font-bold text-slate-900">
                    {isEngineeringResumeTemplate
                      ? 'Internship / Trainings (Optional)'
                      : isCreativeProfessionalTemplate
                      ? 'Short Resume (Experience)'
                      : 'Experience'}
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {isEngineeringResumeTemplate
                      ? 'Optional for freshers — industrial internships, plant visits, lab trainings, or workshops. Leave empty to hide cleanly.'
                      : isCreativeProfessionalTemplate
                      ? 'Rendered in the left column under SHORT RESUME with year rail, vertical divider, and concise impact highlights.'
                      : 'Appointments, professional employment, research fellowships, and internships.'}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={addExperience}
                  className="inline-flex items-center px-3 py-1.5 text-xs font-semibold text-white bg-slate-900 hover:bg-black rounded shadow-xs cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5 mr-1" />
                  <span>{isEngineeringResumeTemplate ? 'Add Internship / Training' : 'Add Experience'}</span>
                </button>
              </div>

              {(!resume.experience || resume.experience.length === 0) ? (
                <div className="p-8 text-center border border-dashed border-slate-300 rounded-lg">
                  <p className="text-xs text-slate-500">No experience entries added yet.</p>
                  <button
                    onClick={addExperience}
                    className="mt-2 text-xs font-bold text-slate-900 hover:underline"
                  >
                    + Add an experience entry
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  {resume.experience.map((exp, idx) => (
                    <div
                      key={exp.id}
                      className="p-4 border border-slate-200 rounded-lg bg-slate-50/50 space-y-3"
                    >
                      <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                        <span className="text-xs font-bold uppercase text-slate-600">
                          Role #{idx + 1}
                        </span>
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => moveArrayItem('experience', idx, -1)}
                            disabled={idx === 0}
                            className="p-1 text-slate-400 hover:text-slate-700 disabled:opacity-30 rounded cursor-pointer"
                            title="Move up"
                            aria-label={`Move experience ${idx + 1} up`}
                          >
                            <ChevronUp className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => moveArrayItem('experience', idx, 1)}
                            disabled={idx === resume.experience.length - 1}
                            className="p-1 text-slate-400 hover:text-slate-700 disabled:opacity-30 rounded cursor-pointer"
                            title="Move down"
                            aria-label={`Move experience ${idx + 1} down`}
                          >
                            <ChevronDown className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => deleteExperience(exp.id)}
                            className="p-1 text-slate-400 hover:text-red-600 rounded"
                            title="Delete entry"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-semibold text-slate-700 mb-1">
                            Organization / Company *
                          </label>
                          <input
                            type="text"
                            value={exp.company}
                            onChange={(e) => updateExperience(exp.id, { company: e.target.value })}
                            placeholder="e.g. Stanford AI Lab"
                            className="w-full px-3 py-1.5 border border-slate-300 rounded text-sm bg-white"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-semibold text-slate-700 mb-1">
                            Job Title / Appointment *
                          </label>
                          <input
                            type="text"
                            value={exp.position}
                            onChange={(e) => updateExperience(exp.id, { position: e.target.value })}
                            placeholder="e.g. Postdoctoral Research Fellow"
                            className="w-full px-3 py-1.5 border border-slate-300 rounded text-sm bg-white"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-semibold text-slate-700 mb-1">
                            Location
                          </label>
                          <input
                            type="text"
                            value={exp.location || ''}
                            onChange={(e) => updateExperience(exp.id, { location: e.target.value })}
                            placeholder="e.g. Stanford, CA"
                            className="w-full px-3 py-1.5 border border-slate-300 rounded text-sm bg-white"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-semibold text-slate-700 mb-1">
                            Employment Type
                          </label>
                          <input
                            type="text"
                            value={exp.employmentType || ''}
                            onChange={(e) =>
                              updateExperience(exp.id, { employmentType: e.target.value })
                            }
                            placeholder="e.g. Full-Time, Postdoctoral, Internship"
                            className="w-full px-3 py-1.5 border border-slate-300 rounded text-sm bg-white"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-semibold text-slate-700 mb-1">
                            Start Date
                          </label>
                          <input
                            type="text"
                            value={exp.startDate}
                            onChange={(e) => updateExperience(exp.id, { startDate: e.target.value })}
                            placeholder="e.g. 2024 or Jun 2022"
                            className="w-full px-3 py-1.5 border border-slate-300 rounded text-sm bg-white"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-semibold text-slate-700 mb-1">
                            End Date
                          </label>
                          <input
                            type="text"
                            disabled={exp.current}
                            value={exp.current ? 'Present' : exp.endDate}
                            onChange={(e) => updateExperience(exp.id, { endDate: e.target.value })}
                            placeholder="e.g. Present or Dec 2022"
                            className="w-full px-3 py-1.5 border border-slate-300 rounded text-sm bg-white disabled:bg-slate-100"
                          />
                        </div>

                        {(isClassicTemplate || isModernCorporateTemplate) && (
                          <div>
                            <label className="block text-xs font-semibold text-slate-700 mb-1">
                              Experience Category (Optional)
                            </label>
                            <select
                              value={exp.category || ''}
                              onChange={(e) =>
                                updateExperience(exp.id, {
                                  category: (e.target.value || undefined) as ExperienceCategory | undefined,
                                })
                              }
                              className="w-full px-3 py-1.5 border border-slate-300 rounded text-sm bg-white"
                            >
                              <option value="">General Experience</option>
                              <option value="Professional">Professional Experience</option>
                              <option value="Vocational">Vocational Experience</option>
                              <option value="Other">Other Experience</option>
                            </select>
                          </div>
                        )}

                        {isEngineeringResumeTemplate && (
                          <div>
                            <label className="block text-xs font-semibold text-slate-700 mb-1">
                              Entry Type (Optional)
                            </label>
                            <select
                              value={exp.entryKind || 'internship'}
                              onChange={(e) =>
                                updateExperience(exp.id, {
                                  entryKind: e.target.value as ExperienceEntryKind,
                                })
                              }
                              className="w-full px-3 py-1.5 border border-slate-300 rounded text-sm bg-white"
                            >
                              <option value="internship">Internship</option>
                              <option value="training">Industrial Training</option>
                              <option value="workshop">Technical Workshop</option>
                              <option value="industrial_visit">Industrial Visit</option>
                              <option value="employment">Full-Time / Employment</option>
                            </select>
                          </div>
                        )}

                        {isModernCorporateTemplate && (
                          <>
                            <div>
                              <label className="block text-xs font-semibold text-slate-700 mb-1">
                                Department / Practice Area (Optional)
                              </label>
                              <input
                                type="text"
                                value={exp.department || ''}
                                onChange={(e) =>
                                  updateExperience(exp.id, { department: e.target.value })
                                }
                                placeholder="e.g. European Industrials & Infrastructure"
                                className="w-full px-3 py-1.5 border border-slate-300 rounded text-sm bg-white"
                              />
                            </div>
                            <div className="sm:col-span-2">
                              <label className="block text-xs font-semibold text-slate-700 mb-1">
                                Key Results Summary (Optional)
                              </label>
                              <input
                                type="text"
                                value={exp.results || ''}
                                onChange={(e) =>
                                  updateExperience(exp.id, { results: e.target.value })
                                }
                                placeholder="e.g. Delivered $18.5M annualized synergies across 14 operating sites"
                                className="w-full px-3 py-1.5 border border-slate-300 rounded text-sm bg-white"
                              />
                            </div>
                          </>
                        )}
                      </div>

                      <div className="flex items-center space-x-2">
                        <input
                          id={`curr-exp-${exp.id}`}
                          type="checkbox"
                          checked={exp.current}
                          onChange={(e) =>
                            updateExperience(exp.id, {
                              current: e.target.checked,
                              endDate: e.target.checked ? 'Present' : '',
                            })
                          }
                          className="h-3.5 w-3.5 text-slate-900 rounded"
                        />
                        <label htmlFor={`curr-exp-${exp.id}`} className="text-xs text-slate-700">
                          Currently ongoing / present role
                        </label>
                      </div>

                      {(isClassicTemplate || isElegantSerifTemplate || isModernCorporateTemplate) && (
                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <label className="text-xs font-semibold text-slate-700">
                              Role Context / Short Description (Optional)
                            </label>
                            {exp.description?.trim() && (
                              <button
                                type="button"
                                onClick={() =>
                                  handleOpenImprove(
                                    exp.description || '',
                                    'Experience Context Description',
                                    `${exp.position} at ${exp.company}`,
                                    (improved) => updateExperience(exp.id, { description: improved })
                                  )
                                }
                                className="inline-flex items-center text-[11px] font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 px-2 py-0.5 rounded transition-colors cursor-pointer"
                              >
                                <Sparkles className="w-3 h-3 mr-1 text-indigo-600" />
                                <span>AI Improve</span>
                              </button>
                            )}
                          </div>
                          <input
                            type="text"
                            value={exp.description || ''}
                            onChange={(e) =>
                              updateExperience(exp.id, { description: e.target.value })
                            }
                            placeholder="e.g. Core platform architecture team managing regulated financial workloads."
                            className="w-full px-3 py-1.5 border border-slate-300 rounded text-xs bg-white"
                          />
                        </div>
                      )}

                      {(isElegantSerifTemplate ||
                        isModernCorporateTemplate ||
                        isFresherResumeTemplate ||
                        isEngineeringResumeTemplate) && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div className={isEngineeringResumeTemplate ? 'sm:col-span-2' : ''}>
                            <label className="block text-xs font-semibold text-slate-700 mb-1">
                              {isEngineeringResumeTemplate
                                ? 'Tools / Systems Worked On (Optional, comma-separated)'
                                : 'Technologies / Tools Used (Optional, comma-separated)'}
                            </label>
                            <CommaArrayInput
                              ariaLabel="Experience Technologies"
                              value={exp.technologies}
                              onChange={(items) =>
                                updateExperience(exp.id, { technologies: items })
                              }
                              placeholder={
                                isEngineeringResumeTemplate
                                  ? 'e.g. SolidWorks, CNC Lathe, ANSYS Fluent, STM32CubeIDE'
                                  : 'e.g. Capital IQ, Bloomberg, SQL, Tableau'
                              }
                              className="w-full px-3 py-1.5 border border-slate-300 rounded text-xs bg-white"
                            />
                          </div>
                          {isElegantSerifTemplate && (
                            <div>
                              <label className="block text-xs font-semibold text-slate-700 mb-1">
                                Skills Demonstrated (Optional, comma-separated)
                              </label>
                              <CommaArrayInput
                                ariaLabel="Experience Skills Demonstrated"
                                value={exp.skillsDemonstrated}
                                onChange={(items) =>
                                  updateExperience(exp.id, { skillsDemonstrated: items })
                                }
                                placeholder="e.g. Systems Design, Academic Mentoring"
                                className="w-full px-3 py-1.5 border border-slate-300 rounded text-xs bg-white"
                              />
                            </div>
                          )}
                          {isFresherResumeTemplate && (
                            <div>
                              <label className="block text-xs font-semibold text-slate-700 mb-1">
                                Skills Learned (Optional, comma-separated)
                              </label>
                              <CommaArrayInput
                                ariaLabel="Experience Skills Learned"
                                value={exp.skillsLearned}
                                onChange={(items) =>
                                  updateExperience(exp.id, { skillsLearned: items })
                                }
                                placeholder="e.g. Go, PostgreSQL, Load Testing, Docker"
                                className="w-full px-3 py-1.5 border border-slate-300 rounded text-xs bg-white"
                              />
                            </div>
                          )}
                        </div>
                      )}

                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <label className="text-xs font-semibold text-slate-700">
                            Detailed Responsibilities &amp; Contributions (One bullet per line)
                          </label>
                          {(exp.highlights || []).some((h) => h.trim().length > 0) && (
                            <button
                              type="button"
                              onClick={() =>
                                handleOpenImprove(
                                  (exp.highlights || []).join('\n'),
                                  'Work Experience Responsibilities',
                                  `${exp.position} at ${exp.company}`,
                                  (improved) =>
                                    updateExperience(exp.id, {
                                      highlights: improved.split('\n').filter((l) => l.trim().length > 0),
                                    })
                                )
                              }
                              className="inline-flex items-center text-[11px] font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 px-2 py-0.5 rounded transition-colors cursor-pointer"
                            >
                              <Sparkles className="w-3 h-3 mr-1 text-indigo-600" />
                              <span>AI Improve</span>
                            </button>
                          )}
                        </div>
                        <textarea
                          rows={3}
                          value={(exp.highlights || []).join('\n')}
                          onChange={(e) =>
                            updateExperience(exp.id, { highlights: e.target.value.split('\n') })
                          }
                          placeholder="• Lead investigator on an NIH R01 grant exploring diffusion models...&#10;• Supervise 4 doctoral candidates..."
                          className="w-full p-2.5 border border-slate-300 rounded text-xs leading-relaxed bg-white"
                        />
                      </div>

                      {(isClassicTemplate || isElegantSerifTemplate || isModernCorporateTemplate) &&
                        (exp.highlights || []).some((h) => h.trim().length > 0) && (
                          <div className="pt-2 border-t border-slate-200 space-y-2">
                            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                              Nested Sub-Highlights (Optional indented bullets per main item)
                            </div>
                            {(exp.highlights || []).map((bulletText, bIdx) => {
                              if (!bulletText.trim()) return null;
                              const subEntry = (exp.subHighlights || []).find(
                                (s) => s.parentIndex === bIdx
                              );
                              const subItems = subEntry?.items || [];
                              return (
                                <div
                                  key={bIdx}
                                  className="p-2.5 bg-white border border-slate-200 rounded space-y-1.5"
                                >
                                  <div className="flex items-center justify-between gap-2">
                                    <span className="text-[11px] font-semibold text-slate-700 truncate">
                                      Bullet #{bIdx + 1}: {bulletText}
                                    </span>
                                    <button
                                      type="button"
                                      onClick={() =>
                                        updateExperienceSubHighlight(exp.id, bIdx, [...subItems, ''])
                                      }
                                      className="text-[11px] font-semibold text-[#1e4e8c] hover:underline shrink-0 cursor-pointer"
                                    >
                                      + Add sub-item
                                    </button>
                                  </div>
                                  {subItems.length > 0 && (
                                    <div className="space-y-1 pl-3 border-l-2 border-[#1e4e8c]/30">
                                      {subItems.map((subVal, sIdx) => (
                                        <div key={sIdx} className="flex items-center gap-1.5">
                                          <input
                                            type="text"
                                            value={subVal}
                                            onChange={(e) => {
                                              const next = [...subItems];
                                              next[sIdx] = e.target.value;
                                              updateExperienceSubHighlight(exp.id, bIdx, next);
                                            }}
                                            placeholder="Sub-achievement detail..."
                                            className="flex-1 px-2 py-1 text-xs border border-slate-300 rounded bg-slate-50"
                                          />
                                          <button
                                            type="button"
                                            onClick={() => {
                                              const next = subItems.filter((_, i) => i !== sIdx);
                                              updateExperienceSubHighlight(exp.id, bIdx, next);
                                            }}
                                            className="p-1 text-slate-400 hover:text-red-600 cursor-pointer"
                                            title="Remove sub-item"
                                          >
                                            <Trash2 className="w-3.5 h-3.5" />
                                          </button>
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        )}
                    </div>
                  ))}
                </div>
              )}

              {isEngineeringResumeTemplate && (
                <div className="mt-6 pt-5 border-t border-slate-200 space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <h3 className="text-sm font-bold text-slate-900">
                        Workshops, Industrial Trainings &amp; Plant Visits (Optional)
                      </h3>
                      <p className="text-[11px] text-slate-500">
                        Renders neatly inside INTERNSHIP / TRAININGS alongside internships. Leave empty if none.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={addLearningActivity}
                      className="inline-flex items-center px-2.5 py-1 text-xs font-semibold text-slate-800 bg-white border border-slate-300 hover:bg-slate-100 rounded cursor-pointer shrink-0"
                    >
                      <Plus className="w-3.5 h-3.5 mr-1" />
                      <span>Add Training / Visit</span>
                    </button>
                  </div>

                  {(resume.learningActivities || []).length > 0 && (
                    <div className="space-y-3">
                      {(resume.learningActivities || []).map((la, laIdx) => (
                        <div
                          key={la.id}
                          className="p-3.5 border border-slate-200 rounded-lg bg-slate-50/50 space-y-2.5"
                        >
                          <div className="flex items-center justify-between border-b border-slate-200 pb-1.5">
                            <span className="text-xs font-bold uppercase text-slate-600">
                              Training / Workshop #{laIdx + 1}
                            </span>
                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() => moveLearningActivity(laIdx, -1)}
                                disabled={laIdx === 0}
                                className="p-1 text-slate-400 hover:text-slate-700 disabled:opacity-30 rounded cursor-pointer"
                                title="Move up"
                              >
                                <ChevronUp className="w-4 h-4" />
                              </button>
                              <button
                                type="button"
                                onClick={() => moveLearningActivity(laIdx, 1)}
                                disabled={laIdx === (resume.learningActivities?.length || 1) - 1}
                                className="p-1 text-slate-400 hover:text-slate-700 disabled:opacity-30 rounded cursor-pointer"
                                title="Move down"
                              >
                                <ChevronDown className="w-4 h-4" />
                              </button>
                              <button
                                type="button"
                                onClick={() => deleteLearningActivity(la.id)}
                                className="p-1 text-slate-400 hover:text-red-600 rounded cursor-pointer"
                                title="Delete entry"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                            <div>
                              <label className="block text-[11px] font-semibold text-slate-700 mb-0.5">
                                Program / Workshop Title *
                              </label>
                              <input
                                type="text"
                                value={la.title}
                                onChange={(e) =>
                                  updateLearningActivity(la.id, { title: e.target.value })
                                }
                                placeholder="e.g. Industrial Automation & PLC Hands-on Training"
                                className="w-full px-2.5 py-1.5 border border-slate-300 rounded text-xs bg-white"
                              />
                            </div>
                            <div>
                              <label className="block text-[11px] font-semibold text-slate-700 mb-0.5">
                                Activity Type
                              </label>
                              <select
                                value={la.activityType || 'Workshop'}
                                onChange={(e) =>
                                  updateLearningActivity(la.id, {
                                    activityType: e.target.value as LearningActivityItem['activityType'],
                                  })
                                }
                                className="w-full px-2.5 py-1.5 border border-slate-300 rounded text-xs bg-white"
                              >
                                <option value="Industrial Training">Industrial Training</option>
                                <option value="Workshop">Workshop</option>
                                <option value="Industrial Visit">Industrial Visit</option>
                                <option value="Lab Training">Lab Training</option>
                                <option value="Bootcamp">Bootcamp</option>
                                <option value="Course">Course</option>
                                <option value="Other">Other</option>
                              </select>
                            </div>
                            <div>
                              <label className="block text-[11px] font-semibold text-slate-700 mb-0.5">
                                Organization / Center
                              </label>
                              <input
                                type="text"
                                value={la.provider || ''}
                                onChange={(e) =>
                                  updateLearningActivity(la.id, { provider: e.target.value })
                                }
                                placeholder="e.g. BHEL Hyderabad / CITD"
                                className="w-full px-2.5 py-1.5 border border-slate-300 rounded text-xs bg-white"
                              />
                            </div>
                            <div>
                              <label className="block text-[11px] font-semibold text-slate-700 mb-0.5">
                                Completion Date / Duration
                              </label>
                              <input
                                type="text"
                                value={la.completionDate || ''}
                                onChange={(e) =>
                                  updateLearningActivity(la.id, { completionDate: e.target.value })
                                }
                                placeholder="e.g. Jun 2024 – Jul 2024"
                                className="w-full px-2.5 py-1.5 border border-slate-300 rounded text-xs bg-white"
                              />
                            </div>
                            <div>
                              <label className="block text-[11px] font-semibold text-slate-700 mb-0.5">
                                Tools / Skills Practiced (Optional, comma-separated)
                              </label>
                              <CommaArrayInput
                                ariaLabel="Training Tools and Skills"
                                value={la.skillsAcquired}
                                onChange={(items) =>
                                  updateLearningActivity(la.id, { skillsAcquired: items })
                                }
                                placeholder="e.g. Siemens S7-1200, SCADA, Ladder Logic"
                                className="w-full px-2.5 py-1.5 border border-slate-300 rounded text-xs bg-white"
                              />
                            </div>
                            <div>
                              <label className="block text-[11px] font-semibold text-slate-700 mb-0.5">
                                Certificate / Reference URL (Optional)
                              </label>
                              <input
                                type="text"
                                value={la.credentialUrl || ''}
                                onChange={(e) =>
                                  updateLearningActivity(la.id, { credentialUrl: e.target.value })
                                }
                                placeholder="e.g. https://..."
                                className="w-full px-2.5 py-1.5 border border-slate-300 rounded text-xs bg-white"
                              />
                            </div>
                            <div className="sm:col-span-2">
                              <label className="block text-[11px] font-semibold text-slate-700 mb-0.5">
                                Key Takeaways / Scope Summary
                              </label>
                              <input
                                type="text"
                                value={la.description || ''}
                                onChange={(e) =>
                                  updateLearningActivity(la.id, { description: e.target.value })
                                }
                                placeholder="e.g. Observed CNC machining tolerances and automated assembly inspection workflows."
                                className="w-full px-2.5 py-1.5 border border-slate-300 rounded text-xs bg-white"
                              />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </section>
          )}

          {/* 4b. Research Experience (Elegant Serif Optional) */}
          {activeSection === 'research' && (
            <section aria-labelledby="section-research-title">
              <div className="border-b border-slate-200 pb-3 mb-5 flex items-center justify-between gap-3">
                <div>
                  <h2 id="section-research-title" className="text-lg font-bold text-slate-900">
                    Research Experience (Optional)
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Sponsored research programs, lab fellowships, methodology, findings, and scholarly outputs. Leave empty to hide automatically.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={addResearch}
                  className="inline-flex items-center shrink-0 whitespace-nowrap px-3 py-1.5 text-xs font-semibold text-white bg-slate-900 hover:bg-black rounded shadow-xs cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5 mr-1" />
                  <span>Add Research</span>
                </button>
              </div>

              {(!resume.researchExperience || resume.researchExperience.length === 0) ? (
                <div className="p-8 text-center border border-dashed border-slate-300 rounded-lg">
                  <p className="text-xs text-slate-500">No research experience entries added yet.</p>
                  <button
                    type="button"
                    onClick={addResearch}
                    className="mt-2 text-xs font-bold text-slate-900 hover:underline cursor-pointer"
                  >
                    + Add your first research experience
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  {resume.researchExperience.map((res, idx) => (
                    <div
                      key={res.id}
                      className="p-4 border border-slate-200 rounded-lg bg-slate-50/50 space-y-3"
                    >
                      <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                        <span className="text-xs font-bold uppercase text-slate-600">
                          Research Entry #{idx + 1}
                        </span>
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => moveArrayItem('researchExperience', idx, -1)}
                            disabled={idx === 0}
                            className="p-1 text-slate-400 hover:text-slate-700 disabled:opacity-30 rounded cursor-pointer"
                            title="Move up"
                            aria-label={`Move research ${idx + 1} up`}
                          >
                            <ChevronUp className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => moveArrayItem('researchExperience', idx, 1)}
                            disabled={idx === (resume.researchExperience?.length || 1) - 1}
                            className="p-1 text-slate-400 hover:text-slate-700 disabled:opacity-30 rounded cursor-pointer"
                            title="Move down"
                            aria-label={`Move research ${idx + 1} down`}
                          >
                            <ChevronDown className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => deleteResearch(res.id)}
                            className="p-1 text-slate-400 hover:text-red-600 rounded cursor-pointer"
                            title="Delete entry"
                            aria-label={`Delete research ${idx + 1}`}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="sm:col-span-2">
                          <label className="block text-xs font-semibold text-slate-700 mb-1">
                            Research Project / Topic Title *
                          </label>
                          <input
                            type="text"
                            value={res.title}
                            onChange={(e) => updateResearch(res.id, { title: e.target.value })}
                            placeholder="e.g. Neural Layout Planning for Scholarly Document Synthesis"
                            className="w-full px-3 py-1.5 border border-slate-300 rounded text-sm bg-white"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-semibold text-slate-700 mb-1">
                            Institution / Laboratory *
                          </label>
                          <input
                            type="text"
                            value={res.institution}
                            onChange={(e) => updateResearch(res.id, { institution: e.target.value })}
                            placeholder="e.g. Cambridge Computer Laboratory"
                            className="w-full px-3 py-1.5 border border-slate-300 rounded text-sm bg-white"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-semibold text-slate-700 mb-1">
                            Role / Title
                          </label>
                          <input
                            type="text"
                            value={res.role || ''}
                            onChange={(e) => updateResearch(res.id, { role: e.target.value })}
                            placeholder="e.g. Principal Investigator / Graduate Researcher"
                            className="w-full px-3 py-1.5 border border-slate-300 rounded text-sm bg-white"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-semibold text-slate-700 mb-1">
                            Research Area / Domain
                          </label>
                          <input
                            type="text"
                            value={res.domain || ''}
                            onChange={(e) => updateResearch(res.id, { domain: e.target.value })}
                            placeholder="e.g. Computational Typography & Document AI"
                            className="w-full px-3 py-1.5 border border-slate-300 rounded text-sm bg-white"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-semibold text-slate-700 mb-1">
                            Advisor / Principal Supervisor (Optional)
                          </label>
                          <input
                            type="text"
                            value={res.supervisor || ''}
                            onChange={(e) => updateResearch(res.id, { supervisor: e.target.value })}
                            placeholder="e.g. Prof. Alistair Finch"
                            className="w-full px-3 py-1.5 border border-slate-300 rounded text-sm bg-white"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-semibold text-slate-700 mb-1">
                            Location (Optional)
                          </label>
                          <input
                            type="text"
                            value={res.location || ''}
                            onChange={(e) => updateResearch(res.id, { location: e.target.value })}
                            placeholder="e.g. Cambridge, UK"
                            className="w-full px-3 py-1.5 border border-slate-300 rounded text-sm bg-white"
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="block text-xs font-semibold text-slate-700 mb-1">
                              Start Date
                            </label>
                            <input
                              type="text"
                              value={res.startDate}
                              onChange={(e) => updateResearch(res.id, { startDate: e.target.value })}
                              placeholder="e.g. 2022"
                              className="w-full px-3 py-1.5 border border-slate-300 rounded text-sm bg-white"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-semibold text-slate-700 mb-1">
                              End Date
                            </label>
                            <input
                              type="text"
                              disabled={Boolean(res.current)}
                              value={res.current ? 'Present' : res.endDate}
                              onChange={(e) => updateResearch(res.id, { endDate: e.target.value })}
                              placeholder="e.g. 2024 or Present"
                              className="w-full px-3 py-1.5 border border-slate-300 rounded text-sm bg-white disabled:bg-slate-100"
                            />
                          </div>
                        </div>

                        <div className="sm:col-span-2 flex items-center space-x-2">
                          <input
                            id={`curr-res-${res.id}`}
                            type="checkbox"
                            checked={Boolean(res.current)}
                            onChange={(e) =>
                              updateResearch(res.id, {
                                current: e.target.checked,
                                endDate: e.target.checked ? 'Present' : '',
                              })
                            }
                            className="h-3.5 w-3.5 text-slate-900 rounded"
                          />
                          <label htmlFor={`curr-res-${res.id}`} className="text-xs text-slate-700">
                            Ongoing research project
                          </label>
                        </div>

                        <div className="sm:col-span-2">
                          <label className="block text-xs font-semibold text-slate-700 mb-1">
                            Research Objectives / Problem Statement
                          </label>
                          <textarea
                            rows={2}
                            value={res.objectives || ''}
                            onChange={(e) => updateResearch(res.id, { objectives: e.target.value })}
                            placeholder="Core research questions and hypotheses investigated..."
                            className="w-full p-2.5 border border-slate-300 rounded text-xs bg-white leading-relaxed"
                          />
                        </div>

                        <div className="sm:col-span-2">
                          <label className="block text-xs font-semibold text-slate-700 mb-1">
                            Methodology &amp; Experimental Design (Optional)
                          </label>
                          <input
                            type="text"
                            value={res.methodology || ''}
                            onChange={(e) => updateResearch(res.id, { methodology: e.target.value })}
                            placeholder="e.g. Constraint-based integer programming and controlled user studies (n=48)"
                            className="w-full px-3 py-1.5 border border-slate-300 rounded text-xs bg-white"
                          />
                        </div>

                        <div className="sm:col-span-2">
                          <label className="block text-xs font-semibold text-slate-700 mb-1">
                            Technologies &amp; Methods (Comma-separated, optional)
                          </label>
                          <CommaArrayInput
                            ariaLabel="Research Technologies"
                            value={res.technologies}
                            onChange={(items) => updateResearch(res.id, { technologies: items })}
                            placeholder="e.g. PyTorch, LaTeX, TeX Engine, Z3"
                            className="w-full px-3 py-1.5 border border-slate-300 rounded text-xs bg-white"
                          />
                        </div>

                        <div className="sm:col-span-2">
                          <label className="block text-xs font-semibold text-slate-700 mb-1">
                            Key Findings (Optional)
                          </label>
                          <textarea
                            rows={2}
                            value={res.findings || ''}
                            onChange={(e) => updateResearch(res.id, { findings: e.target.value })}
                            placeholder="Empirical discoveries, benchmarks, or theoretical contributions..."
                            className="w-full p-2.5 border border-slate-300 rounded text-xs bg-white leading-relaxed"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-semibold text-slate-700 mb-1">
                            Outcomes / Impact (Optional)
                          </label>
                          <input
                            type="text"
                            value={res.outcomes || ''}
                            onChange={(e) => updateResearch(res.id, { outcomes: e.target.value })}
                            placeholder="e.g. Adopted across 12 academic presses"
                            className="w-full px-3 py-1.5 border border-slate-300 rounded text-xs bg-white"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-semibold text-slate-700 mb-1">
                            Related Publications / Patents (Optional)
                          </label>
                          <input
                            type="text"
                            value={res.publications || ''}
                            onChange={(e) => updateResearch(res.id, { publications: e.target.value })}
                            placeholder="e.g. ACM DocEng 2024 Best Paper"
                            className="w-full px-3 py-1.5 border border-slate-300 rounded text-xs bg-white"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {isInternshipResumeTemplate && (
                <div className="mt-7 pt-6 border-t border-slate-200 space-y-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <h3 className="text-sm font-bold text-slate-900">
                        Academic, Lab &amp; Capstone Projects (Shown under RESEARCH WORK)
                      </h3>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Add engineering builds, security labs, or course projects alongside your research topics.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={addProject}
                      className="inline-flex items-center shrink-0 px-3 py-1.5 text-xs font-semibold text-slate-900 bg-white border border-slate-300 hover:bg-slate-100 rounded cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5 mr-1" />
                      <span>Add Project</span>
                    </button>
                  </div>

                  {(!resume.projects || resume.projects.length === 0) ? (
                    <div className="p-6 text-center border border-dashed border-slate-300 rounded-lg">
                      <p className="text-xs text-slate-500">
                        No projects added yet. Optional if you already listed research topics above.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {resume.projects.map((proj, pIdx) => (
                        <div
                          key={proj.id}
                          className="p-4 border border-slate-200 rounded-lg bg-slate-50/50 space-y-3"
                        >
                          <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                            <span className="text-xs font-bold uppercase text-slate-600">
                              Project #{pIdx + 1}
                            </span>
                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() => moveArrayItem('projects', pIdx, -1)}
                                disabled={pIdx === 0}
                                className="p-1 text-slate-400 hover:text-slate-700 disabled:opacity-30 rounded cursor-pointer"
                                title="Move up"
                              >
                                <ChevronUp className="w-4 h-4" />
                              </button>
                              <button
                                type="button"
                                onClick={() => moveArrayItem('projects', pIdx, 1)}
                                disabled={pIdx === (resume.projects?.length || 1) - 1}
                                className="p-1 text-slate-400 hover:text-slate-700 disabled:opacity-30 rounded cursor-pointer"
                                title="Move down"
                              >
                                <ChevronDown className="w-4 h-4" />
                              </button>
                              <button
                                type="button"
                                onClick={() => deleteProject(proj.id)}
                                className="p-1 text-slate-400 hover:text-red-600 rounded cursor-pointer"
                                title="Delete project"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div className="sm:col-span-2">
                              <label className="block text-xs font-semibold text-slate-700 mb-1">
                                Project Title *
                              </label>
                              <input
                                type="text"
                                value={proj.title}
                                onChange={(e) => updateProject(proj.id, { title: e.target.value })}
                                placeholder="e.g. Zero-Trust Packet Anomaly Detector"
                                className="w-full px-3 py-1.5 border border-slate-300 rounded text-sm bg-white"
                              />
                            </div>

                            <div>
                              <label className="block text-xs font-semibold text-slate-700 mb-1">
                                Start / Timeline
                              </label>
                              <input
                                type="text"
                                value={proj.startDate || ''}
                                onChange={(e) => updateProject(proj.id, { startDate: e.target.value })}
                                placeholder="e.g. 08/2024"
                                className="w-full px-3 py-1.5 border border-slate-300 rounded text-xs bg-white"
                              />
                            </div>

                            <div>
                              <label className="block text-xs font-semibold text-slate-700 mb-1">
                                End Date
                              </label>
                              <input
                                type="text"
                                value={proj.endDate || ''}
                                onChange={(e) => updateProject(proj.id, { endDate: e.target.value })}
                                placeholder="e.g. 12/2024 or Present"
                                className="w-full px-3 py-1.5 border border-slate-300 rounded text-xs bg-white"
                              />
                            </div>

                            <div>
                              <label className="block text-xs font-semibold text-slate-700 mb-1">
                                GitHub / Demo Link (Optional)
                              </label>
                              <input
                                type="text"
                                value={proj.githubUrl || proj.link || ''}
                                onChange={(e) =>
                                  updateProject(proj.id, { githubUrl: e.target.value, link: e.target.value })
                                }
                                placeholder="e.g. https://github.com/username/project"
                                className="w-full px-3 py-1.5 border border-slate-300 rounded text-xs bg-white"
                              />
                            </div>

                            <div>
                              <label className="block text-xs font-semibold text-slate-700 mb-1">
                                Technologies Used (Comma-separated)
                              </label>
                              <CommaArrayInput
                                ariaLabel="Internship Project Technologies"
                                value={proj.technologies}
                                onChange={(items) => updateProject(proj.id, { technologies: items })}
                                placeholder="e.g. Python, Scapy, FastAPI, Docker"
                                className="w-full px-3 py-1.5 border border-slate-300 rounded text-xs bg-white"
                              />
                            </div>

                            <div className="sm:col-span-2">
                              <div className="flex items-center justify-between mb-1">
                                <label className="text-xs font-semibold text-slate-700">
                                  Summary / Bullet Points (One bullet per line)
                                </label>
                                {((proj.highlights || []).some((h) => h.trim()) ||
                                  proj.description?.trim()) && (
                                  <button
                                    type="button"
                                    onClick={() =>
                                      handleOpenImprove(
                                        (proj.highlights || []).filter(Boolean).join('\n') ||
                                          proj.description ||
                                          '',
                                        'Internship Project Contributions',
                                        `Project: ${proj.title}`,
                                        (improved) =>
                                          updateProject(proj.id, {
                                            highlights: improved
                                              .split('\n')
                                              .filter((l) => l.trim().length > 0),
                                          })
                                      )
                                    }
                                    className="inline-flex items-center text-[11px] font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 px-2 py-0.5 rounded transition-colors cursor-pointer"
                                  >
                                    <Sparkles className="w-3 h-3 mr-1 text-indigo-600" />
                                    <span>AI Improve</span>
                                  </button>
                                )}
                              </div>
                              <textarea
                                rows={2}
                                value={
                                  (proj.highlights || []).some((h) => h.trim())
                                    ? (proj.highlights || []).join('\n')
                                    : proj.description || ''
                                }
                                onChange={(e) =>
                                  updateProject(proj.id, {
                                    highlights: e.target.value.split('\n'),
                                    description: '',
                                  })
                                }
                                placeholder="Built real-time packet inspection pipeline...&#10;Evaluated accuracy on CICIDS dataset..."
                                className="w-full p-2.5 border border-slate-300 rounded text-xs bg-white leading-relaxed"
                              />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </section>
          )}

          {/* 5. Patents & Publications */}
          {activeSection === 'publications' && (
            <section aria-labelledby="section-pub-title">
              <div className="border-b border-slate-200 pb-3 mb-5 flex items-center justify-between">
                <div>
                  <h2 id="section-pub-title" className="text-lg font-bold text-slate-900">
                    {isCreativeProfessionalTemplate
                      ? 'Talks & Publications'
                      : 'Patents & Publications'}
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {isCreativeProfessionalTemplate
                      ? 'Conference talks, invited panels, technical articles, journal papers, and research publications.'
                      : 'Peer-reviewed journals, conference papers, patents, manuscripts, and theses.'}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={addPublication}
                  className="inline-flex items-center px-3 py-1.5 text-xs font-semibold text-white bg-slate-900 hover:bg-black rounded shadow-xs"
                >
                  <Plus className="w-3.5 h-3.5 mr-1" />
                  <span>Add Publication</span>
                </button>
              </div>

              {(!resume.publications || resume.publications.length === 0) ? (
                <div className="p-8 text-center border border-dashed border-slate-300 rounded-lg">
                  <p className="text-xs text-slate-500">No publications added yet.</p>
                  <button
                    onClick={addPublication}
                    className="mt-2 text-xs font-bold text-slate-900 hover:underline"
                  >
                    + Add a journal article, conference paper, or patent
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  {resume.publications.map((pub, idx) => (
                    <div
                      key={pub.id}
                      className="p-4 border border-slate-200 rounded-lg bg-slate-50/50 space-y-3"
                    >
                      <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                        <div className="flex items-center space-x-2">
                          <span className="text-xs font-bold uppercase text-slate-600">
                            Entry #{idx + 1}
                          </span>
                          <select
                            value={pub.type}
                            onChange={(e) =>
                              updatePublication(pub.id, {
                                type: e.target.value as PublicationType,
                              })
                            }
                            className="text-xs px-2 py-0.5 border border-slate-300 rounded bg-white font-medium"
                          >
                            <option value="book">Book</option>
                            <option value="journal">Journal Article</option>
                            <option value="conference">Conference Proceeding</option>
                            <option value="research_paper">Research Paper</option>
                            <option value="patent">Granted Patent / Filing</option>
                            <option value="manuscript">Submitted Manuscript</option>
                            <option value="thesis">Thesis / Dissertation</option>
                            <option value="other">Other Publication</option>
                          </select>
                        </div>
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => moveArrayItem('publications', idx, -1)}
                            disabled={idx === 0}
                            className="p-1 text-slate-400 hover:text-slate-700 disabled:opacity-30 rounded cursor-pointer"
                            title="Move up"
                            aria-label={`Move publication ${idx + 1} up`}
                          >
                            <ChevronUp className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => moveArrayItem('publications', idx, 1)}
                            disabled={idx === (resume.publications?.length || 1) - 1}
                            className="p-1 text-slate-400 hover:text-slate-700 disabled:opacity-30 rounded cursor-pointer"
                            title="Move down"
                            aria-label={`Move publication ${idx + 1} down`}
                          >
                            <ChevronDown className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => deletePublication(pub.id)}
                            className="p-1 text-slate-400 hover:text-red-600 rounded"
                            title="Delete entry"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="sm:col-span-2">
                          <label className="block text-xs font-semibold text-slate-700 mb-1">
                            Title of Paper / Patent *
                          </label>
                          <input
                            type="text"
                            value={pub.title}
                            onChange={(e) => updatePublication(pub.id, { title: e.target.value })}
                            placeholder="e.g. SE(3)-Equivariant Flow Matching for Flexible Protein Binding"
                            className="w-full px-3 py-1.5 border border-slate-300 rounded text-sm bg-white"
                          />
                        </div>

                        <div className="sm:col-span-2">
                          <label className="block text-xs font-semibold text-slate-700 mb-1">
                            Authors (Academic format) *
                          </label>
                          <input
                            type="text"
                            value={pub.authors}
                            onChange={(e) => updatePublication(pub.id, { authors: e.target.value })}
                            placeholder="e.g. Chen, E. V., Vance, M., and Thorne, S. R."
                            className="w-full px-3 py-1.5 border border-slate-300 rounded text-sm bg-white"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-semibold text-slate-700 mb-1">
                            Journal / Conference / Publisher
                          </label>
                          <input
                            type="text"
                            value={pub.journalOrConference || ''}
                            onChange={(e) =>
                              updatePublication(pub.id, { journalOrConference: e.target.value })
                            }
                            placeholder="e.g. Nature Machine Intelligence or NeurIPS 2023"
                            className="w-full px-3 py-1.5 border border-slate-300 rounded text-sm bg-white"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-semibold text-slate-700 mb-1">
                            Year
                          </label>
                          <input
                            type="text"
                            value={pub.year}
                            onChange={(e) => updatePublication(pub.id, { year: e.target.value })}
                            placeholder="e.g. 2024"
                            className="w-full px-3 py-1.5 border border-slate-300 rounded text-sm bg-white"
                          />
                        </div>

                        {pub.type === 'patent' ? (
                          <>
                            <div>
                              <label className="block text-xs font-semibold text-slate-700 mb-1">
                                Patent Number
                              </label>
                              <input
                                type="text"
                                value={pub.patentNumber || ''}
                                onChange={(e) =>
                                  updatePublication(pub.id, { patentNumber: e.target.value })
                                }
                                placeholder="e.g. US Patent 11,948,302 B2"
                                className="w-full px-3 py-1.5 border border-slate-300 rounded text-sm bg-white"
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-semibold text-slate-700 mb-1">
                                Patent Status
                              </label>
                              <input
                                type="text"
                                value={pub.status || ''}
                                onChange={(e) =>
                                  updatePublication(pub.id, { status: e.target.value })
                                }
                                placeholder="e.g. Granted or Filed / Pending"
                                className="w-full px-3 py-1.5 border border-slate-300 rounded text-sm bg-white"
                              />
                            </div>
                          </>
                        ) : (
                          <>
                            <div>
                              <label className="block text-xs font-semibold text-slate-700 mb-1">
                                Volume &amp; Issue (Optional)
                              </label>
                              <input
                                type="text"
                                value={`${pub.volume || ''}${pub.issue ? `(${pub.issue})` : ''}`}
                                onChange={(e) => {
                                  const raw = e.target.value;
                                  const match = raw.match(/^([^(]+)(?:\(([^)]+)\))?/);
                                  updatePublication(pub.id, {
                                    volume: match ? match[1].trim() : raw,
                                    issue: match && match[2] ? match[2].trim() : '',
                                  });
                                }}
                                placeholder="e.g. Vol 6, Issue 3 -> 6(3)"
                                className="w-full px-3 py-1.5 border border-slate-300 rounded text-sm bg-white"
                              />
                            </div>

                            <div>
                              <label className="block text-xs font-semibold text-slate-700 mb-1">
                                Pages (Optional)
                              </label>
                              <input
                                type="text"
                                value={pub.pages || ''}
                                onChange={(e) => updatePublication(pub.id, { pages: e.target.value })}
                                placeholder="e.g. 284–296"
                                className="w-full px-3 py-1.5 border border-slate-300 rounded text-sm bg-white"
                              />
                            </div>

                            <div>
                              <label className="block text-xs font-semibold text-slate-700 mb-1">
                                DOI (Optional)
                              </label>
                              <input
                                type="text"
                                value={pub.doi || ''}
                                onChange={(e) => updatePublication(pub.id, { doi: e.target.value })}
                                placeholder="e.g. 10.1038/s42256-024-00812-4"
                                className="w-full px-3 py-1.5 border border-slate-300 rounded text-sm bg-white"
                              />
                            </div>

                            <div>
                              <label className="block text-xs font-semibold text-slate-700 mb-1">
                                Status (Optional)
                              </label>
                              <input
                                type="text"
                                value={pub.status || 'Published'}
                                onChange={(e) =>
                                  updatePublication(pub.id, { status: e.target.value })
                                }
                                placeholder="Published, In Press, or Under Review"
                                className="w-full px-3 py-1.5 border border-slate-300 rounded text-sm bg-white"
                              />
                            </div>

                            {(isTwoColumnTemplate || isElegantSerifTemplate) && (
                              <>
                                <div>
                                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                                    Publisher / Location (Optional)
                                  </label>
                                  <input
                                    type="text"
                                    value={pub.location || pub.publisher || ''}
                                    onChange={(e) =>
                                      updatePublication(pub.id, { location: e.target.value })
                                    }
                                    placeholder="e.g. Cambridge, MA"
                                    className="w-full px-3 py-1.5 border border-slate-300 rounded text-sm bg-white"
                                  />
                                </div>
                                <div>
                                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                                    External Paper / Book URL (Optional)
                                  </label>
                                  <input
                                    type="url"
                                    value={pub.url || ''}
                                    onChange={(e) =>
                                      updatePublication(pub.id, { url: e.target.value })
                                    }
                                    placeholder="https://..."
                                    className="w-full px-3 py-1.5 border border-slate-300 rounded text-sm bg-white"
                                  />
                                </div>
                              </>
                            )}
                            {isElegantSerifTemplate && (
                              <>
                                <div>
                                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                                    Publication Date (Optional)
                                  </label>
                                  <input
                                    type="text"
                                    value={pub.publicationDate || ''}
                                    onChange={(e) =>
                                      updatePublication(pub.id, { publicationDate: e.target.value })
                                    }
                                    placeholder="e.g. October 2024"
                                    className="w-full px-3 py-1.5 border border-slate-300 rounded text-sm bg-white"
                                  />
                                </div>
                                <div className="sm:col-span-2">
                                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                                    Brief Abstract / Note (Optional)
                                  </label>
                                  <input
                                    type="text"
                                    value={pub.description || ''}
                                    onChange={(e) =>
                                      updatePublication(pub.id, { description: e.target.value })
                                    }
                                    placeholder="e.g. Best Paper Nominee; open-source artifact available"
                                    className="w-full px-3 py-1.5 border border-slate-300 rounded text-sm bg-white"
                                  />
                                </div>
                              </>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          )}

          {/* 6. Projects */}
          {activeSection === 'projects' && (
            <section aria-labelledby="section-proj-title">
              <div className="border-b border-slate-200 pb-3 mb-5 flex items-center justify-between">
                <div>
                  <h2 id="section-proj-title" className="text-lg font-bold text-slate-900">
                    Projects
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {isEngineeringResumeTemplate
                      ? 'Academic, capstone, mini, hardware, or software projects with tools, methodology, and verified results.'
                      : 'Software systems, benchmark suites, research codebases, and technical tooling.'}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={addProject}
                  className="inline-flex items-center px-3 py-1.5 text-xs font-semibold text-white bg-slate-900 hover:bg-black rounded shadow-xs cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5 mr-1" />
                  <span>Add Project</span>
                </button>
              </div>

              {(!resume.projects || resume.projects.length === 0) ? (
                <div className="p-8 text-center border border-dashed border-slate-300 rounded-lg">
                  <p className="text-xs text-slate-500">No projects added yet.</p>
                  <button
                    onClick={addProject}
                    className="mt-2 text-xs font-bold text-slate-900 hover:underline"
                  >
                    + Add your first project
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  {resume.projects.map((proj, idx) => (
                    <div
                      key={proj.id}
                      className="p-4 border border-slate-200 rounded-lg bg-slate-50/50 space-y-3"
                    >
                      <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                        <span className="text-xs font-bold uppercase text-slate-600">
                          Project #{idx + 1}
                        </span>
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => moveArrayItem('projects', idx, -1)}
                            disabled={idx === 0}
                            className="p-1 text-slate-400 hover:text-slate-700 disabled:opacity-30 rounded cursor-pointer"
                            title="Move up"
                            aria-label={`Move project ${idx + 1} up`}
                          >
                            <ChevronUp className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => moveArrayItem('projects', idx, 1)}
                            disabled={idx === resume.projects.length - 1}
                            className="p-1 text-slate-400 hover:text-slate-700 disabled:opacity-30 rounded cursor-pointer"
                            title="Move down"
                            aria-label={`Move project ${idx + 1} down`}
                          >
                            <ChevronDown className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => deleteProject(proj.id)}
                            className="p-1 text-slate-400 hover:text-red-600 rounded"
                            title="Delete entry"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div
                          className={
                            isSoftwareDevTemplate || isEngineeringResumeTemplate
                              ? ''
                              : 'sm:col-span-2'
                          }
                        >
                          <label className="block text-xs font-semibold text-slate-700 mb-1">
                            Project Name *
                          </label>
                          <input
                            type="text"
                            value={proj.title}
                            onChange={(e) => updateProject(proj.id, { title: e.target.value })}
                            placeholder={
                              isEngineeringResumeTemplate
                                ? 'e.g. Design & Thermal CFD Analysis of EV Battery Cold Plate'
                                : 'e.g. BioEquivariance Geometric Library'
                            }
                            className="w-full px-3 py-1.5 border border-slate-300 rounded text-sm bg-white"
                          />
                        </div>

                        {(isSoftwareDevTemplate ||
                          isModernCorporateTemplate ||
                          isEngineeringResumeTemplate) && (
                          <div>
                            <label className="block text-xs font-semibold text-slate-700 mb-1">
                              Project Type (Optional)
                            </label>
                            <input
                              type="text"
                              value={proj.projectType || ''}
                              onChange={(e) =>
                                updateProject(proj.id, { projectType: e.target.value })
                              }
                              placeholder={
                                isEngineeringResumeTemplate
                                  ? 'e.g. Major Capstone, Mini Project, Design Project'
                                  : 'e.g. Corporate Initiative, Open Source, Capstone'
                              }
                              className="w-full px-3 py-1.5 border border-slate-300 rounded text-sm bg-white"
                            />
                          </div>
                        )}

                        {(isTwoColumnTemplate || isElegantSerifTemplate || isModernCorporateTemplate) && (
                          <div className="sm:col-span-2">
                            <label className="block text-xs font-semibold text-slate-700 mb-1">
                              Funding Agency / Organization / Institution (Optional)
                            </label>
                            <input
                              type="text"
                              value={proj.institution || ''}
                              onChange={(e) =>
                                updateProject(proj.id, { institution: e.target.value })
                              }
                              placeholder="e.g. Meridian Capital Partners or Course Project"
                              className="w-full px-3 py-1.5 border border-slate-300 rounded text-sm bg-white"
                            />
                          </div>
                        )}
                        {(isElegantSerifTemplate || isEngineeringResumeTemplate) && (
                          <div>
                            <label className="block text-xs font-semibold text-slate-700 mb-1">
                              Participation Mode (Optional)
                            </label>
                            <select
                              value={proj.teamType || ''}
                              onChange={(e) =>
                                updateProject(proj.id, {
                                  teamType: (e.target.value || undefined) as
                                    | 'Individual'
                                    | 'Team'
                                    | undefined,
                                })
                              }
                              className="w-full px-3 py-1.5 border border-slate-300 rounded text-sm bg-white"
                            >
                              <option value="">Unspecified</option>
                              <option value="Individual">Individual</option>
                              <option value="Team">Team</option>
                            </select>
                          </div>
                        )}
                        {isEngineeringResumeTemplate && (
                          <div>
                            <label className="block text-xs font-semibold text-slate-700 mb-1">
                              Branch / Technical Domain (Optional)
                            </label>
                            <input
                              type="text"
                              value={proj.domain || ''}
                              onChange={(e) => updateProject(proj.id, { domain: e.target.value })}
                              placeholder="e.g. Thermal & CAE, Full-Stack Systems, Embedded VLSI"
                              className="w-full px-3 py-1.5 border border-slate-300 rounded text-sm bg-white"
                            />
                          </div>
                        )}
                        {isEngineeringResumeTemplate && (
                          <div>
                            <label className="block text-xs font-semibold text-slate-700 mb-1">
                              Faculty Mentor / Guide (Optional)
                            </label>
                            <input
                              type="text"
                              value={proj.mentor || ''}
                              onChange={(e) => updateProject(proj.id, { mentor: e.target.value })}
                              placeholder="e.g. Dr. R. Sharma (Dept. of Mechanical Engineering)"
                              className="w-full px-3 py-1.5 border border-slate-300 rounded text-sm bg-white"
                            />
                          </div>
                        )}

                        <div>
                          <label className="block text-xs font-semibold text-slate-700 mb-1">
                            Project / Live Demo URL
                          </label>
                          <input
                            type="text"
                            value={proj.link || ''}
                            onChange={(e) => updateProject(proj.id, { link: e.target.value })}
                            placeholder="e.g. https://demo.example.com"
                            className="w-full px-3 py-1.5 border border-slate-300 rounded text-sm bg-white"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-semibold text-slate-700 mb-1">
                            GitHub Repository URL
                          </label>
                          <input
                            type="text"
                            value={proj.githubUrl || ''}
                            onChange={(e) => updateProject(proj.id, { githubUrl: e.target.value })}
                            placeholder="e.g. https://github.com/user/repo"
                            className="w-full px-3 py-1.5 border border-slate-300 rounded text-sm bg-white"
                          />
                        </div>

                        <div className="sm:col-span-2">
                          <label className="block text-xs font-semibold text-slate-700 mb-1">
                            Dates (e.g. January 2021 or 2022 – 2024)
                          </label>
                          <input
                            type="text"
                            value={proj.startDate || ''}
                            onChange={(e) => updateProject(proj.id, { startDate: e.target.value })}
                            placeholder="e.g. January 2021"
                            className="w-full px-3 py-1.5 border border-slate-300 rounded text-sm bg-white"
                          />
                        </div>

                        <div className="sm:col-span-2">
                          <label className="block text-xs font-semibold text-slate-700 mb-1">
                            Technologies &amp; Tools Used (Comma-separated)
                          </label>
                          <CommaArrayInput
                            ariaLabel="Technologies & Tools Used"
                            value={proj.technologies}
                            onChange={(items) =>
                              updateProject(proj.id, { technologies: items })
                            }
                            placeholder="e.g. Python, PyTorch, CUDA, C++"
                            className="w-full px-3 py-1.5 border border-slate-300 rounded text-sm bg-white"
                          />
                        </div>

                        {isSoftwareDevTemplate && (
                          <>
                            <div>
                              <label className="block text-xs font-semibold text-slate-700 mb-1">
                                Frameworks (Optional)
                              </label>
                              <CommaArrayInput
                                ariaLabel="Frameworks"
                                value={proj.frameworks}
                                onChange={(items) =>
                                  updateProject(proj.id, { frameworks: items })
                                }
                                placeholder="e.g. React, Next.js, FastAPI"
                                className="w-full px-3 py-1.5 border border-slate-300 rounded text-xs bg-white"
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-semibold text-slate-700 mb-1">
                                Database (Optional)
                              </label>
                              <input
                                type="text"
                                value={proj.database || ''}
                                onChange={(e) =>
                                  updateProject(proj.id, { database: e.target.value })
                                }
                                placeholder="e.g. PostgreSQL, Redis"
                                className="w-full px-3 py-1.5 border border-slate-300 rounded text-xs bg-white"
                              />
                            </div>
                            <div className="sm:col-span-2">
                              <label className="block text-xs font-semibold text-slate-700 mb-1">
                                Developer Tools (Optional)
                              </label>
                              <CommaArrayInput
                                ariaLabel="Developer Tools"
                                value={proj.tools}
                                onChange={(items) =>
                                  updateProject(proj.id, { tools: items })
                                }
                                placeholder="e.g. Docker, Kubernetes, GitHub Actions"
                                className="w-full px-3 py-1.5 border border-slate-300 rounded text-xs bg-white"
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-semibold text-slate-700 mb-1">
                                Key Features (Optional)
                              </label>
                              <CommaArrayInput
                                ariaLabel="Key Features"
                                value={proj.keyFeatures}
                                onChange={(items) =>
                                  updateProject(proj.id, { keyFeatures: items })
                                }
                                placeholder="e.g. Real-time query planner, zero-downtime failover"
                                className="w-full px-3 py-1.5 border border-slate-300 rounded text-xs bg-white"
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-semibold text-slate-700 mb-1">
                                Technical Challenges Solved (Optional)
                              </label>
                              <input
                                type="text"
                                value={proj.technicalChallenges || ''}
                                onChange={(e) =>
                                  updateProject(proj.id, {
                                    technicalChallenges: e.target.value,
                                  })
                                }
                                placeholder="e.g. Eliminated lock contention across partitioned shards"
                                className="w-full px-3 py-1.5 border border-slate-300 rounded text-xs bg-white"
                              />
                            </div>
                          </>
                        )}

                        {isEngineeringResumeTemplate && (
                          <>
                            <div className="sm:col-span-2">
                              <label className="block text-xs font-semibold text-slate-700 mb-1">
                                Engineering Objective (Optional)
                              </label>
                              <input
                                type="text"
                                value={proj.objective || ''}
                                onChange={(e) =>
                                  updateProject(proj.id, { objective: e.target.value })
                                }
                                placeholder="e.g. Minimize peak lithium-ion cell temperature variance below 3.5 C under 3C discharge."
                                className="w-full px-3 py-1.5 border border-slate-300 rounded text-xs bg-white"
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-semibold text-slate-700 mb-1">
                                Methodology / Process (Optional)
                              </label>
                              <input
                                type="text"
                                value={proj.methodology || ''}
                                onChange={(e) =>
                                  updateProject(proj.id, { methodology: e.target.value })
                                }
                                placeholder="e.g. Conjugate heat transfer CFD across 3 serpentine channel geometries"
                                className="w-full px-3 py-1.5 border border-slate-300 rounded text-xs bg-white"
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-semibold text-slate-700 mb-1">
                                Design Approach (Optional)
                              </label>
                              <input
                                type="text"
                                value={proj.designApproach || ''}
                                onChange={(e) =>
                                  updateProject(proj.id, { designApproach: e.target.value })
                                }
                                placeholder="e.g. Counter-flow dual-inlet aluminum 6061 manifold"
                                className="w-full px-3 py-1.5 border border-slate-300 rounded text-xs bg-white"
                              />
                            </div>
                            <div className="sm:col-span-2">
                              <label className="block text-xs font-semibold text-slate-700 mb-1">
                                Components / Materials Used (Optional, comma-separated)
                              </label>
                              <CommaArrayInput
                                ariaLabel="Components and Materials"
                                value={proj.componentsMaterials}
                                onChange={(items) =>
                                  updateProject(proj.id, { componentsMaterials: items })
                                }
                                placeholder="e.g. Al-6061 Plate, 18650 Cells, NTC Thermistors, STM32 MCU"
                                className="w-full px-3 py-1.5 border border-slate-300 rounded text-xs bg-white"
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-semibold text-slate-700 mb-1">
                                Testing &amp; Validation (Optional)
                              </label>
                              <input
                                type="text"
                                value={proj.testingValidation || ''}
                                onChange={(e) =>
                                  updateProject(proj.id, { testingValidation: e.target.value })
                                }
                                placeholder="e.g. Verified pressure drop and steady-state thermal profile in benchtop loop"
                                className="w-full px-3 py-1.5 border border-slate-300 rounded text-xs bg-white"
                              />
                            </div>
                            <div>
                              <div className="flex items-center justify-between mb-1">
                                <label className="text-xs font-semibold text-slate-700">
                                  Results &amp; Outcomes (Optional)
                                </label>
                                {proj.results?.trim() && (
                                  <button
                                    type="button"
                                    onClick={() =>
                                      handleOpenImprove(
                                        proj.results || '',
                                        'Engineering Project Results',
                                        `Project: ${proj.title}`,
                                        (improved) => updateProject(proj.id, { results: improved })
                                      )
                                    }
                                    className="inline-flex items-center text-[10px] font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 px-1.5 py-0.5 rounded transition-colors cursor-pointer"
                                  >
                                    <Sparkles className="w-2.5 h-2.5 mr-1 text-indigo-600" />
                                    <span>AI Improve</span>
                                  </button>
                                )}
                              </div>
                              <input
                                type="text"
                                value={proj.results || ''}
                                onChange={(e) =>
                                  updateProject(proj.id, { results: e.target.value })
                                }
                                placeholder="e.g. Reduced peak cell hotspot from 48.2 C to 36.4 C while cutting pump power"
                                className="w-full px-3 py-1.5 border border-slate-300 rounded text-xs bg-white"
                              />
                            </div>
                          </>
                        )}

                        <div className="sm:col-span-2">
                          <div className="flex items-center justify-between mb-1">
                            <label className="text-xs font-semibold text-slate-700">
                              Project Summary &amp; Scope
                            </label>
                            {proj.description?.trim() && (
                              <button
                                type="button"
                                onClick={() =>
                                  handleOpenImprove(
                                    proj.description || '',
                                    'Project Summary',
                                    `Project: ${proj.title}`,
                                    (improved) => updateProject(proj.id, { description: improved })
                                  )
                                }
                                className="inline-flex items-center text-[11px] font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 px-2 py-0.5 rounded transition-colors cursor-pointer"
                              >
                                <Sparkles className="w-3 h-3 mr-1 text-indigo-600" />
                                <span>AI Improve</span>
                              </button>
                            )}
                          </div>
                          <textarea
                            rows={2}
                            value={proj.description}
                            onChange={(e) =>
                              updateProject(proj.id, { description: e.target.value })
                            }
                            placeholder="Unified toolkit containing equivariant convolutional layers..."
                            className="w-full p-2.5 border border-slate-300 rounded text-xs bg-white leading-relaxed"
                          />
                        </div>

                        <div className="sm:col-span-2">
                          <div className="flex items-center justify-between mb-1">
                            <label className="text-xs font-semibold text-slate-700">
                              Detailed Contributions &amp; Outcomes (One bullet per line)
                            </label>
                            {(proj.highlights || []).some((h) => h.trim().length > 0) && (
                              <button
                                type="button"
                                onClick={() =>
                                  handleOpenImprove(
                                    (proj.highlights || []).join('\n'),
                                    'Project Contributions',
                                    `Project: ${proj.title}`,
                                    (improved) =>
                                      updateProject(proj.id, {
                                        highlights: improved.split('\n').filter((l) => l.trim().length > 0),
                                      })
                                  )
                                }
                                className="inline-flex items-center text-[11px] font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 px-2 py-0.5 rounded transition-colors cursor-pointer"
                              >
                                <Sparkles className="w-3 h-3 mr-1 text-indigo-600" />
                                <span>AI Improve</span>
                              </button>
                            )}
                          </div>
                          <textarea
                            rows={3}
                            value={(proj.highlights || []).join('\n')}
                            onChange={(e) =>
                              updateProject(proj.id, { highlights: e.target.value.split('\n') })
                            }
                            placeholder="• Maintained active open-source ecosystem with over 35,000 monthly downloads...&#10;• Integrated with PyMOL plugins..."
                            className="w-full p-2.5 border border-slate-300 rounded text-xs bg-white leading-relaxed"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          )}

          {/* 6a. A Day of My Life (Two Column Professional - Optional) */}
          {activeSection === 'daily-life' && (
            <section aria-labelledby="section-daily-title">
              <div className="border-b border-slate-200 pb-3 mb-5 flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h2 id="section-daily-title" className="text-lg font-bold text-slate-900">
                    A Day of My Life (Optional)
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Optionally illustrate how you balance your daily routine in a clean donut chart. Total hours cannot exceed 24 hours.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      updateField(
                        'showDailyActivityChart',
                        resume.showDailyActivityChart === false ? true : false
                      )
                    }
                    className={`px-2.5 py-1.5 text-xs font-semibold border rounded cursor-pointer transition-colors ${
                      resume.showDailyActivityChart === false
                        ? 'bg-white text-slate-600 border-slate-300'
                        : 'bg-[#8f131b]/10 text-[#8f131b] border-[#8f131b]/30'
                    }`}
                  >
                    {resume.showDailyActivityChart === false ? 'Chart Hidden (Show)' : 'Chart Visible'}
                  </button>
                  <button
                    type="button"
                    onClick={addDailyActivity}
                    className="inline-flex items-center px-3 py-1.5 text-xs font-semibold text-white bg-slate-900 hover:bg-black rounded shadow-xs cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5 mr-1" />
                    <span>Add Activity</span>
                  </button>
                </div>
              </div>

              {/* 24-hour Balance Summary & Strict Ceiling Feedback */}
              <div
                className={`mb-4 p-3.5 rounded-lg border flex flex-col sm:flex-row sm:items-center justify-between gap-2 ${
                  !dailyValidation.valid && dailyValidation.totalHours > 24
                    ? 'bg-rose-50 border-rose-300 text-rose-900'
                    : 'bg-slate-50 border-slate-200 text-slate-800'
                }`}
              >
                <div className="flex items-center gap-2 text-xs">
                  {dailyValidation.totalHours > 24 && (
                    <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  )}
                  <div>
                    <span className="font-bold">
                      Total Allocated: {dailyValidation.totalHours} / 24 hours
                    </span>
                    <span className="ml-2 text-slate-600">
                      (Remaining: {dailyValidation.remainingHours}h)
                    </span>
                    {!dailyValidation.valid && dailyValidation.error && (
                      <div className="text-rose-700 font-semibold mt-1" role="alert">
                        {dailyValidation.error}
                      </div>
                    )}
                  </div>
                </div>
                {(resume.dailyActivities || []).length > 0 && (
                  <button
                    type="button"
                    onClick={() => updateField('dailyActivities', [])}
                    className="text-xs font-semibold text-slate-600 hover:text-rose-700 underline shrink-0 cursor-pointer"
                  >
                    Skip &amp; Clear Section
                  </button>
                )}
              </div>

              {(!resume.dailyActivities || resume.dailyActivities.length === 0) ? (
                <div className="p-8 text-center border border-dashed border-slate-300 rounded-lg space-y-2">
                  <p className="text-xs text-slate-500">
                    No daily activities added. Leave empty to automatically hide &ldquo;A Day of My Life&rdquo; from your CV.
                  </p>
                  <button
                    type="button"
                    onClick={addDailyActivity}
                    className="text-xs font-bold text-[#8f131b] hover:underline cursor-pointer"
                  >
                    + Add your first daily activity
                  </button>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {resume.dailyActivities.map((item) => (
                    <div
                      key={item.id}
                      className="p-3 border border-slate-200 rounded-lg bg-slate-50/50 grid grid-cols-1 sm:grid-cols-12 gap-2.5 items-center"
                    >
                      <div className="sm:col-span-8">
                        <label className="block text-[11px] font-semibold text-slate-600 mb-0.5">
                          Activity Label *
                        </label>
                        <input
                          type="text"
                          value={item.activity}
                          onChange={(e) =>
                            updateDailyActivity(item.id, { activity: e.target.value })
                          }
                          placeholder="e.g. Deep research & coding, Teaching, Exercise, Sleep & rest"
                          className="w-full px-2.5 py-1.5 border border-slate-300 rounded text-xs bg-white"
                        />
                      </div>
                      <div className="sm:col-span-3">
                        <label className="block text-[11px] font-semibold text-slate-600 mb-0.5">
                          Hours per day *
                        </label>
                        <input
                          type="number"
                          min={0}
                          max={24}
                          step={0.5}
                          value={item.hours}
                          onChange={(e) =>
                            updateDailyActivity(item.id, {
                              hours: Number(e.target.value),
                            })
                          }
                          className="w-full px-2.5 py-1.5 border border-slate-300 rounded text-xs bg-white"
                        />
                      </div>
                      <div className="sm:col-span-1 flex justify-end pt-4 sm:pt-3">
                        <button
                          type="button"
                          onClick={() => deleteDailyActivity(item.id)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 rounded cursor-pointer"
                          title="Delete activity"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          )}

          {/* 6b. My Life Philosophy (Two Column Professional - Optional) */}
          {activeSection === 'philosophy' && (
            <section aria-labelledby="section-philosophy-title">
              <div className="border-b border-slate-200 pb-3 mb-5 flex items-center justify-between">
                <div>
                  <h2 id="section-philosophy-title" className="text-lg font-bold text-slate-900">
                    My Life Philosophy (Optional)
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    A concise personal motto or guiding principle displayed as a clean quote in your sidebar. Hidden automatically if left blank.
                  </p>
                </div>
                {resume.personalQuote?.trim() && (
                  <button
                    type="button"
                    onClick={() =>
                      handleOpenImprove(
                        resume.personalQuote || '',
                        'My Life Philosophy Quote',
                        resume.targetRole,
                        (improved) => updateField('personalQuote', improved)
                      )
                    }
                    className="inline-flex items-center text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 px-3 py-1.5 rounded-lg shadow-2xs transition-colors cursor-pointer"
                  >
                    <Sparkles className="w-3.5 h-3.5 mr-1.5 text-indigo-600" />
                    <span>AI Improve</span>
                  </button>
                )}
              </div>

              <textarea
                rows={4}
                value={resume.personalQuote || ''}
                onChange={(e) => updateField('personalQuote', e.target.value)}
                placeholder="e.g. Clarity in architecture turns ambitious hypotheses into systems people rely on every day."
                className="w-full p-3 border border-slate-300 rounded text-sm italic bg-white focus:outline-none focus:ring-2 focus:ring-slate-900 leading-relaxed"
              />
              {resume.personalQuote?.trim() && (
                <div className="mt-2 flex justify-end">
                  <button
                    type="button"
                    onClick={() => updateField('personalQuote', '')}
                    className="text-xs text-slate-500 hover:text-rose-700 underline cursor-pointer"
                  >
                    Clear &amp; Hide Philosophy Section
                  </button>
                </div>
              )}
            </section>
          )}

          {/* 6c. Strengths Keyword Chips (Two Column Professional) */}
          {activeSection === 'strengths' && (
            <section aria-labelledby="section-strengths-title">
              <div className="border-b border-slate-200 pb-3 mb-5">
                <h2 id="section-strengths-title" className="text-lg font-bold text-slate-900">
                  {isModernCorporateTemplate ? 'Core Competencies' : 'Strengths'}
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  {isModernCorporateTemplate
                    ? 'Add executive or functional core competencies to render as clean ATS-friendly text inside the ModernCV layout (never shown as skill bars or pills). No competencies are ever auto-assigned.'
                    : 'Add your own strengths or key skills to display as crisp outlined keyword tags in the right sidebar. No strengths are ever auto-assigned.'}
                </p>
              </div>

              <div className="flex flex-col sm:flex-row gap-2 mb-4">
                <input
                  type="text"
                  value={strengthDraft}
                  onChange={(e) => setStrengthDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      addStrengthChip();
                    }
                  }}
                  placeholder="Type a strength or comma-separated strengths (e.g. Hard-working, C++, Systems Design)"
                  className="flex-1 px-3 py-2 border border-slate-300 rounded text-sm bg-white focus:outline-none focus:ring-2 focus:ring-slate-900"
                />
                <button
                  type="button"
                  onClick={addStrengthChip}
                  className="inline-flex items-center justify-center px-4 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-black rounded shadow-xs shrink-0 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5 mr-1" />
                  <span>Add Strength</span>
                </button>
              </div>

              {(!resume.strengths || resume.strengths.length === 0) ? (
                <div className="p-8 text-center border border-dashed border-slate-300 rounded-lg">
                  <p className="text-xs text-slate-500">
                    No strengths added yet. Add chips above or leave empty to hide the Strengths section cleanly.
                  </p>
                </div>
              ) : (
                <div className="flex flex-wrap gap-2 p-4 border border-slate-200 rounded-lg bg-slate-50/50">
                  {resume.strengths.map((tag, idx) => (
                    <span
                      key={`${tag}-${idx}`}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium bg-white border border-slate-300 text-slate-800 rounded"
                    >
                      <span>{tag}</span>
                      <button
                        type="button"
                        onClick={() => deleteStrengthChip(idx)}
                        className="text-slate-400 hover:text-rose-600 cursor-pointer"
                        aria-label={`Remove strength ${tag}`}
                        title="Remove strength"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </section>
          )}

          {/* 6b. Languages (Classic Professional & Two Column Professional) */}
          {activeSection === 'languages' && (
            <section aria-labelledby="section-languages-title">
              <div className="border-b border-slate-200 pb-3 mb-5 flex items-center justify-between">
                <div>
                  <h2 id="section-languages-title" className="text-lg font-bold text-slate-900">
                    Languages
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {isTwoColumnTemplate || isCreativeProfessionalTemplate
                      ? 'Confirm your proficiency level (renders 5-dot visual ratings). Leave as Unconfirmed to hide dots cleanly.'
                      : 'Spoken languages with standardized proficiency levels and optional certificates/comments.'}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={addLanguage}
                  className="inline-flex items-center px-3 py-1.5 text-xs font-semibold text-white bg-slate-900 hover:bg-black rounded shadow-xs cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5 mr-1" />
                  <span>Add Language</span>
                </button>
              </div>

              {(!resume.languages || resume.languages.length === 0) ? (
                <div className="p-8 text-center border border-dashed border-slate-300 rounded-lg">
                  <p className="text-xs text-slate-500">No languages added yet.</p>
                  <button
                    type="button"
                    onClick={addLanguage}
                    className="mt-2 text-xs font-bold text-slate-900 hover:underline"
                  >
                    + Add your first language
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  {resume.languages.map((lang) => {
                    const dotScore = getLanguageDotScore(lang.proficiency);
                    return (
                      <div
                        key={lang.id}
                        className="p-3.5 border border-slate-200 rounded-lg bg-slate-50/50 grid grid-cols-1 sm:grid-cols-12 gap-2.5 items-center"
                      >
                        <div className="sm:col-span-4">
                          <label className="block text-[11px] font-semibold text-slate-600 mb-0.5">
                            Language *
                          </label>
                          <input
                            type="text"
                            value={lang.language}
                            onChange={(e) => updateLanguage(lang.id, { language: e.target.value })}
                            placeholder="e.g. German, English"
                            className="w-full px-2.5 py-1.5 border border-slate-300 rounded text-xs bg-white"
                          />
                        </div>
                        <div className="sm:col-span-4">
                          <label className="block text-[11px] font-semibold text-slate-600 mb-0.5">
                            Proficiency Level
                          </label>
                          <select
                            value={lang.proficiency}
                            onChange={(e) => updateLanguage(lang.id, { proficiency: e.target.value })}
                            className="w-full px-2.5 py-1.5 border border-slate-300 rounded text-xs bg-white"
                          >
                            <option value="">
                              {isHarvardTemplate ||
                              isElegantSerifTemplate ||
                              isModernCorporateTemplate ||
                              isFresherResumeTemplate
                                ? 'Unconfirmed (Hide level)'
                                : 'Unconfirmed (Hide dots)'}
                            </option>
                            <option value="Beginner">Beginner (1 / 5)</option>
                            <option value="Elementary">Elementary (2 / 5)</option>
                            <option value="Intermediate">Intermediate (3 / 5)</option>
                            <option value="3.5">Upper Intermediate / B2 (3.5 / 5)</option>
                            <option value="Upper Intermediate">Upper Intermediate (4 / 5)</option>
                            <option value="Advanced">Advanced (4 / 5)</option>
                            <option value="Fluent">Fluent (4.5 / 5)</option>
                            <option value="Native">Native (5 / 5)</option>
                            <option value="Native / Bilingual">Native / Bilingual (5 / 5)</option>
                            <option value="Professional Working">Professional Working (4 / 5)</option>
                          </select>
                        </div>
                        <div className="sm:col-span-3">
                          {isTwoColumnTemplate || isCreativeProfessionalTemplate ? (
                            <div>
                              <span className="block text-[11px] font-semibold text-slate-600 mb-1">
                                5-Dot Preview
                              </span>
                              {dotScore !== null ? (
                                <div className="flex items-center gap-1.5">
                                  <svg width="70" height="14" viewBox="0 0 70 14" aria-label={`Language rating ${dotScore} out of 5`}>
                                    {[1, 2, 3, 4, 5].map((dot) => {
                                      const cx = (dot - 1) * 14 + 7;
                                      const filled = dotScore >= dot;
                                      const half = !filled && dotScore >= dot - 0.5;
                                      const dotColor = isCreativeProfessionalTemplate ? '#1d4ed8' : '#8f131b';
                                      return (
                                        <g key={dot}>
                                          <circle cx={cx} cy={7} r={5.5} fill="#e5e7eb" stroke={dotColor} strokeWidth={1} />
                                          {filled && <circle cx={cx} cy={7} r={5} fill={dotColor} />}
                                          {half && (
                                            <path
                                              d={`M ${cx} 2 A 5 5 0 0 0 ${cx} 12 Z`}
                                              fill={dotColor}
                                            />
                                          )}
                                        </g>
                                      );
                                    })}
                                  </svg>
                                  <span className="text-[11px] text-slate-600 font-medium">
                                    {dotScore}/5
                                  </span>
                                </div>
                              ) : (
                                <span className="text-[11px] text-slate-400 italic">
                                  Dots hidden
                                </span>
                              )}
                            </div>
                          ) : (
                            <>
                              <label className="block text-[11px] font-semibold text-slate-600 mb-0.5">
                                Comment (Optional)
                              </label>
                              <input
                                type="text"
                                value={lang.comment || ''}
                                onChange={(e) => updateLanguage(lang.id, { comment: e.target.value })}
                                placeholder="e.g. C1/C2 business & technical"
                                className="w-full px-2.5 py-1.5 border border-slate-300 rounded text-xs bg-white"
                              />
                            </>
                          )}
                        </div>
                        <div className="sm:col-span-1 flex justify-end pt-4 sm:pt-3">
                          <button
                            type="button"
                            onClick={() => deleteLanguage(lang.id)}
                            className="p-1.5 text-slate-400 hover:text-red-600 rounded cursor-pointer"
                            title="Remove language"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>
          )}

          {/* 6d. Learning & Training (Internship Resume Step 3 - Optional) */}
          {activeSection === 'learning' && (
            <section aria-labelledby="section-learning-title">
              <div className="border-b border-slate-200 pb-3 mb-5 flex items-center justify-between gap-3">
                <div>
                  <h2 id="section-learning-title" className="text-lg font-bold text-slate-900">
                    Learning &amp; Training (Optional)
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Specialized workshops, lab trainings, bootcamps, and coursework modules. Kept strictly separate from verified Certifications.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={addLearningActivity}
                  className="inline-flex items-center shrink-0 px-3 py-1.5 text-xs font-semibold text-white bg-slate-900 hover:bg-black rounded shadow-xs cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5 mr-1" />
                  <span>Add Learning Item</span>
                </button>
              </div>

              {(!resume.learningActivities || resume.learningActivities.length === 0) ? (
                <div className="p-8 text-center border border-dashed border-slate-300 rounded-lg">
                  <p className="text-xs text-slate-500">
                    No learning or training activities added yet. Optional — empty section hides automatically.
                  </p>
                  <button
                    type="button"
                    onClick={addLearningActivity}
                    className="mt-2 text-xs font-bold text-slate-900 hover:underline cursor-pointer"
                  >
                    + Add a course, workshop, or training module
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  {resume.learningActivities.map((item, idx) => (
                    <div
                      key={item.id}
                      className="p-4 border border-slate-200 rounded-lg bg-slate-50/50 space-y-3"
                    >
                      <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                        <span className="text-xs font-bold uppercase text-slate-600">
                          Learning Entry #{idx + 1}
                        </span>
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => moveLearningActivity(idx, -1)}
                            disabled={idx === 0}
                            className="p-1 text-slate-400 hover:text-slate-700 disabled:opacity-30 rounded cursor-pointer"
                            title="Move up"
                          >
                            <ChevronUp className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => moveLearningActivity(idx, 1)}
                            disabled={idx === (resume.learningActivities?.length || 1) - 1}
                            className="p-1 text-slate-400 hover:text-slate-700 disabled:opacity-30 rounded cursor-pointer"
                            title="Move down"
                          >
                            <ChevronDown className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => deleteLearningActivity(item.id)}
                            className="p-1 text-slate-400 hover:text-red-600 rounded cursor-pointer"
                            title="Delete learning entry"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-semibold text-slate-700 mb-1">
                            Course / Topic Title *
                          </label>
                          <input
                            type="text"
                            value={item.title}
                            onChange={(e) =>
                              updateLearningActivity(item.id, { title: e.target.value })
                            }
                            placeholder="e.g. Cybersecurity Analyst Training & SOC Labs"
                            className="w-full px-3 py-1.5 border border-slate-300 rounded text-sm bg-white"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-semibold text-slate-700 mb-1">
                            Activity Type
                          </label>
                          <select
                            value={item.activityType || 'Course'}
                            onChange={(e) =>
                              updateLearningActivity(item.id, {
                                activityType: e.target.value as LearningActivityType,
                              })
                            }
                            className="w-full px-3 py-1.5 border border-slate-300 rounded text-sm bg-white"
                          >
                            <option value="Course">Course</option>
                            <option value="Workshop">Workshop</option>
                            <option value="Bootcamp">Bootcamp</option>
                            <option value="Lab Training">Lab Training</option>
                            <option value="Online Course">Online Course</option>
                            <option value="Certification Prep">Certification Prep</option>
                            <option value="Other">Other</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-xs font-semibold text-slate-700 mb-1">
                            Provider / Institution / Platform
                          </label>
                          <input
                            type="text"
                            value={item.provider || ''}
                            onChange={(e) =>
                              updateLearningActivity(item.id, { provider: e.target.value })
                            }
                            placeholder="e.g. NPTEL / Coursera / University Lab"
                            className="w-full px-3 py-1.5 border border-slate-300 rounded text-xs bg-white"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-semibold text-slate-700 mb-1">
                            Subject Area / Domain (Optional)
                          </label>
                          <input
                            type="text"
                            value={item.subject || ''}
                            onChange={(e) =>
                              updateLearningActivity(item.id, { subject: e.target.value })
                            }
                            placeholder="e.g. Network Defense & Incident Triage"
                            className="w-full px-3 py-1.5 border border-slate-300 rounded text-xs bg-white"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-semibold text-slate-700 mb-1">
                            Completion Date / Timeline
                          </label>
                          <input
                            type="text"
                            value={item.completionDate || ''}
                            onChange={(e) =>
                              updateLearningActivity(item.id, { completionDate: e.target.value })
                            }
                            placeholder="e.g. Oct 2024 or Ongoing"
                            className="w-full px-3 py-1.5 border border-slate-300 rounded text-xs bg-white"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-semibold text-slate-700 mb-1">
                            Credential / Course Link (Optional)
                          </label>
                          <input
                            type="text"
                            value={item.credentialUrl || ''}
                            onChange={(e) =>
                              updateLearningActivity(item.id, { credentialUrl: e.target.value })
                            }
                            placeholder="e.g. https://..."
                            className="w-full px-3 py-1.5 border border-slate-300 rounded text-xs bg-white"
                          />
                        </div>

                        <div className="sm:col-span-2">
                          <label className="block text-xs font-semibold text-slate-700 mb-1">
                            Key Topics / Skills Practiced (Comma-separated, optional)
                          </label>
                          <CommaArrayInput
                            ariaLabel="Learning Skills Acquired"
                            value={item.skillsAcquired}
                            onChange={(items) =>
                              updateLearningActivity(item.id, { skillsAcquired: items })
                            }
                            placeholder="e.g. Wireshark, Splunk, Threat Hunting, Packet Inspection"
                            className="w-full px-3 py-1.5 border border-slate-300 rounded text-xs bg-white"
                          />
                        </div>

                        <div className="sm:col-span-2">
                          <div className="flex items-center justify-between mb-1">
                            <label className="text-xs font-semibold text-slate-700">
                              Brief Summary / Outcomes (Optional)
                            </label>
                            {item.description?.trim() && (
                              <button
                                type="button"
                                onClick={() =>
                                  handleOpenImprove(
                                    item.description || '',
                                    'Learning & Training Summary',
                                    item.title,
                                    (improved) =>
                                      updateLearningActivity(item.id, { description: improved })
                                  )
                                }
                                className="inline-flex items-center text-[11px] font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 px-2 py-0.5 rounded transition-colors cursor-pointer"
                              >
                                <Sparkles className="w-3 h-3 mr-1 text-indigo-600" />
                                <span>AI Improve</span>
                              </button>
                            )}
                          </div>
                          <textarea
                            rows={2}
                            value={item.description || ''}
                            onChange={(e) =>
                              updateLearningActivity(item.id, { description: e.target.value })
                            }
                            placeholder="Hands-on packet capture labs and log correlation exercises..."
                            className="w-full p-2.5 border border-slate-300 rounded text-xs bg-white leading-relaxed"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          )}

          {/* 6e. Career Interests & Internship Preferences (Template 10 Step 6 - Optional) */}
          {activeSection === 'career-interests' && (
            <section aria-labelledby="section-career-interests-title">
              <div className="border-b border-slate-200 pb-3 mb-5">
                <h2 id="section-career-interests-title" className="text-lg font-bold text-slate-900">
                  Career Interests &amp; Target Roles (Optional)
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Renders under CAREER INTERESTS in your right column with crisp pill tags. Strictly isolated from Technical Skills.
                </p>
              </div>

              <div className="space-y-5">
                {/* Target Role / Domain Tags */}
                <div className="p-4 border border-slate-200 rounded-lg bg-slate-50/50 space-y-3">
                  <div className="text-xs font-bold text-slate-800">
                    Target Internship Domains / Career Interests
                  </div>
                  <div className="flex flex-col sm:flex-row gap-2">
                    <input
                      type="text"
                      value={careerInterestDraft}
                      onChange={(e) => setCareerInterestDraft(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          addCareerInterestsFromDraft();
                        }
                      }}
                      placeholder="Add domains or roles (comma-separated, e.g. Software Engineering Intern, Backend Systems, Cloud Security)"
                      className="flex-1 px-3 py-2 border border-slate-300 rounded text-xs bg-white focus:outline-none focus:ring-2 focus:ring-slate-900"
                    />
                    <button
                      type="button"
                      onClick={addCareerInterestsFromDraft}
                      className="inline-flex items-center justify-center px-3.5 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-black rounded shadow-xs shrink-0 cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5 mr-1" />
                      <span>Add Tags</span>
                    </button>
                  </div>

                  {(resume.careerInterests || []).length === 0 ? (
                    <p className="text-[11px] text-slate-500 italic">
                      No career interest tags added yet. Add specific target roles or domains above.
                    </p>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {(resume.careerInterests || []).map((tag, idx) => (
                        <span
                          key={`${tag}-${idx}`}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium bg-white border border-slate-300 text-slate-800 rounded"
                        >
                          <span>{tag}</span>
                          <button
                            type="button"
                            onClick={() => removeCareerInterestTag(idx)}
                            className="text-slate-400 hover:text-rose-600 cursor-pointer"
                            aria-label={`Remove ${tag}`}
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Structured Internship Preferences */}
                <div className="p-4 border border-slate-200 rounded-lg bg-slate-50/50 space-y-3">
                  <div className="text-xs font-bold text-slate-800">
                    Internship Availability &amp; Preferences (Optional)
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                        Target Internship Role
                      </label>
                      <input
                        type="text"
                        value={resume.internshipPreferences?.targetRole || ''}
                        onChange={(e) =>
                          updateInternshipPreferences({ targetRole: e.target.value })
                        }
                        placeholder="e.g. Summer Software Engineering Intern"
                        className="w-full px-3 py-1.5 border border-slate-300 rounded text-xs bg-white"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                        Preferred Industry / Sector
                      </label>
                      <input
                        type="text"
                        value={resume.internshipPreferences?.preferredIndustry || ''}
                        onChange={(e) =>
                          updateInternshipPreferences({ preferredIndustry: e.target.value })
                        }
                        placeholder="e.g. Distributed Cloud, FinTech, Cybersecurity"
                        className="w-full px-3 py-1.5 border border-slate-300 rounded text-xs bg-white"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                        Duration (Optional)
                      </label>
                      <input
                        type="text"
                        value={resume.internshipPreferences?.duration || ''}
                        onChange={(e) =>
                          updateInternshipPreferences({ duration: e.target.value })
                        }
                        placeholder="e.g. 10–12 Weeks or 6 Months"
                        className="w-full px-3 py-1.5 border border-slate-300 rounded text-xs bg-white"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                        Work Arrangement (Optional)
                      </label>
                      <select
                        value={resume.internshipPreferences?.workArrangement || ''}
                        onChange={(e) =>
                          updateInternshipPreferences({
                            workArrangement: e.target.value as InternshipPreferences['workArrangement'],
                          })
                        }
                        className="w-full px-3 py-1.5 border border-slate-300 rounded text-xs bg-white"
                      >
                        <option value="">Unspecified</option>
                        <option value="Onsite">Onsite</option>
                        <option value="Hybrid">Hybrid</option>
                        <option value="Remote">Remote</option>
                        <option value="Flexible">Flexible</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                        Availability Date (Optional)
                      </label>
                      <input
                        type="text"
                        value={resume.internshipPreferences?.availabilityDate || ''}
                        onChange={(e) =>
                          updateInternshipPreferences({ availabilityDate: e.target.value })
                        }
                        placeholder="e.g. May 2025 – Aug 2025"
                        className="w-full px-3 py-1.5 border border-slate-300 rounded text-xs bg-white"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                        Preferred Technologies (Optional, comma-separated)
                      </label>
                      <CommaArrayInput
                        ariaLabel="Preferred Internship Technologies"
                        value={resume.internshipPreferences?.preferredTechnologies}
                        onChange={(items) =>
                          updateInternshipPreferences({ preferredTechnologies: items })
                        }
                        placeholder="e.g. Go, Rust, Kubernetes, PyTorch"
                        className="w-full px-3 py-1.5 border border-slate-300 rounded text-xs bg-white"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </section>
          )}

          {/* 7. Skills */}
          {activeSection === 'skills' && (
            <section aria-labelledby="section-skills-title">
              <div className="border-b border-slate-200 pb-3 mb-5 flex items-center justify-between">
                <div>
                  <h2 id="section-skills-title" className="text-lg font-bold text-slate-900">
                    {isClassicTemplate
                      ? 'Computer Skills'
                      : isModernCorporateTemplate
                      ? 'Technical Skills (2-Column ModernCV)'
                      : isInternshipResumeTemplate
                      ? 'Technical & Domain Skills'
                      : isEngineeringResumeTemplate
                      ? 'Skills & Interests'
                      : isCreativeProfessionalTemplate
                      ? 'Categorized Skills (SKILLS)'
                      : 'Skills by Category'}
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {isClassicTemplate
                      ? 'Compact categorized computer & technical skills (e.g. Programming Languages, Operating Systems, Frameworks, Tools).'
                      : isModernCorporateTemplate
                      ? 'Paired 2-column categories (rendered cleanly with right-aligned category labels and comma-separated skills, zero bars or charts).'
                      : isInternshipResumeTemplate
                      ? 'Add your verified skills. 5-dot proficiency indicators remain hidden by default unless you manually select a 1–5 rating.'
                      : isEngineeringResumeTemplate
                      ? 'Clean text-only categorized technical skills and Interests rendered under SKILLS AND INTERESTS (zero progress bars or rating dots).'
                      : isCreativeProfessionalTemplate
                      ? 'Grouped detailed skills rendered under SKILLS on the left column (Technical, Creative, Professional, or custom categories) with optional description & organization.'
                      : 'Organize skills into research foundations, programming, tools, and platforms.'}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => addSkillCategory('New Category')}
                  className="inline-flex items-center px-3 py-1.5 text-xs font-semibold text-white bg-slate-900 hover:bg-black rounded shadow-xs cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5 mr-1" />
                  <span>Add Category</span>
                </button>
              </div>

              {isCreativeProfessionalTemplate && (
                <div className="mb-6 pb-6 border-b border-slate-200 space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <div className="text-xs font-bold text-blue-900">
                        Detailed Categorized Skill Entries (Primary Creative Skills Block)
                      </div>
                      <p className="text-[11px] text-slate-500">
                        Each entry displays its title in bold with optional organization/venue and concise description under its category heading.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        const next: CreativeSkillDetailItem = {
                          id: `csk_${Date.now()}_${Math.random().toString(36).slice(2, 5)}`,
                          category: 'Technical',
                          name: '',
                          description: '',
                          organization: '',
                        };
                        updateField('creativeSkillItems', [...(resume.creativeSkillItems || []), next]);
                      }}
                      className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-white bg-blue-700 hover:bg-blue-800 rounded shadow-xs cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Add Detailed Skill</span>
                    </button>
                  </div>

                  {(!resume.creativeSkillItems || resume.creativeSkillItems.length === 0) ? (
                    <div className="p-4 text-center border border-dashed border-blue-200 rounded-lg bg-blue-50/30 text-xs text-slate-600">
                      No detailed skill items yet — add items above or use standard categorized skill lists below (automatic fallback).
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {resume.creativeSkillItems.map((item, idx) => (
                        <div
                          key={item.id}
                          className="p-3.5 border border-slate-200 rounded-lg bg-slate-50/60 space-y-2.5"
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-[11px] font-bold uppercase text-slate-600">
                              Skill Item #{idx + 1}
                            </span>
                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() => moveArrayItem('creativeSkillItems', idx, -1)}
                                disabled={idx === 0}
                                className="p-1 text-slate-400 hover:text-slate-700 disabled:opacity-30 cursor-pointer"
                                title="Move up"
                              >
                                <ChevronUp className="w-4 h-4" />
                              </button>
                              <button
                                type="button"
                                onClick={() => moveArrayItem('creativeSkillItems', idx, 1)}
                                disabled={idx === (resume.creativeSkillItems?.length || 1) - 1}
                                className="p-1 text-slate-400 hover:text-slate-700 disabled:opacity-30 cursor-pointer"
                                title="Move down"
                              >
                                <ChevronDown className="w-4 h-4" />
                              </button>
                              <button
                                type="button"
                                onClick={() =>
                                  updateField(
                                    'creativeSkillItems',
                                    (resume.creativeSkillItems || []).filter((x) => x.id !== item.id)
                                  )
                                }
                                className="p-1 text-slate-400 hover:text-rose-600 cursor-pointer"
                                title="Remove skill item"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                            <div>
                              <label className="block text-[11px] font-semibold text-slate-700 mb-0.5">
                                Category
                              </label>
                              <input
                                type="text"
                                value={item.category}
                                onChange={(e) =>
                                  updateField(
                                    'creativeSkillItems',
                                    (resume.creativeSkillItems || []).map((x) =>
                                      x.id === item.id ? { ...x, category: e.target.value } : x
                                    )
                                  )
                                }
                                placeholder="Technical / Creative / Professional"
                                className="w-full px-2.5 py-1.5 border border-slate-300 rounded text-xs bg-white"
                              />
                            </div>
                            <div>
                              <label className="block text-[11px] font-semibold text-slate-700 mb-0.5">
                                Skill / Tool Name *
                              </label>
                              <input
                                type="text"
                                value={item.name}
                                onChange={(e) =>
                                  updateField(
                                    'creativeSkillItems',
                                    (resume.creativeSkillItems || []).map((x) =>
                                      x.id === item.id ? { ...x, name: e.target.value } : x
                                    )
                                  )
                                }
                                placeholder="e.g. TypeScript, React & Next.js"
                                className="w-full px-2.5 py-1.5 border border-slate-300 rounded text-xs bg-white"
                              />
                            </div>
                            <div>
                              <label className="block text-[11px] font-semibold text-slate-700 mb-0.5">
                                Organization / Context (Optional)
                              </label>
                              <input
                                type="text"
                                value={item.organization || ''}
                                onChange={(e) =>
                                  updateField(
                                    'creativeSkillItems',
                                    (resume.creativeSkillItems || []).map((x) =>
                                      x.id === item.id ? { ...x, organization: e.target.value } : x
                                    )
                                  )
                                }
                                placeholder="e.g. NordicFlow Cloud"
                                className="w-full px-2.5 py-1.5 border border-slate-300 rounded text-xs bg-white"
                              />
                            </div>
                          </div>

                          <div>
                            <div className="flex items-center justify-between mb-0.5">
                              <label className="block text-[11px] font-semibold text-slate-700">
                                Concise Description (Optional)
                              </label>
                              {item.description?.trim() && (
                                <button
                                  type="button"
                                  onClick={() =>
                                    handleOpenImprove(
                                      item.description || '',
                                      'skills',
                                      `Creative skill item: ${item.name}`,
                                      (improved) =>
                                        updateField(
                                          'creativeSkillItems',
                                          (resume.creativeSkillItems || []).map((x) =>
                                            x.id === item.id ? { ...x, description: improved } : x
                                          )
                                        )
                                    )
                                  }
                                  className="inline-flex items-center gap-1 text-[11px] font-semibold text-indigo-700 hover:underline cursor-pointer"
                                >
                                  <Sparkles className="w-3 h-3" />
                                  <span>AI Improve</span>
                                </button>
                              )}
                            </div>
                            <input
                              type="text"
                              value={item.description || ''}
                              onChange={(e) =>
                                updateField(
                                  'creativeSkillItems',
                                  (resume.creativeSkillItems || []).map((x) =>
                                    x.id === item.id ? { ...x, description: e.target.value } : x
                                  )
                                )
                              }
                              placeholder="e.g. Strict type modeling, SSR streaming, accessible component APIs."
                              className="w-full px-2.5 py-1.5 border border-slate-300 rounded text-xs bg-white"
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              <div className="flex flex-wrap items-center gap-1.5 mb-4 text-xs">
                <span className="text-slate-500 font-medium mr-1">Quick Categories:</span>
                {(isClassicTemplate
                  ? [
                      'Programming Languages',
                      'Operating Systems',
                      'Frameworks',
                      'Databases',
                      'Developer Tools',
                      'Security Tools',
                      'Cloud Platforms',
                      'Other Technologies',
                    ]
                  : isCreativeProfessionalTemplate
                  ? [
                      'Technical',
                      'Creative',
                      'Professional',
                      'Domain Expertise',
                      'National / International',
                    ]
                  : isModernCorporateTemplate
                  ? [
                      'Valuation & Finance',
                      'Data & Analytics',
                      'Market Terminals',
                      'Enterprise Systems',
                      'Governance',
                      'Workflow',
                      'Programming Languages',
                      'Cloud & DevOps',
                    ]
                  : isInternshipResumeTemplate
                  ? resume.internshipTrack === 'cybersecurity'
                    ? ['Network Security', 'SOC & SIEM Tools', 'Scripting & Linux', 'Vulnerability Testing']
                    : resume.internshipTrack === 'ece'
                    ? ['Embedded C & Verilog', 'PCB & Hardware', 'Simulation & Lab Tools', 'Microcontrollers']
                    : resume.internshipTrack === 'research'
                    ? ['Research Methods', 'Statistical & ML Tools', 'Scientific Writing', 'Programming']
                    : resume.internshipTrack === 'non-technical'
                    ? ['Analysis & Strategy', 'Communication & Research', 'Productivity Tools', 'Operations']
                    : ['Programming Languages', 'Frameworks & Backend', 'Databases & Cloud', 'Developer Tools']
                  : isEngineeringResumeTemplate
                  ? resume.engineeringBranch === 'cse-it'
                    ? ['Programming Languages', 'Frameworks & Backend', 'Databases & Cloud', 'Developer Tools']
                    : resume.engineeringBranch === 'ece'
                    ? ['Embedded Systems & HDL', 'EDA & Simulation Tools', 'Communication & Hardware', 'Programming Languages']
                    : resume.engineeringBranch === 'ee'
                    ? ['Power & Control Tools', 'Industrial Automation', 'Hardware & Instrumentation', 'Programming & Scripting']
                    : resume.engineeringBranch === 'civil'
                    ? ['Structural & CAD Software', 'BIM & Project Management', 'Field & Material Testing', 'Technical Standards']
                    : resume.engineeringBranch === 'chemical'
                    ? ['Process Simulation', 'Core Chemical Domains', 'Lab & Analytical Tools', 'Programming & Data']
                    : resume.engineeringBranch === 'other'
                    ? ['Core Engineering Tools', 'Simulation & Analysis', 'Programming Languages', 'Lab & Instrumentation']
                    : ['CAD & Modeling', 'Analysis & Simulation', 'Manufacturing & Lab', 'Programming & Scripting']
                  : isFresherResumeTemplate
                  ? resume.fresherTrack === 'cybersecurity'
                    ? ['Security & Defense Tools', 'Networking & Protocols', 'Scripting & OS', 'Compliance & Forensics']
                    : resume.fresherTrack === 'engineering'
                    ? ['Core Engineering', 'CAD & Simulation', 'Programming Languages', 'Lab & Testing Tools']
                    : resume.fresherTrack === 'non-technical'
                    ? ['Research & Analysis', 'Communication & Writing', 'Software & Office Tools', 'Domain Knowledge']
                    : resume.fresherTrack === 'graduate'
                    ? ['Core Skills', 'Programming & Analytics', 'Software & Tools', 'Domain Foundations']
                    : ['Programming Languages', 'Frameworks & Libraries', 'Databases & Cloud', 'Developer Tools']
                  : isHarvardTemplate
                  ? ['Technical & Quantitative', 'Programming & Data', 'Software & Tools']
                  : ['Languages', 'Developer Tools', 'Technologies/Frameworks']
                ).map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => addSkillCategory(preset)}
                    className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded border border-slate-200 transition-colors cursor-pointer"
                  >
                    + {preset}
                  </button>
                ))}
              </div>

              <div className="space-y-3">
                {resume.skills.map((cat) => (
                  <div
                    key={cat.id}
                    className="p-3.5 border border-slate-200 rounded-lg bg-slate-50/50 space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <input
                        type="text"
                        value={cat.category}
                        onChange={(e) =>
                          updateSkillCategory(cat.id, e.target.value, (cat.skills || []).join(', '))
                        }
                        placeholder="e.g. Programming Languages"
                        className="px-2.5 py-1 text-xs font-bold text-slate-900 border border-slate-300 rounded bg-white"
                      />
                      <button
                        type="button"
                        onClick={() => deleteSkillCategory(cat.id)}
                        className="p-1 text-slate-400 hover:text-red-600 rounded"
                        title="Delete category"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    <div>
                      <input
                        type="text"
                        value={(cat.skills || []).join(', ')}
                        onChange={(e) => updateSkillCategory(cat.id, cat.category, e.target.value)}
                        placeholder="e.g. Python, C++, CUDA, PyTorch, JAX"
                        className="w-full px-3 py-1.5 border border-slate-300 rounded text-xs bg-white"
                      />
                    </div>

                    {isInternshipResumeTemplate && (
                      <div className="flex flex-wrap items-center justify-between gap-2 pt-1.5 border-t border-slate-200/80">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="text-[11px] font-semibold text-slate-600">
                            5-Dot Proficiency (Optional):
                          </span>
                          <button
                            type="button"
                            onClick={() => updateSkillCategoryProficiency(cat.id, null)}
                            className={`px-2 py-0.5 text-[11px] font-semibold border rounded cursor-pointer transition-colors ${
                              !cat.proficiency
                                ? 'bg-slate-900 text-white border-slate-900'
                                : 'bg-white text-slate-600 border-slate-300 hover:border-slate-500'
                            }`}
                          >
                            Unconfirmed (Hide Dots)
                          </button>
                          {([1, 2, 3, 4, 5] as SkillMatrixLevel[]).map((lvl) => {
                            const filled =
                              cat.proficiency !== null &&
                              cat.proficiency !== undefined &&
                              lvl <= cat.proficiency;
                            return (
                              <button
                                key={lvl}
                                type="button"
                                onClick={() =>
                                  updateSkillCategoryProficiency(
                                    cat.id,
                                    cat.proficiency === lvl ? null : lvl
                                  )
                                }
                                className={`w-6 h-6 text-[11px] font-bold border rounded transition-colors cursor-pointer ${
                                  filled
                                    ? 'bg-slate-900 border-slate-900 text-white'
                                    : 'bg-white border-slate-300 text-slate-600 hover:border-slate-500'
                                }`}
                                title={`Level ${lvl}: ${getSkillMatrixLevelLabel(lvl)}`}
                              >
                                {lvl}
                              </button>
                            );
                          })}
                        </div>
                        <span className="text-[11px] text-slate-500">
                          {cat.proficiency
                            ? `${cat.proficiency}/5 — ${getSkillMatrixLevelLabel(cat.proficiency)}`
                            : 'Dots hidden in CV & PDF'}
                        </span>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {isEngineeringResumeTemplate && (
                <div className="mt-6 pt-5 border-t border-slate-200 space-y-2">
                  <label
                    htmlFor="engineering-interests-input"
                    className="block text-xs font-bold text-slate-900"
                  >
                    Technical &amp; Personal Interests (Rendered inside SKILLS AND INTERESTS)
                  </label>
                  <input
                    id="engineering-interests-input"
                    type="text"
                    value={
                      typeof resume.interests === 'string' && resume.interests.length > 0
                        ? resume.interests
                        : getEffectiveInterests(resume).text
                    }
                    onChange={(e) => {
                      const val = e.target.value;
                      setResume((prev) => ({
                        ...prev,
                        interests: val,
                        interestItems: val
                          .split(',')
                          .map((s) => s.trim())
                          .filter(Boolean)
                          .map((name, idx) => ({
                            id: `int_${idx}`,
                            name,
                            description: '',
                          })),
                        updatedAt: new Date().toISOString(),
                      }));
                    }}
                    placeholder="e.g. Electric Powertrains, Robotics Prototyping, Additive Manufacturing, Chess"
                    className="w-full px-3 py-2 border border-slate-300 rounded text-xs bg-white focus:outline-none focus:ring-2 focus:ring-slate-900"
                  />
                  <p className="text-[11px] text-slate-500">
                    Comma-separated interests displayed cleanly as an &ldquo;Interests:&rdquo; row at the bottom of SKILLS AND INTERESTS. Leave empty to omit.
                  </p>
                </div>
              )}
            </section>
          )}

          {/* 7-creative-circles. Dynamic Circular Proficiencies (Template 12) */}
          {activeSection === 'proficiency-circles' && (
            <section aria-labelledby="section-proficiency-circles-title">
              <div className="border-b border-slate-200 pb-3 mb-5 flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h2 id="section-proficiency-circles-title" className="text-lg font-bold text-slate-900">
                    {getCreativeProficiencyHeading(resume)}
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Circular progress rings (0–100%). Heading automatically adapts to your Creative Profession or can be customized below.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const next: CreativeCircularProficiencyItem = {
                      id: `circ_${Date.now()}_${Math.random().toString(36).slice(2, 5)}`,
                      name: '',
                      shortLabel: '',
                      description: '',
                      percentage: 0,
                    };
                    setResume((prev) => ({
                      ...prev,
                      circularProficiencies: [...(prev.circularProficiencies || []), next],
                      updatedAt: new Date().toISOString(),
                    }));
                  }}
                  className="inline-flex items-center px-3 py-1.5 text-xs font-semibold text-white bg-blue-700 hover:bg-blue-800 rounded shadow-xs cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5 mr-1" />
                  <span>Add Circular Skill</span>
                </button>
              </div>

              <div className="mb-5 p-3.5 rounded-lg border border-slate-200 bg-slate-50/70">
                <label
                  htmlFor="creative-proficiency-heading-override"
                  className="block text-[11px] font-semibold text-slate-700 mb-1"
                >
                  Custom Section Heading Override (Optional — leave blank for &ldquo;{getCreativeProficiencyHeading({ ...resume, proficiencyHeadingOverride: '' })}&rdquo;)
                </label>
                <input
                  id="creative-proficiency-heading-override"
                  type="text"
                  value={resume.proficiencyHeadingOverride || ''}
                  onChange={(e) => updateField('proficiencyHeadingOverride', e.target.value)}
                  placeholder="e.g. PROGRAMMING PROFICIENCY, CREATIVE TOOLS, SECURITY TOOLS"
                  className="w-full px-3 py-1.5 border border-slate-300 rounded text-xs bg-white focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
              </div>

              {(!resume.circularProficiencies || resume.circularProficiencies.length === 0) ? (
                <div className="p-8 text-center border border-dashed border-slate-300 rounded-lg space-y-2">
                  <p className="text-xs text-slate-500">
                    No circular proficiencies added yet. Add skills with your self-assessed 0–100% rating, or leave empty to omit.
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      const next: CreativeCircularProficiencyItem = {
                        id: `circ_${Date.now()}`,
                        name: '',
                        shortLabel: '',
                        description: '',
                        percentage: 0,
                      };
                      updateField('circularProficiencies', [next]);
                    }}
                    className="text-xs font-bold text-blue-700 hover:underline cursor-pointer"
                  >
                    + Add first circular proficiency
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  {resume.circularProficiencies.map((item, idx) => {
                    const pct = Math.max(0, Math.min(100, Number(item.percentage) || 0));
                    const r = 18;
                    const c = 2 * Math.PI * r;
                    const offset = c - (pct / 100) * c;
                    return (
                      <div
                        key={item.id}
                        className="p-3.5 border border-slate-200 rounded-lg bg-slate-50/50 space-y-3"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-3">
                            <svg width="46" height="46" viewBox="0 0 46 46" className="shrink-0" aria-hidden="true">
                              <circle
                                cx="23"
                                cy="23"
                                r={r}
                                fill="none"
                                stroke="#e2e8f0"
                                strokeWidth="3.5"
                              />
                              <circle
                                cx="23"
                                cy="23"
                                r={r}
                                fill="none"
                                stroke="#1d4ed8"
                                strokeWidth="3.5"
                                strokeLinecap="round"
                                strokeDasharray={c}
                                strokeDashoffset={offset}
                                transform="rotate(-90 23 23)"
                              />
                              <text
                                x="23"
                                y="26"
                                textAnchor="middle"
                                fontSize="9.5"
                                fontWeight="700"
                                fill="#111827"
                              >
                                {(item.shortLabel || item.name || 'SK').slice(0, 5).toUpperCase()}
                              </text>
                            </svg>
                            <div>
                              <span className="text-[11px] font-bold uppercase text-slate-600">
                                Ring #{idx + 1} · {pct}%
                              </span>
                              <div className="text-xs font-semibold text-slate-900">
                                {item.name || 'Untitled Skill'}
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => moveArrayItem('circularProficiencies', idx, -1)}
                              disabled={idx === 0}
                              className="p-1 text-slate-400 hover:text-slate-700 disabled:opacity-30 cursor-pointer"
                              title="Move up"
                            >
                              <ChevronUp className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => moveArrayItem('circularProficiencies', idx, 1)}
                              disabled={idx === (resume.circularProficiencies?.length || 1) - 1}
                              className="p-1 text-slate-400 hover:text-slate-700 disabled:opacity-30 cursor-pointer"
                              title="Move down"
                            >
                              <ChevronDown className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                updateField(
                                  'circularProficiencies',
                                  (resume.circularProficiencies || []).filter((x) => x.id !== item.id)
                                )
                              }
                              className="p-1 text-slate-400 hover:text-rose-600 cursor-pointer"
                              title="Remove circular proficiency"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5">
                          <div className="sm:col-span-4">
                            <label className="block text-[11px] font-semibold text-slate-700 mb-0.5">
                              Skill / Tool Name *
                            </label>
                            <input
                              type="text"
                              value={item.name}
                              onChange={(e) =>
                                updateField(
                                  'circularProficiencies',
                                  (resume.circularProficiencies || []).map((x) =>
                                    x.id === item.id ? { ...x, name: e.target.value } : x
                                  )
                                )
                              }
                              placeholder="e.g. TypeScript, Figma, Burp Suite"
                              className="w-full px-2.5 py-1.5 border border-slate-300 rounded text-xs bg-white"
                            />
                          </div>
                          <div className="sm:col-span-2">
                            <label className="block text-[11px] font-semibold text-slate-700 mb-0.5">
                              Ring Label (max 5)
                            </label>
                            <input
                              type="text"
                              maxLength={5}
                              value={item.shortLabel}
                              onChange={(e) =>
                                updateField(
                                  'circularProficiencies',
                                  (resume.circularProficiencies || []).map((x) =>
                                    x.id === item.id ? { ...x, shortLabel: e.target.value } : x
                                  )
                                )
                              }
                              placeholder="e.g. TS, UX"
                              className="w-full px-2.5 py-1.5 border border-slate-300 rounded text-xs uppercase bg-white"
                            />
                          </div>
                          <div className="sm:col-span-6">
                            <label className="block text-[11px] font-semibold text-slate-700 mb-0.5">
                              Short Subtitle / Description (Optional)
                            </label>
                            <input
                              type="text"
                              value={item.description || ''}
                              onChange={(e) =>
                                updateField(
                                  'circularProficiencies',
                                  (resume.circularProficiencies || []).map((x) =>
                                    x.id === item.id ? { ...x, description: e.target.value } : x
                                  )
                                )
                              }
                              placeholder="e.g. Strict APIs & state machines"
                              className="w-full px-2.5 py-1.5 border border-slate-300 rounded text-xs bg-white"
                            />
                          </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-3 pt-1">
                          <label
                            htmlFor={`circ-range-${item.id}`}
                            className="text-[11px] font-semibold text-slate-700 shrink-0"
                          >
                            Proficiency %:
                          </label>
                          <input
                            id={`circ-range-${item.id}`}
                            type="range"
                            min={0}
                            max={100}
                            value={pct}
                            onChange={(e) => {
                              const nextPct = Math.max(0, Math.min(100, Number(e.target.value) || 0));
                              updateField(
                                'circularProficiencies',
                                (resume.circularProficiencies || []).map((x) =>
                                  x.id === item.id ? { ...x, percentage: nextPct } : x
                                )
                              );
                            }}
                            className="flex-1 min-w-[140px] accent-blue-700 cursor-pointer"
                          />
                          <input
                            type="number"
                            min={0}
                            max={100}
                            aria-label={`${item.name || 'Circular skill'} percentage`}
                            value={pct}
                            onChange={(e) => {
                              const nextPct = Math.max(0, Math.min(100, Number(e.target.value) || 0));
                              updateField(
                                'circularProficiencies',
                                (resume.circularProficiencies || []).map((x) =>
                                  x.id === item.id ? { ...x, percentage: nextPct } : x
                                )
                              );
                            }}
                            className="w-16 px-2 py-1 border border-slate-300 rounded text-xs font-bold text-center bg-white"
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>
          )}

          {/* 7-creative-bars. Horizontal Skill Bars (Template 12 Right Column) */}
          {activeSection === 'skill-bars' && (
            <section aria-labelledby="section-skill-bars-title">
              <div className="border-b border-slate-200 pb-3 mb-5 flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h2 id="section-skill-bars-title" className="text-lg font-bold text-slate-900">
                    Skills &amp; Proficiency Bars
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Right-column horizontal blue progress bars (0–100%). Add technical, creative, or leadership skills and set your own ratings.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const next: CreativeSkillBarItem = {
                      id: `bar_${Date.now()}_${Math.random().toString(36).slice(2, 5)}`,
                      name: '',
                      percentage: 0,
                    };
                    setResume((prev) => ({
                      ...prev,
                      creativeSkillBars: [...(prev.creativeSkillBars || []), next],
                      updatedAt: new Date().toISOString(),
                    }));
                  }}
                  className="inline-flex items-center px-3 py-1.5 text-xs font-semibold text-white bg-blue-700 hover:bg-blue-800 rounded shadow-xs cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5 mr-1" />
                  <span>Add Skill Bar</span>
                </button>
              </div>

              {(!resume.creativeSkillBars || resume.creativeSkillBars.length === 0) ? (
                <div className="p-8 text-center border border-dashed border-slate-300 rounded-lg space-y-2">
                  <p className="text-xs text-slate-500">
                    No skill bars added yet. Click &ldquo;Add Skill Bar&rdquo; above or leave empty to hide this block.
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      const next: CreativeSkillBarItem = {
                        id: `bar_${Date.now()}`,
                        name: '',
                        percentage: 0,
                      };
                      updateField('creativeSkillBars', [next]);
                    }}
                    className="text-xs font-bold text-blue-700 hover:underline cursor-pointer"
                  >
                    + Add first skill bar
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  {resume.creativeSkillBars.map((bar, idx) => {
                    const pct = Math.max(0, Math.min(100, Number(bar.percentage) || 0));
                    return (
                      <div
                        key={bar.id}
                        className="p-3.5 border border-slate-200 rounded-lg bg-slate-50/50 space-y-2.5"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-[11px] font-bold uppercase text-slate-600">
                            Skill Bar #{idx + 1} · {pct}%
                          </span>
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => moveArrayItem('creativeSkillBars', idx, -1)}
                              disabled={idx === 0}
                              className="p-1 text-slate-400 hover:text-slate-700 disabled:opacity-30 cursor-pointer"
                              title="Move up"
                            >
                              <ChevronUp className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => moveArrayItem('creativeSkillBars', idx, 1)}
                              disabled={idx === (resume.creativeSkillBars?.length || 1) - 1}
                              className="p-1 text-slate-400 hover:text-slate-700 disabled:opacity-30 cursor-pointer"
                              title="Move down"
                            >
                              <ChevronDown className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                updateField(
                                  'creativeSkillBars',
                                  (resume.creativeSkillBars || []).filter((x) => x.id !== bar.id)
                                )
                              }
                              className="p-1 text-slate-400 hover:text-rose-600 cursor-pointer"
                              title="Remove skill bar"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5 items-center">
                          <div className="sm:col-span-5">
                            <input
                              type="text"
                              value={bar.name}
                              onChange={(e) =>
                                updateField(
                                  'creativeSkillBars',
                                  (resume.creativeSkillBars || []).map((x) =>
                                    x.id === bar.id ? { ...x, name: e.target.value } : x
                                  )
                                )
                              }
                              placeholder="e.g. System Architecture, Design Systems, Threat Modeling"
                              className="w-full px-2.5 py-1.5 border border-slate-300 rounded text-xs font-semibold bg-white"
                            />
                          </div>
                          <div className="sm:col-span-5 flex items-center gap-2">
                            <input
                              type="range"
                              min={0}
                              max={100}
                              aria-label={`${bar.name || 'Skill bar'} slider`}
                              value={pct}
                              onChange={(e) => {
                                const nextPct = Math.max(0, Math.min(100, Number(e.target.value) || 0));
                                updateField(
                                  'creativeSkillBars',
                                  (resume.creativeSkillBars || []).map((x) =>
                                    x.id === bar.id ? { ...x, percentage: nextPct } : x
                                  )
                                );
                              }}
                              className="flex-1 accent-blue-700 cursor-pointer"
                            />
                          </div>
                          <div className="sm:col-span-2 flex items-center gap-1 justify-end">
                            <input
                              type="number"
                              min={0}
                              max={100}
                              aria-label={`${bar.name || 'Skill bar'} percentage`}
                              value={pct}
                              onChange={(e) => {
                                const nextPct = Math.max(0, Math.min(100, Number(e.target.value) || 0));
                                updateField(
                                  'creativeSkillBars',
                                  (resume.creativeSkillBars || []).map((x) =>
                                    x.id === bar.id ? { ...x, percentage: nextPct } : x
                                  )
                                );
                              }}
                              className="w-16 px-2 py-1 border border-slate-300 rounded text-xs font-bold text-center bg-white"
                            />
                            <span className="text-xs font-semibold text-slate-500">%</span>
                          </div>
                        </div>

                        <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-blue-700 transition-all duration-150"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>
          )}

          {/* 7-creative-comm. Communication Skills (Template 12 Left Column Optional) */}
          {activeSection === 'communication' && (
            <section aria-labelledby="section-communication-title">
              <div className="border-b border-slate-200 pb-3 mb-5 flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h2 id="section-communication-title" className="text-lg font-bold text-slate-900">
                    Communication Skills (Optional)
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Highlight presentations, technical writing, cross-functional collaboration, or stakeholder communication. Leave empty to omit cleanly.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const next: CreativeCommunicationSkillItem = {
                      id: `comm_${Date.now()}_${Math.random().toString(36).slice(2, 5)}`,
                      skill: '',
                      proficiency: '',
                      context: '',
                    };
                    setResume((prev) => ({
                      ...prev,
                      communicationSkills: [...(prev.communicationSkills || []), next],
                      updatedAt: new Date().toISOString(),
                    }));
                  }}
                  className="inline-flex items-center px-3 py-1.5 text-xs font-semibold text-white bg-blue-700 hover:bg-blue-800 rounded shadow-xs cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5 mr-1" />
                  <span>Add Communication Skill</span>
                </button>
              </div>

              {(!resume.communicationSkills || resume.communicationSkills.length === 0) ? (
                <div className="p-8 text-center border border-dashed border-slate-300 rounded-lg space-y-2">
                  <p className="text-xs text-slate-500">
                    No communication skills added yet. Optional — add entries above or leave empty to omit this section.
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      const next: CreativeCommunicationSkillItem = {
                        id: `comm_${Date.now()}`,
                        skill: '',
                        proficiency: '',
                        context: '',
                      };
                      updateField('communicationSkills', [next]);
                    }}
                    className="text-xs font-bold text-blue-700 hover:underline cursor-pointer"
                  >
                    + Add first communication skill
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  {resume.communicationSkills.map((item, idx) => (
                    <div
                      key={item.id}
                      className="p-3.5 border border-slate-200 rounded-lg bg-slate-50/50 space-y-2.5"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[11px] font-bold uppercase text-slate-600">
                          Communication #{idx + 1}
                        </span>
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => moveArrayItem('communicationSkills', idx, -1)}
                            disabled={idx === 0}
                            className="p-1 text-slate-400 hover:text-slate-700 disabled:opacity-30 cursor-pointer"
                            title="Move up"
                          >
                            <ChevronUp className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => moveArrayItem('communicationSkills', idx, 1)}
                            disabled={idx === (resume.communicationSkills?.length || 1) - 1}
                            className="p-1 text-slate-400 hover:text-slate-700 disabled:opacity-30 cursor-pointer"
                            title="Move down"
                          >
                            <ChevronDown className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              updateField(
                                'communicationSkills',
                                (resume.communicationSkills || []).filter((x) => x.id !== item.id)
                              )
                            }
                            className="p-1 text-slate-400 hover:text-rose-600 cursor-pointer"
                            title="Remove communication skill"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        <div>
                          <label className="block text-[11px] font-semibold text-slate-700 mb-0.5">
                            Communication Skill *
                          </label>
                          <input
                            type="text"
                            value={item.skill}
                            onChange={(e) =>
                              updateField(
                                'communicationSkills',
                                (resume.communicationSkills || []).map((x) =>
                                  x.id === item.id ? { ...x, skill: e.target.value } : x
                                )
                              )
                            }
                            placeholder="e.g. Executive Presentations, Technical Writing"
                            className="w-full px-2.5 py-1.5 border border-slate-300 rounded text-xs font-semibold bg-white"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-semibold text-slate-700 mb-0.5">
                            Level / Context Label (Optional)
                          </label>
                          <input
                            type="text"
                            value={item.proficiency || ''}
                            onChange={(e) =>
                              updateField(
                                'communicationSkills',
                                (resume.communicationSkills || []).map((x) =>
                                  x.id === item.id ? { ...x, proficiency: e.target.value } : x
                                )
                              )
                            }
                            placeholder="e.g. Advanced, Conference Speaker"
                            className="w-full px-2.5 py-1.5 border border-slate-300 rounded text-xs bg-white"
                          />
                        </div>
                      </div>

                      <div>
                        <div className="flex items-center justify-between mb-0.5">
                          <label className="block text-[11px] font-semibold text-slate-700">
                            Supporting Detail (Optional)
                          </label>
                          {item.context?.trim() && (
                            <button
                              type="button"
                              onClick={() =>
                                handleOpenImprove(
                                  item.context || '',
                                  'communication',
                                  `Communication skill: ${item.skill}`,
                                  (improved) =>
                                    setResume((prev) => ({
                                      ...prev,
                                      communicationSkills: (prev.communicationSkills || []).map((x) =>
                                        x.id === item.id ? { ...x, context: improved } : x
                                      ),
                                      updatedAt: new Date().toISOString(),
                                    }))
                                )
                              }
                              className="inline-flex items-center gap-1 text-[11px] font-semibold text-indigo-700 hover:underline cursor-pointer"
                            >
                              <Sparkles className="w-3 h-3" />
                              <span>AI Improve</span>
                            </button>
                          )}
                        </div>
                        <input
                          type="text"
                          value={item.context || ''}
                          onChange={(e) =>
                            updateField(
                              'communicationSkills',
                              (resume.communicationSkills || []).map((x) =>
                                x.id === item.id ? { ...x, context: e.target.value } : x
                              )
                            )
                          }
                          placeholder="e.g. Delivered quarterly architecture reviews to 40+ engineering stakeholders."
                          className="w-full px-2.5 py-1.5 border border-slate-300 rounded text-xs bg-white"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          )}

          {/* 7-lab. Laboratory & Research Skills (Harvard Style Optional) */}
          {activeSection === 'lab-skills' && (
            <section aria-labelledby="section-lab-skills-title">
              <div className="border-b border-slate-200 pb-3 mb-5">
                <h2 id="section-lab-skills-title" className="text-lg font-bold text-slate-900">
                  Laboratory &amp; Research Skills (Optional)
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Shown under Skills &amp; Interests in Harvard Style as clean text labels (no skill bars). Leave empty to omit.
                </p>
              </div>

              <div className="flex flex-col sm:flex-row gap-2 mb-4">
                <input
                  type="text"
                  value={labSkillDraft}
                  onChange={(e) => setLabSkillDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      addLabSkillsFromDraft();
                    }
                  }}
                  placeholder="Add lab or research skills (comma-separated, e.g. PCR, Econometric Panel Modeling, Stata)"
                  className="flex-1 px-3 py-2 border border-slate-300 rounded text-sm bg-white focus:outline-none focus:ring-2 focus:ring-slate-900"
                />
                <button
                  type="button"
                  onClick={addLabSkillsFromDraft}
                  className="inline-flex items-center justify-center px-4 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-black rounded shadow-xs shrink-0 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5 mr-1" />
                  <span>Add Lab Skills</span>
                </button>
              </div>

              {(!resume.labSkills || resume.labSkills.length === 0) ? (
                <div className="p-8 text-center border border-dashed border-slate-300 rounded-lg">
                  <p className="text-xs text-slate-500">
                    No laboratory or research skills added yet. Optional — leave empty to hide cleanly.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex flex-wrap gap-2 p-4 border border-slate-200 rounded-lg bg-slate-50/50">
                    {resume.labSkills.map((skill, idx) => (
                      <span
                        key={`${skill}-${idx}`}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium bg-white border border-slate-300 text-slate-800 rounded"
                      >
                        <span>{skill}</span>
                        <button
                          type="button"
                          onClick={() => removeLabSkill(idx)}
                          className="text-slate-400 hover:text-rose-600 cursor-pointer"
                          aria-label={`Remove ${skill}`}
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                      Edit as comma-separated text
                    </label>
                    <input
                      type="text"
                      value={(resume.labSkills || []).join(', ')}
                      onChange={(e) =>
                        updateField(
                          'labSkills',
                          e.target.value
                            .split(',')
                            .map((s) => s.trim())
                            .filter(Boolean)
                        )
                      }
                      className="w-full px-3 py-2 border border-slate-300 rounded text-xs bg-white"
                    />
                  </div>
                </div>
              )}
            </section>
          )}

          {/* 7a. Software Developer Dedicated Skill Bucket Editors */}
          {(activeSection === 'programming-languages' ||
            activeSection === 'developer-tools' ||
            activeSection === 'technologies-frameworks') &&
            (() => {
              const bucket = activeSection as SoftwareDevSkillBucketKey;
              const items = getSoftwareDevSkillBucketItems(resume.skills, bucket);
              const meta: Record<
                SoftwareDevSkillBucketKey,
                { title: string; subtitle: string; placeholder: string }
              > = {
                'programming-languages': {
                  title: 'Programming Languages',
                  subtitle:
                    'Rendered under ADDITIONAL → Programming Languages as clean comma-separated text (no bars or ratings).',
                  placeholder: 'Add languages (comma-separated, e.g. TypeScript, Python, Go, SQL)',
                },
                'developer-tools': {
                  title: 'Developer Tools',
                  subtitle:
                    'Rendered under ADDITIONAL → Developer Tools (IDEs, CLI tooling, containers, CI/CD). Leave empty to omit.',
                  placeholder: 'Add tools (comma-separated, e.g. Git, Docker, Kubernetes, Linux)',
                },
                'technologies-frameworks': {
                  title: 'Technologies and Frameworks',
                  subtitle:
                    'Rendered under ADDITIONAL → Technologies and Frameworks. Leave empty to hide automatically.',
                  placeholder:
                    'Add frameworks/libraries (comma-separated, e.g. React, Next.js, Node.js, PostgreSQL)',
                },
              };
              const info = meta[bucket];
              return (
                <section aria-labelledby={`section-${bucket}-title`}>
                  <div className="border-b border-slate-200 pb-3 mb-5">
                    <h2 id={`section-${bucket}-title`} className="text-lg font-bold text-slate-900">
                      {info.title}
                    </h2>
                    <p className="text-xs text-slate-500 mt-0.5">{info.subtitle}</p>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-2 mb-4">
                    <input
                      type="text"
                      value={skillBucketDraft[bucket]}
                      onChange={(e) =>
                        setSkillBucketDraft((prev) => ({ ...prev, [bucket]: e.target.value }))
                      }
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          addSoftwareDevSkillTags(bucket, skillBucketDraft[bucket]);
                        }
                      }}
                      placeholder={info.placeholder}
                      className="flex-1 px-3 py-2 border border-slate-300 rounded text-sm bg-white focus:outline-none focus:ring-2 focus:ring-slate-900"
                    />
                    <button
                      type="button"
                      onClick={() => addSoftwareDevSkillTags(bucket, skillBucketDraft[bucket])}
                      className="inline-flex items-center justify-center px-4 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-black rounded shadow-xs shrink-0 cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5 mr-1" />
                      <span>Add Items</span>
                    </button>
                  </div>

                  {items.length === 0 ? (
                    <div className="p-8 text-center border border-dashed border-slate-300 rounded-lg">
                      <p className="text-xs text-slate-500">
                        No {info.title.toLowerCase()} added yet. Optional — empty subsections are hidden automatically from ADDITIONAL.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="flex flex-wrap gap-2 p-4 border border-slate-200 rounded-lg bg-slate-50/50">
                        {items.map((tag, idx) => (
                          <span
                            key={`${tag}-${idx}`}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium bg-white border border-slate-300 text-slate-800 rounded"
                          >
                            <span>{tag}</span>
                            <button
                              type="button"
                              onClick={() => removeSoftwareDevSkillTag(bucket, idx)}
                              className="text-slate-400 hover:text-rose-600 cursor-pointer"
                              aria-label={`Remove ${tag}`}
                              title={`Remove ${tag}`}
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </span>
                        ))}
                      </div>

                      <div>
                        <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                          Edit all {info.title} as comma-separated text
                        </label>
                        <input
                          type="text"
                          value={items.join(', ')}
                          onChange={(e) =>
                            setSoftwareDevBucketSkills(
                              bucket,
                              e.target.value
                                .split(',')
                                .map((s) => s.trim())
                                .filter(Boolean)
                            )
                          }
                          className="w-full px-3 py-2 border border-slate-300 rounded text-xs bg-white"
                        />
                      </div>
                    </div>
                  )}
                </section>
              );
            })()}

          {/* 7b. Skill Matrix (5-Level Scale) */}
          {activeSection === 'skill-matrix' && (
            <section aria-labelledby="section-matrix-title">
              <div className="border-b border-slate-200 pb-3 mb-5 flex items-center justify-between">
                <div>
                  <h2 id="section-matrix-title" className="text-lg font-bold text-slate-900">
                    Skill Matrix (1–5 Proficiency Scale)
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Select your own honest 1–5 level for each skill. Ratings are never auto-assigned.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={addSkillMatrixRow}
                  className="inline-flex items-center px-3 py-1.5 text-xs font-semibold text-white bg-slate-900 hover:bg-black rounded shadow-xs cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5 mr-1" />
                  <span>Add Skill Row</span>
                </button>
              </div>

              {/* Explicit 1-5 Legend */}
              <div className="mb-4 p-3 rounded-lg border border-blue-200 bg-blue-50/60">
                <div className="text-[11px] font-bold uppercase tracking-wider text-[#1e4e8c] mb-1.5">
                  Proficiency Level Legend
                </div>
                <div className="flex flex-wrap gap-3 text-xs text-slate-700">
                  {SKILL_MATRIX_LEGEND.map((item) => (
                    <span key={item.level} className="inline-flex items-center gap-1.5">
                      <span className="inline-flex items-center justify-center w-4 h-4 text-[10px] font-bold bg-[#1e4e8c] text-white rounded-xs">
                        {item.level}
                      </span>
                      <span>{item.label}</span>
                    </span>
                  ))}
                </div>
              </div>

              {(!resume.skillMatrix || resume.skillMatrix.length === 0) ? (
                <div className="p-8 text-center border border-dashed border-slate-300 rounded-lg">
                  <p className="text-xs text-slate-500">No skill matrix entries added yet.</p>
                  <button
                    type="button"
                    onClick={addSkillMatrixRow}
                    className="mt-2 text-xs font-bold text-slate-900 hover:underline"
                  >
                    + Add your first Skill Matrix row
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  {resume.skillMatrix.map((row) => (
                    <div
                      key={row.id}
                      className="p-3.5 border border-slate-200 rounded-lg bg-slate-50/50 space-y-2.5"
                    >
                      <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5 items-end">
                        <div className="sm:col-span-3">
                          <label className="block text-[11px] font-semibold text-slate-600 mb-0.5">
                            Category
                          </label>
                          <input
                            type="text"
                            value={row.category}
                            onChange={(e) =>
                              updateSkillMatrixRow(row.id, { category: e.target.value })
                            }
                            placeholder="e.g. Systems"
                            className="w-full px-2.5 py-1.5 border border-slate-300 rounded text-xs bg-white"
                          />
                        </div>
                        <div className="sm:col-span-4">
                          <label className="block text-[11px] font-semibold text-slate-600 mb-0.5">
                            Skill / Technology *
                          </label>
                          <input
                            type="text"
                            value={row.skill}
                            onChange={(e) =>
                              updateSkillMatrixRow(row.id, { skill: e.target.value })
                            }
                            placeholder="e.g. Kubernetes, Go, PostgreSQL"
                            className="w-full px-2.5 py-1.5 border border-slate-300 rounded text-xs bg-white"
                          />
                        </div>
                        <div className="sm:col-span-2">
                          <label className="block text-[11px] font-semibold text-slate-600 mb-0.5">
                            Experience (Opt.)
                          </label>
                          <input
                            type="text"
                            value={row.yearsOfExperience || ''}
                            onChange={(e) =>
                              updateSkillMatrixRow(row.id, { yearsOfExperience: e.target.value })
                            }
                            placeholder="e.g. 4 yrs"
                            className="w-full px-2.5 py-1.5 border border-slate-300 rounded text-xs bg-white"
                          />
                        </div>
                        <div className="sm:col-span-2">
                          <label className="block text-[11px] font-semibold text-slate-600 mb-0.5">
                            Comment (Opt.)
                          </label>
                          <input
                            type="text"
                            value={row.comment || ''}
                            onChange={(e) =>
                              updateSkillMatrixRow(row.id, { comment: e.target.value })
                            }
                            placeholder="e.g. Production use"
                            className="w-full px-2.5 py-1.5 border border-slate-300 rounded text-xs bg-white"
                          />
                        </div>
                        <div className="sm:col-span-1 flex justify-end">
                          <button
                            type="button"
                            onClick={() => deleteSkillMatrixRow(row.id)}
                            className="p-1.5 text-slate-400 hover:text-red-600 rounded cursor-pointer"
                            title="Remove row"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center justify-between gap-2 pt-1.5 border-t border-slate-200/80">
                        <div className="flex items-center gap-1.5">
                          <span className="text-[11px] font-semibold text-slate-600 mr-1">
                            Self-Rating:
                          </span>
                          {([1, 2, 3, 4, 5] as SkillMatrixLevel[]).map((lvl) => {
                            const selected = row.level === lvl;
                            const filled = row.level !== null && row.level !== undefined && lvl <= row.level;
                            return (
                              <button
                                key={lvl}
                                type="button"
                                onClick={() =>
                                  updateSkillMatrixRow(row.id, {
                                    level: selected ? null : lvl,
                                  })
                                }
                                className={`w-7 h-7 text-xs font-bold border rounded transition-colors cursor-pointer ${
                                  filled
                                    ? 'bg-[#1e4e8c] border-[#1e4e8c] text-white'
                                    : 'bg-white border-slate-300 text-slate-600 hover:border-[#1e4e8c]'
                                }`}
                                title={`Level ${lvl}: ${getSkillMatrixLevelLabel(lvl)}`}
                              >
                                {lvl}
                              </button>
                            );
                          })}
                          {row.level !== null && row.level !== undefined && (
                            <button
                              type="button"
                              onClick={() => updateSkillMatrixRow(row.id, { level: null })}
                              className="ml-1.5 text-[11px] text-slate-500 hover:text-slate-800 underline cursor-pointer"
                            >
                              Clear
                            </button>
                          )}
                        </div>
                        <span
                          className={`text-xs font-semibold ${
                            row.level ? 'text-[#1e4e8c]' : 'text-amber-600'
                          }`}
                        >
                          {row.level
                            ? `${row.level}/5 — ${getSkillMatrixLevelLabel(row.level)}`
                            : 'Select level (1–5)'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          )}

          {/* 7c. Interests (Classic Professional) */}
          {activeSection === 'interests' && (
            <section aria-labelledby="section-interests-title">
              <div className="border-b border-slate-200 pb-3 mb-5 flex items-center justify-between">
                <div>
                  <h2 id="section-interests-title" className="text-lg font-bold text-slate-900">
                    Interests &amp; Extracurriculars
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Structured personal interests with optional brief descriptions. Empty section is hidden automatically.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => addInterestItem('')}
                  className="inline-flex items-center px-3 py-1.5 text-xs font-semibold text-white bg-slate-900 hover:bg-black rounded shadow-xs cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5 mr-1" />
                  <span>Add Interest</span>
                </button>
              </div>

              {(!resume.interestItems || resume.interestItems.length === 0) ? (
                <div className="p-8 text-center border border-dashed border-slate-300 rounded-lg space-y-2">
                  <p className="text-xs text-slate-500">
                    {resume.interests?.trim()
                      ? `Legacy interests text: "${resume.interests}"`
                      : 'No structured interests added yet.'}
                  </p>
                  <button
                    type="button"
                    onClick={() => addInterestItem('')}
                    className="text-xs font-bold text-slate-900 hover:underline cursor-pointer"
                  >
                    + Add an interest entry
                  </button>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {resume.interestItems.map((item) => (
                    <div
                      key={item.id}
                      className="p-3 border border-slate-200 rounded-lg bg-slate-50/50 grid grid-cols-1 sm:grid-cols-12 gap-2.5 items-center"
                    >
                      <div className="sm:col-span-4">
                        <input
                          type="text"
                          value={item.name}
                          onChange={(e) => updateInterestItem(item.id, { name: e.target.value })}
                          placeholder="e.g. Alpine Mountaineering"
                          className="w-full px-2.5 py-1.5 border border-slate-300 rounded text-xs font-semibold bg-white"
                        />
                      </div>
                      <div className="sm:col-span-7">
                        <input
                          type="text"
                          value={item.description || ''}
                          onChange={(e) =>
                            updateInterestItem(item.id, { description: e.target.value })
                          }
                          placeholder="Optional brief detail (e.g. Bavarian Alps weekend climbs)"
                          className="w-full px-2.5 py-1.5 border border-slate-300 rounded text-xs bg-white"
                        />
                      </div>
                      <div className="sm:col-span-1 flex justify-end">
                        <button
                          type="button"
                          onClick={() => deleteInterestItem(item.id)}
                          className="p-1.5 text-slate-400 hover:text-red-600 rounded cursor-pointer"
                          title="Delete interest"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          )}

          {/* 7d. Custom / Additional Sections (Classic Professional) */}
          {activeSection === 'custom-sections' && (
            <section aria-labelledby="section-custom-title">
              <div className="border-b border-slate-200 pb-3 mb-5 flex items-center justify-between">
                <div>
                  <h2 id="section-custom-title" className="text-lg font-bold text-slate-900">
                    {isCreativeProfessionalTemplate
                      ? 'Projects & Additional Sections'
                      : 'Additional Information & Custom Sections'}
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {isCreativeProfessionalTemplate
                      ? 'Add custom sections or jump directly to Projects, Leadership, Volunteer, or Memberships.'
                      : 'Create custom sections (Certifications, Awards, Volunteer Work, Workshops, Publications, etc.).'}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => addCustomSection('')}
                  className="inline-flex items-center px-3 py-1.5 text-xs font-semibold text-white bg-slate-900 hover:bg-black rounded shadow-xs cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5 mr-1" />
                  <span>Add Section</span>
                </button>
              </div>

              {isCreativeProfessionalTemplate && (
                <div className="mb-5 p-3.5 rounded-lg border border-blue-200 bg-blue-50/40 flex flex-wrap items-center gap-2 text-xs">
                  <span className="font-semibold text-slate-700">Optional Overflow Sections:</span>
                  {(
                    [
                      { id: 'projects', label: 'Projects', count: resume.projects?.length || 0 },
                      { id: 'leadership', label: 'Leadership', count: resume.leadership?.length || 0 },
                      { id: 'volunteer', label: 'Volunteer', count: resume.volunteer?.length || 0 },
                      { id: 'memberships', label: 'Memberships', count: resume.memberships?.length || 0 },
                    ] as { id: EditorSectionId; label: string; count: number }[]
                  ).map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setActiveSection(item.id)}
                      className="px-2.5 py-1 rounded border border-blue-200 bg-white hover:bg-blue-50 text-blue-800 font-semibold cursor-pointer"
                    >
                      Edit {item.label} ({item.count})
                    </button>
                  ))}
                </div>
              )}

              <div className="flex flex-wrap items-center gap-1.5 mb-4 text-xs">
                <span className="text-slate-500 font-medium mr-1">Quick Presets:</span>
                {[
                  'Certifications',
                  'Awards',
                  'Volunteer Work',
                  'Professional Memberships',
                  'Publications',
                  'Workshops',
                  'Additional Qualifications',
                  'Other Achievements',
                ].map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => addCustomSection(preset)}
                    className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded border border-slate-200 transition-colors cursor-pointer"
                  >
                    + {preset}
                  </button>
                ))}
              </div>

              {(!resume.customSections || resume.customSections.length === 0) ? (
                <div className="p-8 text-center border border-dashed border-slate-300 rounded-lg">
                  <p className="text-xs text-slate-500">
                    No custom sections added yet. Pick a preset above or create your own.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {resume.customSections.map((cs) => (
                    <div
                      key={cs.id}
                      className="p-4 border border-slate-200 rounded-lg bg-slate-50/50 space-y-2.5"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <input
                          type="text"
                          value={cs.title}
                          onChange={(e) => updateCustomSection(cs.id, { title: e.target.value })}
                          placeholder="Section Heading (e.g. Certifications & Workshops)"
                          className="flex-1 px-3 py-1.5 border border-slate-300 rounded text-xs font-bold text-slate-900 bg-white"
                        />
                        {(cs.bullets || []).some((b) => b.trim().length > 0) && (
                          <button
                            type="button"
                            onClick={() =>
                              handleOpenImprove(
                                (cs.bullets || []).join('\n'),
                                cs.title || 'Custom Section',
                                resume.targetRole,
                                (improved) =>
                                  updateCustomSection(cs.id, {
                                    bullets: improved.split('\n').filter((l) => l.trim().length > 0),
                                  })
                              )
                            }
                            className="inline-flex items-center text-[11px] font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 px-2 py-1 rounded transition-colors cursor-pointer shrink-0"
                          >
                            <Sparkles className="w-3 h-3 mr-1 text-indigo-600" />
                            <span>AI Improve</span>
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => deleteCustomSection(cs.id)}
                          className="p-1.5 text-slate-400 hover:text-red-600 rounded cursor-pointer"
                          title="Delete custom section"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>

                      <textarea
                        rows={3}
                        value={(cs.bullets || []).join('\n')}
                        onChange={(e) =>
                          updateCustomSection(cs.id, { bullets: e.target.value.split('\n') })
                        }
                        placeholder="One entry or bullet point per line..."
                        className="w-full p-2.5 border border-slate-300 rounded text-xs bg-white leading-relaxed"
                      />
                    </div>
                  ))}
                </div>
              )}

              {(isInternshipResumeTemplate || isEngineeringResumeTemplate) && (
                <div className="mt-7 pt-6 border-t border-slate-200 space-y-6">
                  {isInternshipResumeTemplate && (
                    /* Optional Certifications Manager (Engineering manages Certifications in Step 8 Extra-Curriculars) */
                    <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-sm font-bold text-slate-900">
                          Certifications (Optional)
                        </h3>
                        <p className="text-[11px] text-slate-500">
                          Verified industry or vendor credentials. Separate from Learning &amp; Training.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={addCertification}
                        className="inline-flex items-center px-2.5 py-1 text-xs font-semibold text-slate-800 bg-white border border-slate-300 hover:bg-slate-100 rounded cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5 mr-1" />
                        <span>Add Certification</span>
                      </button>
                    </div>
                    {(resume.certifications || []).length > 0 && (
                      <div className="space-y-2.5">
                        {(resume.certifications || []).map((cert) => (
                          <div
                            key={cert.id}
                            className="p-3 border border-slate-200 rounded-lg bg-slate-50/50 grid grid-cols-1 sm:grid-cols-12 gap-2 items-center"
                          >
                            <input
                              type="text"
                              value={cert.name}
                              onChange={(e) => updateCertification(cert.id, { name: e.target.value })}
                              placeholder="Certificate Name"
                              className="sm:col-span-5 px-2.5 py-1.5 border border-slate-300 rounded text-xs bg-white font-semibold"
                            />
                            <input
                              type="text"
                              value={cert.issuer}
                              onChange={(e) => updateCertification(cert.id, { issuer: e.target.value })}
                              placeholder="Issuer (e.g. AWS, CompTIA)"
                              className="sm:col-span-4 px-2.5 py-1.5 border border-slate-300 rounded text-xs bg-white"
                            />
                            <input
                              type="text"
                              value={cert.issueDate}
                              onChange={(e) =>
                                updateCertification(cert.id, { issueDate: e.target.value })
                              }
                              placeholder="Date"
                              className="sm:col-span-2 px-2.5 py-1.5 border border-slate-300 rounded text-xs bg-white"
                            />
                            <button
                              type="button"
                              onClick={() => deleteCertification(cert.id)}
                              className="sm:col-span-1 p-1.5 text-slate-400 hover:text-red-600 rounded justify-self-end cursor-pointer"
                              title="Delete certification"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  )}

                  {/* Optional Languages Manager */}
                  <div className="space-y-3 pt-4 border-t border-slate-200">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-sm font-bold text-slate-900">
                          Spoken Languages (Optional)
                        </h3>
                        <p className="text-[11px] text-slate-500">
                          Leave empty to hide automatically.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={addLanguage}
                        className="inline-flex items-center px-2.5 py-1 text-xs font-semibold text-slate-800 bg-white border border-slate-300 hover:bg-slate-100 rounded cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5 mr-1" />
                        <span>Add Language</span>
                      </button>
                    </div>
                    {(resume.languages || []).length > 0 && (
                      <div className="space-y-2">
                        {(resume.languages || []).map((lang) => (
                          <div
                            key={lang.id}
                            className="p-2.5 border border-slate-200 rounded-lg bg-slate-50/50 grid grid-cols-1 sm:grid-cols-12 gap-2 items-center"
                          >
                            <input
                              type="text"
                              value={lang.language}
                              onChange={(e) => updateLanguage(lang.id, { language: e.target.value })}
                              placeholder="Language (e.g. English)"
                              className="sm:col-span-6 px-2.5 py-1.5 border border-slate-300 rounded text-xs bg-white"
                            />
                            <select
                              value={lang.proficiency}
                              onChange={(e) =>
                                updateLanguage(lang.id, { proficiency: e.target.value })
                              }
                              className="sm:col-span-5 px-2.5 py-1.5 border border-slate-300 rounded text-xs bg-white"
                            >
                              <option value="">Unconfirmed (Hide level)</option>
                              <option value="Native / Bilingual">Native / Bilingual</option>
                              <option value="Fluent">Fluent</option>
                              <option value="Professional Working">Professional Working</option>
                              <option value="Intermediate">Intermediate</option>
                              <option value="Elementary">Elementary</option>
                            </select>
                            <button
                              type="button"
                              onClick={() => deleteLanguage(lang.id)}
                              className="sm:col-span-1 p-1.5 text-slate-400 hover:text-red-600 rounded justify-self-end cursor-pointer"
                              title="Remove language"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Step 9/10 Final Review & Preview Summary */}
                  <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div>
                        <h3 className="text-sm font-bold text-slate-900">
                          {isEngineeringResumeTemplate
                            ? 'Step 9 Review & Generate Engineering PDF'
                            : 'Step 10 Review & Generate Internship CV'}
                        </h3>
                        <p className="text-xs text-slate-600">
                          Overall readiness: <strong>{completenessReport.overallScore}%</strong>. Empty optional sections will be cleanly omitted from your preview and PDF.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={handlePreviewClick}
                        className="inline-flex items-center px-3.5 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-black rounded shadow-xs cursor-pointer shrink-0"
                      >
                        <Eye className="w-3.5 h-3.5 mr-1.5" />
                        <span>Generate &amp; Preview PDF</span>
                      </button>
                    </div>
                  </div>
                </div>
              )}

              <p className="text-[11px] text-slate-500 mt-4">
                {isHarvardTemplate
                  ? 'Note: Any Awards & Honors, Selected Projects, Certifications, Publications, Volunteer Service, or Memberships stored on your resume also render automatically under Additional Information (hidden cleanly if empty).'
                  : isInternshipResumeTemplate || isEngineeringResumeTemplate
                  ? 'Note: All entries across Templates 1–11 share the same resume record cleanly—switching templates preserves your saved data.'
                  : "Note: Any Projects, Publications, Awards, Certifications, or Leadership data entered in Academic CV or Jake's Resume stays preserved and also renders cleanly in Preview/PDF."}
              </p>
            </section>
          )}

          {/* 8. Honors & Awards / Most Proud Of */}
          {activeSection === 'awards' && (
            <section aria-labelledby="section-awards-title">
              <div className="border-b border-slate-200 pb-3 mb-5 flex items-center justify-between">
                <div>
                  <h2 id="section-awards-title" className="text-lg font-bold text-slate-900">
                    {isTwoColumnTemplate
                      ? 'Most Proud Of (Achievements & Awards)'
                      : isSoftwareDevTemplate
                      ? 'Achievements'
                      : isInternshipResumeTemplate
                      ? 'Co-Curricular & Events (Optional)'
                      : isEngineeringResumeTemplate
                      ? 'Extra-Curricular Activities (Optional)'
                      : 'Honors & Awards'}
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {isTwoColumnTemplate
                      ? 'Highlight proud milestones, honors, or recognition with selectable burgundy sidebar icons.'
                      : isSoftwareDevTemplate
                      ? 'Hackathon wins, engineering awards, or scholarships shown under ADDITIONAL → Achievements. Optional.'
                      : isInternshipResumeTemplate
                      ? 'Hackathons, competitions, clubs, student chapters, volunteer events, or scholarships shown under CO-CURRICULAR/ EVENTS.'
                      : isEngineeringResumeTemplate
                      ? 'Technical symposiums, competitions, hackathons, volunteer outreach (NSS), and engineering certifications shown under EXTRA-CURRICULAR ACTIVITIES.'
                      : 'Fellowships, best paper awards, teaching recognition, and academic honors.'}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={addAward}
                  className="inline-flex items-center px-3 py-1.5 text-xs font-semibold text-white bg-slate-900 hover:bg-black rounded shadow-xs cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5 mr-1" />
                  <span>
                    {isTwoColumnTemplate
                      ? 'Add Milestone'
                      : isSoftwareDevTemplate
                      ? 'Add Achievement'
                      : isInternshipResumeTemplate
                      ? 'Add Co-Curricular Event'
                      : isEngineeringResumeTemplate
                      ? 'Add Activity'
                      : 'Add Award'}
                  </span>
                </button>
              </div>

              {(!resume.achievements || resume.achievements.length === 0) ? (
                <div className="p-8 text-center border border-dashed border-slate-300 rounded-lg">
                  <p className="text-xs text-slate-500">No awards added yet.</p>
                  <button
                    onClick={addAward}
                    className="mt-2 text-xs font-bold text-slate-900 hover:underline"
                  >
                    + Add your first honor or award
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  {resume.achievements.map((ach, idx) => (
                    <div
                      key={ach.id}
                      className="p-3.5 border border-slate-200 rounded-lg bg-slate-50/50 space-y-2"
                    >
                      <div className="flex justify-between items-center">
                        <span className="text-xs font-bold text-slate-700">
                          {isTwoColumnTemplate || isSoftwareDevTemplate
                            ? 'Achievement Entry'
                            : 'Award Entry'}
                        </span>
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => moveArrayItem('achievements', idx, -1)}
                            disabled={idx === 0}
                            className="p-1 text-slate-400 hover:text-slate-700 disabled:opacity-30 rounded cursor-pointer"
                            title="Move up"
                          >
                            <ChevronUp className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => moveArrayItem('achievements', idx, 1)}
                            disabled={idx === resume.achievements.length - 1}
                            className="p-1 text-slate-400 hover:text-slate-700 disabled:opacity-30 rounded cursor-pointer"
                            title="Move down"
                          >
                            <ChevronDown className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => deleteAward(ach.id)}
                            className="p-1 text-slate-400 hover:text-red-600 rounded"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                        <div className="sm:col-span-2">
                          <label className="block text-[11px] font-semibold text-slate-700 mb-0.5">
                            Award / Honor Title *
                          </label>
                          <input
                            type="text"
                            value={ach.title}
                            onChange={(e) => updateAward(ach.id, { title: e.target.value })}
                            placeholder="e.g. NSF Graduate Research Fellowship"
                            className="w-full px-2.5 py-1.5 border border-slate-300 rounded text-xs bg-white"
                          />
                        </div>

                        <div>
                          <label className="block text-[11px] font-semibold text-slate-700 mb-0.5">
                            Year / Date
                          </label>
                          <input
                            type="text"
                            value={ach.date}
                            onChange={(e) => updateAward(ach.id, { date: e.target.value })}
                            placeholder="e.g. 2023"
                            className="w-full px-2.5 py-1.5 border border-slate-300 rounded text-xs bg-white"
                          />
                        </div>

                        {isTwoColumnTemplate && (
                          <div className="sm:col-span-3">
                            <span className="block text-[11px] font-semibold text-slate-700 mb-1">
                              Sidebar Accent Icon
                            </span>
                            <div className="flex flex-wrap gap-1.5">
                              {(
                                [
                                  { value: 'trophy', label: 'Trophy', Icon: Trophy },
                                  { value: 'heart', label: 'Heart', Icon: Heart },
                                  { value: 'award', label: 'Ribbon / Award', Icon: Award },
                                  { value: 'star', label: 'Star', Icon: Star },
                                ] as const
                              ).map(({ value, label, Icon }) => {
                                const selected = (ach.icon || 'trophy') === value;
                                return (
                                  <button
                                    key={value}
                                    type="button"
                                    onClick={() => updateAward(ach.id, { icon: value })}
                                    className={`inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold rounded border cursor-pointer transition-colors ${
                                      selected
                                        ? 'bg-[#8f131b] text-white border-[#8f131b]'
                                        : 'bg-white text-slate-700 border-slate-300 hover:border-slate-400'
                                    }`}
                                  >
                                    <Icon className="w-3 h-3" />
                                    <span>{label}</span>
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        )}

                        {isElegantSerifTemplate && (
                          <>
                            <div>
                              <label className="block text-[11px] font-semibold text-slate-700 mb-0.5">
                                Category (Optional)
                              </label>
                              <input
                                type="text"
                                value={ach.category || ''}
                                onChange={(e) => updateAward(ach.id, { category: e.target.value })}
                                placeholder="e.g. Academic, Research, Teaching"
                                className="w-full px-2.5 py-1.5 border border-slate-300 rounded text-xs bg-white"
                              />
                            </div>
                            <div className="sm:col-span-2">
                              <label className="block text-[11px] font-semibold text-slate-700 mb-0.5">
                                Achievement Details (Optional)
                              </label>
                              <input
                                type="text"
                                value={ach.achievementDetails || ''}
                                onChange={(e) =>
                                  updateAward(ach.id, { achievementDetails: e.target.value })
                                }
                                placeholder="e.g. Top 1% of graduating cohort; £15,000 research stipend"
                                className="w-full px-2.5 py-1.5 border border-slate-300 rounded text-xs bg-white"
                              />
                            </div>
                          </>
                        )}

                        {(isFresherResumeTemplate ||
                          isInternshipResumeTemplate ||
                          isEngineeringResumeTemplate) && (
                          <>
                            <div>
                              <label className="block text-[11px] font-semibold text-slate-700 mb-0.5">
                                Rank / Placement (Optional)
                              </label>
                              <input
                                type="text"
                                value={ach.rank || ''}
                                onChange={(e) => updateAward(ach.id, { rank: e.target.value })}
                                placeholder="e.g. 1st Place, Top 1%, Finalist"
                                className="w-full px-2.5 py-1.5 border border-slate-300 rounded text-xs bg-white"
                              />
                            </div>
                            <div className="sm:col-span-2">
                              <label className="block text-[11px] font-semibold text-slate-700 mb-0.5">
                                Certificate / Proof URL (Optional)
                              </label>
                              <input
                                type="text"
                                value={ach.url || ''}
                                onChange={(e) => updateAward(ach.id, { url: e.target.value })}
                                placeholder="e.g. https://..."
                                className="w-full px-2.5 py-1.5 border border-slate-300 rounded text-xs bg-white"
                              />
                            </div>
                          </>
                        )}

                        {(isInternshipResumeTemplate || isEngineeringResumeTemplate) && (
                          <>
                            <div>
                              <label className="block text-[11px] font-semibold text-slate-700 mb-0.5">
                                Event / Activity Type (Optional)
                              </label>
                              <input
                                type="text"
                                value={ach.participationType || ''}
                                onChange={(e) =>
                                  updateAward(ach.id, { participationType: e.target.value })
                                }
                                placeholder="e.g. Hackathon, Club, Competition"
                                className="w-full px-2.5 py-1.5 border border-slate-300 rounded text-xs bg-white"
                              />
                            </div>
                            <div>
                              <label className="block text-[11px] font-semibold text-slate-700 mb-0.5">
                                Team / Participation Mode
                              </label>
                              <select
                                value={ach.teamType || ''}
                                onChange={(e) =>
                                  updateAward(ach.id, {
                                    teamType: (e.target.value || undefined) as
                                      | 'Individual'
                                      | 'Team'
                                      | undefined,
                                  })
                                }
                                className="w-full px-2.5 py-1.5 border border-slate-300 rounded text-xs bg-white"
                              >
                                <option value="">Unspecified</option>
                                <option value="Individual">Individual</option>
                                <option value="Team">Team</option>
                              </select>
                            </div>
                            <div>
                              <label className="block text-[11px] font-semibold text-slate-700 mb-0.5">
                                Your Role (Optional)
                              </label>
                              <input
                                type="text"
                                value={ach.role || ''}
                                onChange={(e) => updateAward(ach.id, { role: e.target.value })}
                                placeholder="e.g. Team Lead, Backend Developer"
                                className="w-full px-2.5 py-1.5 border border-slate-300 rounded text-xs bg-white"
                              />
                            </div>
                            <div className="sm:col-span-2">
                              <label className="block text-[11px] font-semibold text-slate-700 mb-0.5">
                                Key Responsibilities (Optional)
                              </label>
                              <input
                                type="text"
                                value={ach.responsibilities || ''}
                                onChange={(e) =>
                                  updateAward(ach.id, { responsibilities: e.target.value })
                                }
                                placeholder="e.g. Led threat triage and API integration"
                                className="w-full px-2.5 py-1.5 border border-slate-300 rounded text-xs bg-white"
                              />
                            </div>
                            <div>
                              <label className="block text-[11px] font-semibold text-slate-700 mb-0.5">
                                Outcome / Impact (Optional)
                              </label>
                              <input
                                type="text"
                                value={ach.outcome || ''}
                                onChange={(e) => updateAward(ach.id, { outcome: e.target.value })}
                                placeholder="e.g. Selected top 5 out of 240 teams"
                                className="w-full px-2.5 py-1.5 border border-slate-300 rounded text-xs bg-white"
                              />
                            </div>
                          </>
                        )}

                        <div className="sm:col-span-3">
                          <div className="flex items-center justify-between mb-0.5">
                            <label className="text-[11px] font-semibold text-slate-700">
                              Granting Institution &amp; Description
                            </label>
                            {ach.description?.trim() && (
                              <button
                                type="button"
                                onClick={() =>
                                  handleOpenImprove(
                                    ach.description || '',
                                    'Honor / Award Impact',
                                    `Award: ${ach.title}`,
                                    (improved) => updateAward(ach.id, { description: improved })
                                  )
                                }
                                className="inline-flex items-center text-[10px] font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 px-2 py-0.5 rounded transition-colors cursor-pointer"
                              >
                                <Sparkles className="w-2.5 h-2.5 mr-1 text-indigo-600" />
                                <span>AI Improve</span>
                              </button>
                            )}
                          </div>
                          <input
                            type="text"
                            value={ach.description || ''}
                            onChange={(e) => updateAward(ach.id, { description: e.target.value })}
                            placeholder="e.g. National Science Foundation — Competitive 5-year fellowship"
                            className="w-full px-2.5 py-1.5 border border-slate-300 rounded text-xs bg-white"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {isEngineeringResumeTemplate && (
                <div className="mt-7 pt-6 border-t border-slate-200 space-y-6">
                  {/* Optional Volunteer Service (NSS / Community) */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-sm font-bold text-slate-900">
                          Volunteer Service / NSS Outreach (Optional)
                        </h3>
                        <p className="text-[11px] text-slate-500">
                          Displayed neatly inside EXTRA-CURRICULAR ACTIVITIES. Leave empty to omit.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={addVolunteer}
                        className="inline-flex items-center px-2.5 py-1 text-xs font-semibold text-slate-800 bg-white border border-slate-300 hover:bg-slate-100 rounded cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5 mr-1" />
                        <span>Add Volunteer Role</span>
                      </button>
                    </div>
                    {(resume.volunteer || []).length > 0 && (
                      <div className="space-y-2.5">
                        {(resume.volunteer || []).map((vol) => (
                          <div
                            key={vol.id}
                            className="p-3 border border-slate-200 rounded-lg bg-slate-50/50 grid grid-cols-1 sm:grid-cols-12 gap-2 items-center"
                          >
                            <input
                              type="text"
                              value={vol.role}
                              onChange={(e) => updateVolunteer(vol.id, { role: e.target.value })}
                              placeholder="Role (e.g. NSS Student Volunteer)"
                              className="sm:col-span-4 px-2.5 py-1.5 border border-slate-300 rounded text-xs bg-white font-semibold"
                            />
                            <input
                              type="text"
                              value={vol.organization}
                              onChange={(e) =>
                                updateVolunteer(vol.id, { organization: e.target.value })
                              }
                              placeholder="Organization (e.g. National Service Scheme)"
                              className="sm:col-span-4 px-2.5 py-1.5 border border-slate-300 rounded text-xs bg-white"
                            />
                            <input
                              type="text"
                              value={vol.startDate || ''}
                              onChange={(e) =>
                                updateVolunteer(vol.id, { startDate: e.target.value })
                              }
                              placeholder="Dates (e.g. 2023 – 2024)"
                              className="sm:col-span-3 px-2.5 py-1.5 border border-slate-300 rounded text-xs bg-white"
                            />
                            <button
                              type="button"
                              onClick={() => deleteVolunteer(vol.id)}
                              className="sm:col-span-1 p-1.5 text-slate-400 hover:text-red-600 rounded justify-self-end cursor-pointer"
                              title="Delete volunteer entry"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                            <div className="sm:col-span-12">
                              <input
                                type="text"
                                value={(vol.highlights || []).join(', ')}
                                onChange={(e) =>
                                  updateVolunteer(vol.id, { highlights: [e.target.value] })
                                }
                                placeholder="Key contribution (e.g. Conducted STEM workshops for 120 rural high-school students)"
                                className="w-full px-2.5 py-1.5 border border-slate-300 rounded text-xs bg-white"
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Optional Engineering Certifications */}
                  <div className="space-y-3 pt-4 border-t border-slate-200">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-sm font-bold text-slate-900">
                          Verified Certifications (Optional)
                        </h3>
                        <p className="text-[11px] text-slate-500">
                          Shown inside EXTRA-CURRICULAR ACTIVITIES (e.g. CSWA, AWS, NPTEL). Leave empty to omit.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={addCertification}
                        className="inline-flex items-center px-2.5 py-1 text-xs font-semibold text-slate-800 bg-white border border-slate-300 hover:bg-slate-100 rounded cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5 mr-1" />
                        <span>Add Certification</span>
                      </button>
                    </div>
                    {(resume.certifications || []).length > 0 && (
                      <div className="space-y-2.5">
                        {(resume.certifications || []).map((cert) => (
                          <div
                            key={cert.id}
                            className="p-3 border border-slate-200 rounded-lg bg-slate-50/50 grid grid-cols-1 sm:grid-cols-12 gap-2 items-center"
                          >
                            <input
                              type="text"
                              value={cert.name}
                              onChange={(e) => updateCertification(cert.id, { name: e.target.value })}
                              placeholder="Certificate Name (e.g. Certified SOLIDWORKS Associate)"
                              className="sm:col-span-5 px-2.5 py-1.5 border border-slate-300 rounded text-xs bg-white font-semibold"
                            />
                            <input
                              type="text"
                              value={cert.issuer}
                              onChange={(e) =>
                                updateCertification(cert.id, { issuer: e.target.value })
                              }
                              placeholder="Issuer (e.g. Dassault Systemes / NPTEL)"
                              className="sm:col-span-4 px-2.5 py-1.5 border border-slate-300 rounded text-xs bg-white"
                            />
                            <input
                              type="text"
                              value={cert.issueDate}
                              onChange={(e) =>
                                updateCertification(cert.id, { issueDate: e.target.value })
                              }
                              placeholder="Date"
                              className="sm:col-span-2 px-2.5 py-1.5 border border-slate-300 rounded text-xs bg-white"
                            />
                            <button
                              type="button"
                              onClick={() => deleteCertification(cert.id)}
                              className="sm:col-span-1 p-1.5 text-slate-400 hover:text-red-600 rounded justify-self-end cursor-pointer"
                              title="Delete certification"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </section>
          )}

          {/* 9. Leadership */}
          {activeSection === 'leadership' && (
            <section aria-labelledby="section-lead-title">
              <div className="border-b border-slate-200 pb-3 mb-5 flex items-center justify-between">
                <div>
                  <h2 id="section-lead-title" className="text-lg font-bold text-slate-900">
                    {isSoftwareDevTemplate || isHarvardTemplate
                      ? 'Leadership and Activities'
                      : isEngineeringResumeTemplate
                      ? 'Position of Responsibility (Optional)'
                      : 'Leadership Experience'}
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {isSoftwareDevTemplate
                      ? 'Engineering clubs, hackathon organizing, mentoring, or open-source governance under ADDITIONAL.'
                      : isHarvardTemplate
                      ? 'Student organizations, volunteer leadership, varsity athletics, and community committees.'
                      : isEngineeringResumeTemplate
                      ? 'Student club coordinator, SAE/IEEE student chapter lead, placement representative, or fest organizer roles.'
                      : 'Conference organization, lab management, student association presidencies.'}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={addLeadership}
                  className="inline-flex items-center px-3 py-1.5 text-xs font-semibold text-white bg-slate-900 hover:bg-black rounded shadow-xs cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5 mr-1" />
                  <span>{isEngineeringResumeTemplate ? 'Add Role' : 'Add Leadership'}</span>
                </button>
              </div>

              {isHarvardTemplate && (
                <div className="mb-4 p-3 rounded-lg border border-slate-200 bg-slate-50 flex items-center justify-between gap-3">
                  <div>
                    <div className="text-xs font-bold text-slate-800">
                      Prioritize Leadership &amp; Activities Above Experience
                    </div>
                    <p className="text-[11px] text-slate-500">
                      Useful for undergraduates or students whose strongest involvement is campus leadership rather than work history.
                    </p>
                  </div>
                  <label className="inline-flex items-center gap-2 text-xs font-semibold text-slate-800 cursor-pointer shrink-0">
                    <input
                      type="checkbox"
                      checked={Boolean(resume.harvardLeadershipFirst)}
                      onChange={(e) => updateField('harvardLeadershipFirst', e.target.checked)}
                      className="h-4 w-4 rounded border-slate-300 text-slate-900"
                    />
                    <span>Show First</span>
                  </label>
                </div>
              )}

              {(!resume.leadership || resume.leadership.length === 0) ? (
                <div className="p-8 text-center border border-dashed border-slate-300 rounded-lg">
                  <p className="text-xs text-slate-500">No leadership entries added yet.</p>
                  <button
                    onClick={addLeadership}
                    className="mt-2 text-xs font-bold text-slate-900 hover:underline"
                  >
                    + Add a leadership role
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  {resume.leadership.map((lead, idx) => (
                    <div
                      key={lead.id}
                      className="p-4 border border-slate-200 rounded-lg bg-slate-50/50 space-y-3"
                    >
                      <div className="flex justify-between items-center">
                        <span className="text-xs font-bold text-slate-700">Leadership Entry #{idx + 1}</span>
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => moveArrayItem('leadership', idx, -1)}
                            disabled={idx === 0}
                            className="p-1 text-slate-400 hover:text-slate-700 disabled:opacity-30 rounded cursor-pointer"
                            title="Move up"
                          >
                            <ChevronUp className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => moveArrayItem('leadership', idx, 1)}
                            disabled={idx === (resume.leadership?.length || 1) - 1}
                            className="p-1 text-slate-400 hover:text-slate-700 disabled:opacity-30 rounded cursor-pointer"
                            title="Move down"
                          >
                            <ChevronDown className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => deleteLeadership(lead.id)}
                            className="p-1 text-slate-400 hover:text-red-600 rounded"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-semibold text-slate-700 mb-1">
                            Role / Title *
                          </label>
                          <input
                            type="text"
                            value={lead.role}
                            onChange={(e) => updateLeadership(lead.id, { role: e.target.value })}
                            placeholder="e.g. Workshop Co-Organizer"
                            className="w-full px-3 py-1.5 border border-slate-300 rounded text-sm bg-white"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-semibold text-slate-700 mb-1">
                            Organization *
                          </label>
                          <input
                            type="text"
                            value={lead.organization}
                            onChange={(e) =>
                              updateLeadership(lead.id, { organization: e.target.value })
                            }
                            placeholder="e.g. ICLR Workshop on ML in Drug Discovery"
                            className="w-full px-3 py-1.5 border border-slate-300 rounded text-sm bg-white"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-semibold text-slate-700 mb-1">
                            Dates
                          </label>
                          <input
                            type="text"
                            value={lead.startDate}
                            onChange={(e) =>
                              updateLeadership(lead.id, { startDate: e.target.value })
                            }
                            placeholder="e.g. 2023 – 2024"
                            className="w-full px-3 py-1.5 border border-slate-300 rounded text-sm bg-white"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-semibold text-slate-700 mb-1">
                            Location
                          </label>
                          <input
                            type="text"
                            value={lead.location || ''}
                            onChange={(e) =>
                              updateLeadership(lead.id, { location: e.target.value })
                            }
                            placeholder="e.g. Vienna, Austria"
                            className="w-full px-3 py-1.5 border border-slate-300 rounded text-sm bg-white"
                          />
                        </div>

                        <div className="sm:col-span-2">
                          <div className="flex items-center justify-between mb-1">
                            <label className="block text-xs font-semibold text-slate-700">
                              Key Initiatives &amp; Achievements (One bullet per line)
                            </label>
                            {(lead.highlights || []).some(h => h.trim().length > 0) && (
                              <button
                                type="button"
                                onClick={() =>
                                  handleOpenImprove(
                                    (lead.highlights || []).join('\n'),
                                    'leadership',
                                    'Academic and professional leadership initiatives and organizational impact',
                                    (improved) =>
                                      updateLeadership(lead.id, {
                                        highlights: improved.split('\n').filter(Boolean),
                                      })
                                  )
                                }
                                className="inline-flex items-center text-[11px] font-semibold text-purple-700 hover:text-purple-900 bg-purple-50 hover:bg-purple-100 px-2 py-0.5 rounded border border-purple-200 transition-colors"
                              >
                                <Sparkles className="w-3 h-3 mr-1" />
                                <span>AI Improve</span>
                              </button>
                            )}
                          </div>
                          <textarea
                            rows={2}
                            value={(lead.highlights || []).join('\n')}
                            onChange={(e) =>
                              updateLeadership(lead.id, { highlights: e.target.value.split('\n') })
                            }
                            placeholder="• Curated technical program reviewing 90+ submissions..."
                            className="w-full p-2.5 border border-slate-300 rounded text-xs bg-white leading-relaxed"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          )}

          {/* 10. Volunteer */}
          {activeSection === 'volunteer' && (
            <section aria-labelledby="section-vol-title">
              <div className="border-b border-slate-200 pb-3 mb-5 flex items-center justify-between">
                <div>
                  <h2 id="section-vol-title" className="text-lg font-bold text-slate-900">
                    Volunteer &amp; Community Service
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Peer reviewing, community outreach, and academic service.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={addVolunteer}
                  className="inline-flex items-center px-3 py-1.5 text-xs font-semibold text-white bg-slate-900 hover:bg-black rounded shadow-xs"
                >
                  <Plus className="w-3.5 h-3.5 mr-1" />
                  <span>Add Service</span>
                </button>
              </div>

              {(!resume.volunteer || resume.volunteer.length === 0) ? (
                <div className="p-8 text-center border border-dashed border-slate-300 rounded-lg">
                  <p className="text-xs text-slate-500">No volunteer service entries added yet.</p>
                  <button
                    onClick={addVolunteer}
                    className="mt-2 text-xs font-bold text-slate-900 hover:underline"
                  >
                    + Add a service entry
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  {resume.volunteer.map((vol) => (
                    <div
                      key={vol.id}
                      className="p-3.5 border border-slate-200 rounded-lg bg-slate-50/50 space-y-2"
                    >
                      <div className="flex justify-between items-center">
                        <span className="text-xs font-bold text-slate-700">Service Entry</span>
                        <button
                          type="button"
                          onClick={() => deleteVolunteer(vol.id)}
                          className="p-1 text-slate-400 hover:text-red-600 rounded"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <div>
                          <label className="block text-[11px] font-semibold text-slate-700 mb-0.5">
                            Role (e.g. Peer Reviewer) *
                          </label>
                          <input
                            type="text"
                            value={vol.role}
                            onChange={(e) => updateVolunteer(vol.id, { role: e.target.value })}
                            placeholder="e.g. Peer Reviewer"
                            className="w-full px-2.5 py-1.5 border border-slate-300 rounded text-xs bg-white"
                          />
                        </div>

                        <div>
                          <label className="block text-[11px] font-semibold text-slate-700 mb-0.5">
                            Organization / Journals *
                          </label>
                          <input
                            type="text"
                            value={vol.organization}
                            onChange={(e) =>
                              updateVolunteer(vol.id, { organization: e.target.value })
                            }
                            placeholder="e.g. Nature Communications, NeurIPS"
                            className="w-full px-2.5 py-1.5 border border-slate-300 rounded text-xs bg-white"
                          />
                        </div>

                        <div className="sm:col-span-2">
                          <div className="flex items-center justify-between mb-0.5">
                            <label className="block text-[11px] font-semibold text-slate-700">
                              Highlights / Contributions
                            </label>
                            {(vol.highlights || []).some(h => h.trim().length > 0) && (
                              <button
                                type="button"
                                onClick={() =>
                                  handleOpenImprove(
                                    (vol.highlights || []).join('\n'),
                                    'volunteer',
                                    'Academic service, review contributions, and outreach impact',
                                    (improved) =>
                                      updateVolunteer(vol.id, {
                                        highlights: improved.split('\n').filter(Boolean),
                                      })
                                  )
                                }
                                className="inline-flex items-center text-[11px] font-semibold text-purple-700 hover:text-purple-900 bg-purple-50 hover:bg-purple-100 px-2 py-0.5 rounded border border-purple-200 transition-colors"
                              >
                                <Sparkles className="w-3 h-3 mr-1" />
                                <span>AI Improve</span>
                              </button>
                            )}
                          </div>
                          <input
                            type="text"
                            value={(vol.highlights || []).join(', ')}
                            onChange={(e) =>
                              updateVolunteer(vol.id, { highlights: [e.target.value] })
                            }
                            placeholder="e.g. Completed 45+ peer reviews for premier ML conferences"
                            className="w-full px-2.5 py-1.5 border border-slate-300 rounded text-xs bg-white"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          )}

          {/* 11. Memberships */}
          {activeSection === 'memberships' && (
            <section aria-labelledby="section-mem-title">
              <div className="border-b border-slate-200 pb-3 mb-5 flex items-center justify-between">
                <div>
                  <h2 id="section-mem-title" className="text-lg font-bold text-slate-900">
                    Professional Memberships
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    IEEE, ACM, ISCB, AAAS, and other scholarly societies.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={addMembership}
                  className="inline-flex items-center px-3 py-1.5 text-xs font-semibold text-white bg-slate-900 hover:bg-black rounded shadow-xs"
                >
                  <Plus className="w-3.5 h-3.5 mr-1" />
                  <span>Add Membership</span>
                </button>
              </div>

              {(!resume.memberships || resume.memberships.length === 0) ? (
                <div className="p-8 text-center border border-dashed border-slate-300 rounded-lg">
                  <p className="text-xs text-slate-500">No memberships added yet.</p>
                  <button
                    onClick={addMembership}
                    className="mt-2 text-xs font-bold text-slate-900 hover:underline"
                  >
                    + Add a professional membership
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  {resume.memberships.map((mem) => (
                    <div
                      key={mem.id}
                      className="p-3.5 border border-slate-200 rounded-lg bg-slate-50/50 space-y-2"
                    >
                      <div className="flex justify-between items-center">
                        <span className="text-xs font-bold text-slate-700">Membership</span>
                        <button
                          type="button"
                          onClick={() => deleteMembership(mem.id)}
                          className="p-1 text-slate-400 hover:text-red-600 rounded"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <div>
                          <label className="block text-[11px] font-semibold text-slate-700 mb-0.5">
                            Organization Name *
                          </label>
                          <input
                            type="text"
                            value={mem.organization}
                            onChange={(e) =>
                              updateMembership(mem.id, { organization: e.target.value })
                            }
                            placeholder="e.g. IEEE Computer Society"
                            className="w-full px-2.5 py-1.5 border border-slate-300 rounded text-xs bg-white"
                          />
                        </div>

                        <div>
                          <label className="block text-[11px] font-semibold text-slate-700 mb-0.5">
                            Membership Grade (e.g. Senior Member)
                          </label>
                          <input
                            type="text"
                            value={mem.membershipType || ''}
                            onChange={(e) =>
                              updateMembership(mem.id, { membershipType: e.target.value })
                            }
                            placeholder="e.g. Senior Member"
                            className="w-full px-2.5 py-1.5 border border-slate-300 rounded text-xs bg-white"
                          />
                        </div>

                        <div>
                          <label className="block text-[11px] font-semibold text-slate-700 mb-0.5">
                            Membership ID
                          </label>
                          <input
                            type="text"
                            value={mem.membershipId || ''}
                            onChange={(e) =>
                              updateMembership(mem.id, { membershipId: e.target.value })
                            }
                            placeholder="e.g. IEEE-94810234"
                            className="w-full px-2.5 py-1.5 border border-slate-300 rounded text-xs bg-white"
                          />
                        </div>

                        <div>
                          <label className="block text-[11px] font-semibold text-slate-700 mb-0.5">
                            Years (e.g. 2019 – Present)
                          </label>
                          <input
                            type="text"
                            value={mem.startDate}
                            onChange={(e) => updateMembership(mem.id, { startDate: e.target.value })}
                            placeholder="e.g. 2019 – Present"
                            className="w-full px-2.5 py-1.5 border border-slate-300 rounded text-xs bg-white"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          )}

          {/* 12. Certifications */}
          {activeSection === 'certifications' && (
            <section aria-labelledby="section-cert-title">
              <div className="border-b border-slate-200 pb-3 mb-5 flex items-center justify-between">
                <div>
                  <h2 id="section-cert-title" className="text-lg font-bold text-slate-900">
                    {isCreativeProfessionalTemplate ? 'Certificates & Grants' : 'Certifications'}
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {isCreativeProfessionalTemplate
                      ? 'Professional credentials, licenses, grants, fellowships, and awards rendered in CERTIFICATES & GRANTS.'
                      : 'Professional credentials, licenses, and verified certifications.'}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {isCreativeProfessionalTemplate && (
                    <button
                      type="button"
                      onClick={() => setActiveSection('awards')}
                      className="inline-flex items-center px-2.5 py-1.5 text-xs font-semibold text-blue-800 bg-blue-50 border border-blue-200 hover:bg-blue-100 rounded cursor-pointer"
                    >
                      <span>Manage Grants / Awards ({resume.achievements?.length || 0})</span>
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={addCertification}
                    className="inline-flex items-center px-3 py-1.5 text-xs font-semibold text-white bg-slate-900 hover:bg-black rounded shadow-xs"
                  >
                    <Plus className="w-3.5 h-3.5 mr-1" />
                    <span>Add Certificate</span>
                  </button>
                </div>
              </div>

              {(!resume.certifications || resume.certifications.length === 0) ? (
                <div className="p-8 text-center border border-dashed border-slate-300 rounded-lg">
                  <p className="text-xs text-slate-500">No certifications added yet.</p>
                  <button
                    onClick={addCertification}
                    className="mt-2 text-xs font-bold text-slate-900 hover:underline"
                  >
                    + Add a certification
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  {resume.certifications.map((c, idx) => (
                    <div
                      key={c.id}
                      className="p-3.5 border border-slate-200 rounded-lg bg-slate-50/50 space-y-2"
                    >
                      <div className="flex justify-between items-center">
                        <span className="text-xs font-bold text-slate-700">Certificate #{idx + 1}</span>
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => moveArrayItem('certifications', idx, -1)}
                            disabled={idx === 0}
                            className="p-1 text-slate-400 hover:text-slate-700 disabled:opacity-30 rounded cursor-pointer"
                            title="Move up"
                          >
                            <ChevronUp className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => moveArrayItem('certifications', idx, 1)}
                            disabled={idx === (resume.certifications?.length || 1) - 1}
                            className="p-1 text-slate-400 hover:text-slate-700 disabled:opacity-30 rounded cursor-pointer"
                            title="Move down"
                          >
                            <ChevronDown className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => deleteCertification(c.id)}
                            className="p-1 text-slate-400 hover:text-red-600 rounded"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <div>
                          <label className="block text-[11px] font-semibold text-slate-700 mb-0.5">
                            Certificate Name *
                          </label>
                          <input
                            type="text"
                            value={c.name}
                            onChange={(e) => updateCertification(c.id, { name: e.target.value })}
                            placeholder="e.g. AWS Certified Solutions Architect"
                            className="w-full px-2.5 py-1.5 border border-slate-300 rounded text-xs bg-white"
                          />
                        </div>

                        <div>
                          <label className="block text-[11px] font-semibold text-slate-700 mb-0.5">
                            Issuing Organization *
                          </label>
                          <input
                            type="text"
                            value={c.issuer}
                            onChange={(e) => updateCertification(c.id, { issuer: e.target.value })}
                            placeholder="e.g. Amazon Web Services"
                            className="w-full px-2.5 py-1.5 border border-slate-300 rounded text-xs bg-white"
                          />
                        </div>

                        <div>
                          <label className="block text-[11px] font-semibold text-slate-700 mb-0.5">
                            Date Issued
                          </label>
                          <input
                            type="text"
                            value={c.issueDate}
                            onChange={(e) =>
                              updateCertification(c.id, { issueDate: e.target.value })
                            }
                            placeholder="e.g. May 2024"
                            className="w-full px-2.5 py-1.5 border border-slate-300 rounded text-xs bg-white"
                          />
                        </div>

                        <div>
                          <label className="block text-[11px] font-semibold text-slate-700 mb-0.5">
                            Credential ID (Optional)
                          </label>
                          <input
                            type="text"
                            value={c.credentialId || ''}
                            onChange={(e) =>
                              updateCertification(c.id, { credentialId: e.target.value })
                            }
                            placeholder="e.g. AWS-SAA-C03-8812"
                            className="w-full px-2.5 py-1.5 border border-slate-300 rounded text-xs bg-white"
                          />
                        </div>

                        <div className="sm:col-span-2">
                          <label className="block text-[11px] font-semibold text-slate-700 mb-0.5">
                            Verification Link (Optional)
                          </label>
                          <input
                            type="text"
                            value={c.link || ''}
                            onChange={(e) => updateCertification(c.id, { link: e.target.value })}
                            placeholder="e.g. https://verify..."
                            className="w-full px-2.5 py-1.5 border border-slate-300 rounded text-xs bg-white"
                          />
                        </div>

                        {isFresherResumeTemplate && (
                          <div className="sm:col-span-2">
                            <label className="block text-[11px] font-semibold text-slate-700 mb-0.5">
                              Skills Covered (Optional, comma-separated)
                            </label>
                            <CommaArrayInput
                              ariaLabel="Certification Skills Covered"
                              value={c.skillsCovered}
                              onChange={(items) => updateCertification(c.id, { skillsCovered: items })}
                              placeholder="e.g. AWS VPC, IAM, Serverless Compute"
                              className="w-full px-2.5 py-1.5 border border-slate-300 rounded text-xs bg-white"
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          )}

          {/* 13. Additional Info: Languages & Interests */}
          {activeSection === 'additional' && (
            <section aria-labelledby="section-add-title">
              <div className="border-b border-slate-200 pb-3 mb-5">
                <h2 id="section-add-title" className="text-lg font-bold text-slate-900">
                  {isFresherResumeTemplate ? 'Interests & Additional Info' : 'Additional Information'}
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  {isFresherResumeTemplate
                    ? 'Extracurricular hobbies and personal interests (Languages have their own dedicated section).'
                    : 'Languages with proficiencies, scholarly interests, and background.'}
                </p>
              </div>

              <div className="space-y-4">
                {!isFresherResumeTemplate && (
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="block text-xs font-bold text-slate-700">
                        Languages &amp; Proficiency
                      </label>
                      <button
                        type="button"
                        onClick={addLanguage}
                        className="text-xs font-semibold text-slate-900 hover:underline"
                      >
                        + Add Language
                      </button>
                    </div>

                    <div className="space-y-2">
                      {(resume.languages || []).map((l) => (
                        <div key={l.id} className="flex items-center space-x-2">
                          <input
                            type="text"
                            value={l.language}
                            onChange={(e) => updateLanguage(l.id, { language: e.target.value })}
                            placeholder="e.g. English, Mandarin, French"
                            className="flex-1 px-2.5 py-1.5 border border-slate-300 rounded text-xs bg-white"
                          />
                          <select
                            value={l.proficiency}
                            onChange={(e) => updateLanguage(l.id, { proficiency: e.target.value })}
                            className="px-2.5 py-1.5 border border-slate-300 rounded text-xs bg-white"
                          >
                            <option value="Native / Bilingual">Native / Bilingual</option>
                            <option value="Fluent">Fluent</option>
                            <option value="Professional Working">Professional Working</option>
                            <option value="Intermediate">Intermediate</option>
                            <option value="Elementary">Elementary</option>
                          </select>
                          <button
                            type="button"
                            onClick={() => deleteLanguage(l.id)}
                            className="p-1.5 text-slate-400 hover:text-red-600 rounded"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className={isFresherResumeTemplate ? '' : 'pt-3 border-t border-slate-200'}>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    {isFresherResumeTemplate ? 'Interests & Hobbies' : 'Scholarly / Professional Interests'}
                  </label>
                  <input
                    type="text"
                    value={resume.interests || ''}
                    onChange={(e) => updateField('interests', e.target.value)}
                    placeholder="e.g. Open-source software, marathon running, chamber music, astrophotography"
                    className="w-full px-3 py-2 border border-slate-300 rounded text-xs bg-white"
                  />
                </div>
              </div>
            </section>
          )}

          {/* 14. References / Referees */}
          {activeSection === 'references' && (
            <section aria-labelledby="section-ref-title">
              <div className="border-b border-slate-200 pb-3 mb-5 flex items-center justify-between">
                <div>
                  <h2 id="section-ref-title" className="text-lg font-bold text-slate-900">
                    {isTwoColumnTemplate ? 'Referees' : 'References'}
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Optional academic advisors, dissertation committee members, or professional supervisors.
                  </p>
                </div>
                {((!isClassicTemplate && !isTwoColumnTemplate && !isElegantSerifTemplate && !isModernCorporateTemplate) ||
                  (resume.referencesDisplayMode || 'detailed') === 'detailed') && (
                  <button
                    type="button"
                    onClick={addReference}
                    className="inline-flex items-center px-3 py-1.5 text-xs font-semibold text-white bg-slate-900 hover:bg-black rounded shadow-xs cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5 mr-1" />
                    <span>Add Reference</span>
                  </button>
                )}
              </div>

              {(isClassicTemplate || isTwoColumnTemplate || isElegantSerifTemplate || isModernCorporateTemplate) && (
                <div className="mb-5 p-3.5 bg-slate-50 border border-slate-200 rounded-lg">
                  <div className="text-xs font-bold text-slate-700 mb-2">
                    References Display Mode
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    {(
                      [
                        {
                          value: 'detailed',
                          label: 'Show Detailed Referees',
                          hint: 'List referee names & contacts',
                        },
                        {
                          value: 'on-request',
                          label: 'Available Upon Request',
                          hint: 'Displays standard one-line note',
                        },
                        {
                          value: 'hidden',
                          label: 'Hide Section',
                          hint: 'Omit References from CV',
                        },
                      ] as Array<{ value: ReferencesDisplayMode; label: string; hint: string }>
                    ).map((opt) => {
                      const active =
                        (resume.referencesDisplayMode ||
                          ((resume.references || []).length > 0 ? 'detailed' : 'on-request')) ===
                        opt.value;
                      return (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => updateField('referencesDisplayMode', opt.value)}
                          className={`p-2.5 text-left rounded-lg border transition-colors cursor-pointer ${
                            active
                              ? isTwoColumnTemplate
                                ? 'bg-white border-[#8f131b] ring-1 ring-[#8f131b]'
                                : isElegantSerifTemplate
                                ? 'bg-white border-slate-900 ring-1 ring-slate-900'
                                : isModernCorporateTemplate
                                ? 'bg-white border-[#3873b3] ring-1 ring-[#3873b3]'
                                : 'bg-white border-[#1e4e8c] ring-1 ring-[#1e4e8c]'
                              : 'bg-white/60 border-slate-200 hover:border-slate-300'
                          }`}
                        >
                          <div className="text-xs font-bold text-slate-900">{opt.label}</div>
                          <div className="text-[11px] text-slate-500 mt-0.5">{opt.hint}</div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {(isClassicTemplate || isTwoColumnTemplate || isElegantSerifTemplate || isModernCorporateTemplate) &&
              resume.referencesDisplayMode === 'on-request' ? (
                <div className="p-6 text-center border border-slate-200 bg-slate-50 rounded-lg text-xs text-slate-600">
                  Your CV will display: <strong className="text-slate-900">References available upon request.</strong>
                </div>
              ) : (isClassicTemplate || isTwoColumnTemplate || isElegantSerifTemplate || isModernCorporateTemplate) &&
                resume.referencesDisplayMode === 'hidden' ? (
                <div className="p-6 text-center border border-dashed border-slate-300 rounded-lg text-xs text-slate-500">
                  The Referees section is currently omitted from your CV. Select another display mode above to show it.
                </div>
              ) : (!resume.references || resume.references.length === 0) ? (
                <div className="p-8 text-center border border-dashed border-slate-300 rounded-lg">
                  <p className="text-xs text-slate-500">
                    No references added. In Academic CVs, references are optional and can be provided on request.
                  </p>
                  <button
                    onClick={addReference}
                    className="mt-2 text-xs font-bold text-slate-900 hover:underline"
                  >
                    + Add a professional reference
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  {resume.references.map((r) => (
                    <div
                      key={r.id}
                      className="p-4 border border-slate-200 rounded-lg bg-slate-50/50 space-y-3"
                    >
                      <div className="flex justify-between items-center">
                        <span className="text-xs font-bold text-slate-700">Reference Entry</span>
                        <button
                          type="button"
                          onClick={() => deleteReference(r.id)}
                          className="p-1 text-slate-400 hover:text-red-600 rounded"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-semibold text-slate-700 mb-1">
                            Full Name *
                          </label>
                          <input
                            type="text"
                            value={r.fullName}
                            onChange={(e) => updateReference(r.id, { fullName: e.target.value })}
                            placeholder="e.g. Prof. Marcus Vance, Ph.D."
                            className="w-full px-3 py-1.5 border border-slate-300 rounded text-sm bg-white"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-semibold text-slate-700 mb-1">
                            Job Title / Academic Rank *
                          </label>
                          <input
                            type="text"
                            value={r.jobTitle}
                            onChange={(e) => updateReference(r.id, { jobTitle: e.target.value })}
                            placeholder="e.g. Professor of Computer Science & Genetics"
                            className="w-full px-3 py-1.5 border border-slate-300 rounded text-sm bg-white"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-semibold text-slate-700 mb-1">
                            Department
                          </label>
                          <input
                            type="text"
                            value={r.department || ''}
                            onChange={(e) => updateReference(r.id, { department: e.target.value })}
                            placeholder="e.g. Department of Computer Science"
                            className="w-full px-3 py-1.5 border border-slate-300 rounded text-sm bg-white"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-semibold text-slate-700 mb-1">
                            Institution / Organization *
                          </label>
                          <input
                            type="text"
                            value={r.organization}
                            onChange={(e) =>
                              updateReference(r.id, { organization: e.target.value })
                            }
                            placeholder="e.g. Stanford University"
                            className="w-full px-3 py-1.5 border border-slate-300 rounded text-sm bg-white"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-semibold text-slate-700 mb-1">
                            Email Address *
                          </label>
                          <input
                            type="email"
                            value={r.email}
                            onChange={(e) => updateReference(r.id, { email: e.target.value })}
                            placeholder="e.g. m.vance@stanford.edu"
                            className="w-full px-3 py-1.5 border border-slate-300 rounded text-sm bg-white"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-semibold text-slate-700 mb-1">
                            Relationship
                          </label>
                          <input
                            type="text"
                            value={r.relationship || ''}
                            onChange={(e) =>
                              updateReference(r.id, { relationship: e.target.value })
                            }
                            placeholder="e.g. Doctoral Dissertation Advisor"
                            className="w-full px-3 py-1.5 border border-slate-300 rounded text-sm bg-white"
                          />
                        </div>

                        {(isElegantSerifTemplate || isModernCorporateTemplate) && (
                          <div>
                            <label className="block text-xs font-semibold text-slate-700 mb-1">
                              Phone Number (Optional)
                            </label>
                            <input
                              type="tel"
                              value={r.phone || ''}
                              onChange={(e) => updateReference(r.id, { phone: e.target.value })}
                              placeholder="e.g. +44 1223 337733"
                              className="w-full px-3 py-1.5 border border-slate-300 rounded text-sm bg-white"
                            />
                          </div>
                        )}

                        {(isTwoColumnTemplate || isElegantSerifTemplate || isModernCorporateTemplate) && (
                          <div className="sm:col-span-2">
                            <label className="block text-xs font-semibold text-slate-700 mb-1">
                              Mailing Address (Optional — multi-line supported)
                            </label>
                            <textarea
                              rows={2}
                              value={r.address || ''}
                              onChange={(e) => updateReference(r.id, { address: e.target.value })}
                              placeholder="Gates Computer Science Bldg, Room 412&#10;Stanford, CA 94305"
                              className="w-full px-3 py-1.5 border border-slate-300 rounded text-xs bg-white leading-relaxed"
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          )}

          {/* Section Navigation Buttons at bottom */}
          <div className="mt-8 pt-4 border-t border-slate-200 flex items-center justify-between">
            <button
              type="button"
              onClick={() => {
                const idx = navSections.findIndex((s) => s.id === activeSection);
                if (idx > 0) setActiveSection(navSections[idx - 1].id);
              }}
              disabled={activeSection === navSections[0]?.id}
              className="inline-flex items-center px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded disabled:opacity-40 transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5 mr-1" />
              <span>Previous Section</span>
            </button>

            <button
              type="button"
              onClick={() => {
                const idx = navSections.findIndex((s) => s.id === activeSection);
                if (idx >= 0 && idx < navSections.length - 1) {
                  setActiveSection(navSections[idx + 1].id);
                } else {
                  void handlePreviewClick();
                }
              }}
              className="inline-flex items-center px-4 py-1.5 text-xs font-semibold text-white bg-slate-900 hover:bg-black rounded shadow-xs transition-colors cursor-pointer"
            >
              <span>
                {activeSection === navSections[navSections.length - 1]?.id
                  ? `Finish & View ${activeTemplate.name}`
                  : 'Next Section'}
              </span>
              <ArrowRight className="w-3.5 h-3.5 ml-1" />
            </button>
          </div>
        </main>
      </div>

      {/* AI Writing Improvement Modal */}
      <AiImproveModal
        isOpen={improveModal.isOpen}
        onClose={() => setImproveModal((prev) => ({ ...prev, isOpen: false }))}
        originalText={improveModal.originalText}
        sectionType={improveModal.sectionType}
        context={improveModal.context}
        templateId={activeTemplateId}
        onApply={improveModal.onApply}
      />

      {/* AI Interview Step Modal */}
      <AiInterviewModal
        isOpen={isInterviewOpen}
        onClose={() => setIsInterviewOpen(false)}
        currentResume={resume}
        onApplyUpdates={(updated) => {
          setResume(updated);
          void enqueueSave(updated, { force: true });
        }}
      />

      {/* Upload CV PDF Extraction Modal */}
      <UploadCvModal
        isOpen={isUploadOpen}
        onClose={() => setIsUploadOpen(false)}
        onExtracted={(extracted) => {
          setResume(extracted);
          void enqueueSave(extracted, { force: true });
        }}
        userId={resume.userId}
      />

      {/* Completeness Dashboard Modal */}
      <CompletenessReportModal
        isOpen={isCompletenessOpen}
        onClose={() => setIsCompletenessOpen(false)}
        report={completenessReport}
        templateName={activeTemplate.name}
        onPreview={handlePreviewClick}
        onNavigateToSection={(secId) => {
          setActiveSection(sectionReportToEditorId(secId));
        }}
      />

      {/* Profile Photo Crop Modal */}
      <PhotoCropModal
        isOpen={photoCropModal.isOpen}
        initialImageSrc={photoCropModal.imageSrc}
        initialShape={
          resume.personalInfo.photoShape || (isTwoColumnTemplate ? 'circle' : 'portrait')
        }
        hasSavedPhoto={Boolean(resume.personalInfo.photoUrl)}
        onApply={handleApplyCroppedPhoto}
        onRemove={handleRemovePhoto}
        onClose={() => setPhotoCropModal({ isOpen: false, imageSrc: '' })}
      />
    </div>
  );
};
