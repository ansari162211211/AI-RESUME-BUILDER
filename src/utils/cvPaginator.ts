import type {
  Resume,
  EducationItem,
  ExperienceItem,
  ProjectItem,
  PublicationItem,
  SkillCategory,
  AchievementItem,
  LeadershipItem,
  VolunteerItem,
  MembershipItem,
  CertificationItem,
  ReferenceItem,
} from '../types/resume';

export type CvBlockType =
  | 'header'
  | 'objective'
  | 'education_header'
  | 'education_item'
  | 'experience_header'
  | 'experience_item'
  | 'publications_header'
  | 'publication_item'
  | 'projects_header'
  | 'project_item'
  | 'skills_header'
  | 'skills_item'
  | 'achievements_header'
  | 'achievement_item'
  | 'leadership_header'
  | 'leadership_item'
  | 'volunteer_header'
  | 'volunteer_item'
  | 'memberships_header'
  | 'membership_item'
  | 'certifications_header'
  | 'certification_item'
  | 'additional'
  | 'references_header'
  | 'reference_item';

export interface CvRenderBlock {
  id: string;
  type: CvBlockType;
  estimatedHeight: number;
  data?: unknown;
}

export interface CvPagePlan {
  pageNumber: number;
  blocks: CvRenderBlock[];
  totalHeight: number;
}

// Usable height per A4 page in points (297mm = 842pt, minus 2x18mm margins ~ 102pt = 740pt)
const USABLE_PAGE_HEIGHT_PT = 730;

/**
 * Estimates height for each piece of content and groups them into
 * natural multi-page A4 containers without orphaning headings or splitting entries.
 */
export function paginateResume(resume: Resume): CvPagePlan[] {
  const hidden = new Set(resume.hiddenSections || []);
  const blocks: CvRenderBlock[] = [];

  // 1. Header (Always first)
  let headerHeight = 110;
  if (resume.personalInfo?.jobTitle) headerHeight += 18;
  if (resume.personalInfo?.otherProfiles) headerHeight += 16;
  blocks.push({
    id: 'header',
    type: 'header',
    estimatedHeight: headerHeight,
  });

  // 2. Objective
  if (!hidden.has('objective') && resume.objective && resume.objective.trim().length > 0) {
    const lines = Math.ceil(resume.objective.length / 85);
    const objHeight = 28 + lines * 14;
    blocks.push({
      id: 'objective',
      type: 'objective',
      estimatedHeight: objHeight,
      data: resume.objective,
    });
  }

  // 3. Education
  if (!hidden.has('education') && resume.education && resume.education.length > 0) {
    blocks.push({
      id: 'education-header',
      type: 'education_header',
      estimatedHeight: 28,
    });
    resume.education.forEach((edu) => {
      let eduH = 46;
      if (edu.grade || edu.achievements) eduH += 16;
      blocks.push({
        id: `edu-${edu.id}`,
        type: 'education_item',
        estimatedHeight: eduH,
        data: edu,
      });
    });
  }

  // 4. Experience
  if (!hidden.has('experience') && resume.experience && resume.experience.length > 0) {
    blocks.push({
      id: 'experience-header',
      type: 'experience_header',
      estimatedHeight: 28,
    });
    resume.experience.forEach((exp) => {
      const bulletCount = (exp.highlights || []).filter((h) => h.trim().length > 0).length;
      const expH = 48 + bulletCount * 17;
      blocks.push({
        id: `exp-${exp.id}`,
        type: 'experience_item',
        estimatedHeight: expH,
        data: exp,
      });
    });
  }

  // 5. Patents & Publications
  if (!hidden.has('publications') && resume.publications && resume.publications.length > 0) {
    blocks.push({
      id: 'publications-header',
      type: 'publications_header',
      estimatedHeight: 28,
    });
    resume.publications.forEach((pub, idx) => {
      const lines = Math.ceil((pub.title.length + pub.authors.length) / 75);
      const pubH = 26 + lines * 13;
      blocks.push({
        id: `pub-${pub.id}`,
        type: 'publication_item',
        estimatedHeight: pubH,
        data: { pub, index: idx + 1 },
      });
    });
  }

  // 6. Projects
  if (!hidden.has('projects') && resume.projects && resume.projects.length > 0) {
    blocks.push({
      id: 'projects-header',
      type: 'projects_header',
      estimatedHeight: 28,
    });
    resume.projects.forEach((proj) => {
      const bulletCount = (proj.highlights || []).filter((h) => h.trim().length > 0).length;
      let projH = 44 + bulletCount * 16;
      if (proj.description) projH += 22;
      blocks.push({
        id: `proj-${proj.id}`,
        type: 'project_item',
        estimatedHeight: projH,
        data: proj,
      });
    });
  }

  // 7. Technical Skills
  if (!hidden.has('skills') && resume.skills && resume.skills.length > 0) {
    blocks.push({
      id: 'skills-header',
      type: 'skills_header',
      estimatedHeight: 28,
    });
    resume.skills.forEach((skill) => {
      blocks.push({
        id: `skill-${skill.id}`,
        type: 'skills_item',
        estimatedHeight: 22,
        data: skill,
      });
    });
  }

  // 8. Honors & Awards
  if (!hidden.has('achievements') && resume.achievements && resume.achievements.length > 0) {
    blocks.push({
      id: 'achievements-header',
      type: 'achievements_header',
      estimatedHeight: 28,
    });
    resume.achievements.forEach((ach) => {
      blocks.push({
        id: `ach-${ach.id}`,
        type: 'achievement_item',
        estimatedHeight: 34,
        data: ach,
      });
    });
  }

  // 9. Leadership Experience
  if (!hidden.has('leadership') && resume.leadership && resume.leadership.length > 0) {
    blocks.push({
      id: 'leadership-header',
      type: 'leadership_header',
      estimatedHeight: 28,
    });
    resume.leadership.forEach((lead) => {
      const bulletCount = (lead.highlights || []).filter((h) => h.trim().length > 0).length;
      const leadH = 42 + bulletCount * 16;
      blocks.push({
        id: `lead-${lead.id}`,
        type: 'leadership_item',
        estimatedHeight: leadH,
        data: lead,
      });
    });
  }

  // 10. Volunteer Service
  if (!hidden.has('volunteer') && resume.volunteer && resume.volunteer.length > 0) {
    blocks.push({
      id: 'volunteer-header',
      type: 'volunteer_header',
      estimatedHeight: 28,
    });
    resume.volunteer.forEach((vol) => {
      const bulletCount = (vol.highlights || []).filter((h) => h.trim().length > 0).length;
      const volH = 38 + bulletCount * 15;
      blocks.push({
        id: `vol-${vol.id}`,
        type: 'volunteer_item',
        estimatedHeight: volH,
        data: vol,
      });
    });
  }

  // 11. Professional Memberships
  if (!hidden.has('memberships') && resume.memberships && resume.memberships.length > 0) {
    blocks.push({
      id: 'memberships-header',
      type: 'memberships_header',
      estimatedHeight: 28,
    });
    resume.memberships.forEach((mem) => {
      blocks.push({
        id: `mem-${mem.id}`,
        type: 'membership_item',
        estimatedHeight: 22,
        data: mem,
      });
    });
  }

  // 12. Certifications
  if (!hidden.has('certifications') && resume.certifications && resume.certifications.length > 0) {
    blocks.push({
      id: 'certifications-header',
      type: 'certifications_header',
      estimatedHeight: 28,
    });
    resume.certifications.forEach((cert) => {
      blocks.push({
        id: `cert-${cert.id}`,
        type: 'certification_item',
        estimatedHeight: 24,
        data: cert,
      });
    });
  }

  // 13. Additional Information
  const hasLang = resume.languages && resume.languages.length > 0;
  const hasInt = resume.interests && resume.interests.trim().length > 0;
  if (!hidden.has('additional') && (hasLang || hasInt)) {
    let addH = 30;
    if (hasLang) addH += 18;
    if (hasInt) addH += 18;
    blocks.push({
      id: 'additional',
      type: 'additional',
      estimatedHeight: addH,
      data: { languages: resume.languages, interests: resume.interests },
    });
  }

  // 14. References
  if (!hidden.has('references') && resume.references && resume.references.length > 0) {
    blocks.push({
      id: 'references-header',
      type: 'references_header',
      estimatedHeight: 28,
    });
    resume.references.forEach((ref) => {
      blocks.push({
        id: `ref-${ref.id}`,
        type: 'reference_item',
        estimatedHeight: 65,
        data: ref,
      });
    });
  }

  // Pack blocks into pages, ensuring section headers stay with at least their first item
  const pages: CvPagePlan[] = [];
  let currentPageBlocks: CvRenderBlock[] = [];
  let currentHeight = 0;

  for (let i = 0; i < blocks.length; i++) {
    const block = blocks[i];

    // If block is a section header, peek at the next item to ensure they stay together
    const isSectionHeader = block.type.endsWith('_header');
    const nextBlock = i + 1 < blocks.length ? blocks[i + 1] : null;
    const requiredHeight =
      isSectionHeader && nextBlock ? block.estimatedHeight + nextBlock.estimatedHeight : block.estimatedHeight;

    // Check if block fits on current page
    if (currentHeight > 0 && currentHeight + requiredHeight > USABLE_PAGE_HEIGHT_PT) {
      // Start a new page
      pages.push({
        pageNumber: pages.length + 1,
        blocks: currentPageBlocks,
        totalHeight: currentHeight,
      });
      currentPageBlocks = [block];
      currentHeight = block.estimatedHeight;
    } else {
      currentPageBlocks.push(block);
      currentHeight += block.estimatedHeight;
    }
  }

  if (currentPageBlocks.length > 0) {
    pages.push({
      pageNumber: pages.length + 1,
      blocks: currentPageBlocks,
      totalHeight: currentHeight,
    });
  }

  return pages.length > 0
    ? pages
    : [
        {
          pageNumber: 1,
          blocks: [{ id: 'header', type: 'header', estimatedHeight: 100 }],
          totalHeight: 100,
        },
      ];
}
