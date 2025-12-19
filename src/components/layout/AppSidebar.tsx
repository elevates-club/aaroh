import { NavLink, useLocation } from 'react-router-dom';
import {
  Home,
  Users,
  Music,
  FileText,
  Settings,
  Activity,
  Calendar,
  UserCog,
} from 'lucide-react';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from '@/components/ui/sidebar';
import { useAuth } from '@/contexts/AuthContext';
import { useRole } from '@/contexts/RoleContext';
import { USER_ROLES } from '@/lib/constants';

export function AppSidebar() {
  const location = useLocation();
  const { profile } = useAuth();
  const { setOpenMobile, isMobile } = useSidebar();
  const { activeRole } = useRole(); // Need activeRole here too potentially, or checking profile.role array

  // Import hasRole helper if not available, or use inline check for array/string
  const hasRoleCheck = (userRole: string | string[], targetRole: string) => {
    if (Array.isArray(userRole)) {
      return userRole.includes(targetRole);
    }
    return userRole === targetRole;
  };

  const adminItems = [
    { title: 'Dashboard', url: '/dashboard', icon: Home },
    { title: 'User Management', url: '/users', icon: UserCog },
    { title: 'Event Management', url: '/events', icon: Calendar },
    { title: 'Students', url: '/students', icon: Users },
    { title: 'Registrations', url: '/registrations', icon: FileText },
    { title: 'Activity Logs', url: '/activity-logs', icon: Activity },
    { title: 'Settings', url: '/settings', icon: Settings },
  ];

  const eventManagerItems = [
    { title: 'Dashboard', url: '/dashboard', icon: Home },
    { title: 'Event Management', url: '/events', icon: Calendar },
    { title: 'Students', url: '/students', icon: Users },
    { title: 'Registrations', url: '/registrations', icon: FileText },
    { title: 'Event Settings', url: '/event-settings', icon: Settings },
  ];

  const coordinatorItems = [
    { title: 'Dashboard', url: '/dashboard', icon: Home },
    { title: 'Students', url: '/students', icon: Users },
    { title: 'Event Registration', url: '/events', icon: Calendar },
    { title: 'Registrations', url: '/registrations', icon: FileText },
  ];

  const studentItems = [
    { title: 'Dashboard', url: '/dashboard', icon: Home },
    { title: 'Events', url: '/events', icon: Calendar },
    { title: 'My Registrations', url: '/my-registrations', icon: FileText },
  ];

  let items = studentItems; // Default to student
  if (activeRole === USER_ROLES.ADMIN) {
    items = adminItems;
  } else if (activeRole === USER_ROLES.EVENT_MANAGER) {
    items = eventManagerItems;
  } else if (activeRole && [
    USER_ROLES.FIRST_YEAR_COORDINATOR,
    USER_ROLES.SECOND_YEAR_COORDINATOR,
    USER_ROLES.THIRD_YEAR_COORDINATOR,
    USER_ROLES.FOURTH_YEAR_COORDINATOR
  ].includes(activeRole as any)) {
    items = coordinatorItems;
  }

  const isActive = (path: string) => location.pathname === path;

  const handleNavClick = () => {
    if (isMobile) {
      setOpenMobile(false);
    }
  };

  return (
    <Sidebar>
      <SidebarContent>
        <div className="p-4 sm:p-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center">
              <Music className="h-7 w-7 sm:h-8 sm:w-8 text-primary-foreground" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-semibold text-sidebar-foreground">Aaroh</h2>
              <p className="text-sm sm:text-base text-sidebar-foreground/70">Cultural Events</p>
            </div>
          </div>
        </div>

        <SidebarGroup>
          <SidebarGroupLabel className="text-sm sm:text-base font-medium px-3 py-2">Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="space-y-1">
              {items.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild className="h-12 sm:h-14">
                    <NavLink
                      to={item.url}
                      onClick={handleNavClick}
                      className={({ isActive }) =>
                        `flex items-center px-3 py-3 sm:px-4 sm:py-4 rounded-lg transition-colors text-sm sm:text-base font-medium ${isActive
                          ? 'bg-sidebar-accent text-sidebar-accent-foreground hover:bg-sidebar-accent/90'
                          : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
                        }`
                      }
                    >
                      <item.icon className="mr-3 h-5 w-5 sm:h-6 sm:w-6 flex-shrink-0" />
                      <span className="truncate">{item.title}</span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}