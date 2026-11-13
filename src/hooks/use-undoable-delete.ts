"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useToast } from "@/components/toast";

const UNDO_MS = 5000;

/**
 * Oculta el elemento al momento y lo borra a los pocos segundos, dejando un
 * aviso con Deshacer. Si se abandona la página, el borrado se ejecuta ya.
 */
export function useUndoableDelete(perform: (id: string) => void | Promise<void>) {
  const toast = useToast();
  const [hidden, setHidden] = useState<Set<string>>(new Set());
  const timers = useRef(new Map<string, ReturnType<typeof setTimeout>>());
  const performRef = useRef(perform);

  useEffect(() => {
    performRef.current = perform;
  }, [perform]);

  const remove = useCallback(
    (id: string, message: string) => {
      setHidden((s) => new Set(s).add(id));
      const timer = setTimeout(() => {
        timers.current.delete(id);
        void performRef.current(id);
      }, UNDO_MS);
      timers.current.set(id, timer);
      toast({
        message,
        duration: UNDO_MS,
        action: {
          label: "Deshacer",
          onClick: () => {
            clearTimeout(timer);
            timers.current.delete(id);
            setHidden((s) => {
              const next = new Set(s);
              next.delete(id);
              return next;
            });
          },
        },
      });
    },
    [toast],
  );

  useEffect(() => {
    const pending = timers.current;
    return () => {
      for (const [id, timer] of pending) {
        clearTimeout(timer);
        void performRef.current(id);
      }
      pending.clear();
    };
  }, []);

  return { hidden, remove };
}
