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
  email: string;
};

export function getSession(): Session | null {
  const user = auth.currentUser;
  if (!user) return null;
  return { userId: user.uid, displayName: user.displayName || "Anonymous", email: user.email || "" };
}

export function isLoggedIn(): boolean {
  return auth.currentUser !== null;
}

const ALLOWED_DOMAINS: string[] = (
  import.meta.env.VITE_ALLOWED_DOMAINS || ""
)
  .split(",")
  .map((d: string) => d.trim())
  .filter(Boolean);

export async function signInWithGoogle(): Promise<Session> {
  const provider = new GoogleAuthProvider();
  const result = await signInWithPopup(auth, provider);
  const user = result.user;

  // Enforce email domain restriction (skip if no domains configured)
  if (ALLOWED_DOMAINS.length > 0) {
    const email = user.email || "";
    const allowed = ALLOWED_DOMAINS.some((domain) =>
      email.endsWith(`@${domain}`),
    );
    if (!allowed) {
      await signOut(auth);
      const domainList = ALLOWED_DOMAINS.map((d) => `@${d}`).join(", ");
      throw new Error(
        `Only ${domainList} accounts are allowed. You signed in with ${email}.`,
      );
    }
  }

  const displayName = user.displayName || "Anonymous";

  // Write/update user doc in Firestore
  await setDoc(
    doc(db, "users", user.uid),
    { displayName, updatedAt: new Date().toISOString() },
    { merge: true },
  );

  return { userId: user.uid, displayName, email: user.email || "" };
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
      cb({ userId: user.uid, displayName: user.displayName || "Anonymous", email: user.email || "" });
    } else {
      cb(null);
    }
  });
}
