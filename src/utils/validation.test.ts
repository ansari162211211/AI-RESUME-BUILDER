import test from 'node:test';
import assert from 'node:assert/strict';
import {
  validateEmail,
  validatePassword,
  validateSignup,
  validateLogin,
  calculateResumeCompleteness,
  analyzeResumeSections,
} from './validation.ts';
import {
  SAMPLE_ACADEMIC_CV,
  SAMPLE_CLASSIC_PROFESSIONAL_CV,
  SAMPLE_ELEGANT_SERIF_CV,
  SAMPLE_HARVARD_CV,
  SAMPLE_JAKES_CV,
  SAMPLE_SOFTWARE_DEVELOPER_CV,
  SAMPLE_STUDENT_CV,
  SAMPLE_TWO_COLUMN_CV,
} from '../data/sampleResumes.ts';

test('validateEmail correctly checks valid and invalid emails', () => {
  assert.equal(validateEmail('user@example.com'), true);
  assert.equal(validateEmail('eleanor.chen@stanford.edu'), true);
  assert.equal(validateEmail('invalid-email'), false);
  assert.equal(validateEmail('user@'), false);
  assert.equal(validateEmail(''), false);
});

test('validatePassword requires at least 6 characters', () => {
  assert.equal(validatePassword('123456').isValid, true);
  assert.equal(validatePassword('short').isValid, false);
  assert.equal(validatePassword('').isValid, false);
});

test('validateSignup checks fullName, email, password matching', () => {
  const resultValid = validateSignup(
    'Dr. Eleanor Chen',
    'eleanor.chen@stanford.edu',
    'academic123',
    'academic123'
  );
  assert.equal(resultValid.isValid, true);
  assert.equal(Object.keys(resultValid.errors).length, 0);

  const resultMismatch = validateSignup(
    'Dr. Eleanor Chen',
    'eleanor.chen@stanford.edu',
    'academic123',
    'mismatch456'
  );
  assert.equal(resultMismatch.isValid, false);
  assert.equal(resultMismatch.errors.confirmPassword, 'Passwords do not match');
});

test('validateLogin catches missing fields', () => {
  const valid = validateLogin('eleanor@stanford.edu', 'secretPassword');
  assert.equal(valid.isValid, true);

  const missingEmail = validateLogin('', 'password123');
  assert.equal(missingEmail.isValid, false);
  assert.ok(missingEmail.errors.email);
});

test('calculateResumeCompleteness computes academic and student scores accurately', () => {
  const academicScore = calculateResumeCompleteness(SAMPLE_ACADEMIC_CV);
  assert.equal(academicScore, 100);

  const studentScore = calculateResumeCompleteness(SAMPLE_STUDENT_CV);
  assert.ok(studentScore >= 70);

  const emptyScore = calculateResumeCompleteness({});
  assert.equal(emptyScore, 0);
});

test('analyzeResumeSections evaluates all 14 sections without penalizing optional sections', () => {
  const academicReport = analyzeResumeSections(SAMPLE_ACADEMIC_CV);
  assert.equal(academicReport.sections.length, 14);
  assert.equal(academicReport.overallStatus, 'excellent');
  assert.equal(academicReport.overallScore, 100);

  // Publications should be complete on Academic CV
  const pubSection = academicReport.sections.find((s) => s.sectionId === 'publications');
  assert.ok(pubSection);
  assert.equal(pubSection.status, 'complete');

  // On student CV, publications and references are optional_empty, not breaking the CV
  const studentReport = analyzeResumeSections(SAMPLE_STUDENT_CV);
  assert.equal(studentReport.sections.length, 14);
  const studentPub = studentReport.sections.find((s) => s.sectionId === 'publications');
  assert.ok(studentPub);
  assert.equal(studentPub.status, 'optional_empty');
  assert.equal(studentPub.isOptional, true);

  // Education should be complete for student
  const studentEdu = studentReport.sections.find((s) => s.sectionId === 'education');
  assert.ok(studentEdu);
  assert.equal(studentEdu.status, 'complete');
});

test("analyzeResumeSections evaluates Jake's Resume sections accurately without altering Academic CV", () => {
  const jakesReport = analyzeResumeSections(SAMPLE_JAKES_CV);
  assert.equal(jakesReport.sections.length, 7);
  assert.equal(jakesReport.overallScore, 100);
  assert.equal(jakesReport.overallStatus, 'excellent');

  const cwSection = jakesReport.sections.find((s) => s.sectionId === 'coursework');
  assert.ok(cwSection);
  assert.equal(cwSection.statusLabel, 'Completed');
  assert.equal(cwSection.status, 'complete');

  const partialJakes = {
    ...SAMPLE_JAKES_CV,
    coursework: [],
    projects: [],
    experience: [],
  };
  const partialReport = analyzeResumeSections(partialJakes);
  const partialCw = partialReport.sections.find((s) => s.sectionId === 'coursework');
  const partialExp = partialReport.sections.find((s) => s.sectionId === 'experience');
  assert.equal(partialCw?.statusLabel, 'Not started (Optional)');
  assert.equal(partialCw?.status, 'optional_empty');
  assert.equal(partialExp?.statusLabel, 'Not started');
  assert.ok(partialReport.overallScore < 100);
});

test('analyzeResumeSections evaluates Classic Professional across 11 sections including Skill Matrix unrated check and References modes', () => {
  const classicReport = analyzeResumeSections(SAMPLE_CLASSIC_PROFESSIONAL_CV);
  assert.equal(classicReport.sections.length, 11);
  assert.equal(classicReport.overallScore, 100);
  assert.equal(classicReport.overallStatus, 'excellent');

  // Profile with unrated Skill Matrix row (no auto-rating) and on-request references & no experience (fresher)
  const fresherClassic = {
    ...SAMPLE_CLASSIC_PROFESSIONAL_CV,
    experience: [],
    thesis: undefined,
    references: [],
    referencesDisplayMode: 'on-request' as const,
    skillMatrix: [
      {
        id: 'm1',
        category: 'Languages',
        skill: 'TypeScript',
        level: null,
      },
    ],
  };
  const fresherReport = analyzeResumeSections(fresherClassic);
  const expSec = fresherReport.sections.find((s) => s.sectionId === 'experience');
  const matSec = fresherReport.sections.find((s) => s.sectionId === 'skill-matrix');
  const refSec = fresherReport.sections.find((s) => s.sectionId === 'references');
  assert.equal(expSec?.status, 'optional_empty');
  assert.equal(matSec?.status, 'needs_details');
  assert.equal(refSec?.status, 'complete');
  assert.equal(refSec?.statusLabel, 'Available on request');
});

test('analyzeResumeSections evaluates Two Column Professional across 12 sections and catches >24h daily activities', () => {
  const twoColReport = analyzeResumeSections(SAMPLE_TWO_COLUMN_CV);
  assert.equal(twoColReport.sections.length, 12);
  assert.equal(twoColReport.overallScore, 100);
  assert.equal(twoColReport.overallStatus, 'excellent');

  const overHours = analyzeResumeSections({
    ...SAMPLE_TWO_COLUMN_CV,
    dailyActivities: [
      { id: 'd1', activity: 'Research', hours: 14 },
      { id: 'd2', activity: 'Sleep', hours: 12 },
    ],
  });
  const dailySec = overHours.sections.find((s) => s.sectionId === 'daily-life');
  assert.equal(dailySec?.status, 'needs_review');
  assert.ok(dailySec?.statusLabel.includes('Exceeds 24h'));
  assert.ok(dailySec?.issues[0]?.includes('26h'));

  const fresherMinimal = analyzeResumeSections({
    ...SAMPLE_TWO_COLUMN_CV,
    dailyActivities: [],
    personalQuote: '',
    achievements: [],
    publications: [],
    references: [],
    referencesDisplayMode: 'hidden',
  });
  assert.equal(fresherMinimal.sections.find((s) => s.sectionId === 'daily-life')?.status, 'optional_empty');
  assert.equal(fresherMinimal.sections.find((s) => s.sectionId === 'philosophy')?.status, 'optional_empty');
  assert.equal(fresherMinimal.sections.find((s) => s.sectionId === 'references')?.statusLabel, 'Skipped');
});

test('analyzeResumeSections evaluates Software Developer across 11 sections without penalizing optional ADDITIONAL subsections or CS student projects', () => {
  const fullReport = analyzeResumeSections(SAMPLE_SOFTWARE_DEVELOPER_CV);
  assert.equal(fullReport.sections.length, 11);
  assert.equal(fullReport.overallScore, 100);
  assert.equal(fullReport.overallStatus, 'excellent');

  // CS student / fresher profile: no formal experience, no coursework/leadership/certifications/awards, has education + projects + skills
  const csStudentReport = analyzeResumeSections({
    ...SAMPLE_SOFTWARE_DEVELOPER_CV,
    experience: [],
    coursework: [],
    leadership: [],
    certifications: [],
    achievements: [],
  });
  assert.equal(csStudentReport.sections.find((s) => s.sectionId === 'experience')?.status, 'optional_empty');
  assert.equal(csStudentReport.sections.find((s) => s.sectionId === 'coursework')?.status, 'optional_empty');
  assert.equal(csStudentReport.sections.find((s) => s.sectionId === 'leadership')?.status, 'optional_empty');
  assert.equal(csStudentReport.sections.find((s) => s.sectionId === 'certifications')?.status, 'optional_empty');
  assert.equal(csStudentReport.sections.find((s) => s.sectionId === 'awards')?.status, 'optional_empty');
  assert.ok(csStudentReport.overallScore >= 75);
});

test('analyzeResumeSections evaluates Harvard Style across 11 sections adapting to Student, Fresher, and Experienced backgrounds', () => {
  const fullReport = analyzeResumeSections(SAMPLE_HARVARD_CV);
  assert.equal(fullReport.sections.length, 11);
  assert.equal(fullReport.overallScore, 100);
  assert.equal(fullReport.overallStatus, 'excellent');

  // Student without work experience or study abroad: experience is optional_empty, study-abroad & high-school are optional_empty
  const studentHarvard = {
    ...SAMPLE_HARVARD_CV,
    targetBackground: 'student' as const,
    experience: [],
    studyAbroad: [],
    highSchool: [],
    labSkills: [],
    achievements: [],
  };
  const studentReport = analyzeResumeSections(studentHarvard);
  assert.equal(studentReport.sections.find((s) => s.sectionId === 'experience')?.status, 'optional_empty');
  assert.equal(studentReport.sections.find((s) => s.sectionId === 'experience')?.isOptional, true);
  assert.equal(studentReport.sections.find((s) => s.sectionId === 'study-abroad')?.status, 'optional_empty');
  assert.equal(studentReport.sections.find((s) => s.sectionId === 'high-school')?.status, 'optional_empty');
  assert.ok(studentReport.overallScore >= 80);

  // Fresher with projects, certifications, unconfirmed language level, and interests
  const fresherHarvard = {
    ...SAMPLE_HARVARD_CV,
    targetBackground: 'fresher' as const,
    experience: [],
    studyAbroad: [],
    projects: [
      { id: 'p1', title: 'Causal Policy Evaluation', technologies: ['R'], highlights: ['Evaluated panel outcomes in R.'] },
    ],
    languages: [
      { id: 'l1', language: 'English', proficiency: 'Native' },
      { id: 'l2', language: 'Spanish', proficiency: '' },
    ],
  };
  const fresherReport = analyzeResumeSections(fresherHarvard);
  assert.equal(fresherReport.sections.find((s) => s.sectionId === 'custom-sections')?.status, 'complete');
  assert.equal(fresherReport.sections.find((s) => s.sectionId === 'languages')?.status, 'complete');
  assert.ok(fresherReport.overallScore >= 85);

  // Experienced profile missing work experience flags Experience as required
  const experiencedMissingExp = {
    ...SAMPLE_HARVARD_CV,
    targetBackground: 'experienced' as const,
    experience: [],
    studyAbroad: [],
    highSchool: [],
  };
  const expMissingReport = analyzeResumeSections(experiencedMissingExp);
  const expSec = expMissingReport.sections.find((s) => s.sectionId === 'experience');
  assert.equal(expSec?.isOptional, false);
  assert.equal(expSec?.status, 'needs_details');
  assert.equal(expMissingReport.sections.find((s) => s.sectionId === 'study-abroad')?.status, 'optional_empty');
  assert.equal(expMissingReport.sections.find((s) => s.sectionId === 'high-school')?.status, 'optional_empty');
});

test('analyzeResumeSections evaluates Elegant Serif (Template 7) across 15 sections and adapts to all 4 personas', () => {
  const fullReport = analyzeResumeSections(SAMPLE_ELEGANT_SERIF_CV);
  assert.equal(fullReport.sections.length, 15);
  assert.equal(fullReport.overallScore, 100);
  assert.equal(fullReport.overallStatus, 'excellent');

  const researchSec = fullReport.sections.find((s) => s.sectionId === 'research');
  assert.ok(researchSec);
  assert.equal(researchSec.status, 'complete');

  // Experienced profile missing experience requires experience; researcher without work experience keeps experience optional
  const expMissing = analyzeResumeSections({
    ...SAMPLE_ELEGANT_SERIF_CV,
    targetBackground: 'experienced' as const,
    experience: [],
  });
  const expSec = expMissing.sections.find((s) => s.sectionId === 'experience');
  assert.equal(expSec?.isOptional, false);
  assert.equal(expSec?.status, 'needs_details');

  const researcherNoWork = analyzeResumeSections({
    ...SAMPLE_ELEGANT_SERIF_CV,
    targetBackground: 'researcher' as const,
    experience: [],
    languages: [{ id: 'ul1', language: 'Italian', proficiency: '' }],
  });
  assert.equal(researcherNoWork.sections.find((s) => s.sectionId === 'experience')?.isOptional, true);
  assert.equal(researcherNoWork.sections.find((s) => s.sectionId === 'experience')?.status, 'optional_empty');
  assert.equal(researcherNoWork.sections.find((s) => s.sectionId === 'languages')?.status, 'complete');
});

