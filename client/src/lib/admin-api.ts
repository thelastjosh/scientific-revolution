export type AdminSummary = {
  accounts: Array<{
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    role: string;
    bio: string | null;
  }>;
  tasks: Array<{
    id: string;
    title: string;
    status: string;
    ownerUserId: string;
    assigneeUserId: string | null;
    createdAt: string;
    updatedAt: string;
  }>;
  surveys: Array<Record<string, unknown>>;
  channelCredentials: Array<Record<string, unknown>>;
  contextEntries: Array<Record<string, unknown>>;
  adminEvents: Array<Record<string, unknown>>;
};

export async function fetchAdminSummary(): Promise<AdminSummary> {
  const r = await fetch("/api/admin/summary", { credentials: "include" });
  const data = (await r.json().catch(() => ({}))) as {
    message?: string;
  } & Partial<AdminSummary>;
  if (!r.ok) {
    throw new Error(data.message ?? `Admin summary failed (${r.status})`);
  }
  if (!Array.isArray(data.accounts) || !Array.isArray(data.tasks)) {
    throw new Error("Invalid admin response");
  }
  return data as AdminSummary;
}
