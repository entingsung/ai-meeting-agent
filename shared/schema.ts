import { pgTable, text, serial, integer, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// User model from the template
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

// Decision model
export const decisions = pgTable("decisions", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  source: text("source").notNull(), // Meeting, Email, Document, etc.
  team: text("team"), // Optional team/project
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertDecisionSchema = createInsertSchema(decisions).pick({
  title: true,
  description: true,
  source: true,
  team: true,
});

// Action Item model
export const actionItems = pgTable("action_items", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  decisionId: integer("decision_id").references(() => decisions.id),
  assignee: text("assignee").notNull(),
  dueDate: timestamp("due_date").notNull(),
  completed: boolean("completed").default(false).notNull(),
  completedAt: timestamp("completed_at"),
  priority: text("priority").notNull(), // High, Medium, Low
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertActionItemSchema = createInsertSchema(actionItems).pick({
  title: true,
  decisionId: true,
  assignee: true,
  dueDate: true,
  priority: true,
});

// Notification model
export const notifications = pgTable("notifications", {
  id: serial("id").primaryKey(),
  type: text("type").notNull(), // action_reminder, new_assignment, etc.
  actionItemId: integer("action_item_id").references(() => actionItems.id),
  message: text("message").notNull(),
  read: boolean("read").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertNotificationSchema = createInsertSchema(notifications).pick({
  type: true,
  actionItemId: true,
  message: true,
});

// Types for our insert and select operations
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

export type Decision = typeof decisions.$inferSelect;
export type InsertDecision = z.infer<typeof insertDecisionSchema>;

export type ActionItem = typeof actionItems.$inferSelect;
export type InsertActionItem = z.infer<typeof insertActionItemSchema>;

export type Notification = typeof notifications.$inferSelect;
export type InsertNotification = z.infer<typeof insertNotificationSchema>;

// Extraction request schema
export const extractionRequestSchema = z.object({
  text: z.string().optional(),
  source: z.string().min(1, "Source is required"),
  team: z.string().optional(),
  recordingId: z.string().optional(),
});

export type ExtractionRequest = z.infer<typeof extractionRequestSchema>;

// Recording schema
export const recordingSchema = z.object({
  id: z.string(),
  title: z.string().optional(),
  transcription: z.string().optional(),
  duration: z.number().optional(),
  status: z.enum(["pending", "transcribing", "completed", "failed"]),
  createdAt: z.date().optional(),
});

export type Recording = z.infer<typeof recordingSchema>;

// AI extraction response schema
export const aiExtractResponseSchema = z.object({
  decision: z.object({
    title: z.string(),
    description: z.string(),
  }),
  actionItems: z.array(
    z.object({
      title: z.string(),
      assignee: z.string(),
      dueDate: z.string(),
      priority: z.string(),
    })
  ),
});

export type AIExtractResponse = z.infer<typeof aiExtractResponseSchema>;
