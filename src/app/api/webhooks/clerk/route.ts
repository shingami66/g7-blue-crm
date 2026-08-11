import { NextRequest } from "next/server";
import { verifyWebhook } from "@clerk/nextjs/webhooks";
import type { WebhookEvent, UserWebhookEvent } from "@clerk/nextjs/server";
import { CRM_ROLES } from "@/lib/admin/users/schemas";
import { getClerkWebhookEnv } from "@/lib/env";
import { createAdminClient } from "@/lib/supabase/admin";

const NO_ROW_ERROR_CODE = "PGRST116";

export async function POST(req: NextRequest) {
  const { CLERK_WEBHOOK_SIGNING_SECRET: webhookSecret } = getClerkWebhookEnv();

  if (!webhookSecret) {
    console.error(
      "[Clerk Webhook] Missing CLERK_WEBHOOK_SIGNING_SECRET in environment variables."
    );
    return new Response("Server configuration error", { status: 500 });
  }

  let evt: WebhookEvent;
  try {
    evt = await verifyWebhook(req, {
      signingSecret: webhookSecret,
    });
  } catch {
    console.error("[Clerk Webhook] Webhook signature verification failed.");
    return new Response("Invalid signature", { status: 400 });
  }

  const { id } = evt.data;
  const eventType = evt.type;

  console.log(`[Clerk Webhook] Received event: ${eventType}`);

  if (eventType === "user.created") {
    const data = (evt as UserWebhookEvent).data;

    if (!("public_metadata" in data)) {
      console.error(
        "[Clerk Webhook] Rejected: Missing public_metadata"
      );
      return new Response("Ignored: Missing metadata", { status: 200 });
    }

    const intendedRole = data.public_metadata?.crm_role;

    if (
      !intendedRole ||
      typeof intendedRole !== "string" ||
      !CRM_ROLES.includes(intendedRole as (typeof CRM_ROLES)[number])
    ) {
      console.error(
        "[Clerk Webhook] Rejected: Missing or invalid role in public_metadata"
      );
      return new Response("Ignored: Invalid or missing CRM role", {
        status: 200,
      });
    }

    const primaryEmailId = data.primary_email_address_id;
    const emailObj =
      data.email_addresses.find((emailAddress) => emailAddress.id === primaryEmailId) ||
      data.email_addresses[0];
    const email = emailObj?.email_address;

    if (!email) {
      console.error(
        "[Clerk Webhook] Rejected: Missing email address in payload"
      );
      return new Response("Ignored: Missing email", { status: 200 });
    }

    const firstName = data.first_name || "";
    const lastName = data.last_name || "";
    const name = `${firstName} ${lastName}`.trim() || "Unnamed User";

    const supabase = createAdminClient();

    const { data: existingUser, error: existingUserError } = await supabase
      .from("app_users")
      .select("id")
      .eq("clerk_user_id", id)
      .single();

    if (existingUserError && existingUserError.code !== NO_ROW_ERROR_CODE) {
      console.error(
        "[Clerk Webhook] Database lookup failed while checking existing user."
      );
      return new Response("Database lookup failed", { status: 500 });
    }

    if (existingUser) {
      console.log(
        "[Clerk Webhook] User already exists in app_users, skipping insertion."
      );
      return new Response("Idempotent skip", { status: 200 });
    }

    const { error } = await supabase.from("app_users").insert({
      clerk_user_id: id,
      email,
      name,
      role: intendedRole,
      is_active: true,
    });

    if (error) {
      console.error(
        "[Clerk Webhook] Failed to insert app_user."
      );
      return new Response("Database insert failed", { status: 500 });
    }

    console.log(
      "[Clerk Webhook] Successfully created app_users row."
    );
  }

  return new Response("Webhook processed", { status: 200 });
}
