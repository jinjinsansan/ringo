"use client";
/* eslint-disable react-hooks/set-state-in-effect */

import { useCallback, useEffect, useMemo, useState } from "react";

import type { User } from "@supabase/supabase-js";

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
};

export const statusOrder: UserStatus[] = [
  "registered",
  "terms_agreed",
  "tutorial_completed",
  "ready_to_purchase",
  "verifying",
  "ready_to_draw",
  "first_purchase_completed",
  "active",
];

const defaultUser: RingoUser | null = null;

export const useUser = () => {
  const supabase = useMemo(() => createSupabaseClient(), []);
  const [user, setUser] = useState<RingoUser | null>(defaultUser);
  const [isLoading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const mapUser = useCallback((authUser: User | null) => {
    if (!authUser) return null;

    const status = String(authUser.user_metadata?.status ?? "registered") as UserStatus;
    return {
      id: authUser.id,
      email: authUser.email ?? "",
      status: statusOrder.includes(status) ? status : "registered",
    } satisfies RingoUser;
  }, []);

  const fetchUser = useCallback(async () => {
    setLoading(true);
    const { data, error: fetchError } = await supabase.auth.getUser();
    if (fetchError) {
      setError(fetchError.message);
      setUser(null);
    } else {
      setError(null);
      setUser(mapUser(data.user));
    }
    setLoading(false);
  }, [mapUser, supabase]);

  useEffect(() => {
    fetchUser();
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => {
      fetchUser();
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
