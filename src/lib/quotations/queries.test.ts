import assert from "node:assert/strict";
import { register } from "node:module";
import test, { mock } from "node:test";

type QueryCall = {
  table: string;
  selectColumns?: string;
  filters: Array<[string, unknown]>;
  orders: Array<[string, { ascending?: boolean } | undefined]>;
};

type Scenario = {
  calls: QueryCall[];
  rows: Record<string, unknown>[];
  error: { message: string } | null;
  permissionError: Error | null;
  permissions: string[];
};

let activeScenario: Scenario | null = null;

const testModuleLoader = `
export async function resolve(specifier, context, nextResolve) {
  if (specifier === "server-only") return { url: "data:text/javascript,", shortCircuit: true };
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

function scenario(): Scenario {
  if (!activeScenario) throw new Error("Scenario not configured");
  return activeScenario;
}

mock.module("@/lib/auth/permissions", {
  namedExports: {
    requirePermission: async (permission: string) => {
      scenario().permissions.push(permission);
      if (scenario().permissionError) throw scenario().permissionError;
    },
  },
});

mock.module("@/lib/supabase/admin", {
  namedExports: {
    createAdminClient: () => ({
      from: (table: string) => {
        const call: QueryCall = { table, filters: [], orders: [] };
        scenario().calls.push(call);
        const query = {
          select: (columns: string) => {
            call.selectColumns = columns;
            return query;
          },
          eq: (column: string, value: unknown) => {
            call.filters.push([column, value]);
            return query;
          },
          order: (column: string, options?: { ascending?: boolean }) => {
            call.orders.push([column, options]);
            return query;
          },
          then: (onfulfilled?: (value: { data: Record<string, unknown>[]; error: { message: string } | null }) => unknown) =>
            Promise.resolve({ data: scenario().rows, error: scenario().error }).then(onfulfilled),
        };
        return query;
      },
    }),
  },
});

const { getQuotationsByServiceIdResult } = await import("./queries.ts");

function resetScenario(overrides: Partial<Scenario> = {}): Scenario {
  activeScenario = {
    calls: [],
    rows: [],
    error: null,
    permissionError: null,
    permissions: [],
    ...overrides,
  };
  return activeScenario;
}

test("Service related quotations uses the card projection without changing its single filtered read", async () => {
  const state = resetScenario({
    rows: [{
      id: "quotation-1",
      quotation_number: "QT-001",
      date: "2026-08-01",
      valid_until: "2026-08-31",
      grand_total: "1250.50",
      status: "approved",
      customer_id: "must-not-be-exposed",
      snapshot_buyer: { name: "must-not-be-exposed" },
      services: { service_title: "must-not-be-exposed" },
    }],
  });

  const result = await getQuotationsByServiceIdResult("service-1");

  assert.deepEqual(state.permissions, ["quotations:read"]);
  assert.equal(state.calls.length, 1);
  assert.deepEqual(state.calls[0], {
    table: "quotations",
    selectColumns: "id, quotation_number, date, valid_until, grand_total, status",
    filters: [["service_id", "service-1"], ["is_deleted", false]],
    orders: [
      ["quotation_number", { ascending: false }],
      ["created_at", { ascending: false }],
      ["id", { ascending: false }],
    ],
  });
  assert.deepEqual(result, {
    quotations: [{
      id: "quotation-1",
      quotationNumber: "QT-001",
      date: "2026-08-01",
      validUntil: "2026-08-31",
      grandTotal: 1250.5,
      status: "approved",
    }],
  });
});

test("Service related quotations preserves the existing load-failure result", async () => {
  resetScenario({ error: { message: "unavailable" } });

  const result = await getQuotationsByServiceIdResult("service-1");

  assert.deepEqual(result, { quotations: [], error: "quotations_load_failed" });
});
