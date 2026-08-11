"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import type { Session } from "@supabase/supabase-js";
import { getSupabaseClient } from "./supabase";
import { fetchIsSuperAdmin } from "./superadmin";

type AuthValue = {
  session: Session | null;
  loading: boolean;
  /** True only for the allowlisted superadmin account — see lib/superadmin.ts. */
  isSuperAdmin: boolean;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthValue>({
  session: null,
  loading: true,
  isSuperAdmin: false,
  signOut: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  // Stored with the id it was fetched for, so the result can be matched
  // against the current session rather than reset in an effect.
  const [role, setRole] = useState<{ userId: string; value: boolean } | null>(
    null
  );

  useEffect(() => {
    const supabase = getSupabaseClient();

    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, next) => {
        setSession(next);
        setLoading(false);
      }
    );

    return () => listener.subscription.unsubscribe();
  }, []);

  // The role lives in the database, so it has to be fetched rather than
  // derived from the session.
  const userId = session?.user.id;
  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    fetchIsSuperAdmin(userId).then((value) => {
      if (!cancelled) setRole({ userId, value });
    });
    return () => {
      cancelled = true;
    };
  }, [userId]);

  // Only honour a result that belongs to the user currently signed in, so a
  // previous session's role can never carry over — and so the answer is
  // false while the fetch is still in flight.
  const isSuperAdmin = Boolean(
    userId && role?.userId === userId && role.value
  );

  const value = useMemo<AuthValue>(
    () => ({
      session,
      loading,
      isSuperAdmin,
      signOut: async () => {
        await getSupabaseClient().auth.signOut();
      },
    }),
    [session, loading, isSuperAdmin]
  );

  return <AuthContext value={value}>{children}</AuthContext>;
}

export function useAuth() {
  return useContext(AuthContext);
}
