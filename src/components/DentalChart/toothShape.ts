import {
  CHART_WIDTH,
  CHART_HEIGHT,
  UPPER_ARCH_TOP,
  LOWER_ARCH_BOTTOM,
  ARCH_AMPLITUDE,
} from './constants';

const TEETH_PER_ARCH = 16;

/**
 * Get Y position on upper arch (parabola opening down / smile).
 * x in [0, CHART_WIDTH], returns y (0 at top).
 */
function upperArchY(x: number): number {
  const t = (2 * x) / CHART_WIDTH - 1; // -1..1
  return UPPER_ARCH_TOP + ARCH_AMPLITUDE * (1 - t * t);
}

/**
 * Get Y position on lower arch (parabola opening up / frown).
 */
function lowerArchY(x: number): number {
  const t = (2 * x) / CHART_WIDTH - 1;
  return CHART_HEIGHT - LOWER_ARCH_BOTTOM - ARCH_AMPLITUDE * (1 - t * t);
}

/**
 * Get position (x, y) and normal for a tooth on the upper arch.
 * Index 0 = first tooth (18), index 15 = last (28).
 */
export function getUpperToothPosition(index: number): { x: number; y: number; normalY: number } {
  const x = ((index + 0.5) / TEETH_PER_ARCH) * CHART_WIDTH;
  const y = upperArchY(x);
  const dx = 0.01;
  const dy = upperArchY(x + dx) - y;
  const normalY = -dy; // point upward from arch (negative in SVG = up)
  return { x, y, normalY };
}

/**
 * Get position and normal for a tooth on the lower arch.
 * Index 0 = 48, index 15 = 38.
 */
export function getLowerToothPosition(index: number): { x: number; y: number; normalY: number } {
  const x = ((index + 0.5) / TEETH_PER_ARCH) * CHART_WIDTH;
  const y = lowerArchY(x);
  const dx = 0.01;
  const dy = lowerArchY(x + dx) - y;
  const normalY = dy; // point downward from arch
  return { x, y, normalY };
}

/** Tooth crown size (width and height in SVG units). */
const TOOTH_W = 18;
const TOOTH_H = 10;

/**
 * Build SVG path for a single tooth (trapezoid crown shape).
 * Narrow end toward the arch (occlusal), wide end outward. normalY < 0 = upper arch.
 */
export function getToothCrownPath(
  cx: number,
  cy: number,
  normalY: number
): string {
  const narrowTowardArch = normalY < 0; // upper: narrow at top (toward arch)
  const halfW = TOOTH_W / 2;
  const halfH = TOOTH_H / 2;
  const topW = halfW * 0.65;
  const bottomW = halfW;

  const y1 = narrowTowardArch ? cy - halfH : cy + halfH;
  const y2 = narrowTowardArch ? cy + halfH : cy - halfH;
  const x1 = cx - topW;
  const x2 = cx + topW;
  const x3 = cx + bottomW;
  const x4 = cx - bottomW;
  return `M ${x1} ${y1} L ${x2} ${y1} L ${x3} ${y2} L ${x4} ${y2} Z`;
}

/**
 * Upper arch path (parabola) for stroke/fill background.
 */
export function getUpperArchPath(): string {
  const step = CHART_WIDTH / 64;
  let path = `M 0 ${upperArchY(0)}`;
  for (let x = step; x <= CHART_WIDTH; x += step) {
    path += ` L ${x} ${upperArchY(x)}`;
  }
  return path;
}

/**
 * Lower arch path (parabola).
 */
export function getLowerArchPath(): string {
  const step = CHART_WIDTH / 64;
  let path = `M 0 ${lowerArchY(0)}`;
  for (let x = step; x <= CHART_WIDTH; x += step) {
    path += ` L ${x} ${lowerArchY(x)}`;
  }
  return path;
}
