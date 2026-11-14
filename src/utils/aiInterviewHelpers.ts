import type {
  CreativeProfession,
  EngineeringBranch,
  InterviewChatMessage,
  InternshipTrack,
  Resume,
  SkillCategory,
} from '../types/resume';
import { validateDailyActivities } from './dailyActivities';

export interface InterviewDraftState {
  messages: InterviewChatMessage[];
  currentSectionIndex: number;
  stagedUpdates: Partial<Resume>;
  hasStagedChanges: boolean;
}

const DRAFT_STORAGE_PREFIX = 'ai_interview_draft_v1_';

function norm(val: unknown): string {
  return typeof val === 'string' ? val.trim().toLowerCase() : '';
}

function dedupeStrings(existing: string[] = [], incoming: unknown[] = []): string[] {
  const result: string[] = [];
  const seen = new Set<string>();
  for (const s of [...existing, ...incoming]) {
    if (typeof s !== 'string') continue;
    const trimmed = s.trim();
    if (!trimmed) continue;
    const key = trimmed.toLowerCase();
    if (!seen.has(key)) {
      seen.add(key);
      result.push(trimmed);
    }
  }
  return result;
}

function dedupeByKey<T>(existing: T[] = [], incoming: T[] = [], keyFn: (item: T) => string): T[] {
  const result: T[] = [];
  const seen = new Set<string>();
  for (const item of existing) {
    const key = keyFn(item);
    if (key) seen.add(key);
    result.push(item);
  }
  for (const item of incoming) {
    const key = keyFn(item);
    if (key && seen.has(key)) continue;
    if (key) seen.add(key);
    result.push(item);
  }
  return result;
}

/**
 * Merges partial updates from an AI interview turn (or staged draft) onto a Resume
 * without duplicating entries or fabricating unconfirmed metrics/proficiencies.
 */
export function mergeResumeUpdates(
  base: Resume,
  u: Partial<Resume>,
  isInternshipResume: boolean
): Resume {
  const updated: Resume = { ...base };

  if (u.personalInfo) {
    const cleanInfo: Partial<Resume['personalInfo']> = {};
    for (const [k, v] of Object.entries(u.personalInfo)) {
      if (typeof v === 'string') {
        if (v.trim()) {
          (cleanInfo as Record<string, unknown>)[k] = v.trim();
        }
      } else if (v !== undefined) {
        (cleanInfo as Record<string, unknown>)[k] = v;
      }
    }
    updated.personalInfo = { ...base.personalInfo, ...cleanInfo };
  }

  if (typeof u.personalQuote === 'string' && u.personalQuote.trim()) {
    updated.personalQuote = u.personalQuote.trim();
  }
  if (typeof u.objective === 'string' && u.objective.trim()) {
    updated.objective = u.objective.trim();
  }
  if (typeof u.academicInterests === 'string' && u.academicInterests.trim()) {
    updated.academicInterests = u.academicInterests.trim();
  }
  if (typeof u.careerGoals === 'string' && u.careerGoals.trim()) {
    updated.careerGoals = u.careerGoals.trim();
  }
  if (u.thesis && (u.thesis.title || u.thesis.description || u.thesis.supervisors)) {
    updated.thesis = { ...(base.thesis || { title: '' }), ...u.thesis };
  }
  if (Array.isArray(u.coursework) && u.coursework.length > 0) {
    updated.coursework = dedupeStrings(base.coursework, u.coursework);
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
  if (
    u.engineeringBranch === 'mechanical' ||
    u.engineeringBranch === 'cse-it' ||
    u.engineeringBranch === 'ece' ||
    u.engineeringBranch === 'ee' ||
    u.engineeringBranch === 'civil' ||
    u.engineeringBranch === 'chemical' ||
    u.engineeringBranch === 'other'
  ) {
    updated.engineeringBranch = u.engineeringBranch;
  }
  if (typeof u.customEngineeringBranch === 'string' && u.customEngineeringBranch.trim()) {
    updated.customEngineeringBranch = u.customEngineeringBranch.trim();
  }
  if (
    u.creativeProfession === 'developer' ||
    u.creativeProfession === 'cybersecurity' ||
    u.creativeProfession === 'designer' ||
    u.creativeProfession === 'marketing' ||
    u.creativeProfession === 'researcher' ||
    u.creativeProfession === 'engineer' ||
    u.creativeProfession === 'other'
  ) {
    updated.creativeProfession = u.creativeProfession;
  }
  if (typeof u.customCreativeProfession === 'string' && u.customCreativeProfession.trim()) {
    updated.customCreativeProfession = u.customCreativeProfession.trim();
  }
  if (typeof u.proficiencyHeadingOverride === 'string' && u.proficiencyHeadingOverride.trim()) {
    updated.proficiencyHeadingOverride = u.proficiencyHeadingOverride.trim();
  }

  if (Array.isArray(u.learningActivities) && u.learningActivities.length > 0) {
    const sanitizedLearning = u.learningActivities
      .filter((item) => item && typeof item.title === 'string' && item.title.trim())
      .map((item, idx) => ({
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
          ? dedupeStrings([], item.skillsAcquired)
          : [],
        description: typeof item.description === 'string' ? item.description.trim() : '',
      }));
    if (sanitizedLearning.length > 0) {
      updated.learningActivities = dedupeByKey(
        base.learningActivities || [],
        sanitizedLearning,
        (l) => `${norm(l.title)}|${norm(l.provider)}`
      );
    }
  }

  if (Array.isArray(u.careerInterests) && u.careerInterests.length > 0) {
    updated.careerInterests = dedupeStrings(base.careerInterests, u.careerInterests);
  }

  if (u.internshipPreferences && typeof u.internshipPreferences === 'object') {
    const p = u.internshipPreferences;
    updated.internshipPreferences = {
      ...(base.internshipPreferences || {}),
      ...(typeof p.targetRole === 'string' && p.targetRole.trim()
        ? { targetRole: p.targetRole.trim() }
        : {}),
      ...(typeof p.preferredIndustry === 'string' && p.preferredIndustry.trim()
        ? { preferredIndustry: p.preferredIndustry.trim() }
        : {}),
      ...(typeof p.duration === 'string' && p.duration.trim()
        ? { duration: p.duration.trim() }
        : {}),
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
            preferredTechnologies: dedupeStrings(
              base.internshipPreferences?.preferredTechnologies,
              p.preferredTechnologies
            ),
          }
        : {}),
    };
  }

  if (typeof u.harvardLeadershipFirst === 'boolean') {
    updated.harvardLeadershipFirst = u.harvardLeadershipFirst;
  }

  if (Array.isArray(u.education) && u.education.length > 0) {
    updated.education = dedupeByKey(
      base.education || [],
      u.education,
      (e) => `${norm(e.institution)}|${norm(e.degree)}|${norm(e.startDate)}`
    );
  }
  if (Array.isArray(u.studyAbroad) && u.studyAbroad.length > 0) {
    updated.studyAbroad = dedupeByKey(
      base.studyAbroad || [],
      u.studyAbroad,
      (s) => `${norm(s.institution)}|${norm(s.startDate)}`
    );
  }
  if (Array.isArray(u.highSchool) && u.highSchool.length > 0) {
    updated.highSchool = dedupeByKey(
      base.highSchool || [],
      u.highSchool,
      (h) => `${norm(h.schoolName)}|${norm(h.qualification)}|${norm(h.graduationDate)}`
    );
  }
  if (Array.isArray(u.labSkills) && u.labSkills.length > 0) {
    updated.labSkills = dedupeStrings(base.labSkills, u.labSkills);
  }
  if (Array.isArray(u.experience) && u.experience.length > 0) {
    updated.experience = dedupeByKey(
      base.experience || [],
      u.experience,
      (e) => `${norm(e.company)}|${norm(e.position)}|${norm(e.startDate)}`
    );
  }
  if (Array.isArray(u.researchExperience) && u.researchExperience.length > 0) {
    updated.researchExperience = dedupeByKey(
      base.researchExperience || [],
      u.researchExperience,
      (r) => `${norm(r.title)}|${norm(r.institution)}`
    );
  }
  if (Array.isArray(u.projects) && u.projects.length > 0) {
    updated.projects = dedupeByKey(
      base.projects || [],
      u.projects,
      (p) => norm(p.title)
    );
  }
  if (Array.isArray(u.dailyActivities) && u.dailyActivities.length > 0) {
    const sanitized = u.dailyActivities
      .filter((d) => typeof d?.activity === 'string' && d.activity.trim() && Number(d.hours) > 0)
      .map((d, i) => ({
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
    updated.publications = dedupeByKey(
      base.publications || [],
      u.publications,
      (p) => `${norm(p.title)}|${norm(p.year)}`
    );
  }
  if (Array.isArray(u.strengths) && u.strengths.length > 0) {
    updated.strengths = dedupeStrings(base.strengths, u.strengths);
  }
  if (Array.isArray(u.languages) && u.languages.length > 0) {
    updated.languages = dedupeByKey(
      base.languages || [],
      u.languages,
      (l) => norm(l.language)
    );
  }

  if (Array.isArray(u.skills) && u.skills.length > 0) {
    const mergedCategories: SkillCategory[] = (base.skills || []).map((c) => ({
      ...c,
      skills: [...(c.skills || [])],
    }));

    u.skills.forEach((cat, i) => {
      const catName = typeof cat.category === 'string' && cat.category.trim() ? cat.category.trim() : 'Skills';
      const incomingSkills = dedupeStrings([], cat.skills || []);
      const explicitProficiency =
        typeof cat.proficiency === 'number' && cat.proficiency >= 1 && cat.proficiency <= 5
          ? (Math.round(cat.proficiency) as 1 | 2 | 3 | 4 | 5)
          : null;

      const existingIdx = mergedCategories.findIndex((c) => norm(c.category) === norm(catName));
      if (existingIdx >= 0) {
        const existing = mergedCategories[existingIdx];
        mergedCategories[existingIdx] = {
          ...existing,
          skills: dedupeStrings(existing.skills, incomingSkills),
          ...(isInternshipResume
            ? {
                proficiency:
                  explicitProficiency !== null
                    ? explicitProficiency
                    : existing.proficiency ?? null,
              }
            : {}),
        };
      } else if (incomingSkills.length > 0 || catName) {
        mergedCategories.push({
          id: cat.id || `sk_${Date.now()}_${i}`,
          category: catName,
          skills: incomingSkills,
          ...(isInternshipResume ? { proficiency: explicitProficiency } : {}),
        });
      }
    });
    updated.skills = mergedCategories;
  }

  if (Array.isArray(u.skillMatrix) && u.skillMatrix.length > 0) {
    const sanitizedMatrix = u.skillMatrix.map((m, i) => ({
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
    updated.skillMatrix = dedupeByKey(
      base.skillMatrix || [],
      sanitizedMatrix,
      (m) => `${norm(m.category)}|${norm(m.skill)}`
    );
  }

  if (Array.isArray(u.creativeSkillItems) && u.creativeSkillItems.length > 0) {
    const sanitizedCreativeSkills = u.creativeSkillItems
      .filter((s) => s && typeof s.name === 'string' && s.name.trim())
      .map((s, i) => ({
        id: s.id || `csk_${Date.now()}_${i}`,
        category: typeof s.category === 'string' && s.category.trim() ? s.category.trim() : 'Technical',
        name: s.name.trim(),
        description: typeof s.description === 'string' ? s.description.trim() : '',
        organization: typeof s.organization === 'string' ? s.organization.trim() : '',
      }));
    if (sanitizedCreativeSkills.length > 0) {
      updated.creativeSkillItems = dedupeByKey(
        base.creativeSkillItems || [],
        sanitizedCreativeSkills,
        (s) => `${norm(s.category)}|${norm(s.name)}`
      );
    }
  }

  if (Array.isArray(u.circularProficiencies) && u.circularProficiencies.length > 0) {
    const sanitizedCircles = u.circularProficiencies
      .filter(
        (c) =>
          c &&
          typeof c.name === 'string' &&
          c.name.trim() &&
          typeof c.percentage === 'number' &&
          Number.isFinite(c.percentage)
      )
      .map((c, i) => ({
        id: c.id || `circ_${Date.now()}_${i}`,
        name: c.name.trim(),
        shortLabel:
          typeof c.shortLabel === 'string' && c.shortLabel.trim()
            ? c.shortLabel.trim().slice(0, 5)
            : c.name.trim().slice(0, 3).toUpperCase(),
        description: typeof c.description === 'string' ? c.description.trim() : '',
        percentage: Math.max(0, Math.min(100, Math.round(Number(c.percentage)))),
      }));
    if (sanitizedCircles.length > 0) {
      updated.circularProficiencies = dedupeByKey(
        base.circularProficiencies || [],
        sanitizedCircles,
        (c) => norm(c.name)
      );
    }
  }

  if (Array.isArray(u.creativeSkillBars) && u.creativeSkillBars.length > 0) {
    const sanitizedBars = u.creativeSkillBars
      .filter(
        (b) =>
          b &&
          typeof b.name === 'string' &&
          b.name.trim() &&
          typeof b.percentage === 'number' &&
          Number.isFinite(b.percentage)
      )
      .map((b, i) => ({
        id: b.id || `cbar_${Date.now()}_${i}`,
        name: b.name.trim(),
        percentage: Math.max(0, Math.min(100, Math.round(Number(b.percentage)))),
      }));
    if (sanitizedBars.length > 0) {
      updated.creativeSkillBars = dedupeByKey(
        base.creativeSkillBars || [],
        sanitizedBars,
        (b) => norm(b.name)
      );
    }
  }

  if (Array.isArray(u.communicationSkills) && u.communicationSkills.length > 0) {
    const sanitizedComm = u.communicationSkills
      .filter((c) => c && typeof c.skill === 'string' && c.skill.trim())
      .map((c, i) => ({
        id: c.id || `comm_${Date.now()}_${i}`,
        skill: c.skill.trim(),
        proficiency: typeof c.proficiency === 'string' ? c.proficiency.trim() : '',
        context: typeof c.context === 'string' ? c.context.trim() : '',
      }));
    if (sanitizedComm.length > 0) {
      updated.communicationSkills = dedupeByKey(
        base.communicationSkills || [],
        sanitizedComm,
        (c) => norm(c.skill)
      );
    }
  }

  if (Array.isArray(u.interestItems) && u.interestItems.length > 0) {
    updated.interestItems = dedupeByKey(
      base.interestItems || [],
      u.interestItems,
      (item) => norm(item.name)
    );
  }
  if (typeof u.interests === 'string' && u.interests.trim()) {
    const existingTokens = dedupeStrings(
      (base.interests || '').split(','),
      u.interests.split(',')
    );
    updated.interests = existingTokens.join(', ');
  }
  if (Array.isArray(u.customSections) && u.customSections.length > 0) {
    updated.customSections = dedupeByKey(
      base.customSections || [],
      u.customSections,
      (cs) => norm(cs.title)
    );
  }
  if (Array.isArray(u.achievements) && u.achievements.length > 0) {
    updated.achievements = dedupeByKey(
      base.achievements || [],
      u.achievements,
      (a) => `${norm(a.title)}|${norm(a.issuer)}|${norm(a.date)}`
    );
  }
  if (Array.isArray(u.leadership) && u.leadership.length > 0) {
    updated.leadership = dedupeByKey(
      base.leadership || [],
      u.leadership,
      (l) => `${norm(l.role)}|${norm(l.organization)}|${norm(l.startDate)}`
    );
  }
  if (Array.isArray(u.references) && u.references.length > 0) {
    updated.references = dedupeByKey(
      base.references || [],
      u.references,
      (r) => `${norm(r.fullName)}|${norm(r.email)}`
    );
  }
  if (u.referencesDisplayMode) {
    updated.referencesDisplayMode = u.referencesDisplayMode;
  }

  return updated;
}

/**
 * Merges two Partial<Resume> update patches cleanly so staged deltas accumulate
 * without duplicating entries and without altering untouched fields.
 */
export function accumulateStagedUpdates(
  prevPatch: Partial<Resume>,
  nextPatch: Partial<Resume>,
  baseResume: Resume,
  isInternshipResume: boolean
): Partial<Resume> {
  const mergedResume = mergeResumeUpdates(
    mergeResumeUpdates(baseResume, prevPatch, isInternshipResume),
    nextPatch,
    isInternshipResume
  );

  const combined: Partial<Resume> = { ...prevPatch };
  const keys = new Set([
    ...Object.keys(prevPatch),
    ...Object.keys(nextPatch),
  ]) as Set<keyof Resume>;
  keys.forEach((k) => {
    (combined as Record<string, unknown>)[k] = mergedResume[k];
  });
  return combined;
}

export function detectInternshipTrackFromText(text: string): InternshipTrack | null {
  const lower = text.toLowerCase();
  if (/\b(cyber\s*security|cybersecurity|infosec|soc|penetration|security analyst)\b/.test(lower)) {
    return 'cybersecurity';
  }
  if (/\b(ece|hardware|embedded|vlsi|electronics|fpga|pcb|iot)\b/.test(lower)) {
    return 'ece';
  }
  if (/\b(non[- ]?technical|management|marketing|finance|business|hr|operations|consulting|design)\b/.test(lower)) {
    return 'non-technical';
  }
  if (/\b(research\s*(?:track|internship|fellow)|academic research|undergraduate researcher|ml research)\b/.test(lower)) {
    return 'research';
  }
  if (/\b(computer science|cs\s*track|cs\s*internship|software engineering|software dev|full[- ]stack|backend|frontend)\b/.test(lower)) {
    return 'cs';
  }
  return null;
}

interface AdaptivePromptSpec {
  reply: string;
  chips: string[];
}

const TRACK_PROMPTS: Record<InternshipTrack, Record<string, AdaptivePromptSpec>> = {
  cs: {
    personalInfo: {
      reply:
        "Got it — we'll tailor this for a Computer Science / Software internship. What is your target internship headline (e.g., Software Engineering Intern), city, email, phone, or GitHub/LinkedIn link?",
      chips: ['Software Engineering Intern', 'Skip to Education', 'Same contact details'],
    },
    education: {
      reply:
        'What is your current degree, college or university, graduation year, and optional high school or GPA details?',
      chips: ['B.Tech / B.S. Computer Science', 'Include High School', 'Skip to Learning'],
    },
    learning: {
      reply:
        'Optional: Have you completed any coding courses, online bootcamps, or workshops (e.g., CS50, edX C++, cloud labs)? You can also skip this section cleanly.',
      chips: ['Add an online course', 'Skip Learning', 'Move to Interests'],
    },
    interests: {
      reply:
        'Optional: What 3–5 authentic technical or personal interests would you like shown as boxed tags (e.g., Open Source, Distributed Systems, Chess)?',
      chips: ['Algorithms, Web Dev, Linux', 'Skip Interests', 'Move to Projects'],
    },
    research: {
      reply:
        'Tell me about 1–2 software projects, capstone builds, or CS research topics—what did you build, when, and what tech stack or outcome did it achieve?',
      chips: ['Add a full-stack project', 'Add a systems/ML project', 'Skip to Career Interests'],
    },
    'career-interests': {
      reply:
        'Optional: What target software roles or engineering domains are you applying for (e.g., Backend Engineering, Cloud Computing, AI Systems)?',
      chips: ['Backend, Cloud, Systems', 'Skip Career Interests', 'Move to Co-Curriculars'],
    },
    achievements: {
      reply:
        'Optional: Did you participate in any hackathons, programming contests, student tech clubs, or scholarships?',
      chips: ['Hackathon finalist', 'Coding club organizer', 'Skip Co-Curriculars'],
    },
    skills: {
      reply:
        'List your verified programming languages, frameworks, and developer tools (dots stay hidden unless you explicitly want 1–5 ratings).',
      chips: ['Python, TypeScript, React, Git', 'Keep proficiency dots hidden', 'Next: Prior Internships'],
    },
    experience: {
      reply:
        'Optional: Do you have any prior software internships, teaching assistantships, or lab roles? First-time interns can skip this with zero penalty.',
      chips: ['Skip Prior Internships', 'Add Teaching Assistant role', 'Add Software Intern role'],
    },
    'custom-sections': {
      reply:
        'Final step (Optional): Would you like to add any certifications, spoken languages, or custom sections before applying updates to the editor?',
      chips: ['Add spoken languages', 'Add a certification', 'Ready to review in editor'],
    },
  },
  cybersecurity: {
    personalInfo: {
      reply:
        "Great — tailored for Cybersecurity Internships. What target role (e.g., Security Analyst Intern), location, email, phone, and LinkedIn/GitHub links should appear in your header?",
      chips: ['Security Analyst Intern', 'SOC / AppSec Intern', 'Skip to Education'],
    },
    education: {
      reply:
        'What is your current degree, university, expected graduation timeline, and optional high school background?',
      chips: ['B.S. Cybersecurity / CS', 'Include High School', 'Skip to Learning'],
    },
    learning: {
      reply:
        'Optional: Have you attended any security workshops, defensive/offensive labs, or structured training modules (e.g., TryHackMe, IBM Cyber Security workshop)?',
      chips: ['Add security workshop', 'Skip Learning', 'Move to Interests'],
    },
    interests: {
      reply:
        'Optional: Which security or computing interests would you like shown as tags (e.g., Network Defense, CTF Challenges, Threat Intelligence)?',
      chips: ['CTFs, Network Security, Linux', 'Skip Interests', 'Move to Projects'],
    },
    research: {
      reply:
        'Share 1–2 cybersecurity labs, vulnerability assessments, CTF writeups, or security engineering projects—what problem did you examine and what tools did you use?',
      chips: ['Add network monitoring project', 'Add AppSec / audit project', 'Skip to Career Interests'],
    },
    'career-interests': {
      reply:
        'Optional: Which security tracks are you targeting (e.g., SOC Operations, Cloud Security, Penetration Testing, AppSec)?',
      chips: ['SOC, Cloud Security, AppSec', 'Skip Career Interests', 'Move to Co-Curriculars'],
    },
    achievements: {
      reply:
        'Optional: Any CTF placements, bug bounty recognitions, cybersecurity club leadership, or scholarships?',
      chips: ['CTF competition team', 'Cyber club lead', 'Skip Co-Curriculars'],
    },
    skills: {
      reply:
        'What verified security tools, OS environments, and scripting languages do you use (e.g., Wireshark, Nmap, Linux, Python, SIEM)? Dots remain hidden unless you specify 1–5 ratings.',
      chips: ['Linux, Wireshark, Nmap, Python', 'Keep proficiency dots hidden', 'Next: Prior Internships'],
    },
    experience: {
      reply:
        'Optional: Any prior IT security internships, campus SOC assistantships, or sysadmin roles? You can skip cleanly if this is your first internship.',
      chips: ['Skip Prior Internships', 'Add IT / Security Intern role'],
    },
    'custom-sections': {
      reply:
        'Final step (Optional): Would you like to add security certifications (e.g., CompTIA Security+ in progress), spoken languages, or custom info?',
      chips: ['Add spoken languages', 'Add certification', 'Ready to review in editor'],
    },
  },
  ece: {
    personalInfo: {
      reply:
        "Great — tailored for ECE / Hardware Internships. What target role (e.g., Embedded Systems Intern), city, email, phone, or portfolio/GitHub should appear in your header?",
      chips: ['Embedded Systems Intern', 'Hardware / VLSI Intern', 'Skip to Education'],
    },
    education: {
      reply:
        'What is your Electronics/ECE degree, institution, expected graduation year, and optional high school details?',
      chips: ['B.Tech Electronics & Comm.', 'Include High School', 'Skip to Learning'],
    },
    learning: {
      reply:
        'Optional: Any hardware bootcamps, PCB/FPGA workshops, or online instrumentation courses you completed?',
      chips: ['Add FPGA/Arduino workshop', 'Skip Learning', 'Move to Interests'],
    },
    interests: {
      reply:
        'Optional: What hardware or technical interests would you like shown as tags (e.g., Robotics, IoT, Embedded Systems, Signal Processing)?',
      chips: ['Arduino, IoT, Embedded Systems', 'Skip Interests', 'Move to Projects'],
    },
    research: {
      reply:
        'Tell me about 1–2 hardware prototypes, IoT builds, circuit/PCB designs, or VLSI studies—what did you design, test, and build?',
      chips: ['Add microcontroller/IoT build', 'Add VLSI/signal project', 'Skip to Career Interests'],
    },
    'career-interests': {
      reply:
        'Optional: Which hardware or engineering roles interest you most (e.g., Embedded Firmware, Robotics, Semiconductor Verification, IoT)?',
      chips: ['Embedded Systems, IoT, VLSI', 'Skip Career Interests', 'Move to Co-Curriculars'],
    },
    achievements: {
      reply:
        'Optional: Any robotics competitions, science/hardware exhibitions, IEEE student branch roles, or scholarships?',
      chips: ['Hardware exhibition project', 'IEEE student member', 'Skip Co-Curriculars'],
    },
    skills: {
      reply:
        'What verified hardware/software tools and languages do you know (e.g., C, Embedded C, Verilog, MATLAB, KiCad, Oscilloscope)? Dots stay hidden unless you rate them 1–5.',
      chips: ['C, Verilog, MATLAB, Arduino', 'Keep proficiency dots hidden', 'Next: Prior Internships'],
    },
    experience: {
      reply:
        'Optional: Any prior hardware lab assistantships or electronics internships? First-time applicants can skip cleanly.',
      chips: ['Skip Prior Internships', 'Add Lab Assistant role'],
    },
    'custom-sections': {
      reply:
        'Final step (Optional): Would you like to add certifications, spoken languages, or custom lab info?',
      chips: ['Add spoken languages', 'Ready to review in editor'],
    },
  },
  research: {
    personalInfo: {
      reply:
        "Great — tailored for Research Internships. What target research title (e.g., Undergraduate Research Intern), city, email, phone, and GitHub/Scholar link should we include?",
      chips: ['Undergraduate Research Intern', 'ML Research Intern', 'Skip to Education'],
    },
    education: {
      reply:
        'What is your degree, university, expected graduation date, GPA, and optional high school details?',
      chips: ['B.S./B.Tech with GPA', 'Include High School', 'Skip to Learning'],
    },
    learning: {
      reply:
        'Optional: Have you attended any research seminars, methodology schools, or specialized lab training?',
      chips: ['Add research seminar/training', 'Skip Learning', 'Move to Interests'],
    },
    interests: {
      reply:
        'Optional: What scholarly or domain topics interest you most (e.g., Graph ML, Privacy, Computational Physics)?',
      chips: ['Scientific ML, Systems, Reading', 'Skip Interests', 'Move to Research Work'],
    },
    research: {
      reply:
        'Tell me about your faculty-mentored studies, thesis, or lab investigations—what was the research question, methodology, and observed outcome?',
      chips: ['Add faculty lab study', 'Add capstone research', 'Skip to Career Interests'],
    },
    'career-interests': {
      reply:
        'Optional: Which research tracks or lab areas are you targeting (e.g., ML Systems, Bioinformatics, Human-Computer Interaction)?',
      chips: ['ML Research, Applied AI', 'Skip Career Interests', 'Move to Co-Curriculars'],
    },
    achievements: {
      reply:
        'Optional: Any research symposium presentations, academic fellowships, scholarships, or paper awards?',
      chips: ['Symposium poster/talk', 'Research scholarship', 'Skip Co-Curriculars'],
    },
    skills: {
      reply:
        'List your verified research programming languages, statistical/lab tools, and typesetting tools (e.g., Python, PyTorch, R, LaTeX). Dots stay hidden unless set 1–5.',
      chips: ['Python, PyTorch, LaTeX, R', 'Keep proficiency dots hidden', 'Next: Prior Internships'],
    },
    experience: {
      reply:
        'Optional: Any prior summer research fellowships or teaching assistantships? You can skip this cleanly.',
      chips: ['Skip Prior Internships', 'Add Research Assistant role'],
    },
    'custom-sections': {
      reply:
        'Final step (Optional): Would you like to add spoken languages, certifications, or custom notes (e.g., manuscripts in prep)?',
      chips: ['Add spoken languages', 'Ready to review in editor'],
    },
  },
  'non-technical': {
    personalInfo: {
      reply:
        "Great — tailored for Non-Technical Internships (Management, Marketing, Finance, Operations, or Design). What target internship title, city, email, phone, and LinkedIn profile should we include?",
      chips: ['Business Analyst Intern', 'Marketing / Operations Intern', 'Skip to Education'],
    },
    education: {
      reply:
        'What degree and university are you currently pursuing, when do you graduate, and would you like to include high school details?',
      chips: ['BBA / B.Com / B.A.', 'Include High School', 'Skip to Learning'],
    },
    learning: {
      reply:
        'Optional: Have you completed any business workshops, analytics certifications, case bootcamps, or communication courses?',
      chips: ['Add business/Excel workshop', 'Skip Learning', 'Move to Interests'],
    },
    interests: {
      reply:
        'Optional: Which domain or personal interests would you like shown as tags (e.g., Brand Strategy, Economics, Debate, Photography)?',
      chips: ['Strategy, Writing, Economics', 'Skip Interests', 'Move to Projects'],
    },
    research: {
      reply:
        'Optional for Non-Technical track: Would you like to add any market analysis, case study, capstone report, or campus initiative you led?',
      chips: ['Add case study / report', 'Skip to Career Interests'],
    },
    'career-interests': {
      reply:
        'Optional: What target industries or business functions are you aiming for (e.g., Product Management, Financial Analysis, Growth Marketing, Consulting)?',
      chips: ['Consulting, Operations, Analytics', 'Skip Career Interests', 'Move to Co-Curriculars'],
    },
    achievements: {
      reply:
        'Optional: Did you organize campus fests, compete in case competitions, lead student clubs, or receive scholarships?',
      chips: ['Case competition finalist', 'Student club organizer', 'Skip Co-Curriculars'],
    },
    skills: {
      reply:
        'What verified business, analytical, or creative tools do you use (e.g., Excel, PowerPoint, Tableau, Figma, Google Analytics, Writing)? Dots stay hidden unless you rate 1–5.',
      chips: ['Excel, PowerPoint, Figma, Analytics', 'Keep proficiency dots hidden', 'Next: Prior Internships'],
    },
    experience: {
      reply:
        'Optional: Any prior internships, campus coordinator roles, or volunteer operations work? First-time interns can skip cleanly.',
      chips: ['Skip Prior Internships', 'Add Marketing / Ops Intern role'],
    },
    'custom-sections': {
      reply:
        'Final step (Optional): Would you like to add spoken languages, certifications, or custom awards/activities?',
      chips: ['Add spoken languages', 'Add a certification', 'Ready to review in editor'],
    },
  },
};

export function buildAdaptiveInternshipFallback(
  userMessage: string,
  currentResume: Partial<Resume>,
  activeSection: string,
  sectionFlow: string[]
): {
  reply: string;
  structuredUpdates: Partial<Resume>;
  isSectionCompleted: boolean;
  nextSection: string;
  suggestedChips: string[];
} {
  const detectedTrack = detectInternshipTrackFromText(userMessage);
  const track: InternshipTrack = detectedTrack || currentResume.internshipTrack || 'cs';
  const structuredUpdates: Partial<Resume> = detectedTrack
    ? { internshipTrack: detectedTrack }
    : {};

  const trimmedLower = userMessage.trim().toLowerCase();
  const wantsSkip =
    /\b(skip|next section|move to|don't have|none|pass)\b/.test(trimmedLower);

  const curIdx = Math.max(0, sectionFlow.indexOf(activeSection));
  let targetIdx = curIdx;

  // Allow explicit step jumps such as "Skip to Projects", "Move to Interests", or "Move to custom-sections"
  const jumpMatch = trimmedLower.match(/(?:skip\s+to|move\s+to|go\s+to|jump\s+to)\s+(.+)$/);
  const jumpTarget = jumpMatch ? jumpMatch[1] : wantsSkip ? trimmedLower : '';
  let resolvedIdx = curIdx;

  if (/(custom[- ]?section|additional info|review)/.test(jumpTarget) && wantsSkip) {
    resolvedIdx = Math.max(0, sectionFlow.indexOf('custom-sections'));
  } else if (/education/.test(jumpTarget) && wantsSkip) {
    resolvedIdx = Math.max(0, sectionFlow.indexOf('education'));
  } else if (/learning/.test(jumpTarget) && wantsSkip) {
    resolvedIdx = Math.max(0, sectionFlow.indexOf('learning'));
  } else if (/career interest/.test(jumpTarget) && wantsSkip) {
    resolvedIdx = Math.max(0, sectionFlow.indexOf('career-interests'));
  } else if (/interest/.test(jumpTarget) && wantsSkip) {
    resolvedIdx = Math.max(0, sectionFlow.indexOf('interests'));
  } else if (/(project|research)/.test(jumpTarget) && wantsSkip) {
    resolvedIdx = Math.max(0, sectionFlow.indexOf('research'));
  } else if (/(co-curricular|event|award|achievement)/.test(jumpTarget) && wantsSkip) {
    resolvedIdx = Math.max(0, sectionFlow.indexOf('achievements'));
  } else if (/skill/.test(jumpTarget) && wantsSkip) {
    resolvedIdx = Math.max(0, sectionFlow.indexOf('skills'));
  } else if (/(prior internship|experience)/.test(jumpTarget) && wantsSkip) {
    resolvedIdx = Math.max(0, sectionFlow.indexOf('experience'));
  } else if (wantsSkip && curIdx < sectionFlow.length - 1) {
    resolvedIdx = curIdx + 1;
  }

  // If a skip action targeted the current section (e.g. clicking "Skip Prior Internships" while already on Experience), advance one step
  if (wantsSkip && !jumpMatch && resolvedIdx === curIdx && curIdx < sectionFlow.length - 1) {
    resolvedIdx = curIdx + 1;
  }
  targetIdx = resolvedIdx;

  const nextSection = sectionFlow[targetIdx] || activeSection;
  const spec =
    TRACK_PROMPTS[track][nextSection] ||
    TRACK_PROMPTS[track].personalInfo;

  return {
    reply: spec.reply,
    structuredUpdates,
    isSectionCompleted: wantsSkip,
    nextSection,
    suggestedChips: spec.chips,
  };
}

export function detectEngineeringBranchFromText(text: string): EngineeringBranch | null {
  const lower = text.trim().toLowerCase();
  if (!lower) return null;
  if (/(mechanical|thermodynamics|solidworks|catia|ansys|cad\/cam|fluid mechanics|sae baja|mechatronics)/.test(lower)) {
    return 'mechanical';
  }
  if (/(computer science|cse|information technology|\bit\b|software engineering|dsa|react|node\.js|backend|full[- ]?stack)/.test(lower)) {
    return 'cse-it';
  }
  if (/(electronics and communication|electronics & communication|\bece\b|vlsi|verilog|fpga|embedded|microcontroller|stm32|iot hardware)/.test(lower)) {
    return 'ece';
  }
  if (/(electrical engineering|\bee\b|\beee\b|power systems|plc|scada|matlab simulink|substation|high voltage|electrical machines)/.test(lower)) {
    return 'ee';
  }
  if (/(civil engineering|\bcivil\b|staad|etabs|revit|structural|geotechnical|surveying|concrete|construction management)/.test(lower)) {
    return 'civil';
  }
  if (/(chemical engineering|\bchemical\b|aspen|hysys|process simulation|reactor design|distillation|mass transfer)/.test(lower)) {
    return 'chemical';
  }
  if (/(aerospace|biotech|biomedical|metallurgy|industrial|production|instrumentation|other engineering)/.test(lower)) {
    return 'other';
  }
  return null;
}

const ENGINEERING_BRANCH_PROMPTS: Record<
  EngineeringBranch,
  Record<string, { reply: string; chips: string[] }>
> = {
  mechanical: {
    personalInfo: {
      reply:
        'Great — Mechanical Engineering! What is your full name, city, phone, email, and LinkedIn/portfolio link?',
      chips: ['Share contact details', 'Add LinkedIn URL', 'Next: Career Objective'],
    },
    objective: {
      reply:
        'What Mechanical target role are you aiming for (e.g., Design Engineer, Thermal/CAE Analyst, Production/Manufacturing Engineer)? Share your objective in 1–2 sentences.',
      chips: ['Design & CAD Engineering role', 'Manufacturing / R&D Trainee', 'Skip to Education'],
    },
    education: {
      reply:
        'Which college and Mechanical degree (B.E./B.Tech/M.Tech) are you pursuing or completed, your CGPA/percentage, graduation year, and any Class 12 / Diploma / Class 10 scores you want listed?',
      chips: ['B.Tech Mechanical Engineering', 'Include Class 12 & Class 10 scores', 'Next: Skills & Interests'],
    },
    skills: {
      reply:
        'Which Mechanical & CAD/CAE tools have you genuinely used (e.g., SolidWorks, CATIA V5, ANSYS, AutoCAD, Fusion 360, MATLAB, GD&T, CNC Machining), and what are your technical interests?',
      chips: ['SolidWorks, ANSYS, AutoCAD, MATLAB', 'GD&T, FEA, Thermal Systems', 'Interests: Robotics & EV Powertrains'],
    },
    projects: {
      reply:
        'Tell me about one Mechanical or Mechatronics project (e.g., capstone prototype, FEA/CFD study, CAD mechanism). What was its objective, design approach, components/materials, and validation result?',
      chips: ['Add Capstone Hardware Prototype', 'Add ANSYS / CFD Simulation Project', 'Skip to Internships / Trainings'],
    },
    experience: {
      reply:
        'Optional for freshers: Did you complete an industrial internship, manufacturing plant visit, CNC/metrology training, or ANSYS workshop? Share organization, dates, and what you worked on — or skip.',
      chips: ['Add Production/Plant Internship', 'Add CNC / CAD Training Workshop', 'Skip Internships / Trainings'],
    },
    leadership: {
      reply:
        'Optional: Did you hold any Position of Responsibility (e.g., SAE BAJA/Supra team lead, Mechanical Society coordinator, Technical Fest lead)?',
      chips: ['SAE BAJA / Robotics Lead', 'Department Club Coordinator', 'Skip POR'],
    },
    achievements: {
      reply:
        'Optional: Any CAD design contests, SAE awards, technical symposium presentations, NSS volunteering, or verified certifications?',
      chips: ['National CAD Competition finalist', 'NSS Technical Camp Volunteer', 'Skip to Additional Info'],
    },
    'custom-sections': {
      reply:
        'Final step (Optional): Would you like to add spoken languages or any custom Additional Information section before generating your ATS-ready A4 PDF?',
      chips: ['Add spoken languages', 'Done — review in editor'],
    },
  },
  'cse-it': {
    personalInfo: {
      reply:
        'Got it — CSE / IT Engineering! What is your full name, city, phone, email, LinkedIn, and GitHub profile URL?',
      chips: ['Share contact + GitHub', 'Add LinkedIn URL', 'Next: Career Objective'],
    },
    objective: {
      reply:
        'What software role are you targeting (e.g., SDE, Backend Engineer, Full-Stack Developer, ML/Data Engineer)? Share your Career Objective in 1–2 sentences.',
      chips: ['Software Development Engineer (SDE)', 'Full-Stack / Backend Role', 'Skip to Education'],
    },
    education: {
      reply:
        'Share your CSE/IT degree (B.E./B.Tech/M.Tech), college/university name, graduation timeline, CGPA, and optional Class 12 / Diploma / Class 10 scores.',
      chips: ['B.Tech CSE with CGPA', 'Include Class 12 / Diploma details', 'Next: Skills & Interests'],
    },
    skills: {
      reply:
        'List your verified programming languages, frameworks, databases, developer tools (e.g., C++, Java, Python, TypeScript, React, Node.js, PostgreSQL, Docker, Git), plus technical interests.',
      chips: ['C++, Python, React, PostgreSQL, Git', 'Include core DSA & OS concepts', 'Interests: Distributed Systems'],
    },
    projects: {
      reply:
        'Walk me through a software or systems project you built: what problem did it solve, tech stack used, your individual contribution, and how you tested/validated it?',
      chips: ['Full-Stack Web Platform', 'Systems / API / ML Project', 'Next: Internships / Trainings'],
    },
    experience: {
      reply:
        'Optional for freshers: Have you completed any software engineering internships, coding bootcamps, cloud workshops, or technical trainings?',
      chips: ['Add Software Engineering Intern', 'Add Cloud / DevOps Workshop', 'Skip Internships / Trainings'],
    },
    leadership: {
      reply:
        'Optional: Any Position of Responsibility such as Coding Club Lead, GDSC/ACM chapter coordinator, or Hackathon Organizer?',
      chips: ['Coding Club / GDSC Lead', 'Hackathon Organizer', 'Skip POR'],
    },
    achievements: {
      reply:
        'Optional: Any hackathon placements, ICPC/coding contest ranks, research symposiums, or cloud certifications?',
      chips: ['Hackathon Winner / Finalist', 'AWS / Cloud Certification', 'Skip to Additional Info'],
    },
    'custom-sections': {
      reply:
        'Final step (Optional): Would you like to add spoken languages or any custom Additional Information section?',
      chips: ['Add spoken languages', 'Done — review in editor'],
    },
  },
  ece: {
    personalInfo: {
      reply:
        'Great — ECE Engineering! What is your full name, city, phone, email, LinkedIn, and GitHub/portfolio URL?',
      chips: ['Share contact details', 'Add GitHub / LinkedIn', 'Next: Career Objective'],
    },
    objective: {
      reply:
        'Which ECE domain are you targeting (Embedded Firmware, VLSI RTL Design/Verification, IoT Hardware, Signal Processing)? Share a concise 1–2 sentence objective.',
      chips: ['Embedded Systems & Firmware', 'VLSI RTL Design & Verification', 'Skip to Education'],
    },
    education: {
      reply:
        'Share your ECE degree, institution, graduation year, CGPA, and optional Class 12 / Diploma / Class 10 scores.',
      chips: ['B.E./B.Tech ECE with CGPA', 'Include Diploma / Class 12', 'Next: Skills & Interests'],
    },
    skills: {
      reply:
        'What HDL, embedded languages, EDA/PCB software, and lab hardware have you worked with (e.g., Verilog, SystemVerilog, Embedded C, STM32, Vivado, KiCad, MATLAB, Oscilloscope), plus your interests?',
      chips: ['Verilog, Embedded C, Vivado, KiCad', 'ARM Cortex-M, SPI/I2C/UART', 'Interests: Edge IoT & VLSI'],
    },
    projects: {
      reply:
        'Describe a hardware, FPGA, VLSI, or IoT project: what circuit/architecture did you design, components/tools used, your contribution, and how you tested/verified it in simulation or lab hardware?',
      chips: ['FPGA / Verilog Processor Project', 'Embedded STM32 / IoT Node', 'Next: Internships / Trainings'],
    },
    experience: {
      reply:
        'Optional for freshers: Any embedded/VLSI internships, PCB design workshops, or semiconductor lab trainings?',
      chips: ['Add Embedded Firmware Internship', 'Add VLSI / Vivado Lab Training', 'Skip Internships / Trainings'],
    },
    leadership: {
      reply:
        'Optional: Did you hold any Position of Responsibility (IEEE Electronics Chapter lead, Robotics Club Hardware Lead, Lab coordinator)?',
      chips: ['IEEE Student Chapter Lead', 'Robotics Hardware Mentor', 'Skip POR'],
    },
    achievements: {
      reply:
        'Optional: Any electronics design contests, Texas Instruments / IEEE hackathons, paper presentations, or volunteering?',
      chips: ['Hardware Hackathon / IEEE Award', 'Volunteering / Symposium', 'Skip to Additional Info'],
    },
    'custom-sections': {
      reply:
        'Final step (Optional): Would you like to add spoken languages or any custom Additional Information section?',
      chips: ['Add spoken languages', 'Done — review in editor'],
    },
  },
  ee: {
    personalInfo: {
      reply:
        'Electrical Engineering selected! Share your full name, city, phone, email, and LinkedIn URL.',
      chips: ['Share contact details', 'Add LinkedIn URL', 'Next: Career Objective'],
    },
    objective: {
      reply:
        'What Electrical Engineering role are you targeting (Power Systems, Control & Automation, PLC/SCADA, Power Electronics / EV Drives)?',
      chips: ['Power Systems & Protection', 'PLC / Industrial Automation', 'Skip to Education'],
    },
    education: {
      reply:
        'Share your Electrical Engineering degree, college/university, CGPA, graduation year, and optional Class 12 / Diploma / Class 10 scores.',
      chips: ['B.Tech Electrical Engineering', 'Include Diploma / Class 12', 'Next: Skills & Interests'],
    },
    skills: {
      reply:
        'What EE tools & software do you use (e.g., MATLAB/Simulink, ETAP, PSCAD, AutoCAD Electrical, PLC Ladder Logic, LabVIEW, Power Electronics), and what are your interests?',
      chips: ['MATLAB Simulink, ETAP, PLC, AutoCAD', 'Power Electronics & Control Systems', 'Interests: Smart Grids & EVs'],
    },
    projects: {
      reply:
        'Describe an Electrical Engineering project (e.g., solar inverter, BLDC motor drive, load-flow study, PLC automation): objective, components/simulation tools, and measured test outcomes.',
      chips: ['Three-Phase Inverter / Motor Drive', 'ETAP Grid Load-Flow Study', 'Next: Internships / Trainings'],
    },
    experience: {
      reply:
        'Optional for freshers: Any substation/power plant internships, industrial plant visits, or PLC/SCADA training?',
      chips: ['Add Substation / Grid Internship', 'Add PLC & SCADA Training', 'Skip Internships / Trainings'],
    },
    leadership: {
      reply:
        'Optional: Any Position of Responsibility (IEEE PES Society officer, Technical Club Lead, Energy Cell coordinator)?',
      chips: ['IEEE PES Student Officer', 'Campus Technical Coordinator', 'Skip POR'],
    },
    achievements: {
      reply:
        'Optional: Any IEEE technical symposiums, EV design competitions, volunteering, or electrical safety certifications?',
      chips: ['National Energy Quiz / Symposium', 'Safety / Industrial Cert', 'Skip to Additional Info'],
    },
    'custom-sections': {
      reply:
        'Final step (Optional): Add spoken languages or any custom Additional Information section if helpful.',
      chips: ['Add spoken languages', 'Done — review in editor'],
    },
  },
  civil: {
    personalInfo: {
      reply:
        'Civil Engineering selected! What is your full name, city, phone, email, and LinkedIn/portfolio link?',
      chips: ['Share contact details', 'Add LinkedIn URL', 'Next: Career Objective'],
    },
    objective: {
      reply:
        'Which Civil domain are you targeting (Structural Design, Construction Management, Geotechnical, Transportation, or BIM)? Share a concise objective.',
      chips: ['Structural Design & Analysis', 'Site & Construction Management', 'Skip to Education'],
    },
    education: {
      reply:
        'Share your Civil Engineering degree, university, CGPA, graduation year, and optional Class 12 / Diploma / Class 10 details.',
      chips: ['B.Tech Civil Engineering', 'Include Diploma / Class 12', 'Next: Skills & Interests'],
    },
    skills: {
      reply:
        'What Civil & BIM software and field competencies do you have (e.g., AutoCAD, STAAD.Pro, ETABS, Revit BIM, Primavera P6, Total Station Surveying, Mix Design), and what are your interests?',
      chips: ['AutoCAD, STAAD.Pro, ETABS, Revit', 'Quantity Estimation & Surveying', 'Interests: Sustainable Structures'],
    },
    projects: {
      reply:
        'Describe a Civil Engineering project (e.g., seismic analysis of G+5 building, geopolymer concrete mix study, highway alignment): objective, IS/design codes applied, and test results.',
      chips: ['ETABS / STAAD.Pro Structural Model', 'Concrete Material / Geo Lab Study', 'Next: Internships / Trainings'],
    },
    experience: {
      reply:
        'Optional for freshers: Have you done site/construction internships, PWD/metro industrial visits, or STAAD.Pro / AutoCAD surveying training?',
      chips: ['Add Construction Site Internship', 'Add Total Station / BIM Training', 'Skip Internships / Trainings'],
    },
    leadership: {
      reply:
        'Optional: Did you hold any Position of Responsibility (ASCE Student Chapter lead, Civil Fest Coordinator, Survey Camp team leader)?',
      chips: ['ASCE Chapter Coordinator', 'Survey Camp Team Leader', 'Skip POR'],
    },
    achievements: {
      reply:
        'Optional: Any cube-crushing / bridge-building competitions, ICI symposiums, NSS volunteering, or BIM certifications?',
      chips: ['Bridge Design Competition', 'AutoCAD / Revit Cert', 'Skip to Additional Info'],
    },
    'custom-sections': {
      reply:
        'Final step (Optional): Would you like to add spoken languages or any custom Additional Information section?',
      chips: ['Add spoken languages', 'Done — review in editor'],
    },
  },
  chemical: {
    personalInfo: {
      reply:
        'Chemical Engineering selected! What is your full name, city, phone, email, and LinkedIn profile?',
      chips: ['Share contact details', 'Add LinkedIn URL', 'Next: Career Objective'],
    },
    objective: {
      reply:
        'Which Chemical Engineering path are you targeting (Process Design & Simulation, Plant Operations, Polymer/Materials R&D, Sustainability & Catalysis)?',
      chips: ['Process Engineering & Simulation', 'Plant Operations / R&D Trainee', 'Skip to Education'],
    },
    education: {
      reply:
        'Share your Chemical Engineering degree, college/university, CGPA, graduation year, and optional Class 12 / Diploma / Class 10 results.',
      chips: ['B.Tech Chemical Engineering', 'Include Class 12 scores', 'Next: Skills & Interests'],
    },
    skills: {
      reply:
        'Which simulation tools, core subjects, and lab skills do you know (e.g., Aspen Plus, Aspen HYSYS, MATLAB, DWSIM, P&ID reading, Distillation, Mass/Heat Transfer, HAZOP), plus interests?',
      chips: ['Aspen Plus, HYSYS, MATLAB, DWSIM', 'Process Control & Unit Operations', 'Interests: Green Hydrogen & Catalysis'],
    },
    projects: {
      reply:
        'Tell me about a Chemical Engineering design or lab project (e.g., distillation column simulation, reactor kinetics study, wastewater treatment): objective, methodology, and observed efficiency/yield.',
      chips: ['Aspen Plus Process Simulation', 'Reactor / Lab Experiment Study', 'Next: Internships / Trainings'],
    },
    experience: {
      reply:
        'Optional for freshers: Any refinery/pharma/plant internships, process safety workshops, or industrial training visits?',
      chips: ['Add Process Plant Internship', 'Add Aspen / HAZOP Training', 'Skip Internships / Trainings'],
    },
    leadership: {
      reply:
        'Optional: Did you hold any Position of Responsibility (IIChE Student Chapter lead, Chemical Symposium organizer, Safety Club head)?',
      chips: ['IIChE Student Officer', 'Symposium Organizer', 'Skip POR'],
    },
    achievements: {
      reply:
        'Optional: Any Chem-E-Car contests, process design symposium papers, volunteering, or safety certifications?',
      chips: ['IIChE Paper Presentation', 'NPTEL / Safety Certification', 'Skip to Additional Info'],
    },
    'custom-sections': {
      reply:
        'Final step (Optional): Would you like to add spoken languages or any custom Additional Information section?',
      chips: ['Add spoken languages', 'Done — review in editor'],
    },
  },
  other: {
    personalInfo: {
      reply:
        'Engineering Resume ready! Which specific engineering branch are you in (e.g., Aerospace, Mechatronics, Biotechnology, Instrumentation), and what are your full name, city, phone, email, and LinkedIn?',
      chips: ['Share name, branch & contact info', 'Add LinkedIn / Portfolio', 'Next: Career Objective'],
    },
    objective: {
      reply:
        'Share your Career Objective in 1–2 sentences naming your engineering specialization, core technical skills, and target entry-level or internship roles.',
      chips: ['Target Core Engineering Role', 'R&D / Technical Analyst Role', 'Skip to Education'],
    },
    education: {
      reply:
        'Share your engineering degree, branch/department, college, CGPA/percentage, graduation year, and optional Class 12 / Diploma / Class 10 scores.',
      chips: ['Add B.E./B.Tech Degree', 'Include Diploma / Class 12', 'Next: Skills & Interests'],
    },
    skills: {
      reply:
        'List your technical skills, engineering software/tools, programming languages, and lab/instrumentation skills grouped cleanly by category — plus your technical interests.',
      chips: ['Add Technical Skills & Software', 'Add Programming & Lab Tools', 'Next: Projects'],
    },
    projects: {
      reply:
        'Share an engineering or academic project: its objective, methodology/design approach, components/tools used, your contribution, and verified testing/validation results.',
      chips: ['Add Engineering Capstone Project', 'Add Design / Lab Project', 'Next: Internships / Trainings'],
    },
    experience: {
      reply:
        'Optional for freshers: Add any industrial internships, plant visits, lab trainings, or technical workshops — or skip cleanly.',
      chips: ['Add Industrial Internship', 'Add Technical Training / Workshop', 'Skip Internships / Trainings'],
    },
    leadership: {
      reply:
        'Optional: Any Position of Responsibility (student chapter lead, event coordinator, technical team lead)?',
      chips: ['Club / Chapter Lead', 'Event Coordinator', 'Skip POR'],
    },
    achievements: {
      reply:
        'Optional: Any technical symposiums, design competitions, NSS/volunteering, or verified certifications?',
      chips: ['Design Contest / Symposium', 'Verified Certification', 'Skip to Additional Info'],
    },
    'custom-sections': {
      reply:
        'Final step (Optional): Would you like to add spoken languages or custom Additional Information sections before reviewing your A4 PDF?',
      chips: ['Add spoken languages', 'Done — review in editor'],
    },
  },
};

export function buildAdaptiveEngineeringFallback(
  userMessage: string,
  currentResume: Partial<Resume>,
  activeSection: string,
  sectionFlow: string[]
): {
  reply: string;
  structuredUpdates: Partial<Resume>;
  isSectionCompleted: boolean;
  nextSection: string;
  suggestedChips: string[];
} {
  const detectedBranch = detectEngineeringBranchFromText(userMessage);
  const branch: EngineeringBranch =
    detectedBranch || currentResume.engineeringBranch || 'mechanical';
  const structuredUpdates: Partial<Resume> = detectedBranch
    ? { engineeringBranch: detectedBranch }
    : {};

  const trimmedLower = userMessage.trim().toLowerCase();
  const wantsSkip =
    /\b(skip|next section|move to|don't have|none|pass)\b/.test(trimmedLower);

  const curIdx = Math.max(0, sectionFlow.indexOf(activeSection));
  const jumpMatch = trimmedLower.match(/(?:skip\s+to|move\s+to|go\s+to|jump\s+to)\s+(.+)$/);
  const jumpTarget = jumpMatch ? jumpMatch[1] : wantsSkip ? trimmedLower : '';
  let resolvedIdx = curIdx;

  if (/(additional info|custom[- ]?section|review|done)/.test(jumpTarget) && wantsSkip) {
    resolvedIdx = Math.max(0, sectionFlow.indexOf('custom-sections'));
  } else if (/objective/.test(jumpTarget) && wantsSkip) {
    resolvedIdx = Math.max(0, sectionFlow.indexOf('objective'));
  } else if (/education/.test(jumpTarget) && wantsSkip) {
    resolvedIdx = Math.max(0, sectionFlow.indexOf('education'));
  } else if (/(skill|interest)/.test(jumpTarget) && wantsSkip) {
    resolvedIdx = Math.max(0, sectionFlow.indexOf('skills'));
  } else if (/project/.test(jumpTarget) && wantsSkip) {
    resolvedIdx = Math.max(0, sectionFlow.indexOf('projects'));
  } else if (/(internship|training|experience|workshop)/.test(jumpTarget) && wantsSkip) {
    resolvedIdx = Math.max(0, sectionFlow.indexOf('experience'));
  } else if (/(por|responsibility|leadership)/.test(jumpTarget) && wantsSkip) {
    resolvedIdx = Math.max(0, sectionFlow.indexOf('leadership'));
  } else if (/(extra[- ]?curricular|award|achievement|symposium)/.test(jumpTarget) && wantsSkip) {
    resolvedIdx = Math.max(0, sectionFlow.indexOf('achievements'));
  } else if (wantsSkip && curIdx < sectionFlow.length - 1) {
    resolvedIdx = curIdx + 1;
  }

  if (wantsSkip && !jumpMatch && resolvedIdx === curIdx && curIdx < sectionFlow.length - 1) {
    resolvedIdx = curIdx + 1;
  }

  const nextSection = sectionFlow[resolvedIdx] || activeSection;
  const spec =
    ENGINEERING_BRANCH_PROMPTS[branch][nextSection] ||
    ENGINEERING_BRANCH_PROMPTS[branch].personalInfo;

  return {
    reply: spec.reply,
    structuredUpdates,
    isSectionCompleted: wantsSkip,
    nextSection,
    suggestedChips: spec.chips,
  };
}

export function detectCreativeProfessionFromText(text: string): CreativeProfession | null {
  const lower = text.trim().toLowerCase();
  if (!lower) return null;
  if (/(ui\/ux|product designer|graphic designer|brand designer|creative director|\bdesigner\b|figma|typography)/.test(lower)) {
    return 'designer';
  }
  if (/(cybersecurity|cyber security|infosec|pentest|soc analyst|security engineer|appsec)/.test(lower)) {
    return 'cybersecurity';
  }
  if (/(marketing|brand strategist|growth marketer|seo|demand gen|copywriter|social media)/.test(lower)) {
    return 'marketing';
  }
  if (/(researcher|scientist|postdoc|phd|faculty|laboratory|empirical)/.test(lower)) {
    return 'researcher';
  }
  if (/(mechanical engineer|civil engineer|electrical engineer|hardware engineer|robotics engineer)/.test(lower)) {
    return 'engineer';
  }
  if (/(developer|software engineer|full[- ]?stack|frontend|backend|creative technologist|devops|architect)/.test(lower)) {
    return 'developer';
  }
  if (/\bother profession\b|\bcustom profession\b/.test(lower)) {
    return 'other';
  }
  return null;
}

const CREATIVE_PROFESSION_PROMPTS: Record<
  CreativeProfession,
  Record<string, { reply: string; chips: string[] }>
> = {
  developer: {
    personalInfo: {
      reply:
        'Creative Developer profile selected! Share your full name, primary title, specialization (e.g., Design Systems · Cloud), city/country, email, phone, and website or GitHub URL.',
      chips: ['Share name, title & links', 'Add specialization & tagline', 'Next: Short Resume'],
    },
    experience: {
      reply:
        'Let\'s build your Short Resume timeline on the left column. Share your most recent role—title, company, years (e.g., 2022–Present), and 1–2 crisp highlights.',
      chips: ['Add Senior Software Role', 'Add Product Engineering Role', 'Next: Degrees'],
    },
    education: {
      reply:
        'Next is DEGREES on the right column. What degree(s), specialization, institution, graduation years, or thesis note should we list?',
      chips: ['Add M.Sc. / B.Sc. Computer Science', 'Include Thesis Highlight', 'Next: Skills'],
    },
    skills: {
      reply:
        'List your categorized SKILLS (e.g., Technical, Creative, Professional) plus optional brief descriptions and organizations where applied.',
      chips: ['TypeScript, React, Distributed Systems', 'Design Systems & SVG Craft', 'Next: Circular Proficiencies'],
    },
    'proficiency-circles': {
      reply:
        'For PROGRAMMING PROFICIENCY (circular rings, 2 per row), tell me up to 4–6 core technologies and YOUR chosen percentage (0–100%) for each—or skip to edit with sliders.',
      chips: ['TypeScript (95%), Go (85%), React (92%)', 'Adjust percentages via sliders later', 'Next: Skill Bars'],
    },
    'skill-bars': {
      reply:
        'Now for SKILLS & PROFICIENCY horizontal blue bars: share the broad competencies and percentage (0–100%) you want displayed—or move directly to sliders.',
      chips: ['Frontend Architecture (95%), APIs (85%)', 'Skip to Communication Skills'],
    },
    communication: {
      reply:
        'Optional: Share your COMMUNICATION SKILLS such as conference speaking, RFC authorship, or workshop facilitation.',
      chips: ['Technical Workshops & Keynote Talks', 'Skip Communication Skills', 'Next: Certificates & Grants'],
    },
    certifications: {
      reply:
        'Optional: Any CERTIFICATIONS, fellowships, awards, or GRANTS (dates, issuer, brief note)?',
      chips: ['Add Cloud / Tech Certificate', 'Add Grant or Fellowship', 'Next: Languages'],
    },
    languages: {
      reply:
        'Optional: What spoken LANGUAGES should appear with 5-dot proficiency ratings (only include levels you specify, e.g., Native, Fluent, Intermediate)?',
      chips: ['English (Native), German (Fluent)', 'Skip Languages', 'Next: Talks & Publications'],
    },
    publications: {
      reply:
        'Optional: Share any TALKS & PUBLICATIONS (conference talks, technical articles, open-source papers) with venue and year.',
      chips: ['Add Conference Talk', 'Add Journal / Blog Paper', 'Done — review in editor'],
    },
    'custom-sections': {
      reply:
        'Optional final step: Would you like to include Projects, Leadership, Volunteering, or Custom Sections, or review your 2-column A4 CV now?',
      chips: ['Add Selected Project', 'Ready to review in editor'],
    },
  },
  designer: {
    personalInfo: {
      reply:
        'Creative Designer profile selected! Share your full name, design title, specialization (e.g., Product Design · Brand Systems), tagline, city/country, email, and portfolio URL.',
      chips: ['Share name, title & portfolio', 'Add tagline & personal quote', 'Next: Short Resume'],
    },
    experience: {
      reply:
        'Let\'s populate your Short Resume timeline. Share your recent design roles, studios/companies, dates, and 1–2 concise design outcomes.',
      chips: ['Add Lead Designer Role', 'Add Studio / Product Designer Role', 'Next: Degrees'],
    },
    education: {
      reply:
        'Share your DEGREES, art/design school or university, dates, and optional honors or thesis details.',
      chips: ['Add B.F.A. / M.Des. Degree', 'Next: Categorized Skills'],
    },
    skills: {
      reply:
        'What Creative, Technical, and Research skills belong under SKILLS (e.g., Typography Grids, Design Tokens, Accessibility Audits)?',
      chips: ['Design Systems, Figma Tokens, UX Research', 'Next: Creative Tools Circles'],
    },
    'proficiency-circles': {
      reply:
        'Under CREATIVE TOOLS (circular rings), list tools like Figma, Illustrator, Prototyping, or Motion alongside YOUR chosen 0–100% rating—never invented automatically.',
      chips: ['Figma (95%), UX Research (90%)', 'Edit via Sliders later', 'Next: Skill Bars'],
    },
    'skill-bars': {
      reply:
        'Under SKILLS & PROFICIENCY bars, share key design domains and percentages (0–100%) you want visualized.',
      chips: ['Product Design (95%), Design Systems (90%)', 'Skip to Communication Skills'],
    },
    communication: {
      reply:
        'Optional: Highlight design critiques, stakeholder workshops, client pitches, or mentoring under COMMUNICATION SKILLS.',
      chips: ['Client Pitches & Design Critiques', 'Skip Communication Skills', 'Next: Certificates & Grants'],
    },
    certifications: {
      reply:
        'Optional: Add design certifications (e.g., IAAP CPACC), fellowships, or creative grants.',
      chips: ['Add Accessibility Cert', 'Skip to Languages'],
    },
    languages: {
      reply:
        'Optional: List spoken LANGUAGES and your confirmed proficiency level (Native, Fluent, Intermediate).',
      chips: ['English (Native), Swedish (Fluent)', 'Skip Languages'],
    },
    publications: {
      reply:
        'Optional: Share design conference talks, panels, or editorial articles under TALKS & PUBLICATIONS.',
      chips: ['Add Design Talk', 'Done — review in editor'],
    },
    'custom-sections': {
      reply:
        'Optional final step: Add exhibitions, leadership, or custom portfolio highlights—or review in the editor.',
      chips: ['Add Custom Section', 'Ready to review in editor'],
    },
  },
  cybersecurity: {
    personalInfo: {
      reply:
        'Creative Cybersecurity profile selected! What is your full name, security title, specialization (e.g., AppSec · Zero-Trust Cloud), city/country, email, and GitHub/LinkedIn?',
      chips: ['Share name, title & links', 'Next: Short Resume'],
    },
    experience: {
      reply:
        'Share your recent security engineering or SOC roles—title, organization, years, and concise impact highlights.',
      chips: ['Add Security Architect Role', 'Add AppSec / SOC Role', 'Next: Degrees'],
    },
    education: {
      reply:
        'List your academic DEGREES, specializations, institutions, and graduation years.',
      chips: ['Add M.Sc. Cybersecurity / CS', 'Next: Categorized Skills'],
    },
    skills: {
      reply:
        'Share your categorized security & technical SKILLS (e.g., Technical: Threat Modeling, IAM; Creative/Research: Detection Engineering).',
      chips: ['AppSec, Cloud IAM, Detection Rules', 'Next: Security Tools Circles'],
    },
    'proficiency-circles': {
      reply:
        'Under SECURITY TOOLS (circular rings), list up to 4–6 tools/domains with YOUR chosen 0–100% ratings.',
      chips: ['IAM Security (94%), AppSec (90%)', 'Next: Skill Bars'],
    },
    'skill-bars': {
      reply:
        'Under SKILLS & PROFICIENCY bars, list your high-level security competencies and 0–100% ratings.',
      chips: ['Threat Modeling (94%), Cloud Sec (91%)', 'Next: Communication'],
    },
    communication: {
      reply:
        'Optional: Highlight executive risk briefings, incident postmortems, or security awareness talks under COMMUNICATION SKILLS.',
      chips: ['Executive Risk Briefings & Postmortems', 'Next: Certificates & Grants'],
    },
    certifications: {
      reply:
        'Optional: List CISSP, OSCP, AWS Security Specialty, bug bounty grants, or academic awards under CERTIFICATES & GRANTS.',
      chips: ['Add CISSP / OSCP / AWS Cert', 'Next: Languages'],
    },
    languages: {
      reply:
        'Optional: List spoken LANGUAGES and confirmed proficiency ratings.',
      chips: ['English (Fluent), Norwegian (Native)', 'Next: Talks & Publications'],
    },
    publications: {
      reply:
        'Optional: Share security conference talks (Black Hat, DEF CON, BSides) or CVE/research papers under TALKS & PUBLICATIONS.',
      chips: ['Add Security Talk / Whitepaper', 'Done — review in editor'],
    },
    'custom-sections': {
      reply:
        'Optional final step: Add security projects, advisory memberships, or review your A4 Creative Professional CV.',
      chips: ['Ready to review in editor'],
    },
  },
  marketing: {
    personalInfo: {
      reply:
        'Creative Marketing & Brand Strategist profile selected! Share your full name, title, specialization (e.g., Brand Positioning · Lifecycle Growth), city/country, email, and LinkedIn/website.',
      chips: ['Share name, title & links', 'Next: Short Resume'],
    },
    experience: {
      reply:
        'Let\'s fill your Short Resume timeline—roles, agencies or product companies, dates, and key campaign outcomes.',
      chips: ['Add Brand / Growth Lead Role', 'Next: Degrees'],
    },
    education: {
      reply:
        'What DEGREES, specializations, universities, and graduation years should appear under Degrees?',
      chips: ['Add B.A. / M.B.A. Marketing', 'Next: Categorized Skills'],
    },
    skills: {
      reply:
        'Share categorized SKILLS across Strategy, Creative Direction, and Analytics.',
      chips: ['Brand Strategy, Editorial SEO, Funnel Analytics', 'Next: Marketing Platforms Circles'],
    },
    'proficiency-circles': {
      reply:
        'Under MARKETING PLATFORMS (circular rings), tell me your core platforms/tools and YOUR chosen 0–100% level.',
      chips: ['Brand Messaging (94%), GA4 Analytics (89%)', 'Next: Skill Bars'],
    },
    'skill-bars': {
      reply:
        'Under SKILLS & PROFICIENCY bars, share your broad marketing competencies and 0–100% proficiency.',
      chips: ['Go-To-Market (95%), Demand Gen (88%)', 'Next: Communication'],
    },
    communication: {
      reply:
        'Optional: Add executive storytelling, press interviews, or partner workshops under COMMUNICATION SKILLS.',
      chips: ['Editorial & Executive Storytelling', 'Next: Certificates & Grants'],
    },
    certifications: {
      reply:
        'Optional: Add marketing certifications, creative awards, or campaign grants.',
      chips: ['Add Brand Award / Cert', 'Next: Languages'],
    },
    languages: {
      reply:
        'Optional: List spoken LANGUAGES and confirmed proficiency ratings.',
      chips: ['Spanish (Native), English (Fluent)', 'Next: Talks & Publications'],
    },
    publications: {
      reply:
        'Optional: List keynote panels, case studies, or industry articles under TALKS & PUBLICATIONS.',
      chips: ['Add Panel Talk / Case Study', 'Done — review in editor'],
    },
    'custom-sections': {
      reply:
        'Optional final step: Add featured launches, volunteering, or review your CV in the editor.',
      chips: ['Ready to review in editor'],
    },
  },
  researcher: {
    personalInfo: {
      reply:
        'Creative Researcher profile selected! Share your full name, academic/research title, specialization, city/country, email, and Google Scholar / website link.',
      chips: ['Share name, title & Scholar link', 'Next: Short Resume'],
    },
    experience: {
      reply:
        'Share your research appointments or industry R&D roles for Short Resume (position, institution, years, concise highlight).',
      chips: ['Add Research Scientist / Postdoc', 'Next: Degrees'],
    },
    education: {
      reply:
        'Share your DEGREES (Ph.D., M.Sc., B.Sc.), dissertation highlights, institutions, and years.',
      chips: ['Add Ph.D. & M.Sc. Degrees', 'Next: Categorized Skills'],
    },
    skills: {
      reply:
        'Share categorized Research, Statistical, and Technical skills under SKILLS.',
      chips: ['Experimental Design, Statistical Modeling, Python', 'Next: Research Circles'],
    },
    'proficiency-circles': {
      reply:
        'Under RESEARCH & ANALYSIS (circular rings), list up to 4–6 tools/methods and YOUR chosen 0–100% rating.',
      chips: ['Python / PyTorch (92%), R Studio (86%)', 'Next: Skill Bars'],
    },
    'skill-bars': {
      reply:
        'Under SKILLS & PROFICIENCY bars, share broad research competencies and 0–100% ratings.',
      chips: ['Quantitative Analysis (94%), Scientific Writing (90%)', 'Next: Communication'],
    },
    communication: {
      reply:
        'Optional: Add seminar lectures, peer review, or grant defense experience under COMMUNICATION SKILLS.',
      chips: ['Symposium Keynotes & Grant Defenses', 'Next: Certificates & Grants'],
    },
    certifications: {
      reply:
        'Optional: List research grants, fellowships, and academic honors under CERTIFICATES & GRANTS.',
      chips: ['Add Research Fellowship / Grant', 'Next: Languages'],
    },
    languages: {
      reply:
        'Optional: List spoken LANGUAGES and confirmed proficiency.',
      chips: ['English (Fluent), French (Intermediate)', 'Next: Talks & Publications'],
    },
    publications: {
      reply:
        'Share peer-reviewed journal papers, conference talks, and keynotes under TALKS & PUBLICATIONS.',
      chips: ['Add Journal / Conference Paper', 'Done — review in editor'],
    },
    'custom-sections': {
      reply:
        'Optional final step: Add research projects, memberships, or review your CV in the editor.',
      chips: ['Ready to review in editor'],
    },
  },
  engineer: {
    personalInfo: {
      reply:
        'Creative Engineer profile selected! Share your full name, engineering title, specialization, city/country, email, phone, and website/LinkedIn.',
      chips: ['Share name, title & links', 'Next: Short Resume'],
    },
    experience: {
      reply:
        'Share your engineering roles for Short Resume (position, company, years, concise highlight).',
      chips: ['Add Lead Systems / Design Engineer', 'Next: Degrees'],
    },
    education: {
      reply:
        'Share your engineering DEGREES, specialization, institution, and graduation years.',
      chips: ['Add M.Eng. / B.Tech Degree', 'Next: Categorized Skills'],
    },
    skills: {
      reply:
        'List your categorized Technical, Software, and Domain skills under SKILLS.',
      chips: ['CAD/CAE, Systems Integration, Prototyping', 'Next: Engineering Software Circles'],
    },
    'proficiency-circles': {
      reply:
        'Under ENGINEERING SOFTWARE (circular rings), specify core tools and YOUR chosen 0–100% proficiency.',
      chips: ['SolidWorks (92%), MATLAB (88%)', 'Next: Skill Bars'],
    },
    'skill-bars': {
      reply:
        'Under SKILLS & PROFICIENCY bars, specify key engineering competencies and 0–100% proficiency.',
      chips: ['System Design (92%), Validation & Testing (86%)', 'Next: Communication'],
    },
    communication: {
      reply:
        'Optional: Highlight cross-disciplinary design reviews, technical specifications, or client briefings.',
      chips: ['Design Reviews & Spec Authoring', 'Next: Certificates & Grants'],
    },
    certifications: {
      reply:
        'Optional: Add professional engineering licenses, patents/awards, or grants under CERTIFICATES & GRANTS.',
      chips: ['Add Engineering Cert / Patent Grant', 'Next: Languages'],
    },
    languages: {
      reply:
        'Optional: List spoken LANGUAGES and confirmed proficiency.',
      chips: ['English (Native), German (Intermediate)', 'Next: Talks & Publications'],
    },
    publications: {
      reply:
        'Optional: Add conference talks, technical papers, or patents under TALKS & PUBLICATIONS.',
      chips: ['Add Technical Paper / Talk', 'Done — review in editor'],
    },
    'custom-sections': {
      reply:
        'Optional final step: Add engineering projects or review your CV in the editor.',
      chips: ['Ready to review in editor'],
    },
  },
  other: {
    personalInfo: {
      reply:
        'Creative Professional CV ready! Tell me your profession/role title, specialization, tagline, full name, city/country, email, and portfolio/LinkedIn.',
      chips: ['Share profession, name & contacts', 'Next: Short Resume'],
    },
    experience: {
      reply:
        'Let\'s build your Short Resume timeline—share your recent roles, organizations, years, and concise highlights.',
      chips: ['Add Recent Role', 'Next: Degrees'],
    },
    education: {
      reply:
        'Share your DEGREES, institutions, specializations, and graduation years.',
      chips: ['Add University Degree', 'Next: Categorized Skills'],
    },
    skills: {
      reply:
        'Share categorized SKILLS (Technical, Creative, Professional, or custom category names).',
      chips: ['Add Categorized Skills', 'Next: Circular Proficiencies'],
    },
    'proficiency-circles': {
      reply:
        'For Circular Proficiencies (2-per-row rings), provide tool/skill names and YOUR chosen 0–100% values—never auto-generated.',
      chips: ['Skip to adjust sliders in editor', 'Next: Skill Bars'],
    },
    'skill-bars': {
      reply:
        'For Horizontal Skill Bars, provide competency names and YOUR chosen 0–100% values.',
      chips: ['Skip to Communication Skills'],
    },
    communication: {
      reply:
        'Optional: Highlight speaking, workshops, facilitation, or stakeholder communication under COMMUNICATION SKILLS.',
      chips: ['Add Communication Strength', 'Next: Certificates & Grants'],
    },
    certifications: {
      reply:
        'Optional: List credentials, awards, or grants under CERTIFICATES & GRANTS.',
      chips: ['Add Certificate or Grant', 'Next: Languages'],
    },
    languages: {
      reply:
        'Optional: List spoken LANGUAGES and confirmed levels.',
      chips: ['Skip Languages', 'Next: Talks & Publications'],
    },
    publications: {
      reply:
        'Optional: Add talks, publications, or articles under TALKS & PUBLICATIONS.',
      chips: ['Done — review in editor'],
    },
    'custom-sections': {
      reply:
        'Optional final step: Add Projects, Leadership, Volunteering, or Custom Sections—or review your CV in the editor.',
      chips: ['Ready to review in editor'],
    },
  },
};

export function buildAdaptiveCreativeFallback(
  userMessage: string,
  currentResume: Partial<Resume>,
  activeSection: string,
  sectionFlow: string[]
): {
  reply: string;
  structuredUpdates: Partial<Resume>;
  isSectionCompleted: boolean;
  nextSection: string;
  suggestedChips: string[];
} {
  const detectedProfession = detectCreativeProfessionFromText(userMessage);
  const profession: CreativeProfession =
    detectedProfession || currentResume.creativeProfession || 'developer';
  const structuredUpdates: Partial<Resume> = detectedProfession
    ? { creativeProfession: detectedProfession }
    : {};

  const trimmedLower = userMessage.trim().toLowerCase();
  const wantsSkip =
    /\b(skip|next section|move to|don't have|none|pass)\b/.test(trimmedLower);

  const curIdx = Math.max(0, sectionFlow.indexOf(activeSection));
  const jumpMatch = trimmedLower.match(/(?:skip\s+to|move\s+to|go\s+to|jump\s+to)\s+(.+)$/);
  const jumpTarget = jumpMatch ? jumpMatch[1] : wantsSkip ? trimmedLower : '';
  let resolvedIdx = curIdx;

  if (/(custom[- ]?section|project|review|done)/.test(jumpTarget) && wantsSkip) {
    resolvedIdx = Math.max(0, sectionFlow.indexOf('custom-sections'));
  } else if (/(short resume|experience)/.test(jumpTarget) && wantsSkip) {
    resolvedIdx = Math.max(0, sectionFlow.indexOf('experience'));
  } else if (/(degree|education)/.test(jumpTarget) && wantsSkip) {
    resolvedIdx = Math.max(0, sectionFlow.indexOf('education'));
  } else if (/(circle|circular|proficiency ring)/.test(jumpTarget) && wantsSkip) {
    resolvedIdx = Math.max(0, sectionFlow.indexOf('proficiency-circles'));
  } else if (/(bar|skill bar|proficiency bar)/.test(jumpTarget) && wantsSkip) {
    resolvedIdx = Math.max(0, sectionFlow.indexOf('skill-bars'));
  } else if (/communication/.test(jumpTarget) && wantsSkip) {
    resolvedIdx = Math.max(0, sectionFlow.indexOf('communication'));
  } else if (/(cert|grant|award)/.test(jumpTarget) && wantsSkip) {
    resolvedIdx = Math.max(0, sectionFlow.indexOf('certifications'));
  } else if (/language/.test(jumpTarget) && wantsSkip) {
    resolvedIdx = Math.max(0, sectionFlow.indexOf('languages'));
  } else if (/(talk|publication|paper)/.test(jumpTarget) && wantsSkip) {
    resolvedIdx = Math.max(0, sectionFlow.indexOf('publications'));
  } else if (/skill/.test(jumpTarget) && wantsSkip) {
    resolvedIdx = Math.max(0, sectionFlow.indexOf('skills'));
  } else if (wantsSkip && curIdx < sectionFlow.length - 1) {
    resolvedIdx = curIdx + 1;
  }

  if (wantsSkip && !jumpMatch && resolvedIdx === curIdx && curIdx < sectionFlow.length - 1) {
    resolvedIdx = curIdx + 1;
  }

  const nextSection = sectionFlow[resolvedIdx] || activeSection;
  const spec =
    CREATIVE_PROFESSION_PROMPTS[profession][nextSection] ||
    CREATIVE_PROFESSION_PROMPTS[profession].personalInfo;

  return {
    reply: spec.reply,
    structuredUpdates,
    isSectionCompleted: wantsSkip,
    nextSection,
    suggestedChips: spec.chips,
  };
}

export function getInterviewDraftKey(resumeId: string, templateId: string): string {
  return `${DRAFT_STORAGE_PREFIX}${resumeId}_${templateId}`;
}

export function loadInterviewDraft(
  resumeId: string,
  templateId: string
): InterviewDraftState | null {
  if (typeof window === 'undefined' || !window.sessionStorage || !resumeId) return null;
  try {
    const raw = window.sessionStorage.getItem(getInterviewDraftKey(resumeId, templateId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as InterviewDraftState;
    if (!parsed || !Array.isArray(parsed.messages)) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function saveInterviewDraft(
  resumeId: string,
  templateId: string,
  draft: InterviewDraftState
): void {
  if (typeof window === 'undefined' || !window.sessionStorage || !resumeId) return;
  try {
    window.sessionStorage.setItem(
      getInterviewDraftKey(resumeId, templateId),
      JSON.stringify(draft)
    );
  } catch {
    // ignore quota errors cleanly
  }
}

export function clearInterviewDraft(resumeId: string, templateId: string): void {
  if (typeof window === 'undefined' || !window.sessionStorage || !resumeId) return;
  try {
    window.sessionStorage.removeItem(getInterviewDraftKey(resumeId, templateId));
  } catch {
    // ignore storage errors cleanly
  }
}
