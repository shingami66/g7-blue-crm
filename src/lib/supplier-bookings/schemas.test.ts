import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import {
  cancelSupplierBookingSchema,
  createSupplierBookingSchema,
} from "./schemas.ts";

const REPO_ROOT = join(import.meta.dirname, "../../..");
const ACTIONS = join(REPO_ROOT, "src/lib/supplier-bookings/actions.ts");
const QUERIES = join(REPO_ROOT, "src/lib/supplier-bookings/queries.ts");
const UI = join(
  REPO_ROOT,
  "src/app/(dashboard)/services/[id]/SupplierBookingActions.tsx",
);

function source(path: string) {
  return readFileSync(path, "utf8");
}

test("Supplier Booking schemas retain bounded source and cancellation inputs", () => {
  assert.equal(
    createSupplierBookingSchema.safeParse({
      sourceAllocationId: "00000000-0000-4000-8000-000000000001",
    }).success,
    true,
  );
  assert.equal(createSupplierBookingSchema.safeParse({ sourceAllocationId: "invalid" }).success, false);
  assert.equal(cancelSupplierBookingSchema.safeParse({ cancelledReason: "Changed plan" }).success, true);
  assert.equal(cancelSupplierBookingSchema.safeParse({ cancelledReason: "" }).success, false);
});

test("Booking creation denies unavailable Supplier lifecycle states", () => {
  const actions = source(ACTIONS);
  assert.match(actions, /\.from\("suppliers"\)/);
  assert.match(actions, /\.eq\("is_deleted", false\)/);
  assert.match(actions, /supplier\.status !== "active"/);
  assert.match(actions, /supplier\.is_blacklisted/);
  assert.match(actions, /Supplier is unavailable for Supplier Booking\./);
});

test("Booking cancellation uses expected state and stable stale handling", () => {
  const actions = source(ACTIONS);
  assert.match(actions, /\.eq\("status", existingBooking\.status\)/);
  assert.match(actions, /error: SUPPLIER_BOOKING_STALE_ERROR/);
  assert.match(actions, /\.select\("\*, supplier:suppliers/);
  assert.match(actions, /\.maybeSingle\(\)/);
});

test("Booking queries distinguish operational failure from an empty list", () => {
  const queries = source(QUERIES);
  assert.match(queries, /error: "supplier_bookings_load_failed"/);
  assert.doesNotMatch(queries, /return \[\];/);
});

test("Booking cancellation dialog has semantics and keyboard focus handling", () => {
  const ui = source(UI);
  assert.match(ui, /role="dialog"/);
  assert.match(ui, /aria-modal="true"/);
  assert.match(ui, /aria-labelledby=/);
  assert.match(ui, /aria-describedby=/);
  assert.match(ui, /event\.key === "Escape"/);
  assert.match(ui, /event\.key !== "Tab"/);
  assert.match(ui, /reasonRef\.current\?\.focus\(\)/);
  assert.match(ui, /previousFocus\.focus\(\)/);
  assert.match(ui, /text-start/);
});
