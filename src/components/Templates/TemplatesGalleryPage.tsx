import React, { useMemo, useState } from 'react';
import {
  ArrowLeft,
  Check,
  Eye,
  Search,
  Sparkles,
} from 'lucide-react';
import type { Resume, TemplateCategory } from '../../types/resume';
import {
  TEMPLATE_CATEGORIES,
  TEMPLATE_DEFINITIONS,
  resolveTemplateId,
  type TemplateDefinition,
} from '../../data/templates';
import {
  SAMPLE_ACADEMIC_CV,
  SAMPLE_CLASSIC_PROFESSIONAL_CV,
  SAMPLE_ELEGANT_SERIF_CV,
  SAMPLE_HARVARD_CV,
  SAMPLE_JAKES_CV,
  SAMPLE_SOFTWARE_DEVELOPER_CV,
  SAMPLE_TWO_COLUMN_CV,
} from '../../data/sampleResumes';
import { TemplateThumbnail } from './TemplateThumbnail';
import { TemplatePreviewModal } from './TemplatePreviewModal';

interface TemplatesGalleryPageProps {
  resumes: Resume[];
  activeResume: Resume | null;
  onApplyTemplate: (template: TemplateDefinition, targetResume: Resume | null) => void;
  onBack: () => void;
  backLabel?: string;
}

export const TemplatesGalleryPage: React.FC<TemplatesGalleryPageProps> = ({
  resumes,
  activeResume,
  onApplyTemplate,
  onBack,
  backLabel = 'Back',
}) => {
  const [selectedCategory, setSelectedCategory] =
    useState<TemplateCategory>('All Templates');
  const [searchQuery, setSearchQuery] = useState('');
  const [previewTemplate, setPreviewTemplate] = useState<TemplateDefinition | null>(
    null
  );

  const getPreviewDataForTemplate = (templateId: string): Resume => {
    if (activeResume && activeResume.personalInfo?.fullName?.trim()) {
      return activeResume;
    }
    const sampleBase =
      templateId === 'jakes-resume'
        ? SAMPLE_JAKES_CV
        : templateId === 'classic-professional'
        ? SAMPLE_CLASSIC_PROFESSIONAL_CV
        : templateId === 'two-column-professional'
        ? SAMPLE_TWO_COLUMN_CV
        : templateId === 'software-developer'
        ? SAMPLE_SOFTWARE_DEVELOPER_CV
        : templateId === 'harvard-style'
        ? SAMPLE_HARVARD_CV
        : templateId === 'elegant-serif'
        ? SAMPLE_ELEGANT_SERIF_CV
        : SAMPLE_ACADEMIC_CV;
    return {
      ...sampleBase,
      id: `gallery_preview_${templateId}`,
      userId: 'preview',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  };

  const modalPreviewResume = useMemo<Resume>(() => {
    if (previewTemplate) {
      return getPreviewDataForTemplate(previewTemplate.id);
    }
    if (activeResume && activeResume.personalInfo?.fullName?.trim()) {
      return activeResume;
    }
    const firstPopulated = resumes.find((r) => r.personalInfo?.fullName?.trim());
    if (firstPopulated) return firstPopulated;
    return getPreviewDataForTemplate('academic-cv');
  }, [previewTemplate, activeResume, resumes]);

  const currentTemplateId = activeResume
    ? resolveTemplateId(activeResume.template)
    : null;

  const availableCategories = useMemo(() => {
    return TEMPLATE_CATEGORIES.filter(
      (cat) =>
        cat === 'All Templates' ||
        TEMPLATE_DEFINITIONS.some((tpl) => tpl.categories.includes(cat))
    );
  }, []);

  const filteredTemplates = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return TEMPLATE_DEFINITIONS.filter((tpl) => {
      const matchesCategory =
        selectedCategory === 'All Templates' ||
        tpl.categories.includes(selectedCategory);
      if (!matchesCategory) return false;
      if (!q) return true;
      return (
        tpl.name.toLowerCase().includes(q) ||
        tpl.description.toLowerCase().includes(q) ||
        tpl.shortTag.toLowerCase().includes(q) ||
        tpl.categories.some((c) => c.toLowerCase().includes(q))
      );
    });
  }, [selectedCategory, searchQuery]);

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
      {/* Header Banner */}
      <div className="bg-white border border-slate-200 rounded-lg p-6 mb-6 shadow-xs">
        <div>
          <button
            type="button"
            onClick={onBack}
            className="inline-flex items-center text-xs font-semibold text-slate-600 hover:text-slate-900 mb-2 cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5 mr-1" />
            <span>{backLabel}</span>
          </button>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            Resume &amp; Academic CV Templates
          </h1>
          <p className="text-sm text-slate-600 mt-1 max-w-2xl">
            {TEMPLATE_DEFINITIONS.length === 1
              ? 'Browse the currently available resume template. Your saved personal details, experience, publications, and sections populate automatically—nothing is lost when applying a template.'
              : `Choose from ${TEMPLATE_DEFINITIONS.length} Overleaf and LaTeX-inspired layouts. Your saved personal details, experience, publications, and sections populate automatically—nothing is lost when switching templates.`}
          </p>
        </div>

        {/* Search & Category Filter Bar */}
        <div className="mt-6 pt-5 border-t border-slate-100 flex flex-col gap-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search templates by name or category..."
                aria-label="Search templates by name or category"
                className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-[#0f2b5c] focus:border-transparent bg-white"
              />
            </div>

            <div className="text-xs font-medium text-slate-500">
              Showing {filteredTemplates.length} of {TEMPLATE_DEFINITIONS.length}{' '}
              {TEMPLATE_DEFINITIONS.length === 1 ? 'template' : 'templates'}
            </div>
          </div>

          <div
            className="flex flex-wrap gap-1.5"
            role="tablist"
            aria-label="Template categories"
          >
            {availableCategories.map((cat) => {
              const isSelected = selectedCategory === cat;
              return (
                <button
                  key={cat}
                  type="button"
                  role="tab"
                  aria-selected={isSelected}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3 py-1.5 rounded text-xs font-semibold transition-colors cursor-pointer ${
                    isSelected
                      ? 'bg-[#0f2b5c] text-white shadow-xs'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  {cat}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Templates Grid */}
      {filteredTemplates.length === 0 ? (
        <div className="bg-white border border-slate-200 border-dashed rounded-lg p-12 text-center">
          <Sparkles className="w-8 h-8 text-slate-400 mx-auto mb-3" />
          <h2 className="text-base font-bold text-slate-900">
            No matching templates found
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Try clearing your search filter or choosing &ldquo;All Templates&rdquo;.
          </p>
          <button
            type="button"
            onClick={() => {
              setSelectedCategory('All Templates');
              setSearchQuery('');
            }}
            className="mt-4 px-4 py-1.5 text-xs font-semibold text-white bg-[#0f2b5c] hover:bg-[#0a1e42] rounded cursor-pointer"
          >
            Show All Templates
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredTemplates.map((template) => {
            const isCurrent = currentTemplateId === template.id;
            return (
              <div
                key={template.id}
                data-template-card={template.id}
                className={`bg-white rounded-lg border transition-all flex flex-col justify-between overflow-hidden ${
                  isCurrent
                    ? 'border-[#0f2b5c] ring-1 ring-[#0f2b5c] shadow-sm'
                    : 'border-slate-200 shadow-xs hover:border-slate-300'
                }`}
              >
                {/* Miniature A4 Thumbnail */}
                <div>
                  <div className="bg-slate-100 p-4 border-b border-slate-200 flex justify-center">
                    <div className="w-44 shadow-md border border-slate-300 bg-white overflow-hidden">
                      <TemplateThumbnail
                        template={template}
                        resume={getPreviewDataForTemplate(template.id)}
                      />
                    </div>
                  </div>

                  <div className="p-4 pb-3">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="text-sm font-bold text-slate-900 leading-snug">
                        {template.name}
                      </h3>
                      {isCurrent && (
                        <span className="shrink-0 text-[10px] font-bold text-[#0f2b5c] uppercase tracking-wide">
                          Active
                        </span>
                      )}
                    </div>

                    <div className="text-[11px] font-medium text-slate-500 mt-1">
                      {template.categories.join(' · ')}
                    </div>

                    <p className="text-xs text-slate-600 mt-2 leading-relaxed line-clamp-2">
                      {template.description}
                    </p>
                  </div>
                </div>

                {/* Card Actions */}
                <div className="px-4 py-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => setPreviewTemplate(template)}
                    className="inline-flex items-center justify-center px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-100 rounded transition-colors cursor-pointer flex-1"
                  >
                    <Eye className="w-3.5 h-3.5 mr-1.5 text-slate-500" />
                    <span>Preview</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => onApplyTemplate(template, activeResume)}
                    className={`inline-flex items-center justify-center px-3 py-1.5 text-xs font-semibold rounded transition-colors cursor-pointer flex-1 ${
                      isCurrent
                        ? 'bg-emerald-700 hover:bg-emerald-800 text-white'
                        : 'bg-[#0f2b5c] hover:bg-[#0a1e42] text-white'
                    }`}
                  >
                    <Check className="w-3.5 h-3.5 mr-1.5" />
                    <span>{isCurrent ? 'Selected' : 'Use This Template'}</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Full Template Preview Modal */}
      <TemplatePreviewModal
        isOpen={Boolean(previewTemplate)}
        template={previewTemplate}
        resume={modalPreviewResume}
        onClose={() => setPreviewTemplate(null)}
        onUseTemplate={(tpl) => {
          setPreviewTemplate(null);
          onApplyTemplate(tpl, activeResume);
        }}
      />
    </div>
  );
};
