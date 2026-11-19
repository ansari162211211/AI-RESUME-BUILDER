import React, { useState } from 'react';
import {
  History,
  Trash2,
  Eye,
  RefreshCw,
  GitCompare,
  Search,
  Calendar,
} from 'lucide-react';
import type { AtsAnalysisRecord } from '../../types/ats';

interface AtsHistoryPanelProps {
  records: AtsAnalysisRecord[];
  activeRecordId?: string;
  cloudSyncPending?: boolean;
  onOpenRecord: (record: AtsAnalysisRecord, focusComparison?: boolean) => void;
  onReanalyzeRecord: (record: AtsAnalysisRecord) => void;
  onDeleteRecord: (analysisId: string) => void;
}

export const AtsHistoryPanel: React.FC<AtsHistoryPanelProps> = ({
  records,
  activeRecordId,
  cloudSyncPending = false,
  onOpenRecord,
  onReanalyzeRecord,
  onDeleteRecord,
}) => {
  const [query, setQuery] = useState('');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const filtered = records.filter((r) => {
    const q = query.trim().toLowerCase();
    if (!q) return true;
    return (
      r.resumeName.toLowerCase().includes(q) ||
      r.jobTitle.toLowerCase().includes(q) ||
      r.companyName.toLowerCase().includes(q)
    );
  });

  return (
    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
      <div className="px-5 py-4 border-b border-slate-200 bg-slate-50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <History className="w-4 h-4 text-[#0f2b5c]" />
          <h2 className="text-base font-bold text-slate-900">
            Previous Checks ({records.length})
          </h2>
        </div>

        {records.length > 0 && (
          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by resume or role..."
              className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#0f2b5c]"
            />
          </div>
        )}
      </div>

      {cloudSyncPending && (
        <div className="px-5 py-2.5 bg-amber-50/70 border-b border-amber-200 text-xs text-amber-900">
          Saved on this device. Cloud sync will turn on automatically once database rules are published.
        </div>
      )}

      {filtered.length === 0 ? (
        <div className="p-8 text-center text-sm text-slate-500">
          {records.length === 0
            ? 'No saved checks yet. Upload a resume below to run your first check.'
            : 'No saved checks match your search.'}
        </div>
      ) : (
        <div className="divide-y divide-slate-200">
          {filtered.map((rec) => {
            const isSelected = rec.id === activeRecordId;
            const dateLabel = new Date(rec.updatedAt || rec.createdAt).toLocaleDateString(
              undefined,
              { month: 'short', day: 'numeric', year: 'numeric' }
            );
            const scoreColor =
              rec.latestScore >= 75
                ? 'text-emerald-700'
                : rec.latestScore >= 60
                ? 'text-amber-700'
                : 'text-red-700';

            return (
              <div
                key={rec.id}
                className={`p-4 sm:px-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4 ${
                  isSelected ? 'bg-blue-50/40' : 'hover:bg-slate-50/70'
                }`}
              >
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm sm:text-base font-bold text-slate-900 truncate">
                      {rec.jobTitle || 'Target Role'}
                    </span>
                    {rec.companyName && (
                      <span className="text-sm text-slate-600">@ {rec.companyName}</span>
                    )}
                    <span className="text-xs text-slate-500">({rec.resumeName})</span>
                  </div>

                  <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs sm:text-sm text-slate-500">
                    <span className="inline-flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5" />
                      {dateLabel}
                    </span>
                    <span className={`font-bold tabular-nums ${scoreColor}`}>
                      Score: {rec.latestScore}/100
                    </span>
                    {rec.comparison && rec.originalScore !== rec.latestScore && (
                      <span className="text-blue-700 font-semibold tabular-nums">
                        {rec.originalScore} → {rec.latestScore}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => onOpenRecord(rec, false)}
                    className="inline-flex items-center px-3.5 py-2 bg-blue-700 hover:bg-blue-800 text-white text-xs sm:text-sm font-semibold rounded-lg cursor-pointer"
                  >
                    <Eye className="w-3.5 h-3.5 mr-1.5" />
                    Open
                  </button>

                  {rec.comparison && (
                    <button
                      type="button"
                      onClick={() => onOpenRecord(rec, true)}
                      className="inline-flex items-center px-3 py-2 border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs sm:text-sm font-semibold rounded-lg cursor-pointer"
                    >
                      <GitCompare className="w-3.5 h-3.5 mr-1.5" />
                      Compare
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => onReanalyzeRecord(rec)}
                    className="inline-flex items-center px-3 py-2 border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs sm:text-sm font-semibold rounded-lg cursor-pointer"
                  >
                    <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
                    Reanalyze
                  </button>

                  {confirmDeleteId === rec.id ? (
                    <div className="inline-flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => {
                          onDeleteRecord(rec.id);
                          setConfirmDeleteId(null);
                        }}
                        className="px-3 py-2 bg-red-600 text-white text-xs sm:text-sm font-semibold rounded-lg cursor-pointer"
                      >
                        Confirm Delete
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmDeleteId(null)}
                        className="px-2.5 py-2 text-xs sm:text-sm text-slate-600 hover:text-slate-900 cursor-pointer"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setConfirmDeleteId(rec.id)}
                      aria-label={`Delete analysis for ${rec.resumeName}`}
                      className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
