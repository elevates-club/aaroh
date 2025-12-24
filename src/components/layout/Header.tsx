import { SidebarTrigger } from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import { Sun, Moon, LogOut, User, Trophy } from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import { getRoleLabel } from '@/lib/constants';
import { hasRole, getCoordinatorYear } from '@/lib/roleUtils';
import { RoleSwitcher } from '@/components/RoleSwitcher';
import { useNavigate } from 'react-router-dom';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export function Header() {
  const { theme, toggleTheme } = useTheme();
  const { profile, signOut, signingOut } = useAuth();
  const navigate = useNavigate();

  return (
    <header className="h-16 border-b bg-card/50 backdrop-blur-sm flex items-center justify-between px-4">
      <div className="flex items-center gap-4">
        <SidebarTrigger />
        <div className="hidden md:block">
          <h1 className="text-xl font-black tracking-tighter text-foreground uppercase">
            Aaroh <span className="text-[#facc15]">26</span>
          </h1>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="ml-4 border-yellow-500/20 text-yellow-600 hover:bg-yellow-500/10 hidden sm:flex"
          onClick={() => navigate('/scoreboard')}
        >
          <Trophy className="mr-2 h-4 w-4" /> Scoreboard
        </Button>
      </div>

      <div className="flex items-center gap-2">
        <RoleSwitcher />

        <Button
          variant="ghost"
          size="icon"
          onClick={toggleTheme}
          className="rounded-full"
        >
          {theme === 'light' ? (
            <Moon className="h-5 w-5" />
          ) : (
            <Sun className="h-5 w-5" />
          )}
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="rounded-full">
              <User className="h-5 w-5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-medium">{profile?.full_name}</p>
                <p className="text-xs text-muted-foreground">{profile?.email}</p>
                <p className="text-xs text-primary">
                  {Array.isArray(profile?.role)
                    ? profile.role.map(r => getRoleLabel(r)).join(', ')
                    : getRoleLabel(profile?.role || '')}
                </p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => navigate('/profile')}>
              <User className="mr-2 h-4 w-4" />
              My Profile
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={signOut}
              disabled={signingOut}
              className="text-destructive"
            >
              <LogOut className="mr-2 h-4 w-4" />
              {signingOut ? 'Signing out...' : 'Sign Out'}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}