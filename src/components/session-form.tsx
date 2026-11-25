"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CalendarClock, Flag, Save } from "lucide-react";
import { createSession, updateSession, type SessionFormInput } from "@/app/(app)/actions";
import { useSettings } from "@/components/settings-provider";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Field, Input, Select, Textarea } from "@/components/ui/input";
import { Notice } from "@/components/ui/notice";
import { Segmented } from "@/components/ui/segmented";
import { addDays, longDate, todayISO, upcomingLabel } from "@/lib/session-dates";
import {
  MODALITIES,
  SESSION_TYPE_LABELS,
  SESSION_TYPES,
  WEATHER_LABELS,
  WEATHERS,
} from "@/lib/labels";
import type { Session } from "@/lib/supabase/types";

export function SessionForm({ session }: { session?: Session }) {
  const router = useRouter();
  const { settings } = useSettings();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const initial = {
    name: session?.name ?? "",
    modality: session?.modality ?? settings.defaultModality,
    session_type: session?.session_type ?? settings.defaultSessionType,
    category: session?.category ?? "",
    championship: session?.championship ?? "",
    team: session?.team ?? settings.defaultTeam,
    event: session?.event ?? "",
    circuit: session?.circuit ?? settings.defaultCircuit,
    date: session?.date ?? todayISO(),
    driver: session?.driver ?? settings.defaultDriver,
    chassis: session?.chassis ?? settings.defaultChassis,
    engine: session?.engine ?? settings.defaultEngine,
    weather: session?.weather ?? "",
    air_temp: session?.air_temp ?? "",
    track_temp: session?.track_temp ?? "",
    sectors_count: session?.sectors_count ?? settings.defaultSectors,
    notes: session?.notes ?? "",
  };

  // Sesión de hoy o preparada para otro día: lo decide la fecha.
  const today = todayISO();
  const [date, setDate] = useState(initial.date);
  const isFuture = date > today;
  function choose(when: "today" | "later") {
    if (when === "today") setDate(today);
    else if (!isFuture) setDate(addDays(today, 1));
  }

  function onSubmit(formData: FormData) {
    const text = (key: string) => String(formData.get(key) ?? "");
    const input: SessionFormInput = {
      name: text("name"),
      modality: text("modality"),
      session_type: text("session_type"),
      category: text("category"),
      championship: text("championship"),
      team: text("team"),
      event: text("event"),
      circuit: text("circuit"),
      driver: text("driver"),
      chassis: text("chassis"),
      engine: text("engine"),
      weather: text("weather"),
      air_temp: text("air_temp"),
      track_temp: text("track_temp"),
      date: text("date"),
      notes: text("notes"),
      sectors_count: text("sectors_count"),
    };

    startTransition(async () => {
      try {
        const result = session
          ? await updateSession(session.id, input)
          : await createSession(input);
        if (result && !result.ok) setError(result.error);
      } catch {
        setError("Sin conexión: no se ha podido guardar.");
      }
    });
  }

  return (
    <form action={onSubmit} className="flex flex-col gap-5">
      {!session ? (
        <Segmented<"today" | "later">
          label="Cuándo es la sesión"
          size="lg"
          value={isFuture ? "later" : "today"}
          onChange={choose}
          options={[
            { value: "today", label: "Hoy, en pista", icon: Flag },
            { value: "later", label: "Otro día", icon: CalendarClock },
          ]}
        />
      ) : null}
      {isFuture ? (
        <Notice tone="info">
          Sesión preparada para el {longDate(date)} ({upcomingLabel(date, today)?.toLowerCase()}).
          Deja listos los datos y el setup; el clima y las temperaturas los apuntas ese día al abrir
          la sesión.
        </Notice>
      ) : null}
      <Card>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <Field label="Nombre de la sesión" className="md:col-span-2">
            <Input
              name="name"
              required
              maxLength={120}
              defaultValue={initial.name}
              placeholder="Ej. Test privado - Mañana"
              autoFocus
            />
          </Field>
          <Field label="Modalidad">
            <Select name="modality" defaultValue={initial.modality} required>
              {MODALITIES.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Tipo de sesión">
            <Select name="session_type" defaultValue={initial.session_type} required>
              {SESSION_TYPES.map((t) => (
                <option key={t} value={t}>
                  {SESSION_TYPE_LABELS[t]}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Categoría">
            <Input
              name="category"
              maxLength={300}
              defaultValue={initial.category}
              placeholder="X30 Senior, F4..."
            />
          </Field>
          <Field label="Campeonato">
            <Input name="championship" maxLength={300} defaultValue={initial.championship} />
          </Field>
          <Field label="Equipo">
            <Input name="team" maxLength={300} defaultValue={initial.team} />
          </Field>
          <Field label="Evento">
            <Input name="event" maxLength={300} defaultValue={initial.event} />
          </Field>
          <Field label="Circuito">
            <Input name="circuit" maxLength={300} defaultValue={initial.circuit} />
          </Field>
          <Field label="Fecha">
            <Input
              type="date"
              name="date"
              required
              value={date}
              min={!session && isFuture ? addDays(today, 1) : "1900-01-01"}
              max="2100-12-31"
              onChange={(e) => setDate(e.target.value)}
            />
          </Field>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <Field label="Piloto">
            <Input name="driver" maxLength={300} defaultValue={initial.driver} />
          </Field>
          <Field label="Chasis">
            <Input name="chassis" maxLength={300} defaultValue={initial.chassis} />
          </Field>
          <Field label="Motor">
            <Input name="engine" maxLength={300} defaultValue={initial.engine} />
          </Field>
          {isFuture ? (
            <>
              {/* Se conservan las condiciones ya guardadas aunque no se muestren. */}
              <input type="hidden" name="weather" value={initial.weather} />
              <input type="hidden" name="air_temp" value={initial.air_temp} />
              <input type="hidden" name="track_temp" value={initial.track_temp} />
              <p className="flex items-center gap-2 rounded-md border border-dashed border-border px-3 py-2 text-sm text-muted md:col-span-2">
                <CalendarClock className="h-4 w-4 shrink-0" />
                Clima y temperaturas: se apuntan el día de la sesión.
              </p>
            </>
          ) : (
            <>
              <Field label="Clima">
                <Select name="weather" defaultValue={initial.weather}>
                  <option value="">— selecciona —</option>
                  {WEATHERS.map((w) => (
                    <option key={w} value={w}>
                      {WEATHER_LABELS[w]}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Temp. aire (°C)">
                <Input
                  name="air_temp"
                  inputMode="decimal"
                  type="number"
                  step="0.1"
                  defaultValue={initial.air_temp}
                />
              </Field>
              <Field label="Temp. pista (°C)">
                <Input
                  name="track_temp"
                  inputMode="decimal"
                  type="number"
                  step="0.1"
                  defaultValue={initial.track_temp}
                />
              </Field>
            </>
          )}
          <Field label="Sectores por vuelta" hint="0 = sin sectores. Máximo 10.">
            <Input
              name="sectors_count"
              type="number"
              min="0"
              max="10"
              defaultValue={initial.sectors_count}
            />
          </Field>
          <Field label="Notas" className="md:col-span-2">
            <Textarea name="notes" rows={3} maxLength={4000} defaultValue={initial.notes} />
          </Field>
        </CardContent>
      </Card>

      {error ? <Notice tone="error">{error}</Notice> : null}

      <div className="flex justify-end gap-3">
        <Button type="button" variant="ghost" onClick={() => router.back()}>
          Cancelar
        </Button>
        <Button type="submit" size="lg" disabled={pending}>
          <Save className="h-4 w-4" />
          {pending
            ? "Guardando..."
            : session
              ? "Guardar cambios"
              : isFuture
                ? "Preparar sesión"
                : "Crear sesión"}
        </Button>
      </div>
    </form>
  );
}
