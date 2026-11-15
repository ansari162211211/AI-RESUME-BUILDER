import test from 'node:test';
import assert from 'node:assert/strict';
import {
  applyOnePageSuggestionText,
  estimateSimpleOnePageFit,
  generateOnePageOptimizationSuggestions,
} from './onePageOptimizer.ts';
import { SAMPLE_SIMPLE_ONE_PAGE_CV } from '../data/sampleResumes.ts';
import type { Resume } from '../types/resume';

const makeSample = (overrides: Partial<Resume> = {}): Resume => ({
  ...SAMPLE_SIMPLE_ONE_PAGE_CV,
  id: 't15_test_1',
  userId: 'u_1',
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
  ...overrides,
});

test('estimateSimpleOnePageFit confirms 1 A4 page fit on concise Simple One-Page sample', () => {
  const fit = estimateSimpleOnePageFit(makeSample());
  assert.equal(fit.fitsOnOnePage, true);
  assert.equal(fit.estimatedPages, 1);
  assert.equal(fit.overflowPercent, 0);
  assert.ok(fit.totalWords > 80);
  assert.ok(fit.bulletCount >= 6);
  assert.match(fit.advisoryMessage, /Fits comfortably on 1 A4 page/i);
});

test('estimateSimpleOnePageFit detects overflow without deleting or hiding any user content', () => {
  const heavyExperience = Array.from({ length: 6 }, (_, i) => ({
    id: `exp-heavy-${i}`,
    company: `Enterprise Systems Corp ${i + 1}`,
    position: 'Senior Distributed Systems Architect',
    location: 'San Francisco, CA',
    startDate: 'Jan 2020',
    endDate: 'Present',
    current: true,
    highlights: [
      'Architected multi-region consensus pipelines spanning 18 edge clusters with zero downtime migrations.',
      'Mentored 14 backend engineers across authentication, billing ledger, and telemetry ingestion subsystems.',
      'Authored internal load-testing frameworks simulating peak traffic surges across Kubernetes worker pools.',
    ],
  }));

  const oversizedResume = makeSample({
    objective:
      'Principal software engineer specializing in globally distributed systems, reliability engineering, observability infrastructure, platform tooling, developer workflows, automated incident triage, multi-cloud orchestration, and technical mentorship.',
    experience: [...SAMPLE_SIMPLE_ONE_PAGE_CV.experience, ...heavyExperience],
  });

  const fit = estimateSimpleOnePageFit(oversizedResume);
  assert.equal(fit.fitsOnOnePage, false);
  assert.ok(fit.estimatedPages >= 2);
  assert.ok(fit.overflowPercent > 0);
  assert.match(fit.advisoryMessage, /Your content is preserved cleanly across pages/i);
  assert.equal(oversizedResume.experience.length, SAMPLE_SIMPLE_ONE_PAGE_CV.experience.length + 6);
});

test('generateOnePageOptimizationSuggestions detects wordy lead-ins, repetitive verbs, verbose bullets, and long summaries strictly without fabricating facts', () => {
  const verboseResume = makeSample({
    objective:
      'Experienced senior software engineer with an extensive background in backend distributed architecture, observability tooling, and cloud platforms. Collaborates closely with product managers, designers, and cross-functional engineering stakeholders on scalable APIs. Dedicated to mentoring junior engineers and continuously raising automated testing and release quality across core infrastructure.',
    experience: [
      {
        id: 'exp-verbose',
        company: 'Acme Cloud',
        position: 'Software Engineer',
        startDate: '2022',
        endDate: '2024',
        current: false,
        highlights: [
          'Was responsible for building distributed API gateways in order to route traffic cleanly',
          'Developed automated CI workflows for containerized services',
          'Developed deployment validation pipelines with canary checks',
          'Coordinated architecture reviews across five global teams; authored runbooks for incident triage (with detailed escalation matrices and stakeholder schedules); reduced manual handoffs across engineering, QA, and production release management.',
        ],
      },
    ],
    projects: [
      {
        id: 'proj-verbose',
        title: 'Log Indexer',
        technologies: ['Go', 'Rust'],
        highlights: [
          'Worked on the full-text inverted index engine with compressed posting lists',
        ],
      },
    ],
  });

  const suggestions = generateOnePageOptimizationSuggestions(verboseResume);
  assert.ok(suggestions.some((s) => s.reason === 'long-summary'));
  assert.ok(suggestions.some((s) => s.reason === 'wordy-lead-in' && s.sectionLabel === 'Experience'));
  assert.ok(suggestions.some((s) => s.reason === 'repetitive-verb' && s.sectionLabel === 'Experience'));
  assert.ok(suggestions.some((s) => s.reason === 'verbose-bullet' && s.sectionLabel === 'Experience'));
  assert.ok(suggestions.some((s) => s.reason === 'wordy-lead-in' && s.sectionLabel === 'Projects'));

  const wordyExp = suggestions.find(
    (s) => s.reason === 'wordy-lead-in' && s.sectionLabel === 'Experience'
  )!;
  assert.match(wordyExp.suggestedText, /^Led building distributed API gateways to route traffic cleanly$/);
  // Zero fabricated numbers or percentages introduced
  assert.equal(/\d+%/.test(wordyExp.suggestedText), false);
});

test('applyOnePageSuggestionText applies edits to targeted entry and restores original cleanly', () => {
  const base = makeSample({
    experience: [
      {
        id: 'exp-1',
        company: 'Verily',
        position: 'Software Engineer',
        startDate: '2018',
        endDate: '2019',
        current: false,
        highlights: ['Was responsible for maintaining **Open Source** pipeline scripts'],
      },
    ],
  });

  const suggestions = generateOnePageOptimizationSuggestions(base);
  assert.ok(suggestions.length >= 1);
  const first = suggestions[0];

  const edited = applyOnePageSuggestionText(base, first.target, first.suggestedText);
  assert.equal(edited.experience[0].highlights[0], first.suggestedText);

  // Restore exact original text non-destructively
  const restored = applyOnePageSuggestionText(edited, first.target, first.originalText);
  assert.equal(restored.experience[0].highlights[0], first.originalText);
});
