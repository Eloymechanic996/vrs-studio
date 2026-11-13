import type {
  EventType,
  Modality,
  SessionType,
  TrackState,
  Weather,
} from "@/lib/supabase/types";

// El valor guardado en la base de datos no cambia; aquí solo se define el texto visible.

export const MODALITIES: Modality[] = [
  "Karting",
  "Monoplazas",
  "Rally",
  "Turismos",
  "Endurance",
  "Off-Road",
];

export const SESSION_TYPE_LABELS: Record<SessionType, string> = {
  Race: "Carrera",
  Test: "Test",
  "Free Practice": "Libres",
  Qualifying: "Clasificación",
};

export const WEATHER_LABELS: Record<Weather, string> = {
  Dry: "Seco",
  Cloudy: "Nublado",
  "Light Rain": "Lluvia ligera",
  Rain: "Lluvia",
  "Heavy Rain": "Lluvia fuerte",
  Windy: "Viento",
  Cold: "Frío",
  Hot: "Calor",
};

export const TRACK_STATE_LABELS: Record<TrackState, string> = {
  "Green Flag": "Bandera verde",
  "Yellow Flag": "Bandera amarilla",
  "Red Flag": "Bandera roja",
  "Safety Car": "Safety Car",
  "Virtual Safety Car": "Safety Car virtual",
  "Pit Lane": "Pit Lane",
};

export const EVENT_TYPE_LABELS: Record<EventType, string> = {
  Incidencia: "Incidencia",
  "Pit In": "Pit In",
  "Pit Out": "Pit Out",
  "Safety Car Sale": "Sale Safety Car",
  "Safety Car Entra": "Entra Safety Car",
  Bandera: "Bandera",
  "Cambio de clima": "Cambio de clima",
};

export const SESSION_TYPES = Object.keys(SESSION_TYPE_LABELS) as SessionType[];
export const WEATHERS = Object.keys(WEATHER_LABELS) as Weather[];
export const TRACK_STATES = Object.keys(TRACK_STATE_LABELS) as TrackState[];
export const EVENT_TYPES = Object.keys(EVENT_TYPE_LABELS) as EventType[];
