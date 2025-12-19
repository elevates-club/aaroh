import { useAuth } from '@/contexts/AuthContext';
import { useRole } from '@/contexts/RoleContext';
import { USER_ROLES } from '@/lib/constants';
import { hasRole } from '@/lib/roleUtils';
import { CoordinatorDashboard } from '@/components/dashboards/CoordinatorDashboard';
import { StudentDashboard } from '@/components/dashboards/StudentDashboard';
import { AdminDashboard } from '@/components/dashboards/AdminDashboard';

import { EventManagerDashboard } from '@/components/dashboards/EventManagerDashboard';

export default function Dashboard() {
  const { profile } = useAuth();
  const { activeRole } = useRole();

  // Show role-specific dashboards
  if (hasRole(activeRole, USER_ROLES.STUDENT)) {
    return <StudentDashboard />;
  }

  if (hasRole(activeRole, USER_ROLES.ADMIN)) {
    return <AdminDashboard />;
  }

  if (hasRole(activeRole, USER_ROLES.EVENT_MANAGER)) {
    return <EventManagerDashboard />;
  }

  // Year Coordinators get their own dashboard
  return <CoordinatorDashboard />;
}