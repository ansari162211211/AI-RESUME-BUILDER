import React, { useState } from 'react';
import { X, Check, FileText } from 'lucide-react';
import type { Resume } from '../../types/resume';
import type { TemplateDefinition } from '../../data/templates';
import { MultiPageTemplatePreview } from './MultiPageTemplatePreview';

interface TemplatePreviewModalProps {
  isOpen: boolean;
  template: TemplateDefinition | null;
  resume: Resume;
  onClose: () => void;
  onUseTemplate: (template: TemplateDefinition) => void;
}

export const TemplatePreviewModal: React.FC<TemplatePreviewModalProps> = ({
  isOpen,
  template,
  resume,
  onClose,
  onUseTemplate,
}) => {
  const [pageCount, setPageCount] = useState(1);

  if (!isOpen || !template) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-[1px] flex items-center justify-center p-3 sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="template-preview-title"
    >
      <div className="bg-neutral-100 rounded-lg shadow-2xl border border-slate-300 w-full max-w-5xl max-h-[92vh] flex flex-col overflow-hidden">
        {/* Modal Header */}
        <div className="bg-white border-b border-slate-200 px-4 sm:px-6 py-3.5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 shrink-0">
          <div className="min-w-0">
            <div className="flex items-center space-x-2">
              <FileText className="w-4 h-4 text-[#0f2b5c] shrink-0" />
              <h2
                id="template-preview-title"
                className="text-base font-bold text-slate-900 truncate"
              >
                {template.name}
              </h2>
              <span className="text-xs text-slate-500 font-medium hidden sm:inline">
                · {template.shortTag} · A4 ({pageCount} {pageCount === 1 ? 'Page' : 'Pages'})
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5 truncate">
              {template.description}
            </p>
          </div>

          <div className="flex items-center space-x-2 shrink-0 justify-end">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded hover:bg-slate-50 transition-colors cursor-pointer"
            >
              Close
            </button>
            <button
              type="button"
              onClick={() => onUseTemplate(template)}
              className="inline-flex items-center px-4 py-1.5 text-xs font-semibold text-white bg-[#0f2b5c] hover:bg-[#0a1e42] rounded shadow-xs transition-colors cursor-pointer"
            >
              <Check className="w-3.5 h-3.5 mr-1.5" />
              <span>Use This Template</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-700 rounded hover:bg-slate-100 transition-colors cursor-pointer"
              aria-label="Close template preview"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Scrollable Full A4 Multi-Page Preview */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6">
          <MultiPageTemplatePreview
            resume={resume}
            templateOverride={template.id}
            customizationOverride={template.defaultCustomization}
            onPageCountChange={setPageCount}
          />
        </div>
      </div>
    </div>
  );
};
