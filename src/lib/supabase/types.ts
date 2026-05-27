export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type SessionType = "Race" | "Test" | "Free Practice" | "Qualifying";
export type Modality =
  | "Karting"
  | "Monoplazas"
  | "Rally"
  | "Turismos"
  | "Endurance"
  | "Off-Road";
export type Weather =
  | "Dry"
  | "Cloudy"
  | "Light Rain"
  | "Rain"
  | "Heavy Rain"
  | "Windy"
  | "Cold"
  | "Hot";
export type TrackState =
  | "Green Flag"
  | "Yellow Flag"
  | "Red Flag"
  | "Safety Car"
  | "Virtual Safety Car"
  | "Pit Lane";
export type EventType =
  | "Incidencia"
  | "Pit In"
  | "Pit Out"
  | "Safety Car Sale"
  | "Safety Car Entra"
  | "Bandera"
  | "Cambio de clima";

export interface Database {
  public: {
    Tables: {
      sessions: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          modality: Modality;
          session_type: SessionType;
          category: string | null;
          championship: string | null;
          team: string | null;
          event: string | null;
          circuit: string | null;
          driver: string | null;
          chassis: string | null;
          engine: string | null;
          weather: Weather | null;
          air_temp: number | null;
          track_temp: number | null;
          date: string;
          notes: string | null;
          sectors_count: number;
          is_public: boolean;
          public_slug: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          modality: Modality;
          session_type: SessionType;
          category?: string | null;
          championship?: string | null;
          team?: string | null;
          event?: string | null;
          circuit?: string | null;
          driver?: string | null;
          chassis?: string | null;
          engine?: string | null;
          weather?: Weather | null;
          air_temp?: number | null;
          track_temp?: number | null;
          date?: string;
          notes?: string | null;
          sectors_count?: number;
          is_public?: boolean;
          public_slug?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["sessions"]["Insert"]>;
        Relationships: [];
      };
      laps: {
        Row: {
          id: string;
          session_id: string;
          lap_number: number;
          lap_time_ms: number;
          total_time_ms: number;
          track_state: TrackState;
          notes: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          session_id: string;
          lap_number: number;
          lap_time_ms: number;
          total_time_ms: number;
          track_state?: TrackState;
          notes?: string | null;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["laps"]["Insert"]>;
        Relationships: [];
      };
      events: {
        Row: {
          id: string;
          session_id: string;
          event_type: EventType;
          lap_number: number | null;
          elapsed_ms: number;
          notes: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          session_id: string;
          event_type: EventType;
          lap_number?: number | null;
          elapsed_ms: number;
          notes?: string | null;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["events"]["Insert"]>;
        Relationships: [];
      };
      lap_sectors: {
        Row: {
          id: string;
          lap_id: string;
          sector_number: number;
          time_ms: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          lap_id: string;
          sector_number: number;
          time_ms: number;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["lap_sectors"]["Insert"]>;
        Relationships: [];
      };
      setups: {
        Row: {
          id: string;
          session_id: string;
          steering: Json;
          rear_axle: Json;
          engine: Json;
          updated_at: string;
        };
        Insert: {
          id?: string;
          session_id: string;
          steering?: Json;
          rear_axle?: Json;
          engine?: Json;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["setups"]["Insert"]>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
  };
}
