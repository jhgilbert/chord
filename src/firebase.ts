import { initializeApp } from "firebase/app";
import { getFirestore, connectFirestoreEmulator, doc, setDoc } from "firebase/firestore";
import { getAuth, connectAuthEmulator, signInWithEmailAndPassword } from "firebase/auth";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

export const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);

if (import.meta.env.DEV) {
  connectFirestoreEmulator(db, "127.0.0.1", 8080);
  connectAuthEmulator(auth, "http://127.0.0.1:9099");

  (window as any).__e2eSignIn = async (
    email: string,
    password: string,
    displayName: string,
  ) => {
    const result = await signInWithEmailAndPassword(auth, email, password);
    await setDoc(
      doc(db, "users", result.user.uid),
      { displayName, updatedAt: new Date().toISOString() },
      { merge: true },
    );
  };
}
