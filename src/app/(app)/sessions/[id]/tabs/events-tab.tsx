"use client";

import { useState, useTransition } from "react";
import { format } from "date-fns";
import { Plus, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, Input, Select } from "@/components/ui/input";
import { deleteEvent, recordEvent } from "@/app/(app)/actions";
import { formatLapTime } from "@/lib/utils";
import type { Database, EventType } from "@/lib/supabase/types";

type Session = Database["public"]["Tables"]["sessions"]["Row"];
type Event = Database["public"]["Tables"]["events"]["Row"];
type Lap = Database["public"]["Tables"]["laps"]["Row"];

const EVENT_TYPES: EventType[] = [
  "Incidencia",
  "Pit In",
  "Pit Out",
  "Safety Car Sale",
  "Safety Car Entra",
  "Bandera",
  "Cambio de clima",
];

function eventVariant(t: EventType) {
  if (t.startsWith("Safety")) return "info" as const;
  if (t === "Incidencia") return "accent" as const;
  if (t === "Bandera") return "warning" as const;
  if (t === "Pit In" || t === "Pit Out") return "muted" as const;
  return "default" as const;
}

export function EventsTab({
  session,
  events,
  laps,
}: {
  session: Session;
  events: Event[];
  laps: Lap[];
}) {
  const [type, setType] = useState<EventType>("Incidencia");
  const [elapsed, setElapsed] = useState("");
  const [lapNumber, setLapNumber] = useState<string>("");
  const [notes, setNotes] = useState("");
  const [, startTransition] = useTransition();

  function add() {
    const ms = elapsed
      ? parseTimeToMs(elapsed)
      : (laps[laps.length - 1]?.total_time_ms ?? 0);
    startTransition(async () => {
      await recordEvent({
        session_id: session.id,
        event_type: type,
        elapsed_ms: ms ?? 0,
        lap_number: lapNumber ? Number(lapNumber) : null,
        notes: notes || undefined,
      });
      setElapsed("");
      setLapNumber("");
      setNotes("");
    });
  }

  function remove(id: string) {
    startTransition(async () => {
      await deleteEvent(session.id, id);
    });
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_1.5fr]">
      <Card>
        <CardHeader>
          <CardTitle>Nuevo evento</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3">
          <Field label="Tipo">
            <Select
              value={type}
              onChange={(e) => setType(e.target.value as EventType)}
            >
              {EVENT_TYPES.map((t) => (
                <option key={t}>{t}</option>
              ))}
            </Select>
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Vuelta #">
              <Input
                inputMode="numeric"
                value={lapNumber}
                onChange={(e) => setLapNumber(e.target.value)}
              />
            </Field>
            <Field label="Tiempo (mm:ss.SSS)">
              <Input
                value={elapsed}
                onChange={(e) => setElapsed(e.target.value)}
                placeholder="auto"
              />
            </Field>
          </div>
          <Field label="Notas">
            <Input value={notes} onChange={(e) => setNotes(e.target.value)} />
          </Field>
          <Button onClick={add}>
            <Plus className="h-4 w-4" />
            Registrar evento
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Eventos ({events.length})</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {events.length === 0 ? (
            <p className="px-5 py-12 text-center text-sm text-muted">
              Sin eventos registrados.
            </p>
          ) : (
            <div className="max-h-[480px] overflow-y-auto">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-surface/95 backdrop-blur">
                  <tr className="text-left text-xs uppercase tracking-wider text-muted">
                    <th className="px-3 py-2 font-medium">Tipo</th>
                    <th className="px-3 py-2 font-medium">V#</th>
                    <th className="px-3 py-2 font-medium">Tiempo</th>
                    <th className="px-3 py-2 font-medium">Notas</th>
                    <th className="px-3 py-2"></th>
                  </tr>
                </thead>
                <tbody>
                  {events.map((ev) => (
                    <tr
                      key={ev.id}
                      className="border-t border-border/60 hover:bg-surface/60"
                    >
                      <td className="px-3 py-2">
                        <Badge variant={eventVariant(ev.event_type as EventType)}>
                          {ev.event_type}
                        </Badge>
                      </td>
                      <td className="px-3 py-2 tabular text-muted">
                        {ev.lap_number ?? "-"}
                      </td>
                      <td className="px-3 py-2 tabular text-muted">
                        {formatLapTime(ev.elapsed_ms)}
                      </td>
                      <td className="px-3 py-2 text-xs text-muted">
                        {ev.notes || "-"}
                      </td>
                      <td className="px-3 py-2 text-right">
                        <button
                          onClick={() => remove(ev.id)}
                          className="rounded p-1 text-muted hover:text-red-400 hover:bg-red-500/10"
                          aria-label="Borrar"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
        <div className="border-t border-border/60 p-4 text-xs text-muted">
          Sesion creada{" "}
          {format(new Date(session.created_at), "dd/MM/yyyy HH:mm")}
        </div>
      </Card>
    </div>
  );
}

function parseTimeToMs(s: string): number | null {
  const m = s.match(/^(?:(\d+):)?(\d{1,2})(?:[.,](\d{1,3}))?$/);
  if (!m) return null;
  const minutes = m[1] ? parseInt(m[1], 10) : 0;
  const seconds = parseInt(m[2], 10);
  const millis = m[3] ? parseInt(m[3].padEnd(3, "0"), 10) : 0;
  return minutes * 60000 + seconds * 1000 + millis;
}
