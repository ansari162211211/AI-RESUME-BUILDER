import React, { useState, useRef } from 'react';
import {
  UploadCloud,
  FileText,
  CheckCircle2,
  AlertCircle,
  X,
  Loader2,
  ArrowRight,
  Sparkles,
  Info,
  Check,
  GraduationCap,
  Briefcase,
  BookOpen,
  Code2,
} from 'lucide-react';
import { extractCvWithGemini } from '../../services/aiService';
import type { Resume } from '../../types/resume';
import { BLANK_ACADEMIC_CV } from '../../data/sampleResumes';

interface UploadCvModalProps {
  isOpen: boolean;
  onClose: () => void;
  onExtracted: (resumeData: Resume) => void;
  userId: string;
}

type Step = 'upload' | 'processing' | 'review' | 'error';

export const UploadCvModal: React.FC<UploadCvModalProps> = ({
  isOpen,
  onClose,
  onExtracted,
  userId,
}) => {
  const [step, setStep] = useState<Step>('upload');
  const [fileName, setFileName] = useState('');
  const [fileSize, setFileSize] = useState('');
  const [progressMsg, setProgressMsg] = useState('');
  const [extractedResume, setExtractedResume] = useState<Resume | null>(null);
  const [extractionNotes, setExtractionNotes] = useState<string[]>([]);
  const [errorMsg, setErrorMsg] = useState('');
  const [rawTextFallback, setRawTextFallback] = useState('');
  const [showRawTextOption, setShowRawTextOption] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const resetState = () => {
    setStep('upload');
    setFileName('');
    setFileSize('');
    setProgressMsg('');
    setExtractedResume(null);
    setExtractionNotes([]);
    setErrorMsg('');
    setRawTextFallback('');
    setShowRawTextOption(false);
  };

  const handleClose = () => {
    resetState();
    onClose();
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    await processFile(file);
  };

  const handleDrop = async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (!file) return;
    await processFile(file);
  };

  const processFile = async (file: File) => {
    if (!file.name.toLowerCase().endsWith('.pdf') && file.type !== 'application/pdf') {
      setErrorMsg('Please upload a valid PDF document (.pdf).');
      setStep('error');
      return;
    }

    setFileName(file.name);
    setFileSize(`${(file.size / (1024 * 1024)).toFixed(2)} MB`);
    setStep('processing');
    setProgressMsg('Reading PDF document & encoding...');

    try {
      // Convert file to base64
      const reader = new FileReader();
      const base64Promise = new Promise<string>((resolve, reject) => {
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = (err) => reject(err);
      });
      reader.readAsDataURL(file);
      const base64DataUrl = await base64Promise;

      setProgressMsg('Running Gemini AI document understanding & OCR...');
      const result = await extractCvWithGemini(base64DataUrl, undefined, 'application/pdf');

      setProgressMsg('Categorizing into 14 academic CV sections...');
      const data = result.extractedData;

      const mergedResume: Resume = {
        ...BLANK_ACADEMIC_CV,
        id: `resume_${Date.now()}`,
        userId,
        title: data.title || `${data.personalInfo?.fullName || 'Extracted'} - Academic CV`,
        personalInfo: {
          ...BLANK_ACADEMIC_CV.personalInfo,
          ...(data.personalInfo || {}),
        },
        objective: data.objective || '',
        education: (data.education || []).map((edu: any, i: number) => ({
          id: edu.id || `edu_${Date.now()}_${i}`,
          institution: edu.institution || '',
          degree: edu.degree || '',
          specialization: edu.specialization || '',
          location: edu.location || '',
          startDate: edu.startDate || '',
          endDate: edu.endDate || '',
          current: !!edu.current,
          grade: edu.grade || '',
          achievements: edu.achievements || '',
        })),
        experience: (data.experience || []).map((exp: any, i: number) => ({
          id: exp.id || `exp_${Date.now()}_${i}`,
          company: exp.company || '',
          position: exp.position || '',
          location: exp.location || '',
          employmentType: exp.employmentType || 'Full-Time',
          startDate: exp.startDate || '',
          endDate: exp.endDate || '',
          current: !!exp.current,
          highlights: exp.highlights && exp.highlights.length > 0 ? exp.highlights : [''],
        })),
        publications: (data.publications || []).map((pub: any, i: number) => ({
          id: pub.id || `pub_${Date.now()}_${i}`,
          type: pub.type || 'journal',
          title: pub.title || '',
          authors: pub.authors || '',
          year: pub.year || '',
          journalOrConference: pub.journalOrConference || '',
          publisher: pub.publisher || '',
          volume: pub.volume || '',
          issue: pub.issue || '',
          pages: pub.pages || '',
          doi: pub.doi || '',
          location: pub.location || '',
          patentNumber: pub.patentNumber || '',
        })),
        projects: (data.projects || []).map((proj: any, i: number) => ({
          id: proj.id || `proj_${Date.now()}_${i}`,
          title: proj.title || '',
          description: proj.description || '',
          startDate: proj.startDate || '',
          endDate: proj.endDate || '',
          technologies: proj.technologies || [],
          link: proj.link || '',
          highlights: proj.highlights && proj.highlights.length > 0 ? proj.highlights : [''],
        })),
        skills: (data.skills || []).map((sk: any, i: number) => ({
          id: sk.id || `sk_${Date.now()}_${i}`,
          category: sk.category || 'Core Competencies',
          skills: sk.skills || [],
        })),
        achievements: (data.achievements || []).map((ach: any, i: number) => ({
          id: ach.id || `ach_${Date.now()}_${i}`,
          title: ach.title || '',
          issuer: ach.issuer || '',
          date: ach.date || '',
          description: ach.description || '',
        })),
        leadership: (data.leadership || []).map((lead: any, i: number) => ({
          id: lead.id || `lead_${Date.now()}_${i}`,
          role: lead.role || '',
          organization: lead.organization || '',
          startDate: lead.startDate || '',
          endDate: lead.endDate || '',
          current: !!lead.current,
          location: lead.location || '',
          highlights: lead.highlights || [''],
        })),
        volunteer: (data.volunteer || []).map((vol: any, i: number) => ({
          id: vol.id || `vol_${Date.now()}_${i}`,
          role: vol.role || '',
          organization: vol.organization || '',
          startDate: vol.startDate || '',
          endDate: vol.endDate || '',
          current: !!vol.current,
          location: vol.location || '',
          highlights: vol.highlights || [''],
        })),
        memberships: (data.memberships || []).map((mem: any, i: number) => ({
          id: mem.id || `mem_${Date.now()}_${i}`,
          organization: mem.organization || '',
          membershipType: mem.membershipType || 'Member',
          membershipId: mem.membershipId || '',
          startDate: mem.startDate || '',
          endDate: mem.endDate || '',
          current: !!mem.current,
        })),
        certifications: (data.certifications || []).map((cert: any, i: number) => ({
          id: cert.id || `cert_${Date.now()}_${i}`,
          name: cert.name || '',
          issuer: cert.issuer || '',
          issueDate: cert.issueDate || '',
          expirationDate: cert.expirationDate || '',
          credentialId: cert.credentialId || '',
          link: cert.link || '',
        })),
        languages: data.languages || [],
        interests: data.interests || '',
        references: data.references || [],
        fontFamily: 'serif',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      setExtractedResume(mergedResume);
      setExtractionNotes(
        Array.isArray(data.extractionNotes)
          ? data.extractionNotes
          : [
              'All standard CV sections parsed and mapped.',
              'Original dates, degrees, and citations preserved.',
            ]
      );
      setStep('review');
    } catch (err: any) {
      console.error('Extraction error:', err);
      setErrorMsg(
        err?.message ||
          'Failed to extract CV information. Ensure your file is a readable PDF document.'
      );
      setStep('error');
    }
  };

  const handleRawTextSubmit = async () => {
    if (!rawTextFallback.trim()) return;
    setStep('processing');
    setProgressMsg('Extracting information from pasted CV text with Gemini...');

    try {
      const result = await extractCvWithGemini(undefined, rawTextFallback);
      const data = result.extractedData;
      const mergedResume: Resume = {
        ...BLANK_ACADEMIC_CV,
        id: `resume_${Date.now()}`,
        userId,
        title: data.title || `${data.personalInfo?.fullName || 'Extracted'} - Academic CV`,
        personalInfo: {
          ...BLANK_ACADEMIC_CV.personalInfo,
          ...(data.personalInfo || {}),
        },
        objective: data.objective || '',
        education: data.education || [],
        experience: data.experience || [],
        publications: data.publications || [],
        projects: data.projects || [],
        skills: data.skills || [],
        achievements: data.achievements || [],
        leadership: data.leadership || [],
        volunteer: data.volunteer || [],
        memberships: data.memberships || [],
        certifications: data.certifications || [],
        languages: data.languages || [],
        interests: data.interests || '',
        references: data.references || [],
        fontFamily: 'serif',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      setExtractedResume(mergedResume);
      setExtractionNotes(data.extractionNotes || ['Pasted text extracted successfully.']);
      setStep('review');
    } catch (err: any) {
      setErrorMsg(err?.message || 'Failed to process pasted text.');
      setStep('error');
    }
  };

  const handleConfirmAndOpen = () => {
    if (extractedResume) {
      onExtracted(extractedResume);
      handleClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full border border-slate-200 overflow-hidden flex flex-col max-h-[92vh] animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#0f2b5c] text-white flex items-center justify-center">
              <UploadCloud className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                Upload Existing CV (PDF) • Gemini AI Extraction
              </h3>
              <p className="text-xs text-slate-500">
                Extracts text, education, experience, publications &amp; skills automatically.
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="p-1 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto flex-1">
          {/* STEP 1: UPLOAD / DRAG & DROP */}
          {step === 'upload' && (
            <div className="space-y-4">
              <div
                onDragOver={(e) => e.preventDefault()}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-slate-300 hover:border-[#0f2b5c] bg-slate-50/60 hover:bg-slate-50 rounded-xl p-8 text-center cursor-pointer transition-colors group"
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileSelect}
                  accept=".pdf,application/pdf"
                  className="hidden"
                />
                <div className="w-14 h-14 rounded-full bg-slate-100 group-hover:bg-indigo-50 text-slate-500 group-hover:text-[#0f2b5c] flex items-center justify-center mx-auto mb-3 transition-colors">
                  <UploadCloud className="w-7 h-7" />
                </div>
                <h4 className="text-sm font-bold text-slate-800 mb-1">
                  Click to select or drag &amp; drop your CV PDF
                </h4>
                <p className="text-xs text-slate-500 max-w-sm mx-auto mb-3">
                  Upload any digital, exported, or scanned PDF resume/CV. Gemini AI will parse text,
                  publications, and nested bullet points.
                </p>
                <div className="inline-flex items-center text-xs font-semibold text-[#0f2b5c] bg-white border border-slate-200 px-3 py-1.5 rounded-lg shadow-2xs">
                  <FileText className="w-3.5 h-3.5 mr-1.5" />
                  <span>Supports PDF documents up to 25 MB</span>
                </div>
              </div>

              {/* Guarantees Box */}
              <div className="p-3.5 bg-blue-50/60 border border-blue-200 rounded-lg text-xs text-blue-900 space-y-1">
                <div className="font-semibold flex items-center">
                  <Sparkles className="w-3.5 h-3.5 mr-1.5 text-blue-700" />
                  Preserves Real Facts &amp; Formatting:
                </div>
                <ul className="list-disc list-inside space-y-0.5 text-blue-800 text-[11px] ml-1">
                  <li>Original dates, degrees, grades, titles, and descriptions are preserved.</li>
                  <li>Does NOT fabricate or invent missing details.</li>
                  <li>You will review all extracted fields before saving to your dashboard.</li>
                </ul>
              </div>

              {/* Raw Text Fallback Toggle */}
              <div className="pt-2 text-center">
                <button
                  type="button"
                  onClick={() => setShowRawTextOption(!showRawTextOption)}
                  className="text-xs text-slate-500 hover:text-slate-800 underline"
                >
                  {showRawTextOption ? 'Hide paste text option' : 'Or paste resume text directly'}
                </button>
              </div>

              {showRawTextOption && (
                <div className="space-y-2 pt-2 border-t border-slate-200">
                  <label className="block text-xs font-semibold text-slate-700">
                    Paste Resume / CV Plain Text:
                  </label>
                  <textarea
                    value={rawTextFallback}
                    onChange={(e) => setRawTextFallback(e.target.value)}
                    rows={6}
                    placeholder="Paste the raw text of your CV here..."
                    className="w-full text-xs p-3 border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-[#0f2b5c]"
                  />
                  <div className="text-right">
                    <button
                      type="button"
                      onClick={handleRawTextSubmit}
                      disabled={!rawTextFallback.trim()}
                      className="px-4 py-2 text-xs font-semibold text-white bg-[#0f2b5c] hover:bg-[#0a1e40] rounded-lg disabled:opacity-50"
                    >
                      Extract Pasted Text with AI
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* STEP 2: PROCESSING */}
          {step === 'processing' && (
            <div className="py-12 flex flex-col items-center justify-center text-center space-y-4">
              <div className="relative">
                <div className="w-16 h-16 rounded-full bg-indigo-50 border-2 border-indigo-200 flex items-center justify-center text-[#0f2b5c]">
                  <Loader2 className="w-8 h-8 animate-spin" />
                </div>
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-900 mb-1">
                  Extracting Academic CV Information
                </h4>
                <p className="text-xs text-indigo-700 font-medium">{progressMsg}</p>
                {fileName && (
                  <p className="text-[11px] text-slate-400 mt-1">
                    {fileName} ({fileSize})
                  </p>
                )}
              </div>
              <div className="max-w-xs w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                <div className="bg-[#0f2b5c] h-full w-2/3 animate-pulse" />
              </div>
            </div>
          )}

          {/* STEP 3: REVIEW & AUDIT BEFORE SAVING */}
          {step === 'review' && extractedResume && (
            <div className="space-y-5">
              <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-lg flex items-start space-x-2.5">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-xs font-bold text-emerald-900">
                    CV Information Extracted Successfully!
                  </h4>
                  <p className="text-xs text-emerald-800 mt-0.5">
                    Review the identified records below. You can edit any details in the 14-section
                    editor before saving.
                  </p>
                </div>
              </div>

              {/* Extracted Header Overview */}
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg space-y-2">
                <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                  <span className="text-xs font-bold text-slate-900 uppercase tracking-wide">
                    {extractedResume.personalInfo.fullName || 'No Name Found'}
                  </span>
                  <span className="text-xs text-slate-500 font-medium">
                    {extractedResume.personalInfo.jobTitle || 'Academic Candidate'}
                  </span>
                </div>
                <div className="text-xs text-slate-600 flex flex-wrap gap-x-4 gap-y-1">
                  {extractedResume.personalInfo.email && (
                    <span>Email: {extractedResume.personalInfo.email}</span>
                  )}
                  {extractedResume.personalInfo.phone && (
                    <span>Phone: {extractedResume.personalInfo.phone}</span>
                  )}
                  {(extractedResume.personalInfo.city || extractedResume.personalInfo.country) && (
                    <span>
                      Location: {[extractedResume.personalInfo.city, extractedResume.personalInfo.country].filter(Boolean).join(', ')}
                    </span>
                  )}
                </div>
              </div>

              {/* Counts Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-center">
                <div className="p-3 bg-white border border-slate-200 rounded-lg">
                  <div className="flex items-center justify-center text-indigo-700 mb-1">
                    <GraduationCap className="w-4 h-4" />
                  </div>
                  <div className="text-base font-bold text-slate-900">
                    {extractedResume.education?.length || 0}
                  </div>
                  <div className="text-[11px] text-slate-500">Education Entries</div>
                </div>

                <div className="p-3 bg-white border border-slate-200 rounded-lg">
                  <div className="flex items-center justify-center text-blue-700 mb-1">
                    <Briefcase className="w-4 h-4" />
                  </div>
                  <div className="text-base font-bold text-slate-900">
                    {extractedResume.experience?.length || 0}
                  </div>
                  <div className="text-[11px] text-slate-500">Experience Roles</div>
                </div>

                <div className="p-3 bg-white border border-slate-200 rounded-lg">
                  <div className="flex items-center justify-center text-amber-700 mb-1">
                    <BookOpen className="w-4 h-4" />
                  </div>
                  <div className="text-base font-bold text-slate-900">
                    {extractedResume.publications?.length || 0}
                  </div>
                  <div className="text-[11px] text-slate-500">Publications/Patents</div>
                </div>

                <div className="p-3 bg-white border border-slate-200 rounded-lg">
                  <div className="flex items-center justify-center text-emerald-700 mb-1">
                    <Code2 className="w-4 h-4" />
                  </div>
                  <div className="text-base font-bold text-slate-900">
                    {extractedResume.projects?.length || 0}
                  </div>
                  <div className="text-[11px] text-slate-500">Projects Found</div>
                </div>
              </div>

              {/* Extraction Audit Notes */}
              {extractionNotes.length > 0 && (
                <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-lg">
                  <div className="text-xs font-bold text-slate-700 mb-1.5 flex items-center">
                    <Info className="w-3.5 h-3.5 mr-1.5 text-slate-500" />
                    <span>Extraction Audit Notes:</span>
                  </div>
                  <ul className="list-disc list-inside space-y-1 text-xs text-slate-600">
                    {extractionNotes.map((note, idx) => (
                      <li key={idx}>{note}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {/* STEP 4: ERROR */}
          {step === 'error' && (
            <div className="py-8 text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto">
                <AlertCircle className="w-6 h-6" />
              </div>
              <h4 className="text-sm font-bold text-slate-900">Extraction Could Not Be Completed</h4>
              <p className="text-xs text-red-600 max-w-md mx-auto">{errorMsg}</p>
              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => setStep('upload')}
                  className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg"
                >
                  Try Another Document
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
          <button
            type="button"
            onClick={handleClose}
            className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 rounded-lg"
          >
            Cancel
          </button>

          {step === 'review' && (
            <button
              type="button"
              onClick={handleConfirmAndOpen}
              className="inline-flex items-center px-4 py-2 text-xs font-semibold text-white bg-[#0f2b5c] hover:bg-[#0a1e40] rounded-lg shadow-xs cursor-pointer transition-colors"
            >
              <Check className="w-3.5 h-3.5 mr-1.5" />
              <span>Open in 14-Section Editor &amp; Review</span>
              <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
