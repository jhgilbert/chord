import { useEffect, useMemo, useState } from "react";
import { getOrCreateSession } from "./session";
import {
  createTodo,
  removeTodo,
  subscribeTodos,
  toggleTodo,
  type Todo,
} from "./todos";

export default function App() {
  const { sessionId, displayName } = useMemo(() => getOrCreateSession(), []);
  const [todos, setTodos] = useState<Todo[]>([]);
  const [text, setText] = useState("");

  useEffect(() => {
    const unsub = subscribeTodos(setTodos);
    return () => unsub();
  }, []);

  return (
    <div
      style={{
        maxWidth: 720,
        margin: "40px auto",
        fontFamily: "system-ui, sans-serif",
      }}
    >
      <h1>Shared TODOs</h1>
      <p>
        You are: <b>{displayName}</b> (<code>{sessionId}</code>)
      </p>

      <form
        onSubmit={async (e) => {
          e.preventDefault();
          const t = text.trim();
          if (!t) return;
          setText("");
          await createTodo(t, sessionId, displayName);
        }}
        style={{ display: "flex", gap: 8 }}
      >
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Add a todo…"
          style={{ flex: 1, padding: 10 }}
        />
        <button type="submit" style={{ padding: "10px 14px" }}>
          Add
        </button>
      </form>

      <ul style={{ listStyle: "none", padding: 0, marginTop: 20 }}>
        {todos.map((t) => (
          <li
            key={t.id}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              padding: "10px 0",
              borderBottom: "1px solid #eee",
            }}
          >
            <input
              type="checkbox"
              checked={t.done}
              onChange={(e) => toggleTodo(t.id, e.target.checked)}
            />
            <div style={{ flex: 1 }}>
              <div style={{ textDecoration: t.done ? "line-through" : "none" }}>
                {t.text}
              </div>
              <div style={{ fontSize: 12, opacity: 0.7 }}>
                by {t.createdByName}
              </div>
            </div>
            <button onClick={() => removeTodo(t.id)} aria-label="Delete">
              ✕
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
