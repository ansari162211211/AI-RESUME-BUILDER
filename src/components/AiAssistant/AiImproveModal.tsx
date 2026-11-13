import React, { useState } from 'react';
import { Sparkles, Check, X, Edit2, RotateCcw, Loader2, ArrowRight } from 'lucide-react';
import { improveTextWithGemini } from '../../services/aiService';
import type { AiImproveResult } from '../../types/resume';

interface AiImproveModalProps {
  isOpen: boolean;
  onClose: () => void;
  originalText: string;
  sectionType: string;
  context?: string;
  templateId?: string;
  onApply: (improvedText: string) => void;
}

export const AiImproveModal: React.FC<AiImproveModalProps> = ({
  isOpen,
  onClose,
  originalText,
  sectionType,
  context,
  templateId,
  onApply,
}) => {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AiImproveResult | null>(null);
  const [editedText, setEditedText] = useState('');
  const [isEditingCustom, setIsEditingCustom] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Trigger improve when modal opens if not already fetched
  React.useEffect(() => {
    if (isOpen && originalText) {
      handleGenerate();
    } else {
      setResult(null);
      setEditedText('');
      setError(null);
      setIsEditingCustom(false);
    }
  }, [isOpen, originalText]);

  const handleGenerate = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await improveTextWithGemini(
        originalText,
        sectionType,
        context,
        templateId
      );
      setResult(res);
      setEditedText(res.improved);
    } catch (err: any) {
      setError(err?.message || 'Failed to improve text with AI.');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectAlternative = (alt: string) => {
    setEditedText(alt);
  };

  const handleApply = () => {
    if (editedText.trim()) {
      onApply(editedText.trim());
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full border border-slate-200 overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                AI Writing Assistance • {sectionType.toUpperCase()}
              </h3>
              <p className="text-xs text-slate-500">
                Improves tone, active verbs & clarity without changing facts.
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

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700">
              {error}
            </div>
          )}

          {/* Original Text */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider">
                Original Draft
              </label>
              <span className="text-[11px] text-slate-400">
                {originalText.split(/\s+/).filter(Boolean).length} words
              </span>
            </div>
            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700 leading-relaxed max-h-36 overflow-y-auto">
              {originalText}
            </div>
          </div>

          {/* Loading Indicator */}
          {loading && (
            <div className="py-8 flex flex-col items-center justify-center text-center">
              <Loader2 className="w-6 h-6 text-indigo-600 animate-spin mb-2" />
              <p className="text-xs font-semibold text-slate-700">Polishing academic phrasing...</p>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Applying strong action verbs, conciseness, and scholarly tone.
              </p>
            </div>
          )}

          {/* AI Refined Suggestion */}
          {!loading && result && (
            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center space-x-1.5">
                    <span className="text-xs font-bold text-indigo-900 uppercase tracking-wider">
                      AI Enhanced Version
                    </span>
                    <span className="px-2 py-0.5 text-[10px] font-semibold bg-indigo-50 text-indigo-700 rounded-full border border-indigo-200">
                      Recommended
                    </span>
                  </div>
                  <button
                    onClick={() => setIsEditingCustom(!isEditingCustom)}
                    className="text-xs text-indigo-600 hover:text-indigo-800 font-medium inline-flex items-center space-x-1"
                  >
                    <Edit2 className="w-3 h-3" />
                    <span>{isEditingCustom ? 'Lock Edit' : 'Edit Text'}</span>
                  </button>
                </div>

                {isEditingCustom ? (
                  <textarea
                    value={editedText}
                    onChange={(e) => setEditedText(e.target.value)}
                    rows={4}
                    className="w-full text-xs text-slate-900 p-3 bg-white border border-indigo-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-indigo-500 leading-relaxed font-sans"
                  />
                ) : (
                  <div
                    onClick={() => setEditedText(result.improved)}
                    className="p-3.5 bg-indigo-50/50 border border-indigo-200 rounded-lg text-xs text-slate-900 leading-relaxed font-medium"
                  >
                    {editedText}
                  </div>
                )}

                {result.explanation && (
                  <div className="mt-1.5 text-[11px] text-slate-500 italic flex items-center space-x-1">
                    <Sparkles className="w-3 h-3 text-indigo-500 shrink-0" />
                    <span>{result.explanation}</span>
                  </div>
                )}
              </div>

              {/* Alternative Phrasing if provided */}
              {result.alternative && (
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                    Alternative Variation:
                  </label>
                  <button
                    type="button"
                    onClick={() => handleSelectAlternative(result.alternative!)}
                    className="w-full text-left p-3 rounded-lg border border-slate-200 hover:border-indigo-300 hover:bg-slate-50 text-xs text-slate-700 leading-relaxed transition-colors flex items-center justify-between group"
                  >
                    <span className="pr-4">{result.alternative}</span>
                    <span className="shrink-0 text-slate-400 group-hover:text-indigo-600 font-semibold text-[11px] inline-flex items-center">
                      Use This <ArrowRight className="w-3 h-3 ml-1" />
                    </span>
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-200/60 rounded-lg transition-colors cursor-pointer"
          >
            Reject / Keep Original
          </button>

          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={handleGenerate}
              disabled={loading}
              className="inline-flex items-center px-3 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
              title="Regenerate another suggestion"
            >
              <RotateCcw className="w-3.5 h-3.5 mr-1" />
              <span>Retry</span>
            </button>
            <button
              type="button"
              onClick={handleApply}
              disabled={loading || !editedText.trim()}
              className="inline-flex items-center px-4 py-2 text-xs font-semibold text-white bg-[#0f2b5c] hover:bg-[#0a1e40] rounded-lg shadow-xs transition-colors disabled:opacity-50 cursor-pointer"
            >
              <Check className="w-3.5 h-3.5 mr-1.5" />
              <span>Accept &amp; Apply</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
