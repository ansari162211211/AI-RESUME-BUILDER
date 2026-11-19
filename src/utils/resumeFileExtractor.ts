import mammoth from 'mammoth';
import type { AtsDocumentFormat, AtsExtractedResumeDraft } from '../types/ats';
import {
  parseRawResumeTextToDraft,
  validateResumeUploadFile,
} from './atsScoringEngine';

export interface PdfPositionedItem {
  str: string;
  x: number;
  y: number;
  width?: number;
}

export interface RawExtractionOutput {
  success: boolean;
  rawText: string;
  fileFormat?: AtsDocumentFormat;
  pageCount?: number;
  isScannedPdf?: boolean;
  usedAiOcr?: boolean;
  isTwoColumnLayout?: boolean;
  hasTablesOrColumnsInText?: boolean;
  warnings: string[];
  error?: string;
  draft?: AtsExtractedResumeDraft;
}

/**
 * Pure helper: inspects horizontal coordinates of text items across a page to detect
 * whether content sits in two distinct side-by-side columns.
 */
export function detectTwoColumnFromXPositions(
  items: PdfPositionedItem[],
  pageWidth = 595
): boolean {
  if (!items || items.length < 18) return false;
  const meaningful = items.filter((it) => it.str && it.str.trim().length >= 3);
  if (meaningful.length < 14) return false;

  const mid = pageWidth * 0.48;
  // Exclude header/footer bands (top 14% and bottom 8%) where centered banners span width
  const minY = Math.min(...meaningful.map((i) => i.y));
  const maxY = Math.max(...meaningful.map((i) => i.y));
  const height = Math.max(1, maxY - minY);
  const bodyItems = meaningful.filter(
    (i) => i.y > minY + height * 0.06 && i.y < maxY - height * 0.12
  );
  if (bodyItems.length < 12) return false;

  // Group into Y bands (~4pt tolerance) and count rows that have text anchored both left and right
  const bands = new Map<number, { hasLeft: boolean; hasRight: boolean }>();
  for (const item of bodyItems) {
    const bucket = Math.round(item.y / 5) * 5;
    const entry = bands.get(bucket) || { hasLeft: false, hasRight: false };
    if (item.x < mid - 25) entry.hasLeft = true;
    if (item.x > mid + 15) entry.hasRight = true;
    bands.set(bucket, entry);
  }

  let dualColumnRows = 0;
  for (const b of bands.values()) {
    if (b.hasLeft && b.hasRight) dualColumnRows += 1;
  }

  return dualColumnRows >= 5;
}

/**
 * Reconstructs clean reading lines from positioned PDF text items.
 */
export function reconstructPdfLines(items: PdfPositionedItem[]): string {
  if (!items || items.length === 0) return '';
  const sorted = [...items]
    .filter((it) => it.str && it.str.length > 0)
    .sort((a, b) => {
      if (Math.abs(b.y - a.y) > 3.5) return b.y - a.y;
      return a.x - b.x;
    });

  const lines: string[] = [];
  let currentY: number | null = null;
  let currentLine: string[] = [];

  for (const item of sorted) {
    if (currentY === null || Math.abs(item.y - currentY) <= 3.5) {
      currentY = currentY === null ? item.y : currentY;
      currentLine.push(item.str);
    } else {
      const joined = currentLine.join(' ').replace(/\s+/g, ' ').trim();
      if (joined) lines.push(joined);
      currentY = item.y;
      currentLine = [item.str];
    }
  }
  if (currentLine.length > 0) {
    const joined = currentLine.join(' ').replace(/\s+/g, ' ').trim();
    if (joined) lines.push(joined);
  }

  return lines.join('\n');
}

/**
 * Heuristic check for scanned / image-based PDFs lacking embedded text layers.
 */
export function detectScannedPdf(rawText: string, pageCount: number): boolean {
  const cleanChars = (rawText || '').replace(/\s+/g, '').length;
  const pages = Math.max(1, pageCount || 1);
  return cleanChars < pages * 70;
}

/**
 * Decodes TXT bytes safely and returns clean extracted text or an actionable error.
 */
export function extractTextFromTxtBuffer(
  buffer: ArrayBuffer | Uint8Array
): { rawText: string; error?: string } {
  try {
    const decoder = new TextDecoder('utf-8', { fatal: false });
    const decoded = decoder.decode(buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer));
    const cleaned = decoded.replace(/\u0000/g, '').trim();
    if (!cleaned || cleaned.length < 20) {
      return {
        rawText: cleaned,
        error: 'The uploaded .txt file is empty or too short to contain resume content.',
      };
    }
    return { rawText: cleaned };
  } catch (err: any) {
    return {
      rawText: '',
      error: err?.message || 'Unable to decode plain text file.',
    };
  }
}

/**
 * Parses a DOCX ArrayBuffer via mammoth, extracting both plain text and detecting layout tables.
 */
export async function extractTextFromDocxBuffer(buffer: ArrayBuffer): Promise<{
  rawText: string;
  hasTables: boolean;
  warnings: string[];
  error?: string;
}> {
  try {
    if (!buffer || buffer.byteLength < 64) {
      return {
        rawText: '',
        hasTables: false,
        warnings: [],
        error: 'The DOCX file is empty or corrupted.',
      };
    }
    const bytes = new Uint8Array(buffer.slice(0, 4));
    // DOCX files are ZIP archives starting with PK\x03\x04
    if (bytes[0] !== 0x50 || bytes[1] !== 0x4b) {
      return {
        rawText: '',
        hasTables: false,
        warnings: [],
        error:
          'This file does not appear to be a valid .docx Word archive. Re-save as .docx or .pdf and try again.',
      };
    }

    const rawResult = await mammoth.extractRawText({ arrayBuffer: buffer });
    const htmlResult = await mammoth.convertToHtml({ arrayBuffer: buffer }).catch(() => ({
      value: '',
      messages: [],
    }));

    const hasTables = /<table[\s>]/i.test(htmlResult.value || '');
    const rawText = (rawResult.value || '').trim();
    const warnings: string[] = [];

    if (hasTables) {
      warnings.push(
        'Layout tables detected inside your .docx file; legacy ATS software may read table cells out of order.'
      );
    }

    if (!rawText || rawText.length < 30) {
      return {
        rawText,
        hasTables,
        warnings,
        error:
          'Very little readable text was found in this .docx file (content may be inside images or text boxes).',
      };
    }

    return { rawText, hasTables, warnings };
  } catch (err: any) {
    return {
      rawText: '',
      hasTables: false,
      warnings: [],
      error:
        err?.message ||
        'Could not parse this .docx file. It may be corrupted or password-protected.',
    };
  }
}

let pdfWorkerConfigured = false;

async function getPdfJsModule() {
  const pdfjsLib: any = await import('pdfjs-dist');
  if (!pdfWorkerConfigured && typeof window !== 'undefined') {
    try {
      const workerMod: any = await import('pdfjs-dist/build/pdf.worker.min.mjs?url');
      if (workerMod?.default) {
        pdfjsLib.GlobalWorkerOptions.workerSrc = workerMod.default;
      }
    } catch {
      // Fallback: pdfjs runs without explicit external worker URL if bundler inlines it
    }
    pdfWorkerConfigured = true;
  }
  return pdfjsLib;
}

/**
 * Extracts text & layout metadata from a PDF ArrayBuffer in browser runtime using pdfjs-dist.
 */
export async function extractTextFromPdfBuffer(buffer: ArrayBuffer): Promise<{
  rawText: string;
  pageCount: number;
  isScannedPdf: boolean;
  isTwoColumnLayout: boolean;
  warnings: string[];
  error?: string;
}> {
  try {
    if (!buffer || buffer.byteLength < 64) {
      return {
        rawText: '',
        pageCount: 0,
        isScannedPdf: false,
        isTwoColumnLayout: false,
        warnings: [],
        error: 'The PDF file appears empty or truncated.',
      };
    }

    const pdfjsLib = await getPdfJsModule();
    const loadingTask = pdfjsLib.getDocument({
      data: new Uint8Array(buffer),
      useSystemFonts: true,
    });
    const pdfDoc = await loadingTask.promise;
    const pageCount: number = pdfDoc.numPages || 1;
    const pageTexts: string[] = [];
    let twoColumnDetected = false;

    for (let pageNum = 1; pageNum <= pageCount; pageNum += 1) {
      const page = await pdfDoc.getPage(pageNum);
      const viewport = page.getViewport({ scale: 1.0 });
      const textContent = await page.getTextContent();
      const positioned: PdfPositionedItem[] = (textContent.items || [])
        .filter((it: any) => typeof it.str === 'string' && it.str.length > 0)
        .map((it: any) => ({
          str: it.str,
          x: Array.isArray(it.transform) ? Number(it.transform[4]) || 0 : 0,
          y: Array.isArray(it.transform) ? Number(it.transform[5]) || 0 : 0,
          width: typeof it.width === 'number' ? it.width : 0,
        }));

      if (detectTwoColumnFromXPositions(positioned, viewport.width || 595)) {
        twoColumnDetected = true;
      }
      pageTexts.push(reconstructPdfLines(positioned));
    }

    const rawText = pageTexts.filter(Boolean).join('\n\n').trim();
    const isScannedPdf = detectScannedPdf(rawText, pageCount);
    const warnings: string[] = [];

    if (isScannedPdf) {
      warnings.push(
        'This PDF appears to be scanned or image-based with almost no selectable text layer.'
      );
    }
    if (twoColumnDetected) {
      warnings.push(
        'Multi-column PDF layout detected. Review the extracted text below to confirm reading order is intact.'
      );
    }

    return {
      rawText,
      pageCount,
      isScannedPdf,
      isTwoColumnLayout: twoColumnDetected,
      warnings,
    };
  } catch (err: any) {
    const name = err?.name || '';
    const msg = err?.message || '';
    if (name === 'PasswordException' || /password/i.test(msg)) {
      return {
        rawText: '',
        pageCount: 0,
        isScannedPdf: false,
        isTwoColumnLayout: false,
        warnings: [],
        error:
          'This PDF is password-protected or encrypted. Remove the password or upload an unlocked PDF / DOCX copy.',
      };
    }
    return {
      rawText: '',
      pageCount: 0,
      isScannedPdf: false,
      isTwoColumnLayout: false,
      warnings: [],
      error:
        'Could not read this PDF document (file may be corrupted or use an unsupported encoding). Try exporting a fresh PDF or uploading a .docx/.txt file.',
    };
  }
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }
  return btoa(binary);
}

export interface ExtractResumeFileOptions {
  ocrPdfFallback?: (pdfBase64: string) => Promise<{ rawText: string; warnings: string[] }>;
}

/**
 * Main entry point for uploaded resume files (PDF, DOCX, TXT).
 * Validates type/size, extracts real document text, detects scanned/multi-column/corrupted docs,
 * optionally runs Gemini OCR on scanned PDFs, and returns a structured editable AtsExtractedResumeDraft.
 */
export async function extractResumeFromFile(
  file: File,
  options?: ExtractResumeFileOptions
): Promise<RawExtractionOutput> {
  const validation = validateResumeUploadFile(file.name, file.type, file.size);
  if (!validation.valid || !validation.format) {
    return {
      success: false,
      rawText: '',
      warnings: [],
      error: validation.error || 'Unsupported file upload.',
    };
  }

  const format = validation.format;
  const buffer = await file.arrayBuffer();

  if (format === 'txt') {
    const txtRes = extractTextFromTxtBuffer(buffer);
    if (txtRes.error) {
      return {
        success: false,
        rawText: txtRes.rawText,
        fileFormat: 'txt',
        warnings: [],
        error: txtRes.error,
      };
    }
    const draft = parseRawResumeTextToDraft(txtRes.rawText, {
      fileName: file.name,
      fileFormat: 'txt',
      fileSizeBytes: file.size,
      pageCount: 1,
    });
    return {
      success: true,
      rawText: txtRes.rawText,
      fileFormat: 'txt',
      pageCount: 1,
      warnings: draft.extractionWarnings,
      draft,
    };
  }

  if (format === 'docx') {
    const docxRes = await extractTextFromDocxBuffer(buffer);
    if (docxRes.error) {
      return {
        success: false,
        rawText: docxRes.rawText,
        fileFormat: 'docx',
        warnings: docxRes.warnings,
        error: docxRes.error,
      };
    }
    const draft = parseRawResumeTextToDraft(docxRes.rawText, {
      fileName: file.name,
      fileFormat: 'docx',
      fileSizeBytes: file.size,
      hasTablesOrColumnsInText: docxRes.hasTables,
      extractionWarnings: docxRes.warnings,
    });
    return {
      success: true,
      rawText: docxRes.rawText,
      fileFormat: 'docx',
      hasTablesOrColumnsInText: docxRes.hasTables,
      warnings: draft.extractionWarnings,
      draft,
    };
  }

  // PDF
  const pdfRes = await extractTextFromPdfBuffer(buffer);
  if (pdfRes.error) {
    return {
      success: false,
      rawText: '',
      fileFormat: 'pdf',
      warnings: [],
      error: pdfRes.error,
    };
  }

  let finalRawText = pdfRes.rawText;
  let usedAiOcr = false;
  const warnings = [...pdfRes.warnings];

  if (pdfRes.isScannedPdf && options?.ocrPdfFallback) {
    try {
      const b64 = arrayBufferToBase64(buffer);
      const ocrOut = await options.ocrPdfFallback(b64);
      if (ocrOut.rawText && ocrOut.rawText.trim().length >= 50) {
        finalRawText = ocrOut.rawText.trim();
        usedAiOcr = true;
        warnings.push(...(ocrOut.warnings || []));
      } else {
        warnings.push(
          'OCR returned limited text from this scan. Review and edit the extracted text manually or upload a text-selectable PDF/DOCX.'
        );
      }
    } catch (ocrErr: any) {
      warnings.push(
        `Scanned PDF detected and automatic OCR could not run (${ocrErr?.message || 'service unavailable'}). You can paste or edit text manually below, or upload a digital PDF/DOCX.`
      );
    }
  }

  if (!finalRawText || finalRawText.replace(/\s+/g, '').length < 30) {
    return {
      success: false,
      rawText: finalRawText,
      fileFormat: 'pdf',
      pageCount: pdfRes.pageCount,
      isScannedPdf: pdfRes.isScannedPdf,
      usedAiOcr,
      warnings,
      error:
        'This PDF appears to be scanned/image-only and no readable text could be extracted. Try uploading a text-selectable PDF, DOCX, TXT, or paste your resume text to review manually.',
    };
  }

  const draft = parseRawResumeTextToDraft(finalRawText, {
    fileName: file.name,
    fileFormat: 'pdf',
    fileSizeBytes: file.size,
    pageCount: pdfRes.pageCount,
    isScannedPdf: pdfRes.isScannedPdf,
    usedAiOcr,
    isTwoColumnLayout: pdfRes.isTwoColumnLayout,
    hasTablesOrColumnsInText: pdfRes.isTwoColumnLayout,
    extractionWarnings: warnings,
  });

  return {
    success: true,
    rawText: finalRawText,
    fileFormat: 'pdf',
    pageCount: pdfRes.pageCount,
    isScannedPdf: pdfRes.isScannedPdf,
    usedAiOcr,
    isTwoColumnLayout: pdfRes.isTwoColumnLayout,
    hasTablesOrColumnsInText: pdfRes.isTwoColumnLayout,
    warnings: draft.extractionWarnings,
    draft,
  };
}
