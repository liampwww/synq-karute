import type { FieldMapping, DedupStrategy, AnalysisResult, MigrationProgress } from "@/lib/migration/types";

export async function uploadMigrationFile(
  file: File,
  orgId: string,
  staffId: string
): Promise<{ jobId: string; analysis: AnalysisResult }> {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("orgId", orgId);
  formData.append("staffId", staffId);

  const res = await fetch("/api/migration/upload", {
    method: "POST",
    body: formData,
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || "Upload failed");
  }

  return res.json();
}

export async function confirmMigration(
  jobId: string,
  mappings: FieldMapping[],
  dedupStrategy: DedupStrategy
): Promise<{ jobId: string; status: string }> {
  const res = await fetch("/api/migration/confirm", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ jobId, mappings, dedupStrategy }),
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || "Confirm failed");
  }

  return res.json();
}

export async function getMigrationStatus(
  jobId: string
): Promise<MigrationProgress> {
  const res = await fetch(`/api/migration/status/${jobId}`);

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || "Status check failed");
  }

  return res.json();
}

export async function rollbackMigration(
  jobId: string
): Promise<{ deleted: number }> {
  const res = await fetch(`/api/migration/rollback/${jobId}`, {
    method: "POST",
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || "Rollback failed");
  }

  return res.json();
}
