"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import {
  ChevronDown,
  ChevronRight,
  Pause,
  Pencil,
  Play,
  Plus,
  RotateCcw,
  Trash2,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, Input, Select } from "@/components/ui/input";
import { deleteLap, recordLap, updateLap } from "@/app/(app)/actions";
import { formatLapTime, parseLapTime, cn } from "@/lib/utils";
import {
  computeLapStats,
  formatDelta,
  lapDelta,
  theoreticalBestLap,
  bestSectorTimes,
} from "@/lib/stats";
import type { Database, TrackState } from "@/lib/supabase/types";
import { LapChart } from "@/components/lap-chart";

type Session = Database["public"]["Tables"]["sessions"]["Row"];
type Lap = Database["public"]["Tables"]["laps"]["Row"];
type LapSector = Database["public"]["Tables"]["lap_sectors"]["Row"];

const TRACK_STATES: TrackState[] = [
  "Green Flag",
  "Yellow Flag",
  "Red Flag",
  "Safety Car",
  "Virtual Safety Car",
  "Pit Lane",
];

function trackStateVariant(s: TrackState) {
  if (s === "Green Flag") return "success" as const;
  if (s === "Yellow Flag") return "warning" as const;
  if (s === "Red Flag") return "accent" as const;
  if (s === "Safety Car" || s === "Virtual Safety Car") return "info" as const;
  return "muted" as const;
}

export function TimingTab({
  session,
  laps,
  sectors,
}: {
  session: Session;
  laps: Lap[];
  sectors: LapSector[];
}) {
  const sectorsCount = session.sectors_count ?? 0;
  const useSectors = sectorsCount > 0;

  // Running timer state
  const [running, setRunning] = useState(false);
  const [elapsedTotal, setElapsedTotal] = useState(0);
  const [elapsedLap, setElapsedLap] = useState(0);
  const [elapsedSector, setElapsedSector] = useState(0);
  const totalAtStartRef = useRef(0);
  const lapAtStartRef = useRef(0);
  const sectorAtStartRef = useRef(0);
  const startMsRef = useRef<number | null>(null);
  const rafRef = useRef<number | null>(null);

  // Sector accumulator for in-progress lap
  const [pendingSectors, setPendingSectors] = useState<number[]>([]);

  const [trackState, setTrackState] = useState<TrackState>("Green Flag");
  const [manualTime, setManualTime] = useState("");
  const [note, setNote] = useState("");
  const [, startTransition] = useTransition();
  const [editingLap, setEditingLap] = useState<Lap | null>(null);

  // RAF loop
  useEffect(() => {
    if (!running) return;
    let cancelled = false;
    const tick = () => {
      if (cancelled || startMsRef.current === null) return;
      const now = performance.now();
      const delta = now - startMsRef.current;
      setElapsedTotal(totalAtStartRef.current + delta);
      setElapsedLap(lapAtStartRef.current + delta);
      setElapsedSector(sectorAtStartRef.current + delta);
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      cancelled = true;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [running]);

  // Spacebar shortcut: lap (or next sector if sectors enabled)
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (
        e.code === "Space" &&
        !(e.target instanceof HTMLInputElement) &&
        !(e.target instanceof HTMLTextAreaElement) &&
        !(e.target instanceof HTMLSelectElement)
      ) {
        e.preventDefault();
        if (running) {
          if (useSectors) recordCurrentSector();
          else recordCurrentLap();
        }
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running, useSectors, elapsedLap, elapsedSector, pendingSectors, trackState, note]);

  function toggleRun() {
    if (running) {
      const now = performance.now();
      const delta =
        startMsRef.current !== null ? now - startMsRef.current : 0;
      totalAtStartRef.current += delta;
      lapAtStartRef.current += delta;
      sectorAtStartRef.current += delta;
      startMsRef.current = null;
      setRunning(false);
    } else {
      startMsRef.current = performance.now();
      setRunning(true);
    }
  }

  function resetTimer() {
    setRunning(false);
    startMsRef.current = null;
    totalAtStartRef.current = 0;
    lapAtStartRef.current = 0;
    sectorAtStartRef.current = 0;
    setElapsedTotal(0);
    setElapsedLap(0);
    setElapsedSector(0);
    setPendingSectors([]);
  }

  function rebaseLap() {
    lapAtStartRef.current -= elapsedLap;
    setElapsedLap(0);
  }
  function rebaseSector() {
    sectorAtStartRef.current -= elapsedSector;
    setElapsedSector(0);
  }

  function recordCurrentSector() {
    const secTime = Math.round(elapsedSector);
    if (secTime <= 0) return;

    const nextSectors = [...pendingSectors, secTime];
    rebaseSector();

    if (nextSectors.length >= sectorsCount) {
      // Lap complete: sum of sectors as canonical lap time.
      const lapTime = nextSectors.reduce((a, b) => a + b, 0);
      const total = Math.round(elapsedTotal);
      rebaseLap();
      setPendingSectors([]);
      const nextNumber = (laps[laps.length - 1]?.lap_number ?? 0) + 1;
      startTransition(async () => {
        await recordLap({
          session_id: session.id,
          lap_number: nextNumber,
          lap_time_ms: lapTime,
          total_time_ms: total,
          track_state: trackState,
          notes: note || undefined,
          sectors: nextSectors,
        });
        setNote("");
      });
    } else {
      setPendingSectors(nextSectors);
    }
  }

  function recordCurrentLap() {
    const lapTime = Math.round(elapsedLap);
    const total = Math.round(elapsedTotal);
    if (lapTime <= 0) return;
    rebaseLap();
    rebaseSector();

    const nextNumber = (laps[laps.length - 1]?.lap_number ?? 0) + 1;
    startTransition(async () => {
      await recordLap({
        session_id: session.id,
        lap_number: nextNumber,
        lap_time_ms: lapTime,
        total_time_ms: total,
        track_state: trackState,
        notes: note || undefined,
      });
      setNote("");
    });
  }

  function recordManualLap() {
    const ms = parseLapTime(manualTime);
    if (ms === null) return;
    const total = Math.round(elapsedTotal) + ms;
    const nextNumber = (laps[laps.length - 1]?.lap_number ?? 0) + 1;
    startTransition(async () => {
      await recordLap({
        session_id: session.id,
        lap_number: nextNumber,
        lap_time_ms: ms,
        total_time_ms: total,
        track_state: trackState,
        notes: note || undefined,
      });
      setManualTime("");
      setNote("");
    });
  }

  function onDelete(lapId: string) {
    startTransition(async () => {
      await deleteLap(session.id, lapId);
    });
  }

  const stats = computeLapStats(laps);
  const bestLapId = stats.bestId;
  const bestSectors = useSectors ? bestSectorTimes(sectors, sectorsCount) : [];
  const theoBest = useSectors
    ? theoreticalBestLap(bestSectors)
    : null;

  // Index sectors by lap id for table rendering
  const sectorsByLap = new Map<string, LapSector[]>();
  for (const s of sectors) {
    const arr = sectorsByLap.get(s.lap_id) ?? [];
    arr.push(s);
    sectorsByLap.set(s.lap_id, arr);
  }
  for (const arr of sectorsByLap.values()) {
    arr.sort((a, b) => a.sector_number - b.sector_number);
  }

  const sectorButtonLabel = useSectors
    ? `Sector ${pendingSectors.length + 1}/${sectorsCount}${
        pendingSectors.length + 1 === sectorsCount ? " (vuelta)" : ""
      }`
    : "Vuelta";

  return (
    <div className="flex flex-col gap-4 lg:flex-row">
      <div className="flex-1 space-y-4">
        <Card>
          <CardHeader className="border-b-0 pb-2">
            <CardTitle className="text-xs uppercase tracking-widest text-muted">
              Cronometro
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col items-center gap-6 pt-2">
            <div className="text-center">
              <p className="text-xs uppercase tracking-widest text-muted">
                {useSectors ? "Sector en curso" : "Vuelta en curso"}
              </p>
              <p
                className={cn(
                  "tabular text-6xl font-bold tracking-tight sm:text-7xl",
                  running ? "text-accent" : "text-foreground",
                )}
              >
                {formatLapTime(useSectors ? elapsedSector : elapsedLap)}
              </p>
              <div className="mt-1 flex flex-wrap justify-center gap-3 text-xs text-muted">
                <span>
                  Vuelta:{" "}
                  <span className="tabular">{formatLapTime(elapsedLap)}</span>
                </span>
                <span>
                  Total:{" "}
                  <span className="tabular">{formatLapTime(elapsedTotal)}</span>
                </span>
              </div>
              {useSectors && pendingSectors.length > 0 ? (
                <div className="mt-2 flex flex-wrap justify-center gap-1.5">
                  {pendingSectors.map((s, i) => (
                    <Badge key={i} variant="info">
                      S{i + 1}: {formatLapTime(s)}
                    </Badge>
                  ))}
                </div>
              ) : null}
            </div>

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
                    <Play className="h-5 w-5" />{" "}
                    {elapsedTotal > 0 ? "Reanudar" : "Iniciar"}
                  </>
                )}
              </Button>
              <Button
                onClick={useSectors ? recordCurrentSector : recordCurrentLap}
                size="xl"
                disabled={
                  useSectors ? elapsedSector <= 0 : elapsedLap <= 0
                }
                className="flex-1 min-w-[140px]"
              >
                <Plus className="h-5 w-5" /> {sectorButtonLabel}
              </Button>
              <Button
                onClick={resetTimer}
                size="xl"
                variant="outline"
                aria-label="Reset"
              >
                <RotateCcw className="h-5 w-5" />
              </Button>
            </div>
            <p className="text-[11px] text-muted/70">
              Atajo: pulsa <kbd className="rounded border border-border bg-surface px-1.5 py-0.5 text-[10px] font-mono">Espacio</kbd>{" "}
              para registrar {useSectors ? "sector" : "vuelta"}.
            </p>
          </CardContent>
        </Card>

        {useSectors && theoBest !== null ? (
          <Card>
            <CardContent className="flex flex-wrap items-center justify-between gap-2 py-4">
              <div>
                <p className="text-xs uppercase tracking-wider text-muted/70">
                  Vuelta teorica (suma mejores sectores)
                </p>
                <p className="tabular text-2xl font-bold text-accent">
                  {formatLapTime(theoBest)}
                </p>
              </div>
              <div className="flex flex-wrap gap-2 text-xs">
                {bestSectors.map((s, i) =>
                  s !== null ? (
                    <Badge key={i} variant="info">
                      S{i + 1}: {formatLapTime(s)}
                    </Badge>
                  ) : (
                    <Badge key={i} variant="muted">
                      S{i + 1}: —
                    </Badge>
                  ),
                )}
              </div>
            </CardContent>
          </Card>
        ) : null}

        {laps.length >= 2 ? (
          <Card>
            <CardHeader>
              <CardTitle>Evolucion de tiempos</CardTitle>
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
          <CardContent className="grid gap-3 sm:grid-cols-[1fr_1fr_auto]">
            <Field label="Tiempo (mm:ss.SSS)">
              <Input
                value={manualTime}
                onChange={(e) => setManualTime(e.target.value)}
                placeholder="01:23.456"
              />
            </Field>
            <Field label="Estado pista">
              <Select
                value={trackState}
                onChange={(e) => setTrackState(e.target.value as TrackState)}
              >
                {TRACK_STATES.map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </Select>
            </Field>
            <Field label="Anadir" className="self-end">
              <Button onClick={recordManualLap} disabled={!manualTime} size="md">
                <Plus className="h-4 w-4" />
                Anadir
              </Button>
            </Field>
            <Field label="Notas vuelta" className="sm:col-span-3">
              <Input
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Comentario opcional para la proxima vuelta"
              />
            </Field>
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
                Aun no hay vueltas registradas.
              </p>
            ) : (
              <div className="max-h-[520px] overflow-y-auto">
                <LapTable
                  laps={laps}
                  bestLapId={bestLapId}
                  bestMs={stats.bestMs}
                  sectorsByLap={sectorsByLap}
                  bestSectors={bestSectors}
                  useSectors={useSectors}
                  sectorsCount={sectorsCount}
                  onEdit={(l) => setEditingLap(l)}
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
          onClose={() => setEditingLap(null)}
        />
      ) : null}
    </div>
  );
}

function LapTable({
  laps,
  bestLapId,
  bestMs,
  sectorsByLap,
  bestSectors,
  useSectors,
  sectorsCount,
  onEdit,
  onDelete,
}: {
  laps: Lap[];
  bestLapId: string | null;
  bestMs: number | null;
  sectorsByLap: Map<string, LapSector[]>;
  bestSectors: (number | null)[];
  useSectors: boolean;
  sectorsCount: number;
  onEdit: (lap: Lap) => void;
  onDelete: (lapId: string) => void;
}) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  return (
    <table className="w-full text-sm">
      <thead className="sticky top-0 bg-surface/95 backdrop-blur">
        <tr className="text-left text-xs uppercase tracking-wider text-muted">
          <th className="px-3 py-2 font-medium">#</th>
          <th className="px-3 py-2 font-medium">Tiempo</th>
          <th className="px-3 py-2 font-medium">Δ</th>
          <th className="px-3 py-2 font-medium">Estado</th>
          <th className="px-3 py-2"></th>
        </tr>
      </thead>
      <tbody>
        {laps.map((lap) => {
          const isBest = lap.id === bestLapId;
          const delta = lapDelta(lap.lap_time_ms, bestMs);
          const lapSectors = sectorsByLap.get(lap.id) ?? [];
          const hasSectors = useSectors && lapSectors.length > 0;
          const expanded = expandedId === lap.id;
          return (
            <>
              <tr
                key={lap.id}
                className="border-t border-border/60 hover:bg-surface/60"
              >
                <td className="px-3 py-2 tabular text-muted">
                  <button
                    onClick={() =>
                      hasSectors && setExpandedId(expanded ? null : lap.id)
                    }
                    className={
                      hasSectors
                        ? "flex items-center gap-1 hover:text-foreground"
                        : ""
                    }
                  >
                    {hasSectors ? (
                      expanded ? (
                        <ChevronDown className="h-3 w-3" />
                      ) : (
                        <ChevronRight className="h-3 w-3" />
                      )
                    ) : null}
                    {String(lap.lap_number).padStart(2, "0")}
                  </button>
                </td>
                <td
                  className={cn(
                    "px-3 py-2 tabular font-medium",
                    isBest && "text-accent",
                  )}
                >
                  {formatLapTime(lap.lap_time_ms)}
                </td>
                <td
                  className={cn(
                    "px-3 py-2 tabular text-xs",
                    isBest && "text-accent font-semibold",
                    !isBest && delta !== null && delta > 0 && "text-amber-400",
                  )}
                >
                  {isBest ? "—" : formatDelta(delta)}
                </td>
                <td className="px-3 py-2">
                  <Badge
                    variant={trackStateVariant(lap.track_state as TrackState)}
                  >
                    {lap.track_state}
                  </Badge>
                </td>
                <td className="px-3 py-2 text-right">
                  <button
                    onClick={() => onEdit(lap)}
                    className="rounded p-1 text-muted hover:text-foreground hover:bg-surface-hover"
                    aria-label="Editar"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => onDelete(lap.id)}
                    className="rounded p-1 text-muted hover:text-red-400 hover:bg-red-500/10"
                    aria-label="Borrar"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </td>
              </tr>
              {hasSectors && expanded ? (
                <tr className="border-t border-border/40 bg-surface/30">
                  <td colSpan={5} className="px-6 py-2">
                    <div className="flex flex-wrap gap-2 text-xs">
                      {Array.from({ length: sectorsCount }, (_, i) => {
                        const sec = lapSectors.find(
                          (s) => s.sector_number === i + 1,
                        );
                        const isBestSec =
                          sec && bestSectors[i] === sec.time_ms;
                        return (
                          <div
                            key={i}
                            className={cn(
                              "rounded border border-border/60 bg-surface px-2 py-1",
                              isBestSec && "border-accent/50 bg-accent/10",
                            )}
                          >
                            <span className="mr-1 text-muted/70">
                              S{i + 1}
                            </span>
                            <span
                              className={cn(
                                "tabular font-medium",
                                isBestSec ? "text-accent" : "text-foreground",
                              )}
                            >
                              {sec ? formatLapTime(sec.time_ms) : "—"}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </td>
                </tr>
              ) : null}
            </>
          );
        })}
      </tbody>
    </table>
  );
}

function EditLapDialog({
  lap,
  sessionId,
  onClose,
}: {
  lap: Lap;
  sessionId: string;
  onClose: () => void;
}) {
  const [time, setTime] = useState(formatLapTime(lap.lap_time_ms));
  const [state, setState] = useState<TrackState>(lap.track_state as TrackState);
  const [notes, setNotes] = useState(lap.notes ?? "");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function save() {
    const ms = parseLapTime(time);
    if (ms === null) {
      setError("Formato invalido. Usa mm:ss.SSS o ss.SSS");
      return;
    }
    startTransition(async () => {
      try {
        await updateLap({
          session_id: sessionId,
          lap_id: lap.id,
          lap_time_ms: ms,
          track_state: state,
          notes: notes || null,
        });
        onClose();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Error al guardar");
      }
    });
  }

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4"
      onClick={onClose}
    >
      <Card
        className="w-full max-w-md"
        onClick={(e) => e.stopPropagation()}
      >
        <CardHeader>
          <CardTitle>Editar vuelta #{lap.lap_number}</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3">
          <Field label="Tiempo">
            <Input value={time} onChange={(e) => setTime(e.target.value)} />
          </Field>
          <Field label="Estado pista">
            <Select
              value={state}
              onChange={(e) => setState(e.target.value as TrackState)}
            >
              {TRACK_STATES.map((s) => (
                <option key={s}>{s}</option>
              ))}
            </Select>
          </Field>
          <Field label="Notas">
            <Input value={notes} onChange={(e) => setNotes(e.target.value)} />
          </Field>
          {error ? (
            <p className="rounded-md border border-red-500/40 bg-red-500/10 px-3 py-2 text-xs text-red-300">
              {error}
            </p>
          ) : null}
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" onClick={onClose} disabled={pending}>
              Cancelar
            </Button>
            <Button onClick={save} disabled={pending}>
              {pending ? "Guardando..." : "Guardar"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
