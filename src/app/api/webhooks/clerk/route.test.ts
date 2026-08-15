import assert from "node:assert/strict";
import { createRequire } from "node:module";
import test, { mock } from "node:test";

type ResolveResult = { url: string; shortCircuit?: true };
type ResolveContext = { parentURL?: string };
type ResolveHook = (
  specifier: string,
  context: ResolveContext,
  nextResolve: (specifier: string, context: ResolveContext) => ResolveResult,
) => ResolveResult;

const require = createRequire(import.meta.url);
const sourceRootUrl = new URL("../../../../", import.meta.url).href;
const { registerHooks } = require("node:module") as {
  registerHooks: (hooks: { resolve: ResolveHook }) => void;
};

registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier === "next/server") {
      return {
        shortCircuit: true,
        url: "data:text/javascript,export class NextRequest extends Request {}",
      };
    }

    if (specifier.startsWith("@/")) {
      return {
        shortCircuit: true,
        url: new URL(`../../../../${specifier.slice(2)}.ts`, import.meta.url).href,
      };
    }

    if (
      specifier.startsWith(".") &&
      !specifier.endsWith(".ts") &&
      context.parentURL?.startsWith(sourceRootUrl)
    ) {
      return nextResolve(`${specifier}.ts`, context);
    }

    return nextResolve(specifier, context);
  },
});

type WebhookScenario = {
  envThrows: boolean;
  webhookSecret: string | null;
  verifyThrows: boolean;
  verifiedEvent: Record<string, unknown> | null;
  existingUser: Record<string, unknown> | null;
  existingUserError: { code: string; message: string } | null;
  lookupThrows: boolean;
  insertError: { message: string } | null;
  insertThrows: boolean;
  insertedUsers: Array<Record<string, unknown>>;
  lookupResponses?: Array<{
    data: Record<string, unknown> | null;
    error: { code: string; message: string } | null;
  }>;
};

let currentScenario: WebhookScenario = {
  envThrows: false,
  webhookSecret: "whsec_test_secret",
  verifyThrows: false,
  verifiedEvent: null,
  existingUser: null,
  existingUserError: null,
  lookupThrows: false,
  insertError: null,
  insertThrows: false,
  insertedUsers: [],
};

function resetScenario(overrides: Partial<WebhookScenario> = {}) {
  currentScenario = {
    envThrows: false,
    webhookSecret: "whsec_test_secret",
    verifyThrows: false,
    verifiedEvent: {
      data: { id: "user_clerk_123" },
      type: "user.created",
    },
    existingUser: null,
    existingUserError: null,
    lookupThrows: false,
    insertError: null,
    insertThrows: false,
    insertedUsers: [],
    ...overrides,
  };
}

mock.module("@/lib/env", {
  namedExports: {
    getClerkWebhookEnv: () => {
      if (currentScenario.envThrows) {
        throw new Error("Invalid server environment variables");
      }
      return {
        CLERK_WEBHOOK_SIGNING_SECRET: currentScenario.webhookSecret || "",
      };
    },
  },
});

mock.module("@clerk/nextjs/webhooks", {
  namedExports: {
    verifyWebhook: async () => {
      if (currentScenario.verifyThrows) {
        throw new Error("Invalid webhook signature");
      }
      return currentScenario.verifiedEvent;
    },
  },
});

mock.module("@/lib/supabase/admin", {
  namedExports: {
    createAdminClient: () => ({
      from: (table: string) => {
        if (table === "app_users") {
          return {
            select: () => ({
              eq: () => ({
                single: async () => {
                  if (currentScenario.lookupThrows) {
                    throw new Error("Network connection reset during user lookup");
                  }
                  if (
                    currentScenario.lookupResponses &&
                    currentScenario.lookupResponses.length > 0
                  ) {
                    return currentScenario.lookupResponses.shift()!;
                  }
                  return {
                    data: currentScenario.existingUser,
                    error: currentScenario.existingUserError,
                  };
                },
              }),
            }),
            insert: async (user: Record<string, unknown>) => {
              if (currentScenario.insertThrows) {
                throw new Error("Socket closed during user insert");
              }
              currentScenario.insertedUsers.push(user);
              return {
                error: currentScenario.insertError,
              };
            },
          };
        }
        throw new Error(`Unexpected table ${table}`);
      },
    }),
  },
});

const { POST } = await import("./route.ts");

test("missing or invalid webhook signing secret returns 500 without throwing unhandled exception", async () => {
  resetScenario({ envThrows: true });

  const loggedErrors: string[] = [];
  const originalConsoleError = console.error;
  console.error = (...args: unknown[]) => {
    loggedErrors.push(args.map((a) => String(a)).join(" "));
  };

  try {
    const req = new Request("http://localhost:3000/api/webhooks/clerk", {
      method: "POST",
      headers: { "svix-id": "svix_msg_123" },
    });

    const res = await POST(req as unknown as import("next/server").NextRequest);
    assert.equal(res.status, 500);
    const body = await res.text();
    assert.equal(body, "Server configuration error");

    // Verify operational logs
    assert.equal(loggedErrors.length, 1);
    assert.equal(
      loggedErrors[0],
      "[Clerk Webhook] [svix_msg_123] Configuration error: missing or invalid signing secret",
    );
  } finally {
    console.error = originalConsoleError;
  }
});

test("empty webhook secret returns 500 without throwing", async () => {
  resetScenario({ webhookSecret: "" });

  const req = new Request("http://localhost:3000/api/webhooks/clerk", {
    method: "POST",
    headers: { "x-request-id": "req-wh-456" },
  });

  const res = await POST(req as unknown as import("next/server").NextRequest);
  assert.equal(res.status, 500);
  const body = await res.text();
  assert.equal(body, "Server configuration error");
});

test("invalid webhook signature returns 400", async () => {
  resetScenario({ verifyThrows: true });

  const req = new Request("http://localhost:3000/api/webhooks/clerk", {
    method: "POST",
    headers: { "svix-id": "svix_sig_fail" },
  });

  const res = await POST(req as unknown as import("next/server").NextRequest);
  assert.equal(res.status, 400);
  const body = await res.text();
  assert.equal(body, "Invalid signature");
});

test("user.created with missing metadata returns 200 ignored", async () => {
  resetScenario({
    verifiedEvent: {
      data: { id: "clerk_u1" },
      type: "user.created",
    },
  });

  const req = new Request("http://localhost:3000/api/webhooks/clerk", {
    method: "POST",
  });

  const res = await POST(req as unknown as import("next/server").NextRequest);
  assert.equal(res.status, 200);
  const body = await res.text();
  assert.equal(body, "Ignored: Missing metadata");
});

test("user.created with invalid CRM role returns 200 ignored", async () => {
  resetScenario({
    verifiedEvent: {
      data: {
        id: "clerk_u1",
        public_metadata: { crm_role: "superuser_invalid" },
      },
      type: "user.created",
    },
  });

  const req = new Request("http://localhost:3000/api/webhooks/clerk", {
    method: "POST",
  });

  const res = await POST(req as unknown as import("next/server").NextRequest);
  assert.equal(res.status, 200);
  const body = await res.text();
  assert.equal(body, "Ignored: Invalid or missing CRM role");
});

test("user.created with existing user performs idempotent skip", async () => {
  resetScenario({
    verifiedEvent: {
      data: {
        id: "clerk_u1",
        public_metadata: { crm_role: "admin" },
        primary_email_address_id: "em1",
        email_addresses: [{ id: "em1", email_address: "admin@example.com" }],
        first_name: "Admin",
        last_name: "User",
      },
      type: "user.created",
    },
    existingUser: { id: "app_u1" },
  });

  const req = new Request("http://localhost:3000/api/webhooks/clerk", {
    method: "POST",
  });

  const res = await POST(req as unknown as import("next/server").NextRequest);
  assert.equal(res.status, 200);
  const body = await res.text();
  assert.equal(body, "Idempotent skip");
  assert.equal(currentScenario.insertedUsers.length, 0);
});

test("user.created with valid payload creates app_users row", async () => {
  resetScenario({
    verifiedEvent: {
      data: {
        id: "clerk_u1",
        public_metadata: { crm_role: "sales" },
        primary_email_address_id: "em1",
        email_addresses: [{ id: "em1", email_address: "sales@example.com" }],
        first_name: "Sarah",
        last_name: "Sales",
      },
      type: "user.created",
    },
    existingUser: null,
    existingUserError: { code: "PGRST116", message: "No rows found" },
  });

  const req = new Request("http://localhost:3000/api/webhooks/clerk", {
    method: "POST",
    headers: { "svix-id": "svix_user_created_1" },
  });

  const res = await POST(req as unknown as import("next/server").NextRequest);
  assert.equal(res.status, 200);
  const body = await res.text();
  assert.equal(body, "Webhook processed");
  assert.equal(currentScenario.insertedUsers.length, 1);
  assert.deepEqual(currentScenario.insertedUsers[0], {
    clerk_user_id: "clerk_u1",
    email: "sales@example.com",
    name: "Sarah Sales",
    role: "sales",
    is_active: true,
  });
});

test("user.created with DB lookup error returns 500 with sanitized log", async () => {
  resetScenario({
    verifiedEvent: {
      data: {
        id: "clerk_u1",
        public_metadata: { crm_role: "sales" },
        primary_email_address_id: "em1",
        email_addresses: [{ id: "em1", email_address: "sales@example.com" }],
      },
      type: "user.created",
    },
    existingUser: null,
    existingUserError: { code: "57P01", message: "admin_shutdown" },
  });

  const loggedErrors: string[] = [];
  const originalConsoleError = console.error;
  console.error = (...args: unknown[]) => {
    loggedErrors.push(args.map((a) => String(a)).join(" "));
  };

  try {
    const req = new Request("http://localhost:3000/api/webhooks/clerk", {
      method: "POST",
      headers: { "svix-id": "svix_lookup_fail" },
    });

    const res = await POST(req as unknown as import("next/server").NextRequest);
    assert.equal(res.status, 500);
    const body = await res.text();
    assert.equal(body, "Database lookup failed");
    assert.equal(
      loggedErrors.includes(
        "[Clerk Webhook] [svix_lookup_fail] Database lookup error: user_lookup_failed",
      ),
      true,
    );
  } finally {
    console.error = originalConsoleError;
  }
});

test("user.created when DB lookup throws catches transport exception and returns safe 500", async () => {
  resetScenario({
    verifiedEvent: {
      data: {
        id: "clerk_u1",
        public_metadata: { crm_role: "sales" },
        primary_email_address_id: "em1",
        email_addresses: [{ id: "em1", email_address: "sales@example.com" }],
      },
      type: "user.created",
    },
    lookupThrows: true,
  });

  const loggedErrors: string[] = [];
  const originalConsoleError = console.error;
  console.error = (...args: unknown[]) => {
    loggedErrors.push(args.map((a) => String(a)).join(" "));
  };

  try {
    const req = new Request("http://localhost:3000/api/webhooks/clerk", {
      method: "POST",
      headers: { "svix-id": "svix_lookup_thrown" },
    });

    const res = await POST(req as unknown as import("next/server").NextRequest);
    assert.equal(res.status, 500);
    const body = await res.text();
    assert.equal(body, "Database lookup failed");
    assert.equal(
      loggedErrors.includes(
        "[Clerk Webhook] [svix_lookup_thrown] Database lookup error: user_lookup_failed",
      ),
      true,
    );
  } finally {
    console.error = originalConsoleError;
  }
});

test("user.created with DB insert error returns 500 with sanitized log", async () => {
  const sensitiveDbErrorMessage =
    "duplicate key value violates unique constraint app_users_clerk_user_id_key";
  const sensitiveEmail = "sales-insert-fail@example.com";
  const sensitiveName = "Insert Fail User";

  resetScenario({
    verifiedEvent: {
      data: {
        id: "clerk_u1",
        public_metadata: { crm_role: "sales" },
        primary_email_address_id: "em1",
        email_addresses: [{ id: "em1", email_address: sensitiveEmail }],
        first_name: "Insert Fail",
        last_name: "User",
      },
      type: "user.created",
    },
    existingUser: null,
    existingUserError: { code: "PGRST116", message: "No rows found" },
    insertError: { message: sensitiveDbErrorMessage },
  });

  const loggedErrors: string[] = [];
  const loggedInfo: string[] = [];
  const originalConsoleError = console.error;
  const originalConsoleLog = console.log;
  console.error = (...args: unknown[]) => {
    loggedErrors.push(args.map((a) => String(a)).join(" "));
  };
  console.log = (...args: unknown[]) => {
    loggedInfo.push(args.map((a) => String(a)).join(" "));
  };

  try {
    const req = new Request("http://localhost:3000/api/webhooks/clerk", {
      method: "POST",
      headers: { "svix-id": "svix_insert_fail" },
    });

    const res = await POST(req as unknown as import("next/server").NextRequest);
    assert.equal(res.status, 500);
    const body = await res.text();
    assert.equal(body, "Database insert failed");

    // Verify operational error log contains safe correlation context
    assert.equal(loggedErrors.length, 1);
    assert.equal(
      loggedErrors[0],
      "[Clerk Webhook] [svix_insert_fail] Database insert error: user_insert_failed",
    );

    // Verify error details and sensitive payload values are not exposed in logs
    assert.equal(loggedErrors[0].includes(sensitiveDbErrorMessage), false);
    assert.equal(loggedErrors[0].includes(sensitiveEmail), false);
    assert.equal(loggedErrors[0].includes(sensitiveName), false);

    // Verify no successful insertion was recorded
    assert.equal(
      loggedInfo.some((msg) =>
        msg.includes("Successfully created app_users row"),
      ),
      false,
    );
  } finally {
    console.error = originalConsoleError;
    console.log = originalConsoleLog;
  }
});

test("user.created when DB insert throws catches transport exception and returns safe 500", async () => {
  resetScenario({
    verifiedEvent: {
      data: {
        id: "clerk_u1",
        public_metadata: { crm_role: "sales" },
        primary_email_address_id: "em1",
        email_addresses: [{ id: "em1", email_address: "sales@example.com" }],
      },
      type: "user.created",
    },
    existingUser: null,
    existingUserError: { code: "PGRST116", message: "No rows found" },
    insertThrows: true,
  });

  const loggedErrors: string[] = [];
  const originalConsoleError = console.error;
  console.error = (...args: unknown[]) => {
    loggedErrors.push(args.map((a) => String(a)).join(" "));
  };

  try {
    const req = new Request("http://localhost:3000/api/webhooks/clerk", {
      method: "POST",
      headers: { "svix-id": "svix_insert_thrown" },
    });

    const res = await POST(req as unknown as import("next/server").NextRequest);
    assert.equal(res.status, 500);
    const body = await res.text();
    assert.equal(body, "Database insert failed");
    assert.equal(
      loggedErrors.includes(
        "[Clerk Webhook] [svix_insert_thrown] Database insert error: user_insert_failed",
      ),
      true,
    );
  } finally {
    console.error = originalConsoleError;
  }
});

test("user.created concurrent duplicate race recovers and returns idempotent skip", async () => {
  const sensitiveDbErrorMessage =
    "duplicate key value violates unique constraint app_users_clerk_user_id_key";

  resetScenario({
    verifiedEvent: {
      data: {
        id: "clerk_concurrent_u1",
        public_metadata: { crm_role: "operations" },
        primary_email_address_id: "em1",
        email_addresses: [{ id: "em1", email_address: "ops@example.com" }],
        first_name: "Ops",
        last_name: "User",
      },
      type: "user.created",
    },
    lookupResponses: [
      { data: null, error: { code: "PGRST116", message: "No rows found" } },
      { data: { id: "app_u_concurrent_1" }, error: null },
    ],
    insertError: { message: sensitiveDbErrorMessage },
  });

  const loggedErrors: string[] = [];
  const loggedInfo: string[] = [];
  const originalConsoleError = console.error;
  const originalConsoleLog = console.log;
  console.error = (...args: unknown[]) => {
    loggedErrors.push(args.map((a) => String(a)).join(" "));
  };
  console.log = (...args: unknown[]) => {
    loggedInfo.push(args.map((a) => String(a)).join(" "));
  };

  try {
    const req = new Request("http://localhost:3000/api/webhooks/clerk", {
      method: "POST",
      headers: { "svix-id": "svix_concurrent_1" },
    });

    const res = await POST(req as unknown as import("next/server").NextRequest);
    assert.equal(res.status, 200);
    const body = await res.text();
    assert.equal(body, "Idempotent skip");

    // Verify informational log records idempotent skip
    assert.equal(
      loggedInfo.some((msg) =>
        msg.includes(
          "[Clerk Webhook] [svix_concurrent_1] User already exists, skipping insertion",
        ),
      ),
      true,
    );

    // Verify no error was logged for recovered duplicate
    assert.equal(loggedErrors.length, 0);
  } finally {
    console.error = originalConsoleError;
    console.log = originalConsoleLog;
  }
});

test("webhook route sanitizes malformed/injected correlation IDs to a UUID", async () => {
  resetScenario({ envThrows: true });

  const loggedErrors: string[] = [];
  const originalConsoleError = console.error;
  console.error = (...args: unknown[]) => {
    loggedErrors.push(args.map((a) => String(a)).join(" "));
  };

  try {
    const req = new Request("http://localhost:3000/api/webhooks/clerk", {
      method: "POST",
      headers: { "svix-id": "bad header with spaces and special chars @#$!" },
    });

    const res = await POST(req as unknown as import("next/server").NextRequest);
    assert.equal(res.status, 500);

    assert.equal(loggedErrors.length, 1);
    // Must NOT contain the un-sanitized string
    assert.equal(loggedErrors[0].includes("bad header"), false);
    // Must match UUID format
    assert.match(
      loggedErrors[0],
      /^\[Clerk Webhook\] \[[0-9a-f-]+\] Configuration error: missing or invalid signing secret$/,
    );
  } finally {
    console.error = originalConsoleError;
  }
});
