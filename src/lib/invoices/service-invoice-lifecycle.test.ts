import assert from "node:assert/strict";
import test from "node:test";
import {
  getServiceInvoiceLifecycleDecision,
  type ServiceInvoiceLifecycleDecision,
} from "./service-invoice-lifecycle.ts";

function decision(status: unknown, deletedAt: unknown = null) {
  return getServiceInvoiceLifecycleDecision({ status, deletedAt });
}

function assertDecision(
  actual: ServiceInvoiceLifecycleDecision,
  expected: {
    status: ServiceInvoiceLifecycleDecision["status"];
    deposit: boolean;
    final: boolean;
  },
) {
  assert.equal(actual.status, expected.status);
  assert.equal(actual.canCreateDeposit, expected.deposit);
  assert.equal(actual.canCreateFinal, expected.final);
  assert.equal(
    actual.depositDenial,
    expected.deposit ? null : "service_not_eligible_for_deposit",
  );
  assert.equal(
    actual.finalDenial,
    expected.final ? null : "service_not_eligible_for_final",
  );
}

for (const lifecycleCase of [
  { status: "Inquiry", deposit: true, final: true },
  { status: "Quoted", deposit: true, final: true },
  { status: "Approved", deposit: true, final: true },
  { status: "Deposit Paid", deposit: false, final: true },
  { status: "In Progress", deposit: false, final: true },
  { status: "Completed", deposit: false, final: false },
  { status: "Cancelled", deposit: false, final: false },
] as const) {
  test(`Service Invoice lifecycle matrix: ${lifecycleCase.status}`, () => {
    assertDecision(decision(lifecycleCase.status), lifecycleCase);
  });
}

for (const [name, status] of [
  ["null status", null],
  ["undefined status", undefined],
  ["blank status", ""],
  ["whitespace-only status", "   "],
  ["unknown status", "Archived"],
  ["number status", 1],
  ["object status", {}],
  ["Array status", []],
] as Array<[string, unknown]>) {
  test(`Service Invoice lifecycle fails closed for ${name}`, () => {
    assert.deepEqual(decision(status), {
      status: null,
      canCreateDeposit: false,
      canCreateFinal: false,
      depositDenial: "service_lifecycle_unavailable",
      finalDenial: "service_lifecycle_unavailable",
    });
  });
}

test("Service Invoice lifecycle fails closed for deleted Service evidence", () => {
  assert.deepEqual(decision("Approved", "2026-07-16T00:00:00.000Z"), {
    status: null,
    canCreateDeposit: false,
    canCreateFinal: false,
    depositDenial: "service_lifecycle_unavailable",
    finalDenial: "service_lifecycle_unavailable",
  });
});

for (const [name, evidence] of [
  ["missing evidence", undefined],
  ["null evidence", null],
  ["empty evidence", {}],
  ["Array-shaped evidence", []],
  ["missing deleted evidence", { status: "Approved" }],
] as Array<[string, unknown]>) {
  test(`Service Invoice lifecycle rejects ${name}`, () => {
    assert.deepEqual(getServiceInvoiceLifecycleDecision(evidence), {
      status: null,
      canCreateDeposit: false,
      canCreateFinal: false,
      depositDenial: "service_lifecycle_unavailable",
      finalDenial: "service_lifecycle_unavailable",
    });
  });
}
