import type {
  Resume,
  TemplateCategory,
  TemplateCustomization,
  TemplateId,
} from '../types/resume';

export type ResumeSectionKey =
  | 'objective'
  | 'education'
  | 'thesis'
  | 'coursework'
  | 'experience'
  | 'research'
  | 'publications'
  | 'projects'
  | 'daily-life'
  | 'philosophy'
  | 'strengths'
  | 'languages'
  | 'skills'
  | 'skill-matrix'
  | 'learning'
  | 'interests'
  | 'career-interests'
  | 'custom-sections'
  | 'achievements'
  | 'leadership'
  | 'volunteer'
  | 'memberships'
  | 'certifications'
  | 'additional'
  | 'references';

export type TemplateLayoutMode =
  | 'single-column'
  | 'asymmetric-labels' // 24% left section title, 76% right content (Modern Minimalist)
  | 'moderncv-classic' // ~19% left rail (accent bar + right-aligned dates/labels) + ~81% content column (Modern Corporate)
  | 'sidebar-light' // 32% light tinted left sidebar + 68% main column
  | 'sidebar-dark' // 31% dark accent left sidebar + 69% main column
  | 'main-left-sidebar-right' // ~61% left main column + ~37% right white sidebar (AltaCV Two Column Professional)
  | 'two-column-editorial' // 50% / 50% balanced white 2-column Overleaf Modern Simple CV (Elegant Serif)
  | 'two-column-internship'; // 50% / 50% balanced white 2-column Kunal Gehlot Internship Resume

export type TemplateHeaderVariant =
  | 'centered-academic' // Centered uppercase name + thick bottom border
  | 'classic-header' // Classic Professional structured header with optional photo & classic blue accent
  | 'modern-corporate-split' // Overleaf ModernCV Classic split header: two-tone name/italic title left, icon contact stack + optional framed photo right
  | 'jakes-centered' // Centered small-caps name, address, icon-prefixed contact links (Jake's Resume)
  | 'software-dev-centered' // Centered blue serif name, address below, centered icon contact row (Software Developer)
  | 'harvard-centered' // Centered traditional Harvard name + compact horizontal contact row (Harvard Style)
  | 'two-column-header' // Left-aligned name + burgundy tagline + compact icon contacts + optional top-right circle photo
  | 'centered-clean' // Centered title-case name + compact pipe bar (Harvard, Software Dev)
  | 'split-left-right' // Name/title on left, stacked contact on right (Classic, Internship)
  | 'editorial-double-rule' // Double top/bottom border, refined serif (Elegant Serif)
  | 'corporate-banner' // Solid accent-colored top banner with white text
  | 'minimal-accent-bar' // Left-aligned name with short 32pt accent rule (Modern Minimalist)
  | 'boxed-technical' // Clean framed box border around header (Engineering)
  | 'executive-framed' // Centered name + subtle top/bottom framed summary feel (Executive)
  | 'left-scholar' // Left-aligned scholar header with prominent ORCID/Scholar line (Research Scholar)
  | 'fresher-overleaf' // 3-column Overleaf fresher header: phone/email left, name/target role center, links right
  | 'internship-kunal'; // Left-aligned uppercase name + headline + compact horizontal icon contact row (Template 10)

export interface TemplateDefinition {
  id: TemplateId;
  name: string;
  shortTag: string;
  description: string;
  categories: Exclude<TemplateCategory, 'All Templates'>[];
  layout: TemplateLayoutMode;
  headerVariant: TemplateHeaderVariant;
  sectionOrder: ResumeSectionKey[];
  sidebarSections?: ResumeSectionKey[];
  bulletSymbol: '•' | '▪' | '–' | '▸';
  citationStyle: 'numbered' | 'bracketed';
  centeredHeadings?: boolean;
  skillsLayout?: 'rows' | 'grid-2col';
  defaultCustomization: TemplateCustomization;
}

export const TEMPLATE_CATEGORIES: TemplateCategory[] = [
  'All Templates',
  'Academic CV',
  'Professional',
  'ATS-Friendly',
  'Student & Fresher',
  'Technical & Developer',
  'Research',
  'Creative',
];

export const DEFAULT_ACADEMIC_ORDER: ResumeSectionKey[] = [
  'objective',
  'education',
  'experience',
  'publications',
  'projects',
  'skills',
  'achievements',
  'leadership',
  'volunteer',
  'memberships',
  'certifications',
  'additional',
  'references',
];

export const CLASSIC_PROFESSIONAL_ORDER: ResumeSectionKey[] = [
  'objective',
  'education',
  'thesis',
  'experience',
  'languages',
  'skills',
  'skill-matrix',
  'interests',
  'custom-sections',
  'projects',
  'publications',
  'achievements',
  'certifications',
  'leadership',
  'volunteer',
  'memberships',
  'references',
];

export const JAKES_ORDER: ResumeSectionKey[] = [
  'education',
  'coursework',
  'experience',
  'projects',
  'skills',
  'leadership',
];

export const SOFTWARE_DEV_ORDER: ResumeSectionKey[] = [
  'education',
  'experience',
  'projects',
  'additional',
];

export const HARVARD_ORDER: ResumeSectionKey[] = [
  'education',
  'experience',
  'leadership',
  'skills',
  'additional',
];

export const TWO_COLUMN_MAIN_ORDER: ResumeSectionKey[] = [
  'experience',
  'projects',
  'daily-life',
  'publications',
  'custom-sections',
];

export const TWO_COLUMN_SIDEBAR_ORDER: ResumeSectionKey[] = [
  'philosophy',
  'achievements',
  'strengths',
  'languages',
  'education',
  'references',
];

export const TWO_COLUMN_ORDER: ResumeSectionKey[] = [
  ...TWO_COLUMN_MAIN_ORDER,
  ...TWO_COLUMN_SIDEBAR_ORDER,
];

export const ELEGANT_SERIF_LEFT_ORDER: ResumeSectionKey[] = [
  'education',
  'experience',
  'research',
  'projects',
];

export const ELEGANT_SERIF_RIGHT_ORDER: ResumeSectionKey[] = [
  'objective',
  'skills',
  'publications',
  'achievements',
  'certifications',
  'languages',
  'leadership',
  'memberships',
  'interests',
  'references',
  'custom-sections',
];

export const ELEGANT_SERIF_ORDER: ResumeSectionKey[] = [
  'objective',
  'education',
  'experience',
  'research',
  'projects',
  'publications',
  'achievements',
  'skills',
  'languages',
  'certifications',
  'leadership',
  'memberships',
  'interests',
  'references',
  'custom-sections',
];

export const MODERN_CORPORATE_ORDER: ResumeSectionKey[] = [
  'objective',
  'experience',
  'strengths',
  'education',
  'skills',
  'projects',
  'certifications',
  'achievements',
  'languages',
  'leadership',
  'memberships',
  'interests',
  'references',
  'custom-sections',
];

export const FRESHER_RESUME_ORDER: ResumeSectionKey[] = [
  'education',
  'projects',
  'experience',
  'coursework',
  'skills',
  'publications',
  'achievements',
  'certifications',
  'leadership',
  'volunteer',
  'languages',
  'additional',
  'custom-sections',
];

export const INTERNSHIP_LEFT_ORDER: ResumeSectionKey[] = [
  'education',
  'achievements',
  'skills',
  'experience',
  'certifications',
  'languages',
  'custom-sections',
];

export const INTERNSHIP_RIGHT_ORDER: ResumeSectionKey[] = [
  'learning',
  'interests',
  'research',
  'career-interests',
];

export const INTERNSHIP_RESUME_ORDER: ResumeSectionKey[] = [
  'education',
  'learning',
  'interests',
  'achievements',
  'research',
  'skills',
  'career-interests',
  'experience',
  'certifications',
  'languages',
  'custom-sections',
];

export const PROFESSIONAL_ORDER: ResumeSectionKey[] = [
  'objective',
  'experience',
  'skills',
  'education',
  'projects',
  'certifications',
  'achievements',
  'leadership',
  'publications',
  'volunteer',
  'memberships',
  'additional',
  'references',
];

export const TECH_ORDER: ResumeSectionKey[] = [
  'objective',
  'skills',
  'experience',
  'projects',
  'education',
  'publications',
  'certifications',
  'achievements',
  'leadership',
  'volunteer',
  'memberships',
  'additional',
  'references',
];

export const STUDENT_ORDER: ResumeSectionKey[] = [
  'objective',
  'education',
  'skills',
  'projects',
  'experience',
  'achievements',
  'leadership',
  'certifications',
  'publications',
  'volunteer',
  'memberships',
  'additional',
  'references',
];

export const RESEARCH_ORDER: ResumeSectionKey[] = [
  'objective',
  'education',
  'experience',
  'publications',
  'achievements',
  'projects',
  'leadership',
  'volunteer',
  'skills',
  'memberships',
  'certifications',
  'additional',
  'references',
];

export const TEMPLATE_DEFINITIONS: TemplateDefinition[] = [
  {
    id: 'academic-cv',
    name: 'Academic CV',
    shortTag: 'LaTeX Classic',
    description:
      'Formal multi-page academic curriculum vitae with centered serif header, horizontal rules, and numbered publications.',
    categories: ['Academic CV', 'Research', 'ATS-Friendly'],
    layout: 'single-column',
    headerVariant: 'centered-academic',
    sectionOrder: DEFAULT_ACADEMIC_ORDER,
    bulletSymbol: '•',
    citationStyle: 'numbered',
    skillsLayout: 'rows',
    defaultCustomization: {
      fontFamily: 'serif',
      fontSize: 'standard',
      textColor: '#000000',
      accentColor: '#000000',
      sectionSpacing: 'balanced',
      pageMargins: 'standard',
      headingStyle: 'uppercase-rule',
    },
  },
  {
    id: 'classic-professional',
    name: 'Classic Professional',
    shortTag: 'Structured Classic CV',
    description:
      'Traditional multi-page professional CV with classic blue accents, optional profile photo, education, thesis, categorized experience, languages, computer skills, visual skill matrix, and references.',
    categories: ['Professional', 'ATS-Friendly'],
    layout: 'single-column',
    headerVariant: 'classic-header',
    sectionOrder: CLASSIC_PROFESSIONAL_ORDER,
    bulletSymbol: '•',
    citationStyle: 'numbered',
    skillsLayout: 'rows',
    defaultCustomization: {
      fontFamily: 'sans',
      fontSize: 'standard',
      textColor: '#111827',
      accentColor: '#1e4e8c',
      sectionSpacing: 'balanced',
      pageMargins: 'standard',
      headingStyle: 'classic-blue-rule',
    },
  },
  {
    id: 'jakes-resume',
    name: "Jake's Resume",
    shortTag: 'Software Developer',
    description:
      "A clean, single-column professional resume inspired by the classic Jake's Resume LaTeX layout.",
    categories: ['ATS-Friendly', 'Technical & Developer'],
    layout: 'single-column',
    headerVariant: 'jakes-centered',
    sectionOrder: JAKES_ORDER,
    bulletSymbol: '•',
    citationStyle: 'numbered',
    skillsLayout: 'rows',
    defaultCustomization: {
      fontFamily: 'serif',
      fontSize: 'standard',
      textColor: '#000000',
      accentColor: '#000000',
      sectionSpacing: 'tight',
      pageMargins: 'narrow',
      headingStyle: 'title-rule',
    },
  },
  {
    id: 'two-column-professional',
    name: 'Two Column Professional',
    shortTag: 'AltaCV Two-Column',
    description:
      'Clean two-column CV on crisp white background with burgundy headings, light gold underlines, optional circular photo, main column on left, strengths & 5-dot languages sidebar on right, categorized publications, and referees.',
    categories: ['Professional', 'Academic CV', 'Research', 'Creative'],
    layout: 'main-left-sidebar-right',
    headerVariant: 'two-column-header',
    sectionOrder: TWO_COLUMN_ORDER,
    sidebarSections: TWO_COLUMN_SIDEBAR_ORDER,
    bulletSymbol: '•',
    citationStyle: 'numbered',
    skillsLayout: 'rows',
    defaultCustomization: {
      fontFamily: 'sans',
      fontSize: 'standard',
      textColor: '#111827',
      accentColor: '#8f131b',
      sectionSpacing: 'balanced',
      pageMargins: 'narrow',
      headingStyle: 'burgundy-gold-rule',
    },
  },
  {
    id: 'software-developer',
    name: 'Software Developer',
    shortTag: 'Developer LaTeX',
    description:
      'Clean single-column software developer resume with centered classic blue serif header, compact contact links, uppercase blue rules, Education, Experience, Projects, and unified Additional section.',
    categories: ['Technical & Developer', 'ATS-Friendly', 'Professional'],
    layout: 'single-column',
    headerVariant: 'software-dev-centered',
    sectionOrder: SOFTWARE_DEV_ORDER,
    bulletSymbol: '•',
    citationStyle: 'numbered',
    centeredHeadings: false,
    skillsLayout: 'rows',
    defaultCustomization: {
      fontFamily: 'serif',
      fontSize: 'standard',
      textColor: '#111827',
      accentColor: '#1e4e8c',
      sectionSpacing: 'balanced',
      pageMargins: 'narrow',
      headingStyle: 'uppercase-rule',
    },
  },
  {
    id: 'harvard-style',
    name: 'Harvard Style',
    shortTag: 'Harvard Classic',
    description:
      'A traditional Harvard-inspired professional resume featuring education, experience, leadership, activities, technical skills and interests in a clean single-column format.',
    categories: ['Professional', 'ATS-Friendly', 'Academic CV'],
    layout: 'single-column',
    headerVariant: 'harvard-centered',
    sectionOrder: HARVARD_ORDER,
    bulletSymbol: '•',
    citationStyle: 'numbered',
    centeredHeadings: true,
    skillsLayout: 'rows',
    defaultCustomization: {
      fontFamily: 'serif',
      fontSize: 'standard',
      textColor: '#000000',
      accentColor: '#000000',
      sectionSpacing: 'balanced',
      pageMargins: 'standard',
      headingStyle: 'title-rule',
    },
  },
  {
    id: 'elegant-serif',
    name: 'Elegant Serif',
    shortTag: 'Modern Simple CV',
    description:
      'Refined academic and professional CV inspired by Overleaf Modern Simple CV with a monochrome banner header, balanced two-column serif layout, date-rail timelines, and scholarly sections.',
    categories: ['Academic CV', 'Professional', 'Research'],
    layout: 'two-column-editorial',
    headerVariant: 'editorial-double-rule',
    sectionOrder: ELEGANT_SERIF_ORDER,
    sidebarSections: ELEGANT_SERIF_RIGHT_ORDER,
    bulletSymbol: '•',
    citationStyle: 'numbered',
    centeredHeadings: false,
    skillsLayout: 'rows',
    defaultCustomization: {
      fontFamily: 'serif',
      fontSize: 'standard',
      textColor: '#111111',
      accentColor: '#1f2937',
      sectionSpacing: 'balanced',
      pageMargins: 'narrow',
      headingStyle: 'clean-caps',
    },
  },
  {
    id: 'modern-corporate',
    name: 'Modern Corporate',
    shortTag: 'ModernCV Classic',
    description:
      'Clean Overleaf ModernCV Classic / Banking-style corporate resume with left accent-bar section rail, right-aligned timeline dates, crisp sans-serif typography, hollow-circle bullets, 2-column technical skills, and optional framed portrait.',
    categories: ['Professional', 'ATS-Friendly'],
    layout: 'moderncv-classic',
    headerVariant: 'modern-corporate-split',
    sectionOrder: MODERN_CORPORATE_ORDER,
    bulletSymbol: '•',
    citationStyle: 'numbered',
    centeredHeadings: false,
    skillsLayout: 'grid-2col',
    defaultCustomization: {
      fontFamily: 'sans',
      fontSize: 'standard',
      textColor: '#111827',
      accentColor: '#3873b3',
      sectionSpacing: 'balanced',
      pageMargins: 'standard',
      headingStyle: 'moderncv-bar',
    },
  },
  {
    id: 'fresher-resume',
    name: 'Fresher Resume',
    shortTag: 'Students & Graduates',
    description:
      'Clean Overleaf-style fresher and student resume with a 3-column contact header, highlights & impact summary, steel-blue uppercase section rules, academic projects, optional internships, categorized skills, publications, and year-rail honors.',
    categories: ['Student & Fresher', 'ATS-Friendly'],
    layout: 'single-column',
    headerVariant: 'fresher-overleaf',
    sectionOrder: FRESHER_RESUME_ORDER,
    bulletSymbol: '•',
    citationStyle: 'numbered',
    centeredHeadings: false,
    skillsLayout: 'rows',
    defaultCustomization: {
      fontFamily: 'sans',
      fontSize: 'standard',
      textColor: '#111827',
      accentColor: '#3b6998',
      sectionSpacing: 'balanced',
      pageMargins: 'narrow',
      headingStyle: 'title-rule',
    },
  },
  {
    id: 'internship-resume',
    name: 'Internship Resume',
    shortTag: '2-Column Student',
    description:
      'Crisp two-column student & internship resume with bold uppercase name, icon contacts, thick black section rules, dotted education & skill dividers, trophy co-curricular items, en-dash learning list, and boxed interest/career tags.',
    categories: ['Student & Fresher', 'ATS-Friendly', 'Technical & Developer'],
    layout: 'two-column-internship',
    headerVariant: 'internship-kunal',
    sectionOrder: INTERNSHIP_RESUME_ORDER,
    sidebarSections: INTERNSHIP_RIGHT_ORDER,
    bulletSymbol: '•',
    citationStyle: 'numbered',
    centeredHeadings: false,
    skillsLayout: 'rows',
    defaultCustomization: {
      fontFamily: 'sans',
      fontSize: 'standard',
      textColor: '#111827',
      accentColor: '#111827',
      sectionSpacing: 'balanced',
      pageMargins: 'narrow',
      headingStyle: 'internship-rule',
    },
  },
];

export const TEXT_COLOR_SWATCHES = [
  { label: 'Pure Black', value: '#000000' },
  { label: 'Ink Charcoal', value: '#111827' },
  { label: 'Deep Slate', value: '#1e293b' },
];

export const ACCENT_COLOR_SWATCHES = [
  { label: 'Crimson Burgundy', value: '#8f131b' },
  { label: 'Classic Blue', value: '#1e4e8c' },
  { label: 'Monochrome', value: '#000000' },
  { label: 'Oxford Navy', value: '#0f2b5c' },
  { label: 'Royal Blue', value: '#1e3a8a' },
  { label: 'Forest Teal', value: '#0f766e' },
  { label: 'Burgundy', value: '#7c2d12' },
  { label: 'Indigo', value: '#3730a3' },
  { label: 'Charcoal Slate', value: '#334155' },
];

/**
 * Resolves legacy template IDs ('academic', undefined) cleanly to a TemplateId.
 */
export function resolveTemplateId(template?: string): TemplateId {
  if (!template || template === 'academic' || template === 'academic-cv') {
    return 'academic-cv';
  }
  const match = TEMPLATE_DEFINITIONS.find((t) => t.id === template);
  return match ? match.id : 'academic-cv';
}

export function getTemplateById(id?: string): TemplateDefinition {
  const resolved = resolveTemplateId(id);
  return (
    TEMPLATE_DEFINITIONS.find((t) => t.id === resolved) || TEMPLATE_DEFINITIONS[0]
  );
}

/**
 * Resolves effective customization for a Resume by merging template defaults
 * with any saved user overrides (`resume.customization` or legacy `fontFamily`).
 */
export function resolveTemplateCustomization(
  resume: Pick<Resume, 'template' | 'fontFamily' | 'themeColor' | 'customization'>
): TemplateCustomization {
  const template = getTemplateById(resume.template);
  const base = template.defaultCustomization;
  const custom = resume.customization;

  return {
    fontFamily: custom?.fontFamily || resume.fontFamily || base.fontFamily,
    fontSize: custom?.fontSize || base.fontSize,
    textColor: custom?.textColor || base.textColor,
    accentColor: custom?.accentColor || resume.themeColor || base.accentColor,
    sectionSpacing: custom?.sectionSpacing || base.sectionSpacing,
    pageMargins: custom?.pageMargins || base.pageMargins,
    headingStyle: custom?.headingStyle || base.headingStyle,
  };
}

/**
 * Computes consistent pt dimensions from customization settings so HTML preview
 * and @react-pdf/renderer PDF stay synchronized.
 */
export function getTypographyScale(custom: TemplateCustomization, templateId?: string) {
  const isJakes = templateId === 'jakes-resume';
  const isTwoColumn = templateId === 'two-column-professional';
  const isSoftwareDev = templateId === 'software-developer';
  const isHarvard = templateId === 'harvard-style';
  const isElegantSerif = templateId === 'elegant-serif';
  const isModernCorporate = templateId === 'modern-corporate';
  const isFresherResume = templateId === 'fresher-resume';
  const isInternshipResume = templateId === 'internship-resume';
  const baseFontPt =
    custom.fontSize === 'compact'
      ? 8.75
      : custom.fontSize === 'large'
      ? 10.25
      : isTwoColumn || isElegantSerif || isInternshipResume
      ? 9.0
      : isModernCorporate || isFresherResume
      ? 9.25
      : 9.5;
  const delta = baseFontPt - 9.5;

  const marginPt = isJakes
    ? custom.pageMargins === 'narrow'
      ? 26
      : custom.pageMargins === 'wide'
      ? 48
      : 36
    : isHarvard
    ? custom.pageMargins === 'narrow'
      ? 28
      : custom.pageMargins === 'wide'
      ? 48
      : 36
    : isElegantSerif
    ? custom.pageMargins === 'narrow'
      ? 28
      : custom.pageMargins === 'wide'
      ? 46
      : 36
    : isInternshipResume
    ? custom.pageMargins === 'narrow'
      ? 26
      : custom.pageMargins === 'wide'
      ? 44
      : 34
    : isModernCorporate
    ? custom.pageMargins === 'narrow'
      ? 32
      : custom.pageMargins === 'wide'
      ? 52
      : 40
    : isFresherResume
    ? custom.pageMargins === 'narrow'
      ? 28
      : custom.pageMargins === 'wide'
      ? 46
      : 34
    : isSoftwareDev
    ? custom.pageMargins === 'narrow'
      ? 28
      : custom.pageMargins === 'wide'
      ? 50
      : 38
    : isTwoColumn
    ? custom.pageMargins === 'narrow'
      ? 28
      : custom.pageMargins === 'wide'
      ? 44
      : 36
    : custom.pageMargins === 'narrow'
    ? 42
    : custom.pageMargins === 'wide'
    ? 62
    : 52;
  const marginHorizPt = isJakes
    ? custom.pageMargins === 'narrow'
      ? 32
      : custom.pageMargins === 'wide'
      ? 52
      : 42
    : isHarvard
    ? custom.pageMargins === 'narrow'
      ? 32
      : custom.pageMargins === 'wide'
      ? 54
      : 42
    : isElegantSerif
    ? custom.pageMargins === 'narrow'
      ? 30
      : custom.pageMargins === 'wide'
      ? 48
      : 38
    : isInternshipResume
    ? custom.pageMargins === 'narrow'
      ? 28
      : custom.pageMargins === 'wide'
      ? 46
      : 36
    : isModernCorporate
    ? custom.pageMargins === 'narrow'
      ? 34
      : custom.pageMargins === 'wide'
      ? 56
      : 44
    : isFresherResume
    ? custom.pageMargins === 'narrow'
      ? 34
      : custom.pageMargins === 'wide'
      ? 52
      : 40
    : isSoftwareDev
    ? custom.pageMargins === 'narrow'
      ? 34
      : custom.pageMargins === 'wide'
      ? 56
      : 44
    : isTwoColumn
    ? custom.pageMargins === 'narrow'
      ? 30
      : custom.pageMargins === 'wide'
      ? 46
      : 38
    : custom.pageMargins === 'narrow'
    ? 42
    : custom.pageMargins === 'wide'
    ? 62
    : 54;

  const sectionGapPt = isJakes
    ? custom.sectionSpacing === 'tight'
      ? 4.25
      : custom.sectionSpacing === 'relaxed'
      ? 9.5
      : 6.5
    : isHarvard
    ? custom.sectionSpacing === 'tight'
      ? 5
      : custom.sectionSpacing === 'relaxed'
      ? 10.5
      : 7.5
    : isElegantSerif
    ? custom.sectionSpacing === 'tight'
      ? 6
      : custom.sectionSpacing === 'relaxed'
      ? 12
      : 8.5
    : isInternshipResume
    ? custom.sectionSpacing === 'tight'
      ? 6.5
      : custom.sectionSpacing === 'relaxed'
      ? 11.5
      : 8.5
    : isModernCorporate
    ? custom.sectionSpacing === 'tight'
      ? 6.5
      : custom.sectionSpacing === 'relaxed'
      ? 12.5
      : 9
    : isFresherResume
    ? custom.sectionSpacing === 'tight'
      ? 5.5
      : custom.sectionSpacing === 'relaxed'
      ? 10.5
      : 7.5
    : isSoftwareDev
    ? custom.sectionSpacing === 'tight'
      ? 5
      : custom.sectionSpacing === 'relaxed'
      ? 10.5
      : 7.5
    : isTwoColumn
    ? custom.sectionSpacing === 'tight'
      ? 6
      : custom.sectionSpacing === 'relaxed'
      ? 11
      : 8.5
    : custom.sectionSpacing === 'tight'
    ? 6.5
    : custom.sectionSpacing === 'relaxed'
    ? 12
    : 9;
  const entryGapPt = isJakes
    ? custom.sectionSpacing === 'tight'
      ? 3
      : custom.sectionSpacing === 'relaxed'
      ? 7
      : 5
    : isHarvard
    ? custom.sectionSpacing === 'tight'
      ? 3.5
      : custom.sectionSpacing === 'relaxed'
      ? 8
      : 5.5
    : isElegantSerif
    ? custom.sectionSpacing === 'tight'
      ? 4.5
      : custom.sectionSpacing === 'relaxed'
      ? 9
      : 6.5
    : isInternshipResume
    ? custom.sectionSpacing === 'tight'
      ? 4
      : custom.sectionSpacing === 'relaxed'
      ? 8
      : 5.5
    : isModernCorporate
    ? custom.sectionSpacing === 'tight'
      ? 4
      : custom.sectionSpacing === 'relaxed'
      ? 8.5
      : 5.5
    : isFresherResume
    ? custom.sectionSpacing === 'tight'
      ? 3.5
      : custom.sectionSpacing === 'relaxed'
      ? 7.5
      : 5
    : isSoftwareDev
    ? custom.sectionSpacing === 'tight'
      ? 3.75
      : custom.sectionSpacing === 'relaxed'
      ? 8
      : 5.5
    : isTwoColumn
    ? custom.sectionSpacing === 'tight'
      ? 4.5
      : custom.sectionSpacing === 'relaxed'
      ? 8
      : 6
    : custom.sectionSpacing === 'tight'
    ? 5
    : custom.sectionSpacing === 'relaxed'
    ? 9
    : 7;
  const lineHeight = isJakes
    ? custom.sectionSpacing === 'tight'
      ? 1.18
      : custom.sectionSpacing === 'relaxed'
      ? 1.34
      : 1.25
    : isHarvard
    ? custom.sectionSpacing === 'tight'
      ? 1.18
      : custom.sectionSpacing === 'relaxed'
      ? 1.35
      : 1.26
    : isElegantSerif
    ? custom.sectionSpacing === 'tight'
      ? 1.22
      : custom.sectionSpacing === 'relaxed'
      ? 1.38
      : 1.3
    : isInternshipResume
    ? custom.sectionSpacing === 'tight'
      ? 1.2
      : custom.sectionSpacing === 'relaxed'
      ? 1.36
      : 1.27
    : isModernCorporate
    ? custom.sectionSpacing === 'tight'
      ? 1.22
      : custom.sectionSpacing === 'relaxed'
      ? 1.38
      : 1.28
    : isFresherResume
    ? custom.sectionSpacing === 'tight'
      ? 1.2
      : custom.sectionSpacing === 'relaxed'
      ? 1.36
      : 1.26
    : isSoftwareDev
    ? custom.sectionSpacing === 'tight'
      ? 1.18
      : custom.sectionSpacing === 'relaxed'
      ? 1.34
      : 1.24
    : isTwoColumn
    ? custom.sectionSpacing === 'tight'
      ? 1.24
      : custom.sectionSpacing === 'relaxed'
      ? 1.4
      : 1.32
    : custom.sectionSpacing === 'tight'
    ? 1.28
    : custom.sectionSpacing === 'relaxed'
    ? 1.44
    : 1.35;

  return {
    baseFontPt,
    namePt: isJakes
      ? 22 + delta * 1.5
      : isHarvard
      ? 18 + delta * 1.4
      : isElegantSerif
      ? 20 + delta * 1.4
      : isInternshipResume
      ? 22 + delta * 1.4
      : isModernCorporate
      ? 25 + delta * 1.4
      : isFresherResume
      ? 20 + delta * 1.4
      : isSoftwareDev
      ? 22 + delta * 1.4
      : isTwoColumn
      ? 21 + delta * 1.4
      : 20 + delta * 1.5,
    jobTitlePt: isModernCorporate
      ? 11.5 + delta * 0.6
      : isTwoColumn
      ? 11.25 + delta * 0.6
      : isInternshipResume
      ? 10.5 + delta * 0.6
      : isFresherResume
      ? 10.5 + delta * 0.6
      : 10 + delta * 0.6,
    headingPt: isJakes
      ? 11 + delta * 0.5
      : isHarvard
      ? 10.5 + delta * 0.5
      : isElegantSerif
      ? 11.5 + delta * 0.5
      : isInternshipResume
      ? 11.5 + delta * 0.5
      : isModernCorporate
      ? 12.25 + delta * 0.5
      : isFresherResume
      ? 10.25 + delta * 0.5
      : isSoftwareDev
      ? 10.5 + delta * 0.5
      : isTwoColumn
      ? 12 + delta * 0.5
      : 10 + delta * 0.5,
    entryTitlePt: isTwoColumn
      ? 9.75 + delta
      : isElegantSerif
      ? 9.25 + delta
      : isInternshipResume
      ? 9.5 + delta
      : isModernCorporate
      ? 9.5 + delta
      : isFresherResume
      ? 9.0 + delta
      : 9.5 + delta,
    entrySubtitlePt: isTwoColumn
      ? 9 + delta
      : isElegantSerif
      ? 8.75 + delta
      : isInternshipResume
      ? 8.75 + delta
      : isModernCorporate
      ? 9.0 + delta
      : isFresherResume
      ? 8.75 + delta
      : 9 + delta,
    bodyPt: isElegantSerif
      ? 8.5 + delta
      : isInternshipResume
      ? 8.5 + delta
      : isFresherResume
      ? 8.6 + delta
      : 8.75 + delta,
    metaPt:
      isElegantSerif || isModernCorporate || isInternshipResume
        ? 8.15 + delta * 0.5
        : isFresherResume
        ? 8.35 + delta * 0.5
        : 8.5 + delta * 0.5,
    marginTopPt: marginPt,
    marginBottomPt: marginPt,
    marginHorizPt,
    sectionGapPt,
    entryGapPt,
    lineHeight,
  };
}

export function hexToSoftTint(hex: string, alpha = 0.08): string {
  const clean = hex.replace('#', '');
  if (clean.length !== 6) return `rgba(15, 43, 92, ${alpha})`;
  const r = parseInt(clean.slice(0, 2), 16);
  const g = parseInt(clean.slice(2, 4), 16);
  const b = parseInt(clean.slice(4, 6), 16);
  if (Number.isNaN(r) || Number.isNaN(g) || Number.isNaN(b)) {
    return `rgba(15, 43, 92, ${alpha})`;
  }
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

/**
 * Light tint hex for @react-pdf/renderer (which prefers solid hex over rgba in some viewers).
 */
export function hexToLightSolidBg(hex: string, factor = 0.93): string {
  const clean = hex.replace('#', '');
  if (clean.length !== 6) return '#f1f5f9';
  const r = parseInt(clean.slice(0, 2), 16);
  const g = parseInt(clean.slice(2, 4), 16);
  const b = parseInt(clean.slice(4, 6), 16);
  if (Number.isNaN(r) || Number.isNaN(g) || Number.isNaN(b)) return '#f1f5f9';
  const mix = (c: number) => Math.round(c + (255 - c) * factor).toString(16).padStart(2, '0');
  return `#${mix(r)}${mix(g)}${mix(b)}`;
}
