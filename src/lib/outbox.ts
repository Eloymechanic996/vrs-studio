"use client";

import { useSyncExternalStore } from "react";
import { createClient } from "@/lib/supabase/client";
import type {
  EventType,
  Lap,
  LapEvent,
  LapSector,
  TrackState,
} from "@/lib/supabase/types";

/**
 * Cola local de vueltas y eventos. Todo lo que se marca en pista se guarda aquí
 * primero y se envía después, así que quedarse sin cobertura no pierde datos.
 * Cada operación lleva un id generado aquí, de modo que reenviarla no duplica.
 */
interface BaseOp {
  id: string;
  sessionId: string;
  createdAt: string;
  error?: string;
  synced?: boolean;
  syncedAt?: number;
}

export interface LapOp extends BaseOp {
  kind: "lap";
  lapTimeMs: number;
  totalTimeMs: number;
  trackState: TrackState;
  notes: string | null;
  sectors: number[] | null;
}

export interface EventOp extends BaseOp {
  kind: "event";
  eventType: EventType;
  lapNumber: number | null;
  elapsedMs: number;
  notes: string | null;
}

export type OutboxOp = LapOp | EventOp;

const STORAGE_KEY = "vrs:outbox:v1";
const SYNCED_TTL_MS = 2 * 60 * 1000;
const EMPTY: OutboxOp[] = [];

let ops: OutboxOp[] | null = null;
let flushing: Promise<void> | null = null;
const listeners = new Set<() => void>();
const afterSyncListeners = new Set<() => void>();

function read(): OutboxOp[] {
  if (ops !== null) return ops;
  if (typeof window === "undefined") return EMPTY;
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]");
    ops = Array.isArray(parsed) ? parsed : [];
  } catch {
    ops = [];
  }
  return ops ?? EMPTY;
}

function write(next: OutboxOp[]) {
  ops = next;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // Sin almacenamiento disponible la cola sigue viva en memoria.
  }
  listeners.forEach((l) => l());
}

function patch(id: string, change: Partial<OutboxOp>) {
  write(read().map((op) => (op.id === id ? ({ ...op, ...change } as OutboxOp) : op)));
}

export function enqueue(op: OutboxOp) {
  write([...read(), op]);
  void flushOutbox();
}

export function removeOp(id: string) {
  write(read().filter((op) => op.id !== id));
}

export function retryOp(id: string) {
  patch(id, { error: undefined });
  void flushOutbox();
}

/** Retira lo ya confirmado y visible en los datos del servidor. */
export function pruneSynced(serverIds: Set<string>) {
  const now = Date.now();
  const current = read();
  const next = current.filter(
    (op) => !(op.synced && (serverIds.has(op.id) || now - (op.syncedAt ?? 0) > SYNCED_TTL_MS)),
  );
  if (next.length !== current.length) write(next);
}

export function onOutboxSynced(listener: () => void) {
  afterSyncListeners.add(listener);
  return () => {
    afterSyncListeners.delete(listener);
  };
}

function isTransient(error: { code?: string; message?: string }): boolean {
  if (typeof navigator !== "undefined" && !navigator.onLine) return true;
  if (!error.code) return true;
  return error.code.startsWith("PGRST3");
}

async function sendOp(op: OutboxOp) {
  const supabase = createClient();
  if (op.kind === "lap") {
    const { error } = await supabase.rpc("record_lap", {
      p_id: op.id,
      p_session_id: op.sessionId,
      p_lap_time_ms: op.lapTimeMs,
      p_total_time_ms: op.totalTimeMs,
      p_track_state: op.trackState,
      p_notes: op.notes ?? undefined,
      p_sectors: op.sectors ?? undefined,
    });
    return error;
  }
  const { error } = await supabase.from("events").upsert(
    {
      id: op.id,
      session_id: op.sessionId,
      event_type: op.eventType,
      lap_number: op.lapNumber,
      elapsed_ms: op.elapsedMs,
      notes: op.notes,
    },
    { onConflict: "id", ignoreDuplicates: true },
  );
  return error;
}

async function runFlush() {
  let sent = false;
  for (const op of read().filter((o) => !o.synced && !o.error)) {
    let error: { code?: string; message?: string } | null = null;
    try {
      error = await sendOp(op);
    } catch (e) {
      error = { message: e instanceof Error ? e.message : "Sin conexión" };
    }
    if (error) {
      if (isTransient(error)) break;
      patch(op.id, { error: error.message ?? "No se pudo guardar" });
      continue;
    }
    patch(op.id, { synced: true, syncedAt: Date.now() });
    sent = true;
  }
  if (sent) afterSyncListeners.forEach((l) => l());
}

export function flushOutbox(): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  if (!flushing) {
    flushing = runFlush().finally(() => {
      flushing = null;
    });
  }
  return flushing;
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function useOutbox(): OutboxOp[] {
  return useSyncExternalStore(subscribe, read, () => EMPTY);
}

// ---------------------------------------------------------------------------
// Mezcla de lo pendiente con lo que ya hay en el servidor
// ---------------------------------------------------------------------------

export function mergeLaps(
  server: Lap[],
  serverSectors: LapSector[],
  queue: OutboxOp[],
  sessionId: string,
): { laps: Lap[]; sectors: LapSector[]; pendingIds: Set<string>; failed: Map<string, string> } {
  const known = new Set(server.map((l) => l.id));
  const pending = queue.filter(
    (op): op is LapOp => op.kind === "lap" && op.sessionId === sessionId && !known.has(op.id),
  );
  let nextNumber = (server[server.length - 1]?.lap_number ?? 0) + 1;

  const laps: Lap[] = [...server];
  const sectors: LapSector[] = [...serverSectors];
  const failed = new Map<string, string>();
  for (const op of pending) {
    laps.push({
      id: op.id,
      session_id: op.sessionId,
      lap_number: nextNumber++,
      lap_time_ms: op.lapTimeMs,
      total_time_ms: op.totalTimeMs,
      track_state: op.trackState,
      notes: op.notes,
      created_at: op.createdAt,
    });
    (op.sectors ?? []).forEach((time_ms, i) => {
      sectors.push({
        id: `${op.id}-${i}`,
        lap_id: op.id,
        sector_number: i + 1,
        time_ms,
        created_at: op.createdAt,
      });
    });
    if (op.error) failed.set(op.id, op.error);
  }
  return { laps, sectors, pendingIds: new Set(pending.map((p) => p.id)), failed };
}

export function mergeEvents(
  server: LapEvent[],
  queue: OutboxOp[],
  sessionId: string,
): { events: LapEvent[]; pendingIds: Set<string> } {
  const known = new Set(server.map((e) => e.id));
  const pending = queue.filter(
    (op): op is EventOp => op.kind === "event" && op.sessionId === sessionId && !known.has(op.id),
  );
  const events: LapEvent[] = [
    ...server,
    ...pending.map((op) => ({
      id: op.id,
      session_id: op.sessionId,
      event_type: op.eventType,
      lap_number: op.lapNumber,
      elapsed_ms: op.elapsedMs,
      notes: op.notes,
      created_at: op.createdAt,
    })),
  ];
  return { events, pendingIds: new Set(pending.map((p) => p.id)) };
}
