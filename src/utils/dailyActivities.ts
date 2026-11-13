import type { DailyActivityItem } from '../types/resume';

export interface DailyActivityValidation {
  valid: boolean;
  totalHours: number;
  remainingHours: number;
  validItems: DailyActivityItem[];
  invalidEntries: DailyActivityItem[];
  error?: string;
}

export interface DonutChartSegment {
  id: string;
  activity: string;
  hours: number;
  fraction: number;
  percentage: number;
  color: string;
  pathD: string;
  dotX: number;
  dotY: number;
  elbowX: number;
  elbowY: number;
  labelEndX: number;
  labelY: number;
  side: 'left' | 'right';
}

export interface DonutChartGeometry {
  viewBoxWidth: number;
  viewBoxHeight: number;
  cx: number;
  cy: number;
  outerRadius: number;
  innerRadius: number;
  totalHours: number;
  segments: DonutChartSegment[];
}

const DEFAULT_DONUT_PALETTE = [
  '#8f131b', // deep burgundy
  '#560b10', // darkest maroon
  '#b4434a', // muted crimson
  '#ce7e83', // dusty rose
  '#e3b5b7', // soft blush burgundy
  '#701118', // dark wine
  '#9e2c34', // rich garnet
];

function polarToCartesian(cx: number, cy: number, radius: number, angleRad: number) {
  return {
    x: cx + radius * Math.cos(angleRad),
    y: cy + radius * Math.sin(angleRad),
  };
}

function buildRingSlicePath(
  cx: number,
  cy: number,
  outerRadius: number,
  innerRadius: number,
  startAngleRad: number,
  endAngleRad: number
): string {
  const sweep = endAngleRad - startAngleRad;
  // Handle single 100% slice safely using two semi-circles
  if (sweep >= Math.PI * 2 - 0.001) {
    const midAngle = startAngleRad + Math.PI;
    return [
      buildRingSlicePath(cx, cy, outerRadius, innerRadius, startAngleRad, midAngle),
      buildRingSlicePath(cx, cy, outerRadius, innerRadius, midAngle, startAngleRad + Math.PI * 2 - 0.0001),
    ].join(' ');
  }

  const pOuterStart = polarToCartesian(cx, cy, outerRadius, startAngleRad);
  const pOuterEnd = polarToCartesian(cx, cy, outerRadius, endAngleRad);
  const pInnerEnd = polarToCartesian(cx, cy, innerRadius, endAngleRad);
  const pInnerStart = polarToCartesian(cx, cy, innerRadius, startAngleRad);
  const largeArcFlag = sweep > Math.PI ? 1 : 0;

  return [
    `M ${pOuterStart.x.toFixed(2)} ${pOuterStart.y.toFixed(2)}`,
    `A ${outerRadius} ${outerRadius} 0 ${largeArcFlag} 1 ${pOuterEnd.x.toFixed(2)} ${pOuterEnd.y.toFixed(2)}`,
    `L ${pInnerEnd.x.toFixed(2)} ${pInnerEnd.y.toFixed(2)}`,
    `A ${innerRadius} ${innerRadius} 0 ${largeArcFlag} 0 ${pInnerStart.x.toFixed(2)} ${pInnerStart.y.toFixed(2)}`,
    'Z',
  ].join(' ');
}

/**
 * Validates daily activity hours against the strict 24-hour physical ceiling.
 * Rejects totals > 24h or negative/non-finite entries with a descriptive message.
 */
export function validateDailyActivities(items?: DailyActivityItem[]): DailyActivityValidation {
  const list = Array.isArray(items) ? items : [];
  const invalidEntries: DailyActivityItem[] = [];
  const validItems: DailyActivityItem[] = [];

  for (const item of list) {
    const hours = Number(item.hours);
    const hasName = typeof item.activity === 'string' && item.activity.trim().length > 0;
    if (!Number.isFinite(hours) || hours <= 0) {
      invalidEntries.push(item);
      continue;
    }
    if (!hasName) {
      invalidEntries.push(item);
      continue;
    }
    validItems.push({
      id: item.id,
      activity: item.activity.trim(),
      hours: Number(hours.toFixed(2)),
    });
  }

  const rawTotal = list.reduce((sum, item) => {
    const h = Number(item.hours);
    return sum + (Number.isFinite(h) && h > 0 ? h : 0);
  }, 0);
  const totalHours = Number(rawTotal.toFixed(2));
  const remainingHours = Math.max(0, Number((24 - totalHours).toFixed(2)));

  if (totalHours > 24) {
    const excess = Number((totalHours - 24).toFixed(2));
    return {
      valid: false,
      totalHours,
      remainingHours: 0,
      validItems,
      invalidEntries,
      error: `Total daily hours (${totalHours}h) exceed 24 hours by ${excess}h. Please reduce your hours to 24 or less.`,
    };
  }

  if (invalidEntries.length > 0) {
    return {
      valid: false,
      totalHours,
      remainingHours,
      validItems,
      invalidEntries,
      error: 'Each daily activity must have a name and a positive number of hours.',
    };
  }

  return {
    valid: true,
    totalHours,
    remainingHours,
    validItems,
    invalidEntries: [],
  };
}

/**
 * Derives a burgundy-shade palette matching any base accent color.
 */
export function getDonutPalette(accentColor?: string): string[] {
  const clean = (accentColor || '').trim().toLowerCase();
  if (!clean || clean === '#8f131b' || clean === '#7c2d12') {
    return DEFAULT_DONUT_PALETTE;
  }
  const hex = clean.replace('#', '');
  if (!/^[0-9a-f]{6}$/.test(hex)) return DEFAULT_DONUT_PALETTE;
  const r = parseInt(hex.slice(0, 2), 16);
  const g = parseInt(hex.slice(2, 4), 16);
  const b = parseInt(hex.slice(4, 6), 16);
  const mix = (factor: number, target: number) => {
    const mr = Math.round(r + (target - r) * factor)
      .toString(16)
      .padStart(2, '0');
    const mg = Math.round(g + (target - g) * factor)
      .toString(16)
      .padStart(2, '0');
    const mb = Math.round(b + (target - b) * factor)
      .toString(16)
      .padStart(2, '0');
    return `#${mr}${mg}${mb}`;
  };
  return [
    clean,
    mix(0.35, 0),
    mix(0.28, 255),
    mix(0.52, 255),
    mix(0.72, 255),
    mix(0.18, 0),
    mix(0.42, 255),
  ];
}

/**
 * Pure geometry builder for the AltaCV "A Day of My Life" SVG donut chart with elbow leader lines.
 */
export function computeDonutChartSegments(
  items: DailyActivityItem[],
  options?: {
    accentColor?: string;
    viewBoxWidth?: number;
    viewBoxHeight?: number;
    outerRadius?: number;
    innerRadius?: number;
  }
): DonutChartGeometry {
  const validation = validateDailyActivities(items);
  const validItems = validation.validItems;
  const viewBoxWidth = options?.viewBoxWidth ?? 330;
  const viewBoxHeight = options?.viewBoxHeight ?? 148;
  const cx = viewBoxWidth / 2;
  const cy = viewBoxHeight / 2;
  const outerRadius = options?.outerRadius ?? 42;
  const innerRadius = options?.innerRadius ?? 18;
  const palette = getDonutPalette(options?.accentColor);

  const totalHours = validItems.reduce((sum, item) => sum + item.hours, 0);
  if (totalHours <= 0 || validItems.length === 0) {
    return {
      viewBoxWidth,
      viewBoxHeight,
      cx,
      cy,
      outerRadius,
      innerRadius,
      totalHours: 0,
      segments: [],
    };
  }

  let currentAngle = -Math.PI / 2; // start at 12 o'clock
  const segments: DonutChartSegment[] = validItems.map((item, idx) => {
    const fraction = item.hours / totalHours;
    const sweep = fraction * Math.PI * 2;
    const startAngle = currentAngle;
    const endAngle = currentAngle + sweep;
    const midAngle = startAngle + sweep / 2;
    currentAngle = endAngle;

    const midRingRadius = (outerRadius + innerRadius) / 2 + 4;
    const dotPos = polarToCartesian(cx, cy, midRingRadius, midAngle);
    const elbowPos = polarToCartesian(cx, cy, outerRadius + 13, midAngle);
    const side: 'left' | 'right' = Math.cos(midAngle) >= 0 ? 'right' : 'left';
    const labelEndX = side === 'right' ? elbowPos.x + 14 : elbowPos.x - 14;

    return {
      id: item.id,
      activity: item.activity,
      hours: item.hours,
      fraction,
      percentage: Math.round(fraction * 100),
      color: palette[idx % palette.length],
      pathD: buildRingSlicePath(cx, cy, outerRadius, innerRadius, startAngle, endAngle),
      dotX: dotPos.x,
      dotY: dotPos.y,
      elbowX: elbowPos.x,
      elbowY: elbowPos.y,
      labelEndX,
      labelY: elbowPos.y,
      side,
    };
  });

  // De-overlap vertically per side so adjacent small slices stay legible
  const separateSideLabels = (sideSegments: DonutChartSegment[]) => {
    const sorted = [...sideSegments].sort((a, b) => a.labelY - b.labelY);
    const minGap = 15;
    for (let i = 1; i < sorted.length; i++) {
      if (sorted[i].labelY - sorted[i - 1].labelY < minGap) {
        sorted[i].labelY = sorted[i - 1].labelY + minGap;
        sorted[i].elbowY = sorted[i].labelY;
      }
    }
    // Clamp inside viewBox height
    for (let i = sorted.length - 1; i >= 0; i--) {
      if (sorted[i].labelY > viewBoxHeight - 10) {
        sorted[i].labelY = viewBoxHeight - 10;
        sorted[i].elbowY = sorted[i].labelY;
        if (i > 0 && sorted[i - 1].labelY > sorted[i].labelY - minGap) {
          sorted[i - 1].labelY = sorted[i].labelY - minGap;
          sorted[i - 1].elbowY = sorted[i - 1].labelY;
        }
      }
      if (sorted[i].labelY < 12) {
        sorted[i].labelY = 12;
        sorted[i].elbowY = 12;
      }
    }
  };

  separateSideLabels(segments.filter((s) => s.side === 'left'));
  separateSideLabels(segments.filter((s) => s.side === 'right'));

  return {
    viewBoxWidth,
    viewBoxHeight,
    cx,
    cy,
    outerRadius,
    innerRadius,
    totalHours: Number(totalHours.toFixed(2)),
    segments,
  };
}

/**
 * Maps explicit user-selected language proficiency strings to a 0..5 dot score.
 * Returns null if unconfirmed/empty so proficiency ratings are NEVER auto-assigned.
 */
export function getLanguageDotScore(proficiency?: string): number | null {
  const raw = (proficiency || '').trim().toLowerCase();
  if (
    !raw ||
    raw === 'unconfirmed' ||
    raw === 'not specified' ||
    raw === 'unspecified' ||
    raw === 'none'
  ) {
    return null;
  }

  // Explicit numeric notation (e.g. "3.5", "4", "4.5/5")
  const numericMatch = raw.match(/^([0-5](?:\.[05])?)(?:\s*\/\s*5)?$/);
  if (numericMatch) {
    const val = parseFloat(numericMatch[1]);
    if (val >= 0.5 && val <= 5) return val;
  }

  if (raw.includes('native') || raw.includes('bilingual') || raw === 'mother tongue') {
    return 5;
  }
  if (raw.includes('fluent') || raw.includes('c2')) {
    return 4.5;
  }
  if (
    raw.includes('advanced') ||
    raw.includes('professional working') ||
    raw.includes('upper intermediate') ||
    raw.includes('c1')
  ) {
    return 4;
  }
  if (raw.includes('b2')) {
    return 3.5;
  }
  if (raw.includes('intermediate') || raw.includes('conversational') || raw.includes('b1')) {
    return 3;
  }
  if (raw.includes('elementary') || raw.includes('basic working') || raw.includes('a2')) {
    return 2;
  }
  if (raw.includes('beginner') || raw.includes('basic') || raw.includes('a1')) {
    return 1;
  }

  return null;
}

/**
 * Splits a donut chart activity label cleanly across at most two compact lines.
 */
export function wrapDonutLabelLines(label: string, maxCharsPerLine = 15): string[] {
  const clean = label.trim();
  if (!clean) return [];
  if (clean.length <= maxCharsPerLine) return [clean];
  const words = clean.split(/\s+/);
  if (words.length <= 1) return [clean];
  let bestIdx = 1;
  let bestDiff = Infinity;
  for (let i = 1; i < words.length; i++) {
    const firstLen = words.slice(0, i).join(' ').length;
    const secondLen = words.slice(i).join(' ').length;
    const diff = Math.abs(firstLen - secondLen);
    if (diff < bestDiff) {
      bestDiff = diff;
      bestIdx = i;
    }
  }
  return [words.slice(0, bestIdx).join(' '), words.slice(bestIdx).join(' ')];
}
