import test from 'node:test';
import assert from 'node:assert/strict';
import {
  detectScannedPdf,
  detectTwoColumnFromXPositions,
  extractTextFromDocxBuffer,
  extractTextFromTxtBuffer,
  reconstructPdfLines,
  type PdfPositionedItem,
} from './resumeFileExtractor';
import { parseRawResumeTextToDraft } from './atsScoringEngine';

test('extractTextFromTxtBuffer parses UTF-8 text cleanly and rejects empty input', () => {
  const sample = `Maya Patel
maya@example.com | +1 408 555 0198
SUMMARY
Frontend engineer specializing in React and TypeScript.
SKILLS
React, TypeScript, CSS, Jest`;

  const buf = new TextEncoder().encode(sample).buffer;
  const result = extractTextFromTxtBuffer(buf);
  assert.equal(result.error, undefined);
  assert.ok(result.rawText.includes('Maya Patel'));

  const draft = parseRawResumeTextToDraft(result.rawText, {
    fileName: 'maya.txt',
    fileFormat: 'txt',
  });
  assert.equal(draft.personalInfo.fullName, 'Maya Patel');
  assert.equal(draft.personalInfo.email, 'maya@example.com');

  const emptyBuf = new TextEncoder().encode('   ').buffer;
  const emptyRes = extractTextFromTxtBuffer(emptyBuf);
  assert.ok(emptyRes.error);
});

test('extractTextFromDocxBuffer rejects corrupted/non-ZIP buffers with clear error', async () => {
  const fakeBytes = new TextEncoder().encode('Not a docx archive').buffer;
  const res = await extractTextFromDocxBuffer(fakeBytes);
  assert.ok(res.error);
  assert.match(res.error, /docx/i);

  const empty = new ArrayBuffer(8);
  const resEmpty = await extractTextFromDocxBuffer(empty);
  assert.ok(resEmpty.error);
});

test('detectScannedPdf accurately flags image-only PDFs vs text-rich PDFs', () => {
  assert.equal(detectScannedPdf('', 1), true);
  assert.equal(detectScannedPdf('Page 1', 2), true);
  assert.equal(
    detectScannedPdf(
      'Elena Gomez | elena@example.com | Senior Data Engineer with 6 years building Python, Spark, PostgreSQL, and AWS data pipelines.',
      1
    ),
    false
  );
});

test('detectTwoColumnFromXPositions distinguishes two-column vs single-column coordinates', () => {
  const singleCol: PdfPositionedItem[] = Array.from({ length: 20 }, (_, idx) => ({
    str: `Experience highlight bullet line number ${idx + 1}`,
    x: 48,
    y: 720 - idx * 24,
  }));
  assert.equal(detectTwoColumnFromXPositions(singleCol, 595), false);

  const twoCol: PdfPositionedItem[] = [];
  for (let i = 0; i < 12; i += 1) {
    const y = 700 - i * 28;
    twoCol.push({ str: `Left Column Item ${i}`, x: 45, y });
    twoCol.push({ str: `Right Sidebar Item ${i}`, x: 340, y });
  }
  assert.equal(detectTwoColumnFromXPositions(twoCol, 595), true);
});

test('reconstructPdfLines orders text top-to-bottom and left-to-right cleanly', () => {
  const items: PdfPositionedItem[] = [
    { str: 'World', x: 120, y: 700 },
    { str: 'Hello', x: 40, y: 700 },
    { str: 'Second Line', x: 40, y: 680 },
  ];
  const out = reconstructPdfLines(items);
  assert.equal(out, 'Hello World\nSecond Line');
});
