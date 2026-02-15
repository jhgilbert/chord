import {
  addDoc,
  collection,
  deleteDoc,
  deleteField,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
} from "firebase/firestore";
import { db } from "./firebase";

export type NoteType = "Question" | "Requirement";

export type Reaction = "agree" | "disagree";

export type Note = {
  id: string;
  type: NoteType;
  content: string; // HTML from Quill
  createdAt?: unknown; // Firestore timestamp
  createdBy: string; // sessionId
  createdByName: string; // displayName
  reactions?: Record<string, Reaction>; // sessionId -> reaction
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
  type: NoteType,
  content: string,
  sessionId: string,
  displayName: string,
) {
  await addDoc(notesCol, {
    type,
    content,
    createdAt: serverTimestamp(),
    createdBy: sessionId,
    createdByName: displayName,
  });
}

export async function removeNote(id: string) {
  await deleteDoc(doc(db, "notes", id));
}

export async function setReaction(
  noteId: string,
  sessionId: string,
  reaction: Reaction | null,
) {
  await updateDoc(doc(db, "notes", noteId), {
    [`reactions.${sessionId}`]: reaction === null ? deleteField() : reaction,
  });
}
