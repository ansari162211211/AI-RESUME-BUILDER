import React, { useState, useEffect, useRef } from 'react';
import {
  MessageSquare,
  Sparkles,
  Send,
  X,
  Loader2,
  Check,
  ArrowRight,
  SkipForward,
  User,
  Users,
  GraduationCap,
  Briefcase,
  Code2,
  BookOpen,
} from 'lucide-react';
import { sendInterviewStepWithGemini } from '../../services/aiService';
import { resolveTemplateId } from '../../data/templates';
import { validateDailyActivities } from '../../utils/dailyActivities';
import type { Resume, InterviewChatMessage } from '../../types/resume';

interface AiInterviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentResume: Resume;
  onApplyUpdates: (updatedResume: Resume) => void;
}

const ACADEMIC_SECTION_FLOW = [
  'personalInfo',
  'objective',
  'experience',
  'education',
  'projects',
  'publications',
  'skills',
  'achievements',
  'leadership',
  'volunteer',
  'memberships',
  'certifications',
  'additional',
  'references',
];

const JAKES_SECTION_FLOW = [
  'personalInfo',
  'education',
  'coursework',
  'experience',
  'projects',
  'skills',
  'leadership',
];

const CLASSIC_SECTION_FLOW = [
  'personalInfo',
  'objective',
  'education',
  'thesis',
  'experience',
  'languages',
  'skills',
  'skill-matrix',
  'interests',
  'custom-sections',
  'references',
];

const TWO_COLUMN_SECTION_FLOW = [
  'personalInfo',
  'experience',
  'projects',
  'daily-life',
  'publications',
  'philosophy',
  'achievements',
  'strengths',
  'languages',
  'education',
  'references',
  'custom-sections',
];

const SOFTWARE_DEV_SECTION_FLOW = [
  'personalInfo',
  'education',
  'experience',
  'projects',
  'coursework',
  'skills',
  'leadership',
  'certifications',
  'achievements',
];

const HARVARD_SECTION_FLOW = [
  'personalInfo',
  'education',
  'study-abroad',
  'high-school',
  'experience',
  'leadership',
  'skills',
  'languages',
  'lab-skills',
  'interests',
  'custom-sections',
];

const ELEGANT_SERIF_SECTION_FLOW = [
  'personalInfo',
  'objective',
  'education',
  'experience',
  'research',
  'projects',
  'publications',
  'achievements',
  'skills',
  'languages',
  'certifications',
  'leadership',
  'memberships',
  'interests',
  'references',
];

const MODERN_CORPORATE_SECTION_FLOW = [
  'personalInfo',
  'objective',
  'experience',
  'strengths',
  'education',
  'skills',
  'projects',
  'certifications',
  'achievements',
  'languages',
  'leadership',
  'memberships',
  'interests',
  'references',
  'custom-sections',
];

const FRESHER_RESUME_SECTION_FLOW = [
  'personalInfo',
  'strengths',
  'objective',
  'education',
  'projects',
  'experience',
  'coursework',
  'skills',
  'publications',
  'achievements',
  'certifications',
  'leadership',
  'volunteer',
  'languages',
  'interests',
  'custom-sections',
];

const INTERNSHIP_RESUME_SECTION_FLOW = [
  'personalInfo',
  'education',
  'learning',
  'interests',
  'research',
  'career-interests',
  'achievements',
  'skills',
  'experience',
  'certifications',
  'languages',
  'custom-sections',
];

const SECTION_LABELS: Record<string, string> = {
  personalInfo: 'Personal Info',
  objective: 'Profile / Summary',
  education: 'Education',
  learning: 'Learning & Training',
  'study-abroad': 'Study Abroad',
  'high-school': 'High School',
  thesis: "Master's Thesis",
  coursework: 'Coursework',
  experience: 'Experience',
  research: 'Research & Projects',
  'career-interests': 'Career Interests',
  'daily-life': 'A Day of My Life',
  philosophy: 'Life Philosophy',
  languages: 'Languages',
  projects: 'Projects',
  publications: 'Publications',
  skills: 'Skills',
  'lab-skills': 'Lab Skills',
  'skill-matrix': 'Skill Matrix',
  strengths: 'Core Competencies / Strengths',
  interests: 'Interests',
  'custom-sections': 'Additional Info',
  achievements: 'Co-Curricular & Awards',
  leadership: 'Leadership & Activities',
  volunteer: 'Volunteer',
  memberships: 'Memberships',
  certifications: 'Certifications',
  additional: 'Additional',
  references: 'Referees / References',
};

export const AiInterviewModal: React.FC<AiInterviewModalProps> = ({
  isOpen,
  onClose,
  currentResume,
  onApplyUpdates,
}) => {
  const [messages, setMessages] = useState<InterviewChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);
  const [currentSectionIndex, setCurrentSectionIndex] = useState(0);
  const [stagedResume, setStagedResume] = useState<Resume>(currentResume);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const templateId = resolveTemplateId(currentResume.template);
  const isJakes = templateId === 'jakes-resume';
  const isClassic = templateId === 'classic-professional';
  const isTwoColumn = templateId === 'two-column-professional';
  const isSoftwareDev = templateId === 'software-developer';
  const isHarvard = templateId === 'harvard-style';
  const isElegantSerif = templateId === 'elegant-serif';
  const isModernCorporate = templateId === 'modern-corporate';
  const isFresherResume = templateId === 'fresher-resume';
  const isInternshipResume = templateId === 'internship-resume';
  const sectionFlow = isJakes
    ? JAKES_SECTION_FLOW
    : isClassic
    ? CLASSIC_SECTION_FLOW
    : isTwoColumn
    ? TWO_COLUMN_SECTION_FLOW
    : isSoftwareDev
    ? SOFTWARE_DEV_SECTION_FLOW
    : isHarvard
    ? HARVARD_SECTION_FLOW
    : isElegantSerif
    ? ELEGANT_SERIF_SECTION_FLOW
    : isModernCorporate
    ? MODERN_CORPORATE_SECTION_FLOW
    : isFresherResume
    ? FRESHER_RESUME_SECTION_FLOW
    : isInternshipResume
    ? INTERNSHIP_RESUME_SECTION_FLOW
    : ACADEMIC_SECTION_FLOW;
  const activeSection = sectionFlow[currentSectionIndex] || 'personalInfo';

  useEffect(() => {
    if (isOpen) {
      setStagedResume(currentResume);
      // Start greeting if empty
      if (messages.length === 0) {
        startInitialTurn();
      }
    }
  }, [isOpen]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const startInitialTurn = async () => {
    setLoading(true);
    try {
      const initialName = currentResume.personalInfo.fullName;
      const hasEdu = (currentResume.education || []).length > 0;
      const hasExp = (currentResume.experience || []).length > 0;

      const initialGreeting = isJakes
        ? initialName
          ? `Hello ${initialName}! I'm your AI Resume Advisor for Jake's Resume. Let's collect clean, high-impact details for your Education, Relevant Coursework, Experience, Projects, Technical Skills, and Leadership. Where should we start?`
          : `Welcome! I'm your AI Resume Advisor for Jake's Resume. Let's gather your contact info, university degree, relevant coursework, internships/work experience, and technical projects step by step. First, what is your full name, location, and target role?`
        : isSoftwareDev
        ? initialName
          ? `Hello ${initialName}! I'm your Software Developer Resume Advisor. Let's build or refine your Education, Software Experience, Projects (stack & outcomes), Programming Languages, Developer Tools, Technologies & Frameworks, plus optional Coursework, Leadership, Certifications, and Achievements. What would you like to add or polish first?`
          : `Welcome! I'm your Software Developer Resume Advisor. We'll assemble your structured technical resume: contact header, Education, Experience, Technical Projects, and Additional subsections (Coursework, Programming Languages, Developer Tools, Technologies & Frameworks, Leadership, Certifications, Achievements). What is your full name, location, and email or GitHub handle?`
        : isClassic
        ? initialName
          ? `Hello ${initialName}! I'm your Classic Professional CV Advisor. I already see your basic contact details${hasEdu ? ' and education' : ''}${hasExp ? ' and experience' : ''}. Would you like to refine your Summary & Quote, add your Master's Thesis, update your Skill Matrix, or review another section?`
          : `Welcome! I'm your Classic Professional CV Advisor. We'll build your structured CV step by step—personal info, summary, education, optional thesis, vocational/professional experience, languages, computer skills, skill matrix, interests, custom sections, and references. First, what is your full name, city/country, and target role?`
        : isHarvard
        ? initialName
          ? `Hello ${initialName}! I'm your Harvard Style Resume Advisor. We'll refine your Education (including optional Study Abroad or High School), action-verb Experience bullets, Leadership & Activities, Skills & Interests, and optional Additional Information. First, are you building this as a College Student, Fresher / Recent Graduate, or Experienced Professional?`
          : `Welcome! I'm your Harvard Style Resume Advisor. I'll guide you through building a crisp, traditional Harvard-style resume—one step at a time, skipping any optional section you don't need. To begin, are you a College Student, Fresher / Recent Graduate, or Experienced Professional, and what is your full name & email?`
        : isElegantSerif
        ? initialName
          ? `Hello ${initialName}! I'm your Elegant Serif CV Advisor. Together we'll shape your Professional Profile, Education, Experience, Research Experience, Publications, Awards, Skills, Languages, and optional academic sections—omitting anything not needed. Are you preparing this CV as a Student, Fresher, Experienced Professional, or Researcher / Academic?`
          : `Welcome! I'm your Elegant Serif CV Advisor (Modern Simple CV style). We'll craft a refined, scholarly CV one section at a time and skip any optional section you don't need. To start, are you a Student, Fresher, Experienced Professional, or Researcher / Academic, and what is your full name & email?`
        : isModernCorporate
        ? initialName
          ? `Hello ${initialName}! I'm your Modern Corporate CV Advisor (ModernCV Classic). We'll polish your executive header, Professional Summary, Work Experience, Core Competencies, Education, Technical Skills, and optional corporate sections—skipping anything you don't need. Are you preparing this resume as a Corporate & Management Professional, Experienced Professional, Student, Fresher, or Technical Specialist?`
          : `Welcome! I'm your Modern Corporate CV Advisor (Overleaf ModernCV Classic). We'll structure your ATS-friendly corporate resume step by step and skip any optional section cleanly. First, are you applying as a Corporate & Management Professional, Experienced Professional, Student, Fresher, or Technical Specialist, and what is your full name, target title, and email?`
        : isFresherResume
        ? initialName
          ? `Hello ${initialName}! I'm your Fresher Resume Advisor. We'll craft a crisp Overleaf-style student & graduate resume—leading with your Education, Projects, optional Internships, Skills, and Honors while skipping any empty sections cleanly. First, which track fits you best: Engineering, Computer Science, Cybersecurity, Non-Technical, or Recent Graduate?`
          : `Welcome! I'm your Fresher Resume Advisor. Let's build your ATS-friendly student & graduate resume step by step (omitting internships or optional sections cleanly if you don't have them). To begin, which track are you targeting—Engineering, Computer Science, Cybersecurity, Non-Technical, or Recent Graduate—and what is your full name, target role, and email?`
        : isInternshipResume
        ? initialName
          ? `Hello ${initialName}! I'm your Internship Resume Advisor. We'll assemble your two-column student & internship resume step by step—Education, optional Learning Activities, Interests, Research & Capstone Projects, Career Interests, Co-Curriculars, Skills (dots stay hidden unless you assign 1–5 yourself), and optional Prior Internships. Which internship track fits you best: Computer Science, Cybersecurity, ECE, Research, or Non-Technical?`
          : `Welcome! I'm your Internship Resume Advisor. I'll guide you through building an authentic two-column internship resume—omitting any optional sections you don't have and never inventing metrics or skill dots. First, which internship track fits you best (CS, Cybersecurity, ECE, Research, or Non-Technical), and what is your full name, target internship role, and email?`
        : isTwoColumn
        ? initialName
          ? `Hello ${initialName}! I'm your Two Column Professional CV Advisor. Let's craft or refine your header & tagline, experience, projects, optional "A Day of My Life" breakdown, publications, philosophy, proudest achievements, strengths, languages, education, and referees. You can skip any optional section at any time—where would you like to focus?`
          : `Welcome! I'm your Two Column Professional CV Advisor. We'll walk through your two-column CV step by step (and skip any optional section you don't need). To start, what is your full name, professional tagline/role, and email address?`
        : initialName
        ? `Hello ${initialName}! I am your AI CV Advisor. I'll help you craft a comprehensive academic CV step by step. Let's start with your Education or Work Experience: What is your current highest degree and which institution are you affiliated with?`
        : `Welcome! I am your AI CV Advisor. I'm here to interview you and help build your complete Academic CV with rich, detailed bullet points. To begin, what is your full name and current target role or research area?`;

      const botMsg: InterviewChatMessage = {
        id: `msg_${Date.now()}`,
        role: 'assistant',
        content: initialGreeting,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        suggestedChips: isJakes
          ? [
              'B.S. in Computer Science',
              'Add Relevant Coursework',
              'Software Engineer Intern',
              'Skip to Projects',
            ]
          : isSoftwareDev
          ? [
              'Add Education & Degree',
              'Add Software Engineering Experience',
              'Add Technical Project',
              'Add Languages, Tools & Frameworks',
            ]
          : isHarvard
          ? [
              'College Student',
              'Fresher / Recent Graduate',
              'Experienced Professional',
              'Add Education & Coursework',
            ]
          : isElegantSerif
          ? [
              'Researcher / Academic',
              'Experienced Professional',
              'Student / Graduate Applicant',
              'Add Education & Research',
            ]
          : isModernCorporate
          ? [
              'Corporate & Management',
              'Experienced Professional',
              'Student / Fresh Graduate',
              'Add Work Experience & Results',
            ]
          : isFresherResume
          ? [
              'Computer Science Track',
              'Engineering Track',
              'Cybersecurity Track',
              'Non-Technical Graduate',
            ]
          : isInternshipResume
          ? [
              'Computer Science Internship',
              'Cybersecurity Internship',
              'Research Internship',
              'ECE / Hardware Internship',
            ]
          : isClassic
          ? [
              'Refine Summary & Quote',
              'Add Experience or Internship',
              'Build Skill Matrix (1-5)',
              'Set References on Request',
            ]
          : isTwoColumn
          ? [
              'Add Experience or Internships',
              'Add Research or Engineering Projects',
              'Add My Core Strengths',
              'Skip A Day of My Life',
            ]
          : [
              'B.S. in Computer Science',
              'Ph.D. Candidate & Researcher',
              'Software Engineer',
              'Skip to Experience',
            ],
      };
      setMessages([botMsg]);
    } finally {
      setLoading(false);
    }
  };

  const handleSendMessage = async (textToSend?: string) => {
    const text = (textToSend || inputText).trim();
    if (!text || loading) return;

    const userMsg: InterviewChatMessage = {
      id: `msg_u_${Date.now()}`,
      role: 'user',
      content: text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    const newHistory = [...messages, userMsg];
    setMessages(newHistory);
    setInputText('');
    setLoading(true);

    try {
      // Send conversation history to backend Gemini API
      const historyPayload = newHistory.map((m) => ({
        role: m.role,
        content: m.content,
      }));

      const res = await sendInterviewStepWithGemini(
        historyPayload,
        stagedResume,
        activeSection,
        text
      );

      // Merge any extracted updates into the staged resume
      if (res.structuredUpdates && Object.keys(res.structuredUpdates).length > 0) {
        setStagedResume((prev) => {
          const updated = { ...prev };
          const u = res.structuredUpdates;

          if (u.personalInfo) {
            updated.personalInfo = { ...prev.personalInfo, ...u.personalInfo };
          }
          if (u.personalQuote) {
            updated.personalQuote = u.personalQuote;
          }
          if (u.objective) {
            updated.objective = u.objective;
          }
          if (u.academicInterests) {
            updated.academicInterests = u.academicInterests;
          }
          if (u.careerGoals) {
            updated.careerGoals = u.careerGoals;
          }
          if (u.thesis && (u.thesis.title || u.thesis.description || u.thesis.supervisors)) {
            updated.thesis = { ...(prev.thesis || { title: '' }), ...u.thesis };
          }
          if (Array.isArray(u.coursework) && u.coursework.length > 0) {
            const merged = new Set([
              ...(prev.coursework || []).map((c) => c.trim()).filter(Boolean),
              ...u.coursework
                .filter((c): c is string => typeof c === 'string')
                .map((c) => c.trim())
                .filter(Boolean),
            ]);
            updated.coursework = Array.from(merged);
          }
          if (
            u.targetBackground === 'student' ||
            u.targetBackground === 'fresher' ||
            u.targetBackground === 'experienced' ||
            u.targetBackground === 'researcher' ||
            u.targetBackground === 'corporate' ||
            u.targetBackground === 'technical'
          ) {
            updated.targetBackground = u.targetBackground;
          }
          if (
            u.fresherTrack === 'engineering' ||
            u.fresherTrack === 'cs' ||
            u.fresherTrack === 'cybersecurity' ||
            u.fresherTrack === 'non-technical' ||
            u.fresherTrack === 'graduate'
          ) {
            updated.fresherTrack = u.fresherTrack;
          }
          if (
            u.internshipTrack === 'cs' ||
            u.internshipTrack === 'cybersecurity' ||
            u.internshipTrack === 'ece' ||
            u.internshipTrack === 'research' ||
            u.internshipTrack === 'non-technical'
          ) {
            updated.internshipTrack = u.internshipTrack;
          }
          if (Array.isArray(u.learningActivities) && u.learningActivities.length > 0) {
            const sanitizedLearning = u.learningActivities
              .filter((item: any) => item && typeof item.title === 'string' && item.title.trim())
              .map((item: any, idx: number) => ({
                id: item.id || `learn_${Date.now()}_${idx}`,
                title: item.title.trim(),
                activityType: item.activityType || 'Course',
                subject: typeof item.subject === 'string' ? item.subject.trim() : '',
                provider: typeof item.provider === 'string' ? item.provider.trim() : '',
                instructor: typeof item.instructor === 'string' ? item.instructor.trim() : '',
                completionDate: typeof item.completionDate === 'string' ? item.completionDate.trim() : '',
                certificateId: typeof item.certificateId === 'string' ? item.certificateId.trim() : '',
                credentialUrl: typeof item.credentialUrl === 'string' ? item.credentialUrl.trim() : '',
                skillsAcquired: Array.isArray(item.skillsAcquired)
                  ? item.skillsAcquired.filter((s: unknown): s is string => typeof s === 'string' && s.trim().length > 0).map((s: string) => s.trim())
                  : [],
                description: typeof item.description === 'string' ? item.description.trim() : '',
              }));
            if (sanitizedLearning.length > 0) {
              updated.learningActivities = [...(prev.learningActivities || []), ...sanitizedLearning];
            }
          }
          if (Array.isArray(u.careerInterests) && u.careerInterests.length > 0) {
            const existing = (prev.careerInterests || []).map((c) => c.trim()).filter(Boolean);
            const seen = new Set(existing.map((c) => c.toLowerCase()));
            const nextCareer = [...existing];
            for (const c of u.careerInterests) {
              if (typeof c === 'string' && c.trim() && !seen.has(c.trim().toLowerCase())) {
                nextCareer.push(c.trim());
                seen.add(c.trim().toLowerCase());
              }
            }
            updated.careerInterests = nextCareer;
          }
          if (u.internshipPreferences && typeof u.internshipPreferences === 'object') {
            const p = u.internshipPreferences;
            updated.internshipPreferences = {
              ...(prev.internshipPreferences || {}),
              ...(typeof p.targetRole === 'string' && p.targetRole.trim() ? { targetRole: p.targetRole.trim() } : {}),
              ...(typeof p.preferredIndustry === 'string' && p.preferredIndustry.trim()
                ? { preferredIndustry: p.preferredIndustry.trim() }
                : {}),
              ...(typeof p.duration === 'string' && p.duration.trim() ? { duration: p.duration.trim() } : {}),
              ...(p.workArrangement === 'Remote' ||
              p.workArrangement === 'Hybrid' ||
              p.workArrangement === 'Onsite' ||
              p.workArrangement === 'Flexible'
                ? { workArrangement: p.workArrangement }
                : {}),
              ...(typeof p.availabilityDate === 'string' && p.availabilityDate.trim()
                ? { availabilityDate: p.availabilityDate.trim() }
                : {}),
              ...(Array.isArray(p.preferredTechnologies) && p.preferredTechnologies.length > 0
                ? {
                    preferredTechnologies: Array.from(
                      new Set([
                        ...(prev.internshipPreferences?.preferredTechnologies || []),
                        ...p.preferredTechnologies
                          .filter((t: unknown): t is string => typeof t === 'string' && t.trim().length > 0)
                          .map((t: string) => t.trim()),
                      ])
                    ),
                  }
                : {}),
            };
          }
          if (typeof u.harvardLeadershipFirst === 'boolean') {
            updated.harvardLeadershipFirst = u.harvardLeadershipFirst;
          }
          if (Array.isArray(u.education) && u.education.length > 0) {
            updated.education = [...(prev.education || []), ...(u.education as any)];
          }
          if (Array.isArray(u.studyAbroad) && u.studyAbroad.length > 0) {
            updated.studyAbroad = [...(prev.studyAbroad || []), ...(u.studyAbroad as any)];
          }
          if (Array.isArray(u.highSchool) && u.highSchool.length > 0) {
            updated.highSchool = [...(prev.highSchool || []), ...(u.highSchool as any)];
          }
          if (Array.isArray(u.labSkills) && u.labSkills.length > 0) {
            const merged = new Set([
              ...(prev.labSkills || []).map((s) => s.trim()).filter(Boolean),
              ...u.labSkills
                .filter((s): s is string => typeof s === 'string')
                .map((s) => s.trim())
                .filter(Boolean),
            ]);
            updated.labSkills = Array.from(merged);
          }
          if (Array.isArray(u.experience) && u.experience.length > 0) {
            updated.experience = [...(prev.experience || []), ...(u.experience as any)];
          }
          if (Array.isArray(u.researchExperience) && u.researchExperience.length > 0) {
            updated.researchExperience = [
              ...(prev.researchExperience || []),
              ...(u.researchExperience as any),
            ];
          }
          if (Array.isArray(u.projects) && u.projects.length > 0) {
            updated.projects = [...(prev.projects || []), ...(u.projects as any)];
          }
          if (Array.isArray(u.dailyActivities) && u.dailyActivities.length > 0) {
            const sanitized = u.dailyActivities
              .filter((d: any) => typeof d?.activity === 'string' && d.activity.trim() && Number(d.hours) > 0)
              .map((d: any, i: number) => ({
                id: d.id || `day_${Date.now()}_${i}`,
                activity: d.activity.trim(),
                hours: Number(d.hours),
              }));
            const check = validateDailyActivities(sanitized);
            if (check.valid && check.validItems.length > 0) {
              updated.dailyActivities = check.validItems;
              updated.showDailyActivityChart = true;
            }
          }
          if (typeof u.showDailyActivityChart === 'boolean') {
            updated.showDailyActivityChart = u.showDailyActivityChart;
          }
          if (Array.isArray(u.publications) && u.publications.length > 0) {
            updated.publications = [...(prev.publications || []), ...(u.publications as any)];
          }
          if (Array.isArray(u.strengths) && u.strengths.length > 0) {
            const existing = (prev.strengths || []).map((s) => s.trim()).filter(Boolean);
            const seen = new Set(existing.map((s) => s.toLowerCase()));
            const nextStrengths = [...existing];
            for (const s of u.strengths) {
              if (typeof s === 'string' && s.trim() && !seen.has(s.trim().toLowerCase())) {
                nextStrengths.push(s.trim());
                seen.add(s.trim().toLowerCase());
              }
            }
            updated.strengths = nextStrengths;
          }
          if (Array.isArray(u.languages) && u.languages.length > 0) {
            updated.languages = [...(prev.languages || []), ...(u.languages as any)];
          }
          if (Array.isArray(u.skills) && u.skills.length > 0) {
            const sanitizedSkills = u.skills.map((cat: any, i: number) => ({
              id: cat.id || `sk_${Date.now()}_${i}`,
              category: typeof cat.category === 'string' ? cat.category : 'Skills',
              skills: Array.isArray(cat.skills)
                ? cat.skills.filter((s: unknown): s is string => typeof s === 'string' && s.trim().length > 0).map((s: string) => s.trim())
                : [],
              ...(isInternshipResume
                ? {
                    proficiency:
                      typeof cat.proficiency === 'number' && cat.proficiency >= 1 && cat.proficiency <= 5
                        ? (Math.round(cat.proficiency) as 1 | 2 | 3 | 4 | 5)
                        : null,
                  }
                : {}),
            }));
            updated.skills = [...(prev.skills || []), ...sanitizedSkills];
          }
          if (Array.isArray(u.skillMatrix) && u.skillMatrix.length > 0) {
            const sanitizedMatrix = u.skillMatrix.map((m: any, i: number) => ({
              id: m.id || `mat_${Date.now()}_${i}`,
              category: m.category || 'Core',
              skill: m.skill || '',
              level:
                typeof m.level === 'number' && m.level >= 1 && m.level <= 5
                  ? (Math.round(m.level) as 1 | 2 | 3 | 4 | 5)
                  : null,
              yearsOfExperience: m.yearsOfExperience || '',
              comment: m.comment || '',
            }));
            updated.skillMatrix = [...(prev.skillMatrix || []), ...sanitizedMatrix];
          }
          if (Array.isArray(u.interestItems) && u.interestItems.length > 0) {
            updated.interestItems = [...(prev.interestItems || []), ...(u.interestItems as any)];
          }
          if (typeof u.interests === 'string' && u.interests.trim()) {
            updated.interests = u.interests.trim();
          }
          if (Array.isArray(u.customSections) && u.customSections.length > 0) {
            updated.customSections = [...(prev.customSections || []), ...(u.customSections as any)];
          }
          if (Array.isArray(u.achievements) && u.achievements.length > 0) {
            updated.achievements = [...(prev.achievements || []), ...(u.achievements as any)];
          }
          if (Array.isArray(u.leadership) && u.leadership.length > 0) {
            updated.leadership = [...(prev.leadership || []), ...(u.leadership as any)];
          }
          if (Array.isArray(u.references) && u.references.length > 0) {
            updated.references = [...(prev.references || []), ...(u.references as any)];
          }
          if (u.referencesDisplayMode) {
            updated.referencesDisplayMode = u.referencesDisplayMode;
          }
          return updated;
        });
      }

      if (res.nextSection && sectionFlow.includes(res.nextSection)) {
        setCurrentSectionIndex(sectionFlow.indexOf(res.nextSection));
      } else if (res.isSectionCompleted && currentSectionIndex < sectionFlow.length - 1) {
        setCurrentSectionIndex((idx) => idx + 1);
      }

      const botReply: InterviewChatMessage = {
        id: `msg_a_${Date.now()}`,
        role: 'assistant',
        content: res.reply,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        suggestedChips: res.suggestedChips,
        structuredUpdates: res.structuredUpdates,
      };

      setMessages((prev) => [...prev, botReply]);
    } catch (err: any) {
      console.error('Interview turn error:', err);
      const fallbackMsg: InterviewChatMessage = {
        id: `msg_err_${Date.now()}`,
        role: 'assistant',
        content:
          "Thank you! I've noted that down. What other achievements, tools, or responsibilities would you like to add next?",
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        suggestedChips: ['Skip to Projects', 'Add another role', 'Save & review in editor'],
      };
      setMessages((prev) => [...prev, fallbackMsg]);
    } finally {
      setLoading(false);
    }
  };

  const handleSkipSection = () => {
    if (currentSectionIndex < sectionFlow.length - 1) {
      const nextIdx = currentSectionIndex + 1;
      setCurrentSectionIndex(nextIdx);
      handleSendMessage(`Let's skip ${activeSection} for now and move to ${sectionFlow[nextIdx]}.`);
    } else {
      handleSendMessage("That is all my information for now, let's review the resume.");
    }
  };

  const handleApplyAndFinish = () => {
    onApplyUpdates(stagedResume);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full border border-slate-200 overflow-hidden flex flex-col h-[85vh] animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-6 py-3.5 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center shadow-xs">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="text-sm font-bold text-slate-900">
                  {isJakes
                    ? "Build Jake's Resume with AI"
                    : isSoftwareDev
                    ? 'Build Software Developer Resume with AI'
                    : isHarvard
                    ? 'Build Harvard Style Resume with AI'
                    : isElegantSerif
                    ? 'Build Elegant Serif CV with AI'
                    : isModernCorporate
                    ? 'Build Modern Corporate CV with AI'
                    : isFresherResume
                    ? 'Build Fresher Resume with AI'
                    : isInternshipResume
                    ? 'Build Internship Resume with AI'
                    : isClassic
                    ? 'Build Classic Professional CV with AI'
                    : isTwoColumn
                    ? 'Build Two Column Professional CV with AI'
                    : 'Build My CV with AI'}
                </h3>
                <span className="px-2 py-0.5 text-[10px] font-semibold bg-indigo-50 text-indigo-700 rounded-full border border-indigo-200 uppercase tracking-wider">
                  Interactive Interview
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Focusing on: <span className="font-semibold text-slate-700">{SECTION_LABELS[activeSection] || activeSection}</span> • Step {currentSectionIndex + 1} of {sectionFlow.length}
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={handleApplyAndFinish}
              className="inline-flex items-center px-3 py-1.5 text-xs font-semibold text-white bg-[#0f2b5c] hover:bg-[#0a1e40] rounded-lg shadow-xs cursor-pointer transition-colors"
            >
              <Check className="w-3.5 h-3.5 mr-1.5" />
              <span>Apply to CV &amp; Edit Forms</span>
            </button>
            <button
              onClick={onClose}
              className="p-1 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Clickable Section Navigation Bar */}
        <div className="px-4 py-2 bg-white border-b border-slate-200 flex items-center gap-1.5 overflow-x-auto">
          {sectionFlow.map((sec, idx) => {
            const isCurrent = idx === currentSectionIndex;
            return (
              <button
                key={sec}
                type="button"
                onClick={() => setCurrentSectionIndex(idx)}
                className={`px-2.5 py-1 rounded-full text-[11px] font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                  isCurrent
                    ? 'bg-[#0f2b5c] text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900'
                }`}
              >
                {idx + 1}. {SECTION_LABELS[sec] || sec}
              </button>
            );
          })}
        </div>

        {/* Layout: Chat on Left, Real-time Snapshot Summary on Right */}
        <div className="flex-1 flex overflow-hidden">
          {/* Main Chat Stream */}
          <div className="flex-1 flex flex-col bg-white">
            <div className="flex-1 p-4 sm:p-6 overflow-y-auto space-y-4">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex flex-col ${
                    msg.role === 'user' ? 'items-end' : 'items-start'
                  }`}
                >
                  <div
                    className={`max-w-[85%] rounded-2xl px-4 py-3 text-xs leading-relaxed ${
                      msg.role === 'user'
                        ? 'bg-[#0f2b5c] text-white rounded-br-xs'
                        : 'bg-slate-100 text-slate-900 border border-slate-200/80 rounded-bl-xs'
                    }`}
                  >
                    <div className="font-sans whitespace-pre-wrap">{msg.content}</div>
                    <div
                      className={`text-[9.5px] mt-1.5 ${
                        msg.role === 'user' ? 'text-indigo-200 text-right' : 'text-slate-400'
                      }`}
                    >
                      {msg.timestamp}
                    </div>
                  </div>

                  {/* Suggestion Chips */}
                  {msg.role === 'assistant' && msg.suggestedChips && msg.suggestedChips.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-2 max-w-[85%]">
                      {msg.suggestedChips.map((chip, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => handleSendMessage(chip)}
                          className="px-2.5 py-1 text-[11px] font-medium bg-slate-50 hover:bg-indigo-50 border border-slate-200 hover:border-indigo-300 text-slate-700 hover:text-indigo-700 rounded-full transition-colors cursor-pointer"
                        >
                          {chip}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ))}

              {loading && (
                <div className="flex items-start space-x-2">
                  <div className="bg-slate-100 border border-slate-200 rounded-2xl px-4 py-3 rounded-bl-xs flex items-center space-x-2 text-xs text-slate-500">
                    <Loader2 className="w-4 h-4 animate-spin text-indigo-600" />
                    <span>AI Advisor is formulating questions and structuring details...</span>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Bar */}
            <div className="p-3 bg-slate-50 border-t border-slate-200">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSendMessage();
                }}
                className="flex items-center space-x-2"
              >
                <button
                  type="button"
                  onClick={handleSkipSection}
                  className="px-2.5 py-2 text-xs font-medium text-slate-500 hover:text-slate-800 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors shrink-0 flex items-center"
                  title="Skip to the next section"
                >
                  <SkipForward className="w-3.5 h-3.5 mr-1" />
                  <span>Skip</span>
                </button>
                <input
                  type="text"
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  placeholder="Answer here (or ask a question, say 'skip' to move on)..."
                  disabled={loading}
                  className="flex-1 text-xs p-2.5 bg-white border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-indigo-500 font-sans"
                />
                <button
                  type="submit"
                  disabled={loading || !inputText.trim()}
                  className="p-2.5 bg-[#0f2b5c] hover:bg-[#0a1e40] text-white rounded-lg disabled:opacity-40 transition-colors cursor-pointer shrink-0"
                >
                  <Send className="w-4 h-4" />
                </button>
              </form>
            </div>
          </div>

          {/* Right Live Extraction Snapshot Drawer */}
          <div className="w-72 border-l border-slate-200 bg-slate-50/70 p-4 hidden md:flex flex-col justify-between overflow-y-auto">
            <div className="space-y-4">
              <div className="border-b border-slate-200 pb-2">
                <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                  Live Staged Details
                </span>
                <p className="text-[11px] text-slate-500">
                  Updates applied in real-time as you answer.
                </p>
              </div>

              {/* Items Summary list */}
              <div className="space-y-2 text-xs">
                <div className="p-2 bg-white border border-slate-200 rounded-md">
                  <div className="flex items-center text-slate-700 font-semibold mb-0.5">
                    <User className="w-3 h-3 mr-1 text-slate-500" />
                    <span>Personal Info</span>
                  </div>
                  <div className="text-[11px] text-slate-600 truncate">
                    {stagedResume.personalInfo.fullName || 'Not specified yet'}
                  </div>
                </div>

                <div className="p-2 bg-white border border-slate-200 rounded-md">
                  <div className="flex items-center text-slate-700 font-semibold mb-0.5">
                    <GraduationCap className="w-3 h-3 mr-1 text-indigo-600" />
                    <span>Education: {stagedResume.education?.length || 0} entries</span>
                  </div>
                  {stagedResume.education?.[0] && (
                    <div className="text-[11px] text-slate-600 truncate">
                      {stagedResume.education[0].degree} ({stagedResume.education[0].institution})
                    </div>
                  )}
                </div>

                <div className="p-2 bg-white border border-slate-200 rounded-md">
                  <div className="flex items-center text-slate-700 font-semibold mb-0.5">
                    <Briefcase className="w-3 h-3 mr-1 text-blue-600" />
                    <span>Experience: {stagedResume.experience?.length || 0} roles</span>
                  </div>
                  {stagedResume.experience?.[0] && (
                    <div className="text-[11px] text-slate-600 truncate">
                      {stagedResume.experience[0].position} @ {stagedResume.experience[0].company}
                    </div>
                  )}
                </div>

                <div className="p-2 bg-white border border-slate-200 rounded-md">
                  <div className="flex items-center text-slate-700 font-semibold mb-0.5">
                    <Code2 className="w-3 h-3 mr-1 text-emerald-600" />
                    <span>Projects: {stagedResume.projects?.length || 0} entries</span>
                  </div>
                </div>

                {isJakes ? (
                  <>
                    <div className="p-2 bg-white border border-slate-200 rounded-md">
                      <div className="flex items-center text-slate-700 font-semibold mb-0.5">
                        <BookOpen className="w-3 h-3 mr-1 text-amber-600" />
                        <span>Coursework: {stagedResume.coursework?.length || 0} courses</span>
                      </div>
                    </div>
                    <div className="p-2 bg-white border border-slate-200 rounded-md">
                      <div className="flex items-center text-slate-700 font-semibold mb-0.5">
                        <Briefcase className="w-3 h-3 mr-1 text-purple-600" />
                        <span>Leadership: {stagedResume.leadership?.length || 0} roles</span>
                      </div>
                    </div>
                  </>
                ) : isSoftwareDev ? (
                  <>
                    <div className="p-2 bg-white border border-slate-200 rounded-md">
                      <div className="flex items-center text-slate-700 font-semibold mb-0.5">
                        <BookOpen className="w-3 h-3 mr-1 text-[#1e4e8c]" />
                        <span>Coursework: {stagedResume.coursework?.length || 0} courses</span>
                      </div>
                    </div>
                    <div className="p-2 bg-white border border-slate-200 rounded-md">
                      <div className="flex items-center text-slate-700 font-semibold mb-0.5">
                        <Code2 className="w-3 h-3 mr-1 text-blue-600" />
                        <span>Skill Groups: {stagedResume.skills?.length || 0} buckets</span>
                      </div>
                    </div>
                    <div className="p-2 bg-white border border-slate-200 rounded-md">
                      <div className="flex items-center text-slate-700 font-semibold mb-0.5">
                        <Briefcase className="w-3 h-3 mr-1 text-purple-600" />
                        <span>
                          Leadership &amp; Certs: {(stagedResume.leadership?.length || 0) + (stagedResume.certifications?.length || 0)}
                        </span>
                      </div>
                    </div>
                  </>
                ) : isHarvard ? (
                  <>
                    <div className="p-2 bg-white border border-slate-200 rounded-md">
                      <div className="flex items-center text-slate-700 font-semibold mb-0.5">
                        <Users className="w-3 h-3 mr-1 text-slate-700" />
                        <span>Leadership: {stagedResume.leadership?.length || 0} roles</span>
                      </div>
                    </div>
                    <div className="p-2 bg-white border border-slate-200 rounded-md">
                      <div className="flex items-center text-slate-700 font-semibold mb-0.5">
                        <BookOpen className="w-3 h-3 mr-1 text-amber-600" />
                        <span>
                          Study Abroad / HS: {(stagedResume.studyAbroad?.length || 0) + (stagedResume.highSchool?.length || 0)}
                        </span>
                      </div>
                    </div>
                    <div className="p-2 bg-white border border-slate-200 rounded-md">
                      <div className="flex items-center text-slate-700 font-semibold mb-0.5">
                        <Code2 className="w-3 h-3 mr-1 text-emerald-600" />
                        <span>
                          Skills &amp; Languages: {(stagedResume.skills?.length || 0) + (stagedResume.languages?.length || 0)}
                        </span>
                      </div>
                    </div>
                  </>
                ) : isClassic ? (
                  <>
                    <div className="p-2 bg-white border border-slate-200 rounded-md">
                      <div className="flex items-center text-slate-700 font-semibold mb-0.5">
                        <BookOpen className="w-3 h-3 mr-1 text-amber-600" />
                        <span>Languages: {stagedResume.languages?.length || 0} listed</span>
                      </div>
                    </div>
                    <div className="p-2 bg-white border border-slate-200 rounded-md">
                      <div className="flex items-center text-slate-700 font-semibold mb-0.5">
                        <Code2 className="w-3 h-3 mr-1 text-blue-600" />
                        <span>Skill Matrix: {stagedResume.skillMatrix?.length || 0} rows</span>
                      </div>
                    </div>
                    <div className="p-2 bg-white border border-slate-200 rounded-md">
                      <div className="flex items-center text-slate-700 font-semibold mb-0.5">
                        <BookOpen className="w-3 h-3 mr-1 text-purple-600" />
                        <span>
                          Thesis: {stagedResume.thesis?.title ? 'Added' : 'Optional'}
                        </span>
                      </div>
                    </div>
                  </>
                ) : isTwoColumn ? (
                  <>
                    <div className="p-2 bg-white border border-slate-200 rounded-md">
                      <div className="flex items-center text-slate-700 font-semibold mb-0.5">
                        <BookOpen className="w-3 h-3 mr-1 text-[#8f131b]" />
                        <span>Strengths: {stagedResume.strengths?.length || 0} chips</span>
                      </div>
                    </div>
                    <div className="p-2 bg-white border border-slate-200 rounded-md">
                      <div className="flex items-center text-slate-700 font-semibold mb-0.5">
                        <BookOpen className="w-3 h-3 mr-1 text-amber-600" />
                        <span>Languages: {stagedResume.languages?.length || 0} listed</span>
                      </div>
                    </div>
                    <div className="p-2 bg-white border border-slate-200 rounded-md">
                      <div className="flex items-center text-slate-700 font-semibold mb-0.5">
                        <BookOpen className="w-3 h-3 mr-1 text-purple-600" />
                        <span>
                          Day of Life: {stagedResume.dailyActivities?.length || 0} activities
                        </span>
                      </div>
                    </div>
                  </>
                ) : isElegantSerif ? (
                  <>
                    <div className="p-2 bg-white border border-slate-200 rounded-md">
                      <div className="flex items-center text-slate-700 font-semibold mb-0.5">
                        <BookOpen className="w-3 h-3 mr-1 text-slate-700" />
                        <span>Research: {stagedResume.researchExperience?.length || 0} entries</span>
                      </div>
                    </div>
                    <div className="p-2 bg-white border border-slate-200 rounded-md">
                      <div className="flex items-center text-slate-700 font-semibold mb-0.5">
                        <BookOpen className="w-3 h-3 mr-1 text-amber-600" />
                        <span>Publications: {stagedResume.publications?.length || 0} records</span>
                      </div>
                    </div>
                    <div className="p-2 bg-white border border-slate-200 rounded-md">
                      <div className="flex items-center text-slate-700 font-semibold mb-0.5">
                        <Code2 className="w-3 h-3 mr-1 text-emerald-600" />
                        <span>
                          Skills &amp; Languages: {(stagedResume.skills?.length || 0) + (stagedResume.languages?.length || 0)}
                        </span>
                      </div>
                    </div>
                  </>
                ) : isModernCorporate ? (
                  <>
                    <div className="p-2 bg-white border border-slate-200 rounded-md">
                      <div className="flex items-center text-slate-700 font-semibold mb-0.5">
                        <BookOpen className="w-3 h-3 mr-1 text-[#3873b3]" />
                        <span>Core Competencies: {stagedResume.strengths?.length || 0} listed</span>
                      </div>
                    </div>
                    <div className="p-2 bg-white border border-slate-200 rounded-md">
                      <div className="flex items-center text-slate-700 font-semibold mb-0.5">
                        <Code2 className="w-3 h-3 mr-1 text-emerald-600" />
                        <span>
                          Skills &amp; Certs: {(stagedResume.skills?.length || 0) + (stagedResume.certifications?.length || 0)}
                        </span>
                      </div>
                    </div>
                    <div className="p-2 bg-white border border-slate-200 rounded-md">
                      <div className="flex items-center text-slate-700 font-semibold mb-0.5">
                        <BookOpen className="w-3 h-3 mr-1 text-amber-600" />
                        <span>Languages: {stagedResume.languages?.length || 0} listed</span>
                      </div>
                    </div>
                  </>
                ) : isFresherResume ? (
                  <>
                    <div className="p-2 bg-white border border-slate-200 rounded-md">
                      <div className="flex items-center text-slate-700 font-semibold mb-0.5">
                        <BookOpen className="w-3 h-3 mr-1 text-[#3b6998]" />
                        <span>Keywords &amp; Coursework: {(stagedResume.strengths?.length || 0) + (stagedResume.coursework?.length || 0)}</span>
                      </div>
                    </div>
                    <div className="p-2 bg-white border border-slate-200 rounded-md">
                      <div className="flex items-center text-slate-700 font-semibold mb-0.5">
                        <Code2 className="w-3 h-3 mr-1 text-emerald-600" />
                        <span>
                          Skills &amp; Certs: {(stagedResume.skills?.length || 0) + (stagedResume.certifications?.length || 0)}
                        </span>
                      </div>
                    </div>
                    <div className="p-2 bg-white border border-slate-200 rounded-md">
                      <div className="flex items-center text-slate-700 font-semibold mb-0.5">
                        <BookOpen className="w-3 h-3 mr-1 text-amber-600" />
                        <span>
                          Awards &amp; Leadership: {(stagedResume.achievements?.length || 0) + (stagedResume.leadership?.length || 0)}
                        </span>
                      </div>
                    </div>
                  </>
                ) : isInternshipResume ? (
                  <>
                    <div className="p-2 bg-white border border-slate-200 rounded-md">
                      <div className="flex items-center text-slate-700 font-semibold mb-0.5">
                        <BookOpen className="w-3 h-3 mr-1 text-slate-700" />
                        <span>Learning Activities: {stagedResume.learningActivities?.length || 0}</span>
                      </div>
                    </div>
                    <div className="p-2 bg-white border border-slate-200 rounded-md">
                      <div className="flex items-center text-slate-700 font-semibold mb-0.5">
                        <Code2 className="w-3 h-3 mr-1 text-indigo-600" />
                        <span>
                          Research &amp; Projects: {(stagedResume.researchExperience?.length || 0) + (stagedResume.projects?.length || 0)}
                        </span>
                      </div>
                    </div>
                    <div className="p-2 bg-white border border-slate-200 rounded-md">
                      <div className="flex items-center text-slate-700 font-semibold mb-0.5">
                        <BookOpen className="w-3 h-3 mr-1 text-emerald-600" />
                        <span>
                          Career Interests &amp; Skills: {(stagedResume.careerInterests?.length || 0)} / {(stagedResume.skills?.length || 0)}
                        </span>
                      </div>
                    </div>
                    <div className="p-2 bg-white border border-slate-200 rounded-md">
                      <div className="flex items-center text-slate-700 font-semibold mb-0.5">
                        <BookOpen className="w-3 h-3 mr-1 text-amber-600" />
                        <span>Co-Curricular &amp; Awards: {stagedResume.achievements?.length || 0}</span>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="p-2 bg-white border border-slate-200 rounded-md">
                    <div className="flex items-center text-slate-700 font-semibold mb-0.5">
                      <BookOpen className="w-3 h-3 mr-1 text-amber-600" />
                      <span>Publications: {stagedResume.publications?.length || 0} records</span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="pt-4 border-t border-slate-200">
              <button
                type="button"
                onClick={handleApplyAndFinish}
                className="w-full inline-flex items-center justify-center px-3 py-2 text-xs font-semibold text-white bg-[#0f2b5c] hover:bg-[#0a1e40] rounded-lg shadow-xs transition-colors cursor-pointer"
              >
                <span>Save to Editor</span>
                <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
