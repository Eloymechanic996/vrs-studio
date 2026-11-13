"use client";

import { Fragment, useState } from "react";
import { ChevronDown, ChevronRight, Clock, Pencil, RefreshCw, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { TRACK_STATE_LABELS } from "@/lib/labels";
import { retryOp } from "@/lib/outbox";
import { formatDelta, lapDelta } from "@/lib/stats";
import type { Lap, LapSector, TrackState } from "@/lib/supabase/types";
import { cn, formatLapTime } from "@/lib/utils";

function trackStateVariant(s: TrackState) {
  if (s === "Green Flag") return "success" as const;
  if (s === "Yellow Flag") return "warning" as const;
  if (s === "Red Flag") return "danger" as const;
  if (s === "Safety Car" || s === "Virtual Safety Car") return "info" as const;
  return "muted" as const;
}

export function LapTable({
  laps,
  bestLapId,
  bestMs,
  sectorsByLap,
  bestSectors,
  useSectors,
  sectorsCount,
  pendingIds,
  failed,
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
  pendingIds: Set<string>;
  failed: Map<string, string>;
  onEdit: (lap: Lap) => void;
  onDelete: (lap: Lap) => void;
}) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  return (
    <table className="w-full text-sm">
      <thead className="sticky top-0 z-10 bg-surface">
        <tr className="text-left text-xs uppercase tracking-wider text-muted">
          <th className="px-3 py-2 font-medium">#</th>
          <th className="px-3 py-2 font-medium">Tiempo</th>
          <th className="px-3 py-2 font-medium">Δ</th>
          <th className="px-3 py-2 font-medium">Estado</th>
          <th className="px-3 py-2">
            <span className="sr-only">Acciones</span>
          </th>
        </tr>
      </thead>
      <tbody>
        {laps.map((lap) => {
          const isBest = lap.id === bestLapId;
          const delta = lapDelta(lap.lap_time_ms, bestMs);
          const lapSectors = sectorsByLap.get(lap.id) ?? [];
          const hasSectors = useSectors && lapSectors.length > 0;
          const expanded = expandedId === lap.id;
          const pending = pendingIds.has(lap.id);
          const error = failed.get(lap.id);
          return (
            <Fragment key={lap.id}>
              <tr className="border-t border-border/60 hover:bg-surface/60">
                <td className="px-3 py-2 tabular text-muted">
                  <button
                    type="button"
                    disabled={!hasSectors}
                    aria-expanded={hasSectors ? expanded : undefined}
                    onClick={() => setExpandedId(expanded ? null : lap.id)}
                    className={hasSectors ? "flex items-center gap-1 hover:text-foreground" : ""}
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
                <td className={cn("px-3 py-2 tabular font-medium", isBest && "text-accent")}>
                  {formatLapTime(lap.lap_time_ms)}
                </td>
                <td
                  className={cn(
                    "px-3 py-2 tabular text-xs",
                    isBest && "text-accent font-semibold",
                    !isBest && delta !== null && delta > 0 && "text-warning",
                  )}
                >
                  {isBest ? "—" : formatDelta(delta)}
                </td>
                <td className="px-3 py-2">
                  {error ? (
                    <Badge variant="danger" title={error}>
                      Error
                    </Badge>
                  ) : pending ? (
                    <Badge variant="info" title="Guardada en el dispositivo, pendiente de enviar">
                      <Clock className="h-3 w-3" />
                      Pendiente
                    </Badge>
                  ) : (
                    <Badge variant={trackStateVariant(lap.track_state)}>
                      {TRACK_STATE_LABELS[lap.track_state]}
                    </Badge>
                  )}
                </td>
                <td className="whitespace-nowrap px-3 py-2 text-right">
                  {error ? (
                    <button
                      type="button"
                      onClick={() => retryOp(lap.id)}
                      className="rounded p-1 text-muted hover:bg-surface-hover hover:text-foreground"
                      aria-label="Reintentar envío"
                    >
                      <RefreshCw className="h-3.5 w-3.5" />
                    </button>
                  ) : null}
                  {!pending ? (
                    <button
                      type="button"
                      onClick={() => onEdit(lap)}
                      className="rounded p-1 text-muted hover:bg-surface-hover hover:text-foreground"
                      aria-label={`Editar vuelta ${lap.lap_number}`}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                  ) : null}
                  <button
                    type="button"
                    onClick={() => onDelete(lap)}
                    className="rounded p-1 text-muted hover:bg-danger/10 hover:text-danger"
                    aria-label={`Borrar vuelta ${lap.lap_number}`}
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
                        const sec = lapSectors.find((s) => s.sector_number === i + 1);
                        const isBestSec = sec && bestSectors[i] === sec.time_ms;
                        return (
                          <div
                            key={i}
                            className={cn(
                              "rounded border border-border/60 bg-surface px-2 py-1",
                              isBestSec && "border-accent/50 bg-accent/10",
                            )}
                          >
                            <span className="mr-1 text-muted">S{i + 1}</span>
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
            </Fragment>
          );
        })}
      </tbody>
    </table>
  );
}
