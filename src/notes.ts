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

export type NoteType = "Question" | "Statement" | "Recommendation" | "Requirement" | "Action item" | "Poll" | "Host note" | "Positive feedback" | "Constructive feedback";

export type Reaction = "agree" | "disagree" | "markRead";

export type NoteVersion = {
  content: string;
  editedAt: unknown; // Firestore timestamp
};

export type NoteResponse = {
  content: string; // HTML from Quill
  createdAt: unknown; // timestamp (Date.now())
  createdBy: string; // userId
  createdByName: string; // displayName
  reactions?: Record<string, Reaction>; // sessionId -> reaction
};

export type Note = {
  id: string;
  type: NoteType;
  content: string; // HTML from Quill (current version)
  createdAt?: unknown; // Firestore timestamp
  createdBy: string; // sessionId
  createdByName: string; // displayName
  reactions?: Record<string, Reaction>; // sessionId -> reaction
  groupedUnder?: string; // parent note ID if this note is grouped
  editHistory?: NoteVersion[]; // previous versions
  responses?: NoteResponse[]; // responses to this note
  archived?: boolean; // whether the note is archived
  assignee?: string; // for action items
  dueDate?: string; // for action items (ISO date string)
  pollOptions?: string[]; // for polls: the available options
  pollVotes?: Record<string, number | number[]>; // for polls: sessionId -> option index or indices
  pollMultipleChoice?: boolean; // for polls: whether multiple selections are allowed
  pollClosed?: boolean; // for polls: whether the poll is closed
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
  assignee?: string,
  dueDate?: string,
  pollOptions?: string[],
  pollMultipleChoice?: boolean,
) {
  const noteData: any = {
    type,
    content,
    createdAt: serverTimestamp(),
    createdBy: sessionId,
    createdByName: displayName,
  };

  if (assignee) noteData.assignee = assignee;
  if (dueDate) noteData.dueDate = dueDate;
  if (pollOptions && pollOptions.length > 0) {
    noteData.pollOptions = pollOptions;
    if (pollMultipleChoice) noteData.pollMultipleChoice = pollMultipleChoice;
  }

  await addDoc(notesCol(collaborationId), noteData);
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

export async function editNote(
  collaborationId: string,
  noteId: string,
  currentContent: string,
  newContent: string,
  existingHistory?: NoteVersion[],
) {
  const noteRef = doc(db, "collaborations", collaborationId, "notes", noteId);

  // Add current content to history
  // Note: Using Date.now() instead of serverTimestamp() because Firestore
  // doesn't support serverTimestamp() inside arrays
  const newHistoryEntry: NoteVersion = {
    content: currentContent,
    editedAt: Date.now(),
  };

  const updateData = {
    content: newContent,
    editHistory: [...(existingHistory || []), newHistoryEntry],
  };

  console.log("editNote: Updating Firestore", {
    noteId,
    newContentLength: newContent.length,
    historyCount: updateData.editHistory.length,
  });

  await updateDoc(noteRef, updateData);

  console.log("editNote: Update completed");
}

export async function addResponse(
  collaborationId: string,
  noteId: string,
  content: string,
  userId: string,
  displayName: string,
  existingResponses?: NoteResponse[],
) {
  const noteRef = doc(db, "collaborations", collaborationId, "notes", noteId);

  const newResponse: NoteResponse = {
    content,
    createdAt: Date.now(),
    createdBy: userId,
    createdByName: displayName,
  };

  const updateData = {
    responses: [...(existingResponses || []), newResponse],
  };

  await updateDoc(noteRef, updateData);
}

export async function setResponseReaction(
  collaborationId: string,
  noteId: string,
  responseIndex: number,
  sessionId: string,
  reaction: Reaction | null,
  existingResponses: NoteResponse[],
) {
  const noteRef = doc(db, "collaborations", collaborationId, "notes", noteId);

  const updatedResponses = [...existingResponses];
  const response = updatedResponses[responseIndex];

  if (!response.reactions) {
    response.reactions = {};
  }

  if (reaction === null) {
    delete response.reactions[sessionId];
  } else {
    response.reactions[sessionId] = reaction;
  }

  await updateDoc(noteRef, {
    responses: updatedResponses,
  });
}

export async function toggleArchive(
  collaborationId: string,
  noteId: string,
  archived: boolean,
) {
  await updateDoc(
    doc(db, "collaborations", collaborationId, "notes", noteId),
    {
      archived: archived ? deleteField() : true,
    },
  );
}

export async function votePoll(
  collaborationId: string,
  noteId: string,
  sessionId: string,
  vote: number | number[],
) {
  await updateDoc(
    doc(db, "collaborations", collaborationId, "notes", noteId),
    {
      [`pollVotes.${sessionId}`]: vote,
    },
  );
}

export async function closePoll(
  collaborationId: string,
  noteId: string,
) {
  await updateDoc(
    doc(db, "collaborations", collaborationId, "notes", noteId),
    {
      pollClosed: true,
    },
  );
}
