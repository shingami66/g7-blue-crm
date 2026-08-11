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

const INVOICE_ID = "00000000-0000-4000-8000-000000000001";
const REQUEST_ID = "req-pay-12345";

class TestUnauthorizedError extends Error {}
class TestForbiddenError extends Error {}
class TestAuthDependencyError extends Error {}

type PaymentScenario = {
  authErrorType: "unauthorized" | "forbidden" | "dependency" | null;
  rateLimitAllow: boolean;
  rpcData: unknown;
  rpcError: unknown;
  rpcThrows: Error | null;
};

let currentScenario: PaymentScenario = {
  authErrorType: null,
  rateLimitAllow: true,
  rpcData: { success: true, payment_id: "p1" },
  rpcError: null,
  rpcThrows: null,
};

function resetScenario(overrides: Partial<PaymentScenario> = {}) {
  currentScenario = {
    authErrorType: null,
    rateLimitAllow: true,
    rpcData: { success: true, payment_id: "p1" },
    rpcError: null,
    rpcThrows: null,
    ...overrides,
  };
}

mock.module("@/lib/auth/errors", {
  namedExports: {
    UnauthorizedError: TestUnauthorizedError,
    ForbiddenError: TestForbiddenError,
    AuthDependencyError: TestAuthDependencyError,
  },
});

mock.module("@/lib/auth/permissions", {
  namedExports: {
    requirePermission: async () => {
      if (currentScenario.authErrorType === "unauthorized") {
        throw new TestUnauthorizedError("Sign-in required");
      }
      if (currentScenario.authErrorType === "forbidden") {
        throw new TestForbiddenError("Permission denied");
      }
      if (currentScenario.authErrorType === "dependency") {
        throw new TestAuthDependencyError("Auth service unavailable");
      }
      return {
        id: "u1",
        clerk_user_id: "clerk_pay_user",
        role: "admin",
        is_active: true,
      };
    },
  },
});

mock.module("@/lib/security/rate-limit", {
  namedExports: {
    consumeRateLimit: () => currentScenario.rateLimitAllow,
  },
});

mock.module("@/lib/supabase/admin", {
  namedExports: {
    createAdminClient: () => ({
      rpc: async () => {
        if (currentScenario.rpcThrows) {
          throw currentScenario.rpcThrows;
        }
        return {
          data: currentScenario.rpcData,
          error: currentScenario.rpcError,
        };
      },
    }),
  },
});

const { executeRecordPayment, recordPaymentAction } = await import("./actions.ts");

function validPaymentInput() {
  return {
    invoiceId: INVOICE_ID,
    requestId: REQUEST_ID,
    amount: 500,
    date: "2026-08-11",
    method: "bank_transfer" as const,
    reference: "REF-100",
  };
}

test("executeRecordPayment logs stable correlation ID and sanitizes error on RPC transport exception", async () => {
  const loggedErrors: string[] = [];
  const originalConsoleError = console.error;
  console.error = (...args: unknown[]) => {
    loggedErrors.push(args.map((a) => String(a)).join(" "));
  };

  try {
    const failingRpc = async () => {
      throw new Error("FATAL database crash with sensitive password xyz123");
    };

    const result = await executeRecordPayment(
      validPaymentInput(),
      "clerk_user_1",
      failingRpc,
    );

    assert.deepEqual(result, { success: false, error: "payment_record_failed" });
    assert.equal(loggedErrors.length, 1);
    assert.equal(
      loggedErrors[0],
      `[executeRecordPayment] [${REQUEST_ID}] Payment RPC transport failure: dependency_error`,
    );
    assert.equal(loggedErrors[0].includes("password"), false);
    assert.equal(loggedErrors[0].includes("xyz123"), false);
  } finally {
    console.error = originalConsoleError;
  }
});

test("recordPaymentAction maps UnauthorizedError to Unauthorized", async () => {
  resetScenario({ authErrorType: "unauthorized" });
  const result = await recordPaymentAction(validPaymentInput());
  assert.deepEqual(result, { success: false, error: "Unauthorized" });
});

test("recordPaymentAction maps ForbiddenError to Forbidden", async () => {
  resetScenario({ authErrorType: "forbidden" });
  const result = await recordPaymentAction(validPaymentInput());
  assert.deepEqual(result, { success: false, error: "Forbidden" });
});

test("recordPaymentAction logs operational correlation and maps AuthDependencyError safely", async () => {
  resetScenario({ authErrorType: "dependency" });

  const loggedErrors: string[] = [];
  const originalConsoleError = console.error;
  console.error = (...args: unknown[]) => {
    loggedErrors.push(args.map((a) => String(a)).join(" "));
  };

  try {
    const result = await recordPaymentAction(validPaymentInput());
    assert.deepEqual(result, {
      success: false,
      error: "An unexpected error occurred.",
    });

    assert.equal(loggedErrors.length, 1);
    assert.equal(
      loggedErrors[0],
      `[recordPaymentAction] [${REQUEST_ID}] Auth dependency failure: auth_unavailable`,
    );
  } finally {
    console.error = originalConsoleError;
  }
});

test("recordPaymentAction returns rate limit error when rate limited", async () => {
  resetScenario({ rateLimitAllow: false });
  const result = await recordPaymentAction(validPaymentInput());
  assert.deepEqual(result, {
    success: false,
    error: "Too many attempts. Please wait a moment and try again.",
  });
});

test("recordPaymentAction rejects invalid schema input", async () => {
  resetScenario();
  const result = await recordPaymentAction({ invoiceId: "not-a-uuid" });
  assert.deepEqual(result, {
    success: false,
    error: "invalid_payment_input",
  });
});

test("executeRecordPayment sanitizes malformed/injected requestId to a UUID in logs", async () => {
  const loggedErrors: string[] = [];
  const originalConsoleError = console.error;
  console.error = (...args: unknown[]) => {
    loggedErrors.push(args.map((a) => String(a)).join(" "));
  };

  try {
    const failingRpc = async () => {
      throw new Error("RPC error");
    };

    const input = {
      ...validPaymentInput(),
      requestId: "injected\nnewline\r\nspaces-and-evil-payload",
    };

    const result = await executeRecordPayment(input, "clerk_user_1", failingRpc);

    assert.deepEqual(result, { success: false, error: "payment_record_failed" });
    assert.equal(loggedErrors.length, 1);
    assert.equal(loggedErrors[0].includes("injected"), false);
    assert.match(
      loggedErrors[0],
      /^\[executeRecordPayment\] \[[0-9a-f-]+\] Payment RPC transport failure: dependency_error$/,
    );
  } finally {
    console.error = originalConsoleError;
  }
});

test("recordPaymentAction sanitizes malformed/injected requestId in fallback operational logging", async () => {
  resetScenario({ authErrorType: "dependency" });

  const loggedErrors: string[] = [];
  const originalConsoleError = console.error;
  console.error = (...args: unknown[]) => {
    loggedErrors.push(args.map((a) => String(a)).join(" "));
  };

  try {
    const input = {
      ...validPaymentInput(),
      requestId: "malicious\nheader\r\nand spaces",
    };

    const result = await recordPaymentAction(input);
    assert.deepEqual(result, {
      success: false,
      error: "An unexpected error occurred.",
    });

    assert.equal(loggedErrors.length, 1);
    assert.equal(loggedErrors[0].includes("malicious"), false);
    assert.match(
      loggedErrors[0],
      /^\[recordPaymentAction\] \[[0-9a-f-]+\] Auth dependency failure: auth_unavailable$/,
    );
  } finally {
    console.error = originalConsoleError;
  }
});
