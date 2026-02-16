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
  type Reaction,
} from "../../notes";
import { NOTE_TYPE_COLORS, QUILL_MODULES } from "../../constants";
import { hexToRgba, getRelativeTime } from "../../utils";
import ResponseItem from "../ResponseItem/ResponseItem";
import styles from "./StickyNote.module.css";

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
}: {
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
}) {
  const [hovered, setHovered] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState("");
  const [showHistory, setShowHistory] = useState(false);
  const [showResponses, setShowResponses] = useState(false);
  const [isResponding, setIsResponding] = useState(false);
  const [responseContent, setResponseContent] = useState("");
  const [pendingPollSelection, setPendingPollSelection] = useState<
    number | number[] | null
  >(null);
  const myReaction: Reaction | null = note.reactions?.[sessionId] ?? null;

  const counts = { agree: 0, disagree: 0, markRead: 0 };
  if (paused) {
    Object.values(note.reactions ?? {}).forEach((r) => counts[r]++);
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

  const getReactionOpacity = (_r: Reaction) => {
    if (paused || note.createdBy === sessionId) return 0.4;
    return 1;
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

  const color = NOTE_TYPE_COLORS[note.type];

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
        groupDepth
          ? {
              marginLeft: `${groupDepth * 20}px`,
              borderLeftColor: color,
              backgroundColor: hovered ? hexToRgba(color, 0.08) : "#ffffff",
            }
          : {
              borderLeftColor: color,
              backgroundColor: hovered ? hexToRgba(color, 0.08) : "#ffffff",
            }
      }
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
      {((!paused && !isResponding) ||
        canReact ||
        paused ||
        canArchive ||
        canDelete ||
        (canEdit && !isEditing)) && (
        <div className={styles.stickyNoteActions}>
          {canEdit && !isEditing && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleEdit();
              }}
              className={styles.actionButton}
              data-active={false}
              aria-label="Edit note"
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
              style={{ opacity: hovered ? 1 : 0 }}
            >
              🗑️
            </button>
          )}
          {canArchive && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                toggleArchive(collaborationId, note.id, !!note.archived);
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
                  ? () => handleReaction("agree")
                  : undefined
              }
              className={styles.actionButton}
              data-active={myReaction === "agree"}
              data-paused={paused || note.createdBy === sessionId}
              style={{ opacity: getReactionOpacity("agree") }}
            >
              ➕ <span>{counts.agree}</span>
            </button>
          )}
          {!paused && !isResponding && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setIsResponding(true);
                onRespondingChange?.(true);
              }}
              className={styles.actionButton}
              data-active={false}
              aria-label="Add response"
            >
              💬 <span>{note.responses?.length || 0}</span>
            </button>
          )}
          <button
            onClick={
              canReact && note.createdBy !== sessionId
                ? () => handleReaction("markRead")
                : undefined
            }
            className={styles.actionButton}
            data-active={myReaction === "markRead"}
            data-paused={paused || note.createdBy === sessionId}
            style={{ opacity: getReactionOpacity("markRead") }}
          >
            📬 <span>{counts.markRead}</span>
          </button>
        </div>
      )}
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
      {note.type === "Action item" && (note.assignee || note.dueDate) && (
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
      )}
      {isEditing ? (
        <div className={styles.editContainer}>
          <ReactQuill
            theme="snow"
            value={editContent}
            onChange={setEditContent}
            className={styles.editEditor}
            modules={QUILL_MODULES}
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
            dangerouslySetInnerHTML={{
              __html: note.content.replace(/&nbsp;/g, " "),
            }}
            className={styles.stickyNoteContent}
          />
          {note.type === "Poll" &&
            note.pollOptions &&
            (() => {
              const isMultiChoice = note.pollMultipleChoice;
              const currentUserVote = note.pollVotes?.[sessionId];
              const hasSubmittedVote = currentUserVote !== undefined;

              return (
                <div className={styles.pollOptionsDisplay}>
                  {note.pollOptions!.map((option, index) => {
                    // Use pending selection if exists, otherwise use submitted vote
                    const activeSelection = hasSubmittedVote
                      ? currentUserVote
                      : pendingPollSelection;

                    // Count votes for this option
                    const voteCount = Object.values(
                      note.pollVotes || {},
                    ).filter((v) =>
                      Array.isArray(v) ? v.includes(index) : v === index,
                    ).length;
                    const totalVotes = Object.keys(note.pollVotes || {}).length;
                    const percentage =
                      totalVotes > 0
                        ? Math.round((voteCount / totalVotes) * 100)
                        : 0;

                    // Check if this option is selected
                    const isSelected = Array.isArray(activeSelection)
                      ? activeSelection.includes(index)
                      : activeSelection === index;

                    const showResults = paused;
                    const isPollClosed = !!note.pollClosed;
                    const canInteract =
                      !paused && !isPollClosed && !hasSubmittedVote;

                    return (
                      <button
                        key={index}
                        onClick={(e) => {
                          e.stopPropagation();
                          if (canInteract) {
                            if (isMultiChoice) {
                              // Multi-choice: toggle this option
                              const currentSelection = Array.isArray(
                                pendingPollSelection,
                              )
                                ? pendingPollSelection
                                : [];
                              const newSelection = currentSelection.includes(
                                index,
                              )
                                ? currentSelection.filter((i) => i !== index)
                                : [...currentSelection, index];
                              setPendingPollSelection(newSelection);
                            } else {
                              // Single choice: set to this option
                              setPendingPollSelection(index);
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
                        onClick={async (e) => {
                          e.stopPropagation();
                          const voteToSubmit =
                            Array.isArray(pendingPollSelection) &&
                            pendingPollSelection.length === 0
                              ? note.pollMultipleChoice
                                ? []
                                : 0
                              : pendingPollSelection;
                          await votePoll(
                            collaborationId,
                            note.id,
                            sessionId,
                            voteToSubmit,
                          );
                          setPendingPollSelection(null);
                        }}
                        className={styles.pollSubmitButton}
                      >
                        Submit vote
                      </button>
                    )}
                  {isHost && paused && !note.pollClosed && (
                    <button
                      onClick={async (e) => {
                        e.stopPropagation();
                        await closePoll(collaborationId, note.id);
                      }}
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
            })()}
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
                        <div className={styles.historyTimestamp}>
                          {timestamp}
                        </div>
                        <div
                          dangerouslySetInnerHTML={{
                            __html: version.content.replace(/&nbsp;/g, " "),
                          }}
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
                {showResponses ? "Hide" : "Show"} {note.responses.length}{" "}
                response
                {note.responses.length !== 1 ? "s" : ""}
              </button>
            )}
            {showResponses && note.responses && (
              <div className={styles.responsesList}>
                {note.responses.map((response, idx) => {
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

                  const getResponseReactionOpacity = (_r: Reaction) => {
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
                  modules={QUILL_MODULES}
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
