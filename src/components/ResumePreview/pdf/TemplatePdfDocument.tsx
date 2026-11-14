import React from 'react';
import {
  Document,
  Page,
  View,
  Text,
  Link,
  Image,
  Font,
  Svg,
  Path,
  Circle,
  Line,
  Rect,
  StyleSheet,
} from '@react-pdf/renderer';
import type {
  PublicationItem,
  ReferenceItem,
  Resume,
  TemplateCustomization,
} from '../../../types/resume';
import {
  getTemplateById,
  getTypographyScale,
  hexToLightSolidBg,
  resolveTemplateCustomization,
  type ResumeSectionKey,
} from '../../../data/templates';
import {
  SKILL_MATRIX_LEGEND,
  buildClassicPhoneList,
  buildContactLinks,
  buildElegantSerifContactItems,
  buildElegantSerifMetadataRows,
  buildFresherHeaderColumns,
  buildHarvardContactItems,
  buildInternshipContactItems,
  buildJakesAddressString,
  buildLocationString,
  buildModernCorporateContactItems,
  buildSoftwareDevContactItems,
  buildTwoColumnContactItems,
  chunkPairs,
  chunkRows,
  cleanHighlights,
  getCourseworkItems,
  getEffectiveInterests,
  getHarvardAdditionalSubsections,
  getHarvardSkillsAndInterests,
  getInternshipCareerInterests,
  getInternshipEducationEntries,
  getInternshipLearningItems,
  getInternshipResearchAndProjectEntries,
  getInternshipSkillRows,
  getOrderedVisibleSections,
  getPublicationParts,
  getSectionDisplayTitle,
  getSkillMatrixLevelLabel,
  getSoftwareDevAdditionalSubsections,
  getVisibleSkills,
  groupAwardsByYearForFresher,
  groupExperienceByCategory,
  groupPublicationsForTwoColumn,
  type ContactLinkItem,
  type ElegantSerifContactKind,
  type InternshipContactKind,
  type ModernCorporateContactKind,
  type TwoColumnContactKind,
  type TwoColumnPubCategoryKey,
} from '../../../utils/resumePresentation';
import {
  computeDonutChartSegments,
  getLanguageDotScore,
  wrapDonutLabelLines,
} from '../../../utils/dailyActivities';
import {
  estimateEditorialHeaderHeightPt,
  estimateInternshipHeaderHeightPt,
  paginateEditorialPdfColumns,
  type EditorialPdfSectionSlice,
} from '../../../utils/editorialPdfPaginator';

// Disable automatic hyphenation so academic & technical terms never break mid-word
Font.registerHyphenationCallback((word) => [word]);

interface TemplatePdfDocumentProps {
  resume: Resume;
  templateOverride?: string;
  customizationOverride?: TemplateCustomization;
}

export const TemplatePdfDocument: React.FC<TemplatePdfDocumentProps> = ({
  resume,
  templateOverride,
  customizationOverride,
}) => {
  const effectiveResume: Resume = {
    ...resume,
    template: templateOverride || resume.template,
    customization: customizationOverride || resume.customization,
  };

  const template = getTemplateById(effectiveResume.template);
  const custom = resolveTemplateCustomization(effectiveResume);
  const scale = getTypographyScale(custom, template.id);
  const isJakes = template.id === 'jakes-resume';
  const isClassic = template.id === 'classic-professional';
  const isTwoColumnPro = template.id === 'two-column-professional';
  const isSoftwareDev = template.id === 'software-developer';
  const isHarvard = template.id === 'harvard-style';
  const isElegantSerif = template.id === 'elegant-serif';
  const isModernCorporate =
    template.id === 'modern-corporate' || template.layout === 'moderncv-classic';
  const isFresherResume =
    template.id === 'fresher-resume' || template.headerVariant === 'fresher-overleaf';
  const isInternshipResume =
    template.id === 'internship-resume' || template.layout === 'two-column-internship';

  const isSerif = custom.fontFamily === 'serif';
  const fontRegular = isSerif ? 'Times-Roman' : 'Helvetica';
  const fontBold = isSerif ? 'Times-Bold' : 'Helvetica-Bold';
  const fontItalic = isSerif ? 'Times-Italic' : 'Helvetica-Oblique';

  const isTwoColumnSidebar =
    template.layout === 'sidebar-light' || template.layout === 'sidebar-dark';
  const isMainLeftSidebarRight = template.layout === 'main-left-sidebar-right';
  const isEditorialTwoColumn = template.layout === 'two-column-editorial';
  const isDarkSidebar = template.layout === 'sidebar-dark';
  const isAsymmetric = template.layout === 'asymmetric-labels';

  const accent = custom.accentColor;
  const textCol = custom.textColor;
  const bulletChar = template.bulletSymbol;

  const personalInfo = effectiveResume.personalInfo || {
    fullName: '',
    email: '',
    phone: '',
  };
  const contactLinks = buildContactLinks(personalInfo);
  const softwareDevContactItems = isSoftwareDev
    ? buildSoftwareDevContactItems(personalInfo)
    : [];
  const harvardContactItems = isHarvard ? buildHarvardContactItems(personalInfo) : [];
  const locationText =
    isJakes || isSoftwareDev
      ? buildJakesAddressString(personalInfo)
      : buildLocationString(personalInfo);
  const visibleSections = getOrderedVisibleSections(effectiveResume, template);

  const styles = StyleSheet.create({
    page: {
      paddingTop: scale.marginTopPt,
      paddingBottom:
        scale.marginBottomPt +
        (isEditorialTwoColumn ? 24 : isModernCorporate ? 14 : isInternshipResume ? 16 : 0),
      paddingLeft: isTwoColumnSidebar ? 0 : scale.marginHorizPt,
      paddingRight: scale.marginHorizPt,
      fontFamily: fontRegular,
      fontSize: scale.baseFontPt,
      color: textCol,
      backgroundColor: '#ffffff',
      lineHeight: scale.lineHeight,
    },
    sidebarBg: {
      position: 'absolute',
      top: 0,
      bottom: 0,
      left: 0,
      width: '32%',
      backgroundColor: isDarkSidebar
        ? accent
        : hexToLightSolidBg(accent, 0.94),
      borderRightWidth: isDarkSidebar ? 0 : 0.75,
      borderRightColor: '#e2e8f0',
    },
    pageNumber: {
      position: 'absolute',
      fontSize: isEditorialTwoColumn ? 7.5 : 8.5,
      fontFamily: fontRegular,
      bottom: isEditorialTwoColumn ? 7 : isModernCorporate ? 18 : 20,
      left: isTwoColumnSidebar ? '32%' : 0,
      right: 0,
      textAlign: 'center',
      color: '#555555',
    },
    link: {
      color: textCol,
      textDecoration: 'none',
    },
  });

  const renderSectionHeading = (
    title: string,
    opts?: { inverted?: boolean; compact?: boolean; minAhead?: number; disableMinAhead?: boolean }
  ) => {
    const inverted = opts?.inverted;
    const compact = opts?.compact;
    const hColor = inverted ? '#ffffff' : accent;
    const fontSize = compact ? scale.headingPt - 0.5 : scale.headingPt;
    const minAhead = opts?.disableMinAhead ? undefined : opts?.minAhead ?? 42;

    if (inverted) {
      return (
        <Text
          minPresenceAhead={minAhead}
          style={{
            fontSize,
            fontFamily: fontBold,
            textTransform: 'uppercase',
            letterSpacing: 1.1,
            color: '#ffffff',
            borderBottomWidth: 0.75,
            borderBottomColor: '#94a3b8',
            paddingBottom: 2,
            marginBottom: 5,
          }}
        >
          {title}
        </Text>
      );
    }

    if (isElegantSerif) {
      const edSize = scale.headingPt + 0.5;
      return (
        <View
          minPresenceAhead={opts?.disableMinAhead ? undefined : minAhead}
          style={{
            borderBottomWidth: 0.75,
            borderBottomColor: '#1a1a1a',
            paddingBottom: 2,
            marginBottom: 5,
          }}
        >
          <Text
            style={{
              fontSize: edSize,
              fontFamily: fontBold,
              color: '#111111',
              lineHeight: 1.22,
            }}
          >
            {renderEditorialSmallCaps(title, edSize)}
          </Text>
        </View>
      );
    }

    switch (custom.headingStyle) {
      case 'left-accent':
        return (
          <Text
            minPresenceAhead={minAhead}
            style={{
              fontSize,
              fontFamily: fontBold,
              textTransform: 'uppercase',
              letterSpacing: 1,
              color: hColor,
              borderLeftWidth: 2.5,
              borderLeftColor: hColor,
              paddingLeft: 6,
              borderBottomWidth: 0.5,
              borderBottomColor: '#e2e8f0',
              paddingBottom: 2,
              marginBottom: 5,
            }}
          >
            {title}
          </Text>
        );
      case 'filled-band':
        return (
          <Text
            minPresenceAhead={minAhead}
            style={{
              fontSize,
              fontFamily: fontBold,
              textTransform: 'uppercase',
              letterSpacing: 1.1,
              color: hColor,
              backgroundColor: hexToLightSolidBg(hColor, 0.91),
              paddingTop: 3,
              paddingBottom: 3,
              paddingHorizontal: 6,
              marginBottom: 5,
            }}
          >
            {title}
          </Text>
        );
      case 'clean-caps':
        return (
          <Text
            minPresenceAhead={minAhead}
            style={{
              fontSize,
              fontFamily: fontBold,
              textTransform: 'uppercase',
              letterSpacing: 1.3,
              color: hColor,
              borderBottomWidth: 0.5,
              borderBottomColor: '#d4d4d8',
              paddingBottom: 2,
              marginBottom: 4.5,
            }}
          >
            {title}
          </Text>
        );
      case 'italic-serif':
        return (
          <Text
            minPresenceAhead={minAhead}
            style={{
              fontSize: scale.headingPt + 0.75,
              fontFamily: isSerif ? 'Times-BoldItalic' : 'Helvetica-BoldOblique',
              letterSpacing: 0.4,
              color: hColor,
              borderBottomWidth: 0.5,
              borderBottomColor: hColor,
              paddingBottom: 2,
              marginBottom: 5,
            }}
          >
            {title}
          </Text>
        );
      case 'classic-blue-rule':
        return (
          <View minPresenceAhead={minAhead} style={{ marginBottom: 5 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 2 }}>
              <View
                style={{
                  width: 14,
                  height: 3.5,
                  backgroundColor: hColor,
                  marginRight: 6,
                }}
              />
              <Text
                style={{
                  fontSize,
                  fontFamily: fontBold,
                  textTransform: 'uppercase',
                  letterSpacing: 0.9,
                  color: hColor,
                  lineHeight: 1.25,
                }}
              >
                {title}
              </Text>
            </View>
            <View style={{ height: 0.85, backgroundColor: hColor }} />
          </View>
        );
      case 'burgundy-gold-rule':
        return (
          <View minPresenceAhead={minAhead} style={{ marginBottom: 5.5 }}>
            <Text
              style={{
                fontSize,
                fontFamily: fontBold,
                textTransform: 'uppercase',
                letterSpacing: 0.35,
                color: hColor,
                paddingBottom: 2,
                lineHeight: 1.2,
              }}
            >
              {title}
            </Text>
            <View style={{ height: 1.75, backgroundColor: '#e5c57a' }} />
          </View>
        );
      case 'title-rule':
        return (
          <Text
            minPresenceAhead={minAhead}
            style={{
              fontSize: isFresherResume ? scale.headingPt : scale.headingPt + 0.75,
              fontFamily: isHarvard ? fontBold : fontRegular,
              textTransform: isFresherResume ? 'uppercase' : 'none',
              letterSpacing: isHarvard ? 0.35 : isFresherResume ? 0.45 : 0.15,
              color: hColor,
              textAlign: template.centeredHeadings ? 'center' : 'left',
              borderBottomWidth: isFresherResume ? 0.75 : 0.65,
              borderBottomColor: hColor,
              paddingBottom: isFresherResume ? 2 : 1.5,
              marginBottom: isFresherResume ? 4.5 : 4,
              lineHeight: 1.22,
            }}
          >
            {title}
          </Text>
        );
      case 'moderncv-bar':
        return (
          <View
            minPresenceAhead={minAhead}
            style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4.5 }}
          >
            <View style={{ width: '19%', paddingRight: 10 }}>
              <View style={{ width: '100%', height: 4.5, backgroundColor: hColor }} />
            </View>
            <Text
              style={{
                flex: 1,
                fontSize: scale.headingPt,
                fontFamily: fontRegular,
                color: hColor,
                lineHeight: 1.2,
                letterSpacing: 0.1,
              }}
            >
              {title}
            </Text>
          </View>
        );
      case 'internship-rule':
        return (
          <View
            minPresenceAhead={opts?.disableMinAhead ? undefined : minAhead}
            style={{
              borderBottomWidth: 1.75,
              borderBottomColor: hColor,
              paddingBottom: 2,
              marginBottom: 5.5,
            }}
          >
            <Text
              style={{
                fontSize: scale.headingPt,
                fontFamily: fontBold,
                textTransform: 'uppercase',
                letterSpacing: 0.3,
                color: hColor,
                lineHeight: 1.2,
              }}
            >
              {title}
            </Text>
          </View>
        );
      case 'uppercase-rule':
      default:
        return (
          <Text
            minPresenceAhead={minAhead}
            style={{
              fontSize,
              fontFamily: fontBold,
              textTransform: 'uppercase',
              letterSpacing: 1.2,
              color: hColor,
              textAlign: template.centeredHeadings ? 'center' : 'left',
              borderBottomWidth: 0.75,
              borderBottomColor: hColor,
              paddingBottom: 2,
              marginBottom: 5,
            }}
          >
            {title}
          </Text>
        );
    }
  };

  const renderContactInline = (
    separator: string,
    color: string,
    centered = true
  ) =>
    contactLinks.length > 0 ? (
      <View
        style={{
          flexDirection: 'row',
          flexWrap: 'wrap',
          justifyContent: centered ? 'center' : 'flex-start',
          fontSize: scale.metaPt,
          marginBottom: 2,
        }}
      >
        {contactLinks.map((item, idx) => (
          <React.Fragment key={idx}>
            {idx > 0 && (
              <Text style={{ color, opacity: 0.65, marginHorizontal: 4 }}>
                {separator}
              </Text>
            )}
            {item.url ? (
              <Link src={item.url} style={{ color, textDecoration: 'none' }}>
                {item.label}
              </Link>
            ) : (
              <Text style={{ color }}>{item.label}</Text>
            )}
          </React.Fragment>
        ))}
      </View>
    ) : null;

  const renderSmallCapsName = (rawName: string) => {
    const words = rawName.trim().split(/\s+/).filter(Boolean);
    if (words.length === 0) return 'FIRST LAST';
    const smallPt = Math.round(scale.namePt * 0.77 * 10) / 10;
    return words.map((word, idx) => {
      const firstChar = word.slice(0, 1).toUpperCase();
      const restChars = word.slice(1).toUpperCase();
      return (
        <React.Fragment key={idx}>
          {idx > 0 ? ' ' : ''}
          <Text style={{ fontSize: scale.namePt }}>{firstChar}</Text>
          {restChars ? <Text style={{ fontSize: smallPt }}>{restChars}</Text> : null}
        </React.Fragment>
      );
    });
  };

  const renderJakesContactIcon = (kind: ContactLinkItem['kind'], color: string) => {
    const iconStyle = { marginRight: 3 };
    switch (kind) {
      case 'phone':
        return (
          <Svg width={8.5} height={8.5} viewBox="0 0 24 24" style={iconStyle}>
            <Path
              fill={color}
              d="M6.62 10.79a15.05 15.05 0 006.59 6.59l2.2-2.2a1 1 0 011.01-.24c1.12.37 2.33.57 3.58.57a1 1 0 011 1V20a1 1 0 01-1 1C10.61 21 3 13.39 3 4a1 1 0 011-1h3.5a1 1 0 011 1c0 1.25.2 2.46.57 3.58a1 1 0 01-.25 1.01l-2.2 2.2z"
            />
          </Svg>
        );
      case 'email':
        return (
          <Svg width={8.5} height={8.5} viewBox="0 0 24 24" style={iconStyle}>
            <Path
              fill={color}
              d="M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z"
            />
          </Svg>
        );
      case 'linkedin':
        return (
          <Svg width={8.5} height={8.5} viewBox="0 0 24 24" style={iconStyle}>
            <Path
              fill={color}
              d="M19 3a2 2 0 012 2v14a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h14m-.5 15.5v-5.3a3.26 3.26 0 00-3.26-3.26c-.85 0-1.84.52-2.28 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 011.4 1.4v4.93h2.75M6.88 8.56a1.68 1.68 0 001.68-1.68c0-.93-.75-1.69-1.68-1.69a1.69 1.69 0 00-1.69 1.69c0 .93.76 1.68 1.69 1.68m1.39 9.94v-8.37H5.5v8.37h2.77z"
            />
          </Svg>
        );
      case 'github':
        return (
          <Svg width={8.5} height={8.5} viewBox="0 0 24 24" style={iconStyle}>
            <Path
              fill={color}
              d="M12 2A10 10 0 002 12c0 4.42 2.87 8.17 6.84 9.5.5.08.66-.23.66-.5v-1.69c-2.77.6-3.36-1.34-3.36-1.34-.46-1.16-1.11-1.47-1.11-1.47-.91-.62.07-.6.07-.6 1 .07 1.53 1.03 1.53 1.03.87 1.52 2.34 1.07 2.91.83.09-.65.35-1.09.63-1.34-2.22-.25-4.55-1.11-4.55-4.92 0-1.11.38-2 1.03-2.71-.1-.25-.45-1.29.1-2.64 0 0 .84-.27 2.75 1.02.79-.22 1.65-.33 2.5-.33.85 0 1.71.11 2.5.33 1.91-1.29 2.75-1.02 2.75-1.02.55 1.35.2 2.39.1 2.64.65.71 1.03 1.6 1.03 2.71 0 3.82-2.34 4.66-4.57 4.91.36.31.69.92.69 1.85V21c0 .27.16.59.67.5C19.14 20.16 22 16.42 22 12A10 10 0 0012 2z"
            />
          </Svg>
        );
      case 'website':
      default:
        return (
          <Svg width={8.5} height={8.5} viewBox="0 0 24 24" style={iconStyle}>
            <Circle cx="12" cy="12" r="10" stroke={color} strokeWidth={2} fill="none" />
            <Line x1="2" y1="12" x2="22" y2="12" stroke={color} strokeWidth={2} />
            <Path
              stroke={color}
              strokeWidth={2}
              fill="none"
              d="M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z"
            />
          </Svg>
        );
    }
  };

  const renderTwoColContactIcon = (kind: TwoColumnContactKind, color: string) => {
    const iconStyle = { marginRight: 2.5 };
    switch (kind) {
      case 'email':
        return (
          <Svg width={8.2} height={8.2} viewBox="0 0 24 24" style={iconStyle}>
            <Circle cx="12" cy="12" r="4" stroke={color} strokeWidth={2.3} fill="none" />
            <Path
              stroke={color}
              strokeWidth={2.3}
              fill="none"
              d="M16 8v5a3 3 0 0 0 6 0v-1a10 10 0 1 0-3.92 7.94"
            />
          </Svg>
        );
      case 'phone':
        return (
          <Svg width={8.2} height={8.2} viewBox="0 0 24 24" style={iconStyle}>
            <Path
              fill={color}
              d="M6.62 10.79a15.05 15.05 0 006.59 6.59l2.2-2.2a1 1 0 011.01-.24c1.12.37 2.33.57 3.58.57a1 1 0 011 1V20a1 1 0 01-1 1C10.61 21 3 13.39 3 4a1 1 0 011-1h3.5a1 1 0 011 1c0 1.25.2 2.46.57 3.58a1 1 0 01-.25 1.01l-2.2 2.2z"
            />
          </Svg>
        );
      case 'mailaddress':
        return (
          <Svg width={8.2} height={8.2} viewBox="0 0 24 24" style={iconStyle}>
            <Path
              fill={color}
              d="M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z"
            />
          </Svg>
        );
      case 'location':
        return (
          <Svg width={8.2} height={8.2} viewBox="0 0 24 24" style={iconStyle}>
            <Path
              fill={color}
              d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5a2.5 2.5 0 110-5 2.5 2.5 0 010 5z"
            />
          </Svg>
        );
      case 'twitter':
        return (
          <Svg width={8.2} height={8.2} viewBox="0 0 24 24" style={iconStyle}>
            <Path
              fill={color}
              d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"
            />
          </Svg>
        );
      case 'linkedin':
        return (
          <Svg width={8.2} height={8.2} viewBox="0 0 24 24" style={iconStyle}>
            <Path
              fill={color}
              d="M19 3a2 2 0 012 2v14a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h14m-.5 15.5v-5.3a3.26 3.26 0 00-3.26-3.26c-.85 0-1.84.52-2.28 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 011.4 1.4v4.93h2.75M6.88 8.56a1.68 1.68 0 001.68-1.68c0-.93-.75-1.69-1.68-1.69a1.69 1.69 0 00-1.69 1.69c0 .93.76 1.68 1.69 1.68m1.39 9.94v-8.37H5.5v8.37h2.77z"
            />
          </Svg>
        );
      case 'github':
        return (
          <Svg width={8.2} height={8.2} viewBox="0 0 24 24" style={iconStyle}>
            <Path
              fill={color}
              d="M12 2A10 10 0 002 12c0 4.42 2.87 8.17 6.84 9.5.5.08.66-.23.66-.5v-1.69c-2.77.6-3.36-1.34-3.36-1.34-.46-1.16-1.11-1.47-1.11-1.47-.91-.62.07-.6.07-.6 1 .07 1.53 1.03 1.53 1.03.87 1.52 2.34 1.07 2.91.83.09-.65.35-1.09.63-1.34-2.22-.25-4.55-1.11-4.55-4.92 0-1.11.38-2 1.03-2.71-.1-.25-.45-1.29.1-2.64 0 0 .84-.27 2.75 1.02.79-.22 1.65-.33 2.5-.33.85 0 1.71.11 2.5.33 1.91-1.29 2.75-1.02 2.75-1.02.55 1.35.2 2.39.1 2.64.65.71 1.03 1.6 1.03 2.71 0 3.82-2.34 4.66-4.57 4.91.36.31.69.92.69 1.85V21c0 .27.16.59.67.5C19.14 20.16 22 16.42 22 12A10 10 0 0012 2z"
            />
          </Svg>
        );
      case 'orcid':
        return (
          <Svg width={8.2} height={8.2} viewBox="0 0 24 24" style={iconStyle}>
            <Circle cx="12" cy="12" r="10.5" fill={color} />
            <Path fill="#ffffff" d="M8.5 8v8h1.5V8H8.5zm3 0v8h2.6c2.3 0 3.7-1.5 3.7-4s-1.4-4-3.7-4H11.5zm1.5 1.4h1c1.4 0 2.2.9 2.2 2.6s-.8 2.6-2.2 2.6h-1V9.4z" />
          </Svg>
        );
      case 'gitlab':
        return (
          <Svg width={8.2} height={8.2} viewBox="0 0 24 24" style={iconStyle}>
            <Path
              fill={color}
              d="M22.65 14.39L12 22.13 1.35 14.39a.84.84 0 01-.3-.94l1.22-3.78 2.44-7.51A.42.42 0 015.5 2a.43.43 0 01.41.29l2.44 7.51h7.3l2.44-7.51A.43.43 0 0118.5 2a.42.42 0 01.79.16l2.44 7.51 1.22 3.78a.84.84 0 01-.3.94z"
            />
          </Svg>
        );
      case 'mastodon':
        return (
          <Svg width={8.2} height={8.2} viewBox="0 0 24 24" style={iconStyle}>
            <Path
              fill={color}
              d="M21.33 8.53c0-4.96-3.25-6.41-3.25-6.41C16.44 1.37 13.62 1.05 12 1.04h-.06c-1.62.01-4.44.33-6.08 1.08 0 0-3.25 1.45-3.25 6.41v3.78c.12 2.98.89 5.93 2.58 7.53 1.98 1.87 4.49 2.26 6.53 2.13 1.56-.09 2.44-.58 2.44-.58l-.05-1.15s-1.12.35-2.37.31c-1.24-.04-2.55-.13-2.75-1.64-.02-.14-.03-.29-.03-.44 0 0 2.59.63 5.87.78 1.71.08 3.31-.1 4.94-.3 1.52-.19 2.84-1.13 3.01-1.99.26-1.35.24-3.3.24-3.3zm-3.24 4.21h-2.16V9.26c0-1.08-.46-1.63-1.39-1.63-1.02 0-1.53.66-1.53 1.97v2.39H10.9V9.6c0-1.31-.51-1.97-1.53-1.97-.93 0-1.39.55-1.39 1.63v3.48H5.82V9.13c0-1.08.28-1.94.83-2.58.57-.64 1.31-.96 2.24-.96 1.07 0 1.89.41 2.44 1.24l.53.88.53-.88c.55-.83 1.37-1.24 2.44-1.24.93 0 1.67.32 2.24.96.55.64.83 1.5.83 2.58v3.61z"
            />
          </Svg>
        );
      case 'website':
      case 'custom':
      default:
        return (
          <Svg width={8.2} height={8.2} viewBox="0 0 24 24" style={iconStyle}>
            <Circle cx="12" cy="12" r="10" stroke={color} strokeWidth={2} fill="none" />
            <Line x1="2" y1="12" x2="22" y2="12" stroke={color} strokeWidth={2} />
            <Path
              stroke={color}
              strokeWidth={2}
              fill="none"
              d="M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z"
            />
          </Svg>
        );
    }
  };

  const renderTwoColMetaIcon = (kind: 'calendar' | 'pin' | 'mail', color: string) => {
    const iconStyle = { marginRight: 3 };
    if (kind === 'calendar') {
      return (
        <Svg width={7.8} height={7.8} viewBox="0 0 24 24" style={iconStyle}>
          <Rect x="3" y="4" width="18" height="18" rx="2" stroke={color} strokeWidth={2} fill="none" />
          <Line x1="16" y1="2" x2="16" y2="6" stroke={color} strokeWidth={2} />
          <Line x1="8" y1="2" x2="8" y2="6" stroke={color} strokeWidth={2} />
          <Line x1="3" y1="10" x2="21" y2="10" stroke={color} strokeWidth={2} />
        </Svg>
      );
    }
    if (kind === 'pin') {
      return (
        <Svg width={7.8} height={7.8} viewBox="0 0 24 24" style={iconStyle}>
          <Path
            fill={color}
            d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5a2.5 2.5 0 110-5 2.5 2.5 0 010 5z"
          />
        </Svg>
      );
    }
    return (
      <Svg width={7.8} height={7.8} viewBox="0 0 24 24" style={iconStyle}>
        <Path
          fill={color}
          d="M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z"
        />
      </Svg>
    );
  };

  const renderTwoColAchievementIcon = (
    icon: 'trophy' | 'heart' | 'award' | 'star' | undefined,
    color: string
  ) => {
    switch (icon) {
      case 'heart':
        return (
          <Svg width={13} height={13} viewBox="0 0 24 24">
            <Path
              fill={color}
              d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"
            />
          </Svg>
        );
      case 'star':
        return (
          <Svg width={13} height={13} viewBox="0 0 24 24">
            <Path
              fill={color}
              d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"
            />
          </Svg>
        );
      case 'award':
        return (
          <Svg width={13} height={13} viewBox="0 0 24 24">
            <Circle cx="12" cy="8" r="6" fill={color} />
            <Path fill={color} d="M8.5 13.5L7 22l5-3 5 3-1.5-8.5" />
          </Svg>
        );
      case 'trophy':
      default:
        return (
          <Svg width={13} height={13} viewBox="0 0 24 24">
            <Path
              fill={color}
              d="M19 5h-2V3H7v2H5c-1.1 0-2 .9-2 2v1c0 2.55 1.92 4.63 4.39 4.94.63 1.5 1.98 2.63 3.61 2.96V19H7v2h10v-2h-4v-3.1c1.63-.33 2.98-1.46 3.61-2.96C19.08 12.63 21 10.55 21 8V7c0-1.1-.9-2-2-2zM5 8V7h2v3.82C5.84 10.4 5 9.3 5 8zm14 0c0 1.3-.84 2.4-2 2.82V7h2v1z"
            />
          </Svg>
        );
    }
  };

  const renderTwoColPubIcon = (cat: TwoColumnPubCategoryKey, color: string) => {
    const iconStyle = { marginRight: 4 };
    switch (cat) {
      case 'books':
        return (
          <Svg width={9.5} height={9.5} viewBox="0 0 24 24" style={iconStyle}>
            <Path fill={color} d="M4 19.5A2.5 2.5 0 016.5 17H20V2H6.5A2.5 2.5 0 004 4.5v15zM6.5 19a.5.5 0 000 1H20v-1H6.5z" />
          </Svg>
        );
      case 'conference':
        return (
          <Svg width={9.5} height={9.5} viewBox="0 0 24 24" style={iconStyle}>
            <Path
              fill={color}
              d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z"
            />
          </Svg>
        );
      case 'journal':
      case 'research':
      case 'other':
      default:
        return (
          <Svg width={9.5} height={9.5} viewBox="0 0 24 24" style={iconStyle}>
            <Path stroke={color} strokeWidth={2} fill="none" d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
            <Path stroke={color} strokeWidth={2} fill="none" d="M14 2v6h6" />
            <Line x1="8" y1="13" x2="16" y2="13" stroke={color} strokeWidth={2} />
            <Line x1="8" y1="17" x2="16" y2="17" stroke={color} strokeWidth={2} />
          </Svg>
        );
    }
  };

  const renderEditorialSmallCaps = (text: string, basePt: number) => {
    const words = text.trim().split(/\s+/).filter(Boolean);
    if (words.length === 0) return text;
    return words.map((word, idx) => {
      const firstChar = word.slice(0, 1).toUpperCase();
      const restChars = word.slice(1).toUpperCase();
      return (
        <Text key={idx}>
          {idx > 0 ? ' ' : ''}
          <Text style={{ fontSize: basePt }}>{firstChar}</Text>
          {restChars ? (
            <Text style={{ fontSize: Math.round(basePt * 0.78 * 10) / 10 }}>
              {restChars}
            </Text>
          ) : null}
        </Text>
      );
    });
  };

  const renderEditorialMetaIcon = (
    kind: 'title' | 'nationality' | 'dob' | 'languages' | 'info',
    color = '#1f2937'
  ) => {
    const iconStyle = { marginRight: 4, marginTop: 1 };
    switch (kind) {
      case 'title':
        return (
          <Svg width={7.8} height={7.8} viewBox="0 0 24 24" style={iconStyle}>
            <Rect x="2" y="7" width="20" height="14" rx="2" stroke={color} strokeWidth={2} fill="none" />
            <Path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2" stroke={color} strokeWidth={2} fill="none" />
          </Svg>
        );
      case 'nationality':
        return (
          <Svg width={7.8} height={7.8} viewBox="0 0 24 24" style={iconStyle}>
            <Circle cx="12" cy="12" r="10" stroke={color} strokeWidth={2} fill="none" />
            <Line x1="2" y1="12" x2="22" y2="12" stroke={color} strokeWidth={2} />
            <Path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" stroke={color} strokeWidth={2} fill="none" />
          </Svg>
        );
      case 'dob':
        return (
          <Svg width={7.8} height={7.8} viewBox="0 0 24 24" style={iconStyle}>
            <Rect x="3" y="4" width="18" height="18" rx="2" stroke={color} strokeWidth={2} fill="none" />
            <Line x1="16" y1="2" x2="16" y2="6" stroke={color} strokeWidth={2} />
            <Line x1="8" y1="2" x2="8" y2="6" stroke={color} strokeWidth={2} />
            <Line x1="3" y1="10" x2="21" y2="10" stroke={color} strokeWidth={2} />
          </Svg>
        );
      case 'languages':
        return (
          <Svg width={7.8} height={7.8} viewBox="0 0 24 24" style={iconStyle}>
            <Path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" stroke={color} strokeWidth={2} fill="none" />
          </Svg>
        );
      case 'info':
      default:
        return (
          <Svg width={7.8} height={7.8} viewBox="0 0 24 24" style={iconStyle}>
            <Circle cx="12" cy="12" r="10" stroke={color} strokeWidth={2} fill="none" />
            <Line x1="12" y1="16" x2="12" y2="12" stroke={color} strokeWidth={2} />
            <Circle cx="12" cy="8" r="1" fill={color} />
          </Svg>
        );
    }
  };

  const renderEditorialContactIcon = (kind: ElegantSerifContactKind, color = '#1f2937') => {
    const iconStyle = { marginRight: 4, marginTop: 1 };
    switch (kind) {
      case 'phone':
        return (
          <Svg width={7.8} height={7.8} viewBox="0 0 24 24" style={iconStyle}>
            <Path fill={color} d="M6.62 10.79a15.05 15.05 0 006.59 6.59l2.2-2.2a1 1 0 011.01-.24c1.12.37 2.33.57 3.58.57a1 1 0 011 1V20a1 1 0 01-1 1C10.61 21 3 13.39 3 4a1 1 0 011-1h3.5a1 1 0 011 1c0 1.25.2 2.46.57 3.58a1 1 0 01-.25 1.01l-2.2 2.2z" />
          </Svg>
        );
      case 'email':
        return (
          <Svg width={7.8} height={7.8} viewBox="0 0 24 24" style={iconStyle}>
            <Circle cx="12" cy="12" r="4" stroke={color} strokeWidth={2.2} fill="none" />
            <Path d="M16 8v5a3 3 0 0 0 6 0v-1a10 10 0 1 0-3.92 7.94" stroke={color} strokeWidth={2.2} fill="none" />
          </Svg>
        );
      case 'address':
      case 'location':
        return (
          <Svg width={7.8} height={7.8} viewBox="0 0 24 24" style={iconStyle}>
            <Path fill={color} d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5a2.5 2.5 0 110-5 2.5 2.5 0 010 5z" />
          </Svg>
        );
      case 'linkedin':
        return (
          <Svg width={7.8} height={7.8} viewBox="0 0 24 24" style={iconStyle}>
            <Path fill={color} d="M19 3a2 2 0 012 2v14a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h14m-.5 15.5v-5.3a3.26 3.26 0 00-3.26-3.26c-.85 0-1.84.52-2.28 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 011.4 1.4v4.93h2.75M6.88 8.56a1.68 1.68 0 001.68-1.68c0-.93-.75-1.69-1.68-1.69a1.69 1.69 0 00-1.69 1.69c0 .93.76 1.68 1.69 1.68m1.39 9.94v-8.37H5.5v8.37h2.77z" />
          </Svg>
        );
      case 'github':
        return (
          <Svg width={7.8} height={7.8} viewBox="0 0 24 24" style={iconStyle}>
            <Path fill={color} d="M12 2A10 10 0 002 12c0 4.42 2.87 8.17 6.84 9.5.5.08.66-.23.66-.5v-1.69c-2.77.6-3.36-1.34-3.36-1.34-.46-1.16-1.11-1.47-1.11-1.47-.91-.62.07-.6.07-.6 1 .07 1.53 1.03 1.53 1.03.87 1.52 2.34 1.07 2.91.83.09-.65.35-1.09.63-1.34-2.22-.25-4.55-1.11-4.55-4.92 0-1.11.38-2 1.03-2.71-.1-.25-.45-1.29.1-2.64 0 0 .84-.27 2.75 1.02.79-.22 1.65-.33 2.5-.33.85 0 1.71.11 2.5.33 1.91-1.29 2.75-1.02 2.75-1.02.55 1.35.2 2.39.1 2.64.65.71 1.03 1.6 1.03 2.71 0 3.82-2.34 4.66-4.57 4.91.36.31.69.92.69 1.85V21c0 .27.16.59.67.5C19.14 20.16 22 16.42 22 12A10 10 0 0012 2z" />
          </Svg>
        );
      case 'orcid':
        return (
          <Svg width={7.8} height={7.8} viewBox="0 0 24 24" style={iconStyle}>
            <Circle cx="12" cy="12" r="10.5" fill={color} />
            <Path fill="#ffffff" d="M8.5 8v8h1.5V8H8.5zm3 0v8h2.6c2.3 0 3.7-1.5 3.7-4s-1.4-4-3.7-4H11.5zm1.5 1.4h1c1.4 0 2.2.9 2.2 2.6s-.8 2.6-2.2 2.6h-1V9.4z" />
          </Svg>
        );
      case 'website':
      case 'other':
      case 'custom':
      default:
        return (
          <Svg width={7.8} height={7.8} viewBox="0 0 24 24" style={iconStyle}>
            <Circle cx="12" cy="12" r="10" stroke={color} strokeWidth={2} fill="none" />
            <Line x1="2" y1="12" x2="22" y2="12" stroke={color} strokeWidth={2} />
            <Path d="M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z" stroke={color} strokeWidth={2} fill="none" />
          </Svg>
        );
    }
  };

  const renderEditorialDateTimeline = (
    dateText: string,
    bodyNode: React.ReactNode,
    headingNode?: React.ReactNode
  ) => (
    <View wrap={false}>
      {headingNode || null}
      <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
        <Text
          style={{
            width: '22%',
            paddingRight: 7,
            fontFamily: fontBold,
            fontSize: scale.metaPt - 0.25,
            lineHeight: 1.25,
            color: '#111111',
            textAlign: 'right',
          }}
        >
          {dateText}
        </Text>
        <View
          style={{
            flex: 1,
            borderLeftWidth: 0.75,
            borderLeftColor: '#555555',
            paddingLeft: 8,
            paddingBottom: 1.5,
          }}
        >
          {bodyNode}
        </View>
      </View>
    </View>
  );

  const renderEditorialDateRow = (
    dateText: string,
    bodyNode: React.ReactNode,
    headingNode?: React.ReactNode
  ) => (
    <View wrap={false}>
      {headingNode || null}
      <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
        <Text
          style={{
            width: '22%',
            paddingRight: 7,
            fontFamily: fontBold,
            fontSize: scale.metaPt - 0.25,
            lineHeight: 1.25,
            color: '#111111',
            textAlign: 'right',
          }}
        >
          {dateText}
        </Text>
        <View style={{ flex: 1, paddingLeft: 8 }}>
          {bodyNode}
        </View>
      </View>
    </View>
  );

  const renderLanguageDots = (score: number, color: string) => {
    const emptyColor = '#d1d5db';
    return (
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        {[1, 2, 3, 4, 5].map((dot) => {
          const isFull = score >= dot;
          const isHalf = !isFull && score >= dot - 0.5;
          return (
            <Svg
              key={dot}
              width={8}
              height={8}
              viewBox="0 0 12 12"
              style={{ marginRight: dot < 5 ? 2.5 : 0 }}
            >
              <Circle cx="6" cy="6" r="5.5" fill={isFull ? color : emptyColor} />
              {isHalf ? <Path d="M6,0.5 A5.5,5.5 0 0,0 6,11.5 Z" fill={color} /> : null}
            </Svg>
          );
        })}
      </View>
    );
  };

  const renderModerncvContactIcon = (kind: ModernCorporateContactKind, color = '#374151') => {
    const iconStyle = { marginRight: 4 };
    switch (kind) {
      case 'dob':
        return (
          <Svg width={7.5} height={7.5} viewBox="0 0 24 24" style={iconStyle}>
            <Path
              stroke={color}
              strokeWidth={2.2}
              fill="none"
              d="M12 3v18M4.2 7.5l15.6 9M19.8 7.5l-15.6 9"
            />
          </Svg>
        );
      case 'mobile':
        return (
          <Svg width={7.5} height={7.5} viewBox="0 0 24 24" style={iconStyle}>
            <Rect x="7" y="2" width="10" height="20" rx="2" stroke={color} strokeWidth={2} fill="none" />
            <Line x1="11" y1="18" x2="13" y2="18" stroke={color} strokeWidth={2} />
          </Svg>
        );
      case 'phone':
      case 'altPhone':
        return (
          <Svg width={7.5} height={7.5} viewBox="0 0 24 24" style={iconStyle}>
            <Path
              fill={color}
              d="M6.62 10.79a15.05 15.05 0 006.59 6.59l2.2-2.2a1 1 0 011.01-.24c1.12.37 2.33.57 3.58.57a1 1 0 011 1V20a1 1 0 01-1 1C10.61 21 3 13.39 3 4a1 1 0 011-1h3.5a1 1 0 011 1c0 1.25.2 2.46.57 3.58a1 1 0 01-.25 1.01l-2.2 2.2z"
            />
          </Svg>
        );
      case 'email':
        return (
          <Svg width={7.5} height={7.5} viewBox="0 0 24 24" style={iconStyle}>
            <Rect x="2" y="4" width="20" height="16" rx="2" stroke={color} strokeWidth={2} fill="none" />
            <Path stroke={color} strokeWidth={2} fill="none" d="M22 6l-10 7L2 6" />
          </Svg>
        );
      case 'website':
      case 'custom':
        return (
          <Svg width={7.5} height={7.5} viewBox="0 0 24 24" style={iconStyle}>
            <Circle cx="12" cy="12" r="10" stroke={color} strokeWidth={2} fill="none" />
            <Line x1="2" y1="12" x2="22" y2="12" stroke={color} strokeWidth={2} />
            <Path
              stroke={color}
              strokeWidth={2}
              fill="none"
              d="M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z"
            />
          </Svg>
        );
      case 'linkedin':
        return (
          <Svg width={7.5} height={7.5} viewBox="0 0 24 24" style={iconStyle}>
            <Path
              fill={color}
              d="M19 3a2 2 0 012 2v14a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h14m-.5 15.5v-5.3a3.26 3.26 0 00-3.26-3.26c-.85 0-1.84.52-2.28 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 011.4 1.4v4.93h2.75M6.88 8.56a1.68 1.68 0 001.68-1.68c0-.93-.75-1.69-1.68-1.69a1.69 1.69 0 00-1.69 1.69c0 .93.76 1.68 1.69 1.68m1.39 9.94v-8.37H5.5v8.37h2.77z"
            />
          </Svg>
        );
      case 'github':
        return (
          <Svg width={7.5} height={7.5} viewBox="0 0 24 24" style={iconStyle}>
            <Path
              fill={color}
              d="M12 2A10 10 0 002 12c0 4.42 2.87 8.17 6.84 9.5.5.08.66-.23.66-.5v-1.69c-2.77.6-3.36-1.34-3.36-1.34-.46-1.16-1.11-1.47-1.11-1.47-.91-.62.07-.6.07-.6 1 .07 1.53 1.03 1.53 1.03.87 1.52 2.34 1.07 2.91.83.09-.65.35-1.09.63-1.34-2.22-.25-4.55-1.11-4.55-4.92 0-1.11.38-2 1.03-2.71-.1-.25-.45-1.29.1-2.64 0 0 .84-.27 2.75 1.02.79-.22 1.65-.33 2.5-.33.85 0 1.71.11 2.5.33 1.91-1.29 2.75-1.02 2.75-1.02.55 1.35.2 2.39.1 2.64.65.71 1.03 1.6 1.03 2.71 0 3.82-2.34 4.66-4.57 4.91.36.31.69.92.69 1.85V21c0 .27.16.59.67.5C19.14 20.16 22 16.42 22 12A10 10 0 0012 2z"
            />
          </Svg>
        );
      default:
        return null;
    }
  };

  const renderModerncvHollowCircle = (color = '#111827') => (
    <Svg width={4.5} height={4.5} viewBox="0 0 10 10" style={{ marginTop: 3.5, marginRight: 5 }}>
      <Circle cx="5" cy="5" r="3.4" fill="none" stroke={color} strokeWidth={1.25} />
    </Svg>
  );

  const renderModerncvRow = (
    leftContent: React.ReactNode,
    rightContent: React.ReactNode,
    keepTogether = true
  ) => (
    <View style={{ flexDirection: 'row', alignItems: 'flex-start' }} wrap={!keepTogether}>
      <View style={{ width: '19%', paddingRight: 10, alignItems: 'flex-end' }}>
        {typeof leftContent === 'string' ? (
          <Text
            style={{
              fontSize: scale.metaPt,
              lineHeight: scale.lineHeight,
              color: '#111827',
              textAlign: 'right',
            }}
          >
            {leftContent}
          </Text>
        ) : (
          leftContent
        )}
      </View>
      <View style={{ flex: 1 }}>{rightContent}</View>
    </View>
  );

  const renderInternshipContactIcon = (kind: InternshipContactKind, color = '#111827') => {
    const iconStyle = { marginRight: 3 };
    switch (kind) {
      case 'email':
        return (
          <Svg width={8} height={8} viewBox="0 0 24 24" style={iconStyle}>
            <Circle cx="12" cy="12" r="4" stroke={color} strokeWidth={2.3} fill="none" />
            <Path
              stroke={color}
              strokeWidth={2.3}
              fill="none"
              d="M16 8v5a3 3 0 0 0 6 0v-1a10 10 0 1 0-3.92 7.94"
            />
          </Svg>
        );
      case 'phone':
        return (
          <Svg width={8} height={8} viewBox="0 0 24 24" style={iconStyle}>
            <Path
              fill={color}
              d="M6.62 10.79a15.05 15.05 0 006.59 6.59l2.2-2.2a1 1 0 011.01-.24c1.12.37 2.33.57 3.58.57a1 1 0 011 1V20a1 1 0 01-1 1C10.61 21 3 13.39 3 4a1 1 0 011-1h3.5a1 1 0 011 1c0 1.25.2 2.46.57 3.58a1 1 0 01-.25 1.01l-2.2 2.2z"
            />
          </Svg>
        );
      case 'location':
        return (
          <Svg width={8} height={8} viewBox="0 0 24 24" style={iconStyle}>
            <Path
              fill={color}
              d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5a2.5 2.5 0 110-5 2.5 2.5 0 010 5z"
            />
          </Svg>
        );
      case 'linkedin':
        return (
          <Svg width={8} height={8} viewBox="0 0 24 24" style={iconStyle}>
            <Path
              fill={color}
              d="M19 3a2 2 0 012 2v14a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h14m-.5 15.5v-5.3a3.26 3.26 0 00-3.26-3.26c-.85 0-1.84.52-2.28 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 011.4 1.4v4.93h2.75M6.88 8.56a1.68 1.68 0 001.68-1.68c0-.93-.75-1.69-1.68-1.69a1.69 1.69 0 00-1.69 1.69c0 .93.76 1.68 1.69 1.68m1.39 9.94v-8.37H5.5v8.37h2.77z"
            />
          </Svg>
        );
      case 'github':
        return (
          <Svg width={8} height={8} viewBox="0 0 24 24" style={iconStyle}>
            <Path
              fill={color}
              d="M12 2A10 10 0 002 12c0 4.42 2.87 8.17 6.84 9.5.5.08.66-.23.66-.5v-1.69c-2.77.6-3.36-1.34-3.36-1.34-.46-1.16-1.11-1.47-1.11-1.47-.91-.62.07-.6.07-.6 1 .07 1.53 1.03 1.53 1.03.87 1.52 2.34 1.07 2.91.83.09-.65.35-1.09.63-1.34-2.22-.25-4.55-1.11-4.55-4.92 0-1.11.38-2 1.03-2.71-.1-.25-.45-1.29.1-2.64 0 0 .84-.27 2.75 1.02.79-.22 1.65-.33 2.5-.33.85 0 1.71.11 2.5.33 1.91-1.29 2.75-1.02 2.75-1.02.55 1.35.2 2.39.1 2.64.65.71 1.03 1.6 1.03 2.71 0 3.82-2.34 4.66-4.57 4.91.36.31.69.92.69 1.85V21c0 .27.16.59.67.5C19.14 20.16 22 16.42 22 12A10 10 0 0012 2z"
            />
          </Svg>
        );
      case 'website':
      case 'custom':
      default:
        return (
          <Svg width={8} height={8} viewBox="0 0 24 24" style={iconStyle}>
            <Circle cx="12" cy="12" r="10" stroke={color} strokeWidth={2} fill="none" />
            <Line x1="2" y1="12" x2="22" y2="12" stroke={color} strokeWidth={2} />
            <Path
              stroke={color}
              strokeWidth={2}
              fill="none"
              d="M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z"
            />
          </Svg>
        );
    }
  };

  const renderInternshipTrophyIcon = (color = '#111827') => (
    <Svg width={11} height={11} viewBox="0 0 24 24" style={{ marginTop: 1.5, marginRight: 5.5 }}>
      <Path
        fill={color}
        d="M19 5h-2V3H7v2H5c-1.1 0-2 .9-2 2v1c0 2.55 1.92 4.63 4.39 4.94.63 1.5 1.98 2.63 3.61 2.96V19H7v2h10v-2h-4v-3.1c1.63-.33 2.98-1.46 3.61-2.96C19.08 12.63 21 10.55 21 8V7c0-1.1-.9-2-2-2zM5 8V7h2v3.82C5.84 10.4 5 9.3 5 8zm14 0c0 1.3-.84 2.4-2 2.82V7h2v1z"
      />
    </Svg>
  );

  const renderHeader = () => {
    const nameText = personalInfo.fullName || 'FULL NAME';

    switch (template.headerVariant) {
      case 'internship-kunal': {
        const items = buildInternshipContactItems(personalInfo);
        return (
          <View style={{ marginBottom: 7 }}>
            <Text
              style={{
                fontSize: scale.namePt,
                fontFamily: fontBold,
                textTransform: 'uppercase',
                letterSpacing: 0.3,
                lineHeight: 1.08,
                color: '#111827',
                marginBottom: 1.5,
              }}
            >
              {nameText}
            </Text>
            {personalInfo.jobTitle?.trim() ? (
              <Text
                style={{
                  fontSize: scale.jobTitlePt,
                  fontFamily: fontBold,
                  color: '#374151',
                  lineHeight: 1.25,
                  marginBottom: 4,
                }}
              >
                {personalInfo.jobTitle.trim()}
              </Text>
            ) : null}
            {items.length > 0 ? (
              <View
                style={{
                  flexDirection: 'row',
                  flexWrap: 'wrap',
                  alignItems: 'center',
                  fontSize: scale.metaPt,
                  lineHeight: 1.3,
                }}
              >
                {items.map((item, idx) => (
                  <View
                    key={`${item.kind}-${idx}`}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      marginRight: idx < items.length - 1 ? 12 : 0,
                      marginBottom: 2.5,
                    }}
                  >
                    {renderInternshipContactIcon(item.kind, '#111827')}
                    {item.url ? (
                      <Link src={item.url} style={{ color: '#1f2937', textDecoration: 'none' }}>
                        {item.label}
                      </Link>
                    ) : (
                      <Text style={{ color: '#1f2937' }}>{item.label}</Text>
                    )}
                  </View>
                ))}
              </View>
            ) : null}
          </View>
        );
      }

      case 'two-column-header': {
        const rawPhoto = personalInfo.photoUrl?.trim() || '';
        const safePhotoUrl =
          rawPhoto.startsWith('data:image/jpeg') ||
          rawPhoto.startsWith('data:image/png') ||
          rawPhoto.startsWith('https://') ||
          rawPhoto.startsWith('http://')
            ? rawPhoto
            : '';
        const photoShape = personalInfo.photoShape || 'circle';
        const items = buildTwoColumnContactItems(personalInfo);
        const radius =
          photoShape === 'square' ? 6 : photoShape === 'portrait' ? 4 : 37;
        const innerRadius =
          photoShape === 'square' ? 4 : photoShape === 'portrait' ? 3 : 34;

        return (
          <View style={{ marginBottom: 7 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <View style={{ flex: 1, paddingRight: safePhotoUrl ? 14 : 0 }}>
                <Text
                  style={{
                    fontSize: scale.namePt + 1,
                    fontFamily: fontBold,
                    textTransform: 'uppercase',
                    letterSpacing: 0.4,
                    lineHeight: 1.1,
                    color: textCol,
                    marginBottom: 2.5,
                  }}
                >
                  {nameText}
                </Text>
                {personalInfo.jobTitle ? (
                  <Text
                    style={{
                      fontSize: scale.jobTitlePt + 0.5,
                      fontFamily: fontBold,
                      color: accent,
                      lineHeight: 1.25,
                      marginBottom: 5,
                    }}
                  >
                    {personalInfo.jobTitle}
                  </Text>
                ) : null}
                {items.length > 0 ? (
                  <View
                    style={{
                      flexDirection: 'row',
                      flexWrap: 'wrap',
                      alignItems: 'center',
                      fontSize: scale.metaPt - 0.25,
                      lineHeight: 1.3,
                    }}
                  >
                    {items.map((item, idx) => (
                      <View
                        key={`${item.kind}-${idx}`}
                        style={{
                          flexDirection: 'row',
                          alignItems: 'center',
                          marginRight: 11,
                          marginBottom: 2.5,
                        }}
                      >
                        {renderTwoColContactIcon(item.kind, accent)}
                        {item.url ? (
                          <Link src={item.url} style={{ color: '#1f2937', textDecoration: 'none' }}>
                            {item.label}
                          </Link>
                        ) : (
                          <Text style={{ color: '#1f2937' }}>{item.label}</Text>
                        )}
                      </View>
                    ))}
                  </View>
                ) : null}
              </View>

              {safePhotoUrl ? (
                <View
                  style={{
                    width: 74,
                    height: photoShape === 'portrait' ? 90 : 74,
                    padding: 3,
                    backgroundColor: '#f3ebd3',
                    borderWidth: 1.75,
                    borderColor: '#e5c57a',
                    borderRadius: radius,
                    overflow: 'hidden',
                  }}
                >
                  <Image
                    src={safePhotoUrl}
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover',
                      borderRadius: innerRadius,
                    }}
                  />
                </View>
              ) : null}
            </View>
          </View>
        );
      }

      case 'classic-header': {
        const phones = buildClassicPhoneList(personalInfo);
        const rawPhoto = personalInfo.photoUrl?.trim() || '';
        const safePhotoUrl =
          rawPhoto.startsWith('data:image/jpeg') ||
          rawPhoto.startsWith('data:image/png') ||
          rawPhoto.startsWith('https://') ||
          rawPhoto.startsWith('http://')
            ? rawPhoto
            : '';
        const isSquarePhoto = personalInfo.photoShape === 'square';
        const nonPhoneLinks = contactLinks.filter((c) => c.kind !== 'phone');
        const quoteText = effectiveResume.personalQuote?.trim();

        return (
          <View style={{ marginBottom: 8 }}>
            <View
              style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
                paddingBottom: 8,
                borderBottomWidth: 1.25,
                borderBottomColor: accent,
              }}
            >
              <View style={{ flex: 1, paddingRight: safePhotoUrl ? 12 : 0 }}>
                <Text
                  style={{
                    fontSize: scale.namePt + 1,
                    fontFamily: fontBold,
                    letterSpacing: 0.5,
                    lineHeight: 1.15,
                    color: accent,
                    marginBottom: 2,
                  }}
                >
                  {nameText}
                </Text>
                {personalInfo.jobTitle ? (
                  <Text
                    style={{
                      fontSize: scale.jobTitlePt,
                      fontFamily: fontBold,
                      color: '#334155',
                      marginBottom: 6,
                    }}
                  >
                    {personalInfo.jobTitle}
                  </Text>
                ) : null}

                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <View style={{ width: '48%', fontSize: scale.metaPt, lineHeight: 1.38 }}>
                    {locationText ? (
                      <Text style={{ color: textCol, marginBottom: 1.5 }}>
                        <Text style={{ fontFamily: fontBold, color: '#475569' }}>Address: </Text>
                        <Text>{locationText}</Text>
                      </Text>
                    ) : null}
                    {personalInfo.dateOfBirth ? (
                      <Text style={{ color: textCol, marginBottom: 1.5 }}>
                        <Text style={{ fontFamily: fontBold, color: '#475569' }}>Date of Birth: </Text>
                        <Text>{personalInfo.dateOfBirth}</Text>
                      </Text>
                    ) : null}
                    {personalInfo.additionalInfo ? (
                      <Text style={{ color: textCol, marginBottom: 1.5 }}>
                        <Text style={{ fontFamily: fontBold, color: '#475569' }}>Details: </Text>
                        <Text>{personalInfo.additionalInfo}</Text>
                      </Text>
                    ) : null}
                    {personalInfo.otherProfiles ? (
                      <Text style={{ fontFamily: fontItalic, color: '#475569' }}>
                        {personalInfo.otherProfiles}
                      </Text>
                    ) : null}
                  </View>

                  <View style={{ width: '49%', fontSize: scale.metaPt, lineHeight: 1.38 }}>
                    {phones.map((ph, idx) => (
                      <Text key={idx} style={{ color: textCol, marginBottom: 1.5 }}>
                        <Text style={{ fontFamily: fontBold, color: '#475569' }}>{ph.label}: </Text>
                        <Link src={ph.url} style={{ color: textCol, textDecoration: 'none' }}>
                          {ph.raw}
                        </Link>
                      </Text>
                    ))}
                    {nonPhoneLinks.map((c, idx) => (
                      <Text key={idx} style={{ color: textCol, marginBottom: 1.5 }}>
                        <Text style={{ fontFamily: fontBold, color: '#475569', textTransform: 'capitalize' }}>
                          {c.kind}:{' '}
                        </Text>
                        {c.url ? (
                          <Link src={c.url} style={{ color: accent, textDecoration: 'none' }}>
                            {c.label}
                          </Link>
                        ) : (
                          <Text>{c.label}</Text>
                        )}
                      </Text>
                    ))}
                  </View>
                </View>
              </View>

              {safePhotoUrl ? (
                <View
                  style={{
                    width: isSquarePhoto ? 78 : 70,
                    height: isSquarePhoto ? 78 : 90,
                    padding: 1.5,
                    borderWidth: 1,
                    borderColor: accent,
                    backgroundColor: '#ffffff',
                  }}
                >
                  <Image
                    src={safePhotoUrl}
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover',
                    }}
                  />
                </View>
              ) : null}
            </View>

            {quoteText ? (
              <View
                style={{
                  marginTop: 6,
                  paddingLeft: 8,
                  borderLeftWidth: 2,
                  borderLeftColor: accent,
                }}
              >
                <Text
                  style={{
                    fontFamily: fontItalic,
                    fontSize: scale.bodyPt,
                    color: '#334155',
                    lineHeight: 1.35,
                  }}
                >
                  "{quoteText}"
                </Text>
              </View>
            ) : null}
          </View>
        );
      }

      case 'jakes-centered':
        return (
          <View style={{ textAlign: 'center', marginBottom: 4 }}>
            <Text
              style={{
                fontFamily: fontRegular,
                letterSpacing: 0.5,
                lineHeight: 1.12,
                color: textCol,
                textAlign: 'center',
                marginBottom: 2,
              }}
            >
              {renderSmallCapsName(nameText)}
            </Text>
            {locationText ? (
              <Text
                style={{
                  fontSize: scale.metaPt + 0.25,
                  color: textCol,
                  textAlign: 'center',
                  marginBottom: 2,
                  lineHeight: 1.25,
                }}
              >
                {locationText}
              </Text>
            ) : null}
            {contactLinks.length > 0 ? (
              <View
                style={{
                  flexDirection: 'row',
                  flexWrap: 'wrap',
                  justifyContent: 'center',
                  alignItems: 'center',
                  fontSize: scale.metaPt + 0.25,
                  lineHeight: 1.25,
                }}
              >
                {contactLinks.map((item, idx) => (
                  <View
                    key={idx}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      marginHorizontal: 4.5,
                      marginVertical: 1,
                    }}
                  >
                    {renderJakesContactIcon(item.kind, textCol)}
                    {item.url ? (
                      <Link
                        src={item.url}
                        style={{
                          color: textCol,
                          textDecoration: item.kind === 'phone' ? 'none' : 'underline',
                        }}
                      >
                        {item.label}
                      </Link>
                    ) : (
                      <Text style={{ color: textCol }}>{item.label}</Text>
                    )}
                  </View>
                ))}
              </View>
            ) : null}
          </View>
        );

      case 'software-dev-centered':
        return (
          <View style={{ textAlign: 'center', marginBottom: 6 }}>
            <Text
              style={{
                fontSize: scale.namePt,
                fontFamily: fontBold,
                letterSpacing: 0.4,
                lineHeight: 1.12,
                color: accent,
                textAlign: 'center',
                marginBottom: 2.5,
              }}
            >
              {nameText}
            </Text>
            {locationText ? (
              <Text
                style={{
                  fontSize: scale.metaPt + 0.25,
                  color: textCol,
                  textAlign: 'center',
                  marginBottom: 3,
                  lineHeight: 1.25,
                }}
              >
                {locationText}
              </Text>
            ) : null}
            {softwareDevContactItems.length > 0 ? (
              <View
                style={{
                  flexDirection: 'row',
                  flexWrap: 'wrap',
                  justifyContent: 'center',
                  alignItems: 'center',
                  fontSize: scale.metaPt + 0.15,
                  lineHeight: 1.25,
                }}
              >
                {softwareDevContactItems.map((item, idx) => (
                  <View
                    key={idx}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      marginHorizontal: 4.5,
                      marginVertical: 1.25,
                    }}
                  >
                    {renderJakesContactIcon(
                      item.kind === 'custom' ? 'website' : item.kind,
                      accent
                    )}
                    {item.url ? (
                      <Link
                        src={item.url}
                        style={{
                          color: textCol,
                          textDecoration: item.kind === 'phone' ? 'none' : 'underline',
                        }}
                      >
                        {item.label}
                      </Link>
                    ) : (
                      <Text style={{ color: textCol }}>{item.label}</Text>
                    )}
                  </View>
                ))}
              </View>
            ) : null}
          </View>
        );

      case 'harvard-centered':
        return (
          <View
            style={{
              textAlign: 'center',
              marginBottom: 6,
              paddingBottom: 4,
              borderBottomWidth: 0.75,
              borderBottomColor: textCol,
            }}
          >
            <Text
              style={{
                fontSize: scale.namePt,
                fontFamily: fontBold,
                letterSpacing: 0.35,
                lineHeight: 1.15,
                color: textCol,
                textAlign: 'center',
                marginBottom: 2.5,
              }}
            >
              {nameText}
            </Text>
            {harvardContactItems.length > 0 ? (
              <View
                style={{
                  flexDirection: 'row',
                  flexWrap: 'wrap',
                  justifyContent: 'center',
                  alignItems: 'center',
                  fontSize: scale.metaPt,
                  lineHeight: 1.3,
                }}
              >
                {harvardContactItems.map((item, idx) => (
                  <React.Fragment key={idx}>
                    {idx > 0 ? (
                      <Text style={{ color: textCol, marginHorizontal: 4 }}>·</Text>
                    ) : null}
                    {item.url ? (
                      <Link src={item.url} style={{ color: textCol, textDecoration: 'none' }}>
                        {item.label}
                      </Link>
                    ) : (
                      <Text style={{ color: textCol }}>{item.label}</Text>
                    )}
                  </React.Fragment>
                ))}
              </View>
            ) : null}
          </View>
        );

      case 'corporate-banner':
        return (
          <View
            style={{
              backgroundColor: accent,
              paddingVertical: 13,
              paddingHorizontal: 16,
              marginBottom: 8,
            }}
          >
            <Text
              style={{
                fontSize: scale.namePt,
                fontFamily: fontBold,
                textTransform: 'uppercase',
                letterSpacing: 1.5,
                lineHeight: 1.18,
                color: '#ffffff',
                marginBottom: 3,
              }}
            >
              {nameText}
            </Text>
            {personalInfo.jobTitle ? (
              <Text
                style={{
                  fontSize: scale.jobTitlePt,
                  fontFamily: fontBold,
                  textTransform: 'uppercase',
                  letterSpacing: 0.8,
                  color: '#f1f5f9',
                  marginBottom: 4,
                }}
              >
                {personalInfo.jobTitle}
              </Text>
            ) : null}
            {renderContactInline('•', '#ffffff', false)}
            {locationText ? (
              <Text style={{ fontSize: scale.metaPt, color: '#e2e8f0' }}>
                {locationText}
              </Text>
            ) : null}
            {personalInfo.otherProfiles ? (
              <Text
                style={{
                  fontSize: scale.metaPt - 0.5,
                  fontFamily: fontItalic,
                  color: '#e2e8f0',
                  marginTop: 2,
                }}
              >
                {personalInfo.otherProfiles}
              </Text>
            ) : null}
          </View>
        );

      case 'split-left-right':
        return (
          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'flex-end',
              paddingBottom: 7,
              marginBottom: 8,
              borderBottomWidth: 1.5,
              borderBottomColor: accent,
            }}
          >
            <View style={{ flex: 1, paddingRight: 12 }}>
              <Text
                style={{
                  fontSize: scale.namePt,
                  fontFamily: fontBold,
                  letterSpacing: 0.6,
                  lineHeight: 1.15,
                  color: accent === '#000000' ? textCol : accent,
                  marginBottom: 2,
                }}
              >
                {nameText}
              </Text>
              {personalInfo.jobTitle ? (
                <Text
                  style={{
                    fontSize: scale.jobTitlePt,
                    fontFamily: fontBold,
                    color: textCol,
                  }}
                >
                  {personalInfo.jobTitle}
                </Text>
              ) : null}
              {personalInfo.otherProfiles ? (
                <Text
                  style={{
                    fontSize: scale.metaPt - 0.5,
                    fontFamily: fontItalic,
                    color: '#4b5563',
                    marginTop: 2,
                  }}
                >
                  {personalInfo.otherProfiles}
                </Text>
              ) : null}
            </View>
            <View style={{ alignItems: 'flex-end', fontSize: scale.metaPt, lineHeight: 1.35 }}>
              {contactLinks.map((c, idx) =>
                c.url ? (
                  <Link key={idx} src={c.url} style={{ color: textCol, textDecoration: 'none' }}>
                    {c.label}
                  </Link>
                ) : (
                  <Text key={idx} style={{ color: textCol }}>
                    {c.label}
                  </Text>
                )
              )}
              {locationText ? <Text style={{ color: textCol }}>{locationText}</Text> : null}
            </View>
          </View>
        );

      case 'fresher-overleaf': {
        const cols = buildFresherHeaderColumns(personalInfo);
        const targetJob =
          personalInfo.jobTitle?.trim() || effectiveResume.targetRole?.trim() || '';
        const hiddenSet = new Set(effectiveResume.hiddenSections || []);
        const keywords = !hiddenSet.has('strengths')
          ? (effectiveResume.strengths || []).map((s) => s.trim()).filter(Boolean)
          : [];
        const impactText = !hiddenSet.has('objective')
          ? (effectiveResume.objective || '').trim()
          : '';

        return (
          <View style={{ marginBottom: 5 }}>
            <View
              style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'flex-end',
                paddingBottom: 5.5,
                borderBottomWidth: 0.75,
                borderBottomColor: '#334155',
              }}
            >
              {/* Left Column: Phone / Email / Optional Location */}
              <View style={{ width: '31%', paddingRight: 6, fontSize: scale.metaPt - 0.15, lineHeight: 1.32 }}>
                {cols.left.map((item, idx) =>
                  item.url ? (
                    <Link key={idx} src={item.url} style={{ color: textCol, textDecoration: 'none' }}>
                      {item.label}
                    </Link>
                  ) : (
                    <Text key={idx} style={{ color: textCol }}>
                      {item.label}
                    </Text>
                  )
                )}
              </View>

              {/* Center Column: Name + Target Job */}
              <View style={{ width: '43%', paddingHorizontal: 4, alignItems: 'center' }}>
                <Text
                  style={{
                    fontSize: scale.namePt,
                    fontFamily: fontRegular,
                    lineHeight: 1.12,
                    letterSpacing: 0.2,
                    color: '#111827',
                    textAlign: 'center',
                    marginBottom: targetJob ? 1.5 : 0,
                  }}
                >
                  {nameText}
                </Text>
                {targetJob ? (
                  <Text
                    style={{
                      fontSize: scale.jobTitlePt,
                      fontFamily: fontRegular,
                      color: accent,
                      textAlign: 'center',
                      lineHeight: 1.2,
                    }}
                  >
                    {targetJob}
                  </Text>
                ) : null}
              </View>

              {/* Right Column: LinkedIn / Portfolio / GitHub / Custom */}
              <View style={{ width: '26%', paddingLeft: 6, alignItems: 'flex-end', fontSize: scale.metaPt - 0.15, lineHeight: 1.32 }}>
                {cols.right.map((item, idx) =>
                  item.url ? (
                    <Link key={idx} src={item.url} style={{ color: textCol, textDecoration: 'none', textAlign: 'right' }}>
                      {item.label}
                    </Link>
                  ) : (
                    <Text key={idx} style={{ color: textCol, textAlign: 'right' }}>
                      {item.label}
                    </Text>
                  )
                )}
              </View>
            </View>

            {/* Optional Highlights Keywords & Impact Strip */}
            {keywords.length > 0 || impactText ? (
              <View style={{ marginTop: 4.5, marginBottom: 2 }}>
                {keywords.length > 0 ? (
                  <View
                    style={{
                      flexDirection: 'row',
                      flexWrap: 'wrap',
                      justifyContent: 'space-around',
                      marginBottom: impactText ? 3.5 : 0,
                    }}
                  >
                    {keywords.map((kw, idx) => (
                      <Text
                        key={idx}
                        style={{
                          fontSize: scale.bodyPt - 0.1,
                          color: textCol,
                          lineHeight: 1.3,
                          marginHorizontal: 5,
                          marginBottom: 1.5,
                        }}
                      >
                        • {kw}
                      </Text>
                    ))}
                  </View>
                ) : null}
                {impactText ? (
                  <Text
                    style={{
                      fontSize: scale.bodyPt - 0.1,
                      lineHeight: scale.lineHeight,
                      color: textCol,
                    }}
                  >
                    <Text style={{ fontFamily: fontBold }}>Impact: </Text>
                    <Text>{impactText}</Text>
                  </Text>
                ) : null}
              </View>
            ) : null}
          </View>
        );
      }

      case 'modern-corporate-split': {
        const words = nameText.trim().split(/\s+/).filter(Boolean);
        const firstPart = words.length > 1 ? words.slice(0, -1).join(' ') : '';
        const lastPart = words.length > 0 ? words[words.length - 1] : nameText;
        const mcContacts = buildModernCorporateContactItems(personalInfo);
        const rawPhoto = personalInfo.photoUrl?.trim() || '';
        const safePhotoUrl =
          rawPhoto.startsWith('data:image/jpeg') ||
          rawPhoto.startsWith('data:image/png') ||
          rawPhoto.startsWith('https://') ||
          rawPhoto.startsWith('http://')
            ? rawPhoto
            : '';
        const quoteText = effectiveResume.personalQuote?.trim();

        return (
          <View style={{ marginBottom: 10 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <View style={{ flex: 1, paddingTop: 10, paddingRight: 12 }}>
                <Text
                  style={{
                    fontSize: scale.namePt,
                    fontFamily: fontRegular,
                    lineHeight: 1.08,
                    letterSpacing: 0.2,
                    marginBottom: personalInfo.jobTitle?.trim() ? 4 : 0,
                  }}
                >
                  {firstPart ? <Text style={{ color: '#6b7280' }}>{firstPart} </Text> : null}
                  <Text style={{ color: '#111827' }}>{lastPart}</Text>
                </Text>
                {personalInfo.jobTitle?.trim() ? (
                  <Text
                    style={{
                      fontFamily: fontItalic,
                      fontSize: scale.jobTitlePt,
                      color: '#4b5563',
                      lineHeight: 1.25,
                    }}
                  >
                    {personalInfo.jobTitle.trim()}
                  </Text>
                ) : null}
              </View>

              <View style={{ flexDirection: 'row', alignItems: 'flex-start', maxWidth: '56%' }}>
                <View
                  style={{
                    alignItems: 'flex-end',
                    marginRight: safePhotoUrl ? 10 : 0,
                  }}
                >
                  {mcContacts.map((item, idx) => (
                    <View
                      key={idx}
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'flex-end',
                        marginBottom: 1.2,
                      }}
                    >
                      {renderModerncvContactIcon(item.kind, '#374151')}
                      {item.url ? (
                        <Link
                          src={item.url}
                          style={{
                            fontFamily: fontItalic,
                            fontSize: scale.metaPt - 0.15,
                            color: '#4b5563',
                            lineHeight: 1.3,
                            textDecoration: 'none',
                          }}
                        >
                          {item.label}
                        </Link>
                      ) : (
                        <Text
                          style={{
                            fontFamily: fontItalic,
                            fontSize: scale.metaPt - 0.15,
                            color: '#4b5563',
                            lineHeight: 1.3,
                          }}
                        >
                          {item.label}
                        </Text>
                      )}
                    </View>
                  ))}
                </View>

                {safePhotoUrl ? (
                  <View
                    style={{
                      borderWidth: 0.75,
                      borderColor: accent,
                      padding: 2,
                      backgroundColor: '#ffffff',
                    }}
                  >
                    <Image
                      src={safePhotoUrl}
                      style={{
                        width: 52,
                        height: 64,
                        objectFit: 'cover',
                      }}
                    />
                  </View>
                ) : null}
              </View>
            </View>

            {quoteText ? (
              <Text
                style={{
                  fontFamily: fontItalic,
                  textAlign: 'center',
                  fontSize: scale.bodyPt + 0.5,
                  color: accent,
                  marginTop: 9,
                  marginBottom: 2,
                  paddingHorizontal: 24,
                  lineHeight: 1.35,
                }}
              >
                {quoteText}
              </Text>
            ) : null}
          </View>
        );
      }

      case 'editorial-double-rule':
        if (isElegantSerif) {
          const metaRows = buildElegantSerifMetadataRows(effectiveResume);
          const contactItems = buildElegantSerifContactItems(personalInfo);
          const rawPhoto = personalInfo.photoUrl?.trim() || '';
          const safePhotoUrl =
            rawPhoto.startsWith('data:image/jpeg') ||
            rawPhoto.startsWith('data:image/png') ||
            rawPhoto.startsWith('https://') ||
            rawPhoto.startsWith('http://')
              ? rawPhoto
              : '';

          return (
            <View style={{ marginBottom: 9 }}>
              <View style={{ flexDirection: 'row', alignItems: 'stretch' }}>
                {safePhotoUrl ? (
                  <Image
                    src={safePhotoUrl}
                    style={{
                      width: 54,
                      height: 68,
                      objectFit: 'cover',
                      borderWidth: 0.75,
                      borderColor: '#d1d5db',
                      marginRight: 8,
                    }}
                  />
                ) : null}
                <View
                  style={{
                    flex: 1,
                    backgroundColor: '#e6e6e6',
                    paddingTop: 10,
                    paddingBottom: 10,
                    paddingLeft: 14,
                    paddingRight: 14,
                    flexDirection: 'row',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                  }}
                >
                  <View style={{ width: '53%' }}>
                    <Text
                      style={{
                        fontFamily: fontBold,
                        fontSize: scale.namePt,
                        lineHeight: 1.12,
                        color: '#111111',
                        marginBottom: metaRows.length > 0 ? 4 : 0,
                      }}
                    >
                      {nameText}
                    </Text>
                    {metaRows.map((row, rIdx) => (
                      <View
                        key={rIdx}
                        style={{
                          flexDirection: 'row',
                          alignItems: 'flex-start',
                          marginBottom: rIdx < metaRows.length - 1 ? 1.5 : 0,
                        }}
                      >
                        {renderEditorialMetaIcon(row.kind, '#1f2937')}
                        <Text
                          style={{
                            flex: 1,
                            fontSize: scale.metaPt - 0.15,
                            color: '#1f2937',
                            lineHeight: 1.32,
                          }}
                        >
                          {row.label}
                        </Text>
                      </View>
                    ))}
                  </View>

                  <View style={{ width: '45%' }}>
                    {contactItems.map((c, cIdx) => (
                      <View
                        key={cIdx}
                        style={{
                          flexDirection: 'row',
                          alignItems: 'flex-start',
                          marginBottom: cIdx < contactItems.length - 1 ? 1.5 : 0,
                        }}
                      >
                        {renderEditorialContactIcon(c.kind, '#1f2937')}
                        {c.url ? (
                          <Link
                            src={c.url}
                            style={{
                              flex: 1,
                              fontSize: scale.metaPt - 0.15,
                              color: '#111111',
                              lineHeight: 1.32,
                              textDecoration: 'none',
                            }}
                          >
                            {c.label}
                          </Link>
                        ) : (
                          <Text
                            style={{
                              flex: 1,
                              fontSize: scale.metaPt - 0.15,
                              color: '#111111',
                              lineHeight: 1.32,
                            }}
                          >
                            {c.label}
                          </Text>
                        )}
                      </View>
                    ))}
                  </View>
                </View>
              </View>
            </View>
          );
        }

        return (
          <View
            style={{
              borderTopWidth: 1.5,
              borderTopColor: accent,
              paddingTop: 4,
              paddingBottom: 8,
              marginBottom: 8,
              borderBottomWidth: 0.75,
              borderBottomColor: accent,
            }}
          >
            <View
              style={{
                borderTopWidth: 0.5,
                borderTopColor: accent,
                paddingTop: 6,
                textAlign: 'center',
              }}
            >
              <Text
                style={{
                  fontSize: scale.namePt + 1,
                  fontFamily: fontBold,
                  letterSpacing: 1.5,
                  lineHeight: 1.18,
                  color: accent,
                  textAlign: 'center',
                  marginBottom: 3,
                }}
              >
                {nameText}
              </Text>
              {personalInfo.jobTitle ? (
                <Text
                  style={{
                    fontSize: scale.jobTitlePt,
                    fontFamily: fontItalic,
                    color: textCol,
                    textAlign: 'center',
                    marginBottom: 4,
                  }}
                >
                  {personalInfo.jobTitle}
                </Text>
              ) : null}
              {renderContactInline('·', textCol, true)}
              {locationText ? (
                <Text style={{ fontSize: scale.metaPt, textAlign: 'center', color: textCol }}>
                  {locationText}
                </Text>
              ) : null}
              {personalInfo.otherProfiles ? (
                <Text
                  style={{
                    fontSize: scale.metaPt - 0.5,
                    fontFamily: fontItalic,
                    textAlign: 'center',
                    color: '#374151',
                    marginTop: 1,
                  }}
                >
                  {personalInfo.otherProfiles}
                </Text>
              ) : null}
            </View>
          </View>
        );

      case 'minimal-accent-bar':
        return (
          <View style={{ marginBottom: 8, paddingBottom: 5 }}>
            <Text
              style={{
                fontSize: scale.namePt,
                fontFamily: fontBold,
                letterSpacing: 0.4,
                lineHeight: 1.15,
                color: textCol,
                marginBottom: 4,
              }}
            >
              {nameText}
            </Text>
            <View
              style={{
                width: 36,
                height: 2.5,
                backgroundColor: accent,
                marginBottom: 5,
              }}
            />
            {personalInfo.jobTitle ? (
              <Text
                style={{
                  fontSize: scale.jobTitlePt,
                  fontFamily: fontBold,
                  color: accent,
                  marginBottom: 3,
                }}
              >
                {personalInfo.jobTitle}
              </Text>
            ) : null}
            {renderContactInline('·', textCol, false)}
            {locationText ? (
              <Text style={{ fontSize: scale.metaPt, color: '#4b5563' }}>
                {locationText}
              </Text>
            ) : null}
            {personalInfo.otherProfiles ? (
              <Text
                style={{
                  fontSize: scale.metaPt - 0.5,
                  fontFamily: fontItalic,
                  color: '#4b5563',
                  marginTop: 1,
                }}
              >
                {personalInfo.otherProfiles}
              </Text>
            ) : null}
          </View>
        );

      case 'boxed-technical':
        return (
          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
              borderWidth: 1,
              borderColor: accent,
              backgroundColor: hexToLightSolidBg(accent, 0.95),
              paddingVertical: 9,
              paddingHorizontal: 12,
              marginBottom: 8,
            }}
          >
            <View style={{ flex: 1, paddingRight: 10 }}>
              <Text
                style={{
                  fontSize: scale.namePt - 1,
                  fontFamily: fontBold,
                  textTransform: 'uppercase',
                  letterSpacing: 1,
                  lineHeight: 1.18,
                  color: accent,
                  marginBottom: 2,
                }}
              >
                {nameText}
              </Text>
              {personalInfo.jobTitle ? (
                <Text
                  style={{
                    fontSize: scale.jobTitlePt - 0.5,
                    fontFamily: fontBold,
                    color: textCol,
                  }}
                >
                  {personalInfo.jobTitle}
                </Text>
              ) : null}
              {locationText ? (
                <Text style={{ fontSize: scale.metaPt - 0.5, color: '#4b5563', marginTop: 2 }}>
                  {locationText}
                </Text>
              ) : null}
            </View>
            <View style={{ alignItems: 'flex-end', fontSize: scale.metaPt - 0.5, lineHeight: 1.35 }}>
              {contactLinks.map((c, idx) =>
                c.url ? (
                  <Link key={idx} src={c.url} style={{ color: textCol, textDecoration: 'none' }}>
                    {c.label}
                  </Link>
                ) : (
                  <Text key={idx} style={{ color: textCol }}>
                    {c.label}
                  </Text>
                )
              )}
            </View>
          </View>
        );

      case 'executive-framed':
        return (
          <View
            style={{
              borderTopWidth: 2,
              borderTopColor: accent,
              borderBottomWidth: 0.75,
              borderBottomColor: '#cbd5e1',
              paddingTop: 8,
              paddingBottom: 8,
              marginBottom: 8,
              textAlign: 'center',
            }}
          >
            <Text
              style={{
                fontSize: scale.namePt,
                fontFamily: fontBold,
                textTransform: 'uppercase',
                letterSpacing: 2.8,
                lineHeight: 1.2,
                color: textCol,
                textAlign: 'center',
                marginBottom: 3,
              }}
            >
              {nameText}
            </Text>
            {personalInfo.jobTitle ? (
              <Text
                style={{
                  fontSize: scale.jobTitlePt,
                  fontFamily: fontBold,
                  textTransform: 'uppercase',
                  letterSpacing: 1,
                  color: accent,
                  textAlign: 'center',
                  marginBottom: 4,
                }}
              >
                {personalInfo.jobTitle}
              </Text>
            ) : null}
            {renderContactInline('|', textCol, true)}
            {locationText ? (
              <Text style={{ fontSize: scale.metaPt, textAlign: 'center', color: '#4b5563' }}>
                {locationText}
              </Text>
            ) : null}
          </View>
        );

      case 'left-scholar':
        return (
          <View
            style={{
              paddingBottom: 7,
              marginBottom: 8,
              borderBottomWidth: 1.25,
              borderBottomColor: accent,
            }}
          >
            <Text
              style={{
                fontSize: scale.namePt,
                fontFamily: fontBold,
                letterSpacing: 0.5,
                lineHeight: 1.18,
                color: textCol,
                marginBottom: 2,
              }}
            >
              {nameText}
            </Text>
            {personalInfo.jobTitle ? (
              <Text
                style={{
                  fontSize: scale.jobTitlePt,
                  fontFamily: fontBold,
                  color: accent,
                  marginBottom: 3,
                }}
              >
                {personalInfo.jobTitle}
              </Text>
            ) : null}
            {renderContactInline('|', textCol, false)}
            {locationText ? (
              <Text style={{ fontSize: scale.metaPt, color: textCol, marginBottom: 2 }}>
                {locationText}
              </Text>
            ) : null}
            {personalInfo.otherProfiles ? (
              <Text
                style={{
                  fontSize: scale.metaPt,
                  fontFamily: fontItalic,
                  color: accent,
                }}
              >
                {personalInfo.otherProfiles}
              </Text>
            ) : null}
          </View>
        );

      case 'centered-clean':
        return (
          <View
            style={{
              paddingBottom: 6,
              marginBottom: 7,
              borderBottomWidth: 0.75,
              borderBottomColor: accent,
              textAlign: 'center',
            }}
          >
            <Text
              style={{
                fontSize: scale.namePt,
                fontFamily: fontBold,
                letterSpacing: 0.8,
                lineHeight: 1.18,
                color: textCol,
                textAlign: 'center',
                marginBottom: 2,
              }}
            >
              {nameText}
            </Text>
            {personalInfo.jobTitle ? (
              <Text
                style={{
                  fontSize: scale.jobTitlePt,
                  fontFamily: fontBold,
                  color: accent,
                  textAlign: 'center',
                  marginBottom: 3,
                }}
              >
                {personalInfo.jobTitle}
              </Text>
            ) : null}
            {renderContactInline('|', textCol, true)}
            {locationText ? (
              <Text style={{ fontSize: scale.metaPt, textAlign: 'center', color: textCol }}>
                {locationText}
              </Text>
            ) : null}
            {personalInfo.otherProfiles ? (
              <Text
                style={{
                  fontSize: scale.metaPt - 0.5,
                  fontFamily: fontItalic,
                  textAlign: 'center',
                  color: '#374151',
                  marginTop: 1,
                }}
              >
                {personalInfo.otherProfiles}
              </Text>
            ) : null}
          </View>
        );

      case 'centered-academic':
      default:
        return (
          <View
            style={{
              textAlign: 'center',
              marginBottom: 10,
              paddingBottom: 7,
              borderBottomWidth: 1.5,
              borderBottomColor: accent,
            }}
          >
            <Text
              style={{
                fontSize: scale.namePt,
                fontFamily: fontBold,
                textTransform: 'uppercase',
                letterSpacing: 2.5,
                textAlign: 'center',
                marginBottom: 3,
                lineHeight: 1.2,
                color: textCol,
              }}
            >
              {nameText}
            </Text>
            {personalInfo.jobTitle ? (
              <Text
                style={{
                  fontSize: scale.jobTitlePt,
                  fontFamily: fontBold,
                  textTransform: 'uppercase',
                  letterSpacing: 0.8,
                  textAlign: 'center',
                  marginBottom: 3,
                  color: textCol,
                }}
              >
                {personalInfo.jobTitle}
              </Text>
            ) : null}
            {renderContactInline('•', textCol, true)}
            {locationText ? (
              <Text style={{ fontSize: scale.metaPt, textAlign: 'center', marginBottom: 2, color: textCol }}>
                {locationText}
              </Text>
            ) : null}
            {personalInfo.otherProfiles ? (
              <Text
                style={{
                  fontSize: scale.metaPt - 0.5,
                  fontFamily: fontItalic,
                  textAlign: 'center',
                  color: '#222222',
                  marginTop: 1,
                }}
              >
                {personalInfo.otherProfiles}
              </Text>
            ) : null}
          </View>
        );
    }
  };

  const renderPublicationCitation = (pub: PublicationItem, col: string) => {
    const { doiUrl, venue } = getPublicationParts(pub);

    if (pub.type === 'patent') {
      return (
        <Text style={{ flex: 1, fontSize: scale.bodyPt, lineHeight: scale.lineHeight, color: col }}>
          <Text style={{ fontFamily: fontBold }}>{pub.authors || ''}</Text>
          {pub.year ? <Text> ({pub.year}). </Text> : <Text>. </Text>}
          <Text>"{pub.title || ''}" </Text>
          <Text style={{ fontFamily: fontItalic }}>
            {pub.patentNumber || 'Patent Application'}
          </Text>
          {pub.status ? <Text> ({pub.status})</Text> : null}
          <Text>.</Text>
          {pub.publicationDate ? <Text> Issued {pub.publicationDate}.</Text> : null}
        </Text>
      );
    }

    return (
      <Text style={{ flex: 1, fontSize: scale.bodyPt, lineHeight: scale.lineHeight, color: col }}>
        <Text style={{ fontFamily: fontBold }}>{pub.authors || ''}</Text>
        {pub.year ? <Text> ({pub.year}). </Text> : <Text>. </Text>}
        <Text>"{pub.title || ''}" </Text>
        {venue ? <Text style={{ fontFamily: fontItalic }}>{venue}</Text> : null}
        {pub.volume ? <Text>, {pub.volume}</Text> : null}
        {pub.issue ? <Text>({pub.issue})</Text> : null}
        {pub.pages ? <Text>, pp. {pub.pages}</Text> : null}
        <Text>.</Text>
        {pub.location ? <Text> {pub.location}.</Text> : null}
        {pub.status && pub.status !== 'Published' ? <Text> [{pub.status}]</Text> : null}
        {pub.doi ? (
          <Text>
            {' '}
            DOI:{' '}
            {doiUrl ? (
              <Link src={doiUrl} style={{ color: col, textDecoration: 'none' }}>
                {pub.doi}
              </Link>
            ) : (
              pub.doi
            )}
          </Text>
        ) : null}
      </Text>
    );
  };

  const renderSection = (
    key: ResumeSectionKey,
    opts: { isSidebar: boolean; inverted: boolean; slice?: EditorialPdfSectionSlice }
  ) => {
    const title = getSectionDisplayTitle(key, template.id);
    const col = opts.inverted ? '#ffffff' : textCol;
    const subCol = opts.inverted ? '#e2e8f0' : '#1a1a1a';
    const metaCol = opts.inverted ? '#cbd5e1' : '#222222';
    const showEditorialHeading = !opts.slice || opts.slice.includeHeading;
    const sliceItems = <T,>(arr: T[]): T[] =>
      opts.slice && (isEditorialTwoColumn || isInternshipResume)
        ? arr.slice(opts.slice.sliceStart, opts.slice.sliceEnd)
        : arr;

    const wrapAsymmetric = (
      content: React.ReactNode,
      showLabel = true,
      rowKey?: string | number
    ) => {
      if (!isAsymmetric) return content;
      return (
        <View key={rowKey} style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
          <View style={{ width: '24%', paddingRight: 12 }}>
            {showLabel ? (
              <Text
                style={{
                  fontSize: scale.headingPt - 0.75,
                  fontFamily: fontBold,
                  textTransform: 'uppercase',
                  letterSpacing: 0.9,
                  color: accent,
                  lineHeight: 1.35,
                }}
              >
                {title}
              </Text>
            ) : null}
          </View>
          <View style={{ width: '76%' }}>{content}</View>
        </View>
      );
    };

    const sectionMinAheadMap: Record<ResumeSectionKey, number> = {
      objective: 36,
      education: 50,
      thesis: 45,
      coursework: 36,
      experience: 55,
      research: 45,
      publications: 45,
      projects: 50,
      'daily-life': 85,
      philosophy: 36,
      strengths: 36,
      languages: 36,
      skills: 36,
      'skill-matrix': 42,
      learning: 40,
      interests: 36,
      'career-interests': 36,
      'custom-sections': 42,
      achievements: 42,
      leadership: 45,
      volunteer: 45,
      memberships: 36,
      certifications: 36,
      additional: 36,
      references: 60,
    };

    const estimateEditorialBlockPt = (textParts: Array<string | undefined | null>, basePt = 28): number => {
      const lineStepPt = scale.bodyPt * scale.lineHeight;
      let lines = 0;
      textParts.forEach((raw) => {
        const clean = raw?.trim();
        if (!clean) return;
        lines += Math.max(1, Math.ceil(clean.length / 40));
      });
      return Math.min(220, Math.max(48, Math.round(basePt + lines * lineStepPt)));
    };

    const getEditorialMinAhead = (sectionKey: ResumeSectionKey): number => {
      switch (sectionKey) {
        case 'research': {
          const r = effectiveResume.researchExperience?.[0];
          if (!r) return 85;
          return estimateEditorialBlockPt(
            [
              r.title,
              [r.role, r.domain].filter(Boolean).join(' · '),
              [r.institution, r.location, r.supervisor].filter(Boolean).join(' '),
              r.objectives ? `Objectives: ${r.objectives}` : '',
              r.methodology ? `Methodology: ${r.methodology}` : '',
              r.findings ? `Findings: ${r.findings}` : '',
              r.outcomes ? `Outcomes: ${r.outcomes}` : '',
              r.technologies?.length ? r.technologies.join(', ') : '',
              r.publications,
            ],
            34
          );
        }
        case 'education': {
          const e = effectiveResume.education?.[0];
          if (!e) return 85;
          return estimateEditorialBlockPt(
            [e.degree, e.institution, e.department, e.grade, e.thesisTitle, e.dissertationDetails, e.honors, e.description],
            30
          );
        }
        case 'experience': {
          const x = effectiveResume.experience?.[0];
          if (!x) return 90;
          return estimateEditorialBlockPt(
            [x.position, x.company, x.description, x.highlights?.[0]],
            32
          );
        }
        case 'projects': {
          const p = effectiveResume.projects?.[0];
          if (!p) return 85;
          return estimateEditorialBlockPt(
            [p.title, p.institution, p.description, p.highlights?.[0]],
            30
          );
        }
        case 'publications': {
          const pub = effectiveResume.publications?.[0];
          if (!pub) return 65;
          return estimateEditorialBlockPt([pub.title, pub.authors, pub.journalOrConference || pub.publisher], 26);
        }
        case 'achievements': {
          const ach = effectiveResume.achievements?.[0];
          if (!ach) return 60;
          return estimateEditorialBlockPt([ach.title, ach.issuer, ach.description], 26);
        }
        case 'leadership': {
          const l = effectiveResume.leadership?.[0];
          if (!l) return 70;
          return estimateEditorialBlockPt([l.role, l.organization, l.highlights?.[0]], 28);
        }
        case 'certifications': {
          const c = effectiveResume.certifications?.[0];
          return estimateEditorialBlockPt(c ? [c.name, c.issuer] : [], 24);
        }
        case 'memberships': {
          const m = effectiveResume.memberships?.[0];
          return estimateEditorialBlockPt(m ? [m.organization, m.membershipType] : [], 24);
        }
        case 'languages':
          return 58;
        case 'skills':
          return 68;
        case 'interests':
          return 68;
        case 'references':
          return 72;
        default:
          return sectionMinAheadMap[sectionKey] ?? 48;
      }
    };

    const headingIfNormal = isAsymmetric
      ? null
      : renderSectionHeading(title, {
          inverted: opts.inverted,
          compact: opts.isSidebar,
          disableMinAhead: isElegantSerif || isInternshipResume,
          minAhead: sectionMinAheadMap[key] ?? 42,
        });

    switch (key) {
      case 'objective': {
        if (isElegantSerif) {
          const paragraphs = (effectiveResume.objective || '')
            .split(/\n\s*\n/)
            .map((p) => p.trim())
            .filter(Boolean);
          const extraProfileFields = [
            effectiveResume.academicInterests?.trim()
              ? { label: 'Academic Interests', value: effectiveResume.academicInterests.trim() }
              : null,
            effectiveResume.careerGoals?.trim()
              ? { label: 'Career Goals', value: effectiveResume.careerGoals.trim() }
              : null,
          ].filter(Boolean) as Array<{ label: string; value: string }>;

          return (
            <View key={key} style={{ marginTop: scale.sectionGapPt, marginBottom: 4 }}>
              <View wrap={false}>
                {headingIfNormal}
                {paragraphs[0] ? (
                  <Text
                    style={{
                      fontSize: scale.bodyPt,
                      lineHeight: scale.lineHeight,
                      color: col,
                      marginBottom: paragraphs.length > 1 || extraProfileFields.length > 0 ? 3 : 0,
                    }}
                  >
                    {paragraphs[0]}
                  </Text>
                ) : extraProfileFields[0] ? (
                  <Text
                    style={{
                      fontSize: scale.bodyPt,
                      lineHeight: scale.lineHeight,
                      color: col,
                      marginBottom: extraProfileFields.length > 1 ? 2 : 0,
                    }}
                  >
                    <Text style={{ fontFamily: fontBold }}>{extraProfileFields[0].label}: </Text>
                    <Text style={{ color: '#374151' }}>{extraProfileFields[0].value}</Text>
                  </Text>
                ) : null}
              </View>
              {paragraphs.slice(1).map((para, pIdx) => (
                <Text
                  key={pIdx + 1}
                  style={{
                    fontSize: scale.bodyPt,
                    lineHeight: scale.lineHeight,
                    color: col,
                    marginBottom: pIdx + 1 < paragraphs.length - 1 || extraProfileFields.length > 0 ? 3 : 0,
                  }}
                >
                  {para}
                </Text>
              ))}
              {(paragraphs.length > 0 ? extraProfileFields : extraProfileFields.slice(1)).map((item, eIdx, arr) => (
                <Text
                  key={item.label}
                  style={{
                    fontSize: scale.bodyPt,
                    lineHeight: scale.lineHeight,
                    color: col,
                    marginBottom: eIdx < arr.length - 1 ? 2 : 0,
                  }}
                >
                  <Text style={{ fontFamily: fontBold }}>{item.label}: </Text>
                  <Text style={{ color: '#374151' }}>{item.value}</Text>
                </Text>
              ))}
            </View>
          );
        }

        if (isModernCorporate) {
          const paragraphs = (effectiveResume.objective || '')
            .trim()
            .split(/\n+/)
            .map((p) => p.trim())
            .filter(Boolean);
          if (paragraphs.length === 0) return null;
          return (
            <View key={key} style={{ marginTop: scale.sectionGapPt, marginBottom: 4 }}>
              <View wrap={false}>
                {headingIfNormal}
                {renderModerncvRow(
                  null,
                  <Text
                    style={{
                      fontSize: scale.bodyPt,
                      lineHeight: scale.lineHeight,
                      color: col,
                    }}
                  >
                    {paragraphs[0]}
                  </Text>,
                  true
                )}
              </View>
              {paragraphs.slice(1).map((para, pIdx) => (
                <View key={`mc-obj-${pIdx + 1}`} style={{ marginTop: 2.5 }}>
                  {renderModerncvRow(
                    null,
                    <Text
                      style={{
                        fontSize: scale.bodyPt,
                        lineHeight: scale.lineHeight,
                        color: col,
                      }}
                    >
                      {para}
                    </Text>,
                    true
                  )}
                </View>
              ))}
            </View>
          );
        }

        return (
          <View key={key} style={{ marginTop: scale.sectionGapPt, marginBottom: 4 }}>
            {headingIfNormal}
            {wrapAsymmetric(
              <Text
                style={{
                  fontSize: scale.baseFontPt - 0.25,
                  textAlign: 'justify',
                  lineHeight: scale.lineHeight,
                  color: col,
                }}
              >
                {(effectiveResume.objective || '').trim()}
              </Text>,
              true
            )}
          </View>
        );
      }

      case 'education': {
        if (isHarvard) {
          const hiddenSet = new Set(effectiveResume.hiddenSections || []);
          const univEntries = effectiveResume.education || [];
          const studyAbroadEntries = !hiddenSet.has('study-abroad')
            ? (effectiveResume.studyAbroad || []).filter(
                (s) => s.institution?.trim() || s.coursework?.trim()
              )
            : [];
          const highSchoolEntries = !hiddenSet.has('high-school')
            ? (effectiveResume.highSchool || []).filter((h) => h.schoolName?.trim())
            : [];

          return (
            <View key={key} style={{ marginTop: scale.sectionGapPt, marginBottom: 4 }}>
              {headingIfNormal}
              {univEntries.map((edu) => {
                const degreeLine = [edu.degree, edu.specialization].filter(Boolean).join(', ');
                const dateRange = [
                  edu.startDate?.trim(),
                  edu.endDate?.trim() || (edu.current ? 'Present' : ''),
                ]
                  .filter(Boolean)
                  .join(' – ');
                const honorsText = edu.honors?.trim() || edu.achievements?.trim() || '';
                const courseworkList = (
                  Array.isArray(edu.coursework)
                    ? edu.coursework
                    : typeof edu.coursework === 'string'
                    ? edu.coursework.split(',')
                    : []
                )
                  .map((c) => c.trim())
                  .filter(Boolean);

                return (
                  <View key={edu.id} style={{ marginBottom: scale.entryGapPt }} wrap={false}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 0.5 }}>
                      <Text style={{ fontFamily: fontBold, fontSize: scale.entryTitlePt, color: col, flex: 1, marginRight: 8 }}>
                        {edu.institution}
                      </Text>
                      {edu.location ? (
                        <Text style={{ fontFamily: fontRegular, fontSize: scale.entrySubtitlePt, color: col, textAlign: 'right' }}>
                          {edu.location}
                        </Text>
                      ) : null}
                    </View>
                    {degreeLine || dateRange ? (
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 1 }}>
                        <Text style={{ fontFamily: fontItalic, fontSize: scale.entrySubtitlePt, color: col, flex: 1, marginRight: 8 }}>
                          {degreeLine}
                        </Text>
                        {dateRange ? (
                          <Text style={{ fontSize: scale.metaPt, color: metaCol, textAlign: 'right' }}>
                            {dateRange}
                          </Text>
                        ) : null}
                      </View>
                    ) : null}
                    {edu.grade?.trim() ? (
                      <Text style={{ fontSize: scale.bodyPt, color: col, lineHeight: scale.lineHeight }}>
                        <Text style={{ fontFamily: fontBold }}>GPA: </Text>
                        {edu.grade.trim()}
                      </Text>
                    ) : null}
                    {edu.thesisTitle?.trim() ? (
                      <Text style={{ fontSize: scale.bodyPt, color: col, lineHeight: scale.lineHeight }}>
                        <Text style={{ fontFamily: fontBold }}>Thesis: </Text>
                        {edu.thesisTitle.trim()}
                      </Text>
                    ) : null}
                    {courseworkList.length > 0 ? (
                      <Text style={{ fontSize: scale.bodyPt, color: col, lineHeight: scale.lineHeight }}>
                        <Text style={{ fontFamily: fontBold }}>Relevant Coursework: </Text>
                        {courseworkList.join(', ')}
                      </Text>
                    ) : null}
                    {honorsText ? (
                      <Text style={{ fontSize: scale.bodyPt, color: col, lineHeight: scale.lineHeight }}>
                        <Text style={{ fontFamily: fontBold }}>Awards &amp; Honors: </Text>
                        {honorsText}
                      </Text>
                    ) : null}
                    {edu.description?.trim() ? (
                      <Text style={{ fontSize: scale.bodyPt, color: subCol, lineHeight: scale.lineHeight, marginTop: 1 }}>
                        {edu.description.trim()}
                      </Text>
                    ) : null}
                  </View>
                );
              })}

              {studyAbroadEntries.length > 0 ? (
                <View style={{ marginTop: univEntries.length > 0 ? 2 : 0 }}>
                  {univEntries.length > 0 ? (
                    <Text
                      minPresenceAhead={30}
                      style={{
                        fontFamily: fontBold,
                        fontSize: scale.metaPt - 0.5,
                        textTransform: 'uppercase',
                        letterSpacing: 0.4,
                        color: metaCol,
                        marginBottom: 1.5,
                      }}
                    >
                      Study Abroad
                    </Text>
                  ) : null}
                  {studyAbroadEntries.map((sa) => {
                    const dateRange = [sa.startDate?.trim(), sa.endDate?.trim()].filter(Boolean).join(' – ');
                    const saLocation = sa.cityCountry?.trim() || sa.location?.trim() || '';
                    return (
                      <View key={sa.id} style={{ marginBottom: scale.entryGapPt }} wrap={false}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 0.5 }}>
                          <Text style={{ fontFamily: fontBold, fontSize: scale.entryTitlePt, color: col, flex: 1, marginRight: 8 }}>
                            {sa.institution}
                          </Text>
                          {saLocation ? (
                            <Text style={{ fontSize: scale.entrySubtitlePt, color: col, textAlign: 'right' }}>
                              {saLocation}
                            </Text>
                          ) : null}
                        </View>
                        {sa.coursework?.trim() || dateRange ? (
                          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' }}>
                            <Text style={{ fontFamily: fontItalic, fontSize: scale.bodyPt, color: col, flex: 1, marginRight: 8, lineHeight: scale.lineHeight }}>
                              {sa.coursework?.trim() || ''}
                            </Text>
                            {dateRange ? (
                              <Text style={{ fontSize: scale.metaPt, color: metaCol, textAlign: 'right' }}>
                                {dateRange}
                              </Text>
                            ) : null}
                          </View>
                        ) : null}
                      </View>
                    );
                  })}
                </View>
              ) : null}

              {highSchoolEntries.length > 0 ? (
                <View style={{ marginTop: univEntries.length > 0 || studyAbroadEntries.length > 0 ? 2 : 0 }}>
                  {univEntries.length > 0 || studyAbroadEntries.length > 0 ? (
                    <Text
                      minPresenceAhead={30}
                      style={{
                        fontFamily: fontBold,
                        fontSize: scale.metaPt - 0.5,
                        textTransform: 'uppercase',
                        letterSpacing: 0.4,
                        color: metaCol,
                        marginBottom: 1.5,
                      }}
                    >
                      High School Education
                    </Text>
                  ) : null}
                  {highSchoolEntries.map((hs) => {
                    const hsDetails = [
                      hs.gpa?.trim() ? `GPA: ${hs.gpa.trim()}` : '',
                      hs.testScores?.trim() || '',
                      hs.honors?.trim() || '',
                    ]
                      .filter(Boolean)
                      .join(' • ');
                    return (
                      <View key={hs.id} style={{ marginBottom: scale.entryGapPt }} wrap={false}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 0.5 }}>
                          <Text style={{ fontFamily: fontBold, fontSize: scale.entryTitlePt, color: col, flex: 1, marginRight: 8 }}>
                            {hs.schoolName}
                          </Text>
                          {hs.location ? (
                            <Text style={{ fontSize: scale.entrySubtitlePt, color: col, textAlign: 'right' }}>
                              {hs.location}
                            </Text>
                          ) : null}
                        </View>
                        {hsDetails || hs.graduationDate ? (
                          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' }}>
                            <Text style={{ fontFamily: fontItalic, fontSize: scale.bodyPt, color: col, flex: 1, marginRight: 8, lineHeight: scale.lineHeight }}>
                              {hsDetails || 'High School Diploma'}
                            </Text>
                            {hs.graduationDate ? (
                              <Text style={{ fontSize: scale.metaPt, color: metaCol, textAlign: 'right' }}>
                                {hs.graduationDate}
                              </Text>
                            ) : null}
                          </View>
                        ) : null}
                      </View>
                    );
                  })}
                </View>
              ) : null}
            </View>
          );
        }

        if (isInternshipResume) {
          const allEntries = getInternshipEducationEntries(effectiveResume);
          const entries = sliceItems(allEntries);
          if (entries.length === 0) return null;
          const sliceOffset = opts.slice ? opts.slice.sliceStart : 0;
          return (
            <View key={key} style={{ marginTop: showEditorialHeading ? scale.sectionGapPt : 0, marginBottom: 4 }}>
              {showEditorialHeading ? headingIfNormal : null}
              {entries.map((edu, idx) => {
                const showDottedDivider = sliceOffset + idx > 0;
                return (
                  <View
                    key={edu.id}
                    style={{
                      marginBottom: scale.entryGapPt,
                      borderTopWidth: showDottedDivider ? 0.75 : 0,
                      borderTopColor: '#9ca3af',
                      borderTopStyle: 'dotted',
                      paddingTop: showDottedDivider ? 4.5 : 0,
                    }}
                    wrap={false}
                  >
                    <Text
                      style={{
                        fontFamily: fontBold,
                        fontSize: scale.entryTitlePt,
                        color: '#111827',
                        lineHeight: 1.24,
                      }}
                    >
                      {edu.heading}
                    </Text>
                    {edu.institution ? (
                      <Text
                        style={{
                          fontFamily: fontBold,
                          fontSize: scale.entrySubtitlePt,
                          color: '#111827',
                          lineHeight: 1.25,
                          marginTop: 0.5,
                        }}
                      >
                        {edu.institution}
                      </Text>
                    ) : null}
                    {edu.dateRange || edu.location ? (
                      <View
                        style={{
                          flexDirection: 'row',
                          flexWrap: 'wrap',
                          alignItems: 'center',
                          marginTop: 1.5,
                        }}
                      >
                        {edu.dateRange ? (
                          <View
                            style={{
                              flexDirection: 'row',
                              alignItems: 'center',
                              minWidth: edu.location ? 88 : undefined,
                              marginRight: edu.location ? 10 : 0,
                            }}
                          >
                            {renderTwoColMetaIcon('calendar', '#4b5563')}
                            <Text style={{ fontSize: scale.metaPt - 0.15, color: '#374151' }}>
                              {edu.dateRange}
                            </Text>
                          </View>
                        ) : null}
                        {edu.location ? (
                          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                            {renderTwoColMetaIcon('pin', '#111827')}
                            <Text style={{ fontSize: scale.metaPt - 0.15, color: '#374151' }}>
                              {edu.location}
                            </Text>
                          </View>
                        ) : null}
                      </View>
                    ) : null}
                    {edu.subDetails.length > 0 ? (
                      <View style={{ marginTop: 1.5 }}>
                        {edu.subDetails.map((detail, dIdx) => (
                          <Text
                            key={dIdx}
                            style={{
                              fontSize: scale.bodyPt - 0.15,
                              color: '#1f2937',
                              lineHeight: 1.32,
                            }}
                          >
                            {detail}
                          </Text>
                        ))}
                      </View>
                    ) : null}
                  </View>
                );
              })}
            </View>
          );
        }

        if (isElegantSerif) {
          return (
            <View key={key} style={{ marginTop: showEditorialHeading ? scale.sectionGapPt : 0, marginBottom: 4 }}>
              {sliceItems(effectiveResume.education || []).map((edu, idx) => {
                const dateRange = [
                  edu.startDate?.trim(),
                  edu.current ? 'Present' : edu.endDate?.trim(),
                ]
                  .filter(Boolean)
                  .join(' – ');
                const courseworkList = (
                  Array.isArray(edu.coursework)
                    ? edu.coursework
                    : typeof edu.coursework === 'string'
                    ? edu.coursework.split(',')
                    : []
                )
                  .map((c) => c.trim())
                  .filter(Boolean);

                return (
                  <View key={edu.id} style={{ marginBottom: scale.entryGapPt }}>
                    {renderEditorialDateTimeline(
                      dateRange,
                      <View>
                        <Text
                          style={{
                            fontFamily: fontBold,
                            fontSize: scale.entryTitlePt,
                            lineHeight: 1.24,
                            color: '#111111',
                          }}
                        >
                          {edu.degree}
                          {edu.specialization ? `, ${edu.specialization}` : ''}
                        </Text>
                        <View
                          style={{
                            flexDirection: 'row',
                            flexWrap: 'wrap',
                            alignItems: 'center',
                            marginTop: 1,
                          }}
                        >
                          <Text
                            style={{
                              fontSize: scale.entrySubtitlePt - 0.25,
                              color: '#1f2937',
                              marginRight: edu.location ? 5 : 0,
                            }}
                          >
                            {renderEditorialSmallCaps(edu.institution || '', scale.entrySubtitlePt - 0.25)}
                          </Text>
                          {edu.location ? (
                            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                              {renderEditorialContactIcon('location', '#4b5563')}
                              <Text style={{ fontSize: scale.entrySubtitlePt - 0.25, color: '#4b5563' }}>
                                {edu.location}
                              </Text>
                            </View>
                          ) : null}
                        </View>
                        {edu.department?.trim() ? (
                          <Text
                            style={{
                              fontFamily: fontItalic,
                              fontSize: scale.metaPt,
                              color: '#374151',
                              marginTop: 1,
                            }}
                          >
                            {edu.department.trim()}
                          </Text>
                        ) : null}
                        {edu.grade?.trim() ? (
                          <Text style={{ fontSize: scale.bodyPt, color: '#111111', marginTop: 1 }}>
                            <Text style={{ fontFamily: fontBold }}>GPA: </Text>
                            <Text>{edu.grade.trim()}</Text>
                          </Text>
                        ) : null}
                        {edu.thesisTitle?.trim() || edu.dissertationDetails?.trim() ? (
                          <Text
                            style={{
                              fontSize: scale.bodyPt,
                              color: '#1f2937',
                              marginTop: 1,
                              lineHeight: 1.32,
                            }}
                          >
                            <Text style={{ fontFamily: fontBold }}>Thesis: </Text>
                            {edu.thesisTitle?.trim() ? (
                              <Text style={{ fontFamily: fontItalic }}>{edu.thesisTitle.trim()}</Text>
                            ) : null}
                            {edu.dissertationDetails?.trim() ? (
                              <Text>
                                {edu.thesisTitle?.trim() ? ' — ' : ''}
                                {edu.dissertationDetails.trim()}
                              </Text>
                            ) : null}
                          </Text>
                        ) : null}
                        {courseworkList.length > 0 ? (
                          <Text
                            style={{
                              fontSize: scale.bodyPt - 0.2,
                              color: '#374151',
                              marginTop: 1,
                              lineHeight: 1.32,
                            }}
                          >
                            <Text style={{ fontFamily: fontBold }}>Coursework: </Text>
                            <Text>{courseworkList.join(', ')}</Text>
                          </Text>
                        ) : null}
                        {edu.honors?.trim() || edu.achievements?.trim() ? (
                          <Text
                            style={{
                              fontSize: scale.bodyPt - 0.2,
                              color: '#374151',
                              marginTop: 1,
                              lineHeight: 1.32,
                            }}
                          >
                            <Text style={{ fontFamily: fontBold }}>Honors: </Text>
                            <Text>{edu.honors?.trim() || edu.achievements?.trim()}</Text>
                          </Text>
                        ) : null}
                        {edu.description?.trim() ? (
                          <Text
                            style={{
                              fontSize: scale.bodyPt - 0.2,
                              color: '#374151',
                              marginTop: 1.5,
                              lineHeight: scale.lineHeight,
                            }}
                          >
                            {edu.description.trim()}
                          </Text>
                        ) : null}
                      </View>,
                      showEditorialHeading && idx === 0 ? headingIfNormal : undefined
                    )}
                  </View>
                );
              })}
            </View>
          );
        }

        if (isModernCorporate) {
          return (
            <View key={key} style={{ marginTop: scale.sectionGapPt, marginBottom: 4 }}>
              {headingIfNormal}
              {(effectiveResume.education || []).map((edu) => {
                const dateRange = [
                  edu.startDate?.trim(),
                  edu.current ? 'Present' : edu.endDate?.trim(),
                ]
                  .filter(Boolean)
                  .join(' – ');
                const courseworkList = (
                  Array.isArray(edu.coursework)
                    ? edu.coursework
                    : typeof edu.coursework === 'string'
                    ? edu.coursework.split(',')
                    : []
                )
                  .map((c) => c.trim())
                  .filter(Boolean);

                return (
                  <View key={edu.id} style={{ marginBottom: scale.entryGapPt }}>
                    {renderModerncvRow(
                      dateRange,
                      <View>
                        <Text style={{ fontSize: scale.entrySubtitlePt, lineHeight: 1.3, color: col }}>
                          <Text style={{ fontFamily: fontBold }}>
                            {edu.degree}
                            {edu.specialization ? ` in ${edu.specialization}` : ''}
                          </Text>
                          {edu.institution?.trim() ? (
                            <Text>
                              , <Text style={{ fontFamily: fontItalic }}>{edu.institution.trim()}</Text>
                            </Text>
                          ) : null}
                          {edu.department?.trim() ? (
                            <Text>
                              , <Text style={{ fontFamily: fontItalic }}>{edu.department.trim()}</Text>
                            </Text>
                          ) : null}
                          {edu.location?.trim() ? (
                            <Text>
                              , <Text style={{ fontFamily: fontItalic }}>{edu.location.trim()}</Text>
                            </Text>
                          ) : null}
                          {edu.grade?.trim() ? (
                            <Text>
                              , <Text style={{ fontFamily: fontItalic }}>{edu.grade.trim()}</Text>
                            </Text>
                          ) : null}
                        </Text>
                        {edu.thesisTitle?.trim() || edu.dissertationDetails?.trim() ? (
                          <Text style={{ fontSize: scale.bodyPt - 0.15, color: '#1f2937', marginTop: 1, lineHeight: scale.lineHeight }}>
                            <Text style={{ fontFamily: fontBold }}>Thesis: </Text>
                            {edu.thesisTitle?.trim() ? (
                              <Text style={{ fontFamily: fontItalic }}>{edu.thesisTitle.trim()}</Text>
                            ) : null}
                            {edu.dissertationDetails?.trim() ? (
                              <Text>
                                {edu.thesisTitle?.trim() ? ' — ' : ''}
                                {edu.dissertationDetails.trim()}
                              </Text>
                            ) : null}
                          </Text>
                        ) : null}
                        {courseworkList.length > 0 ? (
                          <Text style={{ fontSize: scale.bodyPt - 0.15, color: '#374151', marginTop: 1, lineHeight: scale.lineHeight }}>
                            <Text style={{ fontFamily: fontBold }}>Coursework: </Text>
                            {courseworkList.join(', ')}
                          </Text>
                        ) : null}
                        {edu.honors?.trim() || edu.achievements?.trim() ? (
                          <Text style={{ fontSize: scale.bodyPt - 0.15, color: '#374151', marginTop: 1, lineHeight: scale.lineHeight }}>
                            <Text style={{ fontFamily: fontBold }}>Honors: </Text>
                            {edu.honors?.trim() || edu.achievements?.trim()}
                          </Text>
                        ) : null}
                        {edu.description?.trim() ? (
                          <Text style={{ fontSize: scale.bodyPt, color: '#1f2937', marginTop: 1, lineHeight: scale.lineHeight }}>
                            {edu.description.trim()}
                          </Text>
                        ) : null}
                      </View>,
                      true
                    )}
                  </View>
                );
              })}
            </View>
          );
        }

        if (isFresherResume) {
          return (
            <View key={key} style={{ marginTop: scale.sectionGapPt, marginBottom: 4 }}>
              {headingIfNormal}
              {(effectiveResume.education || []).map((edu) => {
                const dateRange = [
                  edu.startDate?.trim(),
                  edu.current ? 'Present' : edu.endDate?.trim(),
                ]
                  .filter(Boolean)
                  .join(' — ');
                const courseworkList = (
                  Array.isArray(edu.coursework)
                    ? edu.coursework
                    : typeof edu.coursework === 'string'
                    ? edu.coursework.split(',')
                    : []
                )
                  .map((c) => c.trim())
                  .filter(Boolean);
                const honorsVal = edu.honors?.trim() || edu.achievements?.trim() || '';

                return (
                  <View key={edu.id} style={{ marginBottom: scale.entryGapPt }} wrap={false}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' }}>
                      <Text style={{ fontSize: scale.bodyPt, lineHeight: scale.lineHeight, color: col, flex: 1, marginRight: 8 }}>
                        <Text style={{ fontFamily: fontBold }}>{edu.degree}</Text>
                        {edu.specialization ? `, ${edu.specialization}` : ''}
                        {edu.institution?.trim() ? `, ${edu.institution.trim()}` : ''}
                        {edu.board?.trim() ? ` (${edu.board.trim()})` : ''}
                        {edu.location?.trim() ? `, ${edu.location.trim()}` : ''}
                        {edu.grade?.trim()
                          ? `, GPA: ${edu.grade.trim()}${
                              edu.gradingScale?.trim() && !edu.grade.includes('/')
                                ? `/${edu.gradingScale.trim()}`
                                : ''
                            }`
                          : ''}
                      </Text>
                      {dateRange ? (
                        <Text style={{ fontFamily: fontBold, fontSize: scale.bodyPt, color: col, textAlign: 'right' }}>
                          {dateRange}
                        </Text>
                      ) : null}
                    </View>
                    {honorsVal ? (
                      <Text style={{ fontSize: scale.bodyPt - 0.25, color: subCol, marginTop: 1, lineHeight: 1.32 }}>
                        <Text style={{ fontFamily: fontBold }}>Honors: </Text>
                        <Text>{honorsVal}</Text>
                      </Text>
                    ) : null}
                    {edu.thesisTitle?.trim() ? (
                      <Text style={{ fontSize: scale.bodyPt - 0.25, color: subCol, marginTop: 1, lineHeight: 1.32 }}>
                        <Text style={{ fontFamily: fontBold }}>Thesis: </Text>
                        <Text>{edu.thesisTitle.trim()}</Text>
                      </Text>
                    ) : null}
                    {courseworkList.length > 0 ? (
                      <Text style={{ fontSize: scale.bodyPt - 0.25, color: subCol, marginTop: 1, lineHeight: 1.32 }}>
                        <Text style={{ fontFamily: fontBold }}>Coursework: </Text>
                        <Text>{courseworkList.join(', ')}</Text>
                      </Text>
                    ) : null}
                    {edu.description?.trim() ? (
                      <Text style={{ fontSize: scale.bodyPt - 0.25, color: subCol, marginTop: 1, lineHeight: scale.lineHeight }}>
                        {edu.description.trim()}
                      </Text>
                    ) : null}
                  </View>
                );
              })}
            </View>
          );
        }

        return (
          <View key={key} style={{ marginTop: scale.sectionGapPt, marginBottom: isJakes ? 2 : 4 }}>
            {!isTwoColumnPro ? headingIfNormal : null}
            {(effectiveResume.education || []).map((edu, idx) =>
              wrapAsymmetric(
                <View
                  key={edu.id}
                  style={{
                    marginBottom: scale.entryGapPt,
                    paddingLeft: !opts.isSidebar && isJakes ? 8 : 0,
                  }}
                  wrap={false}
                >
                  {isTwoColumnPro && idx === 0 ? headingIfNormal : null}
                  {opts.isSidebar ? (
                    isTwoColumnPro ? (
                      <View
                        style={{
                          borderTopWidth: idx > 0 ? 0.75 : 0,
                          borderTopColor: '#cbd5e1',
                          borderTopStyle: 'dotted',
                          paddingTop: idx > 0 ? 4 : 0,
                        }}
                      >
                        <Text style={{ fontFamily: fontBold, fontSize: scale.entryTitlePt - 0.25, color: '#111827', lineHeight: 1.25 }}>
                          {edu.degree}
                          {edu.specialization ? `, ${edu.specialization}` : ''}
                        </Text>
                        <Text style={{ fontFamily: fontBold, fontSize: scale.entrySubtitlePt - 0.25, color: accent, marginTop: 1 }}>
                          {edu.institution}
                        </Text>
                        {edu.startDate || edu.endDate || edu.current || edu.location ? (
                          <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', marginTop: 1.5 }}>
                            {edu.startDate || edu.endDate || edu.current ? (
                              <View style={{ flexDirection: 'row', alignItems: 'center', marginRight: 6 }}>
                                {renderTwoColMetaIcon('calendar', '#6b7280')}
                                <Text style={{ fontSize: scale.metaPt - 0.4, color: '#4b5563' }}>
                                  {edu.startDate ? `${edu.startDate} – ` : ''}
                                  {edu.current ? 'Present' : edu.endDate}
                                </Text>
                              </View>
                            ) : null}
                            {edu.location ? (
                              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                {renderTwoColMetaIcon('pin', '#6b7280')}
                                <Text style={{ fontSize: scale.metaPt - 0.4, color: '#4b5563' }}>
                                  {edu.location}
                                </Text>
                              </View>
                            ) : null}
                          </View>
                        ) : null}
                        {edu.grade ? (
                          <Text style={{ fontSize: scale.bodyPt - 0.25, color: '#374151', marginTop: 1.5 }}>
                            {edu.grade}
                          </Text>
                        ) : null}
                        {edu.achievements ? (
                          <Text style={{ fontSize: scale.bodyPt - 0.25, color: '#374151', marginTop: 1.5, lineHeight: 1.32 }}>
                            {edu.achievements}
                          </Text>
                        ) : null}
                        {edu.description ? (
                          <Text style={{ fontSize: scale.bodyPt - 0.25, color: '#4b5563', marginTop: 1.5, lineHeight: 1.32 }}>
                            {edu.description}
                          </Text>
                        ) : null}
                      </View>
                    ) : (
                      <>
                        <Text style={{ fontFamily: fontBold, fontSize: scale.entryTitlePt - 0.25, color: col }}>
                          {edu.institution}
                        </Text>
                        <Text style={{ fontFamily: fontItalic, fontSize: scale.entrySubtitlePt - 0.5, color: subCol }}>
                          {edu.degree}
                          {edu.specialization ? `, ${edu.specialization}` : ''}
                        </Text>
                        <Text style={{ fontSize: scale.metaPt - 0.5, color: metaCol }}>
                          {edu.startDate ? `${edu.startDate} – ` : ''}
                          {edu.current ? 'Present' : edu.endDate}
                          {edu.location ? ` · ${edu.location}` : ''}
                        </Text>
                        {edu.grade ? (
                          <Text style={{ fontSize: scale.metaPt - 0.5, color: metaCol, marginTop: 1 }}>
                            {edu.grade}
                          </Text>
                        ) : null}
                        {edu.achievements ? (
                          <Text style={{ fontSize: scale.metaPt - 0.75, color: subCol, marginTop: 1, lineHeight: 1.3 }}>
                            {edu.achievements}
                          </Text>
                        ) : null}
                      </>
                    )
                  ) : (
                    <>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 1 }}>
                        <Text style={{ fontFamily: fontBold, fontSize: scale.entryTitlePt, color: col, flex: 1, marginRight: 8 }}>
                          {edu.institution}
                        </Text>
                        <Text
                          style={{
                            fontFamily: isJakes ? fontBold : fontRegular,
                            fontSize: scale.entrySubtitlePt,
                            color: col,
                            textAlign: 'right',
                          }}
                        >
                          {edu.startDate ? `${edu.startDate} – ` : ''}
                          {edu.current ? 'Present' : edu.endDate}
                        </Text>
                      </View>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 1 }}>
                        <Text style={{ fontFamily: fontItalic, fontSize: scale.entrySubtitlePt, color: subCol, flex: 1, marginRight: 8 }}>
                          {edu.degree}
                          {edu.specialization ? `, ${edu.specialization}` : ''}
                        </Text>
                        {edu.location ? (
                          <Text
                            style={{
                              fontFamily: isJakes ? fontItalic : fontRegular,
                              fontSize: scale.metaPt,
                              color: metaCol,
                              textAlign: 'right',
                            }}
                          >
                            {edu.location}
                          </Text>
                        ) : null}
                      </View>
                      {(edu.grade || edu.achievements) && (
                        <Text style={{ fontSize: scale.metaPt, color: col, marginTop: 1.5, lineHeight: 1.32 }}>
                          {edu.grade ? `${edu.grade}` : ''}
                          {edu.grade && edu.achievements ? ' • ' : ''}
                          {edu.achievements ? `${edu.achievements}` : ''}
                        </Text>
                      )}
                      {edu.description ? (
                        <Text style={{ fontSize: scale.bodyPt, color: subCol, marginTop: 1.5, lineHeight: scale.lineHeight }}>
                          {edu.description}
                        </Text>
                      ) : null}
                    </>
                  )}
                </View>,
                idx === 0,
                edu.id
              )
            )}
          </View>
        );
      }

      case 'thesis': {
        const thesis = effectiveResume.thesis;
        if (!thesis || (!thesis.title?.trim() && !thesis.supervisors?.trim() && !thesis.description?.trim())) {
          return null;
        }
        return (
          <View key={key} style={{ marginTop: scale.sectionGapPt, marginBottom: 4 }}>
            {headingIfNormal}
            {wrapAsymmetric(
              <View style={{ marginBottom: scale.entryGapPt }} wrap={false}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 1 }}>
                  <Text style={{ fontFamily: fontBold, fontSize: scale.entryTitlePt, color: col, flex: 1, marginRight: 8 }}>
                    {thesis.title}
                  </Text>
                  {thesis.year ? (
                    <Text style={{ fontSize: scale.entrySubtitlePt, color: col, textAlign: 'right' }}>
                      {thesis.year}
                    </Text>
                  ) : null}
                </View>
                {thesis.institution ? (
                  <Text style={{ fontFamily: fontItalic, fontSize: scale.entrySubtitlePt, color: subCol }}>
                    {thesis.institution}
                  </Text>
                ) : null}
                {thesis.supervisors ? (
                  <Text style={{ fontSize: scale.metaPt, color: metaCol, marginTop: 1.5 }}>
                    <Text style={{ fontFamily: fontBold }}>Supervisors: </Text>
                    <Text>{thesis.supervisors}</Text>
                  </Text>
                ) : null}
                {thesis.description ? (
                  <Text style={{ fontSize: scale.bodyPt, lineHeight: scale.lineHeight, marginTop: 2, color: col }}>
                    {thesis.description}
                  </Text>
                ) : null}
              </View>,
              true,
              'master-thesis'
            )}
          </View>
        );
      }

      case 'coursework': {
        const courses = getCourseworkItems(effectiveResume);
        const rows = chunkRows(courses, 4);
        return (
          <View key={key} style={{ marginTop: scale.sectionGapPt, marginBottom: 2 }}>
            {headingIfNormal}
            {rows.map((row, rIdx) =>
              wrapAsymmetric(
                <View
                  key={rIdx}
                  style={{
                    flexDirection: 'row',
                    paddingLeft: isJakes ? 10 : 4,
                    marginBottom: 2,
                  }}
                  wrap={false}
                >
                  {[0, 1, 2, 3].map((colIdx) => {
                    const course = row[colIdx];
                    return (
                      <View key={colIdx} style={{ width: '25%', flexDirection: 'row', paddingRight: 4 }}>
                        {course ? (
                          <>
                            <Text style={{ width: 8, fontSize: scale.bodyPt, color: col }}>
                              {bulletChar}
                            </Text>
                            <Text style={{ flex: 1, fontSize: scale.bodyPt, lineHeight: scale.lineHeight, color: col }}>
                              {course}
                            </Text>
                          </>
                        ) : null}
                      </View>
                    );
                  })}
                </View>,
                rIdx === 0,
                `cw-row-${rIdx}`
              )
            )}
          </View>
        );
      }

      case 'experience': {
        const expGroups =
          isClassic || isModernCorporate
            ? groupExperienceByCategory(effectiveResume.experience || [])
            : [{ categoryLabel: null as string | null, items: sliceItems(effectiveResume.experience || []) }];

        let globalExpIndex = 0;
        return (
          <View key={key} style={{ marginTop: showEditorialHeading ? scale.sectionGapPt : 0, marginBottom: isJakes ? 1 : 4 }}>
            {!isTwoColumnPro && !isElegantSerif && !(isInternshipResume && !showEditorialHeading)
              ? headingIfNormal
              : null}
            {expGroups.map((group, gIdx) => (
              <View key={`exp-grp-${gIdx}`}>
                {isClassic && group.categoryLabel ? (
                  <Text
                    minPresenceAhead={36}
                    style={{
                      fontFamily: fontBold,
                      fontSize: scale.metaPt,
                      textTransform: 'uppercase',
                      letterSpacing: 0.6,
                      color: accent,
                      marginBottom: 3,
                      marginTop: gIdx > 0 ? 3 : 0,
                    }}
                  >
                    {group.categoryLabel}
                  </Text>
                ) : null}
                {isModernCorporate && group.categoryLabel ? (
                  <View style={{ marginBottom: 3, marginTop: gIdx > 0 ? 3 : 0 }} minPresenceAhead={36}>
                    {renderModerncvRow(
                      null,
                      <Text
                        style={{
                          fontSize: scale.headingPt - 1.5,
                          color: accent,
                          fontFamily: fontRegular,
                          lineHeight: 1.25,
                        }}
                      >
                        {group.categoryLabel.replace(/\s+Experience$/i, '')}
                      </Text>,
                      true
                    )}
                  </View>
                ) : null}
                {group.items.map((exp) => {
                  const idx = globalExpIndex;
                  globalExpIndex += 1;
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

                  const expDateRange = [
                    exp.startDate?.trim(),
                    exp.current ? 'Present' : exp.endDate?.trim(),
                  ]
                    .filter(Boolean)
                    .join(' – ');

                  return (
                    <View key={exp.id} style={{ marginBottom: scale.entryGapPt, paddingLeft: isJakes ? 8 : 0 }}>
                      {wrapAsymmetric(
                        isElegantSerif ? (
                          renderEditorialDateTimeline(
                            expDateRange,
                            <View>
                              <Text
                                style={{
                                  fontFamily: fontBold,
                                  fontSize: scale.entryTitlePt,
                                  lineHeight: 1.24,
                                  color: '#111111',
                                }}
                              >
                                {exp.position}
                                {exp.employmentType ? (
                                  <Text style={{ fontFamily: fontItalic, fontSize: scale.metaPt, color: '#4b5563' }}>
                                    {` (${exp.employmentType})`}
                                  </Text>
                                ) : null}
                              </Text>
                              <View
                                style={{
                                  flexDirection: 'row',
                                  flexWrap: 'wrap',
                                  alignItems: 'center',
                                  marginTop: 1,
                                }}
                              >
                                <Text
                                  style={{
                                    fontSize: scale.entrySubtitlePt - 0.25,
                                    color: '#1f2937',
                                    marginRight: exp.location ? 5 : 0,
                                  }}
                                >
                                  {renderEditorialSmallCaps(exp.company || '', scale.entrySubtitlePt - 0.25)}
                                </Text>
                                {exp.location ? (
                                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                    {renderEditorialContactIcon('location', '#4b5563')}
                                    <Text style={{ fontSize: scale.entrySubtitlePt - 0.25, color: '#4b5563' }}>
                                      {exp.location}
                                    </Text>
                                  </View>
                                ) : null}
                              </View>
                              {exp.description ? (
                                <Text style={{ fontSize: scale.bodyPt, color: '#374151', lineHeight: scale.lineHeight, marginTop: 1.5 }}>
                                  {exp.description}
                                </Text>
                              ) : null}
                              {(() => {
                                const demonstratedList = Array.isArray(exp.skillsDemonstrated)
                                  ? exp.skillsDemonstrated.map((s) => s.trim()).filter(Boolean)
                                  : typeof exp.skillsDemonstrated === 'string' &&
                                    (exp.skillsDemonstrated as string).trim()
                                  ? [(exp.skillsDemonstrated as string).trim()]
                                  : [];
                                const techAndSkills = [...(exp.technologies || []), ...demonstratedList]
                                  .map((s) => s.trim())
                                  .filter(Boolean);
                                if (techAndSkills.length === 0) return null;
                                return (
                                  <Text style={{ fontSize: scale.metaPt - 0.25, color: '#4b5563', marginTop: 1, lineHeight: 1.3 }}>
                                    <Text style={{ fontFamily: fontBold }}>Technologies / Skills: </Text>
                                    <Text>{techAndSkills.join(', ')}</Text>
                                  </Text>
                                );
                              })()}
                              {firstBullet ? (
                                <View>
                                  <View style={{ flexDirection: 'row', marginTop: 2 }}>
                                    <Text style={{ width: 9, fontSize: scale.entrySubtitlePt, color: col }}>
                                      {bulletChar}
                                    </Text>
                                    <Text style={{ flex: 1, fontSize: scale.bodyPt, lineHeight: scale.lineHeight, color: col }}>
                                      {firstBullet}
                                    </Text>
                                  </View>
                                  {(subMap.get(0) || []).map((subItem, sIdx) => (
                                    <View key={sIdx} style={{ flexDirection: 'row', marginTop: 1, paddingLeft: 10 }}>
                                      <Text style={{ width: 8, fontSize: scale.bodyPt, color: '#374151' }}>–</Text>
                                      <Text style={{ flex: 1, fontSize: scale.bodyPt - 0.25, lineHeight: scale.lineHeight, color: '#374151' }}>
                                        {subItem}
                                      </Text>
                                    </View>
                                  ))}
                                </View>
                              ) : null}
                            </View>,
                            showEditorialHeading && idx === 0 ? headingIfNormal : undefined
                          )
                        ) : isModernCorporate ? (
                          renderModerncvRow(
                            expDateRange,
                            <View>
                              <Text style={{ fontSize: scale.entrySubtitlePt, lineHeight: 1.3, color: col }}>
                                <Text style={{ fontFamily: fontBold }}>{exp.position}</Text>
                                {exp.company?.trim() ? (
                                  <Text>
                                    , <Text style={{ fontFamily: fontItalic }}>{exp.company.trim()}</Text>
                                  </Text>
                                ) : null}
                                {exp.department?.trim() ? (
                                  <Text>
                                    , <Text style={{ fontFamily: fontItalic }}>{exp.department.trim()}</Text>
                                  </Text>
                                ) : null}
                                {exp.location?.trim() ? (
                                  <Text>
                                    , <Text style={{ fontFamily: fontItalic }}>{exp.location.trim()}</Text>
                                  </Text>
                                ) : null}
                                {exp.employmentType?.trim() ? (
                                  <Text style={{ color: '#4b5563', fontSize: scale.metaPt - 0.25 }}>
                                    {` (${exp.employmentType.trim()})`}
                                  </Text>
                                ) : null}
                              </Text>
                              {exp.description?.trim() ? (
                                <Text style={{ fontSize: scale.bodyPt, color: '#1f2937', lineHeight: scale.lineHeight, marginTop: 1 }}>
                                  {exp.description.trim()}
                                </Text>
                              ) : null}
                              {exp.results?.trim() ? (
                                <Text style={{ fontSize: scale.bodyPt - 0.15, color: '#1f2937', lineHeight: scale.lineHeight, marginTop: 1 }}>
                                  <Text style={{ fontFamily: fontBold }}>Results: </Text>
                                  {exp.results.trim()}
                                </Text>
                              ) : null}
                              {exp.technologies && exp.technologies.length > 0 ? (
                                <Text style={{ fontSize: scale.metaPt - 0.25, color: '#4b5563', marginTop: 1 }}>
                                  <Text style={{ fontFamily: fontBold }}>Tools: </Text>
                                  {exp.technologies.join(', ')}
                                </Text>
                              ) : null}
                              {firstBullet ? (
                                <View>
                                  <View style={{ flexDirection: 'row', marginTop: 1.5 }}>
                                    {renderModerncvHollowCircle(col)}
                                    <Text style={{ flex: 1, fontSize: scale.bodyPt, lineHeight: scale.lineHeight, color: col }}>
                                      {firstBullet}
                                    </Text>
                                  </View>
                                  {(subMap.get(0) || []).map((subItem, sIdx) => (
                                    <View key={sIdx} style={{ flexDirection: 'row', marginTop: 1, paddingLeft: 11 }}>
                                      <Text style={{ width: 8, fontSize: scale.bodyPt, color: '#374151' }}>–</Text>
                                      <Text style={{ flex: 1, fontSize: scale.bodyPt - 0.2, lineHeight: scale.lineHeight, color: '#374151' }}>
                                        {subItem}
                                      </Text>
                                    </View>
                                  ))}
                                </View>
                              ) : null}
                            </View>,
                            true
                          )
                        ) : isTwoColumnPro ? (
                          <View wrap={false}>
                            {idx === 0 ? headingIfNormal : null}
                            <View
                              style={{
                                borderTopWidth: idx > 0 ? 0.75 : 0,
                                borderTopColor: '#cbd5e1',
                                borderTopStyle: 'dotted',
                                paddingTop: idx > 0 ? 4 : 0,
                              }}
                            >
                            <Text style={{ fontFamily: fontBold, fontSize: scale.entryTitlePt, color: '#111827', lineHeight: 1.25 }}>
                              {exp.position}
                            </Text>
                            <Text style={{ fontFamily: fontBold, fontSize: scale.entrySubtitlePt, color: accent, marginTop: 0.5 }}>
                              {exp.company}
                              {exp.employmentType ? ` (${exp.employmentType})` : ''}
                            </Text>
                            {exp.startDate || exp.endDate || exp.current || exp.location ? (
                              <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', marginTop: 1.5, marginBottom: 2 }}>
                                {exp.startDate || exp.endDate || exp.current ? (
                                  <View style={{ flexDirection: 'row', alignItems: 'center', marginRight: 8 }}>
                                    {renderTwoColMetaIcon('calendar', '#6b7280')}
                                    <Text style={{ fontSize: scale.metaPt - 0.25, color: '#4b5563' }}>
                                      {exp.startDate} – {exp.current ? 'Present' : exp.endDate}
                                    </Text>
                                  </View>
                                ) : null}
                                {exp.location ? (
                                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                    {renderTwoColMetaIcon('pin', '#6b7280')}
                                    <Text style={{ fontSize: scale.metaPt - 0.25, color: '#4b5563' }}>
                                      {exp.location}
                                    </Text>
                                  </View>
                                ) : null}
                              </View>
                            ) : null}
                            {exp.description ? (
                              <Text style={{ fontSize: scale.bodyPt, color: '#374151', lineHeight: scale.lineHeight, marginTop: 1.5 }}>
                                {exp.description}
                              </Text>
                            ) : null}
                            {firstBullet ? (
                              <View style={{ flexDirection: 'row', marginTop: 2, paddingLeft: 2 }}>
                                <Text style={{ width: 9, fontSize: scale.entrySubtitlePt, color: '#4b5563' }}>
                                  {bulletChar}
                                </Text>
                                <Text style={{ flex: 1, fontSize: scale.bodyPt, lineHeight: scale.lineHeight, color: col }}>
                                  {firstBullet}
                                </Text>
                              </View>
                            ) : null}
                            </View>
                          </View>
                        ) : isFresherResume ? (
                          <View wrap={false}>
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 0.5 }}>
                              <Text style={{ fontSize: scale.entryTitlePt, color: col, flex: 1, marginRight: 8 }}>
                                <Text style={{ fontFamily: fontBold }}>{exp.position}</Text>
                                {exp.employmentType?.trim() ? (
                                  <Text style={{ fontSize: scale.metaPt, color: subCol }}>
                                    {` (${exp.employmentType.trim()})`}
                                  </Text>
                                ) : null}
                              </Text>
                              {expDateRange ? (
                                <Text style={{ fontFamily: fontBold, fontSize: scale.bodyPt, color: col, textAlign: 'right' }}>
                                  {expDateRange}
                                </Text>
                              ) : null}
                            </View>
                            {exp.company?.trim() || exp.location?.trim() ? (
                              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 1.5 }}>
                                <Text style={{ fontSize: scale.bodyPt - 0.15, color: subCol, flex: 1, marginRight: 8 }}>
                                  {exp.company?.trim() || ''}
                                  {exp.department?.trim() ? `, ${exp.department.trim()}` : ''}
                                </Text>
                                {exp.location?.trim() ? (
                                  <Text style={{ fontFamily: fontItalic, fontSize: scale.metaPt, color: metaCol, textAlign: 'right' }}>
                                    {exp.location.trim()}
                                  </Text>
                                ) : null}
                              </View>
                            ) : null}
                            {exp.description?.trim() ? (
                              <Text style={{ fontSize: scale.bodyPt, color: subCol, lineHeight: scale.lineHeight, marginTop: 1 }}>
                                {exp.description.trim()}
                              </Text>
                            ) : null}
                            {firstBullet ? (
                              <View>
                                <View style={{ flexDirection: 'row', marginTop: 1.5, paddingLeft: 8 }}>
                                  <Text style={{ width: 9, fontSize: scale.entrySubtitlePt, color: col }}>
                                    {bulletChar}
                                  </Text>
                                  <Text style={{ flex: 1, fontSize: scale.bodyPt, lineHeight: scale.lineHeight, color: col }}>
                                    {firstBullet}
                                  </Text>
                                </View>
                                {(subMap.get(0) || []).map((subItem, sIdx) => (
                                  <View key={sIdx} style={{ flexDirection: 'row', marginTop: 1, paddingLeft: 19 }}>
                                    <Text style={{ width: 8, fontSize: scale.bodyPt, color: subCol }}>–</Text>
                                    <Text style={{ flex: 1, fontSize: scale.bodyPt - 0.25, lineHeight: scale.lineHeight, color: subCol }}>
                                      {subItem}
                                    </Text>
                                  </View>
                                ))}
                              </View>
                            ) : null}
                          </View>
                        ) : (
                          <View wrap={false}>
                            {isHarvard ? (
                              <>
                                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 0.5 }}>
                                  <Text style={{ fontFamily: fontBold, fontSize: scale.entryTitlePt, color: col, flex: 1, marginRight: 8 }}>
                                    {exp.company}
                                  </Text>
                                  {exp.location ? (
                                    <Text style={{ fontFamily: fontRegular, fontSize: scale.entrySubtitlePt, color: col, textAlign: 'right' }}>
                                      {exp.location}
                                    </Text>
                                  ) : null}
                                </View>
                                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 1 }}>
                                  <Text style={{ fontFamily: fontItalic, fontSize: scale.entrySubtitlePt, color: subCol, flex: 1, marginRight: 8 }}>
                                    {exp.position}
                                    {exp.employmentType ? ` (${exp.employmentType})` : ''}
                                  </Text>
                                  <Text style={{ fontFamily: fontRegular, fontSize: scale.metaPt, color: metaCol, textAlign: 'right' }}>
                                    {exp.startDate} – {exp.current ? 'Present' : exp.endDate}
                                  </Text>
                                </View>
                              </>
                            ) : (
                              <>
                                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 1 }}>
                                  <Text style={{ fontFamily: fontBold, fontSize: scale.entryTitlePt, color: col, flex: 1, marginRight: 8 }}>
                                    {exp.company}
                                  </Text>
                                  <Text
                                    style={{
                                      fontFamily: isJakes ? fontBold : fontRegular,
                                      fontSize: scale.entrySubtitlePt,
                                      color: col,
                                      textAlign: 'right',
                                    }}
                                  >
                                    {exp.startDate} – {exp.current ? 'Present' : exp.endDate}
                                  </Text>
                                </View>
                                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 1 }}>
                                  <Text style={{ fontFamily: fontItalic, fontSize: scale.entrySubtitlePt, color: subCol, flex: 1, marginRight: 8 }}>
                                    {exp.position}
                                    {!isJakes && exp.employmentType ? ` (${exp.employmentType})` : ''}
                                  </Text>
                                  {exp.location ? (
                                    <Text
                                      style={{
                                        fontFamily: isJakes ? fontItalic : fontRegular,
                                        fontSize: scale.metaPt,
                                        color: metaCol,
                                        textAlign: 'right',
                                      }}
                                    >
                                      {exp.location}
                                    </Text>
                                  ) : null}
                                </View>
                              </>
                            )}
                            {exp.description ? (
                              <Text style={{ fontSize: scale.bodyPt, color: subCol, lineHeight: scale.lineHeight, marginTop: 1.5 }}>
                                {exp.description}
                              </Text>
                            ) : null}
                            {firstBullet ? (
                              <View>
                                <View style={{ flexDirection: 'row', marginTop: isJakes ? 1 : 2, paddingLeft: isJakes ? 10 : 8 }}>
                                  <Text style={{ width: 10, fontSize: scale.entrySubtitlePt, color: col }}>
                                    {bulletChar}
                                  </Text>
                                  <Text style={{ flex: 1, fontSize: scale.bodyPt, lineHeight: scale.lineHeight, color: col }}>
                                    {firstBullet}
                                  </Text>
                                </View>
                                {(subMap.get(0) || []).map((subItem, sIdx) => (
                                  <View key={sIdx} style={{ flexDirection: 'row', marginTop: 1, paddingLeft: 22 }}>
                                    <Text style={{ width: 9, fontSize: scale.bodyPt, color: subCol }}>–</Text>
                                    <Text style={{ flex: 1, fontSize: scale.bodyPt - 0.25, lineHeight: scale.lineHeight, color: subCol }}>
                                      {subItem}
                                    </Text>
                                  </View>
                                ))}
                              </View>
                            ) : null}
                          </View>
                        ),
                        idx === 0
                      )}

                      {remainingBullets.map((hl, bIdx) => {
                        const actualParentIdx = bIdx + 1;
                        const nestedSubs = subMap.get(actualParentIdx) || [];
                        return wrapAsymmetric(
                          isElegantSerif ? (
                            <View key={bIdx} style={{ flexDirection: 'row', alignItems: 'flex-start' }} wrap={false}>
                              <View style={{ width: '22%', paddingRight: 7 }} />
                              <View style={{ flex: 1, borderLeftWidth: 0.75, borderLeftColor: '#555555', paddingLeft: 8, paddingTop: 1.5 }}>
                                <View style={{ flexDirection: 'row' }}>
                                  <Text style={{ width: 9, fontSize: scale.entrySubtitlePt, color: col }}>
                                    {bulletChar}
                                  </Text>
                                  <Text style={{ flex: 1, fontSize: scale.bodyPt, lineHeight: scale.lineHeight, color: col }}>
                                    {hl}
                                  </Text>
                                </View>
                                {nestedSubs.map((subItem, sIdx) => (
                                  <View key={sIdx} style={{ flexDirection: 'row', marginTop: 1, paddingLeft: 10 }}>
                                    <Text style={{ width: 8, fontSize: scale.bodyPt, color: '#374151' }}>–</Text>
                                    <Text style={{ flex: 1, fontSize: scale.bodyPt - 0.25, lineHeight: scale.lineHeight, color: '#374151' }}>
                                      {subItem}
                                    </Text>
                                  </View>
                                ))}
                              </View>
                            </View>
                          ) : isModernCorporate ? (
                            <View key={bIdx}>
                              {renderModerncvRow(
                                null,
                                <View style={{ marginTop: 1.5 }}>
                                  <View style={{ flexDirection: 'row' }}>
                                    {renderModerncvHollowCircle(col)}
                                    <Text style={{ flex: 1, fontSize: scale.bodyPt, lineHeight: scale.lineHeight, color: col }}>
                                      {hl}
                                    </Text>
                                  </View>
                                  {nestedSubs.map((subItem, sIdx) => (
                                    <View key={sIdx} style={{ flexDirection: 'row', marginTop: 1, paddingLeft: 11 }}>
                                      <Text style={{ width: 8, fontSize: scale.bodyPt, color: '#374151' }}>–</Text>
                                      <Text style={{ flex: 1, fontSize: scale.bodyPt - 0.2, lineHeight: scale.lineHeight, color: '#374151' }}>
                                        {subItem}
                                      </Text>
                                    </View>
                                  ))}
                                </View>,
                                true
                              )}
                            </View>
                          ) : (
                            <View key={bIdx} wrap={false}>
                              <View style={{ flexDirection: 'row', marginTop: isJakes ? 1 : 2, paddingLeft: isJakes ? 10 : isTwoColumnPro ? 2 : 8 }}>
                                <Text style={{ width: isTwoColumnPro ? 9 : 10, fontSize: scale.entrySubtitlePt, color: isTwoColumnPro ? '#4b5563' : col }}>
                                  {bulletChar}
                                </Text>
                                <Text style={{ flex: 1, fontSize: scale.bodyPt, lineHeight: scale.lineHeight, color: col }}>
                                  {hl}
                                </Text>
                              </View>
                              {nestedSubs.map((subItem, sIdx) => (
                                <View key={sIdx} style={{ flexDirection: 'row', marginTop: 1, paddingLeft: 22 }}>
                                  <Text style={{ width: 9, fontSize: scale.bodyPt, color: subCol }}>–</Text>
                                  <Text style={{ flex: 1, fontSize: scale.bodyPt - 0.25, lineHeight: scale.lineHeight, color: subCol }}>
                                    {subItem}
                                  </Text>
                                </View>
                              ))}
                            </View>
                          ),
                          false,
                          `${exp.id}-b-${bIdx}`
                        );
                      })}
                      {isFresherResume
                        ? (() => {
                            const learned = [
                              ...(exp.skillsLearned || []),
                              ...(exp.technologies || []),
                            ]
                              .map((s) => s.trim())
                              .filter(Boolean);
                            if (learned.length === 0) return null;
                            return (
                              <Text style={{ fontSize: scale.metaPt - 0.15, color: subCol, marginTop: 1.5, paddingLeft: 8 }} wrap={false}>
                                <Text style={{ fontFamily: fontBold }}>Skills Learned: </Text>
                                <Text>{learned.join(', ')}</Text>
                              </Text>
                            );
                          })()
                        : null}
                    </View>
                  );
                })}
              </View>
            ))}
          </View>
        );
      }

      case 'research': {
        if (isInternshipResume) {
          const entries = sliceItems(getInternshipResearchAndProjectEntries(effectiveResume));
          if (entries.length === 0) return null;
          return (
            <View key={key} style={{ marginTop: showEditorialHeading ? scale.sectionGapPt : 0, marginBottom: 4 }}>
              {showEditorialHeading ? headingIfNormal : null}
              {entries.map((entry) => (
                <View key={entry.id} style={{ marginBottom: scale.entryGapPt }} wrap={false}>
                  <Text
                    style={{
                      fontFamily: fontBold,
                      fontSize: scale.entryTitlePt,
                      color: '#111827',
                      lineHeight: 1.25,
                    }}
                  >
                    {entry.title}
                    {entry.dateRange ? ` (${entry.dateRange})` : ''}
                  </Text>
                  {entry.bullets.map((bullet, bIdx) => (
                    <View
                      key={bIdx}
                      style={{
                        flexDirection: 'row',
                        alignItems: 'flex-start',
                        marginTop: 1.5,
                        paddingLeft: 2,
                      }}
                    >
                      <Text style={{ width: 9, fontSize: scale.entrySubtitlePt, color: '#1f2937', lineHeight: 1.3 }}>
                        {bulletChar}
                      </Text>
                      <Text
                        style={{
                          flex: 1,
                          fontSize: scale.bodyPt - 0.15,
                          lineHeight: 1.34,
                          color: '#1f2937',
                        }}
                      >
                        {bullet}
                      </Text>
                    </View>
                  ))}
                  {entry.linkUrl && entry.linkLabel ? (
                    <View style={{ marginTop: 1.5, paddingLeft: 11 }}>
                      <Link
                        src={entry.linkUrl}
                        style={{ fontSize: scale.metaPt - 0.25, color: accent, textDecoration: 'none' }}
                      >
                        {entry.linkLabel}
                      </Link>
                    </View>
                  ) : null}
                </View>
              ))}
            </View>
          );
        }

        const researchList = sliceItems(effectiveResume.researchExperience || []);
        if (researchList.length === 0) return null;
        return (
          <View key={key} style={{ marginTop: showEditorialHeading ? scale.sectionGapPt : 0, marginBottom: 4 }}>
            {!isElegantSerif ? headingIfNormal : null}
            {researchList.map((res, idx) => {
              const dateRange = [
                res.startDate?.trim(),
                res.current ? 'Present' : res.endDate?.trim(),
              ]
                .filter(Boolean)
                .join(' – ');

              return (
                <View key={res.id} style={{ marginBottom: scale.entryGapPt }}>
                  {wrapAsymmetric(
                    isElegantSerif ? (
                      renderEditorialDateTimeline(
                        dateRange,
                        <View>
                          <Text
                            style={{
                              fontFamily: fontBold,
                              fontSize: scale.entryTitlePt,
                              lineHeight: 1.24,
                              color: '#111111',
                            }}
                          >
                            {res.title}
                          </Text>
                          {res.role || res.domain ? (
                            <Text
                              style={{
                                fontFamily: fontItalic,
                                fontSize: scale.metaPt,
                                color: '#374151',
                                marginTop: 0.5,
                              }}
                            >
                              {[res.role, res.domain].filter(Boolean).join(' · ')}
                            </Text>
                          ) : null}
                          {res.institution || res.location || res.supervisor ? (
                            <View
                              style={{
                                flexDirection: 'row',
                                flexWrap: 'wrap',
                                alignItems: 'center',
                                marginTop: 1,
                              }}
                            >
                              {res.institution ? (
                                <Text
                                  style={{
                                    fontSize: scale.entrySubtitlePt - 0.25,
                                    color: '#1f2937',
                                    marginRight: 5,
                                  }}
                                >
                                  {renderEditorialSmallCaps(res.institution, scale.entrySubtitlePt - 0.25)}
                                </Text>
                              ) : null}
                              {res.location ? (
                                <View style={{ flexDirection: 'row', alignItems: 'center', marginRight: 5 }}>
                                  {renderEditorialContactIcon('location', '#4b5563')}
                                  <Text style={{ fontSize: scale.entrySubtitlePt - 0.25, color: '#4b5563' }}>
                                    {res.location}
                                  </Text>
                                </View>
                              ) : null}
                              {res.supervisor ? (
                                <Text style={{ fontSize: scale.metaPt - 0.25, color: '#4b5563' }}>
                                  Supervisor: {res.supervisor}
                                </Text>
                              ) : null}
                            </View>
                          ) : null}
                          {res.objectives?.trim() ? (
                            <Text style={{ fontSize: scale.bodyPt, color: '#374151', lineHeight: scale.lineHeight, marginTop: 1.5 }}>
                              <Text style={{ fontFamily: fontBold }}>Objectives: </Text>
                              <Text>{res.objectives.trim()}</Text>
                            </Text>
                          ) : null}
                          {res.methodology?.trim() ? (
                            <Text style={{ fontSize: scale.bodyPt, color: '#374151', lineHeight: scale.lineHeight, marginTop: 1 }}>
                              <Text style={{ fontFamily: fontBold }}>Methodology: </Text>
                              <Text>{res.methodology.trim()}</Text>
                            </Text>
                          ) : null}
                          {res.findings?.trim() ? (
                            <Text style={{ fontSize: scale.bodyPt, color: '#374151', lineHeight: scale.lineHeight, marginTop: 1 }}>
                              <Text style={{ fontFamily: fontBold }}>Findings: </Text>
                              <Text>{res.findings.trim()}</Text>
                            </Text>
                          ) : null}
                          {res.outcomes?.trim() ? (
                            <Text style={{ fontSize: scale.bodyPt, color: '#374151', lineHeight: scale.lineHeight, marginTop: 1 }}>
                              <Text style={{ fontFamily: fontBold }}>Outcomes: </Text>
                              <Text>{res.outcomes.trim()}</Text>
                            </Text>
                          ) : null}
                          {res.technologies && res.technologies.length > 0 ? (
                            <Text style={{ fontSize: scale.metaPt - 0.25, color: '#4b5563', marginTop: 1 }}>
                              <Text style={{ fontFamily: fontBold }}>Methods & Tools: </Text>
                              <Text>{res.technologies.join(', ')}</Text>
                            </Text>
                          ) : null}
                          {res.publications?.trim() ? (
                            <Text style={{ fontSize: scale.metaPt - 0.25, color: '#374151', marginTop: 1 }}>
                              <Text style={{ fontFamily: fontBold }}>Output: </Text>
                              <Text style={{ fontFamily: fontItalic }}>{res.publications.trim()}</Text>
                            </Text>
                          ) : null}
                        </View>,
                        showEditorialHeading && idx === 0 ? headingIfNormal : undefined
                      )
                    ) : (
                      <View wrap={false}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 1 }}>
                          <Text style={{ fontFamily: fontBold, fontSize: scale.entryTitlePt, color: col, flex: 1, marginRight: 8 }}>
                            {res.title}
                          </Text>
                          {dateRange ? (
                            <Text style={{ fontSize: scale.entrySubtitlePt, color: col, textAlign: 'right' }}>
                              {dateRange}
                            </Text>
                          ) : null}
                        </View>
                        {res.institution ? (
                          <Text style={{ fontFamily: fontItalic, fontSize: scale.entrySubtitlePt, color: subCol }}>
                            {res.institution}
                            {res.role ? ` — ${res.role}` : ''}
                          </Text>
                        ) : null}
                        {res.objectives ? (
                          <Text style={{ fontSize: scale.bodyPt, color: col, marginTop: 1.5, lineHeight: scale.lineHeight }}>
                            {res.objectives}
                          </Text>
                        ) : null}
                      </View>
                    ),
                    idx === 0,
                    res.id
                  )}
                </View>
              );
            })}
          </View>
        );
      }

      case 'publications': {
        if (isTwoColumnPro) {
          const groups = groupPublicationsForTwoColumn(effectiveResume.publications || []);
          if (groups.length === 0) return null;

          const renderTwoColPubItem = (pub: PublicationItem) => {
            const { doiUrl, venue } = getPublicationParts(pub);
            const extUrl = pub.url?.trim()
              ? pub.url.trim().startsWith('http')
                ? pub.url.trim()
                : `https://${pub.url.trim()}`
              : doiUrl;
            return (
              <View key={pub.id} style={{ flexDirection: 'row', marginBottom: 3.5, paddingLeft: 2 }} wrap={false}>
                <Text style={{ width: 9, fontSize: scale.entrySubtitlePt, color: '#4b5563' }}>
                  {bulletChar}
                </Text>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: scale.bodyPt - 0.15, lineHeight: scale.lineHeight, color: col }}>
                    <Text style={{ fontFamily: fontBold }}>{pub.authors || ''}</Text>
                    {pub.year ? <Text> ({pub.year}). </Text> : <Text>. </Text>}
                    <Text>"{pub.title || ''}" </Text>
                    {venue ? <Text style={{ fontFamily: fontItalic }}>{venue}</Text> : null}
                    {pub.volume ? <Text>, {pub.volume}</Text> : null}
                    {pub.issue ? <Text>({pub.issue})</Text> : null}
                    {pub.pages ? <Text>, pp. {pub.pages}</Text> : null}
                    <Text>.</Text>
                    {pub.location ? <Text> {pub.location}.</Text> : null}
                    {pub.doi || extUrl ? (
                      <Text>
                        {' '}
                        {extUrl ? (
                          <Link src={extUrl} style={{ color: accent, textDecoration: 'none' }}>
                            {pub.doi ? `DOI: ${pub.doi}` : pub.url?.replace(/^https?:\/\//, '')}
                          </Link>
                        ) : (
                          <Text>DOI: {pub.doi}</Text>
                        )}
                      </Text>
                    ) : null}
                  </Text>
                  {pub.description?.trim() ? (
                    <Text style={{ fontSize: scale.bodyPt - 0.5, color: '#4b5563', marginTop: 1 }}>
                      {pub.description.trim()}
                    </Text>
                  ) : null}
                </View>
              </View>
            );
          };

          return (
            <View key={key} style={{ marginTop: scale.sectionGapPt, marginBottom: 4 }}>
              {groups.map((group, gIdx) => {
                const firstPub = group.items[0];
                const remainingPubs = group.items.slice(1);
                return (
                  <View
                    key={group.categoryKey}
                    style={{
                      marginBottom: 4,
                      borderTopWidth: gIdx > 0 ? 0.75 : 0,
                      borderTopColor: '#cbd5e1',
                      borderTopStyle: 'dotted',
                      paddingTop: gIdx > 0 ? 4 : 0,
                    }}
                  >
                    <View wrap={false}>
                      {gIdx === 0 ? headingIfNormal : null}
                      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 2.5 }}>
                        {renderTwoColPubIcon(group.categoryKey, '#111827')}
                        <Text style={{ fontFamily: fontBold, fontSize: scale.entryTitlePt - 0.25, color: accent }}>
                          {group.label}
                        </Text>
                      </View>
                      {firstPub ? renderTwoColPubItem(firstPub) : null}
                    </View>
                    {remainingPubs.map((pub) => renderTwoColPubItem(pub))}
                  </View>
                );
              })}
            </View>
          );
        }

        if (isElegantSerif) {
          return (
            <View key={key} style={{ marginTop: showEditorialHeading ? scale.sectionGapPt : 0, marginBottom: 4 }}>
              {sliceItems(effectiveResume.publications || []).map((pub, idx) => {
                const { doiUrl, venue } = getPublicationParts(pub);
                const extUrl = pub.url?.trim()
                  ? pub.url.trim().startsWith('http')
                    ? pub.url.trim()
                    : `https://${pub.url.trim()}`
                  : doiUrl;
                return (
                  <View key={pub.id} style={{ marginBottom: 4 }}>
                    {renderEditorialDateRow(
                      pub.year?.trim() || pub.publicationDate?.trim() || '',
                      <View>
                        <Text
                          style={{
                            fontFamily: fontBold,
                            fontSize: scale.bodyPt,
                            lineHeight: scale.lineHeight,
                            color: '#111111',
                          }}
                        >
                          <Text style={{ fontFamily: fontItalic }}>{pub.title}</Text>
                        </Text>
                        {pub.authors ? (
                          <Text style={{ fontSize: scale.bodyPt, lineHeight: scale.lineHeight, color: '#374151', marginTop: 0.5 }}>
                            {pub.authors}
                          </Text>
                        ) : null}
                        {venue || pub.volume || pub.issue || pub.pages || pub.status ? (
                          <Text style={{ fontSize: scale.metaPt - 0.15, lineHeight: scale.lineHeight, color: '#374151' }}>
                            {venue}
                            {pub.volume ? `, Vol. ${pub.volume}` : ''}
                            {pub.issue ? ` (${pub.issue})` : ''}
                            {pub.pages ? `, pp. ${pub.pages}` : ''}
                            {pub.status && pub.status !== 'Published' ? ` [${pub.status}]` : ''}
                          </Text>
                        ) : null}
                        {pub.doi || extUrl ? (
                          <View style={{ marginTop: 0.5 }}>
                            {extUrl ? (
                              <Link src={extUrl} style={{ fontSize: scale.metaPt - 0.25, color: '#111111', textDecoration: 'none' }}>
                                {pub.doi ? `DOI: ${pub.doi}` : pub.url?.replace(/^https?:\/\//, '')}
                              </Link>
                            ) : (
                              <Text style={{ fontSize: scale.metaPt - 0.25, color: '#111111' }}>
                                DOI: {pub.doi}
                              </Text>
                            )}
                          </View>
                        ) : null}
                      </View>,
                      showEditorialHeading && idx === 0 ? headingIfNormal : undefined
                    )}
                  </View>
                );
              })}
            </View>
          );
        }

        return (
          <View key={key} style={{ marginTop: scale.sectionGapPt, marginBottom: 4 }}>
            {headingIfNormal}
            {(effectiveResume.publications || []).map((pub, idx) =>
              wrapAsymmetric(
                <View key={pub.id} style={{ flexDirection: 'row', marginBottom: 5, paddingLeft: 4 }} wrap={false}>
                  <Text
                    style={{
                      width: template.citationStyle === 'bracketed' ? 22 : 18,
                      fontSize: scale.entrySubtitlePt,
                      color: col,
                    }}
                  >
                    {template.citationStyle === 'bracketed' ? `[${idx + 1}]` : `${idx + 1}.`}
                  </Text>
                  {renderPublicationCitation(pub, col)}
                </View>,
                idx === 0,
                pub.id
              )
            )}
          </View>
        );
      }

      case 'projects':
        return (
          <View key={key} style={{ marginTop: showEditorialHeading ? scale.sectionGapPt : 0, marginBottom: isJakes ? 1 : 4 }}>
            {!isTwoColumnPro && !isElegantSerif ? headingIfNormal : null}
            {sliceItems(effectiveResume.projects || []).map((proj, idx) => {
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
              const cleanProjUrl = proj.link
                ? proj.link.startsWith('http')
                  ? proj.link
                  : `https://${proj.link}`
                : null;
              const cleanGithubUrl = proj.githubUrl
                ? proj.githubUrl.startsWith('http')
                  ? proj.githubUrl
                  : `https://${proj.githubUrl}`
                : null;
              const cleanProjLabel = proj.link ? proj.link.replace(/^https?:\/\//, '') : '';
              const cleanGithubLabel = proj.githubUrl
                ? proj.githubUrl.replace(/^https?:\/\//, '')
                : '';

              const swStackParts: string[] = [];
              if (isSoftwareDev) {
                if (proj.technologies?.length) swStackParts.push(`Tech: ${proj.technologies.join(', ')}`);
                if (proj.frameworks?.length) swStackParts.push(`Frameworks: ${proj.frameworks.join(', ')}`);
                if (proj.database?.trim()) swStackParts.push(`Database: ${proj.database.trim()}`);
                if (proj.tools?.length) swStackParts.push(`Tools: ${proj.tools.join(', ')}`);
              }

              return (
                <View key={proj.id} style={{ marginBottom: scale.entryGapPt, paddingLeft: isJakes ? 8 : 0 }}>
                  {wrapAsymmetric(
                    isElegantSerif ? (
                      renderEditorialDateTimeline(
                        [
                          proj.startDate?.trim(),
                          proj.current ? 'Present' : proj.endDate?.trim(),
                        ]
                          .filter(Boolean)
                          .join(' – '),
                        <View>
                          <Text style={{ fontFamily: fontBold, fontSize: scale.entryTitlePt, color: '#111111', lineHeight: 1.24 }}>
                            {proj.title}
                            {proj.teamType?.trim() ? (
                              <Text style={{ fontFamily: fontItalic, fontSize: scale.metaPt, color: '#4b5563' }}>
                                {` (${proj.teamType.trim()})`}
                              </Text>
                            ) : null}
                          </Text>
                          {proj.institution ? (
                            <Text style={{ fontSize: scale.entrySubtitlePt - 0.25, color: '#1f2937', marginTop: 0.5 }}>
                              {renderEditorialSmallCaps(proj.institution, scale.entrySubtitlePt - 0.25)}
                            </Text>
                          ) : null}
                          {cleanGithubUrl || cleanProjUrl ? (
                            <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginTop: 1 }}>
                              {cleanGithubUrl ? (
                                <Link src={cleanGithubUrl} style={{ fontSize: scale.metaPt - 0.2, color: '#1f2937', textDecoration: 'none', marginRight: 8 }}>
                                  {cleanGithubLabel}
                                </Link>
                              ) : null}
                              {cleanProjUrl ? (
                                <Link src={cleanProjUrl} style={{ fontSize: scale.metaPt - 0.2, color: '#1f2937', textDecoration: 'none' }}>
                                  {cleanProjLabel}
                                </Link>
                              ) : null}
                            </View>
                          ) : null}
                          {proj.technologies && proj.technologies.length > 0 ? (
                            <Text style={{ fontFamily: fontItalic, fontSize: scale.metaPt - 0.2, color: '#4b5563', marginTop: 1 }}>
                              {proj.technologies.join(', ')}
                            </Text>
                          ) : null}
                          {proj.description ? (
                            <Text style={{ fontSize: scale.bodyPt, lineHeight: scale.lineHeight, color: '#374151', marginTop: 1.5, marginBottom: 1 }}>
                              {proj.description}
                            </Text>
                          ) : null}
                          {firstBullet ? (
                            <View style={{ flexDirection: 'row', marginTop: 1.5 }}>
                              <Text style={{ width: 9, fontSize: scale.entrySubtitlePt, color: col }}>
                                {bulletChar}
                              </Text>
                              <Text style={{ flex: 1, fontSize: scale.bodyPt, lineHeight: scale.lineHeight, color: col }}>
                                {firstBullet}
                              </Text>
                            </View>
                          ) : null}
                        </View>,
                        showEditorialHeading && idx === 0 ? headingIfNormal : undefined
                      )
                    ) : isModernCorporate ? (
                      renderModerncvRow(
                        [
                          proj.startDate?.trim(),
                          proj.current ? 'Present' : proj.endDate?.trim(),
                        ]
                          .filter(Boolean)
                          .join('–'),
                        <View>
                          <Text style={{ fontSize: scale.entrySubtitlePt, lineHeight: 1.3, color: col }}>
                            <Text style={{ fontFamily: fontBold }}>{proj.title}</Text>
                            {proj.institution?.trim() ? (
                              <Text>
                                , <Text style={{ fontFamily: fontItalic }}>{proj.institution.trim()}</Text>
                              </Text>
                            ) : null}
                            {proj.projectType?.trim() ? (
                              <Text style={{ fontFamily: fontItalic, color: '#4b5563', fontSize: scale.metaPt - 0.2 }}>
                                {` (${proj.projectType.trim()})`}
                              </Text>
                            ) : null}
                            {cleanGithubUrl ? (
                              <Text style={{ fontSize: scale.metaPt - 0.25 }}>
                                {' '}
                                <Link src={cleanGithubUrl} style={{ color: accent, textDecoration: 'none' }}>
                                  {cleanGithubLabel}
                                </Link>
                              </Text>
                            ) : null}
                            {cleanProjUrl ? (
                              <Text style={{ fontSize: scale.metaPt - 0.25 }}>
                                {' '}
                                <Link src={cleanProjUrl} style={{ color: accent, textDecoration: 'none' }}>
                                  {cleanProjLabel}
                                </Link>
                              </Text>
                            ) : null}
                          </Text>
                          {proj.technologies && proj.technologies.length > 0 ? (
                            <Text style={{ fontFamily: fontItalic, fontSize: scale.metaPt - 0.2, color: '#4b5563', marginTop: 0.5 }}>
                              {proj.technologies.join(', ')}
                            </Text>
                          ) : null}
                          {proj.description?.trim() ? (
                            <Text style={{ fontSize: scale.bodyPt, color: '#1f2937', lineHeight: scale.lineHeight, marginTop: 1 }}>
                              {proj.description.trim()}
                            </Text>
                          ) : null}
                          {proj.contribution?.trim() ? (
                            <Text style={{ fontSize: scale.bodyPt - 0.15, color: '#374151', lineHeight: scale.lineHeight, marginTop: 1 }}>
                              <Text style={{ fontFamily: fontBold }}>Role: </Text>
                              {proj.contribution.trim()}
                            </Text>
                          ) : null}
                          {Array.isArray(proj.achievements) &&
                          proj.achievements.filter((a) => a.trim()).length > 0 ? (
                            <Text style={{ fontSize: scale.bodyPt - 0.15, color: '#374151', lineHeight: scale.lineHeight, marginTop: 1 }}>
                              <Text style={{ fontFamily: fontBold }}>Outcome: </Text>
                              {proj.achievements.filter((a) => a.trim()).join('; ')}
                            </Text>
                          ) : null}
                          {firstBullet ? (
                            <View style={{ flexDirection: 'row', marginTop: 1.5 }}>
                              {renderModerncvHollowCircle(col)}
                              <Text style={{ flex: 1, fontSize: scale.bodyPt, lineHeight: scale.lineHeight, color: col }}>
                                {firstBullet}
                              </Text>
                            </View>
                          ) : null}
                        </View>,
                        true
                      )
                    ) : isTwoColumnPro ? (
                      <View wrap={false}>
                        {idx === 0 ? headingIfNormal : null}
                        <View
                          style={{
                            borderTopWidth: idx > 0 ? 0.75 : 0,
                            borderTopColor: '#cbd5e1',
                            borderTopStyle: 'dotted',
                            paddingTop: idx > 0 ? 4 : 0,
                          }}
                        >
                        <Text style={{ fontFamily: fontBold, fontSize: scale.entryTitlePt, color: '#111827', lineHeight: 1.25 }}>
                          {proj.title}
                        </Text>
                        {proj.institution ? (
                          <Text style={{ fontFamily: fontBold, fontSize: scale.entrySubtitlePt, color: accent, marginTop: 0.5 }}>
                            {proj.institution}
                          </Text>
                        ) : null}
                        {proj.startDate || proj.endDate || cleanGithubUrl || cleanProjUrl ? (
                          <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', marginTop: 1.5, marginBottom: 2 }}>
                            {proj.startDate || proj.endDate ? (
                              <View style={{ flexDirection: 'row', alignItems: 'center', marginRight: 8 }}>
                                {renderTwoColMetaIcon('calendar', '#6b7280')}
                                <Text style={{ fontSize: scale.metaPt - 0.25, color: '#4b5563' }}>
                                  {proj.startDate}
                                  {proj.endDate && proj.endDate !== proj.startDate ? ` – ${proj.endDate}` : ''}
                                </Text>
                              </View>
                            ) : null}
                            {cleanGithubUrl ? (
                              <Link src={cleanGithubUrl} style={{ fontSize: scale.metaPt - 0.25, color: accent, textDecoration: 'none', marginRight: 8 }}>
                                {cleanGithubLabel}
                              </Link>
                            ) : null}
                            {cleanProjUrl ? (
                              <Link src={cleanProjUrl} style={{ fontSize: scale.metaPt - 0.25, color: accent, textDecoration: 'none' }}>
                                {cleanProjLabel}
                              </Link>
                            ) : null}
                          </View>
                        ) : null}
                        {proj.description ? (
                          <Text style={{ fontSize: scale.bodyPt, lineHeight: scale.lineHeight, color: '#374151', marginBottom: 1.5 }}>
                            {proj.description}
                          </Text>
                        ) : null}
                        {proj.problemSolved ? (
                          <Text style={{ fontSize: scale.bodyPt - 0.25, lineHeight: scale.lineHeight, color: '#374151' }}>
                            <Text style={{ fontFamily: fontBold }}>Problem: </Text>
                            {proj.problemSolved}
                          </Text>
                        ) : null}
                        {proj.contribution ? (
                          <Text style={{ fontSize: scale.bodyPt - 0.25, lineHeight: scale.lineHeight, color: '#374151' }}>
                            <Text style={{ fontFamily: fontBold }}>Role: </Text>
                            {proj.contribution}
                          </Text>
                        ) : null}
                        {proj.achievements ? (
                          <Text style={{ fontSize: scale.bodyPt - 0.25, lineHeight: scale.lineHeight, color: '#374151' }}>
                            <Text style={{ fontFamily: fontBold }}>Outcomes: </Text>
                            {proj.achievements}
                          </Text>
                        ) : null}
                        {proj.technologies && proj.technologies.length > 0 ? (
                          <Text style={{ fontSize: scale.metaPt - 0.25, color: '#4b5563', marginTop: 1 }}>
                            <Text style={{ fontFamily: fontBold }}>Technologies: </Text>
                            {proj.technologies.join(', ')}
                          </Text>
                        ) : null}
                        {firstBullet ? (
                          <View style={{ flexDirection: 'row', marginTop: 2, paddingLeft: 2 }}>
                            <Text style={{ width: 9, fontSize: scale.entrySubtitlePt, color: '#4b5563' }}>
                              {bulletChar}
                            </Text>
                            <Text style={{ flex: 1, fontSize: scale.bodyPt, lineHeight: scale.lineHeight, color: col }}>
                              {firstBullet}
                            </Text>
                          </View>
                        ) : null}
                        </View>
                      </View>
                    ) : isSoftwareDev ? (
                      <View wrap={false}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 1 }}>
                          <Text style={{ flex: 1, marginRight: 8, fontSize: scale.entryTitlePt, color: col }}>
                            <Text style={{ fontFamily: fontBold }}>{proj.title}</Text>
                            {proj.projectType?.trim() ? (
                              <Text style={{ fontFamily: fontItalic, fontSize: scale.metaPt, color: subCol }}>
                                {` (${proj.projectType.trim()})`}
                              </Text>
                            ) : null}
                            {cleanGithubUrl ? (
                              <Text style={{ fontSize: scale.metaPt }}>
                                {' '}
                                <Link src={cleanGithubUrl} style={{ color: accent, textDecoration: 'underline' }}>
                                  [GitHub]
                                </Link>
                              </Text>
                            ) : null}
                            {cleanProjUrl ? (
                              <Text style={{ fontSize: scale.metaPt }}>
                                {' '}
                                <Link src={cleanProjUrl} style={{ color: accent, textDecoration: 'underline' }}>
                                  [Live Demo]
                                </Link>
                              </Text>
                            ) : null}
                          </Text>
                          {proj.startDate || proj.endDate || proj.current ? (
                            <Text
                              style={{
                                fontFamily: fontRegular,
                                fontSize: scale.entrySubtitlePt,
                                color: col,
                                textAlign: 'right',
                              }}
                            >
                              {proj.startDate}
                              {proj.current ? ' – Present' : proj.endDate && proj.endDate !== proj.startDate ? ` – ${proj.endDate}` : ''}
                            </Text>
                          ) : null}
                        </View>
                        {swStackParts.length > 0 ? (
                          <Text style={{ fontFamily: fontItalic, fontSize: scale.metaPt, color: subCol, marginBottom: 1.5, lineHeight: 1.25 }}>
                            {swStackParts.join(' • ')}
                          </Text>
                        ) : null}
                        {proj.description ? (
                          <Text style={{ fontSize: scale.bodyPt, lineHeight: scale.lineHeight, marginBottom: 1.5, color: col }}>
                            {proj.description}
                          </Text>
                        ) : null}
                        {firstBullet ? (
                          <View style={{ flexDirection: 'row', marginTop: 1.5, paddingLeft: 8 }}>
                            <Text style={{ width: 10, fontSize: scale.entrySubtitlePt, color: col }}>
                              {bulletChar}
                            </Text>
                            <Text style={{ flex: 1, fontSize: scale.bodyPt, lineHeight: scale.lineHeight, color: col }}>
                              {firstBullet}
                            </Text>
                          </View>
                        ) : null}
                      </View>
                    ) : isJakes ? (
                      <View wrap={false}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 1 }}>
                          <Text style={{ flex: 1, marginRight: 8, fontSize: scale.entryTitlePt, color: col }}>
                            <Text style={{ fontFamily: fontBold }}>{proj.title}</Text>
                            {proj.technologies && proj.technologies.length > 0 ? (
                              <>
                                <Text> | </Text>
                                <Text style={{ fontFamily: fontItalic, fontSize: scale.entrySubtitlePt }}>
                                  {proj.technologies.join(', ')}
                                </Text>
                              </>
                            ) : null}
                            {cleanGithubUrl ? (
                              <Text style={{ fontSize: scale.metaPt }}>
                                {' '}
                                <Link src={cleanGithubUrl} style={{ color: col, textDecoration: 'underline' }}>
                                  [GitHub]
                                </Link>
                              </Text>
                            ) : null}
                            {cleanProjUrl ? (
                              <Text style={{ fontSize: scale.metaPt }}>
                                {' '}
                                <Link src={cleanProjUrl} style={{ color: col, textDecoration: 'underline' }}>
                                  [{cleanProjLabel.includes('github.com') ? 'GitHub' : 'Link'}]
                                </Link>
                              </Text>
                            ) : null}
                          </Text>
                          {proj.startDate || proj.endDate ? (
                            <Text
                              style={{
                                fontFamily: fontBold,
                                fontSize: scale.entrySubtitlePt,
                                color: col,
                                textAlign: 'right',
                              }}
                            >
                              {proj.startDate}
                              {proj.endDate && proj.endDate !== proj.startDate ? ` – ${proj.endDate}` : ''}
                            </Text>
                          ) : null}
                        </View>
                        {proj.description ? (
                          <Text style={{ fontSize: scale.bodyPt, lineHeight: scale.lineHeight, marginBottom: 1, paddingLeft: 10, color: col }}>
                            {proj.description}
                          </Text>
                        ) : null}
                        {firstBullet ? (
                          <View style={{ flexDirection: 'row', marginTop: 1, paddingLeft: 10 }}>
                            <Text style={{ width: 10, fontSize: scale.entrySubtitlePt, color: col }}>
                              {bulletChar}
                            </Text>
                            <Text style={{ flex: 1, fontSize: scale.bodyPt, lineHeight: scale.lineHeight, color: col }}>
                              {firstBullet}
                            </Text>
                          </View>
                        ) : null}
                      </View>
                    ) : isFresherResume ? (
                      <View wrap={false}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 1 }}>
                          <Text style={{ flex: 1, marginRight: 8, fontSize: scale.entryTitlePt, color: col }}>
                            <Text style={{ fontFamily: fontBold }}>{proj.title}</Text>
                            {proj.institution?.trim() ? (
                              <Text style={{ fontSize: scale.bodyPt - 0.1, color: subCol }}>
                                {`, ${proj.institution.trim()}`}
                              </Text>
                            ) : null}
                            {proj.technologies && proj.technologies.length > 0 ? (
                              <Text style={{ fontSize: scale.metaPt, color: subCol }}>
                                {` (${proj.technologies.join(', ')})`}
                              </Text>
                            ) : null}
                            {cleanGithubUrl ? (
                              <Text style={{ fontSize: scale.metaPt }}>
                                {' '}
                                <Link src={cleanGithubUrl} style={{ color: accent, textDecoration: 'none' }}>
                                  [GitHub]
                                </Link>
                              </Text>
                            ) : null}
                            {cleanProjUrl ? (
                              <Text style={{ fontSize: scale.metaPt }}>
                                {' '}
                                <Link src={cleanProjUrl} style={{ color: accent, textDecoration: 'none' }}>
                                  [{cleanProjLabel.includes('github.com') ? 'GitHub' : 'Link'}]
                                </Link>
                              </Text>
                            ) : null}
                          </Text>
                          {proj.startDate || proj.endDate || proj.current ? (
                            <Text
                              style={{
                                fontFamily: fontBold,
                                fontSize: scale.bodyPt,
                                color: col,
                                textAlign: 'right',
                              }}
                            >
                              {proj.startDate}
                              {proj.current
                                ? ' — Present'
                                : proj.endDate && proj.endDate !== proj.startDate
                                ? ` — ${proj.endDate}`
                                : ''}
                            </Text>
                          ) : null}
                        </View>
                        {proj.description?.trim() ? (
                          <Text style={{ fontSize: scale.bodyPt, lineHeight: scale.lineHeight, marginBottom: 1.5, color: subCol }}>
                            {proj.description.trim()}
                          </Text>
                        ) : null}
                        {proj.problemSolved?.trim() ? (
                          <Text style={{ fontSize: scale.bodyPt - 0.15, lineHeight: scale.lineHeight, color: subCol }}>
                            <Text style={{ fontFamily: fontBold }}>Problem Solved: </Text>
                            <Text>{proj.problemSolved.trim()}</Text>
                          </Text>
                        ) : null}
                        {proj.contribution?.trim() ? (
                          <Text style={{ fontSize: scale.bodyPt - 0.15, lineHeight: scale.lineHeight, color: subCol }}>
                            <Text style={{ fontFamily: fontBold }}>Contribution: </Text>
                            <Text>{proj.contribution.trim()}</Text>
                          </Text>
                        ) : null}
                        {firstBullet ? (
                          <View style={{ flexDirection: 'row', marginTop: 1.5, paddingLeft: 8 }}>
                            <Text style={{ width: 9, fontSize: scale.entrySubtitlePt, color: col }}>
                              {bulletChar}
                            </Text>
                            <Text style={{ flex: 1, fontSize: scale.bodyPt, lineHeight: scale.lineHeight, color: col }}>
                              {firstBullet}
                            </Text>
                          </View>
                        ) : null}
                      </View>
                    ) : (
                      <View wrap={false}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 1 }}>
                          <Text style={{ fontFamily: fontBold, fontSize: scale.entryTitlePt, color: col, flex: 1, marginRight: 8 }}>
                            {proj.title}
                          </Text>
                          {proj.startDate || proj.endDate ? (
                            <Text style={{ fontSize: scale.entrySubtitlePt, color: col, textAlign: 'right' }}>
                              {proj.startDate}
                              {proj.endDate ? ` – ${proj.endDate}` : ''}
                            </Text>
                          ) : null}
                        </View>
                        {proj.technologies?.length || proj.link || proj.githubUrl ? (
                          <View style={{ marginBottom: 2 }}>
                            <Text style={{ fontFamily: fontItalic, fontSize: scale.entrySubtitlePt, color: subCol }}>
                              {proj.technologies && proj.technologies.length > 0
                                ? `Technologies: ${proj.technologies.join(', ')} `
                                : ''}
                              {proj.link ? (
                                cleanProjUrl ? (
                                  <Link src={cleanProjUrl} style={{ color: col, textDecoration: 'none' }}>
                                    [{cleanProjLabel}]
                                  </Link>
                                ) : (
                                  `[${cleanProjLabel}]`
                                )
                              ) : null}
                              {proj.githubUrl ? (
                                cleanGithubUrl ? (
                                  <Text>
                                    {' '}
                                    <Link src={cleanGithubUrl} style={{ color: col, textDecoration: 'none' }}>
                                      [{cleanGithubLabel}]
                                    </Link>
                                  </Text>
                                ) : (
                                  ` [${cleanGithubLabel}]`
                                )
                              ) : null}
                            </Text>
                          </View>
                        ) : null}
                        {proj.description ? (
                          <Text style={{ fontSize: scale.bodyPt, lineHeight: scale.lineHeight, marginBottom: 2, color: col }}>
                            {proj.description}
                          </Text>
                        ) : null}
                        {firstBullet ? (
                          <View style={{ flexDirection: 'row', marginTop: 2, paddingLeft: 8 }}>
                            <Text style={{ width: 10, fontSize: scale.entrySubtitlePt, color: col }}>
                              {bulletChar}
                            </Text>
                            <Text style={{ flex: 1, fontSize: scale.bodyPt, lineHeight: scale.lineHeight, color: col }}>
                              {firstBullet}
                            </Text>
                          </View>
                        ) : null}
                      </View>
                    ),
                    idx === 0
                  )}

                  {remainingBullets.map((hl, bIdx) =>
                    wrapAsymmetric(
                      isElegantSerif ? (
                        <View key={bIdx} style={{ flexDirection: 'row', alignItems: 'flex-start' }} wrap={false}>
                          <View style={{ width: '22%', paddingRight: 7 }} />
                          <View style={{ flex: 1, borderLeftWidth: 0.75, borderLeftColor: '#555555', paddingLeft: 8, paddingTop: 1.5 }}>
                            <View style={{ flexDirection: 'row' }}>
                              <Text style={{ width: 9, fontSize: scale.entrySubtitlePt, color: col }}>
                                {bulletChar}
                              </Text>
                              <Text style={{ flex: 1, fontSize: scale.bodyPt, lineHeight: scale.lineHeight, color: col }}>
                                {hl}
                              </Text>
                            </View>
                          </View>
                        </View>
                      ) : isModernCorporate ? (
                        <View key={bIdx}>
                          {renderModerncvRow(
                            null,
                            <View style={{ flexDirection: 'row', marginTop: 1.5 }}>
                              {renderModerncvHollowCircle(col)}
                              <Text style={{ flex: 1, fontSize: scale.bodyPt, lineHeight: scale.lineHeight, color: col }}>
                                {hl}
                              </Text>
                            </View>,
                            true
                          )}
                        </View>
                      ) : (
                        <View key={bIdx} style={{ flexDirection: 'row', marginTop: isJakes ? 1 : 2, paddingLeft: isJakes ? 10 : isTwoColumnPro ? 2 : 8 }} wrap={false}>
                          <Text style={{ width: isTwoColumnPro ? 9 : 10, fontSize: scale.entrySubtitlePt, color: isTwoColumnPro ? '#4b5563' : col }}>
                            {bulletChar}
                          </Text>
                          <Text style={{ flex: 1, fontSize: scale.bodyPt, lineHeight: scale.lineHeight, color: col }}>
                            {hl}
                          </Text>
                        </View>
                      ),
                      false,
                      `${proj.id}-b-${bIdx}`
                    )
                  )}
                </View>
              );
            })}
          </View>
        );

      case 'daily-life': {
        const donut = computeDonutChartSegments(effectiveResume.dailyActivities || [], {
          accentColor: accent,
          viewBoxWidth: 256,
          viewBoxHeight: 152,
          outerRadius: 36,
          innerRadius: 16,
        });
        if (donut.segments.length === 0 || effectiveResume.showDailyActivityChart === false) {
          return null;
        }
        return (
          <View key={key} style={{ marginTop: scale.sectionGapPt, marginBottom: 4 }} wrap={false}>
            {headingIfNormal}
            <View
              style={{
                width: donut.viewBoxWidth,
                height: donut.viewBoxHeight,
                position: 'relative',
                alignSelf: 'center',
                marginTop: 2,
              }}
            >
              <Svg
                width={donut.viewBoxWidth}
                height={donut.viewBoxHeight}
                viewBox={`0 0 ${donut.viewBoxWidth} ${donut.viewBoxHeight}`}
              >
                {donut.segments.map((seg) => (
                  <React.Fragment key={seg.id}>
                    <Path d={seg.pathD} fill={seg.color} stroke="#ffffff" strokeWidth={1.2} />
                    <Path
                      d={`M ${seg.dotX} ${seg.dotY} L ${seg.elbowX} ${seg.elbowY} L ${seg.labelEndX} ${seg.labelY}`}
                      fill="none"
                      stroke="#334155"
                      strokeWidth={0.75}
                    />
                    <Circle cx={seg.dotX} cy={seg.dotY} r={2} fill="#ffffff" stroke="#334155" strokeWidth={0.85} />
                  </React.Fragment>
                ))}
              </Svg>
              {donut.segments.map((seg) => {
                const lines = wrapDonutLabelLines(seg.activity, 14);
                return (
                  <View
                    key={`lbl-${seg.id}`}
                    style={
                      seg.side === 'right'
                        ? {
                            position: 'absolute',
                            left: seg.labelEndX + 4,
                            top: seg.labelY - (lines.length > 1 ? 8 : 4.5),
                            width: Math.max(44, donut.viewBoxWidth - seg.labelEndX - 4),
                          }
                        : {
                            position: 'absolute',
                            right: donut.viewBoxWidth - seg.labelEndX + 4,
                            top: seg.labelY - (lines.length > 1 ? 8 : 4.5),
                            width: Math.max(44, seg.labelEndX - 4),
                          }
                    }
                  >
                    <Text
                      style={{
                        fontSize: 7,
                        lineHeight: 1.18,
                        color: '#1f2937',
                        textAlign: seg.side === 'right' ? 'left' : 'right',
                      }}
                    >
                      {lines.join('\n')}
                    </Text>
                  </View>
                );
              })}
            </View>
          </View>
        );
      }

      case 'philosophy': {
        const quote = (effectiveResume.personalQuote || '').trim();
        if (!quote) return null;
        return (
          <View key={key} style={{ marginTop: scale.sectionGapPt, marginBottom: 4 }} wrap={false}>
            {headingIfNormal}
            <Text
              style={{
                fontFamily: fontItalic,
                fontSize: scale.bodyPt + 0.35,
                lineHeight: 1.4,
                color: accent,
                textAlign: 'center',
                paddingHorizontal: 4,
                paddingVertical: 2,
              }}
            >
              "{quote}"
            </Text>
          </View>
        );
      }

      case 'strengths': {
        const items = (effectiveResume.strengths || []).map((s) => s.trim()).filter(Boolean);
        if (items.length === 0) return null;
        if (isModernCorporate) {
          return (
            <View key={key} style={{ marginTop: scale.sectionGapPt, marginBottom: 4 }} wrap={false}>
              {headingIfNormal}
              {renderModerncvRow(
                null,
                <Text style={{ fontSize: scale.bodyPt, lineHeight: scale.lineHeight, color: col }}>
                  {items.join('  •  ')}
                </Text>,
                true
              )}
            </View>
          );
        }
        return (
          <View key={key} style={{ marginTop: scale.sectionGapPt, marginBottom: 4 }} wrap={false}>
            {headingIfNormal}
            <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
              {items.map((chip, cIdx) => (
                <View
                  key={cIdx}
                  style={{
                    borderWidth: 0.75,
                    borderColor: '#cbd5e1',
                    borderRadius: 3,
                    paddingVertical: 2,
                    paddingHorizontal: 5.5,
                    marginRight: 4,
                    marginBottom: 4,
                  }}
                >
                  <Text style={{ fontSize: scale.metaPt - 0.35, fontFamily: fontBold, color: '#1f2937' }}>
                    {chip}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        );
      }

      case 'skills': {
        if (isHarvard) {
          const { rows } = getHarvardSkillsAndInterests(effectiveResume);
          if (rows.length === 0) return null;
          return (
            <View key={key} style={{ marginTop: scale.sectionGapPt, marginBottom: 4 }}>
              {headingIfNormal}
              {rows.map((row) => (
                <Text
                  key={row.key}
                  style={{
                    marginBottom: 2.5,
                    fontSize: scale.bodyPt,
                    lineHeight: scale.lineHeight,
                    color: col,
                  }}
                  wrap={false}
                >
                  <Text style={{ fontFamily: fontBold }}>{row.label}: </Text>
                  <Text>{row.text}</Text>
                </Text>
              ))}
            </View>
          );
        }

        if (isInternshipResume) {
          const skillRows = sliceItems(getInternshipSkillRows(effectiveResume));
          if (skillRows.length === 0) return null;
          const sliceOffset = opts.slice ? opts.slice.sliceStart : 0;
          return (
            <View key={key} style={{ marginTop: showEditorialHeading ? scale.sectionGapPt : 0, marginBottom: 4 }}>
              {showEditorialHeading ? headingIfNormal : null}
              {skillRows.map((row, idx) => {
                const hasProficiency =
                  row.proficiency !== null &&
                  row.proficiency !== undefined &&
                  row.proficiency >= 1 &&
                  row.proficiency <= 5;
                const showDottedDivider = sliceOffset + idx > 0;
                return (
                  <View
                    key={row.id}
                    style={{
                      marginBottom: scale.entryGapPt,
                      borderTopWidth: showDottedDivider ? 0.75 : 0,
                      borderTopColor: '#9ca3af',
                      borderTopStyle: 'dotted',
                      paddingTop: showDottedDivider ? 4.5 : 0,
                    }}
                    wrap={false}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                      <Text
                        style={{
                          fontFamily: fontBold,
                          fontSize: scale.entrySubtitlePt,
                          color: '#111827',
                          lineHeight: 1.32,
                          flex: 1,
                          paddingRight: hasProficiency ? 8 : 0,
                        }}
                      >
                        {row.label}
                      </Text>
                      {hasProficiency ? (
                        <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 2 }}>
                          {[1, 2, 3, 4, 5].map((dot) => (
                            <Svg
                              key={`${row.id}-${dot}`}
                              width={8}
                              height={8}
                              viewBox="0 0 12 12"
                              style={{ marginRight: dot < 5 ? 2.5 : 0 }}
                            >
                              <Circle
                                cx="6"
                                cy="6"
                                r="5.5"
                                fill={dot <= (row.proficiency as number) ? '#111827' : '#d1d5db'}
                              />
                            </Svg>
                          ))}
                        </View>
                      ) : null}
                    </View>
                  </View>
                );
              })}
            </View>
          );
        }

        const visibleSkills = getVisibleSkills(effectiveResume.skills);
        if (isModernCorporate) {
          const pairs = chunkPairs(visibleSkills);
          if (pairs.length === 0) return null;
          return (
            <View key={key} style={{ marginTop: scale.sectionGapPt, marginBottom: 4 }}>
              {headingIfNormal}
              {pairs.map((pair, pIdx) => (
                <View
                  key={`mc-skill-${pIdx}`}
                  style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 3 }}
                  wrap={false}
                >
                  {pair.map((cat) => (
                    <View key={cat.id} style={{ width: '49%', flexDirection: 'row', alignItems: 'flex-start' }}>
                      <Text
                        style={{
                          width: '38.8%',
                          paddingRight: 10,
                          fontSize: scale.metaPt,
                          lineHeight: scale.lineHeight,
                          color: '#111827',
                          textAlign: 'right',
                        }}
                      >
                        {cat.category}
                      </Text>
                      <Text
                        style={{
                          width: '61.2%',
                          fontSize: scale.bodyPt,
                          lineHeight: scale.lineHeight,
                          color: col,
                        }}
                      >
                        {(cat.skills || []).join(', ')}
                      </Text>
                    </View>
                  ))}
                </View>
              ))}
            </View>
          );
        }

        if (isElegantSerif) {
          const nonEmptyEditorialSkills = sliceItems(
            visibleSkills.filter((cat) => (cat.skills || []).some((s) => s.trim()))
          );
          if (nonEmptyEditorialSkills.length === 0) return null;
          return (
            <View key={key} style={{ marginTop: showEditorialHeading ? scale.sectionGapPt : 0, marginBottom: 4 }}>
              {nonEmptyEditorialSkills.map((cat, idx) => {
                const items = (cat.skills || []).map((s) => s.trim()).filter(Boolean);
                return (
                  <View key={cat.id} wrap={false}>
                    {showEditorialHeading && idx === 0 ? headingIfNormal : null}
                    <Text
                      style={{
                        marginBottom: 2.5,
                        fontSize: scale.bodyPt,
                        lineHeight: scale.lineHeight,
                        color: col,
                      }}
                    >
                      {cat.category?.trim() ? (
                        <Text style={{ fontFamily: fontBold }}>{cat.category.trim()}: </Text>
                      ) : null}
                      <Text style={{ color: '#1f2937' }}>{items.join(', ')}</Text>
                    </Text>
                  </View>
                );
              })}
            </View>
          );
        }

        if (isJakes) {
          return (
            <View key={key} style={{ marginTop: scale.sectionGapPt, marginBottom: 2 }}>
              {headingIfNormal}
              {visibleSkills.map((cat) => (
                <Text
                  key={cat.id}
                  style={{
                    paddingLeft: 8,
                    marginBottom: 2,
                    fontSize: scale.entrySubtitlePt,
                    lineHeight: scale.lineHeight,
                    color: col,
                  }}
                  wrap={false}
                >
                  <Text style={{ fontFamily: fontBold }}>{cat.category}: </Text>
                  <Text>{(cat.skills || []).join(', ')}</Text>
                </Text>
              ))}
            </View>
          );
        }

        if (template.skillsLayout === 'grid-2col' && !opts.isSidebar && !isAsymmetric) {
          const pairs = chunkPairs(visibleSkills);
          return (
            <View key={key} style={{ marginTop: scale.sectionGapPt, marginBottom: 4 }}>
              {headingIfNormal}
              {pairs.map((pair, pIdx) => (
                <View key={pIdx} style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 3 }} wrap={false}>
                  {pair.map((cat) => (
                    <Text key={cat.id} style={{ width: '48%', fontSize: scale.entrySubtitlePt, lineHeight: scale.lineHeight, color: col }}>
                      <Text style={{ fontFamily: fontBold }}>{cat.category}: </Text>
                      <Text>{(cat.skills || []).join(', ')}</Text>
                    </Text>
                  ))}
                </View>
              ))}
            </View>
          );
        }

        if (isFresherResume) {
          const nonEmptyFresherSkills = visibleSkills.filter((cat) =>
            (cat.skills || []).some((s) => s.trim())
          );
          if (nonEmptyFresherSkills.length === 0) return null;
          return (
            <View key={key} style={{ marginTop: scale.sectionGapPt, marginBottom: 4 }}>
              {headingIfNormal}
              {nonEmptyFresherSkills.map((cat) => {
                const items = (cat.skills || []).map((s) => s.trim()).filter(Boolean);
                return (
                  <View key={cat.id} style={{ flexDirection: 'row', alignItems: 'baseline', marginBottom: 2.5 }} wrap={false}>
                    <Text
                      style={{
                        width: 98,
                        paddingRight: 8,
                        fontFamily: fontBold,
                        fontSize: scale.bodyPt,
                        color: col,
                      }}
                    >
                      {cat.category}
                    </Text>
                    <Text style={{ flex: 1, fontSize: scale.bodyPt, lineHeight: scale.lineHeight, color: col }}>
                      {items.join(', ')}
                    </Text>
                  </View>
                );
              })}
            </View>
          );
        }

        return (
          <View key={key} style={{ marginTop: scale.sectionGapPt, marginBottom: 4 }}>
            {headingIfNormal}
            {visibleSkills.map((cat, idx) =>
              wrapAsymmetric(
                opts.isSidebar ? (
                  <View key={cat.id} style={{ marginBottom: 4 }} wrap={false}>
                    <Text style={{ fontFamily: fontBold, fontSize: scale.metaPt, color: col }}>
                      {cat.category}
                    </Text>
                    <Text style={{ fontSize: scale.metaPt, lineHeight: 1.35, color: subCol }}>
                      {(cat.skills || []).join(', ')}
                    </Text>
                  </View>
                ) : (
                  <View key={cat.id} style={{ flexDirection: 'row', marginBottom: 3 }} wrap={false}>
                    <Text
                      style={{
                        width: isAsymmetric ? 130 : 168,
                        paddingRight: 6,
                        fontFamily: fontBold,
                        fontSize: scale.entrySubtitlePt,
                        color: col,
                      }}
                    >
                      {cat.category}:
                    </Text>
                    <Text style={{ flex: 1, fontSize: scale.entrySubtitlePt, lineHeight: scale.lineHeight, color: col }}>
                      {(cat.skills || []).join(', ')}
                    </Text>
                  </View>
                ),
                idx === 0,
                cat.id
              )
            )}
          </View>
        );
      }

      case 'achievements':
        if (isFresherResume) {
          const yearGroups = groupAwardsByYearForFresher(effectiveResume.achievements || []);
          if (yearGroups.length === 0) return null;
          return (
            <View key={key} style={{ marginTop: scale.sectionGapPt, marginBottom: 4 }}>
              {headingIfNormal}
              {yearGroups.map((group, gIdx) => (
                <View
                  key={`ach-year-${gIdx}-${group.year || 'unlisted'}`}
                  style={{ flexDirection: 'row', alignItems: 'baseline', marginBottom: 2 }}
                  wrap={false}
                >
                  <Text
                    style={{
                      width: 46,
                      paddingRight: 6,
                      fontFamily: fontBold,
                      fontSize: scale.bodyPt,
                      color: '#111827',
                    }}
                  >
                    {group.year}
                  </Text>
                  <Text style={{ flex: 1, fontSize: scale.bodyPt, lineHeight: scale.lineHeight, color: col }}>
                    {group.items.map((ach, aIdx) => {
                      const detailParts = [
                        ach.rank?.trim() || '',
                        ach.issuer?.trim() || '',
                        ach.description?.trim() || '',
                      ].filter(Boolean);
                      const cleanAwardUrl = ach.url?.trim()
                        ? ach.url.trim().startsWith('http')
                          ? ach.url.trim()
                          : `https://${ach.url.trim()}`
                        : null;
                      return (
                        <React.Fragment key={ach.id}>
                          {aIdx > 0 ? '; ' : ''}
                          <Text style={{ fontFamily: fontBold }}>{ach.title}</Text>
                          {detailParts.length > 0 ? (
                            <Text style={{ color: subCol }}>{` (${detailParts.join(' · ')})`}</Text>
                          ) : null}
                          {cleanAwardUrl ? (
                            <Text>
                              {' '}
                              <Link src={cleanAwardUrl} style={{ color: accent, fontSize: scale.metaPt, textDecoration: 'none' }}>
                                [Link]
                              </Link>
                            </Text>
                          ) : null}
                        </React.Fragment>
                      );
                    })}
                  </Text>
                </View>
              ))}
            </View>
          );
        }

        return (
          <View key={key} style={{ marginTop: showEditorialHeading ? scale.sectionGapPt : 0, marginBottom: 4 }}>
            {!isTwoColumnPro && !isElegantSerif && !(isInternshipResume && !showEditorialHeading)
              ? headingIfNormal
              : null}
            {sliceItems(effectiveResume.achievements || []).map((ach, idx) =>
              wrapAsymmetric(
                isElegantSerif ? (
                  <View key={ach.id} style={{ marginBottom: scale.entryGapPt }}>
                    {renderEditorialDateRow(
                      ach.date?.trim() || '',
                      <View>
                        <Text style={{ fontFamily: fontBold, fontSize: scale.entryTitlePt, color: '#111111', lineHeight: 1.24 }}>
                          {ach.title}
                        </Text>
                        {ach.category?.trim() || ach.issuer?.trim() ? (
                          <Text style={{ fontFamily: fontItalic, fontSize: scale.metaPt, color: '#374151', marginTop: 0.5 }}>
                            {[ach.issuer?.trim(), ach.category?.trim()].filter(Boolean).join(' · ')}
                          </Text>
                        ) : null}
                        {ach.description?.trim() || ach.achievementDetails?.trim() ? (
                          <Text style={{ fontSize: scale.bodyPt, color: '#374151', lineHeight: scale.lineHeight, marginTop: 1 }}>
                            {[ach.description?.trim(), ach.achievementDetails?.trim()].filter(Boolean).join(' — ')}
                          </Text>
                        ) : null}
                      </View>,
                      showEditorialHeading && idx === 0 ? headingIfNormal : undefined
                    )}
                  </View>
                ) : isModernCorporate ? (
                  <View key={ach.id} style={{ marginBottom: scale.entryGapPt }}>
                    {renderModerncvRow(
                      ach.date?.trim() || '',
                      <View>
                        <Text style={{ fontSize: scale.entrySubtitlePt, lineHeight: 1.3, color: col }}>
                          <Text style={{ fontFamily: fontBold }}>{ach.title}</Text>
                          {ach.issuer?.trim() ? (
                            <Text>
                              , <Text style={{ fontFamily: fontItalic }}>{ach.issuer.trim()}</Text>
                            </Text>
                          ) : null}
                          {ach.category?.trim() ? (
                            <Text style={{ color: '#4b5563', fontSize: scale.metaPt - 0.25 }}>
                              {` (${ach.category.trim()})`}
                            </Text>
                          ) : null}
                        </Text>
                        {ach.description?.trim() || ach.achievementDetails?.trim() ? (
                          <Text style={{ fontSize: scale.bodyPt, color: '#1f2937', lineHeight: scale.lineHeight, marginTop: 1 }}>
                            {[ach.description?.trim(), ach.achievementDetails?.trim()].filter(Boolean).join(' — ')}
                          </Text>
                        ) : null}
                      </View>,
                      true
                    )}
                  </View>
                ) : isTwoColumnPro ? (
                  <View key={ach.id} wrap={false}>
                    {idx === 0 ? headingIfNormal : null}
                    <View
                      style={{
                        flexDirection: 'row',
                        alignItems: 'flex-start',
                        marginBottom: scale.entryGapPt,
                        borderTopWidth: idx > 0 ? 0.75 : 0,
                        borderTopColor: '#cbd5e1',
                        borderTopStyle: 'dotted',
                        paddingTop: idx > 0 ? 4 : 0,
                      }}
                    >
                    <View style={{ width: 18, alignItems: 'center', marginRight: 5, marginTop: 1 }}>
                      {renderTwoColAchievementIcon(ach.icon, accent)}
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontFamily: fontBold, fontSize: scale.entryTitlePt - 0.25, color: '#111827', lineHeight: 1.25 }}>
                        {ach.title}
                      </Text>
                      {ach.issuer || ach.description || ach.date ? (
                        <Text style={{ fontSize: scale.bodyPt - 0.25, color: '#4b5563', lineHeight: 1.32, marginTop: 1 }}>
                          {ach.issuer ? ach.issuer : ''}
                          {ach.issuer && ach.date ? ` (${ach.date})` : !ach.issuer && ach.date ? ach.date : ''}
                          {(ach.issuer || ach.date) && ach.description ? ' — ' : ''}
                          {ach.description ? ach.description : ''}
                        </Text>
                      ) : null}
                    </View>
                    </View>
                  </View>
                ) : isInternshipResume ? (
                  <View key={ach.id} style={{ marginBottom: scale.entryGapPt }} wrap={false}>
                    <Text
                      style={{
                        fontFamily: fontBold,
                        fontSize: scale.entryTitlePt,
                        color: '#111827',
                        lineHeight: 1.25,
                      }}
                    >
                      {ach.title}
                    </Text>
                    <View style={{ flexDirection: 'row', alignItems: 'flex-start', marginTop: 1.5 }}>
                      {renderInternshipTrophyIcon('#111827')}
                      <View style={{ flex: 1 }}>
                        {(() => {
                          const metaLine = [
                            ach.rank?.trim(),
                            ach.role?.trim(),
                            ach.participationType?.trim(),
                            ach.teamType?.trim(),
                            ach.issuer?.trim(),
                            ach.date?.trim(),
                          ]
                            .filter(Boolean)
                            .join(' · ');
                          const cleanUrl = ach.url?.trim()
                            ? ach.url.trim().startsWith('http')
                              ? ach.url.trim()
                              : `https://${ach.url.trim()}`
                            : null;
                          return (
                            <>
                              {ach.description?.trim() ? (
                                <Text style={{ fontSize: scale.bodyPt - 0.15, color: '#1f2937', lineHeight: 1.34 }}>
                                  {ach.description.trim()}
                                </Text>
                              ) : null}
                              {metaLine && !ach.description?.trim()?.includes(metaLine) ? (
                                <Text
                                  style={{
                                    fontSize: scale.bodyPt - 0.15,
                                    color: '#374151',
                                    lineHeight: 1.34,
                                    marginTop: ach.description?.trim() ? 1 : 0,
                                  }}
                                >
                                  {metaLine}
                                </Text>
                              ) : null}
                              {ach.responsibilities?.trim() ? (
                                <Text style={{ fontSize: scale.bodyPt - 0.15, color: '#1f2937', lineHeight: 1.34, marginTop: 1 }}>
                                  {ach.responsibilities.trim()}
                                </Text>
                              ) : null}
                              {ach.outcome?.trim() ? (
                                <Text style={{ fontSize: scale.bodyPt - 0.15, color: '#1f2937', lineHeight: 1.34, marginTop: 1 }}>
                                  {ach.outcome.trim()}
                                </Text>
                              ) : null}
                              {ach.achievementDetails?.trim() ? (
                                <Text style={{ fontSize: scale.bodyPt - 0.15, color: '#1f2937', lineHeight: 1.34, marginTop: 1 }}>
                                  {ach.achievementDetails.trim()}
                                </Text>
                              ) : null}
                              {cleanUrl ? (
                                <Link
                                  src={cleanUrl}
                                  style={{ fontSize: scale.bodyPt - 0.15, color: '#111827', textDecoration: 'none', marginTop: 1 }}
                                >
                                  {ach.url?.trim()}
                                </Link>
                              ) : null}
                            </>
                          );
                        })()}
                      </View>
                    </View>
                  </View>
                ) : (
                  <View key={ach.id} style={{ marginBottom: scale.entryGapPt }} wrap={false}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 1 }}>
                      <Text style={{ fontFamily: fontBold, fontSize: scale.entryTitlePt, color: col, flex: 1, marginRight: 8 }}>
                        {ach.title}
                      </Text>
                      <Text style={{ fontSize: scale.entrySubtitlePt, color: col, textAlign: 'right' }}>
                        {ach.date}
                      </Text>
                    </View>
                    {(ach.issuer || ach.description) && (
                      <Text style={{ fontSize: scale.bodyPt, color: subCol, lineHeight: 1.32 }}>
                        {ach.issuer ? ach.issuer : ''}
                        {ach.issuer && ach.description ? ' — ' : ''}
                        {ach.description ? ach.description : ''}
                      </Text>
                    )}
                  </View>
                ),
                idx === 0,
                ach.id
              )
            )}
          </View>
        );

      case 'leadership':
        return (
          <View key={key} style={{ marginTop: showEditorialHeading ? scale.sectionGapPt : 0, marginBottom: isJakes ? 1 : 4 }}>
            {!isElegantSerif ? headingIfNormal : null}
            {sliceItems(effectiveResume.leadership || []).map((lead, idx) => {
              const bullets = cleanHighlights(lead.highlights);
              const firstBullet = bullets[0];
              const remainingBullets = bullets.slice(1);
              const leadDateRange = [
                lead.startDate?.trim(),
                lead.current ? 'Present' : lead.endDate?.trim(),
              ]
                .filter(Boolean)
                .join(' – ');

              return (
                <View key={lead.id} style={{ marginBottom: scale.entryGapPt, paddingLeft: isJakes ? 8 : 0 }}>
                  {wrapAsymmetric(
                    isElegantSerif ? (
                      renderEditorialDateRow(
                        leadDateRange,
                        <View>
                          <Text style={{ fontFamily: fontBold, fontSize: scale.entryTitlePt, color: '#111111', lineHeight: 1.24 }}>
                            {lead.role}
                          </Text>
                          {lead.organization || lead.location ? (
                            <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', marginTop: 0.5 }}>
                              {lead.organization ? (
                                <Text
                                  style={{
                                    fontSize: scale.entrySubtitlePt - 0.25,
                                    color: '#1f2937',
                                    marginRight: lead.location ? 5 : 0,
                                  }}
                                >
                                  {renderEditorialSmallCaps(lead.organization, scale.entrySubtitlePt - 0.25)}
                                </Text>
                              ) : null}
                              {lead.location ? (
                                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                  {renderEditorialContactIcon('location', '#4b5563')}
                                  <Text style={{ fontSize: scale.entrySubtitlePt - 0.25, color: '#4b5563' }}>
                                    {lead.location}
                                  </Text>
                                </View>
                              ) : null}
                            </View>
                          ) : null}
                          {firstBullet ? (
                            <View style={{ flexDirection: 'row', marginTop: 1.5 }}>
                              <Text style={{ width: 9, fontSize: scale.entrySubtitlePt, color: col }}>
                                {bulletChar}
                              </Text>
                              <Text style={{ flex: 1, fontSize: scale.bodyPt, lineHeight: scale.lineHeight, color: col }}>
                                {firstBullet}
                              </Text>
                            </View>
                          ) : null}
                        </View>,
                        showEditorialHeading && idx === 0 ? headingIfNormal : undefined
                      )
                    ) : isModernCorporate ? (
                      renderModerncvRow(
                        leadDateRange,
                        <View>
                          <Text style={{ fontSize: scale.entrySubtitlePt, lineHeight: 1.3, color: col }}>
                            <Text style={{ fontFamily: fontBold }}>{lead.role}</Text>
                            {lead.organization?.trim() ? (
                              <Text>
                                , <Text style={{ fontFamily: fontItalic }}>{lead.organization.trim()}</Text>
                              </Text>
                            ) : null}
                            {lead.location?.trim() ? (
                              <Text>
                                , <Text style={{ fontFamily: fontItalic }}>{lead.location.trim()}</Text>
                              </Text>
                            ) : null}
                          </Text>
                          {firstBullet ? (
                            <View style={{ flexDirection: 'row', marginTop: 1.5 }}>
                              {renderModerncvHollowCircle(col)}
                              <Text style={{ flex: 1, fontSize: scale.bodyPt, lineHeight: scale.lineHeight, color: col }}>
                                {firstBullet}
                              </Text>
                            </View>
                          ) : null}
                        </View>,
                        true
                      )
                    ) : isHarvard ? (
                      <View wrap={false}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 0.5 }}>
                          <Text style={{ fontFamily: fontBold, fontSize: scale.entryTitlePt, color: col, flex: 1, marginRight: 8 }}>
                            {lead.organization}
                          </Text>
                          {lead.location ? (
                            <Text style={{ fontFamily: fontRegular, fontSize: scale.entrySubtitlePt, color: col, textAlign: 'right' }}>
                              {lead.location}
                            </Text>
                          ) : null}
                        </View>
                        {lead.role || lead.startDate || lead.endDate || lead.current ? (
                          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 1 }}>
                            <Text style={{ fontFamily: fontItalic, fontSize: scale.entrySubtitlePt, color: subCol, flex: 1, marginRight: 8 }}>
                              {lead.role}
                            </Text>
                            {lead.startDate || lead.endDate || lead.current ? (
                              <Text style={{ fontSize: scale.metaPt, color: metaCol, textAlign: 'right' }}>
                                {lead.startDate} – {lead.current ? 'Present' : lead.endDate}
                              </Text>
                            ) : null}
                          </View>
                        ) : null}
                        {firstBullet ? (
                          <View style={{ flexDirection: 'row', marginTop: 2, paddingLeft: 8 }}>
                            <Text style={{ width: 10, fontSize: scale.entrySubtitlePt, color: col }}>
                              {bulletChar}
                            </Text>
                            <Text style={{ flex: 1, fontSize: scale.bodyPt, lineHeight: scale.lineHeight, color: col }}>
                              {firstBullet}
                            </Text>
                          </View>
                        ) : null}
                      </View>
                    ) : isJakes ? (
                      <View wrap={false}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 1 }}>
                          <Text style={{ fontFamily: fontBold, fontSize: scale.entryTitlePt, color: col, flex: 1, marginRight: 8 }}>
                            {lead.organization}
                          </Text>
                          <Text style={{ fontFamily: fontBold, fontSize: scale.entrySubtitlePt, color: col, textAlign: 'right' }}>
                            {lead.startDate} – {lead.current ? 'Present' : lead.endDate}
                          </Text>
                        </View>
                        {lead.role || lead.location ? (
                          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 1 }}>
                            <Text style={{ fontFamily: fontItalic, fontSize: scale.entrySubtitlePt, color: subCol, flex: 1, marginRight: 8 }}>
                              {lead.role}
                            </Text>
                            {lead.location ? (
                              <Text style={{ fontFamily: fontItalic, fontSize: scale.metaPt, color: metaCol, textAlign: 'right' }}>
                                {lead.location}
                              </Text>
                            ) : null}
                          </View>
                        ) : null}
                        {firstBullet ? (
                          <View style={{ flexDirection: 'row', marginTop: 1, paddingLeft: 10 }}>
                            <Text style={{ width: 10, fontSize: scale.entrySubtitlePt, color: col }}>
                              {bulletChar}
                            </Text>
                            <Text style={{ flex: 1, fontSize: scale.bodyPt, lineHeight: scale.lineHeight, color: col }}>
                              {firstBullet}
                            </Text>
                          </View>
                        ) : null}
                      </View>
                    ) : (
                      <View wrap={false}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 1 }}>
                          <Text style={{ fontFamily: fontBold, fontSize: scale.entryTitlePt, color: col, flex: 1, marginRight: 8 }}>
                            {lead.role}, {lead.organization}
                          </Text>
                          <Text style={{ fontSize: scale.entrySubtitlePt, color: col, textAlign: 'right' }}>
                            {lead.startDate} – {lead.current ? 'Present' : lead.endDate}
                          </Text>
                        </View>
                        {lead.location ? (
                          <Text style={{ fontSize: scale.metaPt, fontFamily: fontItalic, color: metaCol, marginBottom: 1 }}>
                            {lead.location}
                          </Text>
                        ) : null}
                        {firstBullet ? (
                          <View style={{ flexDirection: 'row', marginTop: 2, paddingLeft: 8 }}>
                            <Text style={{ width: 10, fontSize: scale.entrySubtitlePt, color: col }}>
                              {bulletChar}
                            </Text>
                            <Text style={{ flex: 1, fontSize: scale.bodyPt, lineHeight: scale.lineHeight, color: col }}>
                              {firstBullet}
                            </Text>
                          </View>
                        ) : null}
                      </View>
                    ),
                    idx === 0
                  )}
                  {remainingBullets.map((hl, bIdx) =>
                    wrapAsymmetric(
                      isElegantSerif ? (
                        <View key={bIdx} style={{ flexDirection: 'row', alignItems: 'flex-start', marginTop: 1.5 }} wrap={false}>
                          <View style={{ width: '22%', paddingRight: 7 }} />
                          <View style={{ flex: 1, flexDirection: 'row', paddingLeft: 8 }}>
                            <Text style={{ width: 9, fontSize: scale.entrySubtitlePt, color: col }}>
                              {bulletChar}
                            </Text>
                            <Text style={{ flex: 1, fontSize: scale.bodyPt, lineHeight: scale.lineHeight, color: col }}>
                              {hl}
                            </Text>
                          </View>
                        </View>
                      ) : isModernCorporate ? (
                        <View key={bIdx}>
                          {renderModerncvRow(
                            null,
                            <View style={{ flexDirection: 'row', marginTop: 1.5 }}>
                              {renderModerncvHollowCircle(col)}
                              <Text style={{ flex: 1, fontSize: scale.bodyPt, lineHeight: scale.lineHeight, color: col }}>
                                {hl}
                              </Text>
                            </View>,
                            true
                          )}
                        </View>
                      ) : (
                        <View key={bIdx} style={{ flexDirection: 'row', marginTop: isJakes ? 1 : 2, paddingLeft: isJakes ? 10 : 8 }} wrap={false}>
                          <Text style={{ width: 10, fontSize: scale.entrySubtitlePt, color: col }}>
                            {bulletChar}
                          </Text>
                          <Text style={{ flex: 1, fontSize: scale.bodyPt, lineHeight: scale.lineHeight, color: col }}>
                            {hl}
                          </Text>
                        </View>
                      ),
                      false,
                      `${lead.id}-b-${bIdx}`
                    )
                  )}
                </View>
              );
            })}
          </View>
        );

      case 'volunteer':
        return (
          <View key={key} style={{ marginTop: scale.sectionGapPt, marginBottom: 4 }}>
            {headingIfNormal}
            {(effectiveResume.volunteer || []).map((vol, idx) => {
              const bullets = cleanHighlights(vol.highlights);
              const firstBullet = bullets[0];
              const remainingBullets = bullets.slice(1);

              return (
                <View key={vol.id} style={{ marginBottom: scale.entryGapPt }}>
                  {wrapAsymmetric(
                    <View wrap={false}>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 1 }}>
                        <Text style={{ fontFamily: fontBold, fontSize: scale.entryTitlePt, color: col, flex: 1, marginRight: 8 }}>
                          {vol.role}, {vol.organization}
                        </Text>
                        <Text style={{ fontSize: scale.entrySubtitlePt, color: col, textAlign: 'right' }}>
                          {vol.startDate} – {vol.current ? 'Present' : vol.endDate}
                        </Text>
                      </View>
                      {firstBullet ? (
                        <View style={{ flexDirection: 'row', marginTop: 2, paddingLeft: 8 }}>
                          <Text style={{ width: 10, fontSize: scale.entrySubtitlePt, color: col }}>
                            {bulletChar}
                          </Text>
                          <Text style={{ flex: 1, fontSize: scale.bodyPt, lineHeight: scale.lineHeight, color: col }}>
                            {firstBullet}
                          </Text>
                        </View>
                      ) : null}
                    </View>,
                    idx === 0
                  )}
                  {remainingBullets.map((hl, bIdx) =>
                    wrapAsymmetric(
                      <View key={bIdx} style={{ flexDirection: 'row', marginTop: 2, paddingLeft: 8 }} wrap={false}>
                        <Text style={{ width: 10, fontSize: scale.entrySubtitlePt, color: col }}>
                          {bulletChar}
                        </Text>
                        <Text style={{ flex: 1, fontSize: scale.bodyPt, lineHeight: scale.lineHeight, color: col }}>
                          {hl}
                        </Text>
                      </View>,
                      false,
                      `${vol.id}-b-${bIdx}`
                    )
                  )}
                </View>
              );
            })}
          </View>
        );

      case 'memberships':
        return (
          <View key={key} style={{ marginTop: showEditorialHeading ? scale.sectionGapPt : 0, marginBottom: 4 }}>
            {!isElegantSerif ? headingIfNormal : null}
            {sliceItems(effectiveResume.memberships || []).map((mem, idx) => {
              const memDateRange = [
                mem.startDate?.trim(),
                mem.endDate?.trim() || (mem.current ? 'Present' : ''),
              ]
                .filter(Boolean)
                .join(' – ');
              return wrapAsymmetric(
                isElegantSerif ? (
                  <View key={mem.id} style={{ marginBottom: 2.5 }}>
                    {renderEditorialDateRow(
                      memDateRange,
                      <Text style={{ fontSize: scale.bodyPt, lineHeight: scale.lineHeight, color: col }}>
                        <Text style={{ fontFamily: fontBold }}>{mem.organization}</Text>
                        {mem.membershipType ? ` — ${mem.membershipType}` : ''}
                        {mem.membershipId ? ` (ID: ${mem.membershipId})` : ''}
                      </Text>,
                      showEditorialHeading && idx === 0 ? headingIfNormal : undefined
                    )}
                  </View>
                ) : isModernCorporate ? (
                  <View key={mem.id} style={{ marginBottom: 2.5 }}>
                    {renderModerncvRow(
                      memDateRange,
                      <Text style={{ fontSize: scale.bodyPt, lineHeight: scale.lineHeight, color: col }}>
                        <Text style={{ fontFamily: fontBold }}>{mem.organization}</Text>
                        {mem.membershipType ? `, ${mem.membershipType}` : ''}
                        {mem.membershipId ? ` (ID: ${mem.membershipId})` : ''}
                      </Text>,
                      true
                    )}
                  </View>
                ) : opts.isSidebar ? (
                  <View key={mem.id} style={{ marginBottom: 3 }} wrap={false}>
                    <Text style={{ fontFamily: fontBold, fontSize: scale.metaPt, color: col }}>
                      {mem.organization}
                    </Text>
                    <Text style={{ fontSize: scale.metaPt, color: subCol }}>
                      {mem.membershipType || ''}
                      {mem.membershipId ? ` (${mem.membershipId})` : ''}
                    </Text>
                    <Text style={{ fontSize: scale.metaPt - 0.5, color: metaCol }}>
                      {mem.startDate}
                      {mem.endDate ? ` – ${mem.endDate}` : mem.current ? ' – Present' : ''}
                    </Text>
                  </View>
                ) : (
                  <View key={mem.id} style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 2 }} wrap={false}>
                    <Text style={{ fontSize: scale.entrySubtitlePt, flex: 1, marginRight: 8, color: col }}>
                      <Text style={{ fontFamily: fontBold }}>{mem.organization}</Text>
                      {mem.membershipType ? ` — ${mem.membershipType}` : ''}
                      {mem.membershipId ? ` (ID: ${mem.membershipId})` : ''}
                    </Text>
                    <Text style={{ fontSize: scale.entrySubtitlePt, color: col, textAlign: 'right' }}>
                      {mem.startDate}
                      {mem.endDate ? ` – ${mem.endDate}` : mem.current ? ' – Present' : ''}
                    </Text>
                  </View>
                ),
                idx === 0,
                mem.id
              );
            })}
          </View>
        );

      case 'certifications':
        return (
          <View key={key} style={{ marginTop: showEditorialHeading ? scale.sectionGapPt : 0, marginBottom: 4 }}>
            {!isElegantSerif && !(isInternshipResume && !showEditorialHeading) ? headingIfNormal : null}
            {sliceItems(effectiveResume.certifications || []).map((c, idx) => {
              const certDateRange = [c.issueDate?.trim(), c.expirationDate?.trim()]
                .filter(Boolean)
                .join(' – ');
              return wrapAsymmetric(
                isElegantSerif ? (
                  <View key={c.id} style={{ marginBottom: 2.5 }}>
                    {renderEditorialDateRow(
                      certDateRange,
                      <Text style={{ fontSize: scale.bodyPt, lineHeight: scale.lineHeight, color: col }}>
                        <Text style={{ fontFamily: fontBold }}>{c.name}</Text>
                        {c.issuer ? <Text style={{ color: '#374151' }}> — {c.issuer}</Text> : null}
                        {c.credentialId ? (
                          <Text style={{ color: '#4b5563', fontSize: scale.metaPt - 0.25 }}>
                            {` (ID: ${c.credentialId})`}
                          </Text>
                        ) : null}
                      </Text>,
                      showEditorialHeading && idx === 0 ? headingIfNormal : undefined
                    )}
                  </View>
                ) : isModernCorporate ? (
                  <View key={c.id} style={{ marginBottom: 2.5 }}>
                    {renderModerncvRow(
                      certDateRange,
                      <Text style={{ fontSize: scale.bodyPt, lineHeight: scale.lineHeight, color: col }}>
                        <Text style={{ fontFamily: fontBold }}>{c.name}</Text>
                        {c.issuer ? (
                          <Text>
                            , <Text style={{ fontFamily: fontItalic }}>{c.issuer}</Text>
                          </Text>
                        ) : null}
                        {c.credentialId ? (
                          <Text style={{ color: '#4b5563', fontSize: scale.metaPt - 0.25 }}>
                            {` (ID: ${c.credentialId})`}
                          </Text>
                        ) : null}
                      </Text>,
                      true
                    )}
                  </View>
                ) : opts.isSidebar ? (
                  <View key={c.id} style={{ marginBottom: 3 }} wrap={false}>
                    <Text style={{ fontFamily: fontBold, fontSize: scale.metaPt, color: col }}>
                      {c.name}
                    </Text>
                    <Text style={{ fontSize: scale.metaPt, color: subCol }}>
                      {c.issuer}
                      {c.issueDate ? ` · ${c.issueDate}` : ''}
                    </Text>
                  </View>
                ) : isFresherResume ? (
                  <View key={c.id} style={{ marginBottom: 2.5 }} wrap={false}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' }}>
                      <Text style={{ fontSize: scale.bodyPt, flex: 1, marginRight: 8, color: col }}>
                        <Text style={{ fontFamily: fontBold }}>{c.name}</Text>
                        {c.issuer ? ` — ${c.issuer}` : ''}
                        {c.credentialId ? ` (ID: ${c.credentialId})` : ''}
                        {c.link?.trim() ? (
                          <Text>
                            {' '}
                            <Link
                              src={c.link.trim().startsWith('http') ? c.link.trim() : `https://${c.link.trim()}`}
                              style={{ color: accent, fontSize: scale.metaPt, textDecoration: 'none' }}
                            >
                              [Verify]
                            </Link>
                          </Text>
                        ) : null}
                      </Text>
                      {certDateRange ? (
                        <Text style={{ fontFamily: fontBold, fontSize: scale.bodyPt, color: col, textAlign: 'right' }}>
                          {certDateRange}
                        </Text>
                      ) : null}
                    </View>
                    {Array.isArray(c.skillsCovered) && c.skillsCovered.filter((s) => s.trim()).length > 0 ? (
                      <Text style={{ fontSize: scale.metaPt - 0.15, color: subCol, marginTop: 0.5 }}>
                        <Text style={{ fontFamily: fontBold }}>Skills: </Text>
                        <Text>{c.skillsCovered.filter((s) => s.trim()).join(', ')}</Text>
                      </Text>
                    ) : null}
                  </View>
                ) : isInternshipResume ? (
                  <View key={c.id} style={{ marginBottom: 3 }} wrap={false}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' }}>
                      <Text style={{ fontFamily: fontBold, fontSize: scale.bodyPt, color: col, flex: 1, marginRight: 6 }}>
                        {c.name}
                      </Text>
                      {certDateRange ? (
                        <Text style={{ fontSize: scale.metaPt - 0.25, color: metaCol, textAlign: 'right' }}>
                          {certDateRange}
                        </Text>
                      ) : null}
                    </View>
                    {c.issuer || c.credentialId ? (
                      <Text style={{ fontSize: scale.metaPt, color: subCol, lineHeight: 1.32 }}>
                        {c.issuer}
                        {c.credentialId ? ` (ID: ${c.credentialId})` : ''}
                      </Text>
                    ) : null}
                  </View>
                ) : (
                  <View key={c.id} style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 2 }} wrap={false}>
                    <Text style={{ fontSize: scale.entrySubtitlePt, flex: 1, marginRight: 8, color: col }}>
                      <Text style={{ fontFamily: fontBold }}>{c.name}</Text> — {c.issuer}
                      {c.credentialId ? ` (ID: ${c.credentialId})` : ''}
                    </Text>
                    <Text style={{ fontSize: scale.entrySubtitlePt, color: col, textAlign: 'right' }}>
                      {c.issueDate}
                      {c.expirationDate ? ` – ${c.expirationDate}` : ''}
                    </Text>
                  </View>
                ),
                idx === 0,
                c.id
              );
            })}
          </View>
        );

      case 'additional': {
        if (isHarvard) {
          const subsections = getHarvardAdditionalSubsections(effectiveResume);
          if (subsections.length === 0) return null;
          return (
            <View key={key} style={{ marginTop: scale.sectionGapPt, marginBottom: 4 }}>
              {headingIfNormal}
              {subsections.map((sub, subIdx) => {
                const subTopGap = subIdx === 0 ? 0 : scale.entryGapPt;
                switch (sub.key) {
                  case 'awards':
                    return (
                      <View key="harv-awards" style={{ marginTop: subTopGap }}>
                        {sub.items.map((ach, aIdx) => (
                          <View key={ach.id} style={{ marginBottom: 2 }} wrap={false}>
                            {aIdx === 0 ? (
                              <Text style={{ fontFamily: fontBold, fontSize: scale.entrySubtitlePt, color: col, marginBottom: 1.5 }}>
                                {sub.title}
                              </Text>
                            ) : null}
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', paddingLeft: 6 }}>
                              <View style={{ flex: 1, marginRight: 8 }}>
                                <Text style={{ fontSize: scale.bodyPt, lineHeight: scale.lineHeight, color: col }}>
                                  <Text style={{ fontFamily: fontBold }}>{ach.title}</Text>
                                  {ach.issuer ? ` — ${ach.issuer}` : ''}
                                </Text>
                                {ach.description ? (
                                  <Text style={{ fontSize: scale.metaPt, color: subCol }}>
                                    {ach.description}
                                  </Text>
                                ) : null}
                              </View>
                              {ach.date ? (
                                <Text style={{ fontSize: scale.metaPt, color: metaCol, textAlign: 'right' }}>
                                  {ach.date}
                                </Text>
                              ) : null}
                            </View>
                          </View>
                        ))}
                      </View>
                    );
                  case 'projects':
                    return (
                      <View key="harv-projects" style={{ marginTop: subTopGap }}>
                        {sub.items.map((proj, pIdx) => {
                          const stack = [
                            ...(proj.technologies || []),
                            ...(proj.frameworks || []),
                            ...(proj.tools || []),
                          ].filter(Boolean);
                          const bullets = cleanHighlights(proj.highlights);
                          const dateRange = [proj.startDate, proj.current ? 'Present' : proj.endDate]
                            .filter(Boolean)
                            .join(' – ');
                          return (
                            <View key={proj.id} style={{ marginBottom: 2.5 }} wrap={false}>
                              {pIdx === 0 ? (
                                <Text style={{ fontFamily: fontBold, fontSize: scale.entrySubtitlePt, color: col, marginBottom: 1.5 }}>
                                  {sub.title}
                                </Text>
                              ) : null}
                              <View style={{ paddingLeft: 6 }}>
                                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' }}>
                                  <Text style={{ flex: 1, marginRight: 8, fontSize: scale.entryTitlePt, color: col }}>
                                    <Text style={{ fontFamily: fontBold }}>{proj.title}</Text>
                                    {stack.length > 0 ? (
                                      <Text style={{ fontFamily: fontItalic, fontSize: scale.metaPt }}>
                                        {` (${stack.join(', ')})`}
                                      </Text>
                                    ) : null}
                                  </Text>
                                  {dateRange ? (
                                    <Text style={{ fontSize: scale.metaPt, color: metaCol, textAlign: 'right' }}>
                                      {dateRange}
                                    </Text>
                                  ) : null}
                                </View>
                                {proj.description ? (
                                  <Text style={{ fontSize: scale.bodyPt, color: subCol, lineHeight: scale.lineHeight }}>
                                    {proj.description}
                                  </Text>
                                ) : null}
                                {bullets.map((b, bIdx) => (
                                  <View key={bIdx} style={{ flexDirection: 'row', marginTop: 1, paddingLeft: 6 }}>
                                    <Text style={{ width: 9, fontSize: scale.entrySubtitlePt, color: col }}>
                                      {bulletChar}
                                    </Text>
                                    <Text style={{ flex: 1, fontSize: scale.bodyPt, lineHeight: scale.lineHeight, color: col }}>
                                      {b}
                                    </Text>
                                  </View>
                                ))}
                              </View>
                            </View>
                          );
                        })}
                      </View>
                    );
                  case 'certifications':
                    return (
                      <View key="harv-certs" style={{ marginTop: subTopGap }}>
                        {sub.items.map((cert, cIdx) => (
                          <View key={cert.id} style={{ marginBottom: 2 }} wrap={false}>
                            {cIdx === 0 ? (
                              <Text style={{ fontFamily: fontBold, fontSize: scale.entrySubtitlePt, color: col, marginBottom: 1.5 }}>
                                {sub.title}
                              </Text>
                            ) : null}
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', paddingLeft: 6 }}>
                              <Text style={{ flex: 1, marginRight: 8, fontSize: scale.bodyPt, lineHeight: scale.lineHeight, color: col }}>
                                <Text style={{ fontFamily: fontBold }}>{cert.name}</Text>
                                {cert.issuer ? ` — ${cert.issuer}` : ''}
                                {cert.credentialId ? ` (ID: ${cert.credentialId})` : ''}
                              </Text>
                              {cert.issueDate ? (
                                <Text style={{ fontSize: scale.metaPt, color: metaCol, textAlign: 'right' }}>
                                  {cert.issueDate}
                                  {cert.expirationDate ? ` – ${cert.expirationDate}` : ''}
                                </Text>
                              ) : null}
                            </View>
                          </View>
                        ))}
                      </View>
                    );
                  case 'publications':
                    return (
                      <View key="harv-pubs" style={{ marginTop: subTopGap }}>
                        {sub.items.map((pub, pIdx) => (
                          <View key={pub.id} style={{ marginBottom: 2 }} wrap={false}>
                            {pIdx === 0 ? (
                              <Text style={{ fontFamily: fontBold, fontSize: scale.entrySubtitlePt, color: col, marginBottom: 1.5 }}>
                                {sub.title}
                              </Text>
                            ) : null}
                            <View style={{ paddingLeft: 6 }}>
                              {renderPublicationCitation(pub, col)}
                            </View>
                          </View>
                        ))}
                      </View>
                    );
                  case 'volunteer':
                    return (
                      <View key="harv-vol" style={{ marginTop: subTopGap }}>
                        {sub.items.map((vol, vIdx) => {
                          const bullets = cleanHighlights(vol.highlights);
                          return (
                            <View key={vol.id} style={{ marginBottom: 2.5 }} wrap={false}>
                              {vIdx === 0 ? (
                                <Text style={{ fontFamily: fontBold, fontSize: scale.entrySubtitlePt, color: col, marginBottom: 1.5 }}>
                                  {sub.title}
                                </Text>
                              ) : null}
                              <View style={{ paddingLeft: 6 }}>
                                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' }}>
                                  <Text style={{ flex: 1, marginRight: 8, fontSize: scale.entryTitlePt, color: col }}>
                                    <Text style={{ fontFamily: fontBold }}>{vol.organization}</Text>
                                    {vol.role ? <Text style={{ fontFamily: fontItalic }}>{` — ${vol.role}`}</Text> : null}
                                  </Text>
                                  {vol.startDate || vol.endDate || vol.current ? (
                                    <Text style={{ fontSize: scale.metaPt, color: metaCol, textAlign: 'right' }}>
                                      {vol.startDate} – {vol.current ? 'Present' : vol.endDate}
                                    </Text>
                                  ) : null}
                                </View>
                                {bullets.map((b, bIdx) => (
                                  <View key={bIdx} style={{ flexDirection: 'row', marginTop: 1, paddingLeft: 6 }}>
                                    <Text style={{ width: 9, fontSize: scale.entrySubtitlePt, color: col }}>
                                      {bulletChar}
                                    </Text>
                                    <Text style={{ flex: 1, fontSize: scale.bodyPt, lineHeight: scale.lineHeight, color: col }}>
                                      {b}
                                    </Text>
                                  </View>
                                ))}
                              </View>
                            </View>
                          );
                        })}
                      </View>
                    );
                  case 'memberships':
                    return (
                      <View key="harv-mem" style={{ marginTop: subTopGap }}>
                        {sub.items.map((mem, mIdx) => (
                          <View key={mem.id} style={{ marginBottom: 2 }} wrap={false}>
                            {mIdx === 0 ? (
                              <Text style={{ fontFamily: fontBold, fontSize: scale.entrySubtitlePt, color: col, marginBottom: 1.5 }}>
                                {sub.title}
                              </Text>
                            ) : null}
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', paddingLeft: 6 }}>
                              <Text style={{ flex: 1, marginRight: 8, fontSize: scale.bodyPt, color: col }}>
                                <Text style={{ fontFamily: fontBold }}>{mem.organization}</Text>
                                {mem.membershipType ? ` — ${mem.membershipType}` : ''}
                              </Text>
                              {mem.startDate || mem.endDate || mem.current ? (
                                <Text style={{ fontSize: scale.metaPt, color: metaCol, textAlign: 'right' }}>
                                  {mem.startDate}
                                  {mem.endDate ? ` – ${mem.endDate}` : mem.current ? ' – Present' : ''}
                                </Text>
                              ) : null}
                            </View>
                          </View>
                        ))}
                      </View>
                    );
                  case 'custom-sections':
                    return (
                      <View key={`harv-cs-${sub.id}`} style={{ marginTop: subTopGap }}>
                        <View wrap={false}>
                          <Text style={{ fontFamily: fontBold, fontSize: scale.entrySubtitlePt, color: col, marginBottom: 1.5 }}>
                            {sub.title}
                          </Text>
                          {sub.items.slice(0, 1).map((b, bIdx) => (
                            <View key={bIdx} style={{ flexDirection: 'row', paddingLeft: 6 }}>
                              <Text style={{ width: 9, fontSize: scale.entrySubtitlePt, color: col }}>
                                {bulletChar}
                              </Text>
                              <Text style={{ flex: 1, fontSize: scale.bodyPt, lineHeight: scale.lineHeight, color: col }}>
                                {b}
                              </Text>
                            </View>
                          ))}
                        </View>
                        {sub.items.slice(1).map((b, bIdx) => (
                          <View key={bIdx} style={{ flexDirection: 'row', marginTop: 1, paddingLeft: 6 }} wrap={false}>
                            <Text style={{ width: 9, fontSize: scale.entrySubtitlePt, color: col }}>
                              {bulletChar}
                            </Text>
                            <Text style={{ flex: 1, fontSize: scale.bodyPt, lineHeight: scale.lineHeight, color: col }}>
                              {b}
                            </Text>
                          </View>
                        ))}
                      </View>
                    );
                }
              })}
            </View>
          );
        }

        if (isSoftwareDev) {
          const subsections = getSoftwareDevAdditionalSubsections(effectiveResume);
          if (subsections.length === 0) return null;
          return (
            <View key={key} style={{ marginTop: scale.sectionGapPt, marginBottom: 4 }}>
              {headingIfNormal}
              {subsections.map((sub, subIdx) => {
                const subTopGap = subIdx === 0 ? 0 : scale.entryGapPt;
                switch (sub.key) {
                  case 'coursework': {
                    const rows = chunkRows(sub.items, 4);
                    return (
                      <View key="sw-cw" style={{ marginTop: subTopGap }}>
                        <View wrap={false}>
                          <Text
                            style={{
                              fontFamily: fontBold,
                              fontSize: scale.entrySubtitlePt,
                              color: col,
                              marginBottom: 2,
                            }}
                          >
                            {sub.title}
                          </Text>
                          {rows.slice(0, 1).map((row, rIdx) => (
                            <View
                              key={`cw-row-${rIdx}`}
                              style={{ flexDirection: 'row', paddingLeft: 6, marginBottom: 1.5 }}
                            >
                              {Array.from({ length: 4 }).map((_, colIdx) => {
                                const course = row[colIdx];
                                return (
                                  <View
                                    key={colIdx}
                                    style={{ width: '25%', flexDirection: 'row', paddingRight: 4 }}
                                  >
                                    {course ? (
                                      <>
                                        <Text style={{ width: 8, fontSize: scale.bodyPt, color: col }}>
                                          {bulletChar}
                                        </Text>
                                        <Text style={{ flex: 1, fontSize: scale.bodyPt, lineHeight: scale.lineHeight, color: col }}>
                                          {course}
                                        </Text>
                                      </>
                                    ) : null}
                                  </View>
                                );
                              })}
                            </View>
                          ))}
                        </View>
                        {rows.slice(1).map((row, rIdx) => (
                          <View
                            key={`cw-row-rest-${rIdx}`}
                            style={{ flexDirection: 'row', paddingLeft: 6, marginBottom: 1.5 }}
                            wrap={false}
                          >
                            {Array.from({ length: 4 }).map((_, colIdx) => {
                              const course = row[colIdx];
                              return (
                                <View
                                  key={colIdx}
                                  style={{ width: '25%', flexDirection: 'row', paddingRight: 4 }}
                                >
                                  {course ? (
                                    <>
                                      <Text style={{ width: 8, fontSize: scale.bodyPt, color: col }}>
                                        {bulletChar}
                                      </Text>
                                      <Text style={{ flex: 1, fontSize: scale.bodyPt, lineHeight: scale.lineHeight, color: col }}>
                                        {course}
                                      </Text>
                                    </>
                                  ) : null}
                                </View>
                              );
                            })}
                          </View>
                        ))}
                      </View>
                    );
                  }

                  case 'leadership': {
                    return (
                      <View key="sw-lead" style={{ marginTop: subTopGap }}>
                        {sub.items.map((item, lIdx) => {
                          const bullets = cleanHighlights(item.highlights);
                          const firstBullet = bullets[0];
                          const remainingBullets = bullets.slice(1);
                          return (
                            <View key={item.id} style={{ marginBottom: 3 }}>
                              <View wrap={false}>
                                {lIdx === 0 ? (
                                  <Text
                                    style={{
                                      fontFamily: fontBold,
                                      fontSize: scale.entrySubtitlePt,
                                      color: col,
                                      marginBottom: 2,
                                    }}
                                  >
                                    {sub.title}
                                  </Text>
                                ) : null}
                                <View style={{ paddingLeft: 6 }}>
                                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 0.5 }}>
                                    <Text style={{ fontFamily: fontBold, fontSize: scale.entryTitlePt, color: col, flex: 1, marginRight: 8 }}>
                                      {item.organization}
                                    </Text>
                                    {item.startDate || item.endDate || item.current ? (
                                      <Text style={{ fontSize: scale.entrySubtitlePt, color: col, textAlign: 'right' }}>
                                        {item.startDate} – {item.current ? 'Present' : item.endDate}
                                      </Text>
                                    ) : null}
                                  </View>
                                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 1 }}>
                                    <Text style={{ fontFamily: fontItalic, fontSize: scale.entrySubtitlePt, color: subCol, flex: 1, marginRight: 8 }}>
                                      {item.role}
                                    </Text>
                                    {item.location ? (
                                      <Text style={{ fontSize: scale.metaPt, color: metaCol, textAlign: 'right' }}>
                                        {item.location}
                                      </Text>
                                    ) : null}
                                  </View>
                                  {firstBullet ? (
                                    <View style={{ flexDirection: 'row', marginTop: 1.5, paddingLeft: 6 }}>
                                      <Text style={{ width: 9, fontSize: scale.entrySubtitlePt, color: col }}>
                                        {bulletChar}
                                      </Text>
                                      <Text style={{ flex: 1, fontSize: scale.bodyPt, lineHeight: scale.lineHeight, color: col }}>
                                        {firstBullet}
                                      </Text>
                                    </View>
                                  ) : null}
                                </View>
                              </View>
                              {remainingBullets.map((hl, bIdx) => (
                                <View key={bIdx} style={{ flexDirection: 'row', marginTop: 1.5, paddingLeft: 12 }} wrap={false}>
                                  <Text style={{ width: 9, fontSize: scale.entrySubtitlePt, color: col }}>
                                    {bulletChar}
                                  </Text>
                                  <Text style={{ flex: 1, fontSize: scale.bodyPt, lineHeight: scale.lineHeight, color: col }}>
                                    {hl}
                                  </Text>
                                </View>
                              ))}
                            </View>
                          );
                        })}
                      </View>
                    );
                  }

                  case 'programming-languages':
                  case 'developer-tools':
                  case 'technologies-frameworks':
                  case 'other-skills': {
                    const skillKey =
                      sub.key === 'other-skills' ? `sw-skill-${sub.id}` : `sw-${sub.key}`;
                    return (
                      <View
                        key={skillKey}
                        style={{ marginTop: subIdx === 0 ? 0 : 2.5 }}
                        wrap={false}
                      >
                        <Text style={{ fontSize: scale.bodyPt, lineHeight: scale.lineHeight, color: col }}>
                          <Text style={{ fontFamily: fontBold }}>{sub.title}: </Text>
                          {sub.items.join(', ')}
                        </Text>
                      </View>
                    );
                  }

                  case 'certifications': {
                    return (
                      <View key="sw-certs" style={{ marginTop: subTopGap }}>
                        {sub.items.map((cert, cIdx) => {
                          const cleanCertUrl = cert.link
                            ? cert.link.startsWith('http')
                              ? cert.link
                              : `https://${cert.link}`
                            : null;
                          return (
                            <View key={cert.id} style={{ marginBottom: 2 }} wrap={false}>
                              {cIdx === 0 ? (
                                <Text
                                  style={{
                                    fontFamily: fontBold,
                                    fontSize: scale.entrySubtitlePt,
                                    color: col,
                                    marginBottom: 2,
                                  }}
                                >
                                  {sub.title}
                                </Text>
                              ) : null}
                              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', paddingLeft: 6 }}>
                                <Text style={{ flex: 1, marginRight: 8, fontSize: scale.bodyPt, lineHeight: scale.lineHeight, color: col }}>
                                  <Text style={{ fontFamily: fontBold }}>{cert.name}</Text>
                                  {cert.issuer ? ` — ${cert.issuer}` : ''}
                                  {cert.credentialId ? ` (ID: ${cert.credentialId})` : ''}
                                  {cleanCertUrl ? (
                                    <Text>
                                      {' '}
                                      <Link src={cleanCertUrl} style={{ color: accent, textDecoration: 'underline' }}>
                                        [Verify]
                                      </Link>
                                    </Text>
                                  ) : null}
                                </Text>
                                {cert.issueDate ? (
                                  <Text style={{ fontSize: scale.metaPt, color: metaCol, textAlign: 'right' }}>
                                    {cert.issueDate}
                                    {cert.expirationDate ? ` – ${cert.expirationDate}` : ''}
                                  </Text>
                                ) : null}
                              </View>
                            </View>
                          );
                        })}
                      </View>
                    );
                  }

                  case 'achievements': {
                    return (
                      <View key="sw-ach" style={{ marginTop: subTopGap }}>
                        {sub.items.map((ach, aIdx) => (
                          <View key={ach.id} style={{ marginBottom: 2 }} wrap={false}>
                            {aIdx === 0 ? (
                              <Text
                                style={{
                                  fontFamily: fontBold,
                                  fontSize: scale.entrySubtitlePt,
                                  color: col,
                                  marginBottom: 2,
                                }}
                              >
                                {sub.title}
                              </Text>
                            ) : null}
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', paddingLeft: 6 }}>
                              <View style={{ flex: 1, marginRight: 8 }}>
                                <Text style={{ fontSize: scale.bodyPt, lineHeight: scale.lineHeight, color: col }}>
                                  <Text style={{ fontFamily: fontBold }}>{ach.title}</Text>
                                  {ach.issuer ? ` — ${ach.issuer}` : ''}
                                </Text>
                                {ach.description ? (
                                  <Text style={{ fontSize: scale.metaPt, color: subCol }}>
                                    {ach.description}
                                  </Text>
                                ) : null}
                              </View>
                              {ach.date ? (
                                <Text style={{ fontSize: scale.metaPt, color: metaCol, textAlign: 'right' }}>
                                  {ach.date}
                                </Text>
                              ) : null}
                            </View>
                          </View>
                        ))}
                      </View>
                    );
                  }

                  case 'custom-sections': {
                    return (
                      <View key={`sw-cs-${sub.id}`} style={{ marginTop: subTopGap }}>
                        <View wrap={false}>
                          <Text
                            style={{
                              fontFamily: fontBold,
                              fontSize: scale.entrySubtitlePt,
                              color: col,
                              marginBottom: 2,
                            }}
                          >
                            {sub.title}
                          </Text>
                          {sub.items.slice(0, 1).map((b, bIdx) => (
                            <View key={bIdx} style={{ flexDirection: 'row', paddingLeft: 6 }}>
                              <Text style={{ width: 9, fontSize: scale.entrySubtitlePt, color: col }}>
                                {bulletChar}
                              </Text>
                              <Text style={{ flex: 1, fontSize: scale.bodyPt, lineHeight: scale.lineHeight, color: col }}>
                                {b}
                              </Text>
                            </View>
                          ))}
                        </View>
                        {sub.items.slice(1).map((b, bIdx) => (
                          <View key={bIdx} style={{ flexDirection: 'row', marginTop: 1.5, paddingLeft: 6 }} wrap={false}>
                            <Text style={{ width: 9, fontSize: scale.entrySubtitlePt, color: col }}>
                              {bulletChar}
                            </Text>
                            <Text style={{ flex: 1, fontSize: scale.bodyPt, lineHeight: scale.lineHeight, color: col }}>
                              {b}
                            </Text>
                          </View>
                        ))}
                      </View>
                    );
                  }
                }
              })}
            </View>
          );
        }

        if (isFresherResume) {
          const eff = getEffectiveInterests(effectiveResume);
          if (eff.items.length === 0 && !eff.text) return null;
          return (
            <View key={key} style={{ marginTop: scale.sectionGapPt, marginBottom: 4 }}>
              {headingIfNormal}
              {eff.items.length > 0 ? (
                eff.items.map((item, iIdx) => (
                  <View key={item.id} style={{ flexDirection: 'row', alignItems: 'baseline', marginBottom: 2 }} wrap={false}>
                    <Text style={{ width: 98, paddingRight: 8, fontFamily: fontBold, fontSize: scale.bodyPt, color: col }}>
                      {iIdx === 0 ? 'Interests' : ''}
                    </Text>
                    <Text style={{ flex: 1, fontSize: scale.bodyPt, lineHeight: scale.lineHeight, color: col }}>
                      <Text style={{ fontFamily: fontBold }}>{item.name}</Text>
                      {item.description?.trim() ? (
                        <Text style={{ color: subCol }}>{` — ${item.description.trim()}`}</Text>
                      ) : null}
                    </Text>
                  </View>
                ))
              ) : (
                <View style={{ flexDirection: 'row', alignItems: 'baseline' }} wrap={false}>
                  <Text style={{ width: 98, paddingRight: 8, fontFamily: fontBold, fontSize: scale.bodyPt, color: col }}>
                    Interests
                  </Text>
                  <Text style={{ flex: 1, fontSize: scale.bodyPt, lineHeight: scale.lineHeight, color: col }}>
                    {eff.text}
                  </Text>
                </View>
              )}
            </View>
          );
        }

        const langs = effectiveResume.languages || [];
        const hasLang = langs.length > 0;
        const interestsText = (effectiveResume.interests || '').trim();
        const hasInt = interestsText.length > 0;

        return (
          <View key={key} style={{ marginTop: scale.sectionGapPt, marginBottom: 4 }}>
            {headingIfNormal}
            {hasLang &&
              wrapAsymmetric(
                opts.isSidebar ? (
                  <View style={{ marginBottom: 3 }} wrap={false}>
                    <Text style={{ fontFamily: fontBold, fontSize: scale.metaPt, color: col }}>
                      Languages
                    </Text>
                    <Text style={{ fontSize: scale.metaPt, color: subCol }}>
                      {langs.map((l) => `${l.language} (${l.proficiency})`).join(', ')}
                    </Text>
                  </View>
                ) : (
                  <View style={{ flexDirection: 'row', marginBottom: 2.5 }} wrap={false}>
                    <Text style={{ width: 95, fontFamily: fontBold, fontSize: scale.entrySubtitlePt, color: col }}>
                      Languages:
                    </Text>
                    <Text style={{ flex: 1, fontSize: scale.entrySubtitlePt, color: col }}>
                      {langs.map((l) => `${l.language} (${l.proficiency})`).join(', ')}
                    </Text>
                  </View>
                ),
                true
              )}
            {hasInt &&
              wrapAsymmetric(
                opts.isSidebar ? (
                  <View wrap={false}>
                    <Text style={{ fontFamily: fontBold, fontSize: scale.metaPt, color: col }}>
                      Interests
                    </Text>
                    <Text style={{ fontSize: scale.metaPt, color: subCol }}>{interestsText}</Text>
                  </View>
                ) : (
                  <View style={{ flexDirection: 'row' }} wrap={false}>
                    <Text style={{ width: 95, fontFamily: fontBold, fontSize: scale.entrySubtitlePt, color: col }}>
                      Interests:
                    </Text>
                    <Text style={{ flex: 1, fontSize: scale.entrySubtitlePt, color: col }}>
                      {interestsText}
                    </Text>
                  </View>
                ),
                !hasLang
              )}
          </View>
        );
      }

      case 'languages': {
        const langs = sliceItems((effectiveResume.languages || []).filter((l) => l.language?.trim()));
        return (
          <View key={key} style={{ marginTop: showEditorialHeading ? scale.sectionGapPt : 0, marginBottom: 4 }}>
            {!isTwoColumnPro && !isElegantSerif && !(isInternshipResume && !showEditorialHeading)
              ? headingIfNormal
              : null}
            {langs.map((lang, idx) => {
              const profText =
                lang.proficiency?.trim() &&
                !/^(unconfirmed|none|unspecified)$/i.test(lang.proficiency.trim())
                  ? lang.proficiency.trim()
                  : '';
              return wrapAsymmetric(
                isElegantSerif ? (
                  <View key={lang.id} wrap={false}>
                    {showEditorialHeading && idx === 0 ? headingIfNormal : null}
                    <Text
                      style={{
                        fontSize: scale.bodyPt,
                        color: col,
                        lineHeight: scale.lineHeight,
                        marginBottom: 2,
                      }}
                    >
                      <Text style={{ fontFamily: fontBold }}>{lang.language}</Text>
                      {profText ? <Text style={{ color: '#1f2937' }}> — {profText}</Text> : null}
                      {lang.comment?.trim() ? (
                        <Text style={{ fontFamily: fontItalic, color: '#4b5563' }}>
                          {` (${lang.comment.trim()})`}
                        </Text>
                      ) : null}
                    </Text>
                  </View>
                ) : isModernCorporate ? (
                  <View key={lang.id} style={{ marginBottom: 2.5 }}>
                    {renderModerncvRow(
                      lang.language,
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' }}>
                        <Text style={{ fontSize: scale.bodyPt, color: col, lineHeight: scale.lineHeight, flex: 1, marginRight: 8 }}>
                          {profText}
                        </Text>
                        {lang.comment?.trim() ? (
                          <Text style={{ fontFamily: fontItalic, fontSize: scale.metaPt, color: '#4b5563', textAlign: 'right' }}>
                            {lang.comment.trim()}
                          </Text>
                        ) : null}
                      </View>,
                      true
                    )}
                  </View>
                ) : isTwoColumnPro ? (
                  <View key={lang.id} wrap={false}>
                    {idx === 0 ? headingIfNormal : null}
                    <View
                      style={{
                        marginBottom: 3.5,
                        borderTopWidth: idx > 0 ? 0.75 : 0,
                        borderTopColor: '#cbd5e1',
                        borderTopStyle: 'dotted',
                        paddingTop: idx > 0 ? 3.5 : 0,
                      }}
                    >
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                      <Text style={{ fontFamily: fontBold, fontSize: scale.entrySubtitlePt, color: '#111827' }}>
                        {lang.language}
                      </Text>
                      {(() => {
                        const score = getLanguageDotScore(lang.proficiency);
                        if (score !== null) {
                          return renderLanguageDots(score, accent);
                        }
                        return lang.proficiency ? (
                          <Text style={{ fontSize: scale.metaPt - 0.5, color: '#4b5563' }}>
                            {lang.proficiency}
                          </Text>
                        ) : null;
                      })()}
                    </View>
                    {lang.comment ? (
                      <Text style={{ fontFamily: fontItalic, fontSize: scale.metaPt - 0.5, color: '#4b5563', marginTop: 0.5 }}>
                        {lang.comment}
                      </Text>
                    ) : null}
                    </View>
                  </View>
                ) : isFresherResume ? (
                  <View key={lang.id} style={{ flexDirection: 'row', alignItems: 'baseline', marginBottom: 2 }} wrap={false}>
                    <Text style={{ width: 98, paddingRight: 8, fontFamily: fontBold, fontSize: scale.bodyPt, color: col }}>
                      {lang.language}
                    </Text>
                    <Text style={{ flex: 1, fontSize: scale.bodyPt, lineHeight: scale.lineHeight, color: subCol }}>
                      {profText}
                      {lang.comment?.trim()
                        ? profText
                          ? ` (${lang.comment.trim()})`
                          : lang.comment.trim()
                        : ''}
                    </Text>
                  </View>
                ) : isInternshipResume ? (
                  <View key={lang.id} style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 2 }} wrap={false}>
                    <Text style={{ fontFamily: fontBold, fontSize: scale.bodyPt, color: col, marginRight: 6 }}>
                      {lang.language}
                    </Text>
                    <Text style={{ fontSize: scale.metaPt, color: subCol, textAlign: 'right' }}>
                      {profText}
                      {lang.comment?.trim()
                        ? profText
                          ? ` (${lang.comment.trim()})`
                          : lang.comment.trim()
                        : ''}
                    </Text>
                  </View>
                ) : (
                  <View key={lang.id} style={{ flexDirection: 'row', alignItems: 'baseline', marginBottom: 2.5 }} wrap={false}>
                    <Text style={{ width: 112, paddingRight: 6, fontFamily: fontBold, fontSize: scale.entrySubtitlePt, color: col }}>
                      {lang.language}
                    </Text>
                    <Text style={{ width: 120, paddingRight: 6, fontSize: scale.entrySubtitlePt, color: accent }}>
                      {lang.proficiency}
                    </Text>
                    {lang.comment ? (
                      <Text style={{ flex: 1, fontFamily: fontItalic, fontSize: scale.metaPt, color: '#475569' }}>
                        {lang.comment}
                      </Text>
                    ) : null}
                  </View>
                ),
                idx === 0,
                lang.id
              );
            })}
          </View>
        );
      }

      case 'skill-matrix': {
        const matrix = (effectiveResume.skillMatrix || []).filter((m) => m.skill?.trim());
        return (
          <View key={key} style={{ marginTop: scale.sectionGapPt, marginBottom: 4 }}>
            {headingIfNormal}
            {matrix.map((row, idx) =>
              wrapAsymmetric(
                <View
                  key={row.id}
                  style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 3 }}
                  wrap={false}
                >
                  <View style={{ flex: 1, flexDirection: 'row', alignItems: 'baseline', paddingRight: 8 }}>
                    {row.category?.trim() ? (
                      <Text style={{ width: 108, paddingRight: 6, fontFamily: fontBold, fontSize: scale.metaPt, color: '#475569' }}>
                        {row.category}:
                      </Text>
                    ) : null}
                    <Text style={{ flex: 1, fontFamily: fontBold, fontSize: scale.entrySubtitlePt, color: col }}>
                      {row.skill}
                    </Text>
                  </View>
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginRight: 6 }}>
                      {[1, 2, 3, 4, 5].map((step) => {
                        const filled = row.level !== null && row.level !== undefined && step <= row.level;
                        return (
                          <View
                            key={step}
                            style={{
                              width: 7,
                              height: 7,
                              borderWidth: 0.9,
                              borderColor: accent,
                              backgroundColor: filled ? accent : '#ffffff',
                              marginRight: step < 5 ? 2.5 : 0,
                            }}
                          />
                        );
                      })}
                    </View>
                    <Text style={{ width: 78, fontSize: scale.metaPt - 0.25, color: '#334155' }}>
                      {getSkillMatrixLevelLabel(row.level)}
                    </Text>
                    {row.yearsOfExperience || row.comment ? (
                      <Text style={{ width: 105, fontFamily: fontItalic, fontSize: scale.metaPt - 0.5, color: '#475569', textAlign: 'right' }}>
                        {[row.yearsOfExperience, row.comment].filter(Boolean).join(' · ')}
                      </Text>
                    ) : null}
                  </View>
                </View>,
                idx === 0,
                row.id
              )
            )}
            {matrix.length > 0 ? (
              <View style={{ marginTop: 2, paddingTop: 3, borderTopWidth: 0.5, borderTopColor: '#cbd5e1' }} wrap={false}>
                <Text style={{ fontSize: scale.metaPt - 0.75, color: '#475569' }}>
                  <Text style={{ fontFamily: fontBold, color: accent }}>Legend: </Text>
                  {SKILL_MATRIX_LEGEND.map((item, idx) => (
                    <Text key={item.level}>
                      {idx > 0 ? ' · ' : ''}
                      <Text style={{ fontFamily: fontBold, color: col }}>{item.level}</Text> = {item.label}
                    </Text>
                  ))}
                </Text>
              </View>
            ) : null}
          </View>
        );
      }

      case 'learning': {
        const items = sliceItems(getInternshipLearningItems(effectiveResume));
        if (items.length === 0) return null;
        return (
          <View key={key} style={{ marginTop: showEditorialHeading ? scale.sectionGapPt : 0, marginBottom: 4 }}>
            {showEditorialHeading ? headingIfNormal : null}
            {items.map((item) => {
              const titleText = item.title?.trim() || item.subject?.trim() || 'Course / Training';
              const rawUrl = item.credentialUrl?.trim() || '';
              const cleanUrl = rawUrl
                ? rawUrl.startsWith('http')
                  ? rawUrl
                  : `https://${rawUrl}`
                : null;
              const skillsList = (item.skillsAcquired || []).map((s) => s.trim()).filter(Boolean);
              return (
                <View key={item.id} style={{ flexDirection: 'row', alignItems: 'flex-start', marginBottom: 3 }} wrap={false}>
                  <Text style={{ width: 9, fontSize: scale.bodyPt - 0.15, color: '#1f2937' }}>–</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: scale.bodyPt - 0.15, lineHeight: 1.34, color: '#1f2937' }}>
                      {titleText}
                      {item.subject?.trim() && item.title?.trim() && item.subject.trim() !== item.title.trim()
                        ? ` — ${item.subject.trim()}`
                        : ''}
                      {item.provider?.trim() ? ` by ${item.provider.trim()}` : ''}
                      {item.instructor?.trim() ? ` (${item.instructor.trim()})` : ''}
                      {item.description?.trim() ? ` — ${item.description.trim()}` : ''}
                      {item.certificateId?.trim() ? ` Certificate ID: ${item.certificateId.trim()}` : ''}
                      {item.completionDate?.trim() ? ` (${item.completionDate.trim()})` : ''}
                    </Text>
                    {skillsList.length > 0 ? (
                      <Text style={{ fontSize: scale.metaPt - 0.25, color: '#4b5563', marginTop: 0.5 }}>
                        <Text style={{ fontFamily: fontBold }}>Skills: </Text>
                        <Text>{skillsList.join(', ')}</Text>
                      </Text>
                    ) : null}
                    {cleanUrl ? (
                      <Link
                        src={cleanUrl}
                        style={{ fontSize: scale.metaPt - 0.25, color: accent, textDecoration: 'none', marginTop: 0.5 }}
                      >
                        {rawUrl}
                      </Link>
                    ) : null}
                  </View>
                </View>
              );
            })}
          </View>
        );
      }

      case 'interests': {
        const eff = getEffectiveInterests(effectiveResume);
        if (isInternshipResume) {
          const tags: string[] =
            eff.items.length > 0
              ? eff.items.map((item) =>
                  item.description?.trim()
                    ? `${item.name} (${item.description.trim()})`
                    : item.name
                )
              : eff.text
              ? eff.text
                  .split(/[,;\n]+/)
                  .map((t) => t.trim())
                  .filter(Boolean)
              : [];
          if (tags.length === 0) return null;
          return (
            <View key={key} style={{ marginTop: showEditorialHeading ? scale.sectionGapPt : 0, marginBottom: 4 }} wrap={false}>
              {showEditorialHeading ? headingIfNormal : null}
              <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
                {tags.map((tag, tIdx) => (
                  <View
                    key={tIdx}
                    style={{
                      borderWidth: 0.75,
                      borderColor: '#9ca3af',
                      borderRadius: 3,
                      paddingVertical: 1.5,
                      paddingHorizontal: 5,
                      marginRight: 4,
                      marginBottom: 4,
                    }}
                  >
                    <Text style={{ fontSize: scale.bodyPt - 0.25, color: '#1f2937', lineHeight: 1.25 }}>
                      {tag}
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          );
        }
        return (
          <View key={key} style={{ marginTop: scale.sectionGapPt, marginBottom: 4 }}>
            {!isElegantSerif || eff.items.length === 0 ? headingIfNormal : null}
            {eff.items.length > 0 ? (
              isElegantSerif ? (
                <View wrap={false}>
                  {headingIfNormal}
                  {eff.items.map((item) => (
                    <Text
                      key={item.id}
                      style={{
                        fontSize: scale.bodyPt,
                        color: col,
                        lineHeight: scale.lineHeight,
                        marginBottom: 2,
                      }}
                    >
                      <Text style={{ fontFamily: fontBold }}>{item.name}</Text>
                      {item.description ? (
                        <Text style={{ color: '#374151' }}> — {item.description}</Text>
                      ) : null}
                    </Text>
                  ))}
                </View>
              ) : isModernCorporate ? (
                eff.items.map((item) => (
                  <View key={item.id} style={{ marginBottom: 2 }}>
                    {renderModerncvRow(
                      item.name,
                      <Text style={{ fontSize: scale.bodyPt, color: col, lineHeight: scale.lineHeight }}>
                        {item.description || ''}
                      </Text>,
                      true
                    )}
                  </View>
                ))
              ) : (
                eff.items.map((item, idx) =>
                  wrapAsymmetric(
                    <View key={item.id} style={{ flexDirection: 'row', alignItems: 'baseline', marginBottom: 2 }} wrap={false}>
                      <Text style={{ width: 132, paddingRight: 6, fontFamily: fontBold, fontSize: scale.entrySubtitlePt, color: col }}>
                        {item.name}
                      </Text>
                      {item.description ? (
                        <Text style={{ flex: 1, fontSize: scale.entrySubtitlePt, color: subCol }}>
                          {item.description}
                        </Text>
                      ) : null}
                    </View>,
                    idx === 0,
                    item.id
                  )
                )
              )
            ) : eff.text ? (
              isModernCorporate ? (
                renderModerncvRow(
                  null,
                  <Text style={{ fontSize: scale.bodyPt, color: col, lineHeight: scale.lineHeight }}>
                    {eff.text}
                  </Text>,
                  true
                )
              ) : (
                wrapAsymmetric(
                  <Text style={{ fontSize: scale.entrySubtitlePt, color: col, lineHeight: scale.lineHeight }}>
                    {eff.text}
                  </Text>,
                  true,
                  'interest-text'
                )
              )
            ) : null}
          </View>
        );
      }

      case 'career-interests': {
        const tags = getInternshipCareerInterests(effectiveResume);
        const prefs = effectiveResume.internshipPreferences;
        const prefParts = [
          prefs?.targetRole?.trim() ? `Target Role: ${prefs.targetRole.trim()}` : '',
          prefs?.preferredIndustry?.trim() ? `Industry: ${prefs.preferredIndustry.trim()}` : '',
          prefs?.duration?.trim() ? `Duration: ${prefs.duration.trim()}` : '',
          prefs?.availabilityDate?.trim() ? `Available: ${prefs.availabilityDate.trim()}` : '',
          prefs?.workArrangement?.trim() ? `Mode: ${prefs.workArrangement.trim()}` : '',
          prefs?.preferredTechnologies?.length
            ? `Tech Focus: ${prefs.preferredTechnologies.filter((t) => t.trim()).join(', ')}`
            : '',
        ].filter(Boolean);
        if (tags.length === 0 && prefParts.length === 0) return null;
        return (
          <View key={key} style={{ marginTop: showEditorialHeading ? scale.sectionGapPt : 0, marginBottom: 4 }} wrap={false}>
            {showEditorialHeading ? headingIfNormal : null}
            {tags.length > 0 ? (
              <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
                {tags.map((tag, tIdx) => (
                  <View
                    key={tIdx}
                    style={{
                      borderWidth: 0.75,
                      borderColor: '#9ca3af',
                      borderRadius: 3,
                      paddingVertical: 1.5,
                      paddingHorizontal: 5,
                      marginRight: 4,
                      marginBottom: 4,
                    }}
                  >
                    <Text style={{ fontSize: scale.bodyPt - 0.25, color: '#1f2937', lineHeight: 1.25 }}>
                      {tag}
                    </Text>
                  </View>
                ))}
              </View>
            ) : null}
            {prefParts.length > 0 ? (
              <Text
                style={{
                  marginTop: tags.length > 0 ? 1 : 0,
                  fontSize: scale.metaPt - 0.15,
                  color: '#374151',
                  lineHeight: 1.32,
                }}
              >
                {prefParts.join(' · ')}
              </Text>
            ) : null}
          </View>
        );
      }

      case 'custom-sections': {
        const customs = sliceItems(
          (effectiveResume.customSections || []).filter(
            (cs) => cs.title?.trim() && cs.bullets?.some((b) => b.trim())
          )
        );
        return (
          <View key={key}>
            {customs.map((cs) => {
              const cleaned = cleanHighlights(cs.bullets);
              return (
                <View key={cs.id} style={{ marginTop: showEditorialHeading ? scale.sectionGapPt : 0, marginBottom: 4 }}>
                  {isAsymmetric
                    ? null
                    : renderSectionHeading(cs.title.trim(), {
                        inverted: opts.inverted,
                        compact: opts.isSidebar,
                        disableMinAhead: isElegantSerif || isInternshipResume,
                        minAhead: 42,
                      })}
                  {cleaned.map((bullet, bIdx) =>
                    wrapAsymmetric(
                      isModernCorporate ? (
                        <View key={bIdx} style={{ marginTop: 1.5 }}>
                          {renderModerncvRow(
                            null,
                            <View style={{ flexDirection: 'row' }}>
                              {renderModerncvHollowCircle(col)}
                              <Text style={{ flex: 1, fontSize: scale.bodyPt, lineHeight: scale.lineHeight, color: col }}>
                                {bullet}
                              </Text>
                            </View>,
                            true
                          )}
                        </View>
                      ) : (
                        <View key={bIdx} style={{ flexDirection: 'row', marginTop: 2, paddingLeft: isElegantSerif || isInternshipResume ? 2 : 8 }} wrap={false}>
                          <Text style={{ width: 10, fontSize: scale.entrySubtitlePt, color: col }}>
                            {bulletChar}
                          </Text>
                          <Text style={{ flex: 1, fontSize: scale.bodyPt, lineHeight: scale.lineHeight, color: col }}>
                            {bullet}
                          </Text>
                        </View>
                      ),
                      bIdx === 0,
                      `${cs.id}-b-${bIdx}`
                    )
                  )}
                </View>
              );
            })}
          </View>
        );
      }

      case 'references': {
        if (effectiveResume.referencesDisplayMode === 'on-request') {
          return (
            <View key={key} style={{ marginTop: scale.sectionGapPt, marginBottom: 4 }} wrap={false}>
              {headingIfNormal}
              {isModernCorporate ? (
                renderModerncvRow(
                  null,
                  <Text style={{ fontFamily: fontItalic, fontSize: scale.bodyPt, color: subCol }}>
                    References available upon request.
                  </Text>,
                  true
                )
              ) : (
                wrapAsymmetric(
                  <Text style={{ fontFamily: fontItalic, fontSize: scale.entrySubtitlePt, color: subCol }}>
                    {isTwoColumnPro ? 'Referees available upon request.' : 'References available upon request.'}
                  </Text>,
                  true,
                  'ref-on-request'
                )
              )}
            </View>
          );
        }
        if (isTwoColumnPro || isEditorialTwoColumn || opts.isSidebar) {
          const refs = sliceItems(effectiveResume.references || []);
          if (refs.length === 0) return null;
          return (
            <View key={key} style={{ marginTop: showEditorialHeading ? scale.sectionGapPt : 0, marginBottom: 4 }}>
              {!isTwoColumnPro && !isElegantSerif ? headingIfNormal : null}
              {refs.map((ref, rIdx) => (
                <View key={ref.id} wrap={false}>
                  {(isTwoColumnPro || (isElegantSerif && showEditorialHeading)) && rIdx === 0 ? headingIfNormal : null}
                  <View
                    style={{
                      marginBottom: scale.entryGapPt + 1,
                      borderTopWidth: isTwoColumnPro && rIdx > 0 ? 0.75 : 0,
                      borderTopColor: '#cbd5e1',
                      borderTopStyle: 'dotted',
                      paddingTop: isTwoColumnPro && rIdx > 0 ? 4 : 0,
                    }}
                  >
                    <Text style={{ fontFamily: fontBold, fontSize: scale.entryTitlePt - 0.25, color: '#111827' }}>
                      {ref.fullName}
                    </Text>
                    {ref.jobTitle || ref.organization ? (
                      <Text
                        style={{
                          fontFamily: isEditorialTwoColumn ? fontItalic : fontBold,
                          fontSize: scale.metaPt,
                          color: isEditorialTwoColumn ? '#374151' : accent,
                          marginTop: 0.5,
                        }}
                      >
                        {ref.jobTitle}
                        {ref.jobTitle && ref.organization ? ', ' : ''}
                        {ref.organization}
                      </Text>
                    ) : null}
                    {ref.department ? (
                      <Text style={{ fontSize: scale.metaPt - 0.4, color: '#4b5563' }}>{ref.department}</Text>
                    ) : null}
                    {ref.relationship ? (
                      <Text style={{ fontFamily: fontItalic, fontSize: scale.metaPt - 0.4, color: '#4b5563' }}>
                        {ref.relationship}
                      </Text>
                    ) : null}
                    {ref.email ? (
                      <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 1.5 }}>
                        {isEditorialTwoColumn
                          ? renderEditorialContactIcon('email', '#1f2937')
                          : renderTwoColMetaIcon('mail', accent)}
                        <Link src={`mailto:${ref.email}`} style={{ fontSize: scale.metaPt - 0.25, color: '#1f2937', textDecoration: 'none' }}>
                          {ref.email}
                        </Link>
                      </View>
                    ) : null}
                    {ref.address ? (
                      <Text style={{ fontSize: scale.metaPt - 0.4, color: '#4b5563', marginTop: 1, lineHeight: 1.3 }}>
                        {ref.address}
                      </Text>
                    ) : null}
                    {ref.phone ? (
                      <Text style={{ fontSize: scale.metaPt - 0.4, color: '#4b5563', marginTop: 0.5 }}>
                        {ref.phone}
                      </Text>
                    ) : null}
                  </View>
                </View>
              ))}
            </View>
          );
        }
        const rows: ReferenceItem[][] = chunkPairs(effectiveResume.references || []);
        return (
          <View key={key} style={{ marginTop: scale.sectionGapPt, marginBottom: 4 }}>
            {headingIfNormal}
            {rows.map((row, rIdx) => {
              const rowNode = (
                <View key={rIdx} style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: scale.entryGapPt + 1 }} wrap={false}>
                  {row.map((ref) => (
                    <View key={ref.id} style={{ width: '48%' }}>
                      <Text style={{ fontFamily: fontBold, fontSize: scale.entryTitlePt, color: col }}>
                        {ref.fullName}
                      </Text>
                      <Text style={{ fontSize: scale.metaPt, color: subCol }}>{ref.jobTitle}</Text>
                      {ref.department ? (
                        <Text style={{ fontSize: scale.metaPt - 0.5, color: metaCol }}>{ref.department}</Text>
                      ) : null}
                      <Text style={{ fontSize: scale.metaPt - 0.5, color: metaCol }}>{ref.organization}</Text>
                      {ref.email ? (
                        <Text style={{ fontSize: scale.metaPt - 0.5, color: metaCol }}>Email: {ref.email}</Text>
                      ) : null}
                      {ref.phone ? (
                        <Text style={{ fontSize: scale.metaPt - 0.5, color: metaCol }}>Phone: {ref.phone}</Text>
                      ) : null}
                      {ref.relationship ? (
                        <Text style={{ fontSize: scale.metaPt - 0.5, fontFamily: fontItalic, color: metaCol, marginTop: 1 }}>
                          Relationship: {ref.relationship}
                        </Text>
                      ) : null}
                    </View>
                  ))}
                </View>
              );
              return isModernCorporate ? (
                <View key={`mc-ref-row-${rIdx}`}>
                  {renderModerncvRow(null, rowNode, true)}
                </View>
              ) : (
                wrapAsymmetric(rowNode, rIdx === 0, `ref-row-${rIdx}`)
              );
            })}
          </View>
        );
      }
    }
  };

  const sidebarSet = new Set<ResumeSectionKey>(template.sidebarSections || []);
  const sidebarKeys = visibleSections.filter((k) => sidebarSet.has(k));
  const mainKeys = visibleSections.filter((k) => !sidebarSet.has(k));

  const renderEditorialFooterBlock = () => (
    <View
      fixed
      style={{
        position: 'absolute',
        bottom: 20,
        left: scale.marginHorizPt,
        right: scale.marginHorizPt,
        borderTopWidth: 0.5,
        borderTopColor: '#d1d5db',
        paddingTop: 4,
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'center',
        alignItems: 'center',
      }}
    >
      {personalInfo.fullName?.trim() ? (
        <Text style={{ fontFamily: fontBold, fontSize: 7.8, color: '#111111', marginRight: 10 }}>
          {personalInfo.fullName.trim()}
        </Text>
      ) : null}
      {locationText ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', marginRight: 10 }}>
          {renderEditorialContactIcon('location', '#374151')}
          <Text style={{ fontSize: 7.8, color: '#374151' }}>{locationText}</Text>
        </View>
      ) : null}
      {personalInfo.phone?.trim() ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', marginRight: 10 }}>
          {renderEditorialContactIcon('phone', '#374151')}
          <Text style={{ fontSize: 7.8, color: '#374151' }}>{personalInfo.phone.trim()}</Text>
        </View>
      ) : null}
      {personalInfo.email?.trim() ? (
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          {renderEditorialContactIcon('email', '#374151')}
          <Text style={{ fontSize: 7.8, color: '#374151' }}>{personalInfo.email.trim()}</Text>
        </View>
      ) : null}
    </View>
  );

  if (isEditorialTwoColumn) {
    const editorialPages = paginateEditorialPdfColumns({
      leftSections: mainKeys,
      rightSections: sidebarKeys,
      resume: effectiveResume,
      scale,
      headerHeightPt: estimateEditorialHeaderHeightPt(
        buildElegantSerifMetadataRows(effectiveResume).length,
        buildElegantSerifContactItems(personalInfo).length,
        scale
      ),
    });

    return (
      <Document
        title={
          effectiveResume.title ||
          `${personalInfo.fullName || 'Professional'} Resume`
        }
        author={personalInfo.fullName || 'Resume Builder'}
        subject="Curriculum Vitae / Resume"
        keywords="Resume, Curriculum Vitae, A4, Template"
      >
        {editorialPages.map((pg, pageIdx) => (
          <Page key={`editorial-page-${pg.pageNumber}`} size="A4" style={styles.page}>
            {pageIdx === 0 ? renderHeader() : null}
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <View style={{ width: '48.5%', paddingRight: 7 }}>
                {pg.left.map((slice) =>
                  <React.Fragment key={`L-${pg.pageNumber}-${slice.sectionKey}-${slice.sliceStart}`}>
                    {renderSection(slice.sectionKey, {
                      isSidebar: false,
                      inverted: false,
                      slice,
                    })}
                  </React.Fragment>
                )}
              </View>
              <View style={{ width: '48.5%', paddingLeft: 7 }}>
                {pg.right.map((slice) =>
                  <React.Fragment key={`R-${pg.pageNumber}-${slice.sectionKey}-${slice.sliceStart}`}>
                    {renderSection(slice.sectionKey, {
                      isSidebar: false,
                      inverted: false,
                      slice,
                    })}
                  </React.Fragment>
                )}
              </View>
            </View>
            {renderEditorialFooterBlock()}
            <Text
              style={styles.pageNumber}
              render={({ pageNumber, totalPages }) =>
                totalPages > 1 ? `Page ${pageNumber} of ${totalPages}` : ''
              }
              fixed
            />
          </Page>
        ))}
      </Document>
    );
  }

  if (isInternshipResume) {
    const internshipPages = paginateEditorialPdfColumns({
      leftSections: mainKeys,
      rightSections: sidebarKeys,
      resume: effectiveResume,
      scale,
      headerHeightPt: estimateInternshipHeaderHeightPt(
        buildInternshipContactItems(personalInfo).length,
        scale
      ),
      mode: 'internship',
    });

    return (
      <Document
        title={
          effectiveResume.title ||
          `${personalInfo.fullName || 'Internship'} Resume`
        }
        author={personalInfo.fullName || 'Resume Builder'}
        subject="Internship Resume / Curriculum Vitae"
        keywords="Internship Resume, Curriculum Vitae, A4, Template"
      >
        {internshipPages.map((pg, pageIdx) => (
          <Page key={`internship-page-${pg.pageNumber}`} size="A4" style={styles.page}>
            {pageIdx === 0 ? renderHeader() : null}
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <View style={{ width: '48.5%', paddingRight: 7 }}>
                {pg.left.map((slice) => (
                  <React.Fragment key={`IL-${pg.pageNumber}-${slice.sectionKey}-${slice.sliceStart}`}>
                    {renderSection(slice.sectionKey, {
                      isSidebar: false,
                      inverted: false,
                      slice,
                    })}
                  </React.Fragment>
                ))}
              </View>
              <View style={{ width: '48.5%', paddingLeft: 7 }}>
                {pg.right.map((slice) => (
                  <React.Fragment key={`IR-${pg.pageNumber}-${slice.sectionKey}-${slice.sliceStart}`}>
                    {renderSection(slice.sectionKey, {
                      isSidebar: false,
                      inverted: false,
                      slice,
                    })}
                  </React.Fragment>
                ))}
              </View>
            </View>
            <Text
              style={styles.pageNumber}
              render={({ pageNumber, totalPages }) =>
                totalPages > 1 ? `Page ${pageNumber} of ${totalPages}` : ''
              }
              fixed
            />
          </Page>
        ))}
      </Document>
    );
  }

  return (
    <Document
      title={
        effectiveResume.title ||
        `${personalInfo.fullName || 'Professional'} Resume`
      }
      author={personalInfo.fullName || 'Resume Builder'}
      subject="Curriculum Vitae / Resume"
      keywords="Resume, Curriculum Vitae, A4, Template"
    >
      <Page size="A4" style={styles.page}>
        {/* Full-bleed sidebar column background for 2-column templates */}
        {isTwoColumnSidebar && <View fixed style={styles.sidebarBg} />}

        {/* Single-column & Asymmetric Layouts */}
        {!isTwoColumnSidebar && !isMainLeftSidebarRight && (
          <>
            {renderHeader()}
            {visibleSections.map((key) =>
              renderSection(key, { isSidebar: false, inverted: false })
            )}
          </>
        )}

        {/* Two Column Professional (Main Left 60% / Sidebar Right 40% on crisp white) */}
        {isMainLeftSidebarRight && (
          <>
            {renderHeader()}
            <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
              <View style={{ width: '60%', paddingRight: 10 }}>
                {mainKeys.map((key) =>
                  renderSection(key, { isSidebar: false, inverted: false })
                )}
              </View>
              <View style={{ width: '40%', paddingLeft: 10 }}>
                {sidebarKeys.map((key) =>
                  renderSection(key, { isSidebar: true, inverted: false })
                )}
              </View>
            </View>
          </>
        )}

        {/* Two-Column Sidebar Layouts */}
        {isTwoColumnSidebar && (
          <>
            {/* Top full-width white header for light-sidebar Two Column Professional */}
            {!isDarkSidebar && (
              <View
                style={{
                  backgroundColor: '#ffffff',
                  paddingLeft: scale.marginHorizPt,
                  paddingTop: scale.marginTopPt,
                  paddingBottom: 7,
                  marginBottom: 8,
                  marginTop: -scale.marginTopPt,
                  borderBottomWidth: 1.5,
                  borderBottomColor: accent,
                }}
              >
                <Text
                  style={{
                    fontSize: scale.namePt,
                    fontFamily: fontBold,
                    letterSpacing: 0.6,
                    lineHeight: 1.15,
                    color: textCol,
                    marginBottom: 2,
                  }}
                >
                  {personalInfo.fullName || 'FULL NAME'}
                </Text>
                {personalInfo.jobTitle ? (
                  <Text
                    style={{
                      fontSize: scale.jobTitlePt,
                      fontFamily: fontBold,
                      color: accent,
                    }}
                  >
                    {personalInfo.jobTitle}
                  </Text>
                ) : null}
              </View>
            )}

            <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
              {/* Left Sidebar (32%) */}
              <View style={{ width: '32%', paddingLeft: 22, paddingRight: 14 }}>
                {isDarkSidebar ? (
                  <View style={{ marginBottom: 6 }}>
                    <Text
                      style={{
                        fontSize: Math.max(13, scale.namePt - 4),
                        fontFamily: fontBold,
                        textTransform: 'uppercase',
                        letterSpacing: 0.8,
                        lineHeight: 1.15,
                        color: '#ffffff',
                        marginBottom: 3,
                      }}
                    >
                      {personalInfo.fullName || 'FULL NAME'}
                    </Text>
                    {personalInfo.jobTitle ? (
                      <Text
                        style={{
                          fontSize: scale.metaPt + 0.5,
                          fontFamily: fontBold,
                          color: '#f1f5f9',
                          marginBottom: 6,
                        }}
                      >
                        {personalInfo.jobTitle}
                      </Text>
                    ) : null}
                    <View
                      style={{
                        width: 28,
                        height: 1.5,
                        backgroundColor: '#94a3b8',
                        marginBottom: 8,
                      }}
                    />
                    {renderSectionHeading('CONTACT', { inverted: true, compact: true })}
                    {contactLinks.map((c, i) =>
                      c.url ? (
                        <Link
                          key={i}
                          src={c.url}
                          style={{
                            fontSize: scale.metaPt - 0.25,
                            color: '#ffffff',
                            textDecoration: 'none',
                            marginBottom: 2,
                          }}
                        >
                          {c.label}
                        </Link>
                      ) : (
                        <Text
                          key={i}
                          style={{
                            fontSize: scale.metaPt - 0.25,
                            color: '#ffffff',
                            marginBottom: 2,
                          }}
                        >
                          {c.label}
                        </Text>
                      )
                    )}
                    {locationText ? (
                      <Text style={{ fontSize: scale.metaPt - 0.25, color: '#e2e8f0', marginTop: 2 }}>
                        {locationText}
                      </Text>
                    ) : null}
                    {personalInfo.otherProfiles ? (
                      <Text
                        style={{
                          fontSize: scale.metaPt - 0.75,
                          fontFamily: fontItalic,
                          color: '#cbd5e1',
                          marginTop: 3,
                        }}
                      >
                        {personalInfo.otherProfiles}
                      </Text>
                    ) : null}
                  </View>
                ) : (
                  <View style={{ marginBottom: 4 }}>
                    {renderSectionHeading('CONTACT', { inverted: false, compact: true })}
                    {contactLinks.map((c, i) =>
                      c.url ? (
                        <Link
                          key={i}
                          src={c.url}
                          style={{
                            fontSize: scale.metaPt - 0.25,
                            color: textCol,
                            textDecoration: 'none',
                            marginBottom: 2,
                          }}
                        >
                          {c.label}
                        </Link>
                      ) : (
                        <Text
                          key={i}
                          style={{
                            fontSize: scale.metaPt - 0.25,
                            color: textCol,
                            marginBottom: 2,
                          }}
                        >
                          {c.label}
                        </Text>
                      )
                    )}
                    {locationText ? (
                      <Text style={{ fontSize: scale.metaPt - 0.25, color: '#4b5563', marginTop: 2 }}>
                        {locationText}
                      </Text>
                    ) : null}
                    {personalInfo.otherProfiles ? (
                      <Text
                        style={{
                          fontSize: scale.metaPt - 0.75,
                          fontFamily: fontItalic,
                          color: '#4b5563',
                          marginTop: 3,
                        }}
                      >
                        {personalInfo.otherProfiles}
                      </Text>
                    ) : null}
                  </View>
                )}

                {sidebarKeys.map((key) =>
                  renderSection(key, { isSidebar: true, inverted: isDarkSidebar })
                )}
              </View>

              {/* Right Main Column (68%) */}
              <View style={{ width: '68%', paddingLeft: 18 }}>
                {mainKeys.map((key) =>
                  renderSection(key, { isSidebar: false, inverted: false })
                )}
              </View>
            </View>
          </>
        )}

        <Text
          style={styles.pageNumber}
          render={({ pageNumber, totalPages }) =>
            isModernCorporate
              ? `${pageNumber} / ${totalPages}`
              : totalPages > 1
              ? `Page ${pageNumber} of ${totalPages}`
              : ''
          }
          fixed
        />
      </Page>
    </Document>
  );
};
