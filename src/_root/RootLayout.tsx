import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuthStore } from "../store/authStore";

const ProtectedRoute = () => {
  const { user } = useAuthStore();
  const location = useLocation();

  // If user is not authenticated, redirect to signin page
  if (!user) {
    return <Navigate to="/auth/signin" state={{ from: location }} replace />;
  }

  // If authenticated, render the child routes
  return <Outlet />;
};

export default ProtectedRoute;
