import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase, Profile, UserRole } from '@/lib/supabase';

interface AuthContextType {
  user: User | null;
  profile: Profile | null;
  session: Session | null;
  isLoading: boolean;
  isAdmin: boolean;
  isChiefAdmin: boolean;
  signUp: (email: string, password: string, fullName: string, role: UserRole, phone?: string, pais?: string) => Promise<{ error: Error | null }>;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  checkAdminStatus: () => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isChiefAdmin, setIsChiefAdmin] = useState(false);

  const fetchProfile = async (userId: string) => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (error) {
      console.error('Error fetching profile:', error);
      return null;
    }

    return data as Profile | null;
  };

  const checkAdminStatus = async (): Promise<boolean> => {
    const [adminResult, chiefResult] = await Promise.all([
      supabase.rpc('is_admin'),
      supabase.rpc('is_chief_admin' as any),
    ]);
    if (adminResult.error) {
      console.error('Error checking admin status:', adminResult.error);
      return false;
    }
    setIsAdmin(adminResult.data === true);
    setIsChiefAdmin(chiefResult.data === true);
    return adminResult.data === true;
  };
 
  useEffect(() => {
    let isMounted = true;
    let initialized = false;

    // Listener for ONGOING auth changes (skips INITIAL_SESSION to avoid duplicates)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!isMounted) return;
      // Only react to meaningful auth changes, not token refreshes or initial load
      if (event === 'INITIAL_SESSION' || event === 'TOKEN_REFRESHED') return;

      setSession(session);
      setUser(session?.user ?? null);

      if (session?.user) {
        fetchProfile(session.user.id).then(p => {
          if (isMounted) setProfile(p);
        });
        checkAdminStatus();
      } else {
        setProfile(null);
        setIsAdmin(false);
        setIsChiefAdmin(false);
      }
    });

    // INITIAL load (controls isLoading)
    const initializeAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!isMounted) return;

        setSession(session);
        setUser(session?.user ?? null);

        if (session?.user) {
          const [profile] = await Promise.all([
            fetchProfile(session.user.id),
            checkAdminStatus(),
          ]);
          if (isMounted) setProfile(profile);
        }
      } finally {
        if (isMounted) {
          initialized = true;
          setIsLoading(false);
        }
      }
    };

    initializeAuth();

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const signUp = async (email: string, password: string, fullName: string, role: UserRole, phone?: string, pais?: string) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: window.location.origin,
        data: {
          full_name: fullName,
          role: role,
          phone: phone || null,
          pais: pais || 'BR',
        },
      },
    });

    return { error: error as Error | null };
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    return { error: error as Error | null };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setProfile(null);
    setSession(null);
    setIsAdmin(false);
    setIsChiefAdmin(false);
  };

  return (
     <AuthContext.Provider value={{ user, profile, session, isLoading, isAdmin, isChiefAdmin, signUp, signIn, signOut, checkAdminStatus }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
