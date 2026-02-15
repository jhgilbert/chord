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

export type NoteType = "Question" | "Requirement" | "Comment";

export type Reaction = "agree" | "disagree";

export type Note = {
  id: string;
  type: NoteType;
  content: string; // HTML from Quill
  createdAt?: unknown; // Firestore timestamp
  createdBy: string; // sessionId
  createdByName: string; // displayName
  reactions?: Record<string, Reaction>; // sessionId -> reaction
  groupedUnder?: string; // parent note ID if this note is grouped
};

const notesCol = (collaborationId: string) =>
  collection(db, "collaborations", collaborationId, "notes");

export function subscribeNotes(
  collaborationId: string,
  cb: (notes: Note[]) => void,
) {
  const q = query(notesCol(collaborationId), orderBy("createdAt", "asc"));
  return onSnapshot(q, (snap) => {
    const notes: Note[] = snap.docs.map((d) => {
      const data = d.data() as Omit<Note, "id">;
      return { id: d.id, ...data };
    });
    cb(notes);
  });
}

export async function createNote(
  collaborationId: string,
  type: NoteType,
  content: string,
  sessionId: string,
  displayName: string,
) {
  await addDoc(notesCol(collaborationId), {
    type,
    content,
    createdAt: serverTimestamp(),
    createdBy: sessionId,
    createdByName: displayName,
  });
}

export async function removeNote(collaborationId: string, id: string) {
  await deleteDoc(doc(db, "collaborations", collaborationId, "notes", id));
}

export async function setReaction(
  collaborationId: string,
  noteId: string,
  sessionId: string,
  reaction: Reaction | null,
) {
  await updateDoc(
    doc(db, "collaborations", collaborationId, "notes", noteId),
    {
      [`reactions.${sessionId}`]: reaction === null ? deleteField() : reaction,
    },
  );
}

export async function setGroupedUnder(
  collaborationId: string,
  noteId: string,
  parentId: string | null,
) {
  await updateDoc(
    doc(db, "collaborations", collaborationId, "notes", noteId),
    {
      groupedUnder: parentId === null ? deleteField() : parentId,
    },
  );
}
