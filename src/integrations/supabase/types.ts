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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      agents: {
        Row: {
          color: string | null
          created_at: string | null
          id: string
          is_active: boolean | null
          name: string
          sector: string | null
          updated_at: string | null
        }
        Insert: {
          color?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          sector?: string | null
          updated_at?: string | null
        }
        Update: {
          color?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          sector?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      appointment_agents: {
        Row: {
          agent_id: string
          appointment_id: string
          created_at: string | null
          id: string
        }
        Insert: {
          agent_id: string
          appointment_id: string
          created_at?: string | null
          id?: string
        }
        Update: {
          agent_id?: string
          appointment_id?: string
          created_at?: string | null
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "appointment_agents_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointment_agents_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
        ]
      }
      appointments: {
        Row: {
          agent_id: string | null
          city: string
          created_at: string | null
          created_by: string | null
          date: string
          description: string | null
          expense_status: Database["public"]["Enums"]["expense_status"] | null
          id: string
          status: Database["public"]["Enums"]["appointment_status"] | null
          time: string
          title: string
          updated_at: string | null
          vehicle_id: string | null
        }
        Insert: {
          agent_id?: string | null
          city: string
          created_at?: string | null
          created_by?: string | null
          date: string
          description?: string | null
          expense_status?: Database["public"]["Enums"]["expense_status"] | null
          id?: string
          status?: Database["public"]["Enums"]["appointment_status"] | null
          time: string
          title: string
          updated_at?: string | null
          vehicle_id?: string | null
        }
        Update: {
          agent_id?: string | null
          city?: string
          created_at?: string | null
          created_by?: string | null
          date?: string
          description?: string | null
          expense_status?: Database["public"]["Enums"]["expense_status"] | null
          id?: string
          status?: Database["public"]["Enums"]["appointment_status"] | null
          time?: string
          title?: string
          updated_at?: string | null
          vehicle_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "appointments_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          email: string
          full_name: string | null
          id: string
          role: Database["public"]["Enums"]["user_role"] | null
          updated_at: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          email: string
          full_name?: string | null
          id: string
          role?: Database["public"]["Enums"]["user_role"] | null
          updated_at?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          email?: string
          full_name?: string | null
          id?: string
          role?: Database["public"]["Enums"]["user_role"] | null
          updated_at?: string | null
        }
        Relationships: []
      }
      time_off: {
        Row: {
          agent_id: string | null
          approved: boolean | null
          created_at: string | null
          date: string
          id: string
          type: string | null
          updated_at: string | null
        }
        Insert: {
          agent_id?: string | null
          approved?: boolean | null
          created_at?: string | null
          date: string
          id?: string
          type?: string | null
          updated_at?: string | null
        }
        Update: {
          agent_id?: string | null
          approved?: boolean | null
          created_at?: string | null
          date?: string
          id?: string
          type?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "time_off_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
        ]
      }
      vacations: {
        Row: {
          agent_id: string
          created_at: string | null
          days: number | null
          deadline: string | null
          end_date: string
          expiry_date: string | null
          id: string
          notes: string | null
          period_number: number | null
          start_date: string
          updated_at: string | null
        }
        Insert: {
          agent_id: string
          created_at?: string | null
          days?: number | null
          deadline?: string | null
          end_date: string
          expiry_date?: string | null
          id?: string
          notes?: string | null
          period_number?: number | null
          start_date: string
          updated_at?: string | null
        }
        Update: {
          agent_id?: string
          created_at?: string | null
          days?: number | null
          deadline?: string | null
          end_date?: string
          expiry_date?: string | null
          id?: string
          notes?: string | null
          period_number?: number | null
          start_date?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "vacations_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
        ]
      }
      vehicles: {
        Row: {
          created_at: string | null
          id: string
          model: string
          plate: string
          status: Database["public"]["Enums"]["vehicle_status"] | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          model: string
          plate: string
          status?: Database["public"]["Enums"]["vehicle_status"] | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          model?: string
          plate?: string
          status?: Database["public"]["Enums"]["vehicle_status"] | null
          updated_at?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      check_vehicle_availability: {
        Args: {
          p_appointment_id?: string
          p_date: string
          p_time: string
          p_vehicle_id: string
        }
        Returns: boolean
      }
      get_upcoming_vacation_reminders: {
        Args: never
        Returns: {
          agent_id: string
          agent_name: string
          days_until_start: number
          reminder_type: string
          start_date: string
        }[]
      }
      is_agent_on_vacation: {
        Args: { p_agent_id: string; p_date: string }
        Returns: boolean
      }
    }
    Enums: {
      appointment_status:
        | "scheduled"
        | "in_progress"
        | "completed"
        | "cancelled"
      expense_status:
        | "não_separar"
        | "separar_dinheiro"
        | "separar_dia_anterior"
      user_role: "admin" | "tecnico"
      vehicle_status: "available" | "in_use" | "maintenance"
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
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
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
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
      appointment_status: [
        "scheduled",
        "in_progress",
        "completed",
        "cancelled",
      ],
      expense_status: [
        "não_separar",
        "separar_dinheiro",
        "separar_dia_anterior",
      ],
      user_role: ["admin", "tecnico"],
      vehicle_status: ["available", "in_use", "maintenance"],
    },
  },
} as const
