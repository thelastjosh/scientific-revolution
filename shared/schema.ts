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
  uniqueIndex,
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
  /** Full profile manifest markdown */
  profileMarkdown: text("profile_markdown"),
  /** Relationship manifest markdown */
  relationshipMarkdown: text("relationship_markdown"),
  /** Skill manifest markdown */
  skillMarkdown: text("skill_markdown"),
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
  creatorUserId: varchar("creator_user_id").references(() => users.id, { onDelete: "set null" }),
  organizationId: varchar("organization_id", { length: 64 }),
  inviterRelationshipLabel: varchar("inviter_relationship_label", { length: 128 }),
  inviterContextSummary: text("inviter_context_summary"),
  maxUses: integer("max_uses"),
  useCount: integer("use_count").notNull().default(0),
  expiresAt: timestamp("expires_at", { withTimezone: true }),
  revokedAt: timestamp("revoked_at", { withTimezone: true }),
  lastUsedAt: timestamp("last_used_at", { withTimezone: true }),
  firstName: text("first_name"),
  email: text("email"),
  description: text("description"),
  researchSummary: text("research_summary"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type OnboardingInvite = typeof onboardingInvites.$inferSelect;
export type InsertOnboardingInvite = typeof onboardingInvites.$inferInsert;

export const inviteRedemptions = pgTable(
  "invite_redemptions",
  {
    id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
    inviteToken: varchar("invite_token", { length: 128 })
      .notNull()
      .references(() => onboardingInvites.token, { onDelete: "cascade" }),
    redeemerUserId: varchar("redeemer_user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    redeemerEmail: text("redeemer_email"),
    sessionId: varchar("session_id"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("invite_redemptions_token_user_uidx").on(t.inviteToken, t.redeemerUserId)],
);

export type InviteRedemption = typeof inviteRedemptions.$inferSelect;

export const emailEvents = pgTable("email_events", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id, { onDelete: "set null" }),
  inviteToken: varchar("invite_token", { length: 128 }).references(() => onboardingInvites.token, {
    onDelete: "set null",
  }),
  emailType: varchar("email_type", { length: 64 }).notNull(),
  recipient: text("recipient").notNull(),
  subject: text("subject").notNull(),
  status: varchar("status", { length: 24 }).notNull().default("sent"),
  errorMessage: text("error_message"),
  payload: jsonb("payload").$type<Record<string, unknown>>(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type EmailEvent = typeof emailEvents.$inferSelect;

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

/** Federated multi-tenant agent gateway registered per org (BYO or Sail-managed). */
export const organizationAgents = pgTable("organization_agents", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  organizationId: varchar("organization_id", { length: 64 })
    .notNull()
    .references(() => organizations.id, { onDelete: "cascade" }),
  runtimeKind: varchar("runtime_kind", { length: 32 }).notNull(),
  baseUrl: text("base_url").notNull(),
  signingSecret: varchar("signing_secret", { length: 128 }).notNull(),
  capabilityManifest: jsonb("capability_manifest")
    .$type<string[]>()
    .notNull()
    .default(sql`'[]'::jsonb`),
  status: varchar("status", { length: 24 }).notNull().default("pending"),
  managedBy: varchar("managed_by", { length: 16 }).notNull().default("byo"),
  networkApiLevel: varchar("network_api_level", { length: 16 }).notNull().default("1"),
  lastHeartbeatAt: timestamp("last_heartbeat_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [uniqueIndex("organization_agents_org_uidx").on(t.organizationId)]);

export type OrganizationAgent = typeof organizationAgents.$inferSelect;

/** Canonical append-only timeline for Sail-mediated external comms. */
export const communicationEvents = pgTable("communication_events", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  organizationId: varchar("organization_id", { length: 64 })
    .notNull()
    .references(() => organizations.id, { onDelete: "cascade" }),
  traceId: varchar("trace_id", { length: 64 }).notNull(),
  dedupeKey: varchar("dedupe_key", { length: 256 }).notNull(),
  direction: varchar("direction", { length: 16 }).notNull(),
  channel: varchar("channel", { length: 32 }).notNull(),
  threadKey: text("thread_key").notNull(),
  taskId: varchar("task_id", { length: 32 }).references(() => networkTasks.id, {
    onDelete: "set null",
  }),
  actorExternalHandle: text("actor_external_handle"),
  body: text("body").notNull().default(""),
  payload: jsonb("payload").$type<Record<string, unknown>>().notNull().default(sql`'{}'::jsonb`),
  occurredAt: timestamp("occurred_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [uniqueIndex("communication_events_dedupe_uidx").on(t.dedupeKey)]);

export type CommunicationEvent = typeof communicationEvents.$inferSelect;

/** Gate for sensitive cross-network or high-risk sends (agent requests, human resolves). */
export const networkSensitiveApprovals = pgTable("network_sensitive_approvals", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  organizationId: varchar("organization_id", { length: 64 })
    .notNull()
    .references(() => organizations.id, { onDelete: "cascade" }),
  traceId: varchar("trace_id", { length: 64 }).notNull(),
  requestKind: varchar("request_kind", { length: 64 }).notNull(),
  payload: jsonb("payload").$type<Record<string, unknown>>().notNull().default(sql`'{}'::jsonb`),
  status: varchar("status", { length: 24 }).notNull().default("pending"),
  resolutionNote: text("resolution_note"),
  resolvedByUserId: varchar("resolved_by_user_id").references(() => users.id, {
    onDelete: "set null",
  }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  resolvedAt: timestamp("resolved_at", { withTimezone: true }),
});

export type NetworkSensitiveApproval = typeof networkSensitiveApprovals.$inferSelect;
