import React, { useState } from 'react';
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
} from 'lucide-react';
import type {
  Resume,
  PersonalInfo,
  ExperienceCategory,
  ExperienceItem,
  ExperienceSubHighlights,
  EducationItem,
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
  getTemplateById,
  resolveTemplateId,
} from '../../data/templates';
import {
  SAMPLE_ACADEMIC_CV,
  SAMPLE_CLASSIC_PROFESSIONAL_CV,
  SAMPLE_TWO_COLUMN_CV,
  SAMPLE_SOFTWARE_DEVELOPER_CV,
  SAMPLE_EXPERIENCED_CV,
  SAMPLE_FRESHER_CV,
  SAMPLE_STUDENT_CV,
  BLANK_ACADEMIC_CV,
} from '../../data/sampleResumes';
import { analyzeResumeSections } from '../../utils/validation';
import {
  SKILL_MATRIX_LEGEND,
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
  | 'education'
  | 'thesis'
  | 'coursework'
  | 'projects'
  | 'daily-life'
  | 'publications'
  | 'philosophy'
  | 'languages'
  | 'skills'
  | 'programming-languages'
  | 'developer-tools'
  | 'technologies-frameworks'
  | 'skill-matrix'
  | 'strengths'
  | 'interests'
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

const JAKES_EDITOR_SECTIONS = new Set<EditorSectionId>([
  'header',
  'education',
  'coursework',
  'experience',
  'projects',
  'skills',
  'leadership',
]);

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
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [isInterviewOpen, setIsInterviewOpen] = useState(false);
  const [isCompletenessOpen, setIsCompletenessOpen] = useState(false);
  const [courseworkDraft, setCourseworkDraft] = useState('');
  const [strengthDraft, setStrengthDraft] = useState('');
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

  const activeTemplateId = resolveTemplateId(resume.template);
  const activeTemplate = getTemplateById(activeTemplateId);
  const isJakesTemplate = activeTemplateId === 'jakes-resume';
  const isClassicTemplate = activeTemplateId === 'classic-professional';
  const isTwoColumnTemplate = activeTemplateId === 'two-column-professional';
  const isSoftwareDevTemplate = activeTemplateId === 'software-developer';
  const sidebarSections = isTwoColumnTemplate
    ? TWO_COLUMN_SECTIONS
    : isClassicTemplate
    ? CLASSIC_SECTIONS
    : isSoftwareDevTemplate
    ? SOFTWARE_DEV_SECTIONS
    : SECTIONS;
  const navSections = isTwoColumnTemplate
    ? TWO_COLUMN_SECTIONS
    : isClassicTemplate
    ? CLASSIC_SECTIONS
    : isSoftwareDevTemplate
    ? SOFTWARE_DEV_SECTIONS
    : isJakesTemplate
    ? SECTIONS.filter((s) => JAKES_EDITOR_SECTIONS.has(s.id))
    : SECTIONS;
  const completenessReport = analyzeResumeSections(resume);
  const dailyValidation = validateDailyActivities(resume.dailyActivities || []);

  const sectionReportToEditorId = (sectionId: string): EditorSectionId => {
    if (isTwoColumnTemplate) {
      if (sectionId === 'personalInfo' || sectionId === 'header') return 'header';
      if (sectionId === 'achievements') return 'awards';
      return sectionId as EditorSectionId;
    }
    if (isClassicTemplate) {
      if (sectionId === 'personalInfo' || sectionId === 'header') return 'header';
      return sectionId as EditorSectionId;
    }
    if (isSoftwareDevTemplate) {
      if (sectionId === 'personalInfo' || sectionId === 'header') return 'header';
      if (sectionId === 'achievements') return 'awards';
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
    if (isTwoColumnTemplate || isSoftwareDevTemplate) {
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
    setImproveModal({
      isOpen: true,
      originalText,
      sectionType,
      context,
      onApply: onApplyCallback || (() => {}),
    });
  };

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
      await saveResume(resume.userId, resume);
      onSave(resume);
      setJustSaved(true);
      setTimeout(() => setJustSaved(false), 2000);
    } catch (e) {
      console.error('Save failed:', e);
    } finally {
      setSaving(false);
    }
  };

  const handleSwitchTemplate = async (newTemplateId: string) => {
    const nextTemplate = getTemplateById(newTemplateId);
    const updated: Resume = {
      ...resume,
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
        : nextTemplate.id === 'jakes-resume'
        ? SECTIONS.filter((s) => JAKES_EDITOR_SECTIONS.has(s.id))
        : SECTIONS;
    if (!nextSections.some((s) => s.id === activeSection)) {
      setActiveSection('header');
    }
    setResume(updated);
    onSave(updated);
    try {
      await saveResume(updated.userId, updated);
    } catch (e) {
      console.error('Failed to persist template switch', e);
    }
  };

  const handleLoadProfile = (
    type:
      | 'academic'
      | 'classic'
      | 'two-column'
      | 'software-developer'
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
    saveResume(resume.userId, updated);
    onSave(updated);
  };

  const toggleSectionVisibility = (sectionId: string) => {
    const hidden = resume.hiddenSections || [];
    const isCurrentlyHidden = hidden.includes(sectionId);
    const newHidden = isCurrentlyHidden
      ? hidden.filter((id) => id !== sectionId)
      : [...hidden, sectionId];
    updateField('hiddenSections', newHidden);
  };

  const isSectionHidden = (sectionId: string) => (resume.hiddenSections || []).includes(sectionId);

  const moveArrayItem = <
    K extends 'education' | 'experience' | 'projects' | 'leadership' | 'certifications' | 'achievements'
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
                onClick={() => onOpenTemplates(resume)}
                className="inline-flex items-center px-3 py-1.5 text-xs font-semibold text-[#0f2b5c] bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded transition-colors cursor-pointer"
                title="Browse resume templates with previews"
              >
                <LayoutTemplate className="w-3.5 h-3.5 mr-1.5" />
                <span>Templates</span>
              </button>
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
              onClick={() => onPreview(resume)}
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
              onClick={onBackToDashboard}
              className="w-full inline-flex items-center text-xs font-semibold text-slate-600 hover:text-slate-900 py-1.5"
            >
              <ArrowLeft className="w-3.5 h-3.5 mr-1.5" />
              <span>Back to Dashboard</span>
            </button>
          </div>
        </nav>

        {/* Section Forms Container */}
        <main className="lg:col-span-8 bg-white border border-slate-200 rounded-lg p-6 sm:p-8 shadow-xs">
          {/* 1. Header / Personal Info */}
          {activeSection === 'header' && (
            <section aria-labelledby="section-header-title">
              <div className="border-b border-slate-200 pb-3 mb-5">
                <h2 id="section-header-title" className="text-lg font-bold text-slate-900">
                  {isClassicTemplate || isTwoColumnTemplate
                    ? 'Personal Header & Optional Photo'
                    : 'Personal Header'}
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  {isJakesTemplate
                    ? "Displayed centered at the top of Jake's Resume with small caps, address, and contact links."
                    : isSoftwareDevTemplate
                    ? 'Centered large blue full name, street/city address below, and horizontal icon contact links.'
                    : isClassicTemplate
                    ? 'Structured Classic Professional header with contact details, multiple phones, and an optional framed portrait photo.'
                    : isTwoColumnTemplate
                    ? 'Bold top header with tagline, compact icon contact links, and an optional circular profile photograph.'
                    : 'Displayed at the top-center of the formal academic CV.'}
                </p>
              </div>

              {(isClassicTemplate || isTwoColumnTemplate) && (
                <div className="mb-5 p-4 rounded-xl border border-slate-200 bg-slate-50/70">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                      {resume.personalInfo.photoUrl ? (
                        <img
                          src={resume.personalInfo.photoUrl}
                          alt="Profile portrait preview"
                          className={`bg-white object-cover shrink-0 shadow-xs ${
                            isTwoColumnTemplate || resume.personalInfo.photoShape === 'circle'
                              ? 'w-16 h-16 rounded-full border-2 border-[#e5c57a] ring-1 ring-[#8f131b]/30'
                              : resume.personalInfo.photoShape === 'square'
                              ? 'w-16 h-16 border-2 border-[#1e4e8c]'
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
                          {isTwoColumnTemplate
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
                    Street Address (Optional — displayed under name in Jake&apos;s Resume)
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

                {isSoftwareDevTemplate && !isTwoColumnTemplate && (
                  <div className="sm:col-span-2 pt-3 border-t border-slate-200">
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                        <Link2 className="w-3.5 h-3.5 text-slate-500" />
                        <span>Additional Portfolio / Coding Links (Optional)</span>
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
                              placeholder="Label (e.g. LeetCode / Blog)"
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

                {isClassicTemplate && (
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
                        placeholder="e.g. EU Work Authorization · Nationality"
                        className="w-full px-3 py-2 border border-slate-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
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
                    {isClassicTemplate
                      ? 'Professional Summary & Personal Quote'
                      : 'Career Objective / Professional Summary'}
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {isClassicTemplate
                      ? 'Concise professional overview plus an optional italic opening motto / quote displayed under your header.'
                      : 'Displayed underneath the OBJECTIVE section heading as a clean paragraph.'}
                  </p>
                </div>
                {resume.objective?.trim() && (
                  <button
                    type="button"
                    onClick={() =>
                      handleOpenImprove(
                        resume.objective || '',
                        isClassicTemplate ? 'Professional Summary' : 'Career Objective',
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
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    {isClassicTemplate ? 'Professional Summary' : 'Objective / Summary'}
                  </label>
                  <textarea
                    rows={5}
                    value={resume.objective || ''}
                    onChange={(e) => updateField('objective', e.target.value)}
                    placeholder="Dedicated computational biologist and machine learning researcher with 7+ years of experience..."
                    className="w-full p-3 border border-slate-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-slate-900 leading-relaxed font-serif"
                  />
                  <p className="text-xs text-slate-400 mt-1.5">
                    Leave empty if you prefer not to include a summary statement.
                  </p>
                </div>

                {isClassicTemplate && (
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
                      placeholder="e.g. Engineering resilient, privacy-first infrastructure through clarity and rigor."
                      className="w-full px-3 py-2 border border-slate-300 rounded text-sm italic bg-white focus:outline-none focus:ring-2 focus:ring-slate-900"
                    />
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
                    Education
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Degrees, universities, specializations, graduation dates, and achievements.
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
                            Thesis / Honors / Advisor
                          </label>
                          <input
                            type="text"
                            value={edu.achievements || ''}
                            onChange={(e) =>
                              updateEducation(edu.id, { achievements: e.target.value })
                            }
                            placeholder="e.g. Dissertation: Geometric Deep Learning | Advisor: Prof. Vance"
                            className="w-full px-3 py-1.5 border border-slate-300 rounded text-sm bg-white"
                          />
                        </div>

                        {isClassicTemplate && (
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
                              placeholder="e.g. Focus on distributed systems, applied cryptography, and container orchestration."
                              className="w-full p-2.5 border border-slate-300 rounded text-xs bg-white leading-relaxed"
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
                    Experience
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Appointments, professional employment, research fellowships, and internships.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={addExperience}
                  className="inline-flex items-center px-3 py-1.5 text-xs font-semibold text-white bg-slate-900 hover:bg-black rounded shadow-xs"
                >
                  <Plus className="w-3.5 h-3.5 mr-1" />
                  <span>Add Experience</span>
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

                        {isClassicTemplate && (
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

                      {isClassicTemplate && (
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

                      {isClassicTemplate &&
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
            </section>
          )}

          {/* 5. Patents & Publications */}
          {activeSection === 'publications' && (
            <section aria-labelledby="section-pub-title">
              <div className="border-b border-slate-200 pb-3 mb-5 flex items-center justify-between">
                <div>
                  <h2 id="section-pub-title" className="text-lg font-bold text-slate-900">
                    Patents &amp; Publications
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Peer-reviewed journals, conference papers, patents, manuscripts, and theses.
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
                        <button
                          type="button"
                          onClick={() => deletePublication(pub.id)}
                          className="p-1 text-slate-400 hover:text-red-600 rounded"
                          title="Delete entry"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
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

                            {isTwoColumnTemplate && (
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
                    Software systems, benchmark suites, research codebases, and technical tooling.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={addProject}
                  className="inline-flex items-center px-3 py-1.5 text-xs font-semibold text-white bg-slate-900 hover:bg-black rounded shadow-xs"
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
                        <div className={isSoftwareDevTemplate ? '' : 'sm:col-span-2'}>
                          <label className="block text-xs font-semibold text-slate-700 mb-1">
                            Project Name *
                          </label>
                          <input
                            type="text"
                            value={proj.title}
                            onChange={(e) => updateProject(proj.id, { title: e.target.value })}
                            placeholder="e.g. BioEquivariance Geometric Library"
                            className="w-full px-3 py-1.5 border border-slate-300 rounded text-sm bg-white"
                          />
                        </div>

                        {isSoftwareDevTemplate && (
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
                              placeholder="e.g. Open Source, Personal Project, Capstone"
                              className="w-full px-3 py-1.5 border border-slate-300 rounded text-sm bg-white"
                            />
                          </div>
                        )}

                        {isTwoColumnTemplate && (
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
                              placeholder="e.g. National Science Foundation (CCF-214091) or Course Project"
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
                  Strengths
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Add your own strengths or key skills to display as crisp outlined keyword tags in the right sidebar. No strengths are ever auto-assigned.
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
                    {isTwoColumnTemplate
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
                            <option value="">Unconfirmed (Hide dots)</option>
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
                          {isTwoColumnTemplate ? (
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
                                      return (
                                        <g key={dot}>
                                          <circle cx={cx} cy={7} r={5.5} fill="#e5e7eb" stroke="#8f131b" strokeWidth={1} />
                                          {filled && <circle cx={cx} cy={7} r={5} fill="#8f131b" />}
                                          {half && (
                                            <path
                                              d={`M ${cx} 2 A 5 5 0 0 0 ${cx} 12 Z`}
                                              fill="#8f131b"
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

          {/* 7. Skills */}
          {activeSection === 'skills' && (
            <section aria-labelledby="section-skills-title">
              <div className="border-b border-slate-200 pb-3 mb-5 flex items-center justify-between">
                <div>
                  <h2 id="section-skills-title" className="text-lg font-bold text-slate-900">
                    {isClassicTemplate ? 'Computer Skills' : 'Skills by Category'}
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {isClassicTemplate
                      ? 'Compact categorized computer & technical skills (e.g. Programming Languages, Operating Systems, Frameworks, Tools).'
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
                  </div>
                ))}
              </div>
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
                    Additional Information &amp; Custom Sections
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Create custom sections (Certifications, Awards, Volunteer Work, Workshops, Publications, etc.).
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

              <p className="text-[11px] text-slate-500 mt-4">
                Note: Any Projects, Publications, Awards, Certifications, or Leadership data entered in Academic CV or Jake&apos;s Resume stays preserved and also renders cleanly in Preview/PDF.
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
                      : 'Honors & Awards'}
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {isTwoColumnTemplate
                      ? 'Highlight proud milestones, honors, or recognition with selectable burgundy sidebar icons.'
                      : isSoftwareDevTemplate
                      ? 'Hackathon wins, engineering awards, or scholarships shown under ADDITIONAL → Achievements. Optional.'
                      : 'Fellowships, best paper awards, teaching recognition, and academic honors.'}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={addAward}
                  className="inline-flex items-center px-3 py-1.5 text-xs font-semibold text-white bg-slate-900 hover:bg-black rounded shadow-xs"
                >
                  <Plus className="w-3.5 h-3.5 mr-1" />
                  <span>
                    {isTwoColumnTemplate
                      ? 'Add Milestone'
                      : isSoftwareDevTemplate
                      ? 'Add Achievement'
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
            </section>
          )}

          {/* 9. Leadership */}
          {activeSection === 'leadership' && (
            <section aria-labelledby="section-lead-title">
              <div className="border-b border-slate-200 pb-3 mb-5 flex items-center justify-between">
                <div>
                  <h2 id="section-lead-title" className="text-lg font-bold text-slate-900">
                    {isSoftwareDevTemplate ? 'Leadership and Activities' : 'Leadership Experience'}
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {isSoftwareDevTemplate
                      ? 'Engineering clubs, hackathon organizing, mentoring, or open-source governance under ADDITIONAL.'
                      : 'Conference organization, lab management, student association presidencies.'}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={addLeadership}
                  className="inline-flex items-center px-3 py-1.5 text-xs font-semibold text-white bg-slate-900 hover:bg-black rounded shadow-xs"
                >
                  <Plus className="w-3.5 h-3.5 mr-1" />
                  <span>Add Leadership</span>
                </button>
              </div>

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
                    Certifications
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Professional credentials, licenses, and verified certifications.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={addCertification}
                  className="inline-flex items-center px-3 py-1.5 text-xs font-semibold text-white bg-slate-900 hover:bg-black rounded shadow-xs"
                >
                  <Plus className="w-3.5 h-3.5 mr-1" />
                  <span>Add Certificate</span>
                </button>
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
                  Additional Information
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Languages with proficiencies, scholarly interests, and background.
                </p>
              </div>

              <div className="space-y-4">
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

                <div className="pt-3 border-t border-slate-200">
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Scholarly / Professional Interests
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
                {((!isClassicTemplate && !isTwoColumnTemplate) ||
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

              {(isClassicTemplate || isTwoColumnTemplate) && (
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

              {(isClassicTemplate || isTwoColumnTemplate) &&
              resume.referencesDisplayMode === 'on-request' ? (
                <div className="p-6 text-center border border-slate-200 bg-slate-50 rounded-lg text-xs text-slate-600">
                  Your CV will display: <strong className="text-slate-900">References available upon request.</strong>
                </div>
              ) : (isClassicTemplate || isTwoColumnTemplate) &&
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

                        {isTwoColumnTemplate && (
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
                  onPreview(resume);
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
          saveResume(resume.userId, updated);
          onSave(updated);
        }}
      />

      {/* Upload CV PDF Extraction Modal */}
      <UploadCvModal
        isOpen={isUploadOpen}
        onClose={() => setIsUploadOpen(false)}
        onExtracted={(extracted) => {
          setResume(extracted);
          saveResume(resume.userId, extracted);
          onSave(extracted);
        }}
        userId={resume.userId}
      />

      {/* Completeness Dashboard Modal */}
      <CompletenessReportModal
        isOpen={isCompletenessOpen}
        onClose={() => setIsCompletenessOpen(false)}
        report={completenessReport}
        templateName={activeTemplate.name}
        onPreview={() => onPreview(resume)}
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
