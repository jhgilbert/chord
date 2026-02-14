import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
} from "firebase/firestore";
import { db } from "./firebase";

export type Todo = {
  id: string;
  text: string;
  done: boolean;
  createdAt?: unknown; // Firestore timestamp
  createdBy: string; // sessionId
  createdByName: string; // displayName
};

const todosCol = collection(db, "todos");

export function subscribeTodos(cb: (todos: Todo[]) => void) {
  const q = query(todosCol, orderBy("createdAt", "asc"));
  // onSnapshot provides realtime updates. :contentReference[oaicite:4]{index=4}
  return onSnapshot(q, (snap) => {
    const todos: Todo[] = snap.docs.map((d) => {
      const data = d.data() as Omit<Todo, "id">;
      return { id: d.id, ...data };
    });
    cb(todos);
  });
}

export async function createTodo(
  text: string,
  sessionId: string,
  displayName: string,
) {
  await addDoc(todosCol, {
    text,
    done: false,
    createdAt: serverTimestamp(),
    createdBy: sessionId,
    createdByName: displayName,
  });
}

export async function toggleTodo(id: string, done: boolean) {
  await updateDoc(doc(db, "todos", id), { done });
}

export async function removeTodo(id: string) {
  await deleteDoc(doc(db, "todos", id));
}
