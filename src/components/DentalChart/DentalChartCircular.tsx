import { useState, useMemo, useRef, useCallback } from 'react';
import type { PatientTreatment } from '@/types';
import { createPortal } from 'react-dom';
import { cn } from '@/lib/utils';
import type { ChartStatusFilter } from './constants';
import { getToothNameAr } from './toothNames';
import {
  PERMANENT_ORDER,
  DECIDUOUS_ORDER,
  getCircularToothPositions,
} from './circularLayout';

/** Oval chart: after 90° CCW rotation the oval is tall (head at top), so viewBox is taller than wide */
const OVAL_VIEWBOX_WIDTH = 280;
const OVAL_VIEWBOX_HEIGHT = 440;
const OVAL_PADDING = 44;
const TOOTH_RADIUS = 11;

export interface DentalChartCircularProps {
  treatments: PatientTreatment[];
  statusFilter: ChartStatusFilter;
  getToothColor: (toothNumber: number) => string;
  onToothClick?: (toothNumber: number) => void;
  highlightTooth?: number | null;
  jawOnlyTreatments?: PatientTreatment[];
}

/**
 * Circular/oval dental chart: teeth as circles along an ellipse,
 * permanent/deciduous toggle, hover tooltip with Arabic anatomical name.
 */
export default function DentalChartCircular({
  treatments,
  statusFilter,
  getToothColor,
  onToothClick,
  highlightTooth = null,
  jawOnlyTreatments = [],
}: DentalChartCircularProps) {
  const [chartMode, setChartMode] = useState<'permanent' | 'deciduous'>('permanent');
  const [hoveredTooth, setHoveredTooth] = useState<number | null>(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });
  const svgRef = useRef<SVGSVGElement>(null);

  const teethOrder = chartMode === 'permanent' ? PERMANENT_ORDER : DECIDUOUS_ORDER;
  const positions = useMemo(
    () =>
      getCircularToothPositions(teethOrder, {
        width: OVAL_VIEWBOX_WIDTH,
        height: OVAL_VIEWBOX_HEIGHT,
        padding: OVAL_PADDING,
      }),
    [teethOrder]
  );

  const handleToothMouseEnter = useCallback(
    (fdi: number, svgX: number, svgY: number, e: React.MouseEvent) => {
      setHoveredTooth(fdi);
      if (svgRef.current) {
        const ctm = svgRef.current.getScreenCTM();
        if (ctm) {
          const pt = svgRef.current.createSVGPoint();
          pt.x = svgX;
          pt.y = svgY;
          const { x, y } = pt.matrixTransform(ctm);
          setTooltipPos({ x, y });
          return;
        }
      }
      setTooltipPos({ x: e.clientX, y: e.clientY });
    },
    []
  );

  const handleToothMouseLeave = useCallback(() => {
    setHoveredTooth(null);
  }, []);

  return (
    <div className="space-y-3" dir="rtl">
      {/* Permanent / Deciduous toggle */}
      <div className="flex flex-row-reverse justify-center gap-1">
        <button
          type="button"
          onClick={() => setChartMode('permanent')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            chartMode === 'permanent'
              ? 'bg-teal-700 text-white'
              : 'bg-muted text-muted-foreground hover:bg-muted/80'
          }`}
        >
          الأسنان الدائمة
        </button>
        <button
          type="button"
          onClick={() => setChartMode('deciduous')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            chartMode === 'deciduous'
              ? 'bg-teal-700 text-white'
              : 'bg-muted text-muted-foreground hover:bg-muted/80'
          }`}
        >
          الأسنان اللبنية
        </button>
      </div>

      <div className="bg-card rounded-xl border border-border p-4 overflow-x-auto relative">
        <svg
          ref={svgRef}
          viewBox={`0 0 ${OVAL_VIEWBOX_WIDTH} ${OVAL_VIEWBOX_HEIGHT}`}
          className="w-full max-w-2xl mx-auto block"
          style={{ aspectRatio: `${OVAL_VIEWBOX_WIDTH} / ${OVAL_VIEWBOX_HEIGHT}` }}
          aria-label="مخطط الأسنان"
        >
          {/* Teeth — numbers stay upright (no rotation); no connector lines per design */}
          {positions.map(({ fdi, x, y }) => {
            const colorClass = getToothColor(fdi);
            const isHighlight = highlightTooth === fdi;
            const nameAr = getToothNameAr(fdi);

            return (
              <g
                key={fdi}
                role="button"
                tabIndex={0}
                className={cn(
                  'cursor-pointer outline-none',
                  onToothClick && 'hover:opacity-90'
                )}
                onClick={() => onToothClick?.(fdi)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ')
                    onToothClick?.(fdi);
                }}
                onMouseEnter={(e) => handleToothMouseEnter(fdi, x, y, e)}
                onMouseLeave={handleToothMouseLeave}
                aria-label={nameAr}
              >
                <circle
                  cx={x}
                  cy={y}
                  r={TOOTH_RADIUS}
                  className={cn(
                    'fill-white stroke-slate-200',
                    colorClass
                  )}
                  strokeWidth={isHighlight ? 2.5 : 1}
                />
                <text
                  x={x}
                  y={y}
                  textAnchor="middle"
                  dominantBaseline="central"
                  className="text-sm font-semibold fill-slate-700 pointer-events-none"
                  style={{ transform: 'none' }}
                >
                  {fdi}
                </text>
              </g>
            );
          })}
        </svg>

        {/* Custom tooltip: positioned above hovered tooth so it always shows */}
        {hoveredTooth != null &&
          createPortal(
            <div
              className="fixed z-[100] pointer-events-none -translate-x-1/2 -translate-y-full animate-in fade-in-0 zoom-in-95 duration-150"
              style={{
                left: tooltipPos.x,
                top: tooltipPos.y - 10,
              }}
            >
              <div
                dir="rtl"
                className="bg-slate-900 text-white border-0 rounded-xl px-4 py-2.5 text-sm font-medium shadow-lg ring-1 ring-white/10 text-right max-w-[220px] whitespace-nowrap"
              >
                {getToothNameAr(hoveredTooth)}
              </div>
            </div>,
            document.body
          )}
      </div>

      {jawOnlyTreatments.filter((t) => t.status === statusFilter).length > 0 && (
        <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
          <span className="font-medium">الفك (بدون سن محدد):</span>
          <span>
            علوي:{' '}
            {jawOnlyTreatments.filter(
              (t) => t.jaw === 'upper' && t.status === statusFilter
            ).length}
          </span>
          <span>
            سفلي:{' '}
            {jawOnlyTreatments.filter(
              (t) => t.jaw === 'lower' && t.status === statusFilter
            ).length}
          </span>
          <span>
            فكين:{' '}
            {jawOnlyTreatments.filter(
              (t) => t.jaw === 'both' && t.status === statusFilter
            ).length}
          </span>
        </div>
      )}
    </div>
  );
}
