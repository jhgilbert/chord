import ReactQuill from "react-quill-new";
import "react-quill-new/dist/quill.snow.css";
import { useEffect, useMemo, useState } from "react";
import styles from "./App.module.css";
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
  editNote,
  removeNote,
  setReaction,
  setGroupedUnder,
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
    <div className={styles.noteTypePanel}>
      <button
        type="button"
        onClick={onToggle}
        className={styles.noteTypePanelButton}
        data-open={isOpen}
      >
        {label}
        <span className={styles.noteTypePanelArrow}>{isOpen ? "▲" : "▼"}</span>
      </button>

      {isOpen && (
        <form onSubmit={handleSubmit} className={styles.noteTypePanelForm}>
          <ReactQuill
            theme="snow"
            value={value}
            onChange={setValue}
            className={styles.noteTypePanelEditor}
          />
          <div className={styles.noteTypePanelActions}>
            <button type="submit" className={styles.noteTypePanelSubmit}>
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
  canDrag,
  onDragStart,
  onDragOver,
  onDrop,
  isGrouped,
  groupDepth,
  canUngroup,
  onUngroup,
  canEdit,
}: {
  note: Note;
  collaborationId: string;
  sessionId: string;
  canDelete: boolean;
  canReact: boolean;
  paused: boolean;
  onDelete: () => void;
  canDrag?: boolean;
  onDragStart?: () => void;
  onDragOver?: (e: React.DragEvent) => void;
  onDrop?: () => void;
  isGrouped?: boolean;
  groupDepth?: number;
  canUngroup?: boolean;
  onUngroup?: () => void;
  canEdit?: boolean;
}) {
  const [hovered, setHovered] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState("");
  const [showHistory, setShowHistory] = useState(false);
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

  const getReactionOpacity = (r: Reaction) => {
    if (paused) return counts[r] > 0 ? 1 : 0.25;
    return hovered || myReaction === r ? 1 : 0;
  };

  const handleEdit = () => {
    setEditContent(note.content);
    setIsEditing(true);
  };

  const handleSaveEdit = async () => {
    const isEmpty = editContent === "" || editContent === "<p><br></p>";
    if (isEmpty) return;
    if (editContent === note.content) {
      setIsEditing(false);
      return;
    }
    try {
      console.log("Saving edit:", {
        noteId: note.id,
        oldContent: note.content.substring(0, 50),
        newContent: editContent.substring(0, 50),
      });
      await editNote(
        collaborationId,
        note.id,
        note.content,
        editContent,
        note.editHistory,
      );
      console.log("Edit saved successfully");
      setIsEditing(false);
    } catch (error) {
      console.error("Failed to save edit:", error);
      alert("Failed to save edit. Check console for details.");
      setIsEditing(false);
    }
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditContent("");
  };

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className={styles.stickyNote}
      data-own={note.createdBy === sessionId}
      data-grouped={isGrouped}
      draggable={canDrag}
      onDragStart={(e) => {
        if (onDragStart) {
          e.dataTransfer.effectAllowed = "move";
          onDragStart();
        }
      }}
      onDragOver={(e) => {
        if (onDragOver) {
          e.preventDefault();
          e.dataTransfer.dropEffect = "move";
          onDragOver(e);
        }
      }}
      onDrop={(e) => {
        if (onDrop) {
          e.preventDefault();
          onDrop();
        }
      }}
      style={
        groupDepth ? { marginLeft: `${groupDepth * 20}px` } : undefined
      }
    >
      {canDelete && (
        <button
          onClick={onDelete}
          aria-label="Delete note"
          className={styles.stickyNoteDelete}
        >
          ✕
        </button>
      )}
      {canUngroup && (
        <button
          onClick={onUngroup}
          aria-label="Ungroup note"
          className={styles.stickyNoteUngroup}
        >
          Ungroup
        </button>
      )}
      {(canReact || paused) && note.createdBy !== sessionId && (
        <div className={styles.stickyNoteReactions}>
          <button
            onClick={canReact ? () => handleReaction("agree") : undefined}
            className={styles.reactionButton}
            data-active={myReaction === "agree"}
            data-paused={paused}
            style={{ opacity: getReactionOpacity("agree") }}
          >
            👍 {counts.agree > 0 && <span>{counts.agree}</span>}
          </button>
          <button
            onClick={canReact ? () => handleReaction("disagree") : undefined}
            className={styles.reactionButton}
            data-active={myReaction === "disagree"}
            data-paused={paused}
            style={{ opacity: getReactionOpacity("disagree") }}
          >
            👎 {counts.disagree > 0 && <span>{counts.disagree}</span>}
          </button>
        </div>
      )}
      <div className={styles.stickyNoteBadges}>
        {note.createdBy === sessionId && (
          <span className={styles.badgeYou}>You</span>
        )}
        <span className={styles.badgeType}>{note.type}</span>
        <span className={styles.badgeName}>{note.createdByName}</span>
        {canEdit && !isEditing && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleEdit();
            }}
            className={styles.badgeEdit}
            aria-label="Edit note"
          >
            Edit
          </button>
        )}
      </div>
      {isEditing ? (
        <div className={styles.editContainer}>
          <ReactQuill
            theme="snow"
            value={editContent}
            onChange={setEditContent}
            className={styles.editEditor}
          />
          <div className={styles.editActions}>
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleCancelEdit();
              }}
              className={styles.editCancel}
            >
              Cancel
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleSaveEdit();
              }}
              className={styles.editSave}
            >
              Save
            </button>
          </div>
        </div>
      ) : (
        <>
          <div
            dangerouslySetInnerHTML={{ __html: note.content }}
            className={styles.stickyNoteContent}
          />
          {note.editHistory && note.editHistory.length > 0 && (
            <div className={styles.historyContainer}>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowHistory(!showHistory);
                }}
                className={styles.historyToggle}
              >
                {showHistory ? "Hide" : "Show"} edit history (
                {note.editHistory.length} version
                {note.editHistory.length !== 1 ? "s" : ""})
              </button>
              {showHistory && (
                <div className={styles.historyList}>
                  {note.editHistory.map((version, idx) => {
                    const timestamp = version.editedAt
                      ? new Date(version.editedAt as number).toLocaleString()
                      : "Unknown date";
                    return (
                      <div key={idx} className={styles.historyVersion}>
                        <div className={styles.historyDivider} />
                        <div className={styles.historyTimestamp}>{timestamp}</div>
                        <div
                          dangerouslySetInnerHTML={{ __html: version.content }}
                          className={styles.historyContent}
                        />
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </>
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
    <div className={styles.startScreen}>
      <h1 className={styles.startScreenTitle}>Chord</h1>
      <p className={styles.startScreenUser}>
        You are: <b>{displayName}</b>
      </p>
      <form onSubmit={handleStart} className={styles.startScreenForm}>
        <label className={styles.startScreenLabel}>
          Collaboration prompt
        </label>
        <ReactQuill
          theme="snow"
          value={prompt}
          onChange={setPrompt}
          className={styles.startScreenEditor}
        />
        <div className={styles.startScreenActions}>
          <button type="submit" className={styles.startScreenSubmit}>
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
  const [reactionFilter, setReactionFilter] = useState<
    "All" | "Agreed" | "Disagreed" | "Not reacted"
  >("All");
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [draggedNoteId, setDraggedNoteId] = useState<string | null>(null);
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
    return <div className={styles.notFound}>Collaboration not found.</div>;
  }

  // Build noteGroups map from notes data
  const noteGroups = new Map<string, string[]>();
  for (const note of notes) {
    if (note.groupedUnder) {
      const existing = noteGroups.get(note.groupedUnder) || [];
      noteGroups.set(note.groupedUnder, [...existing, note.id]);
    }
  }

  // Build set of all grouped (child) note IDs
  const allChildIds = new Set<string>();
  for (const children of noteGroups.values()) {
    children.forEach((id) => allChildIds.add(id));
  }

  let visibleNotes =
    filter === "All"
      ? notes
      : filter === "Inbox"
        ? notes.filter(
            (n) =>
              n.createdBy !== sessionId &&
              !n.reactions?.[sessionId] &&
              !allChildIds.has(n.id),
          )
        : filter === "Mine"
          ? notes.filter((n) => n.createdBy === sessionId)
          : notes.filter((n) => n.type === filter);

  // Apply reaction filter
  if (reactionFilter !== "All") {
    visibleNotes = visibleNotes.filter((n) => {
      const myReaction = n.reactions?.[sessionId] ?? null;
      if (reactionFilter === "Agreed") return myReaction === "agree";
      if (reactionFilter === "Disagreed") return myReaction === "disagree";
      if (reactionFilter === "Not reacted")
        return n.createdBy !== sessionId && !myReaction;
      return true;
    });
  }

  const isHost = collab.startedBy === sessionId;

  const handleGroupNotes = async (parentId: string, childId: string) => {
    if (!isHost) return;
    if (parentId === childId) return;

    // Set the child note to be grouped under the parent
    await setGroupedUnder(collab.id, childId, parentId);
  };

  const toggleGroup = (noteId: string) => {
    setExpandedGroups((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(noteId)) {
        newSet.delete(noteId);
      } else {
        newSet.add(noteId);
      }
      return newSet;
    });
  };

  // Build display list including grouped notes
  const displayNotes: Array<{
    note: Note;
    isGrouped: boolean;
    groupDepth: number;
    isParent: boolean;
  }> = [];

  for (const note of visibleNotes) {
    // Skip if this note is a child of another note
    if (allChildIds.has(note.id)) continue;

    // Add parent note
    const children = noteGroups.get(note.id) || [];
    displayNotes.push({
      note,
      isGrouped: false,
      groupDepth: 0,
      isParent: children.length > 0,
    });

    // Add children if expanded
    if (expandedGroups.has(note.id)) {
      for (const childId of children) {
        const childNote = notes.find((n) => n.id === childId);
        if (childNote) {
          displayNotes.push({
            note: childNote,
            isGrouped: true,
            groupDepth: 1,
            isParent: false,
          });
        }
      }
    }
  }

  return (
    <div className={styles.collabContainer}>
      {/* Header */}
      <div className={styles.collabHeader}>
        <div>
          <span className={styles.collabHeaderTitle}>Chord</span>
          <span className={styles.collabHeaderMeta}>
            Started by <b>{collab.startedByName}</b>
          </span>
          <span className={styles.collabHeaderUser}>
            You are: <b>{displayName}</b>
          </span>
        </div>
        <div className={styles.collabHeaderActions}>
          {!collab.active && <span className={styles.badgeEnded}>Ended</span>}
          {collab.paused && collab.active && (
            <span className={styles.badgePaused}>Input paused</span>
          )}
          {collab.startedBy === sessionId && collab.active && (
            <>
              <button
                onClick={() => pauseCollaboration(collab.id, !collab.paused)}
                className={styles.buttonPause}
                data-paused={collab.paused}
              >
                {collab.paused ? "Resume input" : "Pause input"}
              </button>
              <button
                onClick={() => endCollaboration(collab.id)}
                className={styles.buttonEnd}
              >
                End collaboration
              </button>
            </>
          )}
        </div>
      </div>

      {/* Two-column layout */}
      <div className={styles.collabLayout}>
        <aside className={styles.collabSidebar}>
          <div className={styles.promptCard}>
            <div className={styles.promptHeader}>
              <div className={styles.promptLabel}>Prompt</div>
              {collab.startedBy === sessionId && !editingPrompt && (
                <button
                  onClick={() => {
                    setEditingPrompt(true);
                    setPromptValue(collab.prompt);
                  }}
                  className={styles.promptEditButton}
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
                  className={styles.promptEditor}
                />
                <div className={styles.promptActions}>
                  <button
                    onClick={() => {
                      setEditingPrompt(false);
                      setPromptValue("");
                    }}
                    className={styles.promptCancel}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={async () => {
                      await updatePrompt(collab.id, promptValue);
                      setEditingPrompt(false);
                      setPromptValue("");
                    }}
                    className={styles.promptSave}
                  >
                    Save
                  </button>
                </div>
              </>
            ) : (
              <div
                dangerouslySetInnerHTML={{ __html: collab.prompt }}
                className={styles.promptContent}
              />
            )}
          </div>
          {!collab.active ? (
            <div className={styles.messageEnded}>
              This collaboration has ended.
            </div>
          ) : collab.paused ? (
            <div className={styles.messagePaused}>
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

        <main className={styles.collabMain}>
          <div className={styles.filterBar}>
            {(["All", "Inbox", "Mine"] as const).map((t) => (
              <button
                key={t}
                onClick={() => setFilter(t)}
                className={styles.filterButton}
                data-active={filter === t}
              >
                {t}
              </button>
            ))}
            <select
              value={NOTE_TYPES.includes(filter as NoteType) ? filter : "All"}
              onChange={(e) => setFilter(e.target.value as typeof filter)}
              className={styles.filterDropdown}
              data-active={NOTE_TYPES.includes(filter as NoteType)}
            >
              <option value="All">All note types</option>
              {NOTE_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
            <select
              value={reactionFilter}
              onChange={(e) =>
                setReactionFilter(
                  e.target.value as typeof reactionFilter,
                )
              }
              className={styles.filterDropdown}
              data-active={reactionFilter !== "All"}
            >
              <option value="All">All reactions</option>
              <option value="Agreed">Agreed</option>
              <option value="Disagreed">Disagreed</option>
              <option value="Not reacted">Not reacted</option>
            </select>
          </div>
          <div className={styles.notesList}>
            {displayNotes.map(({ note: n, isGrouped, groupDepth, isParent }) => (
              <div
                key={n.id}
                onClick={
                  isParent && !isGrouped ? () => toggleGroup(n.id) : undefined
                }
                style={{ cursor: isParent && !isGrouped ? "pointer" : undefined }}
              >
                <StickyNote
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
                  canDrag={isHost && !isGrouped}
                  onDragStart={() => setDraggedNoteId(n.id)}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={() => {
                    if (draggedNoteId && draggedNoteId !== n.id) {
                      handleGroupNotes(n.id, draggedNoteId);
                      setDraggedNoteId(null);
                    }
                  }}
                  isGrouped={isGrouped}
                  groupDepth={groupDepth}
                  canUngroup={isHost && isGrouped}
                  onUngroup={() => setGroupedUnder(collab.id, n.id, null)}
                  canEdit={
                    !collab.paused && collab.active && n.createdBy === sessionId
                  }
                />
                {isParent && !isGrouped && (
                  <div className={styles.groupIndicator}>
                    {noteGroups.get(n.id)?.length || 0} grouped note
                    {(noteGroups.get(n.id)?.length || 0) !== 1 ? "s" : ""}
                    {expandedGroups.has(n.id) ? " ▲" : " ▼"}
                  </div>
                )}
              </div>
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
