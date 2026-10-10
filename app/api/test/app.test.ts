import request from "supertest";
import { describe, expect, it } from "vitest";
import { createApp } from "../src/app.js";
import { MemoryStore } from "../src/store.js";

describe("todo api", () => {
  it("reports health", async () => {
    const res = await request(createApp(new MemoryStore())).get("/api/health");
    expect(res.status).toBe(200);
    expect(res.body.status).toBe("ok");
  });

  it("creates and lists todos", async () => {
    const app = createApp(new MemoryStore());
    await request(app).post("/api/todos").send({ title: "learn docker" }).expect(201);
    const res = await request(app).get("/api/todos");
    expect(res.body).toHaveLength(1);
    expect(res.body[0].title).toBe("learn docker");
  });

  it("rejects empty title", async () => {
    await request(createApp(new MemoryStore())).post("/api/todos").send({ title: " " }).expect(400);
  });

  it("toggles and deletes a todo", async () => {
    const app = createApp(new MemoryStore());
    const { body } = await request(app).post("/api/todos").send({ title: "ship it" });
    const patched = await request(app).patch(`/api/todos/${body.id}`).send({ done: true });
    expect(patched.body.done).toBe(true);
    await request(app).delete(`/api/todos/${body.id}`).expect(204);
    await request(app).delete(`/api/todos/${body.id}`).expect(404);
  });
});
