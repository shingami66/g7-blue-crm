import assert from "node:assert/strict";
import { register } from "node:module";
import test, { mock } from "node:test";

type QueryError = { message: string } | null;

const auditRows = [
  {
    id: "audit-name",
    timestamp: "2026-08-03T10:00:00Z",
    user_id: "actor-name",
    details: {
      event_type: "service_status_changed",
      from_status: "Approved",
      to_status: "Deposit Paid",
      trigger: "deposit_payment_confirmed",
      invoice_id: "invoice-1",
      payment_id: "payment-1",
      payment_number: "PAY-1",
      amount: 50,
    },
  },
  {
    id: "audit-email",
    timestamp: "2026-08-03T09:00:00Z",
    user_id: "actor-email",
    details: { event_type: "service_status_changed" },
  },
  {
    id: "audit-system",
    timestamp: "2026-08-03T08:00:00Z",
    user_id: null,
    details: { event_type: "service_event" },
  },
  {
    id: "audit-missing",
    timestamp: "2026-08-03T07:00:00Z",
    user_id: "actor-missing",
    details: { event_type: "service_event" },
  },
  {
    id: "audit-empty",
    timestamp: "2026-08-03T06:00:00Z",
    user_id: "actor-empty",
    details: { event_type: "service_event" },
  },
  {
    id: "audit-whitespace",
    timestamp: "2026-08-03T05:00:00Z",
    user_id: "actor-whitespace",
    details: { event_type: "service_event" },
  },
];

const actorRows = [
  {
    clerk_user_id: "actor-name",
    name: "Mozfer Mohamed Elhadi",
    email: "mozfer@example.com",
  },
  {
    clerk_user_id: "actor-email",
    name: "   ",
    email: "accountant@example.com",
  },
  {
    clerk_user_id: "actor-empty",
    name: null,
    email: "",
  },
  {
    clerk_user_id: "actor-whitespace",
    name: " \t ",
    email: "   ",
  },
];

let actorLookupError: QueryError = null;
let actorLookupBatches: string[][] = [];
let permissionCalls: string[] = [];

const testModuleLoader = `
  export async function resolve(specifier, context, nextResolve) {
    if (specifier.startsWith("@/")) {
      return { url: new URL("./src/" + specifier.slice(2) + ".ts", "file:///" + process.cwd().replaceAll("\\\\", "/") + "/").href, shortCircuit: true };
    }
    return nextResolve(specifier, context);
  }
`;

register(`data:text/javascript,${encodeURIComponent(testModuleLoader)}`, import.meta.url);

mock.module("server-only", { namedExports: {} });
mock.module("@/lib/auth/permissions", {
  namedExports: {
    requirePermission: async (permission: string) => {
      permissionCalls.push(permission);
    },
  },
});
mock.module("@/lib/supabase/admin", {
  namedExports: {
    createAdminClient: () => ({
      from(table: string) {
        if (table === "audit_logs") {
          const auditQuery = {
            select() { return auditQuery; },
            eq() { return auditQuery; },
            order() { return auditQuery; },
            limit: async () => ({ data: auditRows, error: null }),
          };
          return auditQuery;
        }

        if (table === "app_users") {
          const actorQuery = {
            select() { return actorQuery; },
            async in(_column: string, actorIds: string[]) {
              actorLookupBatches.push(actorIds);
              return { data: actorLookupError ? null : actorRows, error: actorLookupError };
            },
          };
          return actorQuery;
        }

        throw new Error(`Unexpected table: ${table}`);
      },
    }),
  },
});

const { listServiceActivity } = await import("./activity-queries.ts");

test("Activity History resolves distinct actors in one server-side batch", async () => {
  actorLookupError = null;
  actorLookupBatches = [];
  permissionCalls = [];

  const activity = await listServiceActivity("service-1");

  assert.equal(activity.success, true);
  assert.deepEqual(permissionCalls, ["services:read"]);
  assert.deepEqual(actorLookupBatches, [[
    "actor-name",
    "actor-email",
    "actor-missing",
    "actor-empty",
    "actor-whitespace",
  ]]);
  assert.equal(activity.events[0]?.actorDisplay, "Mozfer Mohamed Elhadi");
  assert.equal(activity.events[1]?.actorDisplay, "accountant@example.com");
  assert.equal(activity.events[2]?.actorKind, "system");
  assert.equal(activity.events[3]?.actorKind, "unknown");
  assert.equal(activity.events[4]?.actorKind, "unknown");
  assert.equal(activity.events[4]?.actorDisplay, null);
  assert.equal(activity.events[5]?.actorKind, "unknown");
  assert.equal(activity.events[5]?.actorDisplay, null);
  assert.doesNotMatch(
    JSON.stringify(activity.events),
    /actor-name|actor-email|actor-missing|actor-empty|actor-whitespace/,
  );
});

test("Deposit transition context is retained without exposing raw audit JSON", async () => {
  const activity = await listServiceActivity("service-1");
  const depositEvent = activity.events[0];

  assert.equal(depositEvent?.trigger, "deposit_payment_confirmed");
  assert.equal(depositEvent?.invoiceId, "invoice-1");
  assert.equal(depositEvent?.paymentId, "payment-1");
  assert.equal(depositEvent?.paymentNumber, "PAY-1");
  assert.equal(depositEvent?.amount, 50);
  assert.equal("userId" in (depositEvent ?? {}), false);
});

test("Actor lookup failure preserves history with safe unknown-user fallbacks", async () => {
  actorLookupError = { message: "actor directory unavailable" };
  actorLookupBatches = [];

  const activity = await listServiceActivity("service-1");

  assert.equal(activity.success, true);
  assert.equal(actorLookupBatches.length, 1);
  assert.equal(activity.events[0]?.actorDisplay, null);
  assert.equal(activity.events[0]?.actorKind, "unknown");
  assert.equal(activity.events[2]?.actorKind, "system");
});
