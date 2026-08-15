import { NextRequest } from "next/server";
import { verifyWebhook } from "@clerk/nextjs/webhooks";
import type { WebhookEvent, UserWebhookEvent } from "@clerk/nextjs/server";
import { CRM_ROLES } from "@/lib/admin/users/schemas";
import { getClerkWebhookEnv } from "@/lib/env";
import { createAdminClient } from "@/lib/supabase/admin";

const NO_ROW_ERROR_CODE = "PGRST116";
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

export async function POST(req: NextRequest) {
  const rawCorrelationId =
    req.headers.get("svix-id") ||
    req.headers.get("x-request-id") ||
    req.headers.get("x-correlation-id");
  const correlationId = sanitizeCorrelationId(rawCorrelationId);

  let webhookSecret: string | undefined;
  try {
    const env = getClerkWebhookEnv();
    webhookSecret = env.CLERK_WEBHOOK_SIGNING_SECRET;
  } catch {
    // Missing or invalid signing secret handled safely inside route contract
  }

  if (!webhookSecret) {
    console.error(
      `[Clerk Webhook] [${correlationId}] Configuration error: missing or invalid signing secret`
    );
    return new Response("Server configuration error", { status: 500 });
  }

  let evt: WebhookEvent;
  try {
    evt = await verifyWebhook(req, {
      signingSecret: webhookSecret,
    });
  } catch {
    console.error(
      `[Clerk Webhook] [${correlationId}] Verification failed: invalid signature`
    );
    return new Response("Invalid signature", { status: 400 });
  }

  const { id } = evt.data;
  const eventType = evt.type;

  console.log(`[Clerk Webhook] [${correlationId}] Received event: ${eventType}`);

  if (eventType === "user.created") {
    const data = (evt as UserWebhookEvent).data;

    if (!("public_metadata" in data)) {
      console.error(
        `[Clerk Webhook] [${correlationId}] Rejected: missing public_metadata`
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
        `[Clerk Webhook] [${correlationId}] Rejected: invalid CRM role`
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
        `[Clerk Webhook] [${correlationId}] Rejected: missing email`
      );
      return new Response("Ignored: Missing email", { status: 200 });
    }

    const firstName = data.first_name || "";
    const lastName = data.last_name || "";
    const name = `${firstName} ${lastName}`.trim() || "Unnamed User";

    let existingUser: { id: string } | null = null;
    try {
      const supabase = createAdminClient();

      const { data: foundUser, error: existingUserError } = await supabase
        .from("app_users")
        .select("id")
        .eq("clerk_user_id", id)
        .single();

      if (existingUserError && existingUserError.code !== NO_ROW_ERROR_CODE) {
        console.error(
          `[Clerk Webhook] [${correlationId}] Database lookup error: user_lookup_failed`
        );
        return new Response("Database lookup failed", { status: 500 });
      }

      existingUser = foundUser;
    } catch {
      console.error(
        `[Clerk Webhook] [${correlationId}] Database lookup error: user_lookup_failed`
      );
      return new Response("Database lookup failed", { status: 500 });
    }

    if (existingUser) {
      console.log(
        `[Clerk Webhook] [${correlationId}] User already exists, skipping insertion`
      );
      return new Response("Idempotent skip", { status: 200 });
    }

    try {
      const supabase = createAdminClient();
      const { error } = await supabase.from("app_users").insert({
        clerk_user_id: id,
        email,
        name,
        role: intendedRole,
        is_active: true,
      });

      if (error) {
        const { data: concurrentUser, error: recheckError } = await supabase
          .from("app_users")
          .select("id")
          .eq("clerk_user_id", id)
          .single();

        if (!recheckError && concurrentUser) {
          console.log(
            `[Clerk Webhook] [${correlationId}] User already exists, skipping insertion`
          );
          return new Response("Idempotent skip", { status: 200 });
        }

        console.error(
          `[Clerk Webhook] [${correlationId}] Database insert error: user_insert_failed`
        );
        return new Response("Database insert failed", { status: 500 });
      }
    } catch {
      console.error(
        `[Clerk Webhook] [${correlationId}] Database insert error: user_insert_failed`
      );
      return new Response("Database insert failed", { status: 500 });
    }

    console.log(
      `[Clerk Webhook] [${correlationId}] Successfully created app_users row`
    );
  }

  return new Response("Webhook processed", { status: 200 });
}
