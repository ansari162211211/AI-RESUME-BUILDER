import type {
  AwardItem,
  CertificationItem,
  CustomSectionItem,
  ExperienceCategory,
  ExperienceItem,
  InterestItem,
  LeadershipItem,
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
      return Boolean(resume.objective && resume.objective.trim().length > 0);
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
      return Boolean(resume.experience && resume.experience.length > 0);
    case 'publications':
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
      return getVisibleSkills(resume.skills).length > 0;
    case 'skill-matrix':
      return Boolean(
        resume.skillMatrix &&
          resume.skillMatrix.some((m) => m.skill?.trim().length > 0)
      );
    case 'interests': {
      const eff = getEffectiveInterests(resume);
      return eff.items.length > 0 || eff.text.length > 0;
    }
    case 'custom-sections':
      return Boolean(
        resume.customSections &&
          resume.customSections.some(
            (cs) =>
              cs.title?.trim().length > 0 &&
              cs.bullets?.some((b) => b.trim().length > 0)
          )
      );
    case 'achievements':
      return Boolean(resume.achievements && resume.achievements.length > 0);
    case 'leadership':
      return Boolean(resume.leadership && resume.leadership.length > 0);
    case 'volunteer':
      return Boolean(resume.volunteer && resume.volunteer.length > 0);
    case 'memberships':
      return Boolean(resume.memberships && resume.memberships.length > 0);
    case 'certifications':
      return Boolean(resume.certifications && resume.certifications.length > 0);
    case 'additional': {
      if (effectiveTplId === 'harvard-style') {
        return getHarvardAdditionalSubsections(resume).length > 0;
      }
      if (effectiveTplId === 'software-developer') {
        return getSoftwareDevAdditionalSubsections(resume).length > 0;
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
  if (template.id === 'harvard-style' && resume.harvardLeadershipFirst) {
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
      if (templateId === 'software-developer' || templateId === 'engineering-resume') {
        return 'TECHNICAL SKILLS';
      }
      return 'SKILLS';
    case 'skill-matrix':
      return 'SKILL MATRIX';
    case 'interests':
      return 'INTERESTS';
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
