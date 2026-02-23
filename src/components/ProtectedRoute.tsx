import { Navigate, useLocation, Outlet } from 'react-router-dom';
import { getSession, hasPermission } from '@/lib/auth';

/**
 * Wraps the dashboard layout. Requires a valid session; otherwise redirects to /login.
 * If the current path requires a permission the session doesn't have, redirects to /.
 */
export default function ProtectedRoute() {
  const location = useLocation();
  const session = getSession();

  if (!session) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  const path = location.pathname;
  if (!hasPermission(path, session)) {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
}
