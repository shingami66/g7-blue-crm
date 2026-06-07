// WARNING: This file must NEVER be imported in Client Components.
// It uses the service role key which bypasses all Row Level Security (RLS).
import "server-only";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { env } from "../env";

export function createAdminClient() {
  if (typeof window !== "undefined") {
    throw new Error("createAdminClient must not be called in browser environments.");
  }
  
  if (!env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY");
  }

  return createSupabaseClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.SUPABASE_SERVICE_ROLE_KEY,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );
}
