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
} from 'lucide-react';
import type {
  Resume,
  PersonalInfo,
  ExperienceItem,
  EducationItem,
  SkillCategory,
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
  SAMPLE_ACADEMIC_CV,
  SAMPLE_EXPERIENCED_CV,
  SAMPLE_FRESHER_CV,
  SAMPLE_STUDENT_CV,
  BLANK_ACADEMIC_CV,
} from '../../data/sampleResumes';
import { analyzeResumeSections } from '../../utils/validation';
import { AiImproveModal } from '../AiAssistant/AiImproveModal';
import { AiInterviewModal } from '../AiAssistant/AiInterviewModal';
import { UploadCvModal } from '../AiExtraction/UploadCvModal';
import { CompletenessReportModal } from '../Completeness/CompletenessReportModal';

interface ResumeEditorPageProps {
  initialResume: Resume;
  onSave: (resume: Resume) => void;
  onPreview: (resume: Resume) => void;
  onBackToDashboard: () => void;
}

type EditorSectionId =
  | 'header'
  | 'objective'
  | 'experience'
  | 'education'
  | 'projects'
  | 'publications'
  | 'skills'
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

export const ResumeEditorPage: React.FC<ResumeEditorPageProps> = ({
  initialResume,
  onSave,
  onPreview,
  onBackToDashboard,
}) => {
  const [resume, setResume] = useState<Resume>(initialResume);
  const [activeSection, setActiveSection] = useState<EditorSectionId>('header');
  const [saving, setSaving] = useState(false);
  const [justSaved, setJustSaved] = useState(false);
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [isInterviewOpen, setIsInterviewOpen] = useState(false);
  const [isCompletenessOpen, setIsCompletenessOpen] = useState(false);
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

  const completenessReport = analyzeResumeSections(resume);

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

  const handleLoadProfile = (type: 'academic' | 'experienced' | 'fresher' | 'student' | 'blank') => {
    const confirmation = window.confirm(
      `Load sample profile for "${type.toUpperCase()}"? This will populate fields with standard academic CV data.`
    );
    if (!confirmation) return;

    let sampleBase: Omit<Resume, 'id' | 'userId' | 'createdAt' | 'updatedAt'>;
    switch (type) {
      case 'academic':
        sampleBase = SAMPLE_ACADEMIC_CV;
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

  /* ====================== SUB-SECTION HANDLERS ====================== */
  // Personal Info
  const updatePersonalInfo = (field: keyof PersonalInfo, val: string) => {
    updateField('personalInfo', {
      ...resume.personalInfo,
      [field]: val,
    });
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
  const addSkillCategory = () => {
    const item: SkillCategory = {
      id: `skill_${Date.now()}`,
      category: 'New Category',
      skills: [],
    };
    updateField('skills', [...(resume.skills || []), item]);
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
      <div className="bg-white border border-slate-200 rounded-lg p-4 mb-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Title */}
        <div className="flex-1">
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

        {/* Preset Profiles Dropdown & Actions */}
        <div className="flex items-center flex-wrap gap-2 justify-end shrink-0 pt-2 md:pt-0">
          <div className="flex items-center space-x-1 bg-slate-100 p-1 rounded text-xs">
            <span className="font-semibold text-slate-600 px-1">Load Preset:</span>
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
              onClick={() => handleLoadProfile('student')}
              className="px-2 py-1 bg-white hover:bg-slate-50 text-slate-800 font-medium rounded shadow-xs"
              title="Undergraduate Student"
            >
              Student
            </button>
          </div>

          {/* AI Tools & Completeness Badges */}
          <div className="flex items-center space-x-1.5">
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
              title="Click to view 14-section completeness audit"
            >
              <TrendingUp className="w-3.5 h-3.5 mr-1 text-emerald-700" />
              <span>{completenessReport.overallScore}% Ready</span>
            </button>
          </div>

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

      {/* Editor Body: Sidebar + Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Navigation Sidebar */}
        <nav
          className="lg:col-span-4 bg-white border border-slate-200 rounded-lg p-2.5 shadow-xs space-y-1"
          aria-label="CV sections"
        >
          <div className="px-3 py-2 text-xs font-bold uppercase tracking-wider text-slate-500 flex justify-between items-center">
            <span>14 CV Sections</span>
            <button
              type="button"
              onClick={() => setIsCompletenessOpen(true)}
              className="text-[11px] font-bold text-indigo-600 hover:text-indigo-800 cursor-pointer"
              title="View full completeness audit"
            >
              Audit ({completenessReport.overallScore}%)
            </button>
          </div>

          {SECTIONS.map((sec) => {
            const Icon = sec.icon;
            const isActive = activeSection === sec.id;
            const hidden = isSectionHidden(sec.id);

            return (
              <div
                key={sec.id}
                className={`flex items-center justify-between rounded text-sm transition-colors ${
                  isActive
                    ? 'bg-slate-900 text-white shadow-xs font-semibold'
                    : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
                }`}
              >
                <button
                  type="button"
                  onClick={() => setActiveSection(sec.id)}
                  className="flex-1 flex items-center space-x-2.5 px-3 py-2 text-left"
                >
                  <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                  <span className={`truncate text-xs ${hidden ? 'line-through opacity-60' : ''}`}>
                    {sec.label}
                  </span>
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
                  Personal Header
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Displayed at the top-center of the formal academic CV.
                </p>
              </div>

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
              </div>
            </section>
          )}

          {/* 2. Objective / Summary */}
          {activeSection === 'objective' && (
            <section aria-labelledby="section-objective-title">
              <div className="border-b border-slate-200 pb-3 mb-5 flex items-center justify-between">
                <div>
                  <h2 id="section-objective-title" className="text-lg font-bold text-slate-900">
                    Career Objective / Professional Summary
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Displayed underneath the OBJECTIVE section heading as a clean paragraph.
                  </p>
                </div>
                {resume.objective?.trim() && (
                  <button
                    type="button"
                    onClick={() =>
                      handleOpenImprove(
                        resume.objective || '',
                        'Career Objective',
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

              <div>
                <textarea
                  rows={6}
                  value={resume.objective || ''}
                  onChange={(e) => updateField('objective', e.target.value)}
                  placeholder="Dedicated computational biologist and machine learning researcher with 7+ years of experience..."
                  className="w-full p-3 border border-slate-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-slate-900 leading-relaxed font-serif"
                />
                <p className="text-xs text-slate-400 mt-1.5">
                  Leave empty if you prefer not to include an objective statement.
                </p>
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
                        <button
                          type="button"
                          onClick={() => deleteEducation(edu.id)}
                          className="p-1 text-slate-400 hover:text-red-600 rounded"
                          title="Delete entry"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
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
                      </div>
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
                        <button
                          type="button"
                          onClick={() => deleteExperience(exp.id)}
                          className="p-1 text-slate-400 hover:text-red-600 rounded"
                          title="Delete entry"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
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
                            <option value="journal">Journal Paper</option>
                            <option value="conference">Conference Proceeding</option>
                            <option value="patent">Granted Patent / Filing</option>
                            <option value="manuscript">Submitted Manuscript</option>
                            <option value="thesis">Thesis / Dissertation</option>
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
                        <button
                          type="button"
                          onClick={() => deleteProject(proj.id)}
                          className="p-1 text-slate-400 hover:text-red-600 rounded"
                          title="Delete entry"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="sm:col-span-2">
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

                        <div>
                          <label className="block text-xs font-semibold text-slate-700 mb-1">
                            Project / Code URL
                          </label>
                          <input
                            type="text"
                            value={proj.link || ''}
                            onChange={(e) => updateProject(proj.id, { link: e.target.value })}
                            placeholder="e.g. https://github.com/lab/project"
                            className="w-full px-3 py-1.5 border border-slate-300 rounded text-sm bg-white"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-semibold text-slate-700 mb-1">
                            Dates (e.g. 2022 – 2024)
                          </label>
                          <input
                            type="text"
                            value={proj.startDate || ''}
                            onChange={(e) => updateProject(proj.id, { startDate: e.target.value })}
                            placeholder="e.g. 2022 – Present"
                            className="w-full px-3 py-1.5 border border-slate-300 rounded text-sm bg-white"
                          />
                        </div>

                        <div className="sm:col-span-2">
                          <label className="block text-xs font-semibold text-slate-700 mb-1">
                            Technologies &amp; Tools Used (Comma-separated)
                          </label>
                          <input
                            type="text"
                            value={(proj.technologies || []).join(', ')}
                            onChange={(e) =>
                              updateProject(proj.id, {
                                technologies: e.target.value
                                  .split(',')
                                  .map((s) => s.trim())
                                  .filter(Boolean),
                              })
                            }
                            placeholder="e.g. Python, PyTorch, CUDA, C++"
                            className="w-full px-3 py-1.5 border border-slate-300 rounded text-sm bg-white"
                          />
                        </div>

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
                                    proj.description,
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

          {/* 7. Skills */}
          {activeSection === 'skills' && (
            <section aria-labelledby="section-skills-title">
              <div className="border-b border-slate-200 pb-3 mb-5 flex items-center justify-between">
                <div>
                  <h2 id="section-skills-title" className="text-lg font-bold text-slate-900">
                    Skills by Category
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Organize skills into research foundations, programming, tools, and platforms.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={addSkillCategory}
                  className="inline-flex items-center px-3 py-1.5 text-xs font-semibold text-white bg-slate-900 hover:bg-black rounded shadow-xs"
                >
                  <Plus className="w-3.5 h-3.5 mr-1" />
                  <span>Add Category</span>
                </button>
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

          {/* 8. Honors & Awards */}
          {activeSection === 'awards' && (
            <section aria-labelledby="section-awards-title">
              <div className="border-b border-slate-200 pb-3 mb-5 flex items-center justify-between">
                <div>
                  <h2 id="section-awards-title" className="text-lg font-bold text-slate-900">
                    Honors &amp; Awards
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Fellowships, best paper awards, teaching recognition, and academic honors.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={addAward}
                  className="inline-flex items-center px-3 py-1.5 text-xs font-semibold text-white bg-slate-900 hover:bg-black rounded shadow-xs"
                >
                  <Plus className="w-3.5 h-3.5 mr-1" />
                  <span>Add Award</span>
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
                  {resume.achievements.map((ach) => (
                    <div
                      key={ach.id}
                      className="p-3.5 border border-slate-200 rounded-lg bg-slate-50/50 space-y-2"
                    >
                      <div className="flex justify-between items-center">
                        <span className="text-xs font-bold text-slate-700">Award Entry</span>
                        <button
                          type="button"
                          onClick={() => deleteAward(ach.id)}
                          className="p-1 text-slate-400 hover:text-red-600 rounded"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
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
                    Leadership Experience
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Conference organization, lab management, student association presidencies.
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
                  {resume.leadership.map((lead) => (
                    <div
                      key={lead.id}
                      className="p-4 border border-slate-200 rounded-lg bg-slate-50/50 space-y-3"
                    >
                      <div className="flex justify-between items-center">
                        <span className="text-xs font-bold text-slate-700">Leadership Entry</span>
                        <button
                          type="button"
                          onClick={() => deleteLeadership(lead.id)}
                          className="p-1 text-slate-400 hover:text-red-600 rounded"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
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
                  {resume.certifications.map((c) => (
                    <div
                      key={c.id}
                      className="p-3.5 border border-slate-200 rounded-lg bg-slate-50/50 space-y-2"
                    >
                      <div className="flex justify-between items-center">
                        <span className="text-xs font-bold text-slate-700">Certificate</span>
                        <button
                          type="button"
                          onClick={() => deleteCertification(c.id)}
                          className="p-1 text-slate-400 hover:text-red-600 rounded"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
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
                            placeholder="e.g. NVIDIA Certified Instructor"
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
                            placeholder="e.g. NVIDIA DLI"
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
                            placeholder="e.g. 2022"
                            className="w-full px-2.5 py-1.5 border border-slate-300 rounded text-xs bg-white"
                          />
                        </div>

                        <div>
                          <label className="block text-[11px] font-semibold text-slate-700 mb-0.5">
                            Credential ID / Link
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

          {/* 14. References */}
          {activeSection === 'references' && (
            <section aria-labelledby="section-ref-title">
              <div className="border-b border-slate-200 pb-3 mb-5 flex items-center justify-between">
                <div>
                  <h2 id="section-ref-title" className="text-lg font-bold text-slate-900">
                    References
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Optional academic advisors, dissertation committee members, or professional supervisors.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={addReference}
                  className="inline-flex items-center px-3 py-1.5 text-xs font-semibold text-white bg-slate-900 hover:bg-black rounded shadow-xs"
                >
                  <Plus className="w-3.5 h-3.5 mr-1" />
                  <span>Add Reference</span>
                </button>
              </div>

              {(!resume.references || resume.references.length === 0) ? (
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
                const idx = SECTIONS.findIndex((s) => s.id === activeSection);
                if (idx > 0) setActiveSection(SECTIONS[idx - 1].id);
              }}
              disabled={activeSection === SECTIONS[0].id}
              className="inline-flex items-center px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded disabled:opacity-40 transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5 mr-1" />
              <span>Previous Section</span>
            </button>

            <button
              type="button"
              onClick={() => {
                const idx = SECTIONS.findIndex((s) => s.id === activeSection);
                if (idx < SECTIONS.length - 1) {
                  setActiveSection(SECTIONS[idx + 1].id);
                } else {
                  onPreview(resume);
                }
              }}
              className="inline-flex items-center px-4 py-1.5 text-xs font-semibold text-white bg-slate-900 hover:bg-black rounded shadow-xs transition-colors"
            >
              <span>
                {activeSection === SECTIONS[SECTIONS.length - 1].id
                  ? 'Finish & View Academic CV'
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
        onNavigateToSection={(secId) => {
          setActiveSection(secId as EditorSectionId);
        }}
      />
    </div>
  );
};
