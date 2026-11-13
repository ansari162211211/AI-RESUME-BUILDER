import React from 'react';
import {
  Document,
  Page,
  View,
  Text,
  Link,
  Font,
  StyleSheet,
} from '@react-pdf/renderer';
import type { Resume, CvFontFamily, PublicationItem, ReferenceItem } from '../../types/resume';
import { sanitizePdfUrl, formatDoiUrl } from '../../utils/pdfHelpers';

// Disable automatic hyphenation so academic terms and headings never break mid-word
Font.registerHyphenationCallback((word) => [word]);

interface AcademicCvPdfDocumentProps {
  resume: Resume;
  fontFamily?: CvFontFamily;
}

function cleanBullets(highlights?: unknown[]): string[] {
  if (!Array.isArray(highlights)) return [];
  return highlights
    .filter((h): h is string => typeof h === 'string' && h.trim().length > 0)
    .map((h) => h.replace(/^[•\-*]\s*/, '').trim());
}

function chunkPairs<T>(items: T[]): T[][] {
  const rows: T[][] = [];
  for (let i = 0; i < items.length; i += 2) {
    rows.push(items.slice(i, i + 2));
  }
  return rows;
}

export const AcademicCvPdfDocument: React.FC<AcademicCvPdfDocumentProps> = ({
  resume,
  fontFamily = 'serif',
}) => {
  const isSerif = fontFamily === 'serif';
  const fontRegular = isSerif ? 'Times-Roman' : 'Helvetica';
  const fontBold = isSerif ? 'Times-Bold' : 'Helvetica-Bold';
  const fontItalic = isSerif ? 'Times-Italic' : 'Helvetica-Oblique';

  const styles = StyleSheet.create({
    page: {
      paddingTop: 52, // ~18.3 mm
      paddingBottom: 52, // ~18.3 mm
      paddingHorizontal: 54, // ~19.0 mm
      fontFamily: fontRegular,
      fontSize: 9.5,
      color: '#000000',
      backgroundColor: '#ffffff',
      lineHeight: 1.35,
    },
    // Header
    headerContainer: {
      textAlign: 'center',
      marginBottom: 10,
      paddingBottom: 7,
      borderBottomWidth: 1.5,
      borderBottomColor: '#000000',
    },
    fullName: {
      fontSize: 20,
      fontFamily: fontBold,
      textTransform: 'uppercase',
      letterSpacing: 2.5,
      textAlign: 'center',
      marginBottom: 3,
      lineHeight: 1.2,
    },
    jobTitle: {
      fontSize: 10,
      fontFamily: fontBold,
      textTransform: 'uppercase',
      letterSpacing: 0.8,
      textAlign: 'center',
      marginBottom: 3,
    },
    contactLine: {
      fontSize: 8.5,
      fontFamily: fontRegular,
      textAlign: 'center',
      flexDirection: 'row',
      justifyContent: 'center',
      flexWrap: 'wrap',
      marginBottom: 2,
    },
    contactItem: {
      color: '#000000',
      textDecoration: 'none',
    },
    contactSeparator: {
      color: '#555555',
      marginHorizontal: 3,
    },
    locationLine: {
      fontSize: 8.5,
      textAlign: 'center',
      marginBottom: 2,
    },
    profilesLine: {
      fontSize: 8,
      fontFamily: fontItalic,
      textAlign: 'center',
      color: '#222222',
      marginTop: 1,
    },
    // Section Headings
    sectionContainer: {
      marginTop: 9,
      marginBottom: 4,
    },
    sectionHeading: {
      fontSize: 10,
      fontFamily: fontBold,
      textTransform: 'uppercase',
      letterSpacing: 1.2,
      color: '#000000',
      borderBottomWidth: 0.75,
      borderBottomColor: '#000000',
      paddingBottom: 2,
      marginBottom: 5,
    },
    // Objective
    objectiveText: {
      fontSize: 9.25,
      textAlign: 'justify',
      lineHeight: 1.38,
      color: '#000000',
    },
    // Entries (Education, Experience, etc.)
    entryBlock: {
      marginBottom: 7,
    },
    entryRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'baseline',
      marginBottom: 1,
    },
    entryTitleBold: {
      fontFamily: fontBold,
      fontSize: 9.5,
      color: '#000000',
      flex: 1,
      marginRight: 8,
    },
    entryDateNormal: {
      fontSize: 9,
      fontFamily: fontRegular,
      color: '#000000',
      textAlign: 'right',
    },
    entrySubtitleItalic: {
      fontFamily: fontItalic,
      fontSize: 9,
      color: '#1a1a1a',
      flex: 1,
      marginRight: 8,
    },
    entryLocation: {
      fontSize: 8.5,
      fontFamily: fontRegular,
      color: '#222222',
      textAlign: 'right',
    },
    entryGrade: {
      fontSize: 8.5,
      color: '#000000',
      marginTop: 1.5,
      lineHeight: 1.32,
    },
    // Bullet Points
    bulletRow: {
      flexDirection: 'row',
      marginTop: 2,
      paddingLeft: 8,
    },
    bulletDot: {
      width: 10,
      fontSize: 9,
      fontFamily: fontRegular,
      color: '#000000',
    },
    bulletText: {
      flex: 1,
      fontSize: 8.75,
      lineHeight: 1.35,
      color: '#000000',
    },
    // Publication citation item
    citationRow: {
      flexDirection: 'row',
      marginBottom: 5,
      paddingLeft: 4,
    },
    citationNumber: {
      width: 18,
      fontSize: 9,
      fontFamily: fontRegular,
      color: '#000000',
    },
    citationText: {
      flex: 1,
      fontSize: 8.75,
      lineHeight: 1.35,
      color: '#000000',
    },
    citationAuthors: {
      fontFamily: fontBold,
    },
    citationJournal: {
      fontFamily: fontItalic,
    },
    link: {
      color: '#000000',
      textDecoration: 'none',
    },
    // Skills
    skillCategoryRow: {
      flexDirection: 'row',
      marginBottom: 3,
    },
    skillCategoryName: {
      width: 168,
      paddingRight: 6,
      fontFamily: fontBold,
      fontSize: 9,
      color: '#000000',
    },
    skillCategoryList: {
      flex: 1,
      fontSize: 9,
      lineHeight: 1.35,
      color: '#000000',
    },
    // References
    referenceRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginBottom: 8,
    },
    referenceCard: {
      width: '48%',
    },
    referenceName: {
      fontFamily: fontBold,
      fontSize: 9.5,
      color: '#000000',
    },
    referenceTitle: {
      fontFamily: fontRegular,
      fontSize: 8.5,
      color: '#222222',
    },
    referenceDetail: {
      fontSize: 8,
      color: '#333333',
    },
    referenceRelationship: {
      fontSize: 8,
      fontFamily: fontItalic,
      color: '#444444',
      marginTop: 1,
    },
    // Page numbering footer
    pageNumber: {
      position: 'absolute',
      fontSize: 8.5,
      fontFamily: fontRegular,
      bottom: 22,
      left: 0,
      right: 0,
      textAlign: 'center',
      color: '#555555',
    },
  });

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
  } = resume;

  const isHidden = (id: string) => hiddenSections.includes(id);

  // Build contact line items
  const contactLinks: { label: string; url?: string | null }[] = [];
  if (personalInfo.phone) {
    contactLinks.push({
      label: personalInfo.phone,
      url: `tel:${personalInfo.phone.replace(/[^+\d]/g, '')}`,
    });
  }
  if (personalInfo.email) {
    contactLinks.push({ label: personalInfo.email, url: `mailto:${personalInfo.email.trim()}` });
  }
  if (personalInfo.website) {
    contactLinks.push({
      label: personalInfo.website.replace(/^https?:\/\//, ''),
      url: sanitizePdfUrl(personalInfo.website),
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
    contactLinks.push({
      label: cleanLinkedin,
      url: sanitizePdfUrl(linkedinFull),
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
    contactLinks.push({
      label: cleanGithub,
      url: sanitizePdfUrl(githubFull),
    });
  }

  // Location string
  const locationParts: string[] = [];
  if (personalInfo.city) locationParts.push(personalInfo.city);
  if (personalInfo.state) locationParts.push(personalInfo.state);
  if (personalInfo.postalCode) locationParts.push(personalInfo.postalCode);
  if (personalInfo.country) locationParts.push(personalInfo.country);
  const locationText = locationParts.length > 0 ? locationParts.join(', ') : personalInfo.location;

  const visibleSkills = (skills || []).filter(
    (cat) => (cat.category && cat.category.trim().length > 0) || (cat.skills && cat.skills.length > 0)
  );

  const renderPublicationContent = (pub: PublicationItem) => {
    if (pub.type === 'patent') {
      return (
        <Text style={styles.citationText}>
          <Text style={styles.citationAuthors}>{pub.authors || ''}</Text>
          {pub.year ? <Text> ({pub.year}). </Text> : <Text>. </Text>}
          <Text>"{pub.title || ''}" </Text>
          <Text style={styles.citationJournal}>
            {pub.patentNumber || 'Patent Application'}
          </Text>
          {pub.status ? <Text> ({pub.status})</Text> : null}
          <Text>.</Text>
          {pub.publicationDate ? <Text> Issued {pub.publicationDate}.</Text> : null}
        </Text>
      );
    }

    const doiUrl = formatDoiUrl(pub.doi);
    const venue = pub.journalOrConference || pub.publisher || '';

    return (
      <Text style={styles.citationText}>
        <Text style={styles.citationAuthors}>{pub.authors || ''}</Text>
        {pub.year ? <Text> ({pub.year}). </Text> : <Text>. </Text>}
        <Text>"{pub.title || ''}" </Text>
        {venue ? <Text style={styles.citationJournal}>{venue}</Text> : null}
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
              <Link src={doiUrl} style={styles.link}>
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

  const referenceRows: ReferenceItem[][] = chunkPairs(references || []);

  return (
    <Document
      title={resume.title || `${personalInfo.fullName || 'Academic'} Curriculum Vitae`}
      author={personalInfo.fullName || 'Academic CV'}
      subject="Curriculum Vitae"
      keywords="Academic CV, Research, Curriculum Vitae, Publications"
    >
      <Page size="A4" style={styles.page}>
        {/* ============================================================== */}
        {/* 1. PERSONAL HEADER (CENTERED, ACADEMIC)                         */}
        {/* ============================================================== */}
        <View style={styles.headerContainer}>
          <Text style={styles.fullName}>
            {personalInfo.fullName || 'FULL NAME'}
          </Text>

          {personalInfo.jobTitle ? (
            <Text style={styles.jobTitle}>{personalInfo.jobTitle}</Text>
          ) : null}

          {contactLinks.length > 0 ? (
            <View style={styles.contactLine}>
              {contactLinks.map((item, idx) => (
                <React.Fragment key={idx}>
                  {idx > 0 && <Text style={styles.contactSeparator}>•</Text>}
                  {item.url ? (
                    <Link src={item.url} style={styles.contactItem}>
                      {item.label}
                    </Link>
                  ) : (
                    <Text style={styles.contactItem}>{item.label}</Text>
                  )}
                </React.Fragment>
              ))}
            </View>
          ) : null}

          {locationText ? (
            <Text style={styles.locationLine}>{locationText}</Text>
          ) : null}

          {personalInfo.otherProfiles ? (
            <Text style={styles.profilesLine}>{personalInfo.otherProfiles}</Text>
          ) : null}
        </View>

        {/* ============================================================== */}
        {/* 2. OBJECTIVE (LONG PARAGRAPHS CAN FLOW NATURALLY ACROSS PAGES) */}
        {/* ============================================================== */}
        {!isHidden('objective') && objective && objective.trim().length > 0 && (
          <View style={styles.sectionContainer}>
            <Text style={styles.sectionHeading} minPresenceAhead={36}>
              OBJECTIVE
            </Text>
            <Text style={styles.objectiveText}>{objective.trim()}</Text>
          </View>
        )}

        {/* ============================================================== */}
        {/* 3. EDUCATION                                                   */}
        {/* ============================================================== */}
        {!isHidden('education') && education && education.length > 0 && (
          <View style={styles.sectionContainer}>
            <Text style={styles.sectionHeading} minPresenceAhead={50}>
              EDUCATION
            </Text>
            {education.map((edu) => (
              <View key={edu.id} style={styles.entryBlock} wrap={false}>
                <View style={styles.entryRow}>
                  <Text style={styles.entryTitleBold}>{edu.institution}</Text>
                  <Text style={styles.entryDateNormal}>
                    {edu.startDate ? `${edu.startDate} – ` : ''}
                    {edu.current ? 'Present' : edu.endDate}
                  </Text>
                </View>

                <View style={styles.entryRow}>
                  <Text style={styles.entrySubtitleItalic}>
                    {edu.degree}
                    {edu.specialization ? `, ${edu.specialization}` : ''}
                  </Text>
                  {edu.location ? (
                    <Text style={styles.entryLocation}>{edu.location}</Text>
                  ) : null}
                </View>

                {(edu.grade || edu.achievements) && (
                  <Text style={styles.entryGrade}>
                    {edu.grade ? `${edu.grade}` : ''}
                    {edu.grade && edu.achievements ? ' • ' : ''}
                    {edu.achievements ? `${edu.achievements}` : ''}
                  </Text>
                )}
              </View>
            ))}
          </View>
        )}

        {/* ============================================================== */}
        {/* 4. WORK EXPERIENCE                                             */}
        {/* ============================================================== */}
        {!isHidden('experience') && experience && experience.length > 0 && (
          <View style={styles.sectionContainer}>
            <Text style={styles.sectionHeading} minPresenceAhead={55}>
              EXPERIENCE
            </Text>
            {experience.map((exp) => {
              const bullets = cleanBullets(exp.highlights);
              const firstBullet = bullets[0];
              const remainingBullets = bullets.slice(1);

              return (
                <View key={exp.id} style={styles.entryBlock}>
                  {/* Keep Company, Dates, Position, Location, and First Bullet together */}
                  <View wrap={false}>
                    <View style={styles.entryRow}>
                      <Text style={styles.entryTitleBold}>{exp.company}</Text>
                      <Text style={styles.entryDateNormal}>
                        {exp.startDate} – {exp.current ? 'Present' : exp.endDate}
                      </Text>
                    </View>

                    <View style={styles.entryRow}>
                      <Text style={styles.entrySubtitleItalic}>
                        {exp.position}
                        {exp.employmentType ? ` (${exp.employmentType})` : ''}
                      </Text>
                      {exp.location ? (
                        <Text style={styles.entryLocation}>{exp.location}</Text>
                      ) : null}
                    </View>

                    {firstBullet ? (
                      <View style={styles.bulletRow}>
                        <Text style={styles.bulletDot}>•</Text>
                        <Text style={styles.bulletText}>{firstBullet}</Text>
                      </View>
                    ) : null}
                  </View>

                  {/* Remaining bullets stay individually intact while letting long entries span pages */}
                  {remainingBullets.map((hl, i) => (
                    <View key={i} style={styles.bulletRow} wrap={false}>
                      <Text style={styles.bulletDot}>•</Text>
                      <Text style={styles.bulletText}>{hl}</Text>
                    </View>
                  ))}
                </View>
              );
            })}
          </View>
        )}

        {/* ============================================================== */}
        {/* 5. PATENTS & PUBLICATIONS                                      */}
        {/* ============================================================== */}
        {!isHidden('publications') && publications && publications.length > 0 && (
          <View style={styles.sectionContainer}>
            <Text style={styles.sectionHeading} minPresenceAhead={45}>
              PATENTS &amp; PUBLICATIONS
            </Text>
            {publications.map((pub, idx) => (
              <View key={pub.id} style={styles.citationRow} wrap={false}>
                <Text style={styles.citationNumber}>{idx + 1}.</Text>
                {renderPublicationContent(pub)}
              </View>
            ))}
          </View>
        )}

        {/* ============================================================== */}
        {/* 6. PROJECTS                                                    */}
        {/* ============================================================== */}
        {!isHidden('projects') && projects && projects.length > 0 && (
          <View style={styles.sectionContainer}>
            <Text style={styles.sectionHeading} minPresenceAhead={50}>
              PROJECTS
            </Text>
            {projects.map((proj) => {
              const bullets = cleanBullets(proj.highlights);
              const firstBullet = bullets[0];
              const remainingBullets = bullets.slice(1);
              const projectUrl = sanitizePdfUrl(proj.link);

              return (
                <View key={proj.id} style={styles.entryBlock}>
                  <View wrap={false}>
                    <View style={styles.entryRow}>
                      <Text style={styles.entryTitleBold}>{proj.title}</Text>
                      {proj.startDate || proj.endDate ? (
                        <Text style={styles.entryDateNormal}>
                          {proj.startDate}
                          {proj.endDate ? ` – ${proj.endDate}` : ''}
                        </Text>
                      ) : null}
                    </View>

                    {proj.technologies?.length || proj.link ? (
                      <View style={{ marginBottom: 2 }}>
                        <Text style={styles.entrySubtitleItalic}>
                          {proj.technologies && proj.technologies.length > 0
                            ? `Technologies: ${proj.technologies.join(', ')} `
                            : ''}
                          {proj.link ? (
                            projectUrl ? (
                              <Link src={projectUrl} style={styles.link}>
                                [{proj.link.replace(/^https?:\/\//, '')}]
                              </Link>
                            ) : (
                              `[${proj.link.replace(/^https?:\/\//, '')}]`
                            )
                          ) : null}
                        </Text>
                      </View>
                    ) : null}

                    {proj.description ? (
                      <Text style={{ fontSize: 8.75, lineHeight: 1.35, marginBottom: 2 }}>
                        {proj.description}
                      </Text>
                    ) : null}

                    {firstBullet ? (
                      <View style={styles.bulletRow}>
                        <Text style={styles.bulletDot}>•</Text>
                        <Text style={styles.bulletText}>{firstBullet}</Text>
                      </View>
                    ) : null}
                  </View>

                  {remainingBullets.map((hl, i) => (
                    <View key={i} style={styles.bulletRow} wrap={false}>
                      <Text style={styles.bulletDot}>•</Text>
                      <Text style={styles.bulletText}>{hl}</Text>
                    </View>
                  ))}
                </View>
              );
            })}
          </View>
        )}

        {/* ============================================================== */}
        {/* 7. SKILLS                                                      */}
        {/* ============================================================== */}
        {!isHidden('skills') && visibleSkills.length > 0 && (
          <View style={styles.sectionContainer}>
            <Text style={styles.sectionHeading} minPresenceAhead={36}>
              SKILLS
            </Text>
            {visibleSkills.map((cat) => (
              <View key={cat.id} style={styles.skillCategoryRow} wrap={false}>
                <Text style={styles.skillCategoryName}>{cat.category}:</Text>
                <Text style={styles.skillCategoryList}>
                  {(cat.skills || []).join(', ')}
                </Text>
              </View>
            ))}
          </View>
        )}

        {/* ============================================================== */}
        {/* 8. HONORS & AWARDS                                             */}
        {/* ============================================================== */}
        {!isHidden('achievements') && achievements && achievements.length > 0 && (
          <View style={styles.sectionContainer}>
            <Text style={styles.sectionHeading} minPresenceAhead={42}>
              HONORS &amp; AWARDS
            </Text>
            {achievements.map((ach) => (
              <View key={ach.id} style={styles.entryBlock} wrap={false}>
                <View style={styles.entryRow}>
                  <Text style={styles.entryTitleBold}>{ach.title}</Text>
                  <Text style={styles.entryDateNormal}>{ach.date}</Text>
                </View>
                {(ach.issuer || ach.description) && (
                  <Text style={{ fontSize: 8.75, color: '#222222', lineHeight: 1.32 }}>
                    {ach.issuer ? ach.issuer : ''}
                    {ach.issuer && ach.description ? ' — ' : ''}
                    {ach.description ? ach.description : ''}
                  </Text>
                )}
              </View>
            ))}
          </View>
        )}

        {/* ============================================================== */}
        {/* 9. LEADERSHIP EXPERIENCE                                       */}
        {/* ============================================================== */}
        {!isHidden('leadership') && leadership && leadership.length > 0 && (
          <View style={styles.sectionContainer}>
            <Text style={styles.sectionHeading} minPresenceAhead={45}>
              LEADERSHIP EXPERIENCE
            </Text>
            {leadership.map((lead) => {
              const bullets = cleanBullets(lead.highlights);
              const firstBullet = bullets[0];
              const remainingBullets = bullets.slice(1);

              return (
                <View key={lead.id} style={styles.entryBlock}>
                  <View wrap={false}>
                    <View style={styles.entryRow}>
                      <Text style={styles.entryTitleBold}>
                        {lead.role}, {lead.organization}
                      </Text>
                      <Text style={styles.entryDateNormal}>
                        {lead.startDate} – {lead.current ? 'Present' : lead.endDate}
                      </Text>
                    </View>
                    {lead.location ? (
                      <Text
                        style={{
                          fontSize: 8.5,
                          fontFamily: fontItalic,
                          color: '#333333',
                          marginBottom: 1,
                        }}
                      >
                        {lead.location}
                      </Text>
                    ) : null}
                    {firstBullet ? (
                      <View style={styles.bulletRow}>
                        <Text style={styles.bulletDot}>•</Text>
                        <Text style={styles.bulletText}>{firstBullet}</Text>
                      </View>
                    ) : null}
                  </View>

                  {remainingBullets.map((hl, i) => (
                    <View key={i} style={styles.bulletRow} wrap={false}>
                      <Text style={styles.bulletDot}>•</Text>
                      <Text style={styles.bulletText}>{hl}</Text>
                    </View>
                  ))}
                </View>
              );
            })}
          </View>
        )}

        {/* ============================================================== */}
        {/* 10. VOLUNTEER & COMMUNITY SERVICE                              */}
        {/* ============================================================== */}
        {!isHidden('volunteer') && volunteer && volunteer.length > 0 && (
          <View style={styles.sectionContainer}>
            <Text style={styles.sectionHeading} minPresenceAhead={45}>
              VOLUNTEER &amp; COMMUNITY SERVICE
            </Text>
            {volunteer.map((vol) => {
              const bullets = cleanBullets(vol.highlights);
              const firstBullet = bullets[0];
              const remainingBullets = bullets.slice(1);

              return (
                <View key={vol.id} style={styles.entryBlock}>
                  <View wrap={false}>
                    <View style={styles.entryRow}>
                      <Text style={styles.entryTitleBold}>
                        {vol.role}, {vol.organization}
                      </Text>
                      <Text style={styles.entryDateNormal}>
                        {vol.startDate} – {vol.current ? 'Present' : vol.endDate}
                      </Text>
                    </View>
                    {firstBullet ? (
                      <View style={styles.bulletRow}>
                        <Text style={styles.bulletDot}>•</Text>
                        <Text style={styles.bulletText}>{firstBullet}</Text>
                      </View>
                    ) : null}
                  </View>

                  {remainingBullets.map((hl, i) => (
                    <View key={i} style={styles.bulletRow} wrap={false}>
                      <Text style={styles.bulletDot}>•</Text>
                      <Text style={styles.bulletText}>{hl}</Text>
                    </View>
                  ))}
                </View>
              );
            })}
          </View>
        )}

        {/* ============================================================== */}
        {/* 11. PROFESSIONAL MEMBERSHIPS                                   */}
        {/* ============================================================== */}
        {!isHidden('memberships') && memberships && memberships.length > 0 && (
          <View style={styles.sectionContainer}>
            <Text style={styles.sectionHeading} minPresenceAhead={36}>
              PROFESSIONAL MEMBERSHIPS
            </Text>
            {memberships.map((mem) => (
              <View key={mem.id} style={styles.entryRow} wrap={false}>
                <Text style={{ fontSize: 9, flex: 1, marginRight: 8 }}>
                  <Text style={{ fontFamily: fontBold }}>{mem.organization}</Text>
                  {mem.membershipType ? ` — ${mem.membershipType}` : ''}
                  {mem.membershipId ? ` (ID: ${mem.membershipId})` : ''}
                </Text>
                <Text style={styles.entryDateNormal}>
                  {mem.startDate}
                  {mem.endDate ? ` – ${mem.endDate}` : mem.current ? ' – Present' : ''}
                </Text>
              </View>
            ))}
          </View>
        )}

        {/* ============================================================== */}
        {/* 12. CERTIFICATIONS                                             */}
        {/* ============================================================== */}
        {!isHidden('certifications') && certifications && certifications.length > 0 && (
          <View style={styles.sectionContainer}>
            <Text style={styles.sectionHeading} minPresenceAhead={36}>
              CERTIFICATIONS
            </Text>
            {certifications.map((c) => (
              <View key={c.id} style={styles.entryRow} wrap={false}>
                <Text style={{ fontSize: 9, flex: 1, marginRight: 8 }}>
                  <Text style={{ fontFamily: fontBold }}>{c.name}</Text> — {c.issuer}
                  {c.credentialId ? ` (ID: ${c.credentialId})` : ''}
                </Text>
                <Text style={styles.entryDateNormal}>
                  {c.issueDate}
                  {c.expirationDate ? ` – ${c.expirationDate}` : ''}
                </Text>
              </View>
            ))}
          </View>
        )}

        {/* ============================================================== */}
        {/* 13. ADDITIONAL INFORMATION                                     */}
        {/* ============================================================== */}
        {!isHidden('additional') &&
          ((languages && languages.length > 0) || (interests && interests.trim().length > 0)) && (
            <View style={styles.sectionContainer}>
              <Text style={styles.sectionHeading} minPresenceAhead={36}>
                ADDITIONAL INFORMATION
              </Text>
              {languages && languages.length > 0 ? (
                <View style={{ flexDirection: 'row', marginBottom: 2.5 }} wrap={false}>
                  <Text style={{ width: 95, fontFamily: fontBold, fontSize: 9 }}>
                    Languages:
                  </Text>
                  <Text style={{ flex: 1, fontSize: 9 }}>
                    {languages.map((l) => `${l.language} (${l.proficiency})`).join(', ')}
                  </Text>
                </View>
              ) : null}
              {interests && interests.trim().length > 0 ? (
                <View style={{ flexDirection: 'row' }} wrap={false}>
                  <Text style={{ width: 95, fontFamily: fontBold, fontSize: 9 }}>
                    Interests:
                  </Text>
                  <Text style={{ flex: 1, fontSize: 9 }}>{interests.trim()}</Text>
                </View>
              ) : null}
            </View>
          )}

        {/* ============================================================== */}
        {/* 14. REFERENCES                                                 */}
        {/* ============================================================== */}
        {!isHidden('references') && referenceRows.length > 0 && (
          <View style={styles.sectionContainer}>
            <Text style={styles.sectionHeading} minPresenceAhead={60}>
              REFERENCES
            </Text>
            {referenceRows.map((row, rowIdx) => (
              <View key={rowIdx} style={styles.referenceRow} wrap={false}>
                {row.map((ref) => (
                  <View key={ref.id} style={styles.referenceCard}>
                    <Text style={styles.referenceName}>{ref.fullName}</Text>
                    <Text style={styles.referenceTitle}>{ref.jobTitle}</Text>
                    {ref.department ? (
                      <Text style={styles.referenceDetail}>{ref.department}</Text>
                    ) : null}
                    <Text style={styles.referenceDetail}>{ref.organization}</Text>
                    {ref.email ? (
                      <Text style={styles.referenceDetail}>Email: {ref.email}</Text>
                    ) : null}
                    {ref.phone ? (
                      <Text style={styles.referenceDetail}>Phone: {ref.phone}</Text>
                    ) : null}
                    {ref.relationship ? (
                      <Text style={styles.referenceRelationship}>
                        Relationship: {ref.relationship}
                      </Text>
                    ) : null}
                  </View>
                ))}
              </View>
            ))}
          </View>
        )}

        {/* Page numbers rendered at bottom of pages */}
        <Text
          style={styles.pageNumber}
          render={({ pageNumber, totalPages }) =>
            totalPages > 1 ? `Page ${pageNumber} of ${totalPages}` : ''
          }
          fixed
        />
      </Page>
    </Document>
  );
};
