import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2 } from 'lucide-react';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: string[];
}

export function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
  const { user, profile, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" state={{ from: location }} replace />;
  }

  // Check if this is first login (students must change password)
  // Check if this is first login (students must change password)
  if (profile?.is_first_login) {
    console.log('🔒 First login check:', {
      role: profile.role,
      isArray: Array.isArray(profile.role),
      includesStudent: Array.isArray(profile.role) && profile.role.includes('student')
    });
  }

  // Exempt roles: Admin and Coordinators don't need forced password change
  const isPrivilegedUser = profile?.role && Array.isArray(profile.role) && (
    profile.role.includes('admin') ||
    profile.role.some(r => r.includes('_coordinator'))
  );

  console.log('🛡️ Privilege Check:', { isPrivilegedUser, roles: profile?.role });

  // If privileged, skip student checks completely
  if (isPrivilegedUser) {
    // If user is on a setup page (force-password-change or setup-profile), redirect them OUT
    if (location.pathname === '/force-password-change' || location.pathname === '/setup-profile') {
      return <Navigate to="/dashboard" replace />;
    }

    // Just check allowed roles if provided
    if (allowedRoles && profile && !allowedRoles.some(role =>
      Array.isArray(profile.role) ? profile.role.includes(role) : profile.role === role
    )) {
      return <Navigate to="/dashboard" replace />;
    }
    return <>{children}</>;
  }

  if (profile?.is_first_login &&
    profile?.role && Array.isArray(profile.role) && profile.role.includes('student') &&
    location.pathname !== '/force-password-change') {
    return <Navigate to="/force-password-change" replace />;
  }

  // Check if profile setup is incomplete (students)
  if (profile && !profile.profile_completed &&
    profile.role && Array.isArray(profile.role) && profile.role.includes('student') &&
    location.pathname !== '/setup-profile' &&
    location.pathname !== '/force-password-change') {
    return <Navigate to="/setup-profile" replace />;
  }

  // Final role check for non-privileged users (or if logic falls through)
  if (allowedRoles && profile && !allowedRoles.some(role =>
    Array.isArray(profile.role) ? profile.role.includes(role) : profile.role === role
  )) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}