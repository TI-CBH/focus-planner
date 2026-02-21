import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import session from "express-session";
import { pool } from "./db";
import connectPgSimple from "connect-pg-simple";
import bcrypt from "bcrypt";
import { insertTaskSchema, updateTaskSchema } from "@shared/schema";

const PgStore = connectPgSimple(session);

declare module "express-session" {
  interface SessionData {
    userId: string;
  }
}

function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (!req.session.userId) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  next();
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  app.use(
    session({
      store: new PgStore({ pool, createTableIfMissing: true }),
      secret: process.env.SESSION_SECRET || "focus-planner-secret-key",
      resave: false,
      saveUninitialized: false,
      cookie: {
        maxAge: 30 * 24 * 60 * 60 * 1000,
        httpOnly: true,
        secure: false,
        sameSite: "lax",
      },
    })
  );

  app.post("/api/auth/register", async (req, res) => {
    try {
      const { username, password } = req.body;
      if (!username || !password) {
        return res.status(400).json({ message: "Username and password are required" });
      }
      if (username.length < 3) {
        return res.status(400).json({ message: "Username must be at least 3 characters" });
      }
      if (password.length < 6) {
        return res.status(400).json({ message: "Password must be at least 6 characters" });
      }

      const existing = await storage.getUserByUsername(username);
      if (existing) {
        return res.status(409).json({ message: "Username already taken" });
      }

      const hashed = await bcrypt.hash(password, 10);
      const user = await storage.createUser({ username, password: hashed });
      req.session.userId = user.id;
      res.json({ id: user.id, username: user.username });
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.post("/api/auth/login", async (req, res) => {
    try {
      const { username, password } = req.body;
      if (!username || !password) {
        return res.status(400).json({ message: "Username and password are required" });
      }

      const user = await storage.getUserByUsername(username);
      if (!user) {
        return res.status(401).json({ message: "Invalid credentials" });
      }

      const valid = await bcrypt.compare(password, user.password);
      if (!valid) {
        return res.status(401).json({ message: "Invalid credentials" });
      }

      req.session.userId = user.id;
      res.json({ id: user.id, username: user.username });
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.get("/api/auth/me", async (req, res) => {
    if (!req.session.userId) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    const user = await storage.getUser(req.session.userId);
    if (!user) {
      return res.status(401).json({ message: "User not found" });
    }
    res.json({ id: user.id, username: user.username });
  });

  app.post("/api/auth/logout", (req, res) => {
    req.session.destroy((err) => {
      if (err) return res.status(500).json({ message: "Logout failed" });
      res.clearCookie("connect.sid");
      res.json({ ok: true });
    });
  });

  app.get("/api/tasks", requireAuth, async (req, res) => {
    const tasks = await storage.getTasksByUser(req.session.userId!);
    res.json(tasks);
  });

  app.post("/api/tasks", requireAuth, async (req, res) => {
    try {
      const parsed = insertTaskSchema.parse(req.body);
      const task = await storage.createTask(req.session.userId!, parsed);
      res.json(task);
    } catch (err: any) {
      res.status(400).json({ message: err.message });
    }
  });

  app.patch("/api/tasks/:id", requireAuth, async (req, res) => {
    try {
      const id = req.params.id as string;
      const parsed = updateTaskSchema.parse(req.body);
      const task = await storage.updateTask(id, req.session.userId!, parsed);
      if (!task) return res.status(404).json({ message: "Task not found" });
      res.json(task);
    } catch (err: any) {
      res.status(400).json({ message: err.message });
    }
  });

  app.patch("/api/tasks/:id/complete", requireAuth, async (req, res) => {
    const id = req.params.id as string;
    const task = await storage.completeTask(id, req.session.userId!);
    if (!task) return res.status(404).json({ message: "Task not found" });
    res.json(task);
  });

  app.delete("/api/tasks/:id", requireAuth, async (req, res) => {
    const id = req.params.id as string;
    const deleted = await storage.deleteTask(id, req.session.userId!);
    if (!deleted) return res.status(404).json({ message: "Task not found" });
    res.json({ ok: true });
  });

  app.get("/api/tasks/export", requireAuth, async (req, res) => {
    const tasks = await storage.getTasksByUser(req.session.userId!);
    const exportData = tasks.map(({ userId, ...rest }) => rest);
    res.json(exportData);
  });

  app.post("/api/tasks/import", requireAuth, async (req, res) => {
    try {
      const { tasks: importedTasks, mode } = req.body;

      if (!Array.isArray(importedTasks)) {
        return res.status(400).json({ message: "Tasks must be an array" });
      }

      if (mode === "replace") {
        await storage.deleteAllTasksByUser(req.session.userId!);
      }

      let imported = 0;
      for (const t of importedTasks) {
        if (!t.title) continue;
        await storage.createTask(req.session.userId!, {
          title: t.title,
          notes: t.notes || "",
          impact: Math.min(5, Math.max(1, t.impact || 3)),
          effort: Math.min(5, Math.max(1, t.effort || 3)),
          dueDate: t.dueDate ? new Date(t.dueDate) : null,
          bucket: ["today", "backlog", "someday"].includes(t.bucket) ? t.bucket : "backlog",
          tags: Array.isArray(t.tags) ? t.tags : [],
          completed: t.completed || false,
        });
        imported++;
      }

      res.json({ imported });
    } catch (err: any) {
      res.status(400).json({ message: err.message });
    }
  });

  return httpServer;
}
