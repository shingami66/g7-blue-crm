import { NextRequest } from "next/server";
import { verifyWebhook } from "@clerk/nextjs/webhooks";
import { createAdminClient } from "@/lib/supabase/admin";
import { CRM_ROLES } from "@/lib/admin/users/schemas";
import type { WebhookEvent, UserWebhookEvent } from "@clerk/nextjs/server";

const NO_ROW_ERROR_CODE = "PGRST116";

export async function POST(req: NextRequest) {
  const WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SIGNING_SECRET;

  if (!WEBHOOK_SECRET) {
    console.error("[Clerk Webhook] Missing CLERK_WEBHOOK_SIGNING_SECRET in environment variables.");
    return new Response("Server configuration error", { status: 500 });
  }

  // Verify the webhook signature using the built-in Svix verifier
  let evt: WebhookEvent;
  try {
    evt = await verifyWebhook(req, {
      signingSecret: WEBHOOK_SECRET,
    });
  } catch (err) {
    console.error("[Clerk Webhook] Error verifying webhook:", err);
    return new Response("Invalid signature", { status: 400 });
  }

  const { id } = evt.data;
  const eventType = evt.type;

  console.log(`[Clerk Webhook] Received event ${eventType} for user ${id}`);

  if (eventType === "user.created") {
    const data = (evt as UserWebhookEvent).data;

    if (!("public_metadata" in data)) {
      console.error(`[Clerk Webhook] Rejected: Missing public_metadata for user ${id}`);
      return new Response("Ignored: Missing metadata", { status: 200 });
    }

    // Extract intended role from public_metadata
    const intendedRole = data.public_metadata?.crm_role;

    if (!intendedRole || typeof intendedRole !== "string" || !CRM_ROLES.includes(intendedRole as typeof CRM_ROLES[number])) {
      console.error(`[Clerk Webhook] Rejected: Missing, invalid, or unrecognized role in public_metadata for user ${id}. Intended role: ${intendedRole}`);
      // Return 200 to acknowledge receipt and prevent Clerk retries,
      // since this is a hard business rule rejection, not a transient error.
      return new Response("Ignored: Invalid or missing CRM role", { status: 200 });
    }

    // Safely extract email
    const primaryEmailId = data.primary_email_address_id;
    const emailObj = data.email_addresses.find(e => e.id === primaryEmailId) || data.email_addresses[0];
    const email = emailObj?.email_address;

    if (!email) {
      console.error(`[Clerk Webhook] Rejected: No email address found for user ${id}`);
      return new Response("Ignored: Missing email", { status: 200 });
    }

    // Safely extract name
    const firstName = data.first_name || "";
    const lastName = data.last_name || "";
    const name = `${firstName} ${lastName}`.trim() || "Unnamed User";

    const supabase = createAdminClient();

    // Check if user already exists to handle idempotency safely
    const { data: existingUser, error: existingUserError } = await supabase
      .from("app_users")
      .select("id")
      .eq("clerk_user_id", id)
      .single();

    if (existingUserError && existingUserError.code !== NO_ROW_ERROR_CODE) {
      console.error(`[Clerk Webhook] Failed to check existing app_user for ${id}:`, existingUserError.message);
      return new Response("Database lookup failed", { status: 500 });
    }

    if (existingUser) {
      console.log(`[Clerk Webhook] User ${id} already exists in app_users, skipping insertion.`);
      return new Response("Idempotent skip", { status: 200 });
    }

    // Insert new app_user row
    const { error } = await supabase
      .from("app_users")
      .insert({
        clerk_user_id: id,
        email: email,
        name: name,
        role: intendedRole,
        is_active: true,
      });

    if (error) {
      console.error(`[Clerk Webhook] Failed to insert app_user for ${id}:`, error.message);
      // Return 500 to let Clerk retry
      return new Response("Database insert failed", { status: 500 });
    }

    console.log(`[Clerk Webhook] Successfully created app_users row for ${email} with role ${intendedRole}`);
  }

  return new Response("Webhook processed", { status: 200 });
}
