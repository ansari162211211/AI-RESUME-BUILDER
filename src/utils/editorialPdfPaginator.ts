import type { Resume } from '../types/resume';
import type { ResumeSectionKey } from '../data/templates';
import {
  getCreativeCategorizedSkills,
  getCreativeCertificatesAndGrants,
  getCreativeCircularProficiencies,
  getCreativeCommunicationSkills,
  getCreativeHorizontalSkillBars,
  getCreativeTalksAndPublications,
  getEffectiveInterests,
  getInternshipCareerInterests,
  getInternshipEducationEntries,
  getInternshipLearningItems,
  getInternshipResearchAndProjectEntries,
  getInternshipSkillRows,
  getVisibleSkills,
} from './resumePresentation';

export interface EditorialPdfScale {
  baseFontPt: number;
  namePt: number;
  jobTitlePt: number;
  headingPt: number;
  entryTitlePt: number;
  entrySubtitlePt: number;
  bodyPt: number;
  metaPt: number;
  lineHeight: number;
  sectionGapPt: number;
  entryGapPt: number;
  marginTopPt: number;
  marginBottomPt: number;
  marginHorizPt: number;
}

export interface EditorialPdfSectionSlice {
  sectionKey: ResumeSectionKey;
  sliceStart: number;
  sliceEnd: number;
  includeHeading: boolean;
}

export interface EditorialPdfPagePlan {
  pageNumber: number;
  left: EditorialPdfSectionSlice[];
  right: EditorialPdfSectionSlice[];
}

interface AtomicUnit {
  sectionKey: ResumeSectionKey;
  itemIndex: number;
  itemCount: number;
  includeHeading: boolean;
  heightPt: number;
}

const A4_HEIGHT_PT = 841.89;

const wrappedLines = (text: string | undefined, charsPerLine: number): number => {
  const trimmed = (text || '').trim();
  if (!trimmed) return 0;
  return trimmed
    .split(/\r?\n/)
    .reduce((acc, line) => acc + Math.max(1, Math.ceil(line.trim().length / charsPerLine)), 0);
};

export function estimateEditorialHeaderHeightPt(
  metaRowCount: number,
  contactItemCount: number,
  scale: EditorialPdfScale
): number {
  const nameLines = 1.15;
  const leftHeight =
    nameLines * scale.namePt * 1.15 +
    (metaRowCount > 0 ? 4 + metaRowCount * (scale.metaPt * 1.35 + 1.8) : 0);
  const rightHeight =
    contactItemCount > 0 ? contactItemCount * (scale.metaPt * 1.35 + 1.8) : 0;
  // 20pt banner vertical padding + 9pt bottom margin + 6pt safety pad
  return Math.ceil(Math.max(leftHeight, rightHeight) + 35);
}

export function estimateInternshipHeaderHeightPt(
  contactItemCount: number,
  scale: EditorialPdfScale
): number {
  const nameHeight = scale.namePt * 1.15;
  const headlineHeight = scale.jobTitlePt * 1.3 + 4;
  // Compact horizontal flex-wrap contact row: estimate 1-3 rows depending on count
  const contactRows = contactItemCount === 0 ? 0 : Math.ceil(contactItemCount / 3.5);
  const contactHeight = contactRows * (scale.metaPt * 1.35 + 4);
  return Math.ceil(nameHeight + headlineHeight + contactHeight + 16);
}

export function estimateCreativeHeaderHeightPt(
  resume: Resume,
  contactItemCount: number,
  scale: EditorialPdfScale
): number {
  const nameHeight = scale.namePt * 1.18;
  const titleLines = [resume.personalInfo?.jobTitle, resume.personalInfo?.specialization]
    .filter((s) => Boolean(s?.trim()))
    .join(' · ');
  const titleHeight = titleLines ? scale.jobTitlePt * 1.35 + 3 : 0;
  const taglineHeight = resume.personalInfo?.tagline?.trim() ? scale.metaPt * 1.4 + 2 : 0;
  const contactRows = contactItemCount === 0 ? 0 : Math.ceil(contactItemCount / 3.2);
  const contactHeight = contactRows * (scale.metaPt * 1.35 + 4) + (contactRows > 0 ? 4 : 0);
  const quoteLines = wrappedLines(resume.personalQuote, 72);
  const quoteHeight = quoteLines > 0 ? quoteLines * (scale.metaPt * 1.35) + 6 : 0;
  return Math.ceil(nameHeight + titleHeight + taglineHeight + contactHeight + quoteHeight + 18);
}

function buildSectionAtomicUnits(
  sectionKey: ResumeSectionKey,
  resume: Resume,
  scale: EditorialPdfScale,
  mode: 'editorial' | 'internship' | 'creative' = 'editorial'
): AtomicUnit[] {
  const headingPt = scale.sectionGapPt + (scale.headingPt + 0.5) * 1.25 + 8;
  const bodyLinePt = scale.bodyPt * scale.lineHeight;
  const metaLinePt = scale.metaPt * 1.32;
  const titleLinePt = scale.entryTitlePt * 1.26;

  // Body width in date-rail (~186pt) vs full column (~248pt)
  const railChars = mode === 'internship' ? 48 : mode === 'creative' ? 38 : 42;
  const fullChars = 54;

  switch (sectionKey) {
    case 'objective': {
      const paragraphs = (resume.objective || '')
        .split(/\n\s*\n/)
        .map((p) => p.trim())
        .filter(Boolean);
      const extras =
        (resume.academicInterests?.trim() ? 1 : 0) +
        (resume.careerGoals?.trim() ? 1 : 0);
      let pt = headingPt + 4;
      paragraphs.forEach((p, idx) => {
        pt += wrappedLines(p, fullChars) * bodyLinePt + (idx < paragraphs.length - 1 ? 3 : 0);
      });
      if (resume.academicInterests?.trim()) {
        pt += wrappedLines(`Academic Interests: ${resume.academicInterests.trim()}`, fullChars) * bodyLinePt + 2;
      }
      if (resume.careerGoals?.trim()) {
        pt += wrappedLines(`Career Goals: ${resume.careerGoals.trim()}`, fullChars) * bodyLinePt;
      }
      if (paragraphs.length === 0 && extras === 0) return [];
      return [{ sectionKey, itemIndex: 0, itemCount: 1, includeHeading: true, heightPt: Math.ceil(pt) }];
    }

    case 'education': {
      if (mode === 'internship' || mode === 'creative') {
        const list = getInternshipEducationEntries(resume);
        return list.map((edu, idx) => {
          let pt = scale.entryGapPt + 6;
          pt += wrappedLines(edu.heading, fullChars) * titleLinePt;
          if (edu.institution) pt += wrappedLines(edu.institution, fullChars) * metaLinePt + 2;
          if (edu.dateRange || edu.location) pt += metaLinePt + 2;
          edu.subDetails.forEach((d) => {
            pt += wrappedLines(d, fullChars) * bodyLinePt + 1.5;
          });
          return {
            sectionKey,
            itemIndex: idx,
            itemCount: list.length,
            includeHeading: idx === 0,
            heightPt: Math.ceil((idx === 0 ? headingPt : 0) + pt),
          };
        });
      }
      const list = resume.education || [];
      return list.map((edu, idx) => {
        const courseworkStr = Array.isArray(edu.coursework)
          ? edu.coursework.join(', ')
          : edu.coursework || '';
        let pt = scale.entryGapPt + 4;
        pt += wrappedLines(`${edu.degree}${edu.specialization ? `, ${edu.specialization}` : ''}`, 36) * titleLinePt;
        pt += wrappedLines(`${edu.institution} ${edu.location || ''}`, railChars) * metaLinePt + 1.5;
        if (edu.department?.trim()) pt += wrappedLines(edu.department, railChars) * metaLinePt;
        if (edu.grade?.trim()) pt += wrappedLines(`GPA: ${edu.grade}`, railChars) * bodyLinePt;
        if (edu.thesisTitle?.trim() || edu.dissertationDetails?.trim()) {
          pt += wrappedLines(`Thesis: ${edu.thesisTitle || ''} ${edu.dissertationDetails || ''}`, railChars) * bodyLinePt;
        }
        if (courseworkStr.trim()) pt += wrappedLines(`Coursework: ${courseworkStr}`, railChars) * bodyLinePt;
        if (edu.honors?.trim() || edu.achievements?.trim()) {
          pt += wrappedLines(`Honors: ${edu.honors || edu.achievements || ''}`, railChars) * bodyLinePt;
        }
        if (edu.description?.trim()) pt += wrappedLines(edu.description, railChars) * bodyLinePt;
        return {
          sectionKey,
          itemIndex: idx,
          itemCount: list.length,
          includeHeading: idx === 0,
          heightPt: Math.ceil((idx === 0 ? headingPt : 0) + pt),
        };
      });
    }

    case 'experience': {
      const list = resume.experience || [];
      return list.map((exp, idx) => {
        let pt = scale.entryGapPt + 4;
        pt += wrappedLines(`${exp.position}${exp.employmentType ? ` (${exp.employmentType})` : ''}`, 36) * titleLinePt;
        pt += wrappedLines(exp.company, railChars) * metaLinePt;
        if (exp.location?.trim()) pt += metaLinePt;
        if (exp.description?.trim()) pt += wrappedLines(exp.description, railChars) * bodyLinePt + 1.5;
        const demonstrated = Array.isArray(exp.skillsDemonstrated)
          ? exp.skillsDemonstrated
          : typeof exp.skillsDemonstrated === 'string' && exp.skillsDemonstrated
          ? [exp.skillsDemonstrated]
          : [];
        const tech = [...(exp.technologies || []), ...demonstrated].filter(Boolean);
        if (tech.length > 0) pt += wrappedLines(`Technologies / Skills: ${tech.join(', ')}`, railChars) * metaLinePt;
        (exp.highlights || []).filter((h) => h.trim()).forEach((h) => {
          pt += wrappedLines(h, railChars - 3) * bodyLinePt + 2;
        });
        return {
          sectionKey,
          itemIndex: idx,
          itemCount: list.length,
          includeHeading: idx === 0,
          heightPt: Math.ceil((idx === 0 ? headingPt : 0) + pt),
        };
      });
    }

    case 'research': {
      if (mode === 'internship') {
        const list = getInternshipResearchAndProjectEntries(resume);
        return list.map((item, idx) => {
          let pt = scale.entryGapPt + 4;
          pt += wrappedLines(`${item.title}${item.dateRange ? ` (${item.dateRange})` : ''}`, fullChars) * titleLinePt + 2;
          item.bullets.forEach((b) => {
            pt += wrappedLines(b, fullChars - 3) * bodyLinePt + 2;
          });
          if (item.linkLabel) pt += metaLinePt;
          return {
            sectionKey,
            itemIndex: idx,
            itemCount: list.length,
            includeHeading: idx === 0,
            heightPt: Math.ceil((idx === 0 ? headingPt : 0) + pt),
          };
        });
      }
      const list = resume.researchExperience || [];
      return list.map((res, idx) => {
        let pt = scale.entryGapPt + 4;
        pt += wrappedLines(res.title, 36) * titleLinePt;
        if (res.role || res.domain) pt += wrappedLines(`${res.role || ''} · ${res.domain || ''}`, railChars) * metaLinePt;
        if (res.institution || res.location || res.supervisor) {
          pt += wrappedLines([res.institution, res.location, res.supervisor].filter(Boolean).join(' '), railChars) * metaLinePt;
        }
        [res.objectives, res.methodology, res.findings, res.outcomes].forEach((f) => {
          if (f?.trim()) pt += wrappedLines(`Label: ${f.trim()}`, railChars) * bodyLinePt + 1.5;
        });
        if (res.technologies?.length) pt += wrappedLines(`Methods & Tools: ${res.technologies.join(', ')}`, railChars) * metaLinePt;
        if (res.publications?.trim()) pt += wrappedLines(`Output: ${res.publications}`, railChars) * metaLinePt;
        return {
          sectionKey,
          itemIndex: idx,
          itemCount: list.length,
          includeHeading: idx === 0,
          heightPt: Math.ceil((idx === 0 ? headingPt : 0) + pt),
        };
      });
    }

    case 'projects': {
      const list = resume.projects || [];
      return list.map((proj, idx) => {
        let pt = scale.entryGapPt + 4;
        pt += wrappedLines(`${proj.title}${proj.teamType ? ` (${proj.teamType})` : ''}`, 36) * titleLinePt;
        if (proj.institution?.trim()) pt += wrappedLines(proj.institution, railChars) * metaLinePt;
        if (proj.githubUrl?.trim() || proj.link?.trim()) pt += metaLinePt;
        if (proj.technologies?.length) pt += wrappedLines(proj.technologies.join(', '), railChars) * metaLinePt;
        if (proj.description?.trim()) pt += wrappedLines(proj.description, railChars) * bodyLinePt + 1.5;
        (proj.highlights || []).filter((h) => h.trim()).forEach((h) => {
          pt += wrappedLines(h, railChars - 3) * bodyLinePt + 2;
        });
        return {
          sectionKey,
          itemIndex: idx,
          itemCount: list.length,
          includeHeading: idx === 0,
          heightPt: Math.ceil((idx === 0 ? headingPt : 0) + pt),
        };
      });
    }

    case 'publications': {
      const list =
        mode === 'creative' ? getCreativeTalksAndPublications(resume) : resume.publications || [];
      return list.map((pub, idx) => {
        let pt = 4 + 2;
        pt += wrappedLines(pub.title, railChars) * bodyLinePt;
        if (pub.authors?.trim()) pt += wrappedLines(pub.authors, railChars) * metaLinePt;
        if (pub.journalOrConference?.trim() || pub.publisher?.trim()) {
          pt += wrappedLines(pub.journalOrConference || pub.publisher, railChars) * metaLinePt;
        }
        if (mode === 'creative' && pub.description?.trim()) {
          pt += wrappedLines(pub.description, railChars) * bodyLinePt;
        }
        if (pub.doi?.trim() || pub.url?.trim()) pt += metaLinePt;
        return {
          sectionKey,
          itemIndex: idx,
          itemCount: list.length,
          includeHeading: idx === 0,
          heightPt: Math.ceil((idx === 0 ? headingPt : 0) + pt),
        };
      });
    }

    case 'achievements': {
      const list = resume.achievements || [];
      return list.map((ach, idx) => {
        let pt = scale.entryGapPt + 2;
        pt += wrappedLines(ach.title, 36) * titleLinePt;
        if (ach.issuer?.trim() || ach.category?.trim()) {
          pt += wrappedLines([ach.issuer, ach.category].filter(Boolean).join(' · '), railChars) * metaLinePt;
        }
        if (ach.description?.trim() || ach.achievementDetails?.trim()) {
          pt += wrappedLines([ach.description, ach.achievementDetails].filter(Boolean).join(' — '), railChars) * bodyLinePt;
        }
        return {
          sectionKey,
          itemIndex: idx,
          itemCount: list.length,
          includeHeading: idx === 0,
          heightPt: Math.ceil((idx === 0 ? headingPt : 0) + pt),
        };
      });
    }

    case 'skills': {
      if (mode === 'creative') {
        const groups = getCreativeCategorizedSkills(resume);
        return groups.map((grp, idx) => {
          let pt = scale.entryGapPt + metaLinePt + 4;
          grp.items.forEach((it) => {
            pt += wrappedLines(it.name, fullChars) * bodyLinePt + 2;
            if (it.description?.trim()) {
              pt += wrappedLines(it.description, fullChars) * metaLinePt;
            }
          });
          return {
            sectionKey,
            itemIndex: idx,
            itemCount: groups.length,
            includeHeading: idx === 0,
            heightPt: Math.ceil((idx === 0 ? headingPt : 0) + pt),
          };
        });
      }
      if (mode === 'internship') {
        const list = getInternshipSkillRows(resume);
        return list.map((row, idx) => {
          const charsPerRow = row.proficiency ? 32 : fullChars;
          const pt = wrappedLines(row.label, charsPerRow) * bodyLinePt + 8;
          return {
            sectionKey,
            itemIndex: idx,
            itemCount: list.length,
            includeHeading: idx === 0,
            heightPt: Math.ceil((idx === 0 ? headingPt : 0) + pt),
          };
        });
      }
      const list = getVisibleSkills(resume.skills).filter((cat) =>
        (cat.skills || []).some((s) => s.trim())
      );
      return list.map((cat, idx) => {
        const line = `${cat.category?.trim() ? `${cat.category.trim()}: ` : ''}${cat.skills
          .map((s) => s.trim())
          .filter(Boolean)
          .join(', ')}`;
        const pt = wrappedLines(line, fullChars) * bodyLinePt + 3;
        return {
          sectionKey,
          itemIndex: idx,
          itemCount: list.length,
          includeHeading: idx === 0,
          heightPt: Math.ceil((idx === 0 ? headingPt : 0) + pt),
        };
      });
    }

    case 'proficiency-circles': {
      const circles = getCreativeCircularProficiencies(resume);
      if (circles.length === 0) return [];
      const rowCount = Math.ceil(circles.length / 2);
      const units: AtomicUnit[] = [];
      for (let r = 0; r < rowCount; r++) {
        const pair = circles.slice(r * 2, r * 2 + 2);
        const maxDescLines = Math.max(
          1,
          ...pair.map((p) => wrappedLines(p.description || p.name, 22))
        );
        const rowPt = 48 + maxDescLines * metaLinePt + 8;
        units.push({
          sectionKey,
          itemIndex: r,
          itemCount: rowCount,
          includeHeading: r === 0,
          heightPt: Math.ceil((r === 0 ? headingPt : 0) + rowPt),
        });
      }
      return units;
    }

    case 'skill-bars': {
      const bars = getCreativeHorizontalSkillBars(resume);
      return bars.map((b, idx) => ({
        sectionKey,
        itemIndex: idx,
        itemCount: bars.length,
        includeHeading: idx === 0,
        heightPt: Math.ceil((idx === 0 ? headingPt : 0) + bodyLinePt + 7),
      }));
    }

    case 'communication': {
      const comms = getCreativeCommunicationSkills(resume);
      return comms.map((c, idx) => {
        let pt = bodyLinePt + 4;
        if (c.proficiency?.trim()) pt += metaLinePt;
        if (c.context?.trim()) pt += wrappedLines(c.context, fullChars) * metaLinePt;
        return {
          sectionKey,
          itemIndex: idx,
          itemCount: comms.length,
          includeHeading: idx === 0,
          heightPt: Math.ceil((idx === 0 ? headingPt : 0) + pt),
        };
      });
    }

    case 'languages': {
      const list = (resume.languages || []).filter((l) => l.language?.trim());
      return list.map((lang, idx) => {
        const line = `${lang.language}${lang.proficiency ? ` — ${lang.proficiency}` : ''}${
          lang.comment ? ` (${lang.comment})` : ''
        }`;
        const pt = wrappedLines(line, fullChars) * bodyLinePt + (mode === 'creative' ? 5 : 2.5);
        return {
          sectionKey,
          itemIndex: idx,
          itemCount: list.length,
          includeHeading: idx === 0,
          heightPt: Math.ceil((idx === 0 ? headingPt : 0) + pt),
        };
      });
    }

    case 'certifications': {
      if (mode === 'creative') {
        const items = getCreativeCertificatesAndGrants(resume);
        return items.map((c, idx) => {
          let pt = scale.entryGapPt + wrappedLines(c.title, railChars) * bodyLinePt + 3;
          if (c.issuer) pt += wrappedLines(c.issuer, railChars) * metaLinePt;
          if (c.description) pt += wrappedLines(c.description, railChars) * metaLinePt;
          return {
            sectionKey,
            itemIndex: idx,
            itemCount: items.length,
            includeHeading: idx === 0,
            heightPt: Math.ceil((idx === 0 ? headingPt : 0) + pt),
          };
        });
      }
      const list = resume.certifications || [];
      return list.map((c, idx) => {
        const line = `${c.name}${c.issuer ? ` — ${c.issuer}` : ''}${
          c.credentialId ? ` (ID: ${c.credentialId})` : ''
        }`;
        const pt = wrappedLines(line, railChars) * bodyLinePt + 3;
        return {
          sectionKey,
          itemIndex: idx,
          itemCount: list.length,
          includeHeading: idx === 0,
          heightPt: Math.ceil((idx === 0 ? headingPt : 0) + pt),
        };
      });
    }

    case 'leadership': {
      const list = resume.leadership || [];
      return list.map((l, idx) => {
        let pt = scale.entryGapPt + 3;
        pt += wrappedLines(l.role, 36) * titleLinePt;
        if (l.organization || l.location) pt += wrappedLines(`${l.organization} ${l.location || ''}`, railChars) * metaLinePt;
        (l.highlights || []).filter((h) => h.trim()).forEach((h) => {
          pt += wrappedLines(h, railChars - 3) * bodyLinePt + 2;
        });
        return {
          sectionKey,
          itemIndex: idx,
          itemCount: list.length,
          includeHeading: idx === 0,
          heightPt: Math.ceil((idx === 0 ? headingPt : 0) + pt),
        };
      });
    }

    case 'memberships': {
      const list = resume.memberships || [];
      return list.map((m, idx) => {
        const line = `${m.organization}${m.membershipType ? ` — ${m.membershipType}` : ''}${
          m.membershipId ? ` (ID: ${m.membershipId})` : ''
        }`;
        const pt = wrappedLines(line, railChars) * bodyLinePt + 3;
        return {
          sectionKey,
          itemIndex: idx,
          itemCount: list.length,
          includeHeading: idx === 0,
          heightPt: Math.ceil((idx === 0 ? headingPt : 0) + pt),
        };
      });
    }

    case 'learning': {
      const list = getInternshipLearningItems(resume);
      return list.map((act, idx) => {
        const lineParts = [
          act.title?.trim(),
          act.provider?.trim() ? `by ${act.provider.trim()}` : '',
          act.instructor?.trim() ? `(${act.instructor.trim()})` : '',
          act.certificateId?.trim() ? `Certificate ID: ${act.certificateId.trim()}` : '',
          act.completionDate?.trim() ? `(${act.completionDate.trim()})` : '',
          act.skillsAcquired?.length ? `Skills: ${act.skillsAcquired.join(', ')}` : '',
          act.description?.trim(),
        ].filter(Boolean);
        const pt = wrappedLines(lineParts.join(' '), fullChars - 3) * bodyLinePt + 4;
        return {
          sectionKey,
          itemIndex: idx,
          itemCount: list.length,
          includeHeading: idx === 0,
          heightPt: Math.ceil((idx === 0 ? headingPt : 0) + pt),
        };
      });
    }

    case 'interests': {
      const eff = getEffectiveInterests(resume);
      if (eff.items.length === 0 && !eff.text) return [];
      let pt = headingPt + 4;
      if (mode === 'internship') {
        const totalChars = eff.items.reduce((acc, item) => acc + item.name.trim().length + 4, 0);
        const tagRows = Math.max(1, Math.ceil(totalChars / 36));
        pt += tagRows * 18 + 4;
      } else if (eff.items.length > 0) {
        eff.items.forEach((item) => {
          pt += wrappedLines(`${item.name}${item.description ? ` — ${item.description}` : ''}`, fullChars) * bodyLinePt + 2;
        });
      } else if (eff.text) {
        pt += wrappedLines(eff.text, fullChars) * bodyLinePt;
      }
      return [{ sectionKey, itemIndex: 0, itemCount: 1, includeHeading: true, heightPt: Math.ceil(pt) }];
    }

    case 'career-interests': {
      const tags = getInternshipCareerInterests(resume);
      const prefs = resume.internshipPreferences;
      const prefLine = [
        prefs?.targetRole?.trim(),
        prefs?.preferredIndustry?.trim(),
        prefs?.duration?.trim(),
        prefs?.workArrangement?.trim(),
        prefs?.availabilityDate?.trim(),
      ]
        .filter(Boolean)
        .join(' · ');
      if (tags.length === 0 && !prefLine) return [];
      let pt = headingPt + 4;
      if (tags.length > 0) {
        const totalChars = tags.reduce((acc, t) => acc + t.length + 4, 0);
        const tagRows = Math.max(1, Math.ceil(totalChars / 36));
        pt += tagRows * 18 + 4;
      }
      if (prefLine) {
        pt += wrappedLines(prefLine, fullChars) * metaLinePt + 4;
      }
      return [{ sectionKey, itemIndex: 0, itemCount: 1, includeHeading: true, heightPt: Math.ceil(pt) }];
    }

    case 'references': {
      if (resume.referencesDisplayMode === 'hidden') return [];
      if (resume.referencesDisplayMode === 'on-request') {
        return [
          {
            sectionKey,
            itemIndex: 0,
            itemCount: 1,
            includeHeading: true,
            heightPt: Math.ceil(headingPt + bodyLinePt + 4),
          },
        ];
      }
      const list = resume.references || [];
      return list.map((r, idx) => {
        let pt = scale.entryGapPt + 3 + titleLinePt;
        if (r.jobTitle || r.organization) pt += metaLinePt;
        if (r.department) pt += metaLinePt;
        if (r.relationship) pt += metaLinePt;
        if (r.email) pt += metaLinePt;
        if (r.address) pt += wrappedLines(r.address, fullChars) * metaLinePt;
        if (r.phone) pt += metaLinePt;
        return {
          sectionKey,
          itemIndex: idx,
          itemCount: list.length,
          includeHeading: idx === 0,
          heightPt: Math.ceil((idx === 0 ? headingPt : 0) + pt),
        };
      });
    }

    case 'custom-sections': {
      const customs = (resume.customSections || []).filter(
        (cs) => cs.title?.trim() && cs.bullets?.some((b) => b.trim())
      );
      return customs.map((cs, idx) => {
        let pt = headingPt + 4;
        cs.bullets.filter((b) => b.trim()).forEach((b) => {
          pt += wrappedLines(b, fullChars - 3) * bodyLinePt + 2;
        });
        return {
          sectionKey,
          itemIndex: idx,
          itemCount: customs.length,
          includeHeading: true,
          heightPt: Math.ceil(pt),
        };
      });
    }

    default:
      return [];
  }
}

function packColumnUnits(
  sectionKeys: ResumeSectionKey[],
  resume: Resume,
  scale: EditorialPdfScale,
  firstPageMaxPt: number,
  nextPageMaxPt: number,
  mode: 'editorial' | 'internship' | 'creative' = 'editorial'
): EditorialPdfSectionSlice[][] {
  const units: AtomicUnit[] = [];
  sectionKeys.forEach((k) => {
    units.push(...buildSectionAtomicUnits(k, resume, scale, mode));
  });

  if (units.length === 0) return [];

  const pagedUnits: AtomicUnit[][] = [[]];
  let currentHeight = 0;

  units.forEach((unit) => {
    const pageIdx = pagedUnits.length - 1;
    const limit = pageIdx === 0 ? firstPageMaxPt : nextPageMaxPt;
    if (pagedUnits[pageIdx].length > 0 && currentHeight + unit.heightPt > limit) {
      pagedUnits.push([unit]);
      currentHeight = unit.heightPt;
    } else {
      pagedUnits[pageIdx].push(unit);
      currentHeight += unit.heightPt;
    }
  });

  return pagedUnits.map((pageList) => {
    const merged: EditorialPdfSectionSlice[] = [];
    pageList.forEach((u) => {
      const prev = merged[merged.length - 1];
      if (prev && prev.sectionKey === u.sectionKey && prev.sliceEnd === u.itemIndex) {
        prev.sliceEnd = u.itemIndex + 1;
      } else {
        merged.push({
          sectionKey: u.sectionKey,
          sliceStart: u.itemIndex,
          sliceEnd: u.itemIndex + 1,
          includeHeading: u.includeHeading,
        });
      }
    });
    return merged;
  });
}

export function paginateEditorialPdfColumns(params: {
  leftSections: ResumeSectionKey[];
  rightSections: ResumeSectionKey[];
  resume: Resume;
  scale: EditorialPdfScale;
  headerHeightPt: number;
  mode?: 'editorial' | 'internship' | 'creative';
}): EditorialPdfPagePlan[] {
  const { leftSections, rightSections, resume, scale, headerHeightPt, mode = 'editorial' } = params;
  const pageVerticalPaddingPt = scale.marginTopPt + scale.marginBottomPt + 24;
  // 20pt safety buffer above the footer to prevent any border/text touch
  const nextPageMaxPt = Math.max(260, A4_HEIGHT_PT - pageVerticalPaddingPt - 20);
  const firstPageMaxPt = Math.max(220, nextPageMaxPt - headerHeightPt);

  const leftPages = packColumnUnits(leftSections, resume, scale, firstPageMaxPt, nextPageMaxPt, mode);
  const rightPages = packColumnUnits(rightSections, resume, scale, firstPageMaxPt, nextPageMaxPt, mode);
  const totalPages = Math.max(1, leftPages.length, rightPages.length);

  const pages: EditorialPdfPagePlan[] = [];
  for (let i = 0; i < totalPages; i++) {
    pages.push({
      pageNumber: i + 1,
      left: leftPages[i] || [],
      right: rightPages[i] || [],
    });
  }
  return pages;
}
