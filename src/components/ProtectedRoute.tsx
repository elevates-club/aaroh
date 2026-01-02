import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2 } from 'lucide-react';
import { SystemError } from '@/components/SystemError';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: string[];
}

export function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
  const { user, profile, state, error, retryProfileLoad } = useAuth();
  const location = useLocation();

  if (state === 'BOOTING' || state === 'LOADING') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground animate-pulse">Verifying session...</p>
        </div>
      </div>
    );
  }

  // System Error State (Network or Data Failure)
  if (state === 'ERROR' || error) {
    return (
      <SystemError
        title="Connection Failed"
        message={error?.message || "We couldn't load your profile data."}
        action={retryProfileLoad}
        actionLabel="Retry Connection"
      />
    );
  }

  // 1. Auth Gate: Must have a user session
  if (!user) {
    return <Navigate to="/auth" state={{ from: location }} replace />;
  }

  // 2. Profile Gate: Must have a loaded profile
  // If we are READY but no profile, something is wrong (should be caught by SystemError above, but as failsafe)
  if (!profile) {
    return (
      <SystemError
        title="Profile Missing"
        message="Critical Error: Your user profile could not be found."
        action={() => window.location.reload()}
      />
    );
  }

  // 3. Role Gate: Must have a valid role assigned
  const roles = Array.isArray(profile.role) ? profile.role : (profile.role ? [profile.role] : []);

  if (roles.length === 0) {
    return (
      <SystemError
        title="Role Assignment Missing"
        message="Your account has no assigned roles. Please contact an administrator to set up your access."
      />
    );
  }

  // 4. Privileged User Gate (Admin/Coordinator)
  // These roles bypass student-specific checks like password change enforcement (unless explicitly required)
  const isPrivilegedUser = roles.includes('admin') || roles.some(r => r.includes('_coordinator'));

  if (isPrivilegedUser) {
    // Prevent privileged users from getting stuck in student setup flows if they navigate there manually
    if (location.pathname === '/force-password-change' || location.pathname === '/setup-profile') {
      return <Navigate to="/dashboard" replace />;
    }

    // Role Access Check for specific routes
    if (allowedRoles && !allowedRoles.some(requiredRole => roles.includes(requiredRole))) {
      // If user doesn't have the specific role for this route, redirect to dashboard (or 403)
      return <Navigate to="/dashboard" replace />;
    }

    return <>{children}</>;
  }

  // 5. Student Gate checks
  // Students MUST change password on first login
  if (profile.is_first_login && location.pathname !== '/force-password-change') {
    return <Navigate to="/force-password-change" replace />;
  }

  // Students MUST complete profile setup
  if (!profile.profile_completed && location.pathname !== '/setup-profile' && location.pathname !== '/force-password-change') {
    return <Navigate to="/setup-profile" replace />;
  }

  // Final Allowed Role Check for regular users
  if (allowedRoles && !allowedRoles.some(requiredRole => roles.includes(requiredRole))) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}