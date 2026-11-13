import { CloudOff } from "lucide-react";

export const metadata = { title: "Sin conexión" };

export default function OfflinePage() {
  return (
    <div className="grid min-h-screen place-items-center px-4 text-center">
      <div className="max-w-sm">
        <CloudOff className="mx-auto mb-3 h-8 w-8 text-warning" />
        <h1 className="text-lg font-bold">Sin conexión</h1>
        <p className="mt-1 text-sm text-muted">
          Esta página no está guardada en el dispositivo. Abre una sesión que ya hayas visitado o
          vuelve cuando tengas cobertura.
        </p>
      </div>
    </div>
  );
}
