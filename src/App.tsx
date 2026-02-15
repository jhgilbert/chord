import ReactQuill from "react-quill-new";
import "react-quill-new/dist/quill.snow.css";
import { useEffect, useMemo, useState } from "react";
import { getOrCreateSession } from "./session";
import {
  createNote,
  removeNote,
  setReaction,
  subscribeNotes,
  type Note,
  type NoteType,
  type Reaction,
} from "./notes";

const NOTE_TYPES: NoteType[] = ["Question", "Requirement"];

function NoteTypePanel({
  label,
  isOpen,
  onToggle,
  onSubmit,
}: {
  label: NoteType;
  isOpen: boolean;
  onToggle: () => void;
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
    <div style={{ border: "1px solid #d1d5db", borderRadius: 6, overflow: "hidden" }}>
      <button
        type="button"
        onClick={onToggle}
        style={{
          width: "100%",
          padding: "10px 14px",
          textAlign: "left",
          background: isOpen ? "#111" : "#f9fafb",
          color: isOpen ? "#fff" : "#111",
          border: "none",
          cursor: "pointer",
          fontWeight: 600,
          fontSize: 14,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        {label}
        <span style={{ fontSize: 12, opacity: 0.6 }}>{isOpen ? "▲" : "▼"}</span>
      </button>

      {isOpen && (
        <form onSubmit={handleSubmit} style={{ padding: 10, background: "#fff" }}>
          <ReactQuill
            theme="snow"
            value={value}
            onChange={setValue}
            style={{ background: "#fff", color: "#111" }}
          />
          <div style={{ marginTop: 8, display: "flex", justifyContent: "flex-end" }}>
            <button type="submit" style={{ padding: "8px 16px" }}>
              Post note
            </button>
          </div>
        </form>
      )}
    </div>
  );
}

function StickyNote({
  note,
  sessionId,
  canDelete,
  canReact,
  onDelete,
}: {
  note: Note;
  sessionId: string;
  canDelete: boolean;
  canReact: boolean;
  onDelete: () => void;
}) {
  const [hovered, setHovered] = useState(false);
  const myReaction: Reaction | null = note.reactions?.[sessionId] ?? null;

  const counts = { agree: 0, disagree: 0 };
  for (const r of Object.values(note.reactions ?? {})) counts[r]++;

  const handleReaction = (r: Reaction) => {
    setReaction(note.id, sessionId, myReaction === r ? null : r);
  };

  const reactionBtn = (r: Reaction): React.CSSProperties => ({
    display: "flex",
    alignItems: "center",
    gap: 4,
    padding: "3px 8px",
    fontSize: 13,
    border: "1px solid",
    borderRadius: 20,
    cursor: "pointer",
    transition: "opacity 0.15s",
    opacity: hovered || myReaction === r ? 1 : 0,
    background: myReaction === r ? "#111" : "transparent",
    color: myReaction === r ? "#fff" : "#555",
    borderColor: myReaction === r ? "#111" : "#bbb",
  });

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: "#fef9c3",
        borderRadius: 4,
        boxShadow: "3px 3px 10px rgba(0,0,0,0.18), 1px 1px 3px rgba(0,0,0,0.1)",
        padding: "18px 20px",
        position: "relative",
        color: "#1a1a1a",
      }}
    >
      {canDelete && (
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
            opacity: hovered ? 0.45 : 0,
            padding: 0,
            color: "#1a1a1a",
            transition: "opacity 0.15s",
          }}
        >
          ✕
        </button>
      )}
      <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 10 }}>
        <span
          style={{
            fontSize: 11,
            fontWeight: 700,
            textTransform: "uppercase",
            letterSpacing: "0.05em",
            background: "#111",
            color: "#fff",
            borderRadius: 3,
            padding: "2px 6px",
          }}
        >
          {note.type}
        </span>
        <span style={{ fontSize: 12, fontWeight: 600, opacity: 0.6 }}>
          {note.createdByName}
        </span>
      </div>
      <div
        dangerouslySetInnerHTML={{ __html: note.content }}
        style={{ lineHeight: 1.6 }}
      />
      {canReact && (
        <div style={{ display: "flex", gap: 6, marginTop: 12 }}>
          <button onClick={() => handleReaction("agree")} style={reactionBtn("agree")}>
            👍 {counts.agree > 0 && <span>{counts.agree}</span>}
          </button>
          <button onClick={() => handleReaction("disagree")} style={reactionBtn("disagree")}>
            👎 {counts.disagree > 0 && <span>{counts.disagree}</span>}
          </button>
        </div>
      )}
    </div>
  );
}

export default function App() {
  const { sessionId, displayName } = useMemo(() => getOrCreateSession(), []);
  const [notes, setNotes] = useState<Note[]>([]);
  const [openType, setOpenType] = useState<NoteType | null>(null);
  const [filter, setFilter] = useState<NoteType | "All">("All");

  useEffect(() => {
    const unsub = subscribeNotes(setNotes);
    return () => unsub();
  }, []);

  const visibleNotes = filter === "All" ? notes : notes.filter((n) => n.type === filter);

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

      <aside style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {NOTE_TYPES.map((type) => (
          <NoteTypePanel
            key={type}
            label={type}
            isOpen={openType === type}
            onToggle={() => setOpenType(openType === type ? null : type)}
            onSubmit={(html) => createNote(type, html, sessionId, displayName)}
          />
        ))}
      </aside>

      <main>
        <div style={{ display: "flex", gap: 6, marginBottom: 16 }}>
          {(["All", ...NOTE_TYPES] as const).map((t) => (
            <button
              key={t}
              onClick={() => setFilter(t)}
              style={{
                padding: "5px 12px",
                fontSize: 13,
                fontWeight: filter === t ? 600 : 400,
                background: filter === t ? "#111" : "#f3f4f6",
                color: filter === t ? "#fff" : "#555",
                border: "1px solid #d1d5db",
                borderRadius: 4,
                cursor: "pointer",
              }}
            >
              {t}
            </button>
          ))}
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {visibleNotes.map((n) => (
            <StickyNote
              key={n.id}
              note={n}
              sessionId={sessionId}
              canDelete={n.createdBy === sessionId}
              canReact={n.createdBy !== sessionId}
              onDelete={() => removeNote(n.id)}
            />
          ))}
        </div>
      </main>
    </div>
  );
}
