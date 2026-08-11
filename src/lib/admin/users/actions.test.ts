import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { register } from "node:module";
import test, { mock } from "node:test";

const REPO_ROOT = join(import.meta.dirname, "../../../..");
const MIGRATION_PATH = join(
  REPO_ROOT,
  "supabase/migrations/20260811140000_g5_admin_user_atomic_mutations.sql",
);
const CLIENT_PATH = join(REPO_ROOT, "src/app/(dashboard)/admin/users/AdminUsersClient.tsx");

function read(filePath: string): string {
  return readFileSync(filePath, "utf8");
}

// ---------------------------------------------------------------------------
// STATEFUL IN-MEMORY DATABASE & RPC BEHAVIORAL SIMULATOR
// ---------------------------------------------------------------------------

export type MockAppUser = {
  id: string;
  clerk_user_id: string;
  role: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type MockAuditLog = {
  id: string;
  action: string;
  entity_type: string;
  entity_id: string;
  user_id: string;
  details: Record<string, unknown>;
  timestamp: string;
};

export type MockScenario = {
  currentUser: { id: string; clerk_user_id: string; role: string; is_active: boolean } | null;
  permissionDenied?: boolean;
  unauthorized?: boolean;
  appUsers: MockAppUser[];
  auditLogs: MockAuditLog[];
  acquiredAdvisoryLocks: string[];
  lockedRowIds: string[];
  rpcResponses: Record<string, { data: unknown; error: { message: string } | null }>;
  rpcCalls: Array<{ name: string; args: Record<string, unknown> }>;
  tableQueries: Array<{ table: string; method: string; args: unknown }>;
};

let activeScenario: MockScenario | null = null;

function getScenario(): MockScenario {
  if (!activeScenario) {
    throw new Error("Test scenario not initialized");
  }
  return activeScenario;
}

const DEFAULT_ADMIN_ACTOR_ID = "00000000-0000-4000-8000-000000000001";
const DEFAULT_TARGET_USER_ID = "00000000-0000-4000-8000-000000000002";

function createDefaultUsers(): MockAppUser[] {
  return [
    {
      id: DEFAULT_ADMIN_ACTOR_ID,
      clerk_user_id: "user_admin_actor",
      role: "admin",
      is_active: true,
      created_at: "2026-08-01T00:00:00.000Z",
      updated_at: "2026-08-01T00:00:00.000Z",
    },
    {
      id: DEFAULT_TARGET_USER_ID,
      clerk_user_id: "user_target_admin",
      role: "admin",
      is_active: true,
      created_at: "2026-08-01T00:00:00.000Z",
      updated_at: "2026-08-01T00:00:00.000Z",
    },
  ];
}

function resetScenario(overrides: Partial<MockScenario> = {}): MockScenario {
  activeScenario = {
    currentUser: {
      id: DEFAULT_ADMIN_ACTOR_ID,
      clerk_user_id: "user_admin_actor",
      role: "admin",
      is_active: true,
    },
    appUsers: createDefaultUsers(),
    auditLogs: [],
    acquiredAdvisoryLocks: [],
    lockedRowIds: [],
    rpcResponses: {},
    rpcCalls: [],
    tableQueries: [],
    ...overrides,
  };
  return activeScenario;
}

/**
 * Procedural behavioral simulation of public.update_app_user_role matching
 * the reviewed PL/pgSQL migration logic line-by-line.
 */
function simulateUpdateAppUserRole(
  state: MockScenario,
  args: Record<string, unknown>,
): { data: unknown; error: null } {
  const p_user_id = args.p_user_id as string;
  const p_role = typeof args.p_role === "string" ? args.p_role.trim() : null;
  const p_actor_id = typeof args.p_actor_id === "string" ? args.p_actor_id.trim() : null;
  const p_actor_role = typeof args.p_actor_role === "string" ? args.p_actor_role.trim() : null;

  if (!p_user_id) {
    return { data: [{ error_code: "invalid_input", user_id: p_user_id, role: null, is_active: null, idempotent_replay: false }], error: null };
  }

  if (!p_actor_id || !p_actor_role) {
    return { data: [{ error_code: "invalid_actor", user_id: p_user_id, role: null, is_active: null, idempotent_replay: false }], error: null };
  }

  const allowedRoles = ["admin", "manager", "sales", "operations", "accountant", "viewer"];
  if (!p_role || !allowedRoles.includes(p_role)) {
    return { data: [{ error_code: "invalid_role", user_id: p_user_id, role: null, is_active: null, idempotent_replay: false }], error: null };
  }

  // Transaction advisory lock acquisition simulation
  state.acquiredAdvisoryLocks.push("g7_active_admin_mutation_lock");

  // Row lock simulation (FOR UPDATE)
  state.lockedRowIds.push(p_user_id);
  const target = state.appUsers.find((u) => u.id === p_user_id);
  if (!target) {
    return { data: [{ error_code: "user_not_found", user_id: p_user_id, role: null, is_active: null, idempotent_replay: false }], error: null };
  }

  // Prevent self-role change
  if (target.clerk_user_id === p_actor_id) {
    return { data: [{ error_code: "cannot_change_own_role", user_id: p_user_id, role: target.role, is_active: target.is_active, idempotent_replay: false }], error: null };
  }

  // Idempotent replay check (no mutation, no duplicate audit log)
  if (target.role === p_role) {
    return { data: [{ error_code: null, user_id: p_user_id, role: target.role, is_active: target.is_active, idempotent_replay: true }], error: null };
  }

  // Invariant check: if demoting an active admin to non-admin, ensure >= 1 other active admin remains
  if (target.role === "admin" && target.is_active && p_role !== "admin") {
    const otherActiveAdminCount = state.appUsers.filter(
      (u) => u.role === "admin" && u.is_active && u.id !== p_user_id,
    ).length;

    if (otherActiveAdminCount < 1) {
      return { data: [{ error_code: "last_active_admin", user_id: p_user_id, role: target.role, is_active: target.is_active, idempotent_replay: false }], error: null };
    }
  }

  // Apply state mutation
  const oldRole = target.role;
  const now = new Date().toISOString();
  target.role = p_role;
  target.updated_at = now;

  // Insert structured audit log
  state.auditLogs.push({
    id: `audit_${state.auditLogs.length + 1}`,
    action: "update",
    entity_type: "app_user",
    entity_id: p_user_id,
    user_id: p_actor_id,
    details: {
      event_type: "user_role_updated",
      actor_id: p_actor_id,
      actor_role: p_actor_role,
      target_user_id: p_user_id,
      old_role: oldRole,
      new_role: p_role,
      transaction_timestamp: now,
    },
    timestamp: now,
  });

  return { data: [{ error_code: null, user_id: p_user_id, role: p_role, is_active: target.is_active, idempotent_replay: false }], error: null };
}

/**
 * Procedural behavioral simulation of public.set_app_user_active matching
 * the reviewed PL/pgSQL migration logic line-by-line.
 */
function simulateSetAppUserActive(
  state: MockScenario,
  args: Record<string, unknown>,
): { data: unknown; error: null } {
  const p_user_id = args.p_user_id as string;
  const p_is_active = args.p_is_active as boolean;
  const p_actor_id = typeof args.p_actor_id === "string" ? args.p_actor_id.trim() : null;
  const p_actor_role = typeof args.p_actor_role === "string" ? args.p_actor_role.trim() : null;

  if (!p_user_id || typeof p_is_active !== "boolean") {
    return { data: [{ error_code: "invalid_input", user_id: p_user_id, role: null, is_active: null, idempotent_replay: false }], error: null };
  }

  if (!p_actor_id || !p_actor_role) {
    return { data: [{ error_code: "invalid_actor", user_id: p_user_id, role: null, is_active: null, idempotent_replay: false }], error: null };
  }

  // Transaction advisory lock acquisition simulation
  state.acquiredAdvisoryLocks.push("g7_active_admin_mutation_lock");

  // Row lock simulation (FOR UPDATE)
  state.lockedRowIds.push(p_user_id);
  const target = state.appUsers.find((u) => u.id === p_user_id);
  if (!target) {
    return { data: [{ error_code: "user_not_found", user_id: p_user_id, role: null, is_active: null, idempotent_replay: false }], error: null };
  }

  // Prevent self-deactivation
  if (target.clerk_user_id === p_actor_id && !p_is_active) {
    return { data: [{ error_code: "cannot_deactivate_own_account", user_id: p_user_id, role: target.role, is_active: target.is_active, idempotent_replay: false }], error: null };
  }

  // Idempotent replay check (no mutation, no duplicate audit log)
  if (target.is_active === p_is_active) {
    return { data: [{ error_code: null, user_id: p_user_id, role: target.role, is_active: target.is_active, idempotent_replay: true }], error: null };
  }

  // Invariant check: if deactivating an active admin, ensure >= 1 other active admin remains
  if (target.role === "admin" && target.is_active && !p_is_active) {
    const otherActiveAdminCount = state.appUsers.filter(
      (u) => u.role === "admin" && u.is_active && u.id !== p_user_id,
    ).length;

    if (otherActiveAdminCount < 1) {
      return { data: [{ error_code: "last_active_admin", user_id: p_user_id, role: target.role, is_active: target.is_active, idempotent_replay: false }], error: null };
    }
  }

  // Apply state mutation
  const oldIsActive = target.is_active;
  const now = new Date().toISOString();
  target.is_active = p_is_active;
  target.updated_at = now;

  // Insert structured audit log
  state.auditLogs.push({
    id: `audit_${state.auditLogs.length + 1}`,
    action: "update",
    entity_type: "app_user",
    entity_id: p_user_id,
    user_id: p_actor_id,
    details: {
      event_type: "user_active_status_updated",
      actor_id: p_actor_id,
      actor_role: p_actor_role,
      target_user_id: p_user_id,
      old_is_active: oldIsActive,
      new_is_active: p_is_active,
      transaction_timestamp: now,
    },
    timestamp: now,
  });

  return { data: [{ error_code: null, user_id: p_user_id, role: target.role, is_active: p_is_active, idempotent_replay: false }], error: null };
}

class TestUnauthorizedError extends Error {
  constructor(message = "Unauthorized") {
    super(message);
    this.name = "UnauthorizedError";
  }
}

class TestForbiddenError extends Error {
  constructor(message = "Forbidden") {
    super(message);
    this.name = "ForbiddenError";
  }
}

const testModuleLoader = `
export async function resolve(specifier, context, nextResolve) {
  if (specifier === "next/cache") {
    return { url: "data:text/javascript,export function revalidatePath() {}", shortCircuit: true };
  }
  if (specifier === "server-only") {
    return { url: "data:text/javascript,", shortCircuit: true };
  }
  if (specifier === "@clerk/nextjs/server") {
    return {
      url: "data:text/javascript,export async function clerkClient() { return { invitations: { createInvitation: async () => ({}), revokeInvitation: async () => ({}), getInvitationList: async () => ({ data: [] }) } }; }",
      shortCircuit: true,
    };
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

mock.module("@/lib/auth/errors", {
  namedExports: {
    UnauthorizedError: TestUnauthorizedError,
    ForbiddenError: TestForbiddenError,
  },
});

mock.module("@/lib/auth/permissions", {
  namedExports: {
    requirePermission: async (perm: string) => {
      const s = getScenario();
      if (s.unauthorized) throw new TestUnauthorizedError("Sign-in required");
      if (s.permissionDenied) throw new TestForbiddenError(`Permission '${perm}' required`);
      if (!s.currentUser) throw new TestUnauthorizedError("User not found");
      return s.currentUser;
    },
  },
});

mock.module("@/lib/supabase/admin", {
  namedExports: {
    createAdminClient: () => {
      const s = getScenario();
      return {
        rpc: async (name: string, args: Record<string, unknown>) => {
          s.rpcCalls.push({ name, args });
          // If a custom override is explicitly provided, return it
          if (s.rpcResponses[name]) {
            return s.rpcResponses[name];
          }
          // Otherwise execute the stateful behavioral simulator
          if (name === "update_app_user_role") {
            return simulateUpdateAppUserRole(s, args);
          }
          if (name === "set_app_user_active") {
            return simulateSetAppUserActive(s, args);
          }
          return { data: [{ error_code: null, user_id: args.p_user_id, idempotent_replay: false }], error: null };
        },
        from: (table: string) => {
          s.tableQueries.push({ table, method: "from", args: null });
          let filterCol: string | null = null;
          let filterVal: unknown = null;

          const query = {
            select: (columns: string) => {
              s.tableQueries.push({ table, method: "select", args: columns });
              return query;
            },
            eq: (col: string, val: unknown) => {
              filterCol = col;
              filterVal = val;
              s.tableQueries.push({ table, method: "eq", args: { col, val } });
              return query;
            },
            single: async () => {
              s.tableQueries.push({ table, method: "single", args: null });
              if (table === "app_users") {
                const user = s.appUsers.find((u) => filterCol === "id" ? u.id === filterVal : true);
                if (user) {
                  return { data: user, error: null };
                }
                return { data: null, error: { code: "PGRST116", message: "Row not found" } };
              }
              return { data: null, error: { code: "PGRST116", message: "Row not found" } };
            },
          };
          return query;
        },
      };
    },
  },
});

const { updateUserRole, setUserActive } = await import("./actions.ts");
const { updateUserRoleSchema, setUserActiveSchema } = await import("./schemas.ts");

// ---------------------------------------------------------------------------
// 1. MIGRATION & SQL CONTRACT TESTS
// ---------------------------------------------------------------------------

test("G5-SQL-1: Migration file exists, timestamped, and validates required tables/columns", () => {
  const migration = read(MIGRATION_PATH);

  assert.match(migration, /BEGIN;/);
  assert.match(migration, /COMMIT;/);
  assert.match(migration, /to_regclass\('public\.app_users'\)/);
  assert.match(migration, /to_regclass\('public\.audit_logs'\)/);
  assert.match(migration, /CREATE FUNCTION public\.update_app_user_role/);
  assert.match(migration, /CREATE FUNCTION public\.set_app_user_active/);
});

test("G5-SQL-2: RPCs serialize admin mutations via transaction advisory lock and row locks", () => {
  const migration = read(MIGRATION_PATH);

  // Both functions must acquire advisory xact lock to serialize concurrent admin mutations
  const advisoryMatches = migration.match(/pg_advisory_xact_lock\(hashtext\('g7_active_admin_mutation_lock'\)\)/g);
  assert.equal(advisoryMatches?.length, 2, "Both RPCs must acquire the active-admin advisory lock");

  // Both functions must lock target user row with FOR UPDATE
  const forUpdateMatches = migration.match(/FOR UPDATE;/g);
  assert.equal(forUpdateMatches?.length, 2, "Both RPCs must lock target user row FOR UPDATE");
});

test("G5-SQL-3: RPCs emit structured audit events to public.audit_logs", () => {
  const migration = read(MIGRATION_PATH);

  assert.match(
    migration,
    /'event_type',\s*'user_role_updated'/,
    "update_app_user_role must emit user_role_updated event",
  );
  assert.match(
    migration,
    /'event_type',\s*'user_active_status_updated'/,
    "set_app_user_active must emit user_active_status_updated event",
  );
  assert.match(migration, /'update',\s*'app_user'/);
  assert.match(migration, /'actor_id',\s*v_actor_id/);
  assert.match(migration, /'actor_role',\s*v_actor_role/);
  assert.match(migration, /'target_user_id',\s*p_user_id/);
});

test("G5-SQL-4: Migration enforces security definer and tight service_role grants", () => {
  const migration = read(MIGRATION_PATH);

  assert.match(migration, /SECURITY DEFINER/);
  assert.match(migration, /SET search_path = pg_catalog, public/);
  assert.match(
    migration,
    /REVOKE ALL ON FUNCTION public\.update_app_user_role\(uuid, text, text, text\) FROM PUBLIC, anon, authenticated;/,
  );
  assert.match(
    migration,
    /GRANT EXECUTE ON FUNCTION public\.update_app_user_role\(uuid, text, text, text\) TO service_role;/,
  );
  assert.match(
    migration,
    /REVOKE ALL ON FUNCTION public\.set_app_user_active\(uuid, boolean, text, text\) FROM PUBLIC, anon, authenticated;/,
  );
  assert.match(
    migration,
    /GRANT EXECUTE ON FUNCTION public\.set_app_user_active\(uuid, boolean, text, text\) TO service_role;/,
  );
});

// ---------------------------------------------------------------------------
// 2. SCHEMA & VALIDATION CONTRACT TESTS
// ---------------------------------------------------------------------------

test("G5-SCHEMA-1: updateUserRoleSchema validates UUID and CRM role strictly", () => {
  const valid = updateUserRoleSchema.safeParse({
    userId: "00000000-0000-4000-8000-000000000002",
    role: "manager",
  });
  assert.equal(valid.success, true);

  const invalidRole = updateUserRoleSchema.safeParse({
    userId: "00000000-0000-4000-8000-000000000002",
    role: "superuser",
  });
  assert.equal(invalidRole.success, false);

  const invalidUuid = updateUserRoleSchema.safeParse({
    userId: "not-a-uuid",
    role: "admin",
  });
  assert.equal(invalidUuid.success, false);

  const extraField = updateUserRoleSchema.safeParse({
    userId: "00000000-0000-4000-8000-000000000002",
    role: "admin",
    extra: "hacker",
  });
  assert.equal(extraField.success, false);
});

test("G5-SCHEMA-2: setUserActiveSchema validates UUID and boolean desired state strictly", () => {
  const validActive = setUserActiveSchema.safeParse({
    userId: "00000000-0000-4000-8000-000000000002",
    isActive: true,
  });
  assert.equal(validActive.success, true);

  const validInactive = setUserActiveSchema.safeParse({
    userId: "00000000-0000-4000-8000-000000000002",
    isActive: false,
  });
  assert.equal(validInactive.success, true);

  const nonBoolean = setUserActiveSchema.safeParse({
    userId: "00000000-0000-4000-8000-000000000002",
    isActive: "false",
  });
  assert.equal(nonBoolean.success, false);

  const missingState = setUserActiveSchema.safeParse({
    userId: "00000000-0000-4000-8000-000000000002",
  });
  assert.equal(missingState.success, false);
});

// ---------------------------------------------------------------------------
// 3. SERVER ACTION PERMISSION & INPUT CONTRACTS
// ---------------------------------------------------------------------------

test("G5-ACTION-1: updateUserRole enforces users:manage permission and auth check", async () => {
  resetScenario({ unauthorized: true });
  const unauthResult = await updateUserRole({
    userId: DEFAULT_TARGET_USER_ID,
    role: "manager",
  });
  assert.equal(unauthResult.success, false);
  assert.equal(unauthResult.error, "Unauthorized");

  resetScenario({ permissionDenied: true });
  const forbiddenResult = await updateUserRole({
    userId: DEFAULT_TARGET_USER_ID,
    role: "manager",
  });
  assert.equal(forbiddenResult.success, false);
  assert.equal(forbiddenResult.error, "Forbidden");
});

test("G5-ACTION-2: updateUserRole blocks self-role demotion upfront before RPC", async () => {
  const s = resetScenario();
  const result = await updateUserRole({
    userId: s.currentUser!.id,
    role: "manager",
  });

  assert.equal(result.success, false);
  assert.equal(result.error, "You cannot change your own role.");
  assert.equal(s.rpcCalls.length, 0, "No RPC call should occur on self role change attempt");
});

test("G5-ACTION-3: setUserActive enforces users:manage and blocks self-deactivation upfront", async () => {
  const s = resetScenario();

  // Self deactivation blocked upfront before RPC
  const selfDeact = await setUserActive({
    userId: s.currentUser!.id,
    isActive: false,
  });
  assert.equal(selfDeact.success, false);
  assert.equal(selfDeact.error, "You cannot deactivate your own account.");
  assert.equal(s.rpcCalls.length, 0);

  // Self activation allowed
  const selfAct = await setUserActive({
    userId: s.currentUser!.id,
    isActive: true,
  });
  assert.equal(selfAct.success, true);
  assert.equal(s.rpcCalls.length, 1);
});

test("G5-ACTION-4: Server actions map low-level Supabase RPC execution errors gracefully", async () => {
  resetScenario({
    rpcResponses: {
      update_app_user_role: { data: null, error: { message: "connection timeout" } },
    },
  });

  const roleResult = await updateUserRole({
    userId: DEFAULT_TARGET_USER_ID,
    role: "manager",
  });
  assert.equal(roleResult.success, false);
  assert.equal(roleResult.error, "Failed to update role. Please try again.");

  resetScenario({
    rpcResponses: {
      set_app_user_active: { data: null, error: { message: "database offline" } },
    },
  });

  const activeResult = await setUserActive({
    userId: DEFAULT_TARGET_USER_ID,
    isActive: false,
  });
  assert.equal(activeResult.success, false);
  assert.equal(activeResult.error, "Failed to update user status. Please try again.");
});

// ---------------------------------------------------------------------------
// 4. DATABASE BOUNDARY & PROCEDURAL BEHAVIOR TESTS (Simulated RPC & State Engine)
// ---------------------------------------------------------------------------

test("G5-BEHAVIOR-1: Atomic last-active-admin demotion prevention (stateful database simulation)", async () => {
  // Setup state: Only 1 active admin exists in the entire database (the target user)
  const singleAdminId = "00000000-0000-4000-8000-000000000099";
  const s = resetScenario({
    appUsers: [
      {
        id: DEFAULT_ADMIN_ACTOR_ID,
        clerk_user_id: "user_admin_actor",
        role: "manager", // Actor is a manager with users:manage for this test
        is_active: true,
        created_at: "2026-08-01T00:00:00.000Z",
        updated_at: "2026-08-01T00:00:00.000Z",
      },
      {
        id: singleAdminId,
        clerk_user_id: "user_sole_admin",
        role: "admin",
        is_active: true,
        created_at: "2026-08-01T00:00:00.000Z",
        updated_at: "2026-08-01T00:00:00.000Z",
      },
    ],
  });

  const result = await updateUserRole({
    userId: singleAdminId,
    role: "viewer",
  });

  // Action receives last_active_admin error from simulated RPC and maps it cleanly
  assert.equal(result.success, false);
  assert.equal(result.error, "At least one active admin must remain.");

  // Behavioral verification: target user in DB remains unchanged (atomic abort)
  const soleAdmin = s.appUsers.find((u) => u.id === singleAdminId);
  assert.equal(soleAdmin?.role, "admin", "Target user role must remain 'admin'");

  // Audit log verification: no audit record was inserted because transaction was aborted
  assert.equal(s.auditLogs.length, 0, "No audit log should be emitted on invariant abort");
  assert.ok(s.acquiredAdvisoryLocks.includes("g7_active_admin_mutation_lock"), "Advisory lock must be acquired");
  assert.ok(s.lockedRowIds.includes(singleAdminId), "Target row must be locked FOR UPDATE");
});

test("G5-BEHAVIOR-2: Atomic last-active-admin deactivation prevention (stateful database simulation)", async () => {
  // Setup state: Only 1 active admin exists in the entire database
  const soleAdminId = "00000000-0000-4000-8000-000000000099";
  const s = resetScenario({
    appUsers: [
      {
        id: DEFAULT_ADMIN_ACTOR_ID,
        clerk_user_id: "user_admin_actor",
        role: "manager",
        is_active: true,
        created_at: "2026-08-01T00:00:00.000Z",
        updated_at: "2026-08-01T00:00:00.000Z",
      },
      {
        id: soleAdminId,
        clerk_user_id: "user_sole_admin",
        role: "admin",
        is_active: true,
        created_at: "2026-08-01T00:00:00.000Z",
        updated_at: "2026-08-01T00:00:00.000Z",
      },
    ],
  });

  const result = await setUserActive({
    userId: soleAdminId,
    isActive: false,
  });

  assert.equal(result.success, false);
  assert.equal(result.error, "At least one active admin must remain.");

  // Target user remains active in DB
  const soleAdmin = s.appUsers.find((u) => u.id === soleAdminId);
  assert.equal(soleAdmin?.is_active, true, "Target user must remain active");
  assert.equal(s.auditLogs.length, 0, "No audit log should be emitted on invariant abort");
});

test("G5-BEHAVIOR-3: Successful role mutation updates DB state and inserts structured audit log", async () => {
  // Setup: 2 active admins (Actor + Target)
  const s = resetScenario();

  const result = await updateUserRole({
    userId: DEFAULT_TARGET_USER_ID,
    role: "operations",
  });

  assert.equal(result.success, true);

  // Verify DB state updated
  const target = s.appUsers.find((u) => u.id === DEFAULT_TARGET_USER_ID);
  assert.equal(target?.role, "operations");

  // Verify structured audit log entry
  assert.equal(s.auditLogs.length, 1);
  const audit = s.auditLogs[0];
  assert.equal(audit.action, "update");
  assert.equal(audit.entity_type, "app_user");
  assert.equal(audit.entity_id, DEFAULT_TARGET_USER_ID);
  assert.equal(audit.user_id, "user_admin_actor");
  assert.equal(audit.details.event_type, "user_role_updated");
  assert.equal(audit.details.actor_id, "user_admin_actor");
  assert.equal(audit.details.actor_role, "admin");
  assert.equal(audit.details.target_user_id, DEFAULT_TARGET_USER_ID);
  assert.equal(audit.details.old_role, "admin");
  assert.equal(audit.details.new_role, "operations");
  assert.ok(audit.details.transaction_timestamp);
});

test("G5-BEHAVIOR-4: Role mutation idempotent replay succeeds without duplicate mutation or audit log", async () => {
  const s = resetScenario();

  // First mutation: admin -> operations
  const firstCall = await updateUserRole({
    userId: DEFAULT_TARGET_USER_ID,
    role: "operations",
  });
  assert.equal(firstCall.success, true);
  assert.equal(s.auditLogs.length, 1);

  // Second call (idempotent replay): operations -> operations
  const secondCall = await updateUserRole({
    userId: DEFAULT_TARGET_USER_ID,
    role: "operations",
  });
  assert.equal(secondCall.success, true);

  // Verify DB remains operations and auditLogs count is STILL 1 (no duplicate audit spam)
  const target = s.appUsers.find((u) => u.id === DEFAULT_TARGET_USER_ID);
  assert.equal(target?.role, "operations");
  assert.equal(s.auditLogs.length, 1, "Idempotent replay must NOT emit duplicate audit log");
});

test("G5-BEHAVIOR-5: Successful active status mutation updates DB state and inserts structured audit log", async () => {
  const salesUserId = "00000000-0000-4000-8000-000000000003";
  const s = resetScenario({
    appUsers: [
      ...createDefaultUsers(),
      {
        id: salesUserId,
        clerk_user_id: "user_sales",
        role: "sales",
        is_active: true,
        created_at: "2026-08-01T00:00:00.000Z",
        updated_at: "2026-08-01T00:00:00.000Z",
      },
    ],
  });

  const result = await setUserActive({
    userId: salesUserId,
    isActive: false,
  });
  assert.equal(result.success, true);

  // Verify DB state updated
  const salesUser = s.appUsers.find((u) => u.id === salesUserId);
  assert.equal(salesUser?.is_active, false);

  // Verify structured audit log entry
  assert.equal(s.auditLogs.length, 1);
  const audit = s.auditLogs[0];
  assert.equal(audit.action, "update");
  assert.equal(audit.entity_type, "app_user");
  assert.equal(audit.entity_id, salesUserId);
  assert.equal(audit.user_id, "user_admin_actor");
  assert.equal(audit.details.event_type, "user_active_status_updated");
  assert.equal(audit.details.actor_id, "user_admin_actor");
  assert.equal(audit.details.actor_role, "admin");
  assert.equal(audit.details.target_user_id, salesUserId);
  assert.equal(audit.details.old_is_active, true);
  assert.equal(audit.details.new_is_active, false);
});

test("G5-BEHAVIOR-6: Active status mutation retry-safety (idempotence) without state inversion", async () => {
  const viewerUserId = "00000000-0000-4000-8000-000000000004";
  const s = resetScenario({
    appUsers: [
      ...createDefaultUsers(),
      {
        id: viewerUserId,
        clerk_user_id: "user_viewer",
        role: "viewer",
        is_active: true,
        created_at: "2026-08-01T00:00:00.000Z",
        updated_at: "2026-08-01T00:00:00.000Z",
      },
    ],
  });

  // Call 1: deactivate
  const call1 = await setUserActive({ userId: viewerUserId, isActive: false });
  assert.equal(call1.success, true);
  assert.equal(s.appUsers.find((u) => u.id === viewerUserId)?.is_active, false);
  assert.equal(s.auditLogs.length, 1);

  // Call 2 (network retry with same desired state): deactivate again
  const call2 = await setUserActive({ userId: viewerUserId, isActive: false });
  assert.equal(call2.success, true);

  // Invariant: status MUST remain false (must not invert to true!) and no duplicate audit log
  assert.equal(s.appUsers.find((u) => u.id === viewerUserId)?.is_active, false);
  assert.equal(s.auditLogs.length, 1, "Retry must be idempotent and not create duplicate audit row");
});

// ---------------------------------------------------------------------------
// 5. CLIENT WIRING & DESIRED-STATE CONTRACT
// ---------------------------------------------------------------------------

test("G5-CLIENT-1: AdminUsersClient uses setUserActive with explicit desired state", () => {
  const client = read(CLIENT_PATH);

  assert.match(client, /import[\s\S]*?setUserActive[\s\S]*?from\s*["']@\/lib\/admin\/users\/actions["']/);
  assert.match(client, /setUserActive\(\{\s*userId,\s*isActive:\s*!currentActive\s*\}\)/);
  assert.match(client, /onClick=\{.*handleToggleActive\(user\.id,\s*user\.is_active\)/);
});
