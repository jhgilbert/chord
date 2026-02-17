import ReactQuill from "react-quill-new";
import "react-quill-new/dist/quill.snow.css";
import { useState } from "react";
import {
  addResponse,
  closePoll,
  editNote,
  setReaction,
  setResponseReaction,
  toggleArchive,
  votePoll,
  type Note,
  type NoteResponse,
  type Reaction,
} from "../../notes";
import { NOTE_TYPE_COLORS, QUILL_MODULES } from "../../constants";
import { getRelativeTime, sanitizeHtml } from "../../utils";
import ResponseItem from "../ResponseItem/ResponseItem";
import styles from "./StickyNote.module.css";

type StickyNoteProps = {
  note: Note;
  collaborationId: string;
  sessionId: string;
  displayName: string;
  canDelete: boolean;
  canReact: boolean;
  paused: boolean;
  showAuthorNames?: boolean;
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
  hideYouBadge?: boolean;
  isHost?: boolean;
  forceExpandResponses?: boolean;
};

export default function StickyNote({
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
  hideYouBadge,
  isHost,
  showAuthorNames,
  forceExpandResponses,
}: StickyNoteProps) {
  const [hovered, setHovered] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState("");
  const [showHistory, setShowHistory] = useState(false);
  const [showResponses, setShowResponses] = useState(false);
  const responsesVisible = forceExpandResponses || showResponses;
  const [isResponding, setIsResponding] = useState(false);
  const [responseContent, setResponseContent] = useState("");
  const [pendingPollSelection, setPendingPollSelection] = useState<
    number | number[] | null
  >(null);
  const myReaction: Reaction | null = note.reactions?.[sessionId] ?? null;

  const counts = computeReactionCounts(note, paused, myReaction);

  const handleReaction = (r: Reaction) => {
    setReaction(
      collaborationId,
      note.id,
      sessionId,
      myReaction === r ? null : r,
    ).catch(console.error);
  };

  const reactionOpacity = paused || note.createdBy === sessionId ? 0.4 : 1;

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

  const handleSubmitVote = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const voteToSubmit =
      Array.isArray(pendingPollSelection) && pendingPollSelection.length === 0
        ? note.pollMultipleChoice
          ? []
          : 0
        : pendingPollSelection;
    try {
      await votePoll(collaborationId, note.id, sessionId, voteToSubmit!);
      setPendingPollSelection(null);
    } catch (error) {
      console.error("Failed to submit vote:", error);
      alert("Failed to submit vote. Please try again.");
    }
  };

  const handleClosePoll = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await closePoll(collaborationId, note.id);
    } catch (error) {
      console.error("Failed to close poll:", error);
      alert("Failed to close poll. Please try again.");
    }
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

  const color = NOTE_TYPE_COLORS[note.type];

  const showActionBar =
    (!paused && !isResponding) ||
    canReact ||
    paused ||
    canArchive ||
    canDelete ||
    (canEdit && !isEditing);

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className={styles.stickyNote}
      data-testid="note"
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
      style={getNoteStyle(color, hovered, groupDepth)}
    >
      {canUngroup && (
        <button
          onClick={onUngroup}
          aria-label="Ungroup note"
          className={styles.stickyNoteUngroup}
        >
          Ungroup
        </button>
      )}
      {showActionBar && (
        <ActionBar
          note={note}
          sessionId={sessionId}
          collaborationId={collaborationId}
          paused={paused}
          hovered={hovered}
          isEditing={isEditing}
          isResponding={isResponding}
          canEdit={canEdit}
          canDelete={canDelete}
          canReact={canReact}
          canArchive={canArchive}
          myReaction={myReaction}
          counts={counts}
          reactionOpacity={reactionOpacity}
          onEdit={handleEdit}
          onDelete={onDelete}
          onReaction={handleReaction}
          onStartResponding={() => {
            setIsResponding(true);
            onRespondingChange?.(true);
          }}
        />
      )}
      <BadgeRow
        note={note}
        sessionId={sessionId}
        hideYouBadge={hideYouBadge}
        showAuthorNames={showAuthorNames}
      />
      <ActionItemMeta note={note} />
      {isEditing ? (
        <EditForm
          editContent={editContent}
          onChangeContent={setEditContent}
          onSave={handleSaveEdit}
          onCancel={handleCancelEdit}
        />
      ) : (
        <>
          <NoteContent content={note.content} />
          {note.type === "Poll" && note.pollOptions && (
            <PollOptions
              note={note}
              sessionId={sessionId}
              paused={paused}
              isHost={isHost}
              pendingPollSelection={pendingPollSelection}
              onSelectionChange={setPendingPollSelection}
              onSubmitVote={handleSubmitVote}
              onClosePoll={handleClosePoll}
            />
          )}
          <EditHistory
            editHistory={note.editHistory}
            showHistory={showHistory}
            onToggleHistory={() => setShowHistory(!showHistory)}
          />
          <ResponsesSection
            note={note}
            sessionId={sessionId}
            collaborationId={collaborationId}
            paused={paused}
            color={color}
            responsesVisible={responsesVisible}
            onToggleResponses={() => setShowResponses(!showResponses)}
            isResponding={isResponding}
            responseContent={responseContent}
            onChangeResponseContent={setResponseContent}
            onSubmitResponse={handleAddResponse}
            onCancelResponse={handleCancelResponse}
            showAuthorNames={showAuthorNames}
          />
        </>
      )}
    </div>
  );
}

// --- Helper functions ---

function computeReactionCounts(
  note: Note,
  paused: boolean,
  myReaction: Reaction | null,
) {
  const counts = { agree: 0, disagree: 0, markRead: 0 };
  if (paused) {
    Object.values(note.reactions ?? {}).forEach((r) => counts[r]++);
  } else if (myReaction) {
    counts[myReaction] = 1;
  }
  return counts;
}

function getNoteStyle(
  color: string,
  hovered: boolean,
  groupDepth?: number,
): React.CSSProperties {
  const style: React.CSSProperties = {
    borderLeftColor: color,
    backgroundColor: hovered
      ? `color-mix(in srgb, ${color} 8%, transparent)`
      : "#ffffff",
  };
  if (groupDepth) {
    style.marginLeft = `${groupDepth * 20}px`;
  }
  return style;
}

// --- Subcomponents ---

function ActionBar({
  note,
  sessionId,
  collaborationId,
  paused,
  hovered,
  isEditing,
  isResponding,
  canEdit,
  canDelete,
  canReact,
  canArchive,
  myReaction,
  counts,
  reactionOpacity,
  onEdit,
  onDelete,
  onReaction,
  onStartResponding,
}: {
  note: Note;
  sessionId: string;
  collaborationId: string;
  paused: boolean;
  hovered: boolean;
  isEditing: boolean;
  isResponding: boolean;
  canEdit?: boolean;
  canDelete: boolean;
  canReact: boolean;
  canArchive?: boolean;
  myReaction: Reaction | null;
  counts: { agree: number; disagree: number; markRead: number };
  reactionOpacity: number;
  onEdit: () => void;
  onDelete: () => void;
  onReaction: (r: Reaction) => void;
  onStartResponding: () => void;
}) {
  return (
    <div className={styles.stickyNoteActions}>
      {canEdit && !isEditing && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onEdit();
          }}
          className={styles.actionButton}
          data-active={false}
          aria-label="Edit note"
          title="Edit"
          style={{ opacity: hovered ? 1 : 0 }}
        >
          ✏️
        </button>
      )}
      {canDelete && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          className={styles.actionButton}
          data-active={false}
          aria-label="Delete note"
          title="Delete"
          style={{ opacity: hovered ? 1 : 0 }}
        >
          🗑️
        </button>
      )}
      {canArchive && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            toggleArchive(collaborationId, note.id, !!note.archived).catch(
              console.error,
            );
          }}
          className={styles.actionButton}
          data-active={false}
          aria-label={note.archived ? "Unarchive" : "Archive"}
          title={note.archived ? "Unarchive" : "Archive"}
          style={{ opacity: hovered ? 1 : 0 }}
        >
          {note.archived ? "📂" : "🗄️"}
        </button>
      )}
      {note.type !== "Poll" && (
        <button
          onClick={
            canReact && note.createdBy !== sessionId
              ? () => onReaction("agree")
              : undefined
          }
          className={styles.actionButton}
          data-active={myReaction === "agree"}
          data-paused={paused || note.createdBy === sessionId}
          title="Upvote"
          data-testid="upvote"
          style={{ opacity: reactionOpacity }}
        >
          ➕ <span>{counts.agree}</span>
        </button>
      )}
      {!paused && !isResponding && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onStartResponding();
          }}
          className={styles.actionButton}
          data-active={false}
          aria-label="Add response"
          title="Add comment"
        >
          💬 <span>{note.responses?.length || 0}</span>
        </button>
      )}
      <button
        onClick={
          canReact && note.createdBy !== sessionId
            ? () => onReaction("markRead")
            : undefined
        }
        className={styles.actionButton}
        data-active={myReaction === "markRead"}
        data-paused={paused || note.createdBy === sessionId}
        title="Mark as read"
        style={{ opacity: reactionOpacity }}
      >
        📖 <span>{counts.markRead}</span>
      </button>
    </div>
  );
}

function BadgeRow({
  note,
  sessionId,
  hideYouBadge,
  showAuthorNames,
}: {
  note: Note;
  sessionId: string;
  hideYouBadge?: boolean;
  showAuthorNames?: boolean;
}) {
  return (
    <div className={styles.stickyNoteBadges}>
      <span
        className={styles.badgeType}
        style={{ backgroundColor: NOTE_TYPE_COLORS[note.type] }}
      >
        {note.type}
      </span>
      {note.createdBy === sessionId && !hideYouBadge && (
        <span className={styles.badgeYou}>You</span>
      )}
      {showAuthorNames !== false && (
        <span className={styles.badgeName}>{note.createdByName}</span>
      )}
      <span className={styles.badgeTimestamp}>
        {note.createdAt &&
        typeof note.createdAt === "object" &&
        "seconds" in note.createdAt
          ? getRelativeTime(
              (note.createdAt as { seconds: number }).seconds * 1000,
            )
          : ""}
      </span>
    </div>
  );
}

function ActionItemMeta({ note }: { note: Note }) {
  if (note.type !== "Action item" || (!note.assignee && !note.dueDate)) {
    return null;
  }
  return (
    <div className={styles.actionItemMeta}>
      {note.assignee && (
        <div className={styles.actionItemMetaItem}>
          <strong>Assignee:</strong> {note.assignee}
        </div>
      )}
      {note.dueDate && (
        <div className={styles.actionItemMetaItem}>
          <strong>Due:</strong>{" "}
          {new Date(note.dueDate).toLocaleDateString()}
        </div>
      )}
    </div>
  );
}

function EditForm({
  editContent,
  onChangeContent,
  onSave,
  onCancel,
}: {
  editContent: string;
  onChangeContent: (value: string) => void;
  onSave: () => void;
  onCancel: () => void;
}) {
  return (
    <div className={styles.editContainer}>
      <ReactQuill
        theme="snow"
        value={editContent}
        onChange={onChangeContent}
        className={styles.editEditor}
        modules={QUILL_MODULES}
      />
      <div className={styles.editActions}>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onCancel();
          }}
          className={styles.editCancel}
        >
          Cancel
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onSave();
          }}
          className={styles.editSave}
        >
          Save
        </button>
      </div>
    </div>
  );
}

function NoteContent({ content }: { content: string }) {
  return (
    <div
      dangerouslySetInnerHTML={{
        __html: sanitizeHtml(content.replace(/&nbsp;/g, " ")),
      }}
      className={styles.stickyNoteContent}
    />
  );
}

function PollOptions({
  note,
  sessionId,
  paused,
  isHost,
  pendingPollSelection,
  onSelectionChange,
  onSubmitVote,
  onClosePoll,
}: {
  note: Note;
  sessionId: string;
  paused: boolean;
  isHost?: boolean;
  pendingPollSelection: number | number[] | null;
  onSelectionChange: (selection: number | number[] | null) => void;
  onSubmitVote: (e: React.MouseEvent) => void;
  onClosePoll: (e: React.MouseEvent) => void;
}) {
  const isMultiChoice = note.pollMultipleChoice;
  const currentUserVote = note.pollVotes?.[sessionId];
  const hasSubmittedVote = currentUserVote !== undefined;

  return (
    <div className={styles.pollOptionsDisplay}>
      {note.pollOptions!.map((option, index) => {
        const activeSelection = hasSubmittedVote
          ? currentUserVote
          : pendingPollSelection;

        const voteCount = Object.values(note.pollVotes || {}).filter((v) =>
          Array.isArray(v) ? v.includes(index) : v === index,
        ).length;
        const totalVotes = Object.keys(note.pollVotes || {}).length;
        const percentage =
          totalVotes > 0 ? Math.round((voteCount / totalVotes) * 100) : 0;

        const isSelected = Array.isArray(activeSelection)
          ? activeSelection.includes(index)
          : activeSelection === index;

        const showResults = paused;
        const isPollClosed = !!note.pollClosed;
        const canInteract = !paused && !isPollClosed && !hasSubmittedVote;

        return (
          <button
            key={index}
            onClick={(e) => {
              e.stopPropagation();
              if (canInteract) {
                if (isMultiChoice) {
                  const currentSelection = Array.isArray(pendingPollSelection)
                    ? pendingPollSelection
                    : [];
                  const newSelection = currentSelection.includes(index)
                    ? currentSelection.filter((i) => i !== index)
                    : [...currentSelection, index];
                  onSelectionChange(newSelection);
                } else {
                  onSelectionChange(index);
                }
              }
            }}
            className={styles.pollOption}
            data-voted={isSelected}
            data-disabled={!canInteract}
            disabled={!canInteract}
          >
            <span className={styles.pollOptionText}>{option}</span>
            {showResults && (
              <span className={styles.pollOptionCount}>
                {voteCount} ({percentage}%)
              </span>
            )}
          </button>
        );
      })}
      {!paused &&
        !note.pollClosed &&
        !hasSubmittedVote &&
        pendingPollSelection !== null && (
          <button
            onClick={onSubmitVote}
            className={styles.pollSubmitButton}
          >
            Submit vote
          </button>
        )}
      {isHost && paused && !note.pollClosed && (
        <button
          onClick={onClosePoll}
          className={styles.closePollButton}
        >
          Close poll
        </button>
      )}
      {note.pollClosed && (
        <div className={styles.pollClosedMessage}>Poll closed</div>
      )}
    </div>
  );
}

function EditHistory({
  editHistory,
  showHistory,
  onToggleHistory,
}: {
  editHistory?: Note["editHistory"];
  showHistory: boolean;
  onToggleHistory: () => void;
}) {
  if (!editHistory || editHistory.length === 0) return null;

  return (
    <div className={styles.historyContainer}>
      <button
        onClick={(e) => {
          e.stopPropagation();
          onToggleHistory();
        }}
        className={styles.historyToggle}
      >
        {showHistory ? "Hide" : "Show"} edit history ({editHistory.length}{" "}
        version
        {editHistory.length !== 1 ? "s" : ""})
      </button>
      {showHistory && (
        <div className={styles.historyList}>
          {editHistory.map((version, idx) => {
            const timestamp = version.editedAt
              ? new Date(version.editedAt as number).toLocaleString()
              : "Unknown date";
            return (
              <div key={idx} className={styles.historyVersion}>
                <div className={styles.historyDivider} />
                <div className={styles.historyTimestamp}>{timestamp}</div>
                <div
                  dangerouslySetInnerHTML={{
                    __html: sanitizeHtml(
                      version.content.replace(/&nbsp;/g, " "),
                    ),
                  }}
                  className={styles.historyContent}
                />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function ResponsesSection({
  note,
  sessionId,
  collaborationId,
  paused,
  color,
  responsesVisible,
  onToggleResponses,
  isResponding,
  responseContent,
  onChangeResponseContent,
  onSubmitResponse,
  onCancelResponse,
  showAuthorNames,
}: {
  note: Note;
  sessionId: string;
  collaborationId: string;
  paused: boolean;
  color: string;
  responsesVisible: boolean;
  onToggleResponses: () => void;
  isResponding: boolean;
  responseContent: string;
  onChangeResponseContent: (value: string) => void;
  onSubmitResponse: () => void;
  onCancelResponse: () => void;
  showAuthorNames?: boolean;
}) {
  return (
    <div className={styles.responsesContainer}>
      {note.responses && note.responses.length > 0 && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onToggleResponses();
          }}
          className={styles.responsesToggle}
        >
          {responsesVisible ? "Hide" : "Show"} {note.responses.length}{" "}
          response
          {note.responses.length !== 1 ? "s" : ""}
        </button>
      )}
      {responsesVisible && note.responses && (
        <div className={styles.responsesList}>
          {note.responses.map((response, idx) => (
            <ResponseListItem
              key={idx}
              response={response}
              idx={idx}
              noteId={note.id}
              responses={note.responses || []}
              sessionId={sessionId}
              collaborationId={collaborationId}
              paused={paused}
              showAuthorNames={showAuthorNames}
            />
          ))}
        </div>
      )}
      {isResponding && (
        <ResponseForm
          responseContent={responseContent}
          onChangeContent={onChangeResponseContent}
          onSubmit={onSubmitResponse}
          onCancel={onCancelResponse}
          color={color}
        />
      )}
    </div>
  );
}

function ResponseListItem({
  response,
  idx,
  noteId,
  responses,
  sessionId,
  collaborationId,
  paused,
  showAuthorNames,
}: {
  response: NoteResponse;
  idx: number;
  noteId: string;
  responses: NoteResponse[];
  sessionId: string;
  collaborationId: string;
  paused: boolean;
  showAuthorNames?: boolean;
}) {
  const timestamp = response.createdAt
    ? new Date(response.createdAt as number).toLocaleString()
    : "Unknown date";

  const myResponseReaction: Reaction | null =
    response.reactions?.[sessionId] ?? null;
  const responseCounts = { agree: 0, disagree: 0, markRead: 0 };
  if (paused) {
    Object.values(response.reactions ?? {}).forEach(
      (r) => responseCounts[r]++,
    );
  } else if (myResponseReaction) {
    responseCounts[myResponseReaction] = 1;
  }

  const handleResponseReaction = (r: Reaction) => {
    if (!paused && response.createdBy !== sessionId) {
      setResponseReaction(
        collaborationId,
        noteId,
        idx,
        sessionId,
        myResponseReaction === r ? null : r,
        responses,
      ).catch(console.error);
    }
  };

  const canReact = !paused && response.createdBy !== sessionId;

  return (
    <ResponseItem
      response={response}
      timestamp={timestamp}
      paused={paused}
      canReact={canReact}
      myReaction={myResponseReaction}
      counts={responseCounts}
      getReactionOpacity={() => 1}
      handleReaction={handleResponseReaction}
      showAuthorNames={showAuthorNames}
    />
  );
}

function ResponseForm({
  responseContent,
  onChangeContent,
  onSubmit,
  onCancel,
  color,
}: {
  responseContent: string;
  onChangeContent: (value: string) => void;
  onSubmit: () => void;
  onCancel: () => void;
  color: string;
}) {
  return (
    <div className={styles.responseForm}>
      <ReactQuill
        theme="snow"
        value={responseContent}
        onChange={onChangeContent}
        className={styles.responseEditor}
        modules={QUILL_MODULES}
      />
      <div className={styles.responseActions}>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onCancel();
          }}
          className={styles.responseCancel}
        >
          Cancel
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onSubmit();
          }}
          className={styles.responseSave}
          style={{ background: color }}
        >
          Send
        </button>
      </div>
    </div>
  );
}
