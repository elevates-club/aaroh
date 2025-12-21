import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { RoleProvider } from "@/contexts/RoleContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { AppLayout } from "@/components/layout/AppLayout";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import Students from "./pages/Students";
import Events from "./pages/Events";
import Registrations from "./pages/Registrations";
import MyRegistrations from "./pages/MyRegistrations";
import EventSettings from "./pages/EventSettings";
import ActivityLogs from "./pages/ActivityLogs";
import Settings from "./pages/Settings";
import UserManagement from "./pages/UserManagement";
import NotFound from "./pages/NotFound";
import { ForcePasswordChange } from "./pages/ForcePasswordChange";
import { ProfileSetup } from "./pages/ProfileSetup";
import Profile from "./pages/Profile";
import EventActivity from "./pages/EventActivity";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
      <AuthProvider>
        <RoleProvider>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <BrowserRouter>
              <Routes>
                <Route path="/" element={<Navigate to="/auth" replace />} />
                <Route path="/auth" element={<Auth />} />
                <Route path="/force-password-change" element={
                  <ProtectedRoute>
                    <ForcePasswordChange />
                  </ProtectedRoute>
                } />
                <Route path="/setup-profile" element={
                  <ProtectedRoute>
                    <ProfileSetup />
                  </ProtectedRoute>
                } />
                <Route element={
                  <ProtectedRoute>
                    <AppLayout />
                  </ProtectedRoute>
                }>
                  <Route path="/dashboard" element={<Dashboard />} />
                  <Route path="/students" element={<Students />} />
                  <Route path="/events" element={<Events />} />
                  <Route path="/registrations" element={<Registrations />} />
                  <Route path="/my-registrations" element={<MyRegistrations />} />
                  <Route path="/event-settings" element={<EventSettings />} />
                  <Route path="/activity-logs" element={<ActivityLogs />} />
                  <Route path="/event-activity" element={<EventActivity />} />
                  <Route path="/settings" element={<Settings />} />
                  <Route path="/users" element={<UserManagement />} />
                  <Route path="/profile" element={<Profile />} />
                </Route>
                <Route path="*" element={<NotFound />} />
              </Routes>
            </BrowserRouter>
          </TooltipProvider>
        </RoleProvider>
      </AuthProvider>
    </ThemeProvider>
  </QueryClientProvider >
);

export default App;
