import {
  auth,
  db,
  isFirebaseConfigured,
  doc,
  collection,
  getDocs,
  setDoc,
  deleteDoc,
  query,
  where,
} from './firebase';
import type {
  AtsAnalysisRecord,
  AtsAnalysisResult,
  AtsExtractedResumeDraft,
  AtsJobInputMetadata,
  AtsSuggestion,
  ParsedJobRequirements,
} from '../types/ats';
import {
  generateDeterministicSuggestions,
  isSuggestionFactuallySafe,
  mergeAiJobRequirements,
  parseJobDescriptionDeterministic,
} from '../utils/atsScoringEngine';

const ATS_LOCAL_STORAGE_KEY_PREFIX = 'ats_analyses_';

let atsCloudRulesPending = false;
let loggedAtsPermissionWarning = false;

export function isAtsCloudSyncPending(): boolean {
  return atsCloudRulesPending;
}

function isPermissionDeniedError(error: unknown): boolean {
  const code = (error as any)?.code;
  const msg = error instanceof Error ? error.message : String(error || '');
  const lower = msg.toLowerCase();
  return (
    code === 'permission-denied' ||
    code === 'PERMISSION_DENIED' ||
    lower.includes('missing or insufficient permissions') ||
    lower.includes('permission-denied')
  );
}

function noteAtsCloudPermissionPending(): void {
  atsCloudRulesPending = true;
  if (!loggedAtsPermissionWarning) {
    loggedAtsPermissionWarning = true;
    console.warn(
      'ATS history cloud sync is waiting on published Firestore rules; saving locally in this browser.'
    );
  }
}

function getLocalAtsAnalyses(userId: string): AtsAnalysisRecord[] {
  try {
    const raw = localStorage.getItem(`${ATS_LOCAL_STORAGE_KEY_PREFIX}${userId}`);
    return raw ? (JSON.parse(raw) as AtsAnalysisRecord[]) : [];
  } catch {
    return [];
  }
}

function saveLocalAtsAnalyses(userId: string, records: AtsAnalysisRecord[]): void {
  try {
    localStorage.setItem(`${ATS_LOCAL_STORAGE_KEY_PREFIX}${userId}`, JSON.stringify(records));
  } catch (e) {
    console.warn('Failed to persist ATS analyses in localStorage cache:', e);
  }
}

export async function getUserAtsAnalyses(userId: string): Promise<AtsAnalysisRecord[]> {
  const local = [...getLocalAtsAnalyses(userId)].sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
  );
  if (!isFirebaseConfigured || !auth?.currentUser || auth.currentUser.uid !== userId) {
    return local;
  }

  try {
    const colRef = collection(db, 'users', userId, 'atsAnalyses');
    const q = query(colRef, where('userId', '==', userId));
    const snap = await getDocs(q);
    atsCloudRulesPending = false;
    const list: AtsAnalysisRecord[] = [];
    snap.forEach((d) => {
      list.push(d.data() as AtsAnalysisRecord);
    });
    list.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
    saveLocalAtsAnalyses(userId, list);
    return list;
  } catch (error) {
    if (isPermissionDeniedError(error)) {
      noteAtsCloudPermissionPending();
    } else {
      console.warn('Could not load ATS history from Firestore, using local cache:', error);
    }
    return local;
  }
}

/**
 * Strips undefined values cleanly for Firestore serialization and keeps text within safe doc limits.
 */
function sanitizeForFirestore<T>(obj: T): T {
  return JSON.parse(
    JSON.stringify(obj, (_key, val) => (val === undefined ? null : val))
  ) as T;
}

export async function saveAtsAnalysis(
  userId: string,
  record: AtsAnalysisRecord
): Promise<AtsAnalysisRecord> {
  const now = new Date().toISOString();
  const normalizedRecord: AtsAnalysisRecord = sanitizeForFirestore({
    ...record,
    userId,
    jobDescription: (record.jobDescription || '').slice(0, 24000),
    originalDraft: {
      ...record.originalDraft,
      extractedText: (record.originalDraft?.extractedText || '').slice(0, 30000),
    },
    workingDraft: {
      ...record.workingDraft,
      extractedText: (record.workingDraft?.extractedText || '').slice(0, 30000),
    },
    updatedAt: now,
    createdAt: record.createdAt || now,
  });

  // Always update local cache immediately
  const current = getLocalAtsAnalyses(userId);
  const idx = current.findIndex((item) => item.id === normalizedRecord.id);
  if (idx >= 0) {
    current[idx] = normalizedRecord;
  } else {
    current.unshift(normalizedRecord);
  }
  saveLocalAtsAnalyses(userId, current.slice(0, 50));

  if (isFirebaseConfigured && auth?.currentUser && auth.currentUser.uid === userId) {
    try {
      const docRef = doc(db, 'users', userId, 'atsAnalyses', normalizedRecord.id);
      await setDoc(docRef, normalizedRecord);
      atsCloudRulesPending = false;
    } catch (error) {
      if (isPermissionDeniedError(error)) {
        noteAtsCloudPermissionPending();
      } else {
        console.warn('Firestore ATS save error (saved locally):', error);
      }
    }
  }

  return normalizedRecord;
}

export async function deleteAtsAnalysis(userId: string, analysisId: string): Promise<void> {
  const current = getLocalAtsAnalyses(userId);
  saveLocalAtsAnalyses(
    userId,
    current.filter((item) => item.id !== analysisId)
  );

  if (isFirebaseConfigured && auth?.currentUser && auth.currentUser.uid === userId) {
    try {
      const docRef = doc(db, 'users', userId, 'atsAnalyses', analysisId);
      await deleteDoc(docRef);
      atsCloudRulesPending = false;
    } catch (error) {
      if (isPermissionDeniedError(error)) {
        noteAtsCloudPermissionPending();
      } else {
        console.warn('Firestore ATS delete error:', error);
      }
    }
  }
}

/**
 * Extracts structured job requirements using Gemini AI backend and merges cleanly
 * with deterministic JD parsing so scoring stays grounded even if AI is unavailable.
 */
export async function extractJobRequirementsWithAi(
  jobDescription: string,
  meta: Partial<AtsJobInputMetadata>
): Promise<ParsedJobRequirements> {
  const deterministicBase = parseJobDescriptionDeterministic(jobDescription, meta);

  const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
  const timeoutId = controller ? setTimeout(() => controller.abort(), 18000) : null;

  try {
    const res = await fetch('/api/gemini/ats-extract-jd', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: controller?.signal,
      body: JSON.stringify({
        jobDescription,
        jobTitle: meta.jobTitle || '',
        companyName: meta.companyName || '',
        jobLocation: meta.jobLocation || '',
        experienceLevel: meta.experienceLevel || '',
        industry: meta.industry || '',
      }),
    });

    if (!res.ok) {
      return deterministicBase;
    }

    const data = await res.json();
    if (data?.parsedJob) {
      return mergeAiJobRequirements(deterministicBase, data.parsedJob);
    }
    return deterministicBase;
  } catch (err) {
    console.warn('AI JD extraction unavailable, falling back cleanly to deterministic parser:', err);
    return deterministicBase;
  } finally {
    if (timeoutId) clearTimeout(timeoutId);
  }
}

/**
 * Generates contextual, zero-fabrication ATS improvement suggestions using Gemini AI
 * validated by `isSuggestionFactuallySafe`, combined with deterministic rule-based upgrades.
 */
export async function generateAtsSuggestionsWithAi(
  draft: AtsExtractedResumeDraft,
  parsedJob: ParsedJobRequirements,
  analysis: AtsAnalysisResult
): Promise<AtsSuggestion[]> {
  const deterministic = generateDeterministicSuggestions(draft, parsedJob, analysis);
  const missingCriticalTerms = analysis.missingKeywords
    .filter((k) => k.group === 'critical' || k.group === 'important')
    .map((k) => k.term);

  const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
  const timeoutId = controller ? setTimeout(() => controller.abort(), 20000) : null;

  try {
    const res = await fetch('/api/gemini/ats-suggestions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: controller?.signal,
      body: JSON.stringify({ draft, parsedJob, analysis }),
    });

    if (!res.ok) {
      return deterministic;
    }

    const data = await res.json();
    const rawAiSuggestions: any[] = Array.isArray(data?.suggestions) ? data.suggestions : [];

    const validatedAi: AtsSuggestion[] = [];
    for (let i = 0; i < rawAiSuggestions.length; i += 1) {
      const s = rawAiSuggestions[i];
      if (!s || typeof s.suggestedContent !== 'string' || !s.suggestedContent.trim()) continue;
      const orig = typeof s.originalContent === 'string' ? s.originalContent : '';
      const sugg = s.suggestedContent.trim();

      // Verify exact bullet target if specified
      let validTarget = true;
      if (s.targetField === 'experience-highlight') {
        const exp =
          typeof s.targetEntryIndex === 'number' ? draft.experience[s.targetEntryIndex] : null;
        const bullet =
          exp && typeof s.targetBulletIndex === 'number'
            ? exp.highlights[s.targetBulletIndex]
            : null;
        if (!bullet) validTarget = false;
      } else if (s.targetField === 'project-highlight') {
        const proj =
          typeof s.targetEntryIndex === 'number' ? draft.projects[s.targetEntryIndex] : null;
        const bullet =
          proj && typeof s.targetBulletIndex === 'number'
            ? proj.highlights[s.targetBulletIndex]
            : null;
        if (!bullet) validTarget = false;
      }
      if (!validTarget) continue;

      // Strict anti-fabrication gate
      const baselineForCheck = orig || draft.extractedText;
      if (!isSuggestionFactuallySafe(baselineForCheck, sugg, missingCriticalTerms)) {
        continue;
      }

      if (orig.trim() === sugg.trim()) continue;

      validatedAi.push({
        id: s.id || `ai_sug_${Date.now()}_${i}`,
        category:
          s.category === 'summary' ||
          s.category === 'experience' ||
          s.category === 'projects' ||
          s.category === 'skills' ||
          s.category === 'keyword-alignment'
            ? s.category
            : 'experience',
        priority: s.priority === 'high' || s.priority === 'medium' || s.priority === 'low' ? s.priority : 'medium',
        title: String(s.title || 'Improve Bullet Wording'),
        targetSection: String(s.targetSection || 'Resume Content'),
        targetField:
          s.targetField === 'summary' ||
          s.targetField === 'experience-highlight' ||
          s.targetField === 'project-highlight' ||
          s.targetField === 'skills-organization'
            ? s.targetField
            : 'summary',
        targetEntryIndex: typeof s.targetEntryIndex === 'number' ? s.targetEntryIndex : undefined,
        targetBulletIndex: typeof s.targetBulletIndex === 'number' ? s.targetBulletIndex : undefined,
        originalContent: orig,
        suggestedContent: sugg,
        reason: String(
          s.reason || 'Makes this point clearer and easier for employers to read using your real experience.'
        ),
        relevantRequirement: String(s.relevantRequirement || parsedJob.jobTitle),
        status: 'pending',
        source: 'gemini-ai',
      });
    }

    if (validatedAi.length === 0) {
      return deterministic.slice(0, 5);
    }

    // Merge validated AI suggestions with any non-overlapping deterministic formatting/skills suggestions
    const merged: AtsSuggestion[] = [...validatedAi];
    for (const det of deterministic) {
      const overlaps = merged.some(
        (m) =>
          m.targetField === det.targetField &&
          m.targetEntryIndex === det.targetEntryIndex &&
          m.targetBulletIndex === det.targetBulletIndex
      );
      if (!overlaps) {
        merged.push(det);
      }
    }
    return merged.slice(0, 5);
  } catch (err) {
    console.warn('AI ATS suggestions fallback to deterministic:', err);
    return deterministic;
  } finally {
    if (timeoutId) clearTimeout(timeoutId);
  }
}

/**
 * Calls the dedicated server-side Gemini OCR endpoint for scanned/image PDFs.
 */
export async function runScannedPdfOcrWithAi(
  pdfBase64: string
): Promise<{ rawText: string; warnings: string[] }> {
  const res = await fetch('/api/gemini/ats-ocr-pdf', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ pdfBase64, mimeType: 'application/pdf' }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `OCR failed with status ${res.status}`);
  }

  const data = await res.json();
  return {
    rawText: typeof data.rawText === 'string' ? data.rawText : '',
    warnings: Array.isArray(data.warnings) ? data.warnings : [],
  };
}
