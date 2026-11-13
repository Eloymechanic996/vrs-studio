"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Clock, Plus, Trash2 } from "lucide-react";
import { deleteEvent } from "@/app/(app)/actions";
import { useToast } from "@/components/toast";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, Input, Select } from "@/components/ui/input";
import { Notice } from "@/components/ui/notice";
import type { Stopwatch } from "@/hooks/use-stopwatch";
import { useUndoableDelete } from "@/hooks/use-undoable-delete";
import { EVENT_TYPE_LABELS, EVENT_TYPES } from "@/lib/labels";
import { enqueue, removeOp } from "@/lib/outbox";
import { totalElapsed } from "@/lib/stopwatch";
import type { EventType, Lap, LapEvent, Session } from "@/lib/supabase/types";
import { formatLapTime, parseLapTime } from "@/lib/utils";

function eventVariant(t: EventType) {
  if (t.startsWith("Safety")) return "info" as const;
  if (t === "Incidencia") return "accent" as const;
  if (t === "Bandera") return "warning" as const;
  if (t === "Pit In" || t === "Pit Out") return "muted" as const;
  return "default" as const;
}

export function EventsTab({
  session,
  events: allEvents,
  pendingIds,
  laps,
  stopwatch,
}: {
  session: Session;
  events: LapEvent[];
  pendingIds: Set<string>;
  laps: Lap[];
  stopwatch: Stopwatch;
}) {
  const router = useRouter();
  const toast = useToast();
  const [type, setType] = useState<EventType>("Incidencia");
  const [elapsed, setElapsed] = useState("");
  const [lapNumber, setLapNumber] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);

  const { hidden, remove } = useUndoableDelete(async (eventId) => {
    const result = await deleteEvent(session.id, eventId).catch(() => null);
    if (!result?.ok) {
      toast({ message: result?.error ?? "Sin conexión: no se pudo borrar el evento.", tone: "error" });
    }
    router.refresh();
  });

  const events = useMemo(
    () =>
      allEvents.filter((e) => !hidden.has(e.id)).sort((a, b) => a.elapsed_ms - b.elapsed_ms),
    [allEvents, hidden],
  );

  function add() {
    const ms = elapsed.trim()
      ? parseLapTime(elapsed)
      : Math.round(totalElapsed(stopwatch.current(), Date.now()));
    if (ms === null) {
      setError("Tiempo no válido. Usa mm:ss.SSS o déjalo vacío para usar el cronómetro.");
      return;
    }
    const lap = lapNumber.trim() ? Number(lapNumber) : null;
    if (lap !== null && (!Number.isInteger(lap) || lap < 0)) {
      setError("El número de vuelta no es válido.");
      return;
    }
    setError(null);
    enqueue({
      kind: "event",
      id: crypto.randomUUID(),
      sessionId: session.id,
      createdAt: new Date().toISOString(),
      eventType: type,
      lapNumber: lap ?? (laps[laps.length - 1]?.lap_number ?? 0) + 1,
      elapsedMs: ms,
      notes: notes.trim() || null,
    });
    setElapsed("");
    setLapNumber("");
    setNotes("");
  }

  function onDelete(event: LapEvent) {
    if (pendingIds.has(event.id)) removeOp(event.id);
    else remove(event.id, "Evento borrado");
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_1.5fr]">
      <Card>
        <CardHeader>
          <CardTitle>Nuevo evento</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3">
          <Field label="Tipo">
            <Select value={type} onChange={(e) => setType(e.target.value as EventType)}>
              {EVENT_TYPES.map((t) => (
                <option key={t} value={t}>
                  {EVENT_TYPE_LABELS[t]}
                </option>
              ))}
            </Select>
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Vuelta #">
              <Input
                inputMode="numeric"
                value={lapNumber}
                onChange={(e) => setLapNumber(e.target.value)}
                placeholder="actual"
              />
            </Field>
            <Field label="Tiempo (mm:ss.SSS)">
              <Input
                value={elapsed}
                onChange={(e) => setElapsed(e.target.value)}
                placeholder="cronómetro"
              />
            </Field>
          </div>
          <Field label="Notas">
            <Input value={notes} onChange={(e) => setNotes(e.target.value)} />
          </Field>
          {error ? <Notice tone="error">{error}</Notice> : null}
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
            <p className="px-5 py-12 text-center text-sm text-muted">Sin eventos registrados.</p>
          ) : (
            <div className="max-h-[480px] overflow-y-auto">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-surface">
                  <tr className="text-left text-xs uppercase tracking-wider text-muted">
                    <th className="px-3 py-2 font-medium">Tipo</th>
                    <th className="px-3 py-2 font-medium">V#</th>
                    <th className="px-3 py-2 font-medium">Tiempo</th>
                    <th className="px-3 py-2 font-medium">Notas</th>
                    <th className="px-3 py-2">
                      <span className="sr-only">Acciones</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {events.map((ev) => (
                    <tr key={ev.id} className="border-t border-border/60 hover:bg-surface/60">
                      <td className="px-3 py-2">
                        <Badge variant={eventVariant(ev.event_type)}>
                          {pendingIds.has(ev.id) ? <Clock className="h-3 w-3" /> : null}
                          {EVENT_TYPE_LABELS[ev.event_type]}
                        </Badge>
                      </td>
                      <td className="px-3 py-2 tabular text-muted">{ev.lap_number ?? "-"}</td>
                      <td className="px-3 py-2 tabular text-muted">{formatLapTime(ev.elapsed_ms)}</td>
                      <td className="px-3 py-2 text-xs text-muted">{ev.notes || "-"}</td>
                      <td className="px-3 py-2 text-right">
                        <button
                          type="button"
                          onClick={() => onDelete(ev)}
                          className="rounded p-1 text-muted hover:bg-danger/10 hover:text-danger"
                          aria-label="Borrar evento"
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
      </Card>
    </div>
  );
}
