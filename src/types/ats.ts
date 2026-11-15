export type AtsInputSource = 'upload' | 'existing-resume';

export type AtsDocumentFormat = 'pdf' | 'docx' | 'txt' | 'resume-record';

export interface AtsExperienceDraft {
  id: string;
  position: string;
  company: string;
  location?: string;
  startDate: string;
  endDate: string;
  current?: boolean;
  highlights: string[];
}

export interface AtsEducationDraft {
  id: string;
  degree: string;
  institution: string;
  specialization?: string;
  location?: string;
  startDate: string;
  endDate: string;
  grade?: string;
}

export interface AtsProjectDraft {
  id: string;
  title: string;
  description?: string;
  technologies: string[];
  highlights: string[];
}

export interface AtsCertificationDraft {
  id: string;
  name: string;
  issuer: string;
  issueDate?: string;
}

export interface AtsLayoutHints {
  isTwoColumnLayout: boolean;
  hasVisualSkillBarsOrCircles: boolean;
  hasTablesOrColumnsInText: boolean;
  hasInconsistentDates: boolean;
  isTextTooDenseOrUnbulleted: boolean;
}

export interface AtsExtractedResumeDraft {
  sourceType: AtsInputSource;
  fileName: string;
  fileFormat: AtsDocumentFormat;
  fileSizeBytes?: number;
  pageCount?: number;
  isScannedPdf?: boolean;
  usedAiOcr?: boolean;
  sourceResumeId?: string;
  sourceTemplateId?: string;
  extractedText: string;
  extractionWarnings: string[];
  extractionNotes: string[];
  personalInfo: {
    fullName: string;
    jobTitle?: string;
    email: string;
    phone: string;
    location: string;
    linkedin?: string;
    github?: string;
    website?: string;
  };
  summary: string;
  experience: AtsExperienceDraft[];
  education: AtsEducationDraft[];
  projects: AtsProjectDraft[];
  skills: string[];
  skillCategories: Array<{ category: string; skills: string[] }>;
  certifications: AtsCertificationDraft[];
  achievements: string[];
  detectedSections: string[];
  missingStandardSections: string[];
  layoutHints: AtsLayoutHints;
}

export interface AtsJobKeyword {
  term: string;
  importance: 'critical' | 'important' | 'preferred' | 'relevant';
  category: 'technical' | 'soft' | 'domain' | 'qualification' | 'action';
}

export interface ParsedJobRequirements {
  jobTitle: string;
  companyName: string;
  jobLocation: string;
  experienceLevel: string;
  industry: string;
  requiredYearsExperience: number | null;
  educationRequirement: string;
  mandatorySkills: string[];
  preferredSkills: string[];
  technicalSkills: string[];
  softSkills: string[];
  certifications: string[];
  keyResponsibilities: string[];
  highSignalKeywords: AtsJobKeyword[];
  parsedBy: 'gemini-ai' | 'deterministic';
  aiNote?: string;
}

export type AtsScoreCategoryKey =
  | 'keywordMatch'
  | 'skillsMatch'
  | 'experienceRelevance'
  | 'educationQualifications'
  | 'resumeStructure'
  | 'formattingReadability'
  | 'contactInformation';

export interface AtsScoreCategory {
  key: AtsScoreCategoryKey;
  label: string;
  earned: number;
  max: number;
  percentage: number;
  summary: string;
  evidence: string[];
  gaps: string[];
}

export type AtsScoreBand =
  | 'Excellent Match'
  | 'Strong Match'
  | 'Moderate Match'
  | 'Needs Improvement'
  | 'Weak Match';

export interface AtsMatchedKeyword {
  term: string;
  importance: 'critical' | 'important' | 'preferred' | 'relevant';
  locations: string[];
  matchType: 'exact' | 'alias';
}

export interface AtsMissingKeyword {
  term: string;
  group: 'critical' | 'important' | 'preferred' | 'additional';
  whyItMatters: string;
  guidance: string;
}

export interface AtsSkillsGapItem {
  skill: string;
  requirementLevel: 'mandatory' | 'preferred';
  status: 'present' | 'partial' | 'missing';
  evidence: string[];
  gapNote: string;
}

export interface AtsFormattingIssue {
  id: string;
  severity: 'high' | 'medium' | 'low';
  title: string;
  detail: string;
  recommendation: string;
}

export interface AtsExperienceFinding {
  relevanceSummary: string;
  yearsEstimated: number | null;
  yearsRequired: number | null;
  roleAlignment: 'strong' | 'moderate' | 'partial' | 'entry-level';
  actionVerbRate: number;
  quantifiedBulletCount: number;
  totalBulletCount: number;
  bulletFeedback: Array<{
    source: string;
    original: string;
    issue: string;
    suggestionHint: string;
  }>;
}

export interface AtsAnalysisResult {
  overallScore: number;
  scoreBand: AtsScoreBand;
  scoreDisclaimer: string;
  categories: AtsScoreCategory[];
  matchedKeywords: AtsMatchedKeyword[];
  missingKeywords: AtsMissingKeyword[];
  skillsGap: AtsSkillsGapItem[];
  experienceAnalysis: AtsExperienceFinding;
  formattingIssues: AtsFormattingIssue[];
  structureChecklist: Array<{
    section: string;
    present: boolean;
    note: string;
  }>;
  topPriorities: string[];
  scoreExplanation: string;
}

export type AtsSuggestionCategory =
  | 'summary'
  | 'experience'
  | 'projects'
  | 'achievements'
  | 'skills'
  | 'structure'
  | 'keyword-alignment';

export type AtsSuggestionStatus = 'pending' | 'accepted' | 'edited' | 'rejected';

export interface AtsSuggestion {
  id: string;
  category: AtsSuggestionCategory;
  priority: 'high' | 'medium' | 'low';
  title: string;
  targetSection: string;
  targetField:
    | 'summary'
    | 'experience-highlight'
    | 'project-highlight'
    | 'skills-organization'
    | 'achievement'
    | 'structure-note';
  targetEntryIndex?: number;
  targetBulletIndex?: number;
  originalContent: string;
  suggestedContent: string;
  editedContent?: string;
  reason: string;
  relevantRequirement: string;
  status: AtsSuggestionStatus;
  source: 'gemini-ai' | 'rule-based';
}

export interface AtsComparisonSnapshot {
  originalScore: number;
  updatedScore: number;
  scoreDelta: number;
  originalMatchedCount: number;
  updatedMatchedCount: number;
  originalMissingCount: number;
  updatedMissingCount: number;
  originalFormattingIssuesCount: number;
  updatedFormattingIssuesCount: number;
  resolvedIssues: string[];
  remainingIssues: string[];
  appliedSuggestionCount: number;
  summaryNote: string;
}

export interface AtsAnalysisRecord {
  id: string;
  userId: string;
  resumeName: string;
  sourceType: AtsInputSource;
  sourceResumeId?: string;
  sourceTemplateId?: string;
  jobTitle: string;
  companyName: string;
  jobLocation?: string;
  experienceLevel?: string;
  industry?: string;
  jobDescription: string;
  originalScore: number;
  latestScore: number;
  scoreBand: AtsScoreBand;
  improvementStatus: 'initial' | 'improved' | 'in-review';
  originalDraft: AtsExtractedResumeDraft;
  workingDraft: AtsExtractedResumeDraft;
  parsedJob: ParsedJobRequirements;
  initialAnalysis: AtsAnalysisResult;
  latestAnalysis: AtsAnalysisResult;
  suggestions: AtsSuggestion[];
  comparison?: AtsComparisonSnapshot;
  createdAt: string;
  updatedAt: string;
}

export interface AtsJobInputMetadata {
  jobTitle: string;
  companyName: string;
  jobLocation: string;
  experienceLevel: string;
  industry: string;
}
