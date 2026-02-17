import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
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
  const location = useLocation();
  const session = getSession();

  // Redirect to login if not authenticated
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

  const users = buildUserList(notes, participants, collab, currentTime);

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
        <div className={styles.usersHeaderRow}>
          <div className={styles.usersHeader}>
            <button
              onClick={() => navigate(`/collabs/${id}`)}
              className={styles.backButton}
            >
              ← Back to collaboration
            </button>
            <h1>Participants ({users.length})</h1>
          </div>
          <div className={styles.userMenu}>
            <span className={styles.userEmail}>{session.email}</span>
            <Link to="/logout" className={styles.signOutLink}>Sign out</Link>
          </div>
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
                <UserRow
                  key={user.userId}
                  user={user}
                  onRevoke={handleRevoke}
                />
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// --- Types ---

type UserActivity = {
  userId: string;
  displayName: string;
  lastActivityTime: number;
  contributionCount: number;
  notesCount: number;
  reactionsCount: number;
  responsesCount: number;
};

type UserRow = UserActivity & {
  formattedTime: string;
  isHostUser: boolean;
  status: "host" | "pending" | "approved" | "revoked";
};

// --- Subcomponents ---

function UserRow({
  user,
  onRevoke,
}: {
  user: UserRow;
  onRevoke: (userId: string) => void;
}) {
  return (
    <tr>
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
          <span className={styles.statusBadge} data-status="revoked">
            Revoked
          </span>
        ) : (
          <>
            <span className={styles.statusBadge} data-status="approved">
              Active
            </span>{" "}
            <button
              onClick={() => onRevoke(user.userId)}
              className={styles.revokeButton}
            >
              Revoke
            </button>
          </>
        )}
      </td>
    </tr>
  );
}

// --- Helper functions ---

function buildUserList(
  notes: Note[],
  participants: Participant[],
  collab: Collaboration,
  currentTime: number,
): UserRow[] {
  const userMap = new Map<string, UserActivity>();

  const getOrCreate = (userId: string, displayName: string): UserActivity => {
    if (!userMap.has(userId)) {
      userMap.set(userId, {
        userId,
        displayName,
        lastActivityTime: 0,
        contributionCount: 0,
        notesCount: 0,
        reactionsCount: 0,
        responsesCount: 0,
      });
    }
    return userMap.get(userId)!;
  };

  const updateActivity = (user: UserActivity, timestamp: number) => {
    if (timestamp > user.lastActivityTime) {
      user.lastActivityTime = timestamp;
    }
  };

  // Process notes
  for (const note of notes) {
    const user = getOrCreate(note.createdBy, note.createdByName);
    user.contributionCount++;
    user.notesCount++;

    const timestamp = extractTimestamp(note.createdAt);
    updateActivity(user, timestamp);

    // Count reactions on this note
    if (note.reactions) {
      for (const reactorId of Object.keys(note.reactions)) {
        const reactor = getOrCreate(reactorId, reactorId);
        reactor.contributionCount++;
        reactor.reactionsCount++;
        updateActivity(reactor, timestamp);
      }
    }

    // Count responses and reactions on responses
    if (note.responses) {
      for (const response of note.responses) {
        const responder = getOrCreate(response.createdBy, response.createdByName);
        responder.contributionCount++;
        responder.responsesCount++;
        const responseTime =
          typeof response.createdAt === "number" ? response.createdAt : 0;
        updateActivity(responder, responseTime);

        if (response.reactions) {
          for (const reactorId of Object.keys(response.reactions)) {
            const reactor = getOrCreate(reactorId, reactorId);
            reactor.contributionCount++;
            reactor.reactionsCount++;
            updateActivity(reactor, responseTime);
          }
        }
      }
    }
  }

  // Fix display names for users who only reacted (displayName === userId)
  userMap.forEach((user, userId) => {
    if (user.displayName === userId) {
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

  // Add participants who haven't submitted anything yet
  for (const p of participants) {
    getOrCreate(p.userId, p.displayName);
  }

  // Ensure the host always appears
  getOrCreate(collab.startedBy, collab.startedByName);

  // Build participant status lookup
  const participantStatusMap = new Map<string, Participant["status"]>();
  for (const p of participants) {
    participantStatusMap.set(p.userId, p.status);
  }

  // Convert to sorted array with formatted times
  return Array.from(userMap.values())
    .sort((a, b) => b.lastActivityTime - a.lastActivityTime)
    .map((user) => {
      const isHostUser = user.userId === collab.startedBy;
      const status = isHostUser
        ? "host" as const
        : (participantStatusMap.get(user.userId) || "approved");

      return {
        ...user,
        formattedTime: formatRelativeTime(user.lastActivityTime, currentTime),
        isHostUser,
        status,
      };
    });
}

function extractTimestamp(createdAt: unknown): number {
  const time = createdAt as { toDate?: () => Date; seconds?: number } | null;
  if (time?.toDate) return time.toDate().getTime();
  if (time?.seconds) return time.seconds * 1000;
  if (typeof createdAt === "number") return createdAt;
  return 0;
}

function formatRelativeTime(timestamp: number, currentTime: number): string {
  if (timestamp === 0 || currentTime === 0) return "No activity";

  const diff = currentTime - timestamp;
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (seconds < 60)
    return `${seconds} second${seconds !== 1 ? "s" : ""} ago`;
  if (minutes < 60)
    return `${minutes} minute${minutes !== 1 ? "s" : ""} ago`;
  if (hours < 24)
    return `${hours} hour${hours !== 1 ? "s" : ""} ago`;
  return `${days} day${days !== 1 ? "s" : ""} ago`;
}
