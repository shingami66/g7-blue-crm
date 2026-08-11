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
const sourceRootUrl = new URL("../../", import.meta.url).href;
const { registerHooks } = require("node:module") as {
  registerHooks: (hooks: { resolve: ResolveHook }) => void;
};

registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier === "server-only") {
      return {
        shortCircuit: true,
        url: "data:text/javascript,export default {}",
      };
    }

    if (specifier.startsWith("@/")) {
      return {
        shortCircuit: true,
        url: new URL(`../../${specifier.slice(2)}.ts`, import.meta.url).href,
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

type AuthState = {
  authResult: { userId: string | null } | null;
  authError: Error | null;
  dbResult: Record<string, unknown> | null;
  dbError: { code?: string; message?: string } | null;
  dbThrows: Error | null;
};

let currentAuthState: AuthState = {
  authResult: null,
  authError: null,
  dbResult: null,
  dbError: null,
  dbThrows: null,
};

function resetAuthState(overrides: Partial<AuthState> = {}) {
  currentAuthState = {
    authResult: { userId: null },
    authError: null,
    dbResult: null,
    dbError: null,
    dbThrows: null,
    ...overrides,
  };
}

mock.module("@clerk/nextjs/server", {
  namedExports: {
    auth: async () => {
      if (currentAuthState.authError) {
        throw currentAuthState.authError;
      }
      return currentAuthState.authResult || { userId: null };
    },
  },
});

mock.module("@/lib/supabase/admin", {
  namedExports: {
    createAdminClient: () => {
      return {
        from: () => ({
          select: () => ({
            eq: () => ({
              single: async () => {
                if (currentAuthState.dbThrows) {
                  throw currentAuthState.dbThrows;
                }
                return {
                  data: currentAuthState.dbResult,
                  error: currentAuthState.dbError,
                };
              },
            }),
          }),
        }),
      };
    },
  },
});

const {
  getCurrentAppUser,
  requireUser,
  requireRole,
  requirePermission,
  checkPermission,
  AuthDependencyError,
  UnauthorizedError,
  ForbiddenError,
} = await import("./permissions.ts");

test("getCurrentAppUser returns null when user is not authenticated in Clerk", async () => {
  resetAuthState({ authResult: { userId: null } });
  const user = await getCurrentAppUser();
  assert.equal(user, null);
});

test("getCurrentAppUser returns null when user is not found in app_users (PGRST116)", async () => {
  resetAuthState({
    authResult: { userId: "clerk_123" },
    dbResult: null,
    dbError: { code: "PGRST116", message: "No rows returned" },
  });
  const user = await getCurrentAppUser();
  assert.equal(user, null);
});

test("getCurrentAppUser returns user record when found in app_users", async () => {
  const mockUser = {
    id: "user_uuid_1",
    clerk_user_id: "clerk_123",
    email: "user@example.com",
    role: "admin",
    is_active: true,
  };
  resetAuthState({
    authResult: { userId: "clerk_123" },
    dbResult: mockUser,
    dbError: null,
  });
  const user = await getCurrentAppUser();
  assert.deepEqual(user, mockUser);
});

test("getCurrentAppUser throws AuthDependencyError when database returns an unexpected error", async () => {
  resetAuthState({
    authResult: { userId: "clerk_123" },
    dbResult: null,
    dbError: { code: "57P01", message: "admin_shutdown" },
  });
  await assert.rejects(
    async () => {
      await getCurrentAppUser();
    },
    (err: unknown) => {
      assert.ok(err instanceof AuthDependencyError);
      assert.equal(err.name, "AuthDependencyError");
      return true;
    },
  );
});

test("getCurrentAppUser throws AuthDependencyError when auth() encounters a provider failure", async () => {
  resetAuthState({
    authError: new Error("Clerk authentication service unavailable: ECONNRESET"),
  });
  await assert.rejects(
    async () => {
      await getCurrentAppUser();
    },
    (err: unknown) => {
      assert.ok(err instanceof AuthDependencyError);
      assert.equal(err.name, "AuthDependencyError");
      return true;
    },
  );
});

test("getCurrentAppUser throws AuthDependencyError when DB query throws exception", async () => {
  resetAuthState({
    authResult: { userId: "clerk_123" },
    dbThrows: new Error("Network socket disconnected"),
  });
  await assert.rejects(
    async () => {
      await getCurrentAppUser();
    },
    (err: unknown) => {
      assert.ok(err instanceof AuthDependencyError);
      return true;
    },
  );
});

test("requireUser throws UnauthorizedError when user is null", async () => {
  resetAuthState({ authResult: { userId: null } });
  await assert.rejects(
    async () => {
      await requireUser();
    },
    (err: unknown) => {
      assert.ok(err instanceof UnauthorizedError);
      return true;
    },
  );
});

test("requireUser throws ForbiddenError when user is inactive", async () => {
  resetAuthState({
    authResult: { userId: "clerk_123" },
    dbResult: { id: "u1", clerk_user_id: "clerk_123", role: "admin", is_active: false },
  });
  await assert.rejects(
    async () => {
      await requireUser();
    },
    (err: unknown) => {
      assert.ok(err instanceof ForbiddenError);
      return true;
    },
  );
});

test("requireUser propagates AuthDependencyError without converting to UnauthorizedError", async () => {
  resetAuthState({
    authResult: { userId: "clerk_123" },
    dbError: { code: "57P01", message: "admin_shutdown" },
  });
  await assert.rejects(
    async () => {
      await requireUser();
    },
    (err: unknown) => {
      assert.ok(err instanceof AuthDependencyError);
      assert.equal(err instanceof UnauthorizedError, false);
      return true;
    },
  );
});

test("requireRole and requirePermission propagate AuthDependencyError on dependency failure", async () => {
  resetAuthState({
    authResult: { userId: "clerk_123" },
    dbError: { code: "57P01", message: "connection_refused" },
  });
  await assert.rejects(
    async () => {
      await requireRole("admin");
    },
    (err: unknown) => {
      assert.ok(err instanceof AuthDependencyError);
      return true;
    },
  );
  await assert.rejects(
    async () => {
      await requirePermission("invoices:write");
    },
    (err: unknown) => {
      assert.ok(err instanceof AuthDependencyError);
      return true;
    },
  );
});

test("checkPermission returns false for unauthenticated or inactive users, but propagates AuthDependencyError on failure", async () => {
  // Unauthenticated -> false
  resetAuthState({ authResult: { userId: null } });
  assert.equal(await checkPermission("invoices:write"), false);

  // Inactive user -> false
  resetAuthState({
    authResult: { userId: "clerk_123" },
    dbResult: { id: "u1", clerk_user_id: "clerk_123", role: "admin", is_active: false },
  });
  assert.equal(await checkPermission("invoices:write"), false);

  // Active admin -> true
  resetAuthState({
    authResult: { userId: "clerk_123" },
    dbResult: { id: "u1", clerk_user_id: "clerk_123", role: "admin", is_active: true },
  });
  assert.equal(await checkPermission("invoices:write"), true);

  // Active viewer -> false for write
  resetAuthState({
    authResult: { userId: "clerk_123" },
    dbResult: { id: "u1", clerk_user_id: "clerk_123", role: "viewer", is_active: true },
  });
  assert.equal(await checkPermission("invoices:write"), false);

  // DB failure -> propagates AuthDependencyError (NOT false)
  resetAuthState({
    authResult: { userId: "clerk_123" },
    dbError: { code: "57P01", message: "connection_refused" },
  });
  await assert.rejects(
    async () => {
      await checkPermission("invoices:write");
    },
    (err: unknown) => {
      assert.ok(err instanceof AuthDependencyError);
      return true;
    },
  );
});
