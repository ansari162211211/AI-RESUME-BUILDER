export type PhotoCropShape = 'portrait' | 'square' | 'circle';

export interface PhotoCropConfig {
  zoom: number; // 1.0 to 3.0
  offsetX: number; // -1 to 1 normalized pan
  offsetY: number; // -1 to 1 normalized pan
  shape: PhotoCropShape;
}

export interface CropSourceRect {
  sx: number;
  sy: number;
  sw: number;
  sh: number;
  outWidth: number;
  outHeight: number;
}

/**
 * Pure geometry calculator for cropping any image to portrait (3:4), square (1:1), or circle (1:1)
 * with zoom and normalized pan offsets (-1..1). Easily unit-tested in Node.
 */
export function computePhotoCropRect(
  naturalWidth: number,
  naturalHeight: number,
  config: PhotoCropConfig
): CropSourceRect {
  const safeW = Math.max(1, naturalWidth);
  const safeH = Math.max(1, naturalHeight);
  const zoom = Math.min(3, Math.max(1, config.zoom || 1));
  const isOneToOne = config.shape === 'square' || config.shape === 'circle';
  const targetRatio = isOneToOne ? 1 : 0.78; // classic portrait CV ratio (~78:100)

  let baseSw: number;
  let baseSh: number;
  if (safeW / safeH > targetRatio) {
    baseSh = safeH;
    baseSw = safeH * targetRatio;
  } else {
    baseSw = safeW;
    baseSh = safeW / targetRatio;
  }

  const sw = Math.max(1, baseSw / zoom);
  const sh = Math.max(1, baseSh / zoom);

  const maxOffsetX = Math.max(0, (safeW - sw) / 2);
  const maxOffsetY = Math.max(0, (safeH - sh) / 2);

  const clampedPanX = Math.min(1, Math.max(-1, config.offsetX || 0));
  const clampedPanY = Math.min(1, Math.max(-1, config.offsetY || 0));

  const cx = safeW / 2 - clampedPanX * maxOffsetX;
  const cy = safeH / 2 - clampedPanY * maxOffsetY;

  const sx = Math.min(safeW - sw, Math.max(0, cx - sw / 2));
  const sy = Math.min(safeH - sh, Math.max(0, cy - sh / 2));

  const outWidth = isOneToOne ? 320 : 312;
  const outHeight = isOneToOne ? 320 : 400;

  return {
    sx,
    sy,
    sw,
    sh,
    outWidth,
    outHeight,
  };
}

/**
 * Validates that an uploaded file is a supported raster image (PNG/JPG/WebP) within size limit.
 */
export function validatePhotoFile(file: { type: string; size: number }): {
  valid: boolean;
  error?: string;
} {
  const allowed = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
  if (!allowed.includes(file.type.toLowerCase())) {
    return {
      valid: false,
      error: 'Please upload a JPG, PNG, or WebP image file.',
    };
  }
  const maxBytes = 8 * 1024 * 1024;
  if (file.size > maxBytes) {
    return {
      valid: false,
      error: 'Image must be smaller than 8 MB.',
    };
  }
  return { valid: true };
}

/**
 * Renders the cropped image onto an offscreen canvas and exports a compact JPEG data URL
 * compatible with HTML preview, @react-pdf/renderer <Image>, and Firestore 1MB doc limit.
 */
export async function renderCroppedPhotoDataUrl(
  imageSrc: string,
  config: PhotoCropConfig
): Promise<string> {
  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const el = new Image();
    el.onload = () => resolve(el);
    el.onerror = () => reject(new Error('Could not decode selected image.'));
    el.src = imageSrc;
  });

  const rect = computePhotoCropRect(img.naturalWidth, img.naturalHeight, config);
  const canvas = document.createElement('canvas');
  canvas.width = rect.outWidth;
  canvas.height = rect.outHeight;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Canvas 2D context is unavailable.');
  }
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

  return canvas.toDataURL('image/jpeg', 0.86);
}
