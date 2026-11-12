import React from 'react';
import {
  CheckCircle2,
  AlertTriangle,
  HelpCircle,
  X,
  ArrowRight,
  TrendingUp,
  Sparkles,
  Info,
} from 'lucide-react';
import type { CvCompletenessReport, SectionStatus } from '../../types/resume';

interface CompletenessReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  report: CvCompletenessReport;
  onNavigateToSection: (sectionId: string) => void;
}

export const CompletenessReportModal: React.FC<CompletenessReportModalProps> = ({
  isOpen,
  onClose,
  report,
  onNavigateToSection,
}) => {
  if (!isOpen) return null;

  const getStatusBadge = (status: SectionStatus, label: string) => {
    switch (status) {
      case 'complete':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
            <CheckCircle2 className="w-3 h-3 mr-1 text-emerald-600" />
            {label}
          </span>
        );
      case 'needs_details':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-100 text-amber-800 border border-amber-200">
            <AlertTriangle className="w-3 h-3 mr-1 text-amber-600" />
            {label}
          </span>
        );
      case 'optional_empty':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-600 border border-slate-200">
            <HelpCircle className="w-3 h-3 mr-1 text-slate-400" />
            {label}
          </span>
        );
      case 'needs_review':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-blue-100 text-blue-800 border border-blue-200">
            <Info className="w-3 h-3 mr-1 text-blue-600" />
            {label}
          </span>
        );
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white rounded-xl shadow-2xl max-w-3xl w-full border border-slate-200 overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#0f2b5c] text-white flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                Academic CV Completeness Dashboard
              </h3>
              <p className="text-xs text-slate-500">
                Detailed readiness audit across all 14 academic curriculum vitae sections.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {/* Overall Score Banner */}
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                Overall CV Readiness
              </div>
              <div className="flex items-baseline space-x-2">
                <span className="text-3xl font-extrabold text-[#0f2b5c]">
                  {report.overallScore}%
                </span>
                <span className="text-xs font-bold text-slate-700 uppercase">
                  {report.overallStatus === 'excellent'
                    ? 'Excellent • Highly Comprehensive'
                    : report.overallStatus === 'good'
                    ? 'Good • Strong Academic Base'
                    : 'In Progress • Add More Details'}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Academic CVs are not penalized for unpopulated optional sections (like patents,
                volunteer work, or references).
              </p>
            </div>

            <div className="w-full sm:w-44 bg-slate-200 rounded-full h-2.5 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  report.overallScore >= 80
                    ? 'bg-emerald-600'
                    : report.overallScore >= 50
                    ? 'bg-indigo-600'
                    : 'bg-amber-500'
                }`}
                style={{ width: `${report.overallScore}%` }}
              />
            </div>
          </div>

          {/* Top Recommendations */}
          {report.topRecommendations && report.topRecommendations.length > 0 && (
            <div>
              <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-2 flex items-center">
                <Sparkles className="w-3.5 h-3.5 mr-1.5 text-indigo-600" />
                Key Improvement Recommendations
              </h4>
              <div className="space-y-1.5">
                {report.topRecommendations.map((rec, i) => (
                  <div
                    key={i}
                    className="p-2.5 bg-indigo-50/60 border border-indigo-200/70 rounded-lg text-xs text-indigo-950 flex items-start space-x-2"
                  >
                    <span className="w-4 h-4 rounded-full bg-indigo-200/80 text-indigo-800 flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">
                      {i + 1}
                    </span>
                    <span className="leading-relaxed">{rec}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Section-by-Section Indicator Breakdown */}
          <div>
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-2">
              All 14 Sections Status Breakdown
            </h4>
            <div className="divide-y divide-slate-200 border border-slate-200 rounded-xl overflow-hidden bg-white">
              {report.sections.map((sec) => (
                <div
                  key={sec.sectionId}
                  className="p-3.5 hover:bg-slate-50/80 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                >
                  <div className="space-y-1 max-w-md">
                    <div className="flex items-center space-x-2">
                      <span className="text-xs font-bold text-slate-900">{sec.name}</span>
                      {sec.isOptional && (
                        <span className="text-[10px] text-slate-400 italic">(Optional)</span>
                      )}
                    </div>
                    {sec.issues.length > 0 && (
                      <p className="text-[11px] text-amber-700">
                        • {sec.issues.join(' • ')}
                      </p>
                    )}
                    {sec.suggestions.length > 0 && (
                      <p className="text-[11px] text-slate-500">
                        Tip: {sec.suggestions.join(' ')}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center space-x-3 shrink-0 justify-between sm:justify-end">
                    {getStatusBadge(sec.status, sec.statusLabel)}
                    <button
                      type="button"
                      onClick={() => {
                        onNavigateToSection(sec.sectionId);
                        onClose();
                      }}
                      className="inline-flex items-center px-2.5 py-1 text-xs font-semibold text-[#0f2b5c] hover:text-[#0a1e40] bg-slate-100 hover:bg-slate-200 rounded-md transition-colors cursor-pointer"
                    >
                      <span>Edit</span>
                      <ArrowRight className="w-3 h-3 ml-1" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-200 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg shadow-2xs cursor-pointer"
          >
            Close Dashboard
          </button>
        </div>
      </div>
    </div>
  );
};
