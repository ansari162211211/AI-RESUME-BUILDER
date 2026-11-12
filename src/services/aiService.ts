import type {
  Resume,
  AiImproveResult,
  CvCompletenessReport,
  CvExtractionResult,
} from '../types/resume';
import { analyzeResumeSections } from '../utils/validation';

/**
 * Extract CV information from an uploaded PDF (or raw text) via Gemini AI.
 */
export async function extractCvWithGemini(
  pdfBase64?: string,
  rawText?: string,
  mimeType: string = 'application/pdf'
): Promise<CvExtractionResult> {
  try {
    const res = await fetch('/api/gemini/extract-cv', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        pdfBase64,
        rawText,
        mimeType,
      }),
    });

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      throw new Error(errorData.error || `Server extraction failed with status ${res.status}`);
    }

    const data = await res.json();
    return {
      extractedData: data.extractedData || {},
      confidence: 'high',
    };
  } catch (err: any) {
    console.error('extractCvWithGemini error:', err);
    throw err;
  }
}

/**
 * Improve CV text (objectives, job highlights, project descriptions) with Gemini AI.
 */
export async function improveTextWithGemini(
  text: string,
  sectionType: string = 'general',
  context: string = ''
): Promise<AiImproveResult> {
  try {
    const res = await fetch('/api/gemini/improve-text', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text,
        sectionType,
        context,
      }),
    });

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      throw new Error(errorData.error || `AI Improve request failed: ${res.status}`);
    }

    const data = await res.json();
    return {
      original: data.original || text,
      improved: data.improved || text,
      alternative: data.alternative || '',
      explanation: data.explanation || 'Refined for academic conciseness and strong action verbs.',
    };
  } catch (err: any) {
    console.warn('improveTextWithGemini network error, using client-side heuristic:', err);
    // Graceful fallback enhancement if offline
    return {
      original: text,
      improved: text.replace(/^I\s+/i, '').replace(/\bwas responsible for\b/gi, 'Spearheaded and directed'),
      alternative: text.replace(/\bmanaged\b/gi, 'Orchestrated'),
      explanation: 'Locally formatted with strong academic active phrasing.',
    };
  }
}

/**
 * Perform one conversational turn in "Build My CV with AI".
 */
export async function sendInterviewStepWithGemini(
  conversationHistory: Array<{ role: 'user' | 'assistant'; content: string }>,
  currentResume: Partial<Resume>,
  activeSection: string,
  userMessage?: string
): Promise<{
  reply: string;
  structuredUpdates: Partial<Resume>;
  isSectionCompleted: boolean;
  nextSection: string;
  suggestedChips: string[];
}> {
  try {
    const res = await fetch('/api/gemini/interview-step', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        conversationHistory,
        currentResume,
        activeSection,
        userMessage,
      }),
    });

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      throw new Error(errorData.error || `Interview step failed: ${res.status}`);
    }

    return await res.json();
  } catch (err: any) {
    console.warn('sendInterviewStepWithGemini offline/fallback:', err);
    return {
      reply: `Thanks for providing those details! Let's continue capturing your academic background. What were your key responsibilities and tools used?`,
      structuredUpdates: {},
      isSectionCompleted: false,
      nextSection: activeSection,
      suggestedChips: ['Skip to next section', 'Add more details', 'Looks good'],
    };
  }
}

/**
 * Generate full completeness and missing-field audit across all 14 sections.
 */
export async function fetchCompletenessAudit(
  resume: Partial<Resume>
): Promise<CvCompletenessReport> {
  try {
    const res = await fetch('/api/gemini/analyze-completeness', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ resume }),
    });

    if (res.ok) {
      const data = await res.json();
      if (data.report && Array.isArray(data.report.sections)) {
        return data.report;
      }
    }
  } catch (err) {
    console.warn('Backend completeness check unavailable, using deterministic analyzer:', err);
  }

  // Deterministic fallback always scores accurately:
  return analyzeResumeSections(resume);
}
