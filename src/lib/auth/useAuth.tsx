"use client";

import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { getBrowserSupabase } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

export type Meet42Profile = {
  id: string;
  first_name: string;
  age: number;
  photo_url?: string | null;
  bio?: string | null;
};

type AuthUser = {
  id: string;
  email?: string | null;
};

type AuthContextValue = {
  status: "loading" | "anonymous" | "authenticated";
  user: AuthUser | null;
  accessToken: string | null;
  profile: Meet42Profile | null;
  profileStatus: "unknown" | "missing" | "ready" | "error";
  signInWithEmail: (email: string, password: string) => Promise<void>;
  signUpWithEmail: (email: string, password: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signInWithFacebook: () => Promise<void>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  updateProfile: (payload: {
    first_name: string;
    age: number;
    photo_url?: string;
    bio?: string;
  }) => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

const MOCK_USER_KEY = "meet42_mock_user_v1";
const MOCK_ACCESS_TOKEN_KEY = "meet42_mock_access_token_v1";

function loadMockUser(): AuthUser | null {
  try {
    const raw = localStorage.getItem(MOCK_USER_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as AuthUser;
  } catch {
    return null;
  }
}

function saveMockUser(user: AuthUser) {
  localStorage.setItem(MOCK_USER_KEY, JSON.stringify(user));
}

function clearMockUser() {
  localStorage.removeItem(MOCK_USER_KEY);
  localStorage.removeItem(MOCK_ACCESS_TOKEN_KEY);
}

function getMockHeaders(userId: string | null) {
  return userId ? { "x-user-id": userId } : {};
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const supabase = useMemo(() => getBrowserSupabase(), []);

  const [status, setStatus] = useState<AuthContextValue["status"]>("loading");
  const [user, setUser] = useState<AuthUser | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);

  const [profile, setProfile] = useState<Meet42Profile | null>(null);
  const [profileStatus, setProfileStatus] = useState<AuthContextValue["profileStatus"]>("unknown");

  async function refreshProfileInner(targetUserId?: string | null) {
    const effectiveUserId = targetUserId ?? user?.id ?? null;
    setProfileStatus("unknown");

    try {
      const headers: Record<string, string> = {};
      if (supabase && accessToken) headers["Authorization"] = `Bearer ${accessToken}`;
      else Object.assign(headers, getMockHeaders(effectiveUserId));

      const res = await fetch("/api/profile/me", {
        method: "GET",
        headers,
      });

      if (res.status === 404) {
        setProfile(null);
        setProfileStatus("missing");
        return;
      }

      if (!res.ok) {
        setProfileStatus("error");
        return;
      }

      const data = (await res.json()) as Meet42Profile;
      setProfile(data);
      setProfileStatus("ready");
    } catch {
      setProfileStatus("error");
    }
  }

  async function ensureAuthStateFromSupabase() {
    if (!supabase) {
      const mockUser = loadMockUser();
      if (mockUser) {
        setStatus("authenticated");
        setUser(mockUser);
        setAccessToken(localStorage.getItem(MOCK_ACCESS_TOKEN_KEY));
        await refreshProfileInner(mockUser.id);
      } else {
        setStatus("anonymous");
        setUser(null);
        setAccessToken(null);
        setProfile(null);
        setProfileStatus("unknown");
      }
      return;
    }

    const { data } = await supabase.auth.getSession();
    const session = data.session;

    if (!session) {
      setStatus("anonymous");
      setUser(null);
      setAccessToken(null);
      setProfile(null);
      setProfileStatus("unknown");
      return;
    }

    const authUser: AuthUser = {
      id: session.user.id,
      email: session.user.email,
    };

    setStatus("authenticated");
    setUser(authUser);
    setAccessToken(session.access_token);
    await refreshProfileInner(authUser.id);
  }

  useEffect(() => {
    // Initialisation: session Supabase ou “mock auth”.
    ensureAuthStateFromSupabase();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!supabase) return;
    const { data: sub } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (!session) {
        setStatus("anonymous");
        setUser(null);
        setAccessToken(null);
        setProfile(null);
        setProfileStatus("unknown");
        return;
      }

      const authUser: AuthUser = {
        id: session.user.id,
        email: session.user.email,
      };
      setStatus("authenticated");
      setUser(authUser);
      setAccessToken(session.access_token);
      await refreshProfileInner(authUser.id);
    });

    return () => sub.subscription.unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [supabase]);

  const value: AuthContextValue = useMemo(
    () => ({
      status,
      user,
      accessToken,
      profile,
      profileStatus,
      refreshProfile: () => refreshProfileInner(),
      signInWithEmail: async (email, password) => {
        if (!supabase) {
          const id = crypto.randomUUID();
          saveMockUser({ id, email });
          localStorage.setItem(MOCK_ACCESS_TOKEN_KEY, crypto.randomUUID());
          setUser({ id, email });
          setAccessToken(localStorage.getItem(MOCK_ACCESS_TOKEN_KEY));
          setStatus("authenticated");
          await refreshProfileInner(id);
          return;
        }

        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      },
      signUpWithEmail: async (email, password) => {
        if (!supabase) {
          const id = crypto.randomUUID();
          saveMockUser({ id, email });
          localStorage.setItem(MOCK_ACCESS_TOKEN_KEY, crypto.randomUUID());
          setUser({ id, email });
          setAccessToken(localStorage.getItem(MOCK_ACCESS_TOKEN_KEY));
          setStatus("authenticated");
          await refreshProfileInner(id);
          return;
        }

        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        // Supabase peut exiger la confirmation email selon la config. On recharge la session ensuite.
      },
      signInWithGoogle: async () => {
        if (!supabase) {
          const id = crypto.randomUUID();
          saveMockUser({ id, email: null });
          localStorage.setItem(MOCK_ACCESS_TOKEN_KEY, crypto.randomUUID());
          setUser({ id, email: null });
          setAccessToken(localStorage.getItem(MOCK_ACCESS_TOKEN_KEY));
          setStatus("authenticated");
          await refreshProfileInner(id);
          return;
        }

        const redirectTo = window.location.origin;
        const { error } = await supabase.auth.signInWithOAuth({
          provider: "google",
          options: { redirectTo },
        });
        if (error) throw error;
      },
      signInWithFacebook: async () => {
        if (!supabase) {
          const id = crypto.randomUUID();
          saveMockUser({ id, email: null });
          localStorage.setItem(MOCK_ACCESS_TOKEN_KEY, crypto.randomUUID());
          setUser({ id, email: null });
          setAccessToken(localStorage.getItem(MOCK_ACCESS_TOKEN_KEY));
          setStatus("authenticated");
          await refreshProfileInner(id);
          return;
        }

        const redirectTo = window.location.origin;
        const { error } = await supabase.auth.signInWithOAuth({
          provider: "facebook",
          options: { redirectTo },
        });
        if (error) throw error;
      },
      signOut: async () => {
        if (!supabase) {
          clearMockUser();
          setStatus("anonymous");
          setUser(null);
          setAccessToken(null);
          setProfile(null);
          setProfileStatus("unknown");
          router.push("/login");
          return;
        }

        await supabase.auth.signOut();
        setStatus("anonymous");
        setUser(null);
        setAccessToken(null);
        setProfile(null);
        setProfileStatus("unknown");
        router.push("/login");
      },
      updateProfile: async (payload) => {
        const headers: Record<string, string> = {
          "content-type": "application/json",
        };
        if (supabase && accessToken) headers["Authorization"] = `Bearer ${accessToken}`;
        else Object.assign(headers, getMockHeaders(user?.id ?? null));

        const res = await fetch("/api/profile/me", {
          method: "POST",
          headers,
          body: JSON.stringify(payload),
        });

        if (!res.ok) {
          const raw = await res.text();
          let msg = "Impossible de sauvegarder le profil";
          try {
            const j = JSON.parse(raw) as { error?: unknown };
            if (typeof j?.error === "string" && j.error.trim()) msg = j.error.trim();
          } catch {
            /* ignore */
          }
          throw new Error(msg);
        }
        await refreshProfileInner();
      },
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [status, user, accessToken, profile, profileStatus, supabase]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth doit être utilisé dans AuthProvider");
  return ctx;
}

