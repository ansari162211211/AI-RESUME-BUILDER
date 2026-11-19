import React, { useState, useEffect, useRef } from 'react';
import {
  ArrowLeft,
  UploadCloud,
  FileText,
  AlertCircle,
  CheckCircle2,
  Loader2,
  Download,
  Edit3,
  History,
  Plus,
  ChevronDown,
  ChevronUp,
  Replace,
} from 'lucide-react';
import type { AuthUser, Resume } from '../../types/resume';
import type {
  AtsAnalysisRecord,
  AtsExtractedResumeDraft,
  AtsJobInputMetadata,
  AtsSuggestion,
} from '../../types/ats';
import { getTemplateById } from '../../data/templates';
import {
  applyAcceptedSuggestionsToDraft,
  applyAtsDraftToResume,
  buildComparisonSnapshot,
  parseRawResumeTextToDraft,
  rebuildDraftExtractedText,
  resumeToAtsDraft,
  scoreResumeAgainstJob,
  validateJobDescriptionInput,
} from '../../utils/atsScoringEngine';
import { extractResumeFromFile } from '../../utils/resumeFileExtractor';
import {
  deleteAtsAnalysis,
  extractJobRequirementsWithAi,
  generateAtsSuggestionsWithAi,
  getUserAtsAnalyses,
  isAtsCloudSyncPending,
  runScannedPdfOcrWithAi,
  saveAtsAnalysis,
} from '../../services/atsService';
import { saveResume } from '../../services/resumeService';
import { downloadAtsReportPdf } from '../../services/pdfService';
import { mapUserFacingError } from '../../utils/firebaseHelpers';
import { AtsResultsView } from './AtsResultsView';
import { AtsSuggestionsPanel } from './AtsSuggestionsPanel';
import { AtsHistoryPanel } from './AtsHistoryPanel';

interface AtsAnalyzerPageProps {
  user: AuthUser;
  userResumes: Resume[];
  onBackToDashboard: () => void;
  onOpenInResumeEditor: (resume: Resume) => void;
  initialResumeForAnalysis?: Resume | null;
}

type InputTab = 'upload' | 'existing';
type ResultsTab = 'overview' | 'improve';

export const AtsAnalyzerPage: React.FC<AtsAnalyzerPageProps> = ({
  user,
  userResumes,
  onBackToDashboard,
  onOpenInResumeEditor,
  initialResumeForAnalysis,
}) => {
  const [inputTab, setInputTab] = useState<InputTab>(
    initialResumeForAnalysis ? 'existing' : 'upload'
  );
  const [selectedResumeId, setSelectedResumeId] = useState<string>(
    initialResumeForAnalysis?.id || ''
  );

  // Extracted / Working Draft prior to analysis
  const [draft, setDraft] = useState<AtsExtractedResumeDraft | null>(() =>
    initialResumeForAnalysis ? resumeToAtsDraft(initialResumeForAnalysis) : null
  );
  const [extracting, setExtracting] = useState(false);
  const [extractionStatus, setExtractionStatus] = useState('');
  const [extractionError, setExtractionError] = useState('');
  const [showManualReview, setShowManualReview] = useState(false);
  const [showRawPasteFallback, setShowRawPasteFallback] = useState(false);
  const [rawPasteText, setRawPasteText] = useState('');

  // Job Description Inputs
  const [jobDescription, setJobDescription] = useState('');
  const [showAdditionalDetails, setShowAdditionalDetails] = useState(false);
  const [jobMeta, setJobMeta] = useState<AtsJobInputMetadata>({
    jobTitle: '',
    companyName: '',
    jobLocation: '',
    experienceLevel: '',
    industry: '',
  });
  const [jdError, setJdError] = useState('');

  // Analysis Execution & Active Record
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisStage, setAnalysisStage] = useState('');
  const [activeRecord, setActiveRecord] = useState<AtsAnalysisRecord | null>(null);
  const [resultsTab, setResultsTab] = useState<ResultsTab>('overview');
  const [rerunning, setRerunning] = useState(false);
  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const [actionFeedback, setActionFeedback] = useState('');

  // History State
  const [historyRecords, setHistoryRecords] = useState<AtsAnalysisRecord[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [cloudSyncPending, setCloudSyncPending] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    getUserAtsAnalyses(user.uid)
      .then((list) => {
        setHistoryRecords(list);
        setCloudSyncPending(isAtsCloudSyncPending());
      })
      .catch((err) => console.warn('Failed to load ATS history:', err));
  }, [user.uid]);

  useEffect(() => {
    if (initialResumeForAnalysis) {
      setInputTab('existing');
      setSelectedResumeId(initialResumeForAnalysis.id);
      setDraft(resumeToAtsDraft(initialResumeForAnalysis));
      setExtractionError('');
    }
  }, [initialResumeForAnalysis]);

  const handleSelectExistingResume = (resume: Resume) => {
    setSelectedResumeId(resume.id);
    setDraft(resumeToAtsDraft(resume));
    setExtractionError('');
    setShowManualReview(false);
  };

  const handleFileUpload = async (file: File) => {
    setExtracting(true);
    setExtractionError('');
    setExtractionStatus(`Reading "${file.name}"...`);

    try {
      const result = await extractResumeFromFile(file, {
        ocrPdfFallback: async (b64) => {
          setExtractionStatus('Scanned PDF detected — reading text with OCR...');
          return runScannedPdfOcrWithAi(b64);
        },
      });

      if (!result.success || !result.draft) {
        setDraft(null);
        setExtractionError(
          result.error || 'Could not read text from this file. Please try another PDF or DOCX.'
        );
        return;
      }

      setDraft(result.draft);
      setSelectedResumeId('');
      setShowManualReview(false);
    } catch (err: any) {
      setDraft(null);
      setExtractionError(
        err?.message || 'Unable to read this file. Please try uploading a PDF, DOCX, or TXT file.'
      );
    } finally {
      setExtracting(false);
      setExtractionStatus('');
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleParseManualPaste = () => {
    const clean = rawPasteText.trim();
    if (clean.length < 40) {
      setExtractionError('Please paste at least 40 characters of resume text.');
      return;
    }
    const parsedDraft = parseRawResumeTextToDraft(clean, {
      fileName: 'Pasted Resume.txt',
      fileFormat: 'txt',
      fileSizeBytes: clean.length,
    });
    setDraft(parsedDraft);
    setExtractionError('');
    setShowManualReview(false);
    setShowRawPasteFallback(false);
  };

  const handleDraftFieldEdit = (
    field: 'fullName' | 'jobTitle' | 'email' | 'phone' | 'location',
    value: string
  ) => {
    if (!draft) return;
    const nextDraft: AtsExtractedResumeDraft = {
      ...draft,
      personalInfo: {
        ...draft.personalInfo,
        [field]: value,
      },
    };
    nextDraft.extractedText = rebuildDraftExtractedText(nextDraft);
    setDraft(nextDraft);
  };

  const handleDraftSummaryEdit = (value: string) => {
    if (!draft) return;
    const nextDraft: AtsExtractedResumeDraft = {
      ...draft,
      summary: value,
    };
    nextDraft.extractedText = rebuildDraftExtractedText(nextDraft);
    setDraft(nextDraft);
  };

  const handleDraftSkillsEdit = (commaSeparated: string) => {
    if (!draft) return;
    const items = commaSeparated
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    const nextDraft: AtsExtractedResumeDraft = {
      ...draft,
      skills: items,
      skillCategories: items.length > 0 ? [{ category: 'Skills', skills: items }] : [],
    };
    nextDraft.extractedText = rebuildDraftExtractedText(nextDraft);
    setDraft(nextDraft);
  };

  const handleReparseRawText = (newRawText: string) => {
    if (!draft) return;
    const reparsed = parseRawResumeTextToDraft(newRawText, {
      fileName: draft.fileName,
      fileFormat: draft.fileFormat,
      fileSizeBytes: draft.fileSizeBytes,
      pageCount: draft.pageCount,
      isScannedPdf: draft.isScannedPdf,
      usedAiOcr: draft.usedAiOcr,
      isTwoColumnLayout: draft.layoutHints.isTwoColumnLayout,
      hasTablesOrColumnsInText: draft.layoutHints.hasTablesOrColumnsInText,
    });
    setDraft({
      ...reparsed,
      sourceType: draft.sourceType,
      sourceResumeId: draft.sourceResumeId,
      sourceTemplateId: draft.sourceTemplateId,
    });
  };

  const handleRunAnalysis = async () => {
    if (analyzing) return;

    if (!draft) {
      setExtractionError('Please upload your resume or pick a saved resume first.');
      return;
    }

    const jdCheck = validateJobDescriptionInput(jobDescription);
    if (!jdCheck.valid) {
      setJdError(jdCheck.error || 'Please paste a more complete job description.');
      return;
    }

    setJdError('');
    setAnalyzing(true);
    setActionFeedback('');

    try {
      setAnalysisStage('Reading job requirements...');
      const parsedJob = await extractJobRequirementsWithAi(jobDescription, jobMeta);

      setAnalysisStage('Calculating your resume match score...');
      const initialAnalysis = scoreResumeAgainstJob(draft, parsedJob);

      setAnalysisStage('Preparing honest improvement suggestions...');
      const suggestions = await generateAtsSuggestionsWithAi(draft, parsedJob, initialAnalysis);

      const now = new Date().toISOString();
      const record: AtsAnalysisRecord = {
        id: `ats_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        userId: user.uid,
        resumeName: draft.fileName || draft.personalInfo.fullName || 'Resume',
        sourceType: draft.sourceType,
        sourceResumeId: draft.sourceResumeId,
        sourceTemplateId: draft.sourceTemplateId,
        jobTitle: parsedJob.jobTitle || jobMeta.jobTitle || 'Target Role',
        companyName: parsedJob.companyName || jobMeta.companyName || '',
        jobLocation: parsedJob.jobLocation || jobMeta.jobLocation || '',
        experienceLevel: parsedJob.experienceLevel || jobMeta.experienceLevel || '',
        industry: parsedJob.industry || jobMeta.industry || '',
        jobDescription: jobDescription.trim(),
        originalScore: initialAnalysis.overallScore,
        latestScore: initialAnalysis.overallScore,
        scoreBand: initialAnalysis.scoreBand,
        improvementStatus: 'initial',
        originalDraft: JSON.parse(JSON.stringify(draft)),
        workingDraft: JSON.parse(JSON.stringify(draft)),
        parsedJob,
        initialAnalysis,
        latestAnalysis: initialAnalysis,
        suggestions,
        createdAt: now,
        updatedAt: now,
      };

      const saved = await saveAtsAnalysis(user.uid, record);
      setCloudSyncPending(isAtsCloudSyncPending());
      setActiveRecord(saved);
      setHistoryRecords((prev) => [saved, ...prev.filter((r) => r.id !== saved.id)]);
      setResultsTab('overview');
      setShowHistory(false);
    } catch (err: any) {
      setJdError(err?.message || 'Unable to analyze resume right now. Please try again.');
    } finally {
      setAnalyzing(false);
      setAnalysisStage('');
    }
  };

  const handleUpdateSuggestion = async (
    suggestionId: string,
    status: AtsSuggestion['status'],
    editedContent?: string
  ) => {
    if (!activeRecord) return;

    const updatedSuggestions = activeRecord.suggestions.map((s) => {
      if (s.id !== suggestionId) return s;
      if (status === 'pending') {
        const { editedContent: _drop, ...rest } = s;
        return { ...rest, status: 'pending' as const };
      }
      return {
        ...s,
        status,
        editedContent: status === 'edited' ? editedContent : s.editedContent,
      };
    });

    const updatedWorking = applyAcceptedSuggestionsToDraft(
      activeRecord.originalDraft,
      updatedSuggestions
    );

    const anyActive = updatedSuggestions.some(
      (s) => s.status === 'accepted' || s.status === 'edited'
    );

    const nextRecord: AtsAnalysisRecord = {
      ...activeRecord,
      suggestions: updatedSuggestions,
      workingDraft: updatedWorking,
      improvementStatus: anyActive ? 'in-review' : 'initial',
    };

    setActiveRecord(nextRecord);
    const saved = await saveAtsAnalysis(user.uid, nextRecord);
    setHistoryRecords((prev) => [saved, ...prev.filter((r) => r.id !== saved.id)]);
  };

  const handleAcceptAllPending = async () => {
    if (!activeRecord) return;
    const updatedSuggestions = activeRecord.suggestions.map((s) =>
      s.status === 'pending' ? { ...s, status: 'accepted' as const } : s
    );
    const updatedWorking = applyAcceptedSuggestionsToDraft(
      activeRecord.originalDraft,
      updatedSuggestions
    );
    const nextRecord: AtsAnalysisRecord = {
      ...activeRecord,
      suggestions: updatedSuggestions,
      workingDraft: updatedWorking,
      improvementStatus: 'in-review',
    };
    setActiveRecord(nextRecord);
    const saved = await saveAtsAnalysis(user.uid, nextRecord);
    setHistoryRecords((prev) => [saved, ...prev.filter((r) => r.id !== saved.id)]);
  };

  const handleRerunAnalysis = async () => {
    if (!activeRecord || rerunning) return;
    setRerunning(true);
    setActionFeedback('');

    try {
      const updatedWorking = applyAcceptedSuggestionsToDraft(
        activeRecord.originalDraft,
        activeRecord.suggestions
      );
      const latestAnalysis = scoreResumeAgainstJob(updatedWorking, activeRecord.parsedJob);
      const comparison = buildComparisonSnapshot(
        activeRecord.initialAnalysis,
        latestAnalysis,
        activeRecord.suggestions
      );

      const hasApplied = comparison.appliedSuggestionCount > 0;
      const nextRecord: AtsAnalysisRecord = {
        ...activeRecord,
        workingDraft: updatedWorking,
        latestAnalysis,
        latestScore: latestAnalysis.overallScore,
        scoreBand: latestAnalysis.scoreBand,
        comparison,
        improvementStatus: hasApplied ? 'improved' : 'initial',
      };

      const saved = await saveAtsAnalysis(user.uid, nextRecord);
      setActiveRecord(saved);
      setHistoryRecords((prev) => [saved, ...prev.filter((r) => r.id !== saved.id)]);
      setResultsTab('overview');
      setActionFeedback('Your match score has been updated with your selected improvements.');
    } finally {
      setRerunning(false);
    }
  };

  const handleOpenWorkingInEditor = async () => {
    if (!activeRecord) return;
    const existingMatch = activeRecord.sourceResumeId
      ? userResumes.find((r) => r.id === activeRecord.sourceResumeId) || null
      : null;

    const editableResume = applyAtsDraftToResume(
      existingMatch,
      activeRecord.workingDraft,
      user.uid,
      activeRecord.jobTitle
    );

    try {
      await saveResume(user.uid, editableResume);
    } catch (err) {
      console.warn('Could not sync working resume to cloud storage immediately:', err);
      setActionFeedback(
        mapUserFacingError(
          err,
          'Opened in editor with local browser backup because cloud sync was unavailable.'
        )
      );
    }
    onOpenInResumeEditor(editableResume);
  };

  const handleDownloadReportPdf = async () => {
    if (!activeRecord) return;
    setDownloadingPdf(true);
    setActionFeedback('');
    const res = await downloadAtsReportPdf(activeRecord);
    setDownloadingPdf(false);
    if (res.success) {
      setActionFeedback(`Downloaded report (${res.fileName}).`);
    } else {
      setActionFeedback(res.error || 'Could not create the PDF report right now.');
    }
  };

  const handleStartNewAnalysis = () => {
    setActiveRecord(null);
    setActionFeedback('');
    setShowHistory(false);
  };

  const handleOpenHistoryRecord = (rec: AtsAnalysisRecord) => {
    setActiveRecord(rec);
    setDraft(rec.workingDraft);
    setJobDescription(rec.jobDescription);
    setJobMeta({
      jobTitle: rec.jobTitle,
      companyName: rec.companyName,
      jobLocation: rec.jobLocation || '',
      experienceLevel: rec.experienceLevel || '',
      industry: rec.industry || '',
    });
    setResultsTab('overview');
    setShowHistory(false);
  };

  const handleReanalyzeHistoryRecord = (rec: AtsAnalysisRecord) => {
    setActiveRecord(null);
    setDraft(rec.workingDraft);
    setJobDescription(rec.jobDescription);
    setJobMeta({
      jobTitle: rec.jobTitle,
      companyName: rec.companyName,
      jobLocation: rec.jobLocation || '',
      experienceLevel: rec.experienceLevel || '',
      industry: rec.industry || '',
    });
    if (rec.sourceType === 'existing-resume' && rec.sourceResumeId) {
      setInputTab('existing');
      setSelectedResumeId(rec.sourceResumeId);
    } else {
      setInputTab('upload');
    }
    setShowHistory(false);
  };

  const handleDeleteHistoryRecord = async (analysisId: string) => {
    await deleteAtsAnalysis(user.uid, analysisId);
    setHistoryRecords((prev) => prev.filter((r) => r.id !== analysisId));
    if (activeRecord?.id === analysisId) {
      setActiveRecord(null);
    }
  };

  const jdWordCount = jobDescription.trim() ? jobDescription.trim().split(/\s+/).length : 0;

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6">
      {/* Clean Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <button
            type="button"
            onClick={onBackToDashboard}
            className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-600 hover:text-blue-700 mb-2 cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Dashboard</span>
          </button>

          <h1 className="text-2xl sm:text-3xl font-bold text-[#0f2b5c] tracking-tight">
            Resume Checker
          </h1>
          <p className="text-sm text-slate-600 mt-1">
            Upload your resume and add a job post to check your Resume Match and find clear steps
            to improve.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={() => setShowHistory((v) => !v)}
            data-testid="toggle-ats-history-btn"
            className="inline-flex items-center px-3.5 py-2 border border-slate-300 bg-white hover:bg-slate-50 text-slate-800 text-sm font-semibold rounded-lg cursor-pointer whitespace-nowrap"
          >
            <History className="w-4 h-4 mr-1.5 text-[#0f2b5c]" />
            <span>Previous Checks ({historyRecords.length})</span>
          </button>

          {activeRecord && (
            <button
              type="button"
              onClick={handleStartNewAnalysis}
              className="inline-flex items-center px-3.5 py-2 bg-[#0f2b5c] hover:bg-[#0a1e42] text-white text-sm font-semibold rounded-lg cursor-pointer whitespace-nowrap"
            >
              <Plus className="w-4 h-4 mr-1.5" />
              <span>New Check</span>
            </button>
          )}
        </div>
      </div>

      {/* Collapsible Previous Analyses Drawer */}
      {showHistory && (
        <AtsHistoryPanel
          records={historyRecords}
          activeRecordId={activeRecord?.id}
          cloudSyncPending={cloudSyncPending}
          onOpenRecord={handleOpenHistoryRecord}
          onReanalyzeRecord={handleReanalyzeHistoryRecord}
          onDeleteRecord={handleDeleteHistoryRecord}
        />
      )}

      {/* SIMPLE 3-STEP UPLOAD & JOB WORKFLOW */}
      {!activeRecord && (
        <div className="space-y-6">
          {/* Hidden file input kept mounted so Replace File works smoothly */}
          <input
            ref={fileInputRef}
            type="file"
            data-testid="ats-file-input"
            accept=".pdf,.docx,.txt,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleFileUpload(file);
            }}
            className="hidden"
          />

          {/* STEP 1: UPLOAD YOUR RESUME */}
          <section className="bg-white border border-slate-200 rounded-xl p-5 sm:p-6 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="text-xs font-semibold uppercase tracking-wide text-blue-700">
                  Step 1
                </div>
                <h2 className="text-lg font-bold text-slate-900">Upload Your Resume</h2>
              </div>

              <div className="inline-flex border border-slate-300 rounded-lg overflow-hidden text-sm font-medium">
                <button
                  type="button"
                  onClick={() => setInputTab('upload')}
                  data-testid="tab-upload-resume"
                  className={`px-3.5 py-1.5 cursor-pointer transition-colors ${
                    inputTab === 'upload'
                      ? 'bg-blue-700 text-white'
                      : 'bg-white text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  Upload File
                </button>
                <button
                  type="button"
                  onClick={() => setInputTab('existing')}
                  data-testid="tab-existing-resume"
                  className={`px-3.5 py-1.5 cursor-pointer transition-colors ${
                    inputTab === 'existing'
                      ? 'bg-blue-700 text-white'
                      : 'bg-white text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  Saved Resumes ({userResumes.length})
                </button>
              </div>
            </div>

            {inputTab === 'upload' ? (
              <div className="space-y-4">
                {!draft || draft.sourceType === 'existing-resume' ? (
                  <div
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => {
                      e.preventDefault();
                      const file = e.dataTransfer.files?.[0];
                      if (file) handleFileUpload(file);
                    }}
                    onClick={() => !extracting && fileInputRef.current?.click()}
                    className="border-2 border-dashed border-slate-300 hover:border-blue-600 bg-slate-50/70 rounded-xl p-8 text-center cursor-pointer transition-colors"
                  >
                    {extracting ? (
                      <div className="py-2 space-y-2">
                        <Loader2 className="w-8 h-8 text-blue-700 animate-spin mx-auto" />
                        <p className="text-sm font-semibold text-slate-800">{extractionStatus}</p>
                      </div>
                    ) : (
                      <>
                        <UploadCloud className="w-9 h-9 text-blue-700 mx-auto mb-2.5" />
                        <p className="text-base font-semibold text-slate-900">
                          Click to upload or drag &amp; drop your resume
                        </p>
                        <p className="text-sm text-slate-500 mt-1">
                          Supports PDF, DOCX, or TXT files (up to 15 MB)
                        </p>
                      </>
                    )}
                  </div>
                ) : null}

                {!draft && (
                  <div className="text-right">
                    <button
                      type="button"
                      onClick={() => setShowRawPasteFallback((v) => !v)}
                      className="text-sm font-medium text-slate-600 hover:text-blue-700 underline cursor-pointer"
                    >
                      {showRawPasteFallback
                        ? 'Hide text paste option'
                        : 'Or paste resume text manually'}
                    </button>
                  </div>
                )}

                {showRawPasteFallback && (
                  <div className="space-y-2.5 border border-slate-200 rounded-lg p-4 bg-slate-50">
                    <label className="block text-sm font-semibold text-slate-700">
                      Paste Your Resume Text
                    </label>
                    <textarea
                      value={rawPasteText}
                      onChange={(e) => setRawPasteText(e.target.value)}
                      rows={5}
                      placeholder="Paste your resume content here..."
                      className="w-full p-3 border border-slate-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-700"
                    />
                    <button
                      type="button"
                      onClick={handleParseManualPaste}
                      className="px-4 py-2 bg-blue-700 hover:bg-blue-800 text-white text-sm font-semibold rounded-lg cursor-pointer"
                    >
                      Use Pasted Resume
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
                {userResumes.length === 0 ? (
                  <div className="p-6 border border-dashed border-slate-200 rounded-lg text-center text-sm text-slate-500">
                    You have no saved resumes yet. Switch to Upload File above to upload a PDF or
                    DOCX resume.
                  </div>
                ) : (
                  userResumes.map((r) => {
                    const tpl = getTemplateById(r.template);
                    const isSel = selectedResumeId === r.id;
                    return (
                      <button
                        key={r.id}
                        type="button"
                        onClick={() => handleSelectExistingResume(r)}
                        data-testid={`select-saved-resume-${r.id}`}
                        className={`w-full text-left p-4 border rounded-lg transition-colors cursor-pointer ${
                          isSel
                            ? 'border-blue-700 bg-blue-50/40'
                            : 'border-slate-200 hover:border-slate-300 bg-white'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="min-w-0">
                            <div className="text-sm font-bold text-slate-900 truncate">
                              {r.title}
                            </div>
                            <div className="text-xs sm:text-sm text-slate-500 mt-0.5 truncate">
                              {tpl.name} · {r.targetRole || r.personalInfo?.jobTitle || 'General'}
                            </div>
                          </div>
                          <span
                            className={`text-sm font-semibold shrink-0 ${
                              isSel ? 'text-blue-700' : 'text-slate-600'
                            }`}
                          >
                            {isSel ? 'Selected' : 'Select'}
                          </span>
                        </div>
                      </button>
                    );
                  })
                )}
              </div>
            )}

            {/* Extraction Error Box */}
            {extractionError && (
              <div
                className="p-4 border border-red-200 bg-red-50 rounded-lg text-sm text-red-800 flex items-start gap-2.5"
                data-testid="extraction-error-box"
              >
                <AlertCircle className="w-5 h-5 shrink-0 mt-0.5 text-red-600" />
                <div className="space-y-1.5">
                  <div className="font-semibold">{extractionError}</div>
                  <button
                    type="button"
                    onClick={() => {
                      setExtractionError('');
                      setShowRawPasteFallback(true);
                    }}
                    className="text-blue-700 font-semibold underline cursor-pointer"
                  >
                    Paste resume text manually instead
                  </button>
                </div>
              </div>
            )}

            {/* Selected / Uploaded File Confirmation + Replace & Review */}
            {draft && (
              <div
                className="border border-emerald-200 bg-emerald-50/40 rounded-xl p-4 space-y-3"
                data-testid="extracted-draft-ready"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-start gap-2.5 min-w-0">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                    <div className="min-w-0">
                      <div className="text-sm font-bold text-slate-900 truncate">
                        {draft.fileName}
                      </div>
                      <div className="text-xs sm:text-sm text-slate-600 mt-0.5">
                        Ready to analyze · {draft.skills.length} skills found
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 shrink-0">
                    {inputTab === 'upload' && (
                      <button
                        type="button"
                        onClick={() => !extracting && fileInputRef.current?.click()}
                        data-testid="replace-resume-file-btn"
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs sm:text-sm font-semibold rounded-lg cursor-pointer"
                      >
                        <Replace className="w-3.5 h-3.5" />
                        <span>Replace File</span>
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => setShowManualReview((v) => !v)}
                      data-testid="toggle-review-extracted-btn"
                      className="inline-flex items-center gap-1 px-3 py-1.5 text-blue-700 hover:underline text-xs sm:text-sm font-semibold cursor-pointer"
                    >
                      <span>{showManualReview ? 'Hide Details' : 'Review & Edit'}</span>
                      {showManualReview ? (
                        <ChevronUp className="w-4 h-4" />
                      ) : (
                        <ChevronDown className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>

                {draft.extractionWarnings.length > 0 && (
                  <div className="text-xs sm:text-sm text-amber-900 bg-amber-50 border border-amber-200 rounded-lg p-3 space-y-1">
                    {draft.extractionWarnings.map((w, i) => (
                      <div key={i}>• {w}</div>
                    ))}
                  </div>
                )}

                {showManualReview && (
                  <div className="pt-3 border-t border-emerald-200 space-y-3 bg-white p-4 rounded-lg border">
                    <div className="text-sm font-bold text-slate-900">
                      Review Extracted Details
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                      <div>
                        <label className="block text-xs font-semibold text-slate-600 mb-1">
                          Full Name
                        </label>
                        <input
                          type="text"
                          value={draft.personalInfo.fullName}
                          onChange={(e) => handleDraftFieldEdit('fullName', e.target.value)}
                          className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-600 mb-1">
                          Email
                        </label>
                        <input
                          type="text"
                          value={draft.personalInfo.email}
                          onChange={(e) => handleDraftFieldEdit('email', e.target.value)}
                          className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-600 mb-1">
                          Phone
                        </label>
                        <input
                          type="text"
                          value={draft.personalInfo.phone}
                          onChange={(e) => handleDraftFieldEdit('phone', e.target.value)}
                          className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-600 mb-1">
                          Location
                        </label>
                        <input
                          type="text"
                          value={draft.personalInfo.location}
                          onChange={(e) => handleDraftFieldEdit('location', e.target.value)}
                          className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1">
                        Summary
                      </label>
                      <textarea
                        rows={2}
                        value={draft.summary}
                        onChange={(e) => handleDraftSummaryEdit(e.target.value)}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1">
                        Extracted Skills (comma-separated)
                      </label>
                      <input
                        type="text"
                        value={draft.skills.join(', ')}
                        onChange={(e) => handleDraftSkillsEdit(e.target.value)}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1">
                        Extracted Text
                      </label>
                      <textarea
                        rows={4}
                        value={draft.extractedText}
                        onChange={(e) => handleReparseRawText(e.target.value)}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-mono"
                      />
                    </div>
                  </div>
                )}
              </div>
            )}
          </section>

          {/* STEP 2: ADD JOB DESCRIPTION */}
          <section className="bg-white border border-slate-200 rounded-xl p-5 sm:p-6 space-y-4">
            <div className="flex items-center justify-between gap-2">
              <div>
                <div className="text-xs font-semibold uppercase tracking-wide text-blue-700">
                  Step 2
                </div>
                <h2 className="text-lg font-bold text-slate-900">Add Job Description</h2>
              </div>
              <span className="text-sm text-slate-500 tabular-nums">{jdWordCount} words</span>
            </div>

            <div>
              <label
                htmlFor="ats-jd-textarea"
                className="block text-sm font-medium text-slate-700 mb-2"
              >
                Paste the job description you want to apply for <span className="text-red-600">*</span>
              </label>
              <textarea
                id="ats-jd-textarea"
                data-testid="ats-jd-textarea"
                value={jobDescription}
                onChange={(e) => {
                  setJobDescription(e.target.value);
                  if (jdError) setJdError('');
                }}
                rows={7}
                placeholder="Paste the job requirements, skills, and responsibilities here..."
                className="w-full p-3.5 border border-slate-300 rounded-lg text-sm leading-relaxed focus:outline-none focus:ring-2 focus:ring-blue-700"
              />
            </div>

            {/* Expandable Additional Details Section */}
            <div className="border-t border-slate-200 pt-3">
              <button
                type="button"
                onClick={() => setShowAdditionalDetails((v) => !v)}
                data-testid="toggle-additional-jd-details-btn"
                aria-expanded={showAdditionalDetails}
                className="inline-flex items-center gap-1.5 text-sm font-semibold text-blue-700 hover:underline cursor-pointer"
              >
                <span>Additional Details (Optional)</span>
                {showAdditionalDetails ? (
                  <ChevronUp className="w-4 h-4" />
                ) : (
                  <ChevronDown className="w-4 h-4" />
                )}
              </button>

              {showAdditionalDetails && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 text-sm mt-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">
                      Job Title
                    </label>
                    <input
                      type="text"
                      data-testid="ats-job-title-input"
                      value={jobMeta.jobTitle}
                      onChange={(e) => setJobMeta({ ...jobMeta, jobTitle: e.target.value })}
                      placeholder="e.g. Software Engineer"
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">
                      Company Name
                    </label>
                    <input
                      type="text"
                      data-testid="ats-company-input"
                      value={jobMeta.companyName}
                      onChange={(e) => setJobMeta({ ...jobMeta, companyName: e.target.value })}
                      placeholder="e.g. Acme Inc."
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">
                      Location
                    </label>
                    <input
                      type="text"
                      value={jobMeta.jobLocation}
                      onChange={(e) => setJobMeta({ ...jobMeta, jobLocation: e.target.value })}
                      placeholder="e.g. Remote or New York, NY"
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">
                      Experience Level
                    </label>
                    <select
                      value={jobMeta.experienceLevel}
                      onChange={(e) => setJobMeta({ ...jobMeta, experienceLevel: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white"
                    >
                      <option value="">Detect automatically</option>
                      <option value="Internship / Co-op">Internship / Co-op</option>
                      <option value="Entry / Junior">Entry / Junior (0–2 yrs)</option>
                      <option value="Mid-Level">Mid-Level (2–5 yrs)</option>
                      <option value="Senior">Senior (5+ yrs)</option>
                      <option value="Staff / Executive">Staff / Lead / Executive</option>
                    </select>
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-semibold text-slate-600 mb-1">
                      Industry
                    </label>
                    <input
                      type="text"
                      value={jobMeta.industry}
                      onChange={(e) => setJobMeta({ ...jobMeta, industry: e.target.value })}
                      placeholder="e.g. Technology, Healthcare, Finance"
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                    />
                  </div>
                </div>
              )}
            </div>
          </section>

          {/* STEP 3: ANALYZE RESUME */}
          <section className="bg-white border border-slate-200 rounded-xl p-5 sm:p-6 space-y-4">
            <div>
              <div className="text-xs font-semibold uppercase tracking-wide text-[#0f2b5c]">
                Step 3
              </div>
              <h2 className="text-lg font-bold text-slate-900">Check Resume Match</h2>
              <p className="text-sm text-slate-600 mt-0.5">
                Compare your resume against the job requirements in seconds.
              </p>
            </div>

            {jdError && (
              <div
                className="p-3.5 border border-red-200 bg-red-50 rounded-lg text-sm text-red-800 flex items-start gap-2.5"
                data-testid="ats-jd-error"
              >
                <AlertCircle className="w-5 h-5 shrink-0 mt-0.5 text-red-600" />
                <span>{jdError}</span>
              </div>
            )}

            <button
              type="button"
              onClick={handleRunAnalysis}
              disabled={analyzing || !draft}
              data-testid="analyze-resume-submit-btn"
              className="w-full sm:w-auto min-w-[240px] py-3 px-6 bg-[#0f2b5c] hover:bg-[#0a1e42] disabled:bg-slate-300 text-white text-base font-semibold rounded-lg flex items-center justify-center gap-2 transition-colors cursor-pointer disabled:cursor-not-allowed"
            >
              {analyzing ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>{analysisStage || 'Checking Your Resume...'}</span>
                </>
              ) : (
                <span>Check My Resume</span>
              )}
            </button>
          </section>
        </div>
      )}

      {/* CLEAN BEGINNER-FRIENDLY RESULTS WORKSPACE */}
      {activeRecord && (
        <div className="space-y-5">
          {/* Active File + Export/Editor Context Strip */}
          <div className="bg-white border border-slate-200 rounded-xl p-4 sm:px-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div className="flex items-center gap-2.5 text-sm text-slate-600 min-w-0">
              <FileText className="w-4 h-4 text-[#0f2b5c] shrink-0" />
              <span className="font-bold text-slate-900 truncate">{activeRecord.resumeName}</span>
              <span className="text-slate-400">·</span>
              <span className="truncate">
                {activeRecord.jobTitle}
                {activeRecord.companyName ? ` @ ${activeRecord.companyName}` : ''}
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-2.5 shrink-0">
              <button
                type="button"
                onClick={handleOpenWorkingInEditor}
                data-testid="open-in-resume-editor-btn"
                className="inline-flex items-center px-3.5 py-2 border border-[#0f2b5c] text-[#0f2b5c] bg-blue-50/50 hover:bg-blue-50 text-sm font-semibold rounded-lg cursor-pointer whitespace-nowrap"
              >
                <Edit3 className="w-4 h-4 mr-1.5" />
                Open in Resume Editor
              </button>

              <button
                type="button"
                onClick={handleDownloadReportPdf}
                disabled={downloadingPdf}
                data-testid="download-ats-report-btn"
                className="inline-flex items-center px-4 py-2 bg-[#0f2b5c] hover:bg-[#0a1e42] text-white text-sm font-semibold rounded-lg cursor-pointer disabled:opacity-60 whitespace-nowrap"
              >
                {downloadingPdf ? (
                  <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
                ) : (
                  <Download className="w-4 h-4 mr-1.5" />
                )}
                Download Report (PDF)
              </button>
            </div>
          </div>

          {actionFeedback && (
            <div className="px-4 py-3 bg-blue-50 border border-blue-200 rounded-lg text-sm font-medium text-blue-900">
              {actionFeedback}
            </div>
          )}

          {/* Two Simple Tabs: Resume Match (Main Page) & Suggested Changes */}
          <div className="border-b border-slate-200 flex items-center gap-1 sm:gap-2 overflow-x-auto">
            {(
              [
                { id: 'overview', label: 'Resume Match' },
                {
                  id: 'improve',
                  label: `Suggested Changes (${Math.min(5, activeRecord.suggestions.length)})`,
                },
              ] as const
            ).map((tab) => (
              <button
                key={tab.id}
                type="button"
                data-testid={`results-tab-${tab.id}`}
                onClick={() => setResultsTab(tab.id)}
                className={`px-3 sm:px-4 py-3 text-xs sm:text-sm font-semibold border-b-2 transition-colors whitespace-nowrap cursor-pointer ${
                  resultsTab === tab.id
                    ? 'border-[#0f2b5c] text-[#0f2b5c]'
                    : 'border-transparent text-slate-600 hover:text-slate-900'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Active View */}
          {resultsTab === 'improve' ? (
            <AtsSuggestionsPanel
              record={activeRecord}
              onUpdateSuggestion={handleUpdateSuggestion}
              onAcceptAllPending={handleAcceptAllPending}
              onRerunAnalysis={handleRerunAnalysis}
              rerunning={rerunning}
            />
          ) : (
            <AtsResultsView
              record={activeRecord}
              onGoToImproveTab={() => setResultsTab('improve')}
              onUpdateSuggestion={handleUpdateSuggestion}
              onRerunAnalysis={handleRerunAnalysis}
              rerunning={rerunning}
            />
          )}
        </div>
      )}
    </div>
  );
};
