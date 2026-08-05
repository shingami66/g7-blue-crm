import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import { resolveWorkspaceSkeletonVariant } from "../components/ui/workspace-loading.ts";

const REPO_ROOT = join(import.meta.dirname, "../..");

function read(relativePath: string) {
  return readFileSync(join(REPO_ROOT, relativePath), "utf8");
}

test("workspace loading resolves the five approved destination shapes", () => {
  assert.equal(resolveWorkspaceSkeletonVariant("/dashboard"), "dashboard");
  assert.equal(resolveWorkspaceSkeletonVariant("/services"), "list");
  assert.equal(resolveWorkspaceSkeletonVariant("/services/abc"), "detail");
  assert.equal(resolveWorkspaceSkeletonVariant("/services/abc/edit?step=1"), "form");
  assert.equal(resolveWorkspaceSkeletonVariant("/reports?period=month"), "reports");
});

test("workspace loading uses delayed reveal, reduced-motion stability, and assistive hiding", () => {
  const skeleton = read("src/components/ui/WorkspaceSkeleton.tsx");
  const css = read("src/app/globals.css");

  assert.match(skeleton, /role="status"/);
  assert.match(skeleton, /aria-live="polite"/);
  assert.match(skeleton, /aria-hidden="true"/);
  assert.match(css, /transition: opacity 160ms ease-out/);
  assert.match(css, /180ms/);
  assert.match(css, /prefers-reduced-motion: reduce/);
  assert.match(css, /g7-skeleton/);
});

test("fast list operations stay silent while submitted search remains localized and explicit", () => {
  const navigation = read("src/components/ui/useListNavigation.ts");
  const control = read("src/components/ui/ModuleSearchControl.tsx");
  const pagination = read("src/components/ui/PaginationFooter.tsx");
  const common = read("src/lib/i18n/dictionaries/common.ts");

  assert.match(navigation, /startTransition/);
  assert.match(navigation, /isSearchPending/);
  assert.match(control, /actionLabel = isSearchPending \? pendingLabel : submitLabel/);
  assert.match(control, /aria-busy=\{isSearchPending \|\| undefined\}/);
  assert.match(pagination, /aria-busy=\{isPending \|\| undefined\}/);
  assert.match(common, /searching: "Searching…"/);
  assert.match(common, /searching: "جاري البحث…"/);
  assert.doesNotMatch(navigation, /CenterPendingBolt|GlobalPendingProvider/);
});

test("bootstrap copy remains localized and the shell loading path has no decorative loader", () => {
  const rootLoading = read("src/app/loading.tsx");
  const dashboardLoading = read("src/app/(dashboard)/loading.tsx");
  const layout = read("src/app/(dashboard)/layout.tsx");

  assert.match(rootLoading, /bootstrap\.preparingWorkspace/);
  assert.match(rootLoading, /G7 BLUE/);
  assert.match(dashboardLoading, /WorkspaceLoadingFrame/);
  assert.doesNotMatch(`${rootLoading}\n${dashboardLoading}\n${layout}`, /CenterPendingBolt|GlobalPendingProvider/);
});
