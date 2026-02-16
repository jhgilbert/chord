import { Navigate, Route, Routes } from "react-router-dom";
import LoginScreen from "./components/LoginScreen/LoginScreen";
import StartScreen from "./components/StartScreen/StartScreen";
import CollabsListScreen from "./components/CollabsListScreen/CollabsListScreen";
import CollabRoute from "./components/CollabRoute/CollabRoute";
import StatsRoute from "./components/StatsRoute/StatsRoute";

export default function App() {
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
