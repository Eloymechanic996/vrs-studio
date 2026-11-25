import Link from "next/link";
import { format } from "date-fns";
import { ArrowLeft, GitCompare } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { MultiLapChart } from "@/components/lap-chart";
import { StatCell } from "@/components/stat-cell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { computeLapStats, consistencyLabel, formatDelta } from "@/lib/stats";
import type { Lap, Session } from "@/lib/supabase/types";
import { cn, formatLapTime, parseDateOnly } from "@/lib/utils";
import { CompareSelector } from "./compare-selector";

type SessionWithLaps = { session: Session; laps: Lap[] };

export default async function ComparePage({
  searchParams,
}: {
  searchParams: Promise<{ a?: string | string[]; b?: string | string[] }>;
}) {
  const params = await searchParams;
  // Solo identificadores válidos; un parámetro repetido llega como lista.
  const pick = (v: string | string[] | undefined) => {
    const s = Array.isArray(v) ? v[0] : v;
    return s && /^[0-9a-f-]{36}$/i.test(s) ? s : undefined;
  };
  const a = pick(params.a);
  const b = pick(params.b);
  const supabase = await createClient();

  const { data: sessions } = await supabase
    .from("sessions")
    .select("id, name, date, circuit, driver, modality, session_type")
    .order("date", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(200);

  const [sessionA, sessionB] = await Promise.all([
    a ? loadSessionWithLaps(supabase, a) : Promise.resolve(null),
    b ? loadSessionWithLaps(supabase, b) : Promise.resolve(null),
  ]);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-3">
        <Link href="/">
          <Button variant="ghost" size="icon" aria-label="Volver">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div className="flex items-center gap-2">
          <GitCompare className="h-5 w-5 text-accent" />
          <h1 className="text-xl font-bold tracking-tight sm:text-2xl">Comparar sesiones</h1>
        </div>
      </div>

      <CompareSelector sessions={sessions ?? []} selectedA={a ?? null} selectedB={b ?? null} />

      {sessionA && sessionB ? (
        <ComparisonResult a={sessionA} b={sessionB} />
      ) : (
        <Card>
          <CardContent className="py-12 text-center text-sm text-muted">
            Elige dos sesiones para ver la comparativa.
          </CardContent>
        </Card>
      )}
    </div>
  );
}

async function loadSessionWithLaps(
  supabase: Awaited<ReturnType<typeof createClient>>,
  id: string,
): Promise<SessionWithLaps | null> {
  const { data: session } = await supabase.from("sessions").select("*").eq("id", id).maybeSingle();
  if (!session) return null;
  const { data: laps } = await supabase
    .from("laps")
    .select("*")
    .eq("session_id", id)
    .order("lap_number", { ascending: true });
  return { session, laps: laps ?? [] };
}

function diffClass(diff: number | null) {
  if (diff === null || diff === 0) return "text-muted";
  return diff < 0 ? "text-success font-semibold" : "text-warning";
}

function ComparisonResult({ a, b }: { a: SessionWithLaps; b: SessionWithLaps }) {
  const statsA = computeLapStats(a.laps);
  const statsB = computeLapStats(b.laps);
  const lapsA = new Map(a.laps.map((l) => [l.lap_number, l]));
  const lapsB = new Map(b.laps.map((l) => [l.lap_number, l]));
  const numbers = [...new Set([...lapsA.keys(), ...lapsB.keys()])].sort((x, y) => x - y);

  return (
    <div className="grid gap-4">
      <div className="grid gap-3 md:grid-cols-2">
        <SessionCard label="A" session={a.session} stats={statsA} />
        <SessionCard label="B" session={b.session} stats={statsB} />
      </div>

      <StatsDiff statsA={statsA} statsB={statsB} />

      {a.laps.length >= 2 || b.laps.length >= 2 ? (
        <Card>
          <CardHeader>
            <CardTitle>Evolución de tiempos</CardTitle>
          </CardHeader>
          <CardContent>
            <MultiLapChart
              series={[
                { label: `A · ${a.session.name}`, color: "var(--accent)", laps: a.laps },
                { label: `B · ${b.session.name}`, color: "var(--info)", laps: b.laps },
              ]}
            />
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Vuelta a vuelta</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="max-h-[520px] overflow-y-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-surface">
                <tr className="text-left text-xs uppercase tracking-wider text-muted">
                  <th className="px-3 py-2 font-medium">Vuelta</th>
                  <th className="px-3 py-2 font-medium">A</th>
                  <th className="px-3 py-2 font-medium">B</th>
                  <th className="px-3 py-2 font-medium">B − A</th>
                </tr>
              </thead>
              <tbody>
                {numbers.map((n) => {
                  const lapA = lapsA.get(n);
                  const lapB = lapsB.get(n);
                  const diff = lapA && lapB ? lapB.lap_time_ms - lapA.lap_time_ms : null;
                  return (
                    <tr key={n} className="border-t border-border/60 hover:bg-surface/60">
                      <td className="px-3 py-2 tabular text-muted">{String(n).padStart(2, "0")}</td>
                      <td className="px-3 py-2 tabular">{lapA ? formatLapTime(lapA.lap_time_ms) : "—"}</td>
                      <td className="px-3 py-2 tabular">{lapB ? formatLapTime(lapB.lap_time_ms) : "—"}</td>
                      <td className={cn("px-3 py-2 tabular text-xs", diffClass(diff))}>
                        {diff === null ? "—" : formatDelta(diff)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function SessionCard({
  label,
  session,
  stats,
}: {
  label: string;
  session: Session;
  stats: ReturnType<typeof computeLapStats>;
}) {
  const consistency = consistencyLabel(stats.cv);
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Badge variant="accent">{label}</Badge>
          <CardTitle className="truncate">{session.name}</CardTitle>
        </div>
        <div className="mt-1 flex flex-wrap gap-1.5 text-xs text-muted">
          <span>{format(parseDateOnly(session.date), "dd/MM/yyyy")}</span>
          {session.circuit ? <span>· {session.circuit}</span> : null}
          {session.driver ? <span>· {session.driver}</span> : null}
        </div>
      </CardHeader>
      <CardContent className="grid grid-cols-2 gap-3 text-sm">
        <StatCell label="Mejor" value={stats.bestMs !== null ? formatLapTime(stats.bestMs) : "—"} accent size="base" />
        <StatCell label="Media (limpias)" value={stats.averageMs !== null ? formatLapTime(stats.averageMs) : "—"} size="base" />
        <StatCell label="Desv. típica" value={stats.stddevMs !== null ? `±${(stats.stddevMs / 1000).toFixed(3)} s` : "—"} size="base" />
        <StatCell label="Vueltas / limpias" value={`${stats.count} / ${stats.cleanCount}`} size="base" />
        <div className="col-span-2 flex items-center gap-2 pt-1">
          <span className="text-xs uppercase text-muted">Consistencia</span>
          <Badge variant={consistency.tone}>{consistency.label}</Badge>
        </div>
      </CardContent>
    </Card>
  );
}

function StatsDiff({
  statsA,
  statsB,
}: {
  statsA: ReturnType<typeof computeLapStats>;
  statsB: ReturnType<typeof computeLapStats>;
}) {
  const bestDiff =
    statsA.bestMs !== null && statsB.bestMs !== null ? statsB.bestMs - statsA.bestMs : null;
  const meanDiff =
    statsA.averageMs !== null && statsB.averageMs !== null ? statsB.averageMs - statsA.averageMs : null;
  const cvDiff = statsA.cv !== null && statsB.cv !== null ? statsB.cv - statsA.cv : null;

  const cell = (label: string, value: string, diff: number | null) => (
    <div>
      <p className="text-xs uppercase tracking-wider text-muted">{label}</p>
      <p className={cn("tabular text-lg font-semibold", diff === null || diff === 0 ? "text-foreground" : diff < 0 ? "text-success" : "text-warning")}>
        {value}
      </p>
    </div>
  );

  return (
    <Card>
      <CardHeader className="border-b-0 pb-2">
        <CardTitle className="text-xs uppercase tracking-widest text-muted">Diferencia B − A</CardTitle>
      </CardHeader>
      <CardContent className="grid grid-cols-2 gap-4 pt-0 sm:grid-cols-3">
        {cell("Mejor vuelta", formatDelta(bestDiff), bestDiff)}
        {cell("Media (limpias)", formatDelta(meanDiff === null ? null : Math.round(meanDiff)), meanDiff)}
        {cell("Consistencia (CV)", cvDiff === null ? "—" : `${(cvDiff * 100).toFixed(2)} %`, cvDiff)}
      </CardContent>
    </Card>
  );
}
