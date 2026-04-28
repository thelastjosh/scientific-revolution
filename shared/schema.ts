import { sql } from "drizzle-orm";
import {
  boolean,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  primaryKey,
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
  role: varchar("role", { length: 24 }).notNull().default("member"),
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

export const taskStatusEnum = pgEnum("task_status", [
  "draft",
  "open",
  "completed",
  "archived",
]);

export const chatSessionTypeEnum = pgEnum("chat_session_type", [
  "onboarding",
  "workspace",
]);

export const chatMessageRoleEnum = pgEnum("chat_message_role", [
  "system",
  "assistant",
  "user",
]);

export const surveyStatusEnum = pgEnum("survey_status", [
  "pending",
  "completed",
  "dismissed",
]);

/** Task lifecycle records, editable from dashboard chat. */
export const networkTasks = pgTable("network_tasks", {
  id: varchar("id", { length: 32 }).primaryKey(),
  organizationId: varchar("organization_id", { length: 64 })
    .references(() => organizations.id, { onDelete: "set null" }),
  ownerUserId: varchar("owner_user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  assigneeUserId: varchar("assignee_user_id")
    .references(() => users.id, { onDelete: "set null" }),
  sourceSessionId: varchar("source_session_id"),
  shortWhy: text("short_why"),
  title: text("title").notNull(),
  description: text("description").notNull(),
  rawSourceDoc: text("raw_source_doc"),
  extractedBy: varchar("extracted_by", { length: 64 }).default("chat"),
  status: taskStatusEnum("status").notNull().default("draft"),
  deliveryChannels: jsonb("delivery_channels")
    .$type<{ kind: string; address: string; state?: string }[]>()
    .notNull()
    .default(sql`'[]'::jsonb`),
  externalRefs: jsonb("external_refs")
    .$type<{ system: string; id: string }[]>()
    .notNull()
    .default(sql`'[]'::jsonb`),
  history: jsonb("history")
    .notNull()
    .$type<Record<string, unknown>[]>()
    .default(sql`'[]'::jsonb`),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export type NetworkTask = typeof networkTasks.$inferSelect;

export const onboardingContexts = pgTable("onboarding_contexts", {
  userId: varchar("user_id")
    .primaryKey()
    .references(() => users.id, { onDelete: "cascade" }),
  persona: varchar("persona", { length: 24 }).notNull(),
  inviteToken: varchar("invite_token", { length: 128 }),
  inviteEmail: text("invite_email"),
  onboardingStep: varchar("onboarding_step", { length: 120 }).notNull(),
  summary: text("summary"),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const chatSessions = pgTable("chat_sessions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  type: chatSessionTypeEnum("type").notNull(),
  title: text("title"),
  graduatedFromSessionId: varchar("graduated_from_session_id"),
  activeIntent: text("active_intent"),
  archived: boolean("archived").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const chatMessages = pgTable("chat_messages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  sessionId: varchar("session_id")
    .notNull()
    .references(() => chatSessions.id, { onDelete: "cascade" }),
  role: chatMessageRoleEnum("role").notNull(),
  content: text("content").notNull(),
  meta: jsonb("meta").$type<Record<string, unknown>>(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const channelCredentials = pgTable("channel_credentials", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  provider: varchar("provider", { length: 40 }).notNull(),
  accountLabel: text("account_label").notNull(),
  credentialRef: text("credential_ref").notNull(),
  status: varchar("status", { length: 24 }).notNull().default("active"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const userContextEntries = pgTable("user_context_entries", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  source: varchar("source", { length: 40 }).notNull(),
  title: text("title").notNull(),
  content: text("content").notNull(),
  meta: jsonb("meta").$type<Record<string, unknown>>(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const postTaskSurveys = pgTable("post_task_surveys", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  taskId: varchar("task_id", { length: 32 })
    .notNull()
    .references(() => networkTasks.id, { onDelete: "cascade" }),
  userId: varchar("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  status: surveyStatusEnum("status").notNull().default("pending"),
  score: integer("score"),
  feedback: text("feedback"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const adminEvents = pgTable("admin_events", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  actorUserId: varchar("actor_user_id")
    .references(() => users.id, { onDelete: "set null" }),
  eventType: varchar("event_type", { length: 64 }).notNull(),
  targetType: varchar("target_type", { length: 64 }),
  targetId: text("target_id"),
  payload: jsonb("payload").$type<Record<string, unknown>>(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
