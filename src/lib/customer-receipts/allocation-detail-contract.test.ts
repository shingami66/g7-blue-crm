import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const queries = readFileSync(join(process.cwd(), "src/lib/customer-receipts/queries.ts"), "utf8");
const client = readFileSync(join(process.cwd(), "src/app/(dashboard)/payments/receipts/CustomerReceiptsClient.tsx"), "utf8");
const page = readFileSync(join(process.cwd(), "src/app/(dashboard)/payments/receipts/page.tsx"), "utf8");

test("Allocation detail is selected-receipt pagination, not globally truncated enrichment", () => {
  const workspaceStart = queries.indexOf("export async function getCustomerReceiptWorkspaceData");
  const detailStart = queries.indexOf("export async function getCustomerReceiptAllocationPage");
  assert.ok(workspaceStart >= 0 && detailStart > workspaceStart);
  const workspaceSource = queries.slice(workspaceStart, detailStart);
  assert.doesNotMatch(workspaceSource, /customer_receipt_allocations/);
  assert.doesNotMatch(queries, /limit\(Math\.max\(50/);
  assert.match(queries, /from\("payments"\)[\s\S]*?\.is\("invoice_id", null\)[\s\S]*?\.eq\("is_deleted", false\)/);
  assert.match(queries, /getCustomerReceiptAllocationPage/);
  assert.match(queries, /\.order\("allocated_at", \{ ascending: false \}\)\s*\.order\("id", \{ ascending: false \}\)/);
  assert.match(queries, /\.range\(rangeStart, rangeStart \+ query\.pageSize - 1\)/);
});

test("Allocation detail exposes explicit continuation and older-row actions", () => {
  assert.match(client, /getCustomerReceiptAllocationPageAction/);
  assert.match(client, /allocationPage\.pagination/);
  assert.match(client, /onPageSizeChange=\{changeAllocationPageSize\}/);
  assert.match(client, /allocationPage\.allocations\.map/);
  assert.match(client, /reverseAllocation\(allocation\.id\)/);
  assert.match(page, /const workspaceKey =/);
  assert.match(page, /CustomerReceiptsClient key=\{workspaceKey\}/);
});
