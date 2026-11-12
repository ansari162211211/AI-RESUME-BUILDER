/**
 * Utility functions for PDF generation, filename formatting, and pagination helpers.
 */

/**
 * Generates a clean, professional file name for the downloaded PDF.
 * Example: "Deepak Raja" -> "Deepak_Raja_Academic_CV.pdf"
 * "Dr. Eleanor V. Chen" -> "Eleanor_V_Chen_Academic_CV.pdf"
 */
export function formatCvPdfFileName(fullName?: string): string {
  if (!fullName || !fullName.trim()) {
    return 'Academic_Curriculum_Vitae.pdf';
  }

  // Remove common academic prefixes like Dr., Prof., etc., for cleaner file naming
  const cleanedName = fullName
    .replace(/^(dr\.|prof\.|mr\.|ms\.|mrs\.|er\.)\s+/i, '')
    .trim();

  // Replace invalid filename characters and normalize spaces
  const safeName = cleanedName
    .replace(/[^a-zA-Z0-9\s_-]/g, '')
    .trim()
    .split(/\s+/)
    .join('_');

  if (!safeName) {
    return 'Academic_Curriculum_Vitae.pdf';
  }

  return `${safeName}_Academic_CV.pdf`;
}

/**
 * Sanitizes URLs to ensure valid protocol for PDF hyperlinks.
 */
export function sanitizePdfUrl(url?: string): string | null {
  if (!url || !url.trim()) return null;
  const trimmed = url.trim();
  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed;
  }
  return `https://${trimmed}`;
}

/**
 * Formats DOI into a valid full URL.
 */
export function formatDoiUrl(doi?: string): string | null {
  if (!doi || !doi.trim()) return null;
  const cleaned = doi.trim().replace(/^doi:\s*/i, '');
  if (/^https?:\/\//i.test(cleaned)) {
    return cleaned;
  }
  return `https://doi.org/${cleaned}`;
}
