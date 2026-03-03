import { useState, useRef, useCallback, useMemo } from 'react';
import type { PatientTreatment } from '@/types';
import { createPortal } from 'react-dom';
import { cn } from '@/lib/utils';
import type { ChartStatusFilter } from './constants';
import { getToothNameAr } from './toothNames';
import { permanentTeethData, primaryTeethData } from './toothPathsData';
import styles from './DentalChart.module.css';

const CHART_VIEWBOX_WIDTH = 400;
const CHART_VIEWBOX_HEIGHT = 600;

export interface DentalChartCircularProps {
  treatments: PatientTreatment[];
  statusFilter: ChartStatusFilter;
  getToothColor: (toothNumber: number) => string;
  onToothClick?: (toothNumber: number) => void;
  highlightTooth?: number | null;
  jawOnlyTreatments?: PatientTreatment[];
}

/**
 * Dental chart with detailed SVG tooth shapes (mouth view).
 * Uses treatment-based coloring, permanent/deciduous toggle, hover tooltip, and jaw-only legend.
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

  const allTeeth = useMemo(
    () => (chartMode === 'deciduous' ? [...permanentTeethData, ...primaryTeethData] : permanentTeethData),
    [chartMode]
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
        <div className={cn(styles.chartContainer, 'max-w-full')}>
          <svg
            ref={svgRef}
            width={CHART_VIEWBOX_WIDTH}
            height={CHART_VIEWBOX_HEIGHT}
            viewBox={`0 0 ${CHART_VIEWBOX_WIDTH} ${CHART_VIEWBOX_HEIGHT}`}
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className={cn(styles.dentalChart, 'w-full max-w-[400px] mx-auto block')}
            style={{ aspectRatio: `${CHART_VIEWBOX_WIDTH} / ${CHART_VIEWBOX_HEIGHT}` }}
            aria-label="مخطط الأسنان"
          >
            <defs>
              <linearGradient
                id="paint0_linear_2930_16212"
                x1="169.2"
                y1="140"
                x2="168.7"
                y2="390"
                gradientUnits="userSpaceOnUse"
              >
                <stop offset="0" stopOpacity="0" />
                <stop offset="0.515" stopColor="#222222" />
                <stop offset="1" stopOpacity="0" />
              </linearGradient>
              <linearGradient
                id="paint1_linear_2930_16212"
                x1="269.335"
                y1="263.5"
                x2="66.6323"
                y2="263.171"
                gradientUnits="userSpaceOnUse"
              >
                <stop offset="0" stopOpacity="0" />
                <stop offset="0.515" stopColor="#222222" />
                <stop offset="1" stopOpacity="0" />
              </linearGradient>
              <filter id="glow">
                <feGaussianBlur stdDeviation="2.5" result="coloredBlur" />
                <feMerge>
                  <feMergeNode in="coloredBlur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>

            {/* Chart dividers */}
            <path
              d="M168 140 L168 390"
              stroke="url(#paint0_linear_2930_16212)"
              strokeWidth="1"
            />
            <path
              d="M68 263 L332 263"
              stroke="url(#paint1_linear_2930_16212)"
              strokeWidth="1"
            />

            {/* Teeth */}
            {allTeeth.map((tooth) => {
              const fdi = parseInt(tooth.number, 10);
              const isHighlight = highlightTooth === fdi;
              const isPrimary = tooth.isPrimary === true;
              const colorClass = getToothColor(fdi);

              return (
                <g
                  key={tooth.number}
                  id={`tooth-${tooth.number}`}
                  data-tooth={tooth.number}
                  role="button"
                  tabIndex={0}
                  className={cn(
                    styles.toothGroup,
                    isPrimary && styles.primaryTooth,
                    isHighlight && styles.highlighted
                  )}
                  onClick={() => onToothClick?.(fdi)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') onToothClick?.(fdi);
                  }}
                  onMouseEnter={(e) => handleToothMouseEnter(fdi, tooth.textX, tooth.textY, e)}
                  onMouseLeave={handleToothMouseLeave}
                  aria-label={getToothNameAr(fdi)}
                >
                  {tooth.paths.map((path, index) => {
                    const isMainShape = !path.isDetail && !path.isOutline;
                    const pathStrokeWidth =
                      path.strokeWidth != null
                        ? path.strokeWidth
                        : isHighlight && isMainShape
                          ? 2.5
                          : 1.5;
                    /* Main shape: fill/stroke from getToothColor (className). Outline/detail: use path data. */
                    const fill = isMainShape ? undefined : path.fill;
                    const stroke = isMainShape ? undefined : path.stroke;

                    return (
                      <path
                        key={`${tooth.number}-${index}`}
                        d={path.d}
                        fill={fill}
                        fillOpacity={1}
                        stroke={stroke}
                        strokeWidth={pathStrokeWidth}
                        opacity={1}
                        className={cn(
                          styles.toothPath,
                          isMainShape && colorClass
                        )}
                      />
                    );
                  })}
                  <text
                    x={tooth.textX}
                    y={tooth.textY}
                    fill={isPrimary ? '#9ca3af' : '#64748b'}
                    fontSize={isPrimary ? 10 : 12}
                    fontWeight={isHighlight ? 600 : 'normal'}
                    fontFamily="Cairo, Arial, sans-serif"
                    textAnchor="middle"
                    dominantBaseline="middle"
                    className={styles.toothText}
                  >
                    {tooth.number}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>

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
