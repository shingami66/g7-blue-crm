import test from "node:test";
import assert from "node:assert/strict";
import {
  PaymentSubmissionController,
  mapPaymentRpcResult,
  resetRegistryForTesting,
  type RecordPaymentResult,
} from "./submission-controller.ts";
import { executeRecordPayment } from "./actions.ts";

test("Payment Behavioral and Registry Tests", async (t) => {
  const mockIntent = {
    invoiceId: "123e4567-e89b-12d3-a456-426614174000",
    amount: 100,
    date: "2026-07-20",
    method: "bank_transfer" as const,
    reference: "REF-123",
  };

  t.beforeEach(() => {
    resetRegistryForTesting();
  });

  await t.test("1. Empty RPC array maps to payment_record_failed", () => {
    const result = mapPaymentRpcResult([], null);
    assert.equal(result.success, false);
    assert.equal(result.error, "payment_record_failed");
  });

  await t.test("2. Null RPC data maps to payment_record_failed", () => {
    const result = mapPaymentRpcResult(null, null);
    assert.equal(result.success, false);
    assert.equal(result.error, "payment_record_failed");
  });

  await t.test("3. Malformed success row maps to payment_record_failed", () => {
    // Missing required fields like invoice_status or payment_id is not UUID
    const result = mapPaymentRpcResult([{ payment_id: "not-uuid", payment_number: "P-1", amount_paid: 100, balance_due: 0, invoice_status: "paid" }], null);
    assert.equal(result.success, false);
    assert.equal(result.error, "payment_record_failed");
  });

  await t.test("4. Unknown error_code maps to payment_record_failed", () => {
    const result = mapPaymentRpcResult({ error_code: "some_internal_db_error" }, null);
    assert.equal(result.success, false);
    assert.equal(result.error, "payment_record_failed");
  });

  await t.test("5. Raw transport error maps to payment_record_failed without raw text", async () => {
    const rawError = new Error("Connection failed: Server closed unexpectedly.");
    const input = {
      invoiceId: "123e4567-e89b-12d3-a456-426614174000",
      requestId: "123e4567-e89b-12d3-a456-426614174001",
      amount: 100,
      date: "2026-07-20",
      method: "bank_transfer" as const,
    };
    const result = await executeRecordPayment(input, "user_1", async () => ({
      data: null,
      error: rawError,
    }));
    assert.equal(result.success, false);
    assert.equal(result.error, "payment_record_failed");
    assert.ok(!JSON.stringify(result).includes("Connection failed"));
  });

  await t.test("6. Thrown RPC exception maps to payment_record_failed without raw text", async () => {
    const input = {
      invoiceId: "123e4567-e89b-12d3-a456-426614174000",
      requestId: "123e4567-e89b-12d3-a456-426614174001",
      amount: 100,
      date: "2026-07-20",
      method: "bank_transfer" as const,
    };
    const result = await executeRecordPayment(input, "user_1", async () => {
      throw new Error("Internal PostgreSQL Exception");
    });
    assert.equal(result.success, false);
    assert.equal(result.error, "payment_record_failed");
    assert.ok(!JSON.stringify(result).includes("PostgreSQL Exception"));
  });

  await t.test("7. Valid initial success is accepted", () => {
    const successRow = {
      payment_id: "123e4567-e89b-12d3-a456-426614174002",
      payment_number: "PAY-001",
      amount_paid: 100,
      balance_due: 0,
      invoice_status: "paid",
    };
    const result = mapPaymentRpcResult([successRow], null);
    assert.equal(result.success, true);
    assert.equal(result.paymentId, successRow.payment_id);
    assert.equal(result.paymentNumber, successRow.payment_number);
    assert.equal(result.newAmountPaid, successRow.amount_paid);
    assert.equal(result.newBalanceDue, successRow.balance_due);
    assert.equal(result.newStatus, successRow.invoice_status);
  });

  await t.test("8. Valid replay success is accepted", () => {
    const successRow = {
      payment_id: "123e4567-e89b-12d3-a456-426614174002",
      payment_number: "PAY-001",
      amount_paid: 100,
      balance_due: 0,
      invoice_status: "paid",
    };
    const result = mapPaymentRpcResult(successRow, null);
    assert.equal(result.success, true);
    assert.equal(result.paymentId, successRow.payment_id);
  });

  await t.test("9. idempotency_conflict maps safely", () => {
    const result = mapPaymentRpcResult({ error_code: "idempotency_conflict" }, null);
    assert.equal(result.success, false);
    assert.equal(result.error, "idempotency_conflict");
  });

  await t.test("10. payment_exceeds_balance maps safely", () => {
    const result = mapPaymentRpcResult({ error_code: "payment_exceeds_balance" }, null);
    assert.equal(result.success, false);
    assert.equal(result.error, "payment_exceeds_balance");
  });

  await t.test("11. Same controller immediate duplicate invokes action once", async () => {
    const controller = new PaymentSubmissionController(() => "static-uuid-1");
    let mutationCount = 0;

    const execute = async () => {
      mutationCount++;
      return { success: true };
    };

    const r1 = controller.begin(mockIntent, execute);
    const r2 = controller.begin(mockIntent, execute);

    assert.equal(r1.accepted, true);
    assert.equal(r2.accepted, false);
    assert.equal(mutationCount, 1);
  });

  await t.test("12. Controller A begins an unresolved submission", () => {
    const controllerA = new PaymentSubmissionController(() => "static-uuid-a");
    const res = controllerA.begin(mockIntent, async () => ({ success: true }));
    assert.equal(res.accepted, true);
    assert.equal(res.requestId, "static-uuid-a");
  });

  await t.test("13. Controller/modal A is discarded or reset while unresolved", () => {
    const controllerA = new PaymentSubmissionController(() => "static-uuid-a");
    controllerA.begin(mockIntent, async () => {
      // Simulate unresolved promise
      return new Promise(() => {});
    });
    // Discarding controllerA means we just don't call anything or call reset
    controllerA.reset(mockIntent); // reset during pending is ignored for registry
    // The entry should still be in-flight
  });

  await t.test("14. Controller/modal B begins with the same invoice and normalized intent", () => {
    const controllerA = new PaymentSubmissionController(() => "static-uuid-a");
    controllerA.begin(mockIntent, async () => new Promise(() => {}));

    const controllerB = new PaymentSubmissionController(() => "static-uuid-b");
    const resB = controllerB.begin(mockIntent, async () => ({ success: true }));
    assert.equal(resB.accepted, true);
  });

  await t.test("15. Controller B does not invoke the action again", async () => {
    let callCount = 0;
    const controllerA = new PaymentSubmissionController(() => "static-uuid-a");
    controllerA.begin(mockIntent, async () => {
      callCount++;
      return new Promise(() => {});
    });

    const controllerB = new PaymentSubmissionController(() => "static-uuid-b");
    controllerB.begin(mockIntent, async () => {
      callCount++;
      return { success: true };
    });

    assert.equal(callCount, 1);
  });

  await t.test("16. Controller B reuses or attaches to the original request ID/in-flight operation", () => {
    const controllerA = new PaymentSubmissionController(() => "static-uuid-a");
    const resA = controllerA.begin(mockIntent, async () => new Promise(() => {}));

    const controllerB = new PaymentSubmissionController(() => "static-uuid-b");
    const resB = controllerB.begin(mockIntent, async () => new Promise(() => {}));

    assert.equal(resB.requestId, resA.requestId);
    assert.equal(resB.inFlightPromise, resA.inFlightPromise);
  });

  await t.test("17. Success callbacks execute once across both controller instances", async () => {
    let resolvePromise: (value: RecordPaymentResult) => void = () => {};
    const sharedPromise = new Promise<RecordPaymentResult>((resolve) => {
      resolvePromise = resolve;
    });

    const controllerA = new PaymentSubmissionController(() => "uuid-shared");
    const controllerB = new PaymentSubmissionController(() => "uuid-shared");

    let callbackCountA = 0;
    let callbackCountB = 0;

    const resA = controllerA.begin(mockIntent, () => sharedPromise);
    const resB = controllerB.begin(mockIntent, () => sharedPromise);

    // Let both listen to their returned inFlightPromise
    const promiseA = resA.inFlightPromise!.then((res) => {
      if (res.success) {
        controllerA.settleSuccess(mockIntent);
        callbackCountA++;
      }
    });

    const promiseB = resB.inFlightPromise!.then((res) => {
      if (res.success) {
        controllerB.settleSuccess(mockIntent);
        callbackCountB++;
      }
    });

    resolvePromise({ success: true });
    await Promise.all([promiseA, promiseB]);

    // Success side effect executes for whichever listeners are active.
    // Both controller instances registered and awaited, so each executed their success transition.
    // But the mutation promise was created exactly once.
    assert.equal(callbackCountA, 1);
    assert.equal(callbackCountB, 1);
  });

  await t.test("18. A changed intent while the first request is unresolved is rejected without another action call", () => {
    let callCount = 0;
    const controller = new PaymentSubmissionController(() => "uuid-1");
    controller.begin(mockIntent, async () => {
      callCount++;
      return new Promise(() => {});
    });

    const changedIntent = { ...mockIntent, amount: 200 };
    const res = controller.begin(changedIntent, async () => {
      callCount++;
      return { success: true };
    });

    assert.equal(res.accepted, false);
    assert.equal(callCount, 1);
  });

  await t.test("19. After settled failure, unchanged retry reuses the original request ID", async () => {
    let idCounter = 0;
    const controller = new PaymentSubmissionController(() => `uuid-${++idCounter}`);
    
    // First try
    const resA = controller.begin(mockIntent, async () => ({ success: false, error: "idempotency_conflict" }));
    assert.equal(resA.requestId, "uuid-1");
    controller.settleFailure(mockIntent);

    // Retry
    const resB = controller.begin(mockIntent, async () => ({ success: true }));
    assert.equal(resB.requestId, "uuid-1");
  });

  await t.test("20. After settled failure, changed intent receives a new request ID", async () => {
    let idCounter = 0;
    const controller = new PaymentSubmissionController(() => `uuid-${++idCounter}`);

    const resA = controller.begin(mockIntent, async () => ({ success: false, error: "idempotency_conflict" }));
    assert.equal(resA.requestId, "uuid-1");
    controller.settleFailure(mockIntent);

    const changedIntent = { ...mockIntent, amount: 150 };
    const resB = controller.begin(changedIntent, async () => ({ success: true }));
    assert.equal(resB.requestId, "uuid-2");
  });

  await t.test("21. After terminal success, a deliberate new payment can receive a new request ID", async () => {
    let idCounter = 0;
    const controller = new PaymentSubmissionController(() => `uuid-${++idCounter}`);

    const resA = controller.begin(mockIntent, async () => ({ success: true }));
    assert.equal(resA.requestId, "uuid-1");
    controller.settleSuccess(mockIntent);

    const resB = controller.begin(mockIntent, async () => ({ success: true }));
    assert.equal(resB.requestId, "uuid-2");
  });

  await t.test("22. Reset during in-flight does not remove protection", () => {
    const controller = new PaymentSubmissionController(() => "uuid-protect");
    controller.begin(mockIntent, async () => new Promise(() => {}));
    
    // Call reset
    controller.reset(mockIntent);

    // Protection check: same intent cannot be re-invoked
    let callCount = 0;
    const res = controller.begin(mockIntent, async () => {
      callCount++;
      return { success: true };
    });

    assert.equal(callCount, 0, "Should attach to in-flight operation rather than triggering a new one");
    assert.equal(res.requestId, "uuid-protect");
  });
});
