"use client";

import { useState, useSyncExternalStore, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CalendarClock, Flag, Thermometer } from "lucide-react";
import { moveSessionToToday, saveConditions } from "@/app/(app)/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Field, Input, Select } from "@/components/ui/input";
import { Notice } from "@/components/ui/notice";
import { WEATHER_LABELS, WEATHERS } from "@/lib/labels";
import { daysUntil, longDate, todayISO, upcomingLabel } from "@/lib/session-dates";
import type { Session } from "@/lib/supabase/types";

const HIDE_KEY = (id: string) => `vrs:conditions-later:${id}`;

const noSubscribe = () => () => {};

function hiddenForToday(sessionId: string, today: string): boolean {
  try {
    return localStorage.getItem(HIDE_KEY(sessionId)) === today;
  } catch {
    return false;
  }
}

/**
 * Sesión preparada con antelación: antes del día avisa de que está planificada;
 * el día de la sesión pide las condiciones de pista (clima y temperaturas).
 */
export function ConditionsCard({ session, serverToday }: { session: Session; serverToday: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [later, setLater] = useState(false);
  // El servidor y el navegador pueden estar a ambos lados de la medianoche: manda el del servidor
  // al pintar, y el del navegador al actuar ("Estoy en pista hoy" usa el día real del usuario).
  const today = serverToday;
  const days = daysUntil(session.date, today);
  // En el servidor nunca está oculto; en el navegador se mira si se pulsó "Ahora no" hoy.
  const hiddenToday = useSyncExternalStore(
    noSubscribe,
    () => hiddenForToday(session.id, today),
    () => false,
  );
  const missing = session.weather === null && session.air_temp === null && session.track_temp === null;

  if (days > 0) {
    return (
      <Card className="border-info/40 bg-info/5">
        <CardContent className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <CalendarClock className="mt-0.5 h-5 w-5 shrink-0 text-info" />
            <div>
              <p className="font-semibold">
                Sesión preparada para el {longDate(session.date)}{" "}
                <span className="text-info">({upcomingLabel(session.date, today)?.toLowerCase()})</span>
              </p>
              <p className="text-sm text-muted">
                Ese día te pediremos aquí el clima y las temperaturas. Ya puedes dejar listo el setup.
              </p>
            </div>
          </div>
          <Button
            variant="secondary"
            size="lg"
            className="w-full shrink-0 sm:w-auto"
            disabled={pending}
            onClick={() => {
              if (!confirm("¿Pasar esta sesión a hoy? Podrás apuntar ya las condiciones de pista.")) return;
              setError(null);
              startTransition(async () => {
                const result = await moveSessionToToday(session.id, todayISO()).catch(() => null);
                if (!result?.ok) setError(result?.error ?? "Sin conexión: inténtalo de nuevo.");
                else router.refresh();
              });
            }}
          >
            <Flag className="h-4 w-4" />
            Estoy en pista hoy
          </Button>
          {error ? <Notice tone="error">{error}</Notice> : null}
        </CardContent>
      </Card>
    );
  }

  if (days !== 0 || !missing || later || hiddenToday) return null;

  function onSubmit(formData: FormData) {
    const text = (k: string) => String(formData.get(k) ?? "");
    setError(null);
    startTransition(async () => {
      const result = await saveConditions(session.id, {
        weather: text("weather"),
        air_temp: text("air_temp"),
        track_temp: text("track_temp"),
      }).catch(() => null);
      if (!result?.ok) setError(result?.error ?? "Sin conexión: inténtalo de nuevo.");
      else router.refresh();
    });
  }

  return (
    <Card className="border-accent/40 bg-accent/5">
      <CardContent className="flex flex-col gap-4 py-4">
        <div className="flex items-start gap-3">
          <Thermometer className="mt-0.5 h-5 w-5 shrink-0 text-accent" />
          <div>
            <p className="font-semibold">Condiciones de pista de hoy</p>
            <p className="text-sm text-muted">Apúntalas antes de salir: luego sirven para comparar sesiones.</p>
          </div>
        </div>
        <form action={onSubmit} className="grid gap-3 sm:grid-cols-[1.4fr_1fr_1fr_auto] sm:items-end">
          <Field label="Clima">
            <Select name="weather" defaultValue="" className="h-11">
              <option value="">— selecciona —</option>
              {WEATHERS.map((w) => (
                <option key={w} value={w}>
                  {WEATHER_LABELS[w]}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Temp. aire (°C)">
            <Input name="air_temp" inputMode="decimal" placeholder="Ej. 21" maxLength={6} className="h-11" />
          </Field>
          <Field label="Temp. pista (°C)">
            <Input name="track_temp" inputMode="decimal" placeholder="Ej. 32" maxLength={6} className="h-11" />
          </Field>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="ghost"
              size="lg"
              className="flex-1 sm:flex-none"
              onClick={() => {
                try {
                  localStorage.setItem(HIDE_KEY(session.id), today);
                } catch {
                  // Sin almacenamiento: se oculta hasta recargar.
                }
                setLater(true);
              }}
            >
              Ahora no
            </Button>
            <Button type="submit" size="lg" disabled={pending} className="flex-1 sm:flex-none">
              {pending ? "Guardando..." : "Guardar"}
            </Button>
          </div>
        </form>
        {error ? <Notice tone="error">{error}</Notice> : null}
      </CardContent>
    </Card>
  );
}
