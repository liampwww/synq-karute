export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type KarteCategory =
  | "symptom"
  | "treatment"
  | "preference"
  | "lifestyle"
  | "next_appointment"
  | "product"
  | "other"
  | "professional"
  | "personal";

export type AppointmentStatus =
  | "scheduled"
  | "in_progress"
  | "completed"
  | "cancelled";

export type RecordingStatus =
  | "recording"
  | "paused"
  | "completed"
  | "processing"
  | "failed";

export type KarteStatus = "draft" | "review" | "approved";

export type StaffRole = "owner" | "admin" | "stylist" | "assistant";

export type TimelineEventType =
  | "visit"
  | "treatment"
  | "note"
  | "photo"
  | "form"
  | "contact"
  | "import"
  | "milestone"
  | "status_change";

export type InsightType =
  | "next_treatment"
  | "follow_up"
  | "reactivation"
  | "churn_risk"
  | "unresolved_issue"
  | "talking_point"
  | "upsell"
  | "photo_request"
  | "plan_incomplete"
  | "high_value"
  | "general";

export type InsightStatus = "active" | "dismissed" | "actioned" | "expired";

export type PhotoType = "before" | "after" | "progress" | "general" | "form";

export type MigrationJobStatus =
  | "pending"
  | "analyzing"
  | "mapping"
  | "importing"
  | "completed"
  | "failed"
  | "cancelled"
  | "rolling_back";

export type MigrationRecordStatus =
  | "pending"
  | "imported"
  | "failed"
  | "skipped"
  | "duplicate";

export interface Database {
  public: {
    Tables: {
      organizations: {
        Row: {
          id: string;
          name: string;
          type: string;
          settings: Json | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          type?: string;
          settings?: Json | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          type?: string;
          settings?: Json | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      staff: {
        Row: {
          id: string;
          org_id: string;
          user_id: string;
          name: string;
          role: StaffRole;
          email: string;
          avatar_url: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          org_id: string;
          user_id: string;
          name: string;
          role?: StaffRole;
          email: string;
          avatar_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          org_id?: string;
          user_id?: string;
          name?: string;
          role?: StaffRole;
          email?: string;
          avatar_url?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "staff_org_id_fkey";
            columns: ["org_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          }
        ];
      };
      customers: {
        Row: {
          id: string;
          org_id: string;
          name: string;
          name_kana: string | null;
          phone: string | null;
          email: string | null;
          profile: Json | null;
          tags: string[];
          notes: string | null;
          visit_count: number;
          first_visit_at: string | null;
          last_visit_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          org_id: string;
          name: string;
          name_kana?: string | null;
          phone?: string | null;
          email?: string | null;
          profile?: Json | null;
          tags?: string[];
          notes?: string | null;
          visit_count?: number;
          first_visit_at?: string | null;
          last_visit_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          org_id?: string;
          name?: string;
          name_kana?: string | null;
          phone?: string | null;
          email?: string | null;
          profile?: Json | null;
          tags?: string[];
          notes?: string | null;
          visit_count?: number;
          first_visit_at?: string | null;
          last_visit_at?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "customers_org_id_fkey";
            columns: ["org_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          }
        ];
      };
      appointments: {
        Row: {
          id: string;
          org_id: string;
          customer_id: string;
          staff_id: string;
          start_time: string;
          end_time: string;
          status: AppointmentStatus;
          service_type: string | null;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          org_id: string;
          customer_id: string;
          staff_id: string;
          start_time: string;
          end_time: string;
          status?: AppointmentStatus;
          service_type?: string | null;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          org_id?: string;
          customer_id?: string;
          staff_id?: string;
          start_time?: string;
          end_time?: string;
          status?: AppointmentStatus;
          service_type?: string | null;
          notes?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "appointments_org_id_fkey";
            columns: ["org_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "appointments_customer_id_fkey";
            columns: ["customer_id"];
            isOneToOne: false;
            referencedRelation: "customers";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "appointments_staff_id_fkey";
            columns: ["staff_id"];
            isOneToOne: false;
            referencedRelation: "staff";
            referencedColumns: ["id"];
          }
        ];
      };
      recording_sessions: {
        Row: {
          id: string;
          appointment_id: string | null;
          staff_id: string;
          customer_id: string;
          org_id: string;
          audio_storage_path: string | null;
          duration_seconds: number | null;
          status: RecordingStatus;
          started_at: string;
          ended_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          appointment_id?: string | null;
          staff_id: string;
          customer_id: string;
          org_id: string;
          audio_storage_path?: string | null;
          duration_seconds?: number | null;
          status?: RecordingStatus;
          started_at?: string;
          ended_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          appointment_id?: string | null;
          staff_id?: string;
          customer_id?: string;
          org_id?: string;
          audio_storage_path?: string | null;
          duration_seconds?: number | null;
          status?: RecordingStatus;
          started_at?: string;
          ended_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "recording_sessions_appointment_id_fkey";
            columns: ["appointment_id"];
            isOneToOne: false;
            referencedRelation: "appointments";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "recording_sessions_staff_id_fkey";
            columns: ["staff_id"];
            isOneToOne: false;
            referencedRelation: "staff";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "recording_sessions_customer_id_fkey";
            columns: ["customer_id"];
            isOneToOne: false;
            referencedRelation: "customers";
            referencedColumns: ["id"];
          }
        ];
      };
      transcription_segments: {
        Row: {
          id: string;
          recording_id: string;
          segment_index: number;
          speaker_label: string | null;
          content: string;
          start_ms: number;
          end_ms: number;
          language: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          recording_id: string;
          segment_index: number;
          speaker_label?: string | null;
          content: string;
          start_ms: number;
          end_ms: number;
          language?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          recording_id?: string;
          segment_index?: number;
          speaker_label?: string | null;
          content?: string;
          start_ms?: number;
          end_ms?: number;
          language?: string;
        };
        Relationships: [
          {
            foreignKeyName: "transcription_segments_recording_id_fkey";
            columns: ["recording_id"];
            isOneToOne: false;
            referencedRelation: "recording_sessions";
            referencedColumns: ["id"];
          }
        ];
      };
      karute_records: {
        Row: {
          id: string;
          customer_id: string;
          recording_id: string | null;
          staff_id: string;
          appointment_id: string | null;
          org_id: string;
          ai_summary: string | null;
          staff_advice: string | null;
          business_type: string;
          status: KarteStatus;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          customer_id: string;
          recording_id?: string | null;
          staff_id: string;
          appointment_id?: string | null;
          org_id: string;
          ai_summary?: string | null;
          staff_advice?: string | null;
          business_type?: string;
          status?: KarteStatus;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          customer_id?: string;
          recording_id?: string | null;
          staff_id?: string;
          appointment_id?: string | null;
          org_id?: string;
          ai_summary?: string | null;
          business_type?: string;
          status?: KarteStatus;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "karute_records_customer_id_fkey";
            columns: ["customer_id"];
            isOneToOne: false;
            referencedRelation: "customers";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "karute_records_recording_id_fkey";
            columns: ["recording_id"];
            isOneToOne: false;
            referencedRelation: "recording_sessions";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "karute_records_staff_id_fkey";
            columns: ["staff_id"];
            isOneToOne: false;
            referencedRelation: "staff";
            referencedColumns: ["id"];
          }
        ];
      };
      karute_entries: {
        Row: {
          id: string;
          karute_id: string;
          category: KarteCategory;
          subcategory: string | null;
          content: string;
          original_quote: string | null;
          confidence: number;
          metadata: Json | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          karute_id: string;
          category: KarteCategory;
          subcategory?: string | null;
          content: string;
          original_quote?: string | null;
          confidence?: number;
          metadata?: Json | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          karute_id?: string;
          category?: KarteCategory;
          subcategory?: string | null;
          content?: string;
          original_quote?: string | null;
          confidence?: number;
          metadata?: Json | null;
        };
        Relationships: [
          {
            foreignKeyName: "karute_entries_karute_id_fkey";
            columns: ["karute_id"];
            isOneToOne: false;
            referencedRelation: "karute_records";
            referencedColumns: ["id"];
          }
        ];
      };
      timeline_events: {
        Row: {
          id: string;
          customer_id: string;
          org_id: string;
          staff_id: string | null;
          event_type: TimelineEventType;
          source: string;
          source_ref: string | null;
          title: string;
          description: string | null;
          structured_data: Json | null;
          event_date: string;
          linked_record_id: string | null;
          linked_record_type: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          customer_id: string;
          org_id: string;
          staff_id?: string | null;
          event_type: TimelineEventType;
          source?: string;
          source_ref?: string | null;
          title: string;
          description?: string | null;
          structured_data?: Json | null;
          event_date: string;
          linked_record_id?: string | null;
          linked_record_type?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          customer_id?: string;
          org_id?: string;
          staff_id?: string | null;
          event_type?: TimelineEventType;
          source?: string;
          source_ref?: string | null;
          title?: string;
          description?: string | null;
          structured_data?: Json | null;
          event_date?: string;
          linked_record_id?: string | null;
          linked_record_type?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "timeline_events_customer_id_fkey";
            columns: ["customer_id"];
            isOneToOne: false;
            referencedRelation: "customers";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "timeline_events_org_id_fkey";
            columns: ["org_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          }
        ];
      };
      customer_photos: {
        Row: {
          id: string;
          customer_id: string;
          org_id: string;
          timeline_event_id: string | null;
          storage_path: string;
          caption: string | null;
          photo_type: PhotoType;
          metadata: Json | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          customer_id: string;
          org_id: string;
          timeline_event_id?: string | null;
          storage_path: string;
          caption?: string | null;
          photo_type?: PhotoType;
          metadata?: Json | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          customer_id?: string;
          org_id?: string;
          timeline_event_id?: string | null;
          storage_path?: string;
          caption?: string | null;
          photo_type?: PhotoType;
          metadata?: Json | null;
        };
        Relationships: [
          {
            foreignKeyName: "customer_photos_customer_id_fkey";
            columns: ["customer_id"];
            isOneToOne: false;
            referencedRelation: "customers";
            referencedColumns: ["id"];
          }
        ];
      };
      customer_ai_insights: {
        Row: {
          id: string;
          customer_id: string;
          org_id: string;
          insight_type: InsightType;
          title: string;
          description: string;
          action_data: Json | null;
          priority_score: number;
          status: InsightStatus;
          generated_at: string;
          expires_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          customer_id: string;
          org_id: string;
          insight_type: InsightType;
          title: string;
          description: string;
          action_data?: Json | null;
          priority_score?: number;
          status?: InsightStatus;
          generated_at?: string;
          expires_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          customer_id?: string;
          org_id?: string;
          insight_type?: InsightType;
          title?: string;
          description?: string;
          action_data?: Json | null;
          priority_score?: number;
          status?: InsightStatus;
          expires_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "customer_ai_insights_customer_id_fkey";
            columns: ["customer_id"];
            isOneToOne: false;
            referencedRelation: "customers";
            referencedColumns: ["id"];
          }
        ];
      };
      migration_jobs: {
        Row: {
          id: string;
          org_id: string;
          staff_id: string;
          source_type: string;
          source_name: string | null;
          status: MigrationJobStatus;
          total_records: number;
          imported_records: number;
          failed_records: number;
          skipped_records: number;
          field_mapping: Json | null;
          error_log: Json | null;
          uploaded_file_path: string | null;
          metadata: Json | null;
          started_at: string | null;
          completed_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          org_id: string;
          staff_id: string;
          source_type: string;
          source_name?: string | null;
          status?: MigrationJobStatus;
          total_records?: number;
          imported_records?: number;
          failed_records?: number;
          skipped_records?: number;
          field_mapping?: Json | null;
          error_log?: Json | null;
          uploaded_file_path?: string | null;
          metadata?: Json | null;
          started_at?: string | null;
          completed_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          org_id?: string;
          staff_id?: string;
          source_type?: string;
          source_name?: string | null;
          status?: MigrationJobStatus;
          total_records?: number;
          imported_records?: number;
          failed_records?: number;
          skipped_records?: number;
          field_mapping?: Json | null;
          error_log?: Json | null;
          uploaded_file_path?: string | null;
          metadata?: Json | null;
          started_at?: string | null;
          completed_at?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "migration_jobs_org_id_fkey";
            columns: ["org_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          }
        ];
      };
      customer_insights: {
        Row: {
          id: string;
          customer_id: string;
          org_id: string;
          total_visits: number;
          total_spend: number;
          ltv: number;
          avg_session_duration: string | null;
          top_pro_topics: Json | null;
          top_personal_topics: Json | null;
          recurring_themes: Json | null;
          trend_analysis: Json | null;
          last_calculated_at: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          customer_id: string;
          org_id: string;
          total_visits?: number;
          total_spend?: number;
          ltv?: number;
          avg_session_duration?: string | null;
          top_pro_topics?: Json | null;
          top_personal_topics?: Json | null;
          recurring_themes?: Json | null;
          trend_analysis?: Json | null;
          last_calculated_at?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          customer_id?: string;
          org_id?: string;
          total_visits?: number;
          total_spend?: number;
          ltv?: number;
          avg_session_duration?: string | null;
          top_pro_topics?: Json | null;
          top_personal_topics?: Json | null;
          recurring_themes?: Json | null;
          trend_analysis?: Json | null;
          last_calculated_at?: string;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "customer_insights_customer_id_fkey";
            columns: ["customer_id"];
            isOneToOne: true;
            referencedRelation: "customers";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "customer_insights_org_id_fkey";
            columns: ["org_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
        ];
      };
      staff_analytics: {
        Row: {
          id: string;
          staff_id: string;
          org_id: string;
          period_start: string;
          period_end: string;
          total_sessions: number;
          avg_confidence: number;
          talk_ratio: Json | null;
          top_topics: Json | null;
          customer_satisfaction_indicators: Json | null;
          repeat_rate: number;
          revenue_attributed: number;
          ai_coaching_notes: string | null;
          calculated_at: string;
        };
        Insert: {
          id?: string;
          staff_id: string;
          org_id: string;
          period_start: string;
          period_end: string;
          total_sessions?: number;
          avg_confidence?: number;
          talk_ratio?: Json | null;
          top_topics?: Json | null;
          customer_satisfaction_indicators?: Json | null;
          repeat_rate?: number;
          revenue_attributed?: number;
          ai_coaching_notes?: string | null;
          calculated_at?: string;
        };
        Update: {
          id?: string;
          staff_id?: string;
          org_id?: string;
          period_start?: string;
          period_end?: string;
          total_sessions?: number;
          avg_confidence?: number;
          talk_ratio?: Json | null;
          top_topics?: Json | null;
          customer_satisfaction_indicators?: Json | null;
          repeat_rate?: number;
          revenue_attributed?: number;
          ai_coaching_notes?: string | null;
          calculated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "staff_analytics_staff_id_fkey";
            columns: ["staff_id"];
            isOneToOne: false;
            referencedRelation: "staff";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "staff_analytics_org_id_fkey";
            columns: ["org_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
        ];
      };
      migration_records: {
        Row: {
          id: string;
          job_id: string;
          source_row_index: number | null;
          target_table: string;
          target_id: string | null;
          status: MigrationRecordStatus;
          source_data: Json | null;
          error_message: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          job_id: string;
          source_row_index?: number | null;
          target_table: string;
          target_id?: string | null;
          status?: MigrationRecordStatus;
          source_data?: Json | null;
          error_message?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          job_id?: string;
          source_row_index?: number | null;
          target_table?: string;
          target_id?: string | null;
          status?: MigrationRecordStatus;
          source_data?: Json | null;
          error_message?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "migration_records_job_id_fkey";
            columns: ["job_id"];
            isOneToOne: false;
            referencedRelation: "migration_jobs";
            referencedColumns: ["id"];
          }
        ];
      };
      webhook_logs: {
        Row: {
          id: string;
          org_id: string;
          event_type: string;
          url: string;
          payload: Json;
          attempt: number;
          status: number | null;
          response: string | null;
          error: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          org_id: string;
          event_type: string;
          url: string;
          payload?: Json;
          attempt?: number;
          status?: number | null;
          response?: string | null;
          error?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          org_id?: string;
          event_type?: string;
          url?: string;
          payload?: Json;
          attempt?: number;
          status?: number | null;
          response?: string | null;
          error?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "webhook_logs_org_id_fkey";
            columns: ["org_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          }
        ];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: {
      appointment_status: AppointmentStatus;
      recording_status: RecordingStatus;
      karte_status: KarteStatus;
      karte_category: KarteCategory;
      staff_role: StaffRole;
      timeline_event_type: TimelineEventType;
      insight_type: InsightType;
      insight_status: InsightStatus;
      photo_type: PhotoType;
      migration_job_status: MigrationJobStatus;
      migration_record_status: MigrationRecordStatus;
    };
    CompositeTypes: Record<string, never>;
  };
}

export type Tables<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Row"];
export type InsertTables<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Insert"];
export type UpdateTables<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Update"];
