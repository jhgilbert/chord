import ReactQuill from "react-quill-new";
import "react-quill-new/dist/quill.snow.css";
import { useState } from "react";
import { createNote, type NoteType } from "../../notes";
import { updatePrompt, type Collaboration } from "../../collaborations";
import { QUILL_MODULES } from "../../constants";
import type { Session } from "../../session";
import NoteTypePanel from "../NoteTypePanel/NoteTypePanel";
import styles from "./CollabRoute.module.css";

interface CollabSidebarProps {
  collab: Collaboration;
  session: Session;
  isHost: boolean;
  allowedNoteTypes: NoteType[];
}

export default function CollabSidebar({
  collab,
  session,
  isHost,
  allowedNoteTypes,
}: CollabSidebarProps) {
  const [openType, setOpenType] = useState<NoteType | null>(null);
  const [editingPrompt, setEditingPrompt] = useState(false);
  const [promptValue, setPromptValue] = useState("");

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
    </aside>
  );
}
