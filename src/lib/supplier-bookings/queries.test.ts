import assert from "node:assert/strict";
import { register } from "node:module";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test, { mock } from "node:test";

type BookingRow = {
  id: string;
  service_id: string;
  supplier_id: string;
  source_allocation_id: string;
  booking_number: string;
  status: "draft" | "cancelled";
  category: string;
  item_name: string;
  unit: string;
  quantity: number;
  currency: string;
  estimated_unit_cost: number;
  estimated_total_cost: number;
  scope_of_work: string | null;
  internal_notes: string | null;
  allocation_snapshot: Record<string, unknown>;
  cancelled_at: string | null;
  cancelled_by: string | null;
  cancelled_reason: string | null;
  created_by: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
  is_deleted: boolean;
};

type QueryFilter = { operator: "eq" | "neq"; args: [string, unknown] };
type QueryCall = { filters: QueryFilter[]; rows: BookingRow[] };

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

class UnauthorizedError extends Error {}
class ForbiddenError extends Error {}

mock.module("@/lib/auth/errors", {
  namedExports: { UnauthorizedError, ForbiddenError },
});

let activeRows: BookingRow[] = [];
let activeCall: QueryCall | null = null;

mock.module("@/lib/auth/permissions", {
  namedExports: {
    checkPermission: async () => false,
    requirePermission: async () => undefined,
  },
});

mock.module("@/lib/supabase/admin", {
  namedExports: {
    createAdminClient: () => ({
      from: () => {
        activeCall = { filters: [], rows: activeRows };
        const builder = {
          select: () => builder,
          eq(column: string, value: unknown) {
            activeCall?.filters.push({ operator: "eq", args: [column, value] });
            return builder;
          },
          neq(column: string, value: unknown) {
            activeCall?.filters.push({ operator: "neq", args: [column, value] });
            return builder;
          },
          order: () => builder,
          then(onfulfilled?: (value: { data: BookingRow[]; error: null }) => unknown) {
            const filtered = activeRows.filter((row) =>
              activeCall?.filters.every(({ operator, args: [column, value] }) =>
                operator === "eq" ? row[column as keyof BookingRow] === value : row[column as keyof BookingRow] !== value,
              ),
            );
            return Promise.resolve({ data: filtered, error: null }).then(onfulfilled);
          },
        };
        return builder;
      },
    }),
  },
});

const { getSupplierBookingsByServiceId } = await import("./queries.ts");

const REPO_ROOT = join(import.meta.dirname, "../../..");
const SERVICE_PAGE = join(REPO_ROOT, "src/app/(dashboard)/services/[id]/page.tsx");

function booking(overrides: Partial<BookingRow>): BookingRow {
  return {
    id: "booking-1",
    service_id: "service-1",
    supplier_id: "supplier-1",
    source_allocation_id: "allocation-1",
    booking_number: "SB-001",
    status: "draft",
    category: "Catering",
    item_name: "Dinner",
    unit: "event",
    quantity: 1,
    currency: "SAR",
    estimated_unit_cost: 100,
    estimated_total_cost: 100,
    scope_of_work: null,
    internal_notes: null,
    allocation_snapshot: {},
    cancelled_at: null,
    cancelled_by: null,
    cancelled_reason: null,
    created_by: null,
    updated_by: null,
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
    is_deleted: false,
    ...overrides,
  };
}

test("Service booking defaults exclude deleted rows, active mode excludes cancelled rows, and history includes both", async () => {
  activeRows = [
    booking({ id: "live-draft" }),
    booking({ id: "live-cancelled", status: "cancelled" }),
    booking({ id: "deleted-draft", is_deleted: true }),
    booking({ id: "deleted-cancelled", status: "cancelled", is_deleted: true }),
  ];

  const defaultResult = await getSupplierBookingsByServiceId("service-1");
  assert.deepEqual(defaultResult.bookings.map((row) => row.id), ["live-draft", "live-cancelled"]);

  const activeResult = await getSupplierBookingsByServiceId("service-1", { onlyActive: true });
  assert.deepEqual(activeResult.bookings.map((row) => row.id), ["live-draft"]);

  const historyResult = await getSupplierBookingsByServiceId("service-1", {
    includeDeleted: true,
    onlyActive: false,
  });
  assert.deepEqual(historyResult.bookings.map((row) => row.id), [
    "live-draft",
    "live-cancelled",
    "deleted-draft",
    "deleted-cancelled",
  ]);
  assert.equal(historyResult.bookings.find((row) => row.id === "deleted-cancelled")?.isDeleted, true);
});

test("Service Detail explicitly requests the complete booking history for All records", () => {
  const servicePage = readFileSync(SERVICE_PAGE, "utf8");
  assert.match(
    servicePage,
    /getSupplierBookingsByServiceId\(service\.id,[\s\S]*?includeDeleted: showSupplierHistory,[\s\S]*?onlyActive: !showSupplierHistory,/,
  );
});
