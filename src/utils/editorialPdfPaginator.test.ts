import test from 'node:test';
import assert from 'node:assert/strict';
import type { Resume } from '../types/resume';
import { getTemplateById, getTypographyScale, resolveTemplateCustomization } from '../data/templates';
import {
  SAMPLE_CREATIVE_PROFESSIONAL_CV,
  SAMPLE_ELEGANT_SERIF_CV,
} from '../data/sampleResumes';
import {
  buildCreativeContactItems,
  buildElegantSerifContactItems,
  buildElegantSerifMetadataRows,
  getOrderedVisibleSections,
} from './resumePresentation';
import {
  estimateEditorialHeaderHeightPt,
  paginateEditorialPdfColumns,
} from './editorialPdfPaginator';

const makeResume = (overrides: Partial<Resume> = {}): Resume => ({
  ...SAMPLE_ELEGANT_SERIF_CV,
  id: 'test-resume-1',
  userId: 'test-user-1',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
  template: 'elegant-serif',
  ...overrides,
});

test('paginateEditorialPdfColumns cleanly paginates Elegant Serif researcher CV across 2 pages with headings attached to item 0', () => {
  const template = getTemplateById('elegant-serif');
  const resume = makeResume();
  const custom = resolveTemplateCustomization(resume);
  const scale = getTypographyScale(custom, template.id);
  const visible = getOrderedVisibleSections(resume, template);
  const sidebarSet = new Set(template.sidebarSections || []);
  const leftSections = visible.filter((k) => !sidebarSet.has(k));
  const rightSections = visible.filter((k) => sidebarSet.has(k));

  const headerPt = estimateEditorialHeaderHeightPt(
    buildElegantSerifMetadataRows(resume).length,
    buildElegantSerifContactItems(resume.personalInfo).length,
    scale
  );
  const pages = paginateEditorialPdfColumns({
    leftSections,
    rightSections,
    resume,
    scale,
    headerHeightPt: headerPt,
  });

  assert.equal(pages.length, 2);

  // Page 1 should have education + experience on left without research/projects clipping
  const p1LeftKeys = pages[0].left.map((s) => s.sectionKey);
  assert.ok(p1LeftKeys.includes('education'));
  assert.ok(p1LeftKeys.includes('experience'));
  assert.ok(!p1LeftKeys.includes('projects'));

  // Every slice with sliceStart === 0 has includeHeading === true, and continuations have includeHeading === false
  pages.forEach((p) => {
    [...p.left, ...p.right].forEach((slice) => {
      assert.equal(slice.includeHeading, slice.sliceStart === 0);
      assert.ok(slice.sliceEnd > slice.sliceStart);
    });
  });

  // All visible sections appear completely once across the pages
  const allSeenKeys = new Set(
    pages.flatMap((p) => [...p.left, ...p.right].map((s) => s.sectionKey))
  );
  visible.forEach((k) => {
    assert.ok(allSeenKeys.has(k), `Missing section ${k} from PDF pagination plan`);
  });
});

test('paginateEditorialPdfColumns keeps concise student CV on 1 page', () => {
  const template = getTemplateById('elegant-serif');
  const concise = makeResume({
    education: SAMPLE_ELEGANT_SERIF_CV.education.slice(0, 1),
    experience: SAMPLE_ELEGANT_SERIF_CV.experience.slice(0, 1),
    researchExperience: [],
    projects: SAMPLE_ELEGANT_SERIF_CV.projects.slice(0, 1),
    publications: [],
    achievements: SAMPLE_ELEGANT_SERIF_CV.achievements.slice(0, 1),
    certifications: [],
    leadership: [],
    memberships: [],
  });
  const custom = resolveTemplateCustomization(concise);
  const scale = getTypographyScale(custom, template.id);
  const visible = getOrderedVisibleSections(concise, template);
  const sidebarSet = new Set(template.sidebarSections || []);
  const pages = paginateEditorialPdfColumns({
    leftSections: visible.filter((k) => !sidebarSet.has(k)),
    rightSections: visible.filter((k) => sidebarSet.has(k)),
    resume: concise,
    scale,
    headerHeightPt: estimateEditorialHeaderHeightPt(2, 5, scale),
  });

  assert.equal(pages.length, 1);
});

test('paginateEditorialPdfColumns cleanly paginates Template 12 Creative Professional across 1 and multiple A4 pages without dropping sections', () => {
  const template = getTemplateById('creative-professional');
  const creativeResume: Resume = {
    ...SAMPLE_CREATIVE_PROFESSIONAL_CV,
    id: 'cr-pag-1',
    userId: 'u-1',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  };
  const custom = resolveTemplateCustomization(creativeResume);
  const scale = getTypographyScale(custom, template.id);
  const visible = getOrderedVisibleSections(creativeResume, template);
  const sidebarSet = new Set(template.sidebarSections || []);
  const leftSections = visible.filter((k) => !sidebarSet.has(k));
  const rightSections = visible.filter((k) => sidebarSet.has(k));

  const headerPt = estimateEditorialHeaderHeightPt(
    0,
    buildCreativeContactItems(creativeResume.personalInfo).length,
    scale
  );

  const singleOrCompactPages = paginateEditorialPdfColumns({
    leftSections,
    rightSections,
    resume: creativeResume,
    scale,
    headerHeightPt: headerPt,
    mode: 'creative',
  });
  assert.ok(singleOrCompactPages.length >= 1);

  const seenCompact = new Set(
    singleOrCompactPages.flatMap((p) => [...p.left, ...p.right].map((s) => s.sectionKey))
  );
  visible.forEach((k) => {
    assert.ok(seenCompact.has(k), `Missing section ${k} from compact Creative pagination`);
  });

  // Overflowing multi-page Creative CV preserves every entry and keeps includeHeading attached to sliceStart === 0
  const expandedCreative: Resume = {
    ...creativeResume,
    experience: [
      ...creativeResume.experience,
      ...creativeResume.experience.map((e, i) => ({ ...e, id: `exp-extra-${i}` })),
      ...creativeResume.experience.map((e, i) => ({ ...e, id: `exp-extra2-${i}` })),
    ],
    education: [
      ...creativeResume.education,
      ...creativeResume.education.map((e, i) => ({ ...e, id: `edu-extra-${i}` })),
      ...creativeResume.education.map((e, i) => ({ ...e, id: `edu-extra2-${i}` })),
    ],
    publications: [
      ...(creativeResume.publications || []),
      ...(creativeResume.publications || []).map((p, i) => ({ ...p, id: `pub-extra-${i}` })),
      ...(creativeResume.publications || []).map((p, i) => ({ ...p, id: `pub-extra2-${i}` })),
    ],
  };

  const multiPages = paginateEditorialPdfColumns({
    leftSections,
    rightSections,
    resume: expandedCreative,
    scale,
    headerHeightPt: headerPt,
    mode: 'creative',
  });
  assert.ok(multiPages.length >= 2);
  multiPages.forEach((p) => {
    [...p.left, ...p.right].forEach((slice) => {
      assert.equal(slice.includeHeading, slice.sliceStart === 0);
      assert.ok(slice.sliceEnd > slice.sliceStart);
    });
  });

  const seenExpanded = new Set(
    multiPages.flatMap((p) => [...p.left, ...p.right].map((s) => s.sectionKey))
  );
  visible.forEach((k) => {
    assert.ok(seenExpanded.has(k), `Missing section ${k} from multi-page Creative pagination`);
  });
});
