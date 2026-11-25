"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { LIGHT_COUNT, litAt, planStartLights } from "@/lib/start-lights";
import { cn } from "@/lib/utils";

/**
 * Semáforo de salida a pantalla completa. Llama a onGo con el instante exacto
 * en que se apagan las luces, que es cuando empieza a contar el cronómetro.
 */
export function StartLights({ onGo, onCancel }: { onGo: (at: number) => void; onCancel: () => void }) {
  const [lit, setLit] = useState(0);
  const [out, setOut] = useState(false);
  const done = useRef(false);
  const goRef = useRef(onGo);
  const cancelRef = useRef(onCancel);
  useEffect(() => {
    goRef.current = onGo;
    cancelRef.current = onCancel;
  });

  useEffect(() => {
    const plan = planStartLights();
    const t0 = performance.now();
    let frame = 0;
    const tick = () => {
      const elapsed = performance.now() - t0;
      if (elapsed >= plan.outAt) {
        if (!done.current) {
          done.current = true;
          setLit(0);
          setOut(true);
          goRef.current(Date.now());
        }
        return;
      }
      setLit(litAt(plan, elapsed));
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !done.current) {
        done.current = true;
        cancelRef.current();
      }
      // Espacio no debe marcar vueltas ni pulsar botones mientras salen las luces.
      if (e.code === "Space") e.preventDefault();
    };
    window.addEventListener("keydown", onKey, true);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("keydown", onKey, true);
    };
  }, []);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Semáforo de salida"
      className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-8 bg-black/90 p-4 backdrop-blur-sm"
    >
      <p className="text-sm font-semibold uppercase tracking-[0.3em] text-zinc-400">
        {out ? "¡Fuera!" : "Atento a las luces"}
      </p>
      <div className="flex gap-2 rounded-2xl border-4 border-zinc-800 bg-zinc-950 p-3 sm:gap-4 sm:p-5">
        {Array.from({ length: LIGHT_COUNT }, (_, i) => (
          <div key={i} className="flex flex-col gap-2 rounded-xl bg-zinc-900 p-1.5 sm:gap-3 sm:p-2.5">
            {[0, 1].map((row) => (
              <span
                key={row}
                className={cn(
                  "block h-10 w-10 rounded-full transition-colors duration-75 sm:h-16 sm:w-16",
                  i < lit
                    ? "bg-red-600 shadow-[0_0_24px_6px_rgba(220,38,38,.7)]"
                    : "bg-zinc-800 shadow-[inset_0_2px_6px_rgba(0,0,0,.8)]",
                )}
              />
            ))}
          </div>
        ))}
      </div>
      <p className="tabular h-6 text-lg font-bold text-green-400" aria-live="assertive">
        {out ? "Cronómetro en marcha" : ""}
      </p>
      {!out ? (
        <Button
          variant="outline"
          size="lg"
          onClick={() => {
            if (done.current) return;
            done.current = true;
            onCancel();
          }}
        >
          Cancelar
        </Button>
      ) : null}
    </div>
  );
}
