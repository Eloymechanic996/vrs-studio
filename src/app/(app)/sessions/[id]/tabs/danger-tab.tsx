"use client";

import { useTransition } from "react";
import Link from "next/link";
import { CopyPlus, Pencil, Trash2 } from "lucide-react";
import { deleteSession, duplicateSession } from "@/app/(app)/actions";
import { useToast } from "@/components/toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Session } from "@/lib/supabase/types";

export function DangerTab({ session }: { session: Session }) {
  const [pending, startTransition] = useTransition();
  const toast = useToast();

  function run(action: () => Promise<{ ok: boolean; error?: string } | void>) {
    startTransition(async () => {
      try {
        const result = await action();
        if (result && !result.ok && result.error) toast({ message: result.error, tone: "error" });
      } catch {
        toast({ message: "Sin conexión: inténtalo de nuevo con cobertura.", tone: "error" });
      }
    });
  }

  function onDelete() {
    if (!confirm(`¿Borrar la sesión "${session.name}"? Se eliminarán vueltas, eventos y setup.`)) return;
    run(() => deleteSession(session.id));
  }

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Gestionar sesión</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <p className="text-sm text-muted">
            Corrige los datos generales o empieza una sesión nueva con los mismos datos y setup,
            sin vueltas.
          </p>
          <div className="flex flex-wrap gap-2">
            <Link href={`/sessions/${session.id}/edit`}>
              <Button variant="secondary">
                <Pencil className="h-4 w-4" />
                Editar datos
              </Button>
            </Link>
            <Button variant="secondary" disabled={pending} onClick={() => run(() => duplicateSession(session.id))}>
              <CopyPlus className="h-4 w-4" />
              Duplicar sesión
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="border-danger/40">
        <CardHeader>
          <CardTitle className="text-danger">Zona peligrosa</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <p className="text-sm text-muted">
            Borrar esta sesión elimina toda la información asociada: vueltas, eventos y setup. La
            acción no se puede deshacer.
          </p>
          <Button variant="danger" onClick={onDelete} disabled={pending} className="self-start">
            <Trash2 className="h-4 w-4" />
            {pending ? "Procesando..." : "Borrar sesión"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
