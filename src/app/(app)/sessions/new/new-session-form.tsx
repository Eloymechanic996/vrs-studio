"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Save } from "lucide-react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Field, Input, Select, Textarea } from "@/components/ui/input";
import { createSession, type CreateSessionInput } from "@/app/(app)/actions";
import type {
  Modality,
  SessionType,
  Weather,
} from "@/lib/supabase/types";

const MODALITIES: Modality[] = [
  "Karting",
  "Monoplazas",
  "Rally",
  "Turismos",
  "Endurance",
  "Off-Road",
];
const SESSION_TYPES: SessionType[] = [
  "Race",
  "Test",
  "Free Practice",
  "Qualifying",
];
const WEATHERS: Weather[] = [
  "Dry",
  "Cloudy",
  "Light Rain",
  "Rain",
  "Heavy Rain",
  "Windy",
  "Cold",
  "Hot",
];

export function NewSessionForm() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function onSubmit(formData: FormData) {
    const input: CreateSessionInput = {
      name: String(formData.get("name") ?? "").trim(),
      modality: formData.get("modality") as Modality,
      session_type: formData.get("session_type") as SessionType,
      category: String(formData.get("category") ?? ""),
      championship: String(formData.get("championship") ?? ""),
      team: String(formData.get("team") ?? ""),
      event: String(formData.get("event") ?? ""),
      circuit: String(formData.get("circuit") ?? ""),
      driver: String(formData.get("driver") ?? ""),
      chassis: String(formData.get("chassis") ?? ""),
      engine: String(formData.get("engine") ?? ""),
      weather: (formData.get("weather") as Weather) || "",
      air_temp: String(formData.get("air_temp") ?? ""),
      track_temp: String(formData.get("track_temp") ?? ""),
      date: String(formData.get("date") ?? ""),
      notes: String(formData.get("notes") ?? ""),
      sectors_count: String(formData.get("sectors_count") ?? "0"),
    };

    if (!input.name) {
      setError("Pon un nombre a la sesion.");
      return;
    }

    startTransition(async () => {
      try {
        await createSession(input);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Error al crear la sesion");
      }
    });
  }

  return (
    <form action={onSubmit} className="flex flex-col gap-5">
      <Card>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <Field label="Nombre de la sesion" className="md:col-span-2">
            <Input
              name="name"
              required
              placeholder="Ej. Test Privado - Manana"
              autoFocus
            />
          </Field>
          <Field label="Modalidad">
            <Select name="modality" defaultValue="Karting" required>
              {MODALITIES.map((m) => (
                <option key={m}>{m}</option>
              ))}
            </Select>
          </Field>
          <Field label="Tipo de sesion">
            <Select name="session_type" defaultValue="Test" required>
              {SESSION_TYPES.map((m) => (
                <option key={m}>{m}</option>
              ))}
            </Select>
          </Field>
          <Field label="Categoria">
            <Input name="category" placeholder="X30 Senior, F4..." />
          </Field>
          <Field label="Campeonato">
            <Input name="championship" />
          </Field>
          <Field label="Equipo">
            <Input name="team" />
          </Field>
          <Field label="Evento">
            <Input name="event" />
          </Field>
          <Field label="Circuito">
            <Input name="circuit" />
          </Field>
          <Field label="Fecha">
            <Input
              type="date"
              name="date"
              required
              defaultValue={format(new Date(), "yyyy-MM-dd")}
            />
          </Field>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <Field label="Piloto">
            <Input name="driver" />
          </Field>
          <Field label="Chasis">
            <Input name="chassis" />
          </Field>
          <Field label="Motor">
            <Input name="engine" />
          </Field>
          <Field label="Clima">
            <Select name="weather" defaultValue="">
              <option value="">-- selecciona --</option>
              {WEATHERS.map((w) => (
                <option key={w}>{w}</option>
              ))}
            </Select>
          </Field>
          <Field label="Temp. aire (C)">
            <Input
              name="air_temp"
              inputMode="decimal"
              type="number"
              step="0.1"
            />
          </Field>
          <Field label="Temp. pista (C)">
            <Input
              name="track_temp"
              inputMode="decimal"
              type="number"
              step="0.1"
            />
          </Field>
          <Field
            label="Sectores por vuelta"
            hint="0 = sin sectores. Maximo 10."
          >
            <Input
              name="sectors_count"
              type="number"
              min="0"
              max="10"
              defaultValue="0"
            />
          </Field>
          <Field label="Notas" className="md:col-span-2">
            <Textarea name="notes" rows={3} />
          </Field>
        </CardContent>
      </Card>

      {error ? (
        <p className="rounded-md border border-red-500/40 bg-red-500/10 px-3 py-2 text-xs text-red-300">
          {error}
        </p>
      ) : null}

      <div className="flex justify-end gap-3">
        <Button
          type="button"
          variant="ghost"
          onClick={() => router.back()}
        >
          Cancelar
        </Button>
        <Button type="submit" size="lg" disabled={pending}>
          <Save className="h-4 w-4" />
          {pending ? "Creando..." : "Crear sesion"}
        </Button>
      </div>
    </form>
  );
}
