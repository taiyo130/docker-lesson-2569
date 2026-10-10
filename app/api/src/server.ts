import { createApp } from "./app.js";
import { MemoryStore, PostgresStore, type TodoStore } from "./store.js";

const port = Number(process.env.PORT ?? 3000);
const store: TodoStore = process.env.DATABASE_URL
  ? new PostgresStore(process.env.DATABASE_URL)
  : new MemoryStore();

await store.init();

const server = createApp(store).listen(port, () => {
  console.log(`todo-api listening on :${port} (store: ${store.kind})`);
});

// docker stop ส่ง SIGTERM — ปิดให้เรียบร้อยแทนที่จะรอโดน kill หลัง 10 วินาที
process.on("SIGTERM", () => {
  console.log("SIGTERM received, shutting down");
  server.close(() => process.exit(0));
});
