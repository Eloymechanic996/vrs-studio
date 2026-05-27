"use client";

import { useTransition } from "react";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { deleteSession } from "@/app/(app)/actions";
import type { Database } from "@/lib/supabase/types";

type Session = Database["public"]["Tables"]["sessions"]["Row"];

export function DangerTab({ session }: { session: Session }) {
  const [pending, startTransition] = useTransition();

  function onDelete() {
    if (
      !confirm(
        `Borrar la sesion "${session.name}"? Se eliminaran vueltas, eventos y setup.`,
      )
    )
      return;
    startTransition(async () => {
      await deleteSession(session.id);
    });
  }

  return (
    <Card className="border-red-500/30">
      <CardHeader>
        <CardTitle className="text-red-400">Zona peligrosa</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <p className="text-sm text-muted">
          Borrar esta sesion elimina toda la informacion asociada: vueltas,
          eventos y setup. La accion no se puede deshacer.
        </p>
        <Button
          variant="danger"
          onClick={onDelete}
          disabled={pending}
          className="self-start"
        >
          <Trash2 className="h-4 w-4" />
          {pending ? "Borrando..." : "Borrar sesion"}
        </Button>
      </CardContent>
    </Card>
  );
}
