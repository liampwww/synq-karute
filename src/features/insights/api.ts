import type { Tables, InsightStatus } from "@/types/database";

type CustomerAiInsight = Tables<"customer_ai_insights"> & {
  customers?: { name: string };
};

export async function getInsights(options: {
  customerId?: string;
  orgId?: string;
  status?: InsightStatus;
  limit?: number;
}): Promise<CustomerAiInsight[]> {
  const params = new URLSearchParams();
  if (options.customerId) params.set("customerId", options.customerId);
  if (options.orgId) params.set("orgId", options.orgId);
  if (options.status) params.set("status", options.status);
  if (options.limit) params.set("limit", String(options.limit));

  const res = await fetch(`/api/insights?${params.toString()}`);
  if (!res.ok) throw new Error("Failed to fetch insights");
  return res.json();
}

export async function generateInsights(
  customerId: string,
  orgId: string,
  businessType?: string
): Promise<{ generated: number }> {
  const res = await fetch("/api/insights/generate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ customerId, orgId, businessType }),
  });
  if (!res.ok) throw new Error("Failed to generate insights");
  return res.json();
}

export async function updateInsightStatus(
  id: string,
  status: "dismissed" | "actioned"
): Promise<void> {
  const res = await fetch(`/api/insights/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status }),
  });
  if (!res.ok) throw new Error("Failed to update insight");
}
