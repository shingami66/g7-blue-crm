import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import ts from "typescript";

const dashboard = new URL("../../app/(dashboard)/", import.meta.url);
const routes = [
  "accounting/ar-bridge/page.tsx",
  "accounting/bank-reconciliation/page.tsx",
  "accounting/journals/page.tsx",
  "accounting/journals/[journalId]/page.tsx",
  "accounting/period-close/page.tsx",
  "settings/accounting/chart-of-accounts/page.tsx",
  "settings/accounting/inception/page.tsx",
  "settings/accounting/inception/[packageId]/page.tsx",
  "settings/accounting/periods/page.tsx",
  "settings/accounting/permissions/page.tsx",
  "settings/accounting/posting-rules/page.tsx",
  "settings/accounting/statement-mappings/page.tsx",
] as const;

function openings(source: string) {
  const file = ts.createSourceFile("page.tsx", source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const result: Array<ts.JsxOpeningElement | ts.JsxSelfClosingElement> = [];
  function visit(node: ts.Node) {
    if (ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) result.push(node);
    ts.forEachChild(node, visit);
  }
  visit(file);
  return result;
}

function isMain(node: ts.JsxOpeningElement | ts.JsxSelfClosingElement) {
  return node.tagName.getText() === "main" || node.attributes.properties.some((attribute) =>
    ts.isJsxAttribute(attribute) && attribute.name.getText() === "role" &&
    attribute.initializer && ts.isStringLiteral(attribute.initializer) && attribute.initializer.text === "main",
  );
}

test("DashboardLayout retains the application's one primary main landmark", () => {
  const source = readFileSync(new URL("layout.tsx", dashboard), "utf8");
  assert.equal(openings(source).filter(isMain).length, 1);
  assert.match(source, /<main className="dashboard-main/);
});

for (const route of routes) {
  test(`${route}: child route does not introduce a main landmark`, () => {
    assert.equal(openings(readFileSync(new URL(route, dashboard), "utf8")).filter(isMain).length, 0);
  });
}

test("Journal Detail keeps separate neutral wrappers for state and ready branches", () => {
  const source = readFileSync(new URL("accounting/journals/[journalId]/page.tsx", dashboard), "utf8");
  const wrappers = openings(source).filter((node) => node.tagName.getText() === "div" &&
    node.attributes.properties.some((attribute) => ts.isJsxAttribute(attribute) &&
      attribute.name.getText() === "className" && attribute.initializer &&
      ts.isStringLiteral(attribute.initializer) && attribute.initializer.text ===
      "mx-auto flex h-full w-full min-w-0 max-w-6xl flex-col gap-6"));
  assert.equal(wrappers.length, 2);
  assert.match(source, /state !== "ready" \|\| !detail/);
  assert.match(source, /<section role="status"/);
  assert.match(source, /<JournalDetailWorkspace/);
});

test("the scoped contract permits a page-level main outside DashboardLayout", () => {
  assert.equal(openings('<main><h1>Public sign-in</h1></main>').filter(isMain).length, 1);
});
