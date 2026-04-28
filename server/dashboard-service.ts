import { asc, eq } from "drizzle-orm";
import type { Task, WorkspaceChatMessage, WorkspaceSession } from "@shared/network-feed";
import {
  networkTasks,
  organizations,
  users,
  chatSessions,
  chatMessages,
} from "@shared/schema";
import type { User } from "@shared/schema";
import { getDb } from "./db";
import { isAdminUser } from "./admin-access";

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

export type OrganizationDto = {
  id: string;
  name: string;
  description: string | null;
};

function rowToTask(row: typeof networkTasks.$inferSelect): Task {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    status: row.status as Task["status"],
    organizationId: row.organizationId ?? null,
    ownerUserId: row.ownerUserId,
    assigneeUserId: row.assigneeUserId ?? null,
    sourceSessionId: row.sourceSessionId ?? null,
    rawSourceDoc: row.rawSourceDoc ?? null,
    extractedBy: row.extractedBy ?? null,
    deliveryChannels: row.deliveryChannels ?? [],
    externalRefs: row.externalRefs ?? [],
    history: row.history ?? [],
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function userToProfile(u: User): DashboardProfile {
  const profileMarkdown =
    u.profileMarkdown?.trim() ||
    [
      `# Profile: ${u.firstName} ${u.lastName}`,
      "",
      "## Summary",
      u.bio?.trim() || "Add your profile summary here.",
    ].join("\n");
  const relationshipMarkdown =
    u.relationshipMarkdown?.trim() ||
    ["# Relationship", "", "## Peers", "- Add key collaborators here."].join("\n");
  const skillMarkdown =
    u.skillMarkdown?.trim() ||
    ["# Skill", "", "## Working Style", "- Add operating preferences here."].join(
      "\n",
    );
  return {
    id: u.id,
    firstName: u.firstName,
    lastName: u.lastName,
    email: u.email,
    bio: u.bio ?? null,
    profileMarkdown,
    relationshipMarkdown,
    skillMarkdown,
  };
}

function sessionRowToSession(
  s: typeof chatSessions.$inferSelect,
): WorkspaceSession {
  return {
    id: s.id,
    type: s.type as WorkspaceSession["type"],
    title: s.title ?? null,
    graduatedFromSessionId: s.graduatedFromSessionId ?? null,
    activeIntent: s.activeIntent ?? null,
    createdAt: s.createdAt.toISOString(),
    updatedAt: s.updatedAt.toISOString(),
  };
}

function messageRowToMessage(
  m: typeof chatMessages.$inferSelect,
): WorkspaceChatMessage {
  return {
    id: m.id,
    role: m.role as WorkspaceChatMessage["role"],
    content: m.content,
    createdAt: m.createdAt.toISOString(),
  };
}

/**
 * Returns dashboard payload from Postgres. Call only when `getDb()` is defined.
 */
export async function getDashboardBundle(user: User) {
  const db = getDb();
  if (!db) {
    throw new Error("Database is not configured");
  }

  const [taskRows, orgRows, peopleRows, workspaceRows] = await Promise.all([
    db
      .select()
      .from(networkTasks)
      .where(eq(networkTasks.ownerUserId, user.id))
      .orderBy(asc(networkTasks.createdAt)),
    db.select().from(organizations).orderBy(asc(organizations.name)),
    db
      .select()
      .from(users)
      .orderBy(asc(users.firstName), asc(users.lastName)),
    db
      .select()
      .from(chatSessions)
      .where(eq(chatSessions.userId, user.id))
      .orderBy(asc(chatSessions.createdAt)),
  ]);

  let workspace = workspaceRows.find((r) => r.type === "workspace");
  if (!workspace) {
    const inserted = await db
      .insert(chatSessions)
      .values({
        userId: user.id,
        type: "workspace",
        title: "Workspace",
      })
      .returning();
    workspace = inserted[0]!;
  }

  const workspaceMessageRows = await db
    .select()
    .from(chatMessages)
    .where(eq(chatMessages.sessionId, workspace.id))
    .orderBy(asc(chatMessages.createdAt));

  return {
    isAdmin: isAdminUser(user),
    profile: userToProfile(user),
    organizations: orgRows.map(
      (o): OrganizationDto => ({
        id: o.id,
        name: o.name,
        description: o.description ?? null,
      }),
    ),
    people: peopleRows.map(userToProfile),
    tasks: taskRows.map(rowToTask),
    workspaceSession: sessionRowToSession(workspace),
    workspaceMessages: workspaceMessageRows.map(messageRowToMessage),
  };
}
