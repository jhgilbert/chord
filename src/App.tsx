import ReactQuill from "react-quill-new";
import "react-quill-new/dist/quill.snow.css";
import { useEffect, useMemo, useState } from "react";
import { getOrCreateSession } from "./session";
import { createNote, removeNote, subscribeNotes, type Note } from "./notes";

function RichTextEditor({
  onSubmit,
}: {
  onSubmit: (html: string) => Promise<void>;
}) {
  const [value, setValue] = useState("");

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const isEmpty = value === "" || value === "<p><br></p>";
    if (isEmpty) return;
    await onSubmit(value);
    setValue("");
  };

  return (
    <form onSubmit={handleSubmit}>
      <ReactQuill
        theme="snow"
        value={value}
        onChange={setValue}
        style={{ background: "#fff", color: "#111", borderRadius: 6 }}
      />
      <div style={{ marginTop: 8, display: "flex", justifyContent: "flex-end" }}>
        <button type="submit" style={{ padding: "8px 16px" }}>
          Post note
        </button>
      </div>
    </form>
  );
}

function StickyNote({
  note,
  onDelete,
}: {
  note: Note;
  onDelete: () => void;
}) {
  return (
    <div
      style={{
        background: "#fef9c3",
        borderRadius: 4,
        boxShadow:
          "3px 3px 10px rgba(0,0,0,0.18), 1px 1px 3px rgba(0,0,0,0.1)",
        padding: "18px 20px",
        position: "relative",
        color: "#1a1a1a",
      }}
    >
      <button
        onClick={onDelete}
        aria-label="Delete note"
        style={{
          position: "absolute",
          top: 10,
          right: 12,
          background: "none",
          border: "none",
          cursor: "pointer",
          fontSize: 16,
          opacity: 0.45,
          padding: 0,
          color: "#1a1a1a",
        }}
      >
        ✕
      </button>
      <div
        style={{ fontSize: 12, fontWeight: 600, marginBottom: 10, opacity: 0.6 }}
      >
        {note.createdByName}
      </div>
      <div
        dangerouslySetInnerHTML={{ __html: note.content }}
        style={{ lineHeight: 1.6 }}
      />
    </div>
  );
}

export default function App() {
  const { sessionId, displayName } = useMemo(() => getOrCreateSession(), []);
  const [notes, setNotes] = useState<Note[]>([]);

  useEffect(() => {
    const unsub = subscribeNotes(setNotes);
    return () => unsub();
  }, []);

  return (
    <div
      style={{
        margin: "40px 20px",
        fontFamily: "system-ui, sans-serif",
        display: "grid",
        gridTemplateColumns: "380px 1fr",
        gridTemplateRows: "auto 1fr",
        gap: "0 24px",
        minHeight: "calc(100vh - 80px)",
      }}
    >
      <div style={{ gridColumn: "1 / -1", marginBottom: 20 }}>
        <h1 style={{ marginBottom: 4 }}>Chord</h1>
        <p style={{ margin: 0 }}>
          You are: <b>{displayName}</b> (<code>{sessionId}</code>)
        </p>
      </div>

      <aside>
        <RichTextEditor
          onSubmit={(html) => createNote(html, sessionId, displayName)}
        />
      </aside>

      <main>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))",
            gridAutoFlow: "row",
            gap: 16,
            alignContent: "start",
          }}
        >
          {notes.map((n) => (
            <StickyNote
              key={n.id}
              note={n}
              onDelete={() => removeNote(n.id)}
            />
          ))}
        </div>
      </main>
    </div>
  );
}
