import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { useEffect, useMemo, useState } from "react";
import { getOrCreateSession } from "./session";
import { createNote, removeNote, subscribeNotes, type Note } from "./notes";

function RichTextEditor({
  onSubmit,
}: {
  onSubmit: (html: string) => Promise<void>;
}) {
  const editor = useEditor({
    extensions: [StarterKit],
    content: "",
  });

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editor) return;
    const html = editor.getHTML();
    if (html === "<p></p>") return;
    await onSubmit(html);
    editor.commands.clearContent();
  };

  if (!editor) return null;

  const btnStyle = (active: boolean): React.CSSProperties => ({
    padding: "4px 8px",
    fontWeight: "bold",
    background: active ? "#d1d5db" : "#f3f4f6",
    border: "1px solid #d1d5db",
    borderRadius: 4,
    cursor: "pointer",
    fontSize: 13,
    color: "#111",
  });

  return (
    <form onSubmit={handleSubmit}>
      <div
        style={{
          border: "1px solid #d1d5db",
          borderRadius: 6,
          overflow: "hidden",
        }}
      >
        <div
          style={{
            display: "flex",
            gap: 4,
            padding: "6px 8px",
            background: "#f9fafb",
            borderBottom: "1px solid #d1d5db",
            flexWrap: "wrap",
          }}
        >
          <button
            type="button"
            onMouseDown={(e) => {
              e.preventDefault();
              editor.chain().focus().toggleBold().run();
            }}
            style={btnStyle(editor.isActive("bold"))}
          >
            B
          </button>
          <button
            type="button"
            onMouseDown={(e) => {
              e.preventDefault();
              editor.chain().focus().toggleItalic().run();
            }}
            style={btnStyle(editor.isActive("italic"))}
          >
            <em>I</em>
          </button>
          <button
            type="button"
            onMouseDown={(e) => {
              e.preventDefault();
              editor.chain().focus().toggleStrike().run();
            }}
            style={btnStyle(editor.isActive("strike"))}
          >
            <s>S</s>
          </button>
          <button
            type="button"
            onMouseDown={(e) => {
              e.preventDefault();
              editor.chain().focus().toggleHeading({ level: 2 }).run();
            }}
            style={btnStyle(editor.isActive("heading", { level: 2 }))}
          >
            H2
          </button>
          <button
            type="button"
            onMouseDown={(e) => {
              e.preventDefault();
              editor.chain().focus().toggleBulletList().run();
            }}
            style={btnStyle(editor.isActive("bulletList"))}
          >
            • List
          </button>
          <button
            type="button"
            onMouseDown={(e) => {
              e.preventDefault();
              editor.chain().focus().toggleOrderedList().run();
            }}
            style={btnStyle(editor.isActive("orderedList"))}
          >
            1. List
          </button>
        </div>
        <EditorContent
          editor={editor}
          style={{
            minHeight: 100,
            padding: "10px 12px",
            outline: "none",
            fontSize: 15,
            lineHeight: 1.6,
          }}
        />
      </div>
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
        marginBottom: 16,
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
        maxWidth: 720,
        margin: "40px auto",
        padding: "0 20px",
        fontFamily: "system-ui, sans-serif",
      }}
    >
      <h1 style={{ marginBottom: 4 }}>Chord</h1>
      <p style={{ marginBottom: 20 }}>
        You are: <b>{displayName}</b> (<code>{sessionId}</code>)
      </p>

      <RichTextEditor
        onSubmit={(html) => createNote(html, sessionId, displayName)}
      />

      <div style={{ marginTop: 24 }}>
        {notes.map((n) => (
          <StickyNote
            key={n.id}
            note={n}
            onDelete={() => removeNote(n.id)}
          />
        ))}
      </div>
    </div>
  );
}
