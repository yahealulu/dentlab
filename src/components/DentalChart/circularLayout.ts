/**
 * Circular/oval dental chart layout.
 * Teeth are placed along an ellipse in FDI order: upper right → upper left → lower left → lower right.
 */

export interface CircularToothPosition {
  fdi: number;
  x: number;
  y: number;
}

export interface ConnectorSegment {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

export interface CircularLayoutOptions {
  width: number;
  height: number;
  padding: number;
}

/** Permanent teeth in continuous path order (32). */
export const PERMANENT_ORDER: number[] = [
  18, 17, 16, 15, 14, 13, 12, 11,
  21, 22, 23, 24, 25, 26, 27, 28,
  38, 37, 36, 35, 34, 33, 32, 31,
  48, 47, 46, 45, 44, 43, 42, 41,
];

/** Deciduous teeth in continuous path order (20). */
export const DECIDUOUS_ORDER: number[] = [
  55, 54, 53, 52, 51,
  61, 62, 63, 64, 65,
  75, 74, 73, 72, 71,
  81, 82, 83, 84, 85,
];

/** Ellipse radius ratios — larger values spread teeth further apart along the oval */
const RADIUS_X_RATIO = 0.52;
const RADIUS_Y_RATIO = 0.44;

/**
 * Returns positions for teeth along an ellipse (egg standing: narrow at top).
 * Tooth 48 is at index 24; we place it at the top (angle π/2).
 * Order: 48 at top, then clockwise: 47..41, 18..11, 21..28, 38..31 (back to 48).
 */
export function getCircularToothPositions(
  teethArray: number[],
  options: CircularLayoutOptions
): CircularToothPosition[] {
  const { width, height, padding } = options;
  const cx = width / 2;
  const cy = height / 2;
  const rx = Math.max(0, (width - 2 * padding) * RADIUS_X_RATIO);
  const ry = Math.max(0, (height - 2 * padding) * RADIUS_Y_RATIO);
  const n = teethArray.length;
  const positions: CircularToothPosition[] = [];

  const indexOf48 = teethArray.indexOf(48);
  const topIndex = indexOf48 >= 0 ? indexOf48 : 0;

  for (let i = 0; i < n; i++) {
    const angle = Math.PI / 2 - ((i - topIndex) * (2 * Math.PI / n));
    const x = cx + rx * Math.cos(angle);
    const y = cy - ry * Math.sin(angle);
    positions.push({ fdi: teethArray[i], x, y });
  }

  return positions;
}

/**
 * Returns line segments connecting consecutive teeth (and close the loop).
 */
export function getConnectorSegments(
  positions: CircularToothPosition[]
): ConnectorSegment[] {
  const segments: ConnectorSegment[] = [];
  for (let i = 0; i < positions.length; i++) {
    const a = positions[i];
    const b = positions[(i + 1) % positions.length];
    segments.push({ x1: a.x, y1: a.y, x2: b.x, y2: b.y });
  }
  return segments;
}
