import { notFound } from "next/navigation";
import Link from "next/link";
import { format } from "date-fns";
import { Timer } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { LapChart } from "@/components/lap-chart";
import { PublicAutoRefresh } from "@/components/public-auto-refresh";
import { StatCell } from "@/components/stat-cell";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SESSION_TYPE_LABELS, TRACK_STATE_LABELS } from "@/lib/labels";
import {
  bestSectorTimes,
  computeLapStats,
  computeStints,
  consistencyLabel,
  formatDelta,
  lapDelta,
  theoreticalBestLap,
  totalPitTimeMs,
} from "@/lib/stats";
import type { Lap, LapEvent, LapSector, Modality, SessionType } from "@/lib/supabase/types";
import { cn, formatLapTime, parseDateOnly } from "@/lib/utils";

export const dynamic = "force-dynamic";

interface PublicSession {
  session: {
    name: string;
    modality: Modality;
    session_type: SessionType;
    circuit: string | null;
    driver: string | null;
    date: string;
    sectors_count: number;
  };
  laps: Lap[];
  events: LapEvent[];
  sectors: LapSector[];
}

export default async function PublicSessionPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const supabase = await createClient();

  const { data } = await supabase.rpc("get_public_session", { p_slug: slug });
  if (!data) notFound();
  const { session, laps, events, sectors } = data as unknown as PublicSession;

  const stats = computeLapStats(laps);
  const cons = consistencyLabel(stats.cv);
  const stints = computeStints(laps, events);
  const totalPit = totalPitTimeMs(events);
  const sectorsCount = session.sectors_count ?? 0;
  const bestSectors = sectorsCount > 0 ? bestSectorTimes(sectors, sectorsCount) : [];
  const theoBest = sectorsCount > 0 ? theoreticalBestLap(bestSectors) : null;

  return (
    <div className="flex min-h-full flex-col">
      <PublicAutoRefresh />
      <header className="border-b border-border/80 bg-background/80 backdrop-blur-md">
        <div className="mx-auto flex h-14 w-full max-w-7xl items-center gap-3 px-4 sm:px-6">
          <Link href="/" className="flex items-center gap-2">
            <span className="grid h-8 w-8 place-items-center rounded-md bg-gradient-to-br from-accent to-accent-2 text-on-accent">
              <Timer className="h-4 w-4" />
            </span>
            <span className="text-lg font-bold tracking-tight">
              VRS<span className="text-accent">.</span>
            </span>
          </Link>
          <Badge variant="muted" className="ml-2">
            Solo lectura
          </Badge>
          <Link href="/login" className="ml-auto text-xs text-muted hover:text-foreground">
            Entrar
          </Link>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-4 px-4 py-6 sm:px-6 sm:py-8">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{session.name}</h1>
          <div className="mt-1 flex flex-wrap gap-1.5">
            <Badge variant="accent">{SESSION_TYPE_LABELS[session.session_type]}</Badge>
            <Badge variant="muted">{session.modality}</Badge>
            {session.circuit ? <Badge variant="info">{session.circuit}</Badge> : null}
            {session.driver ? <Badge variant="default">{session.driver}</Badge> : null}
            <Badge variant="muted">{format(parseDateOnly(session.date), "dd/MM/yyyy")}</Badge>
          </div>
        </div>

        <Card>
          <CardHeader className="border-b-0 pb-2">
            <CardTitle className="text-xs uppercase tracking-widest text-muted">Resumen</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-4 pt-0 sm:grid-cols-3 lg:grid-cols-6">
            <StatCell label="Vueltas" value={String(stats.count)} />
            <StatCell label="Mejor" value={stats.bestMs !== null ? formatLapTime(stats.bestMs) : "—"} accent />
            <StatCell label="Media (limpias)" value={stats.averageMs !== null ? formatLapTime(stats.averageMs) : "—"} />
            <StatCell label="Desv. típica" value={stats.stddevMs !== null ? `±${(stats.stddevMs / 1000).toFixed(3)} s` : "—"} />
            <div>
              <p className="text-xs uppercase tracking-wider text-muted">Consistencia</p>
              <div className="mt-1">
                <Badge variant={cons.tone}>{cons.label}</Badge>
              </div>
            </div>
            <StatCell label="Tiempo en boxes" value={totalPit > 0 ? formatLapTime(totalPit) : "—"} />
          </CardContent>
        </Card>

        {theoBest !== null ? (
          <Card>
            <CardContent className="flex flex-wrap items-center justify-between gap-2 py-4">
              <div>
                <p className="text-xs uppercase tracking-wider text-muted">Vuelta teórica</p>
                <p className="tabular text-2xl font-bold text-accent">{formatLapTime(theoBest)}</p>
              </div>
              <div className="flex flex-wrap gap-2 text-xs">
                {bestSectors.map((s, i) =>
                  s !== null ? (
                    <Badge key={i} variant="info">
                      S{i + 1}: {formatLapTime(s)}
                    </Badge>
                  ) : null,
                )}
              </div>
            </CardContent>
          </Card>
        ) : null}

        {laps.length >= 2 ? (
          <Card>
            <CardHeader>
              <CardTitle>Evolución de tiempos</CardTitle>
            </CardHeader>
            <CardContent>
              <LapChart laps={laps} />
            </CardContent>
          </Card>
        ) : null}

        <Card>
          <CardHeader>
            <CardTitle>Vueltas ({laps.length})</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs uppercase tracking-wider text-muted">
                    <th className="px-3 py-2 font-medium">#</th>
                    <th className="px-3 py-2 font-medium">Tiempo</th>
                    <th className="px-3 py-2 font-medium">Δ</th>
                    <th className="px-3 py-2 font-medium">Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {laps.map((lap) => {
                    const isBest = lap.id === stats.bestId;
                    const delta = lapDelta(lap.lap_time_ms, stats.bestMs);
                    return (
                      <tr key={lap.id} className="border-t border-border/60">
                        <td className="px-3 py-2 tabular text-muted">
                          {String(lap.lap_number).padStart(2, "0")}
                        </td>
                        <td className={cn("px-3 py-2 tabular font-medium", isBest && "text-accent")}>
                          {formatLapTime(lap.lap_time_ms)}
                        </td>
                        <td
                          className={cn(
                            "px-3 py-2 tabular text-xs",
                            isBest && "text-accent",
                            !isBest && delta !== null && delta > 0 && "text-warning",
                          )}
                        >
                          {isBest ? "—" : formatDelta(delta)}
                        </td>
                        <td className="px-3 py-2 text-xs text-muted">
                          {TRACK_STATE_LABELS[lap.track_state]}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {stints.length > 1 ? (
          <Card>
            <CardHeader>
              <CardTitle>Stints</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 md:grid-cols-2">
              {stints.map((s) => (
                <div key={s.index} className="rounded-lg border border-border/60 bg-surface/40 p-3">
                  <p className="text-sm font-semibold">Stint #{s.index}</p>
                  <p className="text-xs text-muted">
                    {s.laps.length} vueltas · Mejor {s.bestMs !== null ? formatLapTime(s.bestMs) : "—"} · Media{" "}
                    {s.averageMs !== null ? formatLapTime(s.averageMs) : "—"}
                  </p>
                </div>
              ))}
            </CardContent>
          </Card>
        ) : null}
      </main>

      <footer className="border-t border-border/40 px-4 py-3 text-center text-xs text-muted">
        Vista pública · VRS Studio
      </footer>
    </div>
  );
}
