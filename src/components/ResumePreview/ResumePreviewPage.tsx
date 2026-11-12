import React, { useState } from 'react';
import {
  Printer,
  Download,
  ArrowLeft,
  Edit3,
  Check,
  Type,
  FileText,
} from 'lucide-react';
import type { Resume, CvFontFamily, PublicationItem } from '../../types/resume';
import { saveResume } from '../../services/resumeService';

interface ResumePreviewPageProps {
  resume: Resume;
  onEdit: () => void;
  onBackToDashboard: () => void;
}

export const ResumePreviewPage: React.FC<ResumePreviewPageProps> = ({
  resume: initialResume,
  onEdit,
  onBackToDashboard,
}) => {
  const [currentResume, setCurrentResume] = useState<Resume>(initialResume);
  const [fontFamily, setFontFamily] = useState<CvFontFamily>(
    initialResume.fontFamily || 'serif'
  );

  const handleFontChange = async (font: CvFontFamily) => {
    setFontFamily(font);
    const updated = { ...currentResume, fontFamily: font };
    setCurrentResume(updated);
    try {
      await saveResume(updated.userId, updated);
    } catch (e) {
      console.error('Failed to save font preference', e);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const {
    personalInfo = {
      fullName: '',
      email: '',
      phone: '',
    },
    objective = '',
    education = [],
    experience = [],
    projects = [],
    publications = [],
    skills = [],
    achievements = [],
    leadership = [],
    volunteer = [],
    memberships = [],
    certifications = [],
    languages = [],
    interests = '',
    references = [],
    hiddenSections = [],
  } = currentResume;

  const isHidden = (sectionId: string) => hiddenSections.includes(sectionId);

  // Format publication in formal academic citation style
  const renderPublicationCitation = (pub: PublicationItem) => {
    if (pub.type === 'patent') {
      return (
        <span>
          <strong>{pub.authors}</strong> ({pub.year}). "{pub.title}."{' '}
          <em>{pub.patentNumber || 'Patent Application'}</em>
          {pub.status && ` (${pub.status})`}.
          {pub.publicationDate && ` Issued ${pub.publicationDate}.`}
        </span>
      );
    }

    // Journal or conference paper citation
    return (
      <span>
        <strong>{pub.authors}</strong> ({pub.year}). "{pub.title}."{' '}
        <em>{pub.journalOrConference || pub.publisher}</em>
        {pub.volume && `, ${pub.volume}`}
        {pub.issue && `(${pub.issue})`}
        {pub.pages && `, pp. ${pub.pages}`}.
        {pub.location && ` ${pub.location}.`}
        {pub.status && pub.status !== 'Published' && ` [${pub.status}]`}
        {pub.doi && (
          <span className="text-black ml-1">
            DOI: {pub.doi}
          </span>
        )}
      </span>
    );
  };

  // Build contact line items
  const contactItems: string[] = [];
  if (personalInfo.phone) contactItems.push(personalInfo.phone);
  if (personalInfo.email) contactItems.push(personalInfo.email);
  if (personalInfo.website) contactItems.push(personalInfo.website.replace(/^https?:\/\//, ''));
  if (personalInfo.linkedin) {
    contactItems.push(
      personalInfo.linkedin.replace(/^https?:\/\/(www\.)?linkedin\.com\/in\//, 'linkedin.com/in/')
    );
  }
  if (personalInfo.github) {
    contactItems.push(
      personalInfo.github.replace(/^https?:\/\/(www\.)?github\.com\//, 'github.com/')
    );
  }

  // Build location line
  const locationParts: string[] = [];
  if (personalInfo.city) locationParts.push(personalInfo.city);
  if (personalInfo.state) locationParts.push(personalInfo.state);
  if (personalInfo.postalCode) locationParts.push(personalInfo.postalCode);
  if (personalInfo.country) locationParts.push(personalInfo.country);
  const locationString =
    locationParts.length > 0 ? locationParts.join(', ') : personalInfo.location || '';

  const fontClass = fontFamily === 'serif' ? 'font-cv-serif' : 'font-cv-sans';

  return (
    <div className="min-h-screen bg-neutral-100 py-6 pb-20">
      {/* Top Controls Toolbar - Hidden during print */}
      <div className="no-print max-w-4xl mx-auto px-4 mb-6">
        <div className="bg-white border border-slate-200 rounded-lg p-3 sm:px-6 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
          {/* Back & Title */}
          <div className="flex items-center space-x-3 w-full sm:w-auto">
            <button
              onClick={onBackToDashboard}
              className="p-1.5 text-slate-500 hover:text-slate-900 rounded hover:bg-slate-100 transition-colors"
              title="Dashboard"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div>
              <h1 className="text-sm font-bold text-slate-900 truncate max-w-[280px]">
                {currentResume.title || 'Curriculum Vitae'}
              </h1>
              <span className="text-[11px] text-slate-500">Formal Academic CV • A4 Multi-Page</span>
            </div>
          </div>

          {/* Controls & Actions */}
          <div className="flex items-center space-x-2 w-full sm:w-auto justify-end">
            {/* Font Toggle */}
            <div className="flex items-center bg-slate-100 p-0.5 rounded text-xs">
              <button
                onClick={() => handleFontChange('serif')}
                className={`px-2.5 py-1 rounded font-serif font-medium transition-colors ${
                  fontFamily === 'serif'
                    ? 'bg-white text-slate-900 shadow-xs font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
                title="Academic Serif (Times / LaTeX style)"
              >
                Serif
              </button>
              <button
                onClick={() => handleFontChange('sans')}
                className={`px-2.5 py-1 rounded font-sans font-medium transition-colors ${
                  fontFamily === 'sans'
                    ? 'bg-white text-slate-900 shadow-xs font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
                title="Formal Sans-Serif"
              >
                Sans
              </button>
            </div>

            {/* Edit Button */}
            <button
              onClick={onEdit}
              className="inline-flex items-center px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded hover:bg-slate-50 transition-colors"
            >
              <Edit3 className="w-3.5 h-3.5 mr-1.5 text-slate-500" />
              <span>Edit CV</span>
            </button>

            {/* Download PDF button */}
            <button
              onClick={handlePrint}
              className="inline-flex items-center px-4 py-1.5 text-xs font-semibold text-white bg-slate-900 hover:bg-black rounded shadow-xs transition-colors cursor-pointer"
            >
              <Download className="w-3.5 h-3.5 mr-1.5" />
              <span>Download PDF (A4)</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Academic CV Document Paper */}
      <div className="max-w-4xl mx-auto px-2 sm:px-4">
        <article
          id="academic-cv-document"
          className={`academic-cv-document ${fontClass} bg-white text-black shadow-lg mx-auto border border-neutral-300 p-8 sm:p-14 text-[10.5pt] leading-[1.38]`}
          style={{
            maxWidth: '210mm',
            minHeight: '297mm',
            color: '#000000',
            backgroundColor: '#ffffff',
          }}
        >
          {/* ============================================================== */}
          {/* 1. PERSONAL HEADER (CENTERED, FORMAL ACADEMIC)                 */}
          {/* ============================================================== */}
          <header className="text-center pb-3 border-b-2 border-black">
            {/* Full Name */}
            <h1 className="text-2xl sm:text-3xl font-bold tracking-widest uppercase text-black">
              {personalInfo.fullName || 'FULL NAME'}
            </h1>

            {/* Job Title / Headline if provided */}
            {personalInfo.jobTitle && (
              <div className="text-xs sm:text-[11.5pt] font-semibold text-black tracking-wide uppercase mt-1">
                {personalInfo.jobTitle}
              </div>
            )}

            {/* Contact details line */}
            {contactItems.length > 0 && (
              <div className="text-xs sm:text-[9.5pt] text-black mt-2 flex flex-wrap items-center justify-center gap-x-2 gap-y-0.5">
                {contactItems.map((item, idx) => (
                  <React.Fragment key={idx}>
                    {idx > 0 && <span className="text-neutral-500">•</span>}
                    <span>{item}</span>
                  </React.Fragment>
                ))}
              </div>
            )}

            {/* Location Line */}
            {locationString && (
              <div className="text-xs sm:text-[9.5pt] text-black mt-0.5">
                {locationString}
              </div>
            )}

            {/* Other Profiles / Google Scholar / ORCID */}
            {personalInfo.otherProfiles && (
              <div className="text-[9pt] text-neutral-800 mt-1 italic">
                {personalInfo.otherProfiles}
              </div>
            )}
          </header>

          {/* ============================================================== */}
          {/* 2. OBJECTIVE / PROFESSIONAL SUMMARY                            */}
          {/* ============================================================== */}
          {!isHidden('objective') && objective && objective.trim().length > 0 && (
            <section className="mt-4 cv-entry">
              <h2 className="cv-heading text-xs sm:text-[10pt] font-bold uppercase tracking-widest text-black border-b border-black pb-0.5 mb-2">
                OBJECTIVE
              </h2>
              <p className="text-justify text-xs sm:text-[10pt] leading-relaxed text-black">
                {objective}
              </p>
            </section>
          )}

          {/* ============================================================== */}
          {/* 3. EDUCATION                                                   */}
          {/* ============================================================== */}
          {!isHidden('education') && education && education.length > 0 && (
            <section className="mt-4">
              <h2 className="cv-heading text-xs sm:text-[10pt] font-bold uppercase tracking-widest text-black border-b border-black pb-0.5 mb-2">
                EDUCATION
              </h2>
              <div className="space-y-3">
                {education.map((edu) => (
                  <div key={edu.id} className="cv-entry">
                    {/* Line 1: Institution & Dates */}
                    <div className="flex justify-between items-baseline font-bold text-xs sm:text-[10pt]">
                      <span>{edu.institution}</span>
                      <span className="font-normal text-[9.5pt] shrink-0 ml-2">
                        {edu.startDate ? `${edu.startDate} – ` : ''}
                        {edu.current ? 'Present' : edu.endDate}
                      </span>
                    </div>

                    {/* Line 2: Degree, Specialization & Location */}
                    <div className="flex justify-between items-baseline text-xs sm:text-[9.5pt] italic text-neutral-900">
                      <span>
                        {edu.degree}
                        {edu.specialization ? `, ${edu.specialization}` : ''}
                      </span>
                      {edu.location && (
                        <span className="not-italic text-[9pt] shrink-0 ml-2">
                          {edu.location}
                        </span>
                      )}
                    </div>

                    {/* Line 3: GPA & Achievements / Thesis */}
                    {(edu.grade || edu.achievements) && (
                      <div className="text-[9pt] text-black mt-0.5">
                        {edu.grade && <span className="font-medium">{edu.grade}</span>}
                        {edu.grade && edu.achievements && <span> • </span>}
                        {edu.achievements && <span>{edu.achievements}</span>}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* ============================================================== */}
          {/* 4. EXPERIENCE                                                  */}
          {/* ============================================================== */}
          {!isHidden('experience') && experience && experience.length > 0 && (
            <section className="mt-4">
              <h2 className="cv-heading text-xs sm:text-[10pt] font-bold uppercase tracking-widest text-black border-b border-black pb-0.5 mb-2">
                EXPERIENCE
              </h2>
              <div className="space-y-3.5">
                {experience.map((exp) => (
                  <div key={exp.id} className="cv-entry">
                    {/* Line 1: Organization & Date Range */}
                    <div className="flex justify-between items-baseline font-bold text-xs sm:text-[10pt]">
                      <span>{exp.company}</span>
                      <span className="font-normal text-[9.5pt] shrink-0 ml-2">
                        {exp.startDate} – {exp.current ? 'Present' : exp.endDate}
                      </span>
                    </div>

                    {/* Line 2: Job Title, Employment Type & Location */}
                    <div className="flex justify-between items-baseline text-xs sm:text-[9.5pt] italic text-neutral-900 mb-1">
                      <span>
                        {exp.position}
                        {exp.employmentType ? ` (${exp.employmentType})` : ''}
                      </span>
                      {exp.location && (
                        <span className="not-italic text-[9pt] shrink-0 ml-2">
                          {exp.location}
                        </span>
                      )}
                    </div>

                    {/* Bullet Points */}
                    {exp.highlights && exp.highlights.length > 0 && (
                      <ul className="list-disc list-outside ml-5 space-y-1 text-xs sm:text-[9.5pt] text-black leading-relaxed">
                        {exp.highlights
                          .filter((h) => h.trim().length > 0)
                          .map((hl, i) => (
                            <li key={i}>{hl.replace(/^[•\-*]\s*/, '')}</li>
                          ))}
                      </ul>
                    )}
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* ============================================================== */}
          {/* 5. PATENTS & PUBLICATIONS                                      */}
          {/* ============================================================== */}
          {!isHidden('publications') && publications && publications.length > 0 && (
            <section className="mt-4">
              <h2 className="cv-heading text-xs sm:text-[10pt] font-bold uppercase tracking-widest text-black border-b border-black pb-0.5 mb-2">
                PATENTS &amp; PUBLICATIONS
              </h2>
              <ol className="list-decimal list-outside ml-5 space-y-2 text-xs sm:text-[9.5pt] text-black leading-relaxed">
                {publications.map((pub) => (
                  <li key={pub.id} className="cv-entry pl-1">
                    {renderPublicationCitation(pub)}
                  </li>
                ))}
              </ol>
            </section>
          )}

          {/* ============================================================== */}
          {/* 6. PROJECTS                                                    */}
          {/* ============================================================== */}
          {!isHidden('projects') && projects && projects.length > 0 && (
            <section className="mt-4">
              <h2 className="cv-heading text-xs sm:text-[10pt] font-bold uppercase tracking-widest text-black border-b border-black pb-0.5 mb-2">
                PROJECTS
              </h2>
              <div className="space-y-3">
                {projects.map((proj) => (
                  <div key={proj.id} className="cv-entry">
                    {/* Line 1: Title and Date */}
                    <div className="flex justify-between items-baseline font-bold text-xs sm:text-[10pt]">
                      <span>{proj.title}</span>
                      {(proj.startDate || proj.endDate) && (
                        <span className="font-normal text-[9.5pt] shrink-0 ml-2">
                          {proj.startDate}
                          {proj.endDate && ` – ${proj.endDate}`}
                        </span>
                      )}
                    </div>

                    {/* Line 2: Technologies and Links */}
                    <div className="text-xs sm:text-[9pt] italic text-neutral-800 mb-0.5">
                      {proj.technologies && proj.technologies.length > 0 && (
                        <span>Technologies: {proj.technologies.join(', ')}</span>
                      )}
                      {proj.link && (
                        <span className="not-italic ml-2 text-black">
                          [<a href={proj.link}>{proj.link.replace(/^https?:\/\//, '')}</a>]
                        </span>
                      )}
                    </div>

                    {/* Overview description */}
                    {proj.description && (
                      <p className="text-xs sm:text-[9.5pt] text-black mb-1 leading-relaxed">
                        {proj.description}
                      </p>
                    )}

                    {/* Highlights bullets */}
                    {proj.highlights && proj.highlights.length > 0 && (
                      <ul className="list-disc list-outside ml-5 space-y-0.5 text-xs sm:text-[9.5pt] text-black leading-relaxed">
                        {proj.highlights
                          .filter((h) => h.trim().length > 0)
                          .map((hl, i) => (
                            <li key={i}>{hl.replace(/^[•\-*]\s*/, '')}</li>
                          ))}
                      </ul>
                    )}
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* ============================================================== */}
          {/* 7. SKILLS                                                      */}
          {/* ============================================================== */}
          {!isHidden('skills') && skills && skills.length > 0 && (
            <section className="mt-4">
              <h2 className="cv-heading text-xs sm:text-[10pt] font-bold uppercase tracking-widest text-black border-b border-black pb-0.5 mb-2">
                SKILLS
              </h2>
              <div className="space-y-1 text-xs sm:text-[9.5pt] text-black">
                {skills.map((cat) => (
                  <div key={cat.id} className="cv-entry flex flex-col sm:flex-row sm:items-baseline">
                    <span className="font-bold sm:w-56 shrink-0 text-black">
                      {cat.category}:
                    </span>
                    <span className="text-black">
                      {(cat.skills || []).join(', ')}
                    </span>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* ============================================================== */}
          {/* 8. HONORS AND AWARDS                                           */}
          {/* ============================================================== */}
          {!isHidden('achievements') && achievements && achievements.length > 0 && (
            <section className="mt-4">
              <h2 className="cv-heading text-xs sm:text-[10pt] font-bold uppercase tracking-widest text-black border-b border-black pb-0.5 mb-2">
                HONORS &amp; AWARDS
              </h2>
              <div className="space-y-2">
                {achievements.map((ach) => (
                  <div key={ach.id} className="cv-entry">
                    <div className="flex justify-between items-baseline font-bold text-xs sm:text-[10pt]">
                      <span>{ach.title}</span>
                      <span className="font-normal text-[9.5pt] shrink-0 ml-2">{ach.date}</span>
                    </div>
                    <div className="text-xs sm:text-[9pt] text-neutral-800">
                      {ach.issuer && <span>{ach.issuer}</span>}
                      {ach.issuer && ach.description && <span> — </span>}
                      {ach.description && <span>{ach.description}</span>}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* ============================================================== */}
          {/* 9. LEADERSHIP EXPERIENCE                                       */}
          {/* ============================================================== */}
          {!isHidden('leadership') && leadership && leadership.length > 0 && (
            <section className="mt-4">
              <h2 className="cv-heading text-xs sm:text-[10pt] font-bold uppercase tracking-widest text-black border-b border-black pb-0.5 mb-2">
                LEADERSHIP EXPERIENCE
              </h2>
              <div className="space-y-3">
                {leadership.map((lead) => (
                  <div key={lead.id} className="cv-entry">
                    <div className="flex justify-between items-baseline font-bold text-xs sm:text-[10pt]">
                      <span>{lead.role}, {lead.organization}</span>
                      <span className="font-normal text-[9.5pt] shrink-0 ml-2">
                        {lead.startDate} – {lead.current ? 'Present' : lead.endDate}
                      </span>
                    </div>
                    {lead.location && (
                      <div className="text-xs sm:text-[9pt] italic text-neutral-800 mb-0.5">
                        {lead.location}
                      </div>
                    )}
                    {lead.highlights && lead.highlights.length > 0 && (
                      <ul className="list-disc list-outside ml-5 space-y-0.5 text-xs sm:text-[9.5pt] text-black leading-relaxed">
                        {lead.highlights
                          .filter((h) => h.trim().length > 0)
                          .map((hl, i) => (
                            <li key={i}>{hl.replace(/^[•\-*]\s*/, '')}</li>
                          ))}
                      </ul>
                    )}
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* ============================================================== */}
          {/* 10. VOLUNTEER SERVICE                                          */}
          {/* ============================================================== */}
          {!isHidden('volunteer') && volunteer && volunteer.length > 0 && (
            <section className="mt-4">
              <h2 className="cv-heading text-xs sm:text-[10pt] font-bold uppercase tracking-widest text-black border-b border-black pb-0.5 mb-2">
                VOLUNTEER &amp; COMMUNITY SERVICE
              </h2>
              <div className="space-y-2.5">
                {volunteer.map((vol) => (
                  <div key={vol.id} className="cv-entry">
                    <div className="flex justify-between items-baseline font-bold text-xs sm:text-[10pt]">
                      <span>{vol.role}, {vol.organization}</span>
                      <span className="font-normal text-[9.5pt] shrink-0 ml-2">
                        {vol.startDate} – {vol.current ? 'Present' : vol.endDate}
                      </span>
                    </div>
                    {vol.highlights && vol.highlights.length > 0 && (
                      <ul className="list-disc list-outside ml-5 space-y-0.5 text-xs sm:text-[9.5pt] text-black leading-relaxed">
                        {vol.highlights
                          .filter((h) => h.trim().length > 0)
                          .map((hl, i) => (
                            <li key={i}>{hl.replace(/^[•\-*]\s*/, '')}</li>
                          ))}
                      </ul>
                    )}
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* ============================================================== */}
          {/* 11. PROFESSIONAL MEMBERSHIPS                                   */}
          {/* ============================================================== */}
          {!isHidden('memberships') && memberships && memberships.length > 0 && (
            <section className="mt-4">
              <h2 className="cv-heading text-xs sm:text-[10pt] font-bold uppercase tracking-widest text-black border-b border-black pb-0.5 mb-2">
                PROFESSIONAL MEMBERSHIPS
              </h2>
              <ul className="list-disc list-outside ml-5 space-y-1 text-xs sm:text-[9.5pt] text-black">
                {memberships.map((mem) => (
                  <li key={mem.id} className="cv-entry">
                    <div className="flex justify-between items-baseline">
                      <span>
                        <strong>{mem.organization}</strong>
                        {mem.membershipType ? ` — ${mem.membershipType}` : ''}
                        {mem.membershipId ? ` (ID: ${mem.membershipId})` : ''}
                      </span>
                      <span className="font-normal text-[9.5pt] shrink-0 ml-2">
                        {mem.startDate}
                        {mem.endDate ? ` – ${mem.endDate}` : mem.current ? ' – Present' : ''}
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {/* ============================================================== */}
          {/* 12. CERTIFICATIONS                                             */}
          {/* ============================================================== */}
          {!isHidden('certifications') && certifications && certifications.length > 0 && (
            <section className="mt-4">
              <h2 className="cv-heading text-xs sm:text-[10pt] font-bold uppercase tracking-widest text-black border-b border-black pb-0.5 mb-2">
                CERTIFICATIONS
              </h2>
              <div className="space-y-1.5 text-xs sm:text-[9.5pt]">
                {certifications.map((c) => (
                  <div key={c.id} className="cv-entry flex justify-between items-baseline">
                    <span>
                      <strong>{c.name}</strong> — {c.issuer}
                      {c.credentialId && ` (ID: ${c.credentialId})`}
                    </span>
                    <span className="font-normal text-[9.5pt] shrink-0 ml-2">
                      {c.issueDate}
                      {c.expirationDate && ` – ${c.expirationDate}`}
                    </span>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* ============================================================== */}
          {/* 13. ADDITIONAL INFORMATION                                     */}
          {/* ============================================================== */}
          {!isHidden('additional') &&
            ((languages && languages.length > 0) || (interests && interests.trim().length > 0)) && (
              <section className="mt-4">
                <h2 className="cv-heading text-xs sm:text-[10pt] font-bold uppercase tracking-widest text-black border-b border-black pb-0.5 mb-2">
                  ADDITIONAL INFORMATION
                </h2>
                <div className="space-y-1 text-xs sm:text-[9.5pt] text-black">
                  {languages && languages.length > 0 && (
                    <div className="cv-entry flex flex-col sm:flex-row sm:items-baseline">
                      <span className="font-bold sm:w-36 shrink-0">Languages:</span>
                      <span>
                        {languages.map((l) => `${l.language} (${l.proficiency})`).join(', ')}
                      </span>
                    </div>
                  )}
                  {interests && interests.trim().length > 0 && (
                    <div className="cv-entry flex flex-col sm:flex-row sm:items-baseline">
                      <span className="font-bold sm:w-36 shrink-0">Interests:</span>
                      <span>{interests}</span>
                    </div>
                  )}
                </div>
              </section>
            )}

          {/* ============================================================== */}
          {/* 14. REFERENCES                                                 */}
          {/* ============================================================== */}
          {!isHidden('references') && references && references.length > 0 && (
            <section className="mt-4">
              <h2 className="cv-heading text-xs sm:text-[10pt] font-bold uppercase tracking-widest text-black border-b border-black pb-0.5 mb-2">
                REFERENCES
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs sm:text-[9.5pt]">
                {references.map((ref) => (
                  <div key={ref.id} className="cv-entry">
                    <div className="font-bold text-black">{ref.fullName}</div>
                    <div className="text-neutral-900">{ref.jobTitle}</div>
                    {ref.department && <div className="text-neutral-800">{ref.department}</div>}
                    <div className="text-neutral-800">{ref.organization}</div>
                    {ref.email && <div>Email: {ref.email}</div>}
                    {ref.phone && <div>Phone: {ref.phone}</div>}
                    {ref.relationship && (
                      <div className="text-[9pt] text-neutral-600 italic">
                        Relationship: {ref.relationship}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </section>
          )}
        </article>
      </div>
    </div>
  );
};
