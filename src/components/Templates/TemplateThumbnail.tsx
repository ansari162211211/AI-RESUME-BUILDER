import React from 'react';
import type { Resume } from '../../types/resume';
import {
  buildFresherHeaderColumns,
  buildHarvardContactItems,
  getEffectiveInterests,
  getHarvardSkillsAndInterests,
  getInternshipCareerInterests,
  getInternshipEducationEntries,
  getInternshipLearningItems,
  getInternshipResearchAndProjectEntries,
  getInternshipSkillRows,
  getSectionDisplayTitle,
  getOrderedVisibleSections,
  getVisibleSkills,
} from '../../utils/resumePresentation';
import {
  hexToLightSolidBg,
  resolveTemplateCustomization,
  type ResumeSectionKey,
  type TemplateDefinition,
} from '../../data/templates';

interface TemplateThumbnailProps {
  template: TemplateDefinition;
  resume?: Resume;
}

/**
 * Miniature A4 (210:297) live visual thumbnail reflecting each template's genuine
 * layout, header style, typography, accent palette, and section arrangement.
 */
export const TemplateThumbnail: React.FC<TemplateThumbnailProps> = ({
  template,
  resume,
}) => {
  const custom = resolveTemplateCustomization({
    template: template.id,
    fontFamily: template.defaultCustomization.fontFamily,
    customization: template.defaultCustomization,
  });

  const accent = custom.accentColor || '#0f2b5c';
  const textCol = custom.textColor || '#111827';
  const isSerif = custom.fontFamily === 'serif';
  const fontClass = isSerif ? 'font-cv-serif' : 'font-cv-sans';

  const personName = resume?.personalInfo?.fullName?.trim() || 'Dr. Elena Rostova';
  const jobTitle =
    resume?.personalInfo?.jobTitle?.trim() || 'Senior Machine Learning Scientist';
  const email = resume?.personalInfo?.email?.trim() || 'elena.rostova@university.edu';
  const phone = resume?.personalInfo?.phone?.trim() || '+1 (650) 555-0192';
  const location =
    [resume?.personalInfo?.city, resume?.personalInfo?.country]
      .filter(Boolean)
      .join(', ') || 'Stanford, CA';

  const visibleSections: ResumeSectionKey[] = resume
    ? getOrderedVisibleSections(resume, template).slice(0, 6)
    : template.sectionOrder.slice(0, 6);

  const sidebarSet = new Set<ResumeSectionKey>(template.sidebarSections || []);
  const sidebarKeys = visibleSections.filter((s) => sidebarSet.has(s)).slice(0, 3);
  const mainKeys = visibleSections.filter((s) => !sidebarSet.has(s)).slice(0, 4);

  const expItems = (resume?.experience || []).slice(0, 2);
  const eduItems = (resume?.education || []).slice(0, 2);
  const pubItems = (resume?.publications || []).slice(0, 2);
  const skillCats = getVisibleSkills(resume?.skills).slice(0, 3);

  const renderHeading = (key: ResumeSectionKey, inverted = false) => {
    const label = getSectionDisplayTitle(key, template.id);
    const col = inverted ? '#ffffff' : accent === '#000000' ? textCol : accent;

    if (custom.headingStyle === 'filled-band' && !inverted) {
      return (
        <div
          className="text-[6.2px] font-bold uppercase tracking-wider px-1 py-[1.5px] mb-1 rounded-[1px]"
          style={{
            backgroundColor: hexToLightSolidBg(accent, 0.88),
            color: accent === '#000000' ? '#111827' : accent,
            borderLeft: `2px solid ${accent}`,
          }}
        >
          {label}
        </div>
      );
    }

    if (custom.headingStyle === 'left-accent' && !inverted) {
      return (
        <div
          className="text-[6.2px] font-bold uppercase tracking-wider pl-1 mb-1"
          style={{
            borderLeft: `2px solid ${accent}`,
            color: col,
          }}
        >
          {label}
        </div>
      );
    }

    if (custom.headingStyle === 'italic-serif') {
      return (
        <div
          className="text-[6.6px] font-bold italic mb-1 pb-[1px]"
          style={{
            color: col,
            borderBottom: `0.5px solid ${inverted ? 'rgba(255,255,255,0.4)' : '#94a3b8'}`,
          }}
        >
          {label}
        </div>
      );
    }

    if (custom.headingStyle === 'clean-caps') {
      return (
        <div
          className="text-[6.2px] font-bold uppercase tracking-[0.09em] mb-1"
          style={{ color: col }}
        >
          {label}
        </div>
      );
    }

    if (custom.headingStyle === 'classic-blue-rule' && !inverted) {
      return (
        <div className="mb-1">
          <div className="flex items-center gap-1">
            <span
              className="inline-block w-2.5 h-[3px] shrink-0"
              style={{ backgroundColor: accent }}
            />
            <span
              className="text-[6.2px] font-bold uppercase tracking-[0.06em]"
              style={{ color: accent }}
            >
              {label}
            </span>
          </div>
          <div className="h-[0.75px] mt-[1px]" style={{ backgroundColor: accent }} />
        </div>
      );
    }

    if (custom.headingStyle === 'burgundy-gold-rule' && !inverted) {
      return (
        <div className="mb-1">
          <div
            className="text-[6.2px] font-bold uppercase tracking-[0.04em]"
            style={{ color: accent }}
          >
            {label}
          </div>
          <div className="h-[1px] mt-[1px]" style={{ backgroundColor: '#e5c57a' }} />
        </div>
      );
    }

    if (custom.headingStyle === 'title-rule') {
      return (
        <div
          className={`text-[6.8px] mb-1 pb-[1px] ${
            template.centeredHeadings ? 'text-center font-bold' : 'font-medium'
          }`}
          style={{
            color: col,
            borderBottom: `0.65px solid ${inverted ? 'rgba(255,255,255,0.5)' : col}`,
          }}
        >
          {label}
        </div>
      );
    }

    if (custom.headingStyle === 'moderncv-bar') {
      return (
        <div className="flex items-center gap-1 mb-1">
          <div className="w-[19%] flex justify-end shrink-0">
            <div className="w-full h-[2.5px]" style={{ backgroundColor: accent }} />
          </div>
          <div className="text-[6.2px] font-normal truncate" style={{ color: accent }}>
            {label}
          </div>
        </div>
      );
    }

    return (
      <div
        className={`text-[6.2px] font-bold uppercase tracking-[0.08em] mb-1 pb-[1px] ${
          template.centeredHeadings ? 'text-center' : ''
        }`}
        style={{
          color: col,
          borderBottom: `0.75px solid ${inverted ? 'rgba(255,255,255,0.5)' : accent}`,
        }}
      >
        {label}
      </div>
    );
  };

  const renderSectionPreview = (key: ResumeSectionKey, inverted = false) => {
    const bodyCol = inverted ? 'rgba(255,255,255,0.88)' : textCol;
    const mutedCol = inverted ? 'rgba(255,255,255,0.72)' : '#475569';

    switch (key) {
      case 'objective':
        return (
          <p className="text-[5.2px] leading-[1.35] line-clamp-2" style={{ color: bodyCol }}>
            {resume?.objective?.trim() ||
              'Researcher & engineer building scalable systems, peer-reviewed ML architectures, and high-reliability production pipelines.'}
          </p>
        );
      case 'experience':
        return (
          <div className="space-y-1">
            {(expItems.length > 0
              ? expItems
              : [
                  {
                    id: 'd1',
                    company: 'Apex AI Research Lab',
                    position: 'Senior Research Engineer',
                    startDate: '2022',
                    endDate: 'Present',
                    current: true,
                    highlights: ['Led distributed training pipeline reducing latency by 38%.'],
                  },
                  {
                    id: 'd2',
                    company: 'Vertex Systems',
                    position: 'Software Engineer',
                    startDate: '2019',
                    endDate: '2022',
                    current: false,
                    highlights: ['Architected telemetry ingestion across 40+ services.'],
                  },
                ]
            ).map((exp) => (
              <div key={exp.id}>
                <div className="flex justify-between items-baseline gap-1">
                  <span className="text-[5.5px] font-bold truncate" style={{ color: bodyCol }}>
                    {exp.company || 'Organization'}
                  </span>
                  <span className="text-[4.8px] shrink-0" style={{ color: mutedCol }}>
                    {exp.startDate} – {exp.current ? 'Present' : exp.endDate}
                  </span>
                </div>
                <div className="text-[5px] italic truncate" style={{ color: mutedCol }}>
                  {exp.position}
                </div>
                {exp.highlights?.[0] && (
                  <div className="text-[4.8px] truncate pl-1" style={{ color: bodyCol }}>
                    {template.bulletSymbol} {exp.highlights[0]}
                  </div>
                )}
              </div>
            ))}
          </div>
        );
      case 'education':
        return (
          <div className="space-y-0.5">
            {(eduItems.length > 0
              ? eduItems
              : [
                  {
                    id: 'e1',
                    institution: 'Stanford University',
                    degree: 'Ph.D. Computer Science',
                    startDate: '2015',
                    endDate: '2019',
                    current: false,
                  },
                ]
            ).map((edu) => (
              <div key={edu.id}>
                <div className="flex justify-between items-baseline gap-1">
                  <span className="text-[5.5px] font-bold truncate" style={{ color: bodyCol }}>
                    {edu.institution}
                  </span>
                  <span className="text-[4.6px] shrink-0" style={{ color: mutedCol }}>
                    {edu.endDate}
                  </span>
                </div>
                <div className="text-[5px] italic truncate" style={{ color: mutedCol }}>
                  {edu.degree}
                </div>
              </div>
            ))}
          </div>
        );
      case 'publications':
        return (
          <div className="space-y-0.5">
            {(pubItems.length > 0
              ? pubItems
              : [
                  {
                    id: 'p1',
                    authors: 'E. Rostova et al.',
                    year: '2024',
                    title: 'Efficient Transformer Sparse Attention at Scale.',
                    journalOrConference: 'NeurIPS',
                  },
                ]
            ).map((p, idx) => (
              <div key={p.id} className="text-[4.9px] leading-[1.3] line-clamp-2" style={{ color: bodyCol }}>
                {template.citationStyle === 'bracketed' ? `[${idx + 1}] ` : `${idx + 1}. `}
                <span className="font-semibold">{p.authors}</span> ({p.year}). "{p.title}"
              </div>
            ))}
          </div>
        );
      case 'skills':
        if (template.id === 'harvard-style') {
          const harvardRows = resume
            ? getHarvardSkillsAndInterests(resume).rows.slice(0, 3)
            : [
                { key: 'sk', label: 'Technical', text: 'Python, R, SQL, Stata, Excel' },
                { key: 'la', label: 'Languages', text: 'English (Native), French (Advanced)' },
                { key: 'in', label: 'Interests', text: 'Economic History, Rowing' },
              ];
          return (
            <div className="space-y-0.5">
              {harvardRows.map((row) => (
                <div key={row.key} className="text-[4.8px] truncate" style={{ color: bodyCol }}>
                  <span className="font-bold">{row.label}: </span>
                  <span>{row.text}</span>
                </div>
              ))}
            </div>
          );
        }
        if (template.skillsLayout === 'grid-2col' && !inverted) {
          const pairs = (skillCats.length > 0
            ? skillCats
            : [
                { id: 's1', category: 'Languages', skills: ['Python', 'TypeScript', 'C++'] },
                { id: 's2', category: 'Systems', skills: ['PyTorch', 'React', 'Kubernetes'] },
              ]
          ).slice(0, 2);
          return (
            <div className="grid grid-cols-2 gap-1.5">
              {pairs.map((cat) => (
                <div key={cat.id} className="text-[4.9px] leading-[1.3]" style={{ color: bodyCol }}>
                  <span className="font-bold">{cat.category}: </span>
                  <span>{cat.skills.slice(0, 3).join(', ')}</span>
                </div>
              ))}
            </div>
          );
        }
        return (
          <div className="space-y-0.5">
            {(skillCats.length > 0
              ? skillCats
              : [
                  { id: 's1', category: 'Languages', skills: ['Python', 'TypeScript', 'C++'] },
                  { id: 's2', category: 'Systems', skills: ['PyTorch', 'React', 'SQL'] },
                ]
            )
              .slice(0, 2)
              .map((cat) => (
                <div key={cat.id} className="text-[4.9px] truncate" style={{ color: bodyCol }}>
                  <span className="font-bold">{cat.category}: </span>
                  <span>{cat.skills.slice(0, 4).join(', ')}</span>
                </div>
              ))}
          </div>
        );
      case 'coursework': {
        const courses = (resume?.coursework && resume.coursework.length > 0
          ? resume.coursework
          : ['Data Structures', 'Algorithms', 'Computer Architecture', 'Database Management']
        ).slice(0, 4);
        return (
          <div className="grid grid-cols-2 gap-x-2 gap-y-0.5 pl-1">
            {courses.map((c, idx) => (
              <div key={idx} className="text-[4.6px] truncate" style={{ color: bodyCol }}>
                {template.bulletSymbol} {c}
              </div>
            ))}
          </div>
        );
      }
      case 'projects': {
        const projs = (resume?.projects && resume.projects.length > 0
          ? resume.projects
          : [
              {
                id: 'jp1',
                title: 'Gym Reservation Bot',
                technologies: ['Python', 'Selenium'],
                startDate: 'January 2021',
                highlights: ['Automated reservation workflow using Selenium & Cloud cron.'],
              },
            ]
        ).slice(0, 2);
        return (
          <div className="space-y-1">
            {projs.map((proj) => (
              <div key={proj.id}>
                <div className="flex justify-between items-baseline gap-1">
                  <span className="text-[5px] truncate" style={{ color: bodyCol }}>
                    <span className="font-bold">{proj.title}</span>
                    {proj.technologies?.length ? (
                      <span className="italic"> | {proj.technologies.slice(0, 2).join(', ')}</span>
                    ) : null}
                  </span>
                  <span className="text-[4.5px] font-semibold shrink-0" style={{ color: bodyCol }}>
                    {proj.startDate}
                  </span>
                </div>
                {proj.highlights?.[0] && (
                  <div className="text-[4.6px] truncate pl-1" style={{ color: bodyCol }}>
                    {template.bulletSymbol} {proj.highlights[0]}
                  </div>
                )}
              </div>
            ))}
          </div>
        );
      }
      case 'thesis':
        return (
          <div className="text-[4.8px] leading-[1.3]" style={{ color: bodyCol }}>
            <div className="font-bold truncate">
              {resume?.thesis?.title || 'Zero-Trust Service Mesh Authorization'}
            </div>
            <div className="italic truncate" style={{ color: mutedCol }}>
              {resume?.thesis?.supervisors || 'Supervisors: Prof. Dr. H. Richter'}
            </div>
          </div>
        );
      case 'philosophy':
        return (
          <div className="text-[4.8px] italic leading-[1.3]" style={{ color: accent }}>
            &ldquo;{resume?.personalQuote?.trim() || 'Clarity in architecture turns research into impact.'}&rdquo;
          </div>
        );
      case 'strengths': {
        const items = (resume?.strengths && resume.strengths.length > 0
          ? resume.strengths
          : ['Hard-working', 'Eye for detail', 'Embedded Systems']
        ).slice(0, 4);
        return (
          <div className="flex flex-wrap gap-0.5">
            {items.map((st, idx) => (
              <span
                key={idx}
                className="text-[4.2px] px-1 py-[0.5px] rounded-[1.5px] border border-slate-300 text-slate-700"
              >
                {st}
              </span>
            ))}
          </div>
        );
      }
      case 'daily-life':
        return (
          <div className="flex items-center justify-center py-0.5">
            <svg width="26" height="26" viewBox="0 0 32 32" aria-hidden="true">
              <circle cx="16" cy="16" r="10" fill="none" stroke="#e3b5b7" strokeWidth="6" />
              <circle cx="16" cy="16" r="10" fill="none" stroke="#8f131b" strokeWidth="6" strokeDasharray="24 40" strokeDashoffset="0" />
              <circle cx="16" cy="16" r="10" fill="none" stroke="#560b10" strokeWidth="6" strokeDasharray="12 52" strokeDashoffset="-24" />
              <circle cx="16" cy="16" r="10" fill="none" stroke="#b4434a" strokeWidth="6" strokeDasharray="14 50" strokeDashoffset="-36" />
            </svg>
          </div>
        );
      case 'achievements': {
        const items = (resume?.achievements && resume.achievements.length > 0
          ? resume.achievements
          : [{ id: 'a1', title: 'Best Paper Award', issuer: 'ACM', date: '2023', description: 'Systems conference honor' }]
        ).slice(0, 2);
        return (
          <div className="space-y-0.5">
            {items.map((a) => (
              <div key={a.id} className="text-[4.6px] leading-[1.25]">
                <div className="font-bold truncate" style={{ color: bodyCol }}>{a.title}</div>
                {a.description && (
                  <div className="truncate" style={{ color: mutedCol }}>{a.description}</div>
                )}
              </div>
            ))}
          </div>
        );
      }
      case 'languages': {
        const langs = (resume?.languages && resume.languages.length > 0
          ? resume.languages
          : [
              { id: 'l1', language: 'English', proficiency: 'Native' },
              { id: 'l2', language: 'Spanish', proficiency: 'Advanced' },
            ]
        ).slice(0, 3);
        const isTwoColPro = template.id === 'two-column-professional';
        return (
          <div className="space-y-0.5">
            {langs.map((l) => (
              <div key={l.id} className="flex justify-between items-center text-[4.8px]" style={{ color: bodyCol }}>
                <span className="font-semibold">{l.language}</span>
                {isTwoColPro ? (
                  <span className="flex items-center gap-[1.5px]">
                    {[1, 2, 3, 4, 5].map((dot) => (
                      <span
                        key={dot}
                        className="inline-block w-[3.5px] h-[3.5px] rounded-full"
                        style={{
                          backgroundColor: dot <= 4 ? accent : '#d1d5db',
                        }}
                      />
                    ))}
                  </span>
                ) : (
                  <span style={{ color: mutedCol }}>{l.proficiency}</span>
                )}
              </div>
            ))}
          </div>
        );
      }
      case 'skill-matrix': {
        const rows = (resume?.skillMatrix && resume.skillMatrix.length > 0
          ? resume.skillMatrix
          : [
              { id: 'm1', category: 'Cloud', skill: 'Kubernetes', level: 5 },
              { id: 'm2', category: 'Code', skill: 'Go / Python', level: 4 },
            ]
        ).slice(0, 3);
        return (
          <div className="space-y-0.5">
            {rows.map((m) => (
              <div key={m.id} className="flex items-center justify-between gap-1 text-[4.7px]" style={{ color: bodyCol }}>
                <span className="truncate">{m.skill}</span>
                <span className="flex items-center gap-[1.5px] shrink-0">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <span
                      key={n}
                      className="inline-block w-[3.5px] h-[3.5px] border"
                      style={{
                        borderColor: accent,
                        backgroundColor: m.level && n <= m.level ? accent : 'transparent',
                      }}
                    />
                  ))}
                </span>
              </div>
            ))}
          </div>
        );
      }
      case 'leadership': {
        const leads = (resume?.leadership && resume.leadership.length > 0
          ? resume.leadership
          : [
              {
                id: 'hl1',
                organization: 'Harvard Undergraduate Consulting Group',
                location: 'Cambridge, MA',
                role: 'Vice President',
                startDate: '2023',
                endDate: 'Present',
                current: true,
                highlights: ['Directed student consulting teams for regional nonprofits.'],
              },
            ]
        ).slice(0, 2);
        return (
          <div className="space-y-0.5">
            {leads.map((l) => (
              <div key={l.id}>
                <div className="flex justify-between items-baseline gap-1">
                  <span className="text-[5.2px] font-bold truncate" style={{ color: bodyCol }}>
                    {l.organization}
                  </span>
                  <span className="text-[4.6px] shrink-0" style={{ color: mutedCol }}>
                    {l.location || l.endDate}
                  </span>
                </div>
                <div className="text-[4.8px] italic truncate" style={{ color: mutedCol }}>
                  {l.role}
                </div>
              </div>
            ))}
          </div>
        );
      }
      case 'additional': {
        if (template.id === 'harvard-style') {
          return (
            <div className="space-y-0.5 text-[4.6px] leading-[1.3]" style={{ color: bodyCol }}>
              <div className="truncate">
                <span className="font-bold">Awards &amp; Honors: </span>
                <span>Thomas Temple Hoopes Prize Nominee</span>
              </div>
            </div>
          );
        }
        if (template.id === 'software-developer') {
          return (
            <div className="space-y-0.5 text-[4.5px] leading-[1.3]" style={{ color: bodyCol }}>
              <div className="truncate">
                <span className="font-bold">Relevant Coursework: </span>
                <span>Algorithms, Distributed Systems, Databases</span>
              </div>
              <div className="truncate">
                <span className="font-bold">Programming Languages: </span>
                <span>TypeScript, Go, Python, Java, SQL</span>
              </div>
              <div className="truncate">
                <span className="font-bold">Developer Tools: </span>
                <span>Git, Docker, Kubernetes, Linux</span>
              </div>
              <div className="truncate">
                <span className="font-bold">Technologies &amp; Frameworks: </span>
                <span>React, Node.js, PostgreSQL, Redis</span>
              </div>
            </div>
          );
        }
        return (
          <div className="space-y-0.5">
            <div className="h-[4px] w-4/5 rounded-xs" style={{ backgroundColor: inverted ? 'rgba(255,255,255,0.3)' : '#cbd5e1' }} />
            <div className="h-[4px] w-3/5 rounded-xs" style={{ backgroundColor: inverted ? 'rgba(255,255,255,0.2)' : '#e2e8f0' }} />
          </div>
        );
      }
      default:
        return (
          <div className="space-y-0.5">
            <div className="h-[4px] w-4/5 rounded-xs" style={{ backgroundColor: inverted ? 'rgba(255,255,255,0.3)' : '#cbd5e1' }} />
            <div className="h-[4px] w-3/5 rounded-xs" style={{ backgroundColor: inverted ? 'rgba(255,255,255,0.2)' : '#e2e8f0' }} />
          </div>
        );
    }
  };

  const renderHeaderBlock = () => {
    switch (template.headerVariant) {
      case 'classic-header': {
        const photoUrl = resume?.personalInfo?.photoUrl;
        return (
          <div className="pb-1.5 mb-2 flex items-start justify-between gap-2" style={{ borderBottom: `1.2px solid ${accent}` }}>
            <div className="min-w-0 flex-1">
              <div className="text-[9.2px] font-bold leading-tight truncate" style={{ color: accent }}>
                {personName}
              </div>
              <div className="text-[5.2px] font-medium truncate mt-0.5" style={{ color: '#475569' }}>
                {jobTitle}
              </div>
              <div className="text-[4.4px] mt-1 leading-[1.3] truncate" style={{ color: textCol }}>
                {location} · {phone} · {email}
              </div>
            </div>
            {photoUrl ? (
              <img
                src={photoUrl}
                alt=""
                className="w-6 h-7 object-cover border shrink-0"
                style={{ borderColor: accent }}
              />
            ) : (
              <div
                className="w-6 h-7 border flex items-center justify-center text-[4px] font-semibold shrink-0"
                style={{ borderColor: '#cbd5e1', color: '#94a3b8', backgroundColor: '#f8fafc' }}
              >
                CV
              </div>
            )}
          </div>
        );
      }
      case 'jakes-centered': {
        const addr =
          [
            resume?.personalInfo?.streetAddress,
            resume?.personalInfo?.city,
            [resume?.personalInfo?.state, resume?.personalInfo?.postalCode].filter(Boolean).join(' '),
          ]
            .filter(Boolean)
            .join(', ') || '123 Street Name, Town, State 12345';
        return (
          <div className="text-center pb-1 mb-1.5">
            <div
              className="text-[10px] uppercase tracking-[0.04em] leading-tight truncate"
              style={{ color: textCol }}
            >
              {personName}
            </div>
            <div className="text-[4.5px] mt-0.5 truncate" style={{ color: textCol }}>
              {addr}
            </div>
            <div className="text-[4.3px] mt-0.5 truncate underline" style={{ color: textCol }}>
              {phone} · {email} · linkedin.com/in/...
            </div>
          </div>
        );
      }
      case 'software-dev-centered': {
        const addr =
          [
            resume?.personalInfo?.streetAddress,
            resume?.personalInfo?.city,
            [resume?.personalInfo?.state, resume?.personalInfo?.postalCode].filter(Boolean).join(' '),
          ]
            .filter(Boolean)
            .join(', ') || '742 Evergreen Terrace, Seattle, WA 98101';
        const ghHandle =
          resume?.personalInfo?.github
            ?.trim()
            .replace(/^https?:\/\/(www\.)?github\.com\//i, 'github.com/')
            .replace(/\/$/, '') || 'github.com/ryancaldwell';
        const liHandle =
          resume?.personalInfo?.linkedin
            ?.trim()
            .replace(/^https?:\/\/(www\.)?linkedin\.com\/in\//i, 'linkedin.com/in/')
            .replace(/\/$/, '') || 'linkedin.com/in/ryancaldwell';
        return (
          <div className="text-center pb-1 mb-1.5">
            <div
              className="text-[10px] font-bold tracking-[0.02em] leading-tight truncate"
              style={{ color: accent }}
            >
              {personName}
            </div>
            <div className="text-[4.5px] mt-0.5 truncate" style={{ color: textCol }}>
              {addr}
            </div>
            <div className="text-[4.2px] mt-0.5 truncate" style={{ color: accent }}>
              {phone} · {email} · {ghHandle} · {liHandle}
            </div>
          </div>
        );
      }
      case 'harvard-centered': {
        const contactItems = resume?.personalInfo
          ? buildHarvardContactItems(resume.personalInfo).slice(0, 4).map((i) => i.label)
          : ['Cambridge, MA', email, phone];
        return (
          <div className="text-center pb-1 mb-1.5" style={{ borderBottom: `0.75px solid ${textCol}` }}>
            <div
              className="text-[9.5px] font-bold leading-tight truncate"
              style={{ color: textCol }}
            >
              {personName}
            </div>
            <div className="text-[4.3px] mt-0.5 truncate" style={{ color: textCol }}>
              {contactItems.join(' · ')}
            </div>
          </div>
        );
      }
      case 'corporate-banner':
        return (
          <div
            className="-mx-3 -mt-3 px-3 py-2 mb-2 text-white"
            style={{ backgroundColor: accent === '#000000' ? '#0f2b5c' : accent }}
          >
            <div className="text-[9.5px] font-bold tracking-tight leading-tight truncate">
              {personName}
            </div>
            <div className="text-[5.5px] uppercase tracking-wider opacity-90 truncate">
              {jobTitle}
            </div>
            <div className="text-[4.6px] opacity-85 mt-0.5 truncate">
              {email} · {phone} · {location}
            </div>
          </div>
        );

      case 'split-left-right':
        return (
          <div
            className="flex justify-between items-end pb-1.5 mb-2"
            style={{ borderBottom: `1.5px solid ${accent}` }}
          >
            <div className="min-w-0 pr-2">
              <div className="text-[9px] font-bold leading-tight truncate" style={{ color: textCol }}>
                {personName}
              </div>
              <div className="text-[5.5px] font-semibold truncate" style={{ color: accent }}>
                {jobTitle}
              </div>
            </div>
            <div className="text-right text-[4.5px] leading-[1.3] shrink-0" style={{ color: '#475569' }}>
              <div>{email}</div>
              <div>{location}</div>
            </div>
          </div>
        );

      case 'editorial-double-rule':
        return (
          <div
            className="text-center py-1.5 mb-2"
            style={{
              borderTop: `1.5px solid ${accent}`,
              borderBottom: `1px solid ${accent}`,
            }}
          >
            <div className="text-[9.5px] font-bold tracking-wide truncate" style={{ color: textCol }}>
              {personName}
            </div>
            <div className="text-[5.3px] italic mt-0.5 truncate" style={{ color: accent }}>
              {jobTitle}
            </div>
            <div className="text-[4.6px] mt-0.5 truncate" style={{ color: '#475569' }}>
              {email} • {location}
            </div>
          </div>
        );

      case 'boxed-technical':
        return (
          <div
            className="p-1.5 mb-2"
            style={{
              border: `1px solid ${accent}`,
              backgroundColor: hexToLightSolidBg(accent, 0.94),
            }}
          >
            <div className="flex justify-between items-baseline">
              <span className="text-[8.8px] font-bold truncate" style={{ color: textCol }}>
                {personName}
              </span>
              <span className="text-[4.8px] font-semibold shrink-0" style={{ color: accent }}>
                {location}
              </span>
            </div>
            <div className="text-[5.2px] truncate" style={{ color: '#334155' }}>
              {jobTitle} | {email}
            </div>
          </div>
        );

      case 'minimal-accent-bar':
      case 'left-scholar':
        return (
          <div className="mb-2">
            <div className="text-[9.5px] font-bold leading-tight truncate" style={{ color: textCol }}>
              {personName}
            </div>
            <div className="text-[5.4px] font-medium truncate" style={{ color: accent }}>
              {jobTitle}
            </div>
            <div className="w-6 h-[1.5px] my-1" style={{ backgroundColor: accent }} />
            <div className="text-[4.6px] truncate" style={{ color: '#475569' }}>
              {email} · {phone} · {location}
            </div>
          </div>
        );

      case 'executive-framed':
        return (
          <div className="text-center pb-1.5 mb-2" style={{ borderBottom: `1px solid ${accent}` }}>
            <div className="text-[9.5px] font-bold uppercase tracking-wider truncate" style={{ color: textCol }}>
              {personName}
            </div>
            <div className="text-[5.2px] uppercase tracking-widest mt-0.5 truncate" style={{ color: accent }}>
              {jobTitle}
            </div>
            <div className="text-[4.5px] mt-0.5 truncate" style={{ color: '#475569' }}>
              {email} · {location}
            </div>
          </div>
        );

      case 'centered-clean':
        return (
          <div className="text-center pb-1.5 mb-2" style={{ borderBottom: `0.75px solid #cbd5e1` }}>
            <div className="text-[9.5px] font-bold tracking-tight truncate" style={{ color: textCol }}>
              {personName}
            </div>
            <div className="text-[4.7px] mt-0.5 truncate" style={{ color: '#475569' }}>
              {phone} | {email} | {location}
            </div>
          </div>
        );

      case 'centered-academic':
      default:
        return (
          <div
            className="text-center pb-1.5 mb-2"
            style={{ borderBottom: `1.5px solid ${accent}` }}
          >
            <div className="text-[9px] font-bold uppercase tracking-[0.1em] truncate" style={{ color: textCol }}>
              {personName}
            </div>
            <div className="text-[5.2px] font-bold uppercase tracking-wide mt-0.5 truncate" style={{ color: textCol }}>
              {jobTitle}
            </div>
            <div className="text-[4.5px] mt-0.5 truncate" style={{ color: '#334155' }}>
              {email} • {phone} • {location}
            </div>
          </div>
        );
    }
  };

  if (template.id === 'fresher-resume' || template.headerVariant === 'fresher-overleaf') {
    const headerCols = resume?.personalInfo
      ? buildFresherHeaderColumns(resume.personalInfo)
      : {
          left: [{ label: phone }, { label: email }],
          right: [
            { label: 'LinkedIn' },
            { label: 'Website' },
            { label: 'GitHub' },
          ],
        };
    const keywords = (resume?.strengths || []).filter(Boolean).slice(0, 4);
    const impactText = resume?.objective?.trim() || '';
    const hiddenSet = new Set(resume?.hiddenSections || []);
    const projItems = (resume?.projects || []).slice(0, 2);

    return (
      <div
        aria-hidden="true"
        className={`w-full aspect-[210/297] bg-white overflow-hidden select-none p-2.5 flex flex-col justify-between ${fontClass}`}
      >
        <div>
          {/* 3-Column Overleaf Header */}
          <div
            className="grid grid-cols-[minmax(0,0.88fr)_minmax(0,1.38fr)_minmax(0,0.88fr)] items-end gap-1.5 pb-1 mb-1"
            style={{ borderBottom: '0.6px solid #334155' }}
          >
            <div className="text-[3.4px] leading-[1.3] text-[#111827] min-w-0 overflow-hidden">
              {headerCols.left.slice(0, 3).map((item, idx) => (
                <div key={idx} className="truncate">
                  {item.label}
                </div>
              ))}
            </div>
            <div className="text-center min-w-0 overflow-hidden px-0.5">
              <div className="text-[7.8px] font-medium leading-tight text-[#111827] truncate">
                {personName}
              </div>
              <div className="text-[4.4px] leading-tight truncate mt-[1px]" style={{ color: accent }}>
                {jobTitle}
              </div>
            </div>
            <div className="text-right text-[3.4px] leading-[1.3] text-[#111827] min-w-0 overflow-hidden">
              {headerCols.right.slice(0, 3).map((item, idx) => (
                <div key={idx} className="truncate">
                  {item.label}
                </div>
              ))}
            </div>
          </div>

          {/* Keywords & Impact Strip */}
          {!hiddenSet.has('strengths') && keywords.length > 0 && (
            <div className="flex items-center justify-around text-[3.8px] text-[#111827] mb-0.5 truncate">
              {keywords.map((kw, idx) => (
                <span key={idx} className="truncate">
                  • {kw}
                </span>
              ))}
            </div>
          )}
          {!hiddenSet.has('objective') && impactText && (
            <div className="text-[3.8px] leading-[1.25] text-[#111827] line-clamp-2 mb-1">
              <span className="font-bold">Impact: </span>
              <span>{impactText}</span>
            </div>
          )}

          {/* Education */}
          <div className="mb-1">
            {renderHeading('education')}
            {(eduItems.length > 0
              ? eduItems
              : [
                  {
                    id: 'fe1',
                    degree: 'M.S. in Computer Science',
                    institution: 'UC Berkeley',
                    startDate: '2024',
                    endDate: '2026',
                  },
                ]
            ).map((edu) => (
              <div key={edu.id} className="flex justify-between items-baseline gap-1 text-[4px] text-[#111827]">
                <div className="truncate min-w-0">
                  <span className="font-bold">{edu.degree}</span>
                  <span>, {edu.institution}</span>
                </div>
                <span className="font-bold shrink-0 text-[3.8px]">
                  {edu.startDate} — {edu.endDate}
                </span>
              </div>
            ))}
          </div>

          {/* Projects */}
          <div className="mb-1">
            {renderHeading('projects')}
            <div className="space-y-0.5">
              {(projItems.length > 0
                ? projItems
                : [
                    {
                      id: 'fp1',
                      title: 'Distributed Task Queue & Worker Scheduler',
                      startDate: '2025',
                      endDate: '2026',
                      highlights: ['Built reliable job execution with dead-letter retry queues.'],
                    },
                  ]
              ).map((proj) => (
                <div key={proj.id}>
                  <div className="flex justify-between items-baseline gap-1 text-[4.1px] text-[#111827]">
                    <span className="font-bold truncate">{proj.title}</span>
                    <span className="font-bold shrink-0 text-[3.8px]">
                      {proj.startDate}
                      {proj.endDate ? ` — ${proj.endDate}` : ''}
                    </span>
                  </div>
                  {proj.highlights?.[0] && (
                    <div className="text-[3.8px] text-[#111827] truncate pl-1">
                      • {proj.highlights[0]}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Skills (2-column label + values) */}
          <div>
            {renderHeading('skills')}
            <div className="space-y-0.5">
              {(skillCats.length > 0
                ? skillCats
                : [
                    { id: 'fs1', category: 'Languages', skills: ['Python', 'TypeScript', 'C++', 'SQL'] },
                    { id: 'fs2', category: 'Frameworks', skills: ['React', 'Node.js', 'FastAPI'] },
                  ]
              )
                .slice(0, 3)
                .map((cat) => (
                  <div key={cat.id} className="flex items-baseline gap-1 text-[3.9px] text-[#111827]">
                    <span className="w-[32%] font-bold shrink-0 truncate">{cat.category}</span>
                    <span className="flex-1 truncate">{cat.skills.slice(0, 4).join(', ')}</span>
                  </div>
                ))}
            </div>
          </div>
        </div>
        <div className="text-center text-[3.6px] text-slate-400">Overleaf Fresher Resume</div>
      </div>
    );
  }

  if (template.layout === 'moderncv-classic') {
    const thumbPhoto = resume?.personalInfo?.photoUrl;
    const nameParts = personName.trim().split(/\s+/);
    const firstNames = nameParts.length > 1 ? nameParts.slice(0, -1).join(' ') : '';
    const lastName = nameParts[nameParts.length - 1] || personName;

    return (
      <div
        aria-hidden="true"
        className={`w-full aspect-[210/297] bg-white overflow-hidden select-none p-2.5 flex flex-col justify-between ${fontClass}`}
      >
        <div>
          {/* Overleaf ModernCV Classic Split Header */}
          <div className="flex items-start justify-between gap-1.5 mb-2">
            <div className="min-w-0 flex-1 pt-1">
              <div className="text-[10.5px] font-light leading-tight truncate">
                {firstNames && <span className="text-slate-500">{firstNames} </span>}
                <span className="text-[#111827]">{lastName}</span>
              </div>
              <div className="text-[4.8px] italic text-slate-600 truncate mt-0.5">
                {jobTitle}
              </div>
            </div>
            <div className="flex items-start gap-1 shrink-0 max-w-[54%]">
              <div className="text-right text-[3.8px] italic leading-[1.3] text-slate-600">
                <div className="truncate">{location}</div>
                <div className="truncate">{phone}</div>
                <div className="truncate">{email}</div>
              </div>
              {thumbPhoto && (
                <div
                  className="p-[1px] shrink-0"
                  style={{ border: `0.5px solid ${accent}` }}
                >
                  <img src={thumbPhoto} alt="" className="w-6 h-7 object-cover" />
                </div>
              )}
            </div>
          </div>

          <div className="space-y-1.5">
            {/* Education */}
            <div>
              {renderHeading('education')}
              {(eduItems.length > 0
                ? eduItems
                : [
                    {
                      id: 'me1',
                      institution: 'LSE',
                      degree: 'M.Sc. Finance & Economics',
                      startDate: '2015',
                      endDate: '2016',
                    },
                  ]
              )
                .slice(0, 2)
                .map((edu) => (
                  <div key={edu.id} className="flex items-start gap-1 mb-0.5">
                    <div className="w-[19%] text-right text-[4px] text-slate-700 shrink-0 truncate">
                      {edu.startDate}–{edu.endDate}
                    </div>
                    <div className="flex-1 min-w-0 text-[4.3px] leading-[1.25] text-[#111827]">
                      <div className="truncate">
                        <span className="font-bold">{edu.degree}</span>
                        <span>, </span>
                        <span className="italic">{edu.institution}</span>
                      </div>
                    </div>
                  </div>
                ))}
            </div>

            {/* Work Experience */}
            <div>
              {renderHeading('experience')}
              {(expItems.length > 0
                ? expItems
                : [
                    {
                      id: 'mx1',
                      company: 'Meridian Capital',
                      position: 'VP, Corporate Strategy',
                      startDate: '2021',
                      endDate: 'Present',
                      current: true,
                      highlights: ['Directed $2.6B in closed acquisitions across Europe.'],
                    },
                  ]
              )
                .slice(0, 2)
                .map((exp) => (
                  <div key={exp.id} className="flex items-start gap-1 mb-0.5">
                    <div className="w-[19%] text-right text-[4px] text-slate-700 shrink-0 truncate">
                      {exp.startDate}–{exp.current ? 'Present' : exp.endDate}
                    </div>
                    <div className="flex-1 min-w-0 text-[4.3px] leading-[1.25] text-[#111827]">
                      <div className="truncate">
                        <span className="font-bold">{exp.position}</span>
                        <span>, </span>
                        <span className="italic">{exp.company}</span>
                      </div>
                      {exp.highlights?.[0] && (
                        <div className="text-[3.9px] text-slate-700 truncate pl-1">
                          ○ {exp.highlights[0]}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
            </div>

            {/* Technical Skills (2-col rail pairs) */}
            <div>
              {renderHeading('skills')}
              <div className="grid grid-cols-2 gap-1">
                {(skillCats.length > 0
                  ? skillCats
                  : [
                      { id: 'ms1', category: 'Finance', skills: ['DCF', 'LBO', 'M&A'] },
                      { id: 'ms2', category: 'Analytics', skills: ['SQL', 'Python', 'Excel'] },
                    ]
                )
                  .slice(0, 2)
                  .map((cat) => (
                    <div key={cat.id} className="flex items-start gap-1 text-[4px] truncate">
                      <span className="w-[38%] text-right text-slate-700 shrink-0 truncate">
                        {cat.category}
                      </span>
                      <span className="flex-1 text-[#111827] truncate">
                        {cat.skills.slice(0, 3).join(', ')}
                      </span>
                    </div>
                  ))}
              </div>
            </div>
          </div>
        </div>

        <div className="text-center text-[3.8px] text-slate-500">1 / 1</div>
      </div>
    );
  }

  if (template.layout === 'two-column-editorial') {
    const thumbPhoto = resume?.personalInfo?.photoUrl;
    const renderEditorialHeading = (label: string) => (
      <div className="mb-1">
        <div
          className="text-[5.8px] uppercase tracking-[0.08em] font-semibold"
          style={{ color: '#111111' }}
        >
          {label}
        </div>
        <div className="h-[0.65px] mt-[1px]" style={{ backgroundColor: '#1a1a1a' }} />
      </div>
    );

    return (
      <div
        aria-hidden="true"
        className={`w-full aspect-[210/297] bg-white overflow-hidden select-none p-2.5 flex flex-col justify-between ${fontClass}`}
      >
        <div>
          {/* Top Gray Banner Header (#e6e6e6) */}
          <div className="flex items-stretch gap-1.5 mb-2">
            {thumbPhoto && (
              <img
                src={thumbPhoto}
                alt=""
                className="w-8 h-9 object-cover shrink-0 border border-neutral-300"
              />
            )}
            <div
              className="flex-1 min-w-0 px-2 py-1.5 flex justify-between items-start gap-1.5"
              style={{ backgroundColor: '#e6e6e6' }}
            >
              <div className="min-w-0 flex-1">
                <div className="text-[8.6px] font-bold leading-tight truncate text-[#111111]">
                  {personName}
                </div>
                <div className="text-[4.2px] text-[#333333] truncate mt-0.5">{jobTitle}</div>
                {resume?.personalInfo?.nationality && (
                  <div className="text-[4px] text-[#444444] truncate">
                    Nationality: {resume.personalInfo.nationality}
                  </div>
                )}
              </div>
              <div className="text-right text-[4px] leading-[1.3] text-[#222222] shrink-0 max-w-[46%] truncate">
                <div className="truncate">{phone}</div>
                <div className="truncate">{email}</div>
                <div className="truncate">{location}</div>
              </div>
            </div>
          </div>

          {/* Balanced 50/50 2-Column Editorial Grid */}
          <div className="flex items-start gap-2">
            {/* Left Column (50%) - Timeline Sections */}
            <div className="w-[50%] space-y-1.5">
              <div>
                {renderEditorialHeading('Education')}
                <div className="space-y-1">
                  {(eduItems.length > 0
                    ? eduItems
                    : [
                        {
                          id: 'ee1',
                          institution: 'ETH Zurich',
                          degree: 'Ph.D. Computational Linguistics',
                          startDate: '2019',
                          endDate: '2023',
                        },
                      ]
                  ).map((edu) => (
                    <div key={edu.id} className="flex items-stretch">
                      <div className="w-[24%] pr-1 text-right text-[4px] text-[#444444] shrink-0">
                        {edu.startDate}–{edu.endDate}
                      </div>
                      <div className="flex-1 min-w-0 pl-1 border-l border-neutral-500">
                        <div className="text-[4.6px] font-bold truncate text-[#111111]">
                          {edu.degree}
                        </div>
                        <div className="text-[4.1px] uppercase tracking-wider truncate text-[#444444]">
                          {edu.institution}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                {renderEditorialHeading('Experience')}
                <div className="space-y-1">
                  {(expItems.length > 0
                    ? expItems
                    : [
                        {
                          id: 'ex1',
                          company: 'ETH Zurich NLP Lab',
                          position: 'Postdoctoral Fellow',
                          startDate: '2023',
                          endDate: 'Present',
                          current: true,
                          highlights: ['Led European cross-lingual corpus parsing research.'],
                        },
                      ]
                  ).map((exp) => (
                    <div key={exp.id} className="flex items-stretch">
                      <div className="w-[24%] pr-1 text-right text-[4px] text-[#444444] shrink-0">
                        {exp.startDate}–{exp.current ? 'Present' : exp.endDate}
                      </div>
                      <div className="flex-1 min-w-0 pl-1 border-l border-neutral-500">
                        <div className="text-[4.6px] font-bold truncate text-[#111111]">
                          {exp.position}
                        </div>
                        <div className="text-[4.1px] uppercase truncate text-[#444444]">
                          {exp.company}
                        </div>
                        {exp.highlights?.[0] && (
                          <div className="text-[4px] truncate text-[#333333]">
                            {exp.highlights[0]}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Right Column (50%) - Profile, Skills, Publications */}
            <div className="w-[50%] space-y-1.5">
              <div>
                <div className="text-center text-[4.8px] font-bold uppercase tracking-widest text-[#111111] mb-0.5">
                  Profile
                </div>
                <p className="text-[4.2px] leading-[1.32] line-clamp-3 text-[#222222]">
                  {resume?.objective?.trim() ||
                    'Computational linguist and applied scientist advancing interpretable syntactic modeling and multilingual NLP.'}
                </p>
              </div>

              <div>
                {renderEditorialHeading('Skills')}
                <div className="space-y-0.5">
                  {(skillCats.length > 0
                    ? skillCats
                    : [
                        { id: 'es1', category: 'Programming', skills: ['Python', 'PyTorch', 'R', 'LaTeX'] },
                        { id: 'es2', category: 'Research', skills: ['NLP', 'Corpus Analytics'] },
                      ]
                  )
                    .slice(0, 2)
                    .map((cat) => (
                      <div key={cat.id} className="text-[4.3px] truncate text-[#222222]">
                        <span className="font-bold">{cat.category}: </span>
                        <span>{cat.skills.slice(0, 3).join(', ')}</span>
                      </div>
                    ))}
                </div>
              </div>

              <div>
                {renderEditorialHeading('Publications')}
                <div className="space-y-0.5">
                  {(pubItems.length > 0
                    ? pubItems
                    : [
                        {
                          id: 'ep1',
                          year: '2023',
                          title: 'Entropy-Regularized Structural Probes',
                          journalOrConference: 'ACL',
                        },
                      ]
                  )
                    .slice(0, 2)
                    .map((p) => (
                      <div key={p.id} className="flex items-start gap-1 text-[4.1px] text-[#222222]">
                        <span className="font-bold shrink-0">{p.year}</span>
                        <span className="italic truncate">{p.title}</span>
                      </div>
                    ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Muted Footer */}
        <div className="text-center text-[3.8px] text-[#555555] pt-1 border-t border-neutral-200 truncate">
          {personName} · {location} · {email}
        </div>
      </div>
    );
  }

  if (template.layout === 'two-column-internship') {
    const intEdus = resume ? getInternshipEducationEntries(resume).slice(0, 2) : [];
    const intAchs = (resume?.achievements || []).slice(0, 2);
    const intSkills = resume ? getInternshipSkillRows(resume).slice(0, 3) : [];
    const intLearn = resume ? getInternshipLearningItems(resume).slice(0, 2) : [];
    const intInterests = resume
      ? getEffectiveInterests(resume).items.map((i) => i.name).slice(0, 4)
      : ['Arduino', 'Electronics', 'Computers'];
    const intResearch = resume
      ? getInternshipResearchAndProjectEntries(resume).slice(0, 2)
      : [];
    const intCareer = resume
      ? getInternshipCareerInterests(resume).slice(0, 4)
      : ['IoT', 'Systems', 'Cloud Computing'];

    const renderIntHeading = (label: string) => (
      <div
        className="text-[5.2px] font-bold uppercase tracking-tight text-[#111827] pb-[1px] mb-1"
        style={{ borderBottom: '1.2px solid #111827' }}
      >
        {label}
      </div>
    );

    return (
      <div
        aria-hidden="true"
        className="w-full aspect-[210/297] bg-white overflow-hidden select-none p-2.5 flex flex-col font-cv-sans text-[#111827]"
      >
        {/* Top Full-Width Left-Aligned Header */}
        <div className="mb-1.5">
          <div className="text-[9.5px] font-bold uppercase tracking-tight leading-tight truncate text-[#111827]">
            {personName}
          </div>
          <div className="text-[5.2px] font-semibold text-[#374151] truncate mt-[0.5px]">
            {jobTitle}
          </div>
          <div className="text-[3.9px] text-[#374151] truncate mt-[1.5px]">
            @ {email} &nbsp; {phone} &nbsp; {location}
          </div>
        </div>

        {/* Balanced 50 / 50 Two-Column Body */}
        <div className="flex flex-1 min-h-0 gap-2">
          {/* Left Column */}
          <div className="w-[50%] space-y-1.5">
            <div>
              {renderIntHeading('EDUCATION')}
              <div className="space-y-1">
                {(intEdus.length > 0
                  ? intEdus
                  : [
                      {
                        id: 'ie1',
                        heading: 'Computer Science Engineering',
                        institution: 'Institute of Engineering',
                        dateRange: '2022 – Present',
                        location,
                        subDetails: ['B.Tech Computer Science'],
                      },
                    ]
                ).map((ed, idx, arr) => (
                  <div
                    key={ed.id}
                    className="pb-0.5"
                    style={{
                      borderBottom:
                        idx < arr.length - 1 ? '0.6px dotted #9ca3af' : 'none',
                    }}
                  >
                    <div className="text-[4.6px] font-bold truncate">{ed.heading}</div>
                    <div className="text-[4.2px] font-semibold text-[#374151] truncate">
                      {ed.institution}
                    </div>
                    <div className="text-[3.8px] text-[#4b5563] truncate">
                      {ed.dateRange} {ed.location ? `· ${ed.location}` : ''}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div>
              {renderIntHeading('CO-CURRICULAR/ EVENTS')}
              <div className="space-y-1">
                {(intAchs.length > 0
                  ? intAchs
                  : [
                      {
                        id: 'ia1',
                        title: 'National Hackathon',
                        description: 'Selected for finalist showcase round.',
                      },
                    ]
                ).map((a) => (
                  <div key={a.id}>
                    <div className="text-[4.5px] font-bold truncate">{a.title}</div>
                    <div className="text-[3.8px] text-[#374151] line-clamp-2 leading-[1.25]">
                      {a.description}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div>
              {renderIntHeading('SKILLS')}
              <div className="space-y-0.5">
                {(intSkills.length > 0
                  ? intSkills
                  : [
                      { id: 'is1', label: 'C, C++, Windows', proficiency: 5 as const },
                      { id: 'is2', label: 'Java, Linux, LaTeX', proficiency: 4 as const },
                    ]
                ).map((sk, idx, arr) => (
                  <div
                    key={sk.id}
                    className="flex items-center justify-between py-[1px]"
                    style={{
                      borderBottom:
                        idx < arr.length - 1 ? '0.6px dotted #9ca3af' : 'none',
                    }}
                  >
                    <span className="text-[4.2px] font-bold truncate pr-1">
                      {sk.label}
                    </span>
                    {sk.proficiency ? (
                      <span className="flex items-center gap-[1px] shrink-0">
                        {[1, 2, 3, 4, 5].map((dot) => (
                          <span
                            key={dot}
                            className="inline-block w-[3px] h-[3px] rounded-full"
                            style={{
                              backgroundColor:
                                dot <= (sk.proficiency || 0) ? '#111827' : '#d1d5db',
                            }}
                          />
                        ))}
                      </span>
                    ) : null}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right Column */}
          <div className="w-[50%] space-y-1.5">
            <div>
              {renderIntHeading('LEARNING')}
              <div className="space-y-0.5">
                {(intLearn.length > 0
                  ? intLearn
                  : [
                      { id: 'il1', title: 'Advanced C++ Course', provider: 'Microsoft' },
                      { id: 'il2', title: 'Cyber Security Workshop', provider: 'IBM' },
                    ]
                ).map((l) => (
                  <div key={l.id} className="text-[4px] leading-[1.25] truncate text-[#374151]">
                    – <span className="font-semibold text-[#111827]">{l.title}</span>
                  </div>
                ))}
              </div>
            </div>

            <div>
              {renderIntHeading('INTERESTS')}
              <div className="flex flex-wrap gap-[2px]">
                {intInterests.map((tag, i) => (
                  <span
                    key={i}
                    className="text-[3.8px] px-[2.5px] py-[0.5px] rounded-[1.5px] border border-slate-400 text-[#374151]"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>

            <div>
              {renderIntHeading('RESEARCH WORK')}
              <div className="space-y-1">
                {(intResearch.length > 0
                  ? intResearch
                  : [
                      {
                        id: 'ir1',
                        title: 'Indoor Navigation For All',
                        dateRange: '10/2023 - 02/2024',
                        bullets: ['Beacon-assisted indoor localization prototype.'],
                      },
                    ]
                ).map((r) => (
                  <div key={r.id}>
                    <div className="text-[4.3px] font-bold truncate">
                      {r.title} {r.dateRange ? `(${r.dateRange})` : ''}
                    </div>
                    {r.bullets[0] && (
                      <div className="text-[3.8px] text-[#374151] line-clamp-2 leading-[1.25]">
                        • {r.bullets[0]}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div>
              {renderIntHeading('CAREER INTERESTS')}
              <div className="flex flex-wrap gap-[2px]">
                {intCareer.map((tag, i) => (
                  <span
                    key={i}
                    className="text-[3.8px] px-[2.5px] py-[0.5px] rounded-[1.5px] border border-slate-400 text-[#374151]"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (template.layout === 'main-left-sidebar-right') {
    const thumbPhoto = resume?.personalInfo?.photoUrl;
    const sidebarPreviewKeys: ResumeSectionKey[] = ['philosophy', 'achievements', 'strengths', 'languages', 'education'];
    const mainPreviewKeys: ResumeSectionKey[] = ['experience', 'projects', 'daily-life'];

    return (
      <div
        aria-hidden="true"
        className={`w-full aspect-[210/297] bg-white overflow-hidden select-none p-2.5 flex flex-col ${fontClass}`}
      >
        <div className="flex items-start justify-between gap-2 pb-1.5 mb-1.5">
          <div className="min-w-0 flex-1">
            <div className="text-[9px] font-bold uppercase tracking-tight leading-tight truncate" style={{ color: '#000000' }}>
              {personName}
            </div>
            <div className="text-[5.4px] font-medium truncate mt-0.5" style={{ color: accent }}>
              {jobTitle}
            </div>
            <div className="text-[4.2px] text-slate-600 truncate mt-0.5">
              @ {email} · {phone} · {location}
            </div>
          </div>
          {thumbPhoto ? (
            <div
              className="w-6 h-6 rounded-full p-[1.5px] shrink-0"
              style={{ backgroundColor: '#f3ebd3', border: '0.5px solid #e5c57a' }}
            >
              <img src={thumbPhoto} alt="" className="w-full h-full object-cover rounded-full" />
            </div>
          ) : (
            <div
              className="w-6 h-6 rounded-full flex items-center justify-center shrink-0 text-[4px] font-bold"
              style={{ backgroundColor: '#f3ebd3', border: '0.5px solid #e5c57a', color: accent }}
            >
              CV
            </div>
          )}
        </div>

        <div className="flex flex-1 min-h-0 gap-2">
          <div className="w-[59%] space-y-1.5">
            {mainPreviewKeys.map((k) => (
              <div key={k}>
                {renderHeading(k, false)}
                {renderSectionPreview(k, false)}
              </div>
            ))}
          </div>
          <div className="w-[41%] space-y-1.5">
            {sidebarPreviewKeys.map((k) => (
              <div key={k}>
                {renderHeading(k, false)}
                {renderSectionPreview(k, false)}
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (template.layout === 'sidebar-dark') {
    const sidebarBg = accent === '#000000' ? '#1e293b' : accent;
    return (
      <div
        aria-hidden="true"
        className={`w-full aspect-[210/297] bg-white overflow-hidden select-none flex ${fontClass}`}
      >
        <div
          className="w-[33%] h-full p-2.5 text-white flex flex-col gap-2"
          style={{ backgroundColor: sidebarBg }}
        >
          <div>
            <div className="text-[8.5px] font-bold leading-tight">{personName}</div>
            <div className="text-[5px] opacity-85 mt-0.5">{jobTitle}</div>
            <div className="text-[4.3px] opacity-75 mt-1 space-y-[1px] break-all">
              <div>{email}</div>
              <div>{location}</div>
            </div>
          </div>
          {sidebarKeys.map((k) => (
            <div key={k}>
              {renderHeading(k, true)}
              {renderSectionPreview(k, true)}
            </div>
          ))}
        </div>
        <div className="w-[67%] h-full p-2.5 space-y-2">
          {mainKeys.map((k) => (
            <div key={k}>
              {renderHeading(k, false)}
              {renderSectionPreview(k, false)}
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (template.layout === 'sidebar-light') {
    const lightTint = hexToLightSolidBg(accent, 0.92);
    return (
      <div
        aria-hidden="true"
        className={`w-full aspect-[210/297] bg-white overflow-hidden select-none flex flex-col ${fontClass}`}
      >
        <div className="px-3 pt-2.5 pb-1.5 border-b" style={{ borderColor: '#e2e8f0' }}>
          <div className="text-[9.5px] font-bold leading-tight truncate" style={{ color: textCol }}>
            {personName}
          </div>
          <div className="text-[5.2px] font-semibold truncate" style={{ color: accent }}>
            {jobTitle} · {email} · {location}
          </div>
        </div>
        <div className="flex flex-1 min-h-0">
          <div className="w-[33%] p-2.5 space-y-2" style={{ backgroundColor: lightTint }}>
            {sidebarKeys.map((k) => (
              <div key={k}>
                {renderHeading(k, false)}
                {renderSectionPreview(k, false)}
              </div>
            ))}
          </div>
          <div className="w-[67%] p-2.5 space-y-2">
            {mainKeys.map((k) => (
              <div key={k}>
                {renderHeading(k, false)}
                {renderSectionPreview(k, false)}
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (template.layout === 'asymmetric-labels') {
    return (
      <div
        aria-hidden="true"
        className={`w-full aspect-[210/297] bg-white overflow-hidden select-none p-3 ${fontClass}`}
      >
        {renderHeaderBlock()}
        <div className="space-y-2 mt-1">
          {visibleSections.slice(0, 4).map((k) => (
            <div key={k} className="flex items-start gap-2">
              <div
                className="w-[28%] shrink-0 pr-1 text-[4.1px] font-bold uppercase tracking-normal leading-tight pt-[1px]"
                style={{ color: accent }}
              >
                {getSectionDisplayTitle(k, template.id)}
              </div>
              <div className="w-[72%] min-w-0">{renderSectionPreview(k)}</div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div
      aria-hidden="true"
      className={`w-full aspect-[210/297] bg-white overflow-hidden select-none p-3 ${fontClass}`}
    >
      {renderHeaderBlock()}
      <div className="space-y-2">
        {visibleSections.slice(0, 4).map((k) => (
          <div key={k}>
            {renderHeading(k)}
            {renderSectionPreview(k)}
          </div>
        ))}
      </div>
    </div>
  );
};
