import test from 'node:test';
import assert from 'node:assert/strict';
import {
  MAX_RESUME_UPLOAD_BYTES,
  validateResumeUploadFile,
  validateJobDescriptionInput,
  parseRawResumeTextToDraft,
  resumeToAtsDraft,
  parseJobDescriptionDeterministic,
  scoreResumeAgainstJob,
  generateDeterministicSuggestions,
  isSuggestionFactuallySafe,
  applyAcceptedSuggestionsToDraft,
  buildComparisonSnapshot,
  applyAtsDraftToResume,
} from './atsScoringEngine';
import { TEMPLATE_DEFINITIONS } from '../data/templates';
import {
  SAMPLE_SIMPLE_ONE_PAGE_CV,
  SAMPLE_TWO_COLUMN_CV,
  SAMPLE_CREATIVE_PROFESSIONAL_CV,
  SAMPLE_ACADEMIC_CV,
} from '../data/sampleResumes';
import type { Resume } from '../types/resume';

test('validateResumeUploadFile accepts pdf, docx, txt and rejects invalid/oversized/empty files', () => {
  assert.equal(validateResumeUploadFile('resume.pdf', 'application/pdf', 1024).valid, true);
  assert.equal(
    validateResumeUploadFile(
      'cv.docx',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      2048
    ).valid,
    true
  );
  assert.equal(validateResumeUploadFile('notes.txt', 'text/plain', 512).valid, true);

  assert.equal(validateResumeUploadFile('empty.pdf', 'application/pdf', 0).valid, false);
  assert.equal(
    validateResumeUploadFile('huge.pdf', 'application/pdf', MAX_RESUME_UPLOAD_BYTES + 1).valid,
    false
  );
  assert.equal(validateResumeUploadFile('old.doc', 'application/msword', 2000).valid, false);
  assert.equal(validateResumeUploadFile('photo.png', 'image/png', 2000).valid, false);
  assert.equal(validateResumeUploadFile('malware.exe', 'application/octet-stream', 2000).valid, false);
});

test('validateJobDescriptionInput enforces meaningful length', () => {
  assert.equal(validateJobDescriptionInput('software engineer').valid, false);
  const realJd = `Senior Full-Stack Software Engineer
Required Qualifications:
- 3+ years of experience with React, TypeScript, Node.js, and PostgreSQL
- Experience building REST APIs, Docker containers, and CI/CD pipelines on AWS`;
  assert.equal(validateJobDescriptionInput(realJd).valid, true);
});

test('parseRawResumeTextToDraft parses contacts, summary, experience, projects, education, skills', () => {
  const sampleText = `Alex Morgan
San Francisco, CA
alex.morgan@example.com | +1 415 555 0199 | https://linkedin.com/in/alexmorgan | https://github.com/alexmorgan

SUMMARY
Full-stack engineer focused on reliable TypeScript and cloud web platforms.

EXPERIENCE
Senior Software Engineer | Acme Cloud | Jan 2021 - Present
• Worked on backend REST API services using Node.js and Postgres
• Deployed containerized workloads with Docker and AWS

PROJECTS
Telemetry Portal | React, TypeScript
• Built accessible dashboard modules with unit testing in Jest

EDUCATION
B.S. in Computer Science, University of California | 2016 - 2020

SKILLS
Languages: TypeScript, JS, Python, SQL
Frameworks & Cloud: React, Node.js, Docker, AWS, Postgres`;

  const draft = parseRawResumeTextToDraft(sampleText, {
    fileName: 'alex_morgan_resume.pdf',
    fileFormat: 'pdf',
    fileSizeBytes: 42000,
    pageCount: 1,
  });

  assert.equal(draft.personalInfo.fullName, 'Alex Morgan');
  assert.equal(draft.personalInfo.email, 'alex.morgan@example.com');
  assert.match(draft.personalInfo.linkedin || '', /linkedin\.com\/in\/alexmorgan/);
  assert.equal(draft.experience.length, 1);
  assert.equal(draft.experience[0].highlights.length, 2);
  assert.equal(draft.education.length, 1);
  assert.equal(draft.projects.length, 1);
  assert.ok(draft.skills.some((s) => /TypeScript/i.test(s)));
  assert.ok(draft.detectedSections.includes('Experience'));
  assert.ok(draft.detectedSections.includes('Skills'));
});

test('resumeToAtsDraft works cleanly across all 15 registered templates', () => {
  assert.equal(TEMPLATE_DEFINITIONS.length, 15);
  for (const tpl of TEMPLATE_DEFINITIONS) {
    const baseSample: Resume = {
      ...SAMPLE_SIMPLE_ONE_PAGE_CV,
      id: `test_${tpl.id}`,
      userId: 'test_user',
      template: tpl.id,
      createdAt: '2025-01-01T00:00:00.000Z',
      updatedAt: '2025-01-01T00:00:00.000Z',
    };
    const draft = resumeToAtsDraft(baseSample);
    assert.equal(draft.sourceTemplateId, tpl.id);
    assert.ok(draft.extractedText.length > 50, `Expected extracted text for ${tpl.id}`);
    assert.ok(draft.skills.length > 0, `Expected skills for ${tpl.id}`);
  }

  // Two-column & visual bar risk detection check
  const twoColResume: Resume = {
    ...SAMPLE_TWO_COLUMN_CV,
    id: 'test_twocol',
    userId: 'u1',
    template: 'two-column-professional',
    createdAt: '2025-01-01T00:00:00.000Z',
    updatedAt: '2025-01-01T00:00:00.000Z',
  };
  const twoColDraft = resumeToAtsDraft(twoColResume);
  assert.equal(twoColDraft.layoutHints.isTwoColumnLayout, true);

  const creativeResume: Resume = {
    ...SAMPLE_CREATIVE_PROFESSIONAL_CV,
    id: 'test_creative',
    userId: 'u1',
    template: 'creative-professional',
    createdAt: '2025-01-01T00:00:00.000Z',
    updatedAt: '2025-01-01T00:00:00.000Z',
  };
  const creativeDraft = resumeToAtsDraft(creativeResume);
  assert.equal(creativeDraft.layoutHints.hasVisualSkillBarsOrCircles, true);
});

test('scoreResumeAgainstJob computes deterministic weighted 100-pt breakdown and distinguishes strong vs weak match', () => {
  const jdText = `Senior Backend Software Engineer
Responsibilities:
- Design and maintain scalable REST APIs and microservices using TypeScript, Node.js, and PostgreSQL.
- Deploy and monitor services using Docker, Kubernetes, and AWS.
Required Qualifications:
- Bachelor's degree in Computer Science or related field
- 3+ years of software engineering experience
- Strong proficiency in TypeScript, Node.js, PostgreSQL, Docker, AWS, CI/CD, and Unit Testing.
Preferred:
- Experience with Redis and GraphQL.`;

  const parsedJob = parseJobDescriptionDeterministic(jdText, {
    jobTitle: 'Senior Backend Software Engineer',
    companyName: 'CloudScale Inc',
  });

  const strongResumeText = `Jordan Lee
Austin, TX | jordan.lee@example.com | +1 512 555 0144 | https://linkedin.com/in/jordanlee | https://github.com/jordanlee

SUMMARY
Backend Software Engineer with 5 years of experience building TypeScript, Node.js, PostgreSQL, and AWS systems.

EXPERIENCE
Senior Software Engineer | FinGrid | Jan 2021 - Present
• Architected REST APIs and microservices using TypeScript, Node.js, and PostgreSQL serving production traffic.
• Automated CI/CD pipelines and containerized services with Docker, Kubernetes, and AWS.
• Built Redis caching and GraphQL endpoints with comprehensive Jest unit testing.

Software Engineer | DataPulse | Jun 2019 - Dec 2020
• Developed backend data services with Node.js and SQL databases.

EDUCATION
B.S. in Computer Science, University of Texas | 2015 - 2019

SKILLS
Languages: TypeScript, JavaScript, SQL
Backend & Cloud: Node.js, REST API, Microservices, PostgreSQL, Redis, GraphQL, Docker, Kubernetes, AWS, CI/CD, Unit Testing`;

  const weakResumeText = `Sam Rivera
sam@example.com
SUMMARY
Graphic designer specializing in print typography.
EXPERIENCE
Print Designer | Studio Press | 2022 - 2023
• Designed brochures and event flyers using Adobe InDesign and Illustrator.
SKILLS
Adobe InDesign, Photoshop, Print Layout`;

  const strongDraft = parseRawResumeTextToDraft(strongResumeText, {
    fileName: 'jordan.txt',
    fileFormat: 'txt',
  });
  const weakDraft = parseRawResumeTextToDraft(weakResumeText, {
    fileName: 'sam.txt',
    fileFormat: 'txt',
  });

  const strongRun1 = scoreResumeAgainstJob(strongDraft, parsedJob);
  const strongRun2 = scoreResumeAgainstJob(strongDraft, parsedJob);
  const weakRun = scoreResumeAgainstJob(weakDraft, parsedJob);

  // Strict deterministic equality
  assert.deepEqual(strongRun1, strongRun2);

  // Exact sum of categories === overallScore
  const strongSum = strongRun1.categories.reduce((acc, c) => acc + c.earned, 0);
  assert.equal(strongRun1.overallScore, strongSum);
  const weakSum = weakRun.categories.reduce((acc, c) => acc + c.earned, 0);
  assert.equal(weakRun.overallScore, weakSum);

  assert.ok(strongRun1.overallScore >= 85, `Expected strong score >= 85, got ${strongRun1.overallScore}`);
  assert.ok(weakRun.overallScore <= 45, `Expected weak score <= 45, got ${weakRun.overallScore}`);
  assert.ok(strongRun1.overallScore > weakRun.overallScore + 40);
  assert.ok(strongRun1.matchedKeywords.some((k) => k.locations.includes('Experience')));
  assert.ok(weakRun.missingKeywords.some((k) => k.group === 'critical'));
});

test('suggestions enforce zero fabrication and support Accept / Edit / Reject / Restore + comparison + Resume conversion', () => {
  const jd = `Full Stack Developer
Requirements:
- Experience with TypeScript, React, Node.js, PostgreSQL, and Docker.
- Bachelor's degree in Computer Science.`;
  const parsedJob = parseJobDescriptionDeterministic(jd, { jobTitle: 'Full Stack Developer' });

  const resumeText = `Taylor Kim
taylor@example.com | +1 206 555 0112 | Seattle, WA

EXPERIENCE
Software Developer | WebCorp | Jan 2022 - Present
• Worked on frontend features using React and JS
• Responsible for backend endpoints with Node.js and Postgres

EDUCATION
B.S. in Computer Science, UW | 2018 - 2022

SKILLS
JS, React, Node.js, Postgres`;

  const origDraft = parseRawResumeTextToDraft(resumeText, {
    fileName: 'taylor.txt',
    fileFormat: 'txt',
  });
  const initialAnalysis = scoreResumeAgainstJob(origDraft, parsedJob);
  const suggestions = generateDeterministicSuggestions(origDraft, parsedJob, initialAnalysis);

  assert.ok(suggestions.length >= 3, 'Expected actionable non-fabricated suggestions');

  // Verify safety guard blocks fabricated metrics or unpossessed critical skills
  assert.equal(
    isSuggestionFactuallySafe(
      'Worked on frontend features using React',
      'Engineered React frontend features boosting conversion by 47%',
      ['Docker']
    ),
    false
  );
  assert.equal(
    isSuggestionFactuallySafe(
      'Worked on frontend features using React',
      'Engineered React frontend features with Docker deployment',
      ['Docker']
    ),
    false
  );
  assert.equal(
    isSuggestionFactuallySafe(
      'Worked on frontend features using React',
      'Engineered and maintained frontend features using React',
      ['Docker']
    ),
    true
  );

  // Accept all suggestions, rerun analysis, verify non-destructive behavior & comparison
  const accepted: typeof suggestions = suggestions.map((s) => ({ ...s, status: 'accepted' as const }));
  const updatedDraft = applyAcceptedSuggestionsToDraft(origDraft, accepted);
  assert.notEqual(origDraft.experience[0].highlights[0], updatedDraft.experience[0].highlights[0]);

  // Reject / restore restores exact original wording
  const rejectedAll = accepted.map((s) => ({ ...s, status: 'rejected' as const }));
  const restoredDraft = applyAcceptedSuggestionsToDraft(origDraft, rejectedAll);
  assert.equal(restoredDraft.experience[0].highlights[0], origDraft.experience[0].highlights[0]);

  // Rerun scoring + comparison snapshot
  const updatedAnalysis = scoreResumeAgainstJob(updatedDraft, parsedJob);
  const comparison = buildComparisonSnapshot(initialAnalysis, updatedAnalysis, accepted);
  assert.equal(comparison.appliedSuggestionCount, accepted.length);
  assert.equal(comparison.originalScore, initialAnalysis.overallScore);
  assert.equal(comparison.updatedScore, updatedAnalysis.overallScore);

  // Convert working draft back into editable Resume preserving Academic CV template when provided
  const baseAcademic: Resume = {
    ...SAMPLE_ACADEMIC_CV,
    id: 'orig_academic',
    userId: 'u1',
    template: 'academic-cv',
    createdAt: '2025-01-01T00:00:00.000Z',
    updatedAt: '2025-01-01T00:00:00.000Z',
  };
  const editedExisting = applyAtsDraftToResume(baseAcademic, updatedDraft, 'u1', 'Full Stack Developer');
  assert.equal(editedExisting.template, 'academic-cv');
  assert.equal(editedExisting.id, 'orig_academic');
  assert.equal(editedExisting.objective, updatedDraft.summary);
});
