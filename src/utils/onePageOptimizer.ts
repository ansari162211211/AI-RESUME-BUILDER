import type { Resume } from '../types/resume';

export interface SimpleOnePageFitAnalysis {
  estimatedPoints: number;
  pageBudgetPoints: number;
  estimatedPages: number;
  fitsOnOnePage: boolean;
  overflowPoints: number;
  overflowPercent: number;
  totalWords: number;
  bulletCount: number;
  advisoryMessage: string;
}

export type OnePageSuggestionTarget =
  | { kind: 'objective' }
  | { kind: 'experience-highlight'; expId: string; bulletIndex: number }
  | { kind: 'project-highlight'; projId: string; bulletIndex: number };

export interface OnePageOptimizationSuggestion {
  id: string;
  sectionLabel: string;
  entryLabel: string;
  reason: 'verbose-bullet' | 'repetitive-verb' | 'long-summary' | 'wordy-lead-in';
  reasonLabel: string;
  originalText: string;
  suggestedText: string;
  wordCountBefore: number;
  wordCountAfter: number;
  target: OnePageSuggestionTarget;
}

const A4_ONE_PAGE_CONTENT_BUDGET_PT = 788;

function countWords(text: string | undefined): number {
  if (!text) return 0;
  return text.trim().split(/\s+/).filter(Boolean).length;
}

function estimateWrappedLines(text: string | undefined, charsPerLine = 104): number {
  if (!text || !text.trim()) return 0;
  const clean = text.replace(/\*\*/g, '').replace(/\[([^\]]+)\]\([^)]+\)/g, '$1');
  return Math.max(1, Math.ceil(clean.trim().length / charsPerLine));
}

export function estimateSimpleOnePageFit(resume: Resume): SimpleOnePageFitAnalysis {
  // Header height (name + contact line + bottom spacing)
  let pts = 50;
  let totalWords =
    countWords(resume.personalInfo?.fullName) +
    countWords(resume.personalInfo?.workAuthorization);
  let bulletCount = 0;

  const hidden = new Set(resume.hiddenSections || []);

  // Optional objective / summary
  if (!hidden.has('objective') && resume.objective?.trim()) {
    const lines = estimateWrappedLines(resume.objective, 104);
    pts += 20 + lines * 10.8;
    totalWords += countWords(resume.objective);
  }

  // Experience
  const experiences = (resume.experience || []).filter(
    (e) => e.company?.trim() || e.position?.trim()
  );
  if (!hidden.has('experience') && experiences.length > 0) {
    pts += 22;
    experiences.forEach((exp, idx) => {
      pts += idx > 0 ? 4 : 0;
      pts += 23; // company/date + position/location rows
      totalWords += countWords(exp.company) + countWords(exp.position) + countWords(exp.location);
      if (exp.description?.trim()) {
        const lines = estimateWrappedLines(exp.description, 102);
        pts += lines * 10.8 + 1.5;
        totalWords += countWords(exp.description);
      }
      const bullets = (exp.highlights || []).filter((h) => h.trim().length > 0);
      bullets.forEach((b) => {
        bulletCount += 1;
        const lines = estimateWrappedLines(b, 100);
        pts += lines * 10.8 + 1.4;
        totalWords += countWords(b);
      });
      const wh = (exp.workHighlights || []).filter((w) => w.title?.trim());
      if (wh.length > 0) {
        bulletCount += 1;
        const joined = `Highlights: ${wh.map((w) => w.title.trim()).join(', ')}`;
        const lines = estimateWrappedLines(joined, 100);
        pts += lines * 10.8 + 1.4;
        totalWords += countWords(joined);
      }
    });
  }

  // Projects
  const projects = (resume.projects || []).filter(
    (p) => p.title?.trim() || p.description?.trim()
  );
  if (!hidden.has('projects') && projects.length > 0) {
    pts += 22;
    projects.forEach((proj, idx) => {
      pts += idx > 0 ? 4 : 0;
      pts += 12.5;
      totalWords += countWords(proj.title);
      if (proj.description?.trim()) {
        const lines = estimateWrappedLines(proj.description, 102);
        pts += lines * 10.8 + 1.2;
        totalWords += countWords(proj.description);
      }
      const bullets = (proj.highlights || []).filter((h) => h.trim().length > 0);
      bullets.forEach((b) => {
        bulletCount += 1;
        const lines = estimateWrappedLines(b, 100);
        pts += lines * 10.8 + 1.4;
        totalWords += countWords(b);
      });
    });
  }

  // Education
  const education = (resume.education || []).filter(
    (ed) => ed.institution?.trim() || ed.degree?.trim()
  );
  if (!hidden.has('education') && education.length > 0) {
    pts += 22;
    education.forEach((ed, idx) => {
      pts += idx > 0 ? 4 : 0;
      pts += 22;
      totalWords += countWords(ed.institution) + countWords(ed.degree) + countWords(ed.specialization);
      const cw = Array.isArray(ed.coursework)
        ? ed.coursework.join(', ')
        : (ed.coursework || '').trim();
      if (cw) {
        pts += estimateWrappedLines(`Coursework: ${cw}`, 100) * 10.8 + 1.2;
        totalWords += countWords(cw);
      }
      if (ed.research?.trim()) {
        pts += estimateWrappedLines(`Research: ${ed.research}`, 100) * 10.8 + 1.2;
        totalWords += countWords(ed.research);
      }
      if (ed.grade?.trim() || ed.honors?.trim() || ed.achievements?.trim()) {
        pts += 11;
      }
    });
  }

  // Skills
  const skills = (resume.skills || []).filter(
    (cat) => cat.category?.trim() && (cat.skills || []).some((s) => s.trim())
  );
  if (!hidden.has('skills') && skills.length > 0) {
    pts += 22;
    skills.forEach((cat) => {
      const rowText = `${cat.category} : ${(cat.skills || []).join(', ')}`;
      pts += estimateWrappedLines(rowText, 104) * 11.0 + 1.5;
      totalWords += countWords(rowText);
    });
  }

  // Optional extras
  const certifications = resume.certifications || [];
  if (!hidden.has('certifications') && certifications.length > 0) {
    pts += 22 + certifications.length * 14;
    totalWords += certifications.reduce((acc, c) => acc + countWords(c.name) + countWords(c.issuer), 0);
  }
  const achievements = resume.achievements || [];
  if (!hidden.has('achievements') && achievements.length > 0) {
    pts += 22 + achievements.length * 14;
    totalWords += achievements.reduce((acc, a) => acc + countWords(a.title) + countWords(a.description), 0);
  }
  const publications = resume.publications || [];
  if (!hidden.has('publications') && publications.length > 0) {
    pts += 22 + publications.length * 18;
    totalWords += publications.reduce((acc, p) => acc + countWords(p.title), 0);
  }
  const leadership = resume.leadership || [];
  if (!hidden.has('leadership') && leadership.length > 0) {
    pts += 22 + leadership.length * 24;
    totalWords += leadership.reduce((acc, l) => acc + countWords(l.role) + countWords(l.organization), 0);
  }
  const volunteer = resume.volunteer || [];
  if (!hidden.has('volunteer') && volunteer.length > 0) {
    pts += 22 + volunteer.length * 22;
  }
  if (!hidden.has('custom-sections') && (resume.customSections || []).length > 0) {
    (resume.customSections || []).forEach((cs) => {
      if (cs.title?.trim() || (cs.bullets || []).length > 0) {
        pts += 22 + Math.max(1, (cs.bullets || []).length) * 13;
      }
    });
  }

  const estimatedPoints = Math.round(pts);
  const fitsOnOnePage = estimatedPoints <= A4_ONE_PAGE_CONTENT_BUDGET_PT;
  const overflowPoints = Math.max(0, estimatedPoints - A4_ONE_PAGE_CONTENT_BUDGET_PT);
  const overflowPercent = fitsOnOnePage
    ? 0
    : Math.round((overflowPoints / A4_ONE_PAGE_CONTENT_BUDGET_PT) * 100);
  const estimatedPages = Math.max(1, Math.ceil(estimatedPoints / A4_ONE_PAGE_CONTENT_BUDGET_PT));

  const advisoryMessage = fitsOnOnePage
    ? `Fits comfortably on 1 A4 page (${totalWords} words across ${bulletCount} concise bullets).`
    : `Estimated ${estimatedPages} pages (~${overflowPercent}% above 1-page A4 target). Your content is preserved cleanly across pages, or use the suggestions below to condense safely.`;

  return {
    estimatedPoints,
    pageBudgetPoints: A4_ONE_PAGE_CONTENT_BUDGET_PT,
    estimatedPages,
    fitsOnOnePage,
    overflowPoints,
    overflowPercent,
    totalWords,
    bulletCount,
    advisoryMessage,
  };
}

const WORDY_LEAD_INS: Array<[RegExp, string]> = [
  [/^was\s+responsible\s+for\s+(?:the\s+)?/i, 'Led '],
  [/^responsible\s+for\s+(?:the\s+)?/i, 'Managed '],
  [/^duties\s+included\s+/i, 'Executed '],
  [/^worked\s+closely\s+with\s+/i, 'Collaborated with '],
  [/^worked\s+on\s+(?:the\s+)?/i, 'Built '],
  [/^helped\s+to\s+/i, 'Assisted in '],
  [/^successfully\s+/i, ''],
  [/^effectively\s+/i, ''],
  [/^actively\s+/i, ''],
];

const REPETITIVE_VERB_SYNONYMS: Record<string, string[]> = {
  built: ['Engineered', 'Developed', 'Implemented'],
  developed: ['Built', 'Engineered', 'Created'],
  created: ['Designed', 'Developed', 'Produced'],
  designed: ['Architected', 'Crafted', 'Shaped'],
  led: ['Spearheaded', 'Directed', 'Coordinated'],
  managed: ['Directed', 'Coordinated', 'Oversaw'],
  worked: ['Collaborated', 'Contributed', 'Delivered'],
  improved: ['Optimized', 'Enhanced', 'Streamlined'],
  analyzed: ['Evaluated', 'Assessed', 'Investigated'],
  implemented: ['Engineered', 'Deployed', 'Delivered'],
};

function tightenBulletWithoutFabrication(raw: string): string {
  let text = raw.trim();
  for (const [pattern, replacement] of WORDY_LEAD_INS) {
    if (pattern.test(text)) {
      text = text.replace(pattern, replacement);
      break;
    }
  }
  // Condense common wordy phrases strictly preserving existing facts
  text = text
    .replace(/\bin order to\b/gi, 'to')
    .replace(/\ba total of\b/gi, '')
    .replace(/\bon a daily basis\b/gi, 'daily')
    .replace(/\bas well as\b/gi, 'and')
    .replace(/\bdue to the fact that\b/gi, 'because')
    .replace(/\bwith the goal of\b/gi, 'to')
    .replace(/\s{2,}/g, ' ')
    .trim();

  if (text.length > 0) {
    text = text.charAt(0).toUpperCase() + text.slice(1);
  }
  return text;
}

export function generateOnePageOptimizationSuggestions(
  resume: Resume
): OnePageOptimizationSuggestion[] {
  const suggestions: OnePageOptimizationSuggestion[] = [];

  // 1. Long summary check (> 42 words)
  if (resume.objective?.trim()) {
    const words = countWords(resume.objective);
    if (words > 42) {
      const sentences = resume.objective
        .trim()
        .split(/(?<=[.!?])\s+/)
        .filter(Boolean);
      const condensed =
        sentences.length > 2
          ? sentences.slice(0, 2).join(' ')
          : tightenBulletWithoutFabrication(resume.objective);
      if (condensed !== resume.objective.trim() && countWords(condensed) < words) {
        suggestions.push({
          id: 'opt-objective',
          sectionLabel: 'Summary',
          entryLabel: 'Profile Summary',
          reason: 'long-summary',
          reasonLabel: `Condense ${words}-word summary for 1-page scanability`,
          originalText: resume.objective.trim(),
          suggestedText: condensed,
          wordCountBefore: words,
          wordCountAfter: countWords(condensed),
          target: { kind: 'objective' },
        });
      }
    }
  }

  // 2. Experience bullets (wordy lead-ins, repetitive verbs, verbose > 25 words)
  (resume.experience || []).forEach((exp) => {
    const seenLeadingVerbs = new Map<string, number>();
    const entryLabel = `${exp.company || 'Experience'} — ${exp.position || 'Role'}`;

    (exp.highlights || []).forEach((rawBullet, bIdx) => {
      const bullet = rawBullet.trim();
      if (!bullet) return;
      const wc = countWords(bullet);
      const plain = bullet.replace(/\*\*/g, '');
      const firstWordMatch = plain.match(/^([A-Za-z]+)\b/);
      const firstWordLower = firstWordMatch ? firstWordMatch[1].toLowerCase() : '';

      // Wordy lead-in
      const tightened = tightenBulletWithoutFabrication(bullet);
      if (tightened !== bullet && tightened.length < bullet.length) {
        suggestions.push({
          id: `opt-exp-${exp.id}-${bIdx}-wordy`,
          sectionLabel: 'Experience',
          entryLabel,
          reason: 'wordy-lead-in',
          reasonLabel: 'Stronger active phrasing without filler words',
          originalText: bullet,
          suggestedText: tightened,
          wordCountBefore: wc,
          wordCountAfter: countWords(tightened),
          target: { kind: 'experience-highlight', expId: exp.id, bulletIndex: bIdx },
        });
        return;
      }

      // Repetitive starting verb in the same role
      if (firstWordLower) {
        const count = seenLeadingVerbs.get(firstWordLower) || 0;
        seenLeadingVerbs.set(firstWordLower, count + 1);
        if (count >= 1 && REPETITIVE_VERB_SYNONYMS[firstWordLower]) {
          const alts = REPETITIVE_VERB_SYNONYMS[firstWordLower];
          const chosen = alts[(count - 1) % alts.length];
          const escapedVerb = firstWordMatch![1].replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
          const replaced = bullet.replace(
            new RegExp(`^(\\*\\*)?${escapedVerb}`),
            (_m, prefix: string | undefined) => `${prefix || ''}${chosen}`
          );
          if (replaced !== bullet) {
            suggestions.push({
              id: `opt-exp-${exp.id}-${bIdx}-verb`,
              sectionLabel: 'Experience',
              entryLabel,
              reason: 'repetitive-verb',
              reasonLabel: `Vary repeated opening verb "${firstWordMatch![1]}"`,
              originalText: bullet,
              suggestedText: replaced,
              wordCountBefore: wc,
              wordCountAfter: countWords(replaced),
              target: { kind: 'experience-highlight', expId: exp.id, bulletIndex: bIdx },
            });
            return;
          }
        }
      }

      // Long bullet (> 26 words)
      if (wc > 26) {
        const clauses = bullet.split(/\s*;\s*/);
        const shorter =
          clauses.length > 2
            ? clauses.slice(0, 2).join('; ')
            : bullet.replace(/\s*\([^)]{15,}\)/g, '').replace(/\s{2,}/g, ' ').trim();
        if (shorter !== bullet && countWords(shorter) < wc) {
          suggestions.push({
            id: `opt-exp-${exp.id}-${bIdx}-len`,
            sectionLabel: 'Experience',
            entryLabel,
            reason: 'verbose-bullet',
            reasonLabel: `Verbose bullet (${wc} words · keep concise to fit 1 page)`,
            originalText: bullet,
            suggestedText: shorter,
            wordCountBefore: wc,
            wordCountAfter: countWords(shorter),
            target: { kind: 'experience-highlight', expId: exp.id, bulletIndex: bIdx },
          });
        }
      }
    });
  });

  // 3. Project bullets (wordy lead-ins / > 26 words)
  (resume.projects || []).forEach((proj) => {
    const entryLabel = proj.title || 'Project';
    (proj.highlights || []).forEach((rawBullet, bIdx) => {
      const bullet = rawBullet.trim();
      if (!bullet) return;
      const wc = countWords(bullet);
      const tightened = tightenBulletWithoutFabrication(bullet);
      if (tightened !== bullet && tightened.length < bullet.length) {
        suggestions.push({
          id: `opt-proj-${proj.id}-${bIdx}-wordy`,
          sectionLabel: 'Projects',
          entryLabel,
          reason: 'wordy-lead-in',
          reasonLabel: 'Tighten project phrasing with direct action verb',
          originalText: bullet,
          suggestedText: tightened,
          wordCountBefore: wc,
          wordCountAfter: countWords(tightened),
          target: { kind: 'project-highlight', projId: proj.id, bulletIndex: bIdx },
        });
      } else if (wc > 26) {
        const clauses = bullet.split(/\s*;\s*/);
        const shorter = clauses.length > 2 ? clauses.slice(0, 2).join('; ') : bullet;
        if (shorter !== bullet && countWords(shorter) < wc) {
          suggestions.push({
            id: `opt-proj-${proj.id}-${bIdx}-len`,
            sectionLabel: 'Projects',
            entryLabel,
            reason: 'verbose-bullet',
            reasonLabel: `Verbose project bullet (${wc} words)`,
            originalText: bullet,
            suggestedText: shorter,
            wordCountBefore: wc,
            wordCountAfter: countWords(shorter),
            target: { kind: 'project-highlight', projId: proj.id, bulletIndex: bIdx },
          });
        }
      }
    });
  });

  return suggestions;
}

export function applyOnePageSuggestionText(
  resume: Resume,
  target: OnePageSuggestionTarget,
  nextText: string
): Resume {
  const cleanText = nextText.trim();
  if (!cleanText) return resume;

  if (target.kind === 'objective') {
    return {
      ...resume,
      objective: cleanText,
      updatedAt: new Date().toISOString(),
    };
  }

  if (target.kind === 'experience-highlight') {
    return {
      ...resume,
      experience: (resume.experience || []).map((exp) =>
        exp.id === target.expId
          ? {
              ...exp,
              highlights: (exp.highlights || []).map((h, i) =>
                i === target.bulletIndex ? cleanText : h
              ),
            }
          : exp
      ),
      updatedAt: new Date().toISOString(),
    };
  }

  if (target.kind === 'project-highlight') {
    return {
      ...resume,
      projects: (resume.projects || []).map((proj) =>
        proj.id === target.projId
          ? {
              ...proj,
              highlights: (proj.highlights || []).map((h, i) =>
                i === target.bulletIndex ? cleanText : h
              ),
            }
          : proj
      ),
      updatedAt: new Date().toISOString(),
    };
  }

  return resume;
}
