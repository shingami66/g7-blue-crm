import assert from "node:assert/strict";
import test from "node:test";
import { customerInvoiceWorkspaceHref } from "./navigation.ts";

test("customer invoice workspace link uses the existing customer filter contract", () => {
  assert.equal(
    customerInvoiceWorkspaceHref("  Example & Co.  "),
    "/invoices?searchMode=customer&search=Example+%26+Co.",
  );
});

test("customer invoice workspace link does not fall back to an unfiltered workspace", () => {
  assert.equal(customerInvoiceWorkspaceHref("   "), null);
});
