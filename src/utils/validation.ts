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

  if (resume.template === 'modern-corporate') {
    const bg = resume.targetBackground || 'corporate';
    let score = 0;

    if (resume.personalInfo) {
      if (resume.personalInfo.fullName?.trim()) score += 10;
      if (resume.personalInfo.email?.trim()) score += 6;
      if (resume.personalInfo.phone?.trim()) score += 4;
      if (resume.personalInfo.jobTitle?.trim()) score += 4;
    }

    if (resume.objective?.trim()) {
      score += 10;
    }

    const hasExp = Boolean(resume.experience && resume.experience.length > 0);
    const hasEdu = Boolean(resume.education && resume.education.length > 0);
    const hasProj = Boolean(resume.projects && resume.projects.length > 0);

    if (bg === 'student' || bg === 'fresher') {
      if (hasEdu) score += 24;
      if (hasExp && hasProj) score += 24;
      else if (hasExp || hasProj) score += 18;
    } else if (bg === 'technical') {
      if (hasExp) score += 24;
      if (hasEdu) score += 14;
      if (hasProj) score += 10;
    } else {
      // corporate / experienced
      if (hasExp) score += 28;
      if (hasEdu) score += 16;
      if (hasProj) score += 4;
    }

    const hasStrengths = Boolean(
      resume.strengths && resume.strengths.some((s) => s.trim().length > 0)
    );
    const totalSkills = (resume.skills || []).reduce(
      (acc, s) => acc + (s.skills?.length || 0),
      0
    );
    if (hasStrengths) score += 8;
    if (totalSkills >= 4) score += 8;
    else if (totalSkills > 0) score += 5;

    let bonus = 0;
    if (resume.certifications && resume.certifications.length > 0) bonus += 2;
    if (resume.achievements && resume.achievements.length > 0) bonus += 2;
    if (resume.languages && resume.languages.some((l) => l.language?.trim())) bonus += 2;
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
    score += Math.min(10, bonus);

    return Math.min(100, score);
  }

  if (resume.template === 'fresher-resume') {
    const track = resume.fresherTrack || 'cs';
    let score = 0;

    if (resume.personalInfo) {
      if (resume.personalInfo.fullName?.trim()) score += 8;
      if (resume.personalInfo.email?.trim()) score += 6;
      if (resume.personalInfo.phone?.trim()) score += 4;
      if (resume.personalInfo.jobTitle?.trim()) score += 2;
    }

    if (resume.education && resume.education.length > 0) {
      score += 25;
    }

    const projCount = (resume.projects || []).filter((p) => p.title?.trim()).length;
    const expCount = (resume.experience || []).filter((e) => e.company?.trim() || e.position?.trim()).length;
    const leadCount = (resume.leadership || []).filter((l) => l.organization?.trim() || l.role?.trim()).length;
    const volCount = (resume.volunteer || []).filter((v) => v.organization?.trim() || v.role?.trim()).length;

    if (track === 'non-technical' || track === 'graduate') {
      if (projCount >= 2 || expCount >= 1 || leadCount >= 1 || volCount >= 1) {
        score += 20;
      } else if (projCount > 0) {
        score += 14;
      }
    } else {
      if (projCount >= 2) score += 20;
      else if (projCount === 1) score += 14;
      else if (expCount > 0) score += 12;
    }

    const totalSkills = (resume.skills || []).reduce(
      (acc, s) => acc + (s.skills?.filter((sk) => sk.trim()).length || 0),
      0
    );
    if (totalSkills >= 3) score += 15;
    else if (totalSkills > 0) score += 9;

    if (resume.objective?.trim()) score += 8;
    if ((resume.strengths || []).filter((s) => s.trim()).length >= 2) score += 4;

    let bonus = 0;
    if (expCount > 0) bonus += 4;
    if ((resume.coursework || []).some((c) => c.trim())) bonus += 2;
    if ((resume.achievements || []).length > 0) bonus += 3;
    if ((resume.certifications || []).length > 0) bonus += 3;
    if ((resume.publications || []).length > 0) bonus += 3;
    if (leadCount > 0) bonus += 2;
    if ((resume.volunteer || []).length > 0) bonus += 2;
    if ((resume.languages || []).some((l) => l.language?.trim())) bonus += 2;
    if (resume.interests?.trim() || (resume.interestItems || []).some((i) => i.name?.trim())) {
      bonus += 1;
    }
    score += Math.min(8, bonus);

    return Math.min(100, score);
  }

  if (resume.template === 'engineering-resume') {
    let score = 0;

    if (resume.personalInfo) {
      if (resume.personalInfo.fullName?.trim()) score += 8;
      if (resume.personalInfo.email?.trim()) score += 6;
      if (resume.personalInfo.phone?.trim()) score += 4;
      if (
        resume.personalInfo.city?.trim() ||
        resume.personalInfo.state?.trim() ||
        resume.personalInfo.country?.trim() ||
        resume.personalInfo.location?.trim() ||
        resume.personalInfo.linkedin?.trim() ||
        resume.personalInfo.github?.trim()
      ) {
        score += 2;
      }
    }

    if ((resume.objective || '').trim().split(/\s+/).filter(Boolean).length >= 8) {
      score += 12;
    } else if ((resume.objective || '').trim().length > 0) {
      score += 6;
    }

    const hasUnivEdu = (resume.education || []).some(
      (e) => e.institution?.trim() || e.degree?.trim()
    );
    const hasHighSchool = (resume.highSchool || []).some(
      (h) => h.schoolName?.trim() || h.qualification?.trim()
    );
    if (hasUnivEdu) score += 24;
    else if (hasHighSchool) score += 14;

    const totalSkills = (resume.skills || []).reduce(
      (acc, c) => acc + (c.skills?.filter((s) => s.trim()).length || 0),
      0
    );
    if (totalSkills >= 4) score += 16;
    else if (totalSkills > 0) score += 10;

    const validProjs = (resume.projects || []).filter(
      (p) =>
        p.title?.trim() &&
        Boolean(
          p.description?.trim() ||
            p.objective?.trim() ||
            p.methodology?.trim() ||
            p.designApproach?.trim() ||
            p.results?.trim() ||
            (p.highlights || []).some((h) => h.trim())
        )
    ).length;
    const anyProj = (resume.projects || []).filter((p) => p.title?.trim()).length;
    if (validProjs >= 2) score += 20;
    else if (validProjs === 1 || anyProj >= 1) score += 15;

    let bonus = 0;
    if ((resume.experience || []).length > 0 || (resume.learningActivities || []).length > 0) {
      bonus += 3;
    }
    if ((resume.leadership || []).length > 0) bonus += 3;
    if (
      (resume.achievements || []).length > 0 ||
      (resume.volunteer || []).length > 0 ||
      (resume.certifications || []).length > 0
    ) {
      bonus += 3;
    }
    if (resume.interests?.trim() || (resume.interestItems || []).some((i) => i.name?.trim())) {
      bonus += 2;
    }
    score += Math.min(8, bonus);

    return Math.min(100, score);
  }

  if (resume.template === 'creative-professional') {
    let score = 0;
    const pi = resume.personalInfo;
    if (pi) {
      if (pi.fullName?.trim()) score += 10;
      if (pi.jobTitle?.trim() || pi.specialization?.trim()) score += 4;
      if (pi.email?.trim()) score += 5;
      if (pi.phone?.trim()) score += 3;
      if (
        pi.city?.trim() ||
        pi.country?.trim() ||
        pi.location?.trim() ||
        pi.website?.trim() ||
        pi.linkedin?.trim() ||
        pi.github?.trim()
      ) {
        score += 3;
      }
    }

    const expCount = (resume.experience || []).filter(
      (e) => e.company?.trim() || e.position?.trim()
    ).length;
    if (expCount >= 2) score += 20;
    else if (expCount === 1) score += 14;

    const hasEdu =
      (resume.education || []).some((e) => e.institution?.trim() || e.degree?.trim()) ||
      (resume.highSchool || []).some((h) => h.schoolName?.trim());
    if (hasEdu) score += 18;

    const hasDetailedSkills =
      (resume.creativeSkillItems || []).some((s) => s.name?.trim()) ||
      (resume.skills || []).some((s) => s.skills?.some((sk) => sk.trim()));
    if (hasDetailedSkills) score += 12;

    const hasCircles = (resume.circularProficiencies || []).some((c) => c.name?.trim());
    const hasBars = (resume.creativeSkillBars || []).some((b) => b.name?.trim());
    if (hasCircles) score += 8;
    if (hasBars) score += 8;

    let bonus = 0;
    if ((resume.communicationSkills || []).some((c) => c.skill?.trim())) bonus += 3;
    if (
      (resume.certifications || []).some((c) => c.name?.trim()) ||
      (resume.achievements || []).some((a) => a.title?.trim())
    ) {
      bonus += 3;
    }
    if ((resume.languages || []).some((l) => l.language?.trim())) bonus += 3;
    if ((resume.publications || []).some((p) => p.title?.trim())) bonus += 3;
    if ((resume.projects || []).some((p) => p.title?.trim())) bonus += 2;
    if (resume.personalQuote?.trim() || resume.objective?.trim()) bonus += 2;
    score += Math.min(9, bonus);

    return Math.min(100, score);
  }

  if (resume.template === 'internship-resume') {
    let score = 0;

    if (resume.personalInfo) {
      if (resume.personalInfo.fullName?.trim()) score += 10;
      if (resume.personalInfo.email?.trim()) score += 6;
      if (resume.personalInfo.phone?.trim()) score += 4;
      if (
        resume.personalInfo.city?.trim() ||
        resume.personalInfo.state?.trim() ||
        resume.personalInfo.country?.trim() ||
        resume.personalInfo.location?.trim()
      ) {
        score += 2;
      }
      if (resume.personalInfo.jobTitle?.trim()) score += 3;
    }

    const hasUnivEdu = (resume.education || []).some(
      (e) => e.institution?.trim() || e.degree?.trim()
    );
    const hasHighSchool = (resume.highSchool || []).some(
      (h) => h.schoolName?.trim() || h.qualification?.trim()
    );
    if (hasUnivEdu) score += 25;
    else if (hasHighSchool) score += 15;

    const resCount = (resume.researchExperience || []).filter(
      (r) => r.title?.trim() || r.objectives?.trim() || r.methodology?.trim()
    ).length;
    const projCount = (resume.projects || []).filter(
      (p) => p.title?.trim() || p.description?.trim()
    ).length;
    const workItemCount = resCount + projCount;
    if (workItemCount >= 2 || (resume.internshipTrack === 'research' && resCount >= 1)) {
      score += 20;
    } else if (workItemCount === 1) {
      score += 16;
    } else if (resume.internshipTrack === 'non-technical') {
      // Research/technical projects are optional for non-technical internships
      score += 15;
    }

    const skillItemCount =
      (resume.skills || []).reduce(
        (acc, c) =>
          acc +
          (c.skills?.filter((s) => s.trim()).length || (c.category?.trim() ? 1 : 0)),
        0
      ) + (resume.skillMatrix || []).filter((m) => m.skill?.trim()).length;
    if (skillItemCount >= 3) score += 15;
    else if (skillItemCount > 0) score += 9;

    // Optional enrichment bonus (never penalizes empty optional sections or unconfirmed skill dots)
    let bonus = 0;
    if (
      (resume.learningActivities || []).some(
        (l) => l.title?.trim() || l.subject?.trim() || l.provider?.trim()
      )
    ) {
      bonus += 4;
    }
    if (
      (resume.achievements || []).some(
        (a) => a.title?.trim() || a.description?.trim() || a.achievementDetails?.trim()
      )
    ) {
      bonus += 4;
    }
    if (
      (resume.careerInterests || []).some((c) => c.trim()) ||
      resume.internshipPreferences?.targetRole?.trim() ||
      resume.internshipPreferences?.preferredIndustry?.trim()
    ) {
      bonus += 4;
    }
    if (
      (resume.interestItems || []).some((i) => i.name?.trim()) ||
      resume.interests?.trim()
    ) {
      bonus += 3;
    }
    if (
      (resume.experience || []).some((e) => e.company?.trim() || e.position?.trim())
    ) {
      bonus += 4;
    }
    if ((resume.certifications || []).some((c) => c.name?.trim() || c.issuer?.trim())) {
      bonus += 2;
    }
    if ((resume.languages || []).some((l) => l.language?.trim())) {
      bonus += 2;
    }
    if (
      (resume.customSections || []).some(
        (cs) => cs.title?.trim() && cs.bullets?.some((b) => b.trim())
      )
    ) {
      bonus += 2;
    }
    score += Math.min(15, bonus);

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

function analyzeModernCorporateSections(
  resume: Partial<Resume>
): import('../types/resume').CvCompletenessReport {
  const sections: import('../types/resume').SectionAnalysis[] = [];
  const recs: string[] = [];
  const bg = resume.targetBackground || 'corporate';
  const hidden = new Set(resume.hiddenSections || []);

  const pi = resume.personalInfo;
  const piIssues: string[] = [];
  const piSuggestions: string[] = [];
  let piScore = 0;
  if (pi?.fullName?.trim()) piScore += 35;
  else piIssues.push('Full name is missing.');
  if (pi?.email?.trim()) piScore += 30;
  else piIssues.push('Professional email address is missing.');
  if (pi?.phone?.trim()) piScore += 20;
  else piIssues.push('Phone number is missing.');
  if (pi?.jobTitle?.trim()) piScore += 15;
  else piSuggestions.push('Add a target headline / professional title beneath your name.');
  if (!pi?.linkedin?.trim() && !pi?.website?.trim()) {
    piSuggestions.push('Consider adding LinkedIn or a personal website link.');
  }

  sections.push({
    sectionId: 'header',
    name: '1. Header & Contact Details',
    status: piScore >= 85 ? 'complete' : 'needs_details',
    statusLabel: piScore >= 85 ? 'Complete' : 'Needs details',
    isOptional: false,
    score: piScore,
    issues: piIssues,
    suggestions: piSuggestions,
  });
  if (piScore < 85) recs.push('Complete your name, target title, email, and phone in Header.');

  const obj = resume.objective?.trim() || '';
  const objWords = obj.split(/\s+/).filter(Boolean).length;
  sections.push({
    sectionId: 'objective',
    name: '2. Professional Summary',
    status:
      objWords >= 18 ? 'complete' : objWords > 0 ? 'needs_details' : 'optional_empty',
    statusLabel:
      objWords >= 18
        ? 'Complete'
        : objWords > 0
        ? 'Too brief'
        : hidden.has('objective')
        ? 'Hidden'
        : 'Optional (Recommended)',
    isOptional: true,
    score: objWords >= 18 ? 100 : objWords > 0 ? 60 : 0,
    issues:
      objWords > 0 && objWords < 18
        ? ['Summary is short; aim for 2–3 crisp executive sentences.']
        : [],
    suggestions:
      objWords === 0
        ? ['Add a concise 2–3 line executive summary aligned with your target role.']
        : [],
  });

  const exp = resume.experience || [];
  const expIsOptional = bg === 'student' || bg === 'fresher';
  let expScore = 0;
  const expIssues: string[] = [];
  const expSuggestions: string[] = [];
  if (exp.length > 0) {
    const missingDetails = exp.filter(
      (e) =>
        !e.company?.trim() ||
        !e.position?.trim() ||
        ((!e.highlights || e.highlights.every((h) => !h.trim())) && !e.description?.trim())
    );
    if (missingDetails.length > 0) {
      expScore = 65;
      expIssues.push('One or more experience entries need company, title, or bullet points.');
    } else {
      expScore = 100;
    }
  } else if (!expIsOptional) {
    expIssues.push('Add at least one work experience role with measurable outcomes.');
    recs.push('Add work experience entries under Work Experience.');
  } else {
    expSuggestions.push('Optional for students/freshers—add internships, co-ops, or part-time roles if any.');
  }

  sections.push({
    sectionId: 'experience',
    name: '3. Work Experience',
    status:
      expScore === 100
        ? 'complete'
        : exp.length === 0 && expIsOptional
        ? 'optional_empty'
        : 'needs_details',
    statusLabel:
      expScore === 100
        ? 'Complete'
        : exp.length === 0 && expIsOptional
        ? 'Not provided (Optional)'
        : 'Needs details',
    isOptional: expIsOptional,
    score: expScore,
    issues: expIssues,
    suggestions: expSuggestions,
  });

  const strengths = (resume.strengths || []).filter((s) => s.trim().length > 0);
  sections.push({
    sectionId: 'strengths',
    name: '4. Core Competencies',
    status: strengths.length >= 3 ? 'complete' : strengths.length > 0 ? 'needs_details' : 'optional_empty',
    statusLabel:
      strengths.length >= 3
        ? 'Complete'
        : strengths.length > 0
        ? 'Add more'
        : 'Optional',
    isOptional: true,
    score: strengths.length >= 3 ? 100 : strengths.length > 0 ? 60 : 0,
    issues: [],
    suggestions:
      strengths.length === 0
        ? ['Optional: Add 4–6 ATS-friendly domain competencies (e.g., Financial Modeling, M&A Strategy).']
        : [],
  });

  const edu = resume.education || [];
  let eduScore = 0;
  const eduIssues: string[] = [];
  if (edu.length > 0) {
    const valid = edu.filter((e) => e.institution?.trim() && e.degree?.trim());
    eduScore = valid.length === edu.length ? 100 : 60;
    if (valid.length < edu.length) {
      eduIssues.push('Ensure each education entry includes degree and institution.');
    }
  } else {
    eduIssues.push('Add your highest degree or current academic program.');
    recs.push('Add an education entry under Education.');
  }
  sections.push({
    sectionId: 'education',
    name: '5. Education',
    status: eduScore === 100 ? 'complete' : 'needs_details',
    statusLabel: eduScore === 100 ? 'Complete' : 'Needs details',
    isOptional: false,
    score: eduScore,
    issues: eduIssues,
    suggestions: [],
  });

  const totalSkills = (resume.skills || []).reduce(
    (acc, c) => acc + (c.skills?.filter((s) => s.trim()).length || 0),
    0
  );
  sections.push({
    sectionId: 'skills',
    name: '6. Technical Skills',
    status:
      totalSkills >= 4 ? 'complete' : totalSkills > 0 ? 'needs_details' : 'optional_empty',
    statusLabel:
      totalSkills >= 4
        ? 'Complete'
        : totalSkills > 0
        ? 'Add more'
        : 'Not provided (Optional)',
    isOptional: true,
    score: totalSkills >= 4 ? 100 : totalSkills > 0 ? 60 : 0,
    issues: [],
    suggestions:
      totalSkills === 0
        ? ['Add categorized technical/computer skills for 2-column ModernCV layout.']
        : [],
  });

  const projs = resume.projects || [];
  sections.push({
    sectionId: 'projects',
    name: '7. Projects',
    status: projs.length > 0 ? 'complete' : 'optional_empty',
    statusLabel: projs.length > 0 ? 'Complete' : 'Not provided (Optional)',
    isOptional: true,
    score: projs.length > 0 ? 100 : 0,
    issues: [],
    suggestions:
      projs.length === 0 && (bg === 'student' || bg === 'fresher' || bg === 'technical')
        ? ['Recommended: Add 2–3 impactful corporate, capstone, or engineering projects.']
        : [],
  });

  const certs = resume.certifications || [];
  sections.push({
    sectionId: 'certifications',
    name: '8. Certifications',
    status: certs.length > 0 ? 'complete' : 'optional_empty',
    statusLabel: certs.length > 0 ? 'Complete' : 'Not provided (Optional)',
    isOptional: true,
    score: certs.length > 0 ? 100 : 0,
    issues: [],
    suggestions: [],
  });

  const awards = resume.achievements || [];
  sections.push({
    sectionId: 'achievements',
    name: '9. Awards & Achievements',
    status: awards.length > 0 ? 'complete' : 'optional_empty',
    statusLabel: awards.length > 0 ? 'Complete' : 'Not provided (Optional)',
    isOptional: true,
    score: awards.length > 0 ? 100 : 0,
    issues: [],
    suggestions: [],
  });

  const langs = (resume.languages || []).filter((l) => l.language?.trim());
  sections.push({
    sectionId: 'languages',
    name: '10. Languages',
    status: langs.length > 0 ? 'complete' : 'optional_empty',
    statusLabel: langs.length > 0 ? 'Complete' : 'Not provided (Optional)',
    isOptional: true,
    score: langs.length > 0 ? 100 : 0,
    issues: [],
    suggestions: [],
  });

  const lead = resume.leadership || [];
  sections.push({
    sectionId: 'leadership',
    name: '11. Leadership & Activities',
    status: lead.length > 0 ? 'complete' : 'optional_empty',
    statusLabel: lead.length > 0 ? 'Complete' : 'Not provided (Optional)',
    isOptional: true,
    score: lead.length > 0 ? 100 : 0,
    issues: [],
    suggestions: [],
  });

  const mems = resume.memberships || [];
  sections.push({
    sectionId: 'memberships',
    name: '12. Professional Memberships',
    status: mems.length > 0 ? 'complete' : 'optional_empty',
    statusLabel: mems.length > 0 ? 'Complete' : 'Not provided (Optional)',
    isOptional: true,
    score: mems.length > 0 ? 100 : 0,
    issues: [],
    suggestions: [],
  });

  const hasInt =
    Boolean(resume.interestItems && resume.interestItems.some((i) => i.name?.trim())) ||
    Boolean(resume.interests?.trim());
  sections.push({
    sectionId: 'interests',
    name: '13. Interests',
    status: hasInt ? 'complete' : 'optional_empty',
    statusLabel: hasInt ? 'Complete' : 'Not provided (Optional)',
    isOptional: true,
    score: hasInt ? 100 : 0,
    issues: [],
    suggestions: [],
  });

  const hasRefs =
    resume.referencesDisplayMode === 'on-request' ||
    (resume.references && resume.references.length > 0);
  sections.push({
    sectionId: 'references',
    name: '14. References',
    status: hasRefs ? 'complete' : 'optional_empty',
    statusLabel: hasRefs ? 'Complete' : 'Not provided (Optional)',
    isOptional: true,
    score: hasRefs ? 100 : 0,
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
        : ['Your Modern Corporate CV is balanced, ATS-friendly, and formatted to Overleaf ModernCV standards.'],
  };
}

function analyzeFresherResumeSections(
  resume: Partial<Resume>
): import('../types/resume').CvCompletenessReport {
  const sections: import('../types/resume').SectionAnalysis[] = [];
  const recs: string[] = [];
  const track = resume.fresherTrack || 'cs';
  const hidden = new Set(resume.hiddenSections || []);

  // 1. Header
  const pi = resume.personalInfo;
  const piIssues: string[] = [];
  const piSuggestions: string[] = [];
  let piScore = 0;
  if (pi?.fullName?.trim()) piScore += 35;
  else piIssues.push('Full name is missing.');
  if (pi?.email?.trim()) piScore += 30;
  else piIssues.push('Email address is missing.');
  if (pi?.phone?.trim()) piScore += 20;
  else piIssues.push('Phone number is missing.');
  if (pi?.jobTitle?.trim()) piScore += 15;
  else piSuggestions.push('Add your Target Job / Role below your name (e.g. Junior Software Engineer).');
  if (!pi?.linkedin?.trim() && !pi?.website?.trim() && !pi?.github?.trim()) {
    piSuggestions.push('Add LinkedIn, Portfolio, or GitHub link for the right-side header column.');
  }

  sections.push({
    sectionId: 'header',
    name: '1. Header & Contact Details',
    status: piScore >= 85 ? 'complete' : 'needs_details',
    statusLabel: piScore >= 85 ? 'Complete' : 'Needs details',
    isOptional: false,
    score: piScore,
    issues: piIssues,
    suggestions: piSuggestions,
  });
  if (piScore < 85) recs.push('Complete your name, target role, email, and phone in Header.');

  // 2. Highlights & Impact Summary (Optional)
  const keywords = (resume.strengths || []).filter((s) => s.trim().length > 0);
  const impact = resume.objective?.trim() || '';
  const hasObjectiveStrip = keywords.length > 0 || impact.length > 0;
  sections.push({
    sectionId: 'objective',
    name: '2. Career Highlights & Impact',
    status: hasObjectiveStrip ? 'complete' : 'optional_empty',
    statusLabel: hasObjectiveStrip
      ? 'Complete'
      : hidden.has('objective')
      ? 'Hidden'
      : 'Optional',
    isOptional: true,
    score: hasObjectiveStrip ? 100 : 0,
    issues: [],
    suggestions: !hasObjectiveStrip
      ? ['Optional: Add 3–4 short keyword highlights and a concise 1–2 line Impact statement.']
      : [],
  });

  // 3. Education (Primary for Freshers)
  const edu = resume.education || [];
  let eduScore = 0;
  const eduIssues: string[] = [];
  if (edu.length > 0) {
    const valid = edu.filter((e) => e.institution?.trim() && e.degree?.trim());
    eduScore = valid.length === edu.length ? 100 : 60;
    if (valid.length < edu.length) {
      eduIssues.push('Ensure each education entry lists degree title and institution.');
    }
  } else {
    eduIssues.push('Add your current or completed degree under Education.');
    recs.push('Add your degree, specialization, university, dates, and optional GPA under Education.');
  }
  sections.push({
    sectionId: 'education',
    name: '3. Education',
    status: eduScore === 100 ? 'complete' : 'needs_details',
    statusLabel: eduScore === 100 ? 'Complete' : 'Needs details',
    isOptional: false,
    score: eduScore,
    issues: eduIssues,
    suggestions: [],
  });

  // 4. Projects (Primary for CS/Eng/Cyber, optional-friendly for Non-Technical)
  const projs = resume.projects || [];
  const projIsOptional = track === 'non-technical' || track === 'graduate';
  let projScore = 0;
  const projIssues: string[] = [];
  if (projs.length > 0) {
    const valid = projs.filter(
      (p) => p.title?.trim() && ((p.highlights || []).some((h) => h.trim()) || p.description?.trim())
    );
    projScore = valid.length === projs.length ? 100 : 65;
    if (valid.length < projs.length) {
      projIssues.push('Add concrete outcome or technical bullets for each project.');
    }
  } else if (!projIsOptional) {
    projIssues.push('Add 2–3 academic, personal, capstone, or lab projects.');
    recs.push('Add your strongest academic or capstone projects under Projects.');
  }
  sections.push({
    sectionId: 'projects',
    name: '4. Projects',
    status:
      projScore === 100
        ? 'complete'
        : projs.length === 0 && projIsOptional
        ? 'optional_empty'
        : 'needs_details',
    statusLabel:
      projScore === 100
        ? 'Complete'
        : projs.length === 0 && projIsOptional
        ? 'Optional'
        : 'Needs details',
    isOptional: projIsOptional,
    score: projScore,
    issues: projIssues,
    suggestions:
      projs.length === 0
        ? ['Highlight capstone projects, labs, coursework builds, or hackathons.']
        : [],
  });

  // 5. Internships / Work Experience (Always optional for Freshers)
  const exp = resume.experience || [];
  sections.push({
    sectionId: 'experience',
    name: '5. Internships & Experience',
    status: exp.length > 0 ? 'complete' : 'optional_empty',
    statusLabel: exp.length > 0 ? 'Complete' : 'Not provided (Optional)',
    isOptional: true,
    score: exp.length > 0 ? 100 : 0,
    issues: [],
    suggestions:
      exp.length === 0
        ? ['Optional for freshers: Add internships, co-ops, industrial training, or teaching assistantships if any.']
        : [],
  });

  // 6. Relevant Coursework
  const cw = (resume.coursework || []).filter((c) => c.trim().length > 0);
  sections.push({
    sectionId: 'coursework',
    name: '6. Relevant Coursework',
    status: cw.length > 0 ? 'complete' : 'optional_empty',
    statusLabel: cw.length > 0 ? 'Complete' : 'Optional',
    isOptional: true,
    score: cw.length > 0 ? 100 : 0,
    issues: [],
    suggestions:
      cw.length === 0 ? ['Optional: Add core academic subjects relevant to your target track.'] : [],
  });

  // 7. Skills
  const totalSkills = (resume.skills || []).reduce(
    (acc, c) => acc + (c.skills?.filter((s) => s.trim()).length || 0),
    0
  );
  sections.push({
    sectionId: 'skills',
    name: '7. Skills',
    status: totalSkills >= 3 ? 'complete' : totalSkills > 0 ? 'needs_details' : 'needs_details',
    statusLabel: totalSkills >= 3 ? 'Complete' : totalSkills > 0 ? 'Add more' : 'Needs details',
    isOptional: false,
    score: totalSkills >= 3 ? 100 : totalSkills > 0 ? 60 : 0,
    issues: totalSkills === 0 ? ['Add categorized skills (e.g., Programming, Tools, Domain Skills).'] : [],
    suggestions: [],
  });
  if (totalSkills === 0) recs.push('Add confirmed skill categories under Skills.');

  // 8. Publications (Optional)
  const pubs = resume.publications || [];
  sections.push({
    sectionId: 'publications',
    name: '8. Publications',
    status: pubs.length > 0 ? 'complete' : 'optional_empty',
    statusLabel: pubs.length > 0 ? 'Complete' : 'Optional',
    isOptional: true,
    score: pubs.length > 0 ? 100 : 0,
    issues: [],
    suggestions: [],
  });

  // 9. Awards & Honors (Optional)
  const awards = resume.achievements || [];
  sections.push({
    sectionId: 'achievements',
    name: '9. Awards & Honors',
    status: awards.length > 0 ? 'complete' : 'optional_empty',
    statusLabel: awards.length > 0 ? 'Complete' : 'Optional',
    isOptional: true,
    score: awards.length > 0 ? 100 : 0,
    issues: [],
    suggestions: [],
  });

  // 10. Certifications (Optional)
  const certs = resume.certifications || [];
  sections.push({
    sectionId: 'certifications',
    name: '10. Certifications',
    status: certs.length > 0 ? 'complete' : 'optional_empty',
    statusLabel: certs.length > 0 ? 'Complete' : 'Optional',
    isOptional: true,
    score: certs.length > 0 ? 100 : 0,
    issues: [],
    suggestions: [],
  });

  // 11. Leadership & Extracurriculars (Optional)
  const lead = resume.leadership || [];
  sections.push({
    sectionId: 'leadership',
    name: '11. Leadership & Activities',
    status: lead.length > 0 ? 'complete' : 'optional_empty',
    statusLabel: lead.length > 0 ? 'Complete' : 'Optional',
    isOptional: true,
    score: lead.length > 0 ? 100 : 0,
    issues: [],
    suggestions: [],
  });

  // 12. Volunteer Experience (Optional)
  const vol = resume.volunteer || [];
  sections.push({
    sectionId: 'volunteer',
    name: '12. Volunteer Experience',
    status: vol.length > 0 ? 'complete' : 'optional_empty',
    statusLabel: vol.length > 0 ? 'Complete' : 'Optional',
    isOptional: true,
    score: vol.length > 0 ? 100 : 0,
    issues: [],
    suggestions: [],
  });

  // 13. Languages (Optional)
  const langs = (resume.languages || []).filter((l) => l.language?.trim());
  sections.push({
    sectionId: 'languages',
    name: '13. Languages',
    status: langs.length > 0 ? 'complete' : 'optional_empty',
    statusLabel: langs.length > 0 ? 'Complete' : 'Optional',
    isOptional: true,
    score: langs.length > 0 ? 100 : 0,
    issues: [],
    suggestions: [],
  });

  // 14. Additional Info / Interests (Optional)
  const hasInt =
    Boolean(resume.interestItems && resume.interestItems.some((i) => i.name?.trim())) ||
    Boolean(resume.interests?.trim());
  sections.push({
    sectionId: 'additional',
    name: '14. Additional Information',
    status: hasInt ? 'complete' : 'optional_empty',
    statusLabel: hasInt ? 'Complete' : 'Optional',
    isOptional: true,
    score: hasInt ? 100 : 0,
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
        : ['Your Fresher Resume is clean, ATS-friendly, and follows Overleaf formatting standards.'],
  };
}

function analyzeInternshipResumeSections(
  resume: Partial<Resume>
): import('../types/resume').CvCompletenessReport {
  const sections: import('../types/resume').SectionAnalysis[] = [];
  const recs: string[] = [];
  const track = resume.internshipTrack || 'cs';

  // 1. Personal Info
  const pi = resume.personalInfo;
  const piIssues: string[] = [];
  const piSuggestions: string[] = [];
  let piScore = 0;
  if (pi?.fullName?.trim()) piScore += 40;
  else piIssues.push('Full name is missing.');
  if (pi?.email?.trim()) piScore += 30;
  else piIssues.push('Email address is missing.');
  if (pi?.phone?.trim()) piScore += 20;
  else piIssues.push('Phone number is missing.');
  if (
    pi?.jobTitle?.trim() ||
    pi?.city?.trim() ||
    pi?.location?.trim() ||
    pi?.linkedin?.trim() ||
    pi?.github?.trim()
  ) {
    piScore += 10;
  } else {
    piSuggestions.push('Add a brief target internship headline, location, LinkedIn, or GitHub link.');
  }
  const piStarted = Boolean(
    pi?.fullName?.trim() ||
      pi?.email?.trim() ||
      pi?.phone?.trim() ||
      pi?.jobTitle?.trim() ||
      pi?.location?.trim() ||
      pi?.city?.trim()
  );
  sections.push({
    sectionId: 'header',
    name: '1. Personal Info',
    status: piScore >= 90 ? 'complete' : piStarted ? 'needs_review' : 'needs_details',
    statusLabel: piScore >= 90 ? 'Completed' : piStarted ? 'In Progress' : 'Not Started',
    isOptional: false,
    score: piScore,
    issues: piIssues,
    suggestions: piSuggestions,
  });
  if (piScore < 90) recs.push('Complete your full name, email, and phone number in Step 1 (Personal Info).');

  // 2. Education
  const edu = resume.education || [];
  const hs = resume.highSchool || [];
  const validEdu = edu.filter((e) => e.institution?.trim() && e.degree?.trim());
  const hasAnyEduDraft = edu.length > 0 || hs.some((h) => h.schoolName?.trim() || h.qualification?.trim());
  const eduIssues: string[] = [];
  let eduScore = 0;
  if (edu.length > 0 && validEdu.length === edu.length) {
    eduScore = 100;
  } else if (hasAnyEduDraft) {
    eduScore = 60;
    eduIssues.push('Ensure each degree lists both institution and degree title.');
  } else {
    eduIssues.push('Add your current degree, university, and expected graduation dates.');
    recs.push('Add your degree, college/university, and graduation timeline under Education.');
  }
  sections.push({
    sectionId: 'education',
    name: '2. Education',
    status: eduScore === 100 ? 'complete' : 'needs_details',
    statusLabel: eduScore === 100 ? 'Completed' : hasAnyEduDraft ? 'In Progress' : 'Not Started',
    isOptional: false,
    score: eduScore,
    issues: eduIssues,
    suggestions: [],
  });

  // 3. Learning & Training (Optional)
  const rawLearning = resume.learningActivities || [];
  const validLearning = rawLearning.filter(
    (item) =>
      Boolean(item.title?.trim()) ||
      Boolean(item.subject?.trim()) ||
      Boolean(item.provider?.trim()) ||
      Boolean(item.description?.trim())
  );
  sections.push({
    sectionId: 'learning',
    name: '3. Learning & Training',
    status:
      validLearning.length > 0
        ? 'complete'
        : rawLearning.length > 0
        ? 'needs_details'
        : 'optional_empty',
    statusLabel:
      validLearning.length > 0
        ? 'Completed'
        : rawLearning.length > 0
        ? 'In Progress'
        : 'Optional / Skipped',
    isOptional: true,
    score: validLearning.length > 0 ? 100 : rawLearning.length > 0 ? 50 : 0,
    issues: [],
    suggestions:
      validLearning.length === 0
        ? ['Optional: Add courses, bootcamps, workshops, or lab training relevant to your internship.']
        : [],
  });

  // 4. Interests (Optional)
  const hasInterests =
    (resume.interestItems || []).some((i) => i.name?.trim()) ||
    Boolean(resume.interests?.trim());
  sections.push({
    sectionId: 'interests',
    name: '4. Interests',
    status: hasInterests ? 'complete' : 'optional_empty',
    statusLabel: hasInterests ? 'Completed' : 'Optional / Skipped',
    isOptional: true,
    score: hasInterests ? 100 : 0,
    issues: [],
    suggestions: !hasInterests
      ? ['Optional: Add 3–5 authentic domain or personal interests.']
      : [],
  });

  // 5. Research Work & Projects
  const rawRes = resume.researchExperience || [];
  const rawProj = resume.projects || [];
  const validRes = rawRes.filter(
    (r) =>
      r.title?.trim() &&
      Boolean(
        r.objectives?.trim() ||
          r.methodology?.trim() ||
          r.findings?.trim() ||
          r.outcomes?.trim()
      )
  );
  const validProj = rawProj.filter(
    (p) =>
      p.title?.trim() &&
      Boolean(p.description?.trim() || (p.highlights || []).some((h) => h.trim()))
  );
  const totalRawWork = rawRes.length + rawProj.length;
  const totalValidWork = validRes.length + validProj.length;
  const researchOptional = track === 'non-technical';
  let workScore = 0;
  const workIssues: string[] = [];
  if (totalRawWork > 0 && totalValidWork === totalRawWork) {
    workScore = 100;
  } else if (totalRawWork > 0) {
    workScore = 60;
    workIssues.push('Add a brief summary or bullet points for each research or project entry.');
  } else if (!researchOptional) {
    workIssues.push('Add 1–3 research topics, capstone builds, or academic projects.');
    recs.push('Add academic projects or research work under Step 5 (Research Work & Projects).');
  }
  sections.push({
    sectionId: 'research',
    name: '5. Research Work & Projects',
    status:
      workScore === 100
        ? 'complete'
        : totalRawWork === 0 && researchOptional
        ? 'optional_empty'
        : 'needs_details',
    statusLabel:
      workScore === 100
        ? 'Completed'
        : totalRawWork > 0
        ? 'In Progress'
        : researchOptional
        ? 'Optional / Skipped'
        : 'Not Started',
    isOptional: researchOptional,
    score: workScore,
    issues: workIssues,
    suggestions:
      totalRawWork === 0
        ? ['Include thesis work, lab assignments, open-source contributions, or course projects.']
        : [],
  });

  // 6. Career Interests (Optional)
  const prefs = resume.internshipPreferences;
  const hasCareerInterests =
    (resume.careerInterests || []).some((c) => c.trim()) ||
    Boolean(
      prefs?.targetRole?.trim() ||
        prefs?.preferredIndustry?.trim() ||
        prefs?.duration?.trim() ||
        prefs?.workArrangement?.trim() ||
        prefs?.availabilityDate?.trim() ||
        (prefs?.preferredTechnologies || []).some((t) => t.trim())
    );
  sections.push({
    sectionId: 'career-interests',
    name: '6. Career Interests',
    status: hasCareerInterests ? 'complete' : 'optional_empty',
    statusLabel: hasCareerInterests ? 'Completed' : 'Optional / Skipped',
    isOptional: true,
    score: hasCareerInterests ? 100 : 0,
    issues: [],
    suggestions: !hasCareerInterests
      ? ['Optional: Specify target internship roles, industries, or preferred tracks.']
      : [],
  });

  // 7. Co-Curricular & Events (Optional)
  const rawAch = resume.achievements || [];
  const validAch = rawAch.filter(
    (a) => a.title?.trim() || a.description?.trim() || a.achievementDetails?.trim()
  );
  sections.push({
    sectionId: 'achievements',
    name: '7. Co-Curricular & Events',
    status:
      validAch.length > 0
        ? 'complete'
        : rawAch.length > 0
        ? 'needs_details'
        : 'optional_empty',
    statusLabel:
      validAch.length > 0
        ? 'Completed'
        : rawAch.length > 0
        ? 'In Progress'
        : 'Optional / Skipped',
    isOptional: true,
    score: validAch.length > 0 ? 100 : rawAch.length > 0 ? 50 : 0,
    issues: [],
    suggestions:
      validAch.length === 0
        ? ['Optional: Add hackathons, competitions, clubs, student chapters, or scholarships.']
        : [],
  });

  // 8. Technical Skills (Proficiency dots are strictly optional/manual)
  const totalSkillCount =
    (resume.skills || []).reduce(
      (acc, c) =>
        acc + (c.skills?.filter((s) => s.trim()).length || (c.category?.trim() ? 1 : 0)),
      0
    ) + (resume.skillMatrix || []).filter((m) => m.skill?.trim()).length;
  const skillScore = totalSkillCount >= 3 ? 100 : totalSkillCount > 0 ? 60 : 0;
  if (totalSkillCount === 0) {
    recs.push('Add at least 3 verified skills or tools in Step 8 (Technical Skills).');
  }
  sections.push({
    sectionId: 'skills',
    name: '8. Technical Skills',
    status: skillScore === 100 ? 'complete' : 'needs_details',
    statusLabel:
      skillScore === 100 ? 'Completed' : totalSkillCount > 0 ? 'In Progress' : 'Not Started',
    isOptional: false,
    score: skillScore,
    issues:
      totalSkillCount === 0
        ? ['Add programming languages, tools, or domain skills. Proficiency dots stay hidden unless you rate them.']
        : [],
    suggestions:
      totalSkillCount > 0 && totalSkillCount < 3
        ? ['Add 1–2 more core tools or domain skills to round out your internship profile.']
        : [],
  });

  // 9. Internship Experience (Always Optional — never penalized)
  const rawExp = resume.experience || [];
  const validExp = rawExp.filter(
    (e) =>
      (e.company?.trim() || e.position?.trim()) &&
      ((e.highlights || []).some((h) => h.trim()) || Boolean(e.description?.trim()))
  );
  sections.push({
    sectionId: 'experience',
    name: '9. Internship Experience',
    status:
      validExp.length > 0
        ? 'complete'
        : rawExp.length > 0
        ? 'needs_details'
        : 'optional_empty',
    statusLabel:
      validExp.length > 0
        ? 'Completed'
        : rawExp.length > 0
        ? 'In Progress'
        : 'Optional / Skipped',
    isOptional: true,
    score: validExp.length > 0 ? 100 : rawExp.length > 0 ? 50 : 0,
    issues: [],
    suggestions:
      rawExp.length === 0
        ? ['Optional: Skip cleanly if this is your first internship, or add prior internships/assistantships.']
        : [],
  });

  // 10. Additional Information & Review (Certifications, Languages, Custom Sections)
  const hasCerts = (resume.certifications || []).some((c) => c.name?.trim() || c.issuer?.trim());
  const hasLangs = (resume.languages || []).some((l) => l.language?.trim());
  const hasCustom = (resume.customSections || []).some(
    (cs) => cs.title?.trim() && cs.bullets?.some((b) => b.trim())
  );
  const hasAdditional = hasCerts || hasLangs || hasCustom;
  sections.push({
    sectionId: 'custom-sections',
    name: '10. Additional Info & Review',
    status: hasAdditional ? 'complete' : 'optional_empty',
    statusLabel: hasAdditional ? 'Completed' : 'Optional / Skipped',
    isOptional: true,
    score: hasAdditional ? 100 : 0,
    issues: [],
    suggestions: !hasAdditional
      ? ['Optional: Add certifications, spoken languages, or custom sections before previewing your PDF.']
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
        : ['Your Internship Resume is clean, balanced, and hides unused optional sections automatically.'],
  };
}

function analyzeEngineeringResumeSections(
  resume: Partial<Resume>
): import('../types/resume').CvCompletenessReport {
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
  if (pi?.phone?.trim()) piScore += 20;
  else piIssues.push('Phone number is missing.');
  if (
    pi?.city?.trim() ||
    pi?.location?.trim() ||
    pi?.linkedin?.trim() ||
    pi?.github?.trim()
  ) {
    piScore += 10;
  } else {
    piSuggestions.push('Add your location and LinkedIn / GitHub / portfolio URLs.');
  }
  const piStarted = Boolean(
    pi?.fullName?.trim() || pi?.email?.trim() || pi?.phone?.trim() || pi?.city?.trim()
  );
  sections.push({
    sectionId: 'header',
    name: '1. Personal Information',
    status: piScore >= 90 ? 'complete' : piStarted ? 'needs_review' : 'needs_details',
    statusLabel: piScore >= 90 ? 'Completed' : piStarted ? 'In Progress' : 'Not Started',
    isOptional: false,
    score: piScore,
    issues: piIssues,
    suggestions: piSuggestions,
  });
  if (piScore < 90) recs.push('Complete your full name, email, and phone in Step 1 (Personal Information).');

  // 2. Career Objective
  const objText = (resume.objective || '').trim();
  const objWords = objText.split(/\s+/).filter(Boolean).length;
  let objStatus: import('../types/resume').SectionStatus = 'optional_empty';
  let objScore = 0;
  const objIssues: string[] = [];
  if (objWords >= 10) {
    objStatus = 'complete';
    objScore = 100;
  } else if (objWords > 0) {
    objStatus = 'needs_details';
    objScore = 60;
    objIssues.push('Consider expanding your Career Objective with your target engineering role and core strengths.');
  }
  sections.push({
    sectionId: 'objective',
    name: '2. Career Objective',
    status: objStatus,
    statusLabel:
      objStatus === 'complete'
        ? 'Completed'
        : objWords > 0
        ? 'In Progress'
        : 'Not Started',
    isOptional: true,
    score: objScore,
    issues: objIssues,
    suggestions:
      objWords === 0
        ? ['Add a concise 2–3 line objective naming your engineering branch and target roles.']
        : [],
  });
  if (objWords === 0) recs.push('Write a concise Career Objective stating your engineering specialization and target roles.');

  // 3. Education
  const edu = resume.education || [];
  const hs = resume.highSchool || [];
  const validEdu = edu.filter((e) => e.institution?.trim() && e.degree?.trim());
  const hasAnyEduDraft =
    edu.length > 0 || hs.some((h) => h.schoolName?.trim() || h.qualification?.trim());
  let eduScore = 0;
  const eduIssues: string[] = [];
  if (edu.length > 0 && validEdu.length === edu.length) {
    eduScore = 100;
  } else if (hasAnyEduDraft) {
    eduScore = 60;
    eduIssues.push('Ensure each degree entry specifies both degree/branch and institution.');
  } else {
    eduIssues.push('Add your engineering degree (B.E./B.Tech/M.Tech), college, and graduation year.');
    recs.push('Add your degree, engineering branch, CGPA/percentage, and college under Education.');
  }
  sections.push({
    sectionId: 'education',
    name: '3. Education',
    status: eduScore === 100 ? 'complete' : 'needs_details',
    statusLabel: eduScore === 100 ? 'Completed' : hasAnyEduDraft ? 'In Progress' : 'Not Started',
    isOptional: false,
    score: eduScore,
    issues: eduIssues,
    suggestions: [],
  });

  // 4. Skills & Interests
  const totalSkills = (resume.skills || []).reduce(
    (acc, c) => acc + (c.skills?.filter((s) => s.trim()).length || 0),
    0
  );
  const hasInterests = Boolean(
    (resume.interestItems && resume.interestItems.some((i) => i.name?.trim())) ||
      resume.interests?.trim()
  );
  const skillScore = totalSkills >= 4 ? 100 : totalSkills > 0 ? 60 : 0;
  if (totalSkills === 0) {
    recs.push('Add categorized engineering skills (Technical Skills, Software/Tools, Programming) under Skills & Interests.');
  }
  sections.push({
    sectionId: 'skills',
    name: '4. Skills & Interests',
    status: skillScore === 100 ? 'complete' : 'needs_details',
    statusLabel:
      skillScore === 100
        ? 'Completed'
        : totalSkills > 0 || hasInterests
        ? 'In Progress'
        : 'Not Started',
    isOptional: false,
    score: skillScore,
    issues:
      totalSkills === 0
        ? ['Add core engineering tools, CAD/simulation or programming skills without rating bars.']
        : [],
    suggestions:
      !hasInterests
        ? ['Optional: Add 2–4 technical or personal interests beneath your categorized skills.']
        : [],
  });

  // 5. Projects
  const proj = resume.projects || [];
  const validProj = proj.filter(
    (p) =>
      p.title?.trim() &&
      Boolean(
        p.description?.trim() ||
          p.objective?.trim() ||
          p.methodology?.trim() ||
          p.designApproach?.trim() ||
          p.testingValidation?.trim() ||
          p.results?.trim() ||
          (p.highlights || []).some((h) => h.trim())
      )
  );
  let projScore = 0;
  const projIssues: string[] = [];
  if (proj.length > 0 && validProj.length === proj.length) {
    projScore = 100;
  } else if (proj.length > 0) {
    projScore = 60;
    projIssues.push('Add project methodology, tools/components used, or key results for each project.');
  } else {
    projIssues.push('Add 1–3 academic, mini, capstone, or engineering design projects.');
    recs.push('Add engineering projects detailing objective, tools/software, methodology, and results.');
  }
  sections.push({
    sectionId: 'projects',
    name: '5. Projects',
    status: projScore === 100 ? 'complete' : 'needs_details',
    statusLabel: projScore === 100 ? 'Completed' : proj.length > 0 ? 'In Progress' : 'Not Started',
    isOptional: false,
    score: projScore,
    issues: projIssues,
    suggestions: [],
  });

  // 6. Internship & Trainings (Always Optional for freshers)
  const rawExp = resume.experience || [];
  const rawTrain = resume.learningActivities || [];
  const validExp = rawExp.filter(
    (e) =>
      (e.company?.trim() || e.position?.trim()) &&
      ((e.highlights || []).some((h) => h.trim()) || Boolean(e.description?.trim()))
  );
  const validTrain = rawTrain.filter(
    (l) => Boolean(l.title?.trim()) || Boolean(l.provider?.trim()) || Boolean(l.description?.trim())
  );
  const totalInternTrain = rawExp.length + rawTrain.length;
  const totalValidInternTrain = validExp.length + validTrain.length;
  sections.push({
    sectionId: 'experience',
    name: '6. Internship / Trainings',
    status:
      totalInternTrain > 0 && totalValidInternTrain === totalInternTrain
        ? 'complete'
        : totalInternTrain > 0
        ? 'needs_details'
        : 'optional_empty',
    statusLabel:
      totalInternTrain > 0 && totalValidInternTrain === totalInternTrain
        ? 'Completed'
        : totalInternTrain > 0
        ? 'In Progress'
        : 'Optional / Skipped',
    isOptional: true,
    score: totalValidInternTrain > 0 ? 100 : totalInternTrain > 0 ? 50 : 0,
    issues: [],
    suggestions:
      totalInternTrain === 0
        ? ['Optional for freshers: Add industrial internships, plant visits, CNC/lab trainings, or workshops.']
        : [],
  });

  // 7. Position of Responsibility (Optional)
  const rawLead = resume.leadership || [];
  const validLead = rawLead.filter(
    (l) =>
      (l.role?.trim() || l.organization?.trim()) &&
      ((l.highlights || []).some((h) => h.trim()) || Boolean(l.organization?.trim()))
  );
  sections.push({
    sectionId: 'leadership',
    name: '7. Position of Responsibility',
    status:
      validLead.length > 0
        ? 'complete'
        : rawLead.length > 0
        ? 'needs_details'
        : 'optional_empty',
    statusLabel:
      validLead.length > 0
        ? 'Completed'
        : rawLead.length > 0
        ? 'In Progress'
        : 'Optional / Skipped',
    isOptional: true,
    score: validLead.length > 0 ? 100 : rawLead.length > 0 ? 50 : 0,
    issues: [],
    suggestions:
      rawLead.length === 0
        ? ['Optional: Add club coordinator, SAE/IEEE student chapter lead, or technical fest organizer roles.']
        : [],
  });

  // 8. Extra-Curricular Activities (Optional)
  const rawAch = resume.achievements || [];
  const rawVol = resume.volunteer || [];
  const rawCert = resume.certifications || [];
  const hasExtraCurr =
    rawAch.some((a) => a.title?.trim() || a.description?.trim()) ||
    rawVol.some((v) => v.role?.trim() || v.organization?.trim()) ||
    rawCert.some((c) => c.name?.trim());
  sections.push({
    sectionId: 'awards',
    name: '8. Extra-Curricular Activities',
    status: hasExtraCurr ? 'complete' : 'optional_empty',
    statusLabel: hasExtraCurr ? 'Completed' : 'Optional / Skipped',
    isOptional: true,
    score: hasExtraCurr ? 100 : 0,
    issues: [],
    suggestions: !hasExtraCurr
      ? ['Optional: Add technical symposiums, hackathons, competitions, NSS/volunteering, or certifications.']
      : [],
  });

  // 9. Additional Information (Optional)
  const hasLangs = (resume.languages || []).some((l) => l.language?.trim());
  const hasCustom = (resume.customSections || []).some(
    (cs) => cs.title?.trim() && cs.bullets?.some((b) => b.trim())
  );
  const hasAdditional = hasLangs || hasCustom;
  sections.push({
    sectionId: 'custom-sections',
    name: '9. Additional Information',
    status: hasAdditional ? 'complete' : 'optional_empty',
    statusLabel: hasAdditional ? 'Completed' : 'Optional / Skipped',
    isOptional: true,
    score: hasAdditional ? 100 : 0,
    issues: [],
    suggestions: !hasAdditional
      ? ['Optional: Add custom extra sections or spoken languages before exporting your A4 PDF.']
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
        : ['Your Engineering Resume is clean, branch-aligned, and ready for A4 PDF export.'],
  };
}

function analyzeCreativeProfessionalSections(
  resume: Partial<Resume>
): import('../types/resume').CvCompletenessReport {
  const sections: import('../types/resume').SectionAnalysis[] = [];
  const recs: string[] = [];

  // 1. Header & Personal Brand
  const pi = resume.personalInfo;
  const piIssues: string[] = [];
  const piSuggestions: string[] = [];
  let piScore = 0;
  if (pi?.fullName?.trim()) piScore += 35;
  else piIssues.push('Full name is missing.');
  if (pi?.jobTitle?.trim()) piScore += 25;
  else piIssues.push('Professional title is missing.');
  if (pi?.email?.trim()) piScore += 25;
  else piIssues.push('Email address is missing.');
  if (pi?.phone?.trim()) piScore += 15;
  else piSuggestions.push('Add a phone number or portfolio URL for recruiter outreach.');

  if (!pi?.specialization?.trim() && !pi?.tagline?.trim()) {
    piSuggestions.push('Add a specialization or tagline to sharpen your centered CV header.');
  }

  sections.push({
    sectionId: 'header',
    name: '1. Header & Personal Details',
    status: piScore >= 85 ? 'complete' : 'needs_details',
    statusLabel: piScore >= 85 ? 'Completed' : piScore > 0 ? 'In Progress' : 'Not Started',
    isOptional: false,
    score: piScore,
    issues: piIssues,
    suggestions: piSuggestions,
  });
  if (piScore < 85) recs.push('Complete your full name, title, email, and contact links in Header & Personal Details.');

  // 2. Short Resume / Experience
  const exp = resume.experience || [];
  let expScore = 0;
  let expStatus: import('../types/resume').SectionStatus = 'needs_details';
  const expIssues: string[] = [];
  if (exp.length > 0) {
    const completeExp = exp.filter(
      (e) =>
        (e.company?.trim() || e.position?.trim()) &&
        (Boolean(e.description?.trim()) || (e.highlights || []).some((h) => h.trim()))
    );
    if (completeExp.length === exp.length) {
      expStatus = 'complete';
      expScore = 100;
    } else {
      expStatus = 'needs_details';
      expScore = 65;
      expIssues.push('Add role title, company, and concise achievement highlights to all entries.');
    }
  } else {
    expIssues.push('Add work roles, consulting projects, or internships to Short Resume.');
    recs.push('Add at least 1–2 roles under Short Resume / Experience.');
  }
  sections.push({
    sectionId: 'experience',
    name: '2. Short Resume (Experience)',
    status: expStatus,
    statusLabel: expStatus === 'complete' ? 'Completed' : exp.length > 0 ? 'In Progress' : 'Not Started',
    isOptional: false,
    score: expScore,
    issues: expIssues,
    suggestions: [],
  });

  // 3. Degrees (Education)
  const edu = resume.education || [];
  const validEdu = edu.filter((e) => e.degree?.trim() && e.institution?.trim());
  const eduComplete = edu.length > 0 && validEdu.length === edu.length;
  sections.push({
    sectionId: 'education',
    name: '3. Degrees (Education)',
    status: eduComplete ? 'complete' : 'needs_details',
    statusLabel: eduComplete ? 'Completed' : edu.length > 0 ? 'In Progress' : 'Not Started',
    isOptional: false,
    score: eduComplete ? 100 : edu.length > 0 ? 60 : 0,
    issues: edu.length === 0 ? ['Add your university degree(s) under Degrees.'] : [],
    suggestions: [],
  });
  if (!eduComplete) recs.push('Ensure all Degrees include degree title and institution.');

  // 4. Categorized Skills & Visual Proficiency (Circles + Bars)
  const hasCatSkills =
    (resume.creativeSkillItems || []).some((s) => s.name?.trim()) ||
    (resume.skills || []).some((s) => s.skills?.some((sk) => sk.trim()));
  const hasCircles = (resume.circularProficiencies || []).some((c) => c.name?.trim());
  const hasBars = (resume.creativeSkillBars || []).some((b) => b.name?.trim());
  const skillParts = [hasCatSkills, hasCircles, hasBars].filter(Boolean).length;
  sections.push({
    sectionId: 'skills',
    name: '4. Skills, Circles & Skill Bars',
    status: skillParts >= 2 ? 'complete' : skillParts === 1 ? 'needs_details' : 'needs_details',
    statusLabel: skillParts >= 2 ? 'Completed' : skillParts === 1 ? 'In Progress' : 'Not Started',
    isOptional: false,
    score: skillParts === 3 ? 100 : skillParts === 2 ? 85 : skillParts === 1 ? 50 : 0,
    issues: skillParts === 0 ? ['Add categorized skills and visual proficiency percentages.'] : [],
    suggestions:
      skillParts > 0 && (!hasCircles || !hasBars)
        ? ['Add both Circular Proficiency indicators and Horizontal Skill Bars for full visual balance.']
        : [],
  });
  if (skillParts < 2) recs.push('Populate Skills along with Circular Proficiencies and Skill Bars.');

  // 5. Communication Skills (Optional)
  const hasComm = (resume.communicationSkills || []).some((c) => c.skill?.trim());
  sections.push({
    sectionId: 'communication',
    name: '5. Communication Skills',
    status: hasComm ? 'complete' : 'optional_empty',
    statusLabel: hasComm ? 'Completed' : 'Optional / Skipped',
    isOptional: true,
    score: hasComm ? 100 : 0,
    issues: [],
    suggestions: !hasComm ? ['Optional: Highlight presentations, workshops, or cross-team communication.'] : [],
  });

  // 6. Certificates & Grants (Optional)
  const hasCerts =
    (resume.certifications || []).some((c) => c.name?.trim()) ||
    (resume.achievements || []).some((a) => a.title?.trim());
  sections.push({
    sectionId: 'certifications',
    name: '6. Certificates & Grants',
    status: hasCerts ? 'complete' : 'optional_empty',
    statusLabel: hasCerts ? 'Completed' : 'Optional / Skipped',
    isOptional: true,
    score: hasCerts ? 100 : 0,
    issues: [],
    suggestions: !hasCerts ? ['Optional: Add certifications, fellowships, grants, or scholarships.'] : [],
  });

  // 7. Languages (Optional)
  const hasLangs = (resume.languages || []).some((l) => l.language?.trim());
  sections.push({
    sectionId: 'languages',
    name: '7. Languages',
    status: hasLangs ? 'complete' : 'optional_empty',
    statusLabel: hasLangs ? 'Completed' : 'Optional / Skipped',
    isOptional: true,
    score: hasLangs ? 100 : 0,
    issues: [],
    suggestions: !hasLangs ? ['Optional: Add spoken languages with proficiency dot ratings.'] : [],
  });

  // 8. Talks & Publications (Optional)
  const hasPubs = (resume.publications || []).some((p) => p.title?.trim());
  sections.push({
    sectionId: 'publications',
    name: '8. Talks & Publications',
    status: hasPubs ? 'complete' : 'optional_empty',
    statusLabel: hasPubs ? 'Completed' : 'Optional / Skipped',
    isOptional: true,
    score: hasPubs ? 100 : 0,
    issues: [],
    suggestions: !hasPubs ? ['Optional: Add conference talks, panels, articles, or publications.'] : [],
  });

  // 9. Projects & Additional Sections (Optional)
  const hasAdditional =
    (resume.projects || []).some((p) => p.title?.trim()) ||
    (resume.leadership || []).some((l) => l.role?.trim() || l.organization?.trim()) ||
    (resume.volunteer || []).some((v) => v.role?.trim() || v.organization?.trim()) ||
    (resume.memberships || []).some((m) => m.organization?.trim()) ||
    (resume.customSections || []).some((cs) => cs.title?.trim() && cs.bullets?.some((b) => b.trim()));
  sections.push({
    sectionId: 'custom-sections',
    name: '9. Projects & Additional Sections',
    status: hasAdditional ? 'complete' : 'optional_empty',
    statusLabel: hasAdditional ? 'Completed' : 'Optional / Skipped',
    isOptional: true,
    score: hasAdditional ? 100 : 0,
    issues: [],
    suggestions: !hasAdditional ? ['Optional: Add Projects, Leadership, Volunteering, or Custom Sections.'] : [],
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
        : ['Your Creative Professional CV is balanced, authentic, and ready for A4 PDF export.'],
  };
}

export function analyzeResumeSections(resume: Partial<Resume>): import('../types/resume').CvCompletenessReport {
  if (resume?.template === 'creative-professional') {
    return analyzeCreativeProfessionalSections(resume);
  }
  if (resume?.template === 'engineering-resume') {
    return analyzeEngineeringResumeSections(resume);
  }
  if (resume?.template === 'internship-resume') {
    return analyzeInternshipResumeSections(resume);
  }
  if (resume?.template === 'fresher-resume') {
    return analyzeFresherResumeSections(resume);
  }
  if (resume?.template === 'modern-corporate') {
    return analyzeModernCorporateSections(resume);
  }
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

