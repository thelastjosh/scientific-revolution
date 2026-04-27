import { asc } from "drizzle-orm";
import type { Epoch, HistoryItem, Project, Task } from "@shared/network-feed";
import {
  networkEpochs,
  networkProjects,
  networkTasks,
  organizations,
} from "@shared/schema";
import type { User } from "@shared/schema";
import { getDb } from "./db";

export type DashboardProfile = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  bio: string | null;
  reputation: number;
  motivation: number;
};

export type OrganizationDto = {
  id: string;
  name: string;
  description: string | null;
};

function rowToTask(row: typeof networkTasks.$inferSelect): Task {
  const history = (Array.isArray(row.history) ? row.history : []) as unknown[];
  return {
    id: row.id,
    shortWhy: row.shortWhy,
    title: row.title,
    description: row.description,
    rationale: row.rationale,
    evaluationLoop: row.evaluationLoop,
    motivationScore: row.motivationScore,
    timeEstimate: row.timeEstimate,
    status: row.status as Task["status"],
    history: history as HistoryItem[],
    community: row.community as Task["community"],
    githubLink: row.githubLink ?? undefined,
    workspaceType: (row.workspaceType as Task["workspaceType"]) ?? undefined,
    type: (row.taskKind as Task["type"]) ?? undefined,
    eventDate: row.eventDate
      ? row.eventDate.toISOString()
      : undefined,
  };
}

function rowToProject(row: typeof networkProjects.$inferSelect): Project {
  return {
    id: row.id,
    shortWhy: row.shortWhy,
    title: row.title,
    description: row.description,
    motivationScore: row.motivationScore,
    deadline: row.deadline,
    status: row.status as Project["status"],
    claimedBy: row.claimedBy ?? undefined,
  };
}

function rowToEpoch(row: typeof networkEpochs.$inferSelect): Epoch {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    progress: row.progress,
    target: row.target,
    current: row.current,
    deadline: row.deadline,
    status: row.status as Epoch["status"],
  };
}

function userToProfile(u: User): DashboardProfile {
  return {
    id: u.id,
    firstName: u.firstName,
    lastName: u.lastName,
    email: u.email,
    bio: u.bio ?? null,
    reputation: u.reputation ?? 0,
    motivation: u.motivation ?? 50,
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

  const [taskRows, projectRows, orgRows, epochRows] = await Promise.all([
    db
      .select()
      .from(networkTasks)
      .orderBy(asc(networkTasks.createdAt)),
    db
      .select()
      .from(networkProjects)
      .orderBy(asc(networkProjects.createdAt)),
    db.select().from(organizations).orderBy(asc(organizations.name)),
    db
      .select()
      .from(networkEpochs)
      .orderBy(asc(networkEpochs.id))
      .limit(1),
  ]);

  return {
    profile: userToProfile(user),
    organizations: orgRows.map(
      (o): OrganizationDto => ({
        id: o.id,
        name: o.name,
        description: o.description ?? null,
      }),
    ),
    tasks: taskRows.map(rowToTask),
    projects: projectRows.map(rowToProject),
    epoch: epochRows[0] ? rowToEpoch(epochRows[0]) : null,
  };
}
