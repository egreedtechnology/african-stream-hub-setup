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
      ai_jobs: {
        Row: {
          created_at: string
          error: string | null
          finished_at: string | null
          id: string
          kind: string
          started_at: string | null
          status: string
          updated_at: string
          video_id: string
        }
        Insert: {
          created_at?: string
          error?: string | null
          finished_at?: string | null
          id?: string
          kind: string
          started_at?: string | null
          status?: string
          updated_at?: string
          video_id: string
        }
        Update: {
          created_at?: string
          error?: string | null
          finished_at?: string | null
          id?: string
          kind?: string
          started_at?: string | null
          status?: string
          updated_at?: string
          video_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_jobs_video_id_fkey"
            columns: ["video_id"]
            isOneToOne: false
            referencedRelation: "videos"
            referencedColumns: ["id"]
          },
        ]
      }
      comments: {
        Row: {
          body: string
          created_at: string
          edited: boolean
          id: string
          updated_at: string
          user_id: string
          video_id: string
        }
        Insert: {
          body: string
          created_at?: string
          edited?: boolean
          id?: string
          updated_at?: string
          user_id: string
          video_id: string
        }
        Update: {
          body?: string
          created_at?: string
          edited?: boolean
          id?: string
          updated_at?: string
          user_id?: string
          video_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "comments_user_profile_fk"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comments_video_fk"
            columns: ["video_id"]
            isOneToOne: false
            referencedRelation: "videos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comments_video_id_fkey"
            columns: ["video_id"]
            isOneToOne: false
            referencedRelation: "videos"
            referencedColumns: ["id"]
          },
        ]
      }
      follows: {
        Row: {
          created_at: string
          follower_id: string
          following_id: string
          id: string
        }
        Insert: {
          created_at?: string
          follower_id: string
          following_id: string
          id?: string
        }
        Update: {
          created_at?: string
          follower_id?: string
          following_id?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "follows_follower_profile_fk"
            columns: ["follower_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "follows_following_profile_fk"
            columns: ["following_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          banner_url: string | null
          bio: string | null
          country: string | null
          created_at: string
          display_name: string | null
          id: string
          preferred_language: string | null
          updated_at: string
          username: string | null
        }
        Insert: {
          avatar_url?: string | null
          banner_url?: string | null
          bio?: string | null
          country?: string | null
          created_at?: string
          display_name?: string | null
          id: string
          preferred_language?: string | null
          updated_at?: string
          username?: string | null
        }
        Update: {
          avatar_url?: string | null
          banner_url?: string | null
          bio?: string | null
          country?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          preferred_language?: string | null
          updated_at?: string
          username?: string | null
        }
        Relationships: []
      }
      thumbnail_candidates: {
        Row: {
          created_at: string
          id: string
          owner_id: string
          position: number
          reason: string | null
          score: number
          score_breakdown: Json
          selected: boolean
          source: string
          timestamp_seconds: number | null
          url: string
          video_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          owner_id: string
          position?: number
          reason?: string | null
          score?: number
          score_breakdown?: Json
          selected?: boolean
          source: string
          timestamp_seconds?: number | null
          url: string
          video_id: string
        }
        Update: {
          created_at?: string
          id?: string
          owner_id?: string
          position?: number
          reason?: string | null
          score?: number
          score_breakdown?: Json
          selected?: boolean
          source?: string
          timestamp_seconds?: number | null
          url?: string
          video_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "thumbnail_candidates_video_id_fkey"
            columns: ["video_id"]
            isOneToOne: false
            referencedRelation: "videos"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      video_ai_metadata: {
        Row: {
          audience: string | null
          category_suggested: string | null
          chapters: Json | null
          created_at: string
          detected_language: string | null
          hashtags: string[] | null
          industry: string | null
          key_takeaways: Json | null
          moderation: Json | null
          moderation_status: string | null
          seo_description: string | null
          seo_title: string | null
          social_posts: Json | null
          summary_long: string | null
          summary_short: string | null
          tags: string[] | null
          topic: string | null
          transcript_text: string | null
          updated_at: string
          video_id: string
        }
        Insert: {
          audience?: string | null
          category_suggested?: string | null
          chapters?: Json | null
          created_at?: string
          detected_language?: string | null
          hashtags?: string[] | null
          industry?: string | null
          key_takeaways?: Json | null
          moderation?: Json | null
          moderation_status?: string | null
          seo_description?: string | null
          seo_title?: string | null
          social_posts?: Json | null
          summary_long?: string | null
          summary_short?: string | null
          tags?: string[] | null
          topic?: string | null
          transcript_text?: string | null
          updated_at?: string
          video_id: string
        }
        Update: {
          audience?: string | null
          category_suggested?: string | null
          chapters?: Json | null
          created_at?: string
          detected_language?: string | null
          hashtags?: string[] | null
          industry?: string | null
          key_takeaways?: Json | null
          moderation?: Json | null
          moderation_status?: string | null
          seo_description?: string | null
          seo_title?: string | null
          social_posts?: Json | null
          summary_long?: string | null
          summary_short?: string | null
          tags?: string[] | null
          topic?: string | null
          transcript_text?: string | null
          updated_at?: string
          video_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "video_ai_metadata_video_id_fkey"
            columns: ["video_id"]
            isOneToOne: true
            referencedRelation: "videos"
            referencedColumns: ["id"]
          },
        ]
      }
      video_captions: {
        Row: {
          created_at: string
          id: string
          is_default: boolean
          language: string
          source: string
          updated_at: string
          video_id: string
          vtt_url: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_default?: boolean
          language: string
          source?: string
          updated_at?: string
          video_id: string
          vtt_url: string
        }
        Update: {
          created_at?: string
          id?: string
          is_default?: boolean
          language?: string
          source?: string
          updated_at?: string
          video_id?: string
          vtt_url?: string
        }
        Relationships: [
          {
            foreignKeyName: "video_captions_video_id_fkey"
            columns: ["video_id"]
            isOneToOne: false
            referencedRelation: "videos"
            referencedColumns: ["id"]
          },
        ]
      }
      video_embeddings: {
        Row: {
          created_at: string
          embedding: string
          model: string
          source_text: string | null
          updated_at: string
          video_id: string
        }
        Insert: {
          created_at?: string
          embedding: string
          model?: string
          source_text?: string | null
          updated_at?: string
          video_id: string
        }
        Update: {
          created_at?: string
          embedding?: string
          model?: string
          source_text?: string | null
          updated_at?: string
          video_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "video_embeddings_video_id_fkey"
            columns: ["video_id"]
            isOneToOne: true
            referencedRelation: "videos"
            referencedColumns: ["id"]
          },
        ]
      }
      video_likes: {
        Row: {
          created_at: string
          user_id: string
          video_id: string
        }
        Insert: {
          created_at?: string
          user_id: string
          video_id: string
        }
        Update: {
          created_at?: string
          user_id?: string
          video_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "video_likes_user_profile_fk"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "video_likes_video_fk"
            columns: ["video_id"]
            isOneToOne: false
            referencedRelation: "videos"
            referencedColumns: ["id"]
          },
        ]
      }
      video_progress: {
        Row: {
          muted: boolean
          position_seconds: number
          subtitle_lang: string | null
          updated_at: string
          user_id: string
          video_id: string
        }
        Insert: {
          muted?: boolean
          position_seconds?: number
          subtitle_lang?: string | null
          updated_at?: string
          user_id: string
          video_id: string
        }
        Update: {
          muted?: boolean
          position_seconds?: number
          subtitle_lang?: string | null
          updated_at?: string
          user_id?: string
          video_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "video_progress_user_profile_fk"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "video_progress_video_fk"
            columns: ["video_id"]
            isOneToOne: false
            referencedRelation: "videos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "video_progress_video_id_fkey"
            columns: ["video_id"]
            isOneToOne: false
            referencedRelation: "videos"
            referencedColumns: ["id"]
          },
        ]
      }
      videos: {
        Row: {
          ai_thumbnail_url: string | null
          category: Database["public"]["Enums"]["video_category"]
          country: string | null
          created_at: string
          description: string | null
          duration_seconds: number | null
          id: string
          keywords: string | null
          language: Database["public"]["Enums"]["video_language"]
          likes: number
          media_type: Database["public"]["Enums"]["media_type"]
          owner_id: string
          status: Database["public"]["Enums"]["video_status"]
          tags: string[] | null
          thumbnail_generated_at: string | null
          thumbnail_generation_status: string
          thumbnail_options: Json
          thumbnail_url: string | null
          title: string
          updated_at: string
          video_url: string
          views: number
          visibility: Database["public"]["Enums"]["video_visibility"]
        }
        Insert: {
          ai_thumbnail_url?: string | null
          category?: Database["public"]["Enums"]["video_category"]
          country?: string | null
          created_at?: string
          description?: string | null
          duration_seconds?: number | null
          id?: string
          keywords?: string | null
          language?: Database["public"]["Enums"]["video_language"]
          likes?: number
          media_type?: Database["public"]["Enums"]["media_type"]
          owner_id: string
          status?: Database["public"]["Enums"]["video_status"]
          tags?: string[] | null
          thumbnail_generated_at?: string | null
          thumbnail_generation_status?: string
          thumbnail_options?: Json
          thumbnail_url?: string | null
          title: string
          updated_at?: string
          video_url: string
          views?: number
          visibility?: Database["public"]["Enums"]["video_visibility"]
        }
        Update: {
          ai_thumbnail_url?: string | null
          category?: Database["public"]["Enums"]["video_category"]
          country?: string | null
          created_at?: string
          description?: string | null
          duration_seconds?: number | null
          id?: string
          keywords?: string | null
          language?: Database["public"]["Enums"]["video_language"]
          likes?: number
          media_type?: Database["public"]["Enums"]["media_type"]
          owner_id?: string
          status?: Database["public"]["Enums"]["video_status"]
          tags?: string[] | null
          thumbnail_generated_at?: string | null
          thumbnail_generation_status?: string
          thumbnail_options?: Json
          thumbnail_url?: string | null
          title?: string
          updated_at?: string
          video_url?: string
          views?: number
          visibility?: Database["public"]["Enums"]["video_visibility"]
        }
        Relationships: [
          {
            foreignKeyName: "videos_owner_profile_fk"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      for_you_feed: {
        Args: { _limit?: number; _user_id: string }
        Returns: {
          score: number
          video_id: string
        }[]
      }
      get_follower_count: { Args: { _creator: string }; Returns: number }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      match_videos: {
        Args: {
          match_count?: number
          min_similarity?: number
          query_embedding: string
        }
        Returns: {
          similarity: number
          video_id: string
        }[]
      }
    }
    Enums: {
      app_role: "admin" | "creator" | "user"
      media_type: "video" | "audio"
      video_category: "Music" | "Comedy" | "Films" | "Agasobanuye"
      video_language: "Kinyarwanda" | "Swahili" | "English"
      video_status: "processing" | "ready" | "failed"
      video_visibility: "public" | "unlisted" | "private"
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
      app_role: ["admin", "creator", "user"],
      media_type: ["video", "audio"],
      video_category: ["Music", "Comedy", "Films", "Agasobanuye"],
      video_language: ["Kinyarwanda", "Swahili", "English"],
      video_status: ["processing", "ready", "failed"],
      video_visibility: ["public", "unlisted", "private"],
    },
  },
} as const
