import React, { useLayoutEffect, useMemo, useRef, useState } from 'react';
import type {
  PublicationItem,
  ReferenceItem,
  Resume,
  TemplateCustomization,
} from '../../types/resume';
import {
  getTemplateById,
  getTypographyScale,
  hexToLightSolidBg,
  resolveTemplateCustomization,
  type ResumeSectionKey,
  type TemplateDefinition,
} from '../../data/templates';
import {
  SKILL_MATRIX_LEGEND,
  buildClassicPhoneList,
  buildContactLinks,
  buildJakesAddressString,
  buildLocationString,
  buildSoftwareDevContactItems,
  buildTwoColumnContactItems,
  chunkPairs,
  chunkRows,
  cleanHighlights,
  getCourseworkItems,
  getEffectiveInterests,
  getOrderedVisibleSections,
  getPublicationParts,
  getSectionDisplayTitle,
  getSkillMatrixLevelLabel,
  getSoftwareDevAdditionalSubsections,
  getVisibleSkills,
  groupExperienceByCategory,
  groupPublicationsForTwoColumn,
  type ContactLinkItem,
  type TwoColumnContactKind,
  type TwoColumnPubCategoryKey,
} from '../../utils/resumePresentation';
import {
  computeDonutChartSegments,
  getLanguageDotScore,
  wrapDonutLabelLines,
} from '../../utils/dailyActivities';

interface MultiPageTemplatePreviewProps {
  resume: Resume;
  onPageCountChange?: (count: number) => void;
  /** Optional override for live previewing another template/customization without mutating resume */
  templateOverride?: string;
  customizationOverride?: TemplateCustomization;
}

type SpacingKind =
  | 'none'
  | 'section'
  | 'entry'
  | 'citation'
  | 'bullet'
  | 'skill'
  | 'compact'
  | 'reference';

interface PreviewUnit {
  id: string;
  spacing: SpacingKind;
  sectionHeading?: string;
  objectiveText?: string;
  isSidebar?: boolean;
  render: (showHeading: boolean) => React.ReactNode;
}

interface RenderedUnit {
  id: string;
  spacing: SpacingKind;
  node: React.ReactNode;
}

interface PaginatedSheet {
  pageNumber: number;
  singleColumnUnits: RenderedUnit[];
  sidebarUnits: RenderedUnit[];
  mainUnits: RenderedUnit[];
  hasFullWidthHeaderOnTop?: RenderedUnit | null;
}

function getSpacingPt(
  spacing: SpacingKind,
  isFirstOnPage: boolean,
  sectionGapPt: number,
  entryGapPt: number
): string {
  if (isFirstOnPage) return '0pt';
  switch (spacing) {
    case 'section':
      return `${sectionGapPt}pt`;
    case 'entry':
      return `${entryGapPt}pt`;
    case 'citation':
      return `${Math.max(4, entryGapPt - 2)}pt`;
    case 'bullet':
      return '2pt';
    case 'skill':
      return '3pt';
    case 'compact':
      return '2.5pt';
    case 'reference':
      return `${entryGapPt + 1}pt`;
    case 'none':
    default:
      return '0pt';
  }
}

export const MultiPageTemplatePreview: React.FC<MultiPageTemplatePreviewProps> = ({
  resume,
  onPageCountChange,
  templateOverride,
  customizationOverride,
}) => {
  const effectiveResume = useMemo(
    () => ({
      ...resume,
      template: templateOverride || resume.template,
      customization: customizationOverride || resume.customization,
    }),
    [resume, templateOverride, customizationOverride]
  );

  const template = useMemo(
    () => getTemplateById(effectiveResume.template),
    [effectiveResume.template]
  );
  const custom = useMemo(
    () => resolveTemplateCustomization(effectiveResume),
    [effectiveResume]
  );
  const scale = useMemo(() => getTypographyScale(custom, template.id), [custom, template.id]);

  const isJakes = template.id === 'jakes-resume';
  const isClassic = template.id === 'classic-professional';
  const isTwoColumnPro = template.id === 'two-column-professional';
  const isSoftwareDev = template.id === 'software-developer';
  const fontClass = custom.fontFamily === 'serif' ? 'font-cv-serif' : 'font-cv-sans';
  const isTwoColumnSidebar =
    template.layout === 'sidebar-light' || template.layout === 'sidebar-dark';
  const isMainLeftSidebarRight = template.layout === 'main-left-sidebar-right';
  const hasTwoColumns = isTwoColumnSidebar || isMainLeftSidebarRight;
  const isAsymmetric = template.layout === 'asymmetric-labels';
  const isDarkSidebar = template.layout === 'sidebar-dark';

  const [pages, setPages] = useState<PaginatedSheet[]>([]);

  const measureContainerRef = useRef<HTMLDivElement | null>(null);
  const pageBoxRef = useRef<HTMLDivElement | null>(null);
  const marginBoxRef = useRef<HTMLDivElement | null>(null);
  const scratchObjectiveRef = useRef<HTMLDivElement | null>(null);

  const personalInfo = effectiveResume.personalInfo || {
    fullName: '',
    email: '',
    phone: '',
  };
  const contactLinks = useMemo(
    () => buildContactLinks(personalInfo),
    [personalInfo]
  );
  const softwareDevContactItems = useMemo(
    () => (isSoftwareDev ? buildSoftwareDevContactItems(personalInfo) : []),
    [personalInfo, isSoftwareDev]
  );
  const locationString = useMemo(
    () =>
      isJakes || isSoftwareDev
        ? buildJakesAddressString(personalInfo)
        : buildLocationString(personalInfo),
    [personalInfo, isJakes, isSoftwareDev]
  );

  // Heading renderer honoring template + customization
  const renderSectionHeading = (
    title: string,
    options?: { inverted?: boolean; compact?: boolean }
  ) => {
    const inverted = options?.inverted;
    const compact = options?.compact;
    const color = inverted ? '#ffffff' : custom.accentColor;
    const fontSize = `${compact ? scale.headingPt - 0.5 : scale.headingPt}pt`;

    if (inverted) {
      return (
        <h2
          className="cv-heading font-bold uppercase"
          style={{
            fontSize,
            letterSpacing: '1.1pt',
            color: '#ffffff',
            borderBottom: '0.75pt solid rgba(255,255,255,0.45)',
            paddingBottom: '2pt',
            marginBottom: '5pt',
            lineHeight: 1.3,
          }}
        >
          {title}
        </h2>
      );
    }

    switch (custom.headingStyle) {
      case 'left-accent':
        return (
          <h2
            className="cv-heading font-bold uppercase"
            style={{
              fontSize,
              letterSpacing: '1pt',
              color,
              borderLeft: `2.5pt solid ${color}`,
              paddingLeft: '6pt',
              borderBottom: '0.5pt solid #e2e8f0',
              paddingBottom: '2pt',
              marginBottom: '5pt',
              lineHeight: 1.3,
            }}
          >
            {title}
          </h2>
        );
      case 'filled-band':
        return (
          <h2
            className="cv-heading font-bold uppercase"
            style={{
              fontSize,
              letterSpacing: '1.1pt',
              color,
              backgroundColor: hexToLightSolidBg(color, 0.91),
              padding: '3pt 6pt',
              marginBottom: '5pt',
              lineHeight: 1.3,
            }}
          >
            {title}
          </h2>
        );
      case 'clean-caps':
        return (
          <h2
            className="cv-heading font-bold uppercase"
            style={{
              fontSize,
              letterSpacing: '1.3pt',
              color,
              borderBottom: '0.5pt solid #d4d4d8',
              paddingBottom: '2pt',
              marginBottom: '4.5pt',
              lineHeight: 1.3,
            }}
          >
            {title}
          </h2>
        );
      case 'italic-serif':
        return (
          <h2
            className="cv-heading font-bold italic"
            style={{
              fontSize: `${scale.headingPt + 0.75}pt`,
              letterSpacing: '0.4pt',
              color,
              borderBottom: `0.5pt solid ${color}`,
              paddingBottom: '2pt',
              marginBottom: '5pt',
              lineHeight: 1.3,
            }}
          >
            {title}
          </h2>
        );
      case 'classic-blue-rule':
        return (
          <div style={{ marginBottom: '5pt' }}>
            <div className="flex items-center" style={{ gap: '6pt', marginBottom: '2pt' }}>
              <span
                style={{
                  display: 'inline-block',
                  width: '14pt',
                  height: '3.5pt',
                  backgroundColor: color,
                  flexShrink: 0,
                }}
              />
              <h2
                className="cv-heading font-bold uppercase"
                style={{
                  fontSize,
                  letterSpacing: '0.9pt',
                  color,
                  lineHeight: 1.25,
                }}
              >
                {title}
              </h2>
            </div>
            <div style={{ height: '0.85pt', backgroundColor: color }} />
          </div>
        );
      case 'burgundy-gold-rule':
        return (
          <div style={{ marginBottom: '5.5pt' }}>
            <h2
              className="cv-heading font-bold uppercase"
              style={{
                fontSize,
                letterSpacing: '0.35pt',
                color,
                paddingBottom: '2pt',
                lineHeight: 1.2,
              }}
            >
              {title}
            </h2>
            <div style={{ height: '1.75pt', backgroundColor: '#e5c57a' }} />
          </div>
        );
      case 'title-rule':
        return (
          <h2
            className="cv-heading"
            style={{
              fontSize: `${scale.headingPt + 0.75}pt`,
              fontWeight: 500,
              letterSpacing: '0.15pt',
              color,
              borderBottom: `0.65pt solid ${color}`,
              paddingBottom: '1.5pt',
              marginBottom: '4pt',
              lineHeight: 1.22,
            }}
          >
            {title}
          </h2>
        );
      case 'uppercase-rule':
      default:
        return (
          <h2
            className={`cv-heading font-bold uppercase ${
              template.centeredHeadings ? 'text-center' : ''
            }`}
            style={{
              fontSize,
              letterSpacing: '1.2pt',
              color,
              borderBottom: `0.75pt solid ${color}`,
              paddingBottom: '2pt',
              marginBottom: '5pt',
              lineHeight: 1.3,
            }}
          >
            {title}
          </h2>
        );
    }
  };

  // Contact items inline renderer
  const renderContactInline = (
    separator: string,
    textColor: string,
    centered = true
  ) =>
    contactLinks.length > 0 ? (
      <div
        className={`flex flex-wrap items-center ${
          centered ? 'justify-center' : 'justify-start'
        }`}
        style={{ fontSize: `${scale.metaPt}pt`, color: textColor, marginBottom: '2pt' }}
      >
        {contactLinks.map((item, idx) => (
          <React.Fragment key={idx}>
            {idx > 0 && (
              <span style={{ opacity: 0.65, margin: '0 4pt' }}>{separator}</span>
            )}
            {item.url ? (
              <a
                href={item.url}
                target={item.url.startsWith('http') ? '_blank' : undefined}
                rel={item.url.startsWith('http') ? 'noopener noreferrer' : undefined}
                className="no-underline hover:underline"
                style={{ color: textColor }}
              >
                {item.label}
              </a>
            ) : (
              <span>{item.label}</span>
            )}
          </React.Fragment>
        ))}
      </div>
    ) : null;

  const renderSmallCapsName = (rawName: string) => {
    const words = rawName.trim().split(/\s+/).filter(Boolean);
    if (words.length === 0) return 'FIRST LAST';
    return words.map((word, idx) => {
      const firstChar = word.slice(0, 1).toUpperCase();
      const restChars = word.slice(1).toUpperCase();
      return (
        <React.Fragment key={idx}>
          {idx > 0 ? ' ' : ''}
          <span style={{ fontSize: `${scale.namePt}pt` }}>{firstChar}</span>
          {restChars && (
            <span style={{ fontSize: `${Math.round(scale.namePt * 0.77 * 10) / 10}pt` }}>
              {restChars}
            </span>
          )}
        </React.Fragment>
      );
    });
  };

  const renderJakesContactIcon = (kind: ContactLinkItem['kind'], color: string) => {
    const size = '8.5pt';
    switch (kind) {
      case 'phone':
        return (
          <svg width={size} height={size} viewBox="0 0 24 24" fill={color} style={{ marginRight: '3pt', flexShrink: 0 }}>
            <path d="M6.62 10.79a15.05 15.05 0 006.59 6.59l2.2-2.2a1 1 0 011.01-.24c1.12.37 2.33.57 3.58.57a1 1 0 011 1V20a1 1 0 01-1 1C10.61 21 3 13.39 3 4a1 1 0 011-1h3.5a1 1 0 011 1c0 1.25.2 2.46.57 3.58a1 1 0 01-.25 1.01l-2.2 2.2z" />
          </svg>
        );
      case 'email':
        return (
          <svg width={size} height={size} viewBox="0 0 24 24" fill={color} style={{ marginRight: '3pt', flexShrink: 0 }}>
            <path d="M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z" />
          </svg>
        );
      case 'linkedin':
        return (
          <svg width={size} height={size} viewBox="0 0 24 24" fill={color} style={{ marginRight: '3pt', flexShrink: 0 }}>
            <path d="M19 3a2 2 0 012 2v14a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h14m-.5 15.5v-5.3a3.26 3.26 0 00-3.26-3.26c-.85 0-1.84.52-2.28 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 011.4 1.4v4.93h2.75M6.88 8.56a1.68 1.68 0 001.68-1.68c0-.93-.75-1.69-1.68-1.69a1.69 1.69 0 00-1.69 1.69c0 .93.76 1.68 1.69 1.68m1.39 9.94v-8.37H5.5v8.37h2.77z" />
          </svg>
        );
      case 'github':
        return (
          <svg width={size} height={size} viewBox="0 0 24 24" fill={color} style={{ marginRight: '3pt', flexShrink: 0 }}>
            <path d="M12 2A10 10 0 002 12c0 4.42 2.87 8.17 6.84 9.5.5.08.66-.23.66-.5v-1.69c-2.77.6-3.36-1.34-3.36-1.34-.46-1.16-1.11-1.47-1.11-1.47-.91-.62.07-.6.07-.6 1 .07 1.53 1.03 1.53 1.03.87 1.52 2.34 1.07 2.91.83.09-.65.35-1.09.63-1.34-2.22-.25-4.55-1.11-4.55-4.92 0-1.11.38-2 1.03-2.71-.1-.25-.45-1.29.1-2.64 0 0 .84-.27 2.75 1.02.79-.22 1.65-.33 2.5-.33.85 0 1.71.11 2.5.33 1.91-1.29 2.75-1.02 2.75-1.02.55 1.35.2 2.39.1 2.64.65.71 1.03 1.6 1.03 2.71 0 3.82-2.34 4.66-4.57 4.91.36.31.69.92.69 1.85V21c0 .27.16.59.67.5C19.14 20.16 22 16.42 22 12A10 10 0 0012 2z" />
          </svg>
        );
      case 'website':
      default:
        return (
          <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" style={{ marginRight: '3pt', flexShrink: 0 }}>
            <circle cx="12" cy="12" r="10" />
            <line x1="2" y1="12" x2="22" y2="12" />
            <path d="M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z" />
          </svg>
        );
    }
  };

  const renderTwoColContactIcon = (kind: TwoColumnContactKind, color: string) => {
    const size = '8.2pt';
    const baseStyle: React.CSSProperties = { marginRight: '2.5pt', flexShrink: 0 };
    switch (kind) {
      case 'email':
        return (
          <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.3" style={baseStyle}>
            <circle cx="12" cy="12" r="4" />
            <path d="M16 8v5a3 3 0 0 0 6 0v-1a10 10 0 1 0-3.92 7.94" />
          </svg>
        );
      case 'phone':
        return (
          <svg width={size} height={size} viewBox="0 0 24 24" fill={color} style={baseStyle}>
            <path d="M6.62 10.79a15.05 15.05 0 006.59 6.59l2.2-2.2a1 1 0 011.01-.24c1.12.37 2.33.57 3.58.57a1 1 0 011 1V20a1 1 0 01-1 1C10.61 21 3 13.39 3 4a1 1 0 011-1h3.5a1 1 0 011 1c0 1.25.2 2.46.57 3.58a1 1 0 01-.25 1.01l-2.2 2.2z" />
          </svg>
        );
      case 'mailaddress':
        return (
          <svg width={size} height={size} viewBox="0 0 24 24" fill={color} style={baseStyle}>
            <path d="M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z" />
          </svg>
        );
      case 'location':
        return (
          <svg width={size} height={size} viewBox="0 0 24 24" fill={color} style={baseStyle}>
            <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5a2.5 2.5 0 110-5 2.5 2.5 0 010 5z" />
          </svg>
        );
      case 'twitter':
        return (
          <svg width={size} height={size} viewBox="0 0 24 24" fill={color} style={baseStyle}>
            <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
          </svg>
        );
      case 'linkedin':
        return (
          <svg width={size} height={size} viewBox="0 0 24 24" fill={color} style={baseStyle}>
            <path d="M19 3a2 2 0 012 2v14a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h14m-.5 15.5v-5.3a3.26 3.26 0 00-3.26-3.26c-.85 0-1.84.52-2.28 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 011.4 1.4v4.93h2.75M6.88 8.56a1.68 1.68 0 001.68-1.68c0-.93-.75-1.69-1.68-1.69a1.69 1.69 0 00-1.69 1.69c0 .93.76 1.68 1.69 1.68m1.39 9.94v-8.37H5.5v8.37h2.77z" />
          </svg>
        );
      case 'github':
        return (
          <svg width={size} height={size} viewBox="0 0 24 24" fill={color} style={baseStyle}>
            <path d="M12 2A10 10 0 002 12c0 4.42 2.87 8.17 6.84 9.5.5.08.66-.23.66-.5v-1.69c-2.77.6-3.36-1.34-3.36-1.34-.46-1.16-1.11-1.47-1.11-1.47-.91-.62.07-.6.07-.6 1 .07 1.53 1.03 1.53 1.03.87 1.52 2.34 1.07 2.91.83.09-.65.35-1.09.63-1.34-2.22-.25-4.55-1.11-4.55-4.92 0-1.11.38-2 1.03-2.71-.1-.25-.45-1.29.1-2.64 0 0 .84-.27 2.75 1.02.79-.22 1.65-.33 2.5-.33.85 0 1.71.11 2.5.33 1.91-1.29 2.75-1.02 2.75-1.02.55 1.35.2 2.39.1 2.64.65.71 1.03 1.6 1.03 2.71 0 3.82-2.34 4.66-4.57 4.91.36.31.69.92.69 1.85V21c0 .27.16.59.67.5C19.14 20.16 22 16.42 22 12A10 10 0 0012 2z" />
          </svg>
        );
      case 'orcid':
        return (
          <svg width={size} height={size} viewBox="0 0 24 24" style={baseStyle}>
            <circle cx="12" cy="12" r="10.5" fill={color} />
            <text x="12" y="15.5" textAnchor="middle" fontSize="10.5" fontWeight="700" fill="#ffffff" fontFamily="sans-serif">
              iD
            </text>
          </svg>
        );
      case 'gitlab':
        return (
          <svg width={size} height={size} viewBox="0 0 24 24" fill={color} style={baseStyle}>
            <path d="M22.65 14.39L12 22.13 1.35 14.39a.84.84 0 01-.3-.94l1.22-3.78 2.44-7.51A.42.42 0 015.5 2a.43.43 0 01.41.29l2.44 7.51h7.3l2.44-7.51A.43.43 0 0118.5 2a.42.42 0 01.79.16l2.44 7.51 1.22 3.78a.84.84 0 01-.3.94z" />
          </svg>
        );
      case 'mastodon':
        return (
          <svg width={size} height={size} viewBox="0 0 24 24" fill={color} style={baseStyle}>
            <path d="M21.33 8.53c0-4.96-3.25-6.41-3.25-6.41C16.44 1.37 13.62 1.05 12 1.04h-.06c-1.62.01-4.44.33-6.08 1.08 0 0-3.25 1.45-3.25 6.41v3.78c.12 2.98.89 5.93 2.58 7.53 1.98 1.87 4.49 2.26 6.53 2.13 1.56-.09 2.44-.58 2.44-.58l-.05-1.15s-1.12.35-2.37.31c-1.24-.04-2.55-.13-2.75-1.64-.02-.14-.03-.29-.03-.44 0 0 2.59.63 5.87.78 1.71.08 3.31-.1 4.94-.3 1.52-.19 2.84-1.13 3.01-1.99.26-1.35.24-3.3.24-3.3zm-3.24 4.21h-2.16V9.26c0-1.08-.46-1.63-1.39-1.63-1.02 0-1.53.66-1.53 1.97v2.39H10.9V9.6c0-1.31-.51-1.97-1.53-1.97-.93 0-1.39.55-1.39 1.63v3.48H5.82V9.13c0-1.08.28-1.94.83-2.58.57-.64 1.31-.96 2.24-.96 1.07 0 1.89.41 2.44 1.24l.53.88.53-.88c.55-.83 1.37-1.24 2.44-1.24.93 0 1.67.32 2.24.96.55.64.83 1.5.83 2.58v3.61z" />
          </svg>
        );
      case 'website':
      case 'custom':
      default:
        return (
          <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" style={baseStyle}>
            <circle cx="12" cy="12" r="10" />
            <line x1="2" y1="12" x2="22" y2="12" />
            <path d="M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z" />
          </svg>
        );
    }
  };

  const renderTwoColMetaIcon = (kind: 'calendar' | 'pin' | 'mail', color: string) => {
    const size = '7.8pt';
    const baseStyle: React.CSSProperties = { marginRight: '3pt', flexShrink: 0, marginTop: '0.8pt' };
    if (kind === 'calendar') {
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" style={baseStyle}>
          <rect x="3" y="4" width="18" height="18" rx="2" />
          <line x1="16" y1="2" x2="16" y2="6" />
          <line x1="8" y1="2" x2="8" y2="6" />
          <line x1="3" y1="10" x2="21" y2="10" />
        </svg>
      );
    }
    if (kind === 'pin') {
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill={color} style={baseStyle}>
          <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5a2.5 2.5 0 110-5 2.5 2.5 0 010 5z" />
        </svg>
      );
    }
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill={color} style={baseStyle}>
        <path d="M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z" />
      </svg>
    );
  };

  const renderTwoColAchievementIcon = (
    icon: 'trophy' | 'heart' | 'award' | 'star' | undefined,
    color: string
  ) => {
    const size = '13pt';
    const baseStyle: React.CSSProperties = { flexShrink: 0, marginTop: '1pt' };
    switch (icon) {
      case 'heart':
        return (
          <svg width={size} height={size} viewBox="0 0 24 24" fill={color} style={baseStyle}>
            <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
          </svg>
        );
      case 'star':
        return (
          <svg width={size} height={size} viewBox="0 0 24 24" fill={color} style={baseStyle}>
            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
          </svg>
        );
      case 'award':
        return (
          <svg width={size} height={size} viewBox="0 0 24 24" fill={color} style={baseStyle}>
            <circle cx="12" cy="8" r="6" />
            <path d="M8.5 13.5L7 22l5-3 5 3-1.5-8.5" />
          </svg>
        );
      case 'trophy':
      default:
        return (
          <svg width={size} height={size} viewBox="0 0 24 24" fill={color} style={baseStyle}>
            <path d="M19 5h-2V3H7v2H5c-1.1 0-2 .9-2 2v1c0 2.55 1.92 4.63 4.39 4.94.63 1.5 1.98 2.63 3.61 2.96V19H7v2h10v-2h-4v-3.1c1.63-.33 2.98-1.46 3.61-2.96C19.08 12.63 21 10.55 21 8V7c0-1.1-.9-2-2-2zM5 8V7h2v3.82C5.84 10.4 5 9.3 5 8zm14 0c0 1.3-.84 2.4-2 2.82V7h2v1z" />
          </svg>
        );
    }
  };

  const renderTwoColPubIcon = (cat: TwoColumnPubCategoryKey, color: string) => {
    const size = '9.5pt';
    const baseStyle: React.CSSProperties = { marginRight: '4pt', flexShrink: 0 };
    switch (cat) {
      case 'books':
        return (
          <svg width={size} height={size} viewBox="0 0 24 24" fill={color} style={baseStyle}>
            <path d="M4 19.5A2.5 2.5 0 016.5 17H20V2H6.5A2.5 2.5 0 004 4.5v15zM6.5 19a.5.5 0 000 1H20v-1H6.5z" />
          </svg>
        );
      case 'conference':
        return (
          <svg width={size} height={size} viewBox="0 0 24 24" fill={color} style={baseStyle}>
            <path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z" />
          </svg>
        );
      case 'journal':
      case 'research':
      case 'other':
      default:
        return (
          <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" style={baseStyle}>
            <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
            <polyline points="14 2 14 8 20 8" />
            <line x1="8" y1="13" x2="16" y2="13" />
            <line x1="8" y1="17" x2="16" y2="17" />
          </svg>
        );
    }
  };

  const renderLanguageDots = (score: number, color: string, langId: string) => {
    const emptyColor = '#d1d5db';
    return (
      <span className="inline-flex items-center shrink-0" style={{ gap: '2.5pt' }}>
        {[1, 2, 3, 4, 5].map((dot) => {
          const isFull = score >= dot;
          const isHalf = !isFull && score >= dot - 0.5;
          if (isHalf) {
            return (
              <svg key={dot} width="8pt" height="8pt" viewBox="0 0 12 12" aria-hidden="true">
                <circle cx="6" cy="6" r="5.5" fill={emptyColor} />
                <path d="M6,0.5 A5.5,5.5 0 0,0 6,11.5 Z" fill={color} />
              </svg>
            );
          }
          return (
            <svg key={`${langId}-${dot}`} width="8pt" height="8pt" viewBox="0 0 12 12" aria-hidden="true">
              <circle cx="6" cy="6" r="5.5" fill={isFull ? color : emptyColor} />
            </svg>
          );
        })}
      </span>
    );
  };

  // Header renderer for the distinct header variants
  const renderHeader = (): React.ReactNode => {
    const nameText = personalInfo.fullName || 'FULL NAME';
    const accent = custom.accentColor;
    const textCol = custom.textColor;

    switch (template.headerVariant) {
      case 'two-column-header': {
        const photoUrl = personalInfo.photoUrl?.trim();
        const photoShape = personalInfo.photoShape || 'circle';
        const items = buildTwoColumnContactItems(personalInfo);
        const radius =
          photoShape === 'square' ? '6pt' : photoShape === 'portrait' ? '4pt' : '9999px';

        return (
          <header style={{ marginBottom: '7pt' }}>
            <div className="flex justify-between items-start" style={{ gap: '14pt' }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <h1
                  className="font-bold uppercase"
                  style={{
                    fontSize: `${scale.namePt + 1}pt`,
                    letterSpacing: '0.4pt',
                    lineHeight: 1.1,
                    color: textCol,
                    marginBottom: '2.5pt',
                  }}
                >
                  {nameText}
                </h1>
                {personalInfo.jobTitle && (
                  <div
                    className="font-semibold"
                    style={{
                      fontSize: `${scale.jobTitlePt + 0.5}pt`,
                      color: accent,
                      lineHeight: 1.25,
                      marginBottom: '5pt',
                    }}
                  >
                    {personalInfo.jobTitle}
                  </div>
                )}
                {items.length > 0 && (
                  <div
                    className="flex flex-wrap items-center"
                    style={{
                      columnGap: '11pt',
                      rowGap: '2.5pt',
                      fontSize: `${scale.metaPt - 0.25}pt`,
                      color: '#1f2937',
                      lineHeight: 1.3,
                    }}
                  >
                    {items.map((item, idx) => (
                      <span key={`${item.kind}-${idx}`} className="inline-flex items-center">
                        {renderTwoColContactIcon(item.kind, accent)}
                        {item.url ? (
                          <a
                            href={item.url}
                            target={item.url.startsWith('http') ? '_blank' : undefined}
                            rel={item.url.startsWith('http') ? 'noopener noreferrer' : undefined}
                            className="no-underline hover:underline"
                            style={{ color: '#1f2937' }}
                          >
                            {item.label}
                          </a>
                        ) : (
                          <span>{item.label}</span>
                        )}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {photoUrl && (
                <div
                  style={{
                    padding: '3pt',
                    backgroundColor: '#f3ebd3',
                    border: '1.75pt solid #e5c57a',
                    borderRadius: radius,
                    flexShrink: 0,
                  }}
                >
                  <div
                    style={{
                      width: '68pt',
                      height: photoShape === 'portrait' ? '84pt' : '68pt',
                      borderRadius: radius,
                      overflow: 'hidden',
                      backgroundColor: '#ffffff',
                    }}
                  >
                    <img
                      src={photoUrl}
                      alt={`${nameText} profile`}
                      style={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover',
                        display: 'block',
                      }}
                    />
                  </div>
                </div>
              )}
            </div>
          </header>
        );
      }

      case 'classic-header': {
        const phones = buildClassicPhoneList(personalInfo);
        const photoUrl = personalInfo.photoUrl?.trim();
        const isSquarePhoto = personalInfo.photoShape === 'square';
        const nonPhoneLinks = contactLinks.filter((c) => c.kind !== 'phone');
        const quoteText = effectiveResume.personalQuote?.trim();

        return (
          <header style={{ marginBottom: '8pt' }}>
            <div
              className="flex justify-between items-start"
              style={{
                gap: '14pt',
                paddingBottom: '8pt',
                borderBottom: `1.25pt solid ${accent}`,
              }}
            >
              <div style={{ flex: 1, minWidth: 0 }}>
                <h1
                  className="font-bold"
                  style={{
                    fontSize: `${scale.namePt + 1}pt`,
                    letterSpacing: '0.5pt',
                    lineHeight: 1.15,
                    color: accent,
                    marginBottom: '2pt',
                  }}
                >
                  {nameText}
                </h1>
                {personalInfo.jobTitle && (
                  <div
                    className="font-semibold"
                    style={{
                      fontSize: `${scale.jobTitlePt}pt`,
                      color: '#334155',
                      marginBottom: '6pt',
                    }}
                  >
                    {personalInfo.jobTitle}
                  </div>
                )}

                <div
                  className="grid grid-cols-2"
                  style={{
                    columnGap: '14pt',
                    rowGap: '2pt',
                    fontSize: `${scale.metaPt}pt`,
                    color: textCol,
                    lineHeight: 1.38,
                  }}
                >
                  {/* Left Personal Info Column */}
                  <div style={{ minWidth: 0 }}>
                    {locationString && (
                      <div>
                        <span className="font-semibold" style={{ color: '#475569' }}>
                          Address:{' '}
                        </span>
                        <span>{locationString}</span>
                      </div>
                    )}
                    {personalInfo.dateOfBirth && (
                      <div>
                        <span className="font-semibold" style={{ color: '#475569' }}>
                          Date of Birth:{' '}
                        </span>
                        <span>{personalInfo.dateOfBirth}</span>
                      </div>
                    )}
                    {personalInfo.additionalInfo && (
                      <div>
                        <span className="font-semibold" style={{ color: '#475569' }}>
                          Details:{' '}
                        </span>
                        <span>{personalInfo.additionalInfo}</span>
                      </div>
                    )}
                    {personalInfo.otherProfiles && (
                      <div className="italic" style={{ color: '#475569' }}>
                        {personalInfo.otherProfiles}
                      </div>
                    )}
                  </div>

                  {/* Right Contact Column */}
                  <div style={{ minWidth: 0 }}>
                    {phones.map((ph, idx) => (
                      <div key={idx}>
                        <span className="font-semibold" style={{ color: '#475569' }}>
                          {ph.label}:{' '}
                        </span>
                        <a
                          href={ph.url}
                          className="no-underline hover:underline"
                          style={{ color: textCol }}
                        >
                          {ph.raw}
                        </a>
                      </div>
                    ))}
                    {nonPhoneLinks.map((c, idx) => (
                      <div key={idx} className="break-words">
                        <span className="font-semibold capitalize" style={{ color: '#475569' }}>
                          {c.kind}:{' '}
                        </span>
                        {c.url ? (
                          <a
                            href={c.url}
                            target={c.url.startsWith('http') ? '_blank' : undefined}
                            rel={c.url.startsWith('http') ? 'noopener noreferrer' : undefined}
                            className="no-underline hover:underline"
                            style={{ color: accent }}
                          >
                            {c.label}
                          </a>
                        ) : (
                          <span>{c.label}</span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {photoUrl && (
                <div
                  style={{
                    width: isSquarePhoto ? '78pt' : '70pt',
                    height: isSquarePhoto ? '78pt' : '90pt',
                    padding: '1.5pt',
                    border: `1pt solid ${accent}`,
                    backgroundColor: '#ffffff',
                    flexShrink: 0,
                  }}
                >
                  <img
                    src={photoUrl}
                    alt={`${nameText} portrait`}
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover',
                      display: 'block',
                    }}
                  />
                </div>
              )}
            </div>

            {quoteText && (
              <div
                className="italic"
                style={{
                  marginTop: '6pt',
                  paddingLeft: '8pt',
                  borderLeft: `2pt solid ${accent}`,
                  fontSize: `${scale.bodyPt}pt`,
                  color: '#334155',
                  lineHeight: 1.35,
                }}
              >
                &ldquo;{quoteText}&rdquo;
              </div>
            )}
          </header>
        );
      }

      case 'jakes-centered':
        return (
          <header
            className="text-center"
            style={{
              marginBottom: '6pt',
            }}
          >
            <h1
              style={{
                fontWeight: 400,
                letterSpacing: '0.5pt',
                lineHeight: 1.12,
                color: textCol,
                marginBottom: '2pt',
              }}
            >
              {renderSmallCapsName(nameText)}
            </h1>
            {locationString && (
              <div
                style={{
                  fontSize: `${scale.metaPt + 0.25}pt`,
                  color: textCol,
                  marginBottom: '2pt',
                  lineHeight: 1.25,
                }}
              >
                {locationString}
              </div>
            )}
            {contactLinks.length > 0 && (
              <div
                className="flex flex-wrap items-center justify-center"
                style={{
                  fontSize: `${scale.metaPt + 0.25}pt`,
                  color: textCol,
                  columnGap: '9pt',
                  rowGap: '2pt',
                  lineHeight: 1.25,
                }}
              >
                {contactLinks.map((item, idx) => (
                  <span key={idx} className="inline-flex items-center">
                    {renderJakesContactIcon(item.kind, textCol)}
                    {item.url ? (
                      <a
                        href={item.url}
                        target={item.url.startsWith('http') ? '_blank' : undefined}
                        rel={item.url.startsWith('http') ? 'noopener noreferrer' : undefined}
                        className={item.kind === 'phone' ? 'no-underline hover:underline' : 'underline'}
                        style={{
                          color: textCol,
                          textDecorationThickness: '0.5pt',
                          textUnderlineOffset: '1.5pt',
                        }}
                      >
                        {item.label}
                      </a>
                    ) : (
                      <span>{item.label}</span>
                    )}
                  </span>
                ))}
              </div>
            )}
          </header>
        );

      case 'software-dev-centered':
        return (
          <header
            className="text-center"
            style={{
              marginBottom: '6pt',
            }}
          >
            <h1
              className="font-bold"
              style={{
                fontSize: `${scale.namePt}pt`,
                letterSpacing: '0.4pt',
                lineHeight: 1.12,
                color: accent,
                marginBottom: '2.5pt',
              }}
            >
              {nameText}
            </h1>
            {locationString && (
              <div
                style={{
                  fontSize: `${scale.metaPt + 0.25}pt`,
                  color: textCol,
                  marginBottom: '3pt',
                  lineHeight: 1.25,
                }}
              >
                {locationString}
              </div>
            )}
            {softwareDevContactItems.length > 0 && (
              <div
                className="flex flex-wrap items-center justify-center"
                style={{
                  fontSize: `${scale.metaPt + 0.15}pt`,
                  color: textCol,
                  columnGap: '9pt',
                  rowGap: '2.5pt',
                  lineHeight: 1.25,
                }}
              >
                {softwareDevContactItems.map((item, idx) => (
                  <span key={idx} className="inline-flex items-center">
                    {renderJakesContactIcon(
                      item.kind === 'custom' ? 'website' : item.kind,
                      accent
                    )}
                    {item.url ? (
                      <a
                        href={item.url}
                        target={item.url.startsWith('http') ? '_blank' : undefined}
                        rel={item.url.startsWith('http') ? 'noopener noreferrer' : undefined}
                        className={item.kind === 'phone' ? 'no-underline hover:underline' : 'hover:underline'}
                        style={{
                          color: textCol,
                          textDecoration: item.kind === 'phone' ? 'none' : 'underline',
                          textDecorationColor: accent,
                          textDecorationThickness: '0.5pt',
                          textUnderlineOffset: '1.5pt',
                        }}
                      >
                        {item.label}
                      </a>
                    ) : (
                      <span>{item.label}</span>
                    )}
                  </span>
                ))}
              </div>
            )}
          </header>
        );

      case 'corporate-banner':
        return (
          <header
            style={{
              backgroundColor: accent,
              color: '#ffffff',
              padding: '13pt 16pt',
              marginBottom: '8pt',
            }}
          >
            <h1
              className="font-bold uppercase"
              style={{
                fontSize: `${scale.namePt}pt`,
                letterSpacing: '1.5pt',
                lineHeight: 1.18,
                marginBottom: '3pt',
                color: '#ffffff',
              }}
            >
              {nameText}
            </h1>
            {personalInfo.jobTitle && (
              <div
                className="font-medium uppercase"
                style={{
                  fontSize: `${scale.jobTitlePt}pt`,
                  letterSpacing: '0.8pt',
                  marginBottom: '4pt',
                  color: 'rgba(255,255,255,0.92)',
                }}
              >
                {personalInfo.jobTitle}
              </div>
            )}
            {renderContactInline('•', '#ffffff', false)}
            {locationString && (
              <div style={{ fontSize: `${scale.metaPt}pt`, color: 'rgba(255,255,255,0.88)' }}>
                {locationString}
              </div>
            )}
            {personalInfo.otherProfiles && (
              <div
                className="italic"
                style={{
                  fontSize: `${scale.metaPt - 0.5}pt`,
                  color: 'rgba(255,255,255,0.85)',
                  marginTop: '2pt',
                }}
              >
                {personalInfo.otherProfiles}
              </div>
            )}
          </header>
        );

      case 'split-left-right':
        return (
          <header
            className="flex justify-between items-end"
            style={{
              paddingBottom: '7pt',
              marginBottom: '8pt',
              borderBottom: `1.5pt solid ${accent}`,
            }}
          >
            <div style={{ flex: 1, paddingRight: '12pt' }}>
              <h1
                className="font-bold"
                style={{
                  fontSize: `${scale.namePt}pt`,
                  letterSpacing: '0.6pt',
                  lineHeight: 1.15,
                  color: accent === '#000000' ? textCol : accent,
                  marginBottom: '2pt',
                }}
              >
                {nameText}
              </h1>
              {personalInfo.jobTitle && (
                <div
                  className="font-semibold"
                  style={{
                    fontSize: `${scale.jobTitlePt}pt`,
                    color: textCol,
                  }}
                >
                  {personalInfo.jobTitle}
                </div>
              )}
              {personalInfo.otherProfiles && (
                <div
                  className="italic"
                  style={{
                    fontSize: `${scale.metaPt - 0.5}pt`,
                    color: '#4b5563',
                    marginTop: '2pt',
                  }}
                >
                  {personalInfo.otherProfiles}
                </div>
              )}
            </div>
            <div className="text-right shrink-0" style={{ fontSize: `${scale.metaPt}pt`, color: textCol, lineHeight: 1.35 }}>
              {contactLinks.map((c, idx) => (
                <div key={idx}>
                  {c.url ? (
                    <a
                      href={c.url}
                      target={c.url.startsWith('http') ? '_blank' : undefined}
                      rel={c.url.startsWith('http') ? 'noopener noreferrer' : undefined}
                      className="no-underline hover:underline"
                      style={{ color: textCol }}
                    >
                      {c.label}
                    </a>
                  ) : (
                    c.label
                  )}
                </div>
              ))}
              {locationString && <div>{locationString}</div>}
            </div>
          </header>
        );

      case 'editorial-double-rule':
        return (
          <header
            className="text-center"
            style={{
              borderTop: `1.5pt solid ${accent}`,
              paddingTop: '8pt',
              paddingBottom: '8pt',
              marginBottom: '8pt',
              borderBottom: `0.75pt solid ${accent}`,
            }}
          >
            <div
              style={{
                borderTop: `0.5pt solid ${accent}`,
                marginTop: '-6pt',
                marginBottom: '7pt',
              }}
            />
            <h1
              className="font-bold"
              style={{
                fontSize: `${scale.namePt + 1}pt`,
                letterSpacing: '1.5pt',
                lineHeight: 1.18,
                color: accent,
                marginBottom: '3pt',
              }}
            >
              {nameText}
            </h1>
            {personalInfo.jobTitle && (
              <div
                className="italic"
                style={{
                  fontSize: `${scale.jobTitlePt}pt`,
                  color: textCol,
                  marginBottom: '4pt',
                }}
              >
                {personalInfo.jobTitle}
              </div>
            )}
            {renderContactInline('·', textCol, true)}
            {locationString && (
              <div style={{ fontSize: `${scale.metaPt}pt`, color: textCol }}>
                {locationString}
              </div>
            )}
            {personalInfo.otherProfiles && (
              <div
                className="italic"
                style={{ fontSize: `${scale.metaPt - 0.5}pt`, color: '#374151', marginTop: '1pt' }}
              >
                {personalInfo.otherProfiles}
              </div>
            )}
          </header>
        );

      case 'minimal-accent-bar':
        return (
          <header style={{ marginBottom: '8pt', paddingBottom: '5pt' }}>
            <h1
              className="font-bold"
              style={{
                fontSize: `${scale.namePt}pt`,
                letterSpacing: '0.4pt',
                lineHeight: 1.15,
                color: textCol,
                marginBottom: '4pt',
              }}
            >
              {nameText}
            </h1>
            <div
              style={{
                width: '36pt',
                height: '2.5pt',
                backgroundColor: accent,
                marginBottom: '5pt',
              }}
            />
            {personalInfo.jobTitle && (
              <div
                className="font-semibold"
                style={{
                  fontSize: `${scale.jobTitlePt}pt`,
                  color: accent,
                  marginBottom: '3pt',
                }}
              >
                {personalInfo.jobTitle}
              </div>
            )}
            {renderContactInline('·', textCol, false)}
            {locationString && (
              <div style={{ fontSize: `${scale.metaPt}pt`, color: '#4b5563' }}>
                {locationString}
              </div>
            )}
            {personalInfo.otherProfiles && (
              <div
                className="italic"
                style={{ fontSize: `${scale.metaPt - 0.5}pt`, color: '#4b5563', marginTop: '1pt' }}
              >
                {personalInfo.otherProfiles}
              </div>
            )}
          </header>
        );

      case 'boxed-technical':
        return (
          <header
            className="flex justify-between items-center"
            style={{
              border: `1pt solid ${accent}`,
              backgroundColor: hexToLightSolidBg(accent, 0.95),
              padding: '9pt 12pt',
              marginBottom: '8pt',
            }}
          >
            <div style={{ flex: 1, paddingRight: '10pt' }}>
              <h1
                className="font-bold uppercase"
                style={{
                  fontSize: `${scale.namePt - 1}pt`,
                  letterSpacing: '1pt',
                  lineHeight: 1.18,
                  color: accent,
                  marginBottom: '2pt',
                }}
              >
                {nameText}
              </h1>
              {personalInfo.jobTitle && (
                <div
                  className="font-semibold"
                  style={{ fontSize: `${scale.jobTitlePt - 0.5}pt`, color: textCol }}
                >
                  {personalInfo.jobTitle}
                </div>
              )}
              {locationString && (
                <div style={{ fontSize: `${scale.metaPt - 0.5}pt`, color: '#4b5563', marginTop: '2pt' }}>
                  {locationString}
                </div>
              )}
            </div>
            <div className="text-right shrink-0" style={{ fontSize: `${scale.metaPt - 0.5}pt`, color: textCol, lineHeight: 1.35 }}>
              {contactLinks.map((c, idx) => (
                <div key={idx}>
                  {c.url ? (
                    <a
                      href={c.url}
                      target={c.url.startsWith('http') ? '_blank' : undefined}
                      rel={c.url.startsWith('http') ? 'noopener noreferrer' : undefined}
                      className="no-underline hover:underline"
                      style={{ color: textCol }}
                    >
                      {c.label}
                    </a>
                  ) : (
                    c.label
                  )}
                </div>
              ))}
            </div>
          </header>
        );

      case 'executive-framed':
        return (
          <header
            className="text-center"
            style={{
              borderTop: `2pt solid ${accent}`,
              borderBottom: '0.75pt solid #cbd5e1',
              paddingTop: '8pt',
              paddingBottom: '8pt',
              marginBottom: '8pt',
            }}
          >
            <h1
              className="font-bold uppercase"
              style={{
                fontSize: `${scale.namePt}pt`,
                letterSpacing: '2.8pt',
                lineHeight: 1.2,
                color: textCol,
                marginBottom: '3pt',
              }}
            >
              {nameText}
            </h1>
            {personalInfo.jobTitle && (
              <div
                className="font-semibold uppercase"
                style={{
                  fontSize: `${scale.jobTitlePt}pt`,
                  letterSpacing: '1pt',
                  color: accent,
                  marginBottom: '4pt',
                }}
              >
                {personalInfo.jobTitle}
              </div>
            )}
            {renderContactInline('|', textCol, true)}
            {locationString && (
              <div style={{ fontSize: `${scale.metaPt}pt`, color: '#4b5563' }}>
                {locationString}
              </div>
            )}
          </header>
        );

      case 'left-scholar':
        return (
          <header
            style={{
              paddingBottom: '7pt',
              marginBottom: '8pt',
              borderBottom: `1.25pt solid ${accent}`,
            }}
          >
            <h1
              className="font-bold"
              style={{
                fontSize: `${scale.namePt}pt`,
                letterSpacing: '0.5pt',
                lineHeight: 1.18,
                color: textCol,
                marginBottom: '2pt',
              }}
            >
              {nameText}
            </h1>
            {personalInfo.jobTitle && (
              <div
                className="font-semibold"
                style={{
                  fontSize: `${scale.jobTitlePt}pt`,
                  color: accent,
                  marginBottom: '3pt',
                }}
              >
                {personalInfo.jobTitle}
              </div>
            )}
            {renderContactInline('|', textCol, false)}
            {locationString && (
              <div style={{ fontSize: `${scale.metaPt}pt`, color: textCol, marginBottom: '2pt' }}>
                {locationString}
              </div>
            )}
            {personalInfo.otherProfiles && (
              <div
                className="italic font-medium"
                style={{ fontSize: `${scale.metaPt}pt`, color: accent }}
              >
                {personalInfo.otherProfiles}
              </div>
            )}
          </header>
        );

      case 'centered-clean':
        return (
          <header
            className="text-center"
            style={{
              paddingBottom: '6pt',
              marginBottom: '7pt',
              borderBottom: `0.75pt solid ${accent}`,
            }}
          >
            <h1
              className="font-bold"
              style={{
                fontSize: `${scale.namePt}pt`,
                letterSpacing: '0.8pt',
                lineHeight: 1.18,
                color: textCol,
                marginBottom: '2pt',
              }}
            >
              {nameText}
            </h1>
            {personalInfo.jobTitle && (
              <div
                className="font-medium"
                style={{
                  fontSize: `${scale.jobTitlePt}pt`,
                  color: accent,
                  marginBottom: '3pt',
                }}
              >
                {personalInfo.jobTitle}
              </div>
            )}
            {renderContactInline('|', textCol, true)}
            {locationString && (
              <div style={{ fontSize: `${scale.metaPt}pt`, color: textCol }}>
                {locationString}
              </div>
            )}
            {personalInfo.otherProfiles && (
              <div
                className="italic"
                style={{ fontSize: `${scale.metaPt - 0.5}pt`, color: '#374151', marginTop: '1pt' }}
              >
                {personalInfo.otherProfiles}
              </div>
            )}
          </header>
        );

      case 'centered-academic':
      default:
        return (
          <header
            className="text-center"
            style={{
              marginBottom: '10pt',
              paddingBottom: '7pt',
              borderBottom: `1.5pt solid ${accent}`,
            }}
          >
            <h1
              className="font-bold uppercase"
              style={{
                fontSize: `${scale.namePt}pt`,
                letterSpacing: '2.5pt',
                lineHeight: 1.2,
                color: textCol,
                marginBottom: '3pt',
              }}
            >
              {nameText}
            </h1>
            {personalInfo.jobTitle && (
              <div
                className="font-bold uppercase"
                style={{
                  fontSize: `${scale.jobTitlePt}pt`,
                  letterSpacing: '0.8pt',
                  color: textCol,
                  marginBottom: '3pt',
                }}
              >
                {personalInfo.jobTitle}
              </div>
            )}
            {renderContactInline('•', textCol, true)}
            {locationString && (
              <div style={{ fontSize: `${scale.metaPt}pt`, color: textCol, marginBottom: '2pt' }}>
                {locationString}
              </div>
            )}
            {personalInfo.otherProfiles && (
              <div
                className="italic"
                style={{ fontSize: `${scale.metaPt - 0.5}pt`, color: '#222222', marginTop: '1pt' }}
              >
                {personalInfo.otherProfiles}
              </div>
            )}
          </header>
        );
    }
  };

  // Publication citation renderer (numbered 1. or bracketed [1])
  const renderPublicationCitation = (pub: PublicationItem) => {
    const { doiUrl, venue } = getPublicationParts(pub);

    if (pub.type === 'patent') {
      return (
        <span>
          <strong>{pub.authors || ''}</strong>
          {pub.year ? ` (${pub.year}). ` : '. '}
          "{pub.title || ''}"{' '}
          <em>{pub.patentNumber || 'Patent Application'}</em>
          {pub.status ? ` (${pub.status})` : ''}.
          {pub.publicationDate ? ` Issued ${pub.publicationDate}.` : ''}
        </span>
      );
    }

    return (
      <span>
        <strong>{pub.authors || ''}</strong>
        {pub.year ? ` (${pub.year}). ` : '. '}
        "{pub.title || ''}"{' '}
        {venue ? <em>{venue}</em> : null}
        {pub.volume ? `, ${pub.volume}` : ''}
        {pub.issue ? `(${pub.issue})` : ''}
        {pub.pages ? `, pp. ${pub.pages}` : ''}.
        {pub.location ? ` ${pub.location}.` : ''}
        {pub.status && pub.status !== 'Published' ? ` [${pub.status}]` : ''}
        {pub.doi ? (
          <span>
            {' '}
            DOI:{' '}
            {doiUrl ? (
              <a
                href={doiUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="no-underline hover:underline"
                style={{ color: custom.textColor }}
              >
                {pub.doi}
              </a>
            ) : (
              pub.doi
            )}
          </span>
        ) : null}
      </span>
    );
  };

  // Helper to wrap any unit in asymmetric 24%/76% row for Modern Minimalist
  const wrapLayoutUnit = (
    sectionTitle: string | undefined,
    showHeading: boolean,
    content: React.ReactNode,
    inverted = false,
    compact = false
  ): React.ReactNode => {
    if (isAsymmetric) {
      return (
        <div className="flex items-start">
          <div
            className="shrink-0 uppercase font-bold"
            style={{
              width: '24%',
              paddingRight: '12pt',
              fontSize: `${scale.headingPt - 0.75}pt`,
              letterSpacing: '0.9pt',
              color: custom.accentColor,
              lineHeight: 1.35,
            }}
          >
            {showHeading && sectionTitle ? sectionTitle : ''}
          </div>
          <div style={{ width: '76%' }}>{content}</div>
        </div>
      );
    }

    return (
      <div>
        {showHeading &&
          sectionTitle &&
          renderSectionHeading(sectionTitle, { inverted, compact })}
        {content}
      </div>
    );
  };

  // Build atomic units for a list of section keys (for single-column, main-column, or sidebar)
  const buildUnitsForSections = (
    sectionKeys: ResumeSectionKey[],
    options: { isSidebar: boolean; inverted: boolean }
  ): PreviewUnit[] => {
    const list: PreviewUnit[] = [];
    const textCol = options.inverted ? '#ffffff' : custom.textColor;
    const subCol = options.inverted ? 'rgba(255,255,255,0.86)' : '#1a1a1a';
    const metaCol = options.inverted ? 'rgba(255,255,255,0.82)' : '#222222';
    const bulletChar = template.bulletSymbol;

    for (const key of sectionKeys) {
      const sectionTitle = getSectionDisplayTitle(key, template.id);

      switch (key) {
        case 'objective': {
          const paragraphs = (effectiveResume.objective || '')
            .trim()
            .split(/\n+/)
            .map((p) => p.trim())
            .filter(Boolean);
          paragraphs.forEach((para, idx) => {
            list.push({
              id: `objective-${idx}`,
              spacing: idx === 0 ? 'section' : 'compact',
              sectionHeading: idx === 0 ? sectionTitle : undefined,
              objectiveText: para,
              isSidebar: options.isSidebar,
              render: (showHeading) =>
                wrapLayoutUnit(
                  sectionTitle,
                  showHeading,
                  <p
                    className="text-justify"
                    style={{
                      fontSize: `${scale.baseFontPt - 0.25}pt`,
                      lineHeight: scale.lineHeight,
                      color: textCol,
                    }}
                  >
                    {para}
                  </p>,
                  options.inverted,
                  options.isSidebar
                ),
            });
          });
          break;
        }

        case 'education': {
          (effectiveResume.education || []).forEach((edu, idx) => {
            list.push({
              id: `edu-${edu.id}`,
              spacing: idx === 0 ? 'section' : 'entry',
              sectionHeading: idx === 0 ? sectionTitle : undefined,
              isSidebar: options.isSidebar,
              render: (showHeading) =>
                wrapLayoutUnit(
                  sectionTitle,
                  showHeading,
                  options.isSidebar ? (
                    isTwoColumnPro ? (
                      <div
                        className="cv-entry"
                        style={{
                          color: textCol,
                          borderTop: idx > 0 ? '0.75pt dotted #cbd5e1' : 'none',
                          paddingTop: idx > 0 ? '4pt' : 0,
                        }}
                      >
                        <div className="font-bold" style={{ fontSize: `${scale.entryTitlePt - 0.25}pt`, color: '#111827', lineHeight: 1.25 }}>
                          {edu.degree}
                          {edu.specialization ? `, ${edu.specialization}` : ''}
                        </div>
                        <div
                          className="font-semibold"
                          style={{
                            fontSize: `${scale.entrySubtitlePt - 0.25}pt`,
                            color: custom.accentColor,
                            marginTop: '1pt',
                          }}
                        >
                          {edu.institution}
                        </div>
                        {(edu.startDate || edu.endDate || edu.current || edu.location) && (
                          <div
                            className="flex flex-wrap items-center"
                            style={{
                              gap: '6pt',
                              fontSize: `${scale.metaPt - 0.4}pt`,
                              color: '#4b5563',
                              marginTop: '1.5pt',
                            }}
                          >
                            {(edu.startDate || edu.endDate || edu.current) && (
                              <span className="inline-flex items-center">
                                {renderTwoColMetaIcon('calendar', '#6b7280')}
                                <span>
                                  {edu.startDate ? `${edu.startDate} – ` : ''}
                                  {edu.current ? 'Present' : edu.endDate}
                                </span>
                              </span>
                            )}
                            {edu.location && (
                              <span className="inline-flex items-center">
                                {renderTwoColMetaIcon('pin', '#6b7280')}
                                <span>{edu.location}</span>
                              </span>
                            )}
                          </div>
                        )}
                        {edu.grade && (
                          <div style={{ fontSize: `${scale.bodyPt - 0.25}pt`, color: '#374151', marginTop: '1.5pt' }}>
                            {edu.grade}
                          </div>
                        )}
                        {edu.achievements && (
                          <div style={{ fontSize: `${scale.bodyPt - 0.25}pt`, color: '#374151', marginTop: '1.5pt', lineHeight: 1.32 }}>
                            {edu.achievements}
                          </div>
                        )}
                        {edu.description && (
                          <div style={{ fontSize: `${scale.bodyPt - 0.25}pt`, color: '#4b5563', marginTop: '1.5pt', lineHeight: 1.32 }}>
                            {edu.description}
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="cv-entry" style={{ color: textCol }}>
                        <div className="font-bold" style={{ fontSize: `${scale.entryTitlePt - 0.25}pt` }}>
                          {edu.institution}
                        </div>
                        <div className="italic" style={{ fontSize: `${scale.entrySubtitlePt - 0.5}pt`, color: subCol }}>
                          {edu.degree}
                          {edu.specialization ? `, ${edu.specialization}` : ''}
                        </div>
                        <div style={{ fontSize: `${scale.metaPt - 0.5}pt`, color: metaCol }}>
                          {edu.startDate ? `${edu.startDate} – ` : ''}
                          {edu.current ? 'Present' : edu.endDate}
                          {edu.location ? ` · ${edu.location}` : ''}
                        </div>
                        {edu.grade && (
                          <div style={{ fontSize: `${scale.metaPt - 0.5}pt`, color: metaCol, marginTop: '1pt' }}>
                            {edu.grade}
                          </div>
                        )}
                        {edu.achievements && (
                          <div style={{ fontSize: `${scale.metaPt - 0.75}pt`, color: subCol, marginTop: '1pt', lineHeight: 1.3 }}>
                            {edu.achievements}
                          </div>
                        )}
                      </div>
                    )
                  ) : (
                    <div className="cv-entry" style={{ color: textCol, paddingLeft: isJakes ? '8pt' : undefined }}>
                      <div
                        className="flex justify-between items-baseline font-bold"
                        style={{ fontSize: `${scale.entryTitlePt}pt`, marginBottom: '0.5pt' }}
                      >
                        <span style={{ marginRight: '8pt' }}>{edu.institution}</span>
                        <span
                          className={`${isJakes ? 'font-bold' : 'font-normal'} shrink-0`}
                          style={{ fontSize: `${scale.entrySubtitlePt}pt` }}
                        >
                          {edu.startDate ? `${edu.startDate} – ` : ''}
                          {edu.current ? 'Present' : edu.endDate}
                        </span>
                      </div>
                      <div
                        className="flex justify-between items-baseline italic"
                        style={{ fontSize: `${scale.entrySubtitlePt}pt`, color: subCol, marginBottom: '1pt' }}
                      >
                        <span style={{ marginRight: '8pt' }}>
                          {edu.degree}
                          {edu.specialization ? `, ${edu.specialization}` : ''}
                        </span>
                        {edu.location && (
                          <span
                            className={`${isJakes ? 'italic' : 'not-italic'} shrink-0`}
                            style={{ fontSize: `${scale.metaPt}pt`, color: metaCol }}
                          >
                            {edu.location}
                          </span>
                        )}
                      </div>
                      {(edu.grade || edu.achievements) && (
                        <div
                          style={{
                            fontSize: `${scale.metaPt}pt`,
                            color: textCol,
                            marginTop: '1.5pt',
                            lineHeight: 1.32,
                          }}
                        >
                          {edu.grade && <span>{edu.grade}</span>}
                          {edu.grade && edu.achievements && <span> • </span>}
                          {edu.achievements && <span>{edu.achievements}</span>}
                        </div>
                      )}
                      {edu.description && (
                        <div
                          style={{
                            fontSize: `${scale.bodyPt}pt`,
                            color: subCol,
                            marginTop: '1.5pt',
                            lineHeight: scale.lineHeight,
                          }}
                        >
                          {edu.description}
                        </div>
                      )}
                    </div>
                  ),
                  options.inverted,
                  options.isSidebar
                ),
            });
          });
          break;
        }

        case 'thesis': {
          const thesis = effectiveResume.thesis;
          if (thesis && (thesis.title?.trim() || thesis.supervisors?.trim() || thesis.description?.trim())) {
            list.push({
              id: 'master-thesis-entry',
              spacing: 'section',
              sectionHeading: sectionTitle,
              isSidebar: options.isSidebar,
              render: (showHeading) =>
                wrapLayoutUnit(
                  sectionTitle,
                  showHeading,
                  <div className="cv-entry" style={{ color: textCol }}>
                    <div
                      className="flex justify-between items-baseline font-bold"
                      style={{ fontSize: `${scale.entryTitlePt}pt`, marginBottom: '1pt' }}
                    >
                      <span style={{ marginRight: '8pt' }}>{thesis.title}</span>
                      {thesis.year && (
                        <span className="font-normal shrink-0" style={{ fontSize: `${scale.entrySubtitlePt}pt` }}>
                          {thesis.year}
                        </span>
                      )}
                    </div>
                    {thesis.institution && (
                      <div className="italic" style={{ fontSize: `${scale.entrySubtitlePt}pt`, color: subCol }}>
                        {thesis.institution}
                      </div>
                    )}
                    {thesis.supervisors && (
                      <div style={{ fontSize: `${scale.metaPt}pt`, color: metaCol, marginTop: '1.5pt' }}>
                        <span className="font-semibold">Supervisors: </span>
                        <span>{thesis.supervisors}</span>
                      </div>
                    )}
                    {thesis.description && (
                      <p style={{ fontSize: `${scale.bodyPt}pt`, lineHeight: scale.lineHeight, marginTop: '2pt', color: textCol }}>
                        {thesis.description}
                      </p>
                    )}
                  </div>,
                  options.inverted,
                  options.isSidebar
                ),
            });
          }
          break;
        }

        case 'coursework': {
          const courses = getCourseworkItems(effectiveResume);
          const rows = chunkRows(courses, 4);
          rows.forEach((row, rIdx) => {
            list.push({
              id: `coursework-row-${rIdx}`,
              spacing: rIdx === 0 ? 'section' : 'bullet',
              sectionHeading: rIdx === 0 ? sectionTitle : undefined,
              isSidebar: options.isSidebar,
              render: (showHeading) =>
                wrapLayoutUnit(
                  sectionTitle,
                  showHeading,
                  <div
                    className="cv-entry grid grid-cols-4 gap-x-2"
                    style={{
                      paddingLeft: isJakes ? '10pt' : '4pt',
                      fontSize: `${scale.bodyPt}pt`,
                      lineHeight: scale.lineHeight,
                      color: textCol,
                    }}
                  >
                    {row.map((course, cIdx) => (
                      <div key={cIdx} className="flex items-start min-w-0">
                        <span style={{ width: '8pt', flexShrink: 0 }}>{bulletChar}</span>
                        <span className="min-w-0 break-words">{course}</span>
                      </div>
                    ))}
                  </div>,
                  options.inverted,
                  options.isSidebar
                ),
            });
          });
          break;
        }

        case 'experience': {
          const expGroups = isClassic
            ? groupExperienceByCategory(effectiveResume.experience || [])
            : [{ categoryLabel: null as string | null, items: effectiveResume.experience || [] }];

          let globalExpIndex = 0;
          expGroups.forEach((group, gIdx) => {
            group.items.forEach((exp, itemIdx) => {
              const isFirstSectionUnit = globalExpIndex === 0;
              globalExpIndex += 1;
              const categoryHeadingForThisItem =
                isClassic && itemIdx === 0 ? group.categoryLabel : null;

              const bullets = cleanHighlights(exp.highlights);
              const firstBullet = bullets[0];
              const remainingBullets = bullets.slice(1);
              const subMap = new Map<number, string[]>();
              (exp.subHighlights || []).forEach((sh) => {
                const cleanedSub = cleanHighlights(sh.items);
                if (cleanedSub.length > 0) {
                  subMap.set(sh.parentIndex, cleanedSub);
                }
              });

              list.push({
                id: `exp-head-${exp.id}`,
                spacing: isFirstSectionUnit ? 'section' : 'entry',
                sectionHeading: isFirstSectionUnit ? sectionTitle : undefined,
                isSidebar: options.isSidebar,
                render: (showHeading) =>
                  wrapLayoutUnit(
                    sectionTitle,
                    showHeading,
                    isTwoColumnPro ? (
                      <div
                        className="cv-entry"
                        style={{
                          color: textCol,
                          borderTop: !isFirstSectionUnit ? '0.75pt dotted #cbd5e1' : 'none',
                          paddingTop: !isFirstSectionUnit ? '4pt' : 0,
                        }}
                      >
                        <div
                          className="font-bold"
                          style={{ fontSize: `${scale.entryTitlePt}pt`, color: '#111827', lineHeight: 1.25 }}
                        >
                          {exp.position}
                        </div>
                        <div
                          className="font-semibold"
                          style={{ fontSize: `${scale.entrySubtitlePt}pt`, color: custom.accentColor, marginTop: '0.5pt' }}
                        >
                          {exp.company}
                          {exp.employmentType ? ` (${exp.employmentType})` : ''}
                        </div>
                        {(exp.startDate || exp.endDate || exp.current || exp.location) && (
                          <div
                            className="flex flex-wrap items-center"
                            style={{
                              gap: '8pt',
                              fontSize: `${scale.metaPt - 0.25}pt`,
                              color: '#4b5563',
                              marginTop: '1.5pt',
                              marginBottom: '2pt',
                            }}
                          >
                            {(exp.startDate || exp.endDate || exp.current) && (
                              <span className="inline-flex items-center">
                                {renderTwoColMetaIcon('calendar', '#6b7280')}
                                <span>
                                  {exp.startDate} – {exp.current ? 'Present' : exp.endDate}
                                </span>
                              </span>
                            )}
                            {exp.location && (
                              <span className="inline-flex items-center">
                                {renderTwoColMetaIcon('pin', '#6b7280')}
                                <span>{exp.location}</span>
                              </span>
                            )}
                          </div>
                        )}
                        {exp.description && (
                          <div style={{ fontSize: `${scale.bodyPt}pt`, color: '#374151', lineHeight: scale.lineHeight, marginTop: '1.5pt' }}>
                            {exp.description}
                          </div>
                        )}
                        {firstBullet && (
                          <div className="flex items-start" style={{ marginTop: '2pt', paddingLeft: '2pt' }}>
                            <span style={{ width: '9pt', fontSize: `${scale.entrySubtitlePt}pt`, flexShrink: 0, color: '#4b5563' }}>
                              {bulletChar}
                            </span>
                            <span style={{ fontSize: `${scale.bodyPt}pt`, lineHeight: scale.lineHeight, flex: 1 }}>
                              {firstBullet}
                            </span>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="cv-entry" style={{ color: textCol, paddingLeft: isJakes ? '8pt' : undefined }}>
                        {categoryHeadingForThisItem && (
                          <div
                            className="font-bold uppercase"
                            style={{
                              fontSize: `${scale.metaPt}pt`,
                              letterSpacing: '0.6pt',
                              color: custom.accentColor,
                              marginBottom: '3pt',
                              marginTop: gIdx > 0 ? '2pt' : '0pt',
                            }}
                          >
                            {categoryHeadingForThisItem}
                          </div>
                        )}
                        <div
                          className="flex justify-between items-baseline font-bold"
                          style={{ fontSize: `${scale.entryTitlePt}pt`, marginBottom: '0.5pt' }}
                        >
                          <span style={{ marginRight: '8pt' }}>{exp.company}</span>
                          <span
                            className={`${isJakes ? 'font-bold' : 'font-normal'} shrink-0`}
                            style={{ fontSize: `${scale.entrySubtitlePt}pt` }}
                          >
                            {exp.startDate} – {exp.current ? 'Present' : exp.endDate}
                          </span>
                        </div>
                        <div
                          className="flex justify-between items-baseline italic"
                          style={{ fontSize: `${scale.entrySubtitlePt}pt`, color: subCol, marginBottom: '1pt' }}
                        >
                          <span style={{ marginRight: '8pt' }}>
                            {exp.position}
                            {!isJakes && exp.employmentType ? ` (${exp.employmentType})` : ''}
                          </span>
                          {exp.location && (
                            <span
                              className={`${isJakes ? 'italic' : 'not-italic'} shrink-0`}
                              style={{ fontSize: `${scale.metaPt}pt`, color: metaCol }}
                            >
                              {exp.location}
                            </span>
                          )}
                        </div>
                        {exp.description && (
                          <div style={{ fontSize: `${scale.bodyPt}pt`, color: subCol, lineHeight: scale.lineHeight, marginTop: '1.5pt' }}>
                            {exp.description}
                          </div>
                        )}
                        {firstBullet && (
                          <>
                            <div
                              className="flex items-start"
                              style={{ marginTop: '2pt', paddingLeft: isJakes ? '10pt' : '8pt' }}
                            >
                              <span style={{ width: '10pt', fontSize: `${scale.entrySubtitlePt}pt`, flexShrink: 0 }}>
                                {bulletChar}
                              </span>
                              <span style={{ fontSize: `${scale.bodyPt}pt`, lineHeight: scale.lineHeight, flex: 1 }}>
                                {firstBullet}
                              </span>
                            </div>
                            {(subMap.get(0) || []).map((subItem, sIdx) => (
                              <div
                                key={sIdx}
                                className="flex items-start"
                                style={{ marginTop: '1pt', paddingLeft: '22pt', color: subCol }}
                              >
                                <span style={{ width: '9pt', fontSize: `${scale.bodyPt}pt`, flexShrink: 0 }}>
                                  –
                                </span>
                                <span style={{ fontSize: `${scale.bodyPt - 0.25}pt`, lineHeight: scale.lineHeight, flex: 1 }}>
                                  {subItem}
                                </span>
                              </div>
                            ))}
                          </>
                        )}
                      </div>
                    ),
                    options.inverted,
                    options.isSidebar
                  ),
              });

              remainingBullets.forEach((hl, bIdx) => {
                const actualParentIdx = bIdx + 1;
                const nestedSubs = subMap.get(actualParentIdx) || [];
                list.push({
                  id: `exp-bullet-${exp.id}-${bIdx}`,
                  spacing: 'bullet',
                  isSidebar: options.isSidebar,
                  render: () =>
                    wrapLayoutUnit(
                      undefined,
                      false,
                      <div style={{ color: textCol }}>
                        <div
                          className="cv-entry flex items-start"
                          style={{ paddingLeft: isJakes ? '18pt' : isTwoColumnPro ? '2pt' : '8pt' }}
                        >
                          <span style={{ width: isTwoColumnPro ? '9pt' : '10pt', fontSize: `${scale.entrySubtitlePt}pt`, flexShrink: 0, color: isTwoColumnPro ? '#4b5563' : undefined }}>
                            {bulletChar}
                          </span>
                          <span style={{ fontSize: `${scale.bodyPt}pt`, lineHeight: scale.lineHeight, flex: 1 }}>
                            {hl}
                          </span>
                        </div>
                        {nestedSubs.map((subItem, sIdx) => (
                          <div
                            key={sIdx}
                            className="flex items-start"
                            style={{ marginTop: '1pt', paddingLeft: '22pt', color: subCol }}
                          >
                            <span style={{ width: '9pt', fontSize: `${scale.bodyPt}pt`, flexShrink: 0 }}>
                              –
                            </span>
                            <span style={{ fontSize: `${scale.bodyPt - 0.25}pt`, lineHeight: scale.lineHeight, flex: 1 }}>
                              {subItem}
                            </span>
                          </div>
                        ))}
                      </div>,
                      options.inverted,
                      options.isSidebar
                    ),
                });
              });
            });
          });
          break;
        }

        case 'publications': {
          if (isTwoColumnPro) {
            const groups = groupPublicationsForTwoColumn(effectiveResume.publications || []);
            let pubUnitCounter = 0;
            groups.forEach((group, gIdx) => {
              group.items.forEach((pub, itemIdx) => {
                const isFirstOverall = pubUnitCounter === 0;
                const isFirstInGroup = itemIdx === 0;
                pubUnitCounter += 1;
                const { doiUrl, venue } = getPublicationParts(pub);
                const extUrl = pub.url?.trim()
                  ? pub.url.trim().startsWith('http')
                    ? pub.url.trim()
                    : `https://${pub.url.trim()}`
                  : doiUrl;

                list.push({
                  id: `pub-${pub.id}`,
                  spacing: isFirstOverall ? 'section' : isFirstInGroup ? 'entry' : 'citation',
                  sectionHeading: isFirstOverall ? sectionTitle : undefined,
                  isSidebar: options.isSidebar,
                  render: (showHeading) =>
                    wrapLayoutUnit(
                      sectionTitle,
                      showHeading,
                      <div
                        className="cv-entry"
                        style={{
                          color: textCol,
                          borderTop: isFirstInGroup && gIdx > 0 ? '0.75pt dotted #cbd5e1' : 'none',
                          paddingTop: isFirstInGroup && gIdx > 0 ? '4pt' : 0,
                        }}
                      >
                        {isFirstInGroup && (
                          <div
                            className="flex items-center font-bold"
                            style={{
                              fontSize: `${scale.entryTitlePt - 0.25}pt`,
                              color: custom.accentColor,
                              marginBottom: '2.5pt',
                            }}
                          >
                            {renderTwoColPubIcon(group.categoryKey, '#111827')}
                            <span>{group.label}</span>
                          </div>
                        )}
                        <div className="flex items-start" style={{ paddingLeft: '2pt' }}>
                          <span style={{ width: '9pt', fontSize: `${scale.entrySubtitlePt}pt`, flexShrink: 0, color: '#4b5563' }}>
                            {bulletChar}
                          </span>
                          <div style={{ fontSize: `${scale.bodyPt - 0.15}pt`, lineHeight: scale.lineHeight, flex: 1 }}>
                            <span>
                              <strong>{pub.authors || ''}</strong>
                              {pub.year ? ` (${pub.year}). ` : '. '}
                              &ldquo;{pub.title || ''}&rdquo;{' '}
                              {venue ? <em>{venue}</em> : null}
                              {pub.volume ? `, ${pub.volume}` : ''}
                              {pub.issue ? `(${pub.issue})` : ''}
                              {pub.pages ? `, pp. ${pub.pages}` : ''}.
                              {pub.location ? ` ${pub.location}.` : ''}
                            </span>
                            {(pub.doi || extUrl) && (
                              <span>
                                {' '}
                                {extUrl ? (
                                  <a
                                    href={extUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="no-underline hover:underline"
                                    style={{ color: custom.accentColor }}
                                  >
                                    {pub.doi ? `DOI: ${pub.doi}` : pub.url?.replace(/^https?:\/\//, '')}
                                  </a>
                                ) : (
                                  <span>DOI: {pub.doi}</span>
                                )}
                              </span>
                            )}
                            {pub.description?.trim() && (
                              <div style={{ color: '#4b5563', fontSize: `${scale.bodyPt - 0.5}pt`, marginTop: '1pt' }}>
                                {pub.description.trim()}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>,
                      options.inverted,
                      options.isSidebar
                    ),
                });
              });
            });
          } else {
            (effectiveResume.publications || []).forEach((pub, idx) => {
              const marker =
                template.citationStyle === 'bracketed' ? `[${idx + 1}]` : `${idx + 1}.`;
              list.push({
                id: `pub-${pub.id}`,
                spacing: idx === 0 ? 'section' : 'citation',
                sectionHeading: idx === 0 ? sectionTitle : undefined,
                isSidebar: options.isSidebar,
                render: (showHeading) =>
                  wrapLayoutUnit(
                    sectionTitle,
                    showHeading,
                    <div className="cv-entry flex items-start" style={{ paddingLeft: '4pt', color: textCol }}>
                      <span
                        style={{
                          width: template.citationStyle === 'bracketed' ? '22pt' : '18pt',
                          fontSize: `${scale.entrySubtitlePt}pt`,
                          flexShrink: 0,
                        }}
                      >
                        {marker}
                      </span>
                      <div style={{ fontSize: `${scale.bodyPt}pt`, lineHeight: scale.lineHeight, flex: 1 }}>
                        {renderPublicationCitation(pub)}
                      </div>
                    </div>,
                    options.inverted,
                    options.isSidebar
                  ),
              });
            });
          }
          break;
        }

        case 'projects': {
          (effectiveResume.projects || []).forEach((proj, idx) => {
            const baseBullets = cleanHighlights(proj.highlights);
            const softwareDevExtraBullets = isSoftwareDev
              ? [
                  ...cleanHighlights(proj.keyFeatures),
                  ...(proj.problemSolved?.trim()
                    ? [`Problem Solved: ${proj.problemSolved.trim()}`]
                    : []),
                  ...(proj.contribution?.trim()
                    ? [`Contribution: ${proj.contribution.trim()}`]
                    : []),
                  ...(proj.technicalChallenges?.trim()
                    ? [`Technical Challenges: ${proj.technicalChallenges.trim()}`]
                    : []),
                  ...cleanHighlights(proj.achievements),
                ]
              : [];
            const bullets = [...baseBullets, ...softwareDevExtraBullets];
            const firstBullet = bullets[0];
            const remainingBullets = bullets.slice(1);
            const cleanProjLink = proj.link ? proj.link.replace(/^https?:\/\//, '') : '';
            const cleanGithubLink = proj.githubUrl
              ? proj.githubUrl.replace(/^https?:\/\//, '')
              : '';

            const swStackParts: string[] = [];
            if (isSoftwareDev) {
              if (proj.technologies?.length) swStackParts.push(`Tech: ${proj.technologies.join(', ')}`);
              if (proj.frameworks?.length) swStackParts.push(`Frameworks: ${proj.frameworks.join(', ')}`);
              if (proj.database?.trim()) swStackParts.push(`Database: ${proj.database.trim()}`);
              if (proj.tools?.length) swStackParts.push(`Tools: ${proj.tools.join(', ')}`);
            }

            list.push({
              id: `proj-head-${proj.id}`,
              spacing: idx === 0 ? 'section' : 'entry',
              sectionHeading: idx === 0 ? sectionTitle : undefined,
              isSidebar: options.isSidebar,
              render: (showHeading) =>
                wrapLayoutUnit(
                  sectionTitle,
                  showHeading,
                  isTwoColumnPro ? (
                    <div
                      className="cv-entry"
                      style={{
                        color: textCol,
                        borderTop: idx > 0 ? '0.75pt dotted #cbd5e1' : 'none',
                        paddingTop: idx > 0 ? '4pt' : 0,
                      }}
                    >
                      <div className="font-bold" style={{ fontSize: `${scale.entryTitlePt}pt`, color: '#111827', lineHeight: 1.25 }}>
                        {proj.title}
                      </div>
                      {proj.institution && (
                        <div className="font-semibold" style={{ fontSize: `${scale.entrySubtitlePt}pt`, color: custom.accentColor, marginTop: '0.5pt' }}>
                          {proj.institution}
                        </div>
                      )}
                      {(proj.startDate || proj.endDate || proj.githubUrl || proj.link) && (
                        <div
                          className="flex flex-wrap items-center"
                          style={{ gap: '8pt', fontSize: `${scale.metaPt - 0.25}pt`, color: '#4b5563', marginTop: '1.5pt', marginBottom: '2pt' }}
                        >
                          {(proj.startDate || proj.endDate) && (
                            <span className="inline-flex items-center">
                              {renderTwoColMetaIcon('calendar', '#6b7280')}
                              <span>
                                {proj.startDate}
                                {proj.endDate && proj.endDate !== proj.startDate ? ` – ${proj.endDate}` : ''}
                              </span>
                            </span>
                          )}
                          {proj.githubUrl && (
                            <a
                              href={proj.githubUrl.startsWith('http') ? proj.githubUrl : `https://${proj.githubUrl}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="no-underline hover:underline"
                              style={{ color: custom.accentColor }}
                            >
                              {cleanGithubLink}
                            </a>
                          )}
                          {proj.link && (
                            <a
                              href={proj.link.startsWith('http') ? proj.link : `https://${proj.link}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="no-underline hover:underline"
                              style={{ color: custom.accentColor }}
                            >
                              {cleanProjLink}
                            </a>
                          )}
                        </div>
                      )}
                      {proj.description && (
                        <p style={{ fontSize: `${scale.bodyPt}pt`, lineHeight: scale.lineHeight, color: '#374151', marginBottom: '1.5pt' }}>
                          {proj.description}
                        </p>
                      )}
                      {proj.problemSolved && (
                        <div style={{ fontSize: `${scale.bodyPt - 0.25}pt`, color: '#374151', lineHeight: scale.lineHeight }}>
                          <strong>Problem: </strong>
                          {proj.problemSolved}
                        </div>
                      )}
                      {proj.contribution && (
                        <div style={{ fontSize: `${scale.bodyPt - 0.25}pt`, color: '#374151', lineHeight: scale.lineHeight }}>
                          <strong>Role: </strong>
                          {proj.contribution}
                        </div>
                      )}
                      {proj.achievements && (
                        <div style={{ fontSize: `${scale.bodyPt - 0.25}pt`, color: '#374151', lineHeight: scale.lineHeight }}>
                          <strong>Outcomes: </strong>
                          {proj.achievements}
                        </div>
                      )}
                      {proj.technologies && proj.technologies.length > 0 && (
                        <div style={{ fontSize: `${scale.metaPt - 0.25}pt`, color: '#4b5563', marginTop: '1pt' }}>
                          <strong>Technologies: </strong>
                          {proj.technologies.join(', ')}
                        </div>
                      )}
                      {firstBullet && (
                        <div className="flex items-start" style={{ marginTop: '2pt', paddingLeft: '2pt' }}>
                          <span style={{ width: '9pt', fontSize: `${scale.entrySubtitlePt}pt`, flexShrink: 0, color: '#4b5563' }}>
                            {bulletChar}
                          </span>
                          <span style={{ fontSize: `${scale.bodyPt}pt`, lineHeight: scale.lineHeight, flex: 1 }}>
                            {firstBullet}
                          </span>
                        </div>
                      )}
                    </div>
                  ) : isSoftwareDev ? (
                    <div className="cv-entry" style={{ color: textCol }}>
                      <div
                        className="flex justify-between items-baseline"
                        style={{ fontSize: `${scale.entryTitlePt}pt`, marginBottom: '1pt' }}
                      >
                        <div style={{ marginRight: '8pt' }}>
                          <span className="font-bold">{proj.title}</span>
                          {proj.projectType?.trim() && (
                            <span className="italic" style={{ fontSize: `${scale.metaPt}pt`, color: subCol, marginLeft: '4pt' }}>
                              ({proj.projectType.trim()})
                            </span>
                          )}
                          {(proj.githubUrl || proj.link) && (
                            <span style={{ fontSize: `${scale.metaPt}pt`, marginLeft: '5pt' }}>
                              {proj.githubUrl && (
                                <a
                                  href={
                                    proj.githubUrl.startsWith('http')
                                      ? proj.githubUrl
                                      : `https://${proj.githubUrl}`
                                  }
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="hover:underline"
                                  style={{
                                    color: custom.accentColor,
                                    textDecoration: 'underline',
                                    marginRight: proj.link ? '5pt' : 0,
                                  }}
                                >
                                  [GitHub]
                                </a>
                              )}
                              {proj.link && (
                                <a
                                  href={proj.link.startsWith('http') ? proj.link : `https://${proj.link}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="hover:underline"
                                  style={{
                                    color: custom.accentColor,
                                    textDecoration: 'underline',
                                  }}
                                >
                                  [Live Demo]
                                </a>
                              )}
                            </span>
                          )}
                        </div>
                        {(proj.startDate || proj.endDate || proj.current) && (
                          <span className="shrink-0" style={{ fontSize: `${scale.entrySubtitlePt}pt`, color: textCol }}>
                            {proj.startDate}
                            {proj.current ? ' – Present' : proj.endDate && proj.endDate !== proj.startDate ? ` – ${proj.endDate}` : ''}
                          </span>
                        )}
                      </div>

                      {swStackParts.length > 0 && (
                        <div
                          className="italic"
                          style={{
                            fontSize: `${scale.metaPt}pt`,
                            color: subCol,
                            marginBottom: '1.5pt',
                            lineHeight: 1.25,
                          }}
                        >
                          {swStackParts.join(' • ')}
                        </div>
                      )}

                      {proj.description && (
                        <p style={{ fontSize: `${scale.bodyPt}pt`, lineHeight: scale.lineHeight, marginBottom: '1.5pt' }}>
                          {proj.description}
                        </p>
                      )}

                      {firstBullet && (
                        <div className="flex items-start" style={{ marginTop: '1.5pt', paddingLeft: '8pt' }}>
                          <span style={{ width: '10pt', fontSize: `${scale.entrySubtitlePt}pt`, flexShrink: 0 }}>
                            {bulletChar}
                          </span>
                          <span style={{ fontSize: `${scale.bodyPt}pt`, lineHeight: scale.lineHeight, flex: 1 }}>
                            {firstBullet}
                          </span>
                        </div>
                      )}
                    </div>
                  ) : isJakes ? (
                    <div className="cv-entry" style={{ color: textCol, paddingLeft: '8pt' }}>
                      <div
                        className="flex justify-between items-baseline"
                        style={{ fontSize: `${scale.entryTitlePt}pt`, marginBottom: '1pt' }}
                      >
                        <div style={{ marginRight: '8pt' }}>
                          <span className="font-bold">{proj.title}</span>
                          {proj.technologies && proj.technologies.length > 0 && (
                            <>
                              <span> | </span>
                              <span className="italic" style={{ fontSize: `${scale.entrySubtitlePt}pt` }}>
                                {proj.technologies.join(', ')}
                              </span>
                            </>
                          )}
                          {(proj.githubUrl || proj.link) && (
                            <span style={{ fontSize: `${scale.metaPt}pt`, marginLeft: '5pt' }}>
                              {proj.githubUrl && (
                                <a
                                  href={
                                    proj.githubUrl.startsWith('http')
                                      ? proj.githubUrl
                                      : `https://${proj.githubUrl}`
                                  }
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="underline"
                                  style={{ color: textCol, marginRight: proj.link ? '4pt' : 0 }}
                                >
                                  [GitHub]
                                </a>
                              )}
                              {proj.link && (
                                <a
                                  href={proj.link.startsWith('http') ? proj.link : `https://${proj.link}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="underline"
                                  style={{ color: textCol }}
                                >
                                  [{cleanProjLink.includes('github.com') ? 'GitHub' : 'Link'}]
                                </a>
                              )}
                            </span>
                          )}
                        </div>
                        {(proj.startDate || proj.endDate) && (
                          <span className="font-bold shrink-0" style={{ fontSize: `${scale.entrySubtitlePt}pt` }}>
                            {proj.startDate}
                            {proj.endDate && proj.endDate !== proj.startDate ? ` – ${proj.endDate}` : ''}
                          </span>
                        )}
                      </div>

                      {proj.description && (
                        <p style={{ fontSize: `${scale.bodyPt}pt`, lineHeight: scale.lineHeight, marginBottom: '1.5pt', paddingLeft: '10pt' }}>
                          {proj.description}
                        </p>
                      )}

                      {firstBullet && (
                        <div className="flex items-start" style={{ marginTop: '1.5pt', paddingLeft: '10pt' }}>
                          <span style={{ width: '10pt', fontSize: `${scale.entrySubtitlePt}pt`, flexShrink: 0 }}>
                            {bulletChar}
                          </span>
                          <span style={{ fontSize: `${scale.bodyPt}pt`, lineHeight: scale.lineHeight, flex: 1 }}>
                            {firstBullet}
                          </span>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="cv-entry" style={{ color: textCol }}>
                      <div
                        className="flex justify-between items-baseline font-bold"
                        style={{ fontSize: `${scale.entryTitlePt}pt`, marginBottom: '1pt' }}
                      >
                        <span style={{ marginRight: '8pt' }}>{proj.title}</span>
                        {(proj.startDate || proj.endDate) && (
                          <span className="font-normal shrink-0" style={{ fontSize: `${scale.entrySubtitlePt}pt` }}>
                            {proj.startDate}
                            {proj.endDate && ` – ${proj.endDate}`}
                          </span>
                        )}
                      </div>

                      {(proj.technologies?.length || proj.link || proj.githubUrl) && (
                        <div
                          className="italic"
                          style={{ fontSize: `${scale.entrySubtitlePt}pt`, color: subCol, marginBottom: '2pt' }}
                        >
                          {proj.technologies && proj.technologies.length > 0 && (
                            <span>Technologies: {proj.technologies.join(', ')} </span>
                          )}
                          {proj.link && (
                            <span className="not-italic" style={{ color: textCol }}>
                              [
                              <a
                                href={proj.link.startsWith('http') ? proj.link : `https://${proj.link}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="no-underline hover:underline"
                                style={{ color: textCol }}
                              >
                                {cleanProjLink}
                              </a>
                              ]
                            </span>
                          )}
                          {proj.githubUrl && (
                            <span className="not-italic" style={{ color: textCol, marginLeft: '4pt' }}>
                              [
                              <a
                                href={
                                  proj.githubUrl.startsWith('http')
                                    ? proj.githubUrl
                                    : `https://${proj.githubUrl}`
                                }
                                target="_blank"
                                rel="noopener noreferrer"
                                className="no-underline hover:underline"
                                style={{ color: textCol }}
                              >
                                {cleanGithubLink}
                              </a>
                              ]
                            </span>
                          )}
                        </div>
                      )}

                      {proj.description && (
                        <p style={{ fontSize: `${scale.bodyPt}pt`, lineHeight: scale.lineHeight, marginBottom: '2pt' }}>
                          {proj.description}
                        </p>
                      )}

                      {firstBullet && (
                        <div className="flex items-start" style={{ marginTop: '2pt', paddingLeft: '8pt' }}>
                          <span style={{ width: '10pt', fontSize: `${scale.entrySubtitlePt}pt`, flexShrink: 0 }}>
                            {bulletChar}
                          </span>
                          <span style={{ fontSize: `${scale.bodyPt}pt`, lineHeight: scale.lineHeight, flex: 1 }}>
                            {firstBullet}
                          </span>
                        </div>
                      )}
                    </div>
                  ),
                  options.inverted,
                  options.isSidebar
                ),
            });

            remainingBullets.forEach((hl, bIdx) => {
              list.push({
                id: `proj-bullet-${proj.id}-${bIdx}`,
                spacing: 'bullet',
                isSidebar: options.isSidebar,
                render: () =>
                  wrapLayoutUnit(
                    undefined,
                    false,
                    <div
                      className="cv-entry flex items-start"
                      style={{ paddingLeft: isJakes ? '18pt' : isTwoColumnPro ? '2pt' : '8pt', color: textCol }}
                    >
                      <span style={{ width: isTwoColumnPro ? '9pt' : '10pt', fontSize: `${scale.entrySubtitlePt}pt`, flexShrink: 0, color: isTwoColumnPro ? '#4b5563' : undefined }}>
                        {bulletChar}
                      </span>
                      <span style={{ fontSize: `${scale.bodyPt}pt`, lineHeight: scale.lineHeight, flex: 1 }}>
                        {hl}
                      </span>
                    </div>,
                    options.inverted,
                    options.isSidebar
                  ),
              });
            });
          });
          break;
        }

        case 'daily-life': {
          const donut = computeDonutChartSegments(effectiveResume.dailyActivities || [], {
            accentColor: custom.accentColor,
            viewBoxWidth: 272,
            viewBoxHeight: 152,
            outerRadius: 36,
            innerRadius: 16,
          });
          if (donut.segments.length > 0 && effectiveResume.showDailyActivityChart !== false) {
            list.push({
              id: 'daily-life-donut',
              spacing: 'section',
              sectionHeading: sectionTitle,
              isSidebar: options.isSidebar,
              render: (showHeading) =>
                wrapLayoutUnit(
                  sectionTitle,
                  showHeading,
                  <div className="cv-entry flex justify-center" style={{ paddingTop: '2pt', paddingBottom: '2pt' }}>
                    <svg
                      viewBox={`0 0 ${donut.viewBoxWidth} ${donut.viewBoxHeight}`}
                      style={{ width: '100%', maxWidth: '258pt', height: 'auto', overflow: 'visible', display: 'block' }}
                      role="img"
                      aria-label="A day of my life donut chart"
                    >
                      {donut.segments.map((seg) => {
                        const lines = wrapDonutLabelLines(seg.activity, 14);
                        const labelX = seg.side === 'right' ? seg.labelEndX + 4 : seg.labelEndX - 4;
                        return (
                          <g key={seg.id}>
                            <path d={seg.pathD} fill={seg.color} stroke="#ffffff" strokeWidth="1.2" />
                            <circle cx={seg.dotX} cy={seg.dotY} r="2" fill="#64748b" />
                            <polyline
                              points={`${seg.dotX},${seg.dotY} ${seg.elbowX},${seg.elbowY} ${seg.labelEndX},${seg.labelY}`}
                              fill="none"
                              stroke="#64748b"
                              strokeWidth="0.7"
                            />
                            <text
                              x={labelX}
                              y={lines.length > 1 ? seg.labelY - 2 : seg.labelY + 2.5}
                              textAnchor={seg.side === 'right' ? 'start' : 'end'}
                              fontSize="7.2"
                              fill="#1f2937"
                              fontFamily="inherit"
                            >
                              {lines.map((line, lIdx) => (
                                <tspan key={lIdx} x={labelX} dy={lIdx === 0 ? 0 : 8.5}>
                                  {line}
                                </tspan>
                              ))}
                            </text>
                          </g>
                        );
                      })}
                    </svg>
                  </div>,
                  options.inverted,
                  options.isSidebar
                ),
            });
          }
          break;
        }

        case 'philosophy': {
          const quote = (effectiveResume.personalQuote || '').trim();
          if (quote) {
            list.push({
              id: 'philosophy-quote',
              spacing: 'section',
              sectionHeading: sectionTitle,
              isSidebar: options.isSidebar,
              render: (showHeading) =>
                wrapLayoutUnit(
                  sectionTitle,
                  showHeading,
                  <div
                    className="cv-entry italic"
                    style={{
                      fontSize: `${scale.bodyPt + 0.35}pt`,
                      lineHeight: 1.4,
                      color: custom.accentColor,
                      textAlign: 'center',
                      padding: '2pt 4pt',
                    }}
                  >
                    &ldquo;{quote}&rdquo;
                  </div>,
                  options.inverted,
                  options.isSidebar
                ),
            });
          }
          break;
        }

        case 'strengths': {
          const items = (effectiveResume.strengths || []).map((s) => s.trim()).filter(Boolean);
          if (items.length > 0) {
            list.push({
              id: 'strengths-chips',
              spacing: 'section',
              sectionHeading: sectionTitle,
              isSidebar: options.isSidebar,
              render: (showHeading) =>
                wrapLayoutUnit(
                  sectionTitle,
                  showHeading,
                  <div className="cv-entry flex flex-wrap" style={{ gap: '4pt' }}>
                    {items.map((chip, cIdx) => (
                      <span
                        key={cIdx}
                        style={{
                          display: 'inline-block',
                          padding: '2pt 5.5pt',
                          border: '0.75pt solid #cbd5e1',
                          borderRadius: '3pt',
                          fontSize: `${scale.metaPt - 0.35}pt`,
                          fontWeight: 500,
                          color: '#1f2937',
                          lineHeight: 1.25,
                        }}
                      >
                        {chip}
                      </span>
                    ))}
                  </div>,
                  options.inverted,
                  options.isSidebar
                ),
            });
          }
          break;
        }

        case 'skills': {
          const visibleSkills = getVisibleSkills(effectiveResume.skills);
          if (isJakes) {
            visibleSkills.forEach((cat, idx) => {
              list.push({
                id: `skill-${cat.id}`,
                spacing: idx === 0 ? 'section' : 'bullet',
                sectionHeading: idx === 0 ? sectionTitle : undefined,
                isSidebar: options.isSidebar,
                render: (showHeading) =>
                  wrapLayoutUnit(
                    sectionTitle,
                    showHeading,
                    <div
                      className="cv-entry"
                      style={{
                        paddingLeft: '8pt',
                        fontSize: `${scale.entrySubtitlePt}pt`,
                        lineHeight: scale.lineHeight,
                        color: textCol,
                      }}
                    >
                      <span className="font-bold">{cat.category}: </span>
                      <span>{(cat.skills || []).join(', ')}</span>
                    </div>,
                    options.inverted,
                    options.isSidebar
                  ),
              });
            });
          } else if (template.skillsLayout === 'grid-2col' && !options.isSidebar && !isAsymmetric) {
            const skillPairs = chunkPairs(visibleSkills);
            skillPairs.forEach((pair, pIdx) => {
              list.push({
                id: `skill-grid-${pIdx}`,
                spacing: pIdx === 0 ? 'section' : 'skill',
                sectionHeading: pIdx === 0 ? sectionTitle : undefined,
                isSidebar: options.isSidebar,
                render: (showHeading) =>
                  wrapLayoutUnit(
                    sectionTitle,
                    showHeading,
                    <div className="cv-entry flex justify-between items-start" style={{ color: textCol }}>
                      {pair.map((cat) => (
                        <div key={cat.id} style={{ width: '48%', fontSize: `${scale.entrySubtitlePt}pt`, lineHeight: scale.lineHeight }}>
                          <span className="font-bold">{cat.category}: </span>
                          <span>{(cat.skills || []).join(', ')}</span>
                        </div>
                      ))}
                    </div>,
                    options.inverted,
                    options.isSidebar
                  ),
              });
            });
          } else {
            visibleSkills.forEach((cat, idx) => {
              list.push({
                id: `skill-${cat.id}`,
                spacing: idx === 0 ? 'section' : 'skill',
                sectionHeading: idx === 0 ? sectionTitle : undefined,
                isSidebar: options.isSidebar,
                render: (showHeading) =>
                  wrapLayoutUnit(
                    sectionTitle,
                    showHeading,
                    options.isSidebar ? (
                      <div className="cv-entry" style={{ fontSize: `${scale.metaPt}pt`, lineHeight: 1.35, color: textCol }}>
                        <div className="font-bold">{cat.category}</div>
                        <div style={{ color: subCol }}>{(cat.skills || []).join(', ')}</div>
                      </div>
                    ) : (
                      <div
                        className="cv-entry flex items-baseline"
                        style={{ fontSize: `${scale.entrySubtitlePt}pt`, lineHeight: scale.lineHeight, color: textCol }}
                      >
                        <span
                          className="font-bold shrink-0"
                          style={{
                            width: isAsymmetric ? '130pt' : '168pt',
                            paddingRight: '6pt',
                          }}
                        >
                          {cat.category}:
                        </span>
                        <span style={{ flex: 1 }}>{(cat.skills || []).join(', ')}</span>
                      </div>
                    ),
                    options.inverted,
                    options.isSidebar
                  ),
              });
            });
          }
          break;
        }

        case 'achievements': {
          (effectiveResume.achievements || []).forEach((ach, idx) => {
            list.push({
              id: `ach-${ach.id}`,
              spacing: idx === 0 ? 'section' : 'entry',
              sectionHeading: idx === 0 ? sectionTitle : undefined,
              isSidebar: options.isSidebar,
              render: (showHeading) =>
                wrapLayoutUnit(
                  sectionTitle,
                  showHeading,
                  isTwoColumnPro ? (
                    <div
                      className="cv-entry flex items-start"
                      style={{
                        gap: '7pt',
                        color: textCol,
                        borderTop: idx > 0 ? '0.75pt dotted #cbd5e1' : 'none',
                        paddingTop: idx > 0 ? '4pt' : 0,
                      }}
                    >
                      <div style={{ width: '15pt', display: 'flex', justifyContent: 'center', flexShrink: 0 }}>
                        {renderTwoColAchievementIcon(ach.icon, custom.accentColor)}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div className="font-bold" style={{ fontSize: `${scale.entryTitlePt - 0.25}pt`, color: '#111827', lineHeight: 1.25 }}>
                          {ach.title}
                        </div>
                        {(ach.issuer || ach.description || ach.date) && (
                          <div style={{ fontSize: `${scale.bodyPt - 0.25}pt`, color: '#4b5563', lineHeight: 1.32, marginTop: '1pt' }}>
                            {ach.issuer && <span>{ach.issuer}</span>}
                            {ach.issuer && ach.date && <span> ({ach.date})</span>}
                            {!ach.issuer && ach.date && <span>{ach.date}</span>}
                            {(ach.issuer || ach.date) && ach.description && <span> — </span>}
                            {ach.description && <span>{ach.description}</span>}
                          </div>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="cv-entry" style={{ color: textCol }}>
                      <div
                        className="flex justify-between items-baseline font-bold"
                        style={{ fontSize: `${scale.entryTitlePt}pt`, marginBottom: '1pt' }}
                      >
                        <span style={{ marginRight: '8pt' }}>{ach.title}</span>
                        <span className="font-normal shrink-0" style={{ fontSize: `${scale.entrySubtitlePt}pt` }}>
                          {ach.date}
                        </span>
                      </div>
                      {(ach.issuer || ach.description) && (
                        <div style={{ fontSize: `${scale.bodyPt}pt`, color: subCol, lineHeight: 1.32 }}>
                          {ach.issuer && <span>{ach.issuer}</span>}
                          {ach.issuer && ach.description && <span> — </span>}
                          {ach.description && <span>{ach.description}</span>}
                        </div>
                      )}
                    </div>
                  ),
                  options.inverted,
                  options.isSidebar
                ),
            });
          });
          break;
        }

        case 'leadership': {
          (effectiveResume.leadership || []).forEach((lead, idx) => {
            const bullets = cleanHighlights(lead.highlights);
            const firstBullet = bullets[0];
            const remainingBullets = bullets.slice(1);

            list.push({
              id: `lead-head-${lead.id}`,
              spacing: idx === 0 ? 'section' : 'entry',
              sectionHeading: idx === 0 ? sectionTitle : undefined,
              isSidebar: options.isSidebar,
              render: (showHeading) =>
                wrapLayoutUnit(
                  sectionTitle,
                  showHeading,
                  isJakes ? (
                    <div className="cv-entry" style={{ color: textCol, paddingLeft: '8pt' }}>
                      <div
                        className="flex justify-between items-baseline font-bold"
                        style={{ fontSize: `${scale.entryTitlePt}pt`, marginBottom: '0.5pt' }}
                      >
                        <span style={{ marginRight: '8pt' }}>{lead.organization}</span>
                        <span className="font-bold shrink-0" style={{ fontSize: `${scale.entrySubtitlePt}pt` }}>
                          {lead.startDate} – {lead.current ? 'Present' : lead.endDate}
                        </span>
                      </div>
                      {(lead.role || lead.location) && (
                        <div
                          className="flex justify-between items-baseline italic"
                          style={{ fontSize: `${scale.entrySubtitlePt}pt`, color: subCol, marginBottom: '1pt' }}
                        >
                          <span style={{ marginRight: '8pt' }}>{lead.role}</span>
                          {lead.location && (
                            <span className="italic shrink-0" style={{ fontSize: `${scale.metaPt}pt`, color: metaCol }}>
                              {lead.location}
                            </span>
                          )}
                        </div>
                      )}
                      {firstBullet && (
                        <div className="flex items-start" style={{ marginTop: '2pt', paddingLeft: '10pt' }}>
                          <span style={{ width: '10pt', fontSize: `${scale.entrySubtitlePt}pt`, flexShrink: 0 }}>
                            {bulletChar}
                          </span>
                          <span style={{ fontSize: `${scale.bodyPt}pt`, lineHeight: scale.lineHeight, flex: 1 }}>
                            {firstBullet}
                          </span>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="cv-entry" style={{ color: textCol }}>
                      <div
                        className="flex justify-between items-baseline font-bold"
                        style={{ fontSize: `${scale.entryTitlePt}pt`, marginBottom: '1pt' }}
                      >
                        <span style={{ marginRight: '8pt' }}>
                          {lead.role}, {lead.organization}
                        </span>
                        <span className="font-normal shrink-0" style={{ fontSize: `${scale.entrySubtitlePt}pt` }}>
                          {lead.startDate} – {lead.current ? 'Present' : lead.endDate}
                        </span>
                      </div>
                      {lead.location && (
                        <div className="italic" style={{ fontSize: `${scale.metaPt}pt`, color: metaCol, marginBottom: '1pt' }}>
                          {lead.location}
                        </div>
                      )}
                      {firstBullet && (
                        <div className="flex items-start" style={{ marginTop: '2pt', paddingLeft: '8pt' }}>
                          <span style={{ width: '10pt', fontSize: `${scale.entrySubtitlePt}pt`, flexShrink: 0 }}>
                            {bulletChar}
                          </span>
                          <span style={{ fontSize: `${scale.bodyPt}pt`, lineHeight: scale.lineHeight, flex: 1 }}>
                            {firstBullet}
                          </span>
                        </div>
                      )}
                    </div>
                  ),
                  options.inverted,
                  options.isSidebar
                ),
            });

            remainingBullets.forEach((hl, bIdx) => {
              list.push({
                id: `lead-bullet-${lead.id}-${bIdx}`,
                spacing: 'bullet',
                isSidebar: options.isSidebar,
                render: () =>
                  wrapLayoutUnit(
                    undefined,
                    false,
                    <div
                      className="cv-entry flex items-start"
                      style={{ paddingLeft: isJakes ? '18pt' : '8pt', color: textCol }}
                    >
                      <span style={{ width: '10pt', fontSize: `${scale.entrySubtitlePt}pt`, flexShrink: 0 }}>
                        {bulletChar}
                      </span>
                      <span style={{ fontSize: `${scale.bodyPt}pt`, lineHeight: scale.lineHeight, flex: 1 }}>
                        {hl}
                      </span>
                    </div>,
                    options.inverted,
                    options.isSidebar
                  ),
              });
            });
          });
          break;
        }

        case 'volunteer': {
          (effectiveResume.volunteer || []).forEach((vol, idx) => {
            const bullets = cleanHighlights(vol.highlights);
            const firstBullet = bullets[0];
            const remainingBullets = bullets.slice(1);

            list.push({
              id: `vol-head-${vol.id}`,
              spacing: idx === 0 ? 'section' : 'entry',
              sectionHeading: idx === 0 ? sectionTitle : undefined,
              isSidebar: options.isSidebar,
              render: (showHeading) =>
                wrapLayoutUnit(
                  sectionTitle,
                  showHeading,
                  <div className="cv-entry" style={{ color: textCol }}>
                    <div
                      className="flex justify-between items-baseline font-bold"
                      style={{ fontSize: `${scale.entryTitlePt}pt`, marginBottom: '1pt' }}
                    >
                      <span style={{ marginRight: '8pt' }}>
                        {vol.role}, {vol.organization}
                      </span>
                      <span className="font-normal shrink-0" style={{ fontSize: `${scale.entrySubtitlePt}pt` }}>
                        {vol.startDate} – {vol.current ? 'Present' : vol.endDate}
                      </span>
                    </div>
                    {firstBullet && (
                      <div className="flex items-start" style={{ marginTop: '2pt', paddingLeft: '8pt' }}>
                        <span style={{ width: '10pt', fontSize: `${scale.entrySubtitlePt}pt`, flexShrink: 0 }}>
                          {bulletChar}
                        </span>
                        <span style={{ fontSize: `${scale.bodyPt}pt`, lineHeight: scale.lineHeight, flex: 1 }}>
                          {firstBullet}
                        </span>
                      </div>
                    )}
                  </div>,
                  options.inverted,
                  options.isSidebar
                ),
            });

            remainingBullets.forEach((hl, bIdx) => {
              list.push({
                id: `vol-bullet-${vol.id}-${bIdx}`,
                spacing: 'bullet',
                isSidebar: options.isSidebar,
                render: () =>
                  wrapLayoutUnit(
                    undefined,
                    false,
                    <div className="cv-entry flex items-start" style={{ paddingLeft: '8pt', color: textCol }}>
                      <span style={{ width: '10pt', fontSize: `${scale.entrySubtitlePt}pt`, flexShrink: 0 }}>
                        {bulletChar}
                      </span>
                      <span style={{ fontSize: `${scale.bodyPt}pt`, lineHeight: scale.lineHeight, flex: 1 }}>
                        {hl}
                      </span>
                    </div>,
                    options.inverted,
                    options.isSidebar
                  ),
              });
            });
          });
          break;
        }

        case 'memberships': {
          (effectiveResume.memberships || []).forEach((mem, idx) => {
            list.push({
              id: `mem-${mem.id}`,
              spacing: idx === 0 ? 'section' : 'compact',
              sectionHeading: idx === 0 ? sectionTitle : undefined,
              isSidebar: options.isSidebar,
              render: (showHeading) =>
                wrapLayoutUnit(
                  sectionTitle,
                  showHeading,
                  options.isSidebar ? (
                    <div className="cv-entry" style={{ fontSize: `${scale.metaPt}pt`, color: textCol }}>
                      <div className="font-bold">{mem.organization}</div>
                      <div style={{ color: subCol }}>
                        {mem.membershipType || ''}
                        {mem.membershipId ? ` (${mem.membershipId})` : ''}
                      </div>
                      <div style={{ color: metaCol, fontSize: `${scale.metaPt - 0.5}pt` }}>
                        {mem.startDate}
                        {mem.endDate ? ` – ${mem.endDate}` : mem.current ? ' – Present' : ''}
                      </div>
                    </div>
                  ) : (
                    <div
                      className="cv-entry flex justify-between items-baseline"
                      style={{ fontSize: `${scale.entrySubtitlePt}pt`, color: textCol }}
                    >
                      <span style={{ marginRight: '8pt', flex: 1 }}>
                        <strong>{mem.organization}</strong>
                        {mem.membershipType ? ` — ${mem.membershipType}` : ''}
                        {mem.membershipId ? ` (ID: ${mem.membershipId})` : ''}
                      </span>
                      <span className="font-normal shrink-0" style={{ fontSize: `${scale.entrySubtitlePt}pt` }}>
                        {mem.startDate}
                        {mem.endDate ? ` – ${mem.endDate}` : mem.current ? ' – Present' : ''}
                      </span>
                    </div>
                  ),
                  options.inverted,
                  options.isSidebar
                ),
            });
          });
          break;
        }

        case 'certifications': {
          (effectiveResume.certifications || []).forEach((c, idx) => {
            list.push({
              id: `cert-${c.id}`,
              spacing: idx === 0 ? 'section' : 'compact',
              sectionHeading: idx === 0 ? sectionTitle : undefined,
              isSidebar: options.isSidebar,
              render: (showHeading) =>
                wrapLayoutUnit(
                  sectionTitle,
                  showHeading,
                  options.isSidebar ? (
                    <div className="cv-entry" style={{ fontSize: `${scale.metaPt}pt`, color: textCol }}>
                      <div className="font-bold">{c.name}</div>
                      <div style={{ color: subCol }}>
                        {c.issuer}
                        {c.issueDate ? ` · ${c.issueDate}` : ''}
                      </div>
                    </div>
                  ) : (
                    <div
                      className="cv-entry flex justify-between items-baseline"
                      style={{ fontSize: `${scale.entrySubtitlePt}pt`, color: textCol }}
                    >
                      <span style={{ marginRight: '8pt', flex: 1 }}>
                        <strong>{c.name}</strong> — {c.issuer}
                        {c.credentialId ? ` (ID: ${c.credentialId})` : ''}
                      </span>
                      <span className="font-normal shrink-0" style={{ fontSize: `${scale.entrySubtitlePt}pt` }}>
                        {c.issueDate}
                        {c.expirationDate ? ` – ${c.expirationDate}` : ''}
                      </span>
                    </div>
                  ),
                  options.inverted,
                  options.isSidebar
                ),
            });
          });
          break;
        }

        case 'additional': {
          if (isSoftwareDev) {
            const subsections = getSoftwareDevAdditionalSubsections(effectiveResume);
            let emittedAny = false;

            const nextSpacing = (): SpacingKind => {
              if (!emittedAny) {
                emittedAny = true;
                return 'section';
              }
              return 'entry';
            };

            const nextSectionHeading = () =>
              !emittedAny ? sectionTitle : undefined;

            subsections.forEach((sub) => {
              switch (sub.key) {
                case 'coursework': {
                  const rows = chunkRows(sub.items, 4);
                  rows.forEach((row, rIdx) => {
                    const headingProp = nextSectionHeading();
                    const spacingProp = nextSpacing();
                    list.push({
                      id: `sw-add-cw-${rIdx}`,
                      spacing: rIdx === 0 ? spacingProp : 'bullet',
                      sectionHeading: headingProp,
                      isSidebar: options.isSidebar,
                      render: (showHeading) =>
                        wrapLayoutUnit(
                          sectionTitle,
                          showHeading,
                          <div className="cv-entry" style={{ color: textCol }}>
                            {rIdx === 0 && (
                              <div
                                className="font-bold"
                                style={{
                                  fontSize: `${scale.entrySubtitlePt}pt`,
                                  color: textCol,
                                  marginBottom: '2pt',
                                }}
                              >
                                {sub.title}
                              </div>
                            )}
                            <div
                              className="grid grid-cols-4 gap-x-2"
                              style={{
                                paddingLeft: '6pt',
                                fontSize: `${scale.bodyPt}pt`,
                                lineHeight: scale.lineHeight,
                                color: textCol,
                              }}
                            >
                              {row.map((course, cIdx) => (
                                <div key={cIdx} className="flex items-start min-w-0">
                                  <span style={{ width: '8pt', flexShrink: 0 }}>{bulletChar}</span>
                                  <span className="min-w-0 break-words">{course}</span>
                                </div>
                              ))}
                            </div>
                          </div>,
                          options.inverted,
                          options.isSidebar
                        ),
                    });
                  });
                  break;
                }

                case 'leadership': {
                  sub.items.forEach((item, lIdx) => {
                    const bullets = cleanHighlights(item.highlights);
                    const firstBullet = bullets[0];
                    const remainingBullets = bullets.slice(1);
                    const headingProp = nextSectionHeading();
                    const spacingProp = nextSpacing();

                    list.push({
                      id: `sw-add-lead-${item.id}`,
                      spacing: lIdx === 0 ? spacingProp : 'compact',
                      sectionHeading: headingProp,
                      isSidebar: options.isSidebar,
                      render: (showHeading) =>
                        wrapLayoutUnit(
                          sectionTitle,
                          showHeading,
                          <div className="cv-entry" style={{ color: textCol }}>
                            {lIdx === 0 && (
                              <div
                                className="font-bold"
                                style={{
                                  fontSize: `${scale.entrySubtitlePt}pt`,
                                  color: textCol,
                                  marginBottom: '2pt',
                                }}
                              >
                                {sub.title}
                              </div>
                            )}
                            <div style={{ paddingLeft: '6pt' }}>
                              <div
                                className="flex justify-between items-baseline font-bold"
                                style={{ fontSize: `${scale.entryTitlePt}pt`, marginBottom: '0.5pt' }}
                              >
                                <span style={{ marginRight: '8pt' }}>{item.organization}</span>
                                {(item.startDate || item.endDate || item.current) && (
                                  <span className="font-normal shrink-0" style={{ fontSize: `${scale.entrySubtitlePt}pt` }}>
                                    {item.startDate} – {item.current ? 'Present' : item.endDate}
                                  </span>
                                )}
                              </div>
                              <div
                                className="flex justify-between items-baseline italic"
                                style={{ fontSize: `${scale.entrySubtitlePt}pt`, color: subCol, marginBottom: '1pt' }}
                              >
                                <span style={{ marginRight: '8pt' }}>{item.role}</span>
                                {item.location && (
                                  <span className="not-italic shrink-0" style={{ fontSize: `${scale.metaPt}pt`, color: metaCol }}>
                                    {item.location}
                                  </span>
                                )}
                              </div>
                              {firstBullet && (
                                <div className="flex items-start" style={{ marginTop: '1.5pt', paddingLeft: '6pt' }}>
                                  <span style={{ width: '9pt', fontSize: `${scale.entrySubtitlePt}pt`, flexShrink: 0 }}>
                                    {bulletChar}
                                  </span>
                                  <span style={{ fontSize: `${scale.bodyPt}pt`, lineHeight: scale.lineHeight, flex: 1 }}>
                                    {firstBullet}
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>,
                          options.inverted,
                          options.isSidebar
                        ),
                    });

                    remainingBullets.forEach((hl, bIdx) => {
                      list.push({
                        id: `sw-add-lead-b-${item.id}-${bIdx}`,
                        spacing: 'bullet',
                        isSidebar: options.isSidebar,
                        render: () =>
                          wrapLayoutUnit(
                            undefined,
                            false,
                            <div className="cv-entry flex items-start" style={{ paddingLeft: '12pt', color: textCol }}>
                              <span style={{ width: '9pt', fontSize: `${scale.entrySubtitlePt}pt`, flexShrink: 0 }}>
                                {bulletChar}
                              </span>
                              <span style={{ fontSize: `${scale.bodyPt}pt`, lineHeight: scale.lineHeight, flex: 1 }}>
                                {hl}
                              </span>
                            </div>,
                            options.inverted,
                            options.isSidebar
                          ),
                      });
                    });
                  });
                  break;
                }

                case 'programming-languages':
                case 'developer-tools':
                case 'technologies-frameworks':
                case 'other-skills': {
                  const headingProp = nextSectionHeading();
                  const isFirst = !emittedAny;
                  if (!emittedAny) emittedAny = true;
                  const unitKey =
                    sub.key === 'other-skills' ? `sw-add-skill-${sub.id}` : `sw-add-${sub.key}`;
                  list.push({
                    id: unitKey,
                    spacing: isFirst ? 'section' : 'skill',
                    sectionHeading: headingProp,
                    isSidebar: options.isSidebar,
                    render: (showHeading) =>
                      wrapLayoutUnit(
                        sectionTitle,
                        showHeading,
                        <div
                          className="cv-entry"
                          style={{
                            fontSize: `${scale.bodyPt}pt`,
                            lineHeight: scale.lineHeight,
                            color: textCol,
                          }}
                        >
                          <span className="font-bold">{sub.title}: </span>
                          <span>{sub.items.join(', ')}</span>
                        </div>,
                        options.inverted,
                        options.isSidebar
                      ),
                  });
                  break;
                }

                case 'certifications': {
                  sub.items.forEach((cert, cIdx) => {
                    const headingProp = nextSectionHeading();
                    const spacingProp = nextSpacing();
                    const cleanCertUrl = cert.link
                      ? cert.link.startsWith('http')
                        ? cert.link
                        : `https://${cert.link}`
                      : null;
                    list.push({
                      id: `sw-add-cert-${cert.id}`,
                      spacing: cIdx === 0 ? spacingProp : 'compact',
                      sectionHeading: headingProp,
                      isSidebar: options.isSidebar,
                      render: (showHeading) =>
                        wrapLayoutUnit(
                          sectionTitle,
                          showHeading,
                          <div className="cv-entry" style={{ color: textCol }}>
                            {cIdx === 0 && (
                              <div
                                className="font-bold"
                                style={{
                                  fontSize: `${scale.entrySubtitlePt}pt`,
                                  color: textCol,
                                  marginBottom: '2pt',
                                }}
                              >
                                {sub.title}
                              </div>
                            )}
                            <div
                              className="flex justify-between items-baseline"
                              style={{ paddingLeft: '6pt', fontSize: `${scale.bodyPt}pt`, lineHeight: scale.lineHeight }}
                            >
                              <div style={{ marginRight: '8pt' }}>
                                <span className="font-bold">{cert.name}</span>
                                {cert.issuer && <span> — {cert.issuer}</span>}
                                {cert.credentialId && (
                                  <span style={{ color: metaCol }}> (ID: {cert.credentialId})</span>
                                )}
                                {cleanCertUrl && (
                                  <span style={{ marginLeft: '4pt' }}>
                                    <a
                                      href={cleanCertUrl}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="hover:underline"
                                      style={{ color: custom.accentColor, textDecoration: 'underline' }}
                                    >
                                      [Verify]
                                    </a>
                                  </span>
                                )}
                              </div>
                              {cert.issueDate && (
                                <span className="shrink-0" style={{ fontSize: `${scale.metaPt}pt`, color: metaCol }}>
                                  {cert.issueDate}
                                  {cert.expirationDate ? ` – ${cert.expirationDate}` : ''}
                                </span>
                              )}
                            </div>
                          </div>,
                          options.inverted,
                          options.isSidebar
                        ),
                    });
                  });
                  break;
                }

                case 'achievements': {
                  sub.items.forEach((ach, aIdx) => {
                    const headingProp = nextSectionHeading();
                    const spacingProp = nextSpacing();
                    list.push({
                      id: `sw-add-ach-${ach.id}`,
                      spacing: aIdx === 0 ? spacingProp : 'compact',
                      sectionHeading: headingProp,
                      isSidebar: options.isSidebar,
                      render: (showHeading) =>
                        wrapLayoutUnit(
                          sectionTitle,
                          showHeading,
                          <div className="cv-entry" style={{ color: textCol }}>
                            {aIdx === 0 && (
                              <div
                                className="font-bold"
                                style={{
                                  fontSize: `${scale.entrySubtitlePt}pt`,
                                  color: textCol,
                                  marginBottom: '2pt',
                                }}
                              >
                                {sub.title}
                              </div>
                            )}
                            <div
                              className="flex justify-between items-baseline"
                              style={{ paddingLeft: '6pt', fontSize: `${scale.bodyPt}pt`, lineHeight: scale.lineHeight }}
                            >
                              <div style={{ marginRight: '8pt' }}>
                                <span className="font-bold">{ach.title}</span>
                                {ach.issuer && <span> — {ach.issuer}</span>}
                                {ach.description && (
                                  <div style={{ color: subCol, fontSize: `${scale.metaPt}pt` }}>
                                    {ach.description}
                                  </div>
                                )}
                              </div>
                              {ach.date && (
                                <span className="shrink-0" style={{ fontSize: `${scale.metaPt}pt`, color: metaCol }}>
                                  {ach.date}
                                </span>
                              )}
                            </div>
                          </div>,
                          options.inverted,
                          options.isSidebar
                        ),
                    });
                  });
                  break;
                }

                case 'custom-sections': {
                  sub.items.forEach((bullet, bIdx) => {
                    const headingProp = nextSectionHeading();
                    const spacingProp = bIdx === 0 ? nextSpacing() : ('bullet' as SpacingKind);
                    list.push({
                      id: `sw-add-cs-${sub.id}-${bIdx}`,
                      spacing: spacingProp,
                      sectionHeading: headingProp,
                      isSidebar: options.isSidebar,
                      render: (showHeading) =>
                        wrapLayoutUnit(
                          sectionTitle,
                          showHeading,
                          <div className="cv-entry" style={{ color: textCol }}>
                            {bIdx === 0 && (
                              <div
                                className="font-bold"
                                style={{
                                  fontSize: `${scale.entrySubtitlePt}pt`,
                                  color: textCol,
                                  marginBottom: '2pt',
                                }}
                              >
                                {sub.title}
                              </div>
                            )}
                            <div className="flex items-start" style={{ paddingLeft: '6pt' }}>
                              <span style={{ width: '9pt', fontSize: `${scale.entrySubtitlePt}pt`, flexShrink: 0 }}>
                                {bulletChar}
                              </span>
                              <span style={{ fontSize: `${scale.bodyPt}pt`, lineHeight: scale.lineHeight, flex: 1 }}>
                                {bullet}
                              </span>
                            </div>
                          </div>,
                          options.inverted,
                          options.isSidebar
                        ),
                    });
                  });
                  break;
                }
              }
            });
            break;
          }

          const langs = effectiveResume.languages || [];
          const hasLang = langs.length > 0;
          const interestsText = (effectiveResume.interests || '').trim();
          const hasInt = interestsText.length > 0;

          if (hasLang) {
            list.push({
              id: 'additional-lang',
              spacing: 'section',
              sectionHeading: sectionTitle,
              isSidebar: options.isSidebar,
              render: (showHeading) =>
                wrapLayoutUnit(
                  sectionTitle,
                  showHeading,
                  options.isSidebar ? (
                    <div className="cv-entry" style={{ fontSize: `${scale.metaPt}pt`, color: textCol }}>
                      <div className="font-bold">Languages</div>
                      <div style={{ color: subCol }}>
                        {langs.map((l) => `${l.language} (${l.proficiency})`).join(', ')}
                      </div>
                    </div>
                  ) : (
                    <div className="cv-entry flex items-baseline" style={{ fontSize: `${scale.entrySubtitlePt}pt`, color: textCol }}>
                      <span className="font-bold shrink-0" style={{ width: '95pt' }}>
                        Languages:
                      </span>
                      <span style={{ flex: 1 }}>
                        {langs.map((l) => `${l.language} (${l.proficiency})`).join(', ')}
                      </span>
                    </div>
                  ),
                  options.inverted,
                  options.isSidebar
                ),
            });
          }

          if (hasInt) {
            list.push({
              id: 'additional-interests',
              spacing: hasLang ? 'compact' : 'section',
              sectionHeading: !hasLang ? sectionTitle : undefined,
              isSidebar: options.isSidebar,
              render: (showHeading) =>
                wrapLayoutUnit(
                  sectionTitle,
                  showHeading,
                  options.isSidebar ? (
                    <div className="cv-entry" style={{ fontSize: `${scale.metaPt}pt`, color: textCol }}>
                      <div className="font-bold">Interests</div>
                      <div style={{ color: subCol }}>{interestsText}</div>
                    </div>
                  ) : (
                    <div className="cv-entry flex items-baseline" style={{ fontSize: `${scale.entrySubtitlePt}pt`, color: textCol }}>
                      <span className="font-bold shrink-0" style={{ width: '95pt' }}>
                        Interests:
                      </span>
                      <span style={{ flex: 1 }}>{interestsText}</span>
                    </div>
                  ),
                  options.inverted,
                  options.isSidebar
                ),
            });
          }
          break;
        }

        case 'languages': {
          const langs = (effectiveResume.languages || []).filter((l) => l.language?.trim());
          langs.forEach((lang, idx) => {
            list.push({
              id: `lang-row-${lang.id}`,
              spacing: idx === 0 ? 'section' : 'compact',
              sectionHeading: idx === 0 ? sectionTitle : undefined,
              isSidebar: options.isSidebar,
              render: (showHeading) =>
                wrapLayoutUnit(
                  sectionTitle,
                  showHeading,
                  isTwoColumnPro ? (
                    <div
                      className="cv-entry"
                      style={{
                        borderTop: idx > 0 ? '0.75pt dotted #cbd5e1' : 'none',
                        paddingTop: idx > 0 ? '3.5pt' : 0,
                      }}
                    >
                      <div className="flex items-center justify-between" style={{ gap: '6pt' }}>
                        <span className="font-bold" style={{ fontSize: `${scale.entrySubtitlePt}pt`, color: '#111827' }}>
                          {lang.language}
                        </span>
                        {(() => {
                          const score = getLanguageDotScore(lang.proficiency);
                          if (score !== null) {
                            return renderLanguageDots(score, custom.accentColor, lang.id);
                          }
                          return lang.proficiency ? (
                            <span style={{ fontSize: `${scale.metaPt - 0.5}pt`, color: '#4b5563' }}>
                              {lang.proficiency}
                            </span>
                          ) : null;
                        })()}
                      </div>
                      {lang.comment && (
                        <div className="italic" style={{ fontSize: `${scale.metaPt - 0.5}pt`, color: '#4b5563', marginTop: '0.5pt' }}>
                          {lang.comment}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div
                      className="cv-entry flex items-baseline"
                      style={{ fontSize: `${scale.entrySubtitlePt}pt`, color: textCol, lineHeight: scale.lineHeight }}
                    >
                      <span className="font-bold shrink-0" style={{ width: '112pt', paddingRight: '6pt' }}>
                        {lang.language}
                      </span>
                      <span className="font-medium shrink-0" style={{ width: '120pt', color: custom.accentColor, paddingRight: '6pt' }}>
                        {lang.proficiency}
                      </span>
                      {lang.comment && (
                        <span className="italic" style={{ flex: 1, color: '#475569', fontSize: `${scale.metaPt}pt` }}>
                          {lang.comment}
                        </span>
                      )}
                    </div>
                  ),
                  options.inverted,
                  options.isSidebar
                ),
            });
          });
          break;
        }

        case 'skill-matrix': {
          const matrix = (effectiveResume.skillMatrix || []).filter((m) => m.skill?.trim());
          matrix.forEach((row, idx) => {
            list.push({
              id: `skill-matrix-row-${row.id}`,
              spacing: idx === 0 ? 'section' : 'skill',
              sectionHeading: idx === 0 ? sectionTitle : undefined,
              isSidebar: options.isSidebar,
              render: (showHeading) =>
                wrapLayoutUnit(
                  sectionTitle,
                  showHeading,
                  <div
                    className="cv-entry flex items-center justify-between"
                    style={{
                      fontSize: `${scale.entrySubtitlePt}pt`,
                      color: textCol,
                      lineHeight: scale.lineHeight,
                      gap: '8pt',
                    }}
                  >
                    <div className="flex items-baseline min-w-0" style={{ flex: 1 }}>
                      {row.category?.trim() && (
                        <span
                          className="font-semibold shrink-0"
                          style={{ width: '108pt', paddingRight: '6pt', color: '#475569', fontSize: `${scale.metaPt}pt` }}
                        >
                          {row.category}:
                        </span>
                      )}
                      <span className="font-semibold">{row.skill}</span>
                    </div>
                    <div className="flex items-center shrink-0" style={{ gap: '6pt' }}>
                      <span className="inline-flex items-center" style={{ gap: '2.5pt' }}>
                        {[1, 2, 3, 4, 5].map((step) => {
                          const filled = row.level !== null && row.level !== undefined && step <= row.level;
                          return (
                            <span
                              key={step}
                              style={{
                                display: 'inline-block',
                                width: '7pt',
                                height: '7pt',
                                border: `0.9pt solid ${custom.accentColor}`,
                                backgroundColor: filled ? custom.accentColor : 'transparent',
                              }}
                            />
                          );
                        })}
                      </span>
                      <span style={{ width: '78pt', fontSize: `${scale.metaPt - 0.25}pt`, color: '#334155' }}>
                        {getSkillMatrixLevelLabel(row.level)}
                      </span>
                      {(row.yearsOfExperience || row.comment) && (
                        <span
                          className="italic truncate"
                          style={{ width: '105pt', fontSize: `${scale.metaPt - 0.5}pt`, color: '#475569', textAlign: 'right' }}
                        >
                          {[row.yearsOfExperience, row.comment].filter(Boolean).join(' · ')}
                        </span>
                      )}
                    </div>
                  </div>,
                  options.inverted,
                  options.isSidebar
                ),
            });
          });
          if (matrix.length > 0) {
            list.push({
              id: 'skill-matrix-legend',
              spacing: 'compact',
              isSidebar: options.isSidebar,
              render: () => (
                <div
                  style={{
                    marginTop: '2pt',
                    paddingTop: '3pt',
                    borderTop: '0.5pt solid #cbd5e1',
                    fontSize: `${scale.metaPt - 0.75}pt`,
                    color: '#475569',
                  }}
                >
                  <span className="font-semibold" style={{ color: custom.accentColor }}>
                    Legend:{' '}
                  </span>
                  {SKILL_MATRIX_LEGEND.map((item, idx) => (
                    <span key={item.level}>
                      {idx > 0 ? ' · ' : ''}
                      <strong style={{ color: textCol }}>{item.level}</strong> = {item.label}
                    </span>
                  ))}
                </div>
              ),
            });
          }
          break;
        }

        case 'interests': {
          const eff = getEffectiveInterests(effectiveResume);
          if (eff.items.length > 0) {
            eff.items.forEach((item, idx) => {
              list.push({
                id: `interest-item-${item.id}`,
                spacing: idx === 0 ? 'section' : 'compact',
                sectionHeading: idx === 0 ? sectionTitle : undefined,
                isSidebar: options.isSidebar,
                render: (showHeading) =>
                  wrapLayoutUnit(
                    sectionTitle,
                    showHeading,
                    <div
                      className="cv-entry flex items-baseline"
                      style={{ fontSize: `${scale.entrySubtitlePt}pt`, color: textCol, lineHeight: scale.lineHeight }}
                    >
                      <span className="font-bold shrink-0" style={{ width: '132pt', paddingRight: '6pt' }}>
                        {item.name}
                      </span>
                      {item.description && (
                        <span style={{ flex: 1, color: subCol }}>{item.description}</span>
                      )}
                    </div>,
                    options.inverted,
                    options.isSidebar
                  ),
              });
            });
          } else if (eff.text) {
            list.push({
              id: 'interest-text-only',
              spacing: 'section',
              sectionHeading: sectionTitle,
              isSidebar: options.isSidebar,
              render: (showHeading) =>
                wrapLayoutUnit(
                  sectionTitle,
                  showHeading,
                  <div style={{ fontSize: `${scale.entrySubtitlePt}pt`, color: textCol, lineHeight: scale.lineHeight }}>
                    {eff.text}
                  </div>,
                  options.inverted,
                  options.isSidebar
                ),
            });
          }
          break;
        }

        case 'custom-sections': {
          const customs = (effectiveResume.customSections || []).filter(
            (cs) => cs.title?.trim() && cs.bullets?.some((b) => b.trim())
          );
          customs.forEach((cs) => {
            const cleaned = cleanHighlights(cs.bullets);
            cleaned.forEach((bullet, bIdx) => {
              list.push({
                id: `custom-${cs.id}-b-${bIdx}`,
                spacing: bIdx === 0 ? 'section' : 'bullet',
                sectionHeading: bIdx === 0 ? cs.title.trim() : undefined,
                isSidebar: options.isSidebar,
                render: (showHeading) =>
                  wrapLayoutUnit(
                    cs.title.trim(),
                    showHeading,
                    <div
                      className="cv-entry flex items-start"
                      style={{ paddingLeft: '8pt', color: textCol }}
                    >
                      <span style={{ width: '10pt', fontSize: `${scale.entrySubtitlePt}pt`, flexShrink: 0 }}>
                        {bulletChar}
                      </span>
                      <span style={{ fontSize: `${scale.bodyPt}pt`, lineHeight: scale.lineHeight, flex: 1 }}>
                        {bullet}
                      </span>
                    </div>,
                    options.inverted,
                    options.isSidebar
                  ),
              });
            });
          });
          break;
        }

        case 'references': {
          if (effectiveResume.referencesDisplayMode === 'on-request') {
            list.push({
              id: 'ref-on-request',
              spacing: 'section',
              sectionHeading: sectionTitle,
              isSidebar: options.isSidebar,
              render: (showHeading) =>
                wrapLayoutUnit(
                  sectionTitle,
                  showHeading,
                  <div className="italic" style={{ fontSize: `${scale.entrySubtitlePt}pt`, color: subCol }}>
                    {isTwoColumnPro ? 'Referees available upon request.' : 'References available upon request.'}
                  </div>,
                  options.inverted,
                  options.isSidebar
                ),
            });
            break;
          }
          if (isTwoColumnPro || options.isSidebar) {
            (effectiveResume.references || []).forEach((ref, rIdx) => {
              list.push({
                id: `ref-single-${ref.id}`,
                spacing: rIdx === 0 ? 'section' : 'entry',
                sectionHeading: rIdx === 0 ? sectionTitle : undefined,
                isSidebar: options.isSidebar,
                render: (showHeading) =>
                  wrapLayoutUnit(
                    sectionTitle,
                    showHeading,
                    <div
                      className="cv-entry"
                      style={{
                        color: textCol,
                        borderTop: rIdx > 0 ? '0.75pt dotted #cbd5e1' : 'none',
                        paddingTop: rIdx > 0 ? '4pt' : 0,
                      }}
                    >
                      <div className="font-bold" style={{ fontSize: `${scale.entryTitlePt - 0.25}pt`, color: '#111827' }}>
                        {ref.fullName}
                      </div>
                      {(ref.jobTitle || ref.organization) && (
                        <div
                          className="font-semibold"
                          style={{ fontSize: `${scale.metaPt}pt`, color: custom.accentColor, marginTop: '0.5pt' }}
                        >
                          {ref.jobTitle}
                          {ref.jobTitle && ref.organization ? ', ' : ''}
                          {ref.organization}
                        </div>
                      )}
                      {ref.department && (
                        <div style={{ fontSize: `${scale.metaPt - 0.4}pt`, color: '#4b5563' }}>
                          {ref.department}
                        </div>
                      )}
                      {ref.relationship && (
                        <div className="italic" style={{ fontSize: `${scale.metaPt - 0.4}pt`, color: '#4b5563' }}>
                          {ref.relationship}
                        </div>
                      )}
                      {ref.email && (
                        <div className="flex items-center" style={{ fontSize: `${scale.metaPt - 0.25}pt`, color: '#1f2937', marginTop: '1.5pt' }}>
                          {renderTwoColMetaIcon('mail', custom.accentColor)}
                          <a href={`mailto:${ref.email}`} className="no-underline hover:underline break-all" style={{ color: '#1f2937' }}>
                            {ref.email}
                          </a>
                        </div>
                      )}
                      {ref.address && (
                        <div style={{ fontSize: `${scale.metaPt - 0.4}pt`, color: '#4b5563', whiteSpace: 'pre-line', marginTop: '1pt', lineHeight: 1.3 }}>
                          {ref.address}
                        </div>
                      )}
                      {ref.phone && (
                        <div style={{ fontSize: `${scale.metaPt - 0.4}pt`, color: '#4b5563', marginTop: '0.5pt' }}>
                          {ref.phone}
                        </div>
                      )}
                    </div>,
                    options.inverted,
                    options.isSidebar
                  ),
              });
            });
            break;
          }
          const refRows: ReferenceItem[][] = chunkPairs(effectiveResume.references || []);
          refRows.forEach((row, rowIdx) => {
            list.push({
              id: `ref-row-${rowIdx}`,
              spacing: rowIdx === 0 ? 'section' : 'reference',
              sectionHeading: rowIdx === 0 ? sectionTitle : undefined,
              isSidebar: options.isSidebar,
              render: (showHeading) =>
                wrapLayoutUnit(
                  sectionTitle,
                  showHeading,
                  <div className="cv-entry flex justify-between items-start" style={{ color: textCol }}>
                    {row.map((ref) => (
                      <div key={ref.id} style={{ width: '48%' }}>
                        <div className="font-bold" style={{ fontSize: `${scale.entryTitlePt}pt` }}>
                          {ref.fullName}
                        </div>
                        <div style={{ fontSize: `${scale.metaPt}pt`, color: subCol }}>{ref.jobTitle}</div>
                        {ref.department && (
                          <div style={{ fontSize: `${scale.metaPt - 0.5}pt`, color: metaCol }}>
                            {ref.department}
                          </div>
                        )}
                        <div style={{ fontSize: `${scale.metaPt - 0.5}pt`, color: metaCol }}>
                          {ref.organization}
                        </div>
                        {ref.email && (
                          <div style={{ fontSize: `${scale.metaPt - 0.5}pt`, color: metaCol }}>
                            Email: {ref.email}
                          </div>
                        )}
                        {ref.phone && (
                          <div style={{ fontSize: `${scale.metaPt - 0.5}pt`, color: metaCol }}>
                            Phone: {ref.phone}
                          </div>
                        )}
                        {ref.relationship && (
                          <div
                            className="italic"
                            style={{ fontSize: `${scale.metaPt - 0.5}pt`, color: metaCol, marginTop: '1pt' }}
                          >
                            Relationship: {ref.relationship}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>,
                  options.inverted,
                  options.isSidebar
                ),
            });
          });
          break;
        }
      }
    }

    return list;
  };

  // Compute units split for active template
  const { singleColumnUnits, sidebarUnits, mainUnits, fullWidthTopHeader } = useMemo(() => {
    const visibleKeys = getOrderedVisibleSections(effectiveResume, template);

    if (!hasTwoColumns) {
      const units: PreviewUnit[] = [
        {
          id: 'header',
          spacing: 'none',
          render: () => renderHeader(),
        },
        ...buildUnitsForSections(visibleKeys, { isSidebar: false, inverted: false }),
      ];
      return {
        singleColumnUnits: units,
        sidebarUnits: [] as PreviewUnit[],
        mainUnits: [] as PreviewUnit[],
        fullWidthTopHeader: null as PreviewUnit | null,
      };
    }

    const sidebarSet = new Set<ResumeSectionKey>(template.sidebarSections || []);
    const sidebarKeys = visibleKeys.filter((k) => sidebarSet.has(k));
    const mainKeys = visibleKeys.filter((k) => !sidebarSet.has(k));

    if (isMainLeftSidebarRight) {
      const topTwoColHeader: PreviewUnit = {
        id: 'top-two-column-pro-header',
        spacing: 'none',
        render: () => renderHeader(),
      };
      return {
        singleColumnUnits: [] as PreviewUnit[],
        sidebarUnits: buildUnitsForSections(sidebarKeys, {
          isSidebar: true,
          inverted: false,
        }),
        mainUnits: buildUnitsForSections(mainKeys, {
          isSidebar: false,
          inverted: false,
        }),
        fullWidthTopHeader: topTwoColHeader,
      };
    }

    // Sidebar identity + contact block (for dark sidebar, identity lives inside the colored left column;
    // for light sidebar, header sits cleanly at top spanning full width, and contact sits at top of sidebar)
    const sidebarIdentityUnit: PreviewUnit = isDarkSidebar
      ? {
          id: 'sidebar-identity',
          spacing: 'none',
          isSidebar: true,
          render: () => (
            <div style={{ color: '#ffffff', marginBottom: '6pt' }}>
              <h1
                className="font-bold uppercase"
                style={{
                  fontSize: `${Math.max(13, scale.namePt - 4)}pt`,
                  letterSpacing: '0.8pt',
                  lineHeight: 1.15,
                  marginBottom: '3pt',
                  color: '#ffffff',
                }}
              >
                {personalInfo.fullName || 'FULL NAME'}
              </h1>
              {personalInfo.jobTitle && (
                <div
                  className="font-medium"
                  style={{
                    fontSize: `${scale.metaPt + 0.5}pt`,
                    color: 'rgba(255,255,255,0.9)',
                    marginBottom: '6pt',
                  }}
                >
                  {personalInfo.jobTitle}
                </div>
              )}
              <div
                style={{
                  width: '28pt',
                  height: '1.5pt',
                  backgroundColor: 'rgba(255,255,255,0.55)',
                  marginBottom: '8pt',
                }}
              />
              {renderSectionHeading('CONTACT', { inverted: true, compact: true })}
              <div style={{ fontSize: `${scale.metaPt - 0.25}pt`, lineHeight: 1.4, color: 'rgba(255,255,255,0.92)' }}>
                {contactLinks.map((c, i) => (
                  <div key={i} className="break-all" style={{ marginBottom: '2pt' }}>
                    {c.url ? (
                      <a
                        href={c.url}
                        target={c.url.startsWith('http') ? '_blank' : undefined}
                        rel={c.url.startsWith('http') ? 'noopener noreferrer' : undefined}
                        className="no-underline hover:underline"
                        style={{ color: '#ffffff' }}
                      >
                        {c.label}
                      </a>
                    ) : (
                      c.label
                    )}
                  </div>
                ))}
                {locationString && <div style={{ marginTop: '2pt' }}>{locationString}</div>}
                {personalInfo.otherProfiles && (
                  <div className="italic" style={{ marginTop: '3pt', fontSize: `${scale.metaPt - 0.75}pt`, color: 'rgba(255,255,255,0.82)' }}>
                    {personalInfo.otherProfiles}
                  </div>
                )}
              </div>
            </div>
          ),
        }
      : {
          id: 'sidebar-contact',
          spacing: 'none',
          isSidebar: true,
          sectionHeading: 'CONTACT',
          render: () => (
            <div>
              {renderSectionHeading('CONTACT', { compact: true })}
              <div style={{ fontSize: `${scale.metaPt - 0.25}pt`, lineHeight: 1.4, color: custom.textColor }}>
                {contactLinks.map((c, i) => (
                  <div key={i} className="break-all" style={{ marginBottom: '2pt' }}>
                    {c.url ? (
                      <a
                        href={c.url}
                        target={c.url.startsWith('http') ? '_blank' : undefined}
                        rel={c.url.startsWith('http') ? 'noopener noreferrer' : undefined}
                        className="no-underline hover:underline"
                        style={{ color: custom.textColor }}
                      >
                        {c.label}
                      </a>
                    ) : (
                      c.label
                    )}
                  </div>
                ))}
                {locationString && <div style={{ marginTop: '2pt' }}>{locationString}</div>}
                {personalInfo.otherProfiles && (
                  <div className="italic" style={{ marginTop: '3pt', fontSize: `${scale.metaPt - 0.75}pt`, color: '#4b5563' }}>
                    {personalInfo.otherProfiles}
                  </div>
                )}
              </div>
            </div>
          ),
        };

    const topBannerHeader: PreviewUnit | null = !isDarkSidebar
      ? {
          id: 'top-light-sidebar-header',
          spacing: 'none',
          render: () => (
            <header
              style={{
                paddingBottom: '7pt',
                marginBottom: '8pt',
                borderBottom: `1.5pt solid ${custom.accentColor}`,
              }}
            >
              <h1
                className="font-bold"
                style={{
                  fontSize: `${scale.namePt}pt`,
                  letterSpacing: '0.6pt',
                  lineHeight: 1.15,
                  color: custom.textColor,
                  marginBottom: '2pt',
                }}
              >
                {personalInfo.fullName || 'FULL NAME'}
              </h1>
              {personalInfo.jobTitle && (
                <div
                  className="font-semibold"
                  style={{ fontSize: `${scale.jobTitlePt}pt`, color: custom.accentColor }}
                >
                  {personalInfo.jobTitle}
                </div>
              )}
            </header>
          ),
        }
      : null;

    return {
      singleColumnUnits: [] as PreviewUnit[],
      sidebarUnits: [
        sidebarIdentityUnit,
        ...buildUnitsForSections(sidebarKeys, {
          isSidebar: true,
          inverted: isDarkSidebar,
        }),
      ],
      mainUnits: buildUnitsForSections(mainKeys, {
        isSidebar: false,
        inverted: false,
      }),
      fullWidthTopHeader: topBannerHeader,
    };
  }, [effectiveResume, template, custom, scale, hasTwoColumns, isMainLeftSidebarRight, isTwoColumnPro, isTwoColumnSidebar, isDarkSidebar, isAsymmetric]);

  // Helper to paginate a flat array of units using measured DOM heights
  const paginateUnits = (
    unitsToPack: PreviewUnit[],
    unitElements: Map<string, HTMLElement>,
    firstPageAvailablePx: number,
    nextPagesAvailablePx: number
  ): RenderedUnit[][] => {
    if (unitsToPack.length === 0) return [];
    const result: RenderedUnit[][] = [];
    let current: RenderedUnit[] = [];
    let currentHeightPx = 0;

    const getLimit = () => (result.length === 0 ? firstPageAvailablePx : nextPagesAvailablePx);

    const measureScratchText = (text: string, includeHeading: boolean, headingLabel?: string): number => {
      const scratch = scratchObjectiveRef.current;
      if (!scratch) return 0;
      scratch.innerHTML = '';
      if (includeHeading && headingLabel) {
        const h2 = document.createElement('h2');
        h2.textContent = headingLabel;
        h2.style.fontSize = `${scale.headingPt}pt`;
        h2.style.fontWeight = '700';
        h2.style.marginBottom = '5pt';
        h2.style.paddingBottom = '2pt';
        scratch.appendChild(h2);
      }
      const p = document.createElement('p');
      p.textContent = text;
      p.style.fontSize = `${scale.baseFontPt - 0.25}pt`;
      p.style.lineHeight = String(scale.lineHeight);
      p.style.textAlign = 'justify';
      scratch.appendChild(p);
      return scratch.getBoundingClientRect().height;
    };

    for (const unit of unitsToPack) {
      const el = unitElements.get(unit.id);
      const measuredFullHeight = el ? el.getBoundingClientRect().height : 40;
      const topPadEl = el?.querySelector<HTMLElement>('[data-unit-pad]');
      const topPadPx = topPadEl ? parseFloat(getComputedStyle(topPadEl).paddingTop) || 0 : 0;
      const heightWithoutPad = Math.max(0, measuredFullHeight - topPadPx);

      const limitPx = getLimit();
      const fitsCurrent =
        current.length === 0 || currentHeightPx + measuredFullHeight <= limitPx;

      if (fitsCurrent) {
        current.push({
          id: unit.id,
          spacing: unit.spacing,
          node: unit.render(Boolean(unit.sectionHeading)),
        });
        currentHeightPx += current.length === 1 ? heightWithoutPad : measuredFullHeight;
        continue;
      }

      // Split long Objective paragraphs cleanly across pages
      if (unit.objectiveText && !isAsymmetric && !isTwoColumnSidebar && scratchObjectiveRef.current) {
        const words = unit.objectiveText.split(/\s+/);
        const remainingPx = limitPx - currentHeightPx - topPadPx;
        if (words.length > 15 && remainingPx >= 56) {
          let low = 1;
          let high = words.length - 1;
          let bestSplit = 0;

          while (low <= high) {
            const mid = Math.floor((low + high) / 2);
            const candidate = words.slice(0, mid).join(' ');
            const candidateH = measureScratchText(
              candidate,
              Boolean(unit.sectionHeading),
              unit.sectionHeading
            );
            if (candidateH <= remainingPx) {
              bestSplit = mid;
              low = mid + 1;
            } else {
              high = mid - 1;
            }
          }

          if (bestSplit >= 6 && bestSplit < words.length) {
            const part1 = words.slice(0, bestSplit).join(' ');
            const part2 = words.slice(bestSplit).join(' ');

            current.push({
              id: `${unit.id}-p1`,
              spacing: unit.spacing,
              node: (
                <div>
                  {unit.sectionHeading && renderSectionHeading(unit.sectionHeading)}
                  <p
                    className="text-justify"
                    style={{
                      fontSize: `${scale.baseFontPt - 0.25}pt`,
                      lineHeight: scale.lineHeight,
                      color: custom.textColor,
                    }}
                  >
                    {part1}
                  </p>
                </div>
              ),
            });
            result.push(current);

            const part2Height = measureScratchText(part2, false);
            current = [
              {
                id: `${unit.id}-p2`,
                spacing: 'none',
                node: (
                  <p
                    className="text-justify"
                    style={{
                      fontSize: `${scale.baseFontPt - 0.25}pt`,
                      lineHeight: scale.lineHeight,
                      color: custom.textColor,
                    }}
                  >
                    {part2}
                  </p>
                ),
              },
            ];
            currentHeightPx = part2Height;
            continue;
          }
        }
      }

      // Start fresh page
      if (current.length > 0) {
        result.push(current);
      }
      current = [
        {
          id: unit.id,
          spacing: unit.spacing,
          node: unit.render(Boolean(unit.sectionHeading)),
        },
      ];
      currentHeightPx = heightWithoutPad;
    }

    if (current.length > 0) {
      result.push(current);
    }

    return result;
  };

  useLayoutEffect(() => {
    const runPagination = () => {
      const container = measureContainerRef.current;
      const pageBox = pageBoxRef.current;
      const marginBox = marginBoxRef.current;
      if (!container || !pageBox || !marginBox) return;

      const fullPageHeightPx = pageBox.getBoundingClientRect().height;
      const reservedMarginsPx = marginBox.getBoundingClientRect().height;
      const usableHeightPx = Math.max(200, fullPageHeightPx - reservedMarginsPx);

      const unitElements = new Map<string, HTMLElement>();
      container.querySelectorAll<HTMLElement>('[data-measure-unit]').forEach((el) => {
        const id = el.dataset.measureUnit;
        if (id) unitElements.set(id, el);
      });

      let computedPages: PaginatedSheet[] = [];

      if (!hasTwoColumns) {
        const packed = paginateUnits(
          singleColumnUnits,
          unitElements,
          usableHeightPx,
          usableHeightPx
        );
        computedPages = (packed.length > 0 ? packed : [[]]).map((units, i) => ({
          pageNumber: i + 1,
          singleColumnUnits: units,
          sidebarUnits: [],
          mainUnits: [],
        }));
      } else {
        const topHeaderEl = fullWidthTopHeader
          ? unitElements.get(fullWidthTopHeader.id)
          : null;
        const topHeaderHeightPx = topHeaderEl
          ? topHeaderEl.getBoundingClientRect().height
          : 0;

        const firstPageColumnLimit = Math.max(160, usableHeightPx - topHeaderHeightPx);
        const packedSidebar = paginateUnits(
          sidebarUnits,
          unitElements,
          firstPageColumnLimit,
          usableHeightPx
        );
        const packedMain = paginateUnits(
          mainUnits,
          unitElements,
          firstPageColumnLimit,
          usableHeightPx
        );

        const total = Math.max(1, packedSidebar.length, packedMain.length);
        computedPages = Array.from({ length: total }).map((_, idx) => ({
          pageNumber: idx + 1,
          singleColumnUnits: [],
          sidebarUnits: packedSidebar[idx] || [],
          mainUnits: packedMain[idx] || [],
          hasFullWidthHeaderOnTop:
            idx === 0 && fullWidthTopHeader
              ? {
                  id: fullWidthTopHeader.id,
                  spacing: 'none',
                  node: fullWidthTopHeader.render(false),
                }
              : null,
        }));
      }

      setPages(computedPages);
      onPageCountChange?.(computedPages.length);
    };

    runPagination();

    let active = true;
    if (document.fonts?.ready) {
      document.fonts.ready.then(() => {
        if (active) runPagination();
      });
    }

    return () => {
      active = false;
    };
  }, [
    singleColumnUnits,
    sidebarUnits,
    mainUnits,
    fullWidthTopHeader,
    hasTwoColumns,
    isMainLeftSidebarRight,
    isTwoColumnSidebar,
    custom,
    scale,
  ]);

  const marginVerticalReservePt = scale.marginTopPt + scale.marginBottomPt + 6;
  const displayPages =
    pages.length > 0
      ? pages
      : [
          {
            pageNumber: 1,
            singleColumnUnits: [],
            sidebarUnits: [],
            mainUnits: [],
          },
        ];

  return (
    <>
      {/* Offscreen Measurement Container */}
      <div
        ref={measureContainerRef}
        aria-hidden="true"
        className={`${fontClass} pointer-events-none fixed left-[-99999px] top-0 bg-white`}
        style={{
          width: '210mm',
          padding: isTwoColumnSidebar
            ? `0 ${scale.marginHorizPt}pt 0 0`
            : `0 ${scale.marginHorizPt}pt`,
          boxSizing: 'border-box',
          fontSize: `${scale.baseFontPt}pt`,
          lineHeight: scale.lineHeight,
          color: custom.textColor,
          visibility: 'hidden',
        }}
      >
        <div
          ref={pageBoxRef}
          style={{ height: '297mm', width: '1px', position: 'absolute' }}
        />
        <div
          ref={marginBoxRef}
          style={{
            height: `${marginVerticalReservePt}pt`,
            width: '1px',
            position: 'absolute',
          }}
        />
        <div ref={scratchObjectiveRef} style={{ width: '100%' }} />

        {!hasTwoColumns &&
          singleColumnUnits.map((unit) => (
            <div key={unit.id} data-measure-unit={unit.id}>
              <div
                data-unit-pad="true"
                style={{
                  paddingTop: getSpacingPt(
                    unit.spacing,
                    false,
                    scale.sectionGapPt,
                    scale.entryGapPt
                  ),
                }}
              >
                {unit.render(Boolean(unit.sectionHeading))}
              </div>
            </div>
          ))}

        {isMainLeftSidebarRight && (
          <>
            {fullWidthTopHeader && (
              <div data-measure-unit={fullWidthTopHeader.id}>
                {fullWidthTopHeader.render(false)}
              </div>
            )}
            <div style={{ width: '60%', paddingRight: '10pt', boxSizing: 'border-box' }}>
              {mainUnits.map((unit) => (
                <div key={unit.id} data-measure-unit={unit.id}>
                  <div
                    data-unit-pad="true"
                    style={{
                      paddingTop: getSpacingPt(
                        unit.spacing,
                        false,
                        scale.sectionGapPt,
                        scale.entryGapPt
                      ),
                    }}
                  >
                    {unit.render(Boolean(unit.sectionHeading))}
                  </div>
                </div>
              ))}
            </div>
            <div style={{ width: '40%', paddingLeft: '10pt', boxSizing: 'border-box' }}>
              {sidebarUnits.map((unit) => (
                <div key={unit.id} data-measure-unit={unit.id}>
                  <div
                    data-unit-pad="true"
                    style={{
                      paddingTop: getSpacingPt(
                        unit.spacing,
                        false,
                        scale.sectionGapPt,
                        scale.entryGapPt
                      ),
                    }}
                  >
                    {unit.render(Boolean(unit.sectionHeading))}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {isTwoColumnSidebar && (
          <>
            {fullWidthTopHeader && (
              <div
                data-measure-unit={fullWidthTopHeader.id}
                style={{ paddingLeft: `${scale.marginHorizPt}pt` }}
              >
                {fullWidthTopHeader.render(false)}
              </div>
            )}
            <div style={{ width: '32%', padding: '0 14pt 0 22pt' }}>
              {sidebarUnits.map((unit) => (
                <div key={unit.id} data-measure-unit={unit.id}>
                  <div
                    data-unit-pad="true"
                    style={{
                      paddingTop: getSpacingPt(
                        unit.spacing,
                        false,
                        scale.sectionGapPt,
                        scale.entryGapPt
                      ),
                    }}
                  >
                    {unit.render(Boolean(unit.sectionHeading))}
                  </div>
                </div>
              ))}
            </div>
            <div style={{ width: '68%', paddingLeft: '18pt' }}>
              {mainUnits.map((unit) => (
                <div key={unit.id} data-measure-unit={unit.id}>
                  <div
                    data-unit-pad="true"
                    style={{
                      paddingTop: getSpacingPt(
                        unit.spacing,
                        false,
                        scale.sectionGapPt,
                        scale.entryGapPt
                      ),
                    }}
                  >
                    {unit.render(Boolean(unit.sectionHeading))}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Rendered Multi-Page A4 Sheets */}
      <div className="flex flex-col items-center space-y-6">
        {displayPages.map((page) => (
          <article
            key={page.pageNumber}
            data-cv-page={page.pageNumber}
            className={`cv-a4-page academic-cv-document ${fontClass} relative bg-white shadow-lg border border-neutral-300 shrink-0`}
            style={{
              width: '210mm',
              height: '297mm',
              padding: isTwoColumnSidebar
                ? `${scale.marginTopPt}pt ${scale.marginHorizPt}pt ${scale.marginBottomPt}pt 0`
                : `${scale.marginTopPt}pt ${scale.marginHorizPt}pt ${scale.marginBottomPt}pt ${scale.marginHorizPt}pt`,
              boxSizing: 'border-box',
              fontSize: `${scale.baseFontPt}pt`,
              lineHeight: scale.lineHeight,
              color: custom.textColor,
              backgroundColor: '#ffffff',
            }}
          >
            {/* Full-bleed sidebar column background for 2-column templates */}
            {isTwoColumnSidebar && (
              <div
                aria-hidden="true"
                style={{
                  position: 'absolute',
                  top: 0,
                  bottom: 0,
                  left: 0,
                  width: '32%',
                  backgroundColor: isDarkSidebar
                    ? custom.accentColor
                    : hexToLightSolidBg(custom.accentColor, 0.94),
                  borderRight: isDarkSidebar ? 'none' : '0.75pt solid #e2e8f0',
                  zIndex: 0,
                }}
              />
            )}

            {/* Single-Column & Asymmetric Layouts */}
            {!hasTwoColumns && (
              <div className="relative" style={{ zIndex: 1 }}>
                {page.singleColumnUnits.map((u, idx) => (
                  <div
                    key={u.id}
                    style={{
                      paddingTop: getSpacingPt(
                        u.spacing,
                        idx === 0,
                        scale.sectionGapPt,
                        scale.entryGapPt
                      ),
                    }}
                  >
                    {u.node}
                  </div>
                ))}
              </div>
            )}

            {/* Two Column Professional (Main Left 60% / Sidebar Right 40% on crisp white) */}
            {isMainLeftSidebarRight && (
              <div className="relative" style={{ zIndex: 1 }}>
                {page.hasFullWidthHeaderOnTop && <div>{page.hasFullWidthHeaderOnTop.node}</div>}

                <div className="flex items-start">
                  <div
                    style={{
                      width: '60%',
                      paddingRight: '10pt',
                      boxSizing: 'border-box',
                    }}
                  >
                    {page.mainUnits.map((u, idx) => (
                      <div
                        key={u.id}
                        style={{
                          paddingTop: getSpacingPt(
                            u.spacing,
                            idx === 0,
                            scale.sectionGapPt,
                            scale.entryGapPt
                          ),
                        }}
                      >
                        {u.node}
                      </div>
                    ))}
                  </div>
                  <div
                    style={{
                      width: '40%',
                      paddingLeft: '10pt',
                      boxSizing: 'border-box',
                    }}
                  >
                    {page.sidebarUnits.map((u, idx) => (
                      <div
                        key={u.id}
                        style={{
                          paddingTop: getSpacingPt(
                            u.spacing,
                            idx === 0,
                            scale.sectionGapPt,
                            scale.entryGapPt
                          ),
                        }}
                      >
                        {u.node}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Two-Column Sidebar Layout */}
            {isTwoColumnSidebar && (
              <div className="relative" style={{ zIndex: 1 }}>
                {page.hasFullWidthHeaderOnTop && (
                  <div
                    style={{
                      backgroundColor: '#ffffff',
                      paddingLeft: `${scale.marginHorizPt}pt`,
                      paddingTop: `${scale.marginTopPt}pt`,
                      marginBottom: '6pt',
                      marginTop: `-${scale.marginTopPt}pt`,
                      paddingRight: 0,
                    }}
                  >
                    {page.hasFullWidthHeaderOnTop.node}
                  </div>
                )}

                <div className="flex items-start">
                  {/* Left Sidebar (32%) */}
                  <div
                    style={{
                      width: '32%',
                      paddingLeft: '22pt',
                      paddingRight: '14pt',
                      boxSizing: 'border-box',
                    }}
                  >
                    {page.sidebarUnits.map((u, idx) => (
                      <div
                        key={u.id}
                        style={{
                          paddingTop: getSpacingPt(
                            u.spacing,
                            idx === 0,
                            scale.sectionGapPt,
                            scale.entryGapPt
                          ),
                        }}
                      >
                        {u.node}
                      </div>
                    ))}
                  </div>

                  {/* Right Main Content (68%) */}
                  <div
                    style={{
                      width: '68%',
                      paddingLeft: '18pt',
                      boxSizing: 'border-box',
                    }}
                  >
                    {page.mainUnits.map((u, idx) => (
                      <div
                        key={u.id}
                        style={{
                          paddingTop: getSpacingPt(
                            u.spacing,
                            idx === 0,
                            scale.sectionGapPt,
                            scale.entryGapPt
                          ),
                        }}
                      >
                        {u.node}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Page Number Footer when multi-page */}
            {displayPages.length > 1 && (
              <div
                className="text-center select-none"
                style={{
                  position: 'absolute',
                  bottom: '20pt',
                  left: isTwoColumnSidebar ? '32%' : 0,
                  right: 0,
                  fontSize: '8.5pt',
                  color: '#555555',
                  zIndex: 2,
                }}
              >
                Page {page.pageNumber} of {displayPages.length}
              </div>
            )}
          </article>
        ))}
      </div>
    </>
  );
};
