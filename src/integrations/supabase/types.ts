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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      essay_themes: {
        Row: {
          area: string
          created_at: string
          description: string | null
          id: string
          motivating_texts: string | null
          source: string | null
          title: string
          year: number | null
        }
        Insert: {
          area?: string
          created_at?: string
          description?: string | null
          id?: string
          motivating_texts?: string | null
          source?: string | null
          title: string
          year?: number | null
        }
        Update: {
          area?: string
          created_at?: string
          description?: string | null
          id?: string
          motivating_texts?: string | null
          source?: string | null
          title?: string
          year?: number | null
        }
        Relationships: []
      }
      essays: {
        Row: {
          c1_check: boolean
          c1_feedback: string | null
          c1_score: number | null
          c2_check: boolean
          c2_feedback: string | null
          c2_score: number | null
          c3_check: boolean
          c3_feedback: string | null
          c3_score: number | null
          c4_check: boolean
          c4_feedback: string | null
          c4_score: number | null
          c5_check: boolean
          c5_feedback: string | null
          c5_score: number | null
          content: string
          corrected_at: string | null
          created_at: string
          custom_theme: string | null
          general_feedback: string | null
          id: string
          status: string
          theme_id: string | null
          title: string
          total_score: number | null
          updated_at: string
          user_id: string
          word_count: number
        }
        Insert: {
          c1_check?: boolean
          c1_feedback?: string | null
          c1_score?: number | null
          c2_check?: boolean
          c2_feedback?: string | null
          c2_score?: number | null
          c3_check?: boolean
          c3_feedback?: string | null
          c3_score?: number | null
          c4_check?: boolean
          c4_feedback?: string | null
          c4_score?: number | null
          c5_check?: boolean
          c5_feedback?: string | null
          c5_score?: number | null
          content?: string
          corrected_at?: string | null
          created_at?: string
          custom_theme?: string | null
          general_feedback?: string | null
          id?: string
          status?: string
          theme_id?: string | null
          title?: string
          total_score?: number | null
          updated_at?: string
          user_id: string
          word_count?: number
        }
        Update: {
          c1_check?: boolean
          c1_feedback?: string | null
          c1_score?: number | null
          c2_check?: boolean
          c2_feedback?: string | null
          c2_score?: number | null
          c3_check?: boolean
          c3_feedback?: string | null
          c3_score?: number | null
          c4_check?: boolean
          c4_feedback?: string | null
          c4_score?: number | null
          c5_check?: boolean
          c5_feedback?: string | null
          c5_score?: number | null
          content?: string
          corrected_at?: string | null
          created_at?: string
          custom_theme?: string | null
          general_feedback?: string | null
          id?: string
          status?: string
          theme_id?: string | null
          title?: string
          total_score?: number | null
          updated_at?: string
          user_id?: string
          word_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "essays_theme_id_fkey"
            columns: ["theme_id"]
            isOneToOne: false
            referencedRelation: "essay_themes"
            referencedColumns: ["id"]
          },
        ]
      }
      exam_answers: {
        Row: {
          answered_at: string
          attempt_id: string
          id: string
          is_correct: boolean
          question_id: string
          selected_letter: string | null
          user_id: string
        }
        Insert: {
          answered_at?: string
          attempt_id: string
          id?: string
          is_correct?: boolean
          question_id: string
          selected_letter?: string | null
          user_id: string
        }
        Update: {
          answered_at?: string
          attempt_id?: string
          id?: string
          is_correct?: boolean
          question_id?: string
          selected_letter?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "exam_answers_attempt_id_fkey"
            columns: ["attempt_id"]
            isOneToOne: false
            referencedRelation: "exam_attempts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exam_answers_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "exam_questions"
            referencedColumns: ["id"]
          },
        ]
      }
      exam_attempts: {
        Row: {
          correct_count: number
          created_at: string
          exam_id: string
          finished_at: string | null
          id: string
          score: number | null
          started_at: string
          status: string
          total_questions: number
          user_id: string
        }
        Insert: {
          correct_count?: number
          created_at?: string
          exam_id: string
          finished_at?: string | null
          id?: string
          score?: number | null
          started_at?: string
          status?: string
          total_questions?: number
          user_id: string
        }
        Update: {
          correct_count?: number
          created_at?: string
          exam_id?: string
          finished_at?: string | null
          id?: string
          score?: number | null
          started_at?: string
          status?: string
          total_questions?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "exam_attempts_exam_id_fkey"
            columns: ["exam_id"]
            isOneToOne: false
            referencedRelation: "exams"
            referencedColumns: ["id"]
          },
        ]
      }
      exam_questions: {
        Row: {
          alternatives: Json
          correct_letter: string
          created_at: string
          exam_id: string
          explanation: string | null
          id: string
          position: number
          statement: string
          subject_id: string | null
        }
        Insert: {
          alternatives: Json
          correct_letter: string
          created_at?: string
          exam_id: string
          explanation?: string | null
          id?: string
          position?: number
          statement: string
          subject_id?: string | null
        }
        Update: {
          alternatives?: Json
          correct_letter?: string
          created_at?: string
          exam_id?: string
          explanation?: string | null
          id?: string
          position?: number
          statement?: string
          subject_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "exam_questions_exam_id_fkey"
            columns: ["exam_id"]
            isOneToOne: false
            referencedRelation: "exams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exam_questions_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      exams: {
        Row: {
          area: string
          created_at: string
          description: string | null
          difficulty: string
          duration_min: number
          id: string
          title: string
        }
        Insert: {
          area?: string
          created_at?: string
          description?: string | null
          difficulty?: string
          duration_min?: number
          id?: string
          title: string
        }
        Update: {
          area?: string
          created_at?: string
          description?: string | null
          difficulty?: string
          duration_min?: number
          id?: string
          title?: string
        }
        Relationships: []
      }
      materials: {
        Row: {
          created_at: string
          description: string | null
          id: string
          subject_id: string
          title: string
          topic: string | null
          type: string
          updated_at: string
          url: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          subject_id: string
          title: string
          topic?: string | null
          type: string
          updated_at?: string
          url?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          subject_id?: string
          title?: string
          topic?: string | null
          type?: string
          updated_at?: string
          url?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "materials_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      notes: {
        Row: {
          content: string
          created_at: string
          id: string
          subject_id: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          content?: string
          created_at?: string
          id?: string
          subject_id: string
          title?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          subject_id?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notes_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          display_name: string | null
          email: string | null
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          email?: string | null
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          email?: string | null
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      schedule_tasks: {
        Row: {
          completed: boolean
          completed_at: string | null
          created_at: string
          description: string | null
          duration_min: number | null
          id: string
          scheduled_date: string
          subject_id: string | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          completed?: boolean
          completed_at?: string | null
          created_at?: string
          description?: string | null
          duration_min?: number | null
          id?: string
          scheduled_date: string
          subject_id?: string | null
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          completed?: boolean
          completed_at?: string | null
          created_at?: string
          description?: string | null
          duration_min?: number | null
          id?: string
          scheduled_date?: string
          subject_id?: string | null
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "schedule_tasks_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      study_plan_blocks: {
        Row: {
          created_at: string
          custom_topic: string | null
          day_of_week: number
          id: string
          plan_type: Database["public"]["Enums"]["plan_type"]
          position: number
          subject_id: string | null
          topic_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          custom_topic?: string | null
          day_of_week: number
          id?: string
          plan_type: Database["public"]["Enums"]["plan_type"]
          position: number
          subject_id?: string | null
          topic_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          custom_topic?: string | null
          day_of_week?: number
          id?: string
          plan_type?: Database["public"]["Enums"]["plan_type"]
          position?: number
          subject_id?: string | null
          topic_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "study_plan_blocks_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "study_plan_blocks_topic_id_fkey"
            columns: ["topic_id"]
            isOneToOne: false
            referencedRelation: "subject_topics"
            referencedColumns: ["id"]
          },
        ]
      }
      study_plan_completions: {
        Row: {
          block_id: string
          completed_at: string
          id: string
          user_id: string
        }
        Insert: {
          block_id: string
          completed_at?: string
          id?: string
          user_id: string
        }
        Update: {
          block_id?: string
          completed_at?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "study_plan_completions_block_id_fkey"
            columns: ["block_id"]
            isOneToOne: false
            referencedRelation: "study_plan_blocks"
            referencedColumns: ["id"]
          },
        ]
      }
      subject_topics: {
        Row: {
          created_at: string
          id: string
          name: string
          position: number
          subject_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          position?: number
          subject_id: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          position?: number
          subject_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "subject_topics_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      subjects: {
        Row: {
          area: string
          color: string | null
          created_at: string
          description: string | null
          icon: string | null
          id: string
          name: string
          slug: string
          top_topics: string[] | null
        }
        Insert: {
          area: string
          color?: string | null
          created_at?: string
          description?: string | null
          icon?: string | null
          id?: string
          name: string
          slug: string
          top_topics?: string[] | null
        }
        Update: {
          area?: string
          color?: string | null
          created_at?: string
          description?: string | null
          icon?: string | null
          id?: string
          name?: string
          slug?: string
          top_topics?: string[] | null
        }
        Relationships: []
      }
      user_preferences: {
        Row: {
          active_plan_type: Database["public"]["Enums"]["plan_type"]
          created_at: string
          updated_at: string
          user_id: string
        }
        Insert: {
          active_plan_type?: Database["public"]["Enums"]["plan_type"]
          created_at?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          active_plan_type?: Database["public"]["Enums"]["plan_type"]
          created_at?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_topic_progress: {
        Row: {
          completed_at: string
          id: string
          topic_id: string
          user_id: string
        }
        Insert: {
          completed_at?: string
          id?: string
          topic_id: string
          user_id: string
        }
        Update: {
          completed_at?: string
          id?: string
          topic_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_topic_progress_topic_id_fkey"
            columns: ["topic_id"]
            isOneToOne: false
            referencedRelation: "subject_topics"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      plan_type: "intensivo" | "extensivo"
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
      plan_type: ["intensivo", "extensivo"],
    },
  },
} as const
