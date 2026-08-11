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
        url: "data:text/javascript,export class NextResponse extends Response { static json(body, init) { return new Response(JSON.stringify(body), { ...init, headers: { 'content-type': 'application/json', ...(init?.headers || {}) } }); } }",
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

type HealthDbState = {
  dbError: { message: string } | null;
  dbThrows: Error | null;
};

let currentHealthState: HealthDbState = {
  dbError: null,
  dbThrows: null,
};

mock.module("@/lib/supabase/admin", {
  namedExports: {
    createAdminClient: () => {
      if (currentHealthState.dbThrows) {
        throw currentHealthState.dbThrows;
      }
      return {
        from: () => ({
          select: () => ({
            limit: async () => {
              return {
                data: currentHealthState.dbError ? null : [{ id: 1 }],
                error: currentHealthState.dbError,
              };
            },
          }),
        }),
      };
    },
  },
});

const { GET } = await import("./route.ts");

test("health route returns 200 when database is healthy", async () => {
  currentHealthState = { dbError: null, dbThrows: null };
  const req = new Request("http://localhost:3000/api/health/db", {
    headers: { "x-request-id": "req-health-123" },
  });

  const res = await GET(req);
  assert.equal(res.status, 200);
  const data = await res.json();
  assert.equal(data.ok, true);
  assert.equal(data.database, "supabase");
  assert.ok(typeof data.timestamp === "string");
});

test("health route returns 500 and logs sanitized operational message on DB error without leaking raw DB error", async () => {
  currentHealthState = {
    dbError: { message: "FATAL 28P01: password authentication failed for user supabase_admin with secret_key" },
    dbThrows: null,
  };

  const loggedErrors: string[] = [];
  const originalConsoleError = console.error;
  console.error = (...args: unknown[]) => {
    loggedErrors.push(args.map((a) => String(a)).join(" "));
  };

  try {
    const req = new Request("http://localhost:3000/api/health/db", {
      headers: { "x-correlation-id": "corr-health-456" },
    });

    const res = await GET(req);
    assert.equal(res.status, 500);
    const data = await res.json();
    assert.equal(data.ok, false);
    assert.equal(data.database, "supabase");
    assert.equal(data.error, "Database connection or query failed.");

    // Verify operational logs
    assert.equal(loggedErrors.length, 1);
    assert.equal(
      loggedErrors[0],
      "[Health Check] [corr-health-456] Database check failed: query_error",
    );
    // Ensure raw secret/password from dbError is NOT logged
    assert.equal(loggedErrors[0].includes("password"), false);
    assert.equal(loggedErrors[0].includes("secret_key"), false);
  } finally {
    console.error = originalConsoleError;
  }
});

test("health route returns 500 and logs sanitized operational message on exception without raw leak", async () => {
  currentHealthState = {
    dbError: null,
    dbThrows: new Error("Network unreachable: connect ECONNREFUSED 127.0.0.1:5432 with token abc"),
  };

  const loggedErrors: string[] = [];
  const originalConsoleError = console.error;
  console.error = (...args: unknown[]) => {
    loggedErrors.push(args.map((a) => String(a)).join(" "));
  };

  try {
    const req = new Request("http://localhost:3000/api/health/db");
    const res = await GET(req);
    assert.equal(res.status, 500);
    const data = await res.json();
    assert.equal(data.ok, false);
    assert.equal(data.error, "Internal server error.");

    assert.equal(loggedErrors.length, 1);
    assert.match(
      loggedErrors[0],
      /^\[Health Check\] \[[0-9a-f-]+\] Health check unexpected error: dependency_unavailable$/,
    );
    assert.equal(loggedErrors[0].includes("ECONNREFUSED"), false);
    assert.equal(loggedErrors[0].includes("token"), false);
  } finally {
    console.error = originalConsoleError;
  }
});

test("health route sanitizes malformed/injected correlation IDs to a UUID", async () => {
  currentHealthState = {
    dbError: { message: "query failed" },
    dbThrows: null,
  };

  const loggedErrors: string[] = [];
  const originalConsoleError = console.error;
  console.error = (...args: unknown[]) => {
    loggedErrors.push(args.map((a) => String(a)).join(" "));
  };

  try {
    const req = new Request("http://localhost:3000/api/health/db", {
      headers: { "x-request-id": "bad header with spaces and special chars @#$!" },
    });

    const res = await GET(req);
    assert.equal(res.status, 500);

    assert.equal(loggedErrors.length, 1);
    assert.equal(loggedErrors[0].includes("bad header"), false);
    assert.match(
      loggedErrors[0],
      /^\[Health Check\] \[[0-9a-f-]+\] Database check failed: query_error$/,
    );
  } finally {
    console.error = originalConsoleError;
  }
});
