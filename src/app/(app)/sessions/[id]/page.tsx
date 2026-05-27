import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Download } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { RealtimeRefresher } from "@/components/realtime-refresher";
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

  const [{ data: laps }, { data: events }, { data: setup }] = await Promise.all(
    [
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
    ],
  );

  // Fetch sectors for these laps in one query.
  const lapIds = (laps ?? []).map((l) => l.id);
  const { data: sectors } =
    lapIds.length > 0
      ? await supabase
          .from("lap_sectors")
          .select("*")
          .in("lap_id", lapIds)
      : { data: [] as never[] };

  return (
    <div className="flex flex-col gap-4">
      <RealtimeRefresher sessionId={session.id} />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link href="/">
            <Button variant="ghost" size="icon" aria-label="Volver">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-xl font-bold tracking-tight sm:text-2xl">
              {session.name}
            </h1>
            <div className="mt-1 flex flex-wrap gap-1.5">
              <Badge variant="accent">{session.session_type}</Badge>
              <Badge variant="muted">{session.modality}</Badge>
              {session.circuit ? (
                <Badge variant="info">{session.circuit}</Badge>
              ) : null}
              {session.driver ? (
                <Badge variant="default">{session.driver}</Badge>
              ) : null}
              {session.sectors_count > 0 ? (
                <Badge variant="muted">{session.sectors_count} sectores</Badge>
              ) : null}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <ShareToggle
            sessionId={session.id}
            isPublic={session.is_public}
            slug={session.public_slug}
          />
          <a href={`/api/sessions/${session.id}/export`}>
            <Button variant="secondary">
              <Download className="h-4 w-4" />
              <span className="hidden sm:inline">Exportar Excel</span>
            </Button>
          </a>
        </div>
      </div>

      <SessionWorkspace
        session={session}
        laps={laps ?? []}
        events={events ?? []}
        setup={setup ?? null}
        sectors={sectors ?? []}
      />
    </div>
  );
}
