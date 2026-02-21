import { type User, type InsertUser, type Task, type InsertTask, type UpdateTask, users, tasks } from "@shared/schema";
import { db } from "./db";
import { eq, and, lte } from "drizzle-orm";

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;

  getTasksByUser(userId: string): Promise<Task[]>;
  getTask(id: string, userId: string): Promise<Task | undefined>;
  createTask(userId: string, task: InsertTask): Promise<Task>;
  updateTask(id: string, userId: string, data: UpdateTask): Promise<Task | undefined>;
  deleteTask(id: string, userId: string): Promise<boolean>;
  completeTask(id: string, userId: string): Promise<Task | undefined>;
  deleteAllTasksByUser(userId: string): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }

  async getTasksByUser(userId: string): Promise<Task[]> {
    return db.select().from(tasks).where(eq(tasks.userId, userId));
  }

  async getTask(id: string, userId: string): Promise<Task | undefined> {
    const [task] = await db.select().from(tasks).where(
      and(eq(tasks.id, id), eq(tasks.userId, userId))
    );
    return task;
  }

  async createTask(userId: string, task: InsertTask): Promise<Task> {
    const [created] = await db.insert(tasks).values({
      title: task.title,
      notes: task.notes,
      impact: task.impact,
      effort: task.effort,
      dueDate: task.dueDate,
      bucket: task.bucket,
      tags: task.tags as string[],
      completed: task.completed,
      userId,
    }).returning();
    return created;
  }

  async updateTask(id: string, userId: string, data: UpdateTask): Promise<Task | undefined> {
    const setData: Record<string, any> = { updatedAt: new Date() };
    if (data.title !== undefined) setData.title = data.title;
    if (data.notes !== undefined) setData.notes = data.notes;
    if (data.impact !== undefined) setData.impact = data.impact;
    if (data.effort !== undefined) setData.effort = data.effort;
    if (data.dueDate !== undefined) setData.dueDate = data.dueDate;
    if (data.bucket !== undefined) setData.bucket = data.bucket;
    if (data.tags !== undefined) setData.tags = data.tags as string[];
    if (data.completed !== undefined) setData.completed = data.completed;

    const [updated] = await db.update(tasks)
      .set(setData)
      .where(and(eq(tasks.id, id), eq(tasks.userId, userId)))
      .returning();
    return updated;
  }

  async deleteTask(id: string, userId: string): Promise<boolean> {
    const result = await db.delete(tasks)
      .where(and(eq(tasks.id, id), eq(tasks.userId, userId)))
      .returning();
    return result.length > 0;
  }

  async completeTask(id: string, userId: string): Promise<Task | undefined> {
    const task = await this.getTask(id, userId);
    if (!task) return undefined;

    const [updated] = await db.update(tasks)
      .set({
        completed: !task.completed,
        completedAt: !task.completed ? new Date() : null,
        updatedAt: new Date(),
      })
      .where(and(eq(tasks.id, id), eq(tasks.userId, userId)))
      .returning();
    return updated;
  }

  async deleteAllTasksByUser(userId: string): Promise<void> {
    await db.delete(tasks).where(eq(tasks.userId, userId));
  }
}

export const storage = new DatabaseStorage();
