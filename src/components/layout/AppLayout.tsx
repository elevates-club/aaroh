import { SidebarProvider } from '@/components/ui/sidebar';
import { AppSidebar } from './AppSidebar';
import { Header } from './Header';
import { Outlet } from 'react-router-dom';

export function AppLayout() {
  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full overflow-x-hidden">
        <AppSidebar />
        <div className="flex-1 flex flex-col">
          <Header />
          <main className="flex-1 overflow-auto bg-gradient-to-br from-background via-background to-primary/5">
            <Outlet />
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}