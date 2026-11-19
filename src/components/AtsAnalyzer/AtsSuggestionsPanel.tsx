import React, { useState } from 'react';
import {
  Check,
  X,
  Edit3,
  RotateCcw,
  RefreshCw,
  CheckCheck,
  FileText,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import type { AtsAnalysisRecord, AtsSuggestion } from '../../types/ats';

interface AtsSuggestionsPanelProps {
  record: AtsAnalysisRecord;
  onUpdateSuggestion: (
    suggestionId: string,
    status: AtsSuggestion['status'],
    editedContent?: string
  ) => void;
  onAcceptAllPending: () => void;
  onRerunAnalysis: () => void;
  rerunning: boolean;
}

export const AtsSuggestionsPanel: React.FC<AtsSuggestionsPanelProps> = ({
  record,
  onUpdateSuggestion,
  onAcceptAllPending,
  onRerunAnalysis,
  rerunning,
}) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [showWorkingText, setShowWorkingText] = useState(false);

  const suggestions = (record.suggestions || []).slice(0, 5);
  const acceptedOrEditedCount = suggestions.filter(
    (s) => s.status === 'accepted' || s.status === 'edited'
  ).length;
  const pendingCount = suggestions.filter((s) => s.status === 'pending').length;

  const startEdit = (sug: AtsSuggestion) => {
    setEditingId(sug.id);
    setEditValue(sug.editedContent || sug.suggestedContent || sug.originalContent);
  };

  const saveEdit = (sug: AtsSuggestion) => {
    onUpdateSuggestion(sug.id, 'edited', editValue.trim());
    setEditingId(null);
  };

  return (
    <div className="space-y-5">
      {/* Clean Action Bar */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 sm:p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-[#0f2b5c]">Suggested Changes</h2>
          <p className="text-sm text-slate-600 mt-1 max-w-2xl">
            Every change keeps your real background intact — never inventing skills, dates, degrees,
            or numbers. Review each change below, then update your Resume Match score.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          {pendingCount > 0 && (
            <button
              type="button"
              onClick={onAcceptAllPending}
              className="inline-flex items-center px-3.5 py-2.5 border border-slate-300 bg-white hover:bg-slate-50 text-slate-800 text-sm font-semibold rounded-lg cursor-pointer whitespace-nowrap"
            >
              <CheckCheck className="w-4 h-4 mr-1.5 text-emerald-700" />
              Accept All ({pendingCount})
            </button>
          )}

          <button
            type="button"
            onClick={onRerunAnalysis}
            disabled={rerunning}
            data-testid="rerun-ats-analysis-btn"
            className="inline-flex items-center px-4 py-2.5 bg-[#0f2b5c] hover:bg-[#0a1e42] text-white text-sm font-semibold rounded-lg cursor-pointer disabled:opacity-60 whitespace-nowrap"
          >
            <RefreshCw className={`w-4 h-4 mr-1.5 ${rerunning ? 'animate-spin' : ''}`} />
            <span>
              {rerunning
                ? 'Updating Score...'
                : `Update Match Score (${acceptedOrEditedCount} selected)`}
            </span>
          </button>
        </div>
      </div>

      {/* Suggestion Cards */}
      {suggestions.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-xl p-8 text-center text-sm text-slate-600">
          Your resume wording already reads clearly and directly. No wording updates are needed.
        </div>
      ) : (
        <div className="space-y-4">
          {suggestions.map((sug) => {
            const isEditing = editingId === sug.id;
            const statusTone =
              sug.status === 'accepted' || sug.status === 'edited'
                ? 'border-emerald-300 bg-emerald-50/20'
                : sug.status === 'rejected'
                ? 'border-slate-200 bg-slate-50/70 opacity-75'
                : 'border-slate-200 bg-white';

            return (
              <div
                key={sug.id}
                data-testid={`suggestion-card-${sug.id}`}
                className={`border rounded-xl p-5 sm:p-6 transition-colors ${statusTone}`}
              >
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 pb-3 border-b border-slate-100">
                  <div>
                    <div className="text-xs font-semibold text-slate-500 mb-1">
                      What needs improvement · {sug.targetSection}
                    </div>
                    <h3 className="text-base font-bold text-slate-900">{sug.title}</h3>
                  </div>

                  <div className="text-sm font-semibold shrink-0">
                    {sug.status === 'accepted' && (
                      <span className="text-emerald-700">Accepted</span>
                    )}
                    {sug.status === 'edited' && (
                      <span className="text-emerald-700">Edited &amp; Applied</span>
                    )}
                    {sug.status === 'rejected' && (
                      <span className="text-slate-500">Rejected</span>
                    )}
                    {sug.status === 'pending' && (
                      <span className="text-amber-700">Pending</span>
                    )}
                  </div>
                </div>

                <p className="text-sm text-slate-700 mt-3 mb-4">
                  <span className="font-semibold text-slate-900">Why it matters: </span>
                  {sug.reason}
                </p>

                {/* Before vs Suggested Change */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4 text-sm">
                  <div className="border border-slate-200 rounded-lg p-3.5 bg-slate-50">
                    <div className="text-xs font-semibold text-slate-500 mb-1.5">
                      Current wording
                    </div>
                    <p className="text-slate-700 whitespace-pre-wrap leading-relaxed">
                      {sug.originalContent || '(Not currently included)'}
                    </p>
                  </div>

                  <div className="border border-slate-200 rounded-lg p-3.5 bg-white">
                    <div className="text-xs font-semibold text-[#0f2b5c] mb-1.5">
                      {sug.status === 'edited' ? 'Your edited change' : 'Suggested change'}
                    </div>
                    {isEditing ? (
                      <div className="space-y-2.5">
                        <textarea
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          rows={3}
                          className="w-full p-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#0f2b5c]"
                        />
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => saveEdit(sug)}
                            className="px-3.5 py-1.5 bg-[#0f2b5c] hover:bg-[#0a1e42] text-white text-sm font-semibold rounded-lg cursor-pointer"
                          >
                            Save
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditingId(null)}
                            className="px-3.5 py-1.5 border border-slate-300 text-slate-700 text-sm font-semibold rounded-lg cursor-pointer"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <p className="text-slate-900 whitespace-pre-wrap leading-relaxed">
                        {sug.status === 'edited' && sug.editedContent
                          ? sug.editedContent
                          : sug.suggestedContent}
                      </p>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex flex-wrap items-center gap-2 pt-3 border-t border-slate-100">
                  {sug.status !== 'accepted' && (
                    <button
                      type="button"
                      onClick={() => onUpdateSuggestion(sug.id, 'accepted')}
                      className="inline-flex items-center px-3.5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white text-sm font-semibold rounded-lg cursor-pointer"
                    >
                      <Check className="w-4 h-4 mr-1.5" />
                      Accept Suggestion
                    </button>
                  )}

                  {!isEditing && (
                    <button
                      type="button"
                      onClick={() => startEdit(sug)}
                      className="inline-flex items-center px-3.5 py-2 border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-sm font-semibold rounded-lg cursor-pointer"
                    >
                      <Edit3 className="w-4 h-4 mr-1.5" />
                      Edit
                    </button>
                  )}

                  {sug.status !== 'rejected' && (
                    <button
                      type="button"
                      onClick={() => onUpdateSuggestion(sug.id, 'rejected')}
                      className="inline-flex items-center px-3.5 py-2 border border-slate-300 bg-white hover:bg-red-50 hover:text-red-700 hover:border-red-200 text-slate-700 text-sm font-semibold rounded-lg cursor-pointer"
                    >
                      <X className="w-4 h-4 mr-1.5" />
                      Reject
                    </button>
                  )}

                  {sug.status !== 'pending' && (
                    <button
                      type="button"
                      onClick={() => onUpdateSuggestion(sug.id, 'pending')}
                      className="inline-flex items-center px-3 py-2 text-slate-600 hover:text-slate-900 text-sm font-semibold rounded-lg cursor-pointer"
                    >
                      <RotateCcw className="w-4 h-4 mr-1.5" />
                      Restore
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Working Draft Text Preview Toggle */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <button
          type="button"
          onClick={() => setShowWorkingText((v) => !v)}
          className="w-full px-5 py-3.5 flex items-center justify-between text-sm font-semibold text-slate-800 hover:bg-slate-50 cursor-pointer"
        >
          <span className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-[#0f2b5c]" />
            <span>Preview Updated Resume Text ({acceptedOrEditedCount} change(s) active)</span>
          </span>
          <span className="inline-flex items-center gap-1 text-[#0f2b5c]">
            <span>{showWorkingText ? 'Hide' : 'Show'}</span>
            {showWorkingText ? (
              <ChevronUp className="w-4 h-4" />
            ) : (
              <ChevronDown className="w-4 h-4" />
            )}
          </span>
        </button>

        {showWorkingText && (
          <div className="p-4 border-t border-slate-200 bg-slate-50">
            <pre className="whitespace-pre-wrap text-xs sm:text-sm text-slate-800 font-mono leading-relaxed max-h-96 overflow-y-auto">
              {record.workingDraft.extractedText}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
};
