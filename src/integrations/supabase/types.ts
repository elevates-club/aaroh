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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      activity_logs: {
        Row: {
          action: string
          created_at: string | null
          details: Json | null
          id: string
          ip_address: string | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string | null
          details?: Json | null
          id?: string
          ip_address?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string | null
          details?: Json | null
          id?: string
          ip_address?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "activity_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      events: {
        Row: {
          category: Database["public"]["Enums"]["event_category"]
          created_at: string | null
          created_by: string | null
          description: string | null
          event_date: string | null
          id: string
          is_active: boolean | null
          max_entries_per_year: number | null
          max_participants: number | null
          max_team_size: number | null
          min_team_size: number | null
          mode: Database["public"]["Enums"]["event_mode"]
          name: string
          registration_deadline: string | null
          registration_method: Database["public"]["Enums"]["registration_method"]
          updated_at: string | null
          venue: string | null
        }
        Insert: {
          category: Database["public"]["Enums"]["event_category"]
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          event_date?: string | null
          id?: string
          is_active?: boolean | null
          max_entries_per_year?: number | null
          max_participants?: number | null
          max_team_size?: number | null
          min_team_size?: number | null
          mode?: Database["public"]["Enums"]["event_mode"]
          name: string
          registration_deadline?: string | null
          registration_method?: Database["public"]["Enums"]["registration_method"]
          updated_at?: string | null
          venue?: string | null
        }
        Update: {
          category?: Database["public"]["Enums"]["event_category"]
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          event_date?: string | null
          id?: string
          is_active?: boolean | null
          max_entries_per_year?: number | null
          max_participants?: number | null
          max_team_size?: number | null
          min_team_size?: number | null
          mode?: Database["public"]["Enums"]["event_mode"]
          name?: string
          registration_deadline?: string | null
          registration_method?: Database["public"]["Enums"]["registration_method"]
          updated_at?: string | null
          venue?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "events_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string | null
          email: string
          full_name: string
          id: string
          is_first_login: boolean | null
          profile_completed: boolean | null
          role: string[]
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          email: string
          full_name: string
          id?: string
          is_first_login?: boolean | null
          profile_completed?: boolean | null
          role: string[]
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          email?: string
          full_name?: string
          id?: string
          is_first_login?: boolean | null
          profile_completed?: boolean | null
          role?: string[]
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      registrations: {
        Row: {
          created_at: string | null
          event_id: string
          group_id: string | null
          id: string
          registered_by: string | null
          status: Database["public"]["Enums"]["registration_status"] | null
          student_id: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          event_id: string
          group_id?: string | null
          id?: string
          registered_by?: string | null
          status?: Database["public"]["Enums"]["registration_status"] | null
          student_id: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          event_id?: string
          group_id?: string | null
          id?: string
          registered_by?: string | null
          status?: Database["public"]["Enums"]["registration_status"] | null
          student_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "registrations_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "registrations_registered_by_fkey"
            columns: ["registered_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "registrations_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      settings: {
        Row: {
          id: string
          key: string
          updated_at: string | null
          updated_by: string | null
          value: Json
        }
        Insert: {
          id?: string
          key: string
          updated_at?: string | null
          updated_by?: string | null
          value: Json
        }
        Update: {
          id?: string
          key?: string
          updated_at?: string | null
          updated_by?: string | null
          value?: Json
        }
        Relationships: [
          {
            foreignKeyName: "settings_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      students: {
        Row: {
          created_at: string | null
          department: string
          email: string | null
          gender: string | null
          id: string
          name: string
          phone_number: string | null
          roll_number: string
          updated_at: string | null
          user_id: string | null
          year: Database["public"]["Enums"]["academic_year"]
        }
        Insert: {
          created_at?: string | null
          department: string
          email?: string | null
          gender?: string | null
          id?: string
          name: string
          phone_number?: string | null
          roll_number: string
          updated_at?: string | null
          user_id?: string | null
          year: Database["public"]["Enums"]["academic_year"]
        }
        Update: {
          created_at?: string | null
          department?: string
          email?: string | null
          gender?: string | null
          id?: string
          name?: string
          phone_number?: string | null
          roll_number?: string
          updated_at?: string | null
          user_id?: string | null
          year?: Database["public"]["Enums"]["academic_year"]
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      admin_update_student_roll_number: {
        Args: { p_new_roll_number: string; p_old_roll_number: string }
        Returns: Json
      }
      check_email_availability: { Args: { p_email: string }; Returns: boolean }
      create_student_accounts_from_csv: {
        Args: never
        Returns: {
          message: string
          roll_number: string
          success: boolean
        }[]
      }
      link_student_to_auth_user: {
        Args: { p_roll_number: string; p_user_id: string }
        Returns: boolean
      }
      log_user_login: {
        Args: { p_action: string; p_details?: Json; p_user_id: string }
        Returns: undefined
      }
      update_student_auth_email: {
        Args: { p_new_email: string; p_user_id: string }
        Returns: Json
      }
    }
    Enums: {
      academic_year: "first" | "second" | "third" | "fourth"
      event_category: "on_stage" | "off_stage"
      event_mode: "individual" | "group"
      registration_method: "student" | "coordinator"
      registration_status: "pending" | "approved" | "rejected"
      user_role:
        | "admin"
        | "first_year_coordinator"
        | "second_year_coordinator"
        | "third_year_coordinator"
        | "fourth_year_coordinator"
        | "student"
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
      academic_year: ["first", "second", "third", "fourth"],
      event_category: ["on_stage", "off_stage"],
      event_mode: ["individual", "group"],
      registration_method: ["student", "coordinator"],
      registration_status: ["pending", "approved", "rejected"],
      user_role: [
        "admin",
        "first_year_coordinator",
        "second_year_coordinator",
        "third_year_coordinator",
        "fourth_year_coordinator",
        "student",
      ],
    },
  },
} as const
