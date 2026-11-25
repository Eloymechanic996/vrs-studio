"use client";

import { useMemo, useRef, useState } from "react";
import { ClipboardPaste, Keyboard, Plus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Field, Input, Select, Textarea } from "@/components/ui/input";
import { Notice } from "@/components/ui/notice";
import { TRACK_STATE_LABELS, TRACK_STATES } from "@/lib/labels";
import type { TrackState } from "@/lib/supabase/types";
import {
  cn,
  formatLapTime,
  lapTimeProblem,
  MAX_PASTED_LAPS,
  parseLapList,
  parseLapTime,
} from "@/lib/utils";

/** Selector de opciones grande, cómodo con el dedo en móvil y tablet. */
export function Segmented<T extends string>({
  value,
  onChange,
  options,
  label,
  size = "md",
}: {
  value: T;
  onChange: (value: T) => void;
  options: {
    value: T;
    label: string;
    icon?: React.ComponentType<{ className?: string }>;
  }[];
  label: string;
  size?: "md" | "lg";
}) {
  return (
    <div
      role="radiogroup"
      aria-label={label}
      className="grid gap-1 rounded-lg border border-border bg-surface/60 p-1"
      style={{
        gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))`,
      }}
    >
      {options.map((o) => {
        const active = o.value === value;
        const Icon = o.icon;
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(o.value)}
            className={cn(
              "inline-flex min-w-0 items-center justify-center gap-2 rounded-md px-2 font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40",
              size === "lg" ? "h-12 text-base" : "h-11 text-sm",
              active
                ? "bg-accent text-on-accent shadow-[0_4px_24px_-4px_var(--color-accent-glow)]"
                : "text-muted hover:bg-surface-hover hover:text-foreground",
            )}
          >
            {Icon ? <Icon className="h-4 w-4 shrink-0" /> : null}
            <span className="truncate">{o.label}</span>
          </button>
        );
      })}
    </div>
  );
}

type Way = "single" | "paste";

const PASTE_EXAMPLE = "1:23.456\n1:22.981\n1'24.10\n1.23.700";

/**
 * Registrar vueltas a mano: una a una (Enter para la siguiente) o pegando una
 * lista entera desde Excel, un PDF o un mensaje.
 */
export function ManualEntry({
  minLapSeconds,
  nextLapNumber,
  stopwatchRunning,
  onAdd,
}: {
  minLapSeconds: number;
  nextLapNumber: number;
  stopwatchRunning: boolean;
  onAdd: (lapTimes: number[], trackState: TrackState, note: string | null) => void;
}) {
  const [way, setWay] = useState<Way>("single");
  const [trackState, setTrackState] = useState<TrackState>("Green Flag");

  // Una a una
  const [time, setTime] = useState("");
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [lastAdded, setLastAdded] = useState<string | null>(null);
  const timeRef = useRef<HTMLInputElement>(null);

  // Pegar lista
  const [text, setText] = useState("");
  const parsed = useMemo(() => parseLapList(text, minLapSeconds), [text, minLapSeconds]);
  const [pasteDone, setPasteDone] = useState<string | null>(null);

  function addSingle(e: React.FormEvent) {
    e.preventDefault();
    const ms = parseLapTime(time);
    const problem = lapTimeProblem(ms, minLapSeconds);
    if (problem !== null || ms === null) {
      setError(problem ?? "Tiempo no válido.");
      setLastAdded(null);
      timeRef.current?.focus();
      return;
    }
    onAdd([ms], trackState, note.trim() || null);
    setLastAdded(`Vuelta ${nextLapNumber} · ${formatLapTime(ms)} guardada`);
    setError(null);
    setTime("");
    setNote("");
    // El cursor vuelve al tiempo: la siguiente vuelta se escribe sin tocar el ratón.
    timeRef.current?.focus();
  }

  function addPasted() {
    const count = parsed.laps.length;
    if (count === 0) return;
    onAdd(
      parsed.laps.map((l) => l.ms),
      trackState,
      null,
    );
    setPasteDone(
      `${count} ${count === 1 ? "vuelta añadida" : "vueltas añadidas"} (de la ${nextLapNumber} a la ${nextLapNumber + count - 1}).`,
    );
    setText("");
  }

  const errorCount = parsed.errors.length;
  const validCount = parsed.laps.length;

  return (
    <Card>
      <CardContent className="flex flex-col gap-4 pt-5">
        <Segmented<Way>
          label="Cómo añadir las vueltas"
          value={way}
          onChange={(v) => {
            setWay(v);
            setError(null);
            setPasteDone(null);
          }}
          options={[
            { value: "single", label: "Una a una", icon: Keyboard },
            { value: "paste", label: "Pegar lista", icon: ClipboardPaste },
          ]}
        />

        {stopwatchRunning ? (
          <Notice tone="info">
            El cronómetro sigue en marcha. Una vuelta añadida aquí cuenta como vuelta olvidada: no
            se mide dos veces.
          </Notice>
        ) : null}

        <Field label="Estado de pista">
          <Select
            value={trackState}
            onChange={(e) => setTrackState(e.target.value as TrackState)}
            className="h-11"
          >
            {TRACK_STATES.map((s) => (
              <option key={s} value={s}>
                {TRACK_STATE_LABELS[s]}
              </option>
            ))}
          </Select>
        </Field>

        {way === "single" ? (
          <form onSubmit={addSingle} className="flex flex-col gap-4" noValidate>
            <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
              <Field
                label={`Tiempo de la vuelta ${nextLapNumber}`}
                hint="Ej. 1:23.456 · en el móvil también 1.23.456"
              >
                <Input
                  ref={timeRef}
                  value={time}
                  onChange={(e) => {
                    setTime(e.target.value);
                    if (error) setError(null);
                  }}
                  placeholder="1:23.456"
                  inputMode="decimal"
                  enterKeyHint="done"
                  autoComplete="off"
                  autoCorrect="off"
                  spellCheck={false}
                  maxLength={20}
                  aria-invalid={error ? true : undefined}
                  aria-label={`Tiempo de la vuelta ${nextLapNumber}`}
                  className="tabular h-12 text-xl font-semibold tracking-wide"
                />
              </Field>
              <Field label="Nota (opcional)">
                <Input
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Ej. tráfico en la curva 3"
                  maxLength={500}
                  enterKeyHint="done"
                  aria-label="Nota de la vuelta"
                  className="h-12"
                />
              </Field>
            </div>

            {error ? <Notice tone="error">{error}</Notice> : null}
            {lastAdded && !error ? <Notice tone="success">{lastAdded}</Notice> : null}

            <Button
              type="submit"
              size="lg"
              disabled={!time.trim()}
              className="w-full sm:w-auto sm:self-end"
            >
              <Plus className="h-5 w-5" />
              Añadir vuelta {nextLapNumber}
            </Button>
            <p className="hidden text-xs text-muted sm:block">
              Pulsa{" "}
              <kbd className="rounded border border-border bg-surface px-1.5 py-0.5 font-mono text-xs">
                Enter
              </kbd>{" "}
              para guardar y escribir la siguiente.
            </p>
          </form>
        ) : (
          <div className="flex flex-col gap-4">
            <Field
              label="Pega los tiempos (una vuelta por línea)"
              hint={`Desde Excel, un PDF o WhatsApp. Se ignoran los números de vuelta y las cabeceras. Máximo ${MAX_PASTED_LAPS}.`}
            >
              <Textarea
                value={text}
                onChange={(e) => {
                  setText(e.target.value);
                  setPasteDone(null);
                }}
                placeholder={PASTE_EXAMPLE}
                rows={7}
                maxLength={20000}
                spellCheck={false}
                autoComplete="off"
                aria-label="Lista de tiempos"
                className="tabular min-h-40 font-mono text-base sm:text-sm"
              />
            </Field>

            {text.trim() ? (
              <div className="flex flex-col gap-2" aria-live="polite">
                <div className="flex flex-wrap gap-2">
                  <Badge variant={validCount ? "success" : "muted"}>
                    {validCount} {validCount === 1 ? "vuelta válida" : "vueltas válidas"}
                  </Badge>
                  {errorCount ? (
                    <Badge variant="danger">
                      {errorCount} {errorCount === 1 ? "línea con error" : "líneas con error"}
                    </Badge>
                  ) : null}
                </div>

                {validCount ? (
                  <div className="flex flex-wrap gap-1.5">
                    {parsed.laps.slice(0, 12).map((l, k) => (
                      <span
                        key={l.line}
                        className="tabular rounded border border-border bg-surface px-1.5 py-0.5 text-xs"
                      >
                        <span className="text-muted">V{nextLapNumber + k}</span>{" "}
                        {formatLapTime(l.ms)}
                      </span>
                    ))}
                    {validCount > 12 ? (
                      <span className="px-1 py-0.5 text-xs text-muted">
                        y {validCount - 12} más…
                      </span>
                    ) : null}
                  </div>
                ) : null}

                {errorCount ? (
                  <ul className="max-h-32 space-y-1 overflow-y-auto rounded-md border border-danger/30 bg-danger/5 p-2 text-xs">
                    {parsed.errors.slice(0, 20).map((e) => (
                      <li key={e.line} className="break-words">
                        <span className="font-semibold text-danger">Línea {e.line}:</span>{" "}
                        <span className="font-mono">“{e.text}”</span> — {e.reason}
                      </li>
                    ))}
                    {errorCount > 20 ? (
                      <li className="text-muted">y {errorCount - 20} más…</li>
                    ) : null}
                  </ul>
                ) : null}
              </div>
            ) : null}

            {pasteDone ? <Notice tone="success">{pasteDone}</Notice> : null}

            <Button
              type="button"
              size="lg"
              onClick={addPasted}
              disabled={validCount === 0}
              className="w-full sm:w-auto sm:self-end"
            >
              <Plus className="h-5 w-5" />
              {validCount === 0
                ? "Añadir vueltas"
                : `Añadir ${validCount} ${validCount === 1 ? "vuelta" : "vueltas"}${errorCount ? ` (sin las ${errorCount} con error)` : ""}`}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
