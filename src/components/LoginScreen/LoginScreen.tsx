import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { isLoggedIn, login } from "../../session";
import styles from "./LoginScreen.module.css";

export default function LoginScreen() {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  // If already logged in, redirect to home
  useEffect(() => {
    if (isLoggedIn()) {
      navigate("/", { replace: true });
    }
  }, [navigate]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!firstName.trim() || !lastName.trim()) return;

    setIsLoading(true);
    try {
      await login(firstName.trim(), lastName.trim());
      navigate("/", { replace: true });
    } catch (error) {
      console.error("Login failed:", error);
      alert("Login failed. Please try again.");
      setIsLoading(false);
    }
  };

  return (
    <div className={styles.loginScreen}>
      <h1 className={styles.loginTitle}>Welcome to chord</h1>
      <p className={styles.loginSubtitle}>Please enter your name to continue</p>
      <form onSubmit={handleSubmit} className={styles.loginForm}>
        <div className={styles.loginField}>
          <label className={styles.loginLabel}>First name</label>
          <input
            type="text"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            className={styles.loginInput}
            placeholder="Jen"
            disabled={isLoading}
            required
          />
        </div>
        <div className={styles.loginField}>
          <label className={styles.loginLabel}>Last name</label>
          <input
            type="text"
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            className={styles.loginInput}
            placeholder="Gilbert"
            disabled={isLoading}
            required
          />
        </div>
        <div className={styles.loginActions}>
          <button
            type="submit"
            className={styles.loginSubmit}
            disabled={isLoading}
          >
            {isLoading ? "Signing in..." : "Continue"}
          </button>
        </div>
      </form>
    </div>
  );
}
