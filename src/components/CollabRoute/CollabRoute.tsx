import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Link,
  Navigate,
  useLocation,
  useNavigate,
  useParams,
} from "react-router-dom";
import { getSession } from "../../session";
import {
  createNote,
  subscribeNotes,
  type Note,
  type NoteType,
} from "../../notes";
import {
  endCollaboration,
  pauseCollaboration,
  requestToJoin,
  subscribeCollaboration,
  subscribeMyParticipantStatus,
  subscribeParticipants,
  updateAllowedNoteTypes,
  updateShowAuthorNames,
  type Collaboration,
  type Participant,
} from "../../collaborations";
import { NOTE_TYPES } from "../../constants";
import { useClickOutside } from "../../hooks/useClickOutside";
import NotesLogo from "../NotesLogo/NotesLogo";
import CollabReport from "./CollabReport";
import CollabSidebar from "./CollabSidebar";
import CollabNotesList from "./CollabNotesList";
import WaitingRoom from "./WaitingRoom";
import styles from "./CollabRoute.module.css";

export default function CollabRoute() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const session = getSession();

  useEffect(() => {
    if (!session) {
      navigate("/login", { replace: true, state: { from: location.pathname } });
    }
  }, [session, navigate, location.pathname]);

  const [collab, setCollab] = useState<Collaboration | null | undefined>(
    undefined,
  );
  const [notes, setNotes] = useState<Note[]>([]);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [myStatus, setMyStatus] = useState<
    "pending" | "approved" | "revoked" | null
  >(null);
  const [showNoteTypeSettings, setShowNoteTypeSettings] = useState(false);
  const [showHostActions, setShowHostActions] = useState(false);
  const noteTypeSettingsRef = useRef<HTMLDivElement>(null);
  const hostActionsRef = useRef<HTMLDivElement>(null);

  const closeNoteTypeSettings = useCallback(
    () => setShowNoteTypeSettings(false),
    [],
  );
  useClickOutside(
    noteTypeSettingsRef,
    closeNoteTypeSettings,
    showNoteTypeSettings,
  );

  const closeHostActions = useCallback(() => setShowHostActions(false), []);
  useClickOutside(hostActionsRef, closeHostActions, showHostActions);

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

  // Subscribe to own participant status immediately (no need to wait for collab)
  useEffect(() => {
    if (!id || !session) return;
    const unsub = subscribeMyParticipantStatus(
      id,
      session.userId,
      setMyStatus,
    );
    return () => unsub();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- use stable primitives
  }, [id, session?.userId]);

  // Once collab loads: host subscribes to all participants; non-host requests to join
  useEffect(() => {
    if (!id || !session || !collab) return;
    if (collab.startedBy === session.userId) {
      const unsub = subscribeParticipants(id, setParticipants);
      return () => unsub();
    } else {
      requestToJoin(id, session.userId, session.displayName, session.email);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- use stable primitives
  }, [id, session?.userId, collab?.startedBy]);

  const activityTick = useMemo(() => {
    let count = notes.length;
    for (const note of notes) {
      if (note.reactions) count += Object.keys(note.reactions).length;
      if (note.responses) {
        count += note.responses.length;
        for (const r of note.responses) {
          if (r.reactions) count += Object.keys(r.reactions).length;
        }
      }
      if (note.pollVotes) count += Object.keys(note.pollVotes).length;
      if (note.editHistory) count += note.editHistory.length;
      if (note.archived) count += 1;
    }
    return count;
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

  // Get allowed note types, sorted by NOTE_TYPES order
  const allowedNoteTypes = (collab.allowedNoteTypes || NOTE_TYPES).sort(
    (a, b) => NOTE_TYPES.indexOf(a) - NOTE_TYPES.indexOf(b),
  );

  const toggleNoteTypeInCollab = async (type: NoteType, enable: boolean) => {
    try {
      const newAllowedTypes = enable
        ? [...allowedNoteTypes, type]
        : allowedNoteTypes.filter((t) => t !== type);

      await updateAllowedNoteTypes(collab.id, newAllowedTypes);

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
    } catch (error) {
      console.error("Failed to update note types:", error);
      alert("Failed to update note types. Please try again.");
    }
  };

  // Non-host users must be approved before seeing anything
  if (!isHost && myStatus !== "approved") {
    if (!collab.active) {
      return (
        <div className={styles.notFound}>
          <p>This collaboration has ended.</p>
          <button onClick={() => navigate("/")} className={styles.homeButton}>
            Go to Home
          </button>
        </div>
      );
    }
    return <WaitingRoom title={collab.title} />;
  }

  if (!collab.active) {
    return (
      <CollabReport
        collab={collab}
        notes={notes}
        session={session}
        isHost={isHost}
      />
    );
  }

  return (
    <div className={styles.collabContainer}>
      {/* Header */}
      <div className={styles.collabHeader}>
        <div className={styles.collabHeaderLeft}>
          <NotesLogo tick={collab.paused ? 0 : activityTick} />
          <span className={styles.collabHeaderTitle}>{collab.title}</span>
          <span className={styles.collabHeaderMeta}>
            {isHost ? (
              "You are the host."
            ) : (
              <>
                Hosted by <b>{collab.startedByName}</b>
              </>
            )}
          </span>
        </div>
        <div className={styles.collabHeaderActions}>
          {!collab.active && (
            <span className={styles.badgeStopped}>Stopped</span>
          )}
          {collab.paused && collab.active && (
            <span className={styles.badgePaused}>Input paused</span>
          )}
          {isHost && collab.active && (
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
                          >
                            <input
                              type="checkbox"
                              checked={isEnabled}
                              onChange={() =>
                                toggleNoteTypeInCollab(type, !isEnabled)
                              }
                            />
                            <span>{type}</span>
                          </label>
                        );
                      },
                    )}
                  </div>
                )}
              </div>
              <div
                className={styles.noteTypeSettingsContainer}
                ref={hostActionsRef}
              >
                <button
                  onClick={() => setShowHostActions(!showHostActions)}
                  className={styles.buttonNoteTypes}
                >
                  Host actions {showHostActions ? "▲" : "▼"}
                </button>
                {showHostActions && (
                  <div className={styles.noteTypeSettingsDropdown}>
                    <button
                      onClick={async () => {
                        try {
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
                        } catch (error) {
                          console.error(
                            "Failed to update author names setting:",
                            error,
                          );
                          alert("Failed to update setting. Please try again.");
                        }
                      }}
                      className={styles.noteTypeSettingsOption}
                    >
                      {collab.showAuthorNames !== false
                        ? "Hide author names"
                        : "Show author names"}
                    </button>
                    <button
                      onClick={async () => {
                        try {
                          await endCollaboration(collab.id);
                        } catch (error) {
                          console.error("Failed to end collaboration:", error);
                          alert(
                            "Failed to end collaboration. Please try again.",
                          );
                        }
                      }}
                      className={styles.noteTypeSettingsOption}
                      style={{ color: "#dc2626" }}
                    >
                      End collaboration
                    </button>
                  </div>
                )}
              </div>
              <button
                onClick={async () => {
                  try {
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
                  } catch (error) {
                    console.error(
                      "Failed to pause/resume collaboration:",
                      error,
                    );
                    alert("Failed to update collaboration. Please try again.");
                  }
                }}
                className={styles.buttonPause}
                data-paused={collab.paused}
              >
                {collab.paused ? "Resume" : "Pause"}
              </button>
            </>
          )}
          <div className={styles.userMenu}>
            <span className={styles.userEmail}>{session.email}</span>
            <Link to="/logout" className={styles.buttonLogout}>Sign out</Link>
          </div>
        </div>
      </div>

      {/* Two-column layout */}
      <div className={styles.collabLayout}>
        <CollabSidebar
          collab={collab}
          session={session}
          isHost={isHost}
          allowedNoteTypes={allowedNoteTypes}
          participants={participants}
        />
        <CollabNotesList
          collab={collab}
          notes={notes}
          session={session}
          isHost={isHost}
          allowedNoteTypes={allowedNoteTypes}
        />
      </div>
    </div>
  );
}
