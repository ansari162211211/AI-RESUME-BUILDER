import type {
  AwardItem,
  CertificationItem,
  CreativeCircularProficiencyItem,
  CreativeCommunicationSkillItem,
  CreativeSkillBarItem,
  CreativeSkillDetailItem,
  CustomSectionItem,
  ExperienceCategory,
  ExperienceItem,
  InterestItem,
  LeadershipItem,
  LearningActivityItem,
  PersonalInfo,
  ProjectItem,
  PublicationItem,
  PublicationType,
  Resume,
  SkillCategory,
  SkillMatrixLevel,
  VolunteerItem,
  MembershipItem,
} from '../types/resume';
import type { ResumeSectionKey, TemplateDefinition } from '../data/templates';
import { formatDoiUrl, sanitizePdfUrl } from './pdfHelpers';
import { validateDailyActivities } from './dailyActivities';

export const SKILL_MATRIX_LEVEL_LABELS: Record<SkillMatrixLevel, string> = {
  1: 'Basic / Familiar',
  2: 'Elementary',
  3: 'Intermediate',
  4: 'Advanced',
  5: 'Expert',
};

export const SKILL_MATRIX_LEGEND: Array<{ level: SkillMatrixLevel; label: string }> = [
  { level: 1, label: 'Basic / Familiar' },
  { level: 2, label: 'Elementary' },
  { level: 3, label: 'Intermediate' },
  { level: 4, label: 'Advanced' },
  { level: 5, label: 'Expert' },
];

export function getSkillMatrixLevelLabel(level?: SkillMatrixLevel | null): string {
  if (!level) return 'Unrated';
  return SKILL_MATRIX_LEVEL_LABELS[level] || 'Unrated';
}

export function getEffectiveInterests(resume: Resume): {
  items: InterestItem[];
  text: string;
} {
  const structured = (resume.interestItems || []).filter(
    (item) => item.name?.trim().length > 0
  );
  if (structured.length > 0) {
    return {
      items: structured,
      text: structured
        .map((i) => (i.description?.trim() ? `${i.name.trim()} (${i.description.trim()})` : i.name.trim()))
        .join(', '),
    };
  }
  const raw = (resume.interests || '').trim();
  if (!raw) return { items: [], text: '' };
  const parsed = raw
    .split(/[,;\n]+/)
    .map((s) => s.trim())
    .filter(Boolean)
    .map((name, idx) => ({ id: `legacy-int-${idx}`, name }));
  return { items: parsed, text: raw };
}

export function buildClassicPhoneList(personalInfo: PersonalInfo): Array<{ label: string; raw: string; url: string }> {
  const result: Array<{ label: string; raw: string; url: string }> = [];
  if (personalInfo.phone?.trim()) {
    result.push({
      label: 'Mobile',
      raw: personalInfo.phone.trim(),
      url: `tel:${personalInfo.phone.replace(/[^+\d]/g, '')}`,
    });
  }
  if (personalInfo.secondaryPhone?.trim()) {
    result.push({
      label: 'Phone',
      raw: personalInfo.secondaryPhone.trim(),
      url: `tel:${personalInfo.secondaryPhone.replace(/[^+\d]/g, '')}`,
    });
  }
  if (personalInfo.additionalPhone?.trim()) {
    result.push({
      label: 'Alt',
      raw: personalInfo.additionalPhone.trim(),
      url: `tel:${personalInfo.additionalPhone.replace(/[^+\d]/g, '')}`,
    });
  }
  return result;
}

export type TwoColumnContactKind =
  | 'email'
  | 'phone'
  | 'mailaddress'
  | 'location'
  | 'website'
  | 'twitter'
  | 'linkedin'
  | 'github'
  | 'orcid'
  | 'gitlab'
  | 'mastodon'
  | 'custom';

export interface TwoColumnContactItem {
  kind: TwoColumnContactKind;
  label: string;
  url: string | null;
}

/**
 * Builds compact header contact items for Template 4 (Two Column Professional)
 * supporting email, phone, mailing address, location, website, X/Twitter, LinkedIn,
 * GitHub, ORCID, GitLab, Mastodon, and custom social links.
 */
export function buildTwoColumnContactItems(personalInfo: PersonalInfo): TwoColumnContactItem[] {
  const items: TwoColumnContactItem[] = [];

  if (personalInfo.email?.trim()) {
    items.push({
      kind: 'email',
      label: personalInfo.email.trim(),
      url: `mailto:${personalInfo.email.trim()}`,
    });
  }

  if (personalInfo.phone?.trim()) {
    items.push({
      kind: 'phone',
      label: personalInfo.phone.trim(),
      url: `tel:${personalInfo.phone.replace(/[^+\d]/g, '')}`,
    });
  }

  if (personalInfo.streetAddress?.trim()) {
    items.push({
      kind: 'mailaddress',
      label: personalInfo.streetAddress.trim(),
      url: null,
    });
  }

  const locParts: string[] = [];
  if (personalInfo.city?.trim()) locParts.push(personalInfo.city.trim());
  const statePostal = [personalInfo.state?.trim(), personalInfo.postalCode?.trim()].filter(Boolean).join(' ');
  if (statePostal) locParts.push(statePostal);
  if (personalInfo.country?.trim()) locParts.push(personalInfo.country.trim());
  const locText = locParts.length > 0 ? locParts.join(', ') : (personalInfo.location || '').trim();
  if (locText) {
    items.push({
      kind: 'location',
      label: locText,
      url: null,
    });
  }

  if (personalInfo.website?.trim()) {
    items.push({
      kind: 'website',
      label: personalInfo.website.trim().replace(/^https?:\/\//, ''),
      url: sanitizePdfUrl(personalInfo.website.trim()),
    });
  }

  if (personalInfo.twitter?.trim()) {
    const raw = personalInfo.twitter.trim();
    const handle = raw.replace(/^https?:\/\/(www\.)?(twitter|x)\.com\//i, '').replace(/^@/, '');
    const fullUrl = raw.includes('://') ? raw : `https://x.com/${handle}`;
    items.push({
      kind: 'twitter',
      label: `@${handle}`,
      url: sanitizePdfUrl(fullUrl),
    });
  }

  if (personalInfo.linkedin?.trim()) {
    const raw = personalInfo.linkedin.trim();
    const label = raw.replace(/^https?:\/\/(www\.)?linkedin\.com\/in\//i, '').replace(/\/$/, '');
    const fullUrl = raw.includes('linkedin.com') ? raw : `https://linkedin.com/in/${label}`;
    items.push({
      kind: 'linkedin',
      label,
      url: sanitizePdfUrl(fullUrl),
    });
  }

  if (personalInfo.github?.trim()) {
    const raw = personalInfo.github.trim();
    const label = raw.replace(/^https?:\/\/(www\.)?github\.com\//i, '').replace(/\/$/, '');
    const fullUrl = raw.includes('github.com') ? raw : `https://github.com/${label}`;
    items.push({
      kind: 'github',
      label,
      url: sanitizePdfUrl(fullUrl),
    });
  }

  if (personalInfo.orcid?.trim()) {
    const raw = personalInfo.orcid.trim();
    const label = raw.replace(/^https?:\/\/orcid\.org\//i, '').replace(/\/$/, '');
    const fullUrl = raw.includes('orcid.org') ? raw : `https://orcid.org/${label}`;
    items.push({
      kind: 'orcid',
      label,
      url: sanitizePdfUrl(fullUrl),
    });
  }

  if (personalInfo.gitlab?.trim()) {
    const raw = personalInfo.gitlab.trim();
    const label = raw.replace(/^https?:\/\/(www\.)?gitlab\.com\//i, '').replace(/\/$/, '');
    const fullUrl = raw.includes('gitlab.com') ? raw : `https://gitlab.com/${label}`;
    items.push({
      kind: 'gitlab',
      label,
      url: sanitizePdfUrl(fullUrl),
    });
  }

  if (personalInfo.mastodon?.trim()) {
    const raw = personalInfo.mastodon.trim();
    const isUrl = /^https?:\/\//i.test(raw);
    items.push({
      kind: 'mastodon',
      label: raw.replace(/^https?:\/\//i, ''),
      url: isUrl ? sanitizePdfUrl(raw) : null,
    });
  }

  if (Array.isArray(personalInfo.customLinks)) {
    for (const link of personalInfo.customLinks) {
      if (link.label?.trim() || link.url?.trim()) {
        items.push({
          kind: 'custom',
          label: link.label?.trim() || link.url.trim().replace(/^https?:\/\//, ''),
          url: link.url?.trim() ? sanitizePdfUrl(link.url.trim()) : null,
        });
      }
    }
  }

  return items;
}

export type TwoColumnPubCategoryKey = 'books' | 'journal' | 'conference' | 'research' | 'other';

export interface TwoColumnPublicationGroup {
  categoryKey: TwoColumnPubCategoryKey;
  label: string;
  items: PublicationItem[];
}

function mapPublicationTypeToTwoColumnCategory(type?: PublicationType): TwoColumnPubCategoryKey {
  switch (type) {
    case 'book':
    case 'book_chapter':
      return 'books';
    case 'journal':
      return 'journal';
    case 'conference':
      return 'conference';
    case 'research_paper':
    case 'manuscript':
    case 'thesis':
      return 'research';
    case 'patent':
    case 'other':
    default:
      return 'other';
  }
}

export function groupPublicationsForTwoColumn(
  publications?: PublicationItem[]
): TwoColumnPublicationGroup[] {
  const list = Array.isArray(publications) ? publications : [];
  if (list.length === 0) return [];

  const buckets: Array<{ key: TwoColumnPubCategoryKey; label: string }> = [
    { key: 'books', label: 'Books' },
    { key: 'journal', label: 'Journal Articles' },
    { key: 'conference', label: 'Conference Proceedings' },
    { key: 'research', label: 'Research Papers' },
    { key: 'other', label: 'Other Publications' },
  ];

  const grouped: TwoColumnPublicationGroup[] = [];
  for (const b of buckets) {
    const matching = list.filter(
      (p) => mapPublicationTypeToTwoColumnCategory(p.type) === b.key
    );
    if (matching.length > 0) {
      grouped.push({
        categoryKey: b.key,
        label: b.label,
        items: matching,
      });
    }
  }
  return grouped;
}

export interface CategorizedExperienceGroup {
  categoryLabel: string | null;
  items: ExperienceItem[];
}

export function groupExperienceByCategory(
  experience: ExperienceItem[]
): CategorizedExperienceGroup[] {
  const hasExplicitCategory = experience.some((exp) => Boolean(exp.category));
  if (!hasExplicitCategory) {
    return [{ categoryLabel: null, items: experience }];
  }

  const order: Array<{ key: ExperienceCategory | 'Uncategorized'; label: string }> = [
    { key: 'Professional', label: 'Professional Experience' },
    { key: 'Vocational', label: 'Vocational Experience' },
    { key: 'Other', label: 'Other Experience' },
    { key: 'Uncategorized', label: 'Experience' },
  ];

  const groups: CategorizedExperienceGroup[] = [];
  for (const bucket of order) {
    const matching = experience.filter((exp) => (exp.category || 'Uncategorized') === bucket.key);
    if (matching.length > 0) {
      groups.push({ categoryLabel: bucket.label, items: matching });
    }
  }
  return groups;
}

export interface ContactLinkItem {
  label: string;
  url: string | null;
  kind?: 'phone' | 'email' | 'website' | 'linkedin' | 'github';
}

export function cleanHighlights(highlights?: unknown[]): string[] {
  if (!Array.isArray(highlights)) return [];
  return highlights
    .filter((h): h is string => typeof h === 'string' && h.trim().length > 0)
    .map((h) => h.replace(/^[•\-*]\s*/, '').trim());
}

export function chunkRows<T>(items: T[], rowSize = 2): T[][] {
  const rows: T[][] = [];
  for (let i = 0; i < items.length; i += rowSize) {
    rows.push(items.slice(i, i + rowSize));
  }
  return rows;
}

export function chunkPairs<T>(items: T[]): T[][] {
  return chunkRows(items, 2);
}

export function getCourseworkItems(resume: Resume): string[] {
  return (resume.coursework || [])
    .filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
    .map((item) => item.trim());
}

export function buildContactLinks(personalInfo: PersonalInfo): ContactLinkItem[] {
  const links: ContactLinkItem[] = [];

  if (personalInfo.phone) {
    links.push({
      label: personalInfo.phone,
      url: `tel:${personalInfo.phone.replace(/[^+\d]/g, '')}`,
      kind: 'phone',
    });
  }
  if (personalInfo.email) {
    links.push({
      label: personalInfo.email,
      url: `mailto:${personalInfo.email.trim()}`,
      kind: 'email',
    });
  }
  if (personalInfo.website) {
    links.push({
      label: personalInfo.website.replace(/^https?:\/\//, ''),
      url: sanitizePdfUrl(personalInfo.website),
      kind: 'website',
    });
  }
  if (personalInfo.linkedin) {
    const cleanLinkedin = personalInfo.linkedin.replace(
      /^https?:\/\/(www\.)?linkedin\.com\/in\//,
      'linkedin.com/in/'
    );
    const linkedinFull = personalInfo.linkedin.includes('linkedin.com')
      ? personalInfo.linkedin
      : `https://linkedin.com/in/${personalInfo.linkedin}`;
    links.push({
      label: cleanLinkedin,
      url: sanitizePdfUrl(linkedinFull),
      kind: 'linkedin',
    });
  }
  if (personalInfo.github) {
    const cleanGithub = personalInfo.github.replace(
      /^https?:\/\/(www\.)?github\.com\//,
      'github.com/'
    );
    const githubFull = personalInfo.github.includes('github.com')
      ? personalInfo.github
      : `https://github.com/${personalInfo.github}`;
    links.push({
      label: cleanGithub,
      url: sanitizePdfUrl(githubFull),
      kind: 'github',
    });
  }

  return links;
}

export interface FresherContactLink {
  kind: 'phone' | 'email' | 'location' | 'linkedin' | 'website' | 'github' | 'custom';
  label: string;
  url: string | null;
}

export function buildFresherHeaderColumns(personalInfo: PersonalInfo): {
  left: FresherContactLink[];
  right: FresherContactLink[];
} {
  const left: FresherContactLink[] = [];
  const right: FresherContactLink[] = [];

  if (personalInfo.phone?.trim()) {
    left.push({
      kind: 'phone',
      label: personalInfo.phone.trim(),
      url: `tel:${personalInfo.phone.replace(/[^+\d]/g, '')}`,
    });
  }
  if (personalInfo.email?.trim()) {
    left.push({
      kind: 'email',
      label: personalInfo.email.trim(),
      url: `mailto:${personalInfo.email.trim()}`,
    });
  }
  const cityParts = [
    personalInfo.city?.trim(),
    personalInfo.state?.trim(),
    personalInfo.country?.trim(),
  ].filter(Boolean);
  const locFallback = (personalInfo.location || '').trim();
  const compactLoc = cityParts.length > 0 ? cityParts.join(', ') : locFallback;
  if (compactLoc) {
    left.push({
      kind: 'location',
      label: compactLoc,
      url: null,
    });
  }

  if (personalInfo.linkedin?.trim()) {
    const raw = personalInfo.linkedin.trim();
    const label = raw.replace(/^https?:\/\/(www\.)?/i, '').replace(/\/$/, '');
    const fullUrl = raw.includes('linkedin.com') ? raw : `https://linkedin.com/in/${label}`;
    right.push({
      kind: 'linkedin',
      label: label.startsWith('linkedin.com') ? label : `linkedin.com/in/${label}`,
      url: sanitizePdfUrl(fullUrl),
    });
  }

  if (personalInfo.website?.trim()) {
    const raw = personalInfo.website.trim();
    const label = raw.replace(/^https?:\/\/(www\.)?/i, '').replace(/\/$/, '');
    right.push({
      kind: 'website',
      label: label || 'Portfolio',
      url: sanitizePdfUrl(raw),
    });
  }

  if (personalInfo.github?.trim()) {
    const raw = personalInfo.github.trim();
    const label = raw.replace(/^https?:\/\/(www\.)?/i, '').replace(/\/$/, '');
    const fullUrl = raw.includes('github.com') ? raw : `https://github.com/${label}`;
    right.push({
      kind: 'github',
      label: label.startsWith('github.com') ? label : `github.com/${label}`,
      url: sanitizePdfUrl(fullUrl),
    });
  }

  if (Array.isArray(personalInfo.customLinks)) {
    for (const lnk of personalInfo.customLinks) {
      if (lnk.label?.trim() || lnk.url?.trim()) {
        right.push({
          kind: 'custom',
          label: lnk.label?.trim() || lnk.url.trim().replace(/^https?:\/\//i, ''),
          url: lnk.url?.trim() ? sanitizePdfUrl(lnk.url.trim()) : null,
        });
      }
    }
  }

  return { left, right };
}

export interface FresherAwardYearGroup {
  year: string;
  items: AwardItem[];
}

export function groupAwardsByYearForFresher(achievements?: AwardItem[]): FresherAwardYearGroup[] {
  const valid = (achievements || []).filter(
    (a) => a.title?.trim() || a.description?.trim() || a.achievementDetails?.trim()
  );
  if (valid.length === 0) return [];
  const groups: FresherAwardYearGroup[] = [];
  const byYear = new Map<string, FresherAwardYearGroup>();
  for (const item of valid) {
    const yr = (item.date || '').trim() || '—';
    const existing = byYear.get(yr);
    if (existing) {
      existing.items.push(item);
    } else {
      const grp: FresherAwardYearGroup = { year: yr, items: [item] };
      byYear.set(yr, grp);
      groups.push(grp);
    }
  }
  return groups;
}

export function buildLocationString(personalInfo: PersonalInfo): string {
  const parts: string[] = [];
  if (personalInfo.streetAddress) parts.push(personalInfo.streetAddress);
  if (personalInfo.city) parts.push(personalInfo.city);
  if (personalInfo.state) parts.push(personalInfo.state);
  if (personalInfo.postalCode) parts.push(personalInfo.postalCode);
  if (personalInfo.country) parts.push(personalInfo.country);
  return parts.length > 0 ? parts.join(', ') : personalInfo.location || '';
}

export function buildJakesAddressString(personalInfo: PersonalInfo): string {
  const parts: string[] = [];
  if (personalInfo.streetAddress?.trim()) parts.push(personalInfo.streetAddress.trim());
  if (personalInfo.city?.trim()) parts.push(personalInfo.city.trim());
  const stateZip = [personalInfo.state?.trim(), personalInfo.postalCode?.trim()]
    .filter(Boolean)
    .join(' ');
  if (stateZip) parts.push(stateZip);
  if (parts.length === 0 && personalInfo.country?.trim()) {
    parts.push(personalInfo.country.trim());
  }
  return parts.length > 0 ? parts.join(', ') : personalInfo.location || '';
}

export type SoftwareDevContactKind = 'phone' | 'email' | 'website' | 'github' | 'linkedin' | 'custom';

export interface SoftwareDevContactItem {
  label: string;
  url: string | null;
  kind: SoftwareDevContactKind;
}

export function buildSoftwareDevContactItems(
  personalInfo: PersonalInfo
): SoftwareDevContactItem[] {
  const items: SoftwareDevContactItem[] = [];

  if (personalInfo.phone?.trim()) {
    items.push({
      label: personalInfo.phone.trim(),
      url: `tel:${personalInfo.phone.replace(/[^+\d]/g, '')}`,
      kind: 'phone',
    });
  }
  if (personalInfo.email?.trim()) {
    items.push({
      label: personalInfo.email.trim(),
      url: `mailto:${personalInfo.email.trim()}`,
      kind: 'email',
    });
  }
  if (personalInfo.website?.trim()) {
    items.push({
      label: personalInfo.website.trim().replace(/^https?:\/\//, '').replace(/\/$/, ''),
      url: sanitizePdfUrl(personalInfo.website.trim()),
      kind: 'website',
    });
  }
  if (personalInfo.github?.trim()) {
    const raw = personalInfo.github.trim();
    const label = raw.replace(/^https?:\/\/(www\.)?github\.com\//i, 'github.com/').replace(/\/$/, '');
    const fullUrl = raw.includes('github.com') ? raw : `https://github.com/${raw}`;
    items.push({
      label: label.startsWith('github.com/') ? label : `github.com/${label}`,
      url: sanitizePdfUrl(fullUrl),
      kind: 'github',
    });
  }
  if (personalInfo.linkedin?.trim()) {
    const raw = personalInfo.linkedin.trim();
    const label = raw.replace(/^https?:\/\/(www\.)?linkedin\.com\/in\//i, 'linkedin.com/in/').replace(/\/$/, '');
    const fullUrl = raw.includes('linkedin.com') ? raw : `https://linkedin.com/in/${raw}`;
    items.push({
      label: label.startsWith('linkedin.com/') ? label : `linkedin.com/in/${label}`,
      url: sanitizePdfUrl(fullUrl),
      kind: 'linkedin',
    });
  }
  if (Array.isArray(personalInfo.customLinks)) {
    for (const link of personalInfo.customLinks) {
      if (link.label?.trim() || link.url?.trim()) {
        items.push({
          label: link.label?.trim() || link.url.trim().replace(/^https?:\/\//, '').replace(/\/$/, ''),
          url: link.url?.trim() ? sanitizePdfUrl(link.url.trim()) : null,
          kind: 'custom',
        });
      }
    }
  }

  return items;
}

export type SoftwareDevSkillBucketKey =
  | 'programming-languages'
  | 'developer-tools'
  | 'technologies-frameworks';

export function matchSoftwareDevSkillBucket(categoryName?: string): SoftwareDevSkillBucketKey | null {
  const norm = (categoryName || '').trim().toLowerCase();
  if (!norm) return null;
  if (norm === 'programming languages' || norm === 'languages' || norm === 'programming language') {
    return 'programming-languages';
  }
  if (norm === 'developer tools' || norm === 'tools' || norm === 'dev tools') {
    return 'developer-tools';
  }
  if (
    norm === 'technologies and frameworks' ||
    norm === 'technologies & frameworks' ||
    norm === 'technologies/frameworks' ||
    norm === 'frameworks' ||
    norm === 'technologies' ||
    norm === 'frameworks & libraries'
  ) {
    return 'technologies-frameworks';
  }
  return null;
}

export function getSoftwareDevSkillBucketItems(
  skills: SkillCategory[] | undefined,
  bucket: SoftwareDevSkillBucketKey
): string[] {
  const seen = new Set<string>();
  const collected: string[] = [];
  for (const cat of skills || []) {
    if (matchSoftwareDevSkillBucket(cat.category) === bucket) {
      for (const s of cat.skills || []) {
        const trimmed = typeof s === 'string' ? s.trim() : '';
        if (trimmed && !seen.has(trimmed.toLowerCase())) {
          seen.add(trimmed.toLowerCase());
          collected.push(trimmed);
        }
      }
    }
  }
  return collected;
}

export type SoftwareDevAdditionalSubsection =
  | { key: 'coursework'; title: 'Relevant Coursework'; items: string[] }
  | { key: 'leadership'; title: 'Leadership and Activities'; items: LeadershipItem[] }
  | { key: 'programming-languages'; title: 'Programming Languages'; items: string[] }
  | { key: 'developer-tools'; title: 'Developer Tools'; items: string[] }
  | { key: 'technologies-frameworks'; title: 'Technologies and Frameworks'; items: string[] }
  | { key: 'other-skills'; title: string; id: string; items: string[] }
  | { key: 'certifications'; title: 'Certifications'; items: CertificationItem[] }
  | { key: 'achievements'; title: 'Achievements'; items: AwardItem[] }
  | { key: 'custom-sections'; title: string; id: string; items: string[] };

export function getSoftwareDevAdditionalSubsections(
  resume: Resume
): SoftwareDevAdditionalSubsection[] {
  const hidden = new Set(resume.hiddenSections || []);
  const blocks: SoftwareDevAdditionalSubsection[] = [];

  if (!hidden.has('coursework')) {
    const coursework = getCourseworkItems(resume);
    if (coursework.length > 0) {
      blocks.push({ key: 'coursework', title: 'Relevant Coursework', items: coursework });
    }
  }

  if (!hidden.has('leadership')) {
    const leadership = (resume.leadership || []).filter(
      (l) => l.organization?.trim() || l.role?.trim() || cleanHighlights(l.highlights).length > 0
    );
    if (leadership.length > 0) {
      blocks.push({ key: 'leadership', title: 'Leadership and Activities', items: leadership });
    }
  }

  if (!hidden.has('skills')) {
    const progLangs = getSoftwareDevSkillBucketItems(resume.skills, 'programming-languages');
    if (!hidden.has('programming-languages') && progLangs.length > 0) {
      blocks.push({
        key: 'programming-languages',
        title: 'Programming Languages',
        items: progLangs,
      });
    }

    const devTools = getSoftwareDevSkillBucketItems(resume.skills, 'developer-tools');
    if (!hidden.has('developer-tools') && devTools.length > 0) {
      blocks.push({
        key: 'developer-tools',
        title: 'Developer Tools',
        items: devTools,
      });
    }

    const techFrameworks = getSoftwareDevSkillBucketItems(resume.skills, 'technologies-frameworks');
    if (!hidden.has('technologies-frameworks') && techFrameworks.length > 0) {
      blocks.push({
        key: 'technologies-frameworks',
        title: 'Technologies and Frameworks',
        items: techFrameworks,
      });
    }

    // Preserve any user-defined custom skill categories cleanly
    for (const cat of getVisibleSkills(resume.skills)) {
      if (matchSoftwareDevSkillBucket(cat.category) === null) {
        const cleanItems = (cat.skills || []).map((s) => s.trim()).filter(Boolean);
        if (cleanItems.length > 0 && cat.category?.trim()) {
          blocks.push({
            key: 'other-skills',
            id: cat.id,
            title: cat.category.trim(),
            items: cleanItems,
          });
        }
      }
    }
  }

  if (!hidden.has('certifications')) {
    const certs = (resume.certifications || []).filter((c) => c.name?.trim() || c.issuer?.trim());
    if (certs.length > 0) {
      blocks.push({ key: 'certifications', title: 'Certifications', items: certs });
    }
  }

  if (!hidden.has('achievements') && !hidden.has('awards')) {
    const awards = (resume.achievements || []).filter((a) => a.title?.trim() || a.description?.trim());
    if (awards.length > 0) {
      blocks.push({ key: 'achievements', title: 'Achievements', items: awards });
    }
  }

  if (!hidden.has('custom-sections')) {
    const customs = (resume.customSections || []).filter(
      (cs): cs is CustomSectionItem =>
        Boolean(cs.title?.trim()) && Boolean(cs.bullets?.some((b) => b.trim().length > 0))
    );
    for (const cs of customs) {
      blocks.push({
        key: 'custom-sections',
        id: cs.id,
        title: cs.title.trim(),
        items: cs.bullets.map((b) => b.trim()).filter(Boolean),
      });
    }
  }

  return blocks;
}

export interface HarvardContactItem {
  label: string;
  url: string | null;
}

export function buildHarvardContactItems(personalInfo: PersonalInfo): HarvardContactItem[] {
  const items: HarvardContactItem[] = [];

  const addrParts: string[] = [];
  if (personalInfo.streetAddress?.trim()) addrParts.push(personalInfo.streetAddress.trim());
  if (personalInfo.city?.trim()) addrParts.push(personalInfo.city.trim());
  const stateZip = [personalInfo.state?.trim(), personalInfo.postalCode?.trim()]
    .filter(Boolean)
    .join(' ');
  if (stateZip) addrParts.push(stateZip);
  if (personalInfo.country?.trim()) addrParts.push(personalInfo.country.trim());
  const addr = addrParts.length > 0 ? addrParts.join(', ') : (personalInfo.location || '').trim();
  if (addr) {
    items.push({ label: addr, url: null });
  }

  if (personalInfo.email?.trim()) {
    items.push({
      label: personalInfo.email.trim(),
      url: `mailto:${personalInfo.email.trim()}`,
    });
  }

  if (personalInfo.phone?.trim()) {
    items.push({
      label: personalInfo.phone.trim(),
      url: `tel:${personalInfo.phone.replace(/[^+\d]/g, '')}`,
    });
  }

  if (personalInfo.linkedin?.trim()) {
    const raw = personalInfo.linkedin.trim();
    const label = raw.replace(/^https?:\/\/(www\.)?/i, '').replace(/\/$/, '');
    const fullUrl = raw.includes('linkedin.com')
      ? raw
      : `https://linkedin.com/in/${raw.replace(/^linkedin\.com\/in\//i, '')}`;
    items.push({
      label: label.includes('linkedin.com') ? label : `linkedin.com/in/${label}`,
      url: sanitizePdfUrl(fullUrl),
    });
  }

  if (personalInfo.github?.trim()) {
    const raw = personalInfo.github.trim();
    const label = raw.replace(/^https?:\/\/(www\.)?/i, '').replace(/\/$/, '');
    const fullUrl = raw.includes('github.com')
      ? raw
      : `https://github.com/${raw.replace(/^github\.com\//i, '')}`;
    items.push({
      label: label.includes('github.com') ? label : `github.com/${label}`,
      url: sanitizePdfUrl(fullUrl),
    });
  }

  if (personalInfo.website?.trim()) {
    const raw = personalInfo.website.trim();
    items.push({
      label: raw.replace(/^https?:\/\//i, '').replace(/\/$/, ''),
      url: sanitizePdfUrl(raw),
    });
  }

  if (Array.isArray(personalInfo.customLinks)) {
    for (const link of personalInfo.customLinks) {
      if (link.label?.trim() || link.url?.trim()) {
        items.push({
          label:
            link.label?.trim() ||
            link.url.trim().replace(/^https?:\/\//i, '').replace(/\/$/, ''),
          url: link.url?.trim() ? sanitizePdfUrl(link.url.trim()) : null,
        });
      }
    }
  }

  return items;
}

export type ElegantSerifContactKind =
  | 'phone'
  | 'email'
  | 'address'
  | 'location'
  | 'website'
  | 'linkedin'
  | 'github'
  | 'orcid'
  | 'other'
  | 'custom';

export interface ElegantSerifContactItem {
  kind: ElegantSerifContactKind;
  label: string;
  url: string | null;
}

export function buildElegantSerifContactItems(
  personalInfo: PersonalInfo
): ElegantSerifContactItem[] {
  const items: ElegantSerifContactItem[] = [];

  if (personalInfo.phone?.trim()) {
    items.push({
      kind: 'phone',
      label: personalInfo.phone.trim(),
      url: `tel:${personalInfo.phone.replace(/[^+\d]/g, '')}`,
    });
  }

  if (personalInfo.email?.trim()) {
    items.push({
      kind: 'email',
      label: personalInfo.email.trim(),
      url: `mailto:${personalInfo.email.trim()}`,
    });
  }

  if (personalInfo.streetAddress?.trim()) {
    items.push({
      kind: 'address',
      label: personalInfo.streetAddress.trim(),
      url: null,
    });
  }

  const locParts: string[] = [];
  if (personalInfo.city?.trim()) locParts.push(personalInfo.city.trim());
  const stateZip = [personalInfo.state?.trim(), personalInfo.postalCode?.trim()]
    .filter(Boolean)
    .join(' ');
  if (stateZip) locParts.push(stateZip);
  if (personalInfo.country?.trim()) locParts.push(personalInfo.country.trim());
  const locText =
    locParts.length > 0 ? locParts.join(', ') : (personalInfo.location || '').trim();
  if (locText) {
    items.push({
      kind: 'location',
      label: locText,
      url: null,
    });
  }

  if (personalInfo.website?.trim()) {
    const raw = personalInfo.website.trim();
    items.push({
      kind: 'website',
      label: raw.replace(/^https?:\/\//i, '').replace(/\/$/, ''),
      url: sanitizePdfUrl(raw),
    });
  }

  if (personalInfo.linkedin?.trim()) {
    const raw = personalInfo.linkedin.trim();
    const label = raw.replace(/^https?:\/\/(www\.)?/i, '').replace(/\/$/, '');
    const fullUrl = raw.includes('linkedin.com')
      ? raw
      : `https://linkedin.com/in/${raw.replace(/^linkedin\.com\/in\//i, '')}`;
    items.push({
      kind: 'linkedin',
      label: label.includes('linkedin.com') ? label : `linkedin.com/in/${label}`,
      url: sanitizePdfUrl(fullUrl),
    });
  }

  if (personalInfo.github?.trim()) {
    const raw = personalInfo.github.trim();
    const label = raw.replace(/^https?:\/\/(www\.)?/i, '').replace(/\/$/, '');
    const fullUrl = raw.includes('github.com')
      ? raw
      : `https://github.com/${raw.replace(/^github\.com\//i, '')}`;
    items.push({
      kind: 'github',
      label: label.includes('github.com') ? label : `github.com/${label}`,
      url: sanitizePdfUrl(fullUrl),
    });
  }

  if (personalInfo.orcid?.trim()) {
    const raw = personalInfo.orcid.trim();
    const clean = raw.replace(/^https?:\/\/orcid\.org\//i, '').replace(/\/$/, '');
    const fullUrl = raw.includes('orcid.org') ? raw : `https://orcid.org/${clean}`;
    items.push({
      kind: 'orcid',
      label: `orcid.org/${clean}`,
      url: sanitizePdfUrl(fullUrl),
    });
  }

  if (personalInfo.otherProfiles?.trim()) {
    items.push({
      kind: 'other',
      label: personalInfo.otherProfiles.trim(),
      url: null,
    });
  }

  if (Array.isArray(personalInfo.customLinks)) {
    for (const link of personalInfo.customLinks) {
      if (link.label?.trim() || link.url?.trim()) {
        items.push({
          kind: 'custom',
          label:
            link.label?.trim() ||
            link.url.trim().replace(/^https?:\/\//i, '').replace(/\/$/, ''),
          url: link.url?.trim() ? sanitizePdfUrl(link.url.trim()) : null,
        });
      }
    }
  }

  return items;
}

export interface ElegantSerifMetadataRow {
  kind: 'title' | 'nationality' | 'dob' | 'languages' | 'info';
  label: string;
}

export function buildElegantSerifMetadataRows(
  resume: Resume
): ElegantSerifMetadataRow[] {
  const rows: ElegantSerifMetadataRow[] = [];
  const p = resume.personalInfo;
  if (!p) return rows;

  if (p.jobTitle?.trim()) {
    rows.push({ kind: 'title', label: p.jobTitle.trim() });
  }
  if (p.nationality?.trim()) {
    rows.push({ kind: 'nationality', label: `Nationality: ${p.nationality.trim()}` });
  }
  if (p.dateOfBirth?.trim()) {
    rows.push({ kind: 'dob', label: p.dateOfBirth.trim() });
  }
  const confirmedLangs = (resume.languages || [])
    .filter((l) => l.language?.trim())
    .map((l) => {
      const prof = l.proficiency?.trim();
      const hasValidProf = prof && !/^(unconfirmed|none|unspecified)$/i.test(prof);
      return hasValidProf ? `${l.language.trim()} (${prof})` : l.language.trim();
    });
  if (confirmedLangs.length > 0 && !(resume.hiddenSections || []).includes('languages')) {
    rows.push({ kind: 'languages', label: `Languages: ${confirmedLangs.join(', ')}` });
  }
  if (p.additionalInfo?.trim()) {
    rows.push({ kind: 'info', label: p.additionalInfo.trim() });
  }

  return rows;
}

export type ModernCorporateContactKind =
  | 'street'
  | 'location'
  | 'country'
  | 'dob'
  | 'mobile'
  | 'phone'
  | 'altPhone'
  | 'email'
  | 'website'
  | 'linkedin'
  | 'github'
  | 'custom'
  | 'additionalInfo';

export interface ModernCorporateContactItem {
  kind: ModernCorporateContactKind;
  label: string;
  url: string | null;
}

export function buildModernCorporateContactItems(
  personalInfo: PersonalInfo
): ModernCorporateContactItem[] {
  const items: ModernCorporateContactItem[] = [];

  if (personalInfo.streetAddress?.trim()) {
    items.push({
      kind: 'street',
      label: personalInfo.streetAddress.trim(),
      url: null,
    });
  }

  const cityRegionParts = [
    personalInfo.postalCode?.trim(),
    personalInfo.city?.trim(),
    personalInfo.state?.trim(),
  ].filter(Boolean);
  if (cityRegionParts.length > 0) {
    items.push({
      kind: 'location',
      label: cityRegionParts.join(', '),
      url: null,
    });
  } else if (!personalInfo.streetAddress?.trim() && personalInfo.location?.trim()) {
    items.push({
      kind: 'location',
      label: personalInfo.location.trim(),
      url: null,
    });
  }

  if (personalInfo.country?.trim()) {
    items.push({
      kind: 'country',
      label: personalInfo.country.trim(),
      url: null,
    });
  }

  if (personalInfo.dateOfBirth?.trim()) {
    items.push({
      kind: 'dob',
      label: personalInfo.dateOfBirth.trim(),
      url: null,
    });
  }

  if (personalInfo.phone?.trim()) {
    items.push({
      kind: 'mobile',
      label: personalInfo.phone.trim(),
      url: `tel:${personalInfo.phone.replace(/[^+\d]/g, '')}`,
    });
  }

  if (personalInfo.secondaryPhone?.trim()) {
    items.push({
      kind: 'phone',
      label: personalInfo.secondaryPhone.trim(),
      url: `tel:${personalInfo.secondaryPhone.replace(/[^+\d]/g, '')}`,
    });
  }

  if (personalInfo.additionalPhone?.trim()) {
    items.push({
      kind: 'altPhone',
      label: personalInfo.additionalPhone.trim(),
      url: `tel:${personalInfo.additionalPhone.replace(/[^+\d]/g, '')}`,
    });
  }

  if (personalInfo.email?.trim()) {
    items.push({
      kind: 'email',
      label: personalInfo.email.trim(),
      url: `mailto:${personalInfo.email.trim()}`,
    });
  }

  if (personalInfo.website?.trim()) {
    const raw = personalInfo.website.trim();
    items.push({
      kind: 'website',
      label: raw.replace(/^https?:\/\//i, '').replace(/\/$/, ''),
      url: sanitizePdfUrl(raw),
    });
  }

  if (personalInfo.linkedin?.trim()) {
    const raw = personalInfo.linkedin.trim();
    const label = raw.replace(/^https?:\/\/(www\.)?linkedin\.com\/in\//i, '').replace(/\/$/, '');
    const fullUrl = raw.includes('linkedin.com') ? raw : `https://linkedin.com/in/${label}`;
    items.push({
      kind: 'linkedin',
      label,
      url: sanitizePdfUrl(fullUrl),
    });
  }

  if (personalInfo.github?.trim()) {
    const raw = personalInfo.github.trim();
    const label = raw.replace(/^https?:\/\/(www\.)?github\.com\//i, '').replace(/\/$/, '');
    const fullUrl = raw.includes('github.com') ? raw : `https://github.com/${label}`;
    items.push({
      kind: 'github',
      label,
      url: sanitizePdfUrl(fullUrl),
    });
  }

  if (Array.isArray(personalInfo.customLinks)) {
    for (const link of personalInfo.customLinks) {
      if (link.label?.trim() || link.url?.trim()) {
        items.push({
          kind: 'custom',
          label:
            link.label?.trim() ||
            link.url.trim().replace(/^https?:\/\//i, '').replace(/\/$/, ''),
          url: link.url?.trim() ? sanitizePdfUrl(link.url.trim()) : null,
        });
      }
    }
  }

  if (personalInfo.additionalInfo?.trim()) {
    items.push({
      kind: 'additionalInfo',
      label: personalInfo.additionalInfo.trim(),
      url: null,
    });
  }

  return items;
}

export interface HarvardSkillsRow {
  key: string;
  label: string;
  text: string;
}

export function getHarvardSkillsAndInterests(resume: Resume): {
  rows: HarvardSkillsRow[];
} {
  const hidden = new Set(resume.hiddenSections || []);
  const rows: HarvardSkillsRow[] = [];

  if (!hidden.has('skills')) {
    for (const cat of getVisibleSkills(resume.skills)) {
      const items = (cat.skills || []).map((s) => s.trim()).filter(Boolean);
      const label = cat.category?.trim() || 'Technical Skills';
      if (items.length > 0) {
        rows.push({
          key: `tech-${cat.id}`,
          label,
          text: items.join(', '),
        });
      }
    }
  }

  if (!hidden.has('lab-skills')) {
    const labItems = (resume.labSkills || []).map((s) => s.trim()).filter(Boolean);
    if (labItems.length > 0) {
      rows.push({
        key: 'lab-skills',
        label: 'Laboratory & Research Skills',
        text: labItems.join(', '),
      });
    }
  }

  if (!hidden.has('languages')) {
    const langStrings: string[] = [];
    for (const lang of resume.languages || []) {
      const name = lang.language?.trim();
      if (!name) continue;
      const prof = lang.proficiency?.trim();
      const comment = lang.comment?.trim();
      const validProf =
        prof && !/^(unconfirmed|none|unspecified)$/i.test(prof) ? prof : '';
      const details = [validProf, comment].filter(Boolean).join('; ');
      langStrings.push(details ? `${name} (${details})` : name);
    }
    if (langStrings.length > 0) {
      rows.push({
        key: 'languages',
        label: 'Languages',
        text: langStrings.join(', '),
      });
    }
  }

  if (!hidden.has('interests')) {
    const eff = getEffectiveInterests(resume);
    if (eff.text) {
      rows.push({
        key: 'interests',
        label: 'Interests',
        text: eff.text,
      });
    }
  }

  return { rows };
}

export type HarvardAdditionalSubsection =
  | { key: 'awards'; title: 'Awards & Honors'; items: AwardItem[] }
  | { key: 'projects'; title: 'Selected Projects'; items: ProjectItem[] }
  | { key: 'certifications'; title: 'Certifications'; items: CertificationItem[] }
  | { key: 'publications'; title: 'Publications & Research'; items: PublicationItem[] }
  | { key: 'volunteer'; title: 'Volunteer & Community Involvement'; items: VolunteerItem[] }
  | { key: 'memberships'; title: 'Professional Memberships'; items: MembershipItem[] }
  | { key: 'custom-sections'; title: string; id: string; items: string[] };

export function getHarvardAdditionalSubsections(
  resume: Resume
): HarvardAdditionalSubsection[] {
  const hidden = new Set(resume.hiddenSections || []);
  const blocks: HarvardAdditionalSubsection[] = [];

  if (!hidden.has('awards') && !hidden.has('achievements')) {
    const awards = (resume.achievements || []).filter(
      (a) => a.title?.trim() || a.description?.trim()
    );
    if (awards.length > 0) {
      blocks.push({ key: 'awards', title: 'Awards & Honors', items: awards });
    }
  }

  if (!hidden.has('projects')) {
    const projs = (resume.projects || []).filter(
      (p) => p.title?.trim() || p.description?.trim()
    );
    if (projs.length > 0) {
      blocks.push({ key: 'projects', title: 'Selected Projects', items: projs });
    }
  }

  if (!hidden.has('certifications')) {
    const certs = (resume.certifications || []).filter(
      (c) => c.name?.trim() || c.issuer?.trim()
    );
    if (certs.length > 0) {
      blocks.push({ key: 'certifications', title: 'Certifications', items: certs });
    }
  }

  if (!hidden.has('publications')) {
    const pubs = (resume.publications || []).filter((p) => p.title?.trim());
    if (pubs.length > 0) {
      blocks.push({ key: 'publications', title: 'Publications & Research', items: pubs });
    }
  }

  if (!hidden.has('volunteer')) {
    const vol = (resume.volunteer || []).filter(
      (v) => v.organization?.trim() || v.role?.trim()
    );
    if (vol.length > 0) {
      blocks.push({
        key: 'volunteer',
        title: 'Volunteer & Community Involvement',
        items: vol,
      });
    }
  }

  if (!hidden.has('memberships')) {
    const mems = (resume.memberships || []).filter((m) => m.organization?.trim());
    if (mems.length > 0) {
      blocks.push({
        key: 'memberships',
        title: 'Professional Memberships',
        items: mems,
      });
    }
  }

  if (!hidden.has('custom-sections')) {
    const customs = (resume.customSections || []).filter(
      (cs): cs is CustomSectionItem =>
        Boolean(cs.title?.trim()) && Boolean(cs.bullets?.some((b) => b.trim().length > 0))
    );
    for (const cs of customs) {
      blocks.push({
        key: 'custom-sections',
        id: cs.id,
        title: cs.title.trim(),
        items: cs.bullets.map((b) => b.trim()).filter(Boolean),
      });
    }
  }

  return blocks;
}

export function getVisibleSkills(skills?: SkillCategory[]): SkillCategory[] {
  return (skills || []).filter(
    (cat) =>
      (cat.category && cat.category.trim().length > 0) ||
      (cat.skills && cat.skills.length > 0)
  );
}

export type InternshipContactKind =
  | 'email'
  | 'phone'
  | 'location'
  | 'linkedin'
  | 'github'
  | 'website'
  | 'custom';

export interface InternshipContactItem {
  kind: InternshipContactKind;
  label: string;
  url: string | null;
}

export function buildInternshipContactItems(
  personalInfo: PersonalInfo
): InternshipContactItem[] {
  const items: InternshipContactItem[] = [];

  if (personalInfo.email?.trim()) {
    items.push({
      kind: 'email',
      label: personalInfo.email.trim(),
      url: `mailto:${personalInfo.email.trim()}`,
    });
  }

  if (personalInfo.phone?.trim()) {
    items.push({
      kind: 'phone',
      label: personalInfo.phone.trim(),
      url: `tel:${personalInfo.phone.replace(/[^+\d]/g, '')}`,
    });
  }

  const locParts = [
    personalInfo.city?.trim(),
    personalInfo.state?.trim(),
    personalInfo.country?.trim(),
  ].filter(Boolean);
  const locText =
    locParts.length > 0
      ? locParts.join(', ')
      : (personalInfo.location || '').trim() || (personalInfo.streetAddress || '').trim();
  if (locText) {
    items.push({
      kind: 'location',
      label: locText,
      url: null,
    });
  }

  if (personalInfo.linkedin?.trim()) {
    const raw = personalInfo.linkedin.trim();
    const clean = raw.replace(/^https?:\/\/(www\.)?/i, '').replace(/\/$/, '');
    const fullUrl = raw.includes('linkedin.com')
      ? raw
      : `https://linkedin.com/in/${clean.replace(/^linkedin\.com\/in\//i, '')}`;
    items.push({
      kind: 'linkedin',
      label: clean.includes('linkedin.com') ? clean : `linkedin.com/in/${clean}`,
      url: sanitizePdfUrl(fullUrl),
    });
  }

  if (personalInfo.github?.trim()) {
    const raw = personalInfo.github.trim();
    const clean = raw.replace(/^https?:\/\/(www\.)?/i, '').replace(/\/$/, '');
    const fullUrl = raw.includes('github.com')
      ? raw
      : `https://github.com/${clean.replace(/^github\.com\//i, '')}`;
    items.push({
      kind: 'github',
      label: clean.includes('github.com') ? clean : `github.com/${clean}`,
      url: sanitizePdfUrl(fullUrl),
    });
  }

  if (personalInfo.website?.trim()) {
    const raw = personalInfo.website.trim();
    items.push({
      kind: 'website',
      label: raw.replace(/^https?:\/\//i, '').replace(/\/$/, ''),
      url: sanitizePdfUrl(raw),
    });
  }

  if (Array.isArray(personalInfo.customLinks)) {
    for (const link of personalInfo.customLinks) {
      if (link.label?.trim() || link.url?.trim()) {
        items.push({
          kind: 'custom',
          label:
            link.label?.trim() ||
            link.url.trim().replace(/^https?:\/\//i, '').replace(/\/$/, ''),
          url: link.url?.trim() ? sanitizePdfUrl(link.url.trim()) : null,
        });
      }
    }
  }

  return items;
}

export function getInternshipLearningItems(resume: Resume): LearningActivityItem[] {
  return (resume.learningActivities || []).filter(
    (item) =>
      Boolean(item.title?.trim()) ||
      Boolean(item.subject?.trim()) ||
      Boolean(item.provider?.trim()) ||
      Boolean(item.description?.trim())
  );
}

export function getInternshipCareerInterests(resume: Resume): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const tag of resume.careerInterests || []) {
    const trimmed = typeof tag === 'string' ? tag.trim() : '';
    if (trimmed && !seen.has(trimmed.toLowerCase())) {
      seen.add(trimmed.toLowerCase());
      out.push(trimmed);
    }
  }
  return out;
}

export interface InternshipEducationEntry {
  id: string;
  heading: string;
  institution: string;
  dateRange: string;
  location: string;
  subDetails: string[];
}

export function getInternshipEducationEntries(
  resume: Resume
): InternshipEducationEntry[] {
  const hidden = new Set(resume.hiddenSections || []);
  const entries: InternshipEducationEntry[] = [];

  for (const edu of resume.education || []) {
    const headingParts = [edu.degree?.trim(), edu.specialization?.trim()].filter(Boolean);
    const heading = headingParts.join(' — ') || edu.department?.trim() || 'Degree';
    const dateStr = edu.current
      ? `${edu.startDate || ''} – Present`.replace(/^\s*–\s*/, '')
      : [edu.startDate?.trim(), edu.endDate?.trim()].filter(Boolean).join(' – ');
    const subDetails: string[] = [];
    if (edu.board?.trim()) subDetails.push(edu.board.trim());
    if (edu.department?.trim() && headingParts.length > 0) subDetails.push(edu.department.trim());
    if (edu.grade?.trim()) {
      subDetails.push(
        `GPA / Score: ${edu.grade.trim()}${edu.gradingScale?.trim() ? ` / ${edu.gradingScale.trim()}` : ''}`
      );
    }
    const courseworkText = Array.isArray(edu.coursework)
      ? edu.coursework.map((c) => c.trim()).filter(Boolean).join(', ')
      : (edu.coursework || '').trim();
    if (courseworkText) subDetails.push(`Coursework: ${courseworkText}`);
    if (edu.thesisTitle?.trim()) subDetails.push(`Thesis: ${edu.thesisTitle.trim()}`);
    if (edu.honors?.trim()) subDetails.push(edu.honors.trim());
    else if (edu.achievements?.trim()) subDetails.push(edu.achievements.trim());
    if (edu.description?.trim()) subDetails.push(edu.description.trim());

    entries.push({
      id: edu.id,
      heading,
      institution: edu.institution?.trim() || '',
      dateRange: dateStr,
      location: edu.location?.trim() || '',
      subDetails,
    });
  }

  if (!hidden.has('high-school')) {
    for (const hs of resume.highSchool || []) {
      if (!hs.schoolName?.trim() && !hs.qualification?.trim()) continue;
      const subDetails: string[] = [];
      if (hs.board?.trim()) subDetails.push(hs.board.trim());
      if (hs.gpa?.trim()) subDetails.push(`Score / GPA: ${hs.gpa.trim()}`);
      if (hs.testScores?.trim()) subDetails.push(hs.testScores.trim());
      if (hs.honors?.trim()) subDetails.push(hs.honors.trim());

      entries.push({
        id: hs.id,
        heading: hs.qualification?.trim() || 'Secondary / High School Education',
        institution: hs.schoolName?.trim() || '',
        dateRange: hs.graduationDate?.trim() || '',
        location: hs.location?.trim() || '',
        subDetails,
      });
    }
  }

  return entries;
}

export interface InternshipResearchEntry {
  id: string;
  title: string;
  dateRange: string;
  bullets: string[];
  linkUrl: string | null;
  linkLabel: string | null;
}

export function getInternshipResearchAndProjectEntries(
  resume: Resume
): InternshipResearchEntry[] {
  const entries: InternshipResearchEntry[] = [];

  for (const res of resume.researchExperience || []) {
    if (!res.title?.trim() && !res.objectives?.trim() && !res.methodology?.trim()) {
      continue;
    }
    const dateRange = res.current
      ? [res.startDate?.trim(), 'Present'].filter(Boolean).join(' - ')
      : [res.startDate?.trim(), res.endDate?.trim()].filter(Boolean).join(' - ');
    const bullets: string[] = [];
    const contextParts = [res.role?.trim(), res.institution?.trim(), res.domain?.trim()].filter(Boolean);
    if (contextParts.length > 0) bullets.push(contextParts.join(' · '));
    if (res.objectives?.trim()) bullets.push(res.objectives.trim());
    if (res.methodology?.trim()) bullets.push(res.methodology.trim());
    if (res.findings?.trim()) bullets.push(res.findings.trim());
    if (res.outcomes?.trim()) bullets.push(res.outcomes.trim());
    if (res.technologies?.length) {
      bullets.push(`Tools & Technologies: ${res.technologies.map((t) => t.trim()).filter(Boolean).join(', ')}`);
    }
    if (res.publications?.trim()) bullets.push(`Recognition / Output: ${res.publications.trim()}`);

    entries.push({
      id: res.id,
      title: res.title?.trim() || 'Research Project',
      dateRange,
      bullets,
      linkUrl: null,
      linkLabel: null,
    });
  }

  for (const proj of resume.projects || []) {
    if (!proj.title?.trim() && !proj.description?.trim() && !cleanHighlights(proj.highlights).length) {
      continue;
    }
    const dateRange = proj.current
      ? [proj.startDate?.trim(), 'Present'].filter(Boolean).join(' - ')
      : [proj.startDate?.trim(), proj.endDate?.trim()].filter(Boolean).join(' - ');
    const bullets: string[] = [];
    if (proj.description?.trim()) bullets.push(proj.description.trim());
    if (proj.problemSolved?.trim()) bullets.push(proj.problemSolved.trim());
    if (proj.contribution?.trim()) bullets.push(proj.contribution.trim());
    cleanHighlights(proj.highlights).forEach((h) => bullets.push(h));
    (proj.achievements || []).map((a) => a.trim()).filter(Boolean).forEach((a) => bullets.push(a));
    const techList = [...(proj.technologies || []), ...(proj.frameworks || []), ...(proj.tools || [])]
      .map((t) => t.trim())
      .filter(Boolean);
    if (techList.length > 0) bullets.push(`Tools: ${Array.from(new Set(techList)).join(', ')}`);

    const rawUrl = proj.link?.trim() || proj.githubUrl?.trim() || '';
    const linkUrl = rawUrl ? sanitizePdfUrl(rawUrl) : null;

    entries.push({
      id: proj.id,
      title: proj.title?.trim() || 'Project',
      dateRange,
      bullets,
      linkUrl,
      linkLabel: rawUrl ? rawUrl.replace(/^https?:\/\//i, '').replace(/\/$/, '') : null,
    });
  }

  return entries;
}

export interface InternshipSkillRow {
  id: string;
  label: string;
  proficiency: SkillMatrixLevel | null;
}

export function getInternshipSkillRows(resume: Resume): InternshipSkillRow[] {
  const rows: InternshipSkillRow[] = [];

  for (const cat of getVisibleSkills(resume.skills)) {
    const items = (cat.skills || []).map((s) => s.trim()).filter(Boolean);
    const label =
      items.length > 0
        ? items.join(', ')
        : cat.category?.trim() || '';
    if (!label) continue;
    const validProficiency: SkillMatrixLevel | null =
      cat.proficiency && [1, 2, 3, 4, 5].includes(cat.proficiency)
        ? cat.proficiency
        : null;
    rows.push({
      id: cat.id,
      label,
      proficiency: validProficiency,
    });
  }

  for (const m of resume.skillMatrix || []) {
    const name = m.skill?.trim();
    if (!name) continue;
    const alreadyCovered = rows.some((r) =>
      r.label.toLowerCase().includes(name.toLowerCase())
    );
    if (alreadyCovered) continue;
    const validLevel: SkillMatrixLevel | null =
      m.level && [1, 2, 3, 4, 5].includes(m.level) ? m.level : null;
    rows.push({
      id: m.id,
      label: name,
      proficiency: validLevel,
    });
  }

  return rows;
}

export interface EngineeringContactItem {
  label: string;
  url: string | null;
}

export function buildEngineeringContactItems(
  personalInfo: PersonalInfo
): EngineeringContactItem[] {
  const items: EngineeringContactItem[] = [];
  const loc = [
    personalInfo.city?.trim(),
    personalInfo.state?.trim(),
    personalInfo.country?.trim(),
  ]
    .filter(Boolean)
    .join(', ') || personalInfo.location?.trim() || '';

  if (loc) {
    items.push({ label: loc, url: null });
  }
  if (personalInfo.phone?.trim()) {
    items.push({
      label: personalInfo.phone.trim(),
      url: `tel:${personalInfo.phone.replace(/[^+\d]/g, '')}`,
    });
  }
  if (personalInfo.email?.trim()) {
    items.push({
      label: personalInfo.email.trim(),
      url: `mailto:${personalInfo.email.trim()}`,
    });
  }
  if (personalInfo.linkedin?.trim()) {
    const raw = personalInfo.linkedin.trim();
    const clean = raw.replace(/^https?:\/\/(www\.)?/i, '').replace(/\/$/, '');
    const fullUrl = raw.includes('linkedin.com')
      ? raw
      : `https://linkedin.com/in/${clean.replace(/^linkedin\.com\/in\//i, '')}`;
    items.push({
      label: clean.includes('linkedin.com') ? clean : `linkedin.com/in/${clean}`,
      url: sanitizePdfUrl(fullUrl),
    });
  }
  if (personalInfo.github?.trim()) {
    const raw = personalInfo.github.trim();
    const clean = raw.replace(/^https?:\/\/(www\.)?/i, '').replace(/\/$/, '');
    const fullUrl = raw.includes('github.com')
      ? raw
      : `https://github.com/${clean.replace(/^github\.com\//i, '')}`;
    items.push({
      label: clean.includes('github.com') ? clean : `github.com/${clean}`,
      url: sanitizePdfUrl(fullUrl),
    });
  }
  if (personalInfo.website?.trim()) {
    const raw = personalInfo.website.trim();
    items.push({
      label: raw.replace(/^https?:\/\//i, '').replace(/\/$/, ''),
      url: sanitizePdfUrl(raw),
    });
  }
  if (Array.isArray(personalInfo.customLinks)) {
    for (const link of personalInfo.customLinks) {
      if (link.label?.trim() || link.url?.trim()) {
        items.push({
          label:
            link.label?.trim() ||
            link.url.trim().replace(/^https?:\/\//i, '').replace(/\/$/, ''),
          url: link.url?.trim() ? sanitizePdfUrl(link.url.trim()) : null,
        });
      }
    }
  }
  return items;
}

export interface EngineeringSkillInterestRow {
  key: string;
  label: string;
  text: string;
}

export function getEngineeringSkillAndInterestRows(
  resume: Resume
): EngineeringSkillInterestRow[] {
  const rows: EngineeringSkillInterestRow[] = [];
  for (const cat of getVisibleSkills(resume.skills)) {
    const items = (cat.skills || []).map((s) => s.trim()).filter(Boolean);
    if (items.length === 0) continue;
    rows.push({
      key: `sk-${cat.id}`,
      label: cat.category?.trim() || 'Technical Skills',
      text: items.join(', '),
    });
  }
  const hidden = new Set(resume.hiddenSections || []);
  if (!hidden.has('interests')) {
    const eff = getEffectiveInterests(resume);
    if (eff.text.trim()) {
      rows.push({
        key: 'interests',
        label: 'Interests',
        text: eff.text.trim(),
      });
    }
  }
  return rows;
}

export interface EngineeringInternshipTrainingEntry {
  id: string;
  kindLabel: string; // e.g. 'Internship' | 'Industrial Training' | 'Workshop' | 'Industrial Visit'
  title: string;
  organization: string;
  location: string;
  dateRange: string;
  technologies: string[];
  description: string;
  bullets: string[];
  linkUrl: string | null;
}

export function getEngineeringInternshipAndTrainingEntries(
  resume: Resume
): EngineeringInternshipTrainingEntry[] {
  const entries: EngineeringInternshipTrainingEntry[] = [];
  const seenKeys = new Set<string>();

  for (const exp of resume.experience || []) {
    const hasContent =
      Boolean(exp.company?.trim()) ||
      Boolean(exp.position?.trim()) ||
      Boolean(exp.description?.trim()) ||
      cleanHighlights(exp.highlights).length > 0;
    if (!hasContent) continue;

    const kindMap: Record<string, string> = {
      internship: 'Internship',
      training: 'Industrial Training',
      workshop: 'Workshop',
      industrial_visit: 'Industrial Visit',
      employment: exp.employmentType?.trim() || 'Experience',
    };
    const kindLabel = exp.entryKind
      ? kindMap[exp.entryKind] || 'Internship'
      : exp.employmentType?.trim() || 'Internship';

    const dateRange = exp.current
      ? [exp.startDate?.trim(), 'Present'].filter(Boolean).join(' – ')
      : [exp.startDate?.trim(), exp.endDate?.trim()].filter(Boolean).join(' – ');

    const bullets = cleanHighlights(exp.highlights);
    if (exp.results?.trim()) {
      bullets.push(`Outcome: ${exp.results.trim()}`);
    }
    const dedupeKey = `${(exp.position || '').trim().toLowerCase()}|${(exp.company || '').trim().toLowerCase()}`;
    seenKeys.add(dedupeKey);

    entries.push({
      id: exp.id,
      kindLabel,
      title: exp.position?.trim() || kindLabel,
      organization: exp.company?.trim() || '',
      location: exp.location?.trim() || '',
      dateRange,
      technologies: (exp.technologies || []).map((t) => t.trim()).filter(Boolean),
      description: exp.description?.trim() || '',
      bullets,
      linkUrl: null,
    });
  }

  for (const item of resume.learningActivities || []) {
    const hasContent =
      Boolean(item.title?.trim()) ||
      Boolean(item.provider?.trim()) ||
      Boolean(item.description?.trim());
    if (!hasContent) continue;

    const title = item.title?.trim() || item.subject?.trim() || 'Technical Training';
    const provider = item.provider?.trim() || '';
    const dedupeKey = `${title.toLowerCase()}|${provider.toLowerCase()}`;
    if (seenKeys.has(dedupeKey)) continue;
    seenKeys.add(dedupeKey);

    const bullets: string[] = [];
    if (item.instructor?.trim()) bullets.push(`Instructor: ${item.instructor.trim()}`);
    if (item.certificateId?.trim()) bullets.push(`Credential ID: ${item.certificateId.trim()}`);

    entries.push({
      id: `learn-${item.id}`,
      kindLabel: item.activityType || 'Technical Training',
      title,
      organization: provider,
      location: '',
      dateRange: item.completionDate?.trim() || '',
      technologies: (item.skillsAcquired || []).map((s) => s.trim()).filter(Boolean),
      description: item.description?.trim() || '',
      bullets,
      linkUrl: item.credentialUrl?.trim() ? sanitizePdfUrl(item.credentialUrl.trim()) : null,
    });
  }

  return entries;
}

export function getEngineeringProjectBullets(proj: ProjectItem): string[] {
  const bullets: string[] = [];
  if (proj.objective?.trim()) {
    bullets.push(`Objective: ${proj.objective.trim()}`);
  }
  if (proj.description?.trim()) {
    bullets.push(proj.description.trim());
  }
  if (proj.problemSolved?.trim()) {
    bullets.push(`Problem Statement: ${proj.problemSolved.trim()}`);
  }
  if (proj.methodology?.trim()) {
    bullets.push(`Methodology: ${proj.methodology.trim()}`);
  }
  if (proj.designApproach?.trim()) {
    bullets.push(`Design Approach: ${proj.designApproach.trim()}`);
  }
  if (proj.componentsMaterials && proj.componentsMaterials.length > 0) {
    const items = proj.componentsMaterials.map((c) => c.trim()).filter(Boolean);
    if (items.length > 0) bullets.push(`Components & Materials: ${items.join(', ')}`);
  }
  if (proj.contribution?.trim()) {
    bullets.push(`Individual Contribution: ${proj.contribution.trim()}`);
  }
  if (proj.testingValidation?.trim()) {
    bullets.push(`Testing & Validation: ${proj.testingValidation.trim()}`);
  }
  if (proj.results?.trim()) {
    bullets.push(`Results & Outcomes: ${proj.results.trim()}`);
  }
  if (proj.technicalChallenges?.trim()) {
    bullets.push(`Challenges Solved: ${proj.technicalChallenges.trim()}`);
  }
  for (const h of cleanHighlights(proj.highlights)) {
    if (!bullets.some((b) => b.toLowerCase() === h.toLowerCase())) {
      bullets.push(h);
    }
  }
  for (const a of (proj.achievements || []).map((x) => x.trim()).filter(Boolean)) {
    if (!bullets.some((b) => b.toLowerCase() === a.toLowerCase())) {
      bullets.push(a);
    }
  }
  return bullets;
}

export interface EngineeringExtracurricularItem {
  id: string;
  title: string;
  subtitle: string;
  date: string;
  detail: string;
  url: string | null;
}

export function getEngineeringExtracurricularEntries(
  resume: Resume
): EngineeringExtracurricularItem[] {
  const out: EngineeringExtracurricularItem[] = [];
  const seen = new Set<string>();

  for (const ach of resume.achievements || []) {
    if (!ach.title?.trim() && !ach.description?.trim()) continue;
    const key = `${(ach.title || '').trim().toLowerCase()}|${(ach.issuer || '').trim().toLowerCase()}`;
    if (seen.has(key)) continue;
    seen.add(key);

    const sub = [
      ach.participationType?.trim(),
      ach.rank?.trim(),
      ach.role?.trim(),
      ach.issuer?.trim(),
    ]
      .filter(Boolean)
      .join(' · ');

    const detailParts = [
      ach.description?.trim(),
      ach.responsibilities?.trim(),
      ach.outcome?.trim(),
      ach.achievementDetails?.trim(),
    ].filter(Boolean);

    out.push({
      id: `ach-${ach.id}`,
      title: ach.title?.trim() || 'Achievement',
      subtitle: sub,
      date: ach.date?.trim() || '',
      detail: detailParts.join(' — '),
      url: ach.url?.trim() ? sanitizePdfUrl(ach.url.trim()) : null,
    });
  }

  for (const vol of resume.volunteer || []) {
    if (!vol.role?.trim() && !vol.organization?.trim()) continue;
    const key = `${(vol.role || '').trim().toLowerCase()}|${(vol.organization || '').trim().toLowerCase()}`;
    if (seen.has(key)) continue;
    seen.add(key);
    const dateRange = vol.current
      ? [vol.startDate?.trim(), 'Present'].filter(Boolean).join(' – ')
      : [vol.startDate?.trim(), vol.endDate?.trim()].filter(Boolean).join(' – ');
    out.push({
      id: `vol-${vol.id}`,
      title: vol.role?.trim() || 'Volunteer',
      subtitle: [vol.organization?.trim(), vol.location?.trim()].filter(Boolean).join(', '),
      date: dateRange,
      detail: cleanHighlights(vol.highlights).join(' • '),
      url: null,
    });
  }

  for (const cert of resume.certifications || []) {
    if (!cert.name?.trim()) continue;
    const key = `${cert.name.trim().toLowerCase()}|${(cert.issuer || '').trim().toLowerCase()}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({
      id: `cert-${cert.id}`,
      title: cert.name.trim(),
      subtitle: cert.issuer?.trim() ? `Certification · ${cert.issuer.trim()}` : 'Certification',
      date: cert.issueDate?.trim() || '',
      detail: cert.skillsCovered?.length ? `Skills: ${cert.skillsCovered.join(', ')}` : '',
      url: cert.link?.trim() ? sanitizePdfUrl(cert.link.trim()) : null,
    });
  }

  return out;
}

export function splitCreativeName(fullName?: string): {
  firstPart: string;
  lastPart: string;
} {
  const clean = (fullName || '').trim().replace(/\s+/g, ' ');
  if (!clean) return { firstPart: '', lastPart: '' };
  const parts = clean.split(' ');
  if (parts.length === 1) return { firstPart: '', lastPart: parts[0] };
  return {
    firstPart: parts.slice(0, -1).join(' '),
    lastPart: parts[parts.length - 1],
  };
}

export type CreativeContactKind =
  | 'location'
  | 'phone'
  | 'email'
  | 'website'
  | 'linkedin'
  | 'github'
  | 'custom';

export interface CreativeContactItem {
  kind: CreativeContactKind;
  label: string;
  url: string | null;
}

export function buildCreativeContactItems(
  personalInfo: PersonalInfo
): CreativeContactItem[] {
  const items: CreativeContactItem[] = [];
  const loc =
    [
      personalInfo.city?.trim(),
      personalInfo.state?.trim(),
      personalInfo.country?.trim(),
    ]
      .filter(Boolean)
      .join(', ') ||
    personalInfo.location?.trim() ||
    personalInfo.streetAddress?.trim() ||
    '';
  if (loc) {
    items.push({ kind: 'location', label: loc, url: null });
  }
  if (personalInfo.phone?.trim()) {
    items.push({
      kind: 'phone',
      label: personalInfo.phone.trim(),
      url: `tel:${personalInfo.phone.replace(/[^+\d]/g, '')}`,
    });
  }
  if (personalInfo.email?.trim()) {
    items.push({
      kind: 'email',
      label: personalInfo.email.trim(),
      url: `mailto:${personalInfo.email.trim()}`,
    });
  }
  if (personalInfo.website?.trim()) {
    const raw = personalInfo.website.trim();
    items.push({
      kind: 'website',
      label: raw.replace(/^https?:\/\//i, '').replace(/\/$/, ''),
      url: sanitizePdfUrl(raw),
    });
  }
  if (personalInfo.linkedin?.trim()) {
    const raw = personalInfo.linkedin.trim();
    const clean = raw.replace(/^https?:\/\/(www\.)?/i, '').replace(/\/$/, '');
    const fullUrl = raw.includes('linkedin.com')
      ? raw
      : `https://linkedin.com/in/${clean.replace(/^linkedin\.com\/in\//i, '')}`;
    items.push({
      kind: 'linkedin',
      label: clean.includes('linkedin.com') ? clean : `linkedin.com/in/${clean}`,
      url: sanitizePdfUrl(fullUrl),
    });
  }
  if (personalInfo.github?.trim()) {
    const raw = personalInfo.github.trim();
    const clean = raw.replace(/^https?:\/\/(www\.)?/i, '').replace(/\/$/, '');
    const fullUrl = raw.includes('github.com')
      ? raw
      : `https://github.com/${clean.replace(/^github\.com\//i, '')}`;
    items.push({
      kind: 'github',
      label: clean.includes('github.com') ? clean : `github.com/${clean}`,
      url: sanitizePdfUrl(fullUrl),
    });
  }
  if (Array.isArray(personalInfo.customLinks)) {
    for (const link of personalInfo.customLinks) {
      if (link.label?.trim() || link.url?.trim()) {
        items.push({
          kind: 'custom',
          label:
            link.label?.trim() ||
            link.url.trim().replace(/^https?:\/\//i, '').replace(/\/$/, ''),
          url: link.url?.trim() ? sanitizePdfUrl(link.url.trim()) : null,
        });
      }
    }
  }
  return items;
}

export function getCreativeProficiencyHeading(resume: Resume): string {
  if (resume.proficiencyHeadingOverride?.trim()) {
    return resume.proficiencyHeadingOverride.trim().toUpperCase();
  }
  switch (resume.creativeProfession) {
    case 'developer':
      return 'PROGRAMMING PROFICIENCY';
    case 'cybersecurity':
      return 'SECURITY TOOLS';
    case 'designer':
      return 'CREATIVE TOOLS';
    case 'marketing':
      return 'MARKETING PLATFORMS';
    case 'researcher':
      return 'RESEARCH & ANALYSIS';
    case 'engineer':
      return 'ENGINEERING SOFTWARE';
    default: {
      const corpus = [
        resume.personalInfo?.jobTitle,
        resume.personalInfo?.specialization,
        resume.customCreativeProfession,
        ...(resume.circularProficiencies || []).map((c) => c.name),
        ...(resume.creativeSkillItems || []).map((c) => c.name),
        ...(resume.skills || []).flatMap((s) => s.skills || []),
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      if (/(figma|illustrator|photoshop|ux|ui\/ux|typography|brand|adobe|motion)/i.test(corpus)) {
        return 'CREATIVE TOOLS';
      }
      if (/(cyber|pentest|siem|soc|owasp|zero-trust|security|wireshark|nmap)/i.test(corpus)) {
        return 'SECURITY TOOLS';
      }
      if (/(marketing|seo|hubspot|growth|campaign|funnel|analytics)/i.test(corpus)) {
        return 'MARKETING PLATFORMS';
      }
      if (/(research|spss|stata|r studio|empirical|qualitative|quantitative)/i.test(corpus)) {
        return 'RESEARCH & ANALYSIS';
      }
      if (/(solidworks|autocad|ansys|catia|matlab|simulink|cad)/i.test(corpus)) {
        return 'ENGINEERING SOFTWARE';
      }
      if (/(typescript|javascript|python|react|java|golang|kubernetes|docker|node)/i.test(corpus)) {
        return 'PROGRAMMING PROFICIENCY';
      }
      return 'PROFESSIONAL EXPERTISE';
    }
  }
}

export interface CreativeSkillCategoryGroup {
  category: string;
  items: CreativeSkillDetailItem[];
}

export function getCreativeCategorizedSkills(
  resume: Resume
): CreativeSkillCategoryGroup[] {
  const groups: CreativeSkillCategoryGroup[] = [];
  const byCat = new Map<string, CreativeSkillDetailItem[]>();

  const explicit = (resume.creativeSkillItems || []).filter(
    (item) => item.name?.trim() || item.description?.trim()
  );

  if (explicit.length > 0) {
    for (const item of explicit) {
      const cat = item.category?.trim() || 'Technical';
      const arr = byCat.get(cat) || [];
      arr.push(item);
      byCat.set(cat, arr);
    }
    byCat.forEach((items, category) => groups.push({ category, items }));
    return groups;
  }

  for (const cat of getVisibleSkills(resume.skills)) {
    const clean = (cat.skills || []).map((s) => s.trim()).filter(Boolean);
    if (clean.length === 0) continue;
    const catName = cat.category?.trim() || 'Technical';
    const arr = byCat.get(catName) || [];
    arr.push({
      id: `mapped-${cat.id}`,
      category: catName,
      name: clean.join(', '),
      description: '',
      organization: '',
    });
    byCat.set(catName, arr);
  }
  byCat.forEach((items, category) => groups.push({ category, items }));
  return groups;
}

function deriveShortSkillLabel(name: string): string {
  const clean = name.trim();
  if (!clean) return 'SK';
  const upperWords = clean
    .replace(/[^a-zA-Z0-9+#.\s]/g, ' ')
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (upperWords.length === 1) {
    return upperWords[0].slice(0, 3).toUpperCase();
  }
  return upperWords
    .slice(0, 3)
    .map((w) => w[0]?.toUpperCase() || '')
    .join('');
}

export function getCreativeCircularProficiencies(
  resume: Resume
): CreativeCircularProficiencyItem[] {
  const explicit = (resume.circularProficiencies || [])
    .filter((c) => c.name?.trim() || c.shortLabel?.trim())
    .map((c) => ({
      ...c,
      shortLabel: (c.shortLabel?.trim() || deriveShortSkillLabel(c.name)).slice(0, 5),
      percentage: Math.max(0, Math.min(100, Number(c.percentage) || 0)),
    }));
  if (explicit.length > 0) return explicit;

  // Fallback mapping only for explicitly rated skillMatrix rows (never fabricate for unrated skills)
  return (resume.skillMatrix || [])
    .filter((m) => m.skill?.trim() && m.level !== null && m.level !== undefined)
    .slice(0, 6)
    .map((m) => ({
      id: `circ-mat-${m.id}`,
      name: m.skill.trim(),
      shortLabel: deriveShortSkillLabel(m.skill),
      description: m.comment?.trim() || m.category?.trim() || '',
      percentage: Math.max(20, Math.min(100, Number(m.level) * 20)),
    }));
}

export function getCreativeHorizontalSkillBars(
  resume: Resume
): CreativeSkillBarItem[] {
  const explicit = (resume.creativeSkillBars || [])
    .filter((b) => b.name?.trim())
    .map((b) => ({
      ...b,
      percentage: Math.max(0, Math.min(100, Number(b.percentage) || 0)),
    }));
  if (explicit.length > 0) return explicit;

  return (resume.skillMatrix || [])
    .filter((m) => m.skill?.trim() && m.level !== null && m.level !== undefined)
    .map((m) => ({
      id: `bar-mat-${m.id}`,
      name: m.skill.trim(),
      percentage: Math.max(20, Math.min(100, Number(m.level) * 20)),
    }));
}

export function getCreativeCommunicationSkills(
  resume: Resume
): CreativeCommunicationSkillItem[] {
  return (resume.communicationSkills || []).filter(
    (c) => Boolean(c.skill?.trim()) || Boolean(c.proficiency?.trim()) || Boolean(c.context?.trim())
  );
}

export interface CreativeCertificateGrantItem {
  id: string;
  date: string;
  title: string;
  issuer: string;
  description: string;
  url: string | null;
}

export function getCreativeCertificatesAndGrants(
  resume: Resume
): CreativeCertificateGrantItem[] {
  const out: CreativeCertificateGrantItem[] = [];
  const seen = new Set<string>();

  for (const cert of resume.certifications || []) {
    if (!cert.name?.trim() && !cert.issuer?.trim()) continue;
    const key = `${(cert.name || '').trim().toLowerCase()}|${(cert.issuer || '').trim().toLowerCase()}`;
    if (seen.has(key)) continue;
    seen.add(key);
    const details = [
      cert.credentialId?.trim() ? `ID: ${cert.credentialId.trim()}` : '',
      cert.skillsCovered?.length ? cert.skillsCovered.filter(Boolean).join(', ') : '',
    ]
      .filter(Boolean)
      .join(' · ');
    out.push({
      id: `cert-${cert.id}`,
      date: cert.issueDate?.trim() || '',
      title: cert.name?.trim() || 'Certificate',
      issuer: cert.issuer?.trim() || '',
      description: details,
      url: cert.link?.trim() ? sanitizePdfUrl(cert.link.trim()) : null,
    });
  }

  for (const ach of resume.achievements || []) {
    if (!ach.title?.trim() && !ach.description?.trim()) continue;
    const key = `${(ach.title || '').trim().toLowerCase()}|${(ach.issuer || '').trim().toLowerCase()}`;
    if (seen.has(key)) continue;
    seen.add(key);
    const details = [
      ach.rank?.trim(),
      ach.description?.trim(),
      ach.achievementDetails?.trim(),
    ]
      .filter(Boolean)
      .join(' — ');
    out.push({
      id: `grant-${ach.id}`,
      date: ach.date?.trim() || '',
      title: ach.title?.trim() || 'Grant / Award',
      issuer: ach.issuer?.trim() || ach.participationType?.trim() || '',
      description: details,
      url: ach.url?.trim() ? sanitizePdfUrl(ach.url.trim()) : null,
    });
  }

  return out;
}

export function getCreativeTalksAndPublications(
  resume: Resume
): PublicationItem[] {
  return (resume.publications || []).filter(
    (p) => Boolean(p.title?.trim()) || Boolean(p.journalOrConference?.trim())
  );
}

export function isSectionVisibleAndPopulated(
  resume: Resume,
  sectionKey: ResumeSectionKey,
  templateId?: string
): boolean {
  const effectiveTplId = templateId || resume.template;
  const hidden = new Set(resume.hiddenSections || []);
  if (
    hidden.has(sectionKey) &&
    !(effectiveTplId === 'harvard-style' && sectionKey === 'skills')
  ) {
    return false;
  }

  switch (sectionKey) {
    case 'objective':
      return Boolean(
        (resume.objective && resume.objective.trim().length > 0) ||
          (effectiveTplId === 'elegant-serif' &&
            (resume.academicInterests?.trim() || resume.careerGoals?.trim()))
      );
    case 'philosophy':
      return Boolean(resume.personalQuote && resume.personalQuote.trim().length > 0);
    case 'daily-life': {
      if (resume.showDailyActivityChart === false) return false;
      const validation = validateDailyActivities(resume.dailyActivities);
      return validation.valid && validation.validItems.length > 0;
    }
    case 'strengths':
      return Boolean(
        resume.strengths &&
          resume.strengths.some((s) => typeof s === 'string' && s.trim().length > 0)
      );
    case 'education': {
      if (effectiveTplId === 'harvard-style') {
        const hasUniv = Boolean(resume.education && resume.education.length > 0);
        const hasAbroad =
          !hidden.has('study-abroad') &&
          Boolean(
            resume.studyAbroad &&
              resume.studyAbroad.some((s) => s.institution?.trim() || s.coursework?.trim())
          );
        const hasHs =
          !hidden.has('high-school') &&
          Boolean(resume.highSchool && resume.highSchool.some((h) => h.schoolName?.trim()));
        return hasUniv || hasAbroad || hasHs;
      }
      if (
        effectiveTplId === 'internship-resume' ||
        effectiveTplId === 'engineering-resume' ||
        effectiveTplId === 'creative-professional'
      ) {
        return getInternshipEducationEntries(resume).length > 0;
      }
      return Boolean(resume.education && resume.education.length > 0);
    }
    case 'thesis':
      return Boolean(
        resume.thesis &&
          (resume.thesis.title?.trim() ||
            resume.thesis.supervisors?.trim() ||
            resume.thesis.description?.trim())
      );
    case 'coursework':
      return getCourseworkItems(resume).length > 0;
    case 'experience':
      if (effectiveTplId === 'engineering-resume') {
        return getEngineeringInternshipAndTrainingEntries(resume).length > 0;
      }
      return Boolean(resume.experience && resume.experience.length > 0);
    case 'research':
      if (effectiveTplId === 'internship-resume') {
        return getInternshipResearchAndProjectEntries(resume).length > 0;
      }
      return Boolean(
        resume.researchExperience &&
          resume.researchExperience.some(
            (r) =>
              r.title?.trim() ||
              r.institution?.trim() ||
              r.objectives?.trim() ||
              r.findings?.trim()
          )
      );
    case 'publications':
      if (effectiveTplId === 'creative-professional') {
        return getCreativeTalksAndPublications(resume).length > 0;
      }
      return Boolean(resume.publications && resume.publications.length > 0);
    case 'projects':
      return Boolean(resume.projects && resume.projects.length > 0);
    case 'languages':
      return Boolean(
        resume.languages &&
          resume.languages.some((l) => l.language?.trim().length > 0)
      );
    case 'skills':
      if (effectiveTplId === 'harvard-style') {
        return getHarvardSkillsAndInterests(resume).rows.length > 0;
      }
      if (effectiveTplId === 'internship-resume') {
        return getInternshipSkillRows(resume).length > 0;
      }
      if (effectiveTplId === 'engineering-resume') {
        return getEngineeringSkillAndInterestRows(resume).length > 0;
      }
      if (effectiveTplId === 'creative-professional') {
        return getCreativeCategorizedSkills(resume).length > 0;
      }
      return getVisibleSkills(resume.skills).length > 0;
    case 'proficiency-circles':
      return getCreativeCircularProficiencies(resume).length > 0;
    case 'skill-bars':
      return getCreativeHorizontalSkillBars(resume).length > 0;
    case 'communication':
      return getCreativeCommunicationSkills(resume).length > 0;
    case 'skill-matrix':
      return Boolean(
        resume.skillMatrix &&
          resume.skillMatrix.some((m) => m.skill?.trim().length > 0)
      );
    case 'learning':
      return getInternshipLearningItems(resume).length > 0;
    case 'interests': {
      const eff = getEffectiveInterests(resume);
      return eff.items.length > 0 || eff.text.length > 0;
    }
    case 'career-interests':
      return (
        getInternshipCareerInterests(resume).length > 0 ||
        Boolean(resume.internshipPreferences?.targetRole?.trim()) ||
        Boolean(resume.internshipPreferences?.preferredIndustry?.trim())
      );
    case 'custom-sections':
      if (effectiveTplId === 'engineering-resume') {
        const hasCustom = Boolean(
          resume.customSections &&
            resume.customSections.some(
              (cs) =>
                cs.title?.trim().length > 0 &&
                cs.bullets?.some((b) => b.trim().length > 0)
            )
        );
        const hasLang = Boolean(
          resume.languages && resume.languages.some((l) => l.language?.trim().length > 0)
        );
        return hasCustom || hasLang;
      }
      return Boolean(
        resume.customSections &&
          resume.customSections.some(
            (cs) =>
              cs.title?.trim().length > 0 &&
              cs.bullets?.some((b) => b.trim().length > 0)
          )
      );
    case 'achievements':
      if (effectiveTplId === 'engineering-resume') {
        return getEngineeringExtracurricularEntries(resume).length > 0;
      }
      return Boolean(resume.achievements && resume.achievements.length > 0);
    case 'leadership':
      return Boolean(resume.leadership && resume.leadership.length > 0);
    case 'volunteer':
      return Boolean(resume.volunteer && resume.volunteer.length > 0);
    case 'memberships':
      return Boolean(resume.memberships && resume.memberships.length > 0);
    case 'certifications':
      if (effectiveTplId === 'creative-professional') {
        return getCreativeCertificatesAndGrants(resume).length > 0;
      }
      return Boolean(resume.certifications && resume.certifications.length > 0);
    case 'additional': {
      if (effectiveTplId === 'harvard-style') {
        return getHarvardAdditionalSubsections(resume).length > 0;
      }
      if (effectiveTplId === 'software-developer') {
        return getSoftwareDevAdditionalSubsections(resume).length > 0;
      }
      if (effectiveTplId === 'fresher-resume') {
        const eff = getEffectiveInterests(resume);
        return eff.items.length > 0 || eff.text.length > 0;
      }
      const hasLang = Boolean(resume.languages && resume.languages.length > 0);
      const eff = getEffectiveInterests(resume);
      return hasLang || eff.items.length > 0 || eff.text.length > 0;
    }
    case 'references':
      if (resume.referencesDisplayMode === 'hidden') return false;
      if (resume.referencesDisplayMode === 'on-request') return true;
      return Boolean(resume.references && resume.references.length > 0);
    default:
      return false;
  }
}

export function getOrderedVisibleSections(
  resume: Resume,
  template: TemplateDefinition
): ResumeSectionKey[] {
  let order = [...template.sectionOrder];
  if (
    (template.id === 'elegant-serif' ||
      template.id === 'modern-corporate' ||
      template.id === 'fresher-resume' ||
      template.id === 'internship-resume' ||
      template.id === 'engineering-resume' ||
      template.id === 'creative-professional') &&
    Array.isArray(resume.sectionOrderOverride) &&
    resume.sectionOrderOverride.length > 0
  ) {
    const validSet = new Set(template.sectionOrder);
    const customOrder = resume.sectionOrderOverride.filter((k): k is ResumeSectionKey =>
      validSet.has(k as ResumeSectionKey)
    );
    const missing = template.sectionOrder.filter((k) => !customOrder.includes(k));
    order = [...customOrder, ...missing];
  } else if (template.id === 'harvard-style' && resume.harvardLeadershipFirst) {
    const expIdx = order.indexOf('experience');
    const leadIdx = order.indexOf('leadership');
    if (expIdx !== -1 && leadIdx !== -1 && expIdx < leadIdx) {
      order[expIdx] = 'leadership';
      order[leadIdx] = 'experience';
    }
  }
  return order.filter((key) =>
    isSectionVisibleAndPopulated(resume, key, template.id)
  );
}

export function getSectionDisplayTitle(
  key: ResumeSectionKey,
  templateId: string
): string {
  if (templateId === 'jakes-resume') {
    switch (key) {
      case 'education':
        return 'Education';
      case 'coursework':
        return 'Relevant Coursework';
      case 'experience':
        return 'Experience';
      case 'projects':
        return 'Projects';
      case 'skills':
        return 'Technical Skills';
      case 'leadership':
        return 'Leadership / Extracurricular';
      default:
        break;
    }
  }

  if (templateId === 'two-column-professional') {
    switch (key) {
      case 'experience':
        return 'EXPERIENCE';
      case 'projects':
        return 'PROJECTS';
      case 'daily-life':
        return 'A DAY OF MY LIFE';
      case 'publications':
        return 'PUBLICATIONS';
      case 'philosophy':
        return 'MY LIFE PHILOSOPHY';
      case 'achievements':
        return 'MOST PROUD OF';
      case 'strengths':
        return 'STRENGTHS';
      case 'languages':
        return 'LANGUAGES';
      case 'education':
        return 'EDUCATION';
      case 'references':
        return 'REFEREES';
      case 'custom-sections':
        return 'ADDITIONAL INFORMATION';
      default:
        break;
    }
  }

  if (templateId === 'harvard-style') {
    switch (key) {
      case 'education':
        return 'Education';
      case 'experience':
        return 'Experience';
      case 'leadership':
        return 'Leadership & Activities';
      case 'skills':
        return 'Skills & Interests';
      case 'additional':
        return 'Additional Information';
      default:
        break;
    }
  }

  if (templateId === 'elegant-serif') {
    switch (key) {
      case 'objective':
        return 'Professional Profile';
      case 'education':
        return 'Education';
      case 'experience':
        return 'Experience';
      case 'research':
        return 'Research Experience';
      case 'projects':
        return 'Projects';
      case 'publications':
        return 'Publications';
      case 'achievements':
        return 'Awards & Honors';
      case 'skills':
        return 'Skills';
      case 'languages':
        return 'Languages';
      case 'certifications':
        return 'Certifications';
      case 'leadership':
        return 'Leadership & Activities';
      case 'memberships':
        return 'Professional Memberships';
      case 'interests':
        return 'Interests';
      case 'references':
        return 'References';
      case 'custom-sections':
        return 'Additional Information';
      default:
        break;
    }
  }

  if (templateId === 'modern-corporate') {
    switch (key) {
      case 'objective':
        return 'Professional Summary';
      case 'experience':
        return 'Work Experience';
      case 'strengths':
        return 'Core Competencies';
      case 'education':
        return 'Education';
      case 'skills':
        return 'Technical Skills';
      case 'projects':
        return 'Projects';
      case 'certifications':
        return 'Certifications';
      case 'achievements':
        return 'Awards & Achievements';
      case 'languages':
        return 'Languages';
      case 'leadership':
        return 'Leadership & Activities';
      case 'memberships':
        return 'Professional Memberships';
      case 'interests':
        return 'Interests';
      case 'references':
        return 'References';
      case 'custom-sections':
        return 'Additional Information';
      default:
        break;
    }
  }

  if (templateId === 'fresher-resume') {
    switch (key) {
      case 'education':
        return 'EDUCATION';
      case 'projects':
        return 'PROJECTS';
      case 'experience':
        return 'EXPERIENCE';
      case 'coursework':
        return 'RELEVANT COURSEWORK';
      case 'skills':
        return 'SKILLS';
      case 'publications':
        return 'PUBLICATIONS';
      case 'achievements':
        return 'AWARDS & HONORS';
      case 'certifications':
        return 'CERTIFICATIONS';
      case 'leadership':
        return 'LEADERSHIP & ACTIVITIES';
      case 'volunteer':
        return 'VOLUNTEER EXPERIENCE';
      case 'languages':
        return 'LANGUAGES';
      case 'additional':
        return 'ADDITIONAL INFORMATION';
      case 'custom-sections':
        return 'CUSTOM SECTIONS';
      default:
        break;
    }
  }

  if (templateId === 'internship-resume') {
    switch (key) {
      case 'education':
        return 'EDUCATION';
      case 'achievements':
        return 'CO-CURRICULAR/ EVENTS';
      case 'skills':
        return 'SKILLS';
      case 'learning':
        return 'LEARNING';
      case 'interests':
        return 'INTERESTS';
      case 'research':
        return 'RESEARCH WORK';
      case 'career-interests':
        return 'CAREER INTERESTS';
      case 'experience':
        return 'INTERNSHIP EXPERIENCE';
      case 'certifications':
        return 'CERTIFICATIONS';
      case 'languages':
        return 'LANGUAGES';
      case 'custom-sections':
        return 'ADDITIONAL INFORMATION';
      default:
        break;
    }
  }

  if (templateId === 'engineering-resume') {
    switch (key) {
      case 'objective':
        return 'OBJECTIVE';
      case 'education':
        return 'EDUCATION';
      case 'skills':
        return 'SKILLS AND INTERESTS';
      case 'projects':
        return 'PROJECTS';
      case 'experience':
        return 'INTERNSHIP / TRAININGS';
      case 'leadership':
        return 'POSITION OF RESPONSIBILITY';
      case 'achievements':
        return 'EXTRA-CURRICULAR ACTIVITIES';
      case 'custom-sections':
        return 'ADDITIONAL INFORMATION';
      default:
        break;
    }
  }

  if (templateId === 'creative-professional') {
    switch (key) {
      case 'experience':
        return 'SHORT RESUME';
      case 'skills':
        return 'SKILLS';
      case 'proficiency-circles':
        return 'PROGRAMMING PROFICIENCY';
      case 'communication':
        return 'COMMUNICATION SKILLS';
      case 'projects':
        return 'PROJECTS & CREATIVE WORK';
      case 'leadership':
        return 'LEADERSHIP & ACTIVITIES';
      case 'education':
        return 'DEGREES';
      case 'skill-bars':
        return 'SKILLS & PROFICIENCY';
      case 'certifications':
        return 'CERTIFICATES & GRANTS';
      case 'languages':
        return 'LANGUAGES';
      case 'publications':
        return 'TALKS & PUBLICATIONS';
      case 'volunteer':
        return 'VOLUNTEER & COMMUNITY';
      case 'memberships':
        return 'MEMBERSHIPS';
      case 'custom-sections':
        return 'ADDITIONAL INFORMATION';
      default:
        break;
    }
  }

  switch (key) {
    case 'objective':
      if (templateId === 'executive-resume') return 'EXECUTIVE SUMMARY';
      if (
        templateId === 'classic-professional' ||
        templateId === 'modern-corporate' ||
        templateId === 'modern-minimalist' ||
        templateId === 'two-column-professional' ||
        templateId === 'creative-professional'
      ) {
        return 'PROFESSIONAL SUMMARY';
      }
      if (templateId === 'research-scholar') return 'RESEARCH PROFILE';
      return 'OBJECTIVE';
    case 'education':
      return 'EDUCATION';
    case 'thesis':
      return "MASTER'S THESIS";
    case 'coursework':
      return 'RELEVANT COURSEWORK';
    case 'experience':
      if (templateId === 'research-scholar') return 'RESEARCH & ACADEMIC APPOINTMENTS';
      return 'EXPERIENCE';
    case 'research':
      return 'RESEARCH EXPERIENCE';
    case 'daily-life':
      return 'A DAY OF MY LIFE';
    case 'philosophy':
      return 'MY LIFE PHILOSOPHY';
    case 'strengths':
      return 'STRENGTHS';
    case 'publications':
      return 'PATENTS & PUBLICATIONS';
    case 'projects':
      if (templateId === 'research-scholar') return 'FUNDED PROJECTS & SOFTWARE';
      return 'PROJECTS';
    case 'languages':
      return 'LANGUAGES';
    case 'skills':
      if (templateId === 'classic-professional') return 'COMPUTER SKILLS';
      if (templateId === 'executive-resume') return 'CORE COMPETENCIES';
      if (templateId === 'software-developer') {
        return 'TECHNICAL SKILLS';
      }
      return 'SKILLS';
    case 'skill-matrix':
      return 'SKILL MATRIX';
    case 'learning':
      return 'LEARNING';
    case 'interests':
      return 'INTERESTS';
    case 'career-interests':
      return 'CAREER INTERESTS';
    case 'custom-sections':
      return 'ADDITIONAL INFORMATION';
    case 'achievements':
      return 'HONORS & AWARDS';
    case 'leadership':
      return 'LEADERSHIP EXPERIENCE';
    case 'volunteer':
      return 'VOLUNTEER & COMMUNITY SERVICE';
    case 'memberships':
      return 'PROFESSIONAL MEMBERSHIPS';
    case 'certifications':
      return 'CERTIFICATIONS';
    case 'additional':
      if (templateId === 'software-developer') return 'ADDITIONAL';
      return 'ADDITIONAL INFORMATION';
    case 'references':
      return 'REFERENCES';
    default:
      return String(key).toUpperCase();
  }
}

export function getPublicationParts(pub: PublicationItem) {
  const doiUrl = formatDoiUrl(pub.doi) || (pub.url ? sanitizePdfUrl(pub.url) : null);
  const venue = pub.journalOrConference || pub.publisher || '';
  return {
    doiUrl,
    venue,
  };
}
