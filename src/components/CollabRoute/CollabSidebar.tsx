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

  const handleSavePrompt = async () => {
    try {
      const timestamp = collab.promptUpdatedAt || collab.startedAt || Date.now();
      await updatePrompt(collab.id, promptValue, collab.prompt, timestamp, collab.promptHistory);
      const message = `<p>The prompt was updated to:</p>${promptValue}`;
      await createNote(collab.id, "Host note", message, session.userId, session.displayName);
      setEditingPrompt(false);
      setPromptValue("");
    } catch (error) {
      console.error("Failed to update prompt:", error);
      alert("Failed to update prompt. Please try again.");
    }
  };

  const handleAdmitSelected = async () => {
    try {
      await approveParticipants(collab.id, Array.from(checkedIds));
      setCheckedIds(new Set());
    } catch (error) {
      console.error("Failed to admit participants:", error);
      alert("Failed to admit participants. Please try again.");
    }
  };

  return (
    <aside className={styles.collabSidebar}>
      <PromptCard
        collab={collab}
        canEdit={collab.startedBy === session.userId}
        editingPrompt={editingPrompt}
        promptValue={promptValue}
        onStartEditing={() => {
          setEditingPrompt(true);
          setPromptValue(collab.prompt);
        }}
        onCancelEditing={() => {
          setEditingPrompt(false);
          setPromptValue("");
        }}
        onChangePrompt={setPromptValue}
        onSavePrompt={handleSavePrompt}
      />
      {!collab.active ? (
        <div className={styles.messageStopped}>
          This collaboration has been stopped.
        </div>
      ) : collab.paused && !isHost ? (
        <div className={styles.messagePaused}>Participation is paused.</div>
      ) : (
        <NoteTypePanels
          allowedNoteTypes={allowedNoteTypes}
          isHost={isHost}
          openType={openType}
          onToggleType={(type) => setOpenType(openType === type ? null : type)}
          submitNote={submitNote}
        />
      )}

      {/* Host: participant approval panel */}
      {isHost && (
        <>
          {pendingParticipants.length > 0 && (
            <PendingParticipantsPanel
              pendingParticipants={pendingParticipants}
              checkedIds={checkedIds}
              onCheckedIdsChange={setCheckedIds}
              onAdmitSelected={handleAdmitSelected}
            />
          )}

          <div className={styles.sectionLabelRow}>
            <span className={styles.sectionLabel}>Participants ({approvedParticipants.length + 1})</span>
            <Link to={`/collabs/${collab.id}/users`} target="_blank" className={styles.manageUsersLink}>Manage users</Link>
          </div>
          <ApprovedParticipantsList
            collab={collab}
            hostEmail={session.email}
            approvedParticipants={approvedParticipants}
          />
        </>
      )}
    </aside>
  );
}

// --- Subcomponents ---

function PromptCard({
  collab,
  canEdit,
  editingPrompt,
  promptValue,
  onStartEditing,
  onCancelEditing,
  onChangePrompt,
  onSavePrompt,
}: {
  collab: Collaboration;
  canEdit: boolean;
  editingPrompt: boolean;
  promptValue: string;
  onStartEditing: () => void;
  onCancelEditing: () => void;
  onChangePrompt: (value: string) => void;
  onSavePrompt: () => void;
}) {
  return (
    <div className={styles.promptCard}>
      <div className={styles.promptHeader}>
        <div className={styles.promptLabel}>Collaboration prompt</div>
        {canEdit && !editingPrompt && (
          <button onClick={onStartEditing} className={styles.promptEditButton}>
            Edit
          </button>
        )}
      </div>
      {editingPrompt ? (
        <>
          <ReactQuill
            theme="snow"
            value={promptValue}
            onChange={onChangePrompt}
            className={styles.promptEditor}
            modules={QUILL_MODULES}
          />
          <div className={styles.promptActions}>
            <button onClick={onCancelEditing} className={styles.promptCancel}>
              Cancel
            </button>
            <button onClick={onSavePrompt} className={styles.promptSave}>
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
  );
}

function NoteTypePanels({
  allowedNoteTypes,
  isHost,
  openType,
  onToggleType,
  submitNote,
}: {
  allowedNoteTypes: NoteType[];
  isHost: boolean;
  openType: NoteType | null;
  onToggleType: (type: NoteType) => void;
  submitNote: (type: NoteType) => (
    html: string,
    assignee?: string,
    dueDate?: string,
    pollOptions?: string[],
    pollMultipleChoice?: boolean,
  ) => Promise<void>;
}) {
  return (
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
            onToggle={() => onToggleType(type)}
            onSubmit={submitNote(type)}
          />
        ))}

      {/* Host-only note types */}
      <div className={styles.sectionLabel}>Host only</div>
      <NoteTypePanel
        key="Action item"
        label="Action item"
        isOpen={openType === "Action item"}
        onToggle={() => onToggleType("Action item")}
        onSubmit={submitNote("Action item")}
        disabled={!isHost}
      />
      <NoteTypePanel
        key="Poll"
        label="Poll"
        isOpen={openType === "Poll"}
        onToggle={() => onToggleType("Poll")}
        onSubmit={submitNote("Poll")}
        disabled={!isHost}
      />
      {allowedNoteTypes.includes("Host note") && (
        <NoteTypePanel
          key="Host note"
          label="Host note"
          isOpen={openType === "Host note"}
          onToggle={() => onToggleType("Host note")}
          onSubmit={submitNote("Host note")}
          disabled={!isHost}
        />
      )}
    </>
  );
}

function PendingParticipantsPanel({
  pendingParticipants,
  checkedIds,
  onCheckedIdsChange,
  onAdmitSelected,
}: {
  pendingParticipants: Participant[];
  checkedIds: Set<string>;
  onCheckedIdsChange: (ids: Set<string>) => void;
  onAdmitSelected: () => void;
}) {
  const allChecked =
    pendingParticipants.length > 0 &&
    pendingParticipants.every((p) => checkedIds.has(p.userId));

  return (
    <>
      <div className={styles.sectionLabel}>Waiting to join</div>
      <div className={styles.pendingSection}>
        <label className={styles.participantRow}>
          <input
            type="checkbox"
            checked={allChecked}
            onChange={(e) => {
              if (e.target.checked) {
                onCheckedIdsChange(
                  new Set(pendingParticipants.map((p) => p.userId)),
                );
              } else {
                onCheckedIdsChange(new Set());
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
                onCheckedIdsChange(next);
              }}
            />
            <span>{p.displayName}</span>
            {p.email && (
              <span className={styles.participantEmail}>{p.email}</span>
            )}
          </label>
        ))}
        <button
          className={styles.admitButton}
          disabled={checkedIds.size === 0}
          onClick={onAdmitSelected}
        >
          Admit selected
        </button>
      </div>
    </>
  );
}

function ApprovedParticipantsList({
  collab,
  hostEmail,
  approvedParticipants,
}: {
  collab: Collaboration;
  hostEmail: string;
  approvedParticipants: Participant[];
}) {
  return (
    <div className={styles.approvedList}>
      <div className={styles.approvedRow}>
        {collab.startedByName} (host)
        {hostEmail && (
          <span className={styles.participantEmail}>{hostEmail}</span>
        )}
      </div>
      {approvedParticipants.map((p) => (
        <div key={p.userId} className={styles.approvedRow}>
          {p.displayName}
          {p.email && (
            <span className={styles.participantEmail}>{p.email}</span>
          )}
        </div>
      ))}
    </div>
  );
}
