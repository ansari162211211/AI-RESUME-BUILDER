import React from 'react';
import { pdf } from '@react-pdf/renderer';
import type { Resume, CvFontFamily, TemplateCustomization } from '../types/resume';
import { TemplatePdfDocument } from '../components/ResumePreview/pdf/TemplatePdfDocument';
import { formatCvPdfFileName } from '../utils/pdfHelpers';

export interface DownloadPdfResult {
  success: boolean;
  fileName?: string;
  blobSize?: number;
  error?: string;
}

/**
 * Generates a real vector text A4 multi-page PDF using @react-pdf/renderer
 * for the selected template and customization, and triggers an automatic browser download.
 */
export async function downloadAcademicCvPdf(
  resume: Resume,
  fontFamily?: CvFontFamily,
  templateOverride?: string,
  customizationOverride?: TemplateCustomization
): Promise<DownloadPdfResult> {
  const fileName = formatCvPdfFileName(resume.personalInfo?.fullName);

  try {
    const mergedResume: Resume = fontFamily
      ? {
          ...resume,
          fontFamily,
          customization: resume.customization
            ? { ...resume.customization, fontFamily }
            : undefined,
        }
      : resume;

    const docElement = React.createElement(TemplatePdfDocument, {
      resume: mergedResume,
      templateOverride,
      customizationOverride,
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const instance = pdf(docElement as any);
    const blob = await instance.toBlob();

    if (!blob || blob.size === 0) {
      throw new Error('Generated PDF file is empty.');
    }

    const pdfBlob =
      blob.type === 'application/pdf'
        ? blob
        : new Blob([blob], { type: 'application/pdf' });
    const blobUrl = URL.createObjectURL(pdfBlob);
    const link = document.createElement('a');
    link.href = blobUrl;
    link.download = fileName;
    link.rel = 'noopener';
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();

    setTimeout(() => {
      if (link.parentNode) {
        link.parentNode.removeChild(link);
      }
      URL.revokeObjectURL(blobUrl);
    }, 5000);

    return {
      success: true,
      fileName,
      blobSize: blob.size,
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown PDF generation error';
    console.error('Failed to generate Resume PDF:', err);
    return {
      success: false,
      fileName,
      error: message,
    };
  }
}

export const downloadResumePdf = downloadAcademicCvPdf;

/**
 * Generates an in-memory blob URL for embedding or previewing the generated PDF.
 */
export async function generateCvPdfBlobUrl(
  resume: Resume,
  fontFamily?: CvFontFamily
): Promise<{ url: string; revoke: () => void }> {
  const mergedResume: Resume = fontFamily
    ? {
        ...resume,
        fontFamily,
      }
    : resume;

  const docElement = React.createElement(TemplatePdfDocument, {
    resume: mergedResume,
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const instance = pdf(docElement as any);
  const blob = await instance.toBlob();
  const url = URL.createObjectURL(blob);

  return {
    url,
    revoke: () => URL.revokeObjectURL(url),
  };
}
