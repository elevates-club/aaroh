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
    <Sidebar collapsible="icon" className="border-r border-border/50 bg-background/50 backdrop-blur-xl">
      <SidebarHeader className="p-6 group-data-[collapsible=icon]:p-4">
        <div className="flex items-center gap-4 group cursor-pointer group-data-[collapsible=icon]:justify-center">
          <div className="relative">
            <div className="w-12 h-12 rounded-2xl bg-[#0a0a0a] flex flex-col items-center justify-center shadow-2xl transition-all duration-500 group-hover:scale-110 group-data-[collapsible=icon]:w-12 group-data-[collapsible=icon]:h-12 border border-white/5">
              <div className="flex flex-col items-center leading-none">
                <span className="text-[10px] font-black text-[#facc15] tracking-tighter">AAROH</span>
                <span className="text-xl font-black text-white -mt-1">26</span>
                <span className="text-[5px] font-bold text-white/70 uppercase tracking-[0.2em] group-data-[collapsible=icon]:hidden">Arts Fest</span>
              </div>
            </div>
          </div>
          <div className="group-data-[collapsible=icon]:hidden">
            <h2 className="text-xl font-black tracking-tighter text-foreground flex items-center gap-1">
              AAROH <span className="text-[#facc15]">26</span>
            </h2>
            <p className="text-[10px] uppercase tracking-[0.3em] font-black text-muted-foreground/50">Arts Festival</p>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent className="px-4 py-2 group-data-[collapsible=icon]:px-0">
        <div className="space-y-6 group-data-[collapsible=icon]:space-y-4">
          {groups.map((groupName) => (
            <div key={groupName} className="space-y-3 group-data-[collapsible=icon]:space-y-2">
              <h3 className="px-2 text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/30 group-data-[collapsible=icon]:hidden">
                {groupName}
              </h3>
              <div className="grid gap-2">
                {items.filter(i => i.group === groupName).map((item) => (
                  <NavLink
                    key={item.title}
                    to={item.url}
                    onClick={handleNavClick}
                    className={({ isActive }) =>
                      `group flex items-center gap-3 px-3 py-3 rounded-2xl transition-all duration-300 ${isActive
                        ? 'bg-primary text-primary-foreground shadow-xl shadow-primary/20'
                        : 'text-muted-foreground/60 hover:bg-muted hover:text-foreground hover:scale-110'
                      } group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0 group-data-[collapsible=icon]:w-12 group-data-[collapsible=icon]:h-12 mx-auto`
                    }
                  >
                    <item.icon className="h-5 w-5 transition-transform duration-300 group-hover:scale-110" />
                    <span className="text-sm font-bold flex-1 group-data-[collapsible=icon]:hidden">{item.title}</span>
                    <ChevronRight className="h-3 w-3 opacity-0 -translate-x-2 transition-all duration-300 group-hover:opacity-100 group-hover:translate-x-0 group-data-[collapsible=icon]:hidden" />
                  </NavLink>
                ))}
              </div>
            </div>
          ))}
        </div>
        <div className="group-data-[collapsible=icon]:hidden mt-4">
          <SidebarStatus />
        </div>
      </SidebarContent>

      <SidebarFooter className="p-4 group-data-[collapsible=icon]:p-4">
        <div className="p-4 rounded-3xl bg-muted/20 border border-border/50 space-y-4 group-data-[collapsible=icon]:p-0 group-data-[collapsible=icon]:bg-transparent group-data-[collapsible=icon]:border-none">
          <div className="flex items-center gap-3 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:mb-4">
            <div className="relative group-data-[collapsible=icon]:cursor-pointer">
              <Avatar className="h-10 w-10 border-2 border-primary/20 group-data-[collapsible=icon]:h-12 group-data-[collapsible=icon]:w-12 ring-4 ring-primary/5">
                <AvatarImage src={`https://avatar.vercel.sh/${profile?.full_name}`} />
                <AvatarFallback className="bg-primary/10 text-primary font-bold">
                  {profile?.full_name?.substring(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-background group-data-[collapsible=icon]:w-3 group-data-[collapsible=icon]:h-3"></div>
            </div>
            <div className="min-w-0 group-data-[collapsible=icon]:hidden">
              <p className="text-sm font-black truncate text-foreground">{profile?.full_name}</p>
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider truncate">
                {typeof activeRole === 'string' ? activeRole.replace(/_/g, ' ') : 'User'}
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-start gap-3 hover:bg-destructive/10 hover:text-destructive text-muted-foreground font-bold rounded-2xl transition-all group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:p-0 group-data-[collapsible=icon]:h-12 group-data-[collapsible=icon]:w-12 group-data-[collapsible=icon]:bg-muted/30"
              onClick={() => signOut()}
            >
              <LogOut className="h-5 w-5" />
              <span className="text-xs font-black uppercase tracking-[0.1em] group-data-[collapsible=icon]:hidden">Logout</span>
            </Button>
          </div>
        </div>

        {/* Brand Credits */}
        <div className="mt-6 pt-4 border-t border-border/40 group-data-[collapsible=icon]:hidden">
          <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground/30 font-black text-center leading-relaxed">
            Aaroh Console <br />
            <span className="text-primary/50">Developed By Elevates</span>
          </p>
        </div>

      </SidebarFooter>
    </Sidebar>
  );
}