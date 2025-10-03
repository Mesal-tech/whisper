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

  return (
    <main className="flex w-full bg-[#000]">
      <div className="w-full">
        <Outlet />
      </div>

      <div className="hidden md:flex w-full">
        <img
          src="/assets/images/auth-bg.jpg"
          alt=""
          className="w-full h-full object-cover"
        />
      </div>
    </main>
  );
}

export default AuthLayout;
