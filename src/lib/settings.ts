import type { Modality, SessionType, UserSettingsRow } from "@/lib/supabase/types";

export const APPEARANCES = [
  { id: "racing", name: "Racing", description: "Rojo competición y negro", swatches: ["#dc2626", "#f97316", "#0a0a0a"] },
  { id: "lofi", name: "Lo-fi", description: "Lavanda, coral y tonos cálidos", swatches: ["#b9afd0", "#d98775", "#f0d9ae"] },
  { id: "aviation", name: "Aviación", description: "Verde instrumental y negro", swatches: ["#6b8c73", "#25352d", "#111719"] },
  { id: "military", name: "Militar", description: "Oliva, caqui y carbón", swatches: ["#65734a", "#b0a276", "#34372c"] },
  { id: "mechanic", name: "Mecánica", description: "Acero, grafito y cobre", swatches: ["#8d999d", "#41494c", "#b8784f"] },
  { id: "retro", name: "Retro", description: "Azul celeste y naranja de los 70", swatches: ["#8fc9e8", "#f47b20", "#0d1418"] },
  { id: "papaya", name: "Papaya", description: "Naranja papaya y azul eléctrico", swatches: ["#ff8000", "#47c7fc", "#0e0f14"] },
  { id: "british", name: "Verde británico", description: "Verde inglés y crema", swatches: ["#1f5c3c", "#e8dcb5", "#0c1410"] },
  { id: "rally", name: "Rally", description: "Azul profundo y amarillo", swatches: ["#1f4fd1", "#f5c400", "#0a0f1c"] },
  { id: "neon", name: "Neón", description: "Magenta y cian, estilo simracing", swatches: ["#ff2bd6", "#22e3ff", "#0d0a1a"] },
  { id: "carbon", name: "Carbono", description: "Fibra de carbono y amarillo", swatches: ["#facc15", "#3f3f46", "#0b0b0c"] },
] as const;

export const THEMES = [
  { id: "dark", name: "Oscuro", description: "Para interiores y boxes" },
  { id: "light", name: "Claro", description: "Fondo claro" },
  { id: "auto", name: "Automático", description: "Sigue al dispositivo" },
  { id: "sun", name: "Sol directo", description: "Máximo contraste y texto mayor" },
] as const;

export type AppearanceId = (typeof APPEARANCES)[number]["id"];
export type ThemeId = (typeof THEMES)[number]["id"];

export interface UserSettings {
  appearance: AppearanceId;
  theme: ThemeId;
  minLapSeconds: number;
  vibrate: boolean;
  keepAwake: boolean;
  defaultModality: Modality;
  defaultSessionType: SessionType;
  defaultSectors: number;
  defaultTeam: string;
  defaultDriver: string;
  defaultChassis: string;
  defaultEngine: string;
  defaultCircuit: string;
}

export const DEFAULT_SETTINGS: UserSettings = {
  appearance: "racing",
  theme: "dark",
  minLapSeconds: 5,
  vibrate: true,
  keepAwake: true,
  defaultModality: "Karting",
  defaultSessionType: "Test",
  defaultSectors: 0,
  defaultTeam: "",
  defaultDriver: "",
  defaultChassis: "",
  defaultEngine: "",
  defaultCircuit: "",
};

export const SETTINGS_STORAGE_KEY = "vrs:settings";

export function settingsFromRow(row: UserSettingsRow | null): UserSettings {
  if (!row) return DEFAULT_SETTINGS;
  return {
    appearance: row.appearance as AppearanceId,
    theme: row.theme as ThemeId,
    minLapSeconds: Number(row.min_lap_seconds),
    vibrate: row.vibrate,
    keepAwake: row.keep_awake,
    defaultModality: row.default_modality,
    defaultSessionType: row.default_session_type,
    defaultSectors: row.default_sectors,
    defaultTeam: row.default_team ?? "",
    defaultDriver: row.default_driver ?? "",
    defaultChassis: row.default_chassis ?? "",
    defaultEngine: row.default_engine ?? "",
    defaultCircuit: row.default_circuit ?? "",
  };
}

/** Script previo al primer pintado: evita el destello de colores incorrectos. */
export const THEME_BOOTSTRAP_SCRIPT = `(function(){try{var s=JSON.parse(localStorage.getItem(${JSON.stringify(SETTINGS_STORAGE_KEY)})||"{}");var d=document.documentElement;d.dataset.appearance=s.appearance||"racing";var t=s.theme||"dark";d.dataset.theme=t==="auto"?(matchMedia("(prefers-color-scheme: light)").matches?"light":"dark"):t;}catch(e){}})();`;

export function applyThemeToDocument(settings: Pick<UserSettings, "appearance" | "theme">) {
  const root = document.documentElement;
  root.dataset.appearance = settings.appearance;
  root.dataset.theme =
    settings.theme === "auto"
      ? window.matchMedia("(prefers-color-scheme: light)").matches
        ? "light"
        : "dark"
      : settings.theme;
}
