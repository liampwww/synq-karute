import { createClient } from "@/lib/supabase/client";
import type { Tables, InsertTables, RecordingStatus } from "@/types/database";

type RecordingSession = Tables<"recording_sessions">;

export async function createRecordingSession(data: {
  appointment_id?: string;
  staff_id: string;
  customer_id: string;
  org_id: string;
}): Promise<Tables<"recording_sessions">> {
  const supabase = createClient();

  const insertData: InsertTables<"recording_sessions"> = {
    staff_id: data.staff_id,
    customer_id: data.customer_id,
    org_id: data.org_id,
    appointment_id: data.appointment_id ?? null,
    status: "recording",
    started_at: new Date().toISOString(),
  };

  const { data: session, error } = await supabase
    .from("recording_sessions")
    .insert(insertData)
    .select()
    .single();

  if (error) throw error;
  return session as RecordingSession;
}

export async function updateRecordingSession(
  id: string,
  data: {
    status?: RecordingStatus;
    duration_seconds?: number;
    ended_at?: string;
    audio_storage_path?: string;
  }
): Promise<RecordingSession> {
  const supabase = createClient();

  const { data: session, error } = await supabase
    .from("recording_sessions")
    .update(data as Record<string, unknown>)
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  return session as RecordingSession;
}

export async function uploadAudioFile(
  recordingId: string,
  audioBlob: Blob,
  orgId: string
): Promise<string> {
  const supabase = createClient();

  const extension = audioBlob.type.includes("mp4") ? "mp4" : "webm";
  const storagePath = `${orgId}/${recordingId}.${extension}`;

  const { error } = await supabase.storage
    .from("recordings")
    .upload(storagePath, audioBlob, {
      contentType: audioBlob.type,
      upsert: true,
    });

  if (error) throw error;
  return storagePath;
}

export async function getRecordingSession(
  id: string
): Promise<Tables<"recording_sessions"> | null> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("recording_sessions")
    .select("*")
    .eq("id", id)
    .single();

  if (error) {
    if (error.code === "PGRST116") return null;
    throw error;
  }

  return data as RecordingSession;
}

export async function getTodayAppointments(
  orgId: string,
  staffId: string
): Promise<
  (Tables<"appointments"> & { customers: Tables<"customers"> | null })[]
> {
  const supabase = createClient();

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const { data, error } = await supabase
    .from("appointments")
    .select("*, customers(*)")
    .eq("org_id", orgId)
    .eq("staff_id", staffId)
    .gte("start_time", today.toISOString())
    .lt("start_time", tomorrow.toISOString())
    .in("status", ["scheduled", "in_progress"])
    .order("start_time", { ascending: true });

  if (error) throw error;
  return data as (Tables<"appointments"> & {
    customers: Tables<"customers"> | null;
  })[];
}
