import type { Modality } from "@/lib/supabase/types";

export type SetupGroupKey = "steering" | "rear_axle" | "engine";

export interface SetupGroupDef {
  key: SetupGroupKey;
  title: string;
  fields: string[];
}

export const PINION_FIELD = "Piñón";
export const CROWN_FIELD = "Corona";
export const RATIO_FIELD = "Relación";

const KARTING: SetupGroupDef[] = [
  {
    key: "steering",
    title: "Dirección",
    fields: [
      "Paralelismo",
      "Distancia ruedas delante",
      "Distancia ruedas detrás",
      "Caída izquierda",
      "Caída derecha",
      "Caster izquierdo",
      "Caster derecho",
      "Reactividad",
      "Avance",
      "Ancho de vía delantero",
      "Altura delantera",
      "Presión del. izq.",
      "Presión del. der.",
    ],
  },
  {
    key: "rear_axle",
    title: "Eje trasero / Tren",
    fields: [
      "Tipo de eje",
      "Diámetro de eje",
      "Longitud de eje",
      "Ancho trasero",
      "Altura de eje",
      "Tipo de buje",
      "Tipo de llanta",
      "Tipo de neumático",
      PINION_FIELD,
      CROWN_FIELD,
      RATIO_FIELD,
      "Cadena",
      "Presión tras. izq.",
      "Presión tras. der.",
    ],
  },
  {
    key: "engine",
    title: "Motor",
    fields: [
      "Motor",
      "Carburador",
      "Carburación",
      "Aguja altas",
      "Aguja bajas",
      "Encendido",
      "Escape",
      "Mezcla",
      "Bujía",
      "Desarrollo",
      "Temperatura de motor",
    ],
  },
];

const CIRCUIT: SetupGroupDef[] = [
  {
    key: "steering",
    title: "Tren delantero",
    fields: [
      "Altura delantera",
      "Caída izquierda",
      "Caída derecha",
      "Convergencia",
      "Caster",
      "Muelle delantero",
      "Amortiguador delantero",
      "Barra estabilizadora delantera",
      "Presión del. izq.",
      "Presión del. der.",
    ],
  },
  {
    key: "rear_axle",
    title: "Tren trasero",
    fields: [
      "Altura trasera",
      "Caída izquierda",
      "Caída derecha",
      "Convergencia",
      "Muelle trasero",
      "Amortiguador trasero",
      "Barra estabilizadora trasera",
      "Compuesto de neumático",
      "Presión tras. izq.",
      "Presión tras. der.",
    ],
  },
  {
    key: "engine",
    title: "Motor y aerodinámica",
    fields: [
      "Mapa de motor",
      "Combustible",
      "Desarrollos",
      "Diferencial",
      "Reparto de frenada",
      "Ala delantera",
      "Ala trasera",
    ],
  },
];

const RALLY: SetupGroupDef[] = [
  {
    key: "steering",
    title: "Tren delantero",
    fields: [
      "Altura",
      "Caída",
      "Convergencia",
      "Muelle",
      "Amortiguación en compresión",
      "Amortiguación en extensión",
      "Barra estabilizadora",
      "Presión delantera",
    ],
  },
  {
    key: "rear_axle",
    title: "Tren trasero",
    fields: [
      "Altura",
      "Caída",
      "Convergencia",
      "Muelle",
      "Amortiguación en compresión",
      "Amortiguación en extensión",
      "Barra estabilizadora",
      "Neumático",
      "Presión trasera",
    ],
  },
  {
    key: "engine",
    title: "Motor y transmisión",
    fields: [
      "Mapa de motor",
      "Combustible",
      "Desarrollos",
      "Diferencial delantero",
      "Diferencial central",
      "Diferencial trasero",
      "Reparto de frenada",
    ],
  },
];

export function setupGroupsFor(modality: Modality): SetupGroupDef[] {
  if (modality === "Karting") return KARTING;
  if (modality === "Rally" || modality === "Off-Road") return RALLY;
  return CIRCUIT;
}

/** Relación final a partir de piñón y corona. Admite coma decimal. */
export function computeRatio(pinion: string | undefined, crown: string | undefined): string {
  const p = Number((pinion ?? "").trim().replace(",", "."));
  const c = Number((crown ?? "").trim().replace(",", "."));
  if (!Number.isFinite(p) || !Number.isFinite(c) || p <= 0 || c <= 0) return "";
  return (c / p).toFixed(3);
}
