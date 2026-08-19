import assert from "node:assert/strict";
import test from "node:test";
import {
  applyApplicableServiceInvoiceExposurePredicate,
  parseApplicableServiceInvoiceExposureResult,
} from "./exposure.ts";

type QueryOperation =
  | { method: "eq" | "is"; column: string; value: unknown }
  | {
      method: "not";
      column: string;
      operator: string;
      value: unknown;
    };

function recordingQuery(operations: QueryOperation[]) {
  const query = {
    eq(column: string, value: unknown) {
      operations.push({ method: "eq", column, value });
      return query;
    },
    is(column: string, value: unknown) {
      operations.push({ method: "is", column, value });
      return query;
    },
    not(column: string, operator: string, value: unknown) {
      operations.push({ method: "not", column, operator, value });
      return query;
    },
  };

  return query;
}

test("shared exposure helper builds the authoritative nullable-soft-delete Service predicate", () => {
  const operations: QueryOperation[] = [];
  const query = recordingQuery(operations);

  const result = applyApplicableServiceInvoiceExposurePredicate(
    query,
    "service-1",
  );

  assert.equal(result, query);
  assert.deepEqual(operations, [
    { method: "eq", column: "service_id", value: "service-1" },
    {
      method: "not",
      column: "is_deleted",
      operator: "is",
      value: true,
    },
    { method: "is", column: "voided_at", value: null },
    {
      method: "not",
      column: "status",
      operator: "in",
      value: '("cancelled","voided")',
    },
  ]);
  assert.equal(
    operations.some((operation) => operation.column === "quotation_id"),
    false,
  );
  assert.equal(
    operations.some((operation) => operation.column === "payments"),
    false,
  );
});

test("explicit empty exposure data is authoritative zero", () => {
  assert.deepEqual(
    parseApplicableServiceInvoiceExposureResult({ data: [], error: null }),
    { status: "success", exposure: 0, rows: [] },
  );
});

test("exposure result containers remain fail closed", () => {
  const arrayResult: unknown[] = [];
  Object.assign(arrayResult, { data: [], error: null });
  const inheritedResult = Object.create({ data: [], error: null });
  const getterResult = Object.defineProperties({}, {
    data: {
      get() {
        throw new Error("Getter must not be evaluated");
      },
    },
    error: { value: null },
  });

  for (const value of [
    null,
    undefined,
    arrayResult,
    inheritedResult,
    getterResult,
    { data: [], error: { message: "query failed" } },
    { data: null, error: null },
    { data: undefined, error: null },
    { data: {}, error: null },
  ]) {
    assert.deepEqual(parseApplicableServiceInvoiceExposureResult(value), {
      status: "unavailable",
    });
  }
});

test("exposure rows remain fail closed", () => {
  const inheritedRow = Object.create({ id: "invoice-1", grand_total: 10 });
  const getterRow = Object.defineProperties({}, {
    id: { value: "invoice-1" },
    grand_total: {
      get() {
        throw new Error("Getter must not be evaluated");
      },
    },
  });

  for (const row of [
    null,
    [],
    inheritedRow,
    getterRow,
    {},
    { id: "", grand_total: 10 },
    { id: "   ", grand_total: 10 },
    { id: "invoice-1" },
  ]) {
    assert.deepEqual(
      parseApplicableServiceInvoiceExposureResult({
        data: [row],
        error: null,
      }),
      { status: "unavailable" },
    );
  }
});

test("exposure money validation and accumulation remain fail closed", () => {
  for (const grandTotal of [
    "0x10",
    "0b10",
    "0o10",
    "1e3",
    "+5",
    -1,
    Number.POSITIVE_INFINITY,
  ]) {
    assert.deepEqual(
      parseApplicableServiceInvoiceExposureResult({
        data: [{ id: "invoice-1", grand_total: grandTotal }],
        error: null,
      }),
      {
        status: "unavailable",
        rows: [{ id: "invoice-1", grand_total: grandTotal }],
      },
    );
  }

  assert.deepEqual(
    parseApplicableServiceInvoiceExposureResult({
      data: [
        { id: "invoice-1", grand_total: Number.MAX_VALUE },
        { id: "invoice-2", grand_total: Number.MAX_VALUE },
      ],
      error: null,
    }),
    {
      status: "unavailable",
      rows: [
        { id: "invoice-1", grand_total: Number.MAX_VALUE },
        { id: "invoice-2", grand_total: Number.MAX_VALUE },
      ],
    },
  );
});
