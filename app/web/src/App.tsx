import { useEffect, useState, type FormEvent } from "react";

type Todo = { id: number; title: string; done: boolean };
type Info = { hostname: string; version: string; store: string };

// แก้ข้อความนี้ระหว่าง Lab 5 เพื่อดู hot reload ผ่าน bind mount
const TITLE = "Docker Todo 🐳";

export default function App() {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [info, setInfo] = useState<Info | null>(null);
  const [title, setTitle] = useState("");
  const [error, setError] = useState("");

  async function load() {
    try {
      const [todoRes, infoRes] = await Promise.all([fetch("/api/todos"), fetch("/api/info")]);
      if (!todoRes.ok) throw new Error(`API ${todoRes.status}`);
      setTodos(await todoRes.json());
      setInfo(await infoRes.json());
      setError("");
    } catch {
      setError("เชื่อมต่อ API ไม่ได้ — api container รันอยู่หรือเปล่า?");
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function add(e: FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    await fetch("/api/todos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title }),
    });
    setTitle("");
    load();
  }

  async function toggle(todo: Todo) {
    await fetch(`/api/todos/${todo.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ done: !todo.done }),
    });
    load();
  }

  async function remove(todo: Todo) {
    await fetch(`/api/todos/${todo.id}`, { method: "DELETE" });
    load();
  }

  return (
    <main>
      <h1>{TITLE}</h1>
      <form onSubmit={add}>
        <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="ต้องทำอะไร..." />
        <button type="submit">เพิ่ม</button>
      </form>
      {error && <p className="error">{error}</p>}
      <ul>
        {todos.map((todo) => (
          <li key={todo.id} className={todo.done ? "done" : ""}>
            <label>
              <input type="checkbox" checked={todo.done} onChange={() => toggle(todo)} />
              {todo.title}
            </label>
            <button onClick={() => remove(todo)} aria-label="ลบ">✕</button>
          </li>
        ))}
      </ul>
      {info && (
        <footer>
          api: <code>{info.hostname}</code> · version: <code>{info.version}</code> · store:{" "}
          <code>{info.store}</code>
        </footer>
      )}
    </main>
  );
}
