"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { cleanLapIds } from "@/lib/stats";
import type { Lap } from "@/lib/supabase/types";
import { formatLapTime } from "@/lib/utils";

interface Series {
  label: string;
  color: string;
  laps: Lap[];
}

const PADDING = { top: 16, right: 16, bottom: 28, left: 64 };
const AXIS_COLOR = "var(--muted)";
const GRID_COLOR = "var(--border)";

export function LapChart({ laps, height = 220 }: { laps: Lap[]; height?: number }) {
  return (
    <MultiLapChart
      series={[{ label: "Tiempos", color: "var(--accent)", laps }]}
      height={height}
    />
  );
}

export function MultiLapChart({ series, height = 240 }: { series: Series[]; height?: number }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(720);
  const [hover, setHover] = useState<{ series: number; point: number } | null>(null);

  useEffect(() => {
    const element = containerRef.current;
    if (!element) return;
    const observer = new ResizeObserver(([entry]) => {
      if (entry.contentRect.width > 0) setWidth(Math.round(entry.contentRect.width));
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  const chart = useMemo(() => {
    const allLaps = series.flatMap((s) => s.laps);
    if (allLaps.length === 0) return null;

    // La escala se ajusta a las vueltas limpias; el resto se dibuja arriba, marcado.
    const cleanTimes = series.flatMap((s) => {
      const clean = cleanLapIds(s.laps);
      return s.laps.filter((l) => clean.has(l.id)).map((l) => l.lap_time_ms);
    });
    const scaleTimes = cleanTimes.length >= 2 ? cleanTimes : allLaps.map((l) => l.lap_time_ms);
    const low = Math.min(...scaleTimes);
    const high = Math.max(...scaleTimes);
    const margin = Math.max(50, (high - low) * 0.12);
    const yMin = low - margin;
    const yMax = high + margin;

    const numbers = allLaps.map((l) => l.lap_number);
    const xMin = Math.min(...numbers);
    const xMax = Math.max(...numbers);
    const innerW = Math.max(40, width - PADDING.left - PADDING.right);
    const innerH = height - PADDING.top - PADDING.bottom;

    const sx = (n: number) =>
      xMax === xMin ? PADDING.left + innerW / 2 : PADDING.left + ((n - xMin) / (xMax - xMin)) * innerW;
    const sy = (ms: number) => PADDING.top + (1 - (ms - yMin) / (yMax - yMin)) * innerH;

    return {
      xMin,
      xMax,
      sx,
      yTicks: generateTicks(yMin, yMax, 4).map((value) => ({ value, y: sy(value) })),
      lines: series.map((s) => ({
        ...s,
        points: s.laps.map((lap) => ({
          lap,
          x: sx(lap.lap_number),
          y: Math.max(PADDING.top, Math.min(height - PADDING.bottom, sy(lap.lap_time_ms))),
          offScale: lap.lap_time_ms > yMax || lap.lap_time_ms < yMin,
        })),
      })),
    };
  }, [series, width, height]);

  if (!chart || series.every((s) => s.laps.length < 2)) {
    return <p className="text-xs text-muted">Se necesitan al menos 2 vueltas para mostrar la gráfica.</p>;
  }

  function onPointer(e: React.PointerEvent<SVGSVGElement>) {
    if (!chart) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const px = e.clientX - rect.left;
    const py = e.clientY - rect.top;
    let best: { series: number; point: number; d: number } | null = null;
    chart.lines.forEach((line, si) =>
      line.points.forEach((p, pi) => {
        const d = Math.abs(p.x - px) * 3 + Math.abs(p.y - py);
        if (!best || d < best.d) best = { series: si, point: pi, d };
      }),
    );
    if (best) setHover({ series: (best as { series: number }).series, point: (best as { point: number }).point });
  }

  const active = hover ? chart.lines[hover.series]?.points[hover.point] : null;
  const tooltipLaps = active
    ? chart.lines.flatMap((line) => {
        const lap = line.laps.find((l) => l.lap_number === active.lap.lap_number);
        return lap ? [{ label: line.label, color: line.color, lap }] : [];
      })
    : [];

  return (
    <div ref={containerRef}>
      <svg
        width={width}
        height={height}
        role="img"
        aria-label="Evolución de tiempos por vuelta"
        className="block touch-pan-y"
        onPointerDown={onPointer}
        onPointerMove={onPointer}
        onPointerLeave={() => setHover(null)}
      >
        {chart.yTicks.map((t, i) => (
          <g key={i}>
            <line x1={PADDING.left} x2={width - PADDING.right} y1={t.y} y2={t.y} stroke={GRID_COLOR} strokeWidth={0.6} />
            <text x={PADDING.left - 6} y={t.y + 3} textAnchor="end" fontSize={10} fill={AXIS_COLOR} fontFamily="ui-monospace, monospace">
              {formatLapTime(t.value)}
            </text>
          </g>
        ))}
        {generateLapTicks(chart.xMin, chart.xMax).map((n) => (
          <text key={n} x={chart.sx(n)} y={height - 8} textAnchor="middle" fontSize={10} fill={AXIS_COLOR} fontFamily="ui-monospace, monospace">
            {n}
          </text>
        ))}

        {chart.lines.map((line, si) => (
          <g key={si}>
            <polyline
              fill="none"
              stroke={line.color}
              strokeWidth={1.8}
              strokeLinejoin="round"
              points={line.points.map((p) => `${p.x},${p.y}`).join(" ")}
            />
            {line.points.map((p, pi) => (
              <circle
                key={p.lap.id}
                cx={p.x}
                cy={p.y}
                r={hover?.series === si && hover.point === pi ? 5 : 3}
                fill={p.offScale ? "var(--surface)" : line.color}
                stroke={p.offScale ? line.color : "var(--bg)"}
                strokeWidth={p.offScale ? 1.5 : 1}
              />
            ))}
          </g>
        ))}

        {active ? (
          <line
            pointerEvents="none"
            x1={active.x}
            x2={active.x}
            y1={PADDING.top}
            y2={height - PADDING.bottom}
            stroke={AXIS_COLOR}
            strokeWidth={0.6}
            strokeDasharray="2 3"
          />
        ) : null}
      </svg>

      <div className="mt-2 flex min-h-5 flex-wrap items-center gap-x-4 gap-y-1 text-xs">
        {active ? (
          <>
            <span className="font-semibold text-foreground">Vuelta {active.lap.lap_number}</span>
            {tooltipLaps.map((t) => (
              <span key={t.label} className="flex items-center gap-1.5">
                <span className="inline-block h-2.5 w-2.5 rounded" style={{ background: t.color }} />
                {series.length > 1 ? <span className="text-muted">{t.label}:</span> : null}
                <span className="tabular text-foreground">{formatLapTime(t.lap.lap_time_ms)}</span>
              </span>
            ))}
          </>
        ) : series.length > 1 ? (
          series.map((s) => (
            <span key={s.label} className="flex items-center gap-1.5">
              <span className="inline-block h-2.5 w-2.5 rounded" style={{ background: s.color }} />
              <span className="text-muted">{s.label}</span>
            </span>
          ))
        ) : (
          <span className="text-muted">Los puntos huecos quedan fuera de escala (boxes, banderas).</span>
        )}
      </div>
    </div>
  );
}

function generateTicks(min: number, max: number, count: number): number[] {
  if (max <= min) return [min];
  const step = (max - min) / count;
  return Array.from({ length: count + 1 }, (_, i) => min + i * step);
}

function generateLapTicks(min: number, max: number): number[] {
  const range = max - min;
  if (range <= 0) return [min];
  const step = range <= 10 ? 1 : range <= 25 ? 2 : range <= 50 ? 5 : 10;
  const ticks: number[] = [];
  for (let n = Math.ceil(min / step) * step; n <= max; n += step) ticks.push(n);
  return ticks.length > 0 ? ticks : [Math.round((min + max) / 2)];
}
