import {
  addDoc,
  collection,
  limit,
  onSnapshot,
  query,
  serverTimestamp,
  updateDoc,
  doc,
  where,
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

const collabsCol = collection(db, "collaborations");

export function subscribeActiveCollaboration(
  cb: (collab: Collaboration | null) => void,
) {
  const q = query(collabsCol, where("active", "==", true), limit(1));
  return onSnapshot(q, (snap) => {
    if (snap.empty) {
      cb(null);
    } else {
      const d = snap.docs[0];
      cb({ id: d.id, ...(d.data() as Omit<Collaboration, "id">) });
    }
  });
}

export async function startCollaboration(
  sessionId: string,
  displayName: string,
  prompt: string,
) {
  await addDoc(collabsCol, {
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
