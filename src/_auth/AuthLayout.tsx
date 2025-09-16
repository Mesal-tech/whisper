import { Outlet, useNavigate } from "react-router-dom";
import { useEffect } from "react";
import { auth } from "../lib/firebase";
import { onAuthStateChanged } from "firebase/auth";

function AuthLayout() {
  const navigate = useNavigate();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        navigate("/");
      }
    });
    return unsubscribe;
  }, [navigate]);

  return <Outlet />;
}

export default AuthLayout;
