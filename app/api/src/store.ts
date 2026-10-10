import pg from "pg";

export type Todo = { id: number; title: string; done: boolean; created_at: string };

export interface TodoStore {
  kind: "memory" | "postgres";
  init(): Promise<void>;
  list(): Promise<Todo[]>;
  create(title: string): Promise<Todo>;
  update(id: number, done: boolean): Promise<Todo | null>;
  remove(id: number): Promise<boolean>;
  ping(): Promise<void>;
}

// เก็บข้อมูลไว้ใน RAM — container ถูกลบเมื่อไร ข้อมูลหายหมด (ใช้สาธิต Day 1)
export class MemoryStore implements TodoStore {
  kind = "memory" as const;
  private todos: Todo[] = [];
  private nextId = 1;

  async init() {}
  async ping() {}
  async list() {
    return [...this.todos].reverse();
  }
  async create(title: string) {
    const todo = { id: this.nextId++, title, done: false, created_at: new Date().toISOString() };
    this.todos.push(todo);
    return todo;
  }
  async update(id: number, done: boolean) {
    const todo = this.todos.find((t) => t.id === id);
    if (!todo) return null;
    todo.done = done;
    return todo;
  }
  async remove(id: number) {
    const before = this.todos.length;
    this.todos = this.todos.filter((t) => t.id !== id);
    return this.todos.length < before;
  }
}

// เก็บข้อมูลใน PostgreSQL — ใช้เมื่อกำหนด DATABASE_URL (Day 2)
export class PostgresStore implements TodoStore {
  kind = "postgres" as const;
  private pool: pg.Pool;

  constructor(connectionString: string) {
    this.pool = new pg.Pool({ connectionString });
  }

  async init() {
    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS todos (
        id SERIAL PRIMARY KEY,
        title TEXT NOT NULL,
        done BOOLEAN NOT NULL DEFAULT false,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )`);
  }
  async ping() {
    await this.pool.query("SELECT 1");
  }
  async list() {
    const { rows } = await this.pool.query<Todo>("SELECT * FROM todos ORDER BY id DESC");
    return rows;
  }
  async create(title: string) {
    const { rows } = await this.pool.query<Todo>(
      "INSERT INTO todos (title) VALUES ($1) RETURNING *",
      [title],
    );
    return rows[0];
  }
  async update(id: number, done: boolean) {
    const { rows } = await this.pool.query<Todo>(
      "UPDATE todos SET done = $2 WHERE id = $1 RETURNING *",
      [id, done],
    );
    return rows[0] ?? null;
  }
  async remove(id: number) {
    const { rowCount } = await this.pool.query("DELETE FROM todos WHERE id = $1", [id]);
    return (rowCount ?? 0) > 0;
  }
}
