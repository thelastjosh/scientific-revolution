import { and, asc, eq } from "drizzle-orm";
import { chatMessages, chatSessions, networkTasks } from "@shared/schema";
import type { WorkspaceChatMessage } from "@shared/network-feed";
import { getDb } from "./db";

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

  const insertedUser = await db
    .insert(chatMessages)
    .values({
      sessionId: input.sessionId,
      role: "user",
      content: input.content,
    })
    .returning();

  const lower = input.content.toLowerCase();
  let assistantText = "Noted. I can help refine that into tasks, profile updates, or people outreach.";
  if (lower.includes("extract") || lower.includes("task") || lower.includes("transcript")) {
    assistantText =
      "Paste the raw source document and I will extract a first task draft you can edit before submission.";
  } else if (lower.includes("profile")) {
    assistantText =
      "I can update your profile pane fields from this message. Tell me what should change.";
  }

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
}) {
  const db = getDb();
  if (!db) throw new Error("Database is not configured");
  const taskId = `T-${Math.floor(Math.random() * 900000 + 100000)}`;
  const rows = await db
    .insert(networkTasks)
    .values({
      id: taskId,
      ownerUserId: input.ownerUserId,
      title: input.title,
      description: input.description,
      rawSourceDoc: input.rawSourceDoc ?? null,
      sourceSessionId: input.sourceSessionId ?? null,
      status: "draft",
    })
    .returning();
  return rows[0]!;
}
