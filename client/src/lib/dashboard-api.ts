import type { Epoch, Project, Task } from "@shared/network-feed";

export type DashboardOrganization = {
  id: string;
  name: string;
  description: string | null;
};

export type DashboardProfile = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  bio: string | null;
  reputation: number;
  motivation: number;
};

export type DashboardPayload = {
  profile: DashboardProfile;
  organizations: DashboardOrganization[];
  tasks: Task[];
  projects: Project[];
  epoch: Epoch | null;
};

/**
 * Load dashboard from Postgres. Returns 401 / 503 / 500 for auth, missing DB, or server errors.
 */
export async function fetchDashboard(): Promise<DashboardPayload> {
  const r = await fetch("/api/dashboard", { credentials: "include", cache: "no-store" });
  const data = (await r.json().catch(() => ({}))) as {
    message?: string;
  } & Partial<DashboardPayload>;
  if (!r.ok) {
    throw new Error(
      typeof data.message === "string" ? data.message : `Dashboard failed (${r.status})`,
    );
  }
  if (!data.profile || !Array.isArray(data.tasks) || !Array.isArray(data.projects)) {
    throw new Error("Invalid dashboard response");
  }
  return data as DashboardPayload;
}
