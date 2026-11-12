import React from 'react';
import { pdf } from '@react-pdf/renderer';
import type { Resume, CvFontFamily } from '../types/resume';
import { AcademicCvPdfDocument } from '../components/ResumePreview/AcademicCvPdfDocument';
import { formatCvPdfFileName } from '../utils/pdfHelpers';

export interface DownloadPdfResult {
  success: boolean;
  fileName?: string;
  blobSize?: number;
  error?: string;
}

/**
 * Generates a real vector text A4 multi-page PDF using @react-pdf/renderer
 * and triggers an automatic browser download.
 */
export async function downloadAcademicCvPdf(
  resume: Resume,
  fontFamily: CvFontFamily = 'serif'
): Promise<DownloadPdfResult> {
  const fileName = formatCvPdfFileName(resume.personalInfo?.fullName);

  try {
    const docElement = React.createElement(AcademicCvPdfDocument, {
      resume,
      fontFamily,
    });

    const instance = pdf(docElement);
    const blob = await instance.toBlob();

    if (!blob || blob.size === 0) {
      throw new Error('Generated PDF file is empty.');
    }

    // Trigger browser file download
    const blobUrl = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = blobUrl;
    link.download = fileName;
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();

    // Clean up DOM and memory
    setTimeout(() => {
      document.body.removeChild(link);
      URL.revokeObjectURL(blobUrl);
    }, 1500);

    return {
      success: true,
      fileName,
      blobSize: blob.size,
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown PDF generation error';
    console.error('Failed to generate Academic CV PDF:', err);
    return {
      success: false,
      fileName,
      error: message,
    };
  }
}

/**
 * Generates an in-memory blob URL for embedding or previewing the generated PDF.
 */
export async function generateCvPdfBlobUrl(
  resume: Resume,
  fontFamily: CvFontFamily = 'serif'
): Promise<{ url: string; revoke: () => void }> {
  const docElement = React.createElement(AcademicCvPdfDocument, {
    resume,
    fontFamily,
  });

  const instance = pdf(docElement);
  const blob = await instance.toBlob();
  const url = URL.createObjectURL(blob);

  return {
    url,
    revoke: () => URL.revokeObjectURL(url),
  };
}
