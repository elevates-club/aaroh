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
  LogOut,
  ChevronRight,
  Sparkles
} from 'lucide-react';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from '@/components/ui/sidebar';
import { useAuth } from '@/contexts/AuthContext';
import { useRole } from '@/contexts/RoleContext';
import { USER_ROLES } from '@/lib/constants';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { SidebarStatus } from './SidebarStatus';

export function AppSidebar() {
  const location = useLocation();
  const { profile, signOut } = useAuth();
  const { setOpenMobile, isMobile } = useSidebar();
  const { activeRole } = useRole();

  const adminItems = [
    { title: 'Dashboard', url: '/dashboard', icon: Home, group: 'System' },
    { title: 'Users', url: '/users', icon: UserCog, group: 'System' },
    { title: 'Events', url: '/events', icon: Calendar, group: 'Management' },
    { title: 'Students', url: '/students', icon: Users, group: 'Management' },
    { title: 'Registrations', url: '/registrations', icon: FileText, group: 'Management' },
    { title: 'Activity Logs', url: '/activity-logs', icon: Activity, group: 'Tools' },
    { title: 'Settings', url: '/settings', icon: Settings, group: 'Tools' },
  ];

  const eventManagerItems = [
    { title: 'Dashboard', url: '/dashboard', icon: Home, group: 'Operational' },
    { title: 'Users', url: '/users', icon: UserCog, group: 'Operational' },
    { title: 'Events', url: '/events', icon: Calendar, group: 'Operational' },
    { title: 'Students', url: '/students', icon: Users, group: 'Data' },
    { title: 'Registrations', url: '/registrations', icon: FileText, group: 'Data' },
    { title: 'Event Settings', url: '/event-settings', icon: Settings, group: 'Tools' },
    { title: 'Event Activity', url: '/event-activity', icon: Activity, group: 'Tools' },
  ];

  const coordinatorItems = [
    { title: 'Dashboard', url: '/dashboard', icon: Home, group: 'Main' },
    { title: 'Students', url: '/students', icon: Users, group: 'Data' },
    { title: 'Events', url: '/events', icon: Calendar, group: 'Main' },
    { title: 'Registrations', url: '/registrations', icon: FileText, group: 'Data' },
  ];

  const studentItems = [
    { title: 'Dashboard', url: '/dashboard', icon: Home, group: 'Personal' },
    { title: 'Events', url: '/events', icon: Calendar, group: 'Festival' },
    { title: 'My Registrations', url: '/my-registrations', icon: FileText, group: 'Personal' },
  ];

  let items = studentItems;
  if (activeRole === USER_ROLES.ADMIN) items = adminItems;
  else if (activeRole === USER_ROLES.EVENT_MANAGER) items = eventManagerItems;
  else if (activeRole && [
    USER_ROLES.FIRST_YEAR_COORDINATOR,
    USER_ROLES.SECOND_YEAR_COORDINATOR,
    USER_ROLES.THIRD_YEAR_COORDINATOR,
    USER_ROLES.FOURTH_YEAR_COORDINATOR
  ].includes(activeRole as any)) items = coordinatorItems;

  const groups = Array.from(new Set(items.map(i => i.group)));

  const handleNavClick = () => {
    if (isMobile) setOpenMobile(false);
  };

  return (
    <Sidebar className="border-r border-border/50 bg-background/50 backdrop-blur-xl">
      <SidebarHeader className="p-6">
        <div className="flex items-center gap-4 group cursor-pointer">
          <div className="relative">
            <div className="w-12 h-12 rounded-2xl bg-primary flex items-center justify-center shadow-lg shadow-primary/20 group-hover:rotate-6 transition-transform duration-300">
              <Music className="h-6 w-6 text-white" />
            </div>
            <div className="absolute -top-1 -right-1 w-4 h-4 bg-accent rounded-full border-2 border-background flex items-center justify-center">
              <Sparkles className="h-2 w-2 text-white" />
            </div>
          </div>
          <div>
            <h2 className="text-xl font-black tracking-tight text-foreground">AAROH</h2>
            <p className="text-[10px] uppercase tracking-[0.2em] font-bold text-muted-foreground">Arts Management</p>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent className="px-4 py-2">
        <div className="space-y-8">
          {groups.map((groupName) => (
            <div key={groupName} className="space-y-3">
              <h3 className="px-2 text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/50">
                {groupName}
              </h3>
              <div className="grid gap-1">
                {items.filter(i => i.group === groupName).map((item) => (
                  <NavLink
                    key={item.title}
                    to={item.url}
                    onClick={handleNavClick}
                    className={({ isActive }) =>
                      `group flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 ${isActive
                        ? 'bg-primary text-white shadow-lg shadow-primary/20'
                        : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                      }`
                    }
                  >
                    <item.icon className={`h-5 w-5 transition-transform duration-300 group-hover:scale-110`} />
                    <span className="text-sm font-semibold flex-1">{item.title}</span>
                    <ChevronRight className={`h-3 w-3 opacity-0 -translate-x-2 transition-all duration-300 group-hover:opacity-100 group-hover:translate-x-0`} />
                  </NavLink>
                ))}
              </div>
            </div>
          ))}
        </div>
        <SidebarStatus />
      </SidebarContent>

      <SidebarFooter className="p-4">
        <div className="p-4 rounded-2xl bg-muted/30 border border-border/50 space-y-4">
          <div className="flex items-center gap-3">
            <Avatar className="h-10 w-10 border-2 border-primary/20">
              <AvatarImage src={`https://avatar.vercel.sh/${profile?.full_name}`} />
              <AvatarFallback className="bg-primary/10 text-primary font-bold">
                {profile?.full_name?.substring(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <p className="text-sm font-bold truncate text-foreground">{profile?.full_name}</p>
              <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider truncate">
                {typeof activeRole === 'string' ? activeRole.replace(/_/g, ' ') : 'User'}
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start gap-2 hover:bg-destructive/10 hover:text-destructive text-muted-foreground rounded-xl"
            onClick={() => signOut()}
          >
            <LogOut className="h-4 w-4" />
            <span className="text-xs font-bold uppercase tracking-wider">Logout</span>
          </Button>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}