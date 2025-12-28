import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error("Supabase environment variables are not configured.");
}

// Singleton instance to preserve session across page reloads
let supabaseInstance: SupabaseClient | null = null;

export const createSupabaseClient = () => {
  if (supabaseInstance) {
    return supabaseInstance;
  }

  supabaseInstance = createBrowserClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      storage: typeof window !== 'undefined' ? window.localStorage : undefined,
      storageKey: 'ringokai-auth-token',
    },
  });

  return supabaseInstance;
};
