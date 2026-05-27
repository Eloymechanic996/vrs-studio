import Link from "next/link";
import { format } from "date-fns";
import { ArrowLeft, GitCompare } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { computeLapStats, consistencyLabel, formatDelta } from "@/lib/stats";
import { formatLapTime } from "@/lib/utils";
import { MultiLapChart } from "@/components/lap-chart";
import { CompareSelector } from "./compare-selector";
import type { Database } from "@/lib/supabase/types";

type Session = Database["public"]["Tables"]["sessions"]["Row"];
type Lap = Database["public"]["Tables"]["laps"]["Row"];

export default async function ComparePage({
  searchParams,
}: {
  searchParams: Promise<{ a?: string; b?: string }>;
}) {
  const { a, b } = await searchParams;
  const supabase = await createClient();

  const { data: sessions } = await supabase
    .from("sessions")
    .select("id, name, date, circuit, driver, modality, session_type")
    .order("date", { ascending: false })
    .order("created_at", { ascending: false });

  const sessionList = sessions ?? [];

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
          <h1 className="text-xl font-bold tracking-tight sm:text-2xl">
            Comparar sesiones
          </h1>
        </div>
      </div>

      <CompareSelector
        sessions={sessionList}
        selectedA={a ?? null}
        selectedB={b ?? null}
      />

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

type SessionWithLaps = { session: Session; laps: Lap[] };

async function loadSessionWithLaps(
  supabase: Awaited<ReturnType<typeof createClient>>,
  id: string,
): Promise<SessionWithLaps | null> {
  const { data: session } = await supabase
    .from("sessions")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (!session) return null;
  const { data: laps } = await supabase
    .from("laps")
    .select("*")
    .eq("session_id", id)
    .order("lap_number", { ascending: true });
  return { session, laps: laps ?? [] };
}

function ComparisonResult({
  a,
  b,
}: {
  a: SessionWithLaps;
  b: SessionWithLaps;
}) {
  const statsA = computeLapStats(a.laps);
  const statsB = computeLapStats(b.laps);
  const maxLaps = Math.max(a.laps.length, b.laps.length);
  const consA = consistencyLabel(statsA.cv);
  const consB = consistencyLabel(statsB.cv);

  return (
    <div className="grid gap-4">
      <div className="grid gap-3 md:grid-cols-2">
        <SessionCard label="A" session={a.session} stats={statsA} consistency={consA} />
        <SessionCard label="B" session={b.session} stats={statsB} consistency={consB} />
      </div>

      <StatsDiff statsA={statsA} statsB={statsB} />

      {(a.laps.length >= 2 || b.laps.length >= 2) ? (
        <Card>
          <CardHeader>
            <CardTitle>Evolucion de tiempos</CardTitle>
          </CardHeader>
          <CardContent>
            <MultiLapChart
              series={[
                { label: `A · ${a.session.name}`, color: "#DC2626", laps: a.laps },
                { label: `B · ${b.session.name}`, color: "#38BDF8", laps: b.laps },
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
              <thead className="sticky top-0 bg-surface/95 backdrop-blur">
                <tr className="text-left text-xs uppercase tracking-wider text-muted">
                  <th className="px-3 py-2 font-medium">Vuelta</th>
                  <th className="px-3 py-2 font-medium">A</th>
                  <th className="px-3 py-2 font-medium">B</th>
                  <th className="px-3 py-2 font-medium">B - A</th>
                </tr>
              </thead>
              <tbody>
                {Array.from({ length: maxLaps }, (_, i) => {
                  const lapA = a.laps[i];
                  const lapB = b.laps[i];
                  const diff =
                    lapA && lapB ? lapB.lap_time_ms - lapA.lap_time_ms : null;
                  return (
                    <tr
                      key={i}
                      className="border-t border-border/60 hover:bg-surface/60"
                    >
                      <td className="px-3 py-2 tabular text-muted">
                        {String(i + 1).padStart(2, "0")}
                      </td>
                      <td className="px-3 py-2 tabular">
                        {lapA ? formatLapTime(lapA.lap_time_ms) : "—"}
                      </td>
                      <td className="px-3 py-2 tabular">
                        {lapB ? formatLapTime(lapB.lap_time_ms) : "—"}
                      </td>
                      <td
                        className={
                          diff === null
                            ? "px-3 py-2 tabular text-xs text-muted"
                            : diff < 0
                              ? "px-3 py-2 tabular text-xs text-green-400 font-semibold"
                              : diff > 0
                                ? "px-3 py-2 tabular text-xs text-amber-400"
                                : "px-3 py-2 tabular text-xs text-muted"
                        }
                      >
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
  consistency,
}: {
  label: string;
  session: Session;
  stats: ReturnType<typeof computeLapStats>;
  consistency: ReturnType<typeof consistencyLabel>;
}) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Badge variant="accent">{label}</Badge>
          <CardTitle className="truncate">{session.name}</CardTitle>
        </div>
        <div className="mt-1 flex flex-wrap gap-1.5 text-xs text-muted">
          <span>{format(new Date(session.date), "dd/MM/yyyy")}</span>
          {session.circuit ? <span>· {session.circuit}</span> : null}
          {session.driver ? <span>· {session.driver}</span> : null}
        </div>
      </CardHeader>
      <CardContent className="grid grid-cols-2 gap-3 text-sm">
        <Stat
          k="Mejor"
          v={stats.bestMs !== null ? formatLapTime(stats.bestMs) : "—"}
          accent
        />
        <Stat
          k="Media (limpias)"
          v={stats.averageMs !== null ? formatLapTime(stats.averageMs) : "—"}
        />
        <Stat
          k="Desv. tipica"
          v={
            stats.stddevMs !== null
              ? `±${(stats.stddevMs / 1000).toFixed(3)} s`
              : "—"
          }
        />
        <Stat k="Vueltas / verdes" v={`${stats.count} / ${stats.cleanCount}`} />
        <div className="col-span-2 flex items-center gap-2 pt-1">
          <span className="text-xs uppercase text-muted/70">Consistencia</span>
          <Badge
            variant={
              consistency.tone === "danger" ? "accent" : consistency.tone
            }
          >
            {consistency.label}
          </Badge>
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
    statsA.bestMs !== null && statsB.bestMs !== null
      ? statsB.bestMs - statsA.bestMs
      : null;
  const meanDiff =
    statsA.averageMs !== null && statsB.averageMs !== null
      ? statsB.averageMs - statsA.averageMs
      : null;

  return (
    <Card>
      <CardHeader className="border-b-0 pb-2">
        <CardTitle className="text-xs uppercase tracking-widest text-muted">
          Diferencia B − A
        </CardTitle>
      </CardHeader>
      <CardContent className="grid grid-cols-2 gap-4 pt-0 sm:grid-cols-3">
        <DiffCell label="Mejor vuelta" diffMs={bestDiff} />
        <DiffCell label="Media (limpias)" diffMs={meanDiff} />
        <DiffCell
          label="Consistencia (CV)"
          customValue={
            statsA.cv !== null && statsB.cv !== null
              ? `${((statsB.cv - statsA.cv) * 100).toFixed(2)} %`
              : "—"
          }
          customTone={
            statsA.cv !== null && statsB.cv !== null
              ? statsB.cv < statsA.cv
                ? "good"
                : statsB.cv > statsA.cv
                  ? "bad"
                  : "neutral"
              : "neutral"
          }
        />
      </CardContent>
    </Card>
  );
}

function DiffCell({
  label,
  diffMs,
  customValue,
  customTone,
}: {
  label: string;
  diffMs?: number | null;
  customValue?: string;
  customTone?: "good" | "bad" | "neutral";
}) {
  let value = customValue ?? "—";
  let tone: "good" | "bad" | "neutral" = customTone ?? "neutral";
  if (customValue === undefined && diffMs !== null && diffMs !== undefined) {
    value = formatDelta(diffMs);
    tone = diffMs < 0 ? "good" : diffMs > 0 ? "bad" : "neutral";
  }
  return (
    <div>
      <p className="text-xs uppercase tracking-wider text-muted/70">{label}</p>
      <p
        className={
          tone === "good"
            ? "tabular text-lg font-semibold text-green-400"
            : tone === "bad"
              ? "tabular text-lg font-semibold text-amber-400"
              : "tabular text-lg font-semibold text-foreground"
        }
      >
        {value}
      </p>
    </div>
  );
}

function Stat({ k, v, accent }: { k: string; v: string; accent?: boolean }) {
  return (
    <div>
      <p className="text-xs uppercase tracking-wider text-muted/70">{k}</p>
      <p
        className={
          accent
            ? "tabular text-base font-semibold text-accent"
            : "tabular text-base font-semibold text-foreground"
        }
      >
        {v}
      </p>
    </div>
  );
}
