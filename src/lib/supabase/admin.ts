// WARNING: This file must NEVER be imported in Client Components.
// It uses the service role key which bypasses all Row Level Security (RLS).
import "server-only";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { getServerEnv, publicEnv } from "../env";

export function createAdminClient() {
  if (typeof window !== "undefined") {
    throw new Error("createAdminClient must not be called in browser environments.");
  }

  const serverEnv = getServerEnv();

  return createSupabaseClient(
    publicEnv.NEXT_PUBLIC_SUPABASE_URL,
    serverEnv.SUPABASE_SERVICE_ROLE_KEY,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );
}
