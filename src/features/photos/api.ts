import { createClient } from "@/lib/supabase/client";
import type { Tables, InsertTables, PhotoType } from "@/types/database";

type CustomerPhoto = Tables<"customer_photos">;

export async function getCustomerPhotos(
  customerId: string,
  photoType?: PhotoType
): Promise<CustomerPhoto[]> {
  const supabase = createClient();
  let query = supabase
    .from("customer_photos")
    .select("*")
    .eq("customer_id", customerId)
    .order("created_at", { ascending: false });

  if (photoType) {
    query = query.eq("photo_type", photoType);
  }

  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as CustomerPhoto[];
}

export async function uploadCustomerPhoto(
  file: File,
  customerId: string,
  orgId: string,
  options?: {
    photoType?: PhotoType;
    caption?: string;
    timelineEventId?: string;
  }
): Promise<CustomerPhoto> {
  const supabase = createClient();
  const ext = file.name.split(".").pop() ?? "jpg";
  const path = `${orgId}/${customerId}/${Date.now()}.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from("photos")
    .upload(path, file, { contentType: file.type });

  if (uploadError) throw uploadError;

  const { data, error } = await supabase
    .from("customer_photos")
    .insert({
      customer_id: customerId,
      org_id: orgId,
      storage_path: path,
      photo_type: options?.photoType ?? "general",
      caption: options?.caption ?? null,
      timeline_event_id: options?.timelineEventId ?? null,
    } as InsertTables<"customer_photos">)
    .select()
    .single();

  if (error) throw error;
  return data as CustomerPhoto;
}

export function getPhotoUrl(storagePath: string): string {
  const supabase = createClient();
  const { data } = supabase.storage.from("photos").getPublicUrl(storagePath);
  return data.publicUrl;
}

export async function getPhotoSignedUrl(storagePath: string): Promise<string> {
  const supabase = createClient();
  const { data, error } = await supabase.storage
    .from("photos")
    .createSignedUrl(storagePath, 3600);
  if (error) throw error;
  return data.signedUrl;
}

export async function deleteCustomerPhoto(id: string, storagePath: string): Promise<void> {
  const supabase = createClient();

  await supabase.storage.from("photos").remove([storagePath]);

  const { error } = await supabase
    .from("customer_photos")
    .delete()
    .eq("id", id);

  if (error) throw error;
}
