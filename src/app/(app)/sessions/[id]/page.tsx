import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { RealtimeRefresher } from "@/components/realtime-refresher";
import { SESSION_TYPE_LABELS, WEATHER_LABELS } from "@/lib/labels";
import { todayISO, upcomingLabel } from "@/lib/session-dates";
import { ConditionsCard } from "./conditions-card";
import { ExportButtons } from "./export-buttons";
import { SessionWorkspace } from "./session-workspace";
import { ShareToggle } from "./share-toggle";

export default async function SessionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: session } = await supabase
    .from("sessions")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (!session) notFound();

  const [{ data: laps }, { data: events }, { data: setup }, { data: copyCandidates }] =
    await Promise.all([
      supabase
        .from("laps")
        .select("*")
        .eq("session_id", id)
        .order("lap_number", { ascending: true }),
      supabase
        .from("events")
        .select("*")
        .eq("session_id", id)
        .order("created_at", { ascending: true }),
      supabase.from("setups").select("*").eq("session_id", id).maybeSingle(),
      supabase
        .from("sessions")
        .select("id, name, date")
        .eq("modality", session.modality)
        .neq("id", id)
        .order("date", { ascending: false })
        .order("created_at", { ascending: false })
        .limit(30),
    ]);

  const lapIds = (laps ?? []).map((l) => l.id);
  const { data: sectors } =
    lapIds.length > 0
      ? await supabase.from("lap_sectors").select("*").in("lap_id", lapIds)
      : { data: [] };

  const today = todayISO();
  const upcoming = session.date > today ? upcomingLabel(session.date, today) : null;

  return (
    <div className="flex flex-col gap-4">
      <RealtimeRefresher
        sessionId={session.id}
        knownIds={[...lapIds, ...(events ?? []).map((e) => e.id)]}
      />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link href="/">
            <Button variant="ghost" size="icon" aria-label="Volver">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-xl font-bold tracking-tight sm:text-2xl">{session.name}</h1>
            <div className="mt-1 flex flex-wrap gap-1.5">
              <Badge variant="accent">{SESSION_TYPE_LABELS[session.session_type]}</Badge>
              <Badge variant="muted">{session.modality}</Badge>
              {session.circuit ? <Badge variant="info">{session.circuit}</Badge> : null}
              {session.driver ? <Badge variant="default">{session.driver}</Badge> : null}
              {upcoming ? <Badge variant="info">Preparada · {upcoming}</Badge> : null}
              {session.weather ? <Badge variant="muted">{WEATHER_LABELS[session.weather]}</Badge> : null}
              {session.air_temp !== null ? <Badge variant="muted">{session.air_temp} °C aire</Badge> : null}
              {session.track_temp !== null ? <Badge variant="muted">{session.track_temp} °C pista</Badge> : null}
              {session.sectors_count > 0 ? (
                <Badge variant="muted">{session.sectors_count} sectores</Badge>
              ) : null}
            </div>
          </div>
        </div>
        <div className="flex max-w-full flex-wrap items-center gap-2">
          <ShareToggle sessionId={session.id} isPublic={session.is_public} slug={session.public_slug} />
          <ExportButtons sessionId={session.id} />
        </div>
      </div>

      <ConditionsCard session={session} serverToday={today} />

      <SessionWorkspace
        session={session}
        laps={laps ?? []}
        events={events ?? []}
        setup={setup ?? null}
        sectors={sectors ?? []}
        copyCandidates={copyCandidates ?? []}
      />
    </div>
  );
}
