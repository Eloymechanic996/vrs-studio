"use client";

import { useState, useTransition } from "react";
import { Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, Input, Textarea } from "@/components/ui/input";
import { saveSetup } from "@/app/(app)/actions";
import type { Database } from "@/lib/supabase/types";

type Session = Database["public"]["Tables"]["sessions"]["Row"];
type Setup = Database["public"]["Tables"]["setups"]["Row"];

const STEERING_FIELDS = [
  "Convergencia",
  "Caster",
  "Camber delantero",
  "Ancho via delantero",
  "Diferencia barra direccion",
  "Altura suspension",
];
const REAR_FIELDS = [
  "Tipo de eje",
  "Diametro eje",
  "Longitud eje",
  "Ancho via trasero",
  "Altura trasera",
  "Buje",
  "Llantas",
  "Neumaticos",
  "Presion delantera",
  "Presion trasera",
];
const ENGINE_FIELDS = [
  "Motor",
  "Carburador",
  "Encendido",
  "Escape",
  "Pinon",
  "Corona",
  "Ratio",
  "Cadena",
  "Mezcla",
  "Bujia",
];

export function SetupTab({
  session,
  setup,
}: {
  session: Session;
  setup: Setup | null;
}) {
  const initial = {
    steering: (setup?.steering as Record<string, string>) ?? {},
    rear_axle: (setup?.rear_axle as Record<string, string>) ?? {},
    engine: (setup?.engine as Record<string, string>) ?? {},
  };
  const [steering, setSteering] = useState(initial.steering);
  const [rear, setRear] = useState(initial.rear_axle);
  const [engine, setEngine] = useState(initial.engine);
  const [notes, setNotes] = useState((initial.engine.notes as string) ?? "");
  const [pending, startTransition] = useTransition();
  const [savedAt, setSavedAt] = useState<string | null>(null);

  function persist() {
    startTransition(async () => {
      await saveSetup({
        session_id: session.id,
        steering,
        rear_axle: rear,
        engine: { ...engine, notes },
      });
      setSavedAt(new Date().toLocaleTimeString());
    });
  }

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <SetupGroup
        title="Direccion"
        fields={STEERING_FIELDS}
        values={steering}
        onChange={setSteering}
      />
      <SetupGroup
        title="Eje trasero / Tren"
        fields={REAR_FIELDS}
        values={rear}
        onChange={setRear}
      />
      <SetupGroup
        title="Motor"
        fields={ENGINE_FIELDS}
        values={engine}
        onChange={setEngine}
      >
        <Field label="Notas del motor" className="mt-2">
          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
          />
        </Field>
      </SetupGroup>

      <div className="lg:col-span-3 flex items-center justify-end gap-3">
        {savedAt ? (
          <p className="text-xs text-muted">Guardado a las {savedAt}</p>
        ) : null}
        <Button onClick={persist} disabled={pending} size="lg">
          <Save className="h-4 w-4" />
          {pending ? "Guardando..." : "Guardar setup"}
        </Button>
      </div>
    </div>
  );
}

function SetupGroup({
  title,
  fields,
  values,
  onChange,
  children,
}: {
  title: string;
  fields: string[];
  values: Record<string, string>;
  onChange: (v: Record<string, string>) => void;
  children?: React.ReactNode;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-3">
        {fields.map((f) => (
          <Field key={f} label={f}>
            <Input
              value={values[f] ?? ""}
              onChange={(e) => onChange({ ...values, [f]: e.target.value })}
            />
          </Field>
        ))}
        {children}
      </CardContent>
    </Card>
  );
}
