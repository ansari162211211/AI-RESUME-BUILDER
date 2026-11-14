import test from 'node:test';
import assert from 'node:assert/strict';
import {
  ELEGANT_SERIF_LEFT_ORDER,
  ELEGANT_SERIF_ORDER,
  ELEGANT_SERIF_RIGHT_ORDER,
  FRESHER_RESUME_ORDER,
  INTERNSHIP_LEFT_ORDER,
  INTERNSHIP_RESUME_ORDER,
  INTERNSHIP_RIGHT_ORDER,
  MODERN_CORPORATE_ORDER,
  TEMPLATE_CATEGORIES,
  TEMPLATE_DEFINITIONS,
  getTemplateById,
  getTypographyScale,
  resolveTemplateCustomization,
  resolveTemplateId,
} from './templates';
import {
  SAMPLE_ACADEMIC_CV,
  SAMPLE_CLASSIC_PROFESSIONAL_CV,
  SAMPLE_ELEGANT_SERIF_CV,
  SAMPLE_FRESHER_RESUME_CV,
  SAMPLE_HARVARD_CV,
  SAMPLE_INTERNSHIP_RESUME_CV,
  SAMPLE_JAKES_CV,
  SAMPLE_MODERN_CORPORATE_CV,
  SAMPLE_SOFTWARE_DEVELOPER_CV,
  SAMPLE_TWO_COLUMN_CV,
} from './sampleResumes';
import {
  SKILL_MATRIX_LEGEND,
  buildClassicPhoneList,
  buildElegantSerifContactItems,
  buildElegantSerifMetadataRows,
  buildFresherHeaderColumns,
  buildHarvardContactItems,
  buildInternshipContactItems,
  buildJakesAddressString,
  buildModernCorporateContactItems,
  buildSoftwareDevContactItems,
  buildTwoColumnContactItems,
  chunkRows,
  getCourseworkItems,
  getEffectiveInterests,
  getHarvardAdditionalSubsections,
  getHarvardSkillsAndInterests,
  getInternshipCareerInterests,
  getInternshipEducationEntries,
  getInternshipLearningItems,
  getInternshipResearchAndProjectEntries,
  getInternshipSkillRows,
  getOrderedVisibleSections,
  getSectionDisplayTitle,
  getSkillMatrixLevelLabel,
  getSoftwareDevAdditionalSubsections,
  getSoftwareDevSkillBucketItems,
  groupAwardsByYearForFresher,
  groupExperienceByCategory,
  groupPublicationsForTwoColumn,
  isSectionVisibleAndPopulated,
  matchSoftwareDevSkillBucket,
} from '../utils/resumePresentation';
import type { Resume } from '../types/resume';

test("keeps Templates 1 through 10 active in TEMPLATE_DEFINITIONS", () => {
  assert.equal(TEMPLATE_DEFINITIONS.length, 10);
  assert.equal(TEMPLATE_DEFINITIONS[0].id, 'academic-cv');
  assert.equal(TEMPLATE_DEFINITIONS[0].name, 'Academic CV');
  assert.equal(TEMPLATE_DEFINITIONS[1].id, 'classic-professional');
  assert.equal(TEMPLATE_DEFINITIONS[1].name, 'Classic Professional');
  assert.equal(TEMPLATE_DEFINITIONS[2].id, 'jakes-resume');
  assert.equal(TEMPLATE_DEFINITIONS[2].name, "Jake's Resume");
  assert.equal(TEMPLATE_DEFINITIONS[3].id, 'two-column-professional');
  assert.equal(TEMPLATE_DEFINITIONS[3].name, 'Two Column Professional');
  assert.equal(TEMPLATE_DEFINITIONS[4].id, 'software-developer');
  assert.equal(TEMPLATE_DEFINITIONS[4].name, 'Software Developer');
  assert.equal(TEMPLATE_DEFINITIONS[5].id, 'harvard-style');
  assert.equal(TEMPLATE_DEFINITIONS[5].name, 'Harvard Style');
  assert.equal(TEMPLATE_DEFINITIONS[6].id, 'elegant-serif');
  assert.equal(TEMPLATE_DEFINITIONS[6].name, 'Elegant Serif');
  assert.equal(TEMPLATE_DEFINITIONS[7].id, 'modern-corporate');
  assert.equal(TEMPLATE_DEFINITIONS[7].name, 'Modern Corporate');
  assert.equal(TEMPLATE_DEFINITIONS[8].id, 'fresher-resume');
  assert.equal(TEMPLATE_DEFINITIONS[8].name, 'Fresher Resume');
  assert.equal(TEMPLATE_DEFINITIONS[9].id, 'internship-resume');
  assert.equal(TEMPLATE_DEFINITIONS[9].name, 'Internship Resume');

  const removedIds = [
    'modern-minimalist',
    'engineering-resume',
    'creative-professional',
    'executive-resume',
    'research-scholar',
    'simple-one-page',
  ];
  for (const id of removedIds) {
    assert.equal(
      TEMPLATE_DEFINITIONS.some((t) => t.id === id),
      false,
      `Template ${id} should be removed from TEMPLATE_DEFINITIONS`
    );
  }
});

test('preserves reusable TEMPLATE_CATEGORIES for future templates and Academic CV categories', () => {
  const expected = [
    'All Templates',
    'Academic CV',
    'Professional',
    'ATS-Friendly',
    'Student & Fresher',
    'Technical & Developer',
    'Research',
    'Creative',
  ];
  for (const cat of expected) {
    assert.ok(TEMPLATE_CATEGORIES.includes(cat as never), `Missing category ${cat}`);
  }
  for (const tpl of TEMPLATE_DEFINITIONS) {
    assert.ok(tpl.categories.length >= 1, `Template ${tpl.id} has no category`);
  }
});

test('resolves legacy, unknown, and valid template identifiers cleanly', () => {
  assert.equal(resolveTemplateId(undefined), 'academic-cv');
  assert.equal(resolveTemplateId('academic'), 'academic-cv');
  assert.equal(resolveTemplateId('academic-cv'), 'academic-cv');
  assert.equal(resolveTemplateId('classic-professional'), 'classic-professional');
  assert.equal(resolveTemplateId('jakes-resume'), 'jakes-resume');
  assert.equal(resolveTemplateId('two-column-professional'), 'two-column-professional');
  assert.equal(resolveTemplateId('software-developer'), 'software-developer');
  assert.equal(resolveTemplateId('harvard-style'), 'harvard-style');
  assert.equal(resolveTemplateId('elegant-serif'), 'elegant-serif');
  assert.equal(resolveTemplateId('modern-corporate'), 'modern-corporate');
  assert.equal(resolveTemplateId('fresher-resume'), 'fresher-resume');
  assert.equal(resolveTemplateId('internship-resume'), 'internship-resume');
  assert.equal(resolveTemplateId('unknown-id'), 'academic-cv');
  assert.equal(getTemplateById('harvard-style').id, 'harvard-style');
  assert.equal(getTemplateById('harvard-style').name, 'Harvard Style');
  assert.equal(getTemplateById('elegant-serif').id, 'elegant-serif');
  assert.equal(getTemplateById('elegant-serif').name, 'Elegant Serif');
  assert.equal(getTemplateById('modern-corporate').id, 'modern-corporate');
  assert.equal(getTemplateById('modern-corporate').name, 'Modern Corporate');
  assert.equal(getTemplateById('fresher-resume').id, 'fresher-resume');
  assert.equal(getTemplateById('fresher-resume').name, 'Fresher Resume');
  assert.equal(getTemplateById('internship-resume').id, 'internship-resume');
  assert.equal(getTemplateById('internship-resume').name, 'Internship Resume');
  assert.equal(getTemplateById('academic-cv').name, 'Academic CV');
  assert.equal(getTemplateById('classic-professional').name, 'Classic Professional');
  assert.equal(getTemplateById('jakes-resume').name, "Jake's Resume");
  assert.equal(getTemplateById('two-column-professional').name, 'Two Column Professional');
  assert.equal(getTemplateById('software-developer').name, 'Software Developer');
});

test('merges template defaults and user customization overrides cleanly', () => {
  const merged = resolveTemplateCustomization({
    template: 'academic-cv',
    customization: {
      fontFamily: 'sans',
      fontSize: 'large',
      textColor: '#000000',
      accentColor: '#0f766e',
      sectionSpacing: 'relaxed',
      pageMargins: 'wide',
      headingStyle: 'italic-serif',
    },
  });
  assert.equal(merged.fontFamily, 'sans');
  assert.equal(merged.fontSize, 'large');
  assert.equal(merged.accentColor, '#0f766e');
  assert.equal(merged.pageMargins, 'wide');
  assert.equal(merged.headingStyle, 'italic-serif');

  const scale = getTypographyScale(merged);
  assert.equal(scale.marginTopPt, 62);
  assert.ok(scale.baseFontPt > 9.5);
});

test('switching templates preserves all resume content and respects hidden & empty sections', () => {
  const baseResume: Resume = {
    ...SAMPLE_ACADEMIC_CV,
    id: 'res_1',
    userId: 'user_1',
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
    hiddenSections: ['volunteer'],
    memberships: [],
  };

  for (const tpl of TEMPLATE_DEFINITIONS) {
    const switched: Resume = {
      ...baseResume,
      template: tpl.id,
      customization: { ...tpl.defaultCustomization },
    };

    assert.equal(switched.personalInfo.fullName, baseResume.personalInfo.fullName);
    assert.equal(switched.experience.length, baseResume.experience.length);
    assert.equal(switched.education.length, baseResume.education.length);
    assert.equal(switched.publications?.length, baseResume.publications?.length);
    assert.equal(switched.projects.length, baseResume.projects.length);
    assert.equal(switched.skills.length, baseResume.skills.length);

    const visible = getOrderedVisibleSections(switched, tpl);
    assert.equal(
      isSectionVisibleAndPopulated(switched, 'volunteer', tpl.id),
      false,
      `Hidden section volunteer should not appear in ${tpl.id}`
    );
    assert.equal(
      isSectionVisibleAndPopulated(switched, 'memberships', tpl.id),
      false,
      `Empty section memberships should not appear in ${tpl.id}`
    );
    assert.ok(!visible.includes('volunteer'));
    assert.ok(!visible.includes('memberships'));
    assert.ok(visible.includes('experience'));
    assert.ok(visible.includes('education'));
  }
});

test('Academic CV preserves exact original typography, section order, margins, spacing, and citation style', () => {
  const academic = getTemplateById('academic-cv');
  assert.equal(academic.layout, 'single-column');
  assert.equal(academic.headerVariant, 'centered-academic');
  assert.equal(academic.bulletSymbol, '•');
  assert.equal(academic.citationStyle, 'numbered');
  assert.equal(academic.skillsLayout, 'rows');
  assert.deepEqual(academic.sectionOrder, [
    'objective',
    'education',
    'experience',
    'publications',
    'projects',
    'skills',
    'achievements',
    'leadership',
    'volunteer',
    'memberships',
    'certifications',
    'additional',
    'references',
  ]);

  const legacyCustom = resolveTemplateCustomization({
    template: 'academic',
    fontFamily: 'serif',
  });
  assert.equal(legacyCustom.fontFamily, 'serif');
  assert.equal(legacyCustom.textColor, '#000000');
  assert.equal(legacyCustom.accentColor, '#000000');
  assert.equal(legacyCustom.headingStyle, 'uppercase-rule');

  const scale = getTypographyScale(legacyCustom);
  assert.equal(scale.baseFontPt, 9.5);
  assert.equal(scale.namePt, 20);
  assert.equal(scale.jobTitlePt, 10);
  assert.equal(scale.headingPt, 10);
  assert.equal(scale.entryTitlePt, 9.5);
  assert.equal(scale.entrySubtitlePt, 9);
  assert.equal(scale.bodyPt, 8.75);
  assert.equal(scale.metaPt, 8.5);
  assert.equal(scale.marginTopPt, 52);
  assert.equal(scale.marginBottomPt, 52);
  assert.equal(scale.marginHorizPt, 54);
  assert.equal(scale.sectionGapPt, 9);
  assert.equal(scale.entryGapPt, 7);
  assert.equal(scale.lineHeight, 1.35);
});

test("Jake's Resume preserves reference structure, typography, 4-col coursework, and hides empty optional sections", () => {
  const jakes = getTemplateById('jakes-resume');
  assert.equal(jakes.layout, 'single-column');
  assert.equal(jakes.headerVariant, 'jakes-centered');
  assert.equal(jakes.defaultCustomization.textColor, '#000000');
  assert.equal(jakes.defaultCustomization.accentColor, '#000000');
  assert.equal(jakes.defaultCustomization.headingStyle, 'title-rule');
  assert.deepEqual(jakes.sectionOrder, [
    'education',
    'coursework',
    'experience',
    'projects',
    'skills',
    'leadership',
  ]);

  assert.equal(getSectionDisplayTitle('education', 'jakes-resume'), 'Education');
  assert.equal(getSectionDisplayTitle('coursework', 'jakes-resume'), 'Relevant Coursework');
  assert.equal(getSectionDisplayTitle('experience', 'jakes-resume'), 'Experience');
  assert.equal(getSectionDisplayTitle('projects', 'jakes-resume'), 'Projects');
  assert.equal(getSectionDisplayTitle('skills', 'jakes-resume'), 'Technical Skills');
  assert.equal(getSectionDisplayTitle('leadership', 'jakes-resume'), 'Leadership / Extracurricular');

  const jakesScale = getTypographyScale(jakes.defaultCustomization, 'jakes-resume');
  assert.equal(jakesScale.marginTopPt, 26);
  assert.equal(jakesScale.marginHorizPt, 32);
  assert.equal(jakesScale.namePt, 22);

  // Sample Jake's Resume has address and 8 coursework items (2 rows of 4)
  const fullSample: Resume = {
    ...SAMPLE_JAKES_CV,
    id: 'jakes_1',
    userId: 'u_1',
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
  };
  assert.equal(
    buildJakesAddressString(fullSample.personalInfo),
    '123 Street Name, Town, State 12345'
  );
  const coursework = getCourseworkItems(fullSample);
  assert.equal(coursework.length, 8);
  assert.equal(chunkRows(coursework, 4).length, 2);
  assert.deepEqual(getOrderedVisibleSections(fullSample, jakes), [
    'education',
    'coursework',
    'experience',
    'projects',
    'skills',
    'leadership',
  ]);

  // Student with Education + Projects only (empty coursework/experience/leadership are hidden)
  const studentJakes: Resume = {
    ...fullSample,
    coursework: [],
    experience: [],
    leadership: [],
  };
  assert.deepEqual(getOrderedVisibleSections(studentJakes, jakes), [
    'education',
    'projects',
    'skills',
  ]);

  // Fresher with Skills + Coursework + Education (no experience/leadership)
  const fresherJakes: Resume = {
    ...fullSample,
    experience: [],
    projects: [],
    leadership: [],
  };
  assert.deepEqual(getOrderedVisibleSections(fresherJakes, jakes), [
    'education',
    'coursework',
    'skills',
  ]);
});

test('Classic Professional configures classic blue styling, structured sections, and presentation helpers cleanly', () => {
  const classic = getTemplateById('classic-professional');
  assert.equal(classic.headerVariant, 'classic-header');
  assert.equal(classic.defaultCustomization.accentColor, '#1e4e8c');
  assert.equal(classic.defaultCustomization.headingStyle, 'classic-blue-rule');
  assert.equal(classic.defaultCustomization.fontFamily, 'sans');

  assert.equal(getSectionDisplayTitle('objective', 'classic-professional'), 'PROFESSIONAL SUMMARY');
  assert.equal(getSectionDisplayTitle('thesis', 'classic-professional'), "MASTER'S THESIS");
  assert.equal(getSectionDisplayTitle('skills', 'classic-professional'), 'COMPUTER SKILLS');
  assert.equal(getSectionDisplayTitle('skill-matrix', 'classic-professional'), 'SKILL MATRIX');

  assert.equal(SKILL_MATRIX_LEGEND.length, 5);
  assert.equal(getSkillMatrixLevelLabel(null), 'Unrated');
  assert.equal(getSkillMatrixLevelLabel(5), 'Expert');

  const fullClassic: Resume = {
    ...SAMPLE_CLASSIC_PROFESSIONAL_CV,
    id: 'cls_1',
    userId: 'u_1',
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
  };

  const phones = buildClassicPhoneList(fullClassic.personalInfo);
  assert.ok(phones.length >= 2);
  const expGroups = groupExperienceByCategory(fullClassic.experience);
  assert.ok(expGroups.some((g) => g.categoryLabel === 'Professional Experience'));
  assert.ok(expGroups.some((g) => g.categoryLabel === 'Vocational Experience'));
  assert.ok(getEffectiveInterests(fullClassic).items.length > 0);

  const visible = getOrderedVisibleSections(fullClassic, classic);
  assert.ok(visible.includes('thesis'));
  assert.ok(visible.includes('languages'));
  assert.ok(visible.includes('skill-matrix'));
  assert.ok(visible.includes('interests'));
  assert.ok(visible.includes('custom-sections'));
  assert.ok(visible.includes('references'));

  // References on-request and hidden modes
  const onRequestCv: Resume = {
    ...fullClassic,
    references: [],
    referencesDisplayMode: 'on-request',
  };
  assert.equal(isSectionVisibleAndPopulated(onRequestCv, 'references'), true);

  const hiddenRefCv: Resume = {
    ...fullClassic,
    referencesDisplayMode: 'hidden',
  };
  assert.equal(isSectionVisibleAndPopulated(hiddenRefCv, 'references'), false);
});

test('Two Column Professional supports layout, contacts, grouped publications, and Student/Experienced/Researcher/Fresher personas', () => {
  const twoCol = getTemplateById('two-column-professional');
  assert.equal(twoCol.layout, 'main-left-sidebar-right');
  assert.equal(twoCol.headerVariant, 'two-column-header');
  assert.equal(twoCol.defaultCustomization.accentColor, '#8f131b');
  assert.equal(twoCol.defaultCustomization.headingStyle, 'burgundy-gold-rule');
  assert.equal(twoCol.defaultCustomization.fontFamily, 'sans');

  assert.equal(getSectionDisplayTitle('daily-life', 'two-column-professional'), 'A DAY OF MY LIFE');
  assert.equal(getSectionDisplayTitle('philosophy', 'two-column-professional'), 'MY LIFE PHILOSOPHY');
  assert.equal(getSectionDisplayTitle('achievements', 'two-column-professional'), 'MOST PROUD OF');
  assert.equal(getSectionDisplayTitle('strengths', 'two-column-professional'), 'STRENGTHS');
  assert.equal(getSectionDisplayTitle('references', 'two-column-professional'), 'REFEREES');

  const fullTwoCol: Resume = {
    ...SAMPLE_TWO_COLUMN_CV,
    id: 'tc_1',
    userId: 'u_1',
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
  };

  const contacts = buildTwoColumnContactItems(fullTwoCol.personalInfo);
  assert.ok(contacts.some((c) => c.kind === 'email'));
  assert.ok(contacts.some((c) => c.kind === 'twitter'));
  assert.ok(contacts.some((c) => c.kind === 'orcid'));
  assert.ok(contacts.some((c) => c.kind === 'gitlab'));

  const pubGroups = groupPublicationsForTwoColumn(fullTwoCol.publications);
  assert.deepEqual(
    pubGroups.map((g) => g.label),
    ['Books', 'Journal Articles', 'Conference Proceedings']
  );

  const visibleFull = getOrderedVisibleSections(fullTwoCol, twoCol);
  assert.ok(visibleFull.includes('experience'));
  assert.ok(visibleFull.includes('daily-life'));
  assert.ok(visibleFull.includes('philosophy'));
  assert.ok(visibleFull.includes('strengths'));
  assert.ok(visibleFull.includes('achievements'));
  assert.ok(visibleFull.includes('publications'));
  assert.ok(visibleFull.includes('languages'));
  assert.ok(visibleFull.includes('education'));
  assert.ok(visibleFull.includes('references'));

  // 1. Student persona: Education, Projects, Strengths, Languages; empty optional sections hidden
  const studentResume: Resume = {
    ...fullTwoCol,
    experience: [],
    publications: [],
    dailyActivities: [],
    personalQuote: '',
    achievements: [],
    references: [],
    referencesDisplayMode: 'hidden',
  };
  assert.deepEqual(getOrderedVisibleSections(studentResume, twoCol), [
    'projects',
    'strengths',
    'languages',
    'education',
  ]);

  // 2. Experienced Professional persona: Experience, Projects, Strengths, Philosophy, Daily Life, Referees
  const experiencedResume: Resume = {
    ...fullTwoCol,
    publications: [],
    achievements: [],
  };
  const expVisible = getOrderedVisibleSections(experiencedResume, twoCol);
  assert.ok(expVisible.includes('experience'));
  assert.ok(expVisible.includes('projects'));
  assert.ok(expVisible.includes('daily-life'));
  assert.ok(expVisible.includes('philosophy'));
  assert.ok(expVisible.includes('strengths'));
  assert.ok(expVisible.includes('references'));
  assert.equal(expVisible.includes('publications'), false);

  // 3. Researcher persona: Publications, Daily Life, Achievements, Referees
  const researcherResume: Resume = {
    ...fullTwoCol,
    publications: [
      ...(fullTwoCol.publications || []),
      {
        id: 'pub-res-extra',
        type: 'research_paper',
        title: 'Deterministic Compilers for Edge AI',
        authors: 'E. R. Vance',
        year: '2024',
      },
    ],
  };
  assert.ok(
    groupPublicationsForTwoColumn(researcherResume.publications).some(
      (g) => g.label === 'Research Papers'
    )
  );

  // 4. Fresher persona: Education, Projects, Strengths, Languages; no Experience/Publications/Referees/Chart
  const fresherResume: Resume = {
    ...fullTwoCol,
    experience: [],
    publications: [],
    dailyActivities: [],
    showDailyActivityChart: false,
    personalQuote: '',
    achievements: [],
    references: [],
  };
  assert.deepEqual(getOrderedVisibleSections(fresherResume, twoCol), [
    'projects',
    'strengths',
    'languages',
    'education',
  ]);
});

test('Software Developer configures centered blue serif styling, clickable contacts, skill bucket normalization, and unified ADDITIONAL omission rules', () => {
  const swDev = getTemplateById('software-developer');
  assert.equal(swDev.layout, 'single-column');
  assert.equal(swDev.headerVariant, 'software-dev-centered');
  assert.equal(swDev.defaultCustomization.accentColor, '#1e4e8c');
  assert.equal(swDev.defaultCustomization.textColor, '#111827');
  assert.equal(swDev.defaultCustomization.fontFamily, 'serif');
  assert.equal(swDev.defaultCustomization.headingStyle, 'uppercase-rule');
  assert.deepEqual(swDev.sectionOrder, ['education', 'experience', 'projects', 'additional']);

  assert.equal(getSectionDisplayTitle('education', 'software-developer'), 'EDUCATION');
  assert.equal(getSectionDisplayTitle('experience', 'software-developer'), 'EXPERIENCE');
  assert.equal(getSectionDisplayTitle('projects', 'software-developer'), 'PROJECTS');
  assert.equal(getSectionDisplayTitle('additional', 'software-developer'), 'ADDITIONAL');

  const scale = getTypographyScale(swDev.defaultCustomization, 'software-developer');
  assert.equal(scale.namePt, 22);
  assert.equal(scale.marginHorizPt, 34);

  const fullSwDev: Resume = {
    ...SAMPLE_SOFTWARE_DEVELOPER_CV,
    id: 'sw_1',
    userId: 'u_1',
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
  };

  // Clickable header contact links
  const contacts = buildSoftwareDevContactItems(fullSwDev.personalInfo);
  assert.ok(contacts.some((c) => c.kind === 'phone' && c.url?.startsWith('tel:')));
  assert.ok(contacts.some((c) => c.kind === 'email' && c.url?.startsWith('mailto:')));
  assert.ok(contacts.some((c) => c.kind === 'github' && c.url?.startsWith('https://github.com/')));
  assert.ok(contacts.some((c) => c.kind === 'linkedin' && c.url?.includes('linkedin.com')));
  assert.ok(contacts.some((c) => c.kind === 'website' && c.url?.startsWith('https://')));

  // Skill bucket alias matching preserves data across templates without duplication
  assert.equal(matchSoftwareDevSkillBucket('Languages'), 'programming-languages');
  assert.equal(matchSoftwareDevSkillBucket('Programming Languages'), 'programming-languages');
  assert.equal(matchSoftwareDevSkillBucket('Tools'), 'developer-tools');
  assert.equal(matchSoftwareDevSkillBucket('Developer Tools'), 'developer-tools');
  assert.equal(matchSoftwareDevSkillBucket('Technologies/Frameworks'), 'technologies-frameworks');
  assert.equal(matchSoftwareDevSkillBucket('Technologies & Frameworks'), 'technologies-frameworks');

  const langs = getSoftwareDevSkillBucketItems(fullSwDev.skills, 'programming-languages');
  assert.ok(langs.includes('TypeScript'));
  assert.ok(langs.includes('Python'));

  const visibleFull = getOrderedVisibleSections(fullSwDev, swDev);
  assert.deepEqual(visibleFull, ['education', 'experience', 'projects', 'additional']);

  const subsFull = getSoftwareDevAdditionalSubsections(fullSwDev);
  assert.deepEqual(
    subsFull.map((s) => s.key),
    [
      'coursework',
      'leadership',
      'programming-languages',
      'developer-tools',
      'technologies-frameworks',
      'certifications',
      'achievements',
    ]
  );

  // Toggling individual subsections via hiddenSections removes only those subsections (including awards/achievements)
  const hiddenCertsAndAwards: Resume = {
    ...fullSwDev,
    hiddenSections: ['certifications', 'awards'],
  };
  const subsHidden = getSoftwareDevAdditionalSubsections(hiddenCertsAndAwards);
  assert.equal(subsHidden.some((s) => s.key === 'certifications'), false);
  assert.equal(subsHidden.some((s) => s.key === 'achievements'), false);
  assert.equal(subsHidden.some((s) => s.key === 'programming-languages'), true);

  // If ALL additional subsections are empty, ADDITIONAL heading disappears completely
  const noAdditional: Resume = {
    ...fullSwDev,
    coursework: [],
    leadership: [],
    skills: [],
    certifications: [],
    achievements: [],
    customSections: [],
  };
  assert.deepEqual(getSoftwareDevAdditionalSubsections(noAdditional), []);
  assert.equal(isSectionVisibleAndPopulated(noAdditional, 'additional', 'software-developer'), false);
  assert.deepEqual(getOrderedVisibleSections(noAdditional, swDev), [
    'education',
    'experience',
    'projects',
  ]);
});

test('Harvard Style configures traditional centered serif layout, contact links, reordering, unconfirmed language hiding, and Student/Fresher/Experienced personas', () => {
  const harvard = getTemplateById('harvard-style');
  assert.equal(harvard.layout, 'single-column');
  assert.equal(harvard.headerVariant, 'harvard-centered');
  assert.equal(harvard.centeredHeadings, true);
  assert.equal(harvard.defaultCustomization.textColor, '#000000');
  assert.equal(harvard.defaultCustomization.accentColor, '#000000');
  assert.equal(harvard.defaultCustomization.fontFamily, 'serif');
  assert.equal(harvard.defaultCustomization.headingStyle, 'title-rule');
  assert.deepEqual(harvard.sectionOrder, [
    'education',
    'experience',
    'leadership',
    'skills',
    'additional',
  ]);

  assert.equal(getSectionDisplayTitle('education', 'harvard-style'), 'Education');
  assert.equal(getSectionDisplayTitle('experience', 'harvard-style'), 'Experience');
  assert.equal(getSectionDisplayTitle('leadership', 'harvard-style'), 'Leadership & Activities');
  assert.equal(getSectionDisplayTitle('skills', 'harvard-style'), 'Skills & Interests');
  assert.equal(getSectionDisplayTitle('additional', 'harvard-style'), 'Additional Information');

  const scale = getTypographyScale(harvard.defaultCustomization, 'harvard-style');
  assert.equal(scale.namePt, 18);
  assert.equal(scale.marginHorizPt, 42);

  const fullHarvard: Resume = {
    ...SAMPLE_HARVARD_CV,
    id: 'harv_1',
    userId: 'u_1',
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
  };

  // Contact line includes street/city/state/zip/country, email, phone, linkedin, github
  const contacts = buildHarvardContactItems(fullHarvard.personalInfo);
  assert.ok(contacts.some((c) => c.label.includes('45 Dunster Street') && c.url === null));
  assert.ok(contacts.some((c) => c.url?.startsWith('mailto:')));
  assert.ok(contacts.some((c) => c.url?.startsWith('tel:')));
  assert.ok(contacts.some((c) => c.label.includes('linkedin.com/in/clairemontgomery')));
  assert.ok(contacts.some((c) => c.label.includes('github.com/cmontgomery-econ')));

  assert.deepEqual(getOrderedVisibleSections(fullHarvard, harvard), [
    'education',
    'experience',
    'leadership',
    'skills',
    'additional',
  ]);

  // Leadership-first toggle puts Leadership & Activities above Experience cleanly
  const leadFirst: Resume = { ...fullHarvard, harvardLeadershipFirst: true };
  assert.deepEqual(getOrderedVisibleSections(leadFirst, harvard), [
    'education',
    'leadership',
    'experience',
    'skills',
    'additional',
  ]);

  // Test 1: College Student (University + Study Abroad + Internship + Leadership + Skills, empty highSchool & additional hidden)
  const studentHarvard: Resume = {
    ...fullHarvard,
    targetBackground: 'student',
    highSchool: [],
    achievements: [],
    projects: [],
    certifications: [],
    publications: [],
    volunteer: [],
    memberships: [],
    customSections: [],
  };
  assert.deepEqual(getOrderedVisibleSections(studentHarvard, harvard), [
    'education',
    'experience',
    'leadership',
    'skills',
  ]);
  assert.equal(isSectionVisibleAndPopulated(studentHarvard, 'additional', 'harvard-style'), false);

  // Test 2: Fresher (Degree + Projects + Certifications + Languages w/ one unconfirmed + Leadership + Interests, empty experience/studyAbroad/highSchool omitted)
  const fresherHarvard: Resume = {
    ...fullHarvard,
    targetBackground: 'fresher',
    studyAbroad: [],
    highSchool: [],
    experience: [],
    labSkills: [],
    achievements: [],
    projects: [
      {
        id: 'fp-1',
        title: 'Fiscal Multiplier Replication Study',
        technologies: ['R', 'Stata'],
        highlights: ['Replicated cross-country fiscal panel dataset in R and Stata.'],
      },
    ],
    certifications: [
      {
        id: 'fc-1',
        name: 'Bloomberg Market Concepts',
        issuer: 'Bloomberg',
        issueDate: '2025',
      },
    ],
    languages: [
      { id: 'fl-1', language: 'English', proficiency: 'Native' },
      { id: 'fl-2', language: 'Spanish', proficiency: '' }, // unconfirmed -> level hidden
    ],
  };
  assert.deepEqual(getOrderedVisibleSections(fresherHarvard, harvard), [
    'education',
    'leadership',
    'skills',
    'additional',
  ]);
  const fresherSkills = getHarvardSkillsAndInterests(fresherHarvard);
  const langRow = fresherSkills.rows.find((r) => r.key === 'languages');
  assert.ok(langRow);
  assert.equal(langRow.text, 'English (Native), Spanish');
  const fresherAdditional = getHarvardAdditionalSubsections(fresherHarvard);
  assert.deepEqual(
    fresherAdditional.map((b) => b.key),
    ['projects', 'certifications']
  );

  // Test 3: Experienced Professional (Experiences + Achievements + Degree + Leadership + Skills + Confirmed Languages, no studyAbroad/highSchool/labSkills)
  const experiencedHarvard: Resume = {
    ...fullHarvard,
    targetBackground: 'experienced',
    studyAbroad: [],
    highSchool: [],
    labSkills: [],
    languages: [
      { id: 'el-1', language: 'English', proficiency: 'Native' },
      { id: 'el-2', language: 'German', proficiency: 'Working' },
    ],
  };
  const expSkills = getHarvardSkillsAndInterests(experiencedHarvard);
  assert.equal(expSkills.rows.some((r) => r.key === 'lab-skills'), false);
  assert.equal(expSkills.rows.find((r) => r.key === 'languages')?.text, 'English (Native), German (Working)');
  assert.deepEqual(getOrderedVisibleSections(experiencedHarvard, harvard), [
    'education',
    'experience',
    'leadership',
    'skills',
    'additional',
  ]);
});

test('Elegant Serif (Template 7) configures editorial two-column monochrome serif layout, contacts, metadata, reordering, hiding, and all 4 personas', () => {
  const elegant = getTemplateById('elegant-serif');
  assert.equal(elegant.layout, 'two-column-editorial');
  assert.equal(elegant.headerVariant, 'editorial-double-rule');
  assert.equal(elegant.defaultCustomization.fontFamily, 'serif');
  assert.equal(elegant.defaultCustomization.textColor, '#111111');
  assert.equal(elegant.defaultCustomization.accentColor, '#1f2937');
  assert.deepEqual(elegant.sectionOrder, ELEGANT_SERIF_ORDER);
  assert.deepEqual(elegant.sidebarSections, ELEGANT_SERIF_RIGHT_ORDER);
  assert.ok(ELEGANT_SERIF_LEFT_ORDER.includes('research'));

  assert.equal(getSectionDisplayTitle('objective', 'elegant-serif'), 'Professional Profile');
  assert.equal(getSectionDisplayTitle('research', 'elegant-serif'), 'Research Experience');
  assert.equal(getSectionDisplayTitle('achievements', 'elegant-serif'), 'Awards & Honors');
  assert.equal(getSectionDisplayTitle('custom-sections', 'elegant-serif'), 'Additional Information');

  const fullElegant: Resume = {
    ...SAMPLE_ELEGANT_SERIF_CV,
    id: 'es_1',
    userId: 'u_1',
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
  };

  // No default profile photo
  assert.equal(Boolean(fullElegant.personalInfo.photoUrl?.trim()), false);

  const contacts = buildElegantSerifContactItems(fullElegant.personalInfo);
  assert.ok(contacts.some((c) => c.kind === 'phone' && c.url?.startsWith('tel:')));
  assert.ok(contacts.some((c) => c.kind === 'email' && c.url?.startsWith('mailto:')));
  assert.ok(contacts.some((c) => c.kind === 'address'));
  assert.ok(contacts.some((c) => c.kind === 'location'));
  assert.ok(contacts.some((c) => c.kind === 'orcid' && c.url?.includes('orcid.org')));

  // Metadata hides unconfirmed language levels without fabricating proficiencies
  const metaWithUnconfirmed = buildElegantSerifMetadataRows({
    ...fullElegant,
    languages: [
      { id: 'l1', language: 'German', proficiency: 'Native' },
      { id: 'l2', language: 'Italian', proficiency: '' },
      { id: 'l3', language: 'Spanish', proficiency: 'unconfirmed' },
    ],
  });
  const langMeta = metaWithUnconfirmed.find((m) => m.kind === 'languages');
  assert.ok(langMeta);
  assert.equal(langMeta.label, 'Languages: German (Native), Italian, Spanish');

  // Custom section reordering via sectionOrderOverride & hiding via hiddenSections without deleting data
  const reordered = getOrderedVisibleSections(
    {
      ...fullElegant,
      sectionOrderOverride: ['publications', 'research', 'education'],
      hiddenSections: ['memberships', 'interests'],
    },
    elegant
  );
  assert.equal(reordered[0], 'publications');
  assert.equal(reordered[1], 'research');
  assert.equal(reordered[2], 'education');
  assert.equal(reordered.includes('memberships'), false);
  assert.equal(reordered.includes('interests'), false);

  // Student persona: hides empty experience/publications/awards/certifications/memberships/references
  const studentResume: Resume = {
    ...fullElegant,
    targetBackground: 'student',
    experience: [],
    researchExperience: [],
    publications: [],
    achievements: [],
    certifications: [],
    memberships: [],
    referencesDisplayMode: 'hidden',
    references: [],
  };
  const studentVisible = getOrderedVisibleSections(studentResume, elegant);
  assert.ok(studentVisible.includes('education'));
  assert.ok(studentVisible.includes('projects'));
  assert.ok(studentVisible.includes('skills'));
  assert.equal(studentVisible.includes('experience'), false);
  assert.equal(studentVisible.includes('research'), false);
  assert.equal(studentVisible.includes('publications'), false);
});

test('Modern Corporate (Template 8) configures ModernCV classic banking layout, contacts, ordering, hiding, and personas cleanly', () => {
  const modernCorp = getTemplateById('modern-corporate');
  assert.equal(modernCorp.layout, 'moderncv-classic');
  assert.equal(modernCorp.headerVariant, 'modern-corporate-split');
  assert.equal(modernCorp.skillsLayout, 'grid-2col');
  assert.equal(modernCorp.defaultCustomization.fontFamily, 'sans');
  assert.equal(modernCorp.defaultCustomization.headingStyle, 'moderncv-bar');
  assert.equal(modernCorp.defaultCustomization.accentColor, '#3873b3');
  assert.deepEqual(modernCorp.sectionOrder, MODERN_CORPORATE_ORDER);

  assert.equal(getSectionDisplayTitle('objective', 'modern-corporate'), 'Professional Summary');
  assert.equal(getSectionDisplayTitle('experience', 'modern-corporate'), 'Work Experience');
  assert.equal(getSectionDisplayTitle('strengths', 'modern-corporate'), 'Core Competencies');
  assert.equal(getSectionDisplayTitle('skills', 'modern-corporate'), 'Technical Skills');
  assert.equal(getSectionDisplayTitle('achievements', 'modern-corporate'), 'Awards & Achievements');

  const fullCorp: Resume = {
    ...SAMPLE_MODERN_CORPORATE_CV,
    id: 'mc_1',
    userId: 'u_1',
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
  };

  // Optional photo omitted by default
  assert.equal(Boolean(fullCorp.personalInfo.photoUrl?.trim()), false);

  // Right-aligned contact items preserve phones, DOB, address, social links, and custom links
  const contacts = buildModernCorporateContactItems(fullCorp.personalInfo);
  assert.ok(contacts.some((c) => c.kind === 'mobile' && c.url?.startsWith('tel:')));
  assert.ok(contacts.some((c) => c.kind === 'email' && c.url?.startsWith('mailto:')));
  assert.ok(contacts.some((c) => c.kind === 'linkedin' && c.url?.includes('linkedin.com')));
  assert.ok(contacts.some((c) => c.kind === 'location'));

  const extraContacts = buildModernCorporateContactItems({
    ...fullCorp.personalInfo,
    dateOfBirth: '14 March 1994',
    secondaryPhone: '+44 20 7946 0999',
    customLinks: [{ id: 'cl1', label: 'SSRN Profile', url: 'https://ssrn.com/author=12345' }],
  });
  assert.ok(extraContacts.some((c) => c.kind === 'dob' && c.label === '14 March 1994'));
  assert.ok(extraContacts.some((c) => c.kind === 'phone' && c.url?.startsWith('tel:')));
  assert.ok(extraContacts.some((c) => c.kind === 'custom' && c.label === 'SSRN Profile'));

  // Reordering via sectionOrderOverride & hiding via hiddenSections preserves underlying data
  const reordered = getOrderedVisibleSections(
    {
      ...fullCorp,
      sectionOrderOverride: ['education', 'projects', 'experience'],
      hiddenSections: ['memberships', 'interests'],
    },
    modernCorp
  );
  assert.equal(reordered[0], 'education');
  assert.equal(reordered[1], 'projects');
  assert.equal(reordered[2], 'experience');
  assert.equal(reordered.includes('memberships'), false);
  assert.equal(reordered.includes('interests'), false);

  // Student / Fresher persona hides empty optional sections automatically
  const studentCorp: Resume = {
    ...fullCorp,
    targetBackground: 'student',
    experience: [],
    certifications: [],
    memberships: [],
    achievements: [],
    referencesDisplayMode: 'hidden',
    references: [],
  };
  const studentVisible = getOrderedVisibleSections(studentCorp, modernCorp);
  assert.ok(studentVisible.includes('education'));
  assert.ok(studentVisible.includes('projects'));
  assert.ok(studentVisible.includes('skills'));
  assert.equal(studentVisible.includes('experience'), false);
  assert.equal(studentVisible.includes('certifications'), false);
  assert.equal(studentVisible.includes('memberships'), false);
  assert.equal(studentVisible.includes('references'), false);

  // References on-request remains visible cleanly when references array is empty
  const onRequestCorp: Resume = {
    ...studentCorp,
    referencesDisplayMode: 'on-request',
    references: [],
  };
  assert.equal(isSectionVisibleAndPopulated(onRequestCorp, 'references', 'modern-corporate'), true);
});

test('Fresher Resume (Template 9) configures Overleaf 3-col header, steel-blue rules, year-rail awards, reordering, and Student/Fresher personas', () => {
  const fresherTpl = getTemplateById('fresher-resume');
  assert.equal(fresherTpl.layout, 'single-column');
  assert.equal(fresherTpl.headerVariant, 'fresher-overleaf');
  assert.equal(fresherTpl.defaultCustomization.fontFamily, 'sans');
  assert.equal(fresherTpl.defaultCustomization.accentColor, '#3b6998');
  assert.equal(fresherTpl.defaultCustomization.headingStyle, 'title-rule');
  assert.deepEqual(fresherTpl.sectionOrder, FRESHER_RESUME_ORDER);
  assert.ok(fresherTpl.categories.includes('Student & Fresher'));
  assert.ok(fresherTpl.categories.includes('ATS-Friendly'));

  assert.equal(getSectionDisplayTitle('education', 'fresher-resume'), 'EDUCATION');
  assert.equal(getSectionDisplayTitle('projects', 'fresher-resume'), 'PROJECTS');
  assert.equal(getSectionDisplayTitle('skills', 'fresher-resume'), 'SKILLS');
  assert.equal(getSectionDisplayTitle('achievements', 'fresher-resume'), 'AWARDS & HONORS');
  assert.equal(getSectionDisplayTitle('additional', 'fresher-resume'), 'ADDITIONAL INFORMATION');

  const fullFresher: Resume = {
    ...SAMPLE_FRESHER_RESUME_CV,
    id: 'fr_1',
    userId: 'u_1',
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
  };

  // No photo in Overleaf fresher header
  assert.equal(Boolean(fullFresher.personalInfo.photoUrl?.trim()), false);

  // 3-column header splits Phone/Email left and LinkedIn/GitHub/Portfolio right
  const cols = buildFresherHeaderColumns(fullFresher.personalInfo);
  assert.ok(cols.left.some((c) => c.kind === 'phone' && c.url?.startsWith('tel:')));
  assert.ok(cols.left.some((c) => c.kind === 'email' && c.url?.startsWith('mailto:')));
  assert.ok(cols.right.some((c) => c.kind === 'linkedin' && c.url?.includes('linkedin.com')));
  assert.ok(cols.right.some((c) => c.kind === 'github' && c.url?.includes('github.com')));

  // Awards year-rail groups awards cleanly by year descending
  const awardGroups = groupAwardsByYearForFresher(fullFresher.achievements);
  assert.ok(awardGroups.length >= 2);
  assert.ok(Number(awardGroups[0].year) >= Number(awardGroups[1].year));

  // Reordering via sectionOrderOverride & hiding via hiddenSections preserves data
  const reordered = getOrderedVisibleSections(
    {
      ...fullFresher,
      sectionOrderOverride: ['projects', 'skills', 'education'],
      hiddenSections: ['experience', 'volunteer'],
    },
    fresherTpl
  );
  assert.equal(reordered[0], 'projects');
  assert.equal(reordered[1], 'skills');
  assert.equal(reordered[2], 'education');
  assert.equal(reordered.includes('experience'), false);
  assert.equal(reordered.includes('volunteer'), false);

  // Empty Interests hides 'additional' even when languages exist (languages has its own section in Template 9)
  const noInterests: Resume = {
    ...fullFresher,
    languages: [{ id: 'fr-l1', language: 'English', proficiency: 'Native' }],
    interests: '',
    interestItems: [],
  };
  assert.equal(isSectionVisibleAndPopulated(noInterests, 'additional', 'fresher-resume'), false);
  assert.equal(isSectionVisibleAndPopulated(noInterests, 'languages', 'fresher-resume'), true);
});

test('Internship Resume (Template 10) enforces two-column layout, unconfirmed skill dot hiding, strict isolation, and optional hiding', () => {
  const internshipTpl = getTemplateById('internship-resume');
  assert.equal(internshipTpl.layout, 'two-column-internship');
  assert.equal(internshipTpl.headerVariant, 'internship-kunal');
  assert.equal(internshipTpl.defaultCustomization.headingStyle, 'internship-rule');
  assert.deepEqual(internshipTpl.sectionOrder, INTERNSHIP_RESUME_ORDER);
  assert.deepEqual(internshipTpl.sidebarSections, INTERNSHIP_RIGHT_ORDER);
  assert.ok(INTERNSHIP_LEFT_ORDER.includes('education'));
  assert.ok(INTERNSHIP_RIGHT_ORDER.includes('learning'));
  assert.ok(INTERNSHIP_RIGHT_ORDER.includes('career-interests'));
  assert.ok(internshipTpl.categories.includes('Student & Fresher'));
  assert.ok(internshipTpl.categories.includes('ATS-Friendly'));
  assert.ok(internshipTpl.categories.includes('Technical & Developer'));

  assert.equal(getSectionDisplayTitle('education', 'internship-resume'), 'EDUCATION');
  assert.equal(getSectionDisplayTitle('achievements', 'internship-resume'), 'CO-CURRICULAR/ EVENTS');
  assert.equal(getSectionDisplayTitle('skills', 'internship-resume'), 'SKILLS');
  assert.equal(getSectionDisplayTitle('learning', 'internship-resume'), 'LEARNING');
  assert.equal(getSectionDisplayTitle('interests', 'internship-resume'), 'INTERESTS');
  assert.equal(getSectionDisplayTitle('research', 'internship-resume'), 'RESEARCH WORK');
  assert.equal(getSectionDisplayTitle('career-interests', 'internship-resume'), 'CAREER INTERESTS');
  assert.equal(getSectionDisplayTitle('experience', 'internship-resume'), 'INTERNSHIP EXPERIENCE');

  const fullIntern: Resume = {
    ...SAMPLE_INTERNSHIP_RESUME_CV,
    id: 'intern_1',
    userId: 'u_1',
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
  };

  // Clickable header contact links
  const contacts = buildInternshipContactItems(fullIntern.personalInfo);
  assert.ok(contacts.some((c) => c.kind === 'phone' && c.url?.startsWith('tel:')));
  assert.ok(contacts.some((c) => c.kind === 'email' && c.url?.startsWith('mailto:')));
  assert.ok(contacts.some((c) => c.kind === 'linkedin' && c.url?.includes('linkedin.com')));
  assert.ok(contacts.some((c) => c.kind === 'github' && c.url?.includes('github.com')));

  // Education & High School entries parse cleanly
  const eduEntries = getInternshipEducationEntries(fullIntern);
  assert.ok(eduEntries.length >= 2);

  // Research + projects merge cleanly
  const researchEntries = getInternshipResearchAndProjectEntries(fullIntern);
  assert.ok(researchEntries.length >= 1);

  // Skill proficiency dots: proficiency: null remains null (no auto-assigned dots); manual 1..5 preserved
  const unconfirmedSkillCv: Resume = {
    ...fullIntern,
    skills: [
      { id: 'sk-u', category: 'Backend', skills: ['Go', 'PostgreSQL'], proficiency: null },
      { id: 'sk-c', category: 'Frontend', skills: ['React', 'TypeScript'], proficiency: 4 },
    ],
    skillMatrix: [],
    careerInterests: ['Distributed Systems', 'Cloud Infrastructure'],
    learningActivities: [
      {
        id: 'la-1',
        title: 'Operating Systems Workshop',
        activityType: 'Workshop',
        provider: 'University Systems Lab',
      },
    ],
    certifications: [
      {
        id: 'cert-1',
        name: 'AWS Cloud Practitioner',
        issuer: 'AWS',
        issueDate: '2025',
      },
    ],
  };

  const skillRows = getInternshipSkillRows(unconfirmedSkillCv);
  assert.equal(skillRows[0].proficiency, null);
  assert.equal(skillRows[1].proficiency, 4);

  // Strict isolation: careerInterests NEVER appear inside skills; learningActivities stay separate from certifications
  const joinedSkillsText = skillRows.map((r) => r.label).join(' ');
  assert.equal(joinedSkillsText.includes('Distributed Systems'), false);
  assert.equal(joinedSkillsText.includes('Cloud Infrastructure'), false);

  const careerRes = getInternshipCareerInterests(unconfirmedSkillCv);
  assert.deepEqual(careerRes, ['Distributed Systems', 'Cloud Infrastructure']);

  const learningItems = getInternshipLearningItems(unconfirmedSkillCv);
  assert.equal(learningItems.length, 1);
  assert.equal(learningItems[0].title, 'Operating Systems Workshop');
  assert.equal(learningItems.some((l) => l.title === 'AWS Cloud Practitioner'), false);

  // Empty optional sections hide automatically cleanly
  const minimalIntern: Resume = {
    ...unconfirmedSkillCv,
    learningActivities: [],
    careerInterests: [],
    internshipPreferences: undefined,
    interests: '',
    interestItems: [],
    achievements: [],
    experience: [],
    certifications: [],
    languages: [],
    customSections: [],
  };
  const visibleMin = getOrderedVisibleSections(minimalIntern, internshipTpl);
  assert.ok(visibleMin.includes('education'));
  assert.ok(visibleMin.includes('research'));
  assert.ok(visibleMin.includes('skills'));
  assert.equal(visibleMin.includes('learning'), false);
  assert.equal(visibleMin.includes('interests'), false);
  assert.equal(visibleMin.includes('career-interests'), false);
  assert.equal(visibleMin.includes('achievements'), false);
  assert.equal(visibleMin.includes('experience'), false);
  assert.equal(visibleMin.includes('certifications'), false);
  assert.equal(visibleMin.includes('languages'), false);
  assert.equal(visibleMin.includes('custom-sections'), false);
});



