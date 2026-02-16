import ReactQuill from "react-quill-new";
import "react-quill-new/dist/quill.snow.css";
import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { createNote, type NoteType } from "../../notes";
import {
  approveParticipants,
  updatePrompt,
  type Collaboration,
  type Participant,
} from "../../collaborations";
import { QUILL_MODULES } from "../../constants";
import { sanitizeHtml } from "../../utils";
import type { Session } from "../../session";
import NoteTypePanel from "../NoteTypePanel/NoteTypePanel";
import styles from "./CollabRoute.module.css";

interface CollabSidebarProps {
  collab: Collaboration;
  session: Session;
  isHost: boolean;
  allowedNoteTypes: NoteType[];
  participants: Participant[];
}

export default function CollabSidebar({
  collab,
  session,
  isHost,
  allowedNoteTypes,
  participants,
}: CollabSidebarProps) {
  const [openType, setOpenType] = useState<NoteType | null>(null);
  const [editingPrompt, setEditingPrompt] = useState(false);
  const [promptValue, setPromptValue] = useState("");
  const [checkedIds, setCheckedIds] = useState<Set<string>>(new Set());

  const pendingParticipants = useMemo(
    () => participants.filter((p) => p.status === "pending"),
    [participants],
  );
  const approvedParticipants = useMemo(
    () => participants.filter((p) => p.status === "approved"),
    [participants],
  );

  const submitNote =
    (type: NoteType) =>
    (
      html: string,
      assignee?: string,
      dueDate?: string,
      pollOptions?: string[],
      pollMultipleChoice?: boolean,
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
      );

  return (
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
                  try {
                    const timestamp =
                      collab.promptUpdatedAt ||
                      collab.startedAt ||
                      Date.now();
                    await updatePrompt(
                      collab.id,
                      promptValue,
                      collab.prompt,
                      timestamp,
                      collab.promptHistory,
                    );
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
                  } catch (error) {
                    console.error("Failed to update prompt:", error);
                    alert("Failed to update prompt. Please try again.");
                  }
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
              __html: sanitizeHtml(collab.prompt.replace(/&nbsp;/g, " ")),
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
                onToggle={() => setOpenType(openType === type ? null : type)}
                onSubmit={submitNote(type)}
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
            onSubmit={submitNote("Action item")}
            disabled={!isHost}
          />
          <NoteTypePanel
            key="Poll"
            label="Poll"
            isOpen={openType === "Poll"}
            onToggle={() => setOpenType(openType === "Poll" ? null : "Poll")}
            onSubmit={submitNote("Poll")}
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
              onSubmit={submitNote("Host note")}
              disabled={!isHost}
            />
          )}
        </>
      )}

      {/* Host: participant approval panel */}
      {isHost && (
        <>
          {pendingParticipants.length > 0 && (
            <>
              <div className={styles.sectionLabel}>Waiting to join</div>
              <div className={styles.pendingSection}>
                <label className={styles.participantRow}>
                  <input
                    type="checkbox"
                    checked={
                      pendingParticipants.length > 0 &&
                      pendingParticipants.every((p) => checkedIds.has(p.userId))
                    }
                    onChange={(e) => {
                      if (e.target.checked) {
                        setCheckedIds(
                          new Set(pendingParticipants.map((p) => p.userId)),
                        );
                      } else {
                        setCheckedIds(new Set());
                      }
                    }}
                  />
                  <span className={styles.selectAllLabel}>Select all</span>
                </label>
                {pendingParticipants.map((p) => (
                  <label key={p.userId} className={styles.participantRow}>
                    <input
                      type="checkbox"
                      checked={checkedIds.has(p.userId)}
                      onChange={(e) => {
                        const next = new Set(checkedIds);
                        if (e.target.checked) {
                          next.add(p.userId);
                        } else {
                          next.delete(p.userId);
                        }
                        setCheckedIds(next);
                      }}
                    />
                    <span>{p.displayName}</span>
                    {p.email && (
                      <span className={styles.participantEmail}>
                        {p.email}
                      </span>
                    )}
                  </label>
                ))}
                <button
                  className={styles.admitButton}
                  disabled={checkedIds.size === 0}
                  onClick={async () => {
                    try {
                      await approveParticipants(
                        collab.id,
                        Array.from(checkedIds),
                      );
                      setCheckedIds(new Set());
                    } catch (error) {
                      console.error("Failed to admit participants:", error);
                      alert("Failed to admit participants. Please try again.");
                    }
                  }}
                >
                  Admit selected
                </button>
              </div>
            </>
          )}

          <div className={styles.sectionLabelRow}>
            <span className={styles.sectionLabel}>Participants ({approvedParticipants.length + 1})</span>
            <Link to={`/collabs/${collab.id}/users`} target="_blank" className={styles.manageUsersLink}>Manage users</Link>
          </div>
          <div className={styles.approvedList}>
            <div className={styles.approvedRow}>
              {collab.startedByName} (host)
              {session.email && (
                <span className={styles.participantEmail}>
                  {session.email}
                </span>
              )}
            </div>
            {approvedParticipants.map((p) => (
              <div key={p.userId} className={styles.approvedRow}>
                {p.displayName}
                {p.email && (
                  <span className={styles.participantEmail}>
                    {p.email}
                  </span>
                )}
              </div>
            ))}
          </div>
        </>
      )}
    </aside>
  );
}
