"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { CircleParking, Pause, Play, Plus, RotateCcw, ShieldAlert, ShieldCheck, Undo2 } from "lucide-react";
import { deleteLap } from "@/app/(app)/actions";
import { LapChart } from "@/components/lap-chart";
import { useSettings } from "@/components/settings-provider";
import { useToast } from "@/components/toast";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, Input, Select } from "@/components/ui/input";
import type { Stopwatch } from "@/hooks/use-stopwatch";
import { useUndoableDelete } from "@/hooks/use-undoable-delete";
import { TRACK_STATE_LABELS, TRACK_STATES } from "@/lib/labels";
import { enqueue, removeOp } from "@/lib/outbox";
import { bestSectorTimes, computeLapStats, theoreticalBestLap } from "@/lib/stats";
import {
  applyManualLap,
  markLap,
  markSector,
  reset,
  start,
  pause,
  totalElapsed,
  lapElapsed,
  type MarkResult,
} from "@/lib/stopwatch";
import type { EventType, Lap, LapSector, Session, TrackState } from "@/lib/supabase/types";
import { formatLapTime, lapTimeProblem, MAX_LAP_MS, parseLapTime } from "@/lib/utils";
import { EditLapDialog } from "./edit-lap-dialog";
import { LapTable } from "./lap-table";
import { StopwatchDisplay } from "./stopwatch-display";

const QUICK_EVENTS: {
  type: EventType;
  label: string;
  next: TrackState;
  icon: typeof CircleParking;
}[] = [
  { type: "Pit In", label: "Pit In", next: "Pit Lane", icon: CircleParking },
  { type: "Pit Out", label: "Pit Out", next: "Green Flag", icon: Undo2 },
  { type: "Safety Car Sale", label: "Sale SC", next: "Safety Car", icon: ShieldAlert },
  { type: "Safety Car Entra", label: "Entra SC", next: "Green Flag", icon: ShieldCheck },
];

// Fuera del componente: quickEvent solo se ejecuta al pulsar, nunca al renderizar.
const timestamp = () => Date.now();

/** Dos pulsaciones del mismo evento rápido en menos de esto son un doble toque. */
const QUICK_EVENT_DEBOUNCE_MS = 2000;

export function TimingTab({
  session,
  laps: allLaps,
  sectors,
  pendingIds,
  failed,
  stopwatch,
  active,
}: {
  session: Session;
  laps: Lap[];
  sectors: LapSector[];
  pendingIds: Set<string>;
  failed: Map<string, string>;
  stopwatch: Stopwatch;
  active: boolean;
}) {
  const router = useRouter();
  const toast = useToast();
  const { settings } = useSettings();
  const { state, current, commit } = stopwatch;

  const sectorsCount = session.sectors_count ?? 0;
  const useSectors = sectorsCount > 0;

  const [trackState, setTrackState] = useState<TrackState>("Green Flag");
  const [note, setNote] = useState("");
  const [manualTime, setManualTime] = useState("");
  const [editingLap, setEditingLap] = useState<Lap | null>(null);

  const { hidden, remove } = useUndoableDelete(async (lapId) => {
    const result = await deleteLap(session.id, lapId).catch(() => null);
    if (!result?.ok) {
      toast({ message: result?.error ?? "Sin conexión: no se pudo borrar la vuelta.", tone: "error" });
    }
    router.refresh();
  });

  const laps = useMemo(() => allLaps.filter((l) => !hidden.has(l.id)), [allLaps, hidden]);
  const lastLap = laps[laps.length - 1];

  function saveLap(lapMs: number, totalMs: number, lapSectors: number[] | null) {
    enqueue({
      kind: "lap",
      id: crypto.randomUUID(),
      sessionId: session.id,
      createdAt: new Date().toISOString(),
      lapTimeMs: lapMs,
      totalTimeMs: totalMs,
      trackState,
      notes: note.trim() || null,
      sectors: lapSectors,
    });
    setNote("");
  }

  function buzz() {
    if (settings.vibrate) navigator.vibrate?.(35);
  }

  function mark() {
    const now = Date.now();
    const minLapMs = settings.minLapSeconds * 1000;
    const result: MarkResult = useSectors
      ? markSector(current(), now, sectorsCount, minLapMs / sectorsCount)
      : markLap(current(), now, minLapMs);

    if (result.kind === "ignored") {
      toast({ message: "Pulsación ignorada: tiempo inferior al mínimo configurado." });
      return;
    }
    if (result.kind === "lap" && result.lap.lapMs > MAX_LAP_MS) {
      toast({
        message:
          "La vuelta en curso pasa de una hora: parece que el cronómetro se quedó en marcha. Ponlo a cero y vuelve a empezar.",
        tone: "error",
        duration: 6000,
      });
      return;
    }
    commit(result.state);
    buzz();
    if (result.kind === "lap") {
      saveLap(result.lap.lapMs, result.lap.totalMs, result.lap.sectors);
    }
  }

  // El atajo de teclado siempre debe usar la versión más reciente de mark.
  const markRef = useRef(mark);
  useEffect(() => {
    markRef.current = mark;
  });

  // Con el diálogo de editar abierto, Espacio no debe marcar vueltas por detrás.
  const editingRef = useRef(false);
  useEffect(() => {
    editingRef.current = editingLap !== null;
  }, [editingLap]);

  useEffect(() => {
    if (!active) return;
    function onKey(e: KeyboardEvent) {
      if (e.code !== "Space" || e.repeat || editingRef.current) return;
      const target = e.target;
      if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement) {
        return;
      }
      // Un desplegable con el foco (p. ej. tras elegir el estado de pista) no
      // debe tragarse el Espacio: se le quita el foco y se marca igualmente.
      if (target instanceof HTMLSelectElement) target.blur();
      e.preventDefault();
      if (current().runningSince !== null) markRef.current();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [active, current]);

  function toggleRun() {
    const now = Date.now();
    const s = current();
    if (
      s.runningSince !== null &&
      trackState === "Pit Lane" &&
      !confirm(
        "Estás en boxes: si pausas, el tiempo de la parada no se cuenta. Lo normal es dejarlo correr y pulsar Pit Out al salir. ¿Pausar de todos modos?",
      )
    ) {
      return;
    }
    commit(s.runningSince === null ? start(s, now) : pause(s, now));
  }

  function resetTimer() {
    const s = current();
    const now = Date.now();
    if (
      (s.runningSince !== null || lapElapsed(s, now) > 0) &&
      !confirm("¿Parar y poner a cero la vuelta en curso? Las vueltas ya registradas no se borran.")
    ) {
      return;
    }
    commit(reset(s, lastLap?.total_time_ms ?? 0, now, MAX_LAP_MS));
  }

  function recordManualLap() {
    const ms = parseLapTime(manualTime);
    const problem = lapTimeProblem(ms, settings.minLapSeconds);
    if (problem !== null || ms === null) {
      toast({ message: problem ?? "Tiempo no válido.", tone: "error", duration: 5000 });
      return;
    }
    const { state: next, totalMs } = applyManualLap(
      current(),
      ms,
      lastLap?.total_time_ms ?? 0,
      Date.now(),
    );
    commit(next);
    saveLap(ms, totalMs, null);
    setManualTime("");
  }

  // Último evento rápido, para ignorar dobles toques del mismo botón.
  const lastQuick = useRef<{ type: EventType; at: number } | null>(null);

  function quickEvent(type: EventType, nextState: TrackState) {
    const now = timestamp();
    if (type === "Pit In" && trackState === "Pit Lane") {
      toast({ message: "Ya estás en boxes. Pulsa Pit Out al salir." });
      return;
    }
    const prev = lastQuick.current;
    if (prev && prev.type === type && now - prev.at < QUICK_EVENT_DEBOUNCE_MS) {
      return;
    }
    lastQuick.current = { type, at: now };
    let s = current();
    if (type === "Pit Out" && s.runningSince === null) {
      s = start(s, now);
      commit(s);
    }
    enqueue({
      kind: "event",
      id: crypto.randomUUID(),
      sessionId: session.id,
      createdAt: new Date().toISOString(),
      eventType: type,
      lapNumber: (lastLap?.lap_number ?? 0) + 1,
      elapsedMs: Math.round(totalElapsed(s, now)),
      notes: note.trim() || null,
    });
    setNote("");
    setTrackState(nextState);
    buzz();
    toast({ message: `${type} registrado`, tone: "success", duration: 1800 });
  }

  function onDelete(lap: Lap) {
    if (pendingIds.has(lap.id)) {
      removeOp(lap.id);
      return;
    }
    remove(lap.id, `Vuelta ${lap.lap_number} borrada`);
  }

  const stats = computeLapStats(laps);
  const visibleSectors = useMemo(
    () => sectors.filter((s) => !hidden.has(s.lap_id)),
    [sectors, hidden],
  );
  const bestSectors = useSectors ? bestSectorTimes(visibleSectors, sectorsCount) : [];
  const theoBest = useSectors ? theoreticalBestLap(bestSectors) : null;

  const sectorsByLap = useMemo(() => {
    const map = new Map<string, LapSector[]>();
    for (const s of visibleSectors) {
      const list = map.get(s.lap_id) ?? [];
      list.push(s);
      map.set(s.lap_id, list);
    }
    for (const list of map.values()) list.sort((a, b) => a.sector_number - b.sector_number);
    return map;
  }, [visibleSectors]);

  const running = state.runningSince !== null;
  const hasStarted = running || state.accumulated > state.lapMark;
  const canMark = useSectors ? running || state.accumulated > state.sectorMark : hasStarted;
  const nextSector = state.pendingSectors.length + 1;
  const markLabel = useSectors
    ? `Sector ${nextSector}/${sectorsCount}${nextSector === sectorsCount ? " (vuelta)" : ""}`
    : "Vuelta";

  return (
    <div className="flex flex-col gap-4 lg:flex-row">
      <div className="min-w-0 flex-1 space-y-4">
        <Card>
          <CardHeader className="border-b-0 pb-2">
            <CardTitle className="text-xs uppercase tracking-widest text-muted">
              Cronómetro
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col items-center gap-5 pt-2">
            <StopwatchDisplay state={state} useSectors={useSectors} />

            {useSectors && state.pendingSectors.length > 0 ? (
              <div className="flex flex-wrap justify-center gap-1.5">
                {state.pendingSectors.map((s, i) => (
                  <Badge key={i} variant="info">
                    S{i + 1}: {formatLapTime(s)}
                  </Badge>
                ))}
              </div>
            ) : null}

            <div className="flex w-full max-w-md flex-wrap gap-2">
              <Button
                onClick={toggleRun}
                size="xl"
                variant={running ? "danger" : "success"}
                className="flex-1 min-w-[140px]"
              >
                {running ? (
                  <>
                    <Pause className="h-5 w-5" /> Pausar
                  </>
                ) : (
                  <>
                    <Play className="h-5 w-5" /> {state.accumulated > 0 ? "Reanudar" : "Iniciar"}
                  </>
                )}
              </Button>
              <Button
                onClick={mark}
                size="xl"
                disabled={!canMark}
                className="flex-1 min-w-[140px]"
              >
                <Plus className="h-5 w-5" /> {markLabel}
              </Button>
              <Button onClick={resetTimer} size="xl" variant="outline" aria-label="Poner a cero">
                <RotateCcw className="h-5 w-5" />
              </Button>
            </div>

            <div className="grid w-full max-w-md grid-cols-4 gap-2">
              {QUICK_EVENTS.map((q) => {
                const Icon = q.icon;
                return (
                  <Button
                    key={q.type}
                    variant="secondary"
                    size="sm"
                    className="h-12 flex-col gap-0.5 px-1"
                    onClick={() => quickEvent(q.type, q.next)}
                  >
                    <Icon className="h-4 w-4" />
                    {q.label}
                  </Button>
                );
              })}
            </div>

            <div className="grid w-full max-w-md gap-3 sm:grid-cols-2">
              <Field label="Estado de pista">
                <Select
                  value={trackState}
                  onChange={(e) => {
                    setTrackState(e.target.value as TrackState);
                    // Suelta el foco para que el siguiente Espacio marque la vuelta.
                    e.currentTarget.blur();
                  }}
                >
                  {TRACK_STATES.map((s) => (
                    <option key={s} value={s}>
                      {TRACK_STATE_LABELS[s]}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Nota de la próxima vuelta">
                <Input
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  onKeyDown={(e) => {
                    // Enter o Escape terminan la nota y devuelven el Espacio al cronómetro.
                    if (e.key === "Enter" || e.key === "Escape") e.currentTarget.blur();
                  }}
                  placeholder="Opcional · Enter para terminar"
                  maxLength={500}
                />
              </Field>
            </div>

            <p className="hidden text-xs text-muted sm:block">
              Atajo: pulsa{" "}
              <kbd className="rounded border border-border bg-surface px-1.5 py-0.5 font-mono text-xs">
                Espacio
              </kbd>{" "}
              para registrar {useSectors ? "sector" : "vuelta"}.
            </p>
          </CardContent>
        </Card>

        {useSectors && theoBest !== null ? (
          <Card>
            <CardContent className="flex flex-wrap items-center justify-between gap-2 py-4">
              <div>
                <p className="text-xs uppercase tracking-wider text-muted">
                  Vuelta teórica (suma de mejores sectores)
                </p>
                <p className="tabular text-2xl font-bold text-accent">{formatLapTime(theoBest)}</p>
              </div>
              <div className="flex flex-wrap gap-2 text-xs">
                {bestSectors.map((s, i) => (
                  <Badge key={i} variant={s !== null ? "info" : "muted"}>
                    S{i + 1}: {s !== null ? formatLapTime(s) : "—"}
                  </Badge>
                ))}
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
            <CardTitle>Registrar vuelta manual</CardTitle>
          </CardHeader>
          <CardContent className="flex items-end gap-3">
            <Field label="Tiempo (mm:ss.SSS)" className="flex-1">
              <Input
                value={manualTime}
                onChange={(e) => setManualTime(e.target.value)}
                placeholder="01:23.456"
                inputMode="decimal"
              />
            </Field>
            <Button onClick={recordManualLap} disabled={!manualTime} size="md">
              <Plus className="h-4 w-4" />
              Añadir
            </Button>
          </CardContent>
        </Card>
      </div>

      <div className="lg:w-[520px]">
        <Card>
          <CardHeader>
            <CardTitle>Vueltas ({laps.length})</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {laps.length === 0 ? (
              <p className="px-5 py-12 text-center text-sm text-muted">
                Aún no hay vueltas registradas.
              </p>
            ) : (
              <div className="max-h-[520px] overflow-y-auto">
                <LapTable
                  laps={laps}
                  bestLapId={stats.bestId}
                  bestMs={stats.bestMs}
                  sectorsByLap={sectorsByLap}
                  bestSectors={bestSectors}
                  useSectors={useSectors}
                  sectorsCount={sectorsCount}
                  pendingIds={pendingIds}
                  failed={failed}
                  onEdit={setEditingLap}
                  onDelete={onDelete}
                />
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {editingLap ? (
        <EditLapDialog
          lap={editingLap}
          sessionId={session.id}
          sectorsCount={sectorsCount}
          sectors={sectorsByLap.get(editingLap.id) ?? []}
          onClose={() => setEditingLap(null)}
        />
      ) : null}
    </div>
  );
}
