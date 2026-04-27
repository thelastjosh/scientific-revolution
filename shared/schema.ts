import { sql } from "drizzle-orm";
import {
  boolean,
  integer,
  jsonb,
  pgTable,
  primaryKey,
  real,
  text,
  timestamp,
  varchar,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const uiExperimentVariantSchema = z.enum(["control", "variant_b"]);
export type UiExperimentVariant = z.infer<typeof uiExperimentVariantSchema>;

export const uiExperiments = pgTable("ui_experiments", {
  key: varchar("key", { length: 128 }).primaryKey(),
  enabled: boolean("enabled").notNull().default(true),
  variant: varchar("variant", { length: 32 }).notNull().default("control"),
  label: text("label").notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export type UiExperiment = typeof uiExperiments.$inferSelect;
export type InsertUiExperiment = typeof uiExperiments.$inferInsert;

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  /** Short bio / profile summary for dashboard and matching */
  bio: text("bio"),
  /** Network signal (0–100 scale in UI) */
  reputation: real("reputation").notNull().default(0),
  /** Intrinsic engagement score for dashboard */
  motivation: integer("motivation").notNull().default(50),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  email: true,
  passwordHash: true,
  firstName: true,
  lastName: true,
});

/** Directed edge in the user graph (e.g. collaboration, referral). */
export const userEdges = pgTable("user_edges", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  sourceUserId: varchar("source_user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  targetUserId: varchar("target_user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  kind: varchar("kind", { length: 32 }).notNull().default("peer"),
  label: text("label"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type UserEdge = typeof userEdges.$inferSelect;
export type InsertUserEdge = typeof userEdges.$inferInsert;

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

/** Personalized invite link; token is opaque string in ?invite= */
export const onboardingInvites = pgTable("onboarding_invites", {
  token: varchar("token", { length: 128 }).primaryKey(),
  firstName: text("first_name"),
  email: text("email"),
  description: text("description"),
  researchSummary: text("research_summary"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type OnboardingInvite = typeof onboardingInvites.$inferSelect;
export type InsertOnboardingInvite = typeof onboardingInvites.$inferInsert;

/** Partner or movement node (e.g. Public AI, UNICEF). */
export const organizations = pgTable("organizations", {
  id: varchar("id", { length: 64 }).primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const organizationMembers = pgTable(
  "organization_members",
  {
    organizationId: varchar("organization_id", { length: 64 })
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    userId: varchar("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    role: varchar("role", { length: 64 }).notNull().default("member"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.organizationId, t.userId] })],
);

export type Organization = typeof organizations.$inferSelect;
export type OrganizationMember = typeof organizationMembers.$inferSelect;

/** Task feed and dossier — corresponds to client `Task` shape. */
export const networkTasks = pgTable("network_tasks", {
  id: varchar("id", { length: 32 }).primaryKey(),
  organizationId: varchar("organization_id", { length: 64 }).references(
    () => organizations.id,
    { onDelete: "set null" },
  ),
  shortWhy: text("short_why").notNull(),
  title: text("title").notNull(),
  description: text("description").notNull().default(""),
  rationale: text("rationale").notNull().default(""),
  evaluationLoop: text("evaluation_loop").notNull().default(""),
  motivationScore: integer("motivation_score").notNull().default(0),
  timeEstimate: text("time_estimate").notNull().default(""),
  status: varchar("status", { length: 24 }).notNull().default("available"),
  community: varchar("community", { length: 32 }).notNull(),
  githubLink: text("github_link"),
  workspaceType: varchar("workspace_type", { length: 32 }),
  taskKind: varchar("task_kind", { length: 32 }),
  eventDate: timestamp("event_date", { withTimezone: true }),
  history: jsonb("history")
    .notNull()
    .$type<Record<string, unknown>[]>()
    .default(sql`'[]'::jsonb`),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type NetworkTask = typeof networkTasks.$inferSelect;

export const networkProjects = pgTable("network_projects", {
  id: varchar("id", { length: 32 }).primaryKey(),
  organizationId: varchar("organization_id", { length: 64 }).references(
    () => organizations.id,
    { onDelete: "set null" },
  ),
  shortWhy: text("short_why").notNull(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  motivationScore: integer("motivation_score").notNull(),
  deadline: text("deadline").notNull(),
  status: varchar("status", { length: 24 }).notNull(),
  claimedBy: text("claimed_by"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type NetworkProject = typeof networkProjects.$inferSelect;

/** Single active “epoch” for global network status (UI). */
export const networkEpochs = pgTable("network_epochs", {
  id: varchar("id", { length: 32 }).primaryKey(),
  name: text("name").notNull(),
  description: text("description").notNull(),
  progress: integer("progress").notNull(),
  target: integer("target").notNull(),
  current: integer("current").notNull(),
  deadline: text("deadline").notNull(),
  status: varchar("status", { length: 16 }).notNull().default("nominal"),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export type NetworkEpoch = typeof networkEpochs.$inferSelect;
