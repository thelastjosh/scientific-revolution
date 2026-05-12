import type { Task, WorkspaceChatMessage, WorkspaceSession } from "@shared/network-feed";

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
  profileMarkdown: string;
  relationshipMarkdown: string;
  skillMarkdown: string;
};

export type DashboardPayload = {
  isAdmin: boolean;
  profile: DashboardProfile;
  organizations: DashboardOrganization[];
  tasks: Task[];
  people: DashboardProfile[];
  workspaceSession: WorkspaceSession;
  workspaceMessages: WorkspaceChatMessage[];
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
  if (
    typeof data.isAdmin !== "boolean" ||
    !data.profile ||
    !Array.isArray(data.tasks) ||
    !Array.isArray(data.people) ||
    !Array.isArray(data.organizations) ||
    !data.workspaceSession ||
    !Array.isArray(data.workspaceMessages)
  ) {
    throw new Error("Invalid dashboard response");
  }
  return data as DashboardPayload;
}

export async function saveProfileDraft(input: {
  firstName?: string;
  lastName?: string;
  bio?: string | null;
  profileMarkdown?: string;
  relationshipMarkdown?: string;
  skillMarkdown?: string;
}): Promise<DashboardProfile> {
  const r = await fetch("/api/profile/me", {
    method: "PUT",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  const data = (await r.json().catch(() => ({}))) as {
    message?: string;
    profile?: DashboardProfile;
  };
  if (!r.ok || !data.profile) {
    throw new Error(data.message ?? `Profile update failed (${r.status})`);
  }
  return data.profile;
}

export async function sendWorkspaceChat(input: {
  sessionId: string;
  content: string;
}): Promise<{ userMessage: WorkspaceChatMessage; assistantMessage: WorkspaceChatMessage }> {
  const r = await fetch("/api/workspace/chat", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  const data = (await r.json().catch(() => ({}))) as {
    message?: string;
    userMessage?: WorkspaceChatMessage;
    assistantMessage?: WorkspaceChatMessage;
  };
  if (!r.ok || !data.userMessage || !data.assistantMessage) {
    throw new Error(data.message ?? `Workspace chat failed (${r.status})`);
  }
  return { userMessage: data.userMessage, assistantMessage: data.assistantMessage };
}

export async function extractTaskDraft(rawSourceDoc: string): Promise<{
  title: string;
  description: string;
  extractedTasks: Array<{ title: string; description: string }>;
}> {
  const r = await fetch("/api/tasks/extract", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ rawSourceDoc }),
  });
  const data = (await r.json().catch(() => ({}))) as {
    message?: string;
    draft?: {
      title: string;
      description: string;
      extractedTasks: Array<{ title: string; description: string }>;
    };
  };
  if (!r.ok || !data.draft) {
    throw new Error(data.message ?? `Task extraction failed (${r.status})`);
  }
  return data.draft;
}

export async function createTask(input: {
  title: string;
  description: string;
  rawSourceDoc?: string | null;
  organizationId?: string | null;
  deliveryChannels?: { kind: "email"; address: string; state?: string }[];
}): Promise<Task> {
  const r = await fetch("/api/tasks", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  const data = (await r.json().catch(() => ({}))) as { message?: string; task?: Task };
  if (!r.ok || !data.task) {
    throw new Error(data.message ?? `Task create failed (${r.status})`);
  }
  return data.task;
}

export async function updateTask(
  taskId: string,
  patch: Partial<
    Pick<Task, "title" | "description" | "status" | "organizationId" | "deliveryChannels">
  >,
): Promise<Task> {
  const r = await fetch(`/api/tasks/${encodeURIComponent(taskId)}`, {
    method: "PUT",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(patch),
  });
  const data = (await r.json().catch(() => ({}))) as { message?: string; task?: Task };
  if (!r.ok || !data.task) {
    throw new Error(data.message ?? `Task update failed (${r.status})`);
  }
  return data.task;
}
