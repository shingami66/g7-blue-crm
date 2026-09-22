import assert from "node:assert/strict";
import test from "node:test";
import {
  calculateEventCostingMetrics,
  deriveCompleteness,
  getEventCostingUnavailableReason,
  isEventCostingBudgetRpcSuccess,
  isEventCostingEtcRpcSuccess,
  isEventCostingRequestId,
  parseForecastMargin,
} from "./model.ts";
import { getCurrentRiyadhDate } from "../reports/filters.ts";

test("W8A derives budget, EAC, and forecast margin from authoritative inputs", () => {
  assert.deepEqual(
    calculateEventCostingMetrics({
      baseBudget: 12000,
      contingency: 2000,
      actualCost: 10000,
      etc: 3000,
      netApprovedCommercialValue: 5500,
    }),
    { approvedBudgetCost: 14000, eac: 13000, forecastMargin: -7500 },
  );
});

test("W8A parses negative forecast margin without treating it as an invalid cost amount", () => {
  assert.equal(parseForecastMargin(-7500.01), -7500.01);
  assert.equal(parseForecastMargin("-7500.01"), -7500.01);
  assert.equal(parseForecastMargin(0), 0);
  assert.equal(parseForecastMargin(null), null);
  assert.equal(parseForecastMargin("not-a-number"), null);
});

test("W8A does not manufacture EAC or margin when ETC or commercial authority is unavailable", () => {
  assert.deepEqual(
    calculateEventCostingMetrics({
      baseBudget: null,
      contingency: null,
      actualCost: 10000,
      etc: null,
      netApprovedCommercialValue: null,
    }),
    { approvedBudgetCost: null, eac: null, forecastMargin: null },
  );
});

test("W8A completeness discloses pending and missing sources", () => {
  assert.deepEqual(
    deriveCompleteness({
      hasBudget: true,
      hasEtc: true,
      hasCommercialAuthority: true,
      pendingSupplierBills: 1,
      pendingEventExpenses: 0,
    }),
    { status: "PARTIAL", reasonCodes: ["pending_supplier_bills"] },
  );
});

test("W8A preserves replay identity and maps unavailable RPC payloads", () => {
  assert.equal(isEventCostingRequestId("4b6f5a0d-4c58-4c1e-8dc8-9d9b7a3f3c91"), true);
  assert.equal(isEventCostingRequestId("not-a-request-id"), false);
  assert.equal(
    getEventCostingUnavailableReason({ status: "UNAVAILABLE", reason_codes: ["budget_unavailable"] }),
    "budget_unavailable",
  );
});

test("W8A budget action rejects incomplete or unsuccessful RPC responses", () => {
  const success = {
    error_code: null,
    budget_id: "2f6feea1-c73d-48ef-87c4-5be430550a65",
    budget_version: 2,
    approved_budget_cost: "14000.00",
    idempotent_replay: false,
  };
  assert.equal(isEventCostingBudgetRpcSuccess(success), true);
  for (const response of [
    {},
    { ...success, error_code: undefined },
    { ...success, error_code: "service_not_found" },
    { ...success, budget_id: "" },
    { ...success, budget_id: "not-a-uuid" },
    { ...success, budget_version: 0 },
    { ...success, approved_budget_cost: undefined },
    { ...success, idempotent_replay: undefined },
  ]) {
    assert.equal(isEventCostingBudgetRpcSuccess(response), false);
  }
});

test("W8A ETC action rejects incomplete or unsuccessful RPC responses", () => {
  const success = {
    error_code: null,
    forecast_id: "1be3bc4a-38e2-4c10-9922-bdb129f5084a",
    forecast_version: 1,
    etc_amount: 3000,
    idempotent_replay: true,
  };
  assert.equal(isEventCostingEtcRpcSuccess(success), true);
  for (const response of [
    {},
    { ...success, error_code: undefined },
    { ...success, error_code: "invalid_request" },
    { ...success, forecast_id: "" },
    { ...success, forecast_id: "not-a-uuid" },
    { ...success, forecast_version: 0 },
    { ...success, etc_amount: Number.NaN },
    { ...success, idempotent_replay: undefined },
  ]) {
    assert.equal(isEventCostingEtcRpcSuccess(response), false);
  }
});

test("W8A current business date is ISO formatted in Asia/Riyadh", () => {
  assert.equal(getCurrentRiyadhDate(new Date("2026-09-21T21:30:00.000Z")), "2026-09-22");
});
