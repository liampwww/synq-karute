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
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: {
      appointment_status: AppointmentStatus;
      recording_status: RecordingStatus;
      karte_status: KarteStatus;
      karte_category: KarteCategory;
      staff_role: StaffRole;
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
