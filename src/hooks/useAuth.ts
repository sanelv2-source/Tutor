import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

export const useAuth = () => {
  const [user, setUser] = useState<any>(null);
  const [role, setRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    const fetchUser = async () => {
      try {
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) throw sessionError;
        
        if (session) {
          // Check session timeout (24 hours)
          const sessionAge = Date.now() - new Date(session.user.last_sign_in_at || session.user.created_at).getTime();
          const twentyFourHours = 24 * 60 * 60 * 1000;
          
          if (sessionAge > twentyFourHours) {
            await supabase.auth.signOut();
            if (mounted) {
              setUser(null);
              setRole(null);
              setLoading(false);
            }
            return;
          }

          const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('*')
            .eq('email', session.user.email)
            .single();

          if (profileError && profileError.code !== 'PGRST116') {
            console.error('Error fetching profile:', profileError);
          }

          if (mounted) {
            setUser(session.user);
            setRole(profile?.role || null);
          }
        } else {
          if (mounted) {
            setUser(null);
            setRole(null);
          }
        }
      } catch (err: any) {
        if (err?.message?.includes('Refresh Token')) {
          await supabase.auth.signOut().catch(() => {});
        } else {
          console.error('Auth error:', err);
        }
        if (mounted) {
          setUser(null);
          setRole(null);
        }
      } finally {
        if (mounted) setLoading(false);
      }
    };

    fetchUser();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('email', session.user.email)
          .single();
          
        if (mounted) {
          setUser(session.user);
          setRole(profile?.role || null);
          setLoading(false);
        }
      } else {
        if (mounted) {
          setUser(null);
          setRole(null);
          setLoading(false);
        }
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  return { user, role, loading };
};
