"use client";

import { Layers } from "lucide-react";
import { StatCell } from "@/components/stat-cell";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { computeStints, consistencyLabel, totalPitTimeMs, type Stint } from "@/lib/stats";
import type { Lap, LapEvent } from "@/lib/supabase/types";
import { formatLapTime } from "@/lib/utils";

export function StintsTab({ laps, events }: { laps: Lap[]; events: LapEvent[] }) {
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

  const fastest = stints.reduce((a, b) => ((a.bestMs ?? Infinity) <= (b.bestMs ?? Infinity) ? a : b));

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardHeader className="border-b-0 pb-2">
          <CardTitle className="text-xs uppercase tracking-widest text-muted">
            Resumen de stints
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-4 pt-0 sm:grid-cols-4">
          <StatCell label="Stints" value={String(stints.length)} size="base" />
          <StatCell
            label="Tiempo en boxes"
            value={totalPit > 0 ? formatLapTime(totalPit) : "—"}
            size="base"
          />
          <StatCell
            label="Vueltas totales"
            value={String(stints.reduce((a, s) => a + s.laps.length, 0))}
            size="base"
          />
          <StatCell
            label="Mejor stint"
            value={fastest.bestMs !== null ? `#${fastest.index} · ${formatLapTime(fastest.bestMs)}` : "—"}
            size="base"
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
  const cv =
    stint.averageMs !== null && stint.stddevMs !== null && stint.averageMs > 0
      ? stint.stddevMs / stint.averageMs
      : null;
  const cons = consistencyLabel(cv);
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-3">
          <CardTitle className="flex items-center gap-2">
            <Layers className="h-4 w-4 text-accent" />
            Stint #{stint.index}
          </CardTitle>
          {stint.pitInMs !== null ? (
            <Badge variant="muted">Parada previa: {formatLapTime(stint.pitInMs)}</Badge>
          ) : (
            <Badge variant="info">Inicial</Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="grid grid-cols-2 gap-3 text-sm">
        <StatCell label="Vueltas" value={String(stint.laps.length)} size="base" />
        <StatCell
          label="Mejor"
          value={stint.bestMs !== null ? formatLapTime(stint.bestMs) : "—"}
          accent
          size="base"
        />
        <StatCell
          label="Media"
          value={stint.averageMs !== null ? formatLapTime(stint.averageMs) : "—"}
          size="base"
        />
        <StatCell
          label="Desv. típica"
          value={stint.stddevMs !== null ? `±${(stint.stddevMs / 1000).toFixed(3)} s` : "—"}
          size="base"
        />
        <div className="col-span-2 flex flex-wrap items-center gap-2">
          <span className="text-xs uppercase text-muted">Consistencia</span>
          <Badge variant={cons.tone}>{cons.label}</Badge>
          {stint.decayMsPerLap !== null ? (
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
