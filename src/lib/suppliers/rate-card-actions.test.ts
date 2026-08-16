import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const root = join(import.meta.dirname, "../../..");
const actions = readFileSync(join(root, "src/lib/suppliers/rate-card-actions.ts"), "utf8");
const list = readFileSync(join(root, "src/app/(dashboard)/suppliers/SupplierRateCardsList.tsx"), "utf8");

test("rate-card actions enforce costing permissions, overlap checks, pricing_basis, audit identity, and revalidation", () => {
  assert.match(actions, /supplier_costing:read/);
  assert.match(actions, /supplier_costing:write/);
  assert.match(actions, /findRateCardOverlap/);
  assert.match(actions, /isRateCardApplicableForUsagePeriod/);
  assert.match(actions, /pricing_basis/);
  assert.match(actions, /created_by: user\.clerk_user_id/);
  assert.match(actions, /updated_by: user\.clerk_user_id/);
  assert.match(actions, /revalidatePath\(`\/suppliers\/\$\{supplierId\}`\)/);
  assert.doesNotMatch(actions, /deleteSupplierRateCard|restoreSupplierRateCard/);
});

test("rate-card management remains Supplier Detail-only and exposes no customer-facing surface", () => {
  assert.match(list, /canManage/);
  assert.match(list, /activateSupplierRateCard|deactivateSupplierRateCard/);
  assert.match(list, /type="date"/);
  assert.match(list, /currency: "SAR"/);
  assert.match(list, /pricingBasis/);
  assert.doesNotMatch(list, /quotation|invoice|pdf|procurement|purchase order/i);
});
