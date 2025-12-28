"use client";
/* eslint-disable react-hooks/set-state-in-effect */

import { useCallback, useEffect, useMemo, useState } from "react";

import { createSupabaseClient } from "@/lib/supabase/client";

export type UserStatus =
  | "registered"
  | "terms_agreed"
  | "tutorial_completed"
  | "ready_to_purchase"
  | "verifying"
  | "ready_to_draw"
  | "first_purchase_completed"
  | "active";

export type RingoUser = {
  id: string;
  email: string;
  status: UserStatus;
  isAdmin: boolean;
};

export const statusOrder: UserStatus[] = [
  "registered",
  "terms_agreed",
  "tutorial_completed",
  "ready_to_purchase",
  "verifying",
  "first_purchase_completed",
  "ready_to_draw",
  "active",
];

const adminEmails = (process.env.NEXT_PUBLIC_ADMIN_EMAILS ?? "")
  .split(",")
  .map((email) => email.trim().toLowerCase())
  .filter(Boolean);

const defaultUser: RingoUser | null = null;

export const useUser = () => {
  const supabase = useMemo(() => createSupabaseClient(), []);
  const [user, setUser] = useState<RingoUser | null>(defaultUser);
  const [isLoading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchUser = useCallback(async () => {
    setLoading(true);
    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession();

    if (sessionError) {
      setError(sessionError.message);
      setUser(null);
      setLoading(false);
      return;
    }

    const authUser = session?.user ?? null;
    if (!authUser) {
      setError(null);
      setUser(null);
      setLoading(false);
      return;
    }

    const { data: profile, error: profileError } = await supabase
      .from("users")
      .select("status, email")
      .eq("id", authUser.id)
      .single();

    if (profileError) {
      setError(profileError.message);
    } else {
      setError(null);
    }

    const statusValue = profile?.status as UserStatus | undefined;
    const safeStatus = statusValue && statusOrder.includes(statusValue) ? statusValue : "registered";
    const email = profile?.email ?? authUser.email ?? "";
    const normalizedEmail = email.toLowerCase();
    setUser({
      id: authUser.id,
      email,
      status: safeStatus,
      isAdmin: normalizedEmail ? adminEmails.includes(normalizedEmail) : false,
    });
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    fetchUser();
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        fetchUser();
      } else {
        setUser(null);
        setLoading(false);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [fetchUser, supabase]);

  return {
    user,
    isLoading,
    error,
    refresh: fetchUser,
  } as const;
};
