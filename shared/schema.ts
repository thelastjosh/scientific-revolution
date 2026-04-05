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
  password: text("password").notNull(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
