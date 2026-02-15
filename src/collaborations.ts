import {
  doc,
  onSnapshot,
  serverTimestamp,
  setDoc,
  updateDoc,
} from "firebase/firestore";
import { db } from "./firebase";

export type Collaboration = {
  id: string;
  prompt: string; // HTML from Quill
  startedBy: string;
  startedByName: string;
  startedAt?: unknown;
  active: boolean;
  frozen?: boolean;
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
) {
  await setDoc(doc(db, "collaborations", id), {
    prompt,
    startedBy: sessionId,
    startedByName: displayName,
    startedAt: serverTimestamp(),
    active: true,
  });
}

export async function endCollaboration(id: string) {
  await updateDoc(doc(db, "collaborations", id), { active: false });
}

export async function freezeCollaboration(id: string, frozen: boolean) {
  await updateDoc(doc(db, "collaborations", id), { frozen });
}
