"use client";

import { Layers } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  computeStints,
  consistencyLabel,
  totalPitTimeMs,
  type Stint,
} from "@/lib/stats";
import { formatLapTime } from "@/lib/utils";
import type { Database } from "@/lib/supabase/types";

type Session = Database["public"]["Tables"]["sessions"]["Row"];
type Lap = Database["public"]["Tables"]["laps"]["Row"];
type Event = Database["public"]["Tables"]["events"]["Row"];

export function StintsTab({
  laps,
  events,
}: {
  session: Session;
  laps: Lap[];
  events: Event[];
}) {
  const stints = computeStints(laps, events);
  const totalPit = totalPitTimeMs(events);

  if (stints.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-sm text-muted">
          Sin vueltas suficientes para detectar stints.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardHeader className="border-b-0 pb-2">
          <CardTitle className="text-xs uppercase tracking-widest text-muted">
            Resumen de stints
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-4 pt-0 sm:grid-cols-4">
          <Cell label="Stints" value={String(stints.length)} />
          <Cell
            label="Tiempo en pits"
            value={
              totalPit > 0 ? formatLapTime(totalPit) : "—"
            }
          />
          <Cell
            label="Vueltas totales"
            value={String(stints.reduce((a, s) => a + s.laps.length, 0))}
          />
          <Cell
            label="Mejor stint"
            value={(() => {
              const withBest = stints.filter((s) => s.bestMs !== null);
              if (withBest.length === 0) return "—";
              const best = withBest.reduce(
                (a, b) => ((a.bestMs ?? Infinity) < (b.bestMs ?? Infinity) ? a : b),
              );
              return `#${best.index} · ${formatLapTime(best.bestMs!)}`;
            })()}
          />
        </CardContent>
      </Card>

      <div className="grid gap-3 md:grid-cols-2">
        {stints.map((s) => (
          <StintCard key={s.index} stint={s} />
        ))}
      </div>
    </div>
  );
}

function StintCard({ stint }: { stint: Stint }) {
  const cons = consistencyLabel(
    stint.averageMs && stint.stddevMs ? stint.stddevMs / stint.averageMs : null,
  );
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-3">
          <CardTitle className="flex items-center gap-2">
            <Layers className="h-4 w-4 text-accent" />
            Stint #{stint.index}
          </CardTitle>
          {stint.pitInMs !== null ? (
            <Badge variant="muted">
              Pit anterior: {formatLapTime(stint.pitInMs)}
            </Badge>
          ) : (
            <Badge variant="info">Inicial</Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="grid grid-cols-2 gap-3 text-sm">
        <Cell label="Vueltas" value={String(stint.laps.length)} />
        <Cell
          label="Mejor"
          value={stint.bestMs !== null ? formatLapTime(stint.bestMs) : "—"}
          accent
        />
        <Cell
          label="Media"
          value={
            stint.averageMs !== null ? formatLapTime(stint.averageMs) : "—"
          }
        />
        <Cell
          label="Desv. tipica"
          value={
            stint.stddevMs !== null
              ? `±${(stint.stddevMs / 1000).toFixed(3)} s`
              : "—"
          }
        />
        <div className="col-span-2 flex flex-wrap items-center gap-2">
          <span className="text-xs uppercase text-muted/70">Consistencia</span>
          <Badge variant={cons.tone === "danger" ? "accent" : cons.tone}>
            {cons.label}
          </Badge>
          {stint.decayMsPerLap !== null && stint.laps.length >= 3 ? (
            <Badge
              variant={
                stint.decayMsPerLap > 50
                  ? "warning"
                  : stint.decayMsPerLap < -50
                    ? "success"
                    : "muted"
              }
            >
              Decay {stint.decayMsPerLap > 0 ? "+" : ""}
              {(stint.decayMsPerLap / 1000).toFixed(3)} s/vuelta
            </Badge>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}

function Cell({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div>
      <p className="text-xs uppercase tracking-wider text-muted/70">{label}</p>
      <p
        className={
          accent
            ? "tabular text-base font-semibold text-accent"
            : "tabular text-base font-semibold text-foreground"
        }
      >
        {value}
      </p>
    </div>
  );
}
