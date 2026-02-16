import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { isLoggedIn, signInWithGoogle } from "../../session";
import Logo from "../Logo/Logo";
import styles from "./LoginScreen.module.css";

export default function LoginScreen() {
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const redirectTo = (location.state as { from?: string })?.from || "/";

  useEffect(() => {
    if (isLoggedIn()) {
      navigate(redirectTo, { replace: true });
    }
  }, [navigate, redirectTo]);

  const handleSignIn = async () => {
    setIsLoading(true);
    try {
      await signInWithGoogle();
      navigate(redirectTo, { replace: true });
    } catch (error) {
      console.error("Sign-in failed:", error);
      alert("Sign-in failed. Please try again.");
      setIsLoading(false);
    }
  };

  return (
    <div className={styles.loginScreen}>
      <Logo />
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
