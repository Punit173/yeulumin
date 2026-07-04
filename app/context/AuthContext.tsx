"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { User } from "@supabase/supabase-js";
import { supabase, isSupabaseConfigured } from "../lib/supabase";

interface Profile {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  is_admin: boolean;
  updated_at: string;
}

interface AuthContextType {
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  signOut: () => Promise<void>;
  bypassLogin: () => void;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  profile: null,
  loading: true,
  signOut: async () => {},
  bypassLogin: () => {},
});

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = async (userId: string) => {
    if (!isSupabaseConfigured()) return;
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .single();

      if (error) {
        console.warn("Failed to fetch profile:", error.message);
        // Fallback profile
        setProfile({
          id: userId,
          full_name: "Anonymous User",
          avatar_url: null,
          is_admin: false,
          updated_at: new Date().toISOString(),
        });
      } else {
        setProfile(data as Profile);
      }
    } catch (err) {
      console.error("Error fetching profile:", err);
    }
  };

  useEffect(() => {
    if (!isSupabaseConfigured()) {
      setLoading(false);
      return;
    }

    // Get current session
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session) {
        setUser(session.user);
        await fetchProfile(session.user.id);
      } else {
        setUser(null);
        setProfile(null);
      }
      setLoading(false);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setLoading(true);
        if (session) {
          setUser(session.user);
          await fetchProfile(session.user.id);
        } else {
          setUser(null);
          setProfile(null);
        }
        setLoading(false);
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const signOut = async () => {
    if (isSupabaseConfigured()) {
      await supabase.auth.signOut();
    }
    setUser(null);
    setProfile(null);
  };

  const bypassLogin = () => {
    setUser({
      id: "demo-user-id",
      email: "demo@yeulumin.ai",
      user_metadata: { full_name: "Demo Admin" },
    } as any);
    setProfile({
      id: "demo-user-id",
      full_name: "Demo Admin",
      avatar_url: null,
      is_admin: true,
      updated_at: new Date().toISOString(),
    });
    setLoading(false);
  };

  return (
    <AuthContext.Provider value={{ user, profile, loading, signOut, bypassLogin }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
