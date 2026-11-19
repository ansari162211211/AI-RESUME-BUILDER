import type { Resume } from '../types/resume';
import { getTemplateById } from '../data/templates';
import type {
  AtsAnalysisResult,
  AtsCertificationDraft,
  AtsComparisonSnapshot,
  AtsDocumentFormat,
  AtsEducationDraft,
  AtsExperienceDraft,
  AtsExperienceFinding,
  AtsExtractedResumeDraft,
  AtsFormattingIssue,
  AtsJobKeyword,
  AtsMatchedKeyword,
  AtsMissingKeyword,
  AtsProjectDraft,
  AtsScoreBand,
  AtsScoreCategory,
  AtsSkillsGapItem,
  AtsSuggestion,
  ParsedJobRequirements,
} from '../types/ats';

export const MAX_RESUME_UPLOAD_BYTES = 15 * 1024 * 1024; // 15 MB

export interface FileValidationResult {
  valid: boolean;
  format?: AtsDocumentFormat;
  error?: string;
}

export function validateResumeUploadFile(
  fileName: string,
  mimeType: string,
  fileSizeBytes: number
): FileValidationResult {
  const cleanName = (fileName || '').trim();
  if (!cleanName) {
    return { valid: false, error: 'Please select a resume file to upload.' };
  }
  if (!Number.isFinite(fileSizeBytes) || fileSizeBytes <= 0) {
    return { valid: false, error: 'The uploaded file appears to be empty (0 bytes).' };
  }
  if (fileSizeBytes > MAX_RESUME_UPLOAD_BYTES) {
    return {
      valid: false,
      error: `File size exceeds the 15 MB limit (${(fileSizeBytes / (1024 * 1024)).toFixed(1)} MB uploaded). Please compress or upload a smaller file.`,
    };
  }

  const lowerName = cleanName.toLowerCase();
  const lowerMime = (mimeType || '').toLowerCase();

  if (lowerName.endsWith('.pdf') || lowerMime === 'application/pdf') {
    if (!lowerName.endsWith('.pdf') && lowerMime !== 'application/pdf') {
      return { valid: false, error: 'File extension and MIME type do not match a valid PDF document.' };
    }
    return { valid: true, format: 'pdf' };
  }

  if (
    lowerName.endsWith('.docx') ||
    lowerMime === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ) {
    if (lowerName.endsWith('.doc')) {
      return {
        valid: false,
        error: 'Legacy binary .doc files are not supported. Please save your document as .docx or .pdf and re-upload.',
      };
    }
    return { valid: true, format: 'docx' };
  }

  if (lowerName.endsWith('.txt') || lowerMime === 'text/plain') {
    return { valid: true, format: 'txt' };
  }

  if (lowerName.endsWith('.doc')) {
    return {
      valid: false,
      error: 'Legacy .doc format is not supported. Please convert it to .docx, .pdf, or .txt.',
    };
  }

  return {
    valid: false,
    error: `Unsupported file format for "${cleanName}". Supported formats are PDF (.pdf), Word (.docx), and Plain Text (.txt).`,
  };
}

export interface JobValidationResult {
  valid: boolean;
  wordCount: number;
  error?: string;
}

export function validateJobDescriptionInput(jobDescription: string): JobValidationResult {
  const trimmed = (jobDescription || '').trim();
  const words = trimmed ? trimmed.split(/\s+/).filter(Boolean) : [];
  if (words.length < 20 && trimmed.length < 120) {
    return {
      valid: false,
      wordCount: words.length,
      error:
        'Please paste a complete job description (at least 20 words or 120 characters including role requirements and skills) to run an accurate ATS match.',
    };
  }
  return { valid: true, wordCount: words.length };
}

/* ========================================================================== */
/* NORMALIZATION, ALIASES & LEXICONS                                          */
/* ========================================================================== */

const SKILL_ALIASES: Record<string, string[]> = {
  javascript: ['javascript', 'js', 'ecmascript', 'es6'],
  typescript: ['typescript', 'ts'],
  react: ['react', 'react.js', 'reactjs'],
  'next.js': ['next.js', 'nextjs', 'next'],
  'node.js': ['node.js', 'nodejs', 'node'],
  python: ['python', 'py'],
  java: ['java'],
  'c++': ['c++', 'cpp'],
  'c#': ['c#', 'csharp'],
  go: ['golang', 'go language'],
  rust: ['rust'],
  sql: ['sql', 'structured query language'],
  postgresql: ['postgresql', 'postgres', 'psql'],
  mysql: ['mysql'],
  mongodb: ['mongodb', 'mongo'],
  redis: ['redis'],
  graphql: ['graphql'],
  'rest api': ['rest api', 'rest apis', 'restful api', 'restful apis', 'rest'],
  docker: ['docker', 'containerization', 'containers'],
  kubernetes: ['kubernetes', 'k8s'],
  aws: ['aws', 'amazon web services'],
  gcp: ['gcp', 'google cloud', 'google cloud platform'],
  azure: ['azure', 'microsoft azure'],
  'ci/cd': ['ci/cd', 'cicd', 'continuous integration', 'continuous deployment', 'github actions', 'jenkins'],
  git: ['git', 'github', 'gitlab'],
  linux: ['linux', 'unix', 'bash', 'shell scripting'],
  terraform: ['terraform', 'iac', 'infrastructure as code'],
  'tailwind css': ['tailwind', 'tailwind css', 'tailwindcss'],
  html: ['html', 'html5'],
  css: ['css', 'css3'],
  express: ['express', 'express.js', 'expressjs'],
  django: ['django'],
  flask: ['flask'],
  fastapi: ['fastapi'],
  'spring boot': ['spring boot', 'springboot', 'spring'],
  'machine learning': ['machine learning', 'ml'],
  'deep learning': ['deep learning', 'dl'],
  'natural language processing': ['natural language processing', 'nlp'],
  pytorch: ['pytorch'],
  tensorflow: ['tensorflow'],
  pandas: ['pandas'],
  numpy: ['numpy'],
  'scikit-learn': ['scikit-learn', 'sklearn'],
  'data structures': ['data structures', 'dsa', 'algorithms'],
  'system design': ['system design', 'distributed systems', 'microservices'],
  testing: ['unit testing', 'integration testing', 'jest', 'vitest', 'playwright', 'cypress', 'pytest', 'automated testing'],
  agile: ['agile', 'scrum', 'kanban'],
  figma: ['figma'],
  cybersecurity: ['cybersecurity', 'information security', 'infosec', 'appsec', 'owasp', 'penetration testing'],
  'firebase': ['firebase', 'firestore'],
  'c': ['c programming', 'ansi c'],
  autocad: ['autocad'],
  solidworks: ['solidworks'],
  matlab: ['matlab'],
  simulink: ['simulink'],
  ansys: ['ansys'],
  verilog: ['verilog', 'systemverilog', 'fpga'],
  vhdl: ['vhdl'],
  'embedded systems': ['embedded systems', 'microcontrollers', 'rtos', 'arm cortex'],
};

const KNOWN_TECHNICAL_SKILLS: string[] = [
  'JavaScript', 'TypeScript', 'React', 'Next.js', 'Vue.js', 'Angular', 'Node.js', 'Express',
  'Python', 'Django', 'Flask', 'FastAPI', 'Java', 'Spring Boot', 'C++', 'C#', '.NET', 'Go', 'Rust',
  'SQL', 'PostgreSQL', 'MySQL', 'MongoDB', 'Redis', 'Elasticsearch', 'Firebase', 'Firestore',
  'GraphQL', 'REST API', 'gRPC', 'Microservices', 'Distributed Systems', 'System Design',
  'Docker', 'Kubernetes', 'AWS', 'GCP', 'Azure', 'Terraform', 'CI/CD', 'Git', 'Linux', 'Bash',
  'HTML', 'CSS', 'Tailwind CSS', 'Sass', 'Webpack', 'Vite',
  'Unit Testing', 'Jest', 'Vitest', 'Playwright', 'Cypress', 'PyTest', 'Selenium',
  'Machine Learning', 'Deep Learning', 'PyTorch', 'TensorFlow', 'Scikit-learn', 'Pandas', 'NumPy',
  'Natural Language Processing', 'Computer Vision', 'LLM', 'RAG', 'Tableau', 'Power BI', 'Spark', 'Kafka',
  'Cybersecurity', 'OWASP', 'Penetration Testing', 'OAuth', 'JWT', 'SSO', 'SIEM', 'IAM',
  'Figma', 'UI/UX', 'Accessibility', 'WCAG',
  'AutoCAD', 'SolidWorks', 'MATLAB', 'Simulink', 'ANSYS', 'Verilog', 'VHDL', 'Embedded Systems',
  'Agile', 'Scrum', 'Jira',
];

const KNOWN_SOFT_SKILLS: string[] = [
  'cross-functional collaboration', 'collaboration', 'communication', 'technical writing',
  'problem solving', 'analytical thinking', 'mentorship', 'mentoring', 'leadership',
  'stakeholder management', 'code review', 'project management', 'ownership', 'debugging',
  'incident response', 'documentation', 'presentation', 'teamwork', 'adaptability',
];

const KNOWN_CERTIFICATIONS: string[] = [
  'AWS Certified Solutions Architect', 'AWS Certified Developer', 'AWS Certified Cloud Practitioner',
  'Google Cloud Professional', 'Microsoft Certified Azure', 'CISSP', 'CEH', 'CompTIA Security+',
  'CompTIA Network+', 'OSCP', 'CKA', 'CKAD', 'PMP', 'CSM', 'Scrum Master', 'ITIL',
];

const ACTION_VERBS = new Set([
  'accelerated', 'achieved', 'architected', 'automated', 'built', 'championed', 'collaborated',
  'consolidated', 'constructed', 'coordinated', 'created', 'decreased', 'delivered', 'deployed',
  'designed', 'developed', 'devised', 'diagnosed', 'directed', 'documented', 'drove', 'eliminated',
  'engineered', 'enhanced', 'established', 'evaluated', 'executed', 'expanded', 'expedited',
  'formulated', 'founded', 'generated', 'guided', 'hardened', 'identified', 'implemented',
  'improved', 'increased', 'initiated', 'integrated', 'investigated', 'launched', 'led',
  'maintained', 'managed', 'mentored', 'migrated', 'modeled', 'modernized', 'monitored',
  'negotiated', 'operated', 'optimized', 'orchestrated', 'organized', 'overhauled', 'owned',
  'partnered', 'performed', 'pioneered', 'planned', 'prepared', 'presented', 'prevented',
  'prioritized', 'processed', 'produced', 'programmed', 'prototyped', 'published', 're-architected',
  'rebuilt', 'recommended', 'redesigned', 'reduced', 'refactored', 'remediated', 'reorganized',
  'replaced', 'researched', 'resolved', 'restructured', 'revamped', 'reviewed', 'scaled',
  'scheduled', 'secured', 'shipped', 'simplified', 'simulated', 'solved', 'spearheaded',
  'standardized', 'streamlined', 'strengthened', 'structured', 'supervised', 'supported',
  'synthesized', 'tested', 'trained', 'transformed', 'troubleshot', 'tuned', 'unified',
  'upgraded', 'validated', 'verified', 'wrote',
]);

const WEAK_OPENERS = [
  'worked on', 'responsible for', 'helped with', 'assisted with', 'assisted in',
  'tasked with', 'duties included', 'participated in', 'was involved in', 'handled',
];

const STOPWORDS = new Set([
  'a', 'an', 'and', 'are', 'as', 'at', 'be', 'but', 'by', 'for', 'if', 'in', 'into', 'is',
  'it', 'no', 'not', 'of', 'on', 'or', 'such', 'that', 'the', 'their', 'then', 'there',
  'these', 'they', 'this', 'to', 'was', 'will', 'with', 'we', 'you', 'your', 'our', 'us',
  'from', 'have', 'has', 'had', 'can', 'could', 'would', 'should', 'must', 'may', 'might',
  'about', 'above', 'across', 'after', 'all', 'also', 'am', 'any', 'around', 'because',
  'been', 'before', 'being', 'between', 'both', 'each', 'etc', 'fast', 'good', 'great',
  'high', 'how', 'including', 'job', 'just', 'like', 'make', 'more', 'most', 'new', 'only',
  'other', 'over', 'per', 'plus', 'role', 'see', 'some', 'team', 'than', 'them', 'through',
  'up', 'use', 'using', 'very', 'well', 'what', 'when', 'where', 'which', 'while', 'who',
  'work', 'working', 'years', 'year', 'ability', 'experience', 'knowledge', 'skills',
  'strong', 'excellent', 'proven', 'preferred', 'required', 'requirements', 'responsibilities',
  'qualifications', 'minimum', 'candidate', 'ideal', 'seeking', 'looking', 'company',
  'opportunity', 'equal', 'employer', 'benefits', 'salary', 'apply', 'position', 'full',
  'time', 'remote', 'hybrid', 'onsite', 'office', 'based', 'environment', 'fast-paced',
  'passion', 'passionate', 'bonus', 'plus', 'degree', 'bachelor', 'master', 'related', 'field',
]);

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function normalizeTextForMatch(text: string): string {
  return (text || '')
    .toLowerCase()
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/\s+/g, ' ')
    .trim();
}

function getAliasesForTerm(term: string): string[] {
  const lower = term.toLowerCase().trim();
  const result = new Set<string>([lower]);

  for (const [canonical, aliases] of Object.entries(SKILL_ALIASES)) {
    if (canonical === lower || aliases.includes(lower)) {
      result.add(canonical);
      aliases.forEach((a) => result.add(a));
    }
  }

  // Safe plural/suffix variance
  if (lower.endsWith('s') && lower.length > 4 && !lower.endsWith('css') && !lower.endsWith('aws')) {
    result.add(lower.slice(0, -1));
  } else if (!lower.endsWith('s') && lower.length > 3 && !lower.includes('++') && !lower.includes('#')) {
    result.add(`${lower}s`);
  }

  return Array.from(result);
}

export function textContainsTerm(haystackNormalized: string, term: string): { matched: boolean; matchType: 'exact' | 'alias' } {
  if (!haystackNormalized || !term.trim()) {
    return { matched: false, matchType: 'exact' };
  }
  const lowerTerm = term.toLowerCase().trim();
  const checkSingle = (candidate: string): boolean => {
    const escaped = escapeRegex(candidate);
    // Use boundary matching that works cleanly with C++, C#, .js, CI/CD
    const pattern = new RegExp(`(?:^|[^a-z0-9_+#.])${escaped}(?:$|[^a-z0-9_+#])`, 'i');
    return pattern.test(haystackNormalized);
  };

  if (checkSingle(lowerTerm)) {
    return { matched: true, matchType: 'exact' };
  }

  const aliases = getAliasesForTerm(lowerTerm);
  for (const alias of aliases) {
    if (alias !== lowerTerm && checkSingle(alias)) {
      return { matched: true, matchType: 'alias' };
    }
  }

  return { matched: false, matchType: 'exact' };
}

/* ========================================================================== */
/* PARSING RAW EXTRACTED RESUME TEXT -> STRUCTURED DRAFT                      */
/* ========================================================================== */

type SectionBucket =
  | 'header'
  | 'summary'
  | 'experience'
  | 'education'
  | 'projects'
  | 'skills'
  | 'certifications'
  | 'achievements'
  | 'other';

function classifyHeading(line: string): { bucket: SectionBucket; label: string } | null {
  const clean = line
    .replace(/[:\-_|•]+$/g, '')
    .replace(/^[:\-_|•]+/g, '')
    .trim();
  if (!clean || clean.length > 48) return null;

  const lower = clean.toLowerCase();
  // Avoid mistaking normal sentences with punctuation for headings
  if (clean.split(/\s+/).length > 5 && clean === clean.toLowerCase()) return null;

  const matches = (candidates: string[]) =>
    candidates.some((c) => lower === c || lower === `${c}s` || lower.startsWith(`${c} `) || lower.endsWith(` ${c}`));

  if (
    matches([
      'summary',
      'professional summary',
      'executive summary',
      'career summary',
      'profile',
      'about me',
      'objective',
      'career objective',
      'highlights',
    ])
  ) {
    return { bucket: 'summary', label: 'Summary' };
  }
  if (
    matches([
      'experience',
      'work experience',
      'professional experience',
      'employment history',
      'employment',
      'career history',
      'internships',
      'internship experience',
      'relevant experience',
    ])
  ) {
    return { bucket: 'experience', label: 'Experience' };
  }
  if (matches(['education', 'academic background', 'academic qualifications', 'qualifications'])) {
    return { bucket: 'education', label: 'Education' };
  }
  if (matches(['projects', 'key projects', 'technical projects', 'academic projects', 'personal projects'])) {
    return { bucket: 'projects', label: 'Projects' };
  }
  if (
    matches([
      'skills',
      'technical skills',
      'core competencies',
      'technologies',
      'tools & technologies',
      'programming languages',
      'areas of expertise',
      'competencies',
    ])
  ) {
    return { bucket: 'skills', label: 'Skills' };
  }
  if (
    matches([
      'certifications',
      'certificates',
      'licenses',
      'licenses & certifications',
      'credentials',
    ])
  ) {
    return { bucket: 'certifications', label: 'Certifications' };
  }
  if (
    matches([
      'achievements',
      'honors',
      'awards',
      'honors & awards',
      'accomplishments',
      'publications',
      'leadership',
      'activities',
    ])
  ) {
    return { bucket: 'achievements', label: 'Achievements & Leadership' };
  }
  if (matches(['languages', 'interests', 'references', 'volunteer', 'volunteering'])) {
    return { bucket: 'other', label: clean };
  }

  return null;
}

function isBulletLine(line: string): boolean {
  return /^(?:[•●▪▸►\-*–—]|\d+[.)])\s+/.test(line.trim());
}

function stripBulletPrefix(line: string): string {
  return line.trim().replace(/^(?:[•●▪▸►\-*–—]|\d+[.)])\s+/, '').trim();
}

const DATE_RANGE_REGEX =
  /((?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:t(?:ember)?)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\s+\d{4}|\b(?:19|20)\d{2}\b|\d{1,2}\/(?:19|20)\d{2})\s*(?:[-–—to]+\s*((?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:t(?:ember)?)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\s+\d{4}|\b(?:19|20)\d{2}\b|\d{1,2}\/(?:19|20)\d{2}|Present|Current|Now))?/i;

export function parseRawResumeTextToDraft(
  rawText: string,
  meta: {
    fileName: string;
    fileFormat: AtsDocumentFormat;
    fileSizeBytes?: number;
    pageCount?: number;
    isScannedPdf?: boolean;
    usedAiOcr?: boolean;
    isTwoColumnLayout?: boolean;
    hasTablesOrColumnsInText?: boolean;
    extractionWarnings?: string[];
  }
): AtsExtractedResumeDraft {
  const normalizedRaw = (rawText || '').replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  const lines = normalizedRaw
    .split('\n')
    .map((l) => l.replace(/\s+/g, ' ').trim())
    .filter((l) => l.length > 0);

  // Extract contacts across top + full text
  const emailMatch = normalizedRaw.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
  const phoneMatch = normalizedRaw.match(
    /(?:\+?\d{1,3}[\s.-]?)?(?:\(\d{2,4}\)[\s.-]?)?\d{3,4}[\s.-]?\d{3,5}(?:[\s.-]?\d{2,5})?/
  );
  const cleanPhone =
    phoneMatch && phoneMatch[0].replace(/\D/g, '').length >= 7 && phoneMatch[0].replace(/\D/g, '').length <= 15
      ? phoneMatch[0].trim()
      : '';

  const linkedinMatch = normalizedRaw.match(/(?:https?:\/\/)?(?:www\.)?linkedin\.com\/in\/[a-zA-Z0-9_-]+\/?/i);
  const githubMatch = normalizedRaw.match(/(?:https?:\/\/)?(?:www\.)?github\.com\/[a-zA-Z0-9_-]+\/?/i);
  const allUrls = normalizedRaw.match(/https?:\/\/[^\s,|)]+/gi) || [];
  const otherWebsite = allUrls.find(
    (u) => !/linkedin\.com|github\.com/i.test(u)
  );

  // Bucket lines into sections
  const sectionsContent: Record<SectionBucket, string[]> = {
    header: [],
    summary: [],
    experience: [],
    education: [],
    projects: [],
    skills: [],
    certifications: [],
    achievements: [],
    other: [],
  };
  const detectedSectionSet = new Set<string>();
  let currentBucket: SectionBucket = 'header';

  for (const line of lines) {
    const heading = classifyHeading(line);
    if (heading) {
      currentBucket = heading.bucket;
      detectedSectionSet.add(heading.label);
      continue;
    }
    sectionsContent[currentBucket].push(line);
  }

  // Name & Location heuristics from header
  let fullName = '';
  let jobTitle = '';
  let location = '';
  for (const hLine of sectionsContent.header.slice(0, 6)) {
    const hasEmailOrUrl =
      /@|linkedin\.com|github\.com|https?:\/\//i.test(hLine) ||
      (cleanPhone && hLine.includes(cleanPhone));
    if (!fullName && !hasEmailOrUrl && hLine.split(/\s+/).length <= 5 && !/\d{4}/.test(hLine)) {
      fullName = hLine.replace(/[|•]/g, '').trim();
      continue;
    }
    if (!location) {
      const locMatch = hLine.match(/\b([A-Z][a-zA-Z\s]+,\s*(?:[A-Z]{2}|[A-Z][a-zA-Z]+))\b/);
      if (locMatch) {
        location = locMatch[1].trim();
      } else if (/\bremote\b/i.test(hLine) && hLine.length < 40) {
        location = 'Remote';
      }
    }
    if (fullName && !jobTitle && !hasEmailOrUrl && hLine.length <= 75 && !locMatchOrDate(hLine)) {
      jobTitle = hLine;
    }
  }

  function locMatchOrDate(text: string): boolean {
    return /\b(19|20)\d{2}\b/.test(text) || /,\s*[A-Z]{2}\b/.test(text);
  }

  // Summary
  const summary = sectionsContent.summary.join(' ').trim();

  // Experience parsing
  const experience: AtsExperienceDraft[] = [];
  let activeExp: AtsExperienceDraft | null = null;
  for (const line of sectionsContent.experience) {
    if (isBulletLine(line)) {
      if (!activeExp) {
        activeExp = {
          id: `exp_${experience.length + 1}`,
          position: 'Role',
          company: '',
          startDate: '',
          endDate: '',
          highlights: [],
        };
        experience.push(activeExp);
      }
      activeExp.highlights.push(stripBulletPrefix(line));
      continue;
    }

    const dateMatch = line.match(DATE_RANGE_REGEX);
    const looksLikeNewEntry =
      Boolean(dateMatch) ||
      /\s[|–—@-]\s/.test(line) ||
      !activeExp ||
      activeExp.highlights.length > 0;

    if (looksLikeNewEntry) {
      const strippedLine = dateMatch ? line.replace(dateMatch[0], '').replace(/[|•()]+$/g, '').trim() : line;
      const parts = strippedLine.split(/\s*(?:\||@|—|–|\s+at\s+)\s*/i).filter(Boolean);
      activeExp = {
        id: `exp_${experience.length + 1}`,
        position: parts[0] || strippedLine || 'Role',
        company: parts[1] || '',
        location: parts[2] || '',
        startDate: dateMatch?.[1] || '',
        endDate: dateMatch?.[2] || (dateMatch && /present|current/i.test(line) ? 'Present' : ''),
        current: /present|current/i.test(line),
        highlights: [],
      };
      experience.push(activeExp);
    } else if (activeExp && !activeExp.company && line.length < 70) {
      activeExp.company = line;
    } else if (activeExp) {
      activeExp.highlights.push(line);
    }
  }

  // Education parsing
  const education: AtsEducationDraft[] = [];
  for (const line of sectionsContent.education) {
    const cleanLine = isBulletLine(line) ? stripBulletPrefix(line) : line;
    const dateMatch = cleanLine.match(DATE_RANGE_REGEX);
    const looksLikeDegreeOrSchool =
      /\b(b\.?s\.?|m\.?s\.?|b\.?tech|m\.?tech|b\.?e\.?|ph\.?d|bachelor|master|associate|diploma|university|college|institute|school)\b/i.test(
        cleanLine
      );
    if (looksLikeDegreeOrSchool || education.length === 0) {
      const withoutDate = dateMatch ? cleanLine.replace(dateMatch[0], '').trim() : cleanLine;
      const parts = withoutDate.split(/\s*(?:\||—|–|,)\s*/).filter(Boolean);
      education.push({
        id: `edu_${education.length + 1}`,
        degree: parts[0] || withoutDate,
        institution: parts[1] || '',
        startDate: dateMatch?.[1] || '',
        endDate: dateMatch?.[2] || '',
      });
    } else if (education.length > 0) {
      const last = education[education.length - 1];
      if (!last.institution && cleanLine.length < 90) {
        last.institution = cleanLine;
      } else if (/gpa|cgpa|grade|%/i.test(cleanLine) && !last.grade) {
        last.grade = cleanLine;
      }
    }
  }

  // Projects parsing
  const projects: AtsProjectDraft[] = [];
  let activeProj: AtsProjectDraft | null = null;
  for (const line of sectionsContent.projects) {
    if (isBulletLine(line)) {
      if (!activeProj) {
        activeProj = {
          id: `proj_${projects.length + 1}`,
          title: 'Project',
          technologies: [],
          highlights: [],
        };
        projects.push(activeProj);
      }
      activeProj.highlights.push(stripBulletPrefix(line));
    } else if (!activeProj || activeProj.highlights.length > 0 || /\||—|–/.test(line)) {
      const parts = line.split(/\s*(?:\||—|–)\s*/).filter(Boolean);
      const techCandidates = parts[1]
        ? parts[1].split(/[,/]/).map((s) => s.trim()).filter(Boolean)
        : [];
      activeProj = {
        id: `proj_${projects.length + 1}`,
        title: parts[0] || line,
        technologies: techCandidates,
        highlights: [],
      };
      projects.push(activeProj);
    } else {
      activeProj.description = activeProj.description
        ? `${activeProj.description} ${line}`
        : line;
    }
  }

  // Skills parsing (both from skills section AND verified known skills across full text)
  const skillCategories: Array<{ category: string; skills: string[] }> = [];
  const extractedSkillsSet = new Set<string>();

  for (const line of sectionsContent.skills) {
    const clean = stripBulletPrefix(line);
    const colonIdx = clean.indexOf(':');
    if (colonIdx > 1 && colonIdx < 38) {
      const catName = clean.slice(0, colonIdx).trim();
      const items = clean
        .slice(colonIdx + 1)
        .split(/[,|•·;]/)
        .map((s) => s.trim())
        .filter((s) => s.length > 0 && s.length <= 45);
      if (items.length > 0) {
        skillCategories.push({ category: catName, skills: items });
        items.forEach((s) => extractedSkillsSet.add(s));
      }
    } else {
      const items = clean
        .split(/[,|•·;]/)
        .map((s) => s.trim())
        .filter((s) => s.length > 0 && s.length <= 45);
      items.forEach((s) => extractedSkillsSet.add(s));
    }
  }

  // Also capture explicit known technical skills verified in full text if skills section was absent/sparse
  const normalizedFull = normalizeTextForMatch(normalizedRaw);
  for (const known of KNOWN_TECHNICAL_SKILLS) {
    if (textContainsTerm(normalizedFull, known).matched) {
      const alreadyHas = Array.from(extractedSkillsSet).some(
        (existing) => existing.toLowerCase() === known.toLowerCase()
      );
      if (!alreadyHas) {
        extractedSkillsSet.add(known);
      }
    }
  }

  if (skillCategories.length === 0 && extractedSkillsSet.size > 0) {
    skillCategories.push({
      category: 'Technical Skills',
      skills: Array.from(extractedSkillsSet),
    });
  }

  // Certifications & Achievements
  const certifications: AtsCertificationDraft[] = sectionsContent.certifications.map((line, i) => {
    const clean = stripBulletPrefix(line);
    const parts = clean.split(/\s*(?:\||—|–|-|,)\s*/).filter(Boolean);
    return {
      id: `cert_${i + 1}`,
      name: parts[0] || clean,
      issuer: parts[1] || '',
      issueDate: parts[2] || '',
    };
  });

  const achievements = sectionsContent.achievements.map((l) => stripBulletPrefix(l));

  // Layout & density diagnostics
  const expMissingDates = experience.some((e) => !e.startDate && !e.endDate);
  const eduMissingDates = education.some((e) => !e.startDate && !e.endDate);
  const hasInconsistentDates = experience.length > 0 && (expMissingDates || eduMissingDates);

  const totalBullets =
    experience.reduce((acc, e) => acc + e.highlights.length, 0) +
    projects.reduce((acc, p) => acc + p.highlights.length, 0);
  const longLinesCount = lines.filter((l) => l.length > 220 && !isBulletLine(l)).length;
  const isTextTooDenseOrUnbulleted =
    longLinesCount >= 2 || (experience.length > 0 && totalBullets === 0 && normalizedRaw.length > 400);

  const standardRequired = ['Experience', 'Education', 'Skills'];
  const missingStandardSections = standardRequired.filter((sec) => {
    if (sec === 'Experience') return experience.length === 0 && !detectedSectionSet.has('Experience');
    if (sec === 'Education') return education.length === 0 && !detectedSectionSet.has('Education');
    if (sec === 'Skills') return extractedSkillsSet.size === 0 && !detectedSectionSet.has('Skills');
    return false;
  });

  const extractionWarnings = [...(meta.extractionWarnings || [])];
  if (!emailMatch) extractionWarnings.push('No email address was detected in the extracted text.');
  if (!cleanPhone) extractionWarnings.push('No phone number was detected in the extracted text.');
  if (missingStandardSections.length > 0) {
    extractionWarnings.push(
      `Standard section(s) not clearly detected: ${missingStandardSections.join(', ')}. Review and edit the extracted text if your headings use custom names.`
    );
  }

  const extractionNotes: string[] = [];
  if (detectedSectionSet.size > 0) {
    extractionNotes.push(`Detected headings: ${Array.from(detectedSectionSet).join(', ')}`);
  }
  if (meta.usedAiOcr) {
    extractionNotes.push('Text extracted using AI OCR for scanned PDF — please verify accuracy before scoring.');
  }

  return {
    sourceType: 'upload',
    fileName: meta.fileName,
    fileFormat: meta.fileFormat,
    fileSizeBytes: meta.fileSizeBytes,
    pageCount: meta.pageCount,
    isScannedPdf: meta.isScannedPdf,
    usedAiOcr: meta.usedAiOcr,
    extractedText: normalizedRaw.trim(),
    extractionWarnings,
    extractionNotes,
    personalInfo: {
      fullName: fullName || '',
      jobTitle: jobTitle || '',
      email: emailMatch ? emailMatch[0] : '',
      phone: cleanPhone,
      location,
      linkedin: linkedinMatch ? linkedinMatch[0] : '',
      github: githubMatch ? githubMatch[0] : '',
      website: otherWebsite || '',
    },
    summary,
    experience,
    education,
    projects,
    skills: Array.from(extractedSkillsSet),
    skillCategories,
    certifications,
    achievements,
    detectedSections: Array.from(detectedSectionSet),
    missingStandardSections,
    layoutHints: {
      isTwoColumnLayout: Boolean(meta.isTwoColumnLayout),
      hasVisualSkillBarsOrCircles: false,
      hasTablesOrColumnsInText: Boolean(meta.hasTablesOrColumnsInText),
      hasInconsistentDates,
      isTextTooDenseOrUnbulleted,
    },
  };
}

/* ========================================================================== */
/* CONVERT ANY OF THE 15 RESUME TEMPLATES -> ANALYZABLE ATS DRAFT             */
/* ========================================================================== */

export function resumeToAtsDraft(resume: Resume): AtsExtractedResumeDraft {
  const tplDef = getTemplateById(resume.template);
  const p = resume.personalInfo || ({} as Resume['personalInfo']);
  const locationParts = [p.city, p.state, p.country].filter(Boolean);
  const locationStr = locationParts.length > 0 ? locationParts.join(', ') : p.location || '';

  const summaryParts = [
    resume.objective,
    resume.researchFocusSummary,
    resume.philosophyExplanation,
    resume.managementStyle,
  ].filter((s): s is string => Boolean(s && s.trim()));
  const summary = summaryParts.join(' ').trim();

  const experience: AtsExperienceDraft[] = [
    ...(resume.experience || []).map((e) => ({
      id: e.id,
      position: e.position || '',
      company: e.company || '',
      location: e.location || '',
      startDate: e.startDate || '',
      endDate: e.current ? 'Present' : e.endDate || '',
      current: e.current,
      highlights: [
        ...(e.highlights || []).filter(Boolean),
        ...(e.workHighlights || [])
          .map((w) => [w.title, w.description].filter(Boolean).join(': '))
          .filter(Boolean),
        ...(e.description ? [e.description] : []),
        ...(e.results ? [e.results] : []),
      ],
    })),
    ...(resume.researchExperience || []).map((r) => ({
      id: r.id,
      position: r.role || r.title || 'Researcher',
      company: r.institution || '',
      location: r.location || '',
      startDate: r.startDate || '',
      endDate: r.current ? 'Present' : r.endDate || '',
      current: r.current,
      highlights: [r.objectives, r.methodology, r.findings, r.outcomes].filter(
        (v): v is string => Boolean(v && v.trim())
      ),
    })),
  ];

  const education: AtsEducationDraft[] = (resume.education || []).map((ed) => ({
    id: ed.id,
    degree: ed.degree || '',
    institution: ed.institution || '',
    specialization: ed.specialization || ed.department || '',
    location: ed.location || '',
    startDate: ed.startDate || '',
    endDate: ed.current ? 'Present' : ed.endDate || '',
    grade: ed.grade || '',
  }));

  const projects: AtsProjectDraft[] = (resume.projects || []).map((pr) => ({
    id: pr.id,
    title: pr.title || '',
    description: pr.description || pr.objective || '',
    technologies: [
      ...(pr.technologies || []),
      ...(pr.frameworks || []),
      ...(pr.tools || []),
    ].filter(Boolean),
    highlights: (pr.highlights || []).filter(Boolean),
  }));

  const skillCategories: Array<{ category: string; skills: string[] }> = [];
  const flatSkills = new Set<string>();

  for (const sc of resume.skills || []) {
    const cleaned = (sc.skills || []).map((s) => s.trim()).filter(Boolean);
    if (cleaned.length > 0) {
      skillCategories.push({ category: sc.category || 'Skills', skills: cleaned });
      cleaned.forEach((s) => flatSkills.add(s));
    }
  }
  for (const cs of resume.creativeSkillItems || []) {
    if (cs.name?.trim()) flatSkills.add(cs.name.trim());
  }
  for (const sm of resume.skillMatrix || []) {
    if (sm.skill?.trim()) flatSkills.add(sm.skill.trim());
  }
  for (const cp of resume.circularProficiencies || []) {
    if (cp.name?.trim()) flatSkills.add(cp.name.trim());
  }
  for (const sb of resume.creativeSkillBars || []) {
    if (sb.name?.trim()) flatSkills.add(sb.name.trim());
  }
  for (const ls of resume.labSkills || []) {
    if (ls?.trim()) flatSkills.add(ls.trim());
  }
  for (const cw of resume.coursework || []) {
    if (cw?.trim()) flatSkills.add(cw.trim());
  }

  // Also include technologies explicitly demonstrated in experience & projects
  for (const ex of resume.experience || []) {
    (ex.technologies || []).forEach((t) => t?.trim() && flatSkills.add(t.trim()));
  }
  for (const pr of projects) {
    pr.technologies.forEach((t) => t?.trim() && flatSkills.add(t.trim()));
  }

  const certifications: AtsCertificationDraft[] = (resume.certifications || []).map((c) => ({
    id: c.id,
    name: c.name || '',
    issuer: c.issuer || '',
    issueDate: c.issueDate || '',
  }));

  const achievements: string[] = [
    ...(resume.achievements || []).map((a) =>
      [a.title, a.issuer, a.date, a.description].filter(Boolean).join(' — ')
    ),
    ...(resume.publications || []).map((pub) =>
      [pub.title, pub.journalOrConference, pub.year].filter(Boolean).join(' — ')
    ),
    ...(resume.presentations || []).map((pres) =>
      [pres.title, pres.eventOrConference, pres.date].filter(Boolean).join(' — ')
    ),
    ...(resume.leadership || []).map((l) =>
      [l.role, l.organization, ...(l.highlights || [])].filter(Boolean).join(' — ')
    ),
  ].filter(Boolean);

  // Build plain-text representation reflecting exact content across all 15 templates
  const textBlocks: string[] = [];
  if (p.fullName) textBlocks.push(p.fullName);
  if (p.jobTitle || resume.targetRole) textBlocks.push(p.jobTitle || resume.targetRole || '');
  textBlocks.push(
    [p.email, p.phone, locationStr, p.linkedin, p.github, p.website].filter(Boolean).join(' | ')
  );
  if (summary) {
    textBlocks.push('SUMMARY\n' + summary);
  }
  if (experience.length > 0) {
    textBlocks.push(
      'EXPERIENCE\n' +
        experience
          .map(
            (e) =>
              `${e.position} | ${e.company} | ${[e.startDate, e.endDate].filter(Boolean).join(' - ')}\n` +
              e.highlights.map((h) => `• ${h}`).join('\n')
          )
          .join('\n')
    );
  }
  if (projects.length > 0) {
    textBlocks.push(
      'PROJECTS\n' +
        projects
          .map(
            (pr) =>
              `${pr.title}${pr.technologies.length ? ` | ${pr.technologies.join(', ')}` : ''}\n` +
              [pr.description, ...pr.highlights.map((h) => `• ${h}`)].filter(Boolean).join('\n')
          )
          .join('\n')
    );
  }
  if (education.length > 0) {
    textBlocks.push(
      'EDUCATION\n' +
        education
          .map((ed) =>
            [ed.degree, ed.specialization, ed.institution, ed.grade, [ed.startDate, ed.endDate].filter(Boolean).join(' - ')]
              .filter(Boolean)
              .join(' | ')
          )
          .join('\n')
    );
  }
  if (skillCategories.length > 0 || flatSkills.size > 0) {
    textBlocks.push(
      'SKILLS\n' +
        (skillCategories.length > 0
          ? skillCategories.map((c) => `${c.category}: ${c.skills.join(', ')}`).join('\n')
          : Array.from(flatSkills).join(', '))
    );
  }
  if (certifications.length > 0) {
    textBlocks.push(
      'CERTIFICATIONS\n' +
        certifications.map((c) => [c.name, c.issuer, c.issueDate].filter(Boolean).join(' — ')).join('\n')
    );
  }
  if (achievements.length > 0) {
    textBlocks.push('ACHIEVEMENTS & PUBLICATIONS\n' + achievements.join('\n'));
  }

  const detectedSections: string[] = [];
  if (summary) detectedSections.push('Summary');
  if (experience.length > 0) detectedSections.push('Experience');
  if (projects.length > 0) detectedSections.push('Projects');
  if (education.length > 0) detectedSections.push('Education');
  if (flatSkills.size > 0) detectedSections.push('Skills');
  if (certifications.length > 0) detectedSections.push('Certifications');
  if (achievements.length > 0) detectedSections.push('Achievements & Leadership');

  const isTwoColumnLayout =
    tplDef.layout === 'main-left-sidebar-right' ||
    tplDef.layout === 'two-column-editorial' ||
    tplDef.layout === 'two-column-internship' ||
    tplDef.layout === 'two-column-creative';

  const hasVisualSkillBarsOrCircles = Boolean(
    (resume.circularProficiencies && resume.circularProficiencies.length > 0) ||
      (resume.creativeSkillBars && resume.creativeSkillBars.length > 0) ||
      (resume.skillMatrix && resume.skillMatrix.length > 0) ||
      (resume.showDailyActivityChart && resume.dailyActivities && resume.dailyActivities.length > 0)
  );

  const hasInconsistentDates =
    experience.some((e) => !e.startDate && !e.endDate) ||
    education.some((e) => !e.startDate && !e.endDate);

  return {
    sourceType: 'existing-resume',
    fileName: resume.title || tplDef.name,
    fileFormat: 'resume-record',
    sourceResumeId: resume.id,
    sourceTemplateId: tplDef.id,
    extractedText: textBlocks.filter(Boolean).join('\n\n'),
    extractionWarnings: [],
    extractionNotes: [
      `Loaded directly from saved resume "${resume.title}" using template "${tplDef.name}".`,
    ],
    personalInfo: {
      fullName: p.fullName || '',
      jobTitle: p.jobTitle || resume.targetRole || '',
      email: p.email || '',
      phone: p.phone || '',
      location: locationStr,
      linkedin: p.linkedin || '',
      github: p.github || '',
      website: p.website || '',
    },
    summary,
    experience,
    education,
    projects,
    skills: Array.from(flatSkills),
    skillCategories,
    certifications,
    achievements,
    detectedSections,
    missingStandardSections: ['Experience', 'Education', 'Skills'].filter(
      (s) => !detectedSections.includes(s)
    ),
    layoutHints: {
      isTwoColumnLayout,
      hasVisualSkillBarsOrCircles,
      hasTablesOrColumnsInText: isTwoColumnLayout,
      hasInconsistentDates,
      isTextTooDenseOrUnbulleted:
        experience.length > 0 &&
        experience.every((e) => e.highlights.length === 0) &&
        projects.every((pr) => pr.highlights.length === 0),
    },
  };
}

export function rebuildDraftExtractedText(draft: AtsExtractedResumeDraft): string {
  const blocks: string[] = [];
  const p = draft.personalInfo;
  if (p.fullName) blocks.push(p.fullName);
  if (p.jobTitle) blocks.push(p.jobTitle);
  const contacts = [p.email, p.phone, p.location, p.linkedin, p.github, p.website].filter(Boolean);
  if (contacts.length > 0) blocks.push(contacts.join(' | '));
  if (draft.summary?.trim()) blocks.push(`SUMMARY\n${draft.summary.trim()}`);
  if (draft.experience.length > 0) {
    blocks.push(
      'EXPERIENCE\n' +
        draft.experience
          .map(
            (e) =>
              `${e.position}${e.company ? ` | ${e.company}` : ''}${
                e.startDate || e.endDate ? ` | ${[e.startDate, e.endDate].filter(Boolean).join(' - ')}` : ''
              }\n` + e.highlights.map((h) => `• ${h}`).join('\n')
          )
          .join('\n')
    );
  }
  if (draft.projects.length > 0) {
    blocks.push(
      'PROJECTS\n' +
        draft.projects
          .map(
            (pr) =>
              `${pr.title}${pr.technologies.length ? ` | ${pr.technologies.join(', ')}` : ''}\n` +
              [pr.description, ...pr.highlights.map((h) => `• ${h}`)].filter(Boolean).join('\n')
          )
          .join('\n')
    );
  }
  if (draft.education.length > 0) {
    blocks.push(
      'EDUCATION\n' +
        draft.education
          .map((ed) =>
            [ed.degree, ed.specialization, ed.institution, ed.grade, [ed.startDate, ed.endDate].filter(Boolean).join(' - ')]
              .filter(Boolean)
              .join(' | ')
          )
          .join('\n')
    );
  }
  if (draft.skillCategories.length > 0 || draft.skills.length > 0) {
    blocks.push(
      'SKILLS\n' +
        (draft.skillCategories.length > 0
          ? draft.skillCategories.map((c) => `${c.category}: ${c.skills.join(', ')}`).join('\n')
          : draft.skills.join(', '))
    );
  }
  if (draft.certifications.length > 0) {
    blocks.push(
      'CERTIFICATIONS\n' +
        draft.certifications.map((c) => [c.name, c.issuer, c.issueDate].filter(Boolean).join(' — ')).join('\n')
    );
  }
  if (draft.achievements.length > 0) {
    blocks.push('ACHIEVEMENTS\n' + draft.achievements.map((a) => `• ${a}`).join('\n'));
  }
  return blocks.join('\n\n');
}

/* ========================================================================== */
/* JOB DESCRIPTION PARSING (DETERMINISTIC + NORMALIZER FOR AI OUTPUT)         */
/* ========================================================================== */

export function parseJobDescriptionDeterministic(
  jobDescription: string,
  meta?: Partial<{
    jobTitle: string;
    companyName: string;
    jobLocation: string;
    experienceLevel: string;
    industry: string;
  }>,
  aiNote?: string
): ParsedJobRequirements {
  const raw = (jobDescription || '').replace(/\r\n/g, '\n');
  const lines = raw.split('\n').map((l) => l.trim()).filter(Boolean);
  const normalized = normalizeTextForMatch(raw);

  // Split into mandatory vs preferred segments based on section headers in JD
  let mandatoryText = '';
  let preferredText = '';
  let responsibilityLines: string[] = [];
  let mode: 'general' | 'mandatory' | 'preferred' | 'responsibilities' = 'general';

  for (const line of lines) {
    const lower = line.toLowerCase();
    if (/^(?:preferred|nice to have|bonus|desired|optional|plus|what sets you apart)/.test(lower)) {
      mode = 'preferred';
      continue;
    }
    if (/^(?:requirements|required|qualifications|minimum qualifications|must have|what you bring|what we look for|who you are)/.test(lower)) {
      mode = 'mandatory';
      continue;
    }
    if (/^(?:responsibilities|what you'll do|what you will do|key duties|your role|about the role)/.test(lower)) {
      mode = 'responsibilities';
      continue;
    }
    if (mode === 'preferred') preferredText += ' ' + line;
    else if (mode === 'mandatory') mandatoryText += ' ' + line;
    else if (mode === 'responsibilities') {
      if (isBulletLine(line) || line.length > 25) {
        responsibilityLines.push(stripBulletPrefix(line));
      }
    } else {
      mandatoryText += ' ' + line;
    }
  }

  const normMandatory = normalizeTextForMatch(mandatoryText);
  const normPreferred = normalizeTextForMatch(preferredText);

  const mandatorySkills: string[] = [];
  const preferredSkills: string[] = [];
  const technicalSkills: string[] = [];
  const softSkills: string[] = [];

  for (const tech of KNOWN_TECHNICAL_SKILLS) {
    if (textContainsTerm(normalized, tech).matched) {
      technicalSkills.push(tech);
      const inPref = normPreferred && textContainsTerm(normPreferred, tech).matched;
      const inMand = normMandatory && textContainsTerm(normMandatory, tech).matched;
      if (inPref && !inMand) {
        preferredSkills.push(tech);
      } else {
        mandatorySkills.push(tech);
      }
    }
  }

  for (const soft of KNOWN_SOFT_SKILLS) {
    if (textContainsTerm(normalized, soft).matched) {
      const label = soft.replace(/\b\w/g, (c) => c.toUpperCase());
      softSkills.push(label);
    }
  }

  const certifications = KNOWN_CERTIFICATIONS.filter((cert) =>
    textContainsTerm(normalized, cert).matched
  );

  // Extract required years of experience
  let requiredYearsExperience: number | null = null;
  const yearsMatches = Array.from(raw.matchAll(/(\d{1,2})\s*(?:\+|plus)?\s*(?:-|to)?\s*(?:\d{1,2})?\s*years?\s+(?:of\s+)?(?:experience|relevant|software|engineering|industry)/gi));
  if (yearsMatches.length > 0) {
    const nums = yearsMatches
      .map((m) => parseInt(m[1], 10))
      .filter((n) => !Number.isNaN(n) && n >= 0 && n <= 25);
    if (nums.length > 0) {
      requiredYearsExperience = Math.min(...nums);
    }
  }

  // Education requirement
  let educationRequirement = '';
  const eduSentence = lines.find((l) =>
    /\b(bachelor|master|ph\.?d|b\.?s\.?|m\.?s\.?|b\.?tech|computer science|engineering degree)\b/i.test(l)
  );
  if (eduSentence) {
    educationRequirement = stripBulletPrefix(eduSentence).slice(0, 160);
  }

  // Detect company names from explicit metadata or common JD phrasing so they are never flagged as missing skills
  const excludedCompanyTokens = new Set<string>();
  const addCompanyTokens = (name?: string) => {
    const clean = (name || '').trim().toLowerCase();
    if (!clean) return;
    excludedCompanyTokens.add(clean);
    clean
      .split(/[\s,./&-]+/)
      .filter((p) => p.length >= 3 && !STOPWORDS.has(p))
      .forEach((p) => excludedCompanyTokens.add(p));
  };
  addCompanyTokens(meta?.companyName);

  const companyPatterns = [
    /(?:about|join|why)\s+([A-Z][A-Za-z0-9.&-]{2,30}(?:\s+[A-Z][A-Za-z0-9.&-]{2,20})?)/g,
    /\b([A-Z][A-Za-z0-9.&-]{2,28})\s+(?:is\s+(?:hiring|looking|seeking)|solutions|technologies|corp|inc|llc|ltd)\b/g,
  ];
  for (const pat of companyPatterns) {
    for (const m of raw.matchAll(pat)) {
      if (m[1]) addCompanyTokens(m[1]);
    }
  }

  const isExcludedNonSkill = (term: string): boolean => {
    const lower = term.trim().toLowerCase();
    if (!lower || STOPWORDS.has(lower) || excludedCompanyTokens.has(lower)) return true;
    const isKnownTech = KNOWN_TECHNICAL_SKILLS.some((k) => k.toLowerCase() === lower);
    if (isKnownTech) return false;
    const parts = lower.split(/\s+/);
    if (parts.some((p) => excludedCompanyTokens.has(p))) return true;
    if (/^(additional|optional|company|organization|organisation|client|clients|duties|responsibilities|qualifications|requirements|benefits|summary|overview)$/i.test(lower)) {
      return true;
    }
    return false;
  };

  const highSignalKeywords: AtsJobKeyword[] = [];
  const seenKeyLower = new Set<string>();

  const pushKeyword = (
    term: string,
    importance: AtsJobKeyword['importance'],
    category: AtsJobKeyword['category']
  ) => {
    const clean = term.trim();
    const key = clean.toLowerCase();
    if (!clean || seenKeyLower.has(key) || isExcludedNonSkill(clean)) return;
    seenKeyLower.add(key);
    highSignalKeywords.push({ term: clean, importance, category });
  };

  mandatorySkills.forEach((s, idx) =>
    pushKeyword(s, idx < 6 ? 'critical' : 'important', 'technical')
  );
  certifications.forEach((c) => pushKeyword(c, 'important', 'qualification'));
  preferredSkills.forEach((s) => pushKeyword(s, 'preferred', 'technical'));
  softSkills.slice(0, 5).forEach((s) => pushKeyword(s, 'relevant', 'soft'));

  const inferredTitle =
    meta?.jobTitle?.trim() ||
    lines.find((l) => l.length > 4 && l.length < 70 && !isBulletLine(l)) ||
    'Target Role';

  return {
    jobTitle: inferredTitle,
    companyName: meta?.companyName?.trim() || '',
    jobLocation: meta?.jobLocation?.trim() || '',
    experienceLevel:
      meta?.experienceLevel?.trim() ||
      (requiredYearsExperience === 0 || /\b(intern|fresher|entry[- ]level|junior|graduate)\b/i.test(raw)
        ? 'Entry / Junior'
        : requiredYearsExperience && requiredYearsExperience >= 5
        ? 'Senior'
        : 'Mid-Level'),
    industry: meta?.industry?.trim() || '',
    requiredYearsExperience,
    educationRequirement,
    mandatorySkills,
    preferredSkills,
    technicalSkills,
    softSkills,
    certifications,
    keyResponsibilities: responsibilityLines.slice(0, 8),
    highSignalKeywords: highSignalKeywords.slice(0, 24),
    parsedBy: 'deterministic',
    aiNote,
  };
}

export function mergeAiJobRequirements(
  base: ParsedJobRequirements,
  aiPartial: Partial<ParsedJobRequirements> | null | undefined
): ParsedJobRequirements {
  if (!aiPartial || typeof aiPartial !== 'object') return base;

  const companyName = (aiPartial.companyName || '').trim() || base.companyName;
  const excludedCompanyWords = new Set<string>();
  if (companyName) {
    const lowerComp = companyName.toLowerCase();
    excludedCompanyWords.add(lowerComp);
    lowerComp
      .split(/[\s,./&-]+/)
      .filter((w) => w.length >= 3 && !STOPWORDS.has(w))
      .forEach((w) => excludedCompanyWords.add(w));
  }

  const isValidSkillOrKeyword = (term: string): boolean => {
    const lower = term.trim().toLowerCase();
    if (!lower || STOPWORDS.has(lower) || excludedCompanyWords.has(lower)) return false;
    const knownTech = KNOWN_TECHNICAL_SKILLS.some((k) => k.toLowerCase() === lower);
    if (knownTech) return true;
    const words = lower.split(/\s+/);
    if (words.some((w) => excludedCompanyWords.has(w))) return false;
    if (/^(additional|optional|company|team|candidates?|applicants?|requirements|responsibilities|qualifications)$/i.test(lower)) {
      return false;
    }
    return term.trim().length >= 2 && term.trim().length <= 42;
  };

  const dedupeStrings = (items: unknown, enforceSkillFilter = false): string[] => {
    if (!Array.isArray(items)) return [];
    const seen = new Set<string>();
    const out: string[] = [];
    for (const item of items) {
      if (typeof item !== 'string') continue;
      const trimmed = item.trim();
      if (!trimmed) continue;
      if (enforceSkillFilter && !isValidSkillOrKeyword(trimmed)) continue;
      const lower = trimmed.toLowerCase();
      if (!seen.has(lower)) {
        seen.add(lower);
        out.push(trimmed);
      }
    }
    return out;
  };

  const mergeLists = (a: string[], b: string[]): string[] =>
    dedupeStrings([...a, ...b], true);

  const aiMand = dedupeStrings(aiPartial.mandatorySkills, true);
  const aiPref = dedupeStrings(aiPartial.preferredSkills, true);
  const aiTech = dedupeStrings(aiPartial.technicalSkills, true);
  const aiSoft = dedupeStrings(aiPartial.softSkills, true);
  const aiCerts = dedupeStrings(aiPartial.certifications, false);
  const aiResp = dedupeStrings(aiPartial.keyResponsibilities, false);

  const kwMap = new Map<string, AtsJobKeyword>();
  if (Array.isArray(aiPartial.highSignalKeywords)) {
    for (const k of aiPartial.highSignalKeywords) {
      if (!k || typeof k.term !== 'string' || !k.term.trim()) continue;
      const cleanTerm = k.term.trim();
      if (!isValidSkillOrKeyword(cleanTerm)) continue;
      const imp =
        k.importance === 'critical' ||
        k.importance === 'important' ||
        k.importance === 'preferred' ||
        k.importance === 'relevant'
          ? k.importance
          : 'important';
      const cat =
        k.category === 'technical' ||
        k.category === 'soft' ||
        k.category === 'domain' ||
        k.category === 'qualification' ||
        k.category === 'action'
          ? k.category
          : 'technical';
      kwMap.set(cleanTerm.toLowerCase(), {
        term: cleanTerm,
        importance: imp,
        category: cat,
      });
    }
  }
  for (const baseKw of base.highSignalKeywords) {
    if (!kwMap.has(baseKw.term.toLowerCase())) {
      kwMap.set(baseKw.term.toLowerCase(), baseKw);
    }
  }

  return {
    jobTitle: (aiPartial.jobTitle || '').trim() || base.jobTitle,
    companyName,
    jobLocation: (aiPartial.jobLocation || '').trim() || base.jobLocation,
    experienceLevel: (aiPartial.experienceLevel || '').trim() || base.experienceLevel,
    industry: (aiPartial.industry || '').trim() || base.industry,
    requiredYearsExperience:
      typeof aiPartial.requiredYearsExperience === 'number' &&
      Number.isFinite(aiPartial.requiredYearsExperience)
        ? aiPartial.requiredYearsExperience
        : base.requiredYearsExperience,
    educationRequirement:
      (aiPartial.educationRequirement || '').trim() || base.educationRequirement,
    mandatorySkills: aiMand.length > 0 ? mergeLists(aiMand, base.mandatorySkills) : base.mandatorySkills,
    preferredSkills: aiPref.length > 0 ? mergeLists(aiPref, base.preferredSkills) : base.preferredSkills,
    technicalSkills: aiTech.length > 0 ? mergeLists(aiTech, base.technicalSkills) : base.technicalSkills,
    softSkills: aiSoft.length > 0 ? mergeLists(aiSoft, base.softSkills) : base.softSkills,
    certifications: aiCerts.length > 0 ? dedupeStrings([...aiCerts, ...base.certifications]) : base.certifications,
    keyResponsibilities: aiResp.length > 0 ? aiResp.slice(0, 8) : base.keyResponsibilities,
    highSignalKeywords: Array.from(kwMap.values()).slice(0, 24),
    parsedBy: 'gemini-ai',
    aiNote: (aiPartial.aiNote || '').trim() || base.aiNote,
  };
}

/* ========================================================================== */
/* DETERMINISTIC 100-POINT WEIGHTED ATS SCORING ENGINE                        */
/* ========================================================================== */

function getScoreBand(score: number): AtsScoreBand {
  if (score >= 90) return 'Excellent Match';
  if (score >= 75) return 'Strong Match';
  if (score >= 60) return 'Moderate Match';
  if (score >= 40) return 'Needs Improvement';
  return 'Weak Match';
}

function estimateResumeYears(draft: AtsExtractedResumeDraft): number | null {
  let totalMonths = 0;
  let counted = 0;
  const nowYear = new Date().getFullYear();

  for (const exp of draft.experience) {
    const startYearMatch = exp.startDate?.match(/\b(19|20)\d{2}\b/);
    const endYearMatch = exp.endDate?.match(/\b(19|20)\d{2}\b/);
    if (startYearMatch) {
      const startY = parseInt(startYearMatch[0], 10);
      const endY =
        exp.current || /present|current/i.test(exp.endDate || '')
          ? nowYear
          : endYearMatch
          ? parseInt(endYearMatch[0], 10)
          : startY;
      const diffYears = Math.max(0.25, Math.min(25, endY - startY + 0.5));
      totalMonths += Math.round(diffYears * 12);
      counted += 1;
    }
  }

  if (counted === 0) return draft.experience.length > 0 ? null : 0;
  return Math.round((totalMonths / 12) * 10) / 10;
}

export function scoreResumeAgainstJob(
  draft: AtsExtractedResumeDraft,
  job: ParsedJobRequirements
): AtsAnalysisResult {
  // Prepare searchable section texts so we can cite exact section locations
  const sectionHaystacks: Array<{ name: string; text: string }> = [
    { name: 'Summary', text: normalizeTextForMatch(draft.summary) },
    {
      name: 'Experience',
      text: normalizeTextForMatch(
        draft.experience
          .map((e) => `${e.position} ${e.company} ${e.highlights.join(' ')}`)
          .join(' ')
      ),
    },
    {
      name: 'Projects',
      text: normalizeTextForMatch(
        draft.projects
          .map((p) => `${p.title} ${p.description || ''} ${p.technologies.join(' ')} ${p.highlights.join(' ')}`)
          .join(' ')
      ),
    },
    {
      name: 'Skills',
      text: normalizeTextForMatch(
        [
          ...draft.skills,
          ...draft.skillCategories.flatMap((c) => [c.category, ...c.skills]),
        ].join(' ')
      ),
    },
    {
      name: 'Education',
      text: normalizeTextForMatch(
        draft.education
          .map((ed) => `${ed.degree} ${ed.specialization || ''} ${ed.institution}`)
          .join(' ')
      ),
    },
    {
      name: 'Certifications & Achievements',
      text: normalizeTextForMatch(
        [
          ...draft.certifications.map((c) => `${c.name} ${c.issuer}`),
          ...draft.achievements,
        ].join(' ')
      ),
    },
  ];
  const fullHaystack = normalizeTextForMatch(
    [draft.extractedText, ...sectionHaystacks.map((s) => s.text)].join(' ')
  );

  // -------------------------------------------------------------------------
  // 1. KEYWORD MATCH (30 pts)
  // -------------------------------------------------------------------------
  const matchedKeywords: AtsMatchedKeyword[] = [];
  const missingKeywords: AtsMissingKeyword[] = [];

  const keywordPool = job.highSignalKeywords.length > 0
    ? job.highSignalKeywords
    : job.technicalSkills.map((t) => ({
        term: t,
        importance: 'important' as const,
        category: 'technical' as const,
      }));

  let earnedKeywordWeight = 0;
  let totalKeywordWeight = 0;

  for (const kw of keywordPool) {
    const weight =
      kw.importance === 'critical'
        ? 3.0
        : kw.importance === 'important'
        ? 2.0
        : kw.importance === 'preferred'
        ? 1.25
        : 1.0;
    totalKeywordWeight += weight;

    const locations: string[] = [];
    let bestMatchType: 'exact' | 'alias' = 'exact';
    let found = false;

    for (const sec of sectionHaystacks) {
      const m = textContainsTerm(sec.text, kw.term);
      if (m.matched) {
        found = true;
        locations.push(sec.name);
        if (m.matchType === 'alias') bestMatchType = 'alias';
      }
    }

    if (!found) {
      const fallbackFull = textContainsTerm(fullHaystack, kw.term);
      if (fallbackFull.matched) {
        found = true;
        locations.push('Resume Text');
        bestMatchType = fallbackFull.matchType;
      }
    }

    if (found) {
      earnedKeywordWeight += weight;
      matchedKeywords.push({
        term: kw.term,
        importance: kw.importance,
        locations,
        matchType: bestMatchType,
      });
    } else {
      const group =
        kw.importance === 'critical'
          ? 'critical'
          : kw.importance === 'important'
          ? 'important'
          : kw.importance === 'preferred'
          ? 'preferred'
          : 'additional';
      missingKeywords.push({
        term: kw.term,
        group,
        whyItMatters:
          group === 'critical'
            ? 'Core requirement explicitly emphasized in the job description.'
            : group === 'important'
            ? 'Key role competency expected for screening match.'
            : group === 'preferred'
            ? 'Preferred / bonus qualification that differentiates candidates.'
            : 'Domain-relevant phrase recurring in the role description.',
        guidance: `Only reference "${kw.term}" if you genuinely have hands-on experience or completed projects using it.`,
      });
    }
  }

  const keywordRatio = totalKeywordWeight > 0 ? earnedKeywordWeight / totalKeywordWeight : 0.7;
  const keywordEarned = Math.round(keywordRatio * 30);

  const keywordCategory: AtsScoreCategory = {
    key: 'keywordMatch',
    label: 'Important Job Skills',
    earned: Math.min(30, Math.max(0, keywordEarned)),
    max: 30,
    percentage: Math.round((Math.min(30, Math.max(0, keywordEarned)) / 30) * 100),
    summary:
      keywordPool.length === 0
        ? 'No specific technical keywords were listed in the job description.'
        : `Matched ${matchedKeywords.length} of ${keywordPool.length} important job terms across your resume.`,
    evidence:
      matchedKeywords.length > 0
        ? matchedKeywords.slice(0, 6).map((m) => `${m.term} (${m.locations.join(', ')})`)
        : ['No target job skills found in your current resume text.'],
    gaps: missingKeywords.slice(0, 5).map((m) => m.term),
  };

  // -------------------------------------------------------------------------
  // 2. SKILLS MATCH (20 pts)
  // -------------------------------------------------------------------------
  const skillTargets: Array<{ skill: string; level: 'mandatory' | 'preferred' }> = [];
  const seenSkillTargets = new Set<string>();
  for (const s of job.mandatorySkills) {
    if (!seenSkillTargets.has(s.toLowerCase())) {
      seenSkillTargets.add(s.toLowerCase());
      skillTargets.push({ skill: s, level: 'mandatory' });
    }
  }
  for (const s of job.technicalSkills) {
    if (!seenSkillTargets.has(s.toLowerCase())) {
      seenSkillTargets.add(s.toLowerCase());
      skillTargets.push({ skill: s, level: 'mandatory' });
    }
  }
  for (const s of job.preferredSkills) {
    if (!seenSkillTargets.has(s.toLowerCase())) {
      seenSkillTargets.add(s.toLowerCase());
      skillTargets.push({ skill: s, level: 'preferred' });
    }
  }

  const skillsGap: AtsSkillsGapItem[] = [];
  let skillWeightEarned = 0;
  let skillWeightTotal = 0;

  const skillsSectionText = sectionHaystacks.find((s) => s.name === 'Skills')?.text || '';
  const appliedText = normalizeTextForMatch(
    [
      sectionHaystacks.find((s) => s.name === 'Experience')?.text || '',
      sectionHaystacks.find((s) => s.name === 'Projects')?.text || '',
      sectionHaystacks.find((s) => s.name === 'Certifications & Achievements')?.text || '',
    ].join(' ')
  );

  for (const target of skillTargets) {
    const w = target.level === 'mandatory' ? 2.0 : 1.0;
    skillWeightTotal += w;

    const inSkills = textContainsTerm(skillsSectionText, target.skill).matched;
    const inApplied = textContainsTerm(appliedText, target.skill).matched;
    const inFull = textContainsTerm(fullHaystack, target.skill).matched;

    if (inSkills && inApplied) {
      skillWeightEarned += w;
      skillsGap.push({
        skill: target.skill,
        requirementLevel: target.level,
        status: 'present',
        evidence: ['Listed in Skills', 'Demonstrated in Experience/Projects'],
        gapNote: 'Strongly supported in both Skills and applied work.',
      });
    } else if (inSkills || inApplied || inFull) {
      skillWeightEarned += w * 0.78;
      const where: string[] = [];
      if (inSkills) where.push('Skills section');
      if (inApplied) where.push('Experience/Projects');
      if (where.length === 0) where.push('Resume text');
      skillsGap.push({
        skill: target.skill,
        requirementLevel: target.level,
        status: inSkills ? 'present' : 'partial',
        evidence: where,
        gapNote: inSkills && !inApplied
          ? 'Listed in Skills, but adding a bullet showing real usage in Experience/Projects strengthens ATS confidence.'
          : 'Mentioned in context; ensure it is also clearly listed in your Skills section.',
      });
    } else {
      skillsGap.push({
        skill: target.skill,
        requirementLevel: target.level,
        status: 'missing',
        evidence: [],
        gapNote:
          target.level === 'mandatory'
            ? 'Required skill not detected in your resume.'
            : 'Preferred skill not detected in your resume.',
      });
    }
  }

  const skillsRatio =
    skillWeightTotal > 0
      ? skillWeightEarned / skillWeightTotal
      : draft.skills.length >= 5
      ? 0.85
      : 0.5;
  const skillsEarned = Math.min(20, Math.max(0, Math.round(skillsRatio * 20)));

  const presentSkillCount = skillsGap.filter((s) => s.status === 'present').length;
  const partialSkillCount = skillsGap.filter((s) => s.status === 'partial').length;
  const missingSkillCount = skillsGap.filter((s) => s.status === 'missing').length;

  const skillsCategory: AtsScoreCategory = {
    key: 'skillsMatch',
    label: 'Matched Skills',
    earned: skillsEarned,
    max: 20,
    percentage: Math.round((skillsEarned / 20) * 100),
    summary:
      skillTargets.length > 0
        ? `${presentSkillCount} matched cleanly, ${partialSkillCount} partially shown, ${missingSkillCount} missing from the job list.`
        : `Your resume lists ${draft.skills.length} skills.`,
    evidence: skillsGap
      .filter((s) => s.status !== 'missing')
      .slice(0, 6)
      .map((s) => `${s.skill} (${s.evidence.join(', ')})`),
    gaps: skillsGap
      .filter((s) => s.status === 'missing')
      .slice(0, 5)
      .map((s) => s.skill),
  };

  // -------------------------------------------------------------------------
  // 3. EXPERIENCE RELEVANCE (15 pts)
  // -------------------------------------------------------------------------
  const allBullets: Array<{ source: string; text: string }> = [
    ...draft.experience.flatMap((e) =>
      e.highlights.map((h) => ({
        source: `${e.position || 'Role'}${e.company ? ` @ ${e.company}` : ''}`,
        text: h,
      }))
    ),
    ...draft.projects.flatMap((p) =>
      p.highlights.map((h) => ({
        source: `Project: ${p.title || 'Untitled'}`,
        text: h,
      }))
    ),
  ];

  const actionLedBullets = allBullets.filter((b) => {
    const firstWord = b.text.trim().split(/\s+/)[0]?.toLowerCase().replace(/[^a-z-]/g, '');
    return firstWord ? ACTION_VERBS.has(firstWord) : false;
  });
  const quantifiedBullets = allBullets.filter((b) =>
    /\b\d+(?:\.\d+)?(?:%|\+|x|ms|s|kb|mb|gb|tb|users?|requests?|req\/s|clients?|projects?|k|m)?\b/i.test(
      b.text
    )
  );

  const actionVerbRate =
    allBullets.length > 0 ? Math.round((actionLedBullets.length / allBullets.length) * 100) : 0;

  // Title / responsibility token overlap
  const jdTitleTokens = normalizeTextForMatch(job.jobTitle)
    .split(/\s+/)
    .filter((w) => w.length >= 3 && !STOPWORDS.has(w));
  const resumeRoleCorpus = normalizeTextForMatch(
    [
      draft.personalInfo.jobTitle || '',
      draft.summary,
      ...draft.experience.map((e) => `${e.position} ${e.highlights.join(' ')}`),
      ...draft.projects.map((p) => `${p.title} ${p.highlights.join(' ')}`),
    ].join(' ')
  );
  const titleHits = jdTitleTokens.filter((tok) => resumeRoleCorpus.includes(tok));
  const titleOverlapRatio = jdTitleTokens.length > 0 ? titleHits.length / jdTitleTokens.length : 0.7;

  const yearsEstimated = estimateResumeYears(draft);
  let yearsPoints = 4;
  if (job.requiredYearsExperience && job.requiredYearsExperience > 0) {
    if (yearsEstimated === null) yearsPoints = 2; // Missing dates -> missing info, not assumed zero
    else if (yearsEstimated >= job.requiredYearsExperience) yearsPoints = 4;
    else if (yearsEstimated >= job.requiredYearsExperience * 0.65) yearsPoints = 2.8;
    else if (yearsEstimated > 0) yearsPoints = 1.5;
    else yearsPoints = 0.5;
  } else if (draft.experience.length === 0 && draft.projects.length === 0) {
    yearsPoints = 0;
  } else if (draft.experience.length === 0 && draft.projects.length > 0) {
    yearsPoints = 3; // Entry/project portfolio credit
  }

  const roleAlignmentPts = Math.round(titleOverlapRatio * 6 * 10) / 10;
  const bulletQualityPts =
    allBullets.length === 0
      ? 0
      : Math.min(
          5,
          (actionVerbRate / 100) * 3 +
            Math.min(1, quantifiedBullets.length / Math.max(2, allBullets.length * 0.4)) * 2
        );

  const experienceEarned = Math.min(
    15,
    Math.max(0, Math.round(roleAlignmentPts + yearsPoints + bulletQualityPts))
  );

  const bulletFeedback: AtsExperienceFinding['bulletFeedback'] = [];
  for (const b of allBullets) {
    const lower = b.text.trim().toLowerCase();
    const startsWeak = WEAK_OPENERS.some((op) => lower.startsWith(op));
    const firstWord = lower.split(/\s+/)[0]?.replace(/[^a-z-]/g, '') || '';
    const hasActionVerb = ACTION_VERBS.has(firstWord);
    if (startsWeak || !hasActionVerb) {
      bulletFeedback.push({
        source: b.source,
        original: b.text,
        issue: startsWeak
          ? 'Opens with a passive phrase ("Worked on" / "Responsible for") instead of an action verb.'
          : 'Could open with a clearer, active engineering/impact verb describing your direct contribution.',
        suggestionHint: 'Start with a concrete action verb reflecting what you actually built, designed, or delivered.',
      });
    }
    if (bulletFeedback.length >= 6) break;
  }

  const roleAlignment: AtsExperienceFinding['roleAlignment'] =
    titleOverlapRatio >= 0.75 && draft.experience.length > 0
      ? 'strong'
      : titleOverlapRatio >= 0.45
      ? 'moderate'
      : draft.experience.length === 0 && draft.projects.length > 0
      ? 'entry-level'
      : 'partial';

  const expCategory: AtsScoreCategory = {
    key: 'experienceRelevance',
    label: 'Project & Experience Match',
    earned: experienceEarned,
    max: 15,
    percentage: Math.round((experienceEarned / 15) * 100),
    summary:
      allBullets.length === 0
        ? 'Add bullet points describing your projects or work experience.'
        : `${actionVerbRate}% of ${allBullets.length} bullets start with clear action verbs.`,
    evidence: [
      ...(draft.experience.length > 0
        ? [`${draft.experience.length} work entry/entries (${yearsEstimated !== null ? `~${yearsEstimated} yrs` : 'dates need review'})`]
        : []),
      ...(draft.projects.length > 0 ? [`${draft.projects.length} project(s) listed`] : []),
      ...(titleHits.length > 0 ? [`Matching role terms: ${titleHits.join(', ')}`] : []),
    ],
    gaps: [
      ...(draft.experience.length === 0 && draft.projects.length === 0
        ? ['No work experience or project entries found']
        : []),
      ...(job.requiredYearsExperience && yearsEstimated !== null && yearsEstimated < job.requiredYearsExperience
        ? [`Job asks for ${job.requiredYearsExperience}+ yrs; resume shows ~${yearsEstimated} yrs`]
        : []),
      ...(bulletFeedback.length > 0
        ? [`${bulletFeedback.length} bullet(s) can start with stronger action words`]
        : []),
    ],
  };

  // -------------------------------------------------------------------------
  // 4. EDUCATION & QUALIFICATIONS (10 pts)
  // -------------------------------------------------------------------------
  const eduText = sectionHaystacks.find((s) => s.name === 'Education')?.text || '';
  const certText =
    sectionHaystacks.find((s) => s.name === 'Certifications & Achievements')?.text || '';

  let eduEarned = 0;
  const eduEvidence: string[] = [];
  const eduGaps: string[] = [];

  if (draft.education.length > 0) {
    eduEarned += 5;
    eduEvidence.push(
      draft.education.map((ed) => `${ed.degree}${ed.institution ? ` — ${ed.institution}` : ''}`).join('; ')
    );
  } else {
    eduGaps.push('No formal education entry detected (Missing information).');
  }

  if (job.educationRequirement) {
    const reqLower = job.educationRequirement.toLowerCase();
    const needsMastersOrPhd = /\b(master|ph\.?d|doctorate)\b/i.test(reqLower);
    const needsBachelor = /\b(bachelor|b\.?s\.?|b\.?tech|b\.?e\.?|undergraduate)\b/i.test(reqLower);
    const hasMastersOrPhd = /\b(master|m\.?s\.?|m\.?tech|ph\.?d|doctorate)\b/i.test(eduText);
    const hasBachelor = /\b(bachelor|b\.?s\.?|b\.?tech|b\.?e\.?|degree|university)\b/i.test(eduText);

    if (needsMastersOrPhd) {
      if (hasMastersOrPhd) {
        eduEarned += 5;
        eduEvidence.push('Matches advanced degree requirement.');
      } else if (hasBachelor) {
        eduEarned += 3;
        eduGaps.push('JD mentions a Master’s/PhD degree; resume shows Bachelor’s level (Qualification gap).');
      } else {
        eduGaps.push(`JD lists education preference: "${job.educationRequirement}".`);
      }
    } else if (needsBachelor) {
      if (hasBachelor || hasMastersOrPhd) {
        eduEarned += 5;
        eduEvidence.push('Matches Bachelor’s/higher degree requirement.');
      } else if (draft.education.length > 0) {
        eduEarned += 3;
      }
    } else {
      eduEarned += draft.education.length > 0 ? 5 : 0;
    }
  } else if (draft.education.length > 0) {
    eduEarned += 5;
    eduEvidence.push('Education clearly listed; JD states no restrictive degree level.');
  }

  if (job.certifications.length > 0) {
    const matchedCerts = job.certifications.filter((c) => textContainsTerm(certText, c).matched);
    if (matchedCerts.length === 0) {
      eduEarned = Math.max(0, eduEarned - 2);
      eduGaps.push(`JD mentions certification(s): ${job.certifications.join(', ')}.`);
    } else {
      eduEvidence.push(`Matched certifications: ${matchedCerts.join(', ')}`);
    }
  }

  eduEarned = Math.min(10, Math.max(0, eduEarned));
  const educationCategory: AtsScoreCategory = {
    key: 'educationQualifications',
    label: 'Education Check',
    earned: eduEarned,
    max: 10,
    percentage: Math.round((eduEarned / 10) * 100),
    summary:
      draft.education.length === 0
        ? 'Education section was not found in your resume.'
        : eduGaps.length === 0
        ? 'Your education aligns with what this job asks for.'
        : 'Education is listed with a few notes below.',
    evidence: eduEvidence.length > 0 ? eduEvidence : ['No education entries found.'],
    gaps: eduGaps,
  };

  // -------------------------------------------------------------------------
  // 5. RESUME SECTIONS (10 pts)
  // -------------------------------------------------------------------------
  const hasExpOrProj = draft.experience.length > 0 || draft.projects.length > 0;
  const hasEducation = draft.education.length > 0;
  const hasSkills = draft.skills.length > 0 || draft.skillCategories.length > 0;
  const hasSummaryOrExtras =
    Boolean(draft.summary?.trim()) || draft.certifications.length > 0 || draft.achievements.length > 0;

  const structureChecklist = [
    {
      section: 'Summary / Objective',
      present: Boolean(draft.summary?.trim()),
      note: draft.summary?.trim()
        ? 'Clear short summary helps recruiters understand your focus.'
        : 'Adding a short 2–3 line summary makes your resume easier to scan.',
    },
    {
      section: 'Experience / Projects',
      present: hasExpOrProj,
      note: hasExpOrProj
        ? `${draft.experience.length} work entry/entries and ${draft.projects.length} project(s) found.`
        : 'No work experience or projects found.',
    },
    {
      section: 'Education',
      present: hasEducation,
      note: hasEducation
        ? `${draft.education.length} education entry/entries found.`
        : 'Education section is missing or unclear.',
    },
    {
      section: 'Skills',
      present: hasSkills,
      note: hasSkills
        ? `${draft.skills.length} skills found.`
        : 'Adding a clear Skills section helps employers spot what you know.',
    },
    {
      section: 'Certifications / Awards',
      present: draft.certifications.length > 0 || draft.achievements.length > 0,
      note:
        draft.certifications.length > 0 || draft.achievements.length > 0
          ? 'Additional credentials are clearly listed.'
          : 'Optional section — include only if you have certificates or awards.',
    },
  ];

  let structureEarned = 0;
  if (hasExpOrProj) structureEarned += 4;
  if (hasEducation) structureEarned += 2.5;
  if (hasSkills) structureEarned += 2.5;
  if (hasSummaryOrExtras) structureEarned += 1;
  structureEarned = Math.min(10, Math.round(structureEarned));

  const structureCategory: AtsScoreCategory = {
    key: 'resumeStructure',
    label: 'Resume Sections',
    earned: structureEarned,
    max: 10,
    percentage: Math.round((structureEarned / 10) * 100),
    summary: `Found ${structureChecklist.filter((c) => c.present).length} of ${structureChecklist.length} standard resume sections.`,
    evidence: structureChecklist.filter((c) => c.present).map((c) => c.section),
    gaps: structureChecklist
      .filter((c) => !c.present && c.section !== 'Certifications / Awards')
      .map((c) => `${c.section} missing or needs a clearer heading`),
  };

  // -------------------------------------------------------------------------
  // 6. FORMATTING & READABILITY (10 pts)
  // -------------------------------------------------------------------------
  const formattingIssues: AtsFormattingIssue[] = [];
  let formattingDeduction = 0;

  if (draft.isScannedPdf && !draft.usedAiOcr) {
    formattingDeduction += 4;
    formattingIssues.push({
      id: 'fmt_scanned',
      severity: 'high',
      title: 'Resume looks like a scanned image',
      detail: 'Text could not be highlighted directly inside this PDF.',
      recommendation:
        'Save or export your resume directly as a regular PDF or Word (.docx) file so job systems can read every word.',
    });
  }

  if (draft.layoutHints.isTwoColumnLayout) {
    formattingDeduction += 2;
    formattingIssues.push({
      id: 'fmt_two_col',
      severity: 'medium',
      title: 'Two-column layout may scramble some readers',
      detail:
        'Older automated application portals sometimes read across two columns in the wrong order.',
      recommendation:
        'Using a single-column layout makes your resume easiest for automated systems to read.',
    });
  }

  if (draft.layoutHints.hasVisualSkillBarsOrCircles) {
    formattingDeduction += 1.5;
    formattingIssues.push({
      id: 'fmt_visual_bars',
      severity: 'medium',
      title: 'Skill bars or charts are hidden to automated readers',
      detail:
        'Progress bars, circles, or charts cannot be read as text by automated job systems.',
      recommendation:
        'Make sure every skill shown in charts or bars is also written out clearly in your Skills section.',
    });
  }

  if (draft.layoutHints.hasTablesOrColumnsInText && !draft.layoutHints.isTwoColumnLayout) {
    formattingDeduction += 1.5;
    formattingIssues.push({
      id: 'fmt_tables',
      severity: 'medium',
      title: 'Tables may confuse resume readers',
      detail:
        'Tables can cause automated hiring systems to mix up lines or skip information.',
      recommendation:
        'Use normal headings and bullet points instead of layout tables.',
    });
  }

  if (draft.layoutHints.hasInconsistentDates) {
    formattingDeduction += 1;
    formattingIssues.push({
      id: 'fmt_dates',
      severity: 'low',
      title: 'Some work or school dates are missing',
      detail:
        'One or more work or education entries are missing start or end dates.',
      recommendation:
        'Include clear start and end dates (for example, Jan 2022 – Dec 2024) on each role and degree.',
    });
  }

  if (draft.layoutHints.isTextTooDenseOrUnbulleted) {
    formattingDeduction += 1.5;
    formattingIssues.push({
      id: 'fmt_dense',
      severity: 'medium',
      title: 'Long paragraphs instead of short bullet points',
      detail:
        'Large blocks of text make it harder for busy recruiters and resume readers to spot your skills.',
      recommendation:
        'Split long paragraphs into short, 1–2 line bullet points.',
    });
  }

  if (draft.extractedText.length < 300) {
    formattingDeduction += 2;
    formattingIssues.push({
      id: 'fmt_short',
      severity: 'high',
      title: 'Very little resume text was found',
      detail: 'Less than 300 characters of text could be read from your file.',
      recommendation:
        'Check that your file uploaded cleanly and includes your work, project, and education details.',
    });
  }

  const formattingEarned = Math.min(10, Math.max(0, Math.round(10 - formattingDeduction)));
  const formattingCategory: AtsScoreCategory = {
    key: 'formattingReadability',
    label: 'Resume Readability',
    earned: formattingEarned,
    max: 10,
    percentage: Math.round((formattingEarned / 10) * 100),
    summary:
      formattingIssues.length === 0
        ? 'Good – Your resume is easy to read.'
        : `${formattingIssues.length} formatting issue(s) found.`,
    evidence:
      formattingIssues.length === 0
        ? ['Clean layout, readable text, and clear bullet points']
        : [`${formattingIssues.length} readability note(s) to check`],
    gaps: formattingIssues.map((f) => f.title),
  };

  // -------------------------------------------------------------------------
  // 7. CONTACT INFORMATION (5 pts)
  // -------------------------------------------------------------------------
  let contactEarned = 0;
  const contactEvidence: string[] = [];
  const contactGaps: string[] = [];

  if (draft.personalInfo.fullName?.trim()) {
    contactEarned += 1.5;
    contactEvidence.push(`Name: ${draft.personalInfo.fullName}`);
  } else {
    contactGaps.push('Full name not detected');
  }
  if (draft.personalInfo.email?.trim()) {
    contactEarned += 1.5;
    contactEvidence.push(`Email: ${draft.personalInfo.email}`);
  } else {
    contactGaps.push('Email address missing');
  }
  if (draft.personalInfo.phone?.trim()) {
    contactEarned += 1;
    contactEvidence.push(`Phone: ${draft.personalInfo.phone}`);
  } else {
    contactGaps.push('Phone number missing');
  }
  if (
    draft.personalInfo.location?.trim() ||
    draft.personalInfo.linkedin?.trim() ||
    draft.personalInfo.github?.trim() ||
    draft.personalInfo.website?.trim()
  ) {
    contactEarned += 1;
    const links = [
      draft.personalInfo.location,
      draft.personalInfo.linkedin ? 'LinkedIn' : '',
      draft.personalInfo.github ? 'GitHub' : '',
      draft.personalInfo.website ? 'Website' : '',
    ].filter(Boolean);
    contactEvidence.push(links.join(' · '));
  } else {
    contactGaps.push('Location or LinkedIn/GitHub/Portfolio link missing');
  }

  const contactRounded = Math.min(5, Math.round(contactEarned));
  const contactCategory: AtsScoreCategory = {
    key: 'contactInformation',
    label: 'Contact Information',
    earned: contactRounded,
    max: 5,
    percentage: Math.round((contactRounded / 5) * 100),
    summary:
      contactGaps.length === 0
        ? 'Complete essential contact details and professional links detected.'
        : `${contactGaps.length} contact field(s) missing or unrecognized.`,
    evidence: contactEvidence.length > 0 ? contactEvidence : ['No contact details extracted'],
    gaps: contactGaps,
  };

  const categories: AtsScoreCategory[] = [
    keywordCategory,
    skillsCategory,
    expCategory,
    educationCategory,
    structureCategory,
    formattingCategory,
    contactCategory,
  ];

  const overallScore = Math.min(
    100,
    Math.max(
      0,
      categories.reduce((sum, c) => sum + c.earned, 0)
    )
  );
  const scoreBand = getScoreBand(overallScore);

  const topPriorities: string[] = [];
  if (missingKeywords.filter((k) => k.group === 'critical').length > 0) {
    topPriorities.push(
      `Review critical job terms (${missingKeywords
        .filter((k) => k.group === 'critical')
        .slice(0, 4)
        .map((k) => k.term)
        .join(', ')}) and highlight genuine matching experience where applicable.`
    );
  }
  if (bulletFeedback.length > 0) {
    topPriorities.push(
      `Strengthen ${bulletFeedback.length} experience/project bullet(s) that use passive openers or lack clear action verbs.`
    );
  }
  if (formattingIssues.length > 0) {
    topPriorities.push(formattingIssues[0].recommendation);
  }
  if (!draft.summary?.trim()) {
    topPriorities.push(
      'Add a focused 2–3 sentence Summary connecting your verified background to the target role.'
    );
  }
  if (topPriorities.length === 0) {
    topPriorities.push(
      'Strong overall alignment. Double-check role-specific terminology and keep bullets crisp and factual.'
    );
  }

  return {
    overallScore,
    scoreBand,
    scoreDisclaimer:
      'Calculated from your uploaded resume content compared directly against this job description.',
    categories,
    matchedKeywords,
    missingKeywords,
    skillsGap,
    experienceAnalysis: {
      relevanceSummary: expCategory.summary,
      yearsEstimated,
      yearsRequired: job.requiredYearsExperience,
      roleAlignment,
      actionVerbRate,
      quantifiedBulletCount: quantifiedBullets.length,
      totalBulletCount: allBullets.length,
      bulletFeedback,
    },
    formattingIssues,
    structureChecklist,
    topPriorities: topPriorities.slice(0, 5),
    scoreExplanation: `${overallScore}/100 (${scoreBand}): ${categories
      .map((c) => `${c.label} ${c.earned}/${c.max}`)
      .join(' · ')}.`,
  };
}

/* ========================================================================== */
/* NON-FABRICATING IMPROVEMENT SUGGESTIONS & BEFORE/AFTER ENGINE              */
/* ========================================================================== */

const ACTION_UPGRADE_MAP: Array<[RegExp, string]> = [
  [/^worked on\s+/i, 'Engineered and maintained '],
  [/^responsible for\s+/i, 'Owned and delivered '],
  [/^helped (?:with|to)\s+/i, 'Collaborated on and supported '],
  [/^assisted (?:with|in)\s+/i, 'Contributed to '],
  [/^tasked with\s+/i, 'Executed '],
  [/^participated in\s+/i, 'Collaborated in '],
  [/^handled\s+/i, 'Managed '],
  [/^was involved in\s+/i, 'Supported '],
];

export function generateDeterministicSuggestions(
  draft: AtsExtractedResumeDraft,
  job: ParsedJobRequirements,
  analysis: AtsAnalysisResult
): AtsSuggestion[] {
  const suggestions: AtsSuggestion[] = [];

  // 1. Summary improvement (only referencing verified candidate skills/roles)
  const verifiedSkillsToHighlight = analysis.matchedKeywords
    .slice(0, 5)
    .map((k) => k.term);
  if (!draft.summary?.trim() && (draft.experience.length > 0 || draft.projects.length > 0)) {
    const primaryRole =
      draft.personalInfo.jobTitle ||
      draft.experience[0]?.position ||
      'Candidate';
    const skillsClause =
      verifiedSkillsToHighlight.length > 0
        ? ` with verified experience in ${verifiedSkillsToHighlight.join(', ')}`
        : '';
    suggestions.push({
      id: 'sug_summary_add',
      category: 'summary',
      priority: 'high',
      title: 'Add a Short Summary at the Top',
      targetSection: 'Summary',
      targetField: 'summary',
      originalContent: '',
      suggestedContent: `${primaryRole}${skillsClause}, seeking to contribute to ${job.jobTitle}${
        job.companyName ? ` at ${job.companyName}` : ''
      } through reliable technical execution and teamwork.`,
      reason:
        'A short 2–3 line summary at the top helps employers quickly see your background and main skills.',
      relevantRequirement: `Target role: ${job.jobTitle}`,
      status: 'pending',
      source: 'rule-based',
    });
  } else if (
    draft.summary?.trim() &&
    verifiedSkillsToHighlight.length > 0 &&
    verifiedSkillsToHighlight.some((sk) => !textContainsTerm(normalizeTextForMatch(draft.summary), sk).matched)
  ) {
    const missingFromSummary = verifiedSkillsToHighlight.filter(
      (sk) => !textContainsTerm(normalizeTextForMatch(draft.summary), sk).matched
    );
    suggestions.push({
      id: 'sug_summary_align',
      category: 'keyword-alignment',
      priority: 'medium',
      title: 'Add Your Main Skills to Your Summary',
      targetSection: 'Summary',
      targetField: 'summary',
      originalContent: draft.summary.trim(),
      suggestedContent: `${draft.summary.trim().replace(/\.$/, '')}. Core skills include ${missingFromSummary.join(', ')}.`,
      reason:
        'Mentioning skills you already have near the top makes it easier for hiring managers and resume tools to spot them right away.',
      relevantRequirement: `Your verified skills: ${missingFromSummary.join(', ')}`,
      status: 'pending',
      source: 'rule-based',
    });
  }

  // 2. Weak experience bullet rewrites (strictly zero metric fabrication)
  draft.experience.forEach((exp, expIdx) => {
    exp.highlights.forEach((bullet, bIdx) => {
      if (suggestions.filter((s) => s.category === 'experience').length >= 3) return;
      const trimmed = bullet.trim();
      if (!trimmed) return;
      for (const [regex, replacement] of ACTION_UPGRADE_MAP) {
        if (regex.test(trimmed)) {
          const rewritten = trimmed.replace(regex, replacement);
          suggestions.push({
            id: `sug_exp_${expIdx}_${bIdx}`,
            category: 'experience',
            priority: 'high',
            title: `Use a Stronger Action Word in ${exp.position || 'Experience'}`,
            targetSection: `Experience — ${exp.position || 'Role'}${exp.company ? ` @ ${exp.company}` : ''}`,
            targetField: 'experience-highlight',
            targetEntryIndex: expIdx,
            targetBulletIndex: bIdx,
            originalContent: trimmed,
            suggestedContent: rewritten.charAt(0).toUpperCase() + rewritten.slice(1),
            reason:
              'Starting with an action word shows what you directly built or delivered without changing any facts.',
            relevantRequirement: 'Clear experience bullets',
            status: 'pending',
            source: 'rule-based',
          });
          break;
        }
      }
    });
  });

  // 3. Project highlight action-verb clarity
  draft.projects.forEach((proj, pIdx) => {
    proj.highlights.forEach((bullet, bIdx) => {
      if (suggestions.filter((s) => s.category === 'projects').length >= 2) return;
      const trimmed = bullet.trim();
      for (const [regex, replacement] of ACTION_UPGRADE_MAP) {
        if (regex.test(trimmed)) {
          const rewritten = trimmed.replace(regex, replacement);
          suggestions.push({
            id: `sug_proj_${pIdx}_${bIdx}`,
            category: 'projects',
            priority: 'medium',
            title: `Make "${proj.title}" Project Bullet Clearer`,
            targetSection: `Projects — ${proj.title}`,
            targetField: 'project-highlight',
            targetEntryIndex: pIdx,
            targetBulletIndex: bIdx,
            originalContent: trimmed,
            suggestedContent: rewritten.charAt(0).toUpperCase() + rewritten.slice(1),
            reason: 'Clear action wording helps employers quickly understand what you built.',
            relevantRequirement: 'Project clarity',
            status: 'pending',
            source: 'rule-based',
          });
          break;
        }
      }
    });
  });

  // 4. Skills alignment: normalize shorthand aliases ONLY for skills already present!
  const matchedAliasItems = analysis.matchedKeywords.filter((m) => m.matchType === 'alias');
  if (matchedAliasItems.length > 0 && draft.skills.length > 0) {
    const termsToClarify = matchedAliasItems.map((m) => m.term).slice(0, 4);
    const updatedSkills = [...draft.skills];
    termsToClarify.forEach((t) => {
      if (!updatedSkills.some((s) => s.toLowerCase() === t.toLowerCase())) {
        updatedSkills.push(t);
      }
    });
    if (updatedSkills.length > draft.skills.length) {
      suggestions.push({
        id: 'sug_skills_canonical',
        category: 'skills',
        priority: 'high',
        title: 'Match Full Skill Names From the Job Post',
        targetSection: 'Skills',
        targetField: 'skills-organization',
        originalContent: draft.skills.join(', '),
        suggestedContent: updatedSkills.join(', '),
        reason:
          'You already have these skills in shorthand (such as JS instead of JavaScript). Using the exact spelling from the job post ensures nothing is missed.',
        relevantRequirement: `Exact spelling: ${termsToClarify.join(', ')}`,
        status: 'pending',
        source: 'rule-based',
      });
    }
  }

  // 5. Formatting / Structure guidance if needed
  for (const issue of analysis.formattingIssues.slice(0, 1)) {
    suggestions.push({
      id: `sug_fmt_${issue.id}`,
      category: 'structure',
      priority: issue.severity === 'high' ? 'high' : 'medium',
      title: `Format Fix: ${issue.title}`,
      targetSection: 'Resume Format Check',
      targetField: 'structure-note',
      originalContent: issue.detail,
      suggestedContent: issue.recommendation,
      reason: 'Fixing layout issues helps resume software read your sections cleanly.',
      relevantRequirement: 'Easy-to-read format',
      status: 'pending',
      source: 'rule-based',
    });
  }

  return suggestions.slice(0, 5);
}

/**
 * Safety guard: checks whether an AI-generated suggestion introduces unverified
 * numbers/percentages not present in the original text or claims an unpossessed missing critical skill.
 */
export function isSuggestionFactuallySafe(
  originalText: string,
  suggestedText: string,
  missingCriticalTerms: string[]
): boolean {
  const origNumbers = new Set(originalText.match(/\b\d+(?:\.\d+)?%?/g) || []);
  const suggNumbers = suggestedText.match(/\b\d+(?:\.\d+)?%?/g) || [];
  for (const num of suggNumbers) {
    if (!origNumbers.has(num)) {
      return false; // Reject newly invented metrics
    }
  }

  const normOrig = normalizeTextForMatch(originalText);
  const normSugg = normalizeTextForMatch(suggestedText);
  for (const missingTerm of missingCriticalTerms) {
    if (
      textContainsTerm(normSugg, missingTerm).matched &&
      !textContainsTerm(normOrig, missingTerm).matched
    ) {
      return false; // Reject injection of skills absent from candidate's background
    }
  }
  return true;
}

export function applyAcceptedSuggestionsToDraft(
  originalDraft: AtsExtractedResumeDraft,
  suggestions: AtsSuggestion[]
): AtsExtractedResumeDraft {
  // Deep clone originalDraft so Reject / Restore Original is always reversible & non-destructive
  const next: AtsExtractedResumeDraft = JSON.parse(JSON.stringify(originalDraft));

  for (const s of suggestions) {
    if (s.status !== 'accepted' && s.status !== 'edited') continue;
    const textToApply = (s.status === 'edited' && s.editedContent !== undefined
      ? s.editedContent
      : s.suggestedContent
    ).trim();

    if (s.targetField === 'summary') {
      next.summary = textToApply;
    } else if (
      s.targetField === 'experience-highlight' &&
      typeof s.targetEntryIndex === 'number' &&
      typeof s.targetBulletIndex === 'number' &&
      next.experience[s.targetEntryIndex]
    ) {
      next.experience[s.targetEntryIndex].highlights[s.targetBulletIndex] = textToApply;
    } else if (
      s.targetField === 'project-highlight' &&
      typeof s.targetEntryIndex === 'number' &&
      typeof s.targetBulletIndex === 'number' &&
      next.projects[s.targetEntryIndex]
    ) {
      next.projects[s.targetEntryIndex].highlights[s.targetBulletIndex] = textToApply;
    } else if (s.targetField === 'skills-organization') {
      const parsedSkills = textToApply
        .split(/[,|;\n]/)
        .map((item) => item.trim())
        .filter(Boolean);
      if (parsedSkills.length > 0) {
        next.skills = Array.from(new Set(parsedSkills));
        if (next.skillCategories.length > 0) {
          const existingSet = new Set(
            next.skillCategories.flatMap((c) => c.skills.map((k) => k.toLowerCase()))
          );
          const additions = next.skills.filter((sk) => !existingSet.has(sk.toLowerCase()));
          if (additions.length > 0) {
            next.skillCategories[0] = {
              ...next.skillCategories[0],
              skills: [...next.skillCategories[0].skills, ...additions],
            };
          }
        } else {
          next.skillCategories = [{ category: 'Skills', skills: next.skills }];
        }
      }
    } else if (s.targetField === 'structure-note') {
      // If user explicitly accepts a formatting recommendation (e.g., switching to single-column export draft)
      if (s.id.includes('fmt_two_col')) {
        next.layoutHints.isTwoColumnLayout = false;
        next.layoutHints.hasTablesOrColumnsInText = false;
      } else if (s.id.includes('fmt_visual_bars')) {
        next.layoutHints.hasVisualSkillBarsOrCircles = false;
      }
    }
  }

  next.extractedText = rebuildDraftExtractedText(next);
  return next;
}

export function buildComparisonSnapshot(
  initialAnalysis: AtsAnalysisResult,
  updatedAnalysis: AtsAnalysisResult,
  suggestions: AtsSuggestion[]
): AtsComparisonSnapshot {
  const initialIssueTitles = new Set(initialAnalysis.formattingIssues.map((f) => f.title));
  const updatedIssueTitles = new Set(updatedAnalysis.formattingIssues.map((f) => f.title));

  const resolvedFormatting = Array.from(initialIssueTitles).filter(
    (t) => !updatedIssueTitles.has(t)
  );
  const newlyMatched = updatedAnalysis.matchedKeywords
    .filter(
      (u) => !initialAnalysis.matchedKeywords.some((o) => o.term.toLowerCase() === u.term.toLowerCase())
    )
    .map((m) => `Aligned keyword: ${m.term}`);

  const resolvedIssues = [...resolvedFormatting, ...newlyMatched];
  const remainingIssues = [
    ...updatedAnalysis.missingKeywords.slice(0, 4).map((m) => `Missing ${m.group} term: ${m.term}`),
    ...updatedAnalysis.formattingIssues.map((f) => f.title),
  ];

  const appliedSuggestionCount = suggestions.filter(
    (s) => s.status === 'accepted' || s.status === 'edited'
  ).length;
  const scoreDelta = updatedAnalysis.overallScore - initialAnalysis.overallScore;

  return {
    originalScore: initialAnalysis.overallScore,
    updatedScore: updatedAnalysis.overallScore,
    scoreDelta,
    originalMatchedCount: initialAnalysis.matchedKeywords.length,
    updatedMatchedCount: updatedAnalysis.matchedKeywords.length,
    originalMissingCount: initialAnalysis.missingKeywords.length,
    updatedMissingCount: updatedAnalysis.missingKeywords.length,
    originalFormattingIssuesCount: initialAnalysis.formattingIssues.length,
    updatedFormattingIssuesCount: updatedAnalysis.formattingIssues.length,
    resolvedIssues,
    remainingIssues,
    appliedSuggestionCount,
    summaryNote:
      scoreDelta > 0
        ? `Your Resume Match Score improved by +${scoreDelta} points (${initialAnalysis.overallScore} to ${updatedAnalysis.overallScore}) after applying ${appliedSuggestionCount} change(s).`
        : scoreDelta === 0
        ? `Your Resume Match Score remains ${updatedAnalysis.overallScore}/100 after applying ${appliedSuggestionCount} wording change(s). Readability improved without adding unverified skills.`
        : `Your Resume Match Score updated from ${initialAnalysis.overallScore} to ${updatedAnalysis.overallScore} based on your edits.`,
  };
}

/**
 * Converts an ATS working draft cleanly into an editable Resume record
 * for "Open in Resume Editor", preserving all existing template & user fields when editing a saved resume.
 */
export function applyAtsDraftToResume(
  baseResume: Resume | null,
  draft: AtsExtractedResumeDraft,
  userId: string,
  jobTitle?: string
): Resume {
  const now = new Date().toISOString();
  if (baseResume) {
    return {
      ...baseResume,
      objective: draft.summary || baseResume.objective,
      personalInfo: {
        ...baseResume.personalInfo,
        fullName: draft.personalInfo.fullName || baseResume.personalInfo.fullName,
        jobTitle: draft.personalInfo.jobTitle || baseResume.personalInfo.jobTitle,
        email: draft.personalInfo.email || baseResume.personalInfo.email,
        phone: draft.personalInfo.phone || baseResume.personalInfo.phone,
        location: draft.personalInfo.location || baseResume.personalInfo.location,
        linkedin: draft.personalInfo.linkedin || baseResume.personalInfo.linkedin,
        github: draft.personalInfo.github || baseResume.personalInfo.github,
        website: draft.personalInfo.website || baseResume.personalInfo.website,
      },
      experience: (baseResume.experience || []).map((origExp, idx) => {
        const draftExp = draft.experience[idx];
        if (!draftExp) return origExp;
        return {
          ...origExp,
          highlights:
            draftExp.highlights.length > 0 ? [...draftExp.highlights] : origExp.highlights,
        };
      }),
      projects: (baseResume.projects || []).map((origProj, idx) => {
        const draftProj = draft.projects[idx];
        if (!draftProj) return origProj;
        return {
          ...origProj,
          highlights:
            draftProj.highlights.length > 0 ? [...draftProj.highlights] : origProj.highlights,
        };
      }),
      skills:
        draft.skillCategories.length > 0
          ? draft.skillCategories.map((sc, i) => ({
              id: baseResume.skills?.[i]?.id || `skill_cat_${i + 1}`,
              category: sc.category,
              skills: [...sc.skills],
            }))
          : baseResume.skills,
      updatedAt: now,
    };
  }

  // Imported file -> create clean ATS-friendly Simple One-Page Resume
  const newId = `cv_ats_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  return {
    id: newId,
    userId,
    title: draft.fileName.replace(/\.(pdf|docx|txt)$/i, '') || 'ATS Analyzed Resume',
    targetRole: jobTitle || draft.personalInfo.jobTitle || '',
    template: 'simple-one-page',
    fontFamily: 'sans',
    themeColor: '#111827',
    personalInfo: {
      fullName: draft.personalInfo.fullName || 'Candidate',
      jobTitle: draft.personalInfo.jobTitle || jobTitle || '',
      email: draft.personalInfo.email || '',
      phone: draft.personalInfo.phone || '',
      location: draft.personalInfo.location || '',
      linkedin: draft.personalInfo.linkedin || '',
      github: draft.personalInfo.github || '',
      website: draft.personalInfo.website || '',
    },
    objective: draft.summary || '',
    experience: draft.experience.map((e, i) => ({
      id: e.id || `exp_${i + 1}`,
      company: e.company || '',
      position: e.position || '',
      location: e.location || '',
      startDate: e.startDate || '',
      endDate: e.endDate || '',
      current: Boolean(e.current),
      highlights: [...e.highlights],
    })),
    education: draft.education.map((ed, i) => ({
      id: ed.id || `edu_${i + 1}`,
      institution: ed.institution || '',
      degree: ed.degree || '',
      specialization: ed.specialization || '',
      location: ed.location || '',
      startDate: ed.startDate || '',
      endDate: ed.endDate || '',
      current: /present|current/i.test(ed.endDate || ''),
      grade: ed.grade || '',
    })),
    projects: draft.projects.map((p, i) => ({
      id: p.id || `proj_${i + 1}`,
      title: p.title || '',
      description: p.description || '',
      technologies: [...p.technologies],
      highlights: [...p.highlights],
    })),
    skills:
      draft.skillCategories.length > 0
        ? draft.skillCategories.map((c, i) => ({
            id: `skill_${i + 1}`,
            category: c.category,
            skills: [...c.skills],
          }))
        : draft.skills.length > 0
        ? [{ id: 'skill_1', category: 'Technical Skills', skills: [...draft.skills] }]
        : [],
    achievements: draft.achievements.map((a, i) => ({
      id: `ach_${i + 1}`,
      title: a,
      issuer: '',
      date: '',
    })),
    certifications: draft.certifications.map((c, i) => ({
      id: c.id || `cert_${i + 1}`,
      name: c.name || '',
      issuer: c.issuer || '',
      issueDate: c.issueDate || '',
    })),
    createdAt: now,
    updatedAt: now,
  };
}
