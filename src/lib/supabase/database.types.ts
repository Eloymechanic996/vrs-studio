export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      events: {
        Row: {
          created_at: string
          elapsed_ms: number
          event_type: Database["public"]["Enums"]["event_type"]
          id: string
          lap_number: number | null
          notes: string | null
          session_id: string
        }
        Insert: {
          created_at?: string
          elapsed_ms: number
          event_type: Database["public"]["Enums"]["event_type"]
          id?: string
          lap_number?: number | null
          notes?: string | null
          session_id: string
        }
        Update: {
          created_at?: string
          elapsed_ms?: number
          event_type?: Database["public"]["Enums"]["event_type"]
          id?: string
          lap_number?: number | null
          notes?: string | null
          session_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "events_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      lap_sectors: {
        Row: {
          created_at: string
          id: string
          lap_id: string
          sector_number: number
          time_ms: number
        }
        Insert: {
          created_at?: string
          id?: string
          lap_id: string
          sector_number: number
          time_ms: number
        }
        Update: {
          created_at?: string
          id?: string
          lap_id?: string
          sector_number?: number
          time_ms?: number
        }
        Relationships: [
          {
            foreignKeyName: "lap_sectors_lap_id_fkey"
            columns: ["lap_id"]
            isOneToOne: false
            referencedRelation: "laps"
            referencedColumns: ["id"]
          },
        ]
      }
      laps: {
        Row: {
          created_at: string
          id: string
          lap_number: number
          lap_time_ms: number
          notes: string | null
          session_id: string
          total_time_ms: number
          track_state: Database["public"]["Enums"]["track_state"]
        }
        Insert: {
          created_at?: string
          id?: string
          lap_number: number
          lap_time_ms: number
          notes?: string | null
          session_id: string
          total_time_ms: number
          track_state?: Database["public"]["Enums"]["track_state"]
        }
        Update: {
          created_at?: string
          id?: string
          lap_number?: number
          lap_time_ms?: number
          notes?: string | null
          session_id?: string
          total_time_ms?: number
          track_state?: Database["public"]["Enums"]["track_state"]
        }
        Relationships: [
          {
            foreignKeyName: "laps_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_path: string | null
          bio: string | null
          car_number: string | null
          category: string | null
          country: string | null
          display_name: string | null
          team: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_path?: string | null
          bio?: string | null
          car_number?: string | null
          category?: string | null
          country?: string | null
          display_name?: string | null
          team?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_path?: string | null
          bio?: string | null
          car_number?: string | null
          category?: string | null
          country?: string | null
          display_name?: string | null
          team?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      sessions: {
        Row: {
          air_temp: number | null
          category: string | null
          championship: string | null
          chassis: string | null
          circuit: string | null
          created_at: string
          date: string
          driver: string | null
          engine: string | null
          event: string | null
          id: string
          is_public: boolean
          modality: Database["public"]["Enums"]["modality"]
          name: string
          notes: string | null
          public_slug: string | null
          sectors_count: number
          session_type: Database["public"]["Enums"]["session_type"]
          team: string | null
          track_temp: number | null
          updated_at: string
          user_id: string
          weather: Database["public"]["Enums"]["weather"] | null
        }
        Insert: {
          air_temp?: number | null
          category?: string | null
          championship?: string | null
          chassis?: string | null
          circuit?: string | null
          created_at?: string
          date?: string
          driver?: string | null
          engine?: string | null
          event?: string | null
          id?: string
          is_public?: boolean
          modality?: Database["public"]["Enums"]["modality"]
          name: string
          notes?: string | null
          public_slug?: string | null
          sectors_count?: number
          session_type?: Database["public"]["Enums"]["session_type"]
          team?: string | null
          track_temp?: number | null
          updated_at?: string
          user_id: string
          weather?: Database["public"]["Enums"]["weather"] | null
        }
        Update: {
          air_temp?: number | null
          category?: string | null
          championship?: string | null
          chassis?: string | null
          circuit?: string | null
          created_at?: string
          date?: string
          driver?: string | null
          engine?: string | null
          event?: string | null
          id?: string
          is_public?: boolean
          modality?: Database["public"]["Enums"]["modality"]
          name?: string
          notes?: string | null
          public_slug?: string | null
          sectors_count?: number
          session_type?: Database["public"]["Enums"]["session_type"]
          team?: string | null
          track_temp?: number | null
          updated_at?: string
          user_id?: string
          weather?: Database["public"]["Enums"]["weather"] | null
        }
        Relationships: []
      }
      setups: {
        Row: {
          engine: Json
          id: string
          rear_axle: Json
          session_id: string
          steering: Json
          updated_at: string
        }
        Insert: {
          engine?: Json
          id?: string
          rear_axle?: Json
          session_id: string
          steering?: Json
          updated_at?: string
        }
        Update: {
          engine?: Json
          id?: string
          rear_axle?: Json
          session_id?: string
          steering?: Json
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "setups_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: true
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      user_settings: {
        Row: {
          appearance: string
          default_chassis: string | null
          default_circuit: string | null
          default_driver: string | null
          default_engine: string | null
          default_modality: Database["public"]["Enums"]["modality"]
          default_sectors: number
          default_session_type: Database["public"]["Enums"]["session_type"]
          default_team: string | null
          keep_awake: boolean
          min_lap_seconds: number
          theme: string
          updated_at: string
          user_id: string
          vibrate: boolean
        }
        Insert: {
          appearance?: string
          default_chassis?: string | null
          default_circuit?: string | null
          default_driver?: string | null
          default_engine?: string | null
          default_modality?: Database["public"]["Enums"]["modality"]
          default_sectors?: number
          default_session_type?: Database["public"]["Enums"]["session_type"]
          default_team?: string | null
          keep_awake?: boolean
          min_lap_seconds?: number
          theme?: string
          updated_at?: string
          user_id: string
          vibrate?: boolean
        }
        Update: {
          appearance?: string
          default_chassis?: string | null
          default_circuit?: string | null
          default_driver?: string | null
          default_engine?: string | null
          default_modality?: Database["public"]["Enums"]["modality"]
          default_sectors?: number
          default_session_type?: Database["public"]["Enums"]["session_type"]
          default_team?: string | null
          keep_awake?: boolean
          min_lap_seconds?: number
          theme?: string
          updated_at?: string
          user_id?: string
          vibrate?: boolean
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      delete_own_account: { Args: never; Returns: undefined }
      generate_session_slug: { Args: never; Returns: string }
      get_public_session: { Args: { p_slug: string }; Returns: Json }
      ping: { Args: never; Returns: boolean }
      record_lap: {
        Args: {
          p_id: string
          p_lap_time_ms: number
          p_notes?: string
          p_sectors?: number[]
          p_session_id: string
          p_total_time_ms: number
          p_track_state?: Database["public"]["Enums"]["track_state"]
        }
        Returns: {
          created_at: string
          id: string
          lap_number: number
          lap_time_ms: number
          notes: string | null
          session_id: string
          total_time_ms: number
          track_state: Database["public"]["Enums"]["track_state"]
        }
        SetofOptions: {
          from: "*"
          to: "laps"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      update_lap: {
        Args: {
          p_lap_id: string
          p_lap_time_ms: number
          p_notes?: string
          p_sectors?: number[]
          p_track_state: Database["public"]["Enums"]["track_state"]
        }
        Returns: {
          created_at: string
          id: string
          lap_number: number
          lap_time_ms: number
          notes: string | null
          session_id: string
          total_time_ms: number
          track_state: Database["public"]["Enums"]["track_state"]
        }
        SetofOptions: {
          from: "*"
          to: "laps"
          isOneToOne: true
          isSetofReturn: false
        }
      }
    }
    Enums: {
      event_type:
        | "Incidencia"
        | "Pit In"
        | "Pit Out"
        | "Safety Car Sale"
        | "Safety Car Entra"
        | "Bandera"
        | "Cambio de clima"
      modality:
        | "Karting"
        | "Monoplazas"
        | "Rally"
        | "Turismos"
        | "Endurance"
        | "Off-Road"
      session_type: "Race" | "Test" | "Free Practice" | "Qualifying"
      track_state:
        | "Green Flag"
        | "Yellow Flag"
        | "Red Flag"
        | "Safety Car"
        | "Virtual Safety Car"
        | "Pit Lane"
      weather:
        | "Dry"
        | "Cloudy"
        | "Light Rain"
        | "Rain"
        | "Heavy Rain"
        | "Windy"
        | "Cold"
        | "Hot"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      event_type: [
        "Incidencia",
        "Pit In",
        "Pit Out",
        "Safety Car Sale",
        "Safety Car Entra",
        "Bandera",
        "Cambio de clima",
      ],
      modality: [
        "Karting",
        "Monoplazas",
        "Rally",
        "Turismos",
        "Endurance",
        "Off-Road",
      ],
      session_type: ["Race", "Test", "Free Practice", "Qualifying"],
      track_state: [
        "Green Flag",
        "Yellow Flag",
        "Red Flag",
        "Safety Car",
        "Virtual Safety Car",
        "Pit Lane",
      ],
      weather: [
        "Dry",
        "Cloudy",
        "Light Rain",
        "Rain",
        "Heavy Rain",
        "Windy",
        "Cold",
        "Hot",
      ],
    },
  },
} as const
