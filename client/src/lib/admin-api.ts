export type AdminMemberIntegration = {
  id: string;
  provider: string;
  accountLabel: string;
  status: string;
  credentialRefPreview: string;
  updatedAt: string;
};

export type AdminChannelCredentialSafe = AdminMemberIntegration & {
  userId: string;
  createdAt: string;
};

export type AdminAccount = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  bio: string | null;
  profileMarkdown?: string | null;
  relationshipMarkdown?: string | null;
  skillMarkdown?: string | null;
  phoneNumber: string | null;
  integrations: AdminMemberIntegration[];
};

export type AdminSummary = {
  accounts: AdminAccount[];
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
  channelCredentials: AdminChannelCredentialSafe[];
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

export async function postAdminMemberNotifyTest(
  userId: string,
  body: { channel: "email" | "workspace_message" | "telegram"; subject?: string; body?: string },
): Promise<{ ok: true; channel: string; detail?: unknown }> {
  const r = await fetch(`/api/admin/members/${encodeURIComponent(userId)}/notify-test`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = (await r.json().catch(() => ({}))) as {
    message?: string;
    ok?: boolean;
    channel?: string;
    detail?: unknown;
  };
  if (!r.ok) {
    const msg =
      typeof data.message === "string"
        ? data.message
        : typeof data.message === "object" && data.message !== null
          ? JSON.stringify(data.message)
          : `Notify test failed (${r.status})`;
    throw new Error(msg);
  }
  return { ok: true as const, channel: data.channel ?? body.channel, detail: data.detail };
}

export async function patchAdminMemberContact(
  userId: string,
  body: { phoneNumber: string | null },
): Promise<{ user: { id: string; phoneNumber: string | null } }> {
  const r = await fetch(`/api/admin/members/${encodeURIComponent(userId)}/contact`, {
    method: "PATCH",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = (await r.json().catch(() => ({}))) as {
    message?: string;
    user?: { id: string; phoneNumber: string | null };
  };
  if (!r.ok || !data.user) {
    throw new Error(
      typeof data.message === "string" ? data.message : `Update contact failed (${r.status})`,
    );
  }
  return { user: data.user };
}
