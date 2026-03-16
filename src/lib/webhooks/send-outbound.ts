import type { SupabaseClient } from "@supabase/supabase-js";

const MAX_RETRIES = 3;

export type WebhookEvent =
  | { type: "karute.created"; payload: KaruteCreatedPayload }
  | { type: "karute.updated"; payload: KaruteUpdatedPayload };

export interface KaruteCreatedPayload {
  karute_id: string;
  customer_id: string;
  org_id: string;
  staff_id: string;
  appointment_id: string | null;
  summary: string | null;
  staff_advice: string | null;
  entry_count: number;
  created_at: string;
}

export interface KaruteUpdatedPayload {
  karute_id: string;
  customer_id: string;
  org_id: string;
  summary: string | null;
  status: string;
  updated_at: string;
}

interface OrgSettings {
  webhook_url?: string | null;
}

/**
 * Sends an outbound webhook for the given event. Fetches webhook_url from
 * organizations.settings, retries up to MAX_RETRIES on failure, and logs
 * all attempts to webhook_logs.
 */
export async function sendOutboundWebhook(
  supabase: SupabaseClient,
  orgId: string,
  event: WebhookEvent
): Promise<void> {
  const { data: org } = await supabase
    .from("organizations")
    .select("settings")
    .eq("id", orgId)
    .single();

  const settings = (org?.settings ?? {}) as OrgSettings;
  const url = settings.webhook_url;

  if (!url || typeof url !== "string") {
    return;
  }

  const body = {
    event: event.type,
    payload: event.payload,
    timestamp: new Date().toISOString(),
  };

  let lastError: string | null = null;
  let lastStatus: number | null = null;
  let lastResponse: string | null = null;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Webhook-Event": event.type,
          "X-Webhook-Attempt": String(attempt),
        },
        body: JSON.stringify(body),
      });

      lastStatus = res.status;
      lastResponse = (await res.text()).slice(0, 2000);

      if (res.ok) {
        await logWebhook(supabase, orgId, event.type, url, body, attempt, res.status, lastResponse, undefined);
        return;
      }

      lastError = `HTTP ${res.status}: ${lastResponse}`;
    } catch (err) {
      lastError = err instanceof Error ? err.message : String(err);
    }

    if (attempt < MAX_RETRIES) {
      await new Promise((r) => setTimeout(r, 1000 * attempt));
    }
  }

  await logWebhook(supabase, orgId, event.type, url, body, MAX_RETRIES, lastStatus ?? undefined, lastResponse ?? undefined, lastError ?? undefined);
}

async function logWebhook(
  supabase: SupabaseClient,
  orgId: string,
  eventType: string,
  url: string,
  payload: object,
  attempt: number,
  status?: number,
  response?: string,
  error?: string
): Promise<void> {
  await supabase.from("webhook_logs").insert({
    org_id: orgId,
    event_type: eventType,
    url,
    payload: payload as Record<string, unknown>,
    attempt,
    status: status ?? null,
    response: response ?? null,
    error: error ?? null,
  });
}
