import {
  doc,
  onSnapshot,
  serverTimestamp,
  setDoc,
  updateDoc,
} from "firebase/firestore";
import { db } from "./firebase";
import type { NoteType } from "./notes";

export type Collaboration = {
  id: string;
  prompt: string; // HTML from Quill
  startedBy: string;
  startedByName: string;
  startedAt?: unknown;
  active: boolean;
  paused?: boolean;
  allowedNoteTypes: NoteType[];
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
  prompt: string,
  allowedNoteTypes: NoteType[],
) {
  await setDoc(doc(db, "collaborations", id), {
    prompt,
    startedBy: sessionId,
    startedByName: displayName,
    startedAt: serverTimestamp(),
    active: true,
    allowedNoteTypes,
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

export async function updatePrompt(id: string, prompt: string) {
  await updateDoc(doc(db, "collaborations", id), { prompt });
}

export async function updateAllowedNoteTypes(id: string, allowedNoteTypes: NoteType[]) {
  await updateDoc(doc(db, "collaborations", id), { allowedNoteTypes });
}
