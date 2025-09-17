import { Outlet, useNavigate } from "react-router-dom";
import { useEffect } from "react";
import { useAuthStore } from "../store/authStore";

function AuthLayout() {
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const initializeAuth = useAuthStore((state) => state.initializeAuth);

  useEffect(() => {
    const unsubscribe = initializeAuth();
    return unsubscribe;
  }, [initializeAuth]);

  useEffect(() => {
    if (user) {
      navigate("/");
    } else if (window.location.pathname !== "/auth/signin") {
      navigate("/auth/signin");
    }
  }, [user, navigate]);

  return <Outlet />;
}

export default AuthLayout;
