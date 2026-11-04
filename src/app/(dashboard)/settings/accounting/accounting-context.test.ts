import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";
import test from "node:test";

const src = fileURLToPath(new URL("../../../../../src", import.meta.url));
const read = (path: string) => readFileSync(resolve(src, path), "utf8");

const workspaceRoutes = [
  { path: "app/(dashboard)/settings/accounting/page.tsx", client: "AccountingSetupClient", root: true },
  { path: "app/(dashboard)/settings/accounting/chart-of-accounts/page.tsx", client: "ChartOfAccountsClient" },
  { path: "app/(dashboard)/settings/accounting/periods/page.tsx", client: "PeriodsClient" },
  { path: "app/(dashboard)/settings/accounting/posting-rules/page.tsx", client: "PostingRulesClient" },
  { path: "app/(dashboard)/settings/accounting/statement-mappings/page.tsx", client: "StatementMappingsClient" },
  { path: "app/(dashboard)/settings/accounting/permissions/page.tsx", client: "AccountingPermissionsClient" },
  { path: "app/(dashboard)/settings/accounting/inception/page.tsx", client: "InceptionPackagesClient", inception: true },
];

function breadcrumbItems(source: string) {
  const match = source.match(/items:\s*\[([\s\S]*?)\]/);
  assert.ok(match, "page location must declare explicit breadcrumb items");
  return match[1];
}

test("all seven Setup workspaces use the shared wide shell and keep their specialized clients", () => {
  for (const route of workspaceRoutes) {
    const source = read(route.path);
    assert.match(source, /<PageFrame variant="workspace">/, route.path);
    assert.match(source, /<PageLocation\b/, route.path);
    assert.match(source, /<PageHeader variant="composed" title=\{dictionary\.title\} subtitle=\{dictionary\.subtitle\} \/>/, route.path);
    assert.doesNotMatch(source, /<h1\b/, route.path);
    assert.ok(source.includes(`<${route.client}`), `${route.path} must keep ${route.client} connected`);

    const items = breadcrumbItems(source);
    assert.match(items, /\{ label: settingsLabel \}/, route.path);
    if (!route.root) assert.match(items, /\{ label: setupDictionary\.title \}/, route.path);
    assert.doesNotMatch(items, /href\s*:/, `${route.path} must not assume access to a parent Setup destination`);
    if (route.inception) assert.match(items, /dictionary\.accountingInceptionLabel, current: true/);
  }
});

test("existing Setup and Inception Return destinations use the shared labeled control", () => {
  const statement = read("app/(dashboard)/settings/accounting/statement-mappings/page.tsx");
  const inception = read("app/(dashboard)/settings/accounting/inception/page.tsx");
  const detail = read("app/(dashboard)/settings/accounting/inception/[packageId]/page.tsx");

  for (const source of [statement, inception]) {
    assert.match(source, /<RecordBackButton href="\/settings\/accounting" locale=\{locale\} variant="labeled" label=\{dictionary\.backToSetup\}/);
  }
  assert.match(detail, /<RecordBackButton href="\/settings\/accounting\/inception" locale=\{locale\} variant="labeled" label=\{dictionary\.backToPackages\}/);
  assert.match(detail, /\{ label: dictionary\.accountingInceptionLabel, href: "\/settings\/accounting\/inception" \}/);
  assert.match(detail, /\{ label: dictionary\.packageDetailLabel, current: true \}/);

  for (const route of workspaceRoutes.filter((item) => ["chart-of-accounts", "periods", "posting-rules", "permissions"].some((part) => item.path.includes(`/${part}/`)))) {
    assert.doesNotMatch(read(route.path), /RecordBackButton|returnControl/, `${route.path} must not gain an unconditional parent return`);
  }
});

test("Inception Package Detail shows its LTR identifier only in the authorized ready state", () => {
  const source = read("app/(dashboard)/settings/accounting/inception/[packageId]/page.tsx");
  const items = breadcrumbItems(source);
  assert.match(source, /<PageFrame variant="record">/);
  assert.match(source, /identifier=\{state === "ready" \? <bdi dir="ltr" className="break-all">\{packageId\}<\/bdi> : undefined\}/);
  assert.doesNotMatch(items, /packageId/);
  assert.match(source, /state = detail \? "ready" : "not-found"/);
  assert.ok(source.includes("<InceptionPackageDetailClient "), "the specialized package evidence and approval body must remain connected");
});

test("Accounting Inception breadcrumb labels are localized in both supported locales", () => {
  const source = read("lib/i18n/dictionaries/accounting-inception.ts");
  assert.match(source, /accountingInceptionLabel:\s*"Accounting Inception"/);
  assert.match(source, /packageDetailLabel:\s*"Package detail"/);
  assert.match(source, /accountingInceptionLabel:\s*"بداية المحاسبة"/);
  assert.match(source, /packageDetailLabel:\s*"تفاصيل الحزمة"/);
});
