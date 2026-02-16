import { doc, setDoc } from "firebase/firestore";
import {
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithPopup,
  signOut,
} from "firebase/auth";
import { auth, db } from "./firebase";

export type Session = {
  userId: string;
  displayName: string;
};

export function getSession(): Session | null {
  const user = auth.currentUser;
  if (!user) return null;
  return { userId: user.uid, displayName: user.displayName || "Anonymous" };
}

export function isLoggedIn(): boolean {
  return auth.currentUser !== null;
}

const ALLOWED_DOMAIN = "datadoghq.com";

export async function signInWithGoogle(): Promise<Session> {
  const provider = new GoogleAuthProvider();
  const result = await signInWithPopup(auth, provider);
  const user = result.user;

  // Enforce email domain restriction
  const email = user.email || "";
  if (!email.endsWith(`@${ALLOWED_DOMAIN}`)) {
    await signOut(auth);
    throw new Error(
      `Only @${ALLOWED_DOMAIN} accounts are allowed. You signed in with ${email}.`,
    );
  }

  const displayName = user.displayName || "Anonymous";

  // Write/update user doc in Firestore
  await setDoc(
    doc(db, "users", user.uid),
    { displayName, updatedAt: new Date().toISOString() },
    { merge: true },
  );

  return { userId: user.uid, displayName };
}

export async function logout(): Promise<void> {
  await signOut(auth);
}

/** Subscribe to auth state changes. Returns unsubscribe function. */
export function subscribeAuth(
  cb: (session: Session | null) => void,
): () => void {
  return onAuthStateChanged(auth, (user) => {
    if (user) {
      cb({ userId: user.uid, displayName: user.displayName || "Anonymous" });
    } else {
      cb(null);
    }
  });
}
