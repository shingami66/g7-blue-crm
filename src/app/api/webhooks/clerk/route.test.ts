import assert from "node:assert/strict";
import { register } from "node:module";
import test, { mock } from "node:test";
import type { NextRequest } from "next/server";

type Scenario = {
  webhookSecret?: string | null;
  verifyError?: Error | null;
  webhookEvent?: unknown;
  existingUser?: { id: string } | null;
  existingUserError?: { code: string; message: string } | null;
  insertError?: { message: string } | null;
  insertedRows?: unknown[];
};

let activeScenario: Scenario | null = null;

const testModuleLoader = `
export async function resolve(specifier, context, nextResolve) {
  if (specifier === "server-only") {
    return { url: "data:text/javascript,", shortCircuit: true };
  }
  if (specifier === "next/server") {
    return { url: "data:text/javascript,export class NextRequest {}", shortCircuit: true };
  }
  if (specifier.startsWith("@/")) {
    return {
      url: new URL("./src/" + specifier.slice(2) + ".ts", "file:///" + process.cwd().replaceAll("\\\\", "/") + "/").href,
      shortCircuit: true,
    };
  }
  if (specifier.startsWith(".") && !/\\.(?:[cm]?js|tsx?|json)$/.test(specifier)) {
    return { url: new URL(specifier + ".ts", context.parentURL).href, shortCircuit: true };
  }
  return nextResolve(specifier, context);
}
`;

register(`data:text/javascript,${encodeURIComponent(testModuleLoader)}`, import.meta.url);

mock.module("@clerk/nextjs/webhooks", {
  namedExports: {
    verifyWebhook: async () => {
      if (activeScenario?.verifyError) {
        throw activeScenario.verifyError;
      }
      return activeScenario?.webhookEvent;
    },
  },
});

mock.module("@/lib/env", {
  namedExports: {
    getClerkWebhookEnv: () => ({
      CLERK_WEBHOOK_SIGNING_SECRET:
        activeScenario?.webhookSecret !== undefined
          ? activeScenario.webhookSecret
          : "whsec_test_secret_123",
    }),
  },
});

mock.module("@/lib/supabase/admin", {
  namedExports: {
    createAdminClient: () => ({
      from: () => {
        const query = {
          select() {
            return query;
          },
          eq() {
            return query;
          },
          single: async () => {
            if (activeScenario?.existingUserError) {
              return { data: null, error: activeScenario.existingUserError };
            }
            if (activeScenario?.existingUser) {
              return { data: activeScenario.existingUser, error: null };
            }
            return { data: null, error: { code: "PGRST116", message: "Not found" } };
          },
          insert: async (data: unknown) => {
            if (activeScenario?.insertedRows) {
              activeScenario.insertedRows.push(data);
            }
            if (activeScenario?.insertError) {
              return { data: null, error: activeScenario.insertError };
            }
            return { data, error: null };
          },
        };
        return query;
      },
    }),
  },
});

const { POST } = await import("./route.ts");

function resetScenario(overrides: Partial<Scenario> = {}): Scenario {
  activeScenario = {
    webhookSecret: "whsec_test_secret_123",
    verifyError: null,
    webhookEvent: null,
    existingUser: null,
    existingUserError: null,
    insertError: null,
    insertedRows: [],
    ...overrides,
  };
  return activeScenario;
}

function captureConsole() {
  const logs: string[] = [];
  const errors: string[] = [];

  const origLog = console.log;
  const origError = console.error;

  console.log = (...args: unknown[]) => {
    logs.push(args.map(String).join(" "));
  };
  console.error = (...args: unknown[]) => {
    errors.push(args.map(String).join(" "));
  };

  return {
    logs,
    errors,
    all: () => [...logs, ...errors].join("\n"),
    restore: () => {
      console.log = origLog;
      console.error = origError;
    },
  };
}

test("Clerk webhook successfully processes user.created without logging PII (raw IDs, emails, roles)", async () => {
  const rawClerkId = "user_clerk_secret_999888";
  const rawEmail = "sensitive_agent@company.sa";
  const rawRole = "sales";

  const s = resetScenario({
    webhookEvent: {
      type: "user.created",
      data: {
        id: rawClerkId,
        public_metadata: { crm_role: rawRole },
        primary_email_address_id: "email_1",
        email_addresses: [{ id: "email_1", email_address: rawEmail }],
        first_name: "Sarah",
        last_name: "Al-Ahmad",
      },
    },
  });

  const captured = captureConsole();
  let response: Response;
  try {
    response = await POST({} as NextRequest);
  } finally {
    captured.restore();
  }

  assert.equal(response.status, 200);
  assert.equal(await response.text(), "Webhook processed");

  // Database insert assertions
  assert.equal(s.insertedRows?.length, 1);
  assert.deepEqual(s.insertedRows?.[0], {
    clerk_user_id: rawClerkId,
    email: rawEmail,
    name: "Sarah Al-Ahmad",
    role: rawRole,
    is_active: true,
  });

  // Log sanitization assertions
  const allLogs = captured.all();
  assert.equal(allLogs.includes(rawClerkId), false, "Logs must NOT contain raw Clerk user ID");
  assert.equal(allLogs.includes(rawEmail), false, "Logs must NOT contain raw email address");
  assert.equal(allLogs.includes(rawRole), false, "Logs must NOT contain CRM role");

  // Safe operational context assertions
  assert.ok(allLogs.includes("[Clerk Webhook] Received event: user.created"));
  assert.ok(allLogs.includes("[Clerk Webhook] Successfully created app_users row."));
});

test("Clerk webhook skips existing user idempotently without leaking Clerk user ID in logs", async () => {
  const rawClerkId = "user_existing_444555";
  resetScenario({
    existingUser: { id: "00000000-0000-0000-0000-000000000001" },
    webhookEvent: {
      type: "user.created",
      data: {
        id: rawClerkId,
        public_metadata: { crm_role: "operations" },
        primary_email_address_id: "email_1",
        email_addresses: [{ id: "email_1", email_address: "ops@company.sa" }],
        first_name: "Tariq",
        last_name: "Mansour",
      },
    },
  });

  const captured = captureConsole();
  let response: Response;
  try {
    response = await POST({} as NextRequest);
  } finally {
    captured.restore();
  }

  assert.equal(response.status, 200);
  assert.equal(await response.text(), "Idempotent skip");

  const allLogs = captured.all();
  assert.equal(allLogs.includes(rawClerkId), false, "Logs must NOT contain raw Clerk user ID");
  assert.ok(allLogs.includes("[Clerk Webhook] User already exists in app_users, skipping insertion."));
});

test("Clerk webhook rejects invalid CRM role without logging user ID or invalid role name", async () => {
  const rawClerkId = "user_invalid_role_777";
  const invalidRole = "superadmin_hacker";
  resetScenario({
    webhookEvent: {
      type: "user.created",
      data: {
        id: rawClerkId,
        public_metadata: { crm_role: invalidRole },
        primary_email_address_id: "email_1",
        email_addresses: [{ id: "email_1", email_address: "hacker@domain.com" }],
      },
    },
  });

  const captured = captureConsole();
  let response: Response;
  try {
    response = await POST({} as NextRequest);
  } finally {
    captured.restore();
  }

  assert.equal(response.status, 200);
  assert.equal(await response.text(), "Ignored: Invalid or missing CRM role");

  const allLogs = captured.all();
  assert.equal(allLogs.includes(rawClerkId), false, "Logs must NOT contain raw Clerk user ID");
  assert.equal(allLogs.includes(invalidRole), false, "Logs must NOT contain invalid role name");
  assert.ok(allLogs.includes("[Clerk Webhook] Rejected: Missing or invalid role in public_metadata"));
});

test("Clerk webhook rejects missing email without logging user ID", async () => {
  const rawClerkId = "user_missing_email_123";
  resetScenario({
    webhookEvent: {
      type: "user.created",
      data: {
        id: rawClerkId,
        public_metadata: { crm_role: "viewer" },
        email_addresses: [],
      },
    },
  });

  const captured = captureConsole();
  let response: Response;
  try {
    response = await POST({} as NextRequest);
  } finally {
    captured.restore();
  }

  assert.equal(response.status, 200);
  assert.equal(await response.text(), "Ignored: Missing email");

  const allLogs = captured.all();
  assert.equal(allLogs.includes(rawClerkId), false, "Logs must NOT contain raw Clerk user ID");
  assert.ok(allLogs.includes("[Clerk Webhook] Rejected: Missing email address in payload"));
});

test("Clerk webhook handles verification failure without leaking raw signature/payload", async () => {
  resetScenario({
    verifyError: new Error("Invalid signature svix-signature=v1,abcdef123456 token=secret123"),
  });

  const captured = captureConsole();
  let response: Response;
  try {
    response = await POST({} as NextRequest);
  } finally {
    captured.restore();
  }

  assert.equal(response.status, 400);
  assert.equal(await response.text(), "Invalid signature");

  const allLogs = captured.all();
  assert.equal(allLogs.includes("abcdef123456"), false, "Logs must not dump raw signature/token data");
  assert.ok(allLogs.includes("[Clerk Webhook] Webhook signature verification failed."));
});

test("Clerk webhook handles database lookup failure without logging uncontrolled DB error.message", async () => {
  const sensitiveDbError = "FATAL: connection to db failed for clerk_id=user_secret_diag_999";
  resetScenario({
    existingUserError: { code: "50000", message: sensitiveDbError },
    webhookEvent: {
      type: "user.created",
      data: {
        id: "user_lookup_fail_123",
        public_metadata: { crm_role: "admin" },
        primary_email_address_id: "email_1",
        email_addresses: [{ id: "email_1", email_address: "admin@company.sa" }],
        first_name: "Admin",
        last_name: "User",
      },
    },
  });

  const captured = captureConsole();
  let response: Response;
  try {
    response = await POST({} as NextRequest);
  } finally {
    captured.restore();
  }

  assert.equal(response.status, 500);
  assert.equal(await response.text(), "Database lookup failed");

  const allLogs = captured.all();
  assert.equal(allLogs.includes(sensitiveDbError), false, "Logs must NOT leak database error message");
  assert.equal(allLogs.includes("user_lookup_fail_123"), false, "Logs must NOT contain Clerk user ID");
  assert.ok(allLogs.includes("[Clerk Webhook] Database lookup failed while checking existing user."));
});

test("Clerk webhook handles database insert failure without logging uncontrolled DB error.message", async () => {
  const sensitiveInsertError = "Key (clerk_user_id)=(user_insert_fail_456) already exists in table app_users role=manager email=mgr@company.sa";
  resetScenario({
    insertError: { message: sensitiveInsertError },
    webhookEvent: {
      type: "user.created",
      data: {
        id: "user_insert_fail_456",
        public_metadata: { crm_role: "manager" },
        primary_email_address_id: "email_1",
        email_addresses: [{ id: "email_1", email_address: "mgr@company.sa" }],
        first_name: "Manager",
        last_name: "User",
      },
    },
  });

  const captured = captureConsole();
  let response: Response;
  try {
    response = await POST({} as NextRequest);
  } finally {
    captured.restore();
  }

  assert.equal(response.status, 500);
  assert.equal(await response.text(), "Database insert failed");

  const allLogs = captured.all();
  assert.equal(allLogs.includes(sensitiveInsertError), false, "Logs must NOT leak database error message");
  assert.equal(allLogs.includes("user_insert_fail_456"), false, "Logs must NOT contain Clerk user ID");
  assert.equal(allLogs.includes("mgr@company.sa"), false, "Logs must NOT contain email address");
  assert.ok(allLogs.includes("[Clerk Webhook] Failed to insert app_user."));
});
