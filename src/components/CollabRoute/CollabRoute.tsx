import ReactQuill from "react-quill-new";
import "react-quill-new/dist/quill.snow.css";
import { useEffect, useRef, useState } from "react";
import { Navigate, useNavigate, useParams } from "react-router-dom";
import { getSession } from "../../session";
import {
  createNote,
  removeNote,
  setGroupedUnder,
  subscribeNotes,
  type Note,
  type NoteType,
} from "../../notes";
import {
  endCollaboration,
  pauseCollaboration,
  resumeCollaboration,
  subscribeCollaboration,
  updatePrompt,
  updateAllowedNoteTypes,
  updateShowAuthorNames,
  type Collaboration,
  type PromptVersion,
} from "../../collaborations";
import { NOTE_TYPES, QUILL_MODULES } from "../../constants";
import NoteTypePanel from "../NoteTypePanel/NoteTypePanel";
import StickyNote from "../StickyNote/StickyNote";
import styles from "./CollabRoute.module.css";

export default function CollabRoute() {
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
  const [filter, setFilter] = useState<"All" | "Inbox" | "Mine" | "Archived">(
    "Mine",
  );
  const [selectedNoteTypes, setSelectedNoteTypes] = useState<Set<NoteType>>(
    new Set(NOTE_TYPES),
  );
  const [showNoteTypeFilter, setShowNoteTypeFilter] = useState(false);
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [draggedNoteId, setDraggedNoteId] = useState<string | null>(null);
  const [editingPrompt, setEditingPrompt] = useState(false);
  const [promptValue, setPromptValue] = useState("");
  const [showNoteTypeSettings, setShowNoteTypeSettings] = useState(false);
  const [respondingToNoteId, setRespondingToNoteId] = useState<string | null>(
    null,
  );
  const [summaryFormat, setSummaryFormat] = useState<"html" | "markdown">(
    "html",
  );
  const noteTypeSettingsRef = useRef<HTMLDivElement>(null);
  const noteTypeFilterRef = useRef<HTMLDivElement>(null);

  // Close note type settings dropdown when clicking outside
  useEffect(() => {
    if (!showNoteTypeSettings) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (
        noteTypeSettingsRef.current &&
        !noteTypeSettingsRef.current.contains(event.target as Node)
      ) {
        setShowNoteTypeSettings(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showNoteTypeSettings]);

  // Close note type filter dropdown when clicking outside
  useEffect(() => {
    if (!showNoteTypeFilter) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (
        noteTypeFilterRef.current &&
        !noteTypeFilterRef.current.contains(event.target as Node)
      ) {
        setShowNoteTypeFilter(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showNoteTypeFilter]);

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

  // Auto-check new note types when they first appear
  useEffect(() => {
    if (notes.length === 0) return;

    const existingTypes = new Set(notes.map((note) => note.type));

    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSelectedNoteTypes((prevSelected) => {
      const newTypes = Array.from(existingTypes).filter(
        (type) => !prevSelected.has(type),
      );

      if (newTypes.length > 0) {
        const newSet = new Set(prevSelected);
        newTypes.forEach((type) => newSet.add(type));
        return newSet;
      }

      return prevSelected;
    });
  }, [notes]);

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

  // Get allowed note types for this collaboration, sorted by NOTE_TYPES order
  const allowedNoteTypes = (collab.allowedNoteTypes || NOTE_TYPES).sort(
    (a, b) => {
      const indexA = NOTE_TYPES.indexOf(a);
      const indexB = NOTE_TYPES.indexOf(b);
      return indexA - indexB;
    },
  );

  // Get note types that actually exist in the notes
  const existingNoteTypes = allowedNoteTypes.filter((type) =>
    notes.some((note) => note.type === type),
  );

  const toggleNoteTypeInCollab = async (type: NoteType, enable: boolean) => {
    const newAllowedTypes = enable
      ? [...allowedNoteTypes, type]
      : allowedNoteTypes.filter((t) => t !== type);

    await updateAllowedNoteTypes(collab.id, newAllowedTypes);

    // Create a host note documenting the change
    const message = enable
      ? `<p>The note type "${type}" was enabled.</p>`
      : `<p>The note type "${type}" was disabled.</p>`;
    await createNote(
      collab.id,
      "Host note",
      message,
      session.userId,
      session.displayName,
    );
  };

  // If collaboration is stopped, show summary screen
  if (!collab.active) {
    // Generate Markdown summary
    const generateHTML = () => {
      let html = "";

      // Helper to get timestamp from Firestore or number
      const getTimestamp = (time: unknown): number => {
        if (!time) return 0;
        const ts = time as unknown as {
          toDate?: () => Date;
          seconds?: number;
        };
        if (ts.toDate) return ts.toDate().getTime();
        if (ts.seconds) return ts.seconds * 1000;
        if (typeof time === "number") return time;
        return 0;
      };

      // Build prompts array with timestamps for getPromptForNote helper
      const allPrompts: (PromptVersion & { timestampMs: number })[] = [
        ...(collab.promptHistory || []).map((p) => ({
          ...p,
          timestampMs: getTimestamp(p.timestamp),
        })),
        {
          prompt: collab.prompt,
          timestamp: collab.promptUpdatedAt || collab.startedAt || Date.now(),
          timestampMs: getTimestamp(
            collab.promptUpdatedAt || collab.startedAt || Date.now(),
          ),
        },
      ].sort((a, b) => a.timestampMs - b.timestampMs);

      // Helper function to render a note in HTML
      const renderNoteHTML = (note: Note, idx: number) => {
        const authorName =
          note.createdBy === collab.startedBy && note.type !== "Host note"
            ? `${note.createdByName} (host)`
            : note.createdByName;
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
          if (note.assignee)
            html += `<strong>Assignee:</strong> ${note.assignee}<br>`;
          if (note.dueDate) {
            const dueDate = new Date(note.dueDate).toLocaleDateString();
            html += `<strong>Due date:</strong> ${dueDate}<br>`;
          }
          html += `</p>`;
        }

        html += `<div>${note.content}</div>`;

        // Reactions
        if (note.reactions && Object.keys(note.reactions).length > 0) {
          const agreedNames: string[] = [];
          const disagreedNames: string[] = [];
          const markReadNames: string[] = [];

          Object.entries(note.reactions).forEach(([sessionId, reaction]) => {
            // Find the name for this sessionId
            let name = sessionId;
            const noteByUser = notes.find((n) => n.createdBy === sessionId);
            if (noteByUser) {
              name =
                noteByUser.createdBy === collab.startedBy
                  ? `${noteByUser.createdByName} (host)`
                  : noteByUser.createdByName;
            }

            if (reaction === "agree") {
              agreedNames.push(name);
            } else if (reaction === "disagree") {
              disagreedNames.push(name);
            } else if (reaction === "markRead") {
              markReadNames.push(name);
            }
          });

          html += `<h4>Reactions</h4>`;
          html += `<p>`;
          if (agreedNames.length > 0)
            html += `Agreed (${agreedNames.length}): ${agreedNames.join(", ")} `;
          if (disagreedNames.length > 0)
            html += `Disagreed (${disagreedNames.length}): ${disagreedNames.join(", ")} `;
          if (markReadNames.length > 0)
            html += `Marked as read (${markReadNames.length}): ${markReadNames.join(", ")}`;
          html += `</p>`;
        }

        // Responses
        if (note.responses && note.responses.length > 0) {
          html += `<h4>Responses (${note.responses.length})</h4>`;
          html += `<ul>`;
          note.responses.forEach((response) => {
            const timestamp = response.createdAt
              ? new Date(response.createdAt as number).toLocaleString()
              : "Unknown time";
            const responseAuthorName =
              response.createdBy === collab.startedBy
                ? `${response.createdByName} (host)`
                : response.createdByName;
            html += `<li><strong>${responseAuthorName}</strong> (${timestamp}): <div style="display:inline">${response.content}</div></li>`;
          });
          html += `</ul>`;
        }

        // Edit history
        if (note.editHistory && note.editHistory.length > 0) {
          html += `<p><strong>Edit History (${note.editHistory.length} version${note.editHistory.length !== 1 ? "s" : ""}):</strong></p><ol>`;
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

      // Key takeaways section - as tables
      const getPromptForNote = (note: Note): string => {
        const noteTime = getTimestamp(note.createdAt);
        for (let i = 0; i < allPrompts.length; i++) {
          const startTime = allPrompts[i].timestampMs;
          const endTime =
            i < allPrompts.length - 1
              ? allPrompts[i + 1].timestampMs
              : Infinity;
          if (noteTime >= startTime && noteTime < endTime) {
            const tempDiv = document.createElement("div");
            tempDiv.innerHTML = allPrompts[i].prompt;
            return tempDiv.textContent || tempDiv.innerText || "";
          }
        }
        return "";
      };

      const actionItems = notes.filter((n) => n.type === "Action item");
      const requirements = notes.filter((n) => n.type === "Requirement");
      const constructiveFeedback = notes.filter(
        (n) => n.type === "Constructive feedback",
      );

      if (
        actionItems.length > 0 ||
        requirements.length > 0 ||
        constructiveFeedback.length > 0
      ) {
        html += `<h2>Key Takeaways</h2>`;

        // Action Items table
        if (actionItems.length > 0) {
          html += `<h3>Action Items</h3>`;
          html += `<table border="1" style="width:100%; border-collapse:collapse; margin-bottom:20px;">`;
          html += `<thead><tr><th style="padding: 8px 12px;">Prompt</th><th style="padding: 8px 12px;">Note</th><th style="padding: 8px 12px;">Author</th><th style="padding: 8px 12px;">Assignee</th><th style="padding: 8px 12px;">Due Date</th></tr></thead>`;
          html += `<tbody>`;
          actionItems.forEach((note) => {
            const authorName =
              note.createdBy === collab.startedBy
                ? `${note.createdByName} (host)`
                : note.createdByName;
            const assignee = note.assignee || "-";
            const dueDate = note.dueDate
              ? new Date(note.dueDate).toLocaleDateString()
              : "-";
            html += `<tr>`;
            html += `<td style="padding: 8px 12px;">${getPromptForNote(note)}</td>`;
            html += `<td style="padding: 8px 12px;">${note.content}</td>`;
            html += `<td style="padding: 8px 12px;">${authorName}</td>`;
            html += `<td style="padding: 8px 12px;">${assignee}</td>`;
            html += `<td style="padding: 8px 12px;">${dueDate}</td>`;
            html += `</tr>`;
          });
          html += `</tbody></table>`;
        }

        // Requirements table
        if (requirements.length > 0) {
          html += `<h3>Requirements</h3>`;
          html += `<table border="1" style="width:100%; border-collapse:collapse; margin-bottom:20px;">`;
          html += `<thead><tr><th style="padding: 8px 12px;">Prompt</th><th style="padding: 8px 12px;">Note</th><th style="padding: 8px 12px;">Author</th></tr></thead>`;
          html += `<tbody>`;
          requirements.forEach((note) => {
            const authorName =
              note.createdBy === collab.startedBy
                ? `${note.createdByName} (host)`
                : note.createdByName;
            html += `<tr>`;
            html += `<td style="padding: 8px 12px;">${getPromptForNote(note)}</td>`;
            html += `<td style="padding: 8px 12px;">${note.content}</td>`;
            html += `<td style="padding: 8px 12px;">${authorName}</td>`;
            html += `</tr>`;
          });
          html += `</tbody></table>`;
        }

        // Constructive Feedback table
        if (constructiveFeedback.length > 0) {
          html += `<h3>Constructive Feedback</h3>`;
          html += `<table border="1" style="width:100%; border-collapse:collapse; margin-bottom:20px;">`;
          html += `<thead><tr><th style="padding: 8px 12px;">Prompt</th><th style="padding: 8px 12px;">Note</th><th style="padding: 8px 12px;">Author</th></tr></thead>`;
          html += `<tbody>`;
          constructiveFeedback.forEach((note) => {
            const authorName =
              note.createdBy === collab.startedBy
                ? `${note.createdByName} (host)`
                : note.createdByName;
            html += `<tr>`;
            html += `<td style="padding: 8px 12px;">${getPromptForNote(note)}</td>`;
            html += `<td style="padding: 8px 12px;">${note.content}</td>`;
            html += `<td style="padding: 8px 12px;">${authorName}</td>`;
            html += `</tr>`;
          });
          html += `</tbody></table>`;
        }
      }

      // Render all notes in chronological order
      if (notes.length > 0) {
        html += `<h2>Collaboration Timeline (${notes.length})</h2>`;
        notes.forEach((note, idx) => renderNoteHTML(note, idx));
      }

      return html;
    };

    const generateMarkdown = () => {
      let md = "";
      const tempDiv = document.createElement("div");

      // Helper to get timestamp from Firestore or number
      const getTimestamp = (time: unknown): number => {
        if (!time) return 0;
        const ts = time as unknown as {
          toDate?: () => Date;
          seconds?: number;
        };
        if (ts.toDate) return ts.toDate().getTime();
        if (ts.seconds) return ts.seconds * 1000;
        if (typeof time === "number") return time;
        return 0;
      };

      // Build prompts array with timestamps for getPromptForNote helper
      const allPrompts: (PromptVersion & { timestampMs: number })[] = [
        ...(collab.promptHistory || []).map((p) => ({
          ...p,
          timestampMs: getTimestamp(p.timestamp),
        })),
        {
          prompt: collab.prompt,
          timestamp: collab.promptUpdatedAt || collab.startedAt || Date.now(),
          timestampMs: getTimestamp(
            collab.promptUpdatedAt || collab.startedAt || Date.now(),
          ),
        },
      ].sort((a, b) => a.timestampMs - b.timestampMs);

      // Helper function to render a note
      const renderNote = (note: Note, idx: number) => {
        // Strip HTML from note content
        tempDiv.innerHTML = note.content.replace(/&nbsp;/g, " ");
        const noteText = tempDiv.textContent || tempDiv.innerText || "";

        const authorName =
          note.createdBy === collab.startedBy && note.type !== "Host note"
            ? `${note.createdByName} (host)`
            : note.createdByName;
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
          const agreedNames: string[] = [];
          const disagreedNames: string[] = [];
          const markReadNames: string[] = [];

          Object.entries(note.reactions).forEach(([sessionId, reaction]) => {
            // Find the name for this sessionId
            let name = sessionId;
            const noteByUser = notes.find((n) => n.createdBy === sessionId);
            if (noteByUser) {
              name =
                noteByUser.createdBy === collab.startedBy
                  ? `${noteByUser.createdByName} (host)`
                  : noteByUser.createdByName;
            }

            if (reaction === "agree") {
              agreedNames.push(name);
            } else if (reaction === "disagree") {
              disagreedNames.push(name);
            } else if (reaction === "markRead") {
              markReadNames.push(name);
            }
          });

          md += `#### Reactions\n\n`;
          if (agreedNames.length > 0)
            md += `Agreed (${agreedNames.length}): ${agreedNames.join(", ")} `;
          if (disagreedNames.length > 0)
            md += `Disagreed (${disagreedNames.length}): ${disagreedNames.join(", ")} `;
          if (markReadNames.length > 0)
            md += `Marked as read (${markReadNames.length}): ${markReadNames.join(", ")}`;
          md += `\n\n`;
        }

        // Responses
        if (note.responses && note.responses.length > 0) {
          md += `#### Responses (${note.responses.length})\n\n`;
          note.responses.forEach((response) => {
            tempDiv.innerHTML = response.content.replace(/&nbsp;/g, " ");
            const responseText = tempDiv.textContent || tempDiv.innerText || "";
            const timestamp = response.createdAt
              ? new Date(response.createdAt as number).toLocaleString()
              : "Unknown time";
            const responseAuthorName =
              response.createdBy === collab.startedBy
                ? `${response.createdByName} (host)`
                : response.createdByName;
            md += `- **${responseAuthorName}** (${timestamp}): ${responseText}\n`;
          });
          md += `\n`;
        }

        // Edit history
        if (note.editHistory && note.editHistory.length > 0) {
          md += `**Edit History (${note.editHistory.length} version${note.editHistory.length !== 1 ? "s" : ""}):**\n\n`;
          note.editHistory.forEach((version, vIdx) => {
            tempDiv.innerHTML = version.content.replace(/&nbsp;/g, " ");
            const versionText = tempDiv.textContent || tempDiv.innerText || "";
            const timestamp = version.editedAt
              ? new Date(version.editedAt as number).toLocaleString()
              : "Unknown time";
            md += `${vIdx + 1}. ${timestamp}: ${versionText}\n`;
          });
          md += `\n`;
        }

        md += `---\n\n`;
      };

      // Key takeaways section - as tables
      const getPromptForNote = (note: Note): string => {
        const noteTime = getTimestamp(note.createdAt);
        for (let i = 0; i < allPrompts.length; i++) {
          const startTime = allPrompts[i].timestampMs;
          const endTime =
            i < allPrompts.length - 1
              ? allPrompts[i + 1].timestampMs
              : Infinity;
          if (noteTime >= startTime && noteTime < endTime) {
            tempDiv.innerHTML = allPrompts[i].prompt;
            return tempDiv.textContent || tempDiv.innerText || "";
          }
        }
        return "";
      };

      const actionItems = notes.filter((n) => n.type === "Action item");
      const requirements = notes.filter((n) => n.type === "Requirement");
      const constructiveFeedback = notes.filter(
        (n) => n.type === "Constructive feedback",
      );

      if (
        actionItems.length > 0 ||
        requirements.length > 0 ||
        constructiveFeedback.length > 0
      ) {
        md += `## Key Takeaways\n\n`;

        // Action Items table
        if (actionItems.length > 0) {
          md += `### Action Items\n\n`;
          md += `| Prompt | Note | Author | Assignee | Due Date |\n`;
          md += `|--------|------|--------|----------|----------|\n`;
          actionItems.forEach((note) => {
            tempDiv.innerHTML = note.content.replace(/&nbsp;/g, " ");
            const noteText = (tempDiv.textContent || tempDiv.innerText || "")
              .replace(/\|/g, "\\|")
              .replace(/\n/g, " ");
            const authorName =
              note.createdBy === collab.startedBy
                ? `${note.createdByName} (host)`
                : note.createdByName;
            const promptText = getPromptForNote(note)
              .replace(/\|/g, "\\|")
              .replace(/\n/g, " ");
            const assignee = note.assignee || "-";
            const dueDate = note.dueDate
              ? new Date(note.dueDate).toLocaleDateString()
              : "-";
            md += `| ${promptText} | ${noteText} | ${authorName} | ${assignee} | ${dueDate} |\n`;
          });
          md += `\n`;
        }

        // Requirements table
        if (requirements.length > 0) {
          md += `### Requirements\n\n`;
          md += `| Prompt | Note | Author |\n`;
          md += `|--------|------|--------|\n`;
          requirements.forEach((note) => {
            tempDiv.innerHTML = note.content.replace(/&nbsp;/g, " ");
            const noteText = (tempDiv.textContent || tempDiv.innerText || "")
              .replace(/\|/g, "\\|")
              .replace(/\n/g, " ");
            const authorName =
              note.createdBy === collab.startedBy
                ? `${note.createdByName} (host)`
                : note.createdByName;
            const promptText = getPromptForNote(note)
              .replace(/\|/g, "\\|")
              .replace(/\n/g, " ");
            md += `| ${promptText} | ${noteText} | ${authorName} |\n`;
          });
          md += `\n`;
        }

        // Constructive Feedback table
        if (constructiveFeedback.length > 0) {
          md += `### Constructive Feedback\n\n`;
          md += `| Prompt | Note | Author |\n`;
          md += `|--------|------|--------|\n`;
          constructiveFeedback.forEach((note) => {
            tempDiv.innerHTML = note.content.replace(/&nbsp;/g, " ");
            const noteText = (tempDiv.textContent || tempDiv.innerText || "")
              .replace(/\|/g, "\\|")
              .replace(/\n/g, " ");
            const authorName =
              note.createdBy === collab.startedBy
                ? `${note.createdByName} (host)`
                : note.createdByName;
            const promptText = getPromptForNote(note)
              .replace(/\|/g, "\\|")
              .replace(/\n/g, " ");
            md += `| ${promptText} | ${noteText} | ${authorName} |\n`;
          });
          md += `\n`;
        }
      }

      // Render all notes in chronological order
      if (notes.length > 0) {
        md += `## Collaboration Timeline (${notes.length})\n\n`;
        notes.forEach((note, idx) => renderNote(note, idx));
      }

      return md;
    };

    return (
      <div className={styles.stoppedScreen}>
        <div className={styles.stoppedHeader}>
          <h1 className={styles.stoppedTitle}>Collaboration Results</h1>
          <p className={styles.stoppedMessage}>
            This collaboration was closed by the host,{" "}
            <b>{collab.startedByName}</b>.
          </p>
          {isHost && (
            <button
              onClick={() => resumeCollaboration(collab.id)}
              className={styles.resumeButton}
            >
              Reopen collaboration
            </button>
          )}
        </div>
        <div className={styles.stoppedSummary}>
          <div className={styles.summaryHeader}>
            <h2 className={styles.summaryTitle}>Summary</h2>
            <div className={styles.summaryControls}>
              <div className={styles.formatToggle}>
                <button
                  onClick={() => setSummaryFormat("html")}
                  className={styles.formatButton}
                  data-active={summaryFormat === "html"}
                >
                  HTML
                </button>
                <button
                  onClick={() => setSummaryFormat("markdown")}
                  className={styles.formatButton}
                  data-active={summaryFormat === "markdown"}
                >
                  Markdown
                </button>
              </div>
              <button
                onClick={async () => {
                  if (summaryFormat === "markdown") {
                    await navigator.clipboard.writeText(generateMarkdown());
                    alert("Copied Markdown to clipboard!");
                  } else {
                    const html = generateHTML();
                    const blob = new Blob([html], { type: "text/html" });
                    const clipboardItem = new ClipboardItem({
                      "text/html": blob,
                    });
                    await navigator.clipboard.write([clipboardItem]);
                    alert(
                      "Copied HTML to clipboard! Paste into Google Docs to preserve formatting.",
                    );
                  }
                }}
                className={styles.copyButton}
              >
                Copy
              </button>
            </div>
          </div>
          {summaryFormat === "markdown" ? (
            <pre className={styles.summaryContent}>
              {generateMarkdown().replace(/&nbsp;/g, " ")}
            </pre>
          ) : (
            <div
              className={styles.summaryContent}
              dangerouslySetInnerHTML={{
                __html: generateHTML().replace(/&nbsp;/g, " "),
              }}
            />
          )}
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

  // Calculate inbox count (exclude archived and host notes)
  const inboxCount = notes.filter((n) => {
    // For polls, check if user has voted
    const hasInteracted =
      n.type === "Poll"
        ? (() => {
            const userVote = n.pollVotes?.[session.userId];
            const hasVoted =
              userVote !== undefined &&
              (Array.isArray(userVote) ? userVote.length > 0 : true);
            return hasVoted || n.pollClosed;
          })()
        : n.reactions?.[session.userId];

    return (
      (n.type === "Poll" || n.createdBy !== session.userId) &&
      !hasInteracted &&
      !allChildIds.has(n.id) &&
      !n.archived &&
      n.type !== "Host note"
    );
  }).length;

  // Calculate archived count
  const archivedCount = notes.filter((n) => n.archived).length;

  let visibleNotes =
    filter === "Archived"
      ? notes.filter((n) => n.archived)
      : filter === "All"
        ? notes.filter((n) => !n.archived && selectedNoteTypes.has(n.type))
        : filter === "Inbox"
          ? notes.filter((n) => {
              // For polls, only remove from inbox if user has voted or poll is closed
              const hasInteracted =
                n.type === "Poll"
                  ? (() => {
                      const userVote = n.pollVotes?.[session.userId];
                      const hasVoted =
                        userVote !== undefined &&
                        (Array.isArray(userVote) ? userVote.length > 0 : true);
                      return hasVoted || n.pollClosed;
                    })()
                  : n.reactions?.[session.userId];

              return (
                (n.type === "Poll" || n.createdBy !== session.userId) &&
                !hasInteracted &&
                (!allChildIds.has(n.id) || n.id === respondingToNoteId) &&
                !n.archived &&
                n.type !== "Host note" &&
                selectedNoteTypes.has(n.type)
              );
            })
          : notes.filter(
              (n) =>
                n.createdBy === session.userId &&
                !n.archived &&
                selectedNoteTypes.has(n.type),
            );

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
          <span className={styles.collabHeaderTitle}>{collab.title}</span>
          <span className={styles.collabHeaderMeta}>
            Hosted by <b>{collab.startedByName}</b>
          </span>
          <span className={styles.collabHeaderUser}>
            You are: <b>{session.displayName}</b>
          </span>
        </div>
        <div className={styles.collabHeaderActions}>
          {!collab.active && (
            <span className={styles.badgeStopped}>Stopped</span>
          )}
          {collab.paused && collab.active && (
            <span className={styles.badgePaused}>Input paused</span>
          )}
          {collab.startedBy === session.userId && collab.active && (
            <>
              <div
                className={styles.noteTypeSettingsContainer}
                ref={noteTypeSettingsRef}
              >
                <button
                  onClick={() => setShowNoteTypeSettings(!showNoteTypeSettings)}
                  className={styles.buttonNoteTypes}
                >
                  Manage note types {showNoteTypeSettings ? "▲" : "▼"}
                </button>
                {showNoteTypeSettings && (
                  <div className={styles.noteTypeSettingsDropdown}>
                    <div className={styles.noteTypeSettingsHeader}>
                      Note types:
                    </div>
                    {NOTE_TYPES.filter((type) => type !== "Host note").map(
                      (type) => {
                        const isEnabled = allowedNoteTypes.includes(type);
                        return (
                          <label
                            key={type}
                            className={styles.noteTypeSettingsOption}
                            style={{
                              display: "flex",
                              alignItems: "center",
                              cursor: "pointer",
                              padding: "6px 8px",
                            }}
                          >
                            <input
                              type="checkbox"
                              checked={isEnabled}
                              onChange={() =>
                                toggleNoteTypeInCollab(type, !isEnabled)
                              }
                              style={{ marginRight: "8px" }}
                            />
                            <span>{type}</span>
                          </label>
                        );
                      },
                    )}
                  </div>
                )}
              </div>
              <button
                onClick={() => navigate(`/collabs/${collab.id}/stats`)}
                className={styles.buttonStats}
              >
                Stats
              </button>
              <button
                onClick={async () => {
                  const willShow = collab.showAuthorNames === false;
                  await updateShowAuthorNames(collab.id, willShow);
                  const message = willShow
                    ? "<p>The host set author names to 'displayed'.</p>"
                    : "<p>The host set author names to 'hidden'.</p>";
                  await createNote(
                    collab.id,
                    "Host note",
                    message,
                    session.userId,
                    session.displayName,
                  );
                }}
                className={styles.buttonToggle}
                data-active={collab.showAuthorNames !== false}
              >
                {collab.showAuthorNames !== false
                  ? "Hide authors"
                  : "Show authors"}
              </button>
              <button
                onClick={async () => {
                  const willPause = !collab.paused;
                  await pauseCollaboration(collab.id, willPause);
                  const message = willPause
                    ? "<p>Participant input was paused.</p>"
                    : "<p>Participant input was resumed.</p>";
                  await createNote(
                    collab.id,
                    "Host note",
                    message,
                    session.userId,
                    session.displayName,
                  );
                }}
                className={styles.buttonPause}
                data-paused={collab.paused}
              >
                {collab.paused ? "Resume" : "Pause"}
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
              <div className={styles.promptLabel}>Collaboration prompt</div>
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
                  modules={QUILL_MODULES}
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
                      const getCurrentTimestamp = () => Date.now();
                      const timestamp =
                        collab.promptUpdatedAt ||
                        collab.startedAt ||
                        getCurrentTimestamp();
                      await updatePrompt(
                        collab.id,
                        promptValue,
                        collab.prompt,
                        timestamp,
                        collab.promptHistory,
                      );
                      // Create a host note documenting the prompt change
                      const message = `<p>The prompt was updated to:</p>${promptValue}`;
                      await createNote(
                        collab.id,
                        "Host note",
                        message,
                        session.userId,
                        session.displayName,
                      );
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
                dangerouslySetInnerHTML={{
                  __html: collab.prompt.replace(/&nbsp;/g, " "),
                }}
                className={styles.promptContent}
              />
            )}
          </div>
          {!collab.active ? (
            <div className={styles.messageStopped}>
              This collaboration has been stopped.
            </div>
          ) : collab.paused && !isHost ? (
            <div className={styles.messagePaused}>Participation is paused.</div>
          ) : (
            <>
              {/* Participant note types */}
              <div className={styles.sectionLabel}>Add a note</div>
              {allowedNoteTypes
                .filter(
                  (type) =>
                    type !== "Host note" &&
                    type !== "Action item" &&
                    type !== "Poll",
                )
                .map((type) => (
                  <NoteTypePanel
                    key={type}
                    label={type}
                    isOpen={openType === type}
                    onToggle={() =>
                      setOpenType(openType === type ? null : type)
                    }
                    onSubmit={(
                      html,
                      assignee,
                      dueDate,
                      pollOptions,
                      pollMultipleChoice,
                    ) =>
                      createNote(
                        collab.id,
                        type,
                        html,
                        session.userId,
                        session.displayName,
                        assignee,
                        dueDate,
                        pollOptions,
                        pollMultipleChoice,
                      )
                    }
                  />
                ))}

              {/* Host-only note types */}
              <div className={styles.sectionLabel}>Host only</div>
              <NoteTypePanel
                key="Action item"
                label="Action item"
                isOpen={openType === "Action item"}
                onToggle={() =>
                  setOpenType(openType === "Action item" ? null : "Action item")
                }
                onSubmit={(
                  html,
                  assignee,
                  dueDate,
                  pollOptions,
                  pollMultipleChoice,
                ) =>
                  createNote(
                    collab.id,
                    "Action item",
                    html,
                    session.userId,
                    session.displayName,
                    assignee,
                    dueDate,
                    pollOptions,
                    pollMultipleChoice,
                  )
                }
                disabled={!isHost}
              />
              <NoteTypePanel
                key="Poll"
                label="Poll"
                isOpen={openType === "Poll"}
                onToggle={() =>
                  setOpenType(openType === "Poll" ? null : "Poll")
                }
                onSubmit={(
                  html,
                  assignee,
                  dueDate,
                  pollOptions,
                  pollMultipleChoice,
                ) =>
                  createNote(
                    collab.id,
                    "Poll",
                    html,
                    session.userId,
                    session.displayName,
                    assignee,
                    dueDate,
                    pollOptions,
                    pollMultipleChoice,
                  )
                }
                disabled={!isHost}
              />
              {allowedNoteTypes.includes("Host note") && (
                <NoteTypePanel
                  key="Host note"
                  label="Host note"
                  isOpen={openType === "Host note"}
                  onToggle={() =>
                    setOpenType(openType === "Host note" ? null : "Host note")
                  }
                  onSubmit={(
                    html,
                    assignee,
                    dueDate,
                    pollOptions,
                    pollMultipleChoice,
                  ) =>
                    createNote(
                      collab.id,
                      "Host note",
                      html,
                      session.userId,
                      session.displayName,
                      assignee,
                      dueDate,
                      pollOptions,
                      pollMultipleChoice,
                    )
                  }
                  disabled={!isHost}
                />
              )}
            </>
          )}
        </aside>

        <main className={styles.collabMain}>
          <div className={styles.filterBar}>
            {(["Mine", "Inbox", "All", "Archived"] as const).map((t) => (
              <button
                key={t}
                onClick={() => setFilter(t)}
                className={styles.filterButton}
                data-active={filter === t}
                data-filter={t}
              >
                {t === "Mine"
                  ? "Your notes"
                  : t === "Inbox"
                    ? `Inbox (${inboxCount})`
                    : t === "Archived"
                      ? `Archived (${archivedCount})`
                      : t}
              </button>
            ))}
            <div
              ref={noteTypeFilterRef}
              className={styles.noteTypeFilterContainer}
            >
              <button
                onClick={() => setShowNoteTypeFilter(!showNoteTypeFilter)}
                className={styles.filterButton}
                data-active={selectedNoteTypes.size < existingNoteTypes.length}
              >
                Note types {showNoteTypeFilter ? "▲" : "▼"}
              </button>
              {showNoteTypeFilter && (
                <div className={styles.noteTypeFilterDropdown}>
                  {existingNoteTypes.map((t) => (
                    <label key={t} className={styles.noteTypeFilterOption}>
                      <input
                        type="checkbox"
                        checked={selectedNoteTypes.has(t)}
                        onChange={(e) => {
                          const newSet = new Set(selectedNoteTypes);
                          if (e.target.checked) {
                            newSet.add(t);
                          } else {
                            newSet.delete(t);
                          }
                          setSelectedNoteTypes(newSet);
                        }}
                      />
                      <span>{t}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>
            <div className={styles.sortOrderContainer}>
              <select
                value={filter === "Inbox" ? "asc" : sortOrder}
                onChange={(e) => setSortOrder(e.target.value as "asc" | "desc")}
                className={styles.filterButton}
                data-active={sortOrder === "asc"}
                disabled={filter === "Inbox"}
                title={
                  filter === "Inbox"
                    ? "Inbox is always sorted oldest first"
                    : undefined
                }
              >
                <option value="desc">Newest first</option>
                <option value="asc">Oldest first</option>
              </select>
            </div>
          </div>
          <div className={styles.notesList}>
            {displayNotes.map(
              ({ note: n, isGrouped, groupDepth, isParent }) => (
                <div
                  key={n.id}
                  onClick={
                    isParent && !isGrouped ? () => toggleGroup(n.id) : undefined
                  }
                  style={{
                    cursor: isParent && !isGrouped ? "pointer" : undefined,
                  }}
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
                      !collab.paused &&
                      collab.active &&
                      n.createdBy !== session.userId
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
                      !collab.paused &&
                      collab.active &&
                      n.createdBy === session.userId
                    }
                    canArchive={isHost && collab.active && !!collab.paused}
                    onRespondingChange={(isResponding) =>
                      setRespondingToNoteId(isResponding ? n.id : null)
                    }
                    hideYouBadge={filter === "Mine"}
                    isHost={isHost}
                    showAuthorNames={collab.showAuthorNames}
                  />
                  {isParent && !isGrouped && (
                    <div className={styles.groupIndicator}>
                      {noteGroups.get(n.id)?.length || 0} grouped note
                      {(noteGroups.get(n.id)?.length || 0) !== 1 ? "s" : ""}
                      {expandedGroups.has(n.id) ? " ▲" : " ▼"}
                    </div>
                  )}
                </div>
              ),
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
