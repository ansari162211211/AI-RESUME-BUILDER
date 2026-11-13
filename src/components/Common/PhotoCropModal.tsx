import React, { useEffect, useRef, useState } from 'react';
import {
  Check,
  Image as ImageIcon,
  Move,
  RotateCcw,
  Trash2,
  Upload,
  X,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import {
  computePhotoCropRect,
  renderCroppedPhotoDataUrl,
  validatePhotoFile,
  type PhotoCropShape,
} from '../../utils/photoCrop';

interface PhotoCropModalProps {
  isOpen: boolean;
  initialImageSrc: string;
  initialShape?: PhotoCropShape;
  hasSavedPhoto?: boolean;
  onApply: (dataUrl: string, shape: PhotoCropShape) => void;
  onRemove?: () => void;
  onClose: () => void;
}

export const PhotoCropModal: React.FC<PhotoCropModalProps> = ({
  isOpen,
  initialImageSrc,
  initialShape = 'portrait',
  hasSavedPhoto = false,
  onApply,
  onRemove,
  onClose,
}) => {
  const [imageSrc, setImageSrc] = useState(initialImageSrc);
  const [shape, setShape] = useState<PhotoCropShape>(initialShape);
  const [zoom, setZoom] = useState(1);
  const [offsetX, setOffsetX] = useState(0);
  const [offsetY, setOffsetY] = useState(0);
  const [naturalSize, setNaturalSize] = useState<{ w: number; h: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const dragRef = useRef<{ active: boolean; startX: number; startY: number; origOx: number; origOy: number }>({
    active: false,
    startX: 0,
    startY: 0,
    origOx: 0,
    origOy: 0,
  });

  useEffect(() => {
    if (isOpen) {
      setImageSrc(initialImageSrc);
      setShape(initialShape);
      setZoom(1);
      setOffsetX(0);
      setOffsetY(0);
      setError(null);
    }
  }, [isOpen, initialImageSrc, initialShape]);

  useEffect(() => {
    if (!isOpen || !imageSrc) return;
    let cancelled = false;
    const img = new Image();
    img.onload = () => {
      if (cancelled) return;
      setNaturalSize({ w: img.naturalWidth, h: img.naturalHeight });
      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = computePhotoCropRect(img.naturalWidth, img.naturalHeight, {
        zoom,
        offsetX,
        offsetY,
        shape,
      });
      canvas.width = rect.outWidth;
      canvas.height = rect.outHeight;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(
        img,
        rect.sx,
        rect.sy,
        rect.sw,
        rect.sh,
        0,
        0,
        rect.outWidth,
        rect.outHeight
      );
    };
    img.onerror = () => {
      if (!cancelled) setError('Could not load image preview. Try another JPG or PNG file.');
    };
    img.src = imageSrc;
    return () => {
      cancelled = true;
    };
  }, [isOpen, imageSrc, zoom, offsetX, offsetY, shape]);

  if (!isOpen) return null;

  const handleReplaceFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const check = validatePhotoFile(file);
    if (!check.valid) {
      setError(check.error || 'Unsupported file');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setImageSrc(reader.result);
        setZoom(1);
        setOffsetX(0);
        setOffsetY(0);
        setError(null);
      }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    dragRef.current = {
      active: true,
      startX: e.clientX,
      startY: e.clientY,
      origOx: offsetX,
      origOy: offsetY,
    };
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!dragRef.current.active) return;
    const dx = (e.clientX - dragRef.current.startX) / 90;
    const dy = (e.clientY - dragRef.current.startY) / 90;
    setOffsetX(Math.min(1, Math.max(-1, dragRef.current.origOx + dx)));
    setOffsetY(Math.min(1, Math.max(-1, dragRef.current.origOy + dy)));
  };

  const handlePointerUp = () => {
    dragRef.current.active = false;
  };

  const handleApply = async () => {
    if (!imageSrc) return;
    setIsProcessing(true);
    setError(null);
    try {
      const dataUrl = await renderCroppedPhotoDataUrl(imageSrc, {
        zoom,
        offsetX,
        offsetY,
        shape,
      });
      onApply(dataUrl, shape);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to crop photo.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-lg w-full overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-[#1e4e8c] flex items-center justify-center">
              <ImageIcon className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-slate-900">Crop & Frame Profile Photo</h3>
              <p className="text-xs text-slate-500">
                Drag image or adjust sliders to center head & shoulders cleanly
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100"
            aria-label="Close crop dialog"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {error && (
            <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-700">
              {error}
            </div>
          )}

          {/* Frame Preview */}
          <div className="flex flex-col items-center justify-center bg-slate-50 border border-slate-200 rounded-xl p-4">
            <canvas
              ref={canvasRef}
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerCancel={handlePointerUp}
              style={{
                width: shape === 'portrait' ? 156 : 180,
                height: shape === 'portrait' ? 200 : 180,
              }}
              className={`border-2 border-[#1e4e8c] shadow-sm bg-white cursor-grab active:cursor-grabbing touch-none ${
                shape === 'circle' ? 'rounded-full' : ''
              }`}
            />
            <div className="mt-2.5 flex items-center gap-1.5 text-[11px] text-slate-500">
              <Move className="w-3.5 h-3.5" />
              <span>Drag frame to reposition</span>
              {naturalSize && (
                <span className="text-slate-400">
                  · Source {naturalSize.w}×{naturalSize.h}px
                </span>
              )}
            </div>
          </div>

          {/* Aspect Ratio + Replace */}
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="inline-flex rounded-lg border border-slate-200 p-0.5 bg-slate-50">
              <button
                type="button"
                onClick={() => setShape('portrait')}
                className={`px-2.5 py-1.5 text-xs font-medium rounded-md transition cursor-pointer ${
                  shape === 'portrait'
                    ? 'bg-white text-[#1e4e8c] shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Portrait (3:4)
              </button>
              <button
                type="button"
                onClick={() => setShape('square')}
                className={`px-2.5 py-1.5 text-xs font-medium rounded-md transition cursor-pointer ${
                  shape === 'square'
                    ? 'bg-white text-[#1e4e8c] shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Square (1:1)
              </button>
              <button
                type="button"
                onClick={() => setShape('circle')}
                className={`px-2.5 py-1.5 text-xs font-medium rounded-md transition cursor-pointer ${
                  shape === 'circle'
                    ? 'bg-white text-[#1e4e8c] shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Circle (1:1)
              </button>
            </div>

            <div className="flex items-center gap-2">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp"
                onChange={handleReplaceFile}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50"
              >
                <Upload className="w-3.5 h-3.5" />
                Replace Photo
              </button>
              <button
                type="button"
                onClick={() => {
                  setZoom(1);
                  setOffsetX(0);
                  setOffsetY(0);
                }}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium border border-slate-300 rounded-lg text-slate-600 hover:bg-slate-50"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Reset
              </button>
            </div>
          </div>

          {/* Sliders */}
          <div className="space-y-3 bg-slate-50/70 p-3.5 rounded-xl border border-slate-200">
            <div>
              <div className="flex items-center justify-between text-xs font-medium text-slate-700 mb-1">
                <span className="flex items-center gap-1.5">
                  <ZoomOut className="w-3.5 h-3.5 text-slate-400" />
                  Zoom ({zoom.toFixed(2)}x)
                  <ZoomIn className="w-3.5 h-3.5 text-slate-400" />
                </span>
              </div>
              <input
                type="range"
                min={1}
                max={3}
                step={0.05}
                value={zoom}
                onChange={(e) => setZoom(parseFloat(e.target.value))}
                className="w-full accent-[#1e4e8c]"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <div className="text-[11px] font-medium text-slate-600 mb-1">
                  Horizontal Pan
                </div>
                <input
                  type="range"
                  min={-1}
                  max={1}
                  step={0.02}
                  value={offsetX}
                  onChange={(e) => setOffsetX(parseFloat(e.target.value))}
                  className="w-full accent-[#1e4e8c]"
                />
              </div>
              <div>
                <div className="text-[11px] font-medium text-slate-600 mb-1">
                  Vertical Pan
                </div>
                <input
                  type="range"
                  min={-1}
                  max={1}
                  step={0.02}
                  value={offsetY}
                  onChange={(e) => setOffsetY(parseFloat(e.target.value))}
                  className="w-full accent-[#1e4e8c]"
                />
              </div>
            </div>
          </div>
        </div>

        <div className="px-5 py-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-2">
          <div>
            {hasSavedPhoto && onRemove && (
              <button
                type="button"
                onClick={onRemove}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-rose-700 hover:bg-rose-50 rounded-lg transition"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Remove Photo
              </button>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-2 text-xs font-medium text-slate-700 hover:bg-slate-200/60 rounded-lg transition"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={isProcessing}
              onClick={handleApply}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-[#1e4e8c] hover:bg-[#173d6e] rounded-lg shadow-xs disabled:opacity-50 transition"
            >
              <Check className="w-3.5 h-3.5" />
              {isProcessing ? 'Applying...' : 'Apply Photo'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
