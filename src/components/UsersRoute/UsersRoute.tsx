import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { getSession } from "../../session";
import {
  revokeParticipant,
  subscribeCollaboration,
  subscribeParticipants,
  type Collaboration,
  type Participant,
} from "../../collaborations";
import { subscribeNotes, type Note } from "../../notes";
import styles from "./UsersRoute.module.css";

export default function UsersRoute() {
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
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [currentTime, setCurrentTime] = useState(0);

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

  useEffect(() => {
    if (!id) return;
    const unsub = subscribeParticipants(id, setParticipants);
    return () => unsub();
  }, [id]);

  // Update current time when component mounts and whenever notes change
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setCurrentTime(Date.now());
  }, [notes]);

  if (!session) return null;
  if (collab === undefined)
    return <div className={styles.loading}>Loading...</div>;
  if (collab === null)
    return <div className={styles.error}>Collaboration not found</div>;

  const isHost = collab.startedBy === session.userId;

  // Redirect non-hosts back to the collaboration page
  if (!isHost) {
    navigate(`/collabs/${id}`, { replace: true });
    return null;
  }

  // Calculate user statistics
  type UserActivity = {
    userId: string;
    displayName: string;
    lastActivityTime: number;
    contributionCount: number;
    notesCount: number;
    reactionsCount: number;
    responsesCount: number;
  };

  const userMap = new Map<string, UserActivity>();

  // Process notes
  notes.forEach((note) => {
    if (!userMap.has(note.createdBy)) {
      userMap.set(note.createdBy, {
        userId: note.createdBy,
        displayName: note.createdByName,
        lastActivityTime: 0,
        contributionCount: 0,
        notesCount: 0,
        reactionsCount: 0,
        responsesCount: 0,
      });
    }

    const user = userMap.get(note.createdBy)!;
    user.contributionCount++; // Count the note
    user.notesCount++; // Count the note
    const noteTime = note.createdAt as unknown as {
      toDate?: () => Date;
      seconds?: number;
    };
    let timestamp = 0;

    if (noteTime?.toDate) {
      timestamp = noteTime.toDate().getTime();
    } else if (noteTime?.seconds) {
      timestamp = noteTime.seconds * 1000;
    } else if (typeof note.createdAt === "number") {
      timestamp = note.createdAt;
    }

    if (timestamp > user.lastActivityTime) {
      user.lastActivityTime = timestamp;
    }

    // Check reactions on this note
    if (note.reactions) {
      Object.keys(note.reactions).forEach((reactorId) => {
        if (!userMap.has(reactorId)) {
          userMap.set(reactorId, {
            userId: reactorId,
            displayName: reactorId, // We don't have the name for reactors
            lastActivityTime: timestamp, // Use note time as approximation
            contributionCount: 0,
            notesCount: 0,
            reactionsCount: 0,
            responsesCount: 0,
          });
        }

        const reactor = userMap.get(reactorId)!;
        reactor.contributionCount++; // Count the reaction
        reactor.reactionsCount++; // Count the reaction
        if (timestamp > reactor.lastActivityTime) {
          reactor.lastActivityTime = timestamp;
        }
      });
    }

    // Check responses
    if (note.responses) {
      note.responses.forEach((response) => {
        if (!userMap.has(response.createdBy)) {
          userMap.set(response.createdBy, {
            userId: response.createdBy,
            displayName: response.createdByName,
            lastActivityTime: 0,
            contributionCount: 0,
            notesCount: 0,
            reactionsCount: 0,
            responsesCount: 0,
          });
        }

        const responder = userMap.get(response.createdBy)!;
        responder.contributionCount++; // Count the response
        responder.responsesCount++; // Count the response
        const responseTime =
          typeof response.createdAt === "number" ? response.createdAt : 0;

        if (responseTime > responder.lastActivityTime) {
          responder.lastActivityTime = responseTime;
        }

        // Check reactions on responses
        if (response.reactions) {
          Object.keys(response.reactions).forEach((reactorId) => {
            if (!userMap.has(reactorId)) {
              userMap.set(reactorId, {
                userId: reactorId,
                displayName: reactorId,
                lastActivityTime: responseTime,
                contributionCount: 0,
                notesCount: 0,
                reactionsCount: 0,
                responsesCount: 0,
              });
            }

            const reactor = userMap.get(reactorId)!;
            reactor.contributionCount++; // Count the reaction
            reactor.reactionsCount++; // Count the reaction
            if (responseTime > reactor.lastActivityTime) {
              reactor.lastActivityTime = responseTime;
            }
          });
        }
      });
    }
  });

  // Second pass: fix display names for users who only reacted (displayName === userId)
  userMap.forEach((user, userId) => {
    if (user.displayName === userId) {
      // Try to find this user's actual name from their notes or responses
      for (const note of notes) {
        if (note.createdBy === userId) {
          user.displayName = note.createdByName;
          return;
        }
        if (note.responses) {
          for (const response of note.responses) {
            if (response.createdBy === userId) {
              user.displayName = response.createdByName;
              return;
            }
          }
        }
      }
    }
  });

  // Third pass: add participants who haven't submitted anything yet
  for (const p of participants) {
    if (!userMap.has(p.userId)) {
      userMap.set(p.userId, {
        userId: p.userId,
        displayName: p.displayName,
        lastActivityTime: 0,
        contributionCount: 0,
        notesCount: 0,
        reactionsCount: 0,
        responsesCount: 0,
      });
    }
  }

  // Ensure the host always appears
  if (!userMap.has(collab.startedBy)) {
    userMap.set(collab.startedBy, {
      userId: collab.startedBy,
      displayName: collab.startedByName,
      lastActivityTime: 0,
      contributionCount: 0,
      notesCount: 0,
      reactionsCount: 0,
      responsesCount: 0,
    });
  }

  // Convert to array and sort by most recent activity
  const usersArray = Array.from(userMap.values()).sort(
    (a, b) => b.lastActivityTime - a.lastActivityTime,
  );

  // Build participant status lookup
  const participantStatusMap = new Map<string, Participant["status"]>();
  for (const p of participants) {
    participantStatusMap.set(p.userId, p.status);
  }

  // Pre-compute formatted times
  const users = usersArray.map((user) => {
    let formattedTime = "No activity";

    if (user.lastActivityTime !== 0 && currentTime !== 0) {
      const diff = currentTime - user.lastActivityTime;
      const seconds = Math.floor(diff / 1000);
      const minutes = Math.floor(seconds / 60);
      const hours = Math.floor(minutes / 60);
      const days = Math.floor(hours / 24);

      if (seconds < 60)
        formattedTime = `${seconds} second${seconds !== 1 ? "s" : ""} ago`;
      else if (minutes < 60)
        formattedTime = `${minutes} minute${minutes !== 1 ? "s" : ""} ago`;
      else if (hours < 24)
        formattedTime = `${hours} hour${hours !== 1 ? "s" : ""} ago`;
      else formattedTime = `${days} day${days !== 1 ? "s" : ""} ago`;
    }

    const isHostUser = user.userId === collab.startedBy;
    const status = isHostUser
      ? "host" as const
      : (participantStatusMap.get(user.userId) || "approved");

    return { ...user, formattedTime, isHostUser, status };
  });

  const handleRevoke = async (userId: string) => {
    try {
      await revokeParticipant(id!, userId);
    } catch (error) {
      console.error("Failed to revoke participant:", error);
      alert("Failed to revoke participant. Please try again.");
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.usersPage}>
        <div className={styles.usersHeader}>
          <button
            onClick={() => navigate(`/collabs/${id}`)}
            className={styles.backButton}
          >
            ← Back to collaboration
          </button>
          <h1>Participants ({users.length})</h1>
        </div>
        <div className={styles.usersContent}>
          <table className={styles.usersTable}>
            <thead>
              <tr>
                <th>User</th>
                <th>Notes</th>
                <th>Reactions</th>
                <th>Responses</th>
                <th>Total</th>
                <th>Last Activity</th>
                <th>Access</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.userId}>
                  <td>{user.displayName}</td>
                  <td>{user.notesCount}</td>
                  <td>{user.reactionsCount}</td>
                  <td>{user.responsesCount}</td>
                  <td>{user.contributionCount}</td>
                  <td>{user.formattedTime}</td>
                  <td>
                    {user.isHostUser ? (
                      <span className={styles.statusBadge} data-status="host">
                        Host
                      </span>
                    ) : user.status === "revoked" ? (
                      <span
                        className={styles.statusBadge}
                        data-status="revoked"
                      >
                        Revoked
                      </span>
                    ) : (
                      <>
                        <span
                          className={styles.statusBadge}
                          data-status="approved"
                        >
                          Active
                        </span>{" "}
                        <button
                          onClick={() => handleRevoke(user.userId)}
                          className={styles.revokeButton}
                        >
                          Revoke
                        </button>
                      </>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
