"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { format } from "date-fns";
import { Card, CardContent } from "@/components/ui/card";
import { Field, Select } from "@/components/ui/input";

interface SessionOption {
  id: string;
  name: string;
  date: string;
  circuit: string | null;
  driver: string | null;
}

export function CompareSelector({
  sessions,
  selectedA,
  selectedB,
}: {
  sessions: SessionOption[];
  selectedA: string | null;
  selectedB: string | null;
}) {
  const router = useRouter();
  const params = useSearchParams();

  function update(side: "a" | "b", value: string) {
    const sp = new URLSearchParams(params.toString());
    if (value) sp.set(side, value);
    else sp.delete(side);
    router.push(`/compare?${sp.toString()}`);
  }

  return (
    <Card>
      <CardContent className="grid gap-3 sm:grid-cols-2">
        <Field label="Sesion A">
          <Select
            value={selectedA ?? ""}
            onChange={(e) => update("a", e.target.value)}
          >
            <option value="">— elige —</option>
            {sessions.map((s) => (
              <option key={s.id} value={s.id} disabled={s.id === selectedB}>
                {format(new Date(s.date), "dd/MM/yyyy")} — {s.name}
                {s.circuit ? ` · ${s.circuit}` : ""}
                {s.driver ? ` · ${s.driver}` : ""}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Sesion B">
          <Select
            value={selectedB ?? ""}
            onChange={(e) => update("b", e.target.value)}
          >
            <option value="">— elige —</option>
            {sessions.map((s) => (
              <option key={s.id} value={s.id} disabled={s.id === selectedA}>
                {format(new Date(s.date), "dd/MM/yyyy")} — {s.name}
                {s.circuit ? ` · ${s.circuit}` : ""}
                {s.driver ? ` · ${s.driver}` : ""}
              </option>
            ))}
          </Select>
        </Field>
      </CardContent>
    </Card>
  );
}
