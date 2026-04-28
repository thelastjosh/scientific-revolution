import type { UiExperiment } from "@shared/schema";

export async function fetchUiExperiments(): Promise<UiExperiment[]> {
  const r = await fetch("/api/ui-experiments");
  if (!r.ok) {
    throw new Error(`Failed to load UI experiments (${r.status})`);
  }
  const data = (await r.json()) as { experiments: UiExperiment[] };
  return data.experiments;
}

export async function putUiExperiment(
  key: string,
  body: { enabled?: boolean; variant?: "control" | "variant_b" },
  adminToken?: string,
): Promise<UiExperiment> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (adminToken) {
    headers.Authorization = `Bearer ${adminToken}`;
  }
  const r = await fetch(
    `/api/ui-experiments/${encodeURIComponent(key)}`,
    {
      method: "PUT",
      credentials: "include",
      headers,
      body: JSON.stringify(body),
    },
  );
  const payload = await r.json().catch(() => ({}));
  if (!r.ok) {
    throw new Error(
      typeof payload.message === "string"
        ? payload.message
        : `Update failed (${r.status})`,
    );
  }
  return (payload as { experiment: UiExperiment }).experiment;
}
