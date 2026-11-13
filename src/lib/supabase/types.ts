// Alias sobre los tipos generados por `supabase gen types` (database.types.ts).
import type { Database as GeneratedDatabase, Json } from "./database.types";

export type { Json };
export type Database = GeneratedDatabase;

type Enums = Database["public"]["Enums"];
export type Modality = Enums["modality"];
export type SessionType = Enums["session_type"];
export type Weather = Enums["weather"];
export type TrackState = Enums["track_state"];
export type EventType = Enums["event_type"];

type Tables = Database["public"]["Tables"];
export type Session = Tables["sessions"]["Row"];
export type Lap = Tables["laps"]["Row"];
export type LapEvent = Tables["events"]["Row"];
export type LapSector = Tables["lap_sectors"]["Row"];
export type Setup = Tables["setups"]["Row"];
export type UserSettingsRow = Tables["user_settings"]["Row"];
export type Profile = Tables["profiles"]["Row"];
