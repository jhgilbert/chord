import ReactQuill from "react-quill-new";
import "react-quill-new/dist/quill.snow.css";
import { useEffect, useMemo, useState } from "react";
import {
  Navigate,
  Route,
  Routes,
  useNavigate,
  useParams,
} from "react-router-dom";
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
import {
  endCollaboration,
  pauseCollaboration,
  startCollaboration,
  subscribeCollaboration,
  updatePrompt,
  type Collaboration,
} from "./collaborations";

const NOTE_TYPES: NoteType[] = ["Question", "Requirement", "Comment"];

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
    <div
      style={{
        border: "1px solid #d1d5db",
        borderRadius: 6,
        overflow: "hidden",
      }}
    >
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
        <form
          onSubmit={handleSubmit}
          style={{ padding: 10, background: "#fff" }}
        >
          <ReactQuill
            theme="snow"
            value={value}
            onChange={setValue}
            style={{ background: "#fff", color: "#111" }}
          />
          <div
            style={{
              marginTop: 8,
              display: "flex",
              justifyContent: "flex-end",
            }}
          >
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
  collaborationId,
  sessionId,
  canDelete,
  canReact,
  paused,
  onDelete,
}: {
  note: Note;
  collaborationId: string;
  sessionId: string;
  canDelete: boolean;
  canReact: boolean;
  paused: boolean;
  onDelete: () => void;
}) {
  const [hovered, setHovered] = useState(false);
  const myReaction: Reaction | null = note.reactions?.[sessionId] ?? null;

  const counts = { agree: 0, disagree: 0 };
  if (paused) {
    for (const r of Object.values(note.reactions ?? {})) counts[r]++;
  } else if (myReaction) {
    counts[myReaction] = 1;
  }

  const handleReaction = (r: Reaction) => {
    setReaction(
      collaborationId,
      note.id,
      sessionId,
      myReaction === r ? null : r,
    );
  };

  const reactionBtn = (r: Reaction): React.CSSProperties => ({
    display: "flex",
    alignItems: "center",
    gap: 4,
    padding: "3px 8px",
    fontSize: 13,
    border: "1px solid",
    borderRadius: 20,
    cursor: paused ? "default" : "pointer",
    transition: "opacity 0.15s",
    opacity: paused
      ? counts[r] > 0
        ? 1
        : 0.25
      : hovered || myReaction === r
        ? 1
        : 0,
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
        border: note.createdBy === sessionId ? "1.5px solid #4ade80" : "1.5px solid transparent",
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
      <div
        style={{
          display: "flex",
          gap: 8,
          alignItems: "center",
          marginBottom: 10,
        }}
      >
        {note.createdBy === sessionId && (
          <span
            style={{
              fontSize: 11,
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: "0.05em",
              background: "#4ade80",
              color: "#14532d",
              borderRadius: 3,
              padding: "2px 6px",
            }}
          >
            You
          </span>
        )}
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
      {(canReact || paused) && note.createdBy !== sessionId && (
        <div style={{ display: "flex", gap: 6, marginTop: 12 }}>
          <button
            onClick={canReact ? () => handleReaction("agree") : undefined}
            style={reactionBtn("agree")}
          >
            👍 {counts.agree > 0 && <span>{counts.agree}</span>}
          </button>
          <button
            onClick={canReact ? () => handleReaction("disagree") : undefined}
            style={reactionBtn("disagree")}
          >
            👎 {counts.disagree > 0 && <span>{counts.disagree}</span>}
          </button>
        </div>
      )}
    </div>
  );
}

function StartScreen() {
  const { sessionId, displayName } = useMemo(() => getOrCreateSession(), []);
  const [prompt, setPrompt] = useState("");
  const navigate = useNavigate();

  const handleStart = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const isEmpty = prompt === "" || prompt === "<p><br></p>";
    if (isEmpty) return;
    const id = crypto.randomUUID();
    await startCollaboration(id, sessionId, displayName, prompt);
    navigate(`/collabs/${id}`, { replace: true });
  };

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "100vh",
        fontFamily: "system-ui, sans-serif",
        padding: "40px 20px",
        boxSizing: "border-box",
      }}
    >
      <h1 style={{ margin: "0 0 4px" }}>Chord</h1>
      <p style={{ margin: "0 0 24px", opacity: 0.6, fontSize: 14 }}>
        You are: <b>{displayName}</b>
      </p>
      <form onSubmit={handleStart} style={{ width: "100%", maxWidth: 600 }}>
        <label
          style={{
            display: "block",
            fontWeight: 600,
            marginBottom: 8,
            fontSize: 14,
          }}
        >
          Collaboration prompt
        </label>
        <ReactQuill
          theme="snow"
          value={prompt}
          onChange={setPrompt}
          style={{ background: "#fff", color: "#111" }}
        />
        <div
          style={{ marginTop: 12, display: "flex", justifyContent: "flex-end" }}
        >
          <button
            type="submit"
            style={{
              padding: "10px 24px",
              fontSize: 15,
              fontWeight: 600,
              background: "#111",
              color: "#fff",
              border: "none",
              borderRadius: 6,
              cursor: "pointer",
            }}
          >
            Start collaboration
          </button>
        </div>
      </form>
    </div>
  );
}

function CollabRoute() {
  const { id } = useParams<{ id: string }>();
  const { sessionId, displayName } = useMemo(() => getOrCreateSession(), []);
  const [collab, setCollab] = useState<Collaboration | null | undefined>(
    undefined,
  );
  const [notes, setNotes] = useState<Note[]>([]);
  const [openType, setOpenType] = useState<NoteType | null>(null);
  const [filter, setFilter] = useState<NoteType | "All" | "Inbox" | "Mine">(
    "All",
  );
  const [editingPrompt, setEditingPrompt] = useState(false);
  const [promptValue, setPromptValue] = useState("");

  useEffect(() => {
    if (!id) return;
    const unsub = subscribeCollaboration(id, setCollab);
    return () => unsub();
  }, [id]);

  useEffect(() => {
    if (!id) return;
    const unsub = subscribeNotes(id, setNotes);
    return () => unsub();
  }, [id]);

  if (!id) return <Navigate to="/start" replace />;
  if (collab === undefined) return null;
  if (collab === null) {
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          height: "100vh",
          fontFamily: "system-ui, sans-serif",
        }}
      >
        Collaboration not found.
      </div>
    );
  }

  const visibleNotes =
    filter === "All"
      ? notes
      : filter === "Inbox"
        ? notes.filter(
            (n) => n.createdBy !== sessionId && !n.reactions?.[sessionId],
          )
        : filter === "Mine"
          ? notes.filter((n) => n.createdBy === sessionId)
          : notes.filter((n) => n.type === filter);

  return (
    <div style={{ margin: "0 20px 40px", fontFamily: "system-ui, sans-serif" }}>
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "12px 0",
          borderBottom: "1px solid #e5e7eb",
          marginBottom: 24,
        }}
      >
        <div>
          <span style={{ fontWeight: 700, fontSize: 18 }}>Chord</span>
          <span style={{ marginLeft: 16, fontSize: 13, opacity: 0.6 }}>
            Started by <b>{collab.startedByName}</b>
          </span>
          <span style={{ marginLeft: 16, fontSize: 12, opacity: 0.5 }}>
            You are: <b>{displayName}</b>
          </span>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          {!collab.active && (
            <span
              style={{
                fontSize: 12,
                fontWeight: 600,
                color: "#6b7280",
                background: "#f3f4f6",
                border: "1px solid #d1d5db",
                borderRadius: 4,
                padding: "3px 8px",
              }}
            >
              Ended
            </span>
          )}
          {collab.paused && collab.active && (
            <span
              style={{
                fontSize: 12,
                fontWeight: 600,
                color: "#b45309",
                background: "#fef3c7",
                border: "1px solid #fcd34d",
                borderRadius: 4,
                padding: "3px 8px",
              }}
            >
              Input paused
            </span>
          )}
          {collab.startedBy === sessionId && collab.active && (
            <>
              <button
                onClick={() => pauseCollaboration(collab.id, !collab.paused)}
                style={{
                  padding: "6px 14px",
                  fontSize: 13,
                  background: collab.paused ? "#fff" : "#374151",
                  color: collab.paused ? "#374151" : "#fff",
                  border: "1px solid #374151",
                  borderRadius: 4,
                  cursor: "pointer",
                  fontWeight: 600,
                }}
              >
                {collab.paused ? "Resume input" : "Pause input"}
              </button>
              <button
                onClick={() => endCollaboration(collab.id)}
                style={{
                  padding: "6px 14px",
                  fontSize: 13,
                  background: "#dc2626",
                  color: "#fff",
                  border: "none",
                  borderRadius: 4,
                  cursor: "pointer",
                  fontWeight: 600,
                }}
              >
                End collaboration
              </button>
            </>
          )}
        </div>
      </div>

      {/* Two-column layout */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "380px 1fr",
          gap: "0 24px",
          minHeight: "calc(100vh - 120px)",
        }}
      >
        <aside style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <div
            style={{
              border: "1px solid #e5e7eb",
              borderRadius: 6,
              padding: "14px 16px",
              marginBottom: 4,
              background: "#f9fafb",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 8,
              }}
            >
              <div
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                  opacity: 0.5,
                }}
              >
                Prompt
              </div>
              {collab.startedBy === sessionId && !editingPrompt && (
                <button
                  onClick={() => {
                    setEditingPrompt(true);
                    setPromptValue(collab.prompt);
                  }}
                  style={{
                    fontSize: 11,
                    padding: "2px 8px",
                    background: "transparent",
                    border: "1px solid #d1d5db",
                    borderRadius: 3,
                    cursor: "pointer",
                    color: "#555",
                  }}
                >
                  Edit
                </button>
              )}
            </div>
            {editingPrompt ? (
              <>
                <ReactQuill
                  theme="snow"
                  value={promptValue}
                  onChange={setPromptValue}
                  style={{ background: "#fff", color: "#111", marginBottom: 8 }}
                />
                <div style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
                  <button
                    onClick={() => {
                      setEditingPrompt(false);
                      setPromptValue("");
                    }}
                    style={{
                      fontSize: 12,
                      padding: "4px 12px",
                      background: "#fff",
                      border: "1px solid #d1d5db",
                      borderRadius: 4,
                      cursor: "pointer",
                      color: "#555",
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={async () => {
                      await updatePrompt(collab.id, promptValue);
                      setEditingPrompt(false);
                      setPromptValue("");
                    }}
                    style={{
                      fontSize: 12,
                      padding: "4px 12px",
                      background: "#111",
                      color: "#fff",
                      border: "none",
                      borderRadius: 4,
                      cursor: "pointer",
                      fontWeight: 600,
                    }}
                  >
                    Save
                  </button>
                </div>
              </>
            ) : (
              <div
                dangerouslySetInnerHTML={{ __html: collab.prompt }}
                style={{ fontSize: 14, lineHeight: 1.6, color: "#1a1a1a" }}
              />
            )}
          </div>
          {!collab.active ? (
            <div
              style={{
                fontSize: 13,
                color: "#6b7280",
                background: "#f3f4f6",
                border: "1px solid #d1d5db",
                borderRadius: 6,
                padding: "10px 14px",
              }}
            >
              This collaboration has ended.
            </div>
          ) : collab.paused ? (
            <div
              style={{
                fontSize: 13,
                color: "#92400e",
                background: "#fef3c7",
                border: "1px solid #fcd34d",
                borderRadius: 6,
                padding: "10px 14px",
              }}
            >
              Input is paused. New notes cannot be added.
            </div>
          ) : (
            NOTE_TYPES.map((type) => (
              <NoteTypePanel
                key={type}
                label={type}
                isOpen={openType === type}
                onToggle={() => setOpenType(openType === type ? null : type)}
                onSubmit={(html) =>
                  createNote(collab.id, type, html, sessionId, displayName)
                }
              />
            ))
          )}
        </aside>

        <main>
          <div style={{ display: "flex", gap: 6, marginBottom: 16, alignItems: "center" }}>
            {(["All", "Inbox", "Mine"] as const).map((t) => (
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
            <select
              value={NOTE_TYPES.includes(filter as NoteType) ? filter : "All"}
              onChange={(e) => setFilter(e.target.value as typeof filter)}
              style={{
                padding: "5px 10px",
                fontSize: 13,
                border: "1px solid #d1d5db",
                borderRadius: 4,
                background: NOTE_TYPES.includes(filter as NoteType) ? "#111" : "#f3f4f6",
                color: NOTE_TYPES.includes(filter as NoteType) ? "#fff" : "#555",
                cursor: "pointer",
                fontWeight: NOTE_TYPES.includes(filter as NoteType) ? 600 : 400,
              }}
            >
              <option value="All">All note types</option>
              {NOTE_TYPES.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {visibleNotes.map((n) => (
              <StickyNote
                key={n.id}
                note={n}
                collaborationId={collab.id}
                sessionId={sessionId}
                canDelete={
                  !collab.paused && collab.active && n.createdBy === sessionId
                }
                canReact={
                  !collab.paused && collab.active && n.createdBy !== sessionId
                }
                paused={!!collab.paused}
                onDelete={() => removeNote(collab.id, n.id)}
              />
            ))}
          </div>
        </main>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<StartScreen />} />
      <Route path="/collabs/:id" element={<CollabRoute />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
