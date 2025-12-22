import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { logUserLogin, logUserLogout } from '@/utils/activityLogger';

interface Profile {
  id: string;
  email: string;
  full_name: string;
  role: string[]; // Updated to array
  phone?: string;
  is_first_login?: boolean;
  profile_completed?: boolean;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  signingOut: boolean;
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

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [signingOut, setSigningOut] = useState(false);
  const lastLoggedSessionId = React.useRef<string | null>(null);
  const currentProfileIdRef = React.useRef<string | null>(null);

  const fetchProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error) throw error;
      setProfile(data);
      currentProfileIdRef.current = data?.id || null;
    } catch (error: any) {
      console.error('Error fetching profile:', error);

      // CRITICAL: Always clear profile on error to prevent stuck loading
      setProfile(null);
      currentProfileIdRef.current = null;

      toast({
        title: 'Profile Error',
        description: 'Unable to load profile. Please refresh or contact support.',
        variant: 'destructive',
      });

      // If this is a critical error (no profile found), sign out the user
      // This prevents them from being stuck in a broken auth state
      if (error?.code === 'PGRST116') { // PostgreSQL "no rows returned" error
        console.warn('No profile found for user - verify profile exists in DB');
        // REMOVED: await supabase.auth.signOut(); 
        // We do NOT sign out automatically to prevent loops/bad UX.
      }
    }
  };


  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);

        if (session?.user) {
          // Check if we've already logged this specific access token
          const storageKey = 'aaroh_session_logged_id';
          const lastLoggedToken = typeof window !== 'undefined' ? sessionStorage.getItem(storageKey) : null;

          if (event === 'SIGNED_IN' && lastLoggedToken !== session.access_token) {
            // Update storage immediately to prevent race conditions
            if (typeof window !== 'undefined') {
              sessionStorage.setItem(storageKey, session.access_token);
            }

            // Log the login event
            const { data: p } = await supabase
              .from('profiles')
              .select('id')
              .eq('user_id', session.user.id)
              .single();

            if (p?.id) {
              await logUserLogin(p.id, {
                login_method: 'email_password',
                timestamp: new Date().toISOString()
              });
            }
          }

          fetchProfile(session.user.id);
        } else {
          // Handle logout event
          if (event === 'SIGNED_OUT' && currentProfileIdRef.current) {
            console.log('[AuthContext] Logging out user:', currentProfileIdRef.current);
            try {
              await logUserLogout(currentProfileIdRef.current);
              console.log('[AuthContext] Logout logged successfully');
            } catch (error) {
              console.error('[AuthContext] Failed to log logout:', error);
            }
            if (typeof window !== 'undefined') {
              sessionStorage.removeItem('aaroh_session_logged_id');
            }
            lastLoggedSessionId.current = null;
            currentProfileIdRef.current = null;
          } else if (event === 'SIGNED_OUT') {
            console.warn('[AuthContext] SIGNED_OUT event fired but no currentProfileIdRef');
          }
          setProfile(null);
        }
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        // Just fetch profile, login logging is handled in onAuthStateChange
        fetchProfile(session.user.id);
      }
      setLoading(false);
    });

    // CRITICAL FAILSAFE: Force loading to false after 10 seconds
    // This prevents infinite loading spinner if something goes wrong
    const loadingTimeout = setTimeout(() => {
      console.warn('[AuthContext] Loading timeout triggered - forcing loading to false');
      setLoading(false);
    }, 10000);

    return () => {
      subscription.unsubscribe();
      clearTimeout(loadingTimeout);
    };
  }, []);

  const signIn = async (identifier: string, password: string) => {
    try {
      // Dual login support:
      // - Students: use roll number (gets converted to system email)
      // - Admins/Coordinators: use email directly

      let loginEmail = identifier;

      console.log('🔐 signIn called with identifier:', identifier, 'contains @:', identifier.includes('@'));

      // If identifier doesn't contain @, treat as roll number
      if (!identifier.includes('@')) {
        // Try to get the actual email from the database first
        console.log('🔍 Lookup actual email for:', identifier);
        const { data: realEmail, error: lookupError } = await supabase
          .rpc('get_student_login_email' as any, { p_roll_number: identifier });

        console.log('🔍 Lookup result:', { realEmail, lookupError });

        if (realEmail && !lookupError) {
          loginEmail = realEmail as string;
        } else {
          // Fallback to system email format if not found (or for initial login)
          const rollNumber = identifier.toUpperCase();
          loginEmail = `noreply-${rollNumber}@ekc.edu.in`;
          console.log('⚠️ Fallback to system email:', loginEmail);
        }
      }

      const { error } = await supabase.auth.signInWithPassword({
        email: loginEmail,
        password,
      });

      if (error) throw error;
      return { error: null };
    } catch (error) {
      return { error: error as Error };
    }
  };

  const signUp = async (email: string, password: string, fullName: string, role: string) => {
    try {
      const redirectUrl = `${window.location.origin}/`;

      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: redirectUrl,
          data: {
            full_name: fullName,
            role: role,
          },
        },
      });

      if (error) throw error;
      return { error: null };
    } catch (error) {
      return { error: error as Error };
    }
  };

  const signOut = async () => {
    try {
      setSigningOut(true);

      // Log logout activity in background (non-blocking)
      if (profile?.id) {
        logUserLogout(profile.id).catch(logError => {
          console.warn('Failed to log logout activity (non-critical):', logError);
        });
      }

      // Perform sign-out with timeout to prevent hanging
      const signOutPromise = supabase.auth.signOut();
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Signout timeout')), 2000)
      );

      try {
        await Promise.race([signOutPromise, timeoutPromise]);
      } catch (error) {
        console.warn('Signout completed with error or timeout:', error);
      }

    } catch (error) {
      console.error('Error in signOut process:', error);
    } finally {
      // ALWAYS perform cleanup and redirect, regardless of API result
      try {
        if (typeof window !== 'undefined') {
          sessionStorage.clear();
          localStorage.clear(); // Aggressively clear everything
        }

        setUser(null);
        setSession(null);
        setProfile(null);
        currentProfileIdRef.current = null;
        setSigningOut(false);

        window.location.href = '/auth';
      } catch (cleanupError) {
        console.error('Error during cleanup:', cleanupError);
        window.location.href = '/auth'; // Last resort
      }
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        profile,
        loading,
        signingOut,
        signIn,
        signUp,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};