import React, { useState } from 'react';
import {
  CheckCircle2,
  AlertTriangle,
  XCircle,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  ChevronDown,
  ChevronUp,
  Check,
  X,
  Edit3,
  RotateCcw,
  RefreshCw,
  FileText,
} from 'lucide-react';
import type {
  AtsAnalysisRecord,
  AtsAnalysisResult,
  AtsScoreBand,
  AtsSuggestion,
} from '../../types/ats';

interface AtsResultsViewProps {
  record: AtsAnalysisRecord;
  onGoToImproveTab: () => void;
  onUpdateSuggestion: (
    suggestionId: string,
    status: AtsSuggestion['status'],
    editedContent?: string
  ) => void;
  onRerunAnalysis: () => void;
  rerunning: boolean;
}

export interface SimplifiedSkillItem {
  name: string;
  level: 'mandatory' | 'preferred' | 'partial';
}

function normalizeCategoryLabel(rawLabel: string): string {
  switch (rawLabel) {
    case 'Mandatory Keywords':
      return 'Important Job Skills';
    case 'Experience Relevance':
      return 'Project & Experience Match';
    case 'Education & Qualifications':
      return 'Education Check';
    case 'Resume Structure':
      return 'Resume Sections';
    case 'Formatting & Readability':
      return 'Resume Readability';
    default:
      return rawLabel;
  }
}

export function isCompanyToken(skill: string, companyName?: string): boolean {
  const cleanSkill = skill.trim().toLowerCase();
  const cleanCompany = (companyName || '').trim().toLowerCase();
  if (!cleanSkill) return true;
  if (!cleanCompany) return false;
  if (cleanSkill === cleanCompany) return true;
  const companyTokens = cleanCompany
    .split(/[\s,.-]+/)
    .filter((t) => t.length >= 3 && !['inc', 'llc', 'ltd', 'corp', 'group', 'company', 'co'].includes(t));
  return companyTokens.some((tok) => cleanSkill === tok);
}

export function getSkillMatchLists(
  analysis: AtsAnalysisResult,
  companyName?: string
): {
  matchedSkills: string[];
  missingSkills: SimplifiedSkillItem[];
} {
  const matchedSet = new Set<string>();
  const matchedSkills: string[] = [];

  const missingSet = new Set<string>();
  const missingSkills: SimplifiedSkillItem[] = [];

  for (const row of analysis.skillsGap || []) {
    const clean = row.skill.trim();
    if (!clean || isCompanyToken(clean, companyName)) continue;
    const key = clean.toLowerCase();
    if (row.status === 'present') {
      if (!matchedSet.has(key)) {
        matchedSet.add(key);
        matchedSkills.push(clean);
      }
    } else if (!missingSet.has(key)) {
      missingSet.add(key);
      missingSkills.push({
        name: clean,
        level: row.status === 'partial' ? 'partial' : row.requirementLevel,
      });
    }
  }

  for (const mk of analysis.matchedKeywords || []) {
    const clean = mk.term.trim();
    const key = clean.toLowerCase();
    if (clean && !isCompanyToken(clean, companyName) && !matchedSet.has(key) && !missingSet.has(key)) {
      matchedSet.add(key);
      matchedSkills.push(clean);
    }
  }

  for (const missing of analysis.missingKeywords || []) {
    if (missing.group === 'additional') continue;
    const clean = missing.term.trim();
    const key = clean.toLowerCase();
    if (clean && !isCompanyToken(clean, companyName) && !missingSet.has(key) && !matchedSet.has(key)) {
      missingSet.add(key);
      missingSkills.push({
        name: clean,
        level:
          missing.group === 'critical' || missing.group === 'important'
            ? 'mandatory'
            : 'preferred',
      });
    }
  }

  return { matchedSkills, missingSkills };
}

export function getFriendlyBandDisplay(band: AtsScoreBand): {
  label: string;
  text: string;
  bg: string;
  border: string;
  bar: string;
} {
  switch (band) {
    case 'Excellent Match':
      return {
        label: 'Excellent Match',
        text: 'text-emerald-800',
        bg: 'bg-emerald-50',
        border: 'border-emerald-200',
        bar: 'bg-emerald-600',
      };
    case 'Strong Match':
      return {
        label: 'Good Match',
        text: 'text-emerald-800',
        bg: 'bg-emerald-50',
        border: 'border-emerald-200',
        bar: 'bg-emerald-600',
      };
    case 'Moderate Match':
      return {
        label: 'Fair Match',
        text: 'text-amber-800',
        bg: 'bg-amber-50',
        border: 'border-amber-200',
        bar: 'bg-amber-500',
      };
    case 'Needs Improvement':
    case 'Weak Match':
    default:
      return {
        label: band === 'Weak Match' ? 'Low Match' : 'Needs Improvement',
        text: 'text-red-800',
        bg: 'bg-red-50',
        border: 'border-red-200',
        bar: 'bg-red-600',
      };
  }
}

export function getPlainEnglishScoreSummary(
  score: number,
  missingCount: number,
  formattingIssueCount: number
): string {
  if (score >= 85 && missingCount === 0 && formattingIssueCount === 0) {
    return 'Your resume is a great fit for this job and is easy for both hiring managers and scanners to read.';
  }
  if (score >= 70) {
    return missingCount > 0
      ? 'Your resume matches many of the main job needs. Adding any real skills you already have and improving a few lines can raise your score.'
      : 'Your resume matches most of what the employer is looking for. Review the simple tips below to make it even stronger.';
  }
  if (score >= 50) {
    return 'Your resume includes several relevant points, but a few important job skills or details are missing or hard to spot.';
  }
  return 'Your resume is currently missing several key skills from this job post. Review the missing skills and improvement steps below.';
}

export const AtsDetailedAnalysisContent: React.FC<{ record: AtsAnalysisRecord }> = ({
  record,
}) => {
  const analysis = record.latestAnalysis;
  const filteredMissingKeywords = analysis.missingKeywords.filter(
    (k) => k.group !== 'additional' && !isCompanyToken(k.term, record.companyName)
  );
  const filteredSkillsGap = analysis.skillsGap.filter(
    (s) => !isCompanyToken(s.skill, record.companyName)
  );
  const missingGroups: Array<{
    key: 'critical' | 'important' | 'preferred';
    label: string;
    subtitle: string;
  }> = [
    {
      key: 'critical',
      label: 'Important Job Skills Missing',
      subtitle: 'Main skills asked for directly in the job requirements.',
    },
    {
      key: 'important',
      label: 'Key Tools & Qualifications Missing',
      subtitle: 'Common tools or experience listed in the job post.',
    },
    {
      key: 'preferred',
      label: 'Helpful Bonus Skills Missing',
      subtitle: 'Nice-to-have skills if you already have experience with them.',
    },
  ];

  const requiredSkillList = (record.parsedJob.mandatorySkills || []).filter(
    (s) => !isCompanyToken(s, record.companyName)
  );
  const bonusSkillList = (record.parsedJob.preferredSkills || []).filter(
    (s) => !isCompanyToken(s, record.companyName)
  );

  return (
    <div className="space-y-6" data-testid="ats-detailed-analysis-section">
      {/* Category Score Breakdown */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-200 bg-slate-50 flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="text-base font-bold text-[#0f2b5c]">
              Score Breakdown (100 Points Total)
            </h3>
            <p className="text-sm text-slate-600">
              How your resume scored across each part of the check.
            </p>
          </div>
          <span className="text-sm font-semibold text-slate-700 tabular-nums">
            Total: {analysis.overallScore} / 100
          </span>
        </div>

        <div className="divide-y divide-slate-200">
          {analysis.categories.map((cat) => {
            const label = normalizeCategoryLabel(cat.label);
            const barTone =
              cat.percentage >= 80
                ? 'bg-emerald-600'
                : cat.percentage >= 55
                ? 'bg-amber-500'
                : 'bg-red-600';
            return (
              <div key={cat.key} className="p-5">
                <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                  <span className="text-sm font-semibold text-slate-900">{label}</span>
                  <span className="text-sm font-bold text-slate-900 tabular-nums">
                    {cat.earned} / {cat.max}{' '}
                    <span className="text-slate-500 font-normal">({cat.percentage}%)</span>
                  </span>
                </div>

                <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden mb-2.5">
                  <div
                    className={`h-full ${barTone}`}
                    style={{ width: `${Math.min(100, Math.max(0, cat.percentage))}%` }}
                  />
                </div>

                <p className="text-sm text-slate-700">{cat.summary}</p>

                {(cat.evidence.length > 0 || cat.gaps.length > 0) && (
                  <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3 text-xs sm:text-sm">
                    {cat.evidence.length > 0 && (
                      <div className="text-slate-600">
                        <span className="font-semibold text-slate-800">Found in resume: </span>
                        {cat.evidence.join(' · ')}
                      </div>
                    )}
                    {cat.gaps.length > 0 && (
                      <div className="text-red-700">
                        <span className="font-semibold">Needs attention: </span>
                        {cat.gaps.join(' · ')}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Detailed Skill Matching Table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-200 bg-slate-50 flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-base font-bold text-[#0f2b5c]">Detailed Skill Matching</h3>
          <span className="text-xs sm:text-sm text-slate-600 tabular-nums">
            {filteredSkillsGap.filter((s) => s.status === 'present').length} matched ·{' '}
            {filteredSkillsGap.filter((s) => s.status === 'partial').length} partial ·{' '}
            {filteredSkillsGap.filter((s) => s.status === 'missing').length} missing
          </span>
        </div>

        {filteredSkillsGap.length === 0 ? (
          <p className="p-5 text-sm text-slate-600">
            No specific skills were isolated from the job post.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-slate-600 bg-slate-50/60">
                  <th className="py-3 px-4 font-semibold">Skill</th>
                  <th className="py-3 px-4 font-semibold">Importance</th>
                  <th className="py-3 px-4 font-semibold">Match Status</th>
                  <th className="py-3 px-4 font-semibold">Where Found &amp; Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {filteredSkillsGap.map((row, idx) => (
                  <tr key={`${row.skill}_${idx}`} className="hover:bg-slate-50/60">
                    <td className="py-3 px-4 font-semibold text-slate-900 whitespace-nowrap">
                      {row.skill}
                    </td>
                    <td className="py-3 px-4 text-slate-700 whitespace-nowrap">
                      {row.requirementLevel === 'mandatory' ? 'Important' : 'Helpful'}
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      {row.status === 'present' ? (
                        <span className="inline-flex items-center gap-1.5 font-semibold text-emerald-700">
                          <CheckCircle2 className="w-4 h-4" />
                          Matched
                        </span>
                      ) : row.status === 'partial' ? (
                        <span className="inline-flex items-center gap-1.5 font-semibold text-amber-700">
                          <AlertTriangle className="w-4 h-4" />
                          Partially Shown
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 font-semibold text-red-700">
                          <XCircle className="w-4 h-4" />
                          Missing
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-slate-600">
                      {row.evidence.length > 0 && (
                        <span className="font-medium text-slate-800">
                          {row.evidence.join(', ')} —{' '}
                        </span>
                      )}
                      {row.gapNote}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Project & Experience Match + Education Check */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 sm:p-6">
        <h3 className="text-base font-bold text-[#0f2b5c] mb-3">
          Project &amp; Experience Match
        </h3>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pb-4 border-b border-slate-200 text-sm">
          <div>
            <div className="text-xs text-slate-500">Role Match</div>
            <div className="font-bold text-slate-900 capitalize mt-0.5">
              {analysis.experienceAnalysis.roleAlignment.replace('-', ' ')}
            </div>
          </div>
          <div>
            <div className="text-xs text-slate-500">Years of Experience</div>
            <div className="font-bold text-slate-900 tabular-nums mt-0.5">
              {analysis.experienceAnalysis.yearsEstimated !== null
                ? `${analysis.experienceAnalysis.yearsEstimated} yrs`
                : 'Dates not listed'}
              {analysis.experienceAnalysis.yearsRequired !== null &&
                ` / ${analysis.experienceAnalysis.yearsRequired}+ needed`}
            </div>
          </div>
          <div>
            <div className="text-xs text-slate-500">Strong Opening Words</div>
            <div className="font-bold text-slate-900 tabular-nums mt-0.5">
              {analysis.experienceAnalysis.actionVerbRate}%
            </div>
          </div>
          <div>
            <div className="text-xs text-slate-500">Lines With Numbers</div>
            <div className="font-bold text-slate-900 tabular-nums mt-0.5">
              {analysis.experienceAnalysis.quantifiedBulletCount} /{' '}
              {analysis.experienceAnalysis.totalBulletCount}
            </div>
          </div>
        </div>

        <div className="mt-4">
          <div className="text-sm font-semibold text-slate-800 mb-2">
            Wording Notes ({analysis.experienceAnalysis.bulletFeedback.length})
          </div>
          {analysis.experienceAnalysis.bulletFeedback.length === 0 ? (
            <p className="text-sm text-emerald-700">
              Your work and project points already start with clear action words.
            </p>
          ) : (
            <div className="space-y-2.5">
              {analysis.experienceAnalysis.bulletFeedback.map((fb, idx) => (
                <div
                  key={idx}
                  className="border border-slate-200 rounded-lg p-3.5 bg-slate-50 text-sm space-y-1"
                >
                  <div className="font-semibold text-slate-900">{fb.source}</div>
                  <div className="text-slate-700 italic">“{fb.original}”</div>
                  <div className="text-amber-800">{fb.issue}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Keyword Analysis */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white border border-slate-200 rounded-xl p-5 sm:p-6">
          <h3 className="text-base font-bold text-[#0f2b5c] mb-1">
            Keywords Found ({analysis.matchedKeywords.length})
          </h3>
          <p className="text-sm text-slate-600 mb-4">
            Where each job skill or keyword appears in your resume.
          </p>

          {analysis.matchedKeywords.length === 0 ? (
            <p className="text-sm text-slate-500 py-4 border border-dashed border-slate-200 rounded-lg text-center">
              No direct keyword matches found yet.
            </p>
          ) : (
            <div className="divide-y divide-slate-100">
              {analysis.matchedKeywords.map((mk, idx) => (
                <div
                  key={`${mk.term}_${idx}`}
                  className="py-2.5 flex items-start justify-between gap-3 text-sm"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span className="font-semibold text-slate-900">{mk.term}</span>
                  </div>
                  <span className="text-xs text-slate-600 text-right shrink-0">
                    {mk.locations.join(', ')}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-5 sm:p-6 space-y-4">
          <div>
            <h3 className="text-base font-bold text-[#0f2b5c] mb-1">
              Keyword Analysis ({filteredMissingKeywords.length} Missing)
            </h3>
            <p className="text-sm text-slate-600">
              Only add a missing keyword if you genuinely have experience with it.
            </p>
          </div>

          {filteredMissingKeywords.length === 0 ? (
            <p className="text-sm text-emerald-700 py-4 border border-dashed border-emerald-200 rounded-lg text-center">
              All main keywords from the job post appear in your resume.
            </p>
          ) : (
            missingGroups.map((grp) => {
              const items = filteredMissingKeywords.filter((m) => m.group === grp.key);
              if (items.length === 0) return null;
              return (
                <div
                  key={grp.key}
                  className="border border-slate-200 rounded-lg p-3.5 bg-slate-50/70"
                >
                  <div className="text-sm font-semibold text-slate-900">
                    {grp.label} ({items.length})
                  </div>
                  <div className="text-xs text-slate-500 mb-2">{grp.subtitle}</div>
                  <div className="space-y-1.5">
                    {items.map((item, i) => (
                      <div key={`${item.term}_${i}`} className="text-sm text-slate-700">
                        <span className="font-semibold text-slate-900">{item.term}</span>
                        <span className="text-slate-600"> — {item.whyItMatters}</span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Resume Readability & Resume Sections */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white border border-slate-200 rounded-xl p-5 sm:p-6">
          <h3 className="text-base font-bold text-[#0f2b5c] mb-3">Resume Readability</h3>

          {analysis.formattingIssues.length === 0 ? (
            <div className="p-3.5 border border-emerald-200 bg-emerald-50 rounded-lg text-sm text-emerald-800 flex items-start gap-2.5">
              <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-600" />
              <span>
                Good – Your resume is easy to read. Scanners can read your sections and dates in the
                right order.
              </span>
            </div>
          ) : (
            <div className="space-y-3">
              {analysis.formattingIssues.map((issue) => (
                <div
                  key={issue.id}
                  className="border border-slate-200 rounded-lg p-3.5 text-sm space-y-1.5"
                >
                  <div className="font-bold text-slate-900">{issue.title}</div>
                  <p className="text-slate-600">{issue.detail}</p>
                  <p className="text-slate-800">
                    <span className="font-semibold">How to fix: </span>
                    {issue.recommendation}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-5 sm:p-6">
          <h3 className="text-base font-bold text-[#0f2b5c] mb-3">Resume Sections</h3>
          <div className="divide-y divide-slate-100">
            {analysis.structureChecklist.map((sec) => (
              <div key={sec.section} className="py-2.5 flex items-start gap-2.5 text-sm">
                {sec.present ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                ) : (
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                )}
                <div>
                  <div className="font-semibold text-slate-900">{sec.section}</div>
                  <div className="text-xs sm:text-sm text-slate-600 mt-0.5">{sec.note}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Job Requirements & Education Check */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 sm:p-6">
        <h3 className="text-base font-bold text-[#0f2b5c] mb-3">Job Requirements</h3>
        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 text-sm">
          <div>
            <dt className="text-slate-500">Target Role</dt>
            <dd className="font-semibold text-slate-900">
              {record.parsedJob.jobTitle || 'Not listed'}
            </dd>
          </div>
          <div>
            <dt className="text-slate-500">Experience Level</dt>
            <dd className="font-semibold text-slate-900">
              {record.parsedJob.requiredYearsExperience !== null
                ? `${record.parsedJob.requiredYearsExperience}+ years (${record.parsedJob.experienceLevel})`
                : record.parsedJob.experienceLevel || 'Not listed'}
            </dd>
          </div>
          <div className="sm:col-span-2">
            <dt className="text-slate-500">Education Check</dt>
            <dd className="text-slate-800">
              {record.parsedJob.educationRequirement || 'No specific degree required'}
            </dd>
          </div>
          <div className="sm:col-span-2">
            <dt className="text-slate-500">Important Job Skills</dt>
            <dd className="text-slate-800">
              {requiredSkillList.join(', ') || 'None isolated'}
            </dd>
          </div>
          {bonusSkillList.length > 0 && (
            <div className="sm:col-span-2">
              <dt className="text-slate-500">Helpful Bonus Skills</dt>
              <dd className="text-slate-800">{bonusSkillList.join(', ')}</dd>
            </div>
          )}
        </dl>
      </div>
    </div>
  );
};

export const AtsResultsView: React.FC<AtsResultsViewProps> = ({
  record,
  onGoToImproveTab,
  onUpdateSuggestion,
  onRerunAnalysis,
  rerunning,
}) => {
  const [showMoreDetails, setShowMoreDetails] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');

  const analysis = record.latestAnalysis;
  const bandStyle = getFriendlyBandDisplay(analysis.scoreBand);
  const comp = record.comparison;
  const { matchedSkills, missingSkills } = getSkillMatchLists(analysis, record.companyName);

  // Strictly show 3-5 top suggestions cleanly on the main Results Page
  const topSuggestions = [...(record.suggestions || [])]
    .sort((a, b) => {
      const priorityWeight = (p: AtsSuggestion['priority']) =>
        p === 'high' ? 0 : p === 'medium' ? 1 : 2;
      return priorityWeight(a.priority) - priorityWeight(b.priority);
    })
    .slice(0, 5);

  const selectedCount = (record.suggestions || []).filter(
    (s) => s.status === 'accepted' || s.status === 'edited'
  ).length;

  const startEdit = (sug: AtsSuggestion) => {
    setEditingId(sug.id);
    setEditValue(sug.editedContent || sug.suggestedContent || sug.originalContent);
  };

  const saveEdit = (sug: AtsSuggestion) => {
    onUpdateSuggestion(sug.id, 'edited', editValue.trim());
    setEditingId(null);
  };

  return (
    <div className="space-y-6">
      {/* SECTION A – Resume Match Score */}
      <section className="bg-white border border-slate-200 rounded-xl p-6 sm:p-7">
        <div className="max-w-3xl">
          <h2 className="text-lg font-bold text-[#0f2b5c]">Resume Match Score</h2>

          <div className="mt-2 flex flex-wrap items-baseline gap-3">
            <span
              className="text-4xl sm:text-5xl font-bold text-slate-900 tabular-nums tracking-tight"
              data-testid="ats-overall-score"
            >
              {analysis.overallScore}
              <span className="text-xl sm:text-2xl font-medium text-slate-400">/100</span>
            </span>

            <span
              className={`text-sm font-semibold px-3 py-1 border rounded-md ${bandStyle.text} ${bandStyle.bg} ${bandStyle.border}`}
              data-testid="ats-score-band"
            >
              {bandStyle.label}
            </span>
          </div>

          <div className="mt-4 w-full h-3 bg-slate-100 rounded-full overflow-hidden">
            <div
              className={`h-full ${bandStyle.bar} transition-all duration-300`}
              style={{ width: `${Math.min(100, Math.max(0, analysis.overallScore))}%` }}
            />
          </div>

          <p className="mt-4 text-sm sm:text-base text-slate-700 leading-relaxed">
            {getPlainEnglishScoreSummary(
              analysis.overallScore,
              missingSkills.length,
              analysis.formattingIssues.length
            )}
          </p>
        </div>

        {comp && (
          <div
            className="mt-6 pt-5 border-t border-slate-200"
            data-testid="ats-before-after-comparison"
          >
            <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
              <h3 className="text-sm font-bold text-[#0f2b5c]">Before &amp; After Update</h3>
              <span className="text-xs text-slate-500 tabular-nums">
                {comp.appliedSuggestionCount} change(s) applied
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
              <div className="border border-slate-200 rounded-lg p-3.5 bg-slate-50">
                <div className="text-xs text-slate-500">Resume Match</div>
                <div className="mt-1 flex items-center gap-2 font-bold text-slate-900 tabular-nums">
                  <span>{comp.originalScore}</span>
                  <span className="text-slate-400">→</span>
                  <span>{comp.updatedScore}</span>
                  <span
                    className={`inline-flex items-center text-xs font-bold ${
                      comp.scoreDelta > 0
                        ? 'text-emerald-700'
                        : comp.scoreDelta < 0
                        ? 'text-red-700'
                        : 'text-slate-600'
                    }`}
                  >
                    {comp.scoreDelta > 0 ? (
                      <>
                        <ArrowUpRight className="w-3.5 h-3.5" />+{comp.scoreDelta}
                      </>
                    ) : comp.scoreDelta < 0 ? (
                      <>
                        <ArrowDownRight className="w-3.5 h-3.5" />
                        {comp.scoreDelta}
                      </>
                    ) : (
                      <>
                        <Minus className="w-3.5 h-3.5 mr-0.5" />0
                      </>
                    )}
                  </span>
                </div>
              </div>

              <div className="border border-slate-200 rounded-lg p-3.5 bg-slate-50">
                <div className="text-xs text-slate-500">Matched Skills</div>
                <div className="mt-1 font-bold text-slate-900 tabular-nums">
                  {comp.originalMatchedCount} → {comp.updatedMatchedCount}
                </div>
              </div>

              <div className="border border-slate-200 rounded-lg p-3.5 bg-slate-50">
                <div className="text-xs text-slate-500">Format Issues</div>
                <div className="mt-1 font-bold text-slate-900 tabular-nums">
                  {comp.originalFormattingIssuesCount} → {comp.updatedFormattingIssuesCount}
                </div>
              </div>
            </div>

            <p className="text-sm text-slate-700 mt-3">{comp.summaryNote}</p>
          </div>
        )}
      </section>

      {/* SECTION B & C – Strengths & Missing Skills */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* SECTION B – Your Resume Strengths */}
        <section
          className="bg-white border border-slate-200 rounded-xl p-6"
          data-testid="section-strengths"
        >
          <h2 className="text-lg font-bold text-[#0f2b5c]">Your Resume Strengths</h2>
          <p className="text-sm text-slate-600 mt-1 mb-4">
            Matched skills found in your resume ({matchedSkills.length}).
          </p>

          {matchedSkills.length === 0 ? (
            <p className="text-sm text-slate-500 py-4 border border-dashed border-slate-200 rounded-lg text-center">
              No matching job skills were spotted yet. Check your Skills section below.
            </p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {matchedSkills.map((skill, idx) => (
                <span
                  key={`${skill}_${idx}`}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-emerald-200 bg-emerald-50 text-emerald-800 text-sm font-medium"
                >
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span>{skill}</span>
                </span>
              ))}
            </div>
          )}
        </section>

        {/* SECTION C – Skills You Are Missing */}
        <section
          className="bg-white border border-slate-200 rounded-xl p-6"
          data-testid="section-missing-skills"
        >
          <h2 className="text-lg font-bold text-[#0f2b5c]">Skills You Are Missing</h2>
          <p className="text-sm text-slate-600 mt-1 mb-4">
            These skills appear in the job post. Only add a skill below if you genuinely have
            experience with it.
          </p>

          {missingSkills.length === 0 ? (
            <div className="p-4 border border-emerald-200 bg-emerald-50 rounded-lg text-sm text-emerald-800">
              Great news — all main skills listed in the job post appear in your resume.
            </div>
          ) : (
            <div className="flex flex-wrap gap-2">
              {missingSkills.map((item, idx) => (
                <span
                  key={`${item.name}_${idx}`}
                  className={`inline-flex items-center px-3 py-1.5 rounded-md border text-sm font-medium ${
                    item.level === 'mandatory'
                      ? 'border-red-200 bg-red-50 text-red-800'
                      : 'border-amber-200 bg-amber-50 text-amber-900'
                  }`}
                >
                  {item.name}
                </span>
              ))}
            </div>
          )}
        </section>
      </div>

      {/* SECTION D – How to Improve Your Resume */}
      <section
        className="bg-white border border-slate-200 rounded-xl p-6 space-y-5"
        data-testid="section-improve-overview"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
          <div>
            <h2 className="text-lg font-bold text-[#0f2b5c]">How to Improve Your Resume</h2>
            <p className="text-sm text-slate-600 mt-1">
              Simple wording improvements based strictly on your real experience.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={onRerunAnalysis}
              disabled={rerunning}
              data-testid="overview-update-score-btn"
              className="inline-flex items-center justify-center gap-1.5 px-4 py-2 bg-[#0f2b5c] hover:bg-[#0a1e42] text-white text-sm font-semibold rounded-lg transition-colors cursor-pointer disabled:opacity-60 whitespace-nowrap"
            >
              <RefreshCw className={`w-4 h-4 ${rerunning ? 'animate-spin' : ''}`} />
              <span>
                {rerunning
                  ? 'Updating Score...'
                  : `Update Match Score${selectedCount > 0 ? ` (${selectedCount})` : ''}`}
              </span>
            </button>

            <button
              type="button"
              onClick={onGoToImproveTab}
              data-testid="overview-improve-cta-btn"
              className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 border border-slate-300 bg-white hover:bg-slate-50 text-slate-800 text-sm font-semibold rounded-lg transition-colors cursor-pointer whitespace-nowrap"
            >
              <FileText className="w-4 h-4 text-[#0f2b5c]" />
              <span>Preview Updated Text</span>
            </button>
          </div>
        </div>

        {topSuggestions.length === 0 ? (
          <p className="text-sm text-slate-600">
            Your resume wording is already clear and direct. No wording changes are needed.
          </p>
        ) : (
          <div className="space-y-4">
            {topSuggestions.map((sug) => {
              const isEditing = editingId === sug.id;
              return (
                <div
                  key={sug.id}
                  data-testid={`overview-suggestion-${sug.id}`}
                  className={`border rounded-lg p-4 sm:p-5 space-y-3 ${
                    sug.status === 'accepted' || sug.status === 'edited'
                      ? 'border-emerald-200 bg-emerald-50/25'
                      : sug.status === 'rejected'
                      ? 'border-slate-200 bg-slate-50 opacity-75'
                      : 'border-slate-200 bg-white'
                  }`}
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <div className="text-xs font-semibold text-slate-500 mb-0.5">
                        What needs improvement · {sug.targetSection}
                      </div>
                      <h3 className="text-base font-bold text-slate-900">{sug.title}</h3>
                    </div>

                    <span className="text-xs font-semibold text-slate-600">
                      {sug.status === 'accepted'
                        ? 'Accepted'
                        : sug.status === 'edited'
                        ? 'Edited'
                        : sug.status === 'rejected'
                        ? 'Rejected'
                        : 'Pending'}
                    </span>
                  </div>

                  <p className="text-sm text-slate-700">
                    <span className="font-semibold text-slate-900">Why it matters: </span>
                    {sug.reason}
                  </p>

                  <div className="border border-slate-200 rounded-lg p-3.5 bg-slate-50/70 space-y-1.5">
                    <div className="text-xs font-semibold text-slate-600">Suggested change</div>
                    {isEditing ? (
                      <div className="space-y-2">
                        <textarea
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          rows={3}
                          className="w-full p-2.5 border border-slate-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#0f2b5c]"
                        />
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => saveEdit(sug)}
                            className="px-3.5 py-1.5 bg-[#0f2b5c] hover:bg-[#0a1e42] text-white text-sm font-semibold rounded-lg cursor-pointer"
                          >
                            Save
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditingId(null)}
                            className="px-3.5 py-1.5 border border-slate-300 bg-white text-slate-700 text-sm font-semibold rounded-lg cursor-pointer"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <p className="text-sm text-slate-900 whitespace-pre-wrap leading-relaxed">
                        {sug.status === 'edited' && sug.editedContent
                          ? sug.editedContent
                          : sug.suggestedContent}
                      </p>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    {sug.status !== 'accepted' && (
                      <button
                        type="button"
                        onClick={() => onUpdateSuggestion(sug.id, 'accepted')}
                        className="inline-flex items-center px-3.5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white text-sm font-semibold rounded-lg cursor-pointer"
                      >
                        <Check className="w-4 h-4 mr-1.5" />
                        Accept Suggestion
                      </button>
                    )}

                    {!isEditing && (
                      <button
                        type="button"
                        onClick={() => startEdit(sug)}
                        className="inline-flex items-center px-3.5 py-2 border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-sm font-semibold rounded-lg cursor-pointer"
                      >
                        <Edit3 className="w-4 h-4 mr-1.5" />
                        Edit
                      </button>
                    )}

                    {sug.status !== 'rejected' && (
                      <button
                        type="button"
                        onClick={() => onUpdateSuggestion(sug.id, 'rejected')}
                        className="inline-flex items-center px-3.5 py-2 border border-slate-300 bg-white hover:bg-red-50 hover:text-red-700 hover:border-red-200 text-slate-700 text-sm font-semibold rounded-lg cursor-pointer"
                      >
                        <X className="w-4 h-4 mr-1.5" />
                        Reject
                      </button>
                    )}

                    {sug.status !== 'pending' && (
                      <button
                        type="button"
                        onClick={() => onUpdateSuggestion(sug.id, 'pending')}
                        className="inline-flex items-center px-3 py-2 text-slate-600 hover:text-slate-900 text-sm font-semibold rounded-lg cursor-pointer"
                      >
                        <RotateCcw className="w-4 h-4 mr-1.5" />
                        Restore
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* SECTION E – Resume Format Check */}
      <section
        className="bg-white border border-slate-200 rounded-xl p-6 space-y-3"
        data-testid="section-format-check"
      >
        <h2 className="text-lg font-bold text-[#0f2b5c]">Resume Format Check</h2>

        {analysis.formattingIssues.length === 0 ? (
          <div className="p-4 border border-emerald-200 bg-emerald-50 rounded-lg text-sm text-emerald-900 flex items-start gap-2.5">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
            <div>
              <div className="font-bold">Good – Your resume is easy to read.</div>
              <p className="text-emerald-800 mt-0.5">
                Standard layout and clear section headings help scanners read your resume in the
                right order.
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="p-4 border border-amber-200 bg-amber-50 rounded-lg text-sm text-amber-900 flex items-start gap-2.5">
              <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <div className="font-bold">
                  Needs Improvement – Some formatting issues were found.
                </div>
                <p className="text-amber-800 mt-0.5">
                  Review the notes below so automated scanners can read all of your details cleanly.
                </p>
              </div>
            </div>

            <div className="space-y-2.5">
              {analysis.formattingIssues.map((issue) => (
                <div
                  key={issue.id}
                  className="border border-slate-200 rounded-lg p-4 text-sm space-y-1 bg-slate-50/70"
                >
                  <div className="font-bold text-slate-900">{issue.title}</div>
                  <p className="text-slate-600">{issue.detail}</p>
                  <p className="text-slate-800">
                    <span className="font-semibold">How to fix: </span>
                    {issue.recommendation}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>

      {/* COLLAPSIBLE MORE DETAILS ACCORDION (Hidden by Default) */}
      <section className="space-y-4">
        <button
          type="button"
          onClick={() => setShowMoreDetails((v) => !v)}
          data-testid="toggle-detailed-analysis-btn"
          aria-expanded={showMoreDetails}
          className="w-full bg-white border border-slate-200 hover:border-slate-300 rounded-xl px-6 py-4 flex items-center justify-between text-left transition-colors cursor-pointer"
        >
          <div>
            <div className="text-base font-bold text-[#0f2b5c]">More Details</div>
            <div className="text-sm text-slate-600">
              Open detailed skill matching, education check, project and experience match, resume
              sections, readability, and job requirements.
            </div>
          </div>
          {showMoreDetails ? (
            <ChevronUp className="w-5 h-5 text-slate-600 shrink-0" />
          ) : (
            <ChevronDown className="w-5 h-5 text-slate-600 shrink-0" />
          )}
        </button>

        {showMoreDetails && <AtsDetailedAnalysisContent record={record} />}
      </section>
    </div>
  );
};
