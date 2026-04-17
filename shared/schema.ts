import { sql } from "drizzle-orm";
import { boolean, pgTable, text, timestamp, varchar } from "drizzle-orm/pg-core";
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
  username: text("username").notNull().unique(),
  email: text("email").unique(),
  passwordHash: text("password_hash").notNull(),
  displayName: text("display_name"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  email: true,
  passwordHash: true,
  displayName: true,
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
