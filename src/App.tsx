import ReactQuill from "react-quill-new";
import "react-quill-new/dist/quill.snow.css";
import { useEffect, useState } from "react";
import styles from "./App.module.css";
import {
  Navigate,
  Route,
  Routes,
  useNavigate,
  useParams,
} from "react-router-dom";
import { getSession, isLoggedIn, login } from "./session";
import {
  addResponse,
  createNote,
  editNote,
  removeNote,
  setReaction,
  setResponseReaction,
  setGroupedUnder,
  subscribeNotes,
  toggleArchive,
  type Note,
  type NoteType,
  type Reaction,
} from "./notes";
import {
  endCollaboration,
  pauseCollaboration,
  resumeCollaboration,
  startCollaboration,
  subscribeCollaboration,
  updatePrompt,
  updateAllowedNoteTypes,
  type Collaboration,
} from "./collaborations";

const NOTE_TYPES: NoteType[] = ["Question", "Statement", "Recommendation", "Requirement", "Action item", "Host note"];

function LoginScreen() {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  // If already logged in, redirect to home
  useEffect(() => {
    if (isLoggedIn()) {
      navigate("/", { replace: true });
    }
  }, [navigate]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!firstName.trim() || !lastName.trim()) return;

    setIsLoading(true);
    try {
      await login(firstName.trim(), lastName.trim());
      navigate("/", { replace: true });
    } catch (error) {
      console.error("Login failed:", error);
      alert("Login failed. Please try again.");
      setIsLoading(false);
    }
  };

  return (
    <div className={styles.loginScreen}>
      <h1 className={styles.loginTitle}>Welcome to Chord</h1>
      <p className={styles.loginSubtitle}>Please enter your name to continue</p>
      <form onSubmit={handleSubmit} className={styles.loginForm}>
        <div className={styles.loginField}>
          <label className={styles.loginLabel}>First name</label>
          <input
            type="text"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            className={styles.loginInput}
            placeholder="Jen"
            disabled={isLoading}
            required
          />
        </div>
        <div className={styles.loginField}>
          <label className={styles.loginLabel}>Last name</label>
          <input
            type="text"
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            className={styles.loginInput}
            placeholder="Gilbert"
            disabled={isLoading}
            required
          />
        </div>
        <div className={styles.loginActions}>
          <button
            type="submit"
            className={styles.loginSubmit}
            disabled={isLoading}
          >
            {isLoading ? "Signing in..." : "Continue"}
          </button>
        </div>
      </form>
    </div>
  );
}

function NoteTypePanel({
  label,
  isOpen,
  onToggle,
  onSubmit,
}: {
  label: NoteType;
  isOpen: boolean;
  onToggle: () => void;
  onSubmit: (html: string, assignee?: string, dueDate?: string) => Promise<void>;
}) {
  const [value, setValue] = useState("");
  const [assignee, setAssignee] = useState("");
  const [dueDate, setDueDate] = useState("");

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const isEmpty = value === "" || value === "<p><br></p>";
    if (isEmpty) return;
    await onSubmit(value, assignee || undefined, dueDate || undefined);
    setValue("");
    setAssignee("");
    setDueDate("");
  };

  const isActionItem = label === "Action item";

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
          {isActionItem && (
            <div className={styles.actionItemFields}>
              <div className={styles.actionItemField}>
                <label htmlFor={`assignee-${label}`}>Assignee:</label>
                <input
                  type="text"
                  id={`assignee-${label}`}
                  value={assignee}
                  onChange={(e) => setAssignee(e.target.value)}
                  placeholder="Enter assignee name"
                />
              </div>
              <div className={styles.actionItemField}>
                <label htmlFor={`dueDate-${label}`}>Due date:</label>
                <input
                  type="date"
                  id={`dueDate-${label}`}
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                />
              </div>
            </div>
          )}
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

function ResponseItem({
  response,
  timestamp,
  paused,
  canReact,
  myReaction,
  counts,
  getReactionOpacity,
  handleReaction,
}: {
  response: { content: string; createdBy: string; createdByName: string };
  timestamp: string;
  paused: boolean;
  canReact: boolean;
  myReaction: Reaction | null;
  counts: { agree: number; disagree: number };
  getReactionOpacity: (r: Reaction) => number;
  handleReaction: (r: Reaction) => void;
}) {
  const [hovered, setHovered] = useState(false);

  return (
    <div
      className={styles.responseItem}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div className={styles.responseDivider} />
      <div className={styles.responseHeader}>
        <span className={styles.responseAuthor}>
          {paused && response.createdByName}
        </span>
        <span className={styles.responseTimestamp}>{timestamp}</span>
      </div>
      <div
        dangerouslySetInnerHTML={{ __html: response.content }}
        className={styles.responseContent}
      />
      {(canReact || paused) && (
        <div className={styles.responseReactions}>
          <button
            onClick={canReact ? () => handleReaction("agree") : undefined}
            className={styles.responseReactionButton}
            data-active={myReaction === "agree"}
            data-paused={paused}
            style={{ opacity: paused ? getReactionOpacity("agree") : (hovered || myReaction === "agree" ? 1 : 0) }}
          >
            👍 {counts.agree > 0 && <span>{counts.agree}</span>}
          </button>
          <button
            onClick={canReact ? () => handleReaction("disagree") : undefined}
            className={styles.responseReactionButton}
            data-active={myReaction === "disagree"}
            data-paused={paused}
            style={{ opacity: paused ? getReactionOpacity("disagree") : (hovered || myReaction === "disagree" ? 1 : 0) }}
          >
            👎 {counts.disagree > 0 && <span>{counts.disagree}</span>}
          </button>
        </div>
      )}
    </div>
  );
}

function StickyNote({
  note,
  collaborationId,
  sessionId,
  displayName,
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
  canArchive,
  onRespondingChange,
}: {
  note: Note;
  collaborationId: string;
  sessionId: string;
  displayName: string;
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
  canArchive?: boolean;
  onRespondingChange?: (isResponding: boolean) => void;
}) {
  const [hovered, setHovered] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState("");
  const [showHistory, setShowHistory] = useState(false);
  const [showResponses, setShowResponses] = useState(false);
  const [isResponding, setIsResponding] = useState(false);
  const [responseContent, setResponseContent] = useState("");
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

  const handleAddResponse = async () => {
    const isEmpty = responseContent === "" || responseContent === "<p><br></p>";
    if (isEmpty) return;

    try {
      await addResponse(
        collaborationId,
        note.id,
        responseContent,
        sessionId,
        displayName,
        note.responses,
      );
      setResponseContent("");
      setIsResponding(false);
      onRespondingChange?.(false);
    } catch (error) {
      console.error("Failed to add response:", error);
      alert("Failed to add response. Check console for details.");
    }
  };

  const handleCancelResponse = () => {
    setIsResponding(false);
    setResponseContent("");
    onRespondingChange?.(false);
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
      {((!paused && !isResponding && (note.createdBy !== sessionId || (note.responses && note.responses.length > 0))) ||
        ((canReact || paused) && note.createdBy !== sessionId) ||
        canArchive) && (
        <div className={styles.stickyNoteActions}>
          {canArchive && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                toggleArchive(collaborationId, note.id, !!note.archived);
              }}
              className={styles.actionButton}
              data-active={false}
              style={{ opacity: hovered ? 1 : 0 }}
              aria-label={note.archived ? "Unarchive" : "Archive"}
              title={note.archived ? "Unarchive" : "Archive"}
            >
              {note.archived ? "📂" : "🗄️"}
            </button>
          )}
          {!paused && !isResponding && (note.createdBy !== sessionId || (note.responses && note.responses.length > 0)) && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setIsResponding(true);
                onRespondingChange?.(true);
              }}
              className={styles.actionButton}
              data-active={false}
              style={{ opacity: hovered ? 1 : 0 }}
              aria-label="Add response"
            >
              💬 {note.responses && note.responses.length > 0 && <span>{note.responses.length}</span>}
            </button>
          )}
          {(canReact || paused) && note.createdBy !== sessionId && (
            <>
              <button
                onClick={canReact ? () => handleReaction("agree") : undefined}
                className={styles.actionButton}
                data-active={myReaction === "agree"}
                data-paused={paused}
                style={{ opacity: getReactionOpacity("agree") }}
              >
                👍 {counts.agree > 0 && <span>{counts.agree}</span>}
              </button>
              <button
                onClick={canReact ? () => handleReaction("disagree") : undefined}
                className={styles.actionButton}
                data-active={myReaction === "disagree"}
                data-paused={paused}
                style={{ opacity: getReactionOpacity("disagree") }}
              >
                👎 {counts.disagree > 0 && <span>{counts.disagree}</span>}
              </button>
            </>
          )}
        </div>
      )}
      <div className={styles.stickyNoteBadges}>
        {note.createdBy === sessionId && (
          <span className={styles.badgeYou}>You</span>
        )}
        <span className={styles.badgeType}>{note.type}</span>
        {paused && <span className={styles.badgeName}>{note.createdByName}</span>}
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
      {note.type === "Action item" && (note.assignee || note.dueDate) && (
        <div className={styles.actionItemMeta}>
          {note.assignee && (
            <div className={styles.actionItemMetaItem}>
              <strong>Assignee:</strong> {note.assignee}
            </div>
          )}
          {note.dueDate && (
            <div className={styles.actionItemMetaItem}>
              <strong>Due:</strong> {new Date(note.dueDate).toLocaleDateString()}
            </div>
          )}
        </div>
      )}
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
          {/* Responses section */}
          <div className={styles.responsesContainer}>
            {note.responses && note.responses.length > 0 && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowResponses(!showResponses);
                }}
                className={styles.responsesToggle}
              >
                {showResponses ? "Hide" : "Show"} {note.responses.length} response
                {note.responses.length !== 1 ? "s" : ""}
              </button>
            )}
            {showResponses && note.responses && (
              <div className={styles.responsesList}>
                {note.responses.map((response, idx) => {
                  const timestamp = response.createdAt
                    ? new Date(response.createdAt as number).toLocaleString()
                    : "Unknown date";

                  const myResponseReaction: Reaction | null = response.reactions?.[sessionId] ?? null;
                  const responseCounts = { agree: 0, disagree: 0 };
                  if (paused) {
                    for (const r of Object.values(response.reactions ?? {})) responseCounts[r]++;
                  } else if (myResponseReaction) {
                    responseCounts[myResponseReaction] = 1;
                  }

                  const getResponseReactionOpacity = (r: Reaction) => {
                    if (paused) return responseCounts[r] > 0 ? 1 : 0.25;
                    return 1;
                  };

                  const handleResponseReaction = (r: Reaction) => {
                    if (!paused && response.createdBy !== sessionId) {
                      setResponseReaction(
                        collaborationId,
                        note.id,
                        idx,
                        sessionId,
                        myResponseReaction === r ? null : r,
                        note.responses || [],
                      );
                    }
                  };

                  const canReact = !paused && response.createdBy !== sessionId;

                  return (
                    <ResponseItem
                      key={idx}
                      response={response}
                      timestamp={timestamp}
                      paused={paused}
                      canReact={canReact}
                      myReaction={myResponseReaction}
                      counts={responseCounts}
                      getReactionOpacity={getResponseReactionOpacity}
                      handleReaction={handleResponseReaction}
                    />
                  );
                })}
              </div>
            )}
            {isResponding && (
              <div className={styles.responseForm}>
                <ReactQuill
                  theme="snow"
                  value={responseContent}
                  onChange={setResponseContent}
                  className={styles.responseEditor}
                />
                <div className={styles.responseActions}>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleCancelResponse();
                    }}
                    className={styles.responseCancel}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleAddResponse();
                    }}
                    className={styles.responseSave}
                  >
                    Send
                  </button>
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

function StartScreen() {
  const navigate = useNavigate();
  const session = getSession();

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!session) {
      navigate("/login", { replace: true });
    }
  }, [session, navigate]);

  const [prompt, setPrompt] = useState("");
  const [allowedNoteTypes, setAllowedNoteTypes] = useState<NoteType[]>(["Question", "Statement", "Recommendation"]);

  if (!session) return null;

  const handleStart = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    // Check if prompt is empty by stripping HTML and checking text content
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = prompt;
    const textContent = (tempDiv.textContent || tempDiv.innerText || '').trim();
    if (!textContent) {
      alert("Please enter a collaboration prompt");
      return;
    }
    if (allowedNoteTypes.length === 0) {
      alert("Please select at least one note type");
      return;
    }
    const id = crypto.randomUUID();
    // Always include "Host note" in allowed types
    const noteTypesWithHostNote = [...allowedNoteTypes, "Host note" as NoteType];
    await startCollaboration(id, session.userId, session.displayName, prompt, noteTypesWithHostNote);
    navigate(`/collabs/${id}`, { replace: true });
  };

  const toggleNoteType = (type: NoteType) => {
    setAllowedNoteTypes(prev =>
      prev.includes(type)
        ? prev.filter(t => t !== type)
        : [...prev, type]
    );
  };

  return (
    <div className={styles.startScreen}>
      <h1 className={styles.startScreenTitle}>Chord</h1>
      <p className={styles.startScreenUser}>
        You are: <b>{session.displayName}</b>
      </p>
      <form onSubmit={handleStart} className={styles.startScreenForm}>
        <label className={styles.startScreenLabel}>
          Collaboration prompt <span style={{ color: 'red' }}>*</span>
        </label>
        <ReactQuill
          theme="snow"
          value={prompt}
          onChange={setPrompt}
          className={styles.startScreenEditor}
        />
        <div className={styles.noteTypesSelection}>
          <label className={styles.noteTypesLabel}>Allowed note types</label>
          <div className={styles.noteTypesCheckboxes}>
            {NOTE_TYPES.filter(type => type !== "Host note").map(type => (
              <label key={type} className={styles.noteTypeCheckbox}>
                <input
                  type="checkbox"
                  checked={allowedNoteTypes.includes(type)}
                  onChange={() => toggleNoteType(type)}
                />
                <span>{type}</span>
              </label>
            ))}
          </div>
        </div>
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
  const navigate = useNavigate();
  const session = getSession();

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!session) {
      navigate("/login", { replace: true });
    }
  }, [session, navigate]);

  const [collab, setCollab] = useState<Collaboration | null | undefined>(
    undefined,
  );
  const [notes, setNotes] = useState<Note[]>([]);
  const [openType, setOpenType] = useState<NoteType | null>(null);
  const [filter, setFilter] = useState<NoteType | "All" | "Inbox" | "Mine" | "Archived">(
    "All",
  );
  const [reactionFilter, setReactionFilter] = useState<
    "All" | "Agreed" | "Disagreed" | "Not reacted"
  >("All");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [draggedNoteId, setDraggedNoteId] = useState<string | null>(null);
  const [editingPrompt, setEditingPrompt] = useState(false);
  const [promptValue, setPromptValue] = useState("");
  const [showNoteTypeSettings, setShowNoteTypeSettings] = useState(false);
  const [respondingToNoteId, setRespondingToNoteId] = useState<string | null>(null);

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
  if (!session) return null;
  if (collab === undefined) return null;
  if (collab === null) {
    return (
      <div className={styles.notFound}>
        <p>Collaboration not found.</p>
        <button onClick={() => navigate("/")} className={styles.homeButton}>
          Go to Home
        </button>
      </div>
    );
  }

  const isHost = collab.startedBy === session.userId;

  // Get allowed note types for this collaboration
  const allowedNoteTypes = collab.allowedNoteTypes || NOTE_TYPES;
  const disabledNoteTypes = NOTE_TYPES.filter(t => !allowedNoteTypes.includes(t));

  const enableNoteType = async (type: NoteType) => {
    const newAllowedTypes = [...allowedNoteTypes, type];
    await updateAllowedNoteTypes(collab.id, newAllowedTypes);
  };

  // If collaboration is stopped, show summary screen
  if (!collab.active) {
    // Generate Markdown summary
    const generateHTML = () => {
      let html = `<h1>Collaboration Summary</h1>`;
      html += `<p><strong>Host:</strong> ${collab.startedByName}</p>`;
      html += `<hr>`;
      html += `<h2>Prompt</h2>`;
      html += `<div>${collab.prompt}</div>`;
      html += `<hr>`;

      // Helper function to render a note in HTML
      const renderNoteHTML = (note: Note, idx: number) => {
        const authorName = note.createdBy === collab.startedBy && note.type !== "Host note" ? `${note.createdByName} (host)` : note.createdByName;
        let timestamp = "Unknown time";
        if (note.createdAt) {
          // Handle Firestore Timestamp objects
          const createdAt = note.createdAt as unknown as {
            toDate?: () => Date;
            seconds?: number;
          };
          if (createdAt.toDate) {
            timestamp = createdAt.toDate().toLocaleString();
          } else if (createdAt.seconds) {
            timestamp = new Date(createdAt.seconds * 1000).toLocaleString();
          } else {
            timestamp = new Date(note.createdAt as number).toLocaleString();
          }
        }
        html += `<h3>${idx + 1}. ${note.type} by ${authorName}</h3>`;
        html += `<p><em>${timestamp}</em></p>`;

        // Action item metadata
        if (note.type === "Action item" && (note.assignee || note.dueDate)) {
          html += `<p>`;
          if (note.assignee) html += `<strong>Assignee:</strong> ${note.assignee}<br>`;
          if (note.dueDate) {
            const dueDate = new Date(note.dueDate).toLocaleDateString();
            html += `<strong>Due date:</strong> ${dueDate}<br>`;
          }
          html += `</p>`;
        }

        html += `<div>${note.content}</div>`;

        // Reactions
        if (note.reactions && Object.keys(note.reactions).length > 0) {
          const reactionCounts = { agree: 0, disagree: 0 };
          Object.values(note.reactions).forEach(r => reactionCounts[r]++);
          html += `<p><strong>Reactions:</strong> `;
          if (reactionCounts.agree > 0) html += `👍 ${reactionCounts.agree} `;
          if (reactionCounts.disagree > 0) html += `👎 ${reactionCounts.disagree}`;
          html += `</p>`;
        }

        // Responses
        if (note.responses && note.responses.length > 0) {
          html += `<p><strong>Responses (${note.responses.length}):</strong></p><ul>`;
          note.responses.forEach(response => {
            const timestamp = response.createdAt
              ? new Date(response.createdAt as number).toLocaleString()
              : "Unknown time";
            const responseAuthorName = response.createdBy === collab.startedBy ? `${response.createdByName} (host)` : response.createdByName;
            html += `<li><strong>${responseAuthorName}</strong> (${timestamp}): <div style="display:inline">${response.content}</div></li>`;
          });
          html += `</ul>`;
        }

        // Edit history
        if (note.editHistory && note.editHistory.length > 0) {
          html += `<p><strong>Edit History (${note.editHistory.length} version${note.editHistory.length !== 1 ? 's' : ''}):</strong></p><ol>`;
          note.editHistory.forEach((version) => {
            const timestamp = version.editedAt
              ? new Date(version.editedAt as number).toLocaleString()
              : "Unknown time";
            html += `<li>${timestamp}: <div style="display:inline">${version.content}</div></li>`;
          });
          html += `</ol>`;
        }

        html += `<hr>`;
      };

      // Render each note type in its own section
      const noteTypeOrder: NoteType[] = ["Action item", "Requirement", "Recommendation", "Statement", "Question"];

      noteTypeOrder.forEach(noteType => {
        const notesOfType = notes.filter(n => n.type === noteType);
        if (notesOfType.length > 0) {
          const sectionName = noteType === "Action item" ? "Action Items" : noteType + "s";
          html += `<h2>${sectionName} (${notesOfType.length})</h2>`;
          notesOfType.forEach((note, idx) => renderNoteHTML(note, idx));
        }
      });

      // Then render all notes in chronological order
      if (notes.length > 0) {
        html += `<h2>Collaboration Timeline (${notes.length})</h2>`;
        notes.forEach((note, idx) => renderNoteHTML(note, idx));
      }

      return html;
    };

    const generateMarkdown = () => {
      let md = `# Collaboration Summary\n\n`;
      md += `**Host:** ${collab.startedByName}\n\n`;
      md += `---\n\n`;

      // Strip HTML tags from prompt for markdown
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = collab.prompt;
      const promptText = tempDiv.textContent || tempDiv.innerText || '';

      md += `## Prompt\n\n`;
      md += `${promptText}\n\n`;
      md += `---\n\n`;

      // Helper function to render a note
      const renderNote = (note: Note, idx: number) => {
        // Strip HTML from note content
        tempDiv.innerHTML = note.content;
        const noteText = tempDiv.textContent || tempDiv.innerText || '';

        const authorName = note.createdBy === collab.startedBy && note.type !== "Host note" ? `${note.createdByName} (host)` : note.createdByName;
        let timestamp = "Unknown time";
        if (note.createdAt) {
          // Handle Firestore Timestamp objects
          const createdAt = note.createdAt as unknown as {
            toDate?: () => Date;
            seconds?: number;
          };
          if (createdAt.toDate) {
            timestamp = createdAt.toDate().toLocaleString();
          } else if (createdAt.seconds) {
            timestamp = new Date(createdAt.seconds * 1000).toLocaleString();
          } else {
            timestamp = new Date(note.createdAt as number).toLocaleString();
          }
        }
        md += `### ${idx + 1}. ${note.type} by ${authorName}\n\n`;
        md += `*${timestamp}*\n\n`;

        // Action item metadata
        if (note.type === "Action item" && (note.assignee || note.dueDate)) {
          if (note.assignee) md += `**Assignee:** ${note.assignee}  \n`;
          if (note.dueDate) {
            const dueDate = new Date(note.dueDate).toLocaleDateString();
            md += `**Due date:** ${dueDate}  \n`;
          }
          md += `\n`;
        }

        md += `${noteText}\n\n`;

        // Reactions
        if (note.reactions && Object.keys(note.reactions).length > 0) {
          const reactionCounts = { agree: 0, disagree: 0 };
          Object.values(note.reactions).forEach(r => reactionCounts[r]++);
          md += `**Reactions:** `;
          if (reactionCounts.agree > 0) md += `👍 ${reactionCounts.agree} `;
          if (reactionCounts.disagree > 0) md += `👎 ${reactionCounts.disagree}`;
          md += `\n\n`;
        }

        // Responses
        if (note.responses && note.responses.length > 0) {
          md += `**Responses (${note.responses.length}):**\n\n`;
          note.responses.forEach(response => {
            tempDiv.innerHTML = response.content;
            const responseText = tempDiv.textContent || tempDiv.innerText || '';
            const timestamp = response.createdAt
              ? new Date(response.createdAt as number).toLocaleString()
              : "Unknown time";
            const responseAuthorName = response.createdBy === collab.startedBy ? `${response.createdByName} (host)` : response.createdByName;
            md += `- **${responseAuthorName}** (${timestamp}): ${responseText}\n`;
          });
          md += `\n`;
        }

        // Edit history
        if (note.editHistory && note.editHistory.length > 0) {
          md += `**Edit History (${note.editHistory.length} version${note.editHistory.length !== 1 ? 's' : ''}):**\n\n`;
          note.editHistory.forEach((version, vIdx) => {
            tempDiv.innerHTML = version.content;
            const versionText = tempDiv.textContent || tempDiv.innerText || '';
            const timestamp = version.editedAt
              ? new Date(version.editedAt as number).toLocaleString()
              : "Unknown time";
            md += `${vIdx + 1}. ${timestamp}: ${versionText}\n`;
          });
          md += `\n`;
        }

        md += `---\n\n`;
      };

      // Render each note type in its own section
      // Order: Action items, Requirements, Recommendations, Statements, Questions
      const noteTypeOrder: NoteType[] = ["Action item", "Requirement", "Recommendation", "Statement", "Question"];

      noteTypeOrder.forEach(noteType => {
        const notesOfType = notes.filter(n => n.type === noteType);
        if (notesOfType.length > 0) {
          // Pluralize the section name
          const sectionName = noteType === "Action item" ? "Action Items" : noteType + "s";
          md += `## ${sectionName} (${notesOfType.length})\n\n`;
          notesOfType.forEach((note, idx) => renderNote(note, idx));
        }
      });

      // Then render all notes in chronological order
      if (notes.length > 0) {
        md += `## Collaboration Timeline (${notes.length})\n\n`;
        notes.forEach((note, idx) => renderNote(note, idx));
      }

      return md;
    };

    return (
      <div className={styles.stoppedScreen}>
        <div className={styles.stoppedHeader}>
          <h1 className={styles.stoppedTitle}>Collaboration Stopped</h1>
          <p className={styles.stoppedMessage}>
            This collaboration was stopped by <b>{collab.startedByName}</b>.
          </p>
          {isHost && (
            <button
              onClick={() => resumeCollaboration(collab.id)}
              className={styles.resumeButton}
            >
              Resume collaboration
            </button>
          )}
        </div>
        <div className={styles.stoppedSummary}>
          <div className={styles.summaryHeader}>
            <h2 className={styles.summaryTitle}>Summary</h2>
            <div className={styles.copyButtons}>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(generateMarkdown());
                  alert('Copied Markdown to clipboard!');
                }}
                className={styles.copyButton}
              >
                Copy Markdown
              </button>
              <button
                onClick={async () => {
                  const html = generateHTML();
                  const blob = new Blob([html], { type: 'text/html' });
                  const clipboardItem = new ClipboardItem({ 'text/html': blob });
                  await navigator.clipboard.write([clipboardItem]);
                  alert('Copied for Google Docs! Paste into Google Docs to preserve formatting.');
                }}
                className={styles.copyButton}
              >
                Copy for Google Docs
              </button>
            </div>
          </div>
          <pre className={styles.summaryContent}>{generateMarkdown()}</pre>
        </div>
      </div>
    );
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

  // Calculate inbox count (exclude archived)
  const inboxCount = notes.filter(
    (n) =>
      n.createdBy !== session.userId &&
      !n.reactions?.[session.userId] &&
      !allChildIds.has(n.id) &&
      !n.archived,
  ).length;

  // Calculate archived count
  const archivedCount = notes.filter((n) => n.archived).length;

  let visibleNotes =
    filter === "Archived"
      ? notes.filter((n) => n.archived)
      : filter === "All"
        ? notes.filter((n) => !n.archived)
        : filter === "Inbox"
          ? notes.filter(
              (n) =>
                n.createdBy !== session.userId &&
                !n.reactions?.[session.userId] &&
                (!allChildIds.has(n.id) || n.id === respondingToNoteId) &&
                !n.archived,
            )
          : filter === "Mine"
            ? notes.filter((n) => n.createdBy === session.userId && !n.archived)
            : notes.filter((n) => n.type === filter && !n.archived);

  // Apply reaction filter
  if (reactionFilter !== "All") {
    visibleNotes = visibleNotes.filter((n) => {
      const myReaction = n.reactions?.[session.userId] ?? null;
      if (reactionFilter === "Agreed") return myReaction === "agree";
      if (reactionFilter === "Disagreed") return myReaction === "disagree";
      if (reactionFilter === "Not reacted")
        return n.createdBy !== session.userId && !myReaction;
      return true;
    });
  }

  // Apply sort order (notes are fetched in ascending order by default)
  // Inbox always shows oldest first for stable queue processing
  const effectiveSortOrder = filter === "Inbox" ? "asc" : sortOrder;
  if (effectiveSortOrder === "desc") {
    visibleNotes = [...visibleNotes].reverse();
  }

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
    // Skip if this note is a child of another note, unless user is responding to it
    if (allChildIds.has(note.id) && note.id !== respondingToNoteId) continue;

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
            You are: <b>{session.displayName}</b>
          </span>
        </div>
        <div className={styles.collabHeaderActions}>
          {!collab.active && <span className={styles.badgeStopped}>Stopped</span>}
          {collab.paused && collab.active && (
            <span className={styles.badgePaused}>Input paused</span>
          )}
          {collab.startedBy === session.userId && collab.active && (
            <>
              {disabledNoteTypes.length > 0 && (
                <div className={styles.noteTypeSettingsContainer}>
                  <button
                    onClick={() => setShowNoteTypeSettings(!showNoteTypeSettings)}
                    className={styles.buttonNoteTypes}
                  >
                    Note types {showNoteTypeSettings ? "▲" : "▼"}
                  </button>
                  {showNoteTypeSettings && (
                    <div className={styles.noteTypeSettingsDropdown}>
                      <div className={styles.noteTypeSettingsHeader}>
                        Enable additional note types:
                      </div>
                      {disabledNoteTypes.map(type => (
                        <button
                          key={type}
                          onClick={() => {
                            enableNoteType(type);
                            if (disabledNoteTypes.length === 1) {
                              setShowNoteTypeSettings(false);
                            }
                          }}
                          className={styles.noteTypeSettingsOption}
                        >
                          + {type}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
              <button
                onClick={async () => {
                  const willPause = !collab.paused;
                  await pauseCollaboration(collab.id, willPause);
                  const message = willPause
                    ? "<p>Participant input was paused here.</p>"
                    : "<p>Participant input was resumed here.</p>";
                  await createNote(collab.id, "Host note", message, session.userId, session.displayName);
                }}
                className={styles.buttonPause}
                data-paused={collab.paused}
              >
                {collab.paused ? "Resume input" : "Pause input"}
              </button>
              <button
                onClick={() => endCollaboration(collab.id)}
                className={styles.buttonEnd}
              >
                Stop collaboration
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
              {collab.startedBy === session.userId && !editingPrompt && (
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
            <div className={styles.messageStopped}>
              This collaboration has been stopped.
            </div>
          ) : collab.paused && !isHost ? (
            <div className={styles.messagePaused}>
              Input is paused. New notes cannot be added.
            </div>
          ) : (
            allowedNoteTypes
              .filter((type) => type !== "Host note" || isHost)
              .map((type) => (
                <NoteTypePanel
                  key={type}
                  label={type}
                  isOpen={openType === type}
                  onToggle={() => setOpenType(openType === type ? null : type)}
                  onSubmit={(html, assignee, dueDate) =>
                    createNote(collab.id, type, html, session.userId, session.displayName, assignee, dueDate)
                  }
                />
              ))
          )}
        </aside>

        <main className={styles.collabMain}>
          <div className={styles.filterBar}>
            {(["All", "Inbox", "Mine", "Archived"] as const).map((t) => (
              <button
                key={t}
                onClick={() => setFilter(t)}
                className={styles.filterButton}
                data-active={filter === t}
              >
                {t === "Inbox" ? `Inbox (${inboxCount})` : t === "Archived" ? `Archived (${archivedCount})` : t}
              </button>
            ))}
            <select
              value={allowedNoteTypes.includes(filter as NoteType) ? filter : "All"}
              onChange={(e) => setFilter(e.target.value as typeof filter)}
              className={styles.filterDropdown}
              data-active={allowedNoteTypes.includes(filter as NoteType)}
            >
              <option value="All">All note types</option>
              {allowedNoteTypes.map((t) => (
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
            <select
              value={filter === "Inbox" ? "asc" : sortOrder}
              onChange={(e) => setSortOrder(e.target.value as "asc" | "desc")}
              className={styles.filterDropdown}
              data-active={sortOrder === "asc"}
              disabled={filter === "Inbox"}
              title={filter === "Inbox" ? "Inbox is always sorted oldest first" : undefined}
            >
              <option value="desc">Newest first</option>
              <option value="asc">Oldest first</option>
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
                  sessionId={session.userId}
                  displayName={session.displayName}
                  canDelete={
                    !collab.paused &&
                    collab.active &&
                    n.createdBy === session.userId &&
                    (!n.responses || n.responses.length === 0)
                  }
                  canReact={
                    !collab.paused && collab.active && n.createdBy !== session.userId
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
                    !collab.paused && collab.active && n.createdBy === session.userId
                  }
                  canArchive={isHost && collab.active && !!collab.paused}
                  onRespondingChange={(isResponding) =>
                    setRespondingToNoteId(isResponding ? n.id : null)
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
      <Route path="/login" element={<LoginScreen />} />
      <Route path="/" element={<StartScreen />} />
      <Route path="/collabs/:id" element={<CollabRoute />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
