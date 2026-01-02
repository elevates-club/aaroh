import React, { createContext, useContext, useEffect, useState, useRef, useCallback } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { logUserLogin, logUserLogout } from '@/utils/activityLogger';

// 1. Strict System State Model
export type SystemState = 'BOOTING' | 'LOADING' | 'READY' | 'ERROR';

interface Profile {
  id: string;
  email: string;
  full_name: string;
  role: string[];
  phone?: string;
  is_first_login?: boolean;
  profile_completed?: boolean;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  state: SystemState;
  loading: boolean; // Computed helper for backward compatibility/UI
  error: Error | null;
  retryProfileLoad: () => void;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (email: string, password: string, fullName: string, role: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

// 2. Mobile/Focus Revalidation Hook
const useRevalidateOnFocus = (revalidate: () => void) => {
  useEffect(() => {
    const onFocus = () => {
      console.log('🔄 App focused - Revalidating session...');
      revalidate();
    };

    // Handle both focus and visibility change for broader mobile support
    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        console.log('👁️ App visible - Revalidating...');
        onFocus();
      }
    };

    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onVisibilityChange);

    return () => {
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, [revalidate]);
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);

  // State Machine
  const [state, setState] = useState<SystemState>('BOOTING');
  const [error, setError] = useState<Error | null>(null);

  const currentProfileIdRef = useRef<string | null>(null);

  // Helper for "is loading" UI
  const loading = state === 'BOOTING' || state === 'LOADING';

  // 3. Robust Profile Fetcher
  const fetchProfile = useCallback(async (userId: string, isRevalidation = false) => {
    try {
      // If booting/loading, we are already in a blocking state. 
      // If revalidating, we generally stick to READY unless we want to block on every focus (bad UX).
      // However, for STRICT safety, if we suspect data is stale, we might want to flag loading.
      // Current design: Only switch to LOADING if we are BOOTING or explicitly retrying.
      // Revalidation happens in background unless it fails critically.

      if (!isRevalidation) {
        setState('LOADING');
      }

      setError(null);

      // Disable caching: always fetch fresh
      // Single() ensures we fail if 0 or >1 rows
      const { data, error: fetchError } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (fetchError) throw fetchError;

      // Successful Load
      setProfile(data);
      currentProfileIdRef.current = data?.id || null;

      // If this was a revalidation or initial load, we are now READY
      setState('READY');

    } catch (err: any) {
      console.error('Error fetching profile:', err);

      // 4. Intelligent Error Handling
      if (err.code === 'PGRST116') {
        // Critical Data Error: Profile missing
        console.error('CRITICAL: Profile missing for user');
        setProfile(null);
        setError(new Error('User profile not found. Please contact support.'));
        setState('ERROR');
      } else if (err.message?.includes('fetch') || err.message?.includes('network')) {
        // Network Error
        console.warn('Network error during profile fetch - Preserving session');
        if (!isRevalidation) {
          // If initial load/retry failed, show Error Screen
          setError(new Error('Network connection failed. Please check your internet.'));
          setState('ERROR');
        } else {
          // If revalidation failed, user is likely still seeing old data.
          // We can silently ignore or show a toast. For strict consistency, we warn.
          // PROPOSAL: Don't boot them to error screen on background revalidation fail
          console.warn('Background revalidation failed. Keeping stale data.');
        }
      } else {
        // Unknown Error
        setError(err);
        setState('ERROR');
      }
    }
  }, []);

  const retryProfileLoad = useCallback(() => {
    if (user) {
      fetchProfile(user.id);
    } else {
      // If no user, maybe we need to reboot auth check
      window.location.reload();
    }
  }, [user, fetchProfile]);

  // Handle Auth Changes
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);

        if (session?.user) {
          // On login (or session restore), fetch profile
          // We are implicitly LOADING here if we were BOOTING

          if (event === 'SIGNED_IN') {
            // Log login logic
            const storageKey = 'aaroh_session_logged_id';
            const lastLogged = typeof window !== 'undefined' ? sessionStorage.getItem(storageKey) : null;

            if (lastLogged !== session.access_token) {
              if (typeof window !== 'undefined') sessionStorage.setItem(storageKey, session.access_token);
              logUserLogin(session.user.id, {
                login_method: 'email_password',
                timestamp: new Date().toISOString()
              }).catch(e => console.error('Login log failed', e));
            }
          }

          fetchProfile(session.user.id);
        } else {
          // Logout or No Session
          setProfile(null);
          currentProfileIdRef.current = null;

          if (event === 'SIGNED_OUT') {
            setState('BOOTING'); // Reset state so next login feels fresh? Or READY?
            // Actually if signed out, we are READY to show public pages
            // But ProtectedRoute will block access.
            // Let's say we are READY (authenticated as "Guest")
            setState('READY');
          }
        }
      }
    );

    // Initial Check
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchProfile(session.user.id);
      } else {
        // No user, ready to show login
        setState('READY');
      }
    });

    return () => subscription.unsubscribe();
  }, [fetchProfile]);

  // Enable Revalidation
  const revalidate = useCallback(() => {
    if (user && state === 'READY') {
      fetchProfile(user.id, true);
    }
  }, [user, state, fetchProfile]);

  useRevalidateOnFocus(revalidate);

  // Actions
  const signIn = async (identifier: string, password: string) => {
    // ... existing logic ...
    try {
      let loginEmail = identifier;
      if (!identifier.includes('@')) {
        const { data: realEmail, error: lookupError } = await supabase
          .rpc('get_student_login_email' as any, { p_roll_number: identifier });

        if (realEmail && !lookupError) loginEmail = realEmail as string;
        else loginEmail = `noreply-${identifier.toUpperCase()}@ekc.edu.in`;
      }

      const { error } = await supabase.auth.signInWithPassword({ email: loginEmail, password });
      if (error) throw error;
      return { error: null };
    } catch (e) { return { error: e as Error }; }
  };

  const signUp = async (email: string, password: string, fullName: string, role: string) => {
    try {
      const { error } = await supabase.auth.signUp({
        email, password,
        options: {
          emailRedirectTo: `${window.location.origin}/`,
          data: { full_name: fullName, role }
        }
      });
      if (error) throw error;
      return { error: null };
    } catch (e) { return { error: e as Error }; }
  };

  const signOut = async () => {
    try {
      // ... existing logout logic ...
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
    } catch (e) { console.error('Logout error', e); }
    finally {
      if (typeof window !== 'undefined') {
        sessionStorage.clear();
        localStorage.clear();
      }
      setUser(null);
      setSession(null);
      setProfile(null);
      setState('READY'); // Ready for new login
      window.location.href = '/auth';
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        profile,
        state,
        loading,
        error,
        retryProfileLoad,
        signIn,
        signUp,
        signOut
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};