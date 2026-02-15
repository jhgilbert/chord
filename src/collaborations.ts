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
  startedBy: string;
  startedByName: string;
  startedAt?: unknown;
  active: boolean;
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
) {
  await addDoc(collabsCol, {
    startedBy: sessionId,
    startedByName: displayName,
    startedAt: serverTimestamp(),
    active: true,
  });
}

export async function endCollaboration(id: string) {
  await updateDoc(doc(db, "collaborations", id), { active: false });
}
