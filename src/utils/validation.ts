import type { Resume } from '../types/resume';
import { validateDailyActivities } from './dailyActivities';

export function validateEmail(email: string): boolean {
  if (!email || typeof email !== 'string') return false;
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email.trim());
}

export function validatePassword(password: string): { isValid: boolean; message?: string } {
  if (!password || typeof password !== 'string') {
    return { isValid: false, message: 'Password is required' };
  }
  if (password.length < 6) {
    return { isValid: false, message: 'Password must be at least 6 characters' };
  }
  return { isValid: true };
}

export function validateSignup(
  fullName: string,
  email: string,
  password: string,
  confirmPassword: string
): { isValid: boolean; errors: Record<string, string> } {
  const errors: Record<string, string> = {};

  if (!fullName || fullName.trim().length === 0) {
    errors.fullName = 'Full name is required';
  } else if (fullName.trim().length < 2) {
    errors.fullName = 'Full name must be at least 2 characters';
  }

  if (!email || email.trim().length === 0) {
    errors.email = 'Email address is required';
  } else if (!validateEmail(email)) {
    errors.email = 'Please enter a valid email address';
  }

  const pwdValidation = validatePassword(password);
  if (!pwdValidation.isValid) {
    errors.password = pwdValidation.message || 'Invalid password';
  }

  if (!confirmPassword || confirmPassword.length === 0) {
    errors.confirmPassword = 'Please confirm your password';
  } else if (password !== confirmPassword) {
    errors.confirmPassword = 'Passwords do not match';
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
}

export function validateLogin(
  email: string,
  password: string
): { isValid: boolean; errors: Record<string, string> } {
  const errors: Record<string, string> = {};

  if (!email || email.trim().length === 0) {
    errors.email = 'Email address is required';
  } else if (!validateEmail(email)) {
    errors.email = 'Please enter a valid email address';
  }

  if (!password || password.length === 0) {
    errors.password = 'Password is required';
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
}

export function calculateResumeCompleteness(resume: Partial<Resume>): number {
  if (!resume) return 0;

  if (resume.template === 'classic-professional') {
    let score = 0;
    if (resume.personalInfo) {
      if (resume.personalInfo.fullName?.trim()) score += 8;
      if (resume.personalInfo.email?.trim()) score += 6;
      if (resume.personalInfo.phone?.trim()) score += 6;
    }
    if (resume.objective?.trim()) score += 10;
    if (resume.education && resume.education.length > 0) score += 20;
    if (resume.experience && resume.experience.length > 0) score += 15;
    if (resume.languages && resume.languages.some((l) => l.language?.trim())) score += 8;
    if (resume.skills && resume.skills.some((s) => s.skills && s.skills.length > 0)) score += 12;
    if (resume.skillMatrix && resume.skillMatrix.some((m) => m.skill?.trim() && m.level !== null)) score += 10;

    let bonus = 0;
    if (resume.thesis?.title?.trim()) bonus += 2;
    if (resume.personalQuote?.trim()) bonus += 1;
    if ((resume.interestItems || []).some((i) => i.name?.trim()) || resume.interests?.trim()) bonus += 2;
    if ((resume.customSections || []).some((cs) => cs.title?.trim() && cs.bullets?.length > 0)) bonus += 2;
    if (resume.referencesDisplayMode === 'on-request' || (resume.references && resume.references.length > 0)) bonus += 2;
    score += Math.min(5, bonus);
    return Math.min(100, score);
  }

  if (resume.template === 'two-column-professional') {
    let score = 0;
    if (resume.personalInfo) {
      if (resume.personalInfo.fullName?.trim()) score += 10;
      if (resume.personalInfo.email?.trim()) score += 6;
      if (resume.personalInfo.jobTitle?.trim()) score += 4;
    }
    if (resume.education && resume.education.length > 0) score += 20;
    const hasExp = Boolean(resume.experience && resume.experience.length > 0);
    const hasProj = Boolean(resume.projects && resume.projects.length > 0);
    if (hasExp && hasProj) score += 30;
    else if (hasExp || hasProj) score += 20;

    if (
      (resume.strengths && resume.strengths.some((s) => s.trim().length > 0)) ||
      (resume.skills && resume.skills.some((s) => s.skills && s.skills.length > 0))
    ) {
      score += 15;
    }
    if (resume.languages && resume.languages.some((l) => l.language?.trim())) {
      score += 10;
    }

    let bonus = 0;
    if (resume.personalQuote?.trim()) bonus += 3;
    if (resume.achievements && resume.achievements.length > 0) bonus += 4;
    const dailyVal = validateDailyActivities(resume.dailyActivities || []);
    if (dailyVal.validItems.length > 0 && dailyVal.totalHours <= 24) bonus += 4;
    if (resume.publications && resume.publications.length > 0) bonus += 4;
    if (
      resume.referencesDisplayMode === 'on-request' ||
      (resume.references && resume.references.length > 0)
    ) {
      bonus += 3;
    }
    score += Math.min(15, bonus);
    return Math.min(100, score);
  }

  if (resume.template === 'jakes-resume') {
    let score = 0;
    if (resume.personalInfo) {
      if (resume.personalInfo.fullName?.trim()) score += 8;
      if (resume.personalInfo.email?.trim()) score += 6;
      if (resume.personalInfo.phone?.trim()) score += 6;
    }
    if (resume.education && resume.education.length > 0) {
      score += 25;
    }
    if (resume.experience && resume.experience.length > 0) {
      score += 20;
    }
    if (resume.projects && resume.projects.length > 0) {
      score += 15;
    }
    if (resume.skills && resume.skills.some((s) => s.skills && s.skills.length > 0)) {
      score += 15;
    }
    let bonus = 0;
    if ((resume.coursework || []).some((c) => c.trim().length > 0)) bonus += 3;
    if (resume.leadership && resume.leadership.length > 0) bonus += 2;
    score += Math.min(5, bonus);
    return Math.min(100, score);
  }

  if (resume.template === 'software-developer') {
    let score = 0;
    if (resume.personalInfo) {
      if (resume.personalInfo.fullName?.trim()) score += 10;
      if (resume.personalInfo.email?.trim()) score += 5;
      if (resume.personalInfo.phone?.trim()) score += 5;
    }
    if (resume.education && resume.education.length > 0) score += 20;
    const hasExp = Boolean(resume.experience && resume.experience.length > 0);
    const hasProj = Boolean(resume.projects && resume.projects.length > 0);
    if (hasExp && hasProj) score += 40;
    else if (hasExp || hasProj) score += 25;

    const totalSkills = (resume.skills || []).reduce((acc, s) => acc + (s.skills?.length || 0), 0);
    if (totalSkills >= 5) score += 12;
    else if (totalSkills > 0) score += 7;

    let bonus = 0;
    if ((resume.coursework || []).some((c) => c.trim().length > 0)) bonus += 2;
    if (resume.leadership && resume.leadership.length > 0) bonus += 2;
    if (resume.certifications && resume.certifications.length > 0) bonus += 2;
    if (resume.achievements && resume.achievements.length > 0) bonus += 2;
    score += Math.min(8, bonus);
    return Math.min(100, score);
  }

  if (resume.template === 'harvard-style') {
    const bg = resume.targetBackground || 'student';
    let score = 0;

    if (resume.personalInfo) {
      if (resume.personalInfo.fullName?.trim()) score += 10;
      if (resume.personalInfo.email?.trim()) score += 8;
      if (resume.personalInfo.phone?.trim()) score += 7;
    }

    if (resume.education && resume.education.length > 0) {
      score += 25;
    }

    const hasExp = Boolean(resume.experience && resume.experience.length > 0);
    const hasLead = Boolean(resume.leadership && resume.leadership.length > 0);
    const hasProj = Boolean(resume.projects && resume.projects.length > 0);

    if (bg === 'experienced') {
      if (hasExp) score += 25;
      if (hasLead) score += 10;
    } else {
      if (hasExp && hasLead) {
        score += 35;
      } else if (hasExp || (hasLead && hasProj)) {
        score += 30;
      } else if (hasLead || hasProj) {
        score += 22;
      }
    }

    const totalSkills = (resume.skills || []).reduce((acc, s) => acc + (s.skills?.length || 0), 0);
    if (totalSkills >= 3) score += 10;
    else if (totalSkills > 0) score += 6;

    const hasLangs = Boolean(resume.languages && resume.languages.some((l) => l.language?.trim()));
    const hasInterests = Boolean(
      (resume.interestItems && resume.interestItems.some((i) => i.name?.trim())) ||
        resume.interests?.trim()
    );
    const hasLab = Boolean(resume.labSkills && resume.labSkills.some((s) => s.trim()));
    if (hasLangs || hasInterests || hasLab) {
      score += 5;
    }

    let bonus = 0;
    if (resume.studyAbroad && resume.studyAbroad.some((s) => s.institution?.trim())) bonus += 2;
    if (
      (resume.education || []).some(
        (e) =>
          Boolean(e.thesisTitle?.trim()) ||
          Boolean(e.honors?.trim()) ||
          (Array.isArray(e.coursework) ? e.coursework.length > 0 : Boolean(e.coursework?.trim()))
      )
    ) {
      bonus += 2;
    }
    if (resume.achievements && resume.achievements.length > 0) bonus += 2;
    if (resume.certifications && resume.certifications.length > 0) bonus += 2;
    if (resume.customSections && resume.customSections.some((cs) => cs.title?.trim())) bonus += 2;
    score += Math.min(5, bonus);

    return Math.min(100, score);
  }

  if (resume.template === 'elegant-serif') {
    const bg = resume.targetBackground || 'researcher';
    let score = 0;

    if (resume.personalInfo) {
      if (resume.personalInfo.fullName?.trim()) score += 10;
      if (resume.personalInfo.email?.trim()) score += 6;
      if (resume.personalInfo.phone?.trim()) score += 4;
      if (resume.personalInfo.jobTitle?.trim()) score += 2;
    }

    if (
      resume.objective?.trim() ||
      resume.academicInterests?.trim() ||
      resume.careerGoals?.trim()
    ) {
      score += 8;
    }

    if (resume.education && resume.education.length > 0) {
      score += 20;
    }

    const hasExp = Boolean(resume.experience && resume.experience.length > 0);
    const hasResearch = Boolean(
      resume.researchExperience && resume.researchExperience.length > 0
    );
    const hasProj = Boolean(resume.projects && resume.projects.length > 0);

    if (bg === 'experienced') {
      if (hasExp) score += 25;
      if (hasProj || hasResearch) score += 8;
    } else if (bg === 'researcher') {
      if (hasExp) score += 15;
      if (hasResearch) score += 12;
      if (hasProj) score += 6;
    } else {
      // student or fresher
      if (hasExp && hasProj) score += 30;
      else if (hasExp || hasProj || hasResearch) score += 22;
    }

    const totalSkills = (resume.skills || []).reduce(
      (acc, s) => acc + (s.skills?.length || 0),
      0
    );
    if (totalSkills >= 4) score += 12;
    else if (totalSkills > 0) score += 7;

    let bonus = 0;
    if (resume.publications && resume.publications.length > 0) bonus += 4;
    if (resume.achievements && resume.achievements.length > 0) bonus += 3;
    if (resume.languages && resume.languages.some((l) => l.language?.trim())) bonus += 2;
    if (resume.certifications && resume.certifications.length > 0) bonus += 2;
    if (resume.leadership && resume.leadership.length > 0) bonus += 2;
    if (resume.memberships && resume.memberships.length > 0) bonus += 1;
    if (
      (resume.interestItems && resume.interestItems.some((i) => i.name?.trim())) ||
      resume.interests?.trim()
    ) {
      bonus += 1;
    }
    if (
      resume.referencesDisplayMode === 'on-request' ||
      (resume.references && resume.references.length > 0)
    ) {
      bonus += 2;
    }
    score += Math.min(13, bonus);

    return Math.min(100, score);
  }

  let score = 0;
  const totalWeight = 100;

  // Header / Personal Info (weight: 20)
  if (resume.personalInfo) {
    if (resume.personalInfo.fullName?.trim()) score += 8;
    if (resume.personalInfo.email?.trim()) score += 6;
    if (resume.personalInfo.phone?.trim()) score += 6;
  }

  // Objective / Summary (weight: 10)
  if (resume.objective && resume.objective.trim().length > 0) {
    score += 10;
  }

  // Education (weight: 20)
  if (resume.education && resume.education.length > 0) {
    score += 20;
  }

  // Experience (weight: 15)
  if (resume.experience && resume.experience.length > 0) {
    score += 15;
  }

  // Skills (weight: 15)
  if (resume.skills && resume.skills.some((s) => s.skills && s.skills.length > 0)) {
    score += 15;
  }

  // Projects or Research (weight: 10)
  if (resume.projects && resume.projects.length > 0) {
    score += 10;
  }

  // Publications or Awards or Leadership or Certifications (bonus up to 10)
  let extra = 0;
  if (resume.publications && resume.publications.length > 0) extra += 4;
  if (resume.achievements && resume.achievements.length > 0) extra += 3;
  if (resume.leadership && resume.leadership.length > 0) extra += 2;
  if (resume.certifications && resume.certifications.length > 0) extra += 2;
  if (resume.references && resume.references.length > 0) extra += 1;
  score += Math.min(10, extra);

  return Math.min(totalWeight, score);
}

function analyzeJakesResumeSections(resume: Partial<Resume>): import('../types/resume').CvCompletenessReport {
  const sections: import('../types/resume').SectionAnalysis[] = [];
  const recs: string[] = [];

  // 1. Header / Contact Info
  const pi = resume.personalInfo;
  const piIssues: string[] = [];
  const piSuggestions: string[] = [];
  let piScore = 0;
  if (pi?.fullName?.trim()) piScore += 40;
  else piIssues.push('Full name is missing.');
  if (pi?.email?.trim()) piScore += 30;
  else piIssues.push('Email address is missing.');
  if (pi?.phone?.trim()) piScore += 30;
  else piIssues.push('Phone number is missing.');

  if (!pi?.city && !pi?.streetAddress) {
    piSuggestions.push('Add your address or City, State for the centered header line.');
  }
  if (!pi?.linkedin && !pi?.github) {
    piSuggestions.push('Add LinkedIn or GitHub profile URLs for developer roles.');
  }

  sections.push({
    sectionId: 'header',
    name: '1. Header / Contact Information',
    status: piScore === 100 ? 'complete' : piScore > 0 ? 'needs_details' : 'needs_details',
    statusLabel: piScore === 100 ? 'Completed' : piScore > 0 ? 'In progress' : 'Not started',
    isOptional: false,
    score: piScore,
    issues: piIssues,
    suggestions: piSuggestions,
  });
  if (piScore < 100) recs.push('Complete your name, email, and phone in Header / Contact Information.');

  // 2. Education
  const edu = resume.education || [];
  let eduStatus: import('../types/resume').SectionStatus = 'needs_details';
  let eduScore = 0;
  const eduIssues: string[] = [];
  const eduSuggestions: string[] = [];
  if (edu.length > 0) {
    const valid = edu.filter((e) => e.institution?.trim() && e.degree?.trim());
    if (valid.length === edu.length) {
      eduStatus = 'complete';
      eduScore = 100;
      if (edu.some((e) => !e.location?.trim())) {
        eduSuggestions.push('Add university City, State so it aligns on the right.');
      }
    } else {
      eduStatus = 'needs_details';
      eduScore = 55;
      eduIssues.push('Some education entries lack an institution or degree name.');
    }
  } else {
    eduIssues.push("Jake's Resume leads with Education—add your current or latest degree.");
    recs.push('Add your degree, university, dates, and location under Education.');
  }
  sections.push({
    sectionId: 'education',
    name: '2. Education',
    status: eduStatus,
    statusLabel: eduStatus === 'complete' ? 'Completed' : edu.length > 0 ? 'In progress' : 'Not started',
    isOptional: false,
    score: eduScore,
    issues: eduIssues,
    suggestions: eduSuggestions,
  });

  // 3. Relevant Coursework (Optional)
  const cw = (resume.coursework || []).filter((c) => c.trim().length > 0);
  sections.push({
    sectionId: 'coursework',
    name: '3. Relevant Coursework',
    status: cw.length > 0 ? 'complete' : 'optional_empty',
    statusLabel: cw.length > 0 ? 'Completed' : 'Not started (Optional)',
    isOptional: true,
    score: cw.length > 0 ? 100 : 0,
    issues: [],
    suggestions:
      cw.length === 0
        ? ['Optional: Add 4–8 core technical courses (hidden automatically if left empty).']
        : cw.length < 4
        ? ['Consider adding 4 or more courses to fill a balanced 4-column coursework row.']
        : [],
  });

  // 4. Experience
  const exp = resume.experience || [];
  let expStatus: import('../types/resume').SectionStatus = 'needs_review';
  let expScore = 20;
  const expIssues: string[] = [];
  const expSuggestions: string[] = [];
  if (exp.length > 0) {
    const incomplete = exp.filter(
      (e) =>
        !e.company?.trim() ||
        !e.position?.trim() ||
        !e.highlights ||
        e.highlights.filter((h) => h.trim().length > 0).length === 0
    );
    if (incomplete.length > 0) {
      expStatus = 'needs_details';
      expScore = 65;
      expIssues.push(`${incomplete.length} experience entry lacks company, title, or action bullets.`);
      recs.push('Add measurable impact bullet points under Experience.');
    } else {
      expStatus = 'complete';
      expScore = 100;
    }
  } else {
    expIssues.push('No work or internship experience added yet.');
    expSuggestions.push('Add internships, co-ops, part-time roles, or software jobs.');
    recs.push('Add relevant internships or work experience.');
  }
  sections.push({
    sectionId: 'experience',
    name: '4. Experience',
    status: expStatus,
    statusLabel:
      expStatus === 'complete' ? 'Completed' : exp.length > 0 ? 'In progress' : 'Not started',
    isOptional: false,
    score: expScore,
    issues: expIssues,
    suggestions: expSuggestions,
  });

  // 5. Projects
  const proj = resume.projects || [];
  let projStatus: import('../types/resume').SectionStatus = 'optional_empty';
  let projScore = 0;
  const projIssues: string[] = [];
  const projSuggestions: string[] = [];
  if (proj.length > 0) {
    const missingTech = proj.filter((p) => !p.technologies || p.technologies.length === 0);
    const missingBullets = proj.filter(
      (p) =>
        !p.description?.trim() &&
        (!p.highlights || p.highlights.filter((h) => h.trim().length > 0).length === 0)
    );
    if (missingTech.length > 0 || missingBullets.length > 0) {
      projStatus = 'needs_details';
      projScore = 65;
      if (missingTech.length > 0) projIssues.push('Add technologies used (shown right next to Project Title).');
      if (missingBullets.length > 0) projIssues.push('Add 2–3 technical accomplishment bullets per project.');
    } else {
      projStatus = 'complete';
      projScore = 100;
    }
  } else {
    projSuggestions.push('Add software engineering or academic projects with technologies used.');
    recs.push('Add at least 1–2 technical projects showcasing your stack.');
  }
  sections.push({
    sectionId: 'projects',
    name: '5. Projects',
    status: projStatus,
    statusLabel:
      projStatus === 'complete' ? 'Completed' : proj.length > 0 ? 'In progress' : 'Not started (Optional)',
    isOptional: true,
    score: projScore,
    issues: projIssues,
    suggestions: projSuggestions,
  });

  // 6. Technical Skills
  const skills = resume.skills || [];
  const totalSkillsCount = skills.reduce((acc, s) => acc + (s.skills?.length || 0), 0);
  let skillStatus: import('../types/resume').SectionStatus = 'needs_details';
  let skillScore = 0;
  const skillIssues: string[] = [];
  const skillSuggestions: string[] = [];
  if (totalSkillsCount >= 5) {
    skillStatus = 'complete';
    skillScore = 100;
  } else if (totalSkillsCount > 0) {
    skillStatus = 'needs_details';
    skillScore = 60;
    skillIssues.push('List at least 5 skills grouped under Languages, Developer Tools, and Frameworks.');
  } else {
    skillIssues.push('No technical skills added yet.');
    skillSuggestions.push('Group skills into Languages, Developer Tools, and Technologies/Frameworks.');
    recs.push('Add your technical stack under Technical Skills.');
  }
  sections.push({
    sectionId: 'skills',
    name: '6. Technical Skills',
    status: skillStatus,
    statusLabel:
      skillStatus === 'complete' ? 'Completed' : totalSkillsCount > 0 ? 'In progress' : 'Not started',
    isOptional: false,
    score: skillScore,
    issues: skillIssues,
    suggestions: skillSuggestions,
  });

  // 7. Leadership / Extracurricular (Optional)
  const lead = resume.leadership || [];
  sections.push({
    sectionId: 'leadership',
    name: '7. Leadership / Extracurricular',
    status: lead.length > 0 ? 'complete' : 'optional_empty',
    statusLabel: lead.length > 0 ? 'Completed' : 'Not started (Optional)',
    isOptional: true,
    score: lead.length > 0 ? 100 : 0,
    issues: [],
    suggestions:
      lead.length === 0
        ? ['Optional: Add clubs, hackathons, or leadership roles (hidden if empty).']
        : [],
  });

  const overallScore = calculateResumeCompleteness(resume);
  let overallStatus: 'excellent' | 'good' | 'in_progress' | 'needs_work' = 'needs_work';
  if (overallScore >= 85) overallStatus = 'excellent';
  else if (overallScore >= 65) overallStatus = 'good';
  else if (overallScore >= 40) overallStatus = 'in_progress';

  return {
    overallScore,
    overallStatus,
    sections,
    topRecommendations:
      recs.length > 0
        ? recs
        : ["Your Jake's Resume sections are well-structured and ready for A4 PDF export."],
  };
}

function analyzeClassicProfessionalSections(
  resume: Partial<Resume>
): import('../types/resume').CvCompletenessReport {
  const sections: import('../types/resume').SectionAnalysis[] = [];
  const recs: string[] = [];

  // 1. Header & Personal Information
  const pi = resume.personalInfo;
  const piIssues: string[] = [];
  const piSuggestions: string[] = [];
  let piScore = 0;
  if (pi?.fullName?.trim()) piScore += 40;
  else piIssues.push('Full name is missing.');
  if (pi?.email?.trim()) piScore += 30;
  else piIssues.push('Email address is missing.');
  if (pi?.phone?.trim()) piScore += 30;
  else piIssues.push('Primary phone number is missing.');

  if (!pi?.city?.trim() || !pi?.country?.trim()) {
    piSuggestions.push('Add city and country (or full address) for the structured personal details column.');
  }
  if (!pi?.photoUrl) {
    piSuggestions.push('Optional: Upload a cropped portrait or square profile photo if expected in your region.');
  }
  if (!pi?.linkedin && !pi?.github && !pi?.website) {
    piSuggestions.push('Add LinkedIn, GitHub, or personal website links.');
  }

  sections.push({
    sectionId: 'header',
    name: '1. Header & Personal Details',
    status: piScore === 100 ? 'complete' : 'needs_details',
    statusLabel: piScore === 100 ? 'Completed' : piScore > 0 ? 'In progress' : 'Not started',
    isOptional: false,
    score: piScore,
    issues: piIssues,
    suggestions: piSuggestions,
  });
  if (piScore < 100) recs.push('Complete your full name, email, and primary phone in Header & Personal Details.');

  // 2. Summary & Personal Quote
  const obj = resume.objective?.trim() || '';
  const hasQuote = Boolean(resume.personalQuote?.trim());
  const objWords = obj.split(/\s+/).filter(Boolean).length;
  let objStatus: import('../types/resume').SectionStatus = 'optional_empty';
  let objScore = 0;
  const objIssues: string[] = [];
  const objSuggestions: string[] = [];

  if (objWords >= 20) {
    objStatus = 'complete';
    objScore = 100;
  } else if (objWords > 0 || hasQuote) {
    objStatus = 'needs_details';
    objScore = 60;
    if (objWords === 0) {
      objIssues.push('Add a brief professional summary paragraph to complement your personal quote.');
    } else {
      objIssues.push('Professional summary is brief (under 20 words).');
    }
  } else {
    objSuggestions.push('Optional: Add a concise professional summary and optional opening quote.');
  }

  sections.push({
    sectionId: 'objective',
    name: '2. Summary & Quote',
    status: objStatus,
    statusLabel:
      objStatus === 'complete'
        ? 'Completed'
        : objStatus === 'needs_details'
        ? 'In progress'
        : 'Not started (Optional)',
    isOptional: true,
    score: objScore,
    issues: objIssues,
    suggestions: objSuggestions,
  });

  // 3. Education
  const edu = resume.education || [];
  let eduStatus: import('../types/resume').SectionStatus = 'needs_details';
  let eduScore = 0;
  const eduIssues: string[] = [];
  const eduSuggestions: string[] = [];
  if (edu.length > 0) {
    const valid = edu.filter((e) => e.institution?.trim() && e.degree?.trim());
    if (valid.length === edu.length) {
      eduStatus = 'complete';
      eduScore = 100;
      if (edu.some((e) => !e.description?.trim() && !e.achievements?.trim())) {
        eduSuggestions.push('Optional: Add short coursework, grade, or focus descriptions under education.');
      }
    } else {
      eduStatus = 'needs_details';
      eduScore = 55;
      eduIssues.push('Some education entries are missing an institution or degree title.');
    }
  } else {
    eduIssues.push('Add at least one degree, diploma, or academic qualification.');
    recs.push('Add your education history under Education.');
  }
  sections.push({
    sectionId: 'education',
    name: '3. Education',
    status: eduStatus,
    statusLabel: eduStatus === 'complete' ? 'Completed' : edu.length > 0 ? 'In progress' : 'Not started',
    isOptional: false,
    score: eduScore,
    issues: eduIssues,
    suggestions: eduSuggestions,
  });

  // 4. Master's Thesis (Optional)
  const thesis = resume.thesis;
  const hasThesis = Boolean(thesis?.title?.trim());
  const thesisHidden = (resume.hiddenSections || []).includes('thesis');
  sections.push({
    sectionId: 'thesis',
    name: "4. Master's Thesis",
    status: hasThesis ? 'complete' : 'optional_empty',
    statusLabel: thesisHidden
      ? 'Skipped'
      : hasThesis
      ? 'Completed'
      : 'Not started (Optional)',
    isOptional: true,
    score: hasThesis ? 100 : 0,
    issues: [],
    suggestions: !hasThesis
      ? ["Optional: Add your Master's or Bachelor's thesis title, supervisors, and abstract (hidden if empty)."]
      : [],
  });

  // 5. Experience (Vocational & Professional)
  const exp = resume.experience || [];
  let expStatus: import('../types/resume').SectionStatus = 'optional_empty';
  let expScore = 0;
  const expIssues: string[] = [];
  const expSuggestions: string[] = [];
  if (exp.length > 0) {
    const incomplete = exp.filter(
      (e) =>
        !e.company?.trim() ||
        !e.position?.trim() ||
        (!e.description?.trim() &&
          (!e.highlights || e.highlights.filter((h) => h.trim().length > 0).length === 0))
    );
    if (incomplete.length > 0) {
      expStatus = 'needs_details';
      expScore = 65;
      expIssues.push(`${incomplete.length} experience entry needs role description or bullet highlights.`);
      recs.push('Flesh out responsibilities and sub-achievements in Experience.');
    } else {
      expStatus = 'complete';
      expScore = 100;
    }
  } else {
    expStatus = 'optional_empty';
    expSuggestions.push('Optional for freshers/students; add internships, vocational training, or full-time roles when available.');
  }
  sections.push({
    sectionId: 'experience',
    name: '5. Experience (Vocational & Professional)',
    status: expStatus,
    statusLabel:
      expStatus === 'complete'
        ? 'Completed'
        : exp.length > 0
        ? 'In progress'
        : 'Not started (Optional)',
    isOptional: true,
    score: expScore,
    issues: expIssues,
    suggestions: expSuggestions,
  });

  // 6. Languages
  const langs = (resume.languages || []).filter((l) => l.language?.trim());
  let langStatus: import('../types/resume').SectionStatus = 'optional_empty';
  let langScore = 0;
  const langIssues: string[] = [];
  const langSuggestions: string[] = [];
  if (langs.length > 0) {
    const missingProf = langs.filter((l) => !l.proficiency?.trim());
    if (missingProf.length > 0) {
      langStatus = 'needs_details';
      langScore = 65;
      langIssues.push('Select a proficiency level for every listed language.');
    } else {
      langStatus = 'complete';
      langScore = 100;
    }
  } else {
    langSuggestions.push('Add spoken languages with proficiency levels and optional comments.');
    recs.push('Add your language proficiencies under Languages.');
  }
  sections.push({
    sectionId: 'languages',
    name: '6. Languages',
    status: langStatus,
    statusLabel:
      langStatus === 'complete'
        ? 'Completed'
        : langs.length > 0
        ? 'In progress'
        : 'Not started (Optional)',
    isOptional: true,
    score: langScore,
    issues: langIssues,
    suggestions: langSuggestions,
  });

  // 7. Computer Skills
  const skills = resume.skills || [];
  const totalSkillsCount = skills.reduce((acc, s) => acc + (s.skills?.length || 0), 0);
  let skillStatus: import('../types/resume').SectionStatus = 'needs_details';
  let skillScore = 0;
  const skillIssues: string[] = [];
  const skillSuggestions: string[] = [];
  if (totalSkillsCount >= 4) {
    skillStatus = 'complete';
    skillScore = 100;
  } else if (totalSkillsCount > 0) {
    skillStatus = 'needs_details';
    skillScore = 60;
    skillIssues.push('Add a few more technical tools or programming languages across labeled categories.');
  } else {
    skillIssues.push('No computer skills added yet.');
    skillSuggestions.push('Group skills into Programming Languages, Operating Systems, Frameworks, or Tools.');
    recs.push('Add categorized skills under Computer Skills.');
  }
  sections.push({
    sectionId: 'skills',
    name: '7. Computer Skills',
    status: skillStatus,
    statusLabel:
      skillStatus === 'complete'
        ? 'Completed'
        : totalSkillsCount > 0
        ? 'In progress'
        : 'Not started',
    isOptional: false,
    score: skillScore,
    issues: skillIssues,
    suggestions: skillSuggestions,
  });

  // 8. Skill Matrix (5-Level Scale)
  const matrix = (resume.skillMatrix || []).filter((m) => m.skill?.trim());
  const unrated = matrix.filter((m) => m.level === null || m.level === undefined);
  let matStatus: import('../types/resume').SectionStatus = 'optional_empty';
  let matScore = 0;
  const matIssues: string[] = [];
  const matSuggestions: string[] = [];
  if (matrix.length > 0) {
    if (unrated.length > 0) {
      matStatus = 'needs_details';
      matScore = 60;
      matIssues.push(`${unrated.length} skill matrix row(s) do not have a 1–5 proficiency level selected yet.`);
      recs.push('Select a 1–5 proficiency rating for all Skill Matrix rows.');
    } else {
      matStatus = 'complete';
      matScore = 100;
    }
  } else {
    matSuggestions.push('Add core competencies with honest 1–5 self-ratings (displayed with a clear legend).');
  }
  sections.push({
    sectionId: 'skill-matrix',
    name: '8. Skill Matrix',
    status: matStatus,
    statusLabel:
      matStatus === 'complete'
        ? 'Completed'
        : matrix.length > 0
        ? 'In progress'
        : 'Not started (Optional)',
    isOptional: true,
    score: matScore,
    issues: matIssues,
    suggestions: matSuggestions,
  });

  // 9. Interests
  const hasInterestItems = (resume.interestItems || []).some((i) => i.name?.trim());
  const hasLegacyInterests = Boolean(resume.interests?.trim());
  const hasInterests = hasInterestItems || hasLegacyInterests;
  sections.push({
    sectionId: 'interests',
    name: '9. Interests',
    status: hasInterests ? 'complete' : 'optional_empty',
    statusLabel: hasInterests ? 'Completed' : 'Not started (Optional)',
    isOptional: true,
    score: hasInterests ? 100 : 0,
    issues: [],
    suggestions: !hasInterests
      ? ['Optional: Add personal interests or extracurricular hobbies (automatically hidden if empty).']
      : [],
  });

  // 10. Additional Information (Custom Sections)
  const customSections = (resume.customSections || []).filter(
    (cs) => cs.title?.trim() && cs.bullets?.some((b) => b.trim())
  );
  sections.push({
    sectionId: 'custom-sections',
    name: '10. Additional Information',
    status: customSections.length > 0 ? 'complete' : 'optional_empty',
    statusLabel: customSections.length > 0 ? 'Completed' : 'Not started (Optional)',
    isOptional: true,
    score: customSections.length > 0 ? 100 : 0,
    issues: [],
    suggestions:
      customSections.length === 0
        ? ['Optional: Add Certifications, Awards, Volunteer Work, Publications, or Workshops.']
        : [],
  });

  // 11. References
  const refs = resume.references || [];
  const refMode = resume.referencesDisplayMode || (refs.length > 0 ? 'detailed' : undefined);
  let refStatus: import('../types/resume').SectionStatus = 'optional_empty';
  let refStatusLabel = 'Not started (Optional)';
  let refScore = 0;
  const refIssues: string[] = [];
  const refSuggestions: string[] = [];
  if (refMode === 'hidden') {
    refStatus = 'optional_empty';
    refStatusLabel = 'Skipped';
  } else if (refMode === 'on-request') {
    refStatus = 'complete';
    refStatusLabel = 'Available on request';
    refScore = 100;
  } else if (refs.length > 0) {
    const incompleteRefs = refs.filter((r) => !r.fullName?.trim() || !r.organization?.trim());
    if (incompleteRefs.length > 0) {
      refStatus = 'needs_details';
      refStatusLabel = 'In progress';
      refScore = 65;
      refIssues.push('Some referee entries are missing a full name or organization.');
    } else {
      refStatus = 'complete';
      refStatusLabel = 'Completed';
      refScore = 100;
    }
  } else {
    refSuggestions.push('Choose detailed referees, "Available upon request", or hide References.');
  }
  sections.push({
    sectionId: 'references',
    name: '11. References',
    status: refStatus,
    statusLabel: refStatusLabel,
    isOptional: true,
    score: refScore,
    issues: refIssues,
    suggestions: refSuggestions,
  });

  const overallScore = calculateResumeCompleteness(resume);
  let overallStatus: 'excellent' | 'good' | 'in_progress' | 'needs_work' = 'needs_work';
  if (overallScore >= 85) overallStatus = 'excellent';
  else if (overallScore >= 65) overallStatus = 'good';
  else if (overallScore >= 40) overallStatus = 'in_progress';

  return {
    overallScore,
    overallStatus,
    sections,
    topRecommendations:
      recs.length > 0
        ? recs
        : ['Your Classic Professional CV is well-structured and ready for A4 PDF export.'],
  };
}

function analyzeTwoColumnSections(
  resume: Partial<Resume>
): import('../types/resume').CvCompletenessReport {
  const sections: import('../types/resume').SectionAnalysis[] = [];
  const recs: string[] = [];

  // 1. Header & Contact Info
  const pi = resume.personalInfo;
  const piIssues: string[] = [];
  const piSuggestions: string[] = [];
  let piScore = 0;
  if (pi?.fullName?.trim()) piScore += 45;
  else piIssues.push('Full name is missing.');
  if (pi?.email?.trim()) piScore += 35;
  else piIssues.push('Email address is missing.');
  if (pi?.jobTitle?.trim()) piScore += 20;
  else piSuggestions.push('Add a concise headline / tagline beneath your name.');

  if (!pi?.photoUrl) {
    piSuggestions.push('Optional: Upload a circular profile photo if desired.');
  }
  if (!pi?.linkedin && !pi?.github && !pi?.twitter && !pi?.orcid) {
    piSuggestions.push('Add relevant links such as LinkedIn, GitHub, X/Twitter, or ORCID.');
  }
  sections.push({
    sectionId: 'header',
    name: '1. Header & Contact Information',
    status: piScore >= 80 ? 'complete' : 'needs_details',
    statusLabel: piScore >= 80 ? 'Completed' : piScore > 0 ? 'In progress' : 'Not started',
    isOptional: false,
    score: piScore,
    issues: piIssues,
    suggestions: piSuggestions,
  });
  if (piScore < 80) recs.push('Complete your full name and email in Header & Contact Information.');

  // 2. Experience
  const exp = resume.experience || [];
  let expStatus: import('../types/resume').SectionStatus = 'optional_empty';
  let expScore = 0;
  const expIssues: string[] = [];
  const expSuggestions: string[] = [];
  if (exp.length > 0) {
    const incomplete = exp.filter(
      (e) =>
        !e.company?.trim() ||
        !e.position?.trim() ||
        (!e.description?.trim() &&
          (!e.highlights || e.highlights.filter((h) => h.trim().length > 0).length === 0))
    );
    if (incomplete.length > 0) {
      expStatus = 'needs_details';
      expScore = 65;
      expIssues.push(`${incomplete.length} experience entry needs company, role, or highlight bullets.`);
      recs.push('Add impact bullets or role summaries under Experience.');
    } else {
      expStatus = 'complete';
      expScore = 100;
    }
  } else {
    expSuggestions.push('Optional for freshers/students; add internships or work experience when available.');
  }
  sections.push({
    sectionId: 'experience',
    name: '2. Experience',
    status: expStatus,
    statusLabel:
      expStatus === 'complete'
        ? 'Completed'
        : exp.length > 0
        ? 'In progress'
        : 'Not started (Optional)',
    isOptional: true,
    score: expScore,
    issues: expIssues,
    suggestions: expSuggestions,
  });

  // 3. Projects
  const proj = resume.projects || [];
  let projStatus: import('../types/resume').SectionStatus = 'optional_empty';
  let projScore = 0;
  const projIssues: string[] = [];
  const projSuggestions: string[] = [];
  if (proj.length > 0) {
    const incomplete = proj.filter(
      (p) =>
        !p.title?.trim() ||
        (!p.description?.trim() &&
          (!p.highlights || p.highlights.filter((h) => h.trim().length > 0).length === 0))
    );
    if (incomplete.length > 0) {
      projStatus = 'needs_details';
      projScore = 65;
      projIssues.push('Add a brief description or achievement bullets for every project.');
    } else {
      projStatus = 'complete';
      projScore = 100;
    }
  } else {
    projSuggestions.push('Optional: Add key research, engineering, or academic projects.');
  }
  sections.push({
    sectionId: 'projects',
    name: '3. Projects',
    status: projStatus,
    statusLabel:
      projStatus === 'complete'
        ? 'Completed'
        : proj.length > 0
        ? 'In progress'
        : 'Not started (Optional)',
    isOptional: true,
    score: projScore,
    issues: projIssues,
    suggestions: projSuggestions,
  });

  // 4. A Day of My Life (Optional Donut Chart, strict <= 24h)
  const dailyVal = validateDailyActivities(resume.dailyActivities || []);
  let dailyStatus: import('../types/resume').SectionStatus = 'optional_empty';
  let dailyLabel = 'Not started (Optional)';
  let dailyScore = 0;
  const dailyIssues: string[] = [];
  const dailySuggestions: string[] = [];
  if (dailyVal.totalHours > 24) {
    dailyStatus = 'needs_review';
    dailyLabel = `Exceeds 24h (${dailyVal.totalHours}h)`;
    dailyScore = 40;
    dailyIssues.push(
      `Daily activity hours total ${dailyVal.totalHours}h, exceeding the 24-hour maximum.`
    );
    recs.push('Reduce activity hours in "A Day of My Life" so total hours do not exceed 24.');
  } else if (dailyVal.validItems.length > 0) {
    dailyStatus = 'complete';
    dailyLabel = resume.showDailyActivityChart === false ? 'Hidden in CV' : 'Completed';
    dailyScore = 100;
  } else {
    dailySuggestions.push(
      'Optional: Enter how you allocate your day (max 24 hours) to render the donut chart, or skip cleanly.'
    );
  }
  sections.push({
    sectionId: 'daily-life',
    name: '4. A Day of My Life',
    status: dailyStatus,
    statusLabel: dailyLabel,
    isOptional: true,
    score: dailyScore,
    issues: dailyIssues,
    suggestions: dailySuggestions,
  });

  // 5. Publications (Optional)
  const pubs = resume.publications || [];
  sections.push({
    sectionId: 'publications',
    name: '5. Publications',
    status: pubs.length > 0 ? 'complete' : 'optional_empty',
    statusLabel: pubs.length > 0 ? 'Completed' : 'Not started (Optional)',
    isOptional: true,
    score: pubs.length > 0 ? 100 : 0,
    issues: [],
    suggestions:
      pubs.length === 0
        ? ['Optional: Add Books, Journal Articles, or Conference Proceedings (hidden if empty).']
        : [],
  });

  // 6. My Life Philosophy (Optional)
  const quote = (resume.personalQuote || '').trim();
  sections.push({
    sectionId: 'philosophy',
    name: '6. My Life Philosophy',
    status: quote ? 'complete' : 'optional_empty',
    statusLabel: quote ? 'Completed' : 'Not started (Optional)',
    isOptional: true,
    score: quote ? 100 : 0,
    issues: [],
    suggestions: !quote
      ? ['Optional: Add a short personal motto or guiding quote (hidden if empty).']
      : [],
  });

  // 7. Most Proud Of (Achievements - Optional)
  const ach = resume.achievements || [];
  sections.push({
    sectionId: 'achievements',
    name: '7. Most Proud Of',
    status: ach.length > 0 ? 'complete' : 'optional_empty',
    statusLabel: ach.length > 0 ? 'Completed' : 'Not started (Optional)',
    isOptional: true,
    score: ach.length > 0 ? 100 : 0,
    issues: [],
    suggestions:
      ach.length === 0
        ? ['Optional: Highlight top awards, honors, or milestones with matching icons.']
        : [],
  });

  // 8. Strengths (Optional)
  const strengths = (resume.strengths || []).filter((s) => s.trim().length > 0);
  sections.push({
    sectionId: 'strengths',
    name: '8. Strengths',
    status: strengths.length > 0 ? 'complete' : 'optional_empty',
    statusLabel: strengths.length > 0 ? 'Completed' : 'Not started (Optional)',
    isOptional: true,
    score: strengths.length > 0 ? 100 : 0,
    issues: [],
    suggestions:
      strengths.length === 0
        ? ['Add core strengths you want displayed as outlined keyword tags (never auto-generated).']
        : [],
  });

  // 9. Languages
  const langs = (resume.languages || []).filter((l) => l.language?.trim());
  sections.push({
    sectionId: 'languages',
    name: '9. Languages',
    status: langs.length > 0 ? 'complete' : 'optional_empty',
    statusLabel: langs.length > 0 ? 'Completed' : 'Not started (Optional)',
    isOptional: true,
    score: langs.length > 0 ? 100 : 0,
    issues: [],
    suggestions:
      langs.length === 0
        ? ['Optional: Add languages and confirm a dot proficiency score (or leave dots hidden).']
        : langs.some((l) => !l.proficiency?.trim())
        ? ['Confirm a proficiency level (1–5 dots) for languages where you want dot meters shown.']
        : [],
  });

  // 10. Education
  const edu = resume.education || [];
  let eduStatus: import('../types/resume').SectionStatus = 'needs_details';
  let eduScore = 0;
  const eduIssues: string[] = [];
  if (edu.length > 0) {
    const valid = edu.filter((e) => e.institution?.trim() && e.degree?.trim());
    if (valid.length === edu.length) {
      eduStatus = 'complete';
      eduScore = 100;
    } else {
      eduStatus = 'needs_details';
      eduScore = 55;
      eduIssues.push('Some education entries are missing an institution or degree name.');
    }
  } else {
    eduIssues.push('Add at least one degree or academic qualification under Education.');
    recs.push('Add your education history under Education.');
  }
  sections.push({
    sectionId: 'education',
    name: '10. Education',
    status: eduStatus,
    statusLabel: eduStatus === 'complete' ? 'Completed' : edu.length > 0 ? 'In progress' : 'Not started',
    isOptional: false,
    score: eduScore,
    issues: eduIssues,
    suggestions: [],
  });

  // 11. Referees (Optional)
  const refs = resume.references || [];
  const refMode = resume.referencesDisplayMode || (refs.length > 0 ? 'detailed' : undefined);
  let refStatus: import('../types/resume').SectionStatus = 'optional_empty';
  let refLabel = 'Not started (Optional)';
  let refScore = 0;
  if (refMode === 'hidden') {
    refLabel = 'Skipped';
  } else if (refMode === 'on-request') {
    refStatus = 'complete';
    refLabel = 'Available on request';
    refScore = 100;
  } else if (refs.length > 0) {
    refStatus = 'complete';
    refLabel = 'Completed';
    refScore = 100;
  }
  sections.push({
    sectionId: 'references',
    name: '11. Referees',
    status: refStatus,
    statusLabel: refLabel,
    isOptional: true,
    score: refScore,
    issues: [],
    suggestions:
      refStatus === 'optional_empty' && refMode !== 'hidden'
        ? ['Optional: Add referee details, choose "Available on request", or skip Referees.']
        : [],
  });

  // 12. Custom Sections (Optional)
  const customSections = (resume.customSections || []).filter(
    (cs) => cs.title?.trim() && cs.bullets?.some((b) => b.trim())
  );
  sections.push({
    sectionId: 'custom-sections',
    name: '12. Additional Sections',
    status: customSections.length > 0 ? 'complete' : 'optional_empty',
    statusLabel: customSections.length > 0 ? 'Completed' : 'Not started (Optional)',
    isOptional: true,
    score: customSections.length > 0 ? 100 : 0,
    issues: [],
    suggestions: [],
  });

  const overallScore = calculateResumeCompleteness(resume);
  let overallStatus: 'excellent' | 'good' | 'in_progress' | 'needs_work' = 'needs_work';
  if (overallScore >= 85) overallStatus = 'excellent';
  else if (overallScore >= 65) overallStatus = 'good';
  else if (overallScore >= 40) overallStatus = 'in_progress';

  return {
    overallScore,
    overallStatus,
    sections,
    topRecommendations:
      recs.length > 0
        ? recs
        : ['Your Two Column Professional CV is well-structured and ready for A4 PDF export.'],
  };
}

function analyzeSoftwareDeveloperSections(
  resume: Partial<Resume>
): import('../types/resume').CvCompletenessReport {
  const sections: import('../types/resume').SectionAnalysis[] = [];
  const recs: string[] = [];

  // 1. Header & Contact Info
  const pi = resume.personalInfo;
  const piIssues: string[] = [];
  const piSuggestions: string[] = [];
  let piScore = 0;
  if (pi?.fullName?.trim()) piScore += 40;
  else piIssues.push('Full name is missing.');
  if (pi?.email?.trim()) piScore += 30;
  else piIssues.push('Email address is missing.');
  if (pi?.phone?.trim()) piScore += 30;
  else piIssues.push('Phone number is missing.');

  if (!pi?.streetAddress?.trim() && !pi?.city?.trim()) {
    piSuggestions.push('Add your address or City, State for the centered address line.');
  }
  if (!pi?.github?.trim() && !pi?.linkedin?.trim() && !pi?.website?.trim()) {
    piSuggestions.push('Add GitHub, LinkedIn, or portfolio website links for software roles.');
  }

  sections.push({
    sectionId: 'header',
    name: '1. Header & Contact Information',
    status: piScore === 100 ? 'complete' : 'needs_details',
    statusLabel: piScore === 100 ? 'Completed' : piScore > 0 ? 'In progress' : 'Not started',
    isOptional: false,
    score: piScore,
    issues: piIssues,
    suggestions: piSuggestions,
  });
  if (piScore < 100) recs.push('Complete your name, email, and phone in Header & Contact Information.');

  // 2. Education
  const edu = resume.education || [];
  let eduStatus: import('../types/resume').SectionStatus = 'needs_details';
  let eduScore = 0;
  const eduIssues: string[] = [];
  const eduSuggestions: string[] = [];
  if (edu.length > 0) {
    const valid = edu.filter((e) => e.institution?.trim() && e.degree?.trim());
    if (valid.length === edu.length) {
      eduStatus = 'complete';
      eduScore = 100;
      if (edu.some((e) => !e.location?.trim())) {
        eduSuggestions.push('Add institution City, State for clean right-aligned metadata.');
      }
    } else {
      eduStatus = 'needs_details';
      eduScore = 55;
      eduIssues.push('Some education entries lack an institution or degree name.');
    }
  } else {
    eduIssues.push('Add your degree, institution, dates, and optional GPA under Education.');
    recs.push('Add your degree and university under Education.');
  }
  sections.push({
    sectionId: 'education',
    name: '2. Education',
    status: eduStatus,
    statusLabel: eduStatus === 'complete' ? 'Completed' : edu.length > 0 ? 'In progress' : 'Not started',
    isOptional: false,
    score: eduScore,
    issues: eduIssues,
    suggestions: eduSuggestions,
  });

  // 3. Experience
  const exp = resume.experience || [];
  let expStatus: import('../types/resume').SectionStatus = 'optional_empty';
  let expScore = 0;
  const expIssues: string[] = [];
  const expSuggestions: string[] = [];
  if (exp.length > 0) {
    const incomplete = exp.filter(
      (e) =>
        !e.company?.trim() ||
        !e.position?.trim() ||
        (!e.description?.trim() &&
          (!e.highlights || e.highlights.filter((h) => h.trim().length > 0).length === 0))
    );
    if (incomplete.length > 0) {
      expStatus = 'needs_details';
      expScore = 65;
      expIssues.push(`${incomplete.length} experience entry lacks company, role, or impact bullets.`);
      recs.push('Add measurable engineering impact bullets under Experience.');
    } else {
      expStatus = 'complete';
      expScore = 100;
    }
  } else {
    expSuggestions.push('Optional for students/freshers; add internships, co-ops, or engineering roles when available.');
  }
  sections.push({
    sectionId: 'experience',
    name: '3. Experience',
    status: expStatus,
    statusLabel:
      expStatus === 'complete'
        ? 'Completed'
        : exp.length > 0
        ? 'In progress'
        : 'Not started (Optional)',
    isOptional: true,
    score: expScore,
    issues: expIssues,
    suggestions: expSuggestions,
  });

  // 4. Projects
  const proj = resume.projects || [];
  let projStatus: import('../types/resume').SectionStatus = 'optional_empty';
  let projScore = 0;
  const projIssues: string[] = [];
  const projSuggestions: string[] = [];
  if (proj.length > 0) {
    const missingTech = proj.filter(
      (p) =>
        (!p.technologies || p.technologies.length === 0) &&
        (!p.frameworks || p.frameworks.length === 0)
    );
    const missingBullets = proj.filter(
      (p) =>
        !p.description?.trim() &&
        (!p.highlights || p.highlights.filter((h) => h.trim().length > 0).length === 0) &&
        (!p.keyFeatures || p.keyFeatures.filter((k) => k.trim().length > 0).length === 0)
    );
    if (missingTech.length > 0 || missingBullets.length > 0) {
      projStatus = 'needs_details';
      projScore = 65;
      if (missingTech.length > 0) projIssues.push('Add technologies or frameworks used for each project.');
      if (missingBullets.length > 0) projIssues.push('Add bullet points or key features describing technical impact.');
    } else {
      projStatus = 'complete';
      projScore = 100;
    }
  } else {
    projSuggestions.push('Add software engineering projects with stack, GitHub/Live links, and technical bullets.');
    recs.push('Add 1–3 technical projects highlighting architecture and stack.');
  }
  sections.push({
    sectionId: 'projects',
    name: '4. Projects',
    status: projStatus,
    statusLabel:
      projStatus === 'complete'
        ? 'Completed'
        : proj.length > 0
        ? 'In progress'
        : 'Not started (Optional)',
    isOptional: true,
    score: projScore,
    issues: projIssues,
    suggestions: projSuggestions,
  });

  // 5. Additional — Relevant Coursework
  const cw = (resume.coursework || []).filter((c) => c.trim().length > 0);
  sections.push({
    sectionId: 'coursework',
    name: '5a. Relevant Coursework',
    status: cw.length > 0 ? 'complete' : 'optional_empty',
    statusLabel: cw.length > 0 ? 'Completed' : 'Not started (Optional)',
    isOptional: true,
    score: cw.length > 0 ? 100 : 0,
    issues: [],
    suggestions:
      cw.length === 0 ? ['Optional: Add core CS coursework (automatically hidden if empty).'] : [],
  });

  // 5b. Additional — Programming Languages / Developer Tools / Technologies & Frameworks
  const skills = resume.skills || [];
  const hasBucket = (matcher: string[]) =>
    skills.some(
      (cat) =>
        matcher.includes((cat.category || '').trim().toLowerCase()) &&
        (cat.skills || []).some((s) => s.trim().length > 0)
    );
  const hasLangs = hasBucket(['programming languages', 'languages', 'programming language']);
  const hasTools = hasBucket(['developer tools', 'tools', 'dev tools']);
  const hasFrameworks = hasBucket([
    'technologies and frameworks',
    'technologies & frameworks',
    'technologies/frameworks',
    'frameworks',
    'technologies',
    'frameworks & libraries',
  ]);

  sections.push({
    sectionId: 'programming-languages',
    name: '5b. Programming Languages',
    status: hasLangs ? 'complete' : 'optional_empty',
    statusLabel: hasLangs ? 'Completed' : 'Not started (Optional)',
    isOptional: true,
    score: hasLangs ? 100 : 0,
    issues: [],
    suggestions: !hasLangs ? ['Add programming languages (e.g. TypeScript, Python, Go, Java).'] : [],
  });

  sections.push({
    sectionId: 'developer-tools',
    name: '5c. Developer Tools',
    status: hasTools ? 'complete' : 'optional_empty',
    statusLabel: hasTools ? 'Completed' : 'Not started (Optional)',
    isOptional: true,
    score: hasTools ? 100 : 0,
    issues: [],
    suggestions: !hasTools ? ['Add developer tools (e.g. Git, Docker, Kubernetes, Linux).'] : [],
  });

  sections.push({
    sectionId: 'technologies-frameworks',
    name: '5d. Technologies & Frameworks',
    status: hasFrameworks ? 'complete' : 'optional_empty',
    statusLabel: hasFrameworks ? 'Completed' : 'Not started (Optional)',
    isOptional: true,
    score: hasFrameworks ? 100 : 0,
    issues: [],
    suggestions: !hasFrameworks
      ? ['Add frameworks and databases (e.g. React, Node.js, PostgreSQL, Redis).']
      : [],
  });

  // 5e. Leadership & Activities
  const lead = resume.leadership || [];
  sections.push({
    sectionId: 'leadership',
    name: '5e. Leadership & Activities',
    status: lead.length > 0 ? 'complete' : 'optional_empty',
    statusLabel: lead.length > 0 ? 'Completed' : 'Not started (Optional)',
    isOptional: true,
    score: lead.length > 0 ? 100 : 0,
    issues: [],
    suggestions:
      lead.length === 0 ? ['Optional: Add club leadership, mentorship, or hackathon roles.'] : [],
  });

  // 5f. Certifications
  const certs = resume.certifications || [];
  sections.push({
    sectionId: 'certifications',
    name: '5f. Certifications',
    status: certs.length > 0 ? 'complete' : 'optional_empty',
    statusLabel: certs.length > 0 ? 'Completed' : 'Not started (Optional)',
    isOptional: true,
    score: certs.length > 0 ? 100 : 0,
    issues: [],
    suggestions:
      certs.length === 0 ? ['Optional: Add cloud or technical certifications (hidden if empty).'] : [],
  });

  // 5g. Achievements
  const ach = resume.achievements || [];
  sections.push({
    sectionId: 'awards',
    name: '5g. Achievements',
    status: ach.length > 0 ? 'complete' : 'optional_empty',
    statusLabel: ach.length > 0 ? 'Completed' : 'Not started (Optional)',
    isOptional: true,
    score: ach.length > 0 ? 100 : 0,
    issues: [],
    suggestions:
      ach.length === 0 ? ['Optional: Add hackathons, honors, or developer awards.'] : [],
  });

  if (!hasLangs && !hasTools && !hasFrameworks) {
    recs.push('Add your Programming Languages, Developer Tools, or Frameworks under Additional.');
  }

  const overallScore = calculateResumeCompleteness(resume);
  let overallStatus: 'excellent' | 'good' | 'in_progress' | 'needs_work' = 'needs_work';
  if (overallScore >= 85) overallStatus = 'excellent';
  else if (overallScore >= 65) overallStatus = 'good';
  else if (overallScore >= 40) overallStatus = 'in_progress';

  return {
    overallScore,
    overallStatus,
    sections,
    topRecommendations:
      recs.length > 0
        ? recs
        : ['Your Software Developer resume is crisp, balanced, and ready for A4 PDF export.'],
  };
}

function analyzeHarvardSections(
  resume: Partial<Resume>
): import('../types/resume').CvCompletenessReport {
  const sections: import('../types/resume').SectionAnalysis[] = [];
  const recs: string[] = [];
  const bg = resume.targetBackground || 'student';
  const hidden = new Set(resume.hiddenSections || []);

  // 1. Header & Contact Information
  const pi = resume.personalInfo;
  const piIssues: string[] = [];
  const piSuggestions: string[] = [];
  let piScore = 0;
  if (pi?.fullName?.trim()) piScore += 40;
  else piIssues.push('Full name is missing.');
  if (pi?.email?.trim()) piScore += 30;
  else piIssues.push('Email address is missing.');
  if (pi?.phone?.trim()) piScore += 30;
  else piIssues.push('Phone number is missing.');

  if (!pi?.city?.trim() && !pi?.streetAddress?.trim()) {
    piSuggestions.push('Add your city/state or campus street address for the compact contact line.');
  }
  if (!pi?.linkedin?.trim() && !pi?.github?.trim() && !pi?.website?.trim()) {
    piSuggestions.push('Optional: Add LinkedIn, GitHub, or personal website URLs if relevant.');
  }

  sections.push({
    sectionId: 'header',
    name: '1. Header & Contact Info',
    status: piScore === 100 ? 'complete' : 'needs_details',
    statusLabel: piScore === 100 ? 'Completed' : piScore > 0 ? 'In Progress' : 'Not Started',
    isOptional: false,
    score: piScore,
    issues: piIssues,
    suggestions: piSuggestions,
  });
  if (piScore < 100) recs.push('Complete your full name, email, and phone in Header & Contact Info.');

  // 2. Education
  const edu = resume.education || [];
  let eduStatus: import('../types/resume').SectionStatus = 'needs_details';
  let eduScore = 0;
  const eduIssues: string[] = [];
  const eduSuggestions: string[] = [];
  if (edu.length > 0) {
    const valid = edu.filter((e) => e.institution?.trim() && e.degree?.trim());
    if (valid.length === edu.length) {
      eduStatus = 'complete';
      eduScore = 100;
      if (edu.some((e) => !e.location?.trim())) {
        eduSuggestions.push('Add institution city/state so it aligns cleanly on the right.');
      }
      if (bg !== 'experienced' && !edu.some((e) => e.grade?.trim())) {
        eduSuggestions.push('Optional: Include GPA if 3.5+ or requested by employers.');
      }
    } else {
      eduStatus = 'needs_details';
      eduScore = 55;
      eduIssues.push('Some education entries are missing an institution or degree title.');
    }
  } else {
    eduIssues.push('Harvard Style resumes begin with Education—add your university degree.');
    recs.push('Add your degree, institution, location, and graduation date under Education.');
  }
  sections.push({
    sectionId: 'education',
    name: '2. Education',
    status: eduStatus,
    statusLabel: eduStatus === 'complete' ? 'Completed' : edu.length > 0 ? 'In Progress' : 'Not Started',
    isOptional: false,
    score: eduScore,
    issues: eduIssues,
    suggestions: eduSuggestions,
  });

  // 3. Study Abroad (Optional)
  const studyAbroad = (resume.studyAbroad || []).filter(
    (s) => s.institution?.trim() || s.coursework?.trim()
  );
  const studyHidden = hidden.has('study-abroad');
  sections.push({
    sectionId: 'study-abroad',
    name: '3. Study Abroad (Optional)',
    status: studyAbroad.length > 0 && !studyHidden ? 'complete' : 'optional_empty',
    statusLabel: studyHidden
      ? 'Optional / Skipped'
      : studyAbroad.length > 0
      ? 'Completed'
      : 'Optional / Skipped',
    isOptional: true,
    score: studyAbroad.length > 0 && !studyHidden ? 100 : 0,
    issues: [],
    suggestions:
      studyAbroad.length === 0
        ? ['Optional: Add exchange or study abroad programs (automatically hidden if empty).']
        : [],
  });

  // 4. High School Education (Optional)
  const highSchool = (resume.highSchool || []).filter((h) => h.schoolName?.trim());
  const hsHidden = hidden.has('high-school');
  sections.push({
    sectionId: 'high-school',
    name: '4. High School Education (Optional)',
    status: highSchool.length > 0 && !hsHidden ? 'complete' : 'optional_empty',
    statusLabel: hsHidden
      ? 'Optional / Skipped'
      : highSchool.length > 0
      ? 'Completed'
      : 'Optional / Skipped',
    isOptional: true,
    score: highSchool.length > 0 && !hsHidden ? 100 : 0,
    issues: [],
    suggestions:
      highSchool.length === 0 && bg === 'student'
        ? ['Optional: First-year/sophomore undergraduates may add high school; upperclassmen and professionals should leave empty.']
        : [],
  });

  // 5. Experience
  const exp = resume.experience || [];
  const expRequired = bg === 'experienced';
  let expStatus: import('../types/resume').SectionStatus = expRequired ? 'needs_details' : 'optional_empty';
  let expScore = 0;
  const expIssues: string[] = [];
  const expSuggestions: string[] = [];
  if (exp.length > 0) {
    const incomplete = exp.filter(
      (e) =>
        !e.company?.trim() ||
        !e.position?.trim() ||
        (!e.description?.trim() &&
          (!e.highlights || e.highlights.filter((h) => h.trim().length > 0).length === 0))
    );
    if (incomplete.length > 0) {
      expStatus = 'needs_details';
      expScore = 65;
      expIssues.push(
        `${incomplete.length} experience entry needs organization, role title, or action-verb bullets.`
      );
      recs.push('Add action-verb achievement bullets under Experience.');
    } else {
      expStatus = 'complete';
      expScore = 100;
    }
  } else if (expRequired) {
    expIssues.push('Experienced profile selected—add your professional work history.');
    recs.push('Add work experience with measurable results.');
  } else {
    expSuggestions.push(
      'Optional for students/freshers without formal jobs; internships, campus jobs, research assistantships, or projects also highlight impact.'
    );
  }
  sections.push({
    sectionId: 'experience',
    name: '5. Experience',
    status: expStatus,
    statusLabel:
      expStatus === 'complete'
        ? 'Completed'
        : exp.length > 0
        ? 'In Progress'
        : expRequired
        ? 'Not Started'
        : 'Optional / Skipped',
    isOptional: !expRequired,
    score: expScore,
    issues: expIssues,
    suggestions: expSuggestions,
  });

  // 6. Leadership & Activities
  const lead = resume.leadership || [];
  let leadStatus: import('../types/resume').SectionStatus = 'optional_empty';
  let leadScore = 0;
  const leadIssues: string[] = [];
  const leadSuggestions: string[] = [];
  if (lead.length > 0) {
    const incomplete = lead.filter(
      (l) =>
        !l.organization?.trim() ||
        !l.role?.trim() ||
        !l.highlights ||
        l.highlights.filter((h) => h.trim().length > 0).length === 0
    );
    if (incomplete.length > 0) {
      leadStatus = 'needs_details';
      leadScore = 65;
      leadIssues.push('Add organization, role, and bullet highlights for each leadership entry.');
    } else {
      leadStatus = 'complete';
      leadScore = 100;
    }
  } else {
    leadSuggestions.push(
      bg === 'student' || bg === 'fresher'
        ? 'Add student clubs, volunteering, athletics, or leadership activities.'
        : 'Optional: Add board service, mentoring, or community leadership.'
    );
    if (exp.length === 0) {
      recs.push('Add Leadership & Activities (or Projects) to demonstrate initiative and results.');
    }
  }
  sections.push({
    sectionId: 'leadership',
    name: '6. Leadership & Activities',
    status: leadStatus,
    statusLabel:
      leadStatus === 'complete'
        ? 'Completed'
        : lead.length > 0
        ? 'In Progress'
        : 'Optional / Skipped',
    isOptional: true,
    score: leadScore,
    issues: leadIssues,
    suggestions: leadSuggestions,
  });

  // 7. Technical Skills
  const skills = resume.skills || [];
  const totalSkills = skills.reduce((acc, s) => acc + (s.skills?.length || 0), 0);
  let skillStatus: import('../types/resume').SectionStatus = 'needs_details';
  let skillScore = 0;
  const skillIssues: string[] = [];
  const skillSuggestions: string[] = [];
  if (totalSkills >= 3) {
    skillStatus = 'complete';
    skillScore = 100;
  } else if (totalSkills > 0) {
    skillStatus = 'needs_details';
    skillScore = 60;
    skillIssues.push('Add at least 3 technical or domain skills for a balanced Skills & Interests row.');
  } else {
    skillIssues.push('No technical or domain skills added yet.');
    recs.push('Add technical, analytical, or software skills under Technical Skills.');
  }
  sections.push({
    sectionId: 'skills',
    name: '7. Technical Skills',
    status: skillStatus,
    statusLabel:
      skillStatus === 'complete'
        ? 'Completed'
        : totalSkills > 0
        ? 'In Progress'
        : 'Not Started',
    isOptional: false,
    score: skillScore,
    issues: skillIssues,
    suggestions: skillSuggestions,
  });

  // 8. Languages (Optional)
  const langs = (resume.languages || []).filter((l) => l.language?.trim());
  const unconfirmedLangs = langs.filter(
    (l) => !l.proficiency?.trim() || /^(unconfirmed|none|unspecified)$/i.test(l.proficiency.trim())
  );
  sections.push({
    sectionId: 'languages',
    name: '8. Languages',
    status: langs.length > 0 ? 'complete' : 'optional_empty',
    statusLabel: langs.length > 0 ? 'Completed' : 'Optional / Skipped',
    isOptional: true,
    score: langs.length > 0 ? 100 : 0,
    issues: [],
    suggestions:
      langs.length === 0
        ? ['Optional: Add spoken languages and confirmed proficiency levels.']
        : unconfirmedLangs.length > 0
        ? ['Unconfirmed proficiency levels are hidden cleanly; confirm a level anytime to show it.']
        : [],
  });

  // 9. Laboratory & Research Skills (Optional)
  const labSkills = (resume.labSkills || []).filter((s) => s.trim().length > 0);
  sections.push({
    sectionId: 'lab-skills',
    name: '9. Lab / Research Skills (Optional)',
    status: labSkills.length > 0 && !hidden.has('lab-skills') ? 'complete' : 'optional_empty',
    statusLabel:
      labSkills.length > 0 && !hidden.has('lab-skills') ? 'Completed' : 'Optional / Skipped',
    isOptional: true,
    score: labSkills.length > 0 && !hidden.has('lab-skills') ? 100 : 0,
    issues: [],
    suggestions:
      labSkills.length === 0
        ? ['Optional: Add laboratory instrumentation, clinical, or research methods if relevant.']
        : [],
  });

  // 10. Interests (Optional)
  const hasInterests = Boolean(
    (resume.interestItems && resume.interestItems.some((i) => i.name?.trim())) ||
      resume.interests?.trim()
  );
  sections.push({
    sectionId: 'interests',
    name: '10. Interests',
    status: hasInterests && !hidden.has('interests') ? 'complete' : 'optional_empty',
    statusLabel:
      hasInterests && !hidden.has('interests') ? 'Completed' : 'Optional / Skipped',
    isOptional: true,
    score: hasInterests && !hidden.has('interests') ? 100 : 0,
    issues: [],
    suggestions: !hasInterests
      ? ['Optional: Add 2–4 genuine personal interests (traditional Harvard finale under Skills & Interests).']
      : [],
  });

  // 11. Additional Information (Awards / Projects / Certs / Publications / Volunteer / Memberships / Custom)
  const hasAdditional =
    (resume.achievements || []).some((a) => a.title?.trim()) ||
    (resume.projects || []).some((p) => p.title?.trim()) ||
    (resume.certifications || []).some((c) => c.name?.trim()) ||
    (resume.publications || []).some((p) => p.title?.trim()) ||
    (resume.volunteer || []).some((v) => v.role?.trim() || v.organization?.trim()) ||
    (resume.memberships || []).some((m) => m.organization?.trim()) ||
    (resume.customSections || []).some(
      (cs) => cs.title?.trim() && (cs.bullets || []).some((b) => b.trim())
    );
  sections.push({
    sectionId: 'custom-sections',
    name: '11. Additional Information',
    status: hasAdditional ? 'complete' : 'optional_empty',
    statusLabel: hasAdditional ? 'Completed' : 'Optional / Skipped',
    isOptional: true,
    score: hasAdditional ? 100 : 0,
    issues: [],
    suggestions: !hasAdditional
      ? ['Optional: Add awards, projects, certifications, publications, volunteer service, or custom entries.']
      : [],
  });

  const overallScore = calculateResumeCompleteness(resume);
  let overallStatus: 'excellent' | 'good' | 'in_progress' | 'needs_work' = 'needs_work';
  if (overallScore >= 85) overallStatus = 'excellent';
  else if (overallScore >= 65) overallStatus = 'good';
  else if (overallScore >= 40) overallStatus = 'in_progress';

  return {
    overallScore,
    overallStatus,
    sections,
    topRecommendations:
      recs.length > 0
        ? recs
        : ['Your Harvard Style resume is clean, formal, and ready for A4 PDF export.'],
  };
}

function analyzeElegantSerifSections(
  resume: Partial<Resume>
): import('../types/resume').CvCompletenessReport {
  const sections: import('../types/resume').SectionAnalysis[] = [];
  const recs: string[] = [];
  const bg = resume.targetBackground || 'researcher';
  const hidden = new Set(resume.hiddenSections || []);

  // 1. Header / Personal Information
  const pi = resume.personalInfo;
  const piIssues: string[] = [];
  const piSuggestions: string[] = [];
  let piScore = 0;
  if (pi?.fullName?.trim()) piScore += 45;
  else piIssues.push('Full name is missing.');
  if (pi?.email?.trim()) piScore += 30;
  else piIssues.push('Email address is missing.');
  if (pi?.phone?.trim()) piScore += 25;
  else piIssues.push('Phone number is missing.');

  if (!pi?.jobTitle?.trim()) {
    piSuggestions.push('Add a professional title or current academic role beneath your name.');
  }
  if (!pi?.city?.trim() && !pi?.country?.trim()) {
    piSuggestions.push('Add city and country for the right-aligned banner and page footer.');
  }
  if (!pi?.orcid?.trim() && !pi?.linkedin?.trim() && !pi?.github?.trim() && !pi?.website?.trim()) {
    piSuggestions.push('Optional: Add website, LinkedIn, GitHub, or ORCID URLs.');
  }

  sections.push({
    sectionId: 'header',
    name: '1. Header / Personal Information',
    status: piScore === 100 ? 'complete' : 'needs_details',
    statusLabel: piScore === 100 ? 'Completed' : piScore > 0 ? 'In Progress' : 'Not Started',
    isOptional: false,
    score: piScore,
    issues: piIssues,
    suggestions: piSuggestions,
  });
  if (piScore < 100) recs.push('Complete your full name, email, and phone in Header / Personal Information.');

  // 2. Professional Profile (Optional)
  const objText = (resume.objective || '').trim();
  const hasProfileExtras = Boolean(resume.academicInterests?.trim() || resume.careerGoals?.trim());
  const objWords = objText.split(/\s+/).filter(Boolean).length;
  let objStatus: import('../types/resume').SectionStatus = 'optional_empty';
  let objScore = 0;
  const objIssues: string[] = [];
  const objSuggestions: string[] = [];
  if (hidden.has('objective')) {
    objStatus = 'optional_empty';
  } else if (objWords >= 15 || (objWords > 0 && hasProfileExtras)) {
    objStatus = 'complete';
    objScore = 100;
  } else if (objWords > 0 || hasProfileExtras) {
    objStatus = 'needs_details';
    objScore = 60;
    objIssues.push('Consider adding a concise 2–3 sentence professional profile summary.');
  } else {
    objSuggestions.push('Optional: Add a Professional Profile summary, Academic Interests, or Career Goals.');
  }
  sections.push({
    sectionId: 'objective',
    name: '2. Professional Profile',
    status: objStatus,
    statusLabel: hidden.has('objective')
      ? 'Hidden'
      : objStatus === 'complete'
      ? 'Completed'
      : objStatus === 'needs_details'
      ? 'In Progress'
      : 'Optional / Skipped',
    isOptional: true,
    score: objScore,
    issues: objIssues,
    suggestions: objSuggestions,
  });

  // 3. Education
  const edu = resume.education || [];
  let eduStatus: import('../types/resume').SectionStatus = 'needs_details';
  let eduScore = 0;
  const eduIssues: string[] = [];
  const eduSuggestions: string[] = [];
  if (edu.length > 0) {
    const valid = edu.filter((e) => e.institution?.trim() && e.degree?.trim());
    if (valid.length === edu.length) {
      eduStatus = 'complete';
      eduScore = 100;
      if (edu.some((e) => !e.location?.trim())) {
        eduSuggestions.push('Add institution locations so the city aligns cleanly alongside dates.');
      }
    } else {
      eduStatus = 'needs_details';
      eduScore = 55;
      eduIssues.push('Some education entries are missing an institution or degree title.');
    }
  } else {
    eduIssues.push('Add your current or completed university degrees under Education.');
    recs.push('Add at least one Education entry with institution, degree, and dates.');
  }
  sections.push({
    sectionId: 'education',
    name: '3. Education',
    status: eduStatus,
    statusLabel: eduStatus === 'complete' ? 'Completed' : edu.length > 0 ? 'In Progress' : 'Not Started',
    isOptional: false,
    score: eduScore,
    issues: eduIssues,
    suggestions: eduSuggestions,
  });

  // 4. Experience
  const exp = resume.experience || [];
  const expRequired = bg === 'experienced';
  let expStatus: import('../types/resume').SectionStatus = expRequired ? 'needs_details' : 'optional_empty';
  let expScore = 0;
  const expIssues: string[] = [];
  const expSuggestions: string[] = [];
  if (exp.length > 0) {
    const incomplete = exp.filter(
      (e) =>
        !e.company?.trim() ||
        !e.position?.trim() ||
        (!e.description?.trim() && (!e.highlights || e.highlights.filter((h) => h.trim()).length === 0))
    );
    if (incomplete.length > 0) {
      expStatus = 'needs_details';
      expScore = 65;
      expIssues.push(`${incomplete.length} experience entry lacks role title, institution, or highlights.`);
      recs.push('Add responsibilities and outcomes under Experience.');
    } else {
      expStatus = 'complete';
      expScore = 100;
    }
  } else if (expRequired) {
    expIssues.push('Experienced profile selected — add your professional work history.');
    recs.push('Add work experience entries with clear dates and achievements.');
  } else {
    expSuggestions.push('Optional for students/freshers without formal jobs; internships or research roles can go here.');
  }
  sections.push({
    sectionId: 'experience',
    name: '4. Experience',
    status: hidden.has('experience') ? 'optional_empty' : expStatus,
    statusLabel: hidden.has('experience')
      ? 'Hidden'
      : expStatus === 'complete'
      ? 'Completed'
      : exp.length > 0
      ? 'In Progress'
      : expRequired
      ? 'Not Started'
      : 'Optional / Skipped',
    isOptional: !expRequired,
    score: hidden.has('experience') ? 0 : expScore,
    issues: expIssues,
    suggestions: expSuggestions,
  });

  // 5. Research Experience (Optional)
  const research = (resume.researchExperience || []).filter(
    (r) => r.title?.trim() || r.institution?.trim() || r.objectives?.trim() || r.findings?.trim()
  );
  sections.push({
    sectionId: 'research',
    name: '5. Research Experience',
    status: !hidden.has('research') && research.length > 0 ? 'complete' : 'optional_empty',
    statusLabel: hidden.has('research')
      ? 'Hidden'
      : research.length > 0
      ? 'Completed'
      : 'Optional / Skipped',
    isOptional: true,
    score: !hidden.has('research') && research.length > 0 ? 100 : 0,
    issues: [],
    suggestions:
      research.length === 0
        ? ['Optional: Add research projects, labs, supervisors, methodology, and findings.']
        : [],
  });

  // 6. Projects (Optional)
  const proj = resume.projects || [];
  let projStatus: import('../types/resume').SectionStatus = 'optional_empty';
  let projScore = 0;
  const projIssues: string[] = [];
  if (!hidden.has('projects') && proj.length > 0) {
    const incomplete = proj.filter(
      (p) =>
        !p.title?.trim() ||
        (!p.description?.trim() && (!p.highlights || p.highlights.filter((h) => h.trim()).length === 0))
    );
    if (incomplete.length > 0) {
      projStatus = 'needs_details';
      projScore = 65;
      projIssues.push('Add a brief summary or highlight bullets for every project.');
    } else {
      projStatus = 'complete';
      projScore = 100;
    }
  }
  sections.push({
    sectionId: 'projects',
    name: '6. Projects',
    status: projStatus,
    statusLabel: hidden.has('projects')
      ? 'Hidden'
      : projStatus === 'complete'
      ? 'Completed'
      : proj.length > 0
      ? 'In Progress'
      : 'Optional / Skipped',
    isOptional: true,
    score: projScore,
    issues: projIssues,
    suggestions: proj.length === 0 ? ['Optional: Add academic, engineering, or independent projects.'] : [],
  });

  // 7. Publications (Optional)
  const pubs = resume.publications || [];
  sections.push({
    sectionId: 'publications',
    name: '7. Publications',
    status: !hidden.has('publications') && pubs.length > 0 ? 'complete' : 'optional_empty',
    statusLabel: hidden.has('publications')
      ? 'Hidden'
      : pubs.length > 0
      ? 'Completed'
      : 'Optional / Skipped',
    isOptional: true,
    score: !hidden.has('publications') && pubs.length > 0 ? 100 : 0,
    issues: [],
    suggestions:
      pubs.length === 0
        ? ['Optional: Add peer-reviewed journal articles, conference papers, monographs, or manuscripts.']
        : [],
  });

  // 8. Awards and Honors (Optional)
  const awards = resume.achievements || [];
  sections.push({
    sectionId: 'achievements',
    name: '8. Awards and Honors',
    status: !hidden.has('achievements') && !hidden.has('awards') && awards.length > 0 ? 'complete' : 'optional_empty',
    statusLabel:
      hidden.has('achievements') || hidden.has('awards')
        ? 'Hidden'
        : awards.length > 0
        ? 'Completed'
        : 'Optional / Skipped',
    isOptional: true,
    score: !hidden.has('achievements') && !hidden.has('awards') && awards.length > 0 ? 100 : 0,
    issues: [],
    suggestions:
      awards.length === 0
        ? ['Optional: Add academic fellowships, scholarships, or professional honors.']
        : [],
  });

  // 9. Skills
  const skills = resume.skills || [];
  const totalSkills = skills.reduce((acc, s) => acc + (s.skills?.length || 0), 0);
  let skillStatus: import('../types/resume').SectionStatus = 'needs_details';
  let skillScore = 0;
  const skillIssues: string[] = [];
  if (totalSkills >= 4) {
    skillStatus = 'complete';
    skillScore = 100;
  } else if (totalSkills > 0) {
    skillStatus = 'needs_details';
    skillScore = 60;
    skillIssues.push('Add at least 4 categorized skills for a balanced Skills section.');
  } else {
    skillIssues.push('No skills added yet.');
    recs.push('Add grouped domain, research, or technical skills under Skills.');
  }
  sections.push({
    sectionId: 'skills',
    name: '9. Skills',
    status: hidden.has('skills') ? 'optional_empty' : skillStatus,
    statusLabel: hidden.has('skills')
      ? 'Hidden'
      : skillStatus === 'complete'
      ? 'Completed'
      : totalSkills > 0
      ? 'In Progress'
      : 'Not Started',
    isOptional: false,
    score: hidden.has('skills') ? 0 : skillScore,
    issues: skillIssues,
    suggestions: totalSkills === 0 ? ['Group skills cleanly by category (rendered as monochrome text without bars).'] : [],
  });

  // 10. Languages (Optional)
  const langs = (resume.languages || []).filter((l) => l.language?.trim());
  const unconfirmedLangs = langs.filter(
    (l) => !l.proficiency?.trim() || /^(unconfirmed|none|unspecified)$/i.test(l.proficiency.trim())
  );
  sections.push({
    sectionId: 'languages',
    name: '10. Languages',
    status: !hidden.has('languages') && langs.length > 0 ? 'complete' : 'optional_empty',
    statusLabel: hidden.has('languages')
      ? 'Hidden'
      : langs.length > 0
      ? 'Completed'
      : 'Optional / Skipped',
    isOptional: true,
    score: !hidden.has('languages') && langs.length > 0 ? 100 : 0,
    issues: [],
    suggestions:
      langs.length === 0
        ? ['Optional: Add spoken or written languages and confirmed proficiency labels.']
        : unconfirmedLangs.length > 0
        ? ['Unconfirmed language proficiencies are hidden cleanly without placeholder ratings.']
        : [],
  });

  // 11. Certifications (Optional)
  const certs = resume.certifications || [];
  sections.push({
    sectionId: 'certifications',
    name: '11. Certifications',
    status: !hidden.has('certifications') && certs.length > 0 ? 'complete' : 'optional_empty',
    statusLabel: hidden.has('certifications')
      ? 'Hidden'
      : certs.length > 0
      ? 'Completed'
      : 'Optional / Skipped',
    isOptional: true,
    score: !hidden.has('certifications') && certs.length > 0 ? 100 : 0,
    issues: [],
    suggestions: certs.length === 0 ? ['Optional: Add professional credentials or certifications.'] : [],
  });

  // 12. Leadership and Activities (Optional)
  const lead = resume.leadership || [];
  sections.push({
    sectionId: 'leadership',
    name: '12. Leadership and Activities',
    status: !hidden.has('leadership') && lead.length > 0 ? 'complete' : 'optional_empty',
    statusLabel: hidden.has('leadership')
      ? 'Hidden'
      : lead.length > 0
      ? 'Completed'
      : 'Optional / Skipped',
    isOptional: true,
    score: !hidden.has('leadership') && lead.length > 0 ? 100 : 0,
    issues: [],
    suggestions:
      lead.length === 0 ? ['Optional: Add committee service, mentoring, or organizational leadership.'] : [],
  });

  // 13. Professional Memberships (Optional)
  const mems = resume.memberships || [];
  sections.push({
    sectionId: 'memberships',
    name: '13. Professional Memberships',
    status: !hidden.has('memberships') && mems.length > 0 ? 'complete' : 'optional_empty',
    statusLabel: hidden.has('memberships')
      ? 'Hidden'
      : mems.length > 0
      ? 'Completed'
      : 'Optional / Skipped',
    isOptional: true,
    score: !hidden.has('memberships') && mems.length > 0 ? 100 : 0,
    issues: [],
    suggestions: mems.length === 0 ? ['Optional: Add scholarly or professional society memberships.'] : [],
  });

  // 14. Interests (Optional)
  const hasInterests = Boolean(
    (resume.interestItems && resume.interestItems.some((i) => i.name?.trim())) ||
      resume.interests?.trim()
  );
  sections.push({
    sectionId: 'interests',
    name: '14. Interests',
    status: !hidden.has('interests') && hasInterests ? 'complete' : 'optional_empty',
    statusLabel: hidden.has('interests')
      ? 'Hidden'
      : hasInterests
      ? 'Completed'
      : 'Optional / Skipped',
    isOptional: true,
    score: !hidden.has('interests') && hasInterests ? 100 : 0,
    issues: [],
    suggestions: !hasInterests ? ['Optional: Add intellectual, research, or personal interests.'] : [],
  });

  // 15. References (Optional)
  const refs = resume.references || [];
  const refMode = resume.referencesDisplayMode || (refs.length > 0 ? 'detailed' : undefined);
  let refStatus: import('../types/resume').SectionStatus = 'optional_empty';
  let refLabel = 'Optional / Skipped';
  let refScore = 0;
  if (hidden.has('references') || refMode === 'hidden') {
    refLabel = 'Hidden';
  } else if (refMode === 'on-request') {
    refStatus = 'complete';
    refLabel = 'Available on request';
    refScore = 100;
  } else if (refs.length > 0) {
    refStatus = 'complete';
    refLabel = 'Completed';
    refScore = 100;
  }
  sections.push({
    sectionId: 'references',
    name: '15. References',
    status: refStatus,
    statusLabel: refLabel,
    isOptional: true,
    score: refScore,
    issues: [],
    suggestions:
      refStatus === 'optional_empty' && refMode !== 'hidden'
        ? ['Optional: List academic/professional referees or choose "Available on request".']
        : [],
  });

  const overallScore = calculateResumeCompleteness(resume);
  let overallStatus: 'excellent' | 'good' | 'in_progress' | 'needs_work' = 'needs_work';
  if (overallScore >= 85) overallStatus = 'excellent';
  else if (overallScore >= 65) overallStatus = 'good';
  else if (overallScore >= 40) overallStatus = 'in_progress';

  return {
    overallScore,
    overallStatus,
    sections,
    topRecommendations:
      recs.length > 0
        ? recs
        : ['Your Elegant Serif CV is refined, scholarly, and ready for A4 PDF export.'],
  };
}

export function analyzeResumeSections(resume: Partial<Resume>): import('../types/resume').CvCompletenessReport {
  if (resume?.template === 'elegant-serif') {
    return analyzeElegantSerifSections(resume);
  }
  if (resume?.template === 'harvard-style') {
    return analyzeHarvardSections(resume);
  }
  if (resume?.template === 'two-column-professional') {
    return analyzeTwoColumnSections(resume);
  }
  if (resume?.template === 'classic-professional') {
    return analyzeClassicProfessionalSections(resume);
  }
  if (resume?.template === 'jakes-resume') {
    return analyzeJakesResumeSections(resume);
  }
  if (resume?.template === 'software-developer') {
    return analyzeSoftwareDeveloperSections(resume);
  }

  const sections: import('../types/resume').SectionAnalysis[] = [];
  const recs: string[] = [];

  // 1. Personal Information
  const pi = resume.personalInfo;
  const piIssues: string[] = [];
  const piSuggestions: string[] = [];
  let piScore = 0;
  if (pi?.fullName?.trim()) piScore += 40;
  else piIssues.push('Full name is missing.');
  if (pi?.email?.trim()) piScore += 30;
  else piIssues.push('Email address is missing.');
  if (pi?.phone?.trim()) piScore += 30;
  else piIssues.push('Phone number is missing.');

  if (!pi?.city || !pi?.country) {
    piSuggestions.push('Add city and country for formal academic postal placement.');
  }
  if (!pi?.otherProfiles) {
    piSuggestions.push('Add academic links like ORCID or Google Scholar profile.');
  }

  sections.push({
    sectionId: 'header',
    name: '1. Personal Information',
    status: piScore === 100 ? 'complete' : 'needs_details',
    statusLabel: piScore === 100 ? 'Complete' : 'Needs details',
    isOptional: false,
    score: piScore,
    issues: piIssues,
    suggestions: piSuggestions,
  });
  if (piScore < 100) recs.push('Complete your primary contact info in Personal Information.');

  // 2. Career Objective
  const obj = resume.objective?.trim() || '';
  const objWords = obj.split(/\s+/).filter(Boolean).length;
  let objStatus: import('../types/resume').SectionStatus = 'optional_empty';
  let objScore = 0;
  const objIssues: string[] = [];
  const objSuggestions: string[] = [];

  if (objWords >= 25) {
    objStatus = 'complete';
    objScore = 100;
  } else if (objWords > 0) {
    objStatus = 'needs_details';
    objScore = 60;
    objIssues.push('Objective is quite brief (under 25 words).');
    objSuggestions.push('Expand your research themes or academic aspirations with AI Improve.');
  } else {
    objStatus = 'optional_empty';
    objScore = 0;
    objSuggestions.push('Optional: Add a research summary or career objective statement.');
  }

  sections.push({
    sectionId: 'objective',
    name: '2. Career Objective',
    status: objStatus,
    statusLabel: objStatus === 'complete' ? 'Complete' : objStatus === 'needs_details' ? 'Needs more details' : 'Not provided (Optional)',
    isOptional: true,
    score: objScore,
    issues: objIssues,
    suggestions: objSuggestions,
  });

  // 3. Work Experience
  const exp = resume.experience || [];
  let expStatus: import('../types/resume').SectionStatus = 'optional_empty';
  let expScore = 0;
  const expIssues: string[] = [];
  const expSuggestions: string[] = [];

  if (exp.length > 0) {
    const incomplete = exp.filter(
      (e) => !e.company || !e.position || !e.highlights || e.highlights.filter((h) => h.trim().length > 0).length === 0
    );
    if (incomplete.length > 0) {
      expStatus = 'needs_details';
      expScore = 65;
      expIssues.push(`${incomplete.length} experience entry lacks bullet points or company title.`);
      expSuggestions.push('Add detailed contributions and measurable outcomes to all roles.');
      recs.push('Flesh out responsibilities and achievements in Work Experience.');
    } else {
      expStatus = 'complete';
      expScore = 100;
      expSuggestions.push('Strong experience records. Use AI Improve to elevate action verbs.');
    }
  } else {
    expStatus = 'needs_review';
    expScore = 20;
    expIssues.push('No work experience entries recorded.');
    expSuggestions.push('Add research fellowships, internships, or industry positions.');
  }

  sections.push({
    sectionId: 'experience',
    name: '3. Work Experience',
    status: expStatus,
    statusLabel: expStatus === 'complete' ? 'Complete' : expStatus === 'needs_details' ? 'Needs more details' : 'Needs review',
    isOptional: false,
    score: expScore,
    issues: expIssues,
    suggestions: expSuggestions,
  });

  // 4. Education
  const edu = resume.education || [];
  let eduStatus: import('../types/resume').SectionStatus = 'needs_details';
  let eduScore = 0;
  const eduIssues: string[] = [];
  const eduSuggestions: string[] = [];

  if (edu.length > 0) {
    const valid = edu.filter((e) => e.institution && e.degree);
    if (valid.length === edu.length) {
      eduStatus = 'complete';
      eduScore = 100;
      const missingGpa = edu.filter((e) => !e.grade);
      if (missingGpa.length > 0) {
        eduSuggestions.push('Consider listing GPA/CGPA or academic distinctions.');
      }
    } else {
      eduStatus = 'needs_details';
      eduScore = 50;
      eduIssues.push('Some education items are missing degree name or institution.');
    }
  } else {
    eduIssues.push('Academic CV requires at least one education entry.');
    recs.push('Add your primary educational degree under Education.');
  }

  sections.push({
    sectionId: 'education',
    name: '4. Education',
    status: eduStatus,
    statusLabel: eduStatus === 'complete' ? 'Complete' : 'Needs details',
    isOptional: false,
    score: eduScore,
    issues: eduIssues,
    suggestions: eduSuggestions,
  });

  // 5. Projects
  const proj = resume.projects || [];
  let projStatus: import('../types/resume').SectionStatus = 'optional_empty';
  let projScore = 0;
  const projIssues: string[] = [];
  const projSuggestions: string[] = [];

  if (proj.length > 0) {
    const missingTech = proj.filter((p) => !p.technologies || p.technologies.length === 0);
    if (missingTech.length > 0) {
      projStatus = 'needs_details';
      projScore = 70;
      projIssues.push('Some projects lack tools or technologies used.');
      projSuggestions.push('Specify programming languages and frameworks used in each project.');
    } else {
      projStatus = 'complete';
      projScore = 100;
    }
  } else {
    projStatus = 'optional_empty';
    projSuggestions.push('Add key academic or open-source technical projects.');
  }

  sections.push({
    sectionId: 'projects',
    name: '5. Projects',
    status: projStatus,
    statusLabel: projStatus === 'complete' ? 'Complete' : projStatus === 'needs_details' ? 'Needs more details' : 'Not provided (Optional)',
    isOptional: true,
    score: projScore,
    issues: projIssues,
    suggestions: projSuggestions,
  });

  // 6. Patents & Publications
  const pubs = resume.publications || [];
  let pubStatus: import('../types/resume').SectionStatus = 'optional_empty';
  let pubScore = 0;
  const pubIssues: string[] = [];
  const pubSuggestions: string[] = [];

  if (pubs.length > 0) {
    const missingDoi = pubs.filter((p) => !p.year || !p.authors);
    if (missingDoi.length > 0) {
      pubStatus = 'needs_details';
      pubScore = 70;
      pubIssues.push('Ensure all publications include authors, year, and venue.');
    } else {
      pubStatus = 'complete';
      pubScore = 100;
    }
  } else {
    pubStatus = 'optional_empty';
    pubSuggestions.push('Add published papers, conference talks, patents, or submitted theses.');
  }

  sections.push({
    sectionId: 'publications',
    name: '6. Patents & Publications',
    status: pubStatus,
    statusLabel: pubStatus === 'complete' ? 'Complete' : pubStatus === 'needs_details' ? 'Needs details' : 'Not provided (Optional)',
    isOptional: true,
    score: pubScore,
    issues: pubIssues,
    suggestions: pubSuggestions,
  });

  // 7. Technical Skills
  const skills = resume.skills || [];
  const totalSkillsCount = skills.reduce((acc, s) => acc + (s.skills?.length || 0), 0);
  let skillStatus: import('../types/resume').SectionStatus = 'needs_details';
  let skillScore = 0;
  const skillIssues: string[] = [];
  const skillSuggestions: string[] = [];

  if (totalSkillsCount >= 5) {
    skillStatus = 'complete';
    skillScore = 100;
  } else if (totalSkillsCount > 0) {
    skillStatus = 'needs_details';
    skillScore = 60;
    skillIssues.push('Few technical skills listed (under 5 skills).');
    skillSuggestions.push('Group skills into standard categories (Languages, Tools, ML, Cloud).');
  } else {
    skillIssues.push('No technical skills categories added.');
    recs.push('Categorize your technical skills under Technical Skills.');
  }

  sections.push({
    sectionId: 'skills',
    name: '7. Technical Skills',
    status: skillStatus,
    statusLabel: skillStatus === 'complete' ? 'Complete' : 'Needs details',
    isOptional: false,
    score: skillScore,
    issues: skillIssues,
    suggestions: skillSuggestions,
  });

  // 8. Honors & Awards
  const aw = resume.achievements || [];
  sections.push({
    sectionId: 'awards',
    name: '8. Honors & Awards',
    status: aw.length > 0 ? 'complete' : 'optional_empty',
    statusLabel: aw.length > 0 ? 'Complete' : 'Not provided (Optional)',
    isOptional: true,
    score: aw.length > 0 ? 100 : 0,
    issues: [],
    suggestions: aw.length === 0 ? ['Add academic fellowships, dean honors, or hackathon awards.'] : [],
  });

  // 9. Leadership Experience
  const lead = resume.leadership || [];
  sections.push({
    sectionId: 'leadership',
    name: '9. Leadership Experience',
    status: lead.length > 0 ? 'complete' : 'optional_empty',
    statusLabel: lead.length > 0 ? 'Complete' : 'Not provided (Optional)',
    isOptional: true,
    score: lead.length > 0 ? 100 : 0,
    issues: [],
    suggestions: lead.length === 0 ? ['Optional: Add student chapter leadership, committee roles, or club presidency.'] : [],
  });

  // 10. Volunteer Experience
  const vol = resume.volunteer || [];
  sections.push({
    sectionId: 'volunteer',
    name: '10. Volunteer Experience',
    status: vol.length > 0 ? 'complete' : 'optional_empty',
    statusLabel: vol.length > 0 ? 'Complete' : 'Not provided (Optional)',
    isOptional: true,
    score: vol.length > 0 ? 100 : 0,
    issues: [],
    suggestions: vol.length === 0 ? ['Optional: Add community tutoring, conference peer review, or outreach.'] : [],
  });

  // 11. Professional Memberships
  const mem = resume.memberships || [];
  sections.push({
    sectionId: 'memberships',
    name: '11. Professional Memberships',
    status: mem.length > 0 ? 'complete' : 'optional_empty',
    statusLabel: mem.length > 0 ? 'Complete' : 'Not provided (Optional)',
    isOptional: true,
    score: mem.length > 0 ? 100 : 0,
    issues: [],
    suggestions: mem.length === 0 ? ['Optional: Add IEEE, ACM, ISCB or other academic society affiliations.'] : [],
  });

  // 12. Certifications
  const cert = resume.certifications || [];
  sections.push({
    sectionId: 'certifications',
    name: '12. Certifications',
    status: cert.length > 0 ? 'complete' : 'optional_empty',
    statusLabel: cert.length > 0 ? 'Complete' : 'Not provided (Optional)',
    isOptional: true,
    score: cert.length > 0 ? 100 : 0,
    issues: [],
    suggestions: cert.length === 0 ? ['Optional: Add industry credentials or specialized course certifications.'] : [],
  });

  // 13. Additional Information
  const hasLang = (resume.languages || []).length > 0;
  const hasInt = !!resume.interests?.trim();
  sections.push({
    sectionId: 'additional',
    name: '13. Additional Information',
    status: hasLang || hasInt ? 'complete' : 'optional_empty',
    statusLabel: hasLang || hasInt ? 'Complete' : 'Not provided (Optional)',
    isOptional: true,
    score: hasLang || hasInt ? 100 : 0,
    issues: [],
    suggestions: !hasLang ? ['Add foreign languages and proficiency levels.'] : [],
  });

  // 14. References
  const refs = resume.references || [];
  sections.push({
    sectionId: 'references',
    name: '14. References',
    status: refs.length > 0 ? 'complete' : 'optional_empty',
    statusLabel: refs.length > 0 ? 'Complete' : 'Not provided (Optional)',
    isOptional: true,
    score: refs.length > 0 ? 100 : 0,
    issues: [],
    suggestions: refs.length === 0 ? ['References are optional; academic CVs can include dissertation advisors.'] : [],
  });

  const overallScore = calculateResumeCompleteness(resume);
  let overallStatus: 'excellent' | 'good' | 'in_progress' | 'needs_work' = 'needs_work';
  if (overallScore >= 85) overallStatus = 'excellent';
  else if (overallScore >= 65) overallStatus = 'good';
  else if (overallScore >= 40) overallStatus = 'in_progress';

  return {
    overallScore,
    overallStatus,
    sections,
    topRecommendations: recs.length > 0 ? recs : ['CV profile is comprehensive and follows academic standards.'],
  };
}

