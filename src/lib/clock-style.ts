"use client";

import { useSyncExternalStore } from "react";

/** Estilos del cronómetro. Se eligen en Ajustes o en la pestaña de cronometraje. */
export const CLOCK_STYLES = [
  { id: "classic", name: "Clásico", description: "El de siempre: limpio y con los colores de la app." },
  { id: "dash", name: "Volante", description: "Pantalla de volante con luces y delta contra tu mejor vuelta." },
  { id: "pitboard", name: "Pizarra de boxes", description: "Números enormes para leer desde lejos o en tablet." },
  { id: "led", name: "Torre LED", description: "Matriz de puntos ámbar, como la torre de tiempos del circuito." },
  { id: "chrono", name: "Cronógrafo", description: "Reloj de agujas de cronometrador con subesferas." },
  { id: "telemetry", name: "Telemetría", description: "Gráfico en directo de tus últimas vueltas y su delta." },
  { id: "night", name: "Noche / casco", description: "Casi negro con dígitos rojos tenues: no deslumbra." },
  { id: "brand", name: "VRS Studio", description: "Con logo, sesión y piloto: para el proyector o la tele." },
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

// ---------------------------------------------------------------- Semáforo de salida
const LIGHTS_KEY = "vrs:start-lights";
let lightsMemory: boolean | null = null;

function readLights(): boolean {
  try {
    return localStorage.getItem(LIGHTS_KEY) === "1";
  } catch {
    return false;
  }
}

export function setStartLights(on: boolean) {
  lightsMemory = on;
  try {
    localStorage.setItem(LIGHTS_KEY, on ? "1" : "0");
  } catch {
    // Se queda en memoria.
  }
  window.dispatchEvent(new Event(EVENT));
}

/** Semáforo de 5 luces al iniciar la sesión (desactivado por defecto). */
export function useStartLights(): boolean {
  return useSyncExternalStore(
    (listener) => {
      const fromOtherTab = () => {
        lightsMemory = null;
        listener();
      };
      window.addEventListener(EVENT, listener);
      window.addEventListener("storage", fromOtherTab);
      return () => {
        window.removeEventListener(EVENT, listener);
        window.removeEventListener("storage", fromOtherTab);
      };
    },
    () => lightsMemory ?? readLights(),
    () => false,
  );
}
