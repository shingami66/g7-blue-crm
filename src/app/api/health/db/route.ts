import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

const SAFE_CORRELATION_ID_REGEX = /^[a-zA-Z0-9_-]{1,64}$/;

function sanitizeCorrelationId(candidate: unknown): string {
  if (
    typeof candidate === "string" &&
    SAFE_CORRELATION_ID_REGEX.test(candidate)
  ) {
    return candidate;
  }
  return crypto.randomUUID();
}

export async function GET(req?: Request) {
  const rawCorrelationId =
    req?.headers?.get("x-request-id") ||
    req?.headers?.get("x-correlation-id");
  const correlationId = sanitizeCorrelationId(rawCorrelationId);

  try {
    const supabase = createAdminClient();
    
    // Perform a lightweight read-only check
    const { error } = await supabase
      .from("number_sequences")
      .select("id")
      .limit(1);

    if (error) {
      console.error(
        `[Health Check] [${correlationId}] Database check failed: query_error`
      );
      return NextResponse.json(
        { ok: false, database: "supabase", error: "Database connection or query failed.", timestamp: new Date().toISOString() },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ok: true,
      database: "supabase",
      timestamp: new Date().toISOString()
    });
  } catch {
    console.error(
      `[Health Check] [${correlationId}] Health check unexpected error: dependency_unavailable`
    );
    return NextResponse.json(
      { ok: false, database: "supabase", error: "Internal server error.", timestamp: new Date().toISOString() },
      { status: 500 }
    );
  }
}
