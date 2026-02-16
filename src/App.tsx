import { useEffect, useState } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { subscribeAuth, type Session } from "./session";
import LoginScreen from "./components/LoginScreen/LoginScreen";
import StartScreen from "./components/StartScreen/StartScreen";
import CollabsListScreen from "./components/CollabsListScreen/CollabsListScreen";
import CollabRoute from "./components/CollabRoute/CollabRoute";
import StatsRoute from "./components/StatsRoute/StatsRoute";

export default function App() {
  const [authReady, setAuthReady] = useState(false);

  // Wait for Firebase Auth to resolve before rendering routes.
  // Without this, auth.currentUser is null on cold load even for
  // signed-in users, causing a flash redirect to /login.
  useEffect(() => {
    const unsub = subscribeAuth((_session: Session | null) => {
      setAuthReady(true);
      unsub();
    });
    return () => unsub();
  }, []);

  if (!authReady) return null;

  return (
    <Routes>
      <Route path="/login" element={<LoginScreen />} />
      <Route path="/" element={<StartScreen />} />
      <Route path="/collabs" element={<CollabsListScreen />} />
      <Route path="/collabs/:id" element={<CollabRoute />} />
      <Route path="/collabs/:id/stats" element={<StatsRoute />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
