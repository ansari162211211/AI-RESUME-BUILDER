import test from 'node:test';
import assert from 'node:assert/strict';
import { formatCvPdfFileName, sanitizePdfUrl, formatDoiUrl } from './pdfHelpers.ts';

test('formatCvPdfFileName handles standard names', () => {
  assert.equal(formatCvPdfFileName('Deepak Raja'), 'Deepak_Raja_Academic_CV.pdf');
});

test('formatCvPdfFileName removes prefixes like Dr. and Prof.', () => {
  assert.equal(formatCvPdfFileName('Dr. Eleanor V. Chen'), 'Eleanor_V_Chen_Academic_CV.pdf');
  assert.equal(formatCvPdfFileName('Prof. Marcus Vance'), 'Marcus_Vance_Academic_CV.pdf');
});

test('formatCvPdfFileName handles empty or whitespace-only names', () => {
  assert.equal(formatCvPdfFileName(''), 'Academic_Curriculum_Vitae.pdf');
  assert.equal(formatCvPdfFileName('   '), 'Academic_Curriculum_Vitae.pdf');
  assert.equal(formatCvPdfFileName(undefined), 'Academic_Curriculum_Vitae.pdf');
});

test('formatCvPdfFileName strips special characters that could corrupt downloads', () => {
  assert.equal(formatCvPdfFileName('Alex Morgan (Demo)'), 'Alex_Morgan_Demo_Academic_CV.pdf');
  assert.equal(formatCvPdfFileName('Jean-Luc Picard, Ph.D.'), 'Jean-Luc_Picard_PhD_Academic_CV.pdf');
});

test('sanitizePdfUrl formats clean web URLs', () => {
  assert.equal(sanitizePdfUrl('google.com'), 'https://google.com');
  assert.equal(sanitizePdfUrl('http://example.com'), 'http://example.com');
  assert.equal(sanitizePdfUrl('https://example.com/paper'), 'https://example.com/paper');
  assert.equal(sanitizePdfUrl(''), null);
});

test('formatDoiUrl handles raw DOIs and DOI URLs', () => {
  assert.equal(formatDoiUrl('10.1038/s42256-024-00812-4'), 'https://doi.org/10.1038/s42256-024-00812-4');
  assert.equal(formatDoiUrl('doi: 10.1038/example'), 'https://doi.org/10.1038/example');
  assert.equal(formatDoiUrl('https://doi.org/10.1038/example'), 'https://doi.org/10.1038/example');
  assert.equal(formatDoiUrl(''), null);
});
