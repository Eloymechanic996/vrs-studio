import { SessionForm } from "@/components/session-form";

export default function NewSessionPage() {
  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">Nueva sesión</h1>
        <p className="text-sm text-muted">
          Rellena los datos generales. Luego podrás añadir tiempos, eventos y setup.
        </p>
      </div>
      <SessionForm />
    </div>
  );
}
