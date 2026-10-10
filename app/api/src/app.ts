import express from "express";
import os from "node:os";
import type { TodoStore } from "./store.js";

export function createApp(store: TodoStore) {
  const app = express();
  app.use(express.json());

  // ใช้ดูว่ากำลังคุยกับ container ตัวไหน และเป็น version อะไร
  app.get("/api/info", (_req, res) => {
    res.json({
      hostname: os.hostname(),
      version: process.env.APP_VERSION ?? "dev",
      store: store.kind,
      node: process.version,
    });
  });

  app.get("/api/health", async (_req, res) => {
    try {
      await store.ping();
      res.json({ status: "ok" });
    } catch {
      res.status(503).json({ status: "db-unavailable" });
    }
  });

  app.get("/api/todos", async (_req, res) => {
    res.json(await store.list());
  });

  app.post("/api/todos", async (req, res) => {
    const title = typeof req.body?.title === "string" ? req.body.title.trim() : "";
    if (!title) return res.status(400).json({ error: "title is required" });
    res.status(201).json(await store.create(title));
  });

  app.patch("/api/todos/:id", async (req, res) => {
    const todo = await store.update(Number(req.params.id), Boolean(req.body?.done));
    if (!todo) return res.status(404).json({ error: "not found" });
    res.json(todo);
  });

  app.delete("/api/todos/:id", async (req, res) => {
    const ok = await store.remove(Number(req.params.id));
    res.status(ok ? 204 : 404).end();
  });

  return app;
}
