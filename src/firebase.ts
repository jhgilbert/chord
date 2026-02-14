import { initializeApp } from "firebase/app";
import { getFirestore, connectFirestoreEmulator } from "firebase/firestore";

// For emulator usage, projectId is the key piece.
// These values won't be used to talk to production unless you remove connectFirestoreEmulator.
const firebaseConfig = {
  apiKey: "demo",
  authDomain: "demo.firebaseapp.com",
  projectId: "chord-jgilbert",
  appId: "demo",
};

export const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);

// Always connect in dev. If you want a toggle, gate with an env var.
if (import.meta.env.DEV) {
  connectFirestoreEmulator(db, "127.0.0.1", 8080);
}
