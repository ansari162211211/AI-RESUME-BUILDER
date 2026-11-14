import type {
  Resume,
  AiImproveResult,
  CvCompletenessReport,
  CvExtractionResult,
} from '../types/resume';
import { resolveTemplateId } from '../data/templates';
import {
  buildAdaptiveCreativeFallback,
  buildAdaptiveEngineeringFallback,
  buildAdaptiveInternshipFallback,
} from '../utils/aiInterviewHelpers';
import { analyzeResumeSections } from '../utils/validation';

const INTERNSHIP_FALLBACK_FLOW = [
  'personalInfo',
  'education',
  'learning',
  'interests',
  'research',
  'career-interests',
  'achievements',
  'skills',
  'experience',
  'custom-sections',
];

const ENGINEERING_FALLBACK_FLOW = [
  'personalInfo',
  'objective',
  'education',
  'skills',
  'projects',
  'experience',
  'leadership',
  'achievements',
  'custom-sections',
];

const CREATIVE_FALLBACK_FLOW = [
  'personalInfo',
  'experience',
  'education',
  'skills',
  'proficiency-circles',
  'skill-bars',
  'communication',
  'certifications',
  'languages',
  'publications',
  'custom-sections',
];

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
  context: string = '',
  templateId: string = 'academic-cv'
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
        template: templateId,
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
  const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
  const timeoutId = controller ? setTimeout(() => controller.abort(), 7000) : null;
  try {
    const res = await fetch('/api/gemini/interview-step', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      signal: controller?.signal,
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
    const tplId = resolveTemplateId(currentResume.template);
    const lastUserMessage =
      userMessage ||
      conversationHistory
        .slice()
        .reverse()
        .find((m) => m.role === 'user')?.content ||
      '';
    if (tplId === 'internship-resume') {
      return buildAdaptiveInternshipFallback(
        lastUserMessage,
        currentResume,
        activeSection,
        INTERNSHIP_FALLBACK_FLOW
      );
    }
    if (tplId === 'engineering-resume') {
      return buildAdaptiveEngineeringFallback(
        lastUserMessage,
        currentResume,
        activeSection,
        ENGINEERING_FALLBACK_FLOW
      );
    }
    if (tplId === 'creative-professional') {
      return buildAdaptiveCreativeFallback(
        lastUserMessage,
        currentResume,
        activeSection,
        CREATIVE_FALLBACK_FLOW
      );
    }
    return {
      reply: `Thanks for providing those details! Let's continue capturing your academic background. What were your key responsibilities and tools used?`,
      structuredUpdates: {},
      isSectionCompleted: false,
      nextSection: activeSection,
      suggestedChips: ['Skip to next section', 'Add more details', 'Looks good'],
    };
  } finally {
    if (timeoutId) clearTimeout(timeoutId);
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
