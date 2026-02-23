/**
 * FDI tooth numbers and chart layout constants.
 * Upper: 18→11, 21→28 (patient right to left).
 * Lower: 48→41, 31→38 (patient right to left).
 */
export const UPPER_TEETH = [18, 17, 16, 15, 14, 13, 12, 11, 21, 22, 23, 24, 25, 26, 27, 28] as const;
export const LOWER_TEETH = [48, 47, 46, 45, 44, 43, 42, 41, 31, 32, 33, 34, 35, 36, 37, 38] as const;

export const ALL_TEETH = [...UPPER_TEETH, ...LOWER_TEETH] as const;

/** Chart SVG dimensions (viewBox and layout). */
export const CHART_WIDTH = 420;
export const CHART_HEIGHT = 200;
/** Vertical space for upper arch (from top). */
export const UPPER_ARCH_TOP = 12;
/** Vertical space for lower arch (from bottom). */
export const LOWER_ARCH_BOTTOM = 12;
/** Parabola amplitude (arch curve depth). */
export const ARCH_AMPLITUDE = 28;

/** Status filter type for chart. */
export type ChartStatusFilter = 'planned' | 'in_progress' | 'completed';

/** Tailwind-compatible class names for tooth fill by status (from parent). */
export const DEFAULT_STATUS_CLASSES: Record<ChartStatusFilter | 'none', string> = {
  planned: 'fill-primary/30 stroke-primary',
  in_progress: 'fill-amber-500/40 stroke-amber-600',
  completed: 'fill-emerald-500/40 stroke-emerald-600',
  none: 'fill-muted stroke-border',
};
