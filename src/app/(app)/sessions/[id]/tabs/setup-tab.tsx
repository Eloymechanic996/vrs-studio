"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { format } from "date-fns";
import { Copy, Save } from "lucide-react";
import { loadSetupFrom, saveSetup } from "@/app/(app)/actions";
import { useToast } from "@/components/toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, Input, Select, Textarea } from "@/components/ui/input";
import {
  computeRatio,
  CROWN_FIELD,
  PINION_FIELD,
  RATIO_FIELD,
  setupGroupsFor,
  type SetupGroupKey,
} from "@/lib/setup-fields";
import type { Session, Setup } from "@/lib/supabase/types";
import { parseDateOnly } from "@/lib/utils";

type Values = Record<SetupGroupKey, Record<string, string>>;

const AUTOSAVE_MS = 1500;

export function SetupTab({
  session,
  setup,
  copyCandidates,
}: {
  session: Session;
  setup: Setup | null;
  copyCandidates: { id: string; name: string; date: string }[];
}) {
  const toast = useToast();
  const groups = useMemo(() => setupGroupsFor(session.modality), [session.modality]);
  const [values, setValues] = useState<Values>({
    steering: (setup?.steering as Record<string, string>) ?? {},
    rear_axle: (setup?.rear_axle as Record<string, string>) ?? {},
    engine: (setup?.engine as Record<string, string>) ?? {},
  });
  const [dirty, setDirty] = useState(false);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [copyFrom, setCopyFrom] = useState("");
  const [pending, startTransition] = useTransition();
  const valuesRef = useRef(values);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  async function persist(): Promise<boolean> {
    if (timer.current) clearTimeout(timer.current);
    try {
      const result = await saveSetup({ session_id: session.id, ...valuesRef.current });
      if (!result.ok) {
        toast({ message: result.error, tone: "error" });
        return false;
      }
      setDirty(false);
      setSavedAt(new Date().toLocaleTimeString("es-ES"));
      return true;
    } catch {
      toast({ message: "Sin conexión: el setup se guardará al pulsar Guardar con cobertura.", tone: "error" });
      return false;
    }
  }

  const persistRef = useRef(persist);
  useEffect(() => {
    persistRef.current = persist;
  });

  function schedule(next: Values) {
    valuesRef.current = next;
    setValues(next);
    setDirty(true);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => void persistRef.current(), AUTOSAVE_MS);
  }

  function change(group: SetupGroupKey, field: string, value: string) {
    const groupValues = { ...valuesRef.current[group], [field]: value };
    if (field === PINION_FIELD || field === CROWN_FIELD) {
      groupValues[RATIO_FIELD] = computeRatio(groupValues[PINION_FIELD], groupValues[CROWN_FIELD]);
    }
    schedule({ ...valuesRef.current, [group]: groupValues });
  }

  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  function copySetup() {
    if (!copyFrom) return;
    if (!confirm("Se sustituirá el setup actual por el de la sesión elegida. ¿Continuar?")) return;
    startTransition(async () => {
      try {
        const result = await loadSetupFrom(copyFrom);
        if (!result.ok) {
          toast({ message: result.error, tone: "error" });
          return;
        }
        schedule({ steering: result.steering, rear_axle: result.rear_axle, engine: result.engine });
        toast({ message: "Setup copiado.", tone: "success" });
      } catch {
        toast({ message: "Sin conexión: no se pudo copiar el setup.", tone: "error" });
      }
    });
  }

  const engineNotes = values.engine.notes ?? "";

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      {copyCandidates.length > 0 ? (
        <Card className="lg:col-span-3">
          <CardContent className="flex flex-wrap items-end gap-3">
            <Field label="Copiar setup de otra sesión" className="min-w-52 flex-1">
              <Select value={copyFrom} onChange={(e) => setCopyFrom(e.target.value)}>
                <option value="">— elige —</option>
                {copyCandidates.map((c) => (
                  <option key={c.id} value={c.id}>
                    {format(parseDateOnly(c.date), "dd/MM/yyyy")} — {c.name}
                  </option>
                ))}
              </Select>
            </Field>
            <Button variant="secondary" onClick={copySetup} disabled={!copyFrom || pending}>
              <Copy className="h-4 w-4" />
              Copiar
            </Button>
          </CardContent>
        </Card>
      ) : null}

      {groups.map((group) => (
        <Card key={group.key}>
          <CardHeader>
            <CardTitle>{group.title}</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3">
            {group.fields.map((field) => (
              <Field key={field} label={field}>
                <Input
                  value={values[group.key][field] ?? ""}
                  readOnly={field === RATIO_FIELD}
                  placeholder={field === RATIO_FIELD ? "Automática" : undefined}
                  onChange={(e) => change(group.key, field, e.target.value)}
                />
              </Field>
            ))}
            {group.key === "engine" ? (
              <Field label="Notas" className="mt-2">
                <Textarea
                  value={engineNotes}
                  onChange={(e) => change("engine", "notes", e.target.value)}
                  rows={3}
                />
              </Field>
            ) : null}
          </CardContent>
        </Card>
      ))}

      <div className="flex items-center justify-end gap-3 lg:col-span-3">
        <p className="text-xs text-muted">
          {dirty ? "Cambios sin guardar..." : savedAt ? `Guardado a las ${savedAt}` : "Se guarda automáticamente"}
        </p>
        <Button onClick={() => void persist()} size="lg" disabled={!dirty}>
          <Save className="h-4 w-4" />
          Guardar setup
        </Button>
      </div>
    </div>
  );
}
