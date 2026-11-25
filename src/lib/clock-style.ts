"use client";

import { useSyncExternalStore } from "react";

/** Estilos del cronómetro. Se eligen en Ajustes o en la pestaña de cronometraje. */
export const CLOCK_STYLES = [
  { id: "classic", name: "Clásico", description: "El de siempre: limpio y con los colores de la app." },
  { id: "dash", name: "Volante", description: "Pantalla de volante con luces y delta contra tu mejor vuelta." },
  { id: "pitboard", name: "Pizarra de boxes", description: "Números enormes para leer desde lejos o en tablet." },
  { id: "led", name: "Torre LED", description: "Matriz de puntos ámbar, como la torre de tiempos del circuito." },
  { id: "chrono", name: "Cronógrafo", description: "Reloj de agujas de cronometrador con subesferas." },
] as const;

export type ClockStyle = (typeof CLOCK_STYLES)[number]["id"];

const KEY = "vrs:clock-style";
const EVENT = "vrs:clock-style";
const IDS = new Set<string>(CLOCK_STYLES.map((s) => s.id));

function read(): ClockStyle {
  try {
    const v = localStorage.getItem(KEY);
    return v && IDS.has(v) ? (v as ClockStyle) : "classic";
  } catch {
    return "classic";
  }
}

// Sin almacenamiento (modo privado) la elección vive en memoria hasta recargar.
let memory: ClockStyle | null = null;

function subscribe(listener: () => void) {
  // Cambio desde otra pestaña: manda lo guardado, no lo que había en memoria.
  const fromOtherTab = () => {
    memory = null;
    listener();
  };
  window.addEventListener(EVENT, listener);
  window.addEventListener("storage", fromOtherTab);
  return () => {
    window.removeEventListener(EVENT, listener);
    window.removeEventListener("storage", fromOtherTab);
  };
}

export function setClockStyle(style: ClockStyle) {
  memory = style;
  try {
    localStorage.setItem(KEY, style);
  } catch {
    // Se queda en memoria.
  }
  window.dispatchEvent(new Event(EVENT));
}

/** Estilo elegido en este dispositivo ("classic" en el servidor y por defecto). */
export function useClockStyle(): ClockStyle {
  return useSyncExternalStore(
    subscribe,
    () => memory ?? read(),
    () => "classic",
  );
}
