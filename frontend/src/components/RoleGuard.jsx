import { Navigate, useLocation } from "react-router-dom";
import { getSession } from "../lib/session";

export default function RoleGuard({ allowedRoles, children }) {
  const location = useLocation();
  const { token, role, linkedId } = getSession();

  if (!token || !role) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  if (!allowedRoles.includes(role)) {
    const fallback =
      role === "mother" && linkedId
        ? `/m/${linkedId}`
        : role === "asha"
          ? "/a"
          : role === "doctor"
            ? "/d"
            : role === "family"
              ? "/f"
              : "/login";

    return <Navigate to={fallback} replace />;
  }

  return children;
}
