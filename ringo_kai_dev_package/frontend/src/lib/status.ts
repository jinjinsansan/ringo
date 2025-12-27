import type { SupabaseClient } from "@supabase/supabase-js";

import type { UserStatus } from "@/lib/user";

export const updateUserStatus = (
  supabase: SupabaseClient,
  userId: string,
  status: UserStatus,
  extra: Record<string, unknown> = {}
) =>
  supabase
    .from("users")
    .update({
      status,
      ...extra,
      updated_at: new Date().toISOString(),
    })
    .eq("id", userId)
    .single();
