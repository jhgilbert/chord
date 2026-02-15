import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "./firebase";

export function slugifyNameToId(name: string) {
  return name
    .trim()
    .toLowerCase()
    .replace(/['"]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");
}

const USER_ID_KEY = "chord_user_id";
const DISPLAY_NAME_KEY = "chord_display_name";

export type Session = {
  userId: string;
  displayName: string;
};

export function getSession(): Session | null {
  const userId = localStorage.getItem(USER_ID_KEY);
  const displayName = localStorage.getItem(DISPLAY_NAME_KEY);

  if (userId && displayName) {
    return { userId, displayName };
  }

  return null;
}

export function isLoggedIn(): boolean {
  return getSession() !== null;
}

export async function login(firstName: string, lastName: string): Promise<Session> {
  const displayName = `${firstName} ${lastName}`.trim();
  let baseUserId = slugifyNameToId(displayName);

  // Check if this user ID exists, and find an available one if needed
  let userId = baseUserId;
  let counter = 2;

  while (await userIdExists(userId)) {
    userId = `${baseUserId}-${counter}`;
    counter++;
  }

  // Register this user ID
  await setDoc(doc(db, "users", userId), {
    displayName,
    createdAt: new Date().toISOString(),
  });

  // Store in localStorage
  localStorage.setItem(USER_ID_KEY, userId);
  localStorage.setItem(DISPLAY_NAME_KEY, displayName);

  return { userId, displayName };
}

export function logout() {
  localStorage.removeItem(USER_ID_KEY);
  localStorage.removeItem(DISPLAY_NAME_KEY);
}

async function userIdExists(userId: string): Promise<boolean> {
  const docRef = doc(db, "users", userId);
  const docSnap = await getDoc(docRef);
  return docSnap.exists();
}
