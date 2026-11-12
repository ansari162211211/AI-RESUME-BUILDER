import type { PersonalInfo, Resume } from '../types/resume';

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

export function analyzeResumeSections(resume: Partial<Resume>): import('../types/resume').CvCompletenessReport {
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

