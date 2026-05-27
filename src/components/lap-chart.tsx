"use client";

import { useMemo, useState } from "react";
import { formatLapTime } from "@/lib/utils";
import type { Database } from "@/lib/supabase/types";

type Lap = Database["public"]["Tables"]["laps"]["Row"];

interface Series {
  label: string;
  color: string;
  laps: Lap[];
}

export function LapChart({
  laps,
  height = 220,
  className,
}: {
  laps: Lap[];
  height?: number;
  className?: string;
}) {
  return (
    <MultiLapChart
      series={[{ label: "Tiempos", color: "#DC2626", laps }]}
      height={height}
      className={className}
    />
  );
}

export function MultiLapChart({
  series,
  height = 240,
  className,
}: {
  series: Series[];
  height?: number;
  className?: string;
}) {
  const [hover, setHover] = useState<{
    seriesIdx: number;
    lapIdx: number;
    x: number;
    y: number;
  } | null>(null);

  const { width, padding, scaledSeries, yTicks, xMin, xMax, yMin, yMax } =
    useMemo(() => {
      const w = 720;
      const h = height;
      const pad = { top: 16, right: 16, bottom: 28, left: 56 };
      const allTimes = series.flatMap((s) => s.laps.map((l) => l.lap_time_ms));
      const allNums = series.flatMap((s) => s.laps.map((l) => l.lap_number));
      const yMin0 = Math.min(...allTimes);
      const yMax0 = Math.max(...allTimes);
      const yRange = Math.max(1, yMax0 - yMin0);
      const yPadAmount = yRange * 0.1;
      const yMin = yMin0 - yPadAmount;
      const yMax = yMax0 + yPadAmount;
      const xMin = Math.min(...allNums);
      const xMax = Math.max(...allNums);
      const innerW = w - pad.left - pad.right;
      const innerH = h - pad.top - pad.bottom;

      function sx(n: number) {
        if (xMax === xMin) return pad.left + innerW / 2;
        return pad.left + ((n - xMin) / (xMax - xMin)) * innerW;
      }
      function sy(ms: number) {
        return pad.top + (1 - (ms - yMin) / (yMax - yMin)) * innerH;
      }

      const scaled = series.map((s) => ({
        ...s,
        points: s.laps.map((l) => ({
          x: sx(l.lap_number),
          y: sy(l.lap_time_ms),
          lap: l,
        })),
      }));

      const yTicks = generateTicks(yMin, yMax, 4);

      return {
        width: w,
        padding: pad,
        scaledSeries: scaled,
        yTicks: yTicks.map((t) => ({ value: t, y: sy(t) })),
        xMin,
        xMax,
        yMin,
        yMax,
      };
    }, [series, height]);

  if (series.every((s) => s.laps.length < 2)) {
    return (
      <p className="text-xs text-muted">
        Necesitan al menos 2 vueltas para mostrar la grafica.
      </p>
    );
  }

  return (
    <div className={className}>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="w-full"
        preserveAspectRatio="none"
        style={{ maxHeight: height }}
        onMouseLeave={() => setHover(null)}
      >
        {/* Grid */}
        {yTicks.map((t, i) => (
          <g key={i}>
            <line
              x1={padding.left}
              x2={width - padding.right}
              y1={t.y}
              y2={t.y}
              stroke="#262626"
              strokeWidth={0.6}
            />
            <text
              x={padding.left - 6}
              y={t.y + 3}
              textAnchor="end"
              fontSize={10}
              fill="#71717A"
              fontFamily="ui-monospace, monospace"
            >
              {formatLapTime(t.value)}
            </text>
          </g>
        ))}
        {/* X axis numbers */}
        {generateLapTicks(xMin, xMax).map((n, i) => {
          const x =
            xMax === xMin
              ? padding.left + (width - padding.left - padding.right) / 2
              : padding.left +
                ((n - xMin) / (xMax - xMin)) *
                  (width - padding.left - padding.right);
          return (
            <text
              key={i}
              x={x}
              y={height - 8}
              textAnchor="middle"
              fontSize={10}
              fill="#71717A"
              fontFamily="ui-monospace, monospace"
            >
              {n}
            </text>
          );
        })}

        {/* Series */}
        {scaledSeries.map((s, si) => (
          <g key={si}>
            <polyline
              fill="none"
              stroke={s.color}
              strokeWidth={1.8}
              strokeLinejoin="round"
              points={s.points.map((p) => `${p.x},${p.y}`).join(" ")}
            />
            {s.points.map((p, pi) => (
              <circle
                key={pi}
                cx={p.x}
                cy={p.y}
                r={hover?.seriesIdx === si && hover?.lapIdx === pi ? 5 : 3}
                fill={s.color}
                stroke="#0a0a0a"
                strokeWidth={1}
                onMouseEnter={() =>
                  setHover({ seriesIdx: si, lapIdx: pi, x: p.x, y: p.y })
                }
                style={{ cursor: "pointer" }}
              />
            ))}
          </g>
        ))}

        {/* Tooltip */}
        {hover ? (
          <g pointerEvents="none">
            <line
              x1={hover.x}
              x2={hover.x}
              y1={padding.top}
              y2={height - padding.bottom}
              stroke="#404040"
              strokeWidth={0.6}
              strokeDasharray="2 3"
            />
            <g
              transform={`translate(${Math.min(width - 140, Math.max(0, hover.x + 8))}, ${Math.max(8, hover.y - 36)})`}
            >
              <rect
                width={132}
                height={
                  scaledSeries.filter((s) => s.laps[hover.lapIdx]).length * 14 +
                  20
                }
                rx={4}
                fill="#0f0f0f"
                stroke="#262626"
              />
              <text
                x={8}
                y={14}
                fontSize={10}
                fontWeight={600}
                fill="#f5f5f5"
              >
                Vuelta{" "}
                {scaledSeries[hover.seriesIdx].laps[hover.lapIdx]?.lap_number}
              </text>
              {scaledSeries.map((s, si) => {
                const lap = s.laps[hover.lapIdx];
                if (!lap) return null;
                return (
                  <g key={si} transform={`translate(8, ${28 + si * 14})`}>
                    <rect width={8} height={8} y={-7} fill={s.color} rx={1} />
                    <text
                      x={14}
                      fontSize={10}
                      fill="#d4d4d8"
                      fontFamily="ui-monospace, monospace"
                    >
                      {s.label}: {formatLapTime(lap.lap_time_ms)}
                    </text>
                  </g>
                );
              })}
            </g>
          </g>
        ) : null}
      </svg>

      {series.length > 1 ? (
        <div className="mt-2 flex flex-wrap items-center gap-3 text-xs">
          {series.map((s, i) => (
            <span key={i} className="flex items-center gap-1.5">
              <span
                className="inline-block h-2.5 w-2.5 rounded"
                style={{ background: s.color }}
              />
              <span className="text-muted">{s.label}</span>
            </span>
          ))}
        </div>
      ) : null}
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
  const step =
    range <= 10 ? 1 : range <= 25 ? 2 : range <= 50 ? 5 : 10;
  const ticks: number[] = [];
  for (let n = Math.ceil(min / step) * step; n <= max; n += step) {
    ticks.push(n);
  }
  if (ticks.length === 0) ticks.push(Math.round((min + max) / 2));
  return ticks;
}
