import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { getSession } from "../../session";
import { getUserCollaborations, type Collaboration } from "../../collaborations";
import styles from "./CollabsListScreen.module.css";

export default function CollabsListScreen() {
  const navigate = useNavigate();
  const location = useLocation();
  const session = getSession();
  const [collabs, setCollabs] = useState<Collaboration[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!session) {
      navigate("/login", { replace: true, state: { from: location.pathname } });
      return;
    }

    const loadCollabs = async () => {
      try {
        const userCollabs = await getUserCollaborations(session.userId);
        // Sort by most recent first
        userCollabs.sort((a, b) => {
          const aTime = a.startedAt as unknown as
            | { toDate?: () => Date }
            | number;
          const bTime = b.startedAt as unknown as
            | { toDate?: () => Date }
            | number;
          if (!aTime) return 1;
          if (!bTime) return -1;
          const aMs =
            typeof aTime === "object" && aTime.toDate
              ? aTime.toDate().getTime()
              : (aTime as number);
          const bMs =
            typeof bTime === "object" && bTime.toDate
              ? bTime.toDate().getTime()
              : (bTime as number);
          return bMs - aMs;
        });
        setCollabs(userCollabs);
      } catch (error) {
        console.error("Error loading collaborations:", error);
      } finally {
        setLoading(false);
      }
    };

    loadCollabs();
  }, [session, navigate]);

  if (!session) return null;

  if (loading) {
    return (
      <div className={styles.screenContainer}>
        <h1 className={styles.screenTitle}>Your Collaborations</h1>
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <div className={styles.screenContainer}>
      <h1 className={styles.screenTitle}>Your Collaborations</h1>
      <p className={styles.screenUser}>
        Logged in as: <b>{session.displayName}</b>
      </p>
      {collabs.length === 0 ? (
        <EmptyState onNavigate={() => navigate("/")} />
      ) : (
        <CollabsTable collabs={collabs} onNavigate={navigate} />
      )}
    </div>
  );
}

// --- Subcomponents ---

function EmptyState({ onNavigate }: { onNavigate: () => void }) {
  return (
    <div style={{ marginTop: "32px", textAlign: "center" }}>
      <p style={{ marginBottom: "16px" }}>
        You haven't created any collaborations yet.
      </p>
      <button onClick={onNavigate} className={styles.actionButton}>
        Create collaboration
      </button>
    </div>
  );
}

function CollabsTable({
  collabs,
  onNavigate,
}: {
  collabs: Collaboration[];
  onNavigate: (path: string) => void;
}) {
  return (
    <div style={{ marginTop: "32px", width: "100%", maxWidth: "1000px" }}>
      <div
        style={{
          marginBottom: "16px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <h2 style={{ margin: 0, fontSize: "18px" }}>
          Your Collaborations ({collabs.length})
        </h2>
        <button
          onClick={() => onNavigate("/")}
          className={styles.actionButton}
          style={{ padding: "8px 16px", fontSize: "14px" }}
        >
          Create new
        </button>
      </div>
      <table className={styles.collabsTable}>
        <thead>
          <tr>
            <th>Title</th>
            <th>Prompt</th>
            <th>Status</th>
            <th>Created</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {collabs.map((collab) => (
            <CollabRow
              key={collab.id}
              collab={collab}
              onNavigate={onNavigate}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}

function CollabRow({
  collab,
  onNavigate,
}: {
  collab: Collaboration;
  onNavigate: (path: string) => void;
}) {
  const truncatedPrompt = truncateHtml(collab.prompt, 100);
  const createdDate = formatCollabDate(collab.startedAt);

  return (
    <tr>
      <td style={{ fontWeight: 600 }}>{collab.title}</td>
      <td style={{ fontSize: "13px", color: "#666" }}>{truncatedPrompt}</td>
      <td>
        {collab.active ? (
          <span style={{ color: "#16a34a", fontWeight: 600 }}>Active</span>
        ) : (
          <span style={{ color: "#9ca3af", fontWeight: 600 }}>Ended</span>
        )}
      </td>
      <td style={{ fontSize: "13px", color: "#666" }}>{createdDate}</td>
      <td style={{ display: "flex", gap: "6px" }}>
        <button
          onClick={() => onNavigate(`/collabs/${collab.id}`)}
          style={{
            padding: "6px 12px",
            fontSize: "13px",
            background: "#0066cc",
            color: "#fff",
            border: "none",
            borderRadius: "4px",
            cursor: "pointer",
            fontWeight: 600,
          }}
        >
          View
        </button>
        <button
          onClick={() => onNavigate(`/collabs/${collab.id}/users`)}
          style={{
            padding: "6px 12px",
            fontSize: "13px",
            background: "#374151",
            color: "#fff",
            border: "none",
            borderRadius: "4px",
            cursor: "pointer",
            fontWeight: 600,
          }}
        >
          Users
        </button>
      </td>
    </tr>
  );
}

// --- Helper functions ---

function truncateHtml(html: string, maxLength: number): string {
  const tempDiv = document.createElement("div");
  tempDiv.innerHTML = html.replace(/&nbsp;/g, " ");
  const text = (tempDiv.textContent || tempDiv.innerText || "").trim();
  return text.length > maxLength ? text.substring(0, maxLength) + "..." : text;
}

function formatCollabDate(startedAt: unknown): string {
  if (!startedAt) return "Unknown";
  const time = startedAt as { toDate?: () => Date } | number;
  if (typeof time === "object" && time.toDate) {
    return time.toDate().toLocaleDateString();
  }
  if (typeof time === "number") {
    return new Date(time).toLocaleDateString();
  }
  return "Unknown";
}
