import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { logout } from "../../session";

export default function LogoutRoute() {
  const navigate = useNavigate();

  useEffect(() => {
    logout().then(() => {
      navigate("/login", { replace: true });
    });
  }, [navigate]);

  return null;
}
