import test from 'node:test';
import assert from 'node:assert/strict';
import type { Resume } from '../types/resume';
import { getTemplateById, getTypographyScale, resolveTemplateCustomization } from '../data/templates';
import { SAMPLE_ELEGANT_SERIF_CV } from '../data/sampleResumes';
import {
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
