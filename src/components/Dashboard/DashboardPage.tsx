import React, { useState, useEffect } from 'react';
import {
  Plus,
  FileText,
  Edit3,
  Trash2,
  Copy,
  Eye,
  Calendar,
  Sparkles,
  Loader2,
  CheckCircle2,
  Search,
  MessageSquare,
  LayoutTemplate,
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
import { ConfirmModal } from '../Common/ConfirmModal';
import { AiInterviewModal } from '../AiAssistant/AiInterviewModal';

interface DashboardPageProps {
  user: AuthUser;
  onSelectResumeForEdit: (resume: Resume) => void;
  onSelectResumeForPreview: (resume: Resume) => void;
  onOpenTemplates?: () => void;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({
  user,
  onSelectResumeForEdit,
  onSelectResumeForPreview,
  onOpenTemplates,
}) => {
  const [resumes, setResumes] = useState<Resume[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [deleteCandidate, setDeleteCandidate] = useState<Resume | null>(null);
  const [creating, setCreating] = useState(false);
  const [isInterviewOpen, setIsInterviewOpen] = useState(false);
  const [interviewDraft, setInterviewDraft] = useState<Resume | null>(null);

  const displayName = user.displayName || user.email?.split('@')[0] || 'User';

  const handleStartAiInterview = async () => {
    try {
      const draft = await createNewResume(
        user.uid,
        'AI Assisted Academic CV',
        'blank',
        user.displayName || undefined,
        user.email || undefined
      );
      setInterviewDraft(draft);
      setIsInterviewOpen(true);
    } catch (e) {
      console.error('Failed to init AI interview:', e);
    }
  };

  const handleInterviewFinished = async (updated: Resume) => {
    try {
      await saveResume(user.uid, updated);
      setResumes((prev) => [updated, ...prev.filter((r) => r.id !== updated.id)]);
      onSelectResumeForEdit(updated);
    } catch (e) {
      console.error('Failed to save interview CV:', e);
    }
  };

  const loadResumes = async () => {
    setLoading(true);
    try {
      const data = await getUserResumes(user.uid);
      setResumes(data);
    } catch (e) {
      console.error('Error fetching resumes:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadResumes();
  }, [user.uid]);

  const handleCreateNew = async (type: 'academic' | 'experienced' | 'fresher' | 'student' | 'blank') => {
    setCreating(true);
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

    try {
      await saveResume(user.uid, duplicated);
      setResumes((prev) => [duplicated, ...prev]);
    } catch (e) {
      console.error('Error duplicating resume:', e);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteCandidate) return;
    try {
      await deleteResume(user.uid, deleteCandidate.id);
      setResumes((prev) => prev.filter((r) => r.id !== deleteCandidate.id));
      setDeleteCandidate(null);
    } catch (e) {
      console.error('Error deleting resume:', e);
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
        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <button
            onClick={handleStartAiInterview}
            className="inline-flex items-center justify-center px-4 py-2.5 border border-purple-200 rounded text-sm font-semibold text-purple-900 bg-purple-50 hover:bg-purple-100 transition-colors shadow-xs cursor-pointer"
          >
            <MessageSquare className="w-4 h-4 mr-2 text-purple-700" />
            <span>Build My CV with AI</span>
          </button>

          {onOpenTemplates && (
            <button
              onClick={onOpenTemplates}
              className="inline-flex items-center justify-center px-3.5 py-2.5 border border-blue-200 rounded text-sm font-semibold text-[#0f2b5c] bg-blue-50 hover:bg-blue-100 transition-colors shadow-xs cursor-pointer"
            >
              <LayoutTemplate className="w-4 h-4 mr-1.5 text-[#0f2b5c]" />
              <span>Browse Templates</span>
            </button>
          )}

          <button
            onClick={() => handleCreateNew('blank')}
            disabled={creating}
            className="inline-flex items-center justify-center px-3.5 py-2.5 border border-slate-300 rounded text-sm font-semibold text-slate-700 bg-white hover:bg-slate-50 transition-colors shadow-xs disabled:opacity-60 cursor-pointer"
          >
            <Plus className="w-4 h-4 mr-1.5 text-slate-500" />
            <span>Blank CV</span>
          </button>
        </div>
      </div>

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
              : 'Interview with our AI advisor or choose a profile template to get started.'}
          </p>
          {!searchQuery && (
            <div className="mt-6 flex flex-wrap justify-center gap-2.5 max-w-2xl mx-auto">
              <button
                onClick={handleStartAiInterview}
                className="px-4 py-2 bg-purple-50 border border-purple-200 hover:bg-purple-100 text-purple-900 text-xs font-bold rounded shadow-xs flex items-center cursor-pointer"
              >
                <MessageSquare className="w-3.5 h-3.5 mr-1.5 text-purple-700" />
                Build My CV with AI
              </button>
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

      {/* AI Interview Modal */}
      {interviewDraft && (
        <AiInterviewModal
          isOpen={isInterviewOpen}
          onClose={() => setIsInterviewOpen(false)}
          currentResume={interviewDraft}
          onApplyUpdates={handleInterviewFinished}
        />
      )}
    </div>
  );
};
