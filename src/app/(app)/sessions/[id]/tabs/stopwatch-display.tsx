"use client";

import { useEffect, useRef } from "react";
import type { ClockStyle } from "@/lib/clock-style";
import { lapElapsed, sectorElapsed, totalElapsed, type StopwatchState } from "@/lib/stopwatch";
import { cn, formatLapTime } from "@/lib/utils";

type DisplayProps = {
  state: StopwatchState;
  useSectors: boolean;
  style?: ClockStyle;
  /** Mejor vuelta de la sesión: el volante compara la vuelta en curso con ella. */
  bestMs?: number | null;
  /** Última vuelta registrada y su diferencia con la mejor. */
  lastLapMs?: number | null;
  /** Número de la vuelta en curso. */
  lapNumber?: number;
};

const ZERO = "00:00.000";
const LEDS = 12;

/** "+0.556" / "−1.204" para deltas en milisegundos. */
function formatDelta(ms: number): string {
  const sign = ms > 0 ? "+" : ms < 0 ? "−" : "±";
  return `${sign}${(Math.abs(ms) / 1000).toFixed(3)}`;
}

/**
 * Pinta los tiempos directamente en el DOM en cada fotograma, sin pasar por
 * React, para que marcar vueltas no sufra con listas largas. Cada estilo solo
 * coloca elementos marcados con data-t (texto), data-hand (agujas), data-bar
 * (barra de progreso) y data-led (luces); el bucle es el mismo para todos.
 */
export function StopwatchDisplay({
  state,
  useSectors,
  style = "classic",
  bestMs = null,
  lastLapMs = null,
  lapNumber = 1,
}: DisplayProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const running = state.runningSince !== null;

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const all = <T extends Element>(sel: string) => Array.from(root.querySelectorAll<T>(sel));
    const texts = {
      main: all<HTMLElement>('[data-t="main"]'),
      lap: all<HTMLElement>('[data-t="lap"]'),
      total: all<HTMLElement>('[data-t="total"]'),
    };
    const hands = all<SVGElement>("[data-hand]");
    const bars = all<HTMLElement>("[data-bar]");
    const leds = all<HTMLElement>("[data-led]");

    let frame = 0;
    const paint = () => {
      const now = Date.now();
      const lap = lapElapsed(state, now);
      const main = useSectors ? sectorElapsed(state, now) : lap;
      const total = totalElapsed(state, now);
      const values = { main: formatLapTime(main), lap: formatLapTime(lap), total: formatLapTime(total) };
      for (const key of ["main", "lap", "total"] as const) {
        for (const el of texts[key]) {
          if (el.textContent !== values[key]) el.textContent = values[key];
        }
      }
      // Agujas del cronógrafo (grados).
      for (const h of hands) {
        const kind = h.dataset.hand;
        const deg =
          kind === "sec"
            ? ((main % 60000) / 60000) * 360
            : kind === "min"
              ? ((main % 1800000) / 1800000) * 360
              : ((total % 3600000) / 3600000) * 360;
        h.setAttribute("transform", `rotate(${deg.toFixed(2)} ${h.dataset.cx} ${h.dataset.cy})`);
      }
      // Vuelta en curso frente a la mejor: barra y luces del volante.
      const progress = bestMs ? lap / bestMs : 0;
      for (const b of bars) {
        b.style.width = `${Math.min(1, progress) * 100}%`;
        b.dataset.over = progress > 1 ? "1" : "0";
      }
      const lit = bestMs ? Math.min(LEDS, Math.floor(progress * LEDS)) : 0;
      const over = progress > 1;
      for (const led of leds) {
        const i = Number(led.dataset.led);
        led.dataset.on = over ? (Math.floor(now / 150) % 2 ? "1" : "0") : i < lit ? "1" : "0";
      }
      if (state.runningSince !== null) frame = requestAnimationFrame(paint);
    };
    paint();
    return () => cancelAnimationFrame(frame);
  }, [state, useSectors, style, bestMs]);

  const title = useSectors ? "Sector en curso" : "Vuelta en curso";
  const lastDelta = lastLapMs !== null && bestMs ? lastLapMs - bestMs : null;

  return (
    <div ref={rootRef} className="w-full" aria-live="off">
      {style === "dash" ? (
        <DashClock running={running} title={title} bestMs={bestMs} lastLapMs={lastLapMs} lastDelta={lastDelta} lapNumber={lapNumber} />
      ) : style === "pitboard" ? (
        <PitBoard running={running} lastLapMs={lastLapMs} lastDelta={lastDelta} lapNumber={lapNumber} />
      ) : style === "led" ? (
        <LedTower running={running} bestMs={bestMs} lapNumber={lapNumber} />
      ) : style === "chrono" ? (
        <Chronograph running={running} />
      ) : (
        <ClassicClock running={running} title={title} />
      )}
    </div>
  );
}

function T({ k, className }: { k: "main" | "lap" | "total"; className?: string }) {
  return (
    <span data-t={k} suppressHydrationWarning className={cn("tabular", className)}>
      {ZERO}
    </span>
  );
}

// ---------------------------------------------------------------- Clásico
function ClassicClock({ running, title }: { running: boolean; title: string }) {
  return (
    <div className="text-center">
      <p className="text-xs uppercase tracking-widest text-muted">{title}</p>
      <p
        className={cn(
          "text-6xl font-bold tracking-tight sm:text-7xl",
          running ? "text-accent" : "text-foreground",
        )}
      >
        <T k="main" />
      </p>
      <div className="mt-1 flex flex-wrap justify-center gap-3 text-xs text-muted">
        <span>
          Vuelta: <T k="lap" />
        </span>
        <span>
          Total: <T k="total" />
        </span>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------- Volante
function DashClock({
  running,
  title,
  bestMs,
  lastLapMs,
  lastDelta,
  lapNumber,
}: {
  running: boolean;
  title: string;
  bestMs: number | null;
  lastLapMs: number | null;
  lastDelta: number | null;
  lapNumber: number;
}) {
  return (
    <div className="mx-auto w-full max-w-md rounded-[28px] border-4 border-zinc-700 bg-zinc-950 p-3 shadow-[inset_0_2px_12px_rgba(0,0,0,.8)] sm:p-4">
      {/* Luces de cambio: se encienden según avanzas hacia tu mejor vuelta y parpadean si la pasas. */}
      <div className="mb-3 flex justify-center gap-1.5" aria-hidden="true">
        {Array.from({ length: LEDS }, (_, i) => (
          <span
            key={i}
            data-led={i}
            data-on="0"
            className={cn(
              "h-3 w-3 rounded-full opacity-20 transition-opacity duration-75 data-[on='1']:opacity-100 data-[on='1']:shadow-[0_0_8px_currentColor] sm:h-3.5 sm:w-3.5",
              i < 4 ? "bg-green-500 text-green-500" : i < 8 ? "bg-red-500 text-red-500" : "bg-blue-500 text-blue-500",
            )}
          />
        ))}
      </div>
      <div className="rounded-xl border border-zinc-800 bg-[#06120a] px-3 py-3 font-mono text-[#7CFFA0]">
        <div className="flex items-center justify-between text-[10px] uppercase tracking-[0.2em] text-[#7CFFA0]/60 sm:text-xs">
          <span>
            {title} · V{lapNumber}
          </span>
          <span className={running ? "text-[#7CFFA0]" : "text-amber-300"}>{running ? "● En pista" : "■ Parado"}</span>
        </div>
        <p className="py-1 text-center text-5xl font-bold tracking-tight drop-shadow-[0_0_10px_rgba(124,255,160,.45)] sm:text-6xl">
          <T k="main" />
        </p>
        {/* Barra: vuelta en curso frente a la mejor (roja al pasarla). */}
        <div className="h-2 overflow-hidden rounded-full bg-zinc-800" aria-hidden="true">
          <div data-bar className="h-full w-0 rounded-full bg-[#7CFFA0] data-[over='1']:bg-red-500" />
        </div>
        <div className="mt-3 grid grid-cols-3 gap-2 text-center text-[10px] uppercase tracking-wider text-[#7CFFA0]/60 sm:text-xs">
          <div>
            <p>Última</p>
            <p className="tabular text-sm text-[#7CFFA0] sm:text-base">{lastLapMs !== null ? formatLapTime(lastLapMs) : "—"}</p>
          </div>
          <div>
            <p>Delta</p>
            <p
              className={cn(
                "tabular text-sm font-bold sm:text-base",
                lastDelta === null ? "text-[#7CFFA0]" : lastDelta <= 0 ? "text-[#7CFFA0]" : "text-red-400",
              )}
            >
              {lastDelta !== null ? formatDelta(lastDelta) : "—"}
            </p>
          </div>
          <div>
            <p>Mejor</p>
            <p className="tabular text-sm text-fuchsia-300 sm:text-base">{bestMs ? formatLapTime(bestMs) : "—"}</p>
          </div>
        </div>
        <p className="mt-2 text-center text-[10px] uppercase tracking-wider text-[#7CFFA0]/50">
          Total <T k="total" className="text-[#7CFFA0]/80" />
        </p>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------- Pizarra de boxes
function PitBoard({
  running,
  lastLapMs,
  lastDelta,
  lapNumber,
}: {
  running: boolean;
  lastLapMs: number | null;
  lastDelta: number | null;
  lapNumber: number;
}) {
  return (
    <div className="mx-auto w-full max-w-xl">
      <div className="rounded-lg border-[6px] border-zinc-300 bg-black p-3 font-black uppercase leading-none text-white shadow-lg sm:p-5">
        <div className="flex items-baseline justify-between gap-3">
          <span className="text-[clamp(2rem,10vw,4.5rem)] text-yellow-300">L{lapNumber}</span>
          <span className={cn("text-[clamp(1rem,4vw,1.75rem)]", running ? "text-green-400" : "text-zinc-500")}>
            {running ? "GO" : "BOX"}
          </span>
        </div>
        <p className="tabular py-2 text-center text-[clamp(2.75rem,14vw,7rem)] tracking-tight">
          <T k="main" />
        </p>
        <div className="flex items-baseline justify-between gap-3 border-t-4 border-zinc-700 pt-2">
          <span className="tabular text-[clamp(1.25rem,6vw,2.5rem)] text-zinc-200">
            {lastLapMs !== null ? formatLapTime(lastLapMs) : "--:--.---"}
          </span>
          <span
            className={cn(
              "tabular text-[clamp(1.25rem,6vw,2.5rem)]",
              lastDelta === null ? "text-zinc-500" : lastDelta <= 0 ? "text-green-400" : "text-red-500",
            )}
          >
            {lastDelta !== null ? formatDelta(lastDelta) : "±0.000"}
          </span>
        </div>
      </div>
      <p className="mt-1 text-center text-xs text-muted">
        Arriba la vuelta en curso · abajo la última y su diferencia con la mejor · Total <T k="total" />
      </p>
    </div>
  );
}

// ---------------------------------------------------------------- Torre LED
function LedTower({ running, bestMs, lapNumber }: { running: boolean; bestMs: number | null; lapNumber: number }) {
  return (
    <div className="mx-auto w-full max-w-lg overflow-hidden rounded-md border-2 border-zinc-800 bg-[#0b0702] p-3 font-mono uppercase text-amber-400 sm:p-4">
      <div className="flex justify-between text-sm tracking-[0.25em] text-amber-500/90 [text-shadow:0_0_6px_rgba(251,191,36,.6)] sm:text-base">
        <span>LAP {String(lapNumber).padStart(2, "0")}</span>
        <span className={running ? "text-amber-300" : "text-amber-700"}>{running ? "● LIVE" : "■ HOLD"}</span>
      </div>
      {/* La rejilla de puntos solo cubre los números grandes: en textos pequeños no se leería. */}
      <div className="relative">
        <p className="py-2 text-center text-5xl font-bold tracking-wider [text-shadow:0_0_6px_rgba(251,191,36,.9),0_0_18px_rgba(251,191,36,.45)] sm:text-6xl">
          <T k="main" />
        </p>
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0"
          style={{
            backgroundImage: "radial-gradient(circle, transparent 1.1px, #0b0702 1.6px)",
            backgroundSize: "4px 4px",
          }}
        />
      </div>
      <div className="flex justify-between text-sm tracking-[0.2em] text-amber-500/90 [text-shadow:0_0_6px_rgba(251,191,36,.6)] sm:text-base">
        <span>
          TOT <T k="total" />
        </span>
        <span>BEST {bestMs ? formatLapTime(bestMs) : "--:--.---"}</span>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------- Cronógrafo
function Chronograph({ running }: { running: boolean }) {
  const ticks = Array.from({ length: 60 }, (_, i) => i);
  return (
    <div className="mx-auto flex w-full max-w-xs flex-col items-center sm:max-w-sm">
      <svg viewBox="0 0 200 200" className="w-full drop-shadow-xl" role="img" aria-label="Cronógrafo">
        <defs>
          <radialGradient id="chrono-dial" cx="50%" cy="40%" r="65%">
            <stop offset="0%" stopColor="#f8f5ec" />
            <stop offset="100%" stopColor="#d9d2bf" />
          </radialGradient>
          <linearGradient id="chrono-bezel" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#e5e7eb" />
            <stop offset="50%" stopColor="#6b7280" />
            <stop offset="100%" stopColor="#d1d5db" />
          </linearGradient>
        </defs>
        <circle cx="100" cy="100" r="98" fill="url(#chrono-bezel)" />
        <circle cx="100" cy="100" r="90" fill="url(#chrono-dial)" stroke="#1f2937" strokeWidth="1" />
        {ticks.map((i) => {
          const major = i % 5 === 0;
          const a = (i / 60) * 2 * Math.PI;
          const r1 = major ? 76 : 81;
          return (
            <line
              key={i}
              x1={100 + Math.sin(a) * r1}
              y1={100 - Math.cos(a) * r1}
              x2={100 + Math.sin(a) * 87}
              y2={100 - Math.cos(a) * 87}
              stroke={major ? "#111827" : "#4b5563"}
              strokeWidth={major ? 2 : 0.8}
            />
          );
        })}
        {[5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55, 60].map((n) => {
          const a = (n / 60) * 2 * Math.PI;
          return (
            <text
              key={n}
              x={100 + Math.sin(a) * 66}
              y={100 - Math.cos(a) * 66 + 3.5}
              textAnchor="middle"
              fontSize="10"
              fontWeight="700"
              fill="#111827"
              fontFamily="ui-sans-serif, system-ui"
            >
              {n}
            </text>
          );
        })}
        {/* Subesfera izquierda: minutos de la vuelta (30). Derecha: total (60 min). */}
        <SubDial cx={70} cy={112} label="VUELTA" hand="min" marks={6} />
        <SubDial cx={130} cy={112} label="TOTAL" hand="total" marks={12} />
        <text x="100" y="58" textAnchor="middle" fontSize="7" letterSpacing="2" fill="#7f1d1d" fontWeight="700">
          VRS · CHRONO
        </text>
        {/* Ventana digital */}
        <rect x="68" y="140" width="64" height="16" rx="3" fill="#111827" />
        <text x="100" y="151.5" textAnchor="middle" fontSize="10" fill="#fbbf24" fontFamily="ui-monospace, monospace" data-t="main">
          {ZERO}
        </text>
        {/* Aguja de segundos de la vuelta */}
        <g data-hand="sec" data-cx="100" data-cy="100">
          <line x1="100" y1="118" x2="100" y2="18" stroke="#b91c1c" strokeWidth="1.6" strokeLinecap="round" />
          <circle cx="100" cy="100" r="4" fill="#b91c1c" />
          <circle cx="100" cy="100" r="1.5" fill="#f8f5ec" />
        </g>
      </svg>
      <p className={cn("mt-1 text-xs uppercase tracking-widest", running ? "text-accent" : "text-muted")}>
        {running ? "En marcha" : "Parado"} · Total <T k="total" />
      </p>
    </div>
  );
}

function SubDial({
  cx,
  cy,
  label,
  hand,
  marks,
}: {
  cx: number;
  cy: number;
  label: string;
  hand: "min" | "total";
  marks: number;
}) {
  return (
    <g>
      <circle cx={cx} cy={cy} r="17" fill="#ece7d8" stroke="#6b7280" strokeWidth="0.8" />
      {Array.from({ length: marks }, (_, i) => {
        const a = (i / marks) * 2 * Math.PI;
        return (
          <line
            key={i}
            x1={cx + Math.sin(a) * 13}
            y1={cy - Math.cos(a) * 13}
            x2={cx + Math.sin(a) * 16}
            y2={cy - Math.cos(a) * 16}
            stroke="#374151"
            strokeWidth="0.8"
          />
        );
      })}
      <text x={cx} y={cy + 9} textAnchor="middle" fontSize="4.5" fill="#374151" letterSpacing="0.5">
        {label}
      </text>
      <g data-hand={hand} data-cx={cx} data-cy={cy}>
        <line x1={cx} y1={cy + 3} x2={cx} y2={cy - 13} stroke="#111827" strokeWidth="1.2" strokeLinecap="round" />
        <circle cx={cx} cy={cy} r="1.8" fill="#111827" />
      </g>
    </g>
  );
}
