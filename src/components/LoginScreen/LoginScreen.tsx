import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { isLoggedIn, signInWithGoogle } from "../../session";
import styles from "./LoginScreen.module.css";

export default function LoginScreen() {
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (isLoggedIn()) {
      navigate("/", { replace: true });
    }
  }, [navigate]);

  const handleSignIn = async () => {
    setIsLoading(true);
    try {
      await signInWithGoogle();
      navigate("/", { replace: true });
    } catch (error) {
      console.error("Sign-in failed:", error);
      alert("Sign-in failed. Please try again.");
      setIsLoading(false);
    }
  };

  return (
    <div className={styles.loginScreen}>
      <h1 className={styles.loginTitle}>Welcome to chord</h1>
      <p className={styles.loginSubtitle}>Sign in to start collaborating</p>
      <div className={styles.loginActions}>
        <button
          onClick={handleSignIn}
          className={styles.loginSubmit}
          disabled={isLoading}
        >
          {isLoading ? "Signing in..." : "Sign in with Google"}
        </button>
      </div>
    </div>
  );
}
