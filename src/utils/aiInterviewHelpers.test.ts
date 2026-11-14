import test from 'node:test';
import assert from 'node:assert/strict';
import {
  accumulateStagedUpdates,
  buildAdaptiveCreativeFallback,
  buildAdaptiveEngineeringFallback,
  buildAdaptiveInternshipFallback,
  detectCreativeProfessionFromText,
  detectEngineeringBranchFromText,
  mergeResumeUpdates,
} from './aiInterviewHelpers.ts';
import {
  SAMPLE_CREATIVE_PROFESSIONAL_CV,
  SAMPLE_ENGINEERING_RESUME_CV,
  SAMPLE_INTERNSHIP_RESUME_CV,
} from '../data/sampleResumes.ts';
import type { CreativeProfession, EngineeringBranch, Resume } from '../types/resume';

const baseInternshipResume: Resume = {
  ...SAMPLE_INTERNSHIP_RESUME_CV,
  id: 'res-test-int',
  userId: 'user-test',
  createdAt: '2026-01-01',
  updatedAt: '2026-01-01',
};

const TEN_STEPS = [
  'personalInfo',
  'education',
  'learning',
  'interests',
  'research',
  'career-interests',
  'achievements',
  'skills',
  'experience',
  'custom-sections',
];

test('mergeResumeUpdates deduplicates repeated entries across staged updates and preserves existing fields', () => {
  const firstPatch: Partial<Resume> = {
    learningActivities: [
      {
        id: 'learn-1',
        title: 'DEV210.3X: Advanced C++',
        provider: 'Microsoft / edX',
      },
      {
        id: 'learn-new',
        title: 'Cloud Foundations Lab',
        provider: 'AWS Educate',
      },
    ],
    careerInterests: ['IoT', 'Cloud Computing', 'Distributed Systems'],
    skills: [
      {
        id: 'sk-new',
        category: 'Languages',
        skills: ['Rust', 'Go'],
        proficiency: null,
      },
    ],
  };

  const onceMerged = mergeResumeUpdates(baseInternshipResume, firstPatch, true);
  // Applying same patch again must NOT create duplicates
  const twiceMerged = mergeResumeUpdates(onceMerged, firstPatch, true);

  assert.equal(twiceMerged.learningActivities?.length, onceMerged.learningActivities?.length);
  assert.equal(twiceMerged.careerInterests?.length, onceMerged.careerInterests?.length);
  assert.equal(
    twiceMerged.skills.find((s) => s.category === 'Languages')?.proficiency ?? null,
    null
  );
  assert.equal(twiceMerged.personalInfo.fullName, baseInternshipResume.personalInfo.fullName);
});

test('accumulateStagedUpdates preserves prior staged entries when combining multiple interview turns', () => {
  const patch1: Partial<Resume> = {
    internshipTrack: 'cybersecurity',
    careerInterests: ['SOC Operations'],
  };
  const patch2: Partial<Resume> = {
    learningActivities: [
      { id: 'l-sec', title: 'SIEM Blue Team Lab', provider: 'Security Academy' },
    ],
  };

  const combined = accumulateStagedUpdates(patch1, patch2, baseInternshipResume, true);
  assert.equal(combined.internshipTrack, 'cybersecurity');
  assert.ok(combined.careerInterests?.includes('SOC Operations'));
  assert.ok(combined.learningActivities?.some((l) => l.title === 'SIEM Blue Team Lab'));
});

test('buildAdaptiveInternshipFallback tailors fallback prompts per track without cross-track leaks', () => {
  // Non-technical track must NOT get cybersecurity or lab research prompts
  const nonTech = buildAdaptiveInternshipFallback(
    'Skip to Projects',
    { ...baseInternshipResume, internshipTrack: 'non-technical' },
    'interests',
    TEN_STEPS
  );
  assert.equal(nonTech.nextSection, 'research');
  assert.match(nonTech.reply, /case study|market analysis|campus initiative/i);
  assert.doesNotMatch(nonTech.reply, /CTF|SIEM|Wireshark|VLSI/i);

  // Cybersecurity track must get security-relevant questions
  const cyber = buildAdaptiveInternshipFallback(
    'Cybersecurity track',
    baseInternshipResume,
    'personalInfo',
    TEN_STEPS
  );
  assert.equal(cyber.structuredUpdates.internshipTrack, 'cybersecurity');
  assert.match(cyber.reply, /Cybersecurity|Security Analyst|SOC/i);

  // ECE track must get hardware/ECE questions
  const ece = buildAdaptiveInternshipFallback(
    'Skip to Projects',
    { ...baseInternshipResume, internshipTrack: 'ece' },
    'interests',
    TEN_STEPS
  );
  assert.match(ece.reply, /hardware|IoT|PCB|VLSI/i);

  // Research track must get faculty/methodology questions
  const research = buildAdaptiveInternshipFallback(
    'Skip to Projects',
    { ...baseInternshipResume, internshipTrack: 'research' },
    'interests',
    TEN_STEPS
  );
  assert.match(research.reply, /faculty|methodology|lab/i);
});

const NINE_ENGINEERING_STEPS = [
  'personalInfo',
  'objective',
  'education',
  'skills',
  'projects',
  'experience',
  'leadership',
  'achievements',
  'custom-sections',
];

const baseEngineeringResume: Resume = {
  ...SAMPLE_ENGINEERING_RESUME_CV,
  id: 'res-test-eng',
  userId: 'user-test',
  createdAt: '2026-01-01',
  updatedAt: '2026-01-01',
};

test('detectEngineeringBranchFromText accurately classifies all 7 engineering branches', () => {
  assert.equal(detectEngineeringBranchFromText('Mechanical Engineering with SolidWorks and ANSYS'), 'mechanical');
  assert.equal(detectEngineeringBranchFromText('B.Tech CSE software engineering and React'), 'cse-it');
  assert.equal(detectEngineeringBranchFromText('ECE student focusing on VLSI, Verilog, and STM32 embedded'), 'ece');
  assert.equal(detectEngineeringBranchFromText('Electrical Engineering power systems and PLC SCADA'), 'ee');
  assert.equal(detectEngineeringBranchFromText('Civil Engineering structural analysis in STAAD Pro and ETABS'), 'civil');
  assert.equal(detectEngineeringBranchFromText('Chemical Engineering Aspen Plus distillation simulation'), 'chemical');
  assert.equal(detectEngineeringBranchFromText('Aerospace and biomedical instrumentation'), 'other');
  assert.equal(detectEngineeringBranchFromText('Just checking general layout'), null);
});

test('buildAdaptiveEngineeringFallback adapts questions to all 7 engineering branches and advances across 9 steps', () => {
  const branches: Array<{ branch: EngineeringBranch; pattern: RegExp }> = [
    { branch: 'mechanical', pattern: /SolidWorks|CAD|ANSYS|Design Engineer/i },
    { branch: 'cse-it', pattern: /programming languages|frameworks|C\+\+|React|CSE|software/i },
    { branch: 'ece', pattern: /ECE|Verilog|VLSI|Embedded/i },
    { branch: 'ee', pattern: /Electrical|Power Systems|PLC|MATLAB/i },
    { branch: 'civil', pattern: /Civil|STAAD|ETABS|Structural/i },
    { branch: 'chemical', pattern: /Chemical|Aspen|distillation|Process/i },
    { branch: 'other', pattern: /Engineering|objective|project/i },
  ];

  for (const { branch, pattern } of branches) {
    const res = buildAdaptiveEngineeringFallback(
      'Skip to Skills',
      { ...baseEngineeringResume, engineeringBranch: branch },
      'education',
      NINE_ENGINEERING_STEPS
    );
    assert.equal(res.nextSection, 'skills');
    assert.equal(res.isSectionCompleted, true);
    assert.match(res.reply, pattern);
  }

  // Branch keyword in user message auto-updates engineeringBranch
  const switchCse = buildAdaptiveEngineeringFallback(
    'I am in Computer Science Engineering focusing on backend APIs',
    baseEngineeringResume,
    'personalInfo',
    NINE_ENGINEERING_STEPS
  );
  assert.equal(switchCse.structuredUpdates.engineeringBranch, 'cse-it');
});

test('mergeResumeUpdates preserves engineeringBranch, highSchool, and learningActivities cleanly', () => {
  const updated = mergeResumeUpdates(
    baseEngineeringResume,
    {
      engineeringBranch: 'ece',
      highSchool: [
        {
          id: 'hs-eng-1',
          qualification: 'Class XII (MPC)',
          schoolName: 'Narayana Junior College',
          graduationDate: '2021',
          gpa: '96.2%',
        },
      ],
      learningActivities: [
        {
          id: 'learn-eng-1',
          title: 'FPGA RTL Verification Workshop',
          activityType: 'Workshop',
          provider: 'NIT Warangal',
        },
      ],
    },
    true
  );
  assert.equal(updated.engineeringBranch, 'ece');
  assert.ok(updated.highSchool?.some((h) => h.schoolName === 'Narayana Junior College'));
  assert.ok(updated.learningActivities?.some((l) => l.title === 'FPGA RTL Verification Workshop'));
});

const ELEVEN_CREATIVE_STEPS = [
  'personalInfo',
  'experience',
  'education',
  'skills',
  'proficiency-circles',
  'skill-bars',
  'communication',
  'certifications',
  'languages',
  'publications',
  'custom-sections',
];

const baseCreativeResume: Resume = {
  ...SAMPLE_CREATIVE_PROFESSIONAL_CV,
  id: 'res-test-creative',
  userId: 'user-test',
  createdAt: '2026-01-01',
  updatedAt: '2026-01-01',
};

test('detectCreativeProfessionFromText classifies developer, designer, cybersecurity, marketing, researcher, engineer, and other', () => {
  assert.equal(detectCreativeProfessionFromText('Full-stack React TypeScript backend developer'), 'developer');
  assert.equal(detectCreativeProfessionFromText('Product UX/UI designer working in Figma'), 'designer');
  assert.equal(detectCreativeProfessionFromText('Cybersecurity pentester and SOC SIEM analyst'), 'cybersecurity');
  assert.equal(detectCreativeProfessionFromText('Growth marketing SEO analytics and CRM strategist'), 'marketing');
  assert.equal(detectCreativeProfessionFromText('PhD research scientist with peer-reviewed publications'), 'researcher');
  assert.equal(detectCreativeProfessionFromText('Mechanical robotics engineer using SolidWorks and CAD'), 'engineer');
  assert.equal(detectCreativeProfessionFromText('General greeting hello'), null);
});

test('buildAdaptiveCreativeFallback tailors profession guidance, handles skips, and jumps across steps cleanly', () => {
  const professions: CreativeProfession[] = [
    'developer',
    'designer',
    'cybersecurity',
    'marketing',
    'researcher',
    'engineer',
    'other',
  ];

  for (const profession of professions) {
    const res = buildAdaptiveCreativeFallback(
      'Next section',
      { ...baseCreativeResume, creativeProfession: profession },
      'skills',
      ELEVEN_CREATIVE_STEPS
    );
    assert.equal(res.nextSection, 'proficiency-circles');
    assert.equal(res.isSectionCompleted, true);
    assert.ok(res.reply.length > 20);
  }

  const jumpToBars = buildAdaptiveCreativeFallback(
    'Skip to skill bar section',
    baseCreativeResume,
    'personalInfo',
    ELEVEN_CREATIVE_STEPS
  );
  assert.equal(jumpToBars.nextSection, 'skill-bars');

  const switchToDesigner = buildAdaptiveCreativeFallback(
    'I am a UX/UI Product Designer using Figma',
    baseCreativeResume,
    'personalInfo',
    ELEVEN_CREATIVE_STEPS
  );
  assert.equal(switchToDesigner.structuredUpdates.creativeProfession, 'designer');
});

test('mergeResumeUpdates clamps Creative percentages [0, 100] and deduplicates creativeSkillItems & communicationSkills', () => {
  const patch: Partial<Resume> = {
    creativeProfession: 'cybersecurity',
    proficiencyHeadingOverride: 'SECURITY TOOLS',
    circularProficiencies: [
      { id: 'c1', name: 'Burp Suite', shortLabel: 'BURP', percentage: 145 },
      { id: 'c2', name: 'Nmap', shortLabel: '', percentage: -10 },
    ],
    creativeSkillBars: [
      { id: 'b1', name: 'Threat Modeling', percentage: 120 },
      { id: 'b2', name: 'Packet Analysis', percentage: 78 },
    ],
    creativeSkillItems: [
      { id: 's1', category: 'Security', name: 'OWASP Top 10', description: 'AppSec reviews' },
    ],
    communicationSkills: [
      { id: 'cm1', skill: 'Executive Briefings', proficiency: 'Advanced', context: 'Board reporting' },
    ],
  };

  const mergedOnce = mergeResumeUpdates(baseCreativeResume, patch, true);
  const mergedTwice = mergeResumeUpdates(mergedOnce, patch, true);

  assert.equal(mergedTwice.creativeProfession, 'cybersecurity');
  assert.equal(mergedTwice.proficiencyHeadingOverride, 'SECURITY TOOLS');
  assert.equal(mergedTwice.circularProficiencies?.find((c) => c.name === 'Burp Suite')?.percentage, 100);
  assert.equal(mergedTwice.circularProficiencies?.find((c) => c.name === 'Nmap')?.percentage, 0);
  assert.equal(mergedTwice.creativeSkillBars?.find((b) => b.name === 'Threat Modeling')?.percentage, 100);
  assert.equal(mergedTwice.creativeSkillItems?.length, mergedOnce.creativeSkillItems?.length);
  assert.equal(mergedTwice.communicationSkills?.length, mergedOnce.communicationSkills?.length);
});

