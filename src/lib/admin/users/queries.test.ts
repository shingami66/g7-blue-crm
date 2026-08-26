import assert from "node:assert/strict";
import { register } from "node:module";
import test, { mock } from "node:test";

type QueryCall = {
  table: string;
  columns?: string;
  order?: { column: string; options: unknown };
};

type Scenario = {
  calls: QueryCall[];
  data: unknown;
  error: unknown;
  permissionDenied?: boolean;
  unauthorized?: boolean;
};

let activeScenario: Scenario | null = null;

class TestForbiddenError extends Error {}
class TestUnauthorizedError extends Error {}

const testModuleLoader = `
export async function resolve(specifier, context, nextResolve) {
  if (specifier === "server-only") {
    return { url: "data:text/javascript,", shortCircuit: true };
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

mock.module("server-only", { namedExports: {} });
mock.module("@/lib/auth/errors", {
  namedExports: {
    ForbiddenError: TestForbiddenError,
    UnauthorizedError: TestUnauthorizedError,
  },
});
mock.module("@/lib/auth/permissions", {
  namedExports: {
    requirePermission: async (permission: string) => {
      if (activeScenario?.unauthorized) throw new TestUnauthorizedError("Sign-in required");
      if (activeScenario?.permissionDenied) throw new TestForbiddenError(`Permission '${permission}' required`);
      return { id: "admin-actor-1", role: "admin" };
    },
  },
});

function scenario(): Scenario {
  if (!activeScenario) throw new Error("scenario not configured");
  return activeScenario;
}

function createTableBuilder(table: string) {
  const call: QueryCall = { table };
  scenario().calls.push(call);

  const builder = {
    select(columns: string) {
      call.columns = columns;
      return builder;
    },
    order(column: string, options: unknown) {
      call.order = { column, options };
      return builder;
    },
    then(
      onfulfilled?: ((value: unknown) => unknown) | null,
      onrejected?: ((reason: unknown) => unknown) | null,
    ) {
      const response = {
        data: scenario().data ?? null,
        error: scenario().error ?? null,
      };
      return Promise.resolve(response).then(onfulfilled ?? undefined, onrejected ?? undefined);
    },
  };

  return builder;
}

mock.module("@/lib/supabase/admin", {
  namedExports: {
    createAdminClient: () => ({ from: (table: string) => createTableBuilder(table) }),
  },
});

const { getAppUsers } = await import("./queries.ts");

function resetScenario(overrides: Partial<Scenario> = {}): Scenario {
  activeScenario = {
    calls: [],
    data: [],
    error: null,
    ...overrides,
  };
  return activeScenario;
}

const EXPECTED_ADMIN_USERS_PROJECTION = "id, email, name, role, is_active, created_at";

test("getAppUsers query projection does not request clerk_user_id or wildcard (*)", async () => {
  const sampleUsers = [
    {
      id: "u-1",
      email: "user1@example.com",
      name: "Admin User",
      role: "admin",
      is_active: true,
      created_at: "2026-08-01T00:00:00Z",
      updated_at: "2026-08-02T00:00:00Z",
      clerk_user_id: "user_clerk_1",
    },
  ];

  const s = resetScenario({ data: sampleUsers });

  const result = await getAppUsers();

  assert.equal(result.success, true);
  if (result.success) {
    assert.equal(result.users.length, 1);
    assert.equal("clerk_user_id" in result.users[0], false, "AppUserRow must not contain clerk_user_id");
    assert.equal("updated_at" in result.users[0], false, "Admin list DTO must not contain updated_at");
    assert.deepEqual(result.users[0], {
      id: "u-1",
      email: "user1@example.com",
      name: "Admin User",
      role: "admin",
      is_active: true,
      created_at: "2026-08-01T00:00:00Z",
    });
  }

  assert.equal(s.calls.length, 1);
  const call = s.calls[0];
  assert.equal(call.table, "app_users");
  assert.equal(call.columns, EXPECTED_ADMIN_USERS_PROJECTION);
  assert.equal(call.columns?.includes("*"), false, "Query projection must not request '*'");
  assert.equal(call.columns?.includes("clerk_user_id"), false, "Query projection must not select clerk_user_id");
});

test("getAppUsers enforces users:manage permission and handles authorization errors", async () => {
  resetScenario({ unauthorized: true });
  await assert.rejects(async () => {
    await getAppUsers();
  }, TestUnauthorizedError);

  resetScenario({ permissionDenied: true });
  await assert.rejects(async () => {
    await getAppUsers();
  }, TestForbiddenError);
});

test("getAppUsers handles Supabase database error gracefully", async () => {
  const providerMessage = "admin provider detail must stay server-side";
  resetScenario({ error: { message: providerMessage } });
  const originalConsoleError = console.error;
  const logs: string[] = [];
  console.error = (...args: unknown[]) => logs.push(args.join(" "));

  let result: Awaited<ReturnType<typeof getAppUsers>>;
  try {
    result = await getAppUsers();
  } finally {
    console.error = originalConsoleError;
  }

  assert.equal(result.success, false);
  if (!result.success) {
    assert.equal(result.error, "Unable to load users. Please try again.");
  }
  assert.equal(logs.some((log) => log.includes(providerMessage)), false);
  assert.deepEqual(logs, ["[getAppUsers] Supabase error: user_list_query_failed"]);
});
