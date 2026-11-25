"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { Save } from "lucide-react";
import { createSession, updateSession, type SessionFormInput } from "@/app/(app)/actions";
import { useSettings } from "@/components/settings-provider";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Field, Input, Select, Textarea } from "@/components/ui/input";
import { Notice } from "@/components/ui/notice";
import { MODALITIES, SESSION_TYPE_LABELS, SESSION_TYPES, WEATHER_LABELS, WEATHERS } from "@/lib/labels";
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
    date: session?.date ?? format(new Date(), "yyyy-MM-dd"),
    driver: session?.driver ?? settings.defaultDriver,
    chassis: session?.chassis ?? settings.defaultChassis,
    engine: session?.engine ?? settings.defaultEngine,
    weather: session?.weather ?? "",
    air_temp: session?.air_temp ?? "",
    track_temp: session?.track_temp ?? "",
    sectors_count: session?.sectors_count ?? settings.defaultSectors,
    notes: session?.notes ?? "",
  };

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
        const result = session ? await updateSession(session.id, input) : await createSession(input);
        if (result && !result.ok) setError(result.error);
      } catch {
        setError("Sin conexión: no se ha podido guardar.");
      }
    });
  }

  return (
    <form action={onSubmit} className="flex flex-col gap-5">
      <Card>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <Field label="Nombre de la sesión" className="md:col-span-2">
            <Input name="name" required maxLength={120} defaultValue={initial.name} placeholder="Ej. Test privado - Mañana" autoFocus />
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
            <Input name="category" maxLength={300} defaultValue={initial.category} placeholder="X30 Senior, F4..." />
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
            <Input type="date" name="date" required defaultValue={initial.date} />
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
            <Input name="air_temp" inputMode="decimal" type="number" step="0.1" defaultValue={initial.air_temp} />
          </Field>
          <Field label="Temp. pista (°C)">
            <Input name="track_temp" inputMode="decimal" type="number" step="0.1" defaultValue={initial.track_temp} />
          </Field>
          <Field label="Sectores por vuelta" hint="0 = sin sectores. Máximo 10.">
            <Input name="sectors_count" type="number" min="0" max="10" defaultValue={initial.sectors_count} />
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
          {pending ? "Guardando..." : session ? "Guardar cambios" : "Crear sesión"}
        </Button>
      </div>
    </form>
  );
}
