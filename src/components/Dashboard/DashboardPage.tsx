import React, { useState, useEffect } from 'react';
import {
  Plus,
  FileText,
  Edit3,
  Trash2,
  Copy,
  Eye,
  Calendar,
  Loader2,
  Search,
  LayoutTemplate,
  FileSearch,
  ArrowRight,
  AlertCircle,
  X,
} from 'lucide-react';
import type { Resume, AuthUser } from '../../types/resume';
import { getTemplateById } from '../../data/templates';
import {
  getUserResumes,
  deleteResume,
  createNewResume,
  saveResume,
} from '../../services/resumeService';
import { calculateResumeCompleteness } from '../../utils/validation';
import { mapUserFacingError } from '../../utils/firebaseHelpers';
import { ConfirmModal } from '../Common/ConfirmModal';

interface DashboardPageProps {
  user: AuthUser;
  onSelectResumeForEdit: (resume: Resume) => void;
  onSelectResumeForPreview: (resume: Resume) => void;
  onOpenTemplates?: () => void;
  onOpenAtsAnalyzer?: (initialResume?: Resume | null) => void;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({
  user,
  onSelectResumeForEdit,
  onSelectResumeForPreview,
  onOpenTemplates,
  onOpenAtsAnalyzer,
}) => {
  const [resumes, setResumes] = useState<Resume[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [deleteCandidate, setDeleteCandidate] = useState<Resume | null>(null);
  const [creating, setCreating] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const displayName = user.displayName || user.email?.split('@')[0] || 'User';

  const loadResumes = async () => {
    setLoading(true);
    setActionError(null);
    try {
      const data = await getUserResumes(user.uid);
      setResumes(data);
    } catch (e) {
      console.error('Error fetching resumes:', e);
      setActionError(
        mapUserFacingError(e, 'Could not load your saved resumes right now.')
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadResumes();
  }, [user.uid]);

  const handleCreateNew = async (type: 'academic' | 'experienced' | 'fresher' | 'student' | 'blank') => {
    setCreating(true);
    setActionError(null);
    try {
      let defaultTitle = 'Academic Research Curriculum Vitae';
      if (type === 'experienced') defaultTitle = 'Senior Software Architect CV';
      if (type === 'fresher') defaultTitle = 'Graduate Software Engineer CV';
      if (type === 'student') defaultTitle = 'Undergraduate Student CV';
      if (type === 'blank') defaultTitle = 'Curriculum Vitae';

      const newResume = await createNewResume(
        user.uid,
        defaultTitle,
        type,
        user.displayName || undefined,
        user.email || undefined
      );
      setResumes((prev) => [newResume, ...prev]);
      onSelectResumeForEdit(newResume);
    } catch (e) {
      console.error('Error creating CV:', e);
      setActionError(
        mapUserFacingError(e, 'Could not create your new resume. Please try again.')
      );
    } finally {
      setCreating(false);
    }
  };

  const handleDuplicate = async (resume: Resume) => {
    const newId = `resume_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const now = new Date().toISOString();
    const duplicated: Resume = {
      ...resume,
      id: newId,
      title: `${resume.title} (Copy)`,
      createdAt: now,
      updatedAt: now,
    };

    setActionError(null);
    try {
      await saveResume(user.uid, duplicated);
      setResumes((prev) => [duplicated, ...prev]);
    } catch (e) {
      console.error('Error duplicating resume:', e);
      setActionError(
        mapUserFacingError(e, 'Could not duplicate this resume. Please try again.')
      );
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteCandidate) return;
    setActionError(null);
    try {
      await deleteResume(user.uid, deleteCandidate.id);
      setResumes((prev) => prev.filter((r) => r.id !== deleteCandidate.id));
      setDeleteCandidate(null);
    } catch (e) {
      console.error('Error deleting resume:', e);
      setDeleteCandidate(null);
      setActionError(
        mapUserFacingError(e, 'Could not delete this resume. Please try again.')
      );
    }
  };

  const filteredResumes = resumes.filter((r) => {
    const q = searchQuery.toLowerCase();
    return (
      r.title.toLowerCase().includes(q) ||
      (r.targetRole && r.targetRole.toLowerCase().includes(q)) ||
      (r.personalInfo?.fullName && r.personalInfo.fullName.toLowerCase().includes(q))
    );
  });

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
      {actionError && (
        <div
          role="alert"
          className="mb-6 p-3.5 bg-red-50 border border-red-200 rounded text-sm text-red-700 flex items-center justify-between gap-3"
        >
          <div className="flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{actionError}</span>
          </div>
          <button
            type="button"
            onClick={() => setActionError(null)}
            className="p-1 text-red-500 hover:text-red-800 cursor-pointer"
            aria-label="Dismiss error"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Welcome & Header */}
      <div className="bg-white border border-slate-200 rounded-lg p-6 sm:p-8 mb-8 shadow-xs flex flex-col md:flex-row md:items-center md:justify-between gap-6">
        <div>
          <div className="inline-flex items-center space-x-2 text-xs font-semibold text-[#0f2b5c] bg-blue-50 px-2.5 py-1 rounded mb-2">
            <span>Career Portfolio</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
            Welcome back, {displayName}
          </h1>
          <p className="text-slate-600 text-sm mt-1 max-w-xl">
            Create, manage, and download formal Academic Curriculum Vitae with standard A4 formatting,
            publications, research, education, and professional experience.
          </p>
        </div>

        {/* Quick Creation CTA Buttons */}
        <div className="flex flex-wrap items-center gap-3 shrink-0">
          {onOpenTemplates && (
            <button
              type="button"
              onClick={onOpenTemplates}
              className="inline-flex items-center justify-center px-4 py-2.5 border border-blue-200 rounded text-sm font-semibold text-[#0f2b5c] bg-blue-50 hover:bg-blue-100 transition-colors shadow-xs cursor-pointer"
            >
              <LayoutTemplate className="w-4 h-4 mr-2 text-[#0f2b5c]" />
              <span>Browse Templates</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => handleCreateNew('blank')}
            disabled={creating}
            className="inline-flex items-center justify-center px-4 py-2.5 border border-slate-300 rounded text-sm font-semibold text-slate-700 bg-white hover:bg-slate-50 transition-colors shadow-xs disabled:opacity-60 cursor-pointer"
          >
            <Plus className="w-4 h-4 mr-1.5 text-slate-500" />
            <span>Blank CV</span>
          </button>
        </div>
      </div>

      {/* Dedicated Resume Checker Entry Card */}
      {onOpenAtsAnalyzer && (
        <div
          className="bg-white border border-slate-200 rounded-lg p-5 sm:p-6 mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:border-slate-300 transition-colors"
          data-testid="dashboard-ats-card"
        >
          <div className="flex items-start gap-4 min-w-0">
            <div className="w-11 h-11 rounded-lg bg-[#0f2b5c] text-white flex items-center justify-center shrink-0">
              <FileSearch className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h2 className="text-base font-bold text-slate-900">Resume Checker</h2>
              <p className="text-xs sm:text-sm text-slate-600 mt-0.5 max-w-2xl">
                Upload a PDF, DOCX, or TXT resume—or test any saved resume—against a job
                description to check your match score, spot missing skills, and get simple steps to
                improve.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => onOpenAtsAnalyzer(null)}
            data-testid="open-ats-analyzer-btn"
            className="inline-flex items-center justify-center px-4 py-2.5 bg-[#0f2b5c] hover:bg-[#0a1e42] text-white text-sm font-semibold rounded shadow-xs transition-colors shrink-0 cursor-pointer whitespace-nowrap"
          >
            <span>Open Resume Checker</span>
            <ArrowRight className="w-4 h-4 ml-1.5" />
          </button>
        </div>
      )}

      {/* Resumes Section */}
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900">My Curriculum Vitae &amp; Resumes</h2>
          <p className="text-xs text-slate-500">
            {resumes.length} {resumes.length === 1 ? 'CV document' : 'CV documents'} saved in your account
          </p>
        </div>

        {resumes.length > 0 && (
          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search CVs..."
              className="w-full pl-9 pr-3 py-1.5 border border-slate-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent bg-white"
            />
          </div>
        )}
      </div>

      {/* Resume Cards or Empty State */}
      {loading ? (
        <div className="bg-white border border-slate-200 rounded-lg p-16 text-center shadow-xs">
          <Loader2 className="w-8 h-8 text-slate-900 animate-spin mx-auto mb-3" />
          <p className="text-sm font-medium text-slate-600">Loading your CVs...</p>
        </div>
      ) : filteredResumes.length === 0 ? (
        <div className="bg-white border border-slate-200 border-dashed rounded-lg p-10 text-center">
          <div className="w-14 h-14 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-900">
            <FileText className="w-7 h-7" />
          </div>
          <h3 className="text-base font-bold text-slate-900">
            {searchQuery ? 'No matching CVs found' : 'No Curriculum Vitae created yet'}
          </h3>
          <p className="text-xs text-slate-500 mt-1 max-w-lg mx-auto">
            {searchQuery
              ? 'Try adjusting your search query or clear the filter.'
              : 'Choose a profile template or start with a blank CV to get started.'}
          </p>
          {!searchQuery && (
            <div className="mt-6 flex flex-wrap justify-center gap-2.5 max-w-2xl mx-auto">
              {onOpenTemplates && (
                <button
                  type="button"
                  onClick={onOpenTemplates}
                  className="px-4 py-2 bg-blue-50 border border-blue-200 hover:bg-blue-100 text-[#0f2b5c] text-xs font-bold rounded shadow-xs flex items-center cursor-pointer"
                >
                  <LayoutTemplate className="w-3.5 h-3.5 mr-1.5 text-[#0f2b5c]" />
                  Browse Templates
                </button>
              )}
              <button
                onClick={() => handleCreateNew('academic')}
                className="px-3.5 py-2 bg-slate-900 hover:bg-black text-white text-xs font-semibold rounded shadow-xs"
              >
                Academic Researcher (PhD / Publications)
              </button>
              <button
                onClick={() => handleCreateNew('experienced')}
                className="px-3.5 py-2 bg-white border border-slate-300 text-slate-800 hover:bg-slate-50 text-xs font-semibold rounded shadow-xs"
              >
                Experienced Professional
              </button>
              <button
                onClick={() => handleCreateNew('fresher')}
                className="px-3.5 py-2 bg-white border border-slate-300 text-slate-800 hover:bg-slate-50 text-xs font-semibold rounded shadow-xs"
              >
                Graduate / Fresher (Internship)
              </button>
              <button
                onClick={() => handleCreateNew('student')}
                className="px-3.5 py-2 bg-white border border-slate-300 text-slate-800 hover:bg-slate-50 text-xs font-semibold rounded shadow-xs"
              >
                Undergraduate Student
              </button>
              <button
                onClick={() => handleCreateNew('blank')}
                className="px-3.5 py-2 bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 text-xs font-semibold rounded shadow-xs cursor-pointer"
              >
                Blank CV
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredResumes.map((resume) => {
            const completeness = calculateResumeCompleteness(resume);
            const updatedDate = new Date(resume.updatedAt).toLocaleDateString(undefined, {
              month: 'short',
              day: 'numeric',
              year: 'numeric',
            });

            return (
              <div
                key={resume.id}
                className="bg-white border border-slate-200 rounded-lg p-5 shadow-xs hover:border-slate-300 transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center space-x-2">
                      <div className="w-8 h-8 rounded bg-slate-100 text-[#0f2b5c] flex items-center justify-center font-bold shrink-0">
                        <FileText className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <h3 className="text-sm font-bold text-slate-900 truncate">
                          {resume.title}
                        </h3>
                        <p className="text-xs text-slate-500 truncate">
                          {resume.targetRole || 'General Resume'}
                        </p>
                      </div>
                    </div>

                    <span className="shrink-0 text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-800 uppercase tracking-wide">
                      {getTemplateById(resume.template).name}
                    </span>
                  </div>

                  {/* Completeness Bar */}
                  <div className="mt-4 pt-3 border-t border-slate-100">
                    <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
                      <span>Completeness</span>
                      <span className="font-semibold text-slate-700">{completeness}%</span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                      <div
                        className="bg-[#0f2b5c] h-1.5 rounded-full transition-all"
                        style={{ width: `${completeness}%` }}
                      />
                    </div>
                  </div>

                  <div className="flex items-center text-[11px] text-slate-400 mt-3 space-x-1">
                    <Calendar className="w-3.5 h-3.5" />
                    <span>Edited {updatedDate}</span>
                  </div>
                </div>

                {/* Actions Bottom Bar */}
                <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between">
                  <div className="flex items-center space-x-1">
                    <button
                      onClick={() => onSelectResumeForEdit(resume)}
                      className="inline-flex items-center px-2.5 py-1 text-xs font-semibold text-[#0f2b5c] bg-blue-50 hover:bg-blue-100 rounded transition-colors"
                      title="Edit resume"
                    >
                      <Edit3 className="w-3.5 h-3.5 mr-1" />
                      <span>Edit</span>
                    </button>
                    <button
                      onClick={() => onSelectResumeForPreview(resume)}
                      className="inline-flex items-center px-2.5 py-1 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded transition-colors"
                      title="Preview resume"
                    >
                      <Eye className="w-3.5 h-3.5 mr-1" />
                      <span>Preview</span>
                    </button>
                  </div>

                  <div className="flex items-center space-x-1">
                    <button
                      onClick={() => handleDuplicate(resume)}
                      className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded transition-colors"
                      title="Duplicate resume"
                      aria-label={`Duplicate ${resume.title}`}
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => setDeleteCandidate(resume)}
                      className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                      title="Delete resume"
                      aria-label={`Delete ${resume.title}`}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={!!deleteCandidate}
        title="Delete Resume"
        message={`Are you sure you want to permanently delete "${deleteCandidate?.title}"? This action cannot be undone.`}
        confirmLabel="Delete Resume"
        isDestructive={true}
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDeleteCandidate(null)}
      />
    </div>
  );
};
