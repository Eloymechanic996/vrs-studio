"use client";

import { useState, useTransition } from "react";
import { updateLap } from "@/app/(app)/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, Input, Select } from "@/components/ui/input";
import { Notice } from "@/components/ui/notice";
import { TRACK_STATE_LABELS, TRACK_STATES } from "@/lib/labels";
import type { Lap, LapSector, TrackState } from "@/lib/supabase/types";
import { formatLapTime, parseLapTime } from "@/lib/utils";

export function EditLapDialog({
  lap,
  sessionId,
  sectorsCount,
  sectors,
  onClose,
}: {
  lap: Lap;
  sessionId: string;
  sectorsCount: number;
  sectors: LapSector[];
  onClose: () => void;
}) {
  const editSectors = sectorsCount > 0 && sectors.length > 0;
  const [time, setTime] = useState(formatLapTime(lap.lap_time_ms));
  const [sectorTimes, setSectorTimes] = useState(() =>
    Array.from({ length: sectorsCount }, (_, i) => {
      const s = sectors.find((x) => x.sector_number === i + 1);
      return s ? formatLapTime(s.time_ms) : "";
    }),
  );
  const [state, setState] = useState<TrackState>(lap.track_state);
  const [notes, setNotes] = useState(lap.notes ?? "");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const parsedSectors = editSectors ? sectorTimes.map(parseLapTime) : null;
  const sectorSum =
    parsedSectors && parsedSectors.every((s) => s !== null && s > 0)
      ? (parsedSectors as number[]).reduce((a, b) => a + b, 0)
      : null;

  function save() {
    const ms = editSectors ? sectorSum : parseLapTime(time);
    if (ms === null || ms <= 0) {
      setError("Formato no válido. Usa mm:ss.SSS o ss.SSS.");
      return;
    }
    startTransition(async () => {
      try {
        const result = await updateLap({
          session_id: sessionId,
          lap_id: lap.id,
          lap_time_ms: ms,
          track_state: state,
          notes: notes || null,
          sectors: editSectors ? (parsedSectors as number[]) : null,
        });
        if (result.ok) onClose();
        else setError(result.error);
      } catch {
        setError("Sin conexión: inténtalo de nuevo cuando tengas cobertura.");
      }
    });
  }

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4"
      role="dialog"
      aria-modal="true"
      aria-label={`Editar vuelta ${lap.lap_number}`}
      onClick={onClose}
    >
      <Card className="w-full max-w-md bg-surface" onClick={(e) => e.stopPropagation()}>
        <CardHeader>
          <CardTitle>Editar vuelta #{lap.lap_number}</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3">
          {editSectors ? (
            <>
              <div className="grid grid-cols-2 gap-3">
                {sectorTimes.map((value, i) => (
                  <Field key={i} label={`Sector ${i + 1}`}>
                    <Input
                      value={value}
                      onChange={(e) =>
                        setSectorTimes((list) => list.map((v, j) => (j === i ? e.target.value : v)))
                      }
                    />
                  </Field>
                ))}
              </div>
              <p className="text-xs text-muted">
                Tiempo de vuelta:{" "}
                <span className="tabular text-foreground">
                  {sectorSum !== null ? formatLapTime(sectorSum) : "—"}
                </span>
              </p>
            </>
          ) : (
            <Field label="Tiempo">
              <Input value={time} onChange={(e) => setTime(e.target.value)} />
            </Field>
          )}
          <Field label="Estado de pista">
            <Select value={state} onChange={(e) => setState(e.target.value as TrackState)}>
              {TRACK_STATES.map((s) => (
                <option key={s} value={s}>
                  {TRACK_STATE_LABELS[s]}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Notas">
            <Input value={notes} onChange={(e) => setNotes(e.target.value)} />
          </Field>
          {error ? <Notice tone="error">{error}</Notice> : null}
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
