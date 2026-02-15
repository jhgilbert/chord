import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "./firebase";

export type Note = {
  id: string;
  content: string; // HTML from Tiptap
  createdAt?: unknown; // Firestore timestamp
  createdBy: string; // sessionId
  createdByName: string; // displayName
};

const notesCol = collection(db, "notes");

export function subscribeNotes(cb: (notes: Note[]) => void) {
  const q = query(notesCol, orderBy("createdAt", "asc"));
  return onSnapshot(q, (snap) => {
    const notes: Note[] = snap.docs.map((d) => {
      const data = d.data() as Omit<Note, "id">;
      return { id: d.id, ...data };
    });
    cb(notes);
  });
}

export async function createNote(
  content: string,
  sessionId: string,
  displayName: string,
) {
  await addDoc(notesCol, {
    content,
    createdAt: serverTimestamp(),
    createdBy: sessionId,
    createdByName: displayName,
  });
}

export async function removeNote(id: string) {
  await deleteDoc(doc(db, "notes", id));
}
