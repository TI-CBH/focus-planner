import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, timestamp, boolean, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

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

export const bucketEnum = z.enum(["today", "backlog", "someday"]);
export type Bucket = z.infer<typeof bucketEnum>;

export const tasks = pgTable("tasks", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  title: text("title").notNull(),
  notes: text("notes").default(""),
  impact: integer("impact").notNull().default(3),
  effort: integer("effort").notNull().default(3),
  dueDate: timestamp("due_date"),
  bucket: text("bucket").notNull().default("backlog"),
  tags: jsonb("tags").$type<string[]>().default([]),
  completed: boolean("completed").notNull().default(false),
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertTaskSchema = createInsertSchema(tasks, {
  dueDate: z.preprocess(
    (val) => (typeof val === "string" ? new Date(val) : val === null ? null : val),
    z.date().nullable().optional()
  ),
}).omit({
  id: true,
  userId: true,
  completedAt: true,
  createdAt: true,
  updatedAt: true,
});

export const updateTaskSchema = insertTaskSchema.partial();

export type InsertTask = z.infer<typeof insertTaskSchema>;
export type UpdateTask = z.infer<typeof updateTaskSchema>;
export type Task = typeof tasks.$inferSelect;
