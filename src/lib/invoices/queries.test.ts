import assert from "node:assert/strict";
import { register } from "node:module";
import test, { mock } from "node:test";

type QueryFilter = { op: string; args: unknown[] };
type QueryCall = {
  filters: QueryFilter[];
  range?: [number, number];
  selectOptions?: unknown;
};

type QueryResponse = {
  data: unknown;
  error: unknown;
  count?: number | null;
};

type Scenario = {
  calls: QueryCall[];
  countResponse: QueryResponse;
  dataResponse: QueryResponse;
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
    requirePermission: async () => undefined,
  },
});

function scenario(): Scenario {
  if (!activeScenario) throw new Error("scenario not configured");
  return activeScenario;
}

function createQueryBuilder() {
  const call: QueryCall = { filters: [] };
  scenario().calls.push(call);

  const builder = {
    select(_columns: string, options?: unknown) {
      call.selectOptions = options;
      return builder;
    },
    eq(...args: unknown[]) {
      call.filters.push({ op: "eq", args });
      return builder;
    },
    not(...args: unknown[]) {
      call.filters.push({ op: "not", args });
      return builder;
    },
    gte(...args: unknown[]) {
      call.filters.push({ op: "gte", args });
      return builder;
    },
    lt(...args: unknown[]) {
      call.filters.push({ op: "lt", args });
      return builder;
    },
    or(...args: unknown[]) {
      call.filters.push({ op: "or", args });
      return builder;
    },
    order() {
      return builder;
    },
    range(start: number, end: number) {
      call.range = [start, end];
      return builder;
    },
    then(
      onfulfilled?: ((value: QueryResponse) => unknown) | null,
      onrejected?: ((reason: unknown) => unknown) | null,
    ) {
      const response = call.selectOptions
        ? scenario().countResponse
        : scenario().dataResponse;
      return Promise.resolve(response).then(onfulfilled ?? undefined, onrejected ?? undefined);
    },
  };

  return builder;
}

mock.module("@/lib/supabase/admin", {
  namedExports: {
    createAdminClient: () => ({ from: () => createQueryBuilder() }),
  },
});

const { getInvoicesList } = await import("./queries.ts");

function resetScenario(overrides: Partial<Scenario> = {}): Scenario {
  activeScenario = {
    calls: [],
    countResponse: { data: null, error: null, count: 0 },
    dataResponse: { data: [], error: null },
    ...overrides,
  };
  return activeScenario;
}

function hasFilter(call: QueryCall, op: string, column: string, value: unknown): boolean {
  return call.filters.some(
    (filter) => filter.op === op && filter.args[0] === column && filter.args[1] === value,
  );
}

function listQueries(scenarioState: Scenario): QueryCall[] {
  assert.equal(scenarioState.calls.length, 2);
  return scenarioState.calls;
}

test("All Statuses uses invoice date for Business Year and keeps count aligned with rows", async () => {
  const scenarioState = resetScenario({
    countResponse: { data: null, error: null, count: 33 },
  });

  const result = await getInvoicesList({
    year: 2026,
    status: "all",
    page: 2,
    pageSize: 10,
  });

  assert.equal(result.pagination.page, 2);
  assert.equal(result.pagination.pageSize, 10);
  assert.equal(result.pagination.total, 33);
  assert.equal(result.pagination.totalPages, 4);

  const [countQuery, dataQuery] = listQueries(scenarioState);
  for (const query of [countQuery, dataQuery]) {
    assert.equal(hasFilter(query, "eq", "is_deleted", false), true);
    assert.equal(hasFilter(query, "gte", "date", "2026-01-01"), true);
    assert.equal(hasFilter(query, "lt", "date", "2027-01-01"), true);
    assert.equal(query.filters.some((filter) => filter.args[0] === "issued_at"), false);
    assert.equal(query.filters.some((filter) => filter.args[0] === "status"), false);
  }
  assert.deepEqual(dataQuery.range, [10, 19]);
});

test("Explicit status filtering remains paired with the same Business Year dataset", async () => {
  const scenarioState = resetScenario({
    countResponse: { data: null, error: null, count: 10 },
  });

  const result = await getInvoicesList({ year: 2026, status: "draft" });

  assert.equal(result.pagination.total, 10);
  const [countQuery, dataQuery] = listQueries(scenarioState);
  for (const query of [countQuery, dataQuery]) {
    assert.equal(hasFilter(query, "eq", "status", "draft"), true);
    assert.equal(hasFilter(query, "gte", "date", "2026-01-01"), true);
    assert.equal(hasFilter(query, "lt", "date", "2027-01-01"), true);
    assert.equal(query.filters.some((filter) => filter.args[0] === "issued_at"), false);
  }
});
