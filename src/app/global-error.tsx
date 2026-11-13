"use client";

export default function GlobalError({ retry }: { error: unknown; retry: () => void }) {
  return (
    <html lang="es">
      <body style={{ fontFamily: "system-ui, sans-serif", textAlign: "center", padding: "4rem 1rem" }}>
        <h1>Algo ha fallado</h1>
        <p>No se ha podido cargar VRS Studio.</p>
        <button type="button" onClick={() => retry()}>
          Reintentar
        </button>
      </body>
    </html>
  );
}
