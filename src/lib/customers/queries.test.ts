import assert from "node:assert/strict";
import { register } from "node:module";
import test, { mock } from "node:test";

type QueryCall = {
  table: string;
  columns?: string;
  selectOptions?: unknown;
  filters: Array<{ op: string; args: unknown[] }>;
  range?: [number, number];
  single?: boolean;
};

type Scenario = {
  calls: QueryCall[];
  customersCount?: number | null;
  customersData?: unknown;
  customersError?: unknown;
  metricsData?: unknown;
  metricsError?: unknown;
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

function createTableBuilder(table: string) {
  const call: QueryCall = { table, filters: [] };
  scenario().calls.push(call);

  const builder = {
    select(columns: string, options?: unknown) {
      call.columns = columns;
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
    or(...args: unknown[]) {
      call.filters.push({ op: "or", args });
      return builder;
    },
    in(...args: unknown[]) {
      call.filters.push({ op: "in", args });
      return builder;
    },
    order() {
      return builder;
    },
    limit() {
      return builder;
    },
    range(start: number, end: number) {
      call.range = [start, end];
      return builder;
    },
    single() {
      call.single = true;
      return builder;
    },
    then(
      onfulfilled?: ((value: unknown) => unknown) | null,
      onrejected?: ((reason: unknown) => unknown) | null,
    ) {
      let response: { data: unknown; error: unknown; count?: number | null };
      if (table === "customers") {
        if (call.selectOptions) {
          response = {
            data: null,
            error: scenario().customersError ?? null,
            count: scenario().customersCount ?? 0,
          };
        } else if (call.single) {
          response = {
            data: scenario().customersData ?? null,
            error: scenario().customersError ?? null,
          };
        } else {
          response = {
            data: scenario().customersData ?? [],
            error: scenario().customersError ?? null,
          };
        }
      } else if (table === "customer_report_metrics") {
        if (call.single) {
          response = {
            data: scenario().metricsData ?? null,
            error: scenario().metricsError ?? null,
          };
        } else {
          response = {
            data: scenario().metricsData ?? [],
            error: scenario().metricsError ?? null,
          };
        }
      } else {
        response = { data: [], error: null };
      }

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

const { getCustomers, getCustomersList, getCustomerCities, getCustomerById } = await import("./queries.ts");

function resetScenario(overrides: Partial<Scenario> = {}): Scenario {
  activeScenario = {
    calls: [],
    customersCount: 0,
    customersData: [],
    customersError: null,
    metricsData: [],
    metricsError: null,
    ...overrides,
  };
  return activeScenario;
}

const EXPECTED_CUSTOMER_LIST_PROJECTION =
  "id, customer_number, company, contact, phone, email, city, status";

const EXPECTED_CUSTOMER_METRICS_PROJECTION =
  "customer_id, services_count, quotations_count, total_quoted_amount";

const EXPECTED_CUSTOMER_PICKER_PROJECTION = "id, company, contact, status";

test("getCustomersList uses exact explicit projection for customers and metrics, mapping complete row shape", async () => {
  const sampleCustomer = {
    id: "cust-1",
    customer_number: "CUST-0001",
    company: "Test Corp",
    contact: "Alice",
    phone: "123456",
    email: "alice@example.com",
    city: "Riyadh",
    status: "active",
    customer_type: "corporate",
    legal_name: "Test Corp Ltd",
    commercial_registration_number: "1010101010",
    vat_number: "300000000000003",
    national_address_building_number: "1234",
    national_address_street: "King Fahd Rd",
    national_address_district: "Olaya",
    national_address_city: "Riyadh",
    national_address_postal_code: "12211",
    national_address_additional_number: "5678",
    national_address_country: "SA",
    billing_email: "billing@testcorp.com",
    finance_contact_name: "Bob Finance",
    finance_contact_phone: "987654",
    payment_terms: "net_30",
    po_required: true,
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-02T00:00:00Z",
  };
  const sampleMetric = {
    customer_id: "cust-1",
    services_count: 3,
    quotations_count: 2,
    approved_quotations_count: 1,
    draft_quotations_count: 1,
    total_quoted_amount: 15000,
  };

  const s = resetScenario({
    customersCount: 1,
    customersData: [sampleCustomer],
    metricsData: [sampleMetric],
  });

  const result = await getCustomersList({ page: 1, pageSize: 10 });

  assert.equal(result.pagination.total, 1);
  assert.equal(result.customers.length, 1);
  const cust = result.customers[0];
  assert.equal(cust.id, "cust-1");
  assert.equal(cust.customerNumber, "CUST-0001");
  assert.equal(cust.company, "Test Corp");
  assert.equal(cust.contact, "Alice");
  assert.equal(cust.phone, "123456");
  assert.equal(cust.email, "alice@example.com");
  assert.equal(cust.city, "Riyadh");
  assert.equal(cust.status, "active");
  assert.equal(cust.servicesCount, 3);
  assert.equal(cust.quotationsCount, 2);
  assert.equal(cust.totalQuotedAmount, 15000);
  assert.equal("vatNumber" in cust, false);
  assert.equal("nationalAddressStreet" in cust, false);
  assert.equal("billingEmail" in cust, false);
  assert.equal("financeContactName" in cust, false);

  // Check calls: count query, customer data query, metrics data query
  assert.equal(s.calls.length, 3);

  const countCall = s.calls[0];
  assert.equal(countCall.table, "customers");
  assert.equal(countCall.columns, "id");

  const customerDataCall = s.calls[1];
  assert.equal(customerDataCall.table, "customers");
  assert.equal(customerDataCall.columns, EXPECTED_CUSTOMER_LIST_PROJECTION);
  assert.equal(customerDataCall.columns?.includes("*"), false);

  const metricsCall = s.calls[2];
  assert.equal(metricsCall.table, "customer_report_metrics");
  assert.equal(metricsCall.columns, EXPECTED_CUSTOMER_METRICS_PROJECTION);
  assert.equal(metricsCall.columns?.includes("*"), false);
});

test("getCustomers uses an allowlisted picker projection without wildcard (*)", async () => {
  const sampleCustomer = {
    id: "cust-2",
    customer_number: "CUST-0002",
    company: "Beta LLC",
    contact: "Bob",
    phone: "654321",
    email: "bob@example.com",
    city: "Jeddah",
    status: "active",
    customer_type: "individual",
    legal_name: null,
    commercial_registration_number: null,
    vat_number: null,
    national_address_building_number: null,
    national_address_street: null,
    national_address_district: null,
    national_address_city: null,
    national_address_postal_code: null,
    national_address_additional_number: null,
    national_address_country: "SA",
    billing_email: null,
    finance_contact_name: null,
    finance_contact_phone: null,
    payment_terms: "immediate",
    po_required: false,
    created_at: "2026-02-01T00:00:00Z",
    updated_at: "2026-02-02T00:00:00Z",
  };
  const sampleMetric = {
    customer_id: "cust-2",
    services_count: 5,
    quotations_count: 4,
    approved_quotations_count: 2,
    draft_quotations_count: 2,
    total_quoted_amount: 25000,
  };

  const s = resetScenario({
    customersData: [sampleCustomer],
    metricsData: [sampleMetric],
  });

  const customers = await getCustomers();

  assert.deepEqual(customers, [
    { id: "cust-2", company: "Beta LLC", contact: "Bob", status: "active" },
  ]);

  assert.equal(s.calls.length, 1);

  const customerCall = s.calls[0];
  assert.equal(customerCall.table, "customers");
  assert.equal(customerCall.columns, EXPECTED_CUSTOMER_PICKER_PROJECTION);
  assert.equal(customerCall.columns?.includes("*"), false);
});

test("getCustomersList emits a sanitized diagnostic without the provider error message", async () => {
  const providerMessage = "customer provider detail must stay server-side";
  const s = resetScenario({
    customersError: { message: providerMessage },
  });
  const originalConsoleError = console.error;
  const logs: string[] = [];
  console.error = (...args: unknown[]) => logs.push(args.join(" "));

  try {
    const result = await getCustomersList();
    assert.equal(result.error, "customers_load_failed");
  } finally {
    console.error = originalConsoleError;
  }

  assert.equal(logs.some((log) => log.includes(providerMessage)), false);
  assert.deepEqual(logs, ["[getCustomersList] Count error: customer_list_count_failed"]);
  assert.equal(s.calls.length, 2);
});

test("getCustomerCities uses explicit city projection", async () => {
  const s = resetScenario({
    customersData: [{ city: "Riyadh" }, { city: "Jeddah" }, { city: "Riyadh" }],
  });

  const cities = await getCustomerCities();

  assert.deepEqual(cities, ["Jeddah", "Riyadh"]);
  assert.equal(s.calls.length, 1);
  assert.equal(s.calls[0].table, "customers");
  assert.equal(s.calls[0].columns, "city");
});

test("getCustomerById fetches single customer record and metrics", async () => {
  const sampleCustomer = {
    id: "cust-3",
    customer_number: "CUST-0003",
    company: "Gamma Corp",
    contact: "Charlie",
    phone: "999888",
    email: "charlie@example.com",
    city: "Dammam",
    status: "active",
  };

  const s = resetScenario({
    customersData: sampleCustomer,
    metricsData: {
      customer_id: "cust-3",
      services_count: 1,
      quotations_count: 1,
      approved_quotations_count: 1,
      draft_quotations_count: 0,
      total_quoted_amount: 5000,
    },
  });

  const customer = await getCustomerById("cust-3");

  assert.ok(customer);
  assert.equal(customer.company, "Gamma Corp");
  assert.equal(customer.servicesCount, 1);
  assert.equal(s.calls.length, 2);
  assert.equal(s.calls[0].single, true);
  assert.equal(s.calls[1].single, true);
});
