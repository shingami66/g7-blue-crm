import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET() {
  try {
    const supabase = createAdminClient();
    
    // Perform a lightweight read-only check
    const { error } = await supabase
      .from("number_sequences")
      .select("id")
      .limit(1);

    if (error) {
      console.error("DB Health check failed:", error.message);
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
  } catch (error) {
    console.error("Health route exception:", error);
    return NextResponse.json(
      { ok: false, database: "supabase", error: "Internal server error.", timestamp: new Date().toISOString() },
      { status: 500 }
    );
  }
}
