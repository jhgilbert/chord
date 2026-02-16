import type { Note, Reaction } from "../../notes";
import type { Collaboration, PromptVersion } from "../../collaborations";

export type PromptWithTimestamp = PromptVersion & { timestampMs: number };

/** Convert a Firestore Timestamp, seconds number, or plain number to milliseconds */
export function getTimestamp(time: unknown): number {
  if (!time) return 0;
  const ts = time as { toDate?: () => Date; seconds?: number };
  if (ts.toDate) return ts.toDate().getTime();
  if (ts.seconds) return ts.seconds * 1000;
  if (typeof time === "number") return time;
  return 0;
}

/** Format a Firestore timestamp as a locale string */
export function formatTimestamp(time: unknown): string {
  if (!time) return "Unknown time";
  const ts = time as { toDate?: () => Date; seconds?: number };
  if (ts.toDate) return ts.toDate().toLocaleString();
  if (ts.seconds) return new Date(ts.seconds * 1000).toLocaleString();
  if (typeof time === "number") return new Date(time).toLocaleString();
  return "Unknown time";
}

/** Build sorted prompt timeline from collaboration data */
export function buildPromptTimeline(
  collab: Collaboration,
): PromptWithTimestamp[] {
  return [
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
}

/** Get the prompt that was active when a note was created */
export function getPromptForNote(
  note: Note,
  allPrompts: PromptWithTimestamp[],
): string {
  const noteTime = getTimestamp(note.createdAt);
  for (let i = 0; i < allPrompts.length; i++) {
    const startTime = allPrompts[i].timestampMs;
    const endTime =
      i < allPrompts.length - 1 ? allPrompts[i + 1].timestampMs : Infinity;
    if (noteTime >= startTime && noteTime < endTime) {
      return stripHtml(allPrompts[i].prompt);
    }
  }
  return "";
}

/** Get display name with "(host)" suffix when appropriate */
export function getAuthorName(
  userId: string,
  hostId: string,
  displayName: string,
  noteType?: string,
): string {
  if (userId === hostId && noteType !== "Host note") {
    return `${displayName} (host)`;
  }
  return displayName;
}

/** Strip HTML tags from a string using the DOM */
export function stripHtml(html: string): string {
  const tempDiv = document.createElement("div");
  tempDiv.innerHTML = html.replace(/&nbsp;/g, " ");
  return tempDiv.textContent || tempDiv.innerText || "";
}

/** Categorize reactions into agreed/disagreed/markRead name lists */
export function categorizeReactions(
  reactions: Record<string, Reaction>,
  notes: Note[],
  hostId: string,
): { agreed: string[]; disagreed: string[]; markRead: string[] } {
  const agreed: string[] = [];
  const disagreed: string[] = [];
  const markRead: string[] = [];

  for (const [sessionId, reaction] of Object.entries(reactions)) {
    let name = sessionId;
    const noteByUser = notes.find((n) => n.createdBy === sessionId);
    if (noteByUser) {
      name =
        noteByUser.createdBy === hostId
          ? `${noteByUser.createdByName} (host)`
          : noteByUser.createdByName;
    }

    if (reaction === "agree") agreed.push(name);
    else if (reaction === "disagree") disagreed.push(name);
    else if (reaction === "markRead") markRead.push(name);
  }

  return { agreed, disagreed, markRead };
}
