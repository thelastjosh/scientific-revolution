import { and, asc, eq } from "drizzle-orm";
import { chatMessages, chatSessions, networkTasks, users } from "@shared/schema";
import type { WorkspaceChatMessage } from "@shared/network-feed";
import { getDb } from "./db";
import { assertUserOrganizationMember } from "./task-organization";
import { completeWorkspaceReply } from "./workspace-chat-reply";

export function extractTasksFromRawDoc(raw: string): Array<{ title: string; description: string }> {
  const lines = raw
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  const candidates = lines
    .filter((l) => /^(-|\*|\d+[\.\)])\s+/.test(l) || /TODO|task|action/i.test(l))
    .slice(0, 8);
  if (candidates.length === 0) {
    return [
      {
        title: "Review source document",
        description: raw.slice(0, 600),
      },
    ];
  }
  return candidates.map((line, i) => ({
    title: line.replace(/^(-|\*|\d+[\.\)])\s+/, "").slice(0, 120),
    description: `Extracted from source line ${i + 1}.`,
  }));
}

export async function graduateOnboardingToWorkspace(input: {
  userId: string;
  onboardingMessages: Array<{ role: "assistant" | "user"; content: string }>;
  activeIntent?: string | null;
}) {
  const db = getDb();
  if (!db) throw new Error("Database is not configured");

  const onboardingSessionRows = await db
    .insert(chatSessions)
    .values({
      userId: input.userId,
      type: "onboarding",
      title: "Onboarding",
      activeIntent: input.activeIntent ?? null,
      archived: true,
    })
    .returning();
  const onboardingSession = onboardingSessionRows[0]!;

  if (input.onboardingMessages.length > 0) {
    await db.insert(chatMessages).values(
      input.onboardingMessages.map((m) => ({
        sessionId: onboardingSession.id,
        role: m.role,
        content: m.content,
      })),
    );
  }

  const workspaceRows = await db
    .select()
    .from(chatSessions)
    .where(and(eq(chatSessions.userId, input.userId), eq(chatSessions.type, "workspace")))
    .orderBy(asc(chatSessions.createdAt))
    .limit(1);
  let workspace = workspaceRows[0];
  if (!workspace) {
    const created = await db
      .insert(chatSessions)
      .values({
        userId: input.userId,
        type: "workspace",
        title: "Workspace",
        graduatedFromSessionId: onboardingSession.id,
        activeIntent: input.activeIntent ?? null,
      })
      .returning();
    workspace = created[0]!;
  } else {
    await db
      .update(chatSessions)
      .set({
        graduatedFromSessionId: onboardingSession.id,
        activeIntent: input.activeIntent ?? workspace.activeIntent ?? null,
        updatedAt: new Date(),
      })
      .where(eq(chatSessions.id, workspace.id));
  }
  return {
    onboardingSessionId: onboardingSession.id,
    workspaceSessionId: workspace.id,
  };
}

export async function sendWorkspaceMessage(input: {
  userId: string;
  sessionId: string;
  content: string;
}) {
  const db = getDb();
  if (!db) throw new Error("Database is not configured");
  const rows = await db
    .select()
    .from(chatSessions)
    .where(and(eq(chatSessions.id, input.sessionId), eq(chatSessions.userId, input.userId)))
    .limit(1);
  if (!rows[0]) {
    const err = new Error("Workspace session not found");
    (err as { status?: number }).status = 404;
    throw err;
  }

  const session = rows[0]!;

  const [userRows, taskRows] = await Promise.all([
    db.select().from(users).where(eq(users.id, input.userId)).limit(1),
    db
      .select({ title: networkTasks.title })
      .from(networkTasks)
      .where(eq(networkTasks.ownerUserId, input.userId))
      .orderBy(asc(networkTasks.createdAt))
      .limit(20),
  ]);
  const user = userRows[0];
  const userName = user ? `${user.firstName} ${user.lastName}`.trim() : "the user";

  const insertedUser = await db
    .insert(chatMessages)
    .values({
      sessionId: input.sessionId,
      role: "user",
      content: input.content,
    })
    .returning();

  const historyRows = await db
    .select()
    .from(chatMessages)
    .where(eq(chatMessages.sessionId, input.sessionId))
    .orderBy(asc(chatMessages.createdAt));

  const assistantText = await completeWorkspaceReply(
    historyRows.map((m) => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    })),
    {
      userName,
      activeIntent: session.activeIntent,
      taskTitles: taskRows.map((t) => t.title),
    },
  );

  const insertedAssistant = await db
    .insert(chatMessages)
    .values({
      sessionId: input.sessionId,
      role: "assistant",
      content: assistantText,
    })
    .returning();

  return {
    userMessage: {
      id: insertedUser[0]!.id,
      role: "user",
      content: insertedUser[0]!.content,
      createdAt: insertedUser[0]!.createdAt.toISOString(),
    } satisfies WorkspaceChatMessage,
    assistantMessage: {
      id: insertedAssistant[0]!.id,
      role: "assistant",
      content: insertedAssistant[0]!.content,
      createdAt: insertedAssistant[0]!.createdAt.toISOString(),
    } satisfies WorkspaceChatMessage,
  };
}

export async function createTaskFromDraft(input: {
  ownerUserId: string;
  title: string;
  description: string;
  rawSourceDoc?: string | null;
  sourceSessionId?: string | null;
  organizationId?: string | null;
  deliveryChannels?: { kind: string; address: string; state?: string }[];
}) {
  const db = getDb();
  if (!db) throw new Error("Database is not configured");
  if (input.organizationId) {
    await assertUserOrganizationMember(input.ownerUserId, input.organizationId);
  }
  const taskId = `T-${Math.floor(Math.random() * 900000 + 100000)}`;
  const deliveryChannels = input.deliveryChannels?.length ? input.deliveryChannels : [];
  const rows = await db
    .insert(networkTasks)
    .values({
      id: taskId,
      organizationId: input.organizationId ?? null,
      ownerUserId: input.ownerUserId,
      title: input.title,
      description: input.description,
      rawSourceDoc: input.rawSourceDoc ?? null,
      sourceSessionId: input.sourceSessionId ?? null,
      status: "draft",
      deliveryChannels,
    })
    .returning();
  return rows[0]!;
}
