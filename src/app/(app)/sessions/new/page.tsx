import { NewSessionForm } from "./new-session-form";

export default function NewSessionPage() {
  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">Nueva sesion</h1>
        <p className="text-sm text-muted">
          Rellena los datos generales. Luego podras anadir tiempos, eventos y setup.
        </p>
      </div>
      <NewSessionForm />
    </div>
  );
}
