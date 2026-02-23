import { useMemo } from 'react';
import type { PatientTreatment } from '@/types';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { UPPER_TEETH, LOWER_TEETH, CHART_WIDTH, CHART_HEIGHT } from './constants';
import type { ChartStatusFilter } from './constants';
import {
  getUpperToothPosition,
  getLowerToothPosition,
  getToothCrownPath,
  getUpperArchPath,
  getLowerArchPath,
} from './toothShape';

export interface DentalChart2DProps {
  treatments: PatientTreatment[];
  statusFilter: ChartStatusFilter;
  getToothColor: (toothNumber: number) => string;
  onToothClick?: (toothNumber: number) => void;
  highlightTooth?: number | null;
  /** Jaw-only treatments (no toothNumber). Shown as legend. */
  jawOnlyTreatments?: PatientTreatment[];
}

/**
 * 2D anatomical dental chart: upper and lower arches with tooth-shaped elements.
 * FDI numbers 11–18, 21–28 (upper), 31–38, 41–48 (lower). RTL-friendly.
 */
export default function DentalChart2D({
  treatments,
  statusFilter,
  getToothColor,
  onToothClick,
  highlightTooth = null,
  jawOnlyTreatments = [],
}: DentalChart2DProps) {
  const getToothTreatments = (toothNum: number) =>
    treatments.filter((t) => t.toothNumber === toothNum && t.status === statusFilter);

  const jawCounts = useMemo(() => {
    const list = jawOnlyTreatments.filter((t) => t.status === statusFilter);
    return {
      upper: list.filter((t) => t.jaw === 'upper').length,
      lower: list.filter((t) => t.jaw === 'lower').length,
      both: list.filter((t) => t.jaw === 'both').length,
    };
  }, [jawOnlyTreatments, statusFilter]);

  const hasJawOnly = jawCounts.upper + jawCounts.lower + jawCounts.both > 0;

  return (
    <div className="space-y-3" dir="rtl">
      {/* Jaw-only legend (Option A) */}
      {hasJawOnly && (
        <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
          <span className="font-medium">الفك (بدون سن محدد):</span>
          {jawCounts.upper > 0 && <span>علوي: {jawCounts.upper}</span>}
          {jawCounts.lower > 0 && <span>سفلي: {jawCounts.lower}</span>}
          {jawCounts.both > 0 && <span>فكين: {jawCounts.both}</span>}
        </div>
      )}

      <div className="bg-card rounded-xl border border-border p-4 overflow-x-auto">
        <p className="text-center text-sm text-muted-foreground mb-1">الفك العلوي</p>
        <TooltipProvider delayDuration={200}>
          <svg
            viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`}
            className="w-full max-w-2xl mx-auto block"
            style={{ minHeight: 200 }}
            aria-label="مخطط الأسنان"
          >
            {/* Upper arch stroke (light guide) */}
            <path
              d={getUpperArchPath()}
              fill="none"
              stroke="currentColor"
              strokeWidth="0.5"
              className="text-muted-foreground/30"
            />
            {/* Upper teeth */}
            {UPPER_TEETH.map((fdi, index) => {
              const { x, y, normalY } = getUpperToothPosition(index);
              const count = getToothTreatments(fdi).length;
              const colorClass = getToothColor(fdi);
              const isHighlight = highlightTooth === fdi;
              return (
                <Tooltip key={`upper-${fdi}`} delayDuration={200}>
                  <TooltipTrigger asChild>
                    <g
                      role="button"
                      tabIndex={0}
                      className={`cursor-pointer outline-none ${onToothClick ? 'hover:opacity-90' : ''}`}
                      onClick={() => onToothClick?.(fdi)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') onToothClick?.(fdi);
                      }}
                    >
                      <path
                        d={getToothCrownPath(x, y, normalY)}
                        className={colorClass}
                        strokeWidth={isHighlight ? 2.5 : 1.5}
                      />
                      <text
                        x={x}
                        y={y + 1}
                        textAnchor="middle"
                        className="text-[10px] font-bold fill-foreground pointer-events-none"
                      >
                        {fdi}
                      </text>
                      {count > 0 && (
                        <text
                          x={x}
                          y={y + 6}
                          textAnchor="middle"
                          className="text-[8px] fill-muted-foreground pointer-events-none"
                        >
                          {count}
                        </text>
                      )}
                    </g>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="text-right">
                    {count > 0 ? (
                      <ul className="list-none text-xs space-y-0.5">
                        {getToothTreatments(fdi).map((t) => (
                          <li key={t.id}>{t.treatmentName}</li>
                        ))}
                      </ul>
                    ) : (
                      <span>السن {fdi} — لا علاجات</span>
                    )}
                  </TooltipContent>
                </Tooltip>
              );
            })}

            {/* Lower arch stroke */}
            <path
              d={getLowerArchPath()}
              fill="none"
              stroke="currentColor"
              strokeWidth="0.5"
              className="text-muted-foreground/30"
            />
            {/* Lower teeth */}
            {LOWER_TEETH.map((fdi, index) => {
              const { x, y, normalY } = getLowerToothPosition(index);
              const count = getToothTreatments(fdi).length;
              const colorClass = getToothColor(fdi);
              const isHighlight = highlightTooth === fdi;
              return (
                <Tooltip key={`lower-${fdi}`} delayDuration={200}>
                  <TooltipTrigger asChild>
                    <g
                      role="button"
                      tabIndex={0}
                      className={`cursor-pointer outline-none ${onToothClick ? 'hover:opacity-90' : ''}`}
                      onClick={() => onToothClick?.(fdi)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') onToothClick?.(fdi);
                      }}
                    >
                      <path
                        d={getToothCrownPath(x, y, normalY)}
                        className={colorClass}
                        strokeWidth={isHighlight ? 2.5 : 1.5}
                      />
                      <text
                        x={x}
                        y={y + 1}
                        textAnchor="middle"
                        className="text-[10px] font-bold fill-foreground pointer-events-none"
                      >
                        {fdi}
                      </text>
                      {count > 0 && (
                        <text
                          x={x}
                          y={y + 6}
                          textAnchor="middle"
                          className="text-[8px] fill-muted-foreground pointer-events-none"
                        >
                          {count}
                        </text>
                      )}
                    </g>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="text-right">
                    {count > 0 ? (
                      <ul className="list-none text-xs space-y-0.5">
                        {getToothTreatments(fdi).map((t) => (
                          <li key={t.id}>{t.treatmentName}</li>
                        ))}
                      </ul>
                    ) : (
                      <span>السن {fdi} — لا علاجات</span>
                    )}
                  </TooltipContent>
                </Tooltip>
              );
            })}
          </svg>
        </TooltipProvider>
        <p className="text-center text-sm text-muted-foreground mt-1">الفك السفلي</p>
      </div>
    </div>
  );
}
