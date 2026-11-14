import React, { useEffect, useMemo, useState } from 'react';
import {
  Download,
  ArrowLeft,
  Edit3,
  Loader2,
  AlertCircle,
  CheckCircle2,
  X,
  SlidersHorizontal,
  RotateCcw,
  LayoutTemplate,
} from 'lucide-react';
import type {
  CvFontFamily,
  Resume,
  TemplateCustomization,
  TemplateFontSize,
  TemplateHeadingStyle,
  TemplateMarginSize,
  TemplateSpacing,
} from '../../types/resume';
import {
  ACCENT_COLOR_SWATCHES,
  TEMPLATE_DEFINITIONS,
  TEXT_COLOR_SWATCHES,
  getTemplateById,
  resolveTemplateCustomization,
  resolveTemplateId,
} from '../../data/templates';
import { saveResume } from '../../services/resumeService';
import { downloadAcademicCvPdf } from '../../services/pdfService';
import { analyzeResumeSections } from '../../utils/validation';
import { MultiPageTemplatePreview } from '../Templates/MultiPageTemplatePreview';

interface ResumePreviewPageProps {
  resume: Resume;
  onEdit: () => void;
  onBackToDashboard: () => void;
  onOpenTemplates?: () => void;
  onResumeUpdate?: (updated: Resume) => void;
}

const HEADING_STYLE_OPTIONS: { value: TemplateHeadingStyle; label: string }[] = [
  { value: 'uppercase-rule', label: 'Uppercase + Rule' },
  { value: 'classic-blue-rule', label: 'Classic Blue + Rule' },
  { value: 'moderncv-bar', label: 'ModernCV Left Bar' },
  { value: 'burgundy-gold-rule', label: 'Burgundy + Gold Rule' },
  { value: 'title-rule', label: 'Title Case + Thin Rule' },
  { value: 'left-accent', label: 'Left Accent Bar' },
  { value: 'filled-band', label: 'Filled Header Band' },
  { value: 'clean-caps', label: 'Clean Minimal Caps' },
  { value: 'italic-serif', label: 'Editorial Italic' },
];

export const ResumePreviewPage: React.FC<ResumePreviewPageProps> = ({
  resume: initialResume,
  onEdit,
  onBackToDashboard,
  onOpenTemplates,
  onResumeUpdate,
}) => {
  const [currentResume, setCurrentResume] = useState<Resume>(initialResume);
  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);
  const [pdfError, setPdfError] = useState<string | null>(null);
  const [pdfSuccessMessage, setPdfSuccessMessage] = useState<string | null>(null);
  const [pageCount, setPageCount] = useState(1);
  const [showCustomize, setShowCustomize] = useState(false);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'auto' });
  }, []);

  useEffect(() => {
    setCurrentResume(initialResume);
  }, [initialResume]);

  useEffect(() => {
    if (!pdfSuccessMessage) return;
    const timer = setTimeout(() => setPdfSuccessMessage(null), 4000);
    return () => clearTimeout(timer);
  }, [pdfSuccessMessage]);

  const activeTemplate = useMemo(
    () => getTemplateById(currentResume.template),
    [currentResume.template]
  );

  const custom = useMemo(
    () => resolveTemplateCustomization(currentResume),
    [currentResume]
  );

  const preflightReport = useMemo(
    () => analyzeResumeSections(currentResume),
    [currentResume]
  );

  const missingCoreSections = useMemo(
    () =>
      preflightReport.sections.filter(
        (s) => !s.isOptional && s.status !== 'complete'
      ),
    [preflightReport]
  );

  const persistUpdate = async (updated: Resume) => {
    setCurrentResume(updated);
    onResumeUpdate?.(updated);
    try {
      await saveResume(updated.userId, updated);
    } catch (e) {
      console.error('Failed to save template customization', e);
    }
  };

  const handleQuickTemplateSwitch = async (newTemplateId: string) => {
    const nextTemplate = getTemplateById(newTemplateId);
    const updated: Resume = {
      ...currentResume,
      template: nextTemplate.id,
      fontFamily: nextTemplate.defaultCustomization.fontFamily,
      themeColor: nextTemplate.defaultCustomization.accentColor,
      customization: { ...nextTemplate.defaultCustomization },
      updatedAt: new Date().toISOString(),
    };
    await persistUpdate(updated);
  };

  const handleCustomizationChange = async <K extends keyof TemplateCustomization>(
    key: K,
    value: TemplateCustomization[K]
  ) => {
    const nextCustom: TemplateCustomization = {
      ...custom,
      [key]: value,
    };
    const updated: Resume = {
      ...currentResume,
      fontFamily: nextCustom.fontFamily,
      themeColor: nextCustom.accentColor,
      customization: nextCustom,
      updatedAt: new Date().toISOString(),
    };
    await persistUpdate(updated);
  };

  const handleResetDefaults = async () => {
    const defaults = { ...activeTemplate.defaultCustomization };
    const updated: Resume = {
      ...currentResume,
      fontFamily: defaults.fontFamily,
      themeColor: defaults.accentColor,
      customization: defaults,
      updatedAt: new Date().toISOString(),
    };
    await persistUpdate(updated);
  };

  const handleDownloadPdf = async () => {
    if (isDownloadingPdf) return;
    setIsDownloadingPdf(true);
    setPdfError(null);
    setPdfSuccessMessage(null);

    try {
      const result = await downloadAcademicCvPdf(currentResume, custom.fontFamily);
      if (!result.success) {
        setPdfError(result.error || 'Failed to generate PDF. Please try again.');
      } else {
        setPdfSuccessMessage(`Downloaded ${result.fileName}`);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to generate PDF.';
      setPdfError(msg);
    } finally {
      setIsDownloadingPdf(false);
    }
  };

  return (
    <div className="min-h-screen bg-neutral-100 py-6 pb-20">
      {/* Top Controls Toolbar - Hidden during print */}
      <div className="no-print max-w-6xl mx-auto px-4 mb-5">
        <div className="bg-white border border-slate-200 rounded-lg p-3 sm:px-4 shadow-xs flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
          {/* Back & Title */}
          <div className="flex items-center space-x-2.5 min-w-0">
            <button
              type="button"
              onClick={onBackToDashboard}
              className="p-1.5 text-slate-500 hover:text-slate-900 rounded hover:bg-slate-100 transition-colors shrink-0"
              title="Back to Dashboard"
              aria-label="Back to Dashboard"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div className="min-w-0">
              <h1 className="text-sm font-bold text-slate-900 truncate max-w-[190px] xl:max-w-[230px]">
                {currentResume.title || 'Curriculum Vitae'}
              </h1>
              <span className="text-[11px] text-slate-500 block truncate">
                {activeTemplate.name} · A4 ({pageCount}{' '}
                {pageCount === 1 ? 'Page' : 'Pages'})
              </span>
            </div>
          </div>

          {/* Controls & Actions */}
          <div className="flex flex-wrap lg:flex-nowrap items-center gap-1.5 sm:gap-2 justify-end shrink-0">
            {/* Quick Template Switcher */}
            <div className="flex items-center space-x-1.5">
              <label htmlFor="preview-template-select" className="sr-only">
                Active Template
              </label>
              <select
                id="preview-template-select"
                value={resolveTemplateId(currentResume.template)}
                onChange={(e) => handleQuickTemplateSwitch(e.target.value)}
                className="px-2.5 py-1.5 text-xs font-semibold text-slate-800 bg-slate-50 border border-slate-300 rounded hover:border-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0f2b5c] cursor-pointer max-w-[175px]"
                title="Switch template (preserves all resume data)"
              >
                {TEMPLATE_DEFINITIONS.map((tpl) => (
                  <option key={tpl.id} value={tpl.id}>
                    {tpl.name}
                  </option>
                ))}
              </select>

              {onOpenTemplates && (
                <button
                  type="button"
                  onClick={onOpenTemplates}
                  className="inline-flex items-center px-2.5 py-1.5 text-xs font-semibold text-[#0f2b5c] bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded transition-colors cursor-pointer"
                  title="Browse resume templates with previews"
                >
                  <LayoutTemplate className="w-3.5 h-3.5 mr-1.5" />
                  <span>Templates</span>
                </button>
              )}
            </div>

            {/* Customize Toggle */}
            <button
              type="button"
              onClick={() => setShowCustomize((prev) => !prev)}
              aria-expanded={showCustomize}
              className={`inline-flex items-center px-3 py-1.5 text-xs font-semibold rounded border transition-colors cursor-pointer ${
                showCustomize
                  ? 'bg-[#0f2b5c] text-white border-[#0f2b5c]'
                  : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
              }`}
            >
              <SlidersHorizontal className="w-3.5 h-3.5 mr-1.5" />
              <span>Customize</span>
            </button>

            {/* Quick Serif / Sans Toggle */}
            <div className="flex items-center bg-slate-100 p-0.5 rounded text-xs">
              <button
                type="button"
                onClick={() =>
                  handleCustomizationChange('fontFamily', 'serif' as CvFontFamily)
                }
                className={`px-2 py-1 rounded font-serif font-medium transition-colors cursor-pointer ${
                  custom.fontFamily === 'serif'
                    ? 'bg-white text-slate-900 shadow-xs font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
                title="Serif Font"
              >
                Serif
              </button>
              <button
                type="button"
                onClick={() =>
                  handleCustomizationChange('fontFamily', 'sans' as CvFontFamily)
                }
                className={`px-2 py-1 rounded font-sans font-medium transition-colors cursor-pointer ${
                  custom.fontFamily === 'sans'
                    ? 'bg-white text-slate-900 shadow-xs font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
                title="Sans-Serif Font"
              >
                Sans
              </button>
            </div>

            {/* Edit Button */}
            <button
              type="button"
              onClick={onEdit}
              className="inline-flex items-center px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded hover:bg-slate-50 transition-colors cursor-pointer"
            >
              <Edit3 className="w-3.5 h-3.5 mr-1.5 text-slate-500" />
              <span>Edit CV</span>
            </button>

            {/* Download PDF button */}
            <button
              type="button"
              onClick={handleDownloadPdf}
              disabled={isDownloadingPdf}
              className="inline-flex items-center px-4 py-1.5 text-xs font-semibold text-white bg-slate-900 hover:bg-black disabled:opacity-60 disabled:cursor-not-allowed rounded shadow-xs transition-colors cursor-pointer"
            >
              {isDownloadingPdf ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                  <span>Generating PDF...</span>
                </>
              ) : (
                <>
                  <Download className="w-3.5 h-3.5 mr-1.5" />
                  <span>Download PDF (A4)</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Template Customization Panel */}
        {showCustomize && (
          <div
            className="mt-3 bg-white border border-slate-200 rounded-lg p-4 sm:p-5 shadow-xs"
            aria-label="Template customization panel"
          >
            <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-100">
              <div>
                <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                  Customize &ldquo;{activeTemplate.name}&rdquo;
                </h2>
                <p className="text-[11px] text-slate-500">
                  Typography, color, spacing, and margin changes apply live to both preview and A4 PDF.
                </p>
              </div>
              <button
                type="button"
                onClick={handleResetDefaults}
                className="inline-flex items-center px-2.5 py-1 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded transition-colors cursor-pointer"
              >
                <RotateCcw className="w-3 h-3 mr-1" />
                <span>Reset Defaults</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
              {/* Font Size */}
              <div>
                <span className="block font-semibold text-slate-700 mb-1.5">
                  Font Size
                </span>
                <div className="grid grid-cols-3 gap-1 bg-slate-100 p-0.5 rounded">
                  {(['compact', 'standard', 'large'] as TemplateFontSize[]).map(
                    (size) => (
                      <button
                        key={size}
                        type="button"
                        onClick={() => handleCustomizationChange('fontSize', size)}
                        className={`py-1 rounded font-medium capitalize transition-colors cursor-pointer ${
                          custom.fontSize === size
                            ? 'bg-white text-slate-900 font-bold shadow-xs'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        {size}
                      </button>
                    )
                  )}
                </div>
              </div>

              {/* Section Spacing */}
              <div>
                <span className="block font-semibold text-slate-700 mb-1.5">
                  Section Spacing
                </span>
                <div className="grid grid-cols-3 gap-1 bg-slate-100 p-0.5 rounded">
                  {(['tight', 'balanced', 'relaxed'] as TemplateSpacing[]).map(
                    (sp) => (
                      <button
                        key={sp}
                        type="button"
                        onClick={() =>
                          handleCustomizationChange('sectionSpacing', sp)
                        }
                        className={`py-1 rounded font-medium capitalize transition-colors cursor-pointer ${
                          custom.sectionSpacing === sp
                            ? 'bg-white text-slate-900 font-bold shadow-xs'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        {sp}
                      </button>
                    )
                  )}
                </div>
              </div>

              {/* Page Margins */}
              <div>
                <span className="block font-semibold text-slate-700 mb-1.5">
                  Page Margins (A4)
                </span>
                <div className="grid grid-cols-3 gap-1 bg-slate-100 p-0.5 rounded">
                  {(['narrow', 'standard', 'wide'] as TemplateMarginSize[]).map(
                    (mg) => (
                      <button
                        key={mg}
                        type="button"
                        onClick={() =>
                          handleCustomizationChange('pageMargins', mg)
                        }
                        className={`py-1 rounded font-medium capitalize transition-colors cursor-pointer ${
                          custom.pageMargins === mg
                            ? 'bg-white text-slate-900 font-bold shadow-xs'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        {mg}
                      </button>
                    )
                  )}
                </div>
              </div>

              {/* Heading Style */}
              <div>
                <label
                  htmlFor="customize-heading-style"
                  className="block font-semibold text-slate-700 mb-1.5"
                >
                  Heading Style
                </label>
                <select
                  id="customize-heading-style"
                  value={custom.headingStyle}
                  onChange={(e) =>
                    handleCustomizationChange(
                      'headingStyle',
                      e.target.value as TemplateHeadingStyle
                    )
                  }
                  className="w-full px-2.5 py-1.5 border border-slate-300 rounded bg-white text-slate-800 font-medium focus:outline-none focus:ring-2 focus:ring-[#0f2b5c]"
                >
                  {HEADING_STYLE_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Color Row */}
              <div className="sm:col-span-2 lg:col-span-4 flex flex-col md:flex-row md:items-start gap-4 md:gap-8">
                {/* Primary Text Color */}
                <div className="shrink-0">
                  <span className="block font-semibold text-slate-700 mb-1.5">
                    Primary Text Color
                  </span>
                  <div className="flex flex-wrap items-center gap-2">
                    {TEXT_COLOR_SWATCHES.map((sw) => {
                      const selected =
                        custom.textColor.toLowerCase() === sw.value.toLowerCase();
                      return (
                        <button
                          key={sw.value}
                          type="button"
                          onClick={() =>
                            handleCustomizationChange('textColor', sw.value)
                          }
                          className={`inline-flex items-center space-x-1.5 px-2.5 py-1 rounded border text-[11px] font-medium cursor-pointer ${
                            selected
                              ? 'border-[#0f2b5c] bg-blue-50 text-slate-900 font-bold'
                              : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                          }`}
                          title={sw.label}
                        >
                          <span
                            className="w-3 h-3 rounded-full border border-slate-300 shrink-0"
                            style={{ backgroundColor: sw.value }}
                          />
                          <span className="whitespace-nowrap">{sw.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Accent Color */}
                <div className="min-w-0 flex-1">
                  <span className="block font-semibold text-slate-700 mb-1.5">
                    Accent Color
                  </span>
                  <div className="flex flex-wrap items-center gap-2">
                    {ACCENT_COLOR_SWATCHES.map((sw) => {
                      const selected =
                        custom.accentColor.toLowerCase() ===
                        sw.value.toLowerCase();
                      return (
                        <button
                          key={sw.value}
                          type="button"
                          onClick={() =>
                            handleCustomizationChange('accentColor', sw.value)
                          }
                          className={`inline-flex items-center space-x-1.5 px-2.5 py-1 rounded border text-[11px] font-medium cursor-pointer ${
                            selected
                              ? 'border-[#0f2b5c] bg-blue-50 text-slate-900 font-bold'
                              : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                          }`}
                          title={sw.label}
                        >
                          <span
                            className="w-3 h-3 rounded-full border border-slate-300 shrink-0"
                            style={{ backgroundColor: sw.value }}
                          />
                          <span className="whitespace-nowrap">{sw.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Status / Error Feedback */}
        {pdfError && (
          <div
            role="alert"
            className="mt-3 bg-red-50 border border-red-200 text-red-800 px-4 py-2.5 rounded-lg flex items-center justify-between text-xs"
          >
            <div className="flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
              <span>{pdfError}</span>
            </div>
            <button
              type="button"
              onClick={() => setPdfError(null)}
              className="text-red-500 hover:text-red-700 p-0.5"
              aria-label="Dismiss error"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {pdfSuccessMessage && !pdfError && (
          <div
            role="status"
            className="mt-3 bg-emerald-50 border border-emerald-200 text-emerald-900 px-4 py-2 rounded-lg flex items-center justify-between text-xs"
          >
            <div className="flex items-center space-x-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{pdfSuccessMessage}</span>
            </div>
            <button
              type="button"
              onClick={() => setPdfSuccessMessage(null)}
              className="text-emerald-600 hover:text-emerald-800 p-0.5"
              aria-label="Dismiss notification"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Non-blocking Pre-Download Validation Summary */}
        <div className="mt-2.5 px-3.5 py-2 bg-white border border-slate-200 rounded-lg flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-600">
          <div className="flex items-center space-x-2">
            <span
              className={`inline-block w-2 h-2 rounded-full ${
                missingCoreSections.length === 0 ? 'bg-emerald-500' : 'bg-amber-500'
              }`}
            />
            <span>
              <strong className="text-slate-800">{activeTemplate.name}:</strong>{' '}
              {preflightReport.overallScore}% complete · Selectable text &amp; active hyperlinks ready for A4 export.
              {missingCoreSections.length > 0 && (
                <span className="text-amber-700 ml-1">
                  (Optional to review: {missingCoreSections.map((s) => s.name).join(', ')})
                </span>
              )}
            </span>
          </div>
          {missingCoreSections.length > 0 && (
            <button
              type="button"
              onClick={onEdit}
              className="font-semibold text-[#0f2b5c] hover:underline cursor-pointer"
            >
              Complete in Editor
            </button>
          )}
        </div>
      </div>

      {/* Multi-Page A4 Preview matching active template + customization */}
      <MultiPageTemplatePreview
        resume={currentResume}
        onPageCountChange={setPageCount}
      />
    </div>
  );
};
