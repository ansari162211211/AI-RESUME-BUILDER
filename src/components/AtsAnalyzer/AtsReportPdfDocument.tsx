import React from 'react';
import { Document, Page, View, Text, StyleSheet, Font } from '@react-pdf/renderer';
import type { AtsAnalysisRecord } from '../../types/ats';
import {
  getFriendlyBandDisplay,
  getPlainEnglishScoreSummary,
  getSkillMatchLists,
  isCompanyToken,
} from './AtsResultsView';

Font.registerHyphenationCallback((word) => [word]);

const styles = StyleSheet.create({
  page: {
    paddingTop: 36,
    paddingBottom: 56,
    paddingHorizontal: 38,
    fontFamily: 'Helvetica',
    fontSize: 9.5,
    color: '#1e293b',
    backgroundColor: '#ffffff',
  },
  header: {
    borderBottomWidth: 1.5,
    borderBottomColor: '#0f2b5c',
    paddingBottom: 10,
    marginBottom: 14,
  },
  title: {
    fontSize: 18,
    fontFamily: 'Helvetica-Bold',
    color: '#0f2b5c',
    marginBottom: 5,
  },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    fontSize: 8.5,
    color: '#475569',
  },
  metaStrong: {
    fontFamily: 'Helvetica-Bold',
    color: '#0f172a',
  },
  scoreCard: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 4,
    padding: 12,
    marginBottom: 12,
  },
  scoreTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  scoreLabel: {
    fontSize: 11,
    fontFamily: 'Helvetica-Bold',
    color: '#0f2b5c',
  },
  scoreNumber: {
    fontSize: 18,
    fontFamily: 'Helvetica-Bold',
    color: '#0f2b5c',
  },
  progressTrack: {
    height: 6,
    backgroundColor: '#e2e8f0',
    borderRadius: 3,
    marginBottom: 7,
  },
  progressFill: {
    height: 6,
    backgroundColor: '#0f2b5c',
    borderRadius: 3,
  },
  bodyText: {
    fontSize: 9,
    color: '#334155',
    lineHeight: 1.4,
  },
  comparisonBox: {
    backgroundColor: '#f1f5f9',
    borderWidth: 0.8,
    borderColor: '#cbd5e1',
    borderRadius: 4,
    padding: 9,
    marginBottom: 10,
  },
  sectionHeading: {
    fontSize: 11,
    fontFamily: 'Helvetica-Bold',
    color: '#0f2b5c',
    borderBottomWidth: 1,
    borderBottomColor: '#cbd5e1',
    paddingBottom: 3,
    marginTop: 14,
    marginBottom: 8,
  },
  tagWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 5,
    marginBottom: 4,
  },
  greenTag: {
    backgroundColor: '#ecfdf5',
    borderWidth: 0.7,
    borderColor: '#a7f3d0',
    borderRadius: 3,
    paddingVertical: 3,
    paddingHorizontal: 7,
  },
  greenTagText: {
    fontSize: 8.5,
    fontFamily: 'Helvetica-Bold',
    color: '#065f46',
  },
  redTag: {
    backgroundColor: '#fef2f2',
    borderWidth: 0.7,
    borderColor: '#fecaca',
    borderRadius: 3,
    paddingVertical: 3,
    paddingHorizontal: 7,
  },
  redTagText: {
    fontSize: 8.5,
    fontFamily: 'Helvetica-Bold',
    color: '#991b1b',
  },
  orangeTag: {
    backgroundColor: '#fffbeb',
    borderWidth: 0.7,
    borderColor: '#fde68a',
    borderRadius: 3,
    paddingVertical: 3,
    paddingHorizontal: 7,
  },
  orangeTagText: {
    fontSize: 8.5,
    fontFamily: 'Helvetica-Bold',
    color: '#92400e',
  },
  calloutGood: {
    backgroundColor: '#ecfdf5',
    borderWidth: 0.8,
    borderColor: '#a7f3d0',
    borderRadius: 4,
    padding: 9,
    marginBottom: 6,
  },
  calloutWarn: {
    backgroundColor: '#fffbeb',
    borderWidth: 0.8,
    borderColor: '#fde68a',
    borderRadius: 4,
    padding: 9,
    marginBottom: 6,
  },
  itemCard: {
    borderWidth: 0.7,
    borderColor: '#cbd5e1',
    borderRadius: 4,
    padding: 9,
    marginBottom: 7,
    backgroundColor: '#ffffff',
  },
  itemTitle: {
    fontSize: 9.5,
    fontFamily: 'Helvetica-Bold',
    color: '#0f172a',
    marginBottom: 3,
  },
  itemMeta: {
    fontSize: 8,
    color: '#64748b',
    marginBottom: 3,
  },
  suggestedBox: {
    marginTop: 5,
    padding: 6,
    backgroundColor: '#f8fafc',
    borderWidth: 0.5,
    borderColor: '#e2e8f0',
    borderRadius: 3,
  },
  catRow: {
    marginBottom: 6,
    paddingBottom: 5,
    borderBottomWidth: 0.4,
    borderBottomColor: '#e2e8f0',
  },
  catHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 3,
  },
  catLabel: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 9,
    color: '#0f172a',
  },
  catScore: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 9,
    color: '#0f2b5c',
  },
  skillTableRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
    borderBottomWidth: 0.4,
    borderBottomColor: '#e2e8f0',
  },
  footerText: {
    position: 'absolute',
    bottom: 20,
    left: 0,
    right: 0,
    fontSize: 8,
    color: '#64748b',
    textAlign: 'center',
  },
});

function cleanPdfText(value?: string): string {
  return (value || '').replace(/→/g, 'to');
}

function simplifyCategoryLabel(label: string): string {
  switch (label) {
    case 'Mandatory Keywords':
      return 'Important Job Skills';
    case 'Experience Relevance':
      return 'Project & Experience Match';
    case 'Education & Qualifications':
      return 'Education Check';
    case 'Resume Structure':
      return 'Resume Sections';
    case 'Formatting & Readability':
      return 'Resume Readability';
    default:
      return label;
  }
}

interface AtsReportPdfDocumentProps {
  record: AtsAnalysisRecord;
}

export const AtsReportPdfDocument: React.FC<AtsReportPdfDocumentProps> = ({ record }) => {
  const analysis = record.latestAnalysis;
  const formattedDate = new Date(record.updatedAt || record.createdAt).toLocaleDateString(
    undefined,
    { year: 'numeric', month: 'short', day: 'numeric' }
  );

  const bandDisplay = getFriendlyBandDisplay(analysis.scoreBand);
  const { matchedSkills, missingSkills } = getSkillMatchLists(analysis, record.companyName);
  const scoreSummary = getPlainEnglishScoreSummary(
    analysis.overallScore,
    missingSkills.length,
    analysis.formattingIssues.length
  );

  const topSuggestions = [...(record.suggestions || [])]
    .sort((a, b) => {
      const w = (p: 'high' | 'medium' | 'low') => (p === 'high' ? 0 : p === 'medium' ? 1 : 2);
      return w(a.priority) - w(b.priority);
    })
    .slice(0, 5);

  const filteredSkillsGap = (analysis.skillsGap || []).filter(
    (s) => !isCompanyToken(s.skill, record.companyName)
  );
  const requiredJobSkills = (record.parsedJob.mandatorySkills || []).filter(
    (s) => !isCompanyToken(s, record.companyName)
  );
  const bonusJobSkills = (record.parsedJob.preferredSkills || []).filter(
    (s) => !isCompanyToken(s, record.companyName)
  );

  return (
    <Document title={`Resume Match Report - ${record.resumeName}`} author="Resume Checker">
      <Page size="A4" style={styles.page}>
        {/* Clean Blue & White Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Resume Match Report</Text>
          <View style={styles.metaRow}>
            <Text>
              <Text style={styles.metaStrong}>Resume: </Text>
              {record.resumeName}
            </Text>
            <Text>
              <Text style={styles.metaStrong}>Target Role: </Text>
              {record.jobTitle || 'Target Role'}
              {record.companyName ? ` at ${record.companyName}` : ''}
            </Text>
            <Text>
              <Text style={styles.metaStrong}>Date: </Text>
              {formattedDate}
            </Text>
          </View>
        </View>

        {/* A. Resume Match Score */}
        <View style={styles.scoreCard} wrap={false}>
          <View style={styles.scoreTopRow}>
            <Text style={styles.scoreLabel}>
              Resume Match Score — {bandDisplay.label}
            </Text>
            <Text style={styles.scoreNumber}>{analysis.overallScore}/100</Text>
          </View>
          <View style={styles.progressTrack}>
            <View
              style={[
                styles.progressFill,
                { width: `${Math.min(100, Math.max(3, analysis.overallScore))}%` },
              ]}
            />
          </View>
          <Text style={styles.bodyText}>{scoreSummary}</Text>
        </View>

        {/* Before & After Comparison Summary if updated */}
        {record.comparison && (
          <View style={styles.comparisonBox} wrap={false}>
            <Text style={styles.itemTitle}>Before &amp; After Update</Text>
            <Text style={[styles.bodyText, { marginBottom: 3 }]}>
              {cleanPdfText(record.comparison.summaryNote)}
            </Text>
            <Text style={styles.itemMeta}>
              Resume Match: {record.comparison.originalScore} to {record.comparison.updatedScore} |{' '}
              Matched Skills: {record.comparison.originalMatchedCount} to{' '}
              {record.comparison.updatedMatchedCount} | Applied Changes:{' '}
              {record.comparison.appliedSuggestionCount}
            </Text>
          </View>
        )}

        {/* B. Your Resume Strengths */}
        <Text style={styles.sectionHeading} minPresenceAhead={45}>
          Your Resume Strengths ({matchedSkills.length})
        </Text>
        {matchedSkills.length === 0 ? (
          <Text style={[styles.bodyText, { marginBottom: 6 }]}>
            No matching job skills were spotted yet in your resume.
          </Text>
        ) : (
          <View style={styles.tagWrap}>
            {matchedSkills.map((skill, idx) => (
              <View key={`matched_${idx}`} style={styles.greenTag}>
                <Text style={styles.greenTagText}>{skill}</Text>
              </View>
            ))}
          </View>
        )}

        {/* C. Skills You Are Missing */}
        <Text style={styles.sectionHeading} minPresenceAhead={45}>
          Skills You Are Missing ({missingSkills.length})
        </Text>
        <Text style={[styles.itemMeta, { marginBottom: 6 }]}>
          Only add a skill below if you genuinely have experience with it.
        </Text>
        {missingSkills.length === 0 ? (
          <View style={styles.calloutGood} wrap={false}>
            <Text style={styles.bodyText}>
              Great news — all main skills listed in the job post appear in your resume.
            </Text>
          </View>
        ) : (
          <View style={styles.tagWrap}>
            {missingSkills.map((item, idx) => {
              const isImportant = item.level === 'mandatory';
              return (
                <View
                  key={`missing_${idx}`}
                  style={isImportant ? styles.redTag : styles.orangeTag}
                >
                  <Text style={isImportant ? styles.redTagText : styles.orangeTagText}>
                    {item.name}
                  </Text>
                </View>
              );
            })}
          </View>
        )}

        {/* D. Resume Format Check */}
        <Text style={styles.sectionHeading} minPresenceAhead={45}>
          Resume Format Check
        </Text>
        {analysis.formattingIssues.length === 0 ? (
          <View style={styles.calloutGood} wrap={false}>
            <Text style={[styles.itemTitle, { color: '#065f46' }]}>
              Good – Your resume is easy to read.
            </Text>
            <Text style={[styles.bodyText, { color: '#065f46' }]}>
              Standard layout and clear section headings help scanners read your resume in the
              right order.
            </Text>
          </View>
        ) : (
          <View>
            <View style={styles.calloutWarn} wrap={false}>
              <Text style={[styles.itemTitle, { color: '#92400e' }]}>
                Needs Improvement – Some formatting issues were found.
              </Text>
            </View>
            {analysis.formattingIssues.map((issue) => (
              <View key={issue.id} style={styles.itemCard} wrap={false}>
                <Text style={styles.itemTitle}>{issue.title}</Text>
                <Text style={styles.bodyText}>{issue.detail}</Text>
                <Text style={[styles.bodyText, { marginTop: 3 }]}>
                  <Text style={styles.metaStrong}>How to fix: </Text>
                  {issue.recommendation}
                </Text>
              </View>
            ))}
          </View>
        )}

        {/* E. How to Improve Your Resume */}
        <Text style={styles.sectionHeading} minPresenceAhead={45}>
          How to Improve Your Resume
        </Text>
        {topSuggestions.length === 0 ? (
          <Text style={styles.bodyText}>
            Your resume wording is already clear and direct. No wording changes are needed.
          </Text>
        ) : (
          topSuggestions.map((sug, index) => (
            <View key={sug.id} style={styles.itemCard} wrap={false}>
              <Text style={styles.itemMeta}>
                Suggestion {index + 1} · {sug.targetSection}
              </Text>
              <Text style={styles.itemTitle}>{sug.title}</Text>
              <Text style={styles.bodyText}>
                <Text style={styles.metaStrong}>Why it matters: </Text>
                {sug.reason}
              </Text>
              {(sug.editedContent || sug.suggestedContent) && (
                <View style={styles.suggestedBox}>
                  <Text style={[styles.itemMeta, { marginBottom: 2 }]}>Suggested change:</Text>
                  <Text style={styles.bodyText}>{sug.editedContent || sug.suggestedContent}</Text>
                </View>
              )}
            </View>
          ))
        )}

        {/* F. More Details (Clean Stacked Sections — Zero Overlapping Columns) */}
        <Text style={styles.sectionHeading} minPresenceAhead={50}>
          More Details — Score Breakdown
        </Text>
        {analysis.categories.map((cat) => (
          <View key={cat.key} style={styles.catRow} wrap={false}>
            <View style={styles.catHeader}>
              <Text style={styles.catLabel}>{simplifyCategoryLabel(cat.label)}</Text>
              <Text style={styles.catScore}>
                {cat.earned} / {cat.max} ({cat.percentage}%)
              </Text>
            </View>
            <View style={styles.progressTrack}>
              <View
                style={[styles.progressFill, { width: `${Math.max(2, cat.percentage)}%` }]}
              />
            </View>
            <Text style={styles.itemMeta}>{cat.summary}</Text>
          </View>
        ))}

        {/* Job Requirements Summary */}
        <Text style={styles.sectionHeading} minPresenceAhead={45}>
          Job Requirements
        </Text>
        <View style={styles.itemCard} wrap={false}>
          <Text style={[styles.bodyText, { marginBottom: 3 }]}>
            <Text style={styles.metaStrong}>Target Role: </Text>
            {record.parsedJob.jobTitle || 'Not listed'}
            {record.parsedJob.experienceLevel ? ` (${record.parsedJob.experienceLevel})` : ''}
          </Text>
          <Text style={[styles.bodyText, { marginBottom: 3 }]}>
            <Text style={styles.metaStrong}>Education Check: </Text>
            {record.parsedJob.educationRequirement || 'No specific degree required'}
          </Text>
          <Text style={[styles.bodyText, { marginBottom: 3 }]}>
            <Text style={styles.metaStrong}>Important Job Skills: </Text>
            {requiredJobSkills.join(', ') || 'None isolated'}
          </Text>
          {bonusJobSkills.length > 0 && (
            <Text style={styles.bodyText}>
              <Text style={styles.metaStrong}>Helpful Bonus Skills: </Text>
              {bonusJobSkills.join(', ')}
            </Text>
          )}
        </View>

        {/* Detailed Skill Matching Table */}
        {filteredSkillsGap.length > 0 && (
          <View>
            <Text style={styles.sectionHeading} minPresenceAhead={45}>
              Detailed Skill Matching
            </Text>
            {filteredSkillsGap.map((row, idx) => (
              <View key={`skill_row_${idx}`} style={styles.skillTableRow} wrap={false}>
                <Text style={[styles.bodyText, { fontFamily: 'Helvetica-Bold', width: '36%' }]}>
                  {row.skill}
                </Text>
                <Text style={[styles.bodyText, { width: '24%' }]}>
                  {row.requirementLevel === 'mandatory' ? 'Important' : 'Helpful'}
                </Text>
                <Text
                  style={[
                    styles.bodyText,
                    {
                      width: '40%',
                      textAlign: 'right',
                      color:
                        row.status === 'present'
                          ? '#065f46'
                          : row.status === 'partial'
                          ? '#92400e'
                          : '#991b1b',
                      fontFamily: 'Helvetica-Bold',
                    },
                  ]}
                >
                  {row.status === 'present'
                    ? 'Matched'
                    : row.status === 'partial'
                    ? 'Partially Shown'
                    : 'Missing'}
                </Text>
              </View>
            ))}
          </View>
        )}

        {/* Fixed Footer Safely Below Content Margin */}
        <Text
          style={styles.footerText}
          render={({ pageNumber, totalPages }) =>
            `Resume Checker Report  ·  Page ${pageNumber} of ${totalPages}`
          }
          fixed
        />
      </Page>
    </Document>
  );
};
