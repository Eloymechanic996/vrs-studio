"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function Error({ error, retry }: { error: unknown; retry: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="grid min-h-[60vh] place-items-center px-4">
      <div className="max-w-md text-center">
        <AlertTriangle className="mx-auto mb-3 h-8 w-8 text-warning" />
        <h1 className="text-lg font-bold">Algo ha fallado</h1>
        <p className="mt-1 text-sm text-muted">
          Puede ser la conexión. Las vueltas marcadas siguen guardadas en este dispositivo y se
          enviarán cuando sea posible.
        </p>
        <div className="mt-4 flex justify-center gap-2">
          <Button onClick={() => retry()}>Reintentar</Button>
          <Link href="/">
            <Button variant="secondary">Ir al inicio</Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
