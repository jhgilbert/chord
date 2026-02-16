import {
  collection,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  writeBatch,
} from "firebase/firestore";
import { db } from "./firebase";
import type { NoteType } from "./notes";

export type PromptVersion = {
  prompt: string; // HTML from Quill
  timestamp: unknown; // Date.now()
};

export type Collaboration = {
  id: string;
  title: string;
  prompt: string; // HTML from Quill (current prompt)
  promptUpdatedAt?: unknown; // Timestamp of current prompt (Date.now())
  startedBy: string;
  startedByName: string;
  startedAt?: unknown;
  active: boolean;
  paused?: boolean;
  allowedNoteTypes: NoteType[];
  promptHistory?: PromptVersion[]; // Previous versions
  showAuthorNames?: boolean; // Whether to show author names while active (default true)
};

export function subscribeCollaboration(
  id: string,
  cb: (collab: Collaboration | null) => void,
) {
  return onSnapshot(doc(db, "collaborations", id), (snap) => {
    if (!snap.exists()) {
      cb(null);
    } else {
      cb({ id: snap.id, ...(snap.data() as Omit<Collaboration, "id">) });
    }
  });
}

export async function startCollaboration(
  id: string,
  sessionId: string,
  displayName: string,
  title: string,
  prompt: string,
  allowedNoteTypes: NoteType[],
  showAuthorNames: boolean,
) {
  await setDoc(doc(db, "collaborations", id), {
    title,
    prompt,
    startedBy: sessionId,
    startedByName: displayName,
    startedAt: serverTimestamp(),
    active: true,
    allowedNoteTypes,
    showAuthorNames,
  });
}

export async function endCollaboration(id: string) {
  await updateDoc(doc(db, "collaborations", id), { active: false });
}

export async function resumeCollaboration(id: string) {
  await updateDoc(doc(db, "collaborations", id), { active: true, paused: false });
}

export async function pauseCollaboration(id: string, paused: boolean) {
  await updateDoc(doc(db, "collaborations", id), { paused });
}

export async function updatePrompt(
  id: string,
  newPrompt: string,
  currentPrompt: string,
  currentPromptTimestamp: unknown,
  existingHistory?: PromptVersion[],
) {
  // Add current prompt to history with its timestamp
  const newHistoryEntry: PromptVersion = {
    prompt: currentPrompt,
    timestamp: currentPromptTimestamp || Date.now(),
  };

  await updateDoc(doc(db, "collaborations", id), {
    prompt: newPrompt,
    promptUpdatedAt: Date.now(),
    promptHistory: [...(existingHistory || []), newHistoryEntry],
  });
}

export async function updateAllowedNoteTypes(id: string, allowedNoteTypes: NoteType[]) {
  await updateDoc(doc(db, "collaborations", id), { allowedNoteTypes });
}

export async function updateShowAuthorNames(id: string, showAuthorNames: boolean) {
  await updateDoc(doc(db, "collaborations", id), { showAuthorNames });
}

export async function getUserCollaborations(userId: string): Promise<Collaboration[]> {
  const q = query(
    collection(db, "collaborations"),
    where("startedBy", "==", userId)
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...(doc.data() as Omit<Collaboration, "id">)
  }));
}

// --- Participant approval ---

export type Participant = {
  userId: string;
  displayName: string;
  email: string;
  status: "pending" | "approved" | "revoked";
  requestedAt: unknown;
};

export async function requestToJoin(
  collabId: string,
  userId: string,
  displayName: string,
  email: string,
) {
  const ref = doc(db, "collaborations", collabId, "participants", userId);
  const snap = await getDoc(ref);
  if (snap.exists()) return; // already requested or approved
  await setDoc(ref, {
    displayName,
    email,
    status: "pending",
    requestedAt: serverTimestamp(),
  });
}

export async function approveParticipants(
  collabId: string,
  userIds: string[],
) {
  const batch = writeBatch(db);
  for (const userId of userIds) {
    const ref = doc(db, "collaborations", collabId, "participants", userId);
    batch.update(ref, { status: "approved" });
  }
  await batch.commit();
}

export async function revokeParticipant(
  collabId: string,
  userId: string,
) {
  const ref = doc(db, "collaborations", collabId, "participants", userId);
  await updateDoc(ref, { status: "revoked" });
}

export function subscribeParticipants(
  collabId: string,
  cb: (participants: Participant[]) => void,
) {
  return onSnapshot(
    collection(db, "collaborations", collabId, "participants"),
    (snap) => {
      cb(
        snap.docs.map((d) => ({
          userId: d.id,
          ...(d.data() as Omit<Participant, "userId">),
        })),
      );
    },
  );
}

export function subscribeMyParticipantStatus(
  collabId: string,
  userId: string,
  cb: (status: "pending" | "approved" | "revoked" | null) => void,
) {
  return onSnapshot(
    doc(db, "collaborations", collabId, "participants", userId),
    (snap) => {
      if (!snap.exists()) {
        cb(null);
      } else {
        cb((snap.data() as Participant).status);
      }
    },
  );
}
