import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const root = join(import.meta.dirname, "../..");
const read = (path: string) => readFileSync(join(root, path), "utf8");

test("root bootstrap delegates its localized direction-aware state to PreparingWorkspace", () => {
  const source = read("src/app/loading.tsx");

  assert.match(source, /import PreparingWorkspace from "@\/components\/ui\/PreparingWorkspace"/);
  assert.match(source, /<PreparingWorkspace[\s\S]*message=\{shared\.bootstrap\.preparingWorkspace\}[\s\S]*direction=\{getDirection\(locale\)\}/);
  assert.doesNotMatch(source, /G7 BLUE|<main|aria-busy|role="status"/);
});

test("sign-in and root bootstrap use the same canonical branded loading component", () => {
  const signIn = read("src/components/auth/SignInForm.tsx");
  const rootLoading = read("src/app/loading.tsx");

  assert.match(signIn, /import PreparingWorkspace from "@\/components\/ui\/PreparingWorkspace"/);
  assert.match(signIn, /<PreparingWorkspace[\s\S]*preparingMessage[\s\S]*direction/);
  assert.match(rootLoading, /<PreparingWorkspace/);

  const canonical = read("src/components/ui/PreparingWorkspace.tsx");
  assert.match(canonical, /aria-busy="true"/);
  assert.match(canonical, /aria-live="polite"/);
  assert.match(canonical, /role="status"/);
  assert.match(canonical, /@media \(prefers-reduced-motion: reduce\)/);
});

test("dashboard route loading keeps its authenticated workspace skeleton", () => {
  const routeLoading = read("src/app/(dashboard)/loading.tsx");
  const frame = read("src/components/ui/WorkspaceLoadingFrame.tsx");

  assert.match(routeLoading, /WorkspaceLoadingFrame/);
  assert.match(routeLoading, /getCurrentSessionEffectiveLocale/);
  assert.match(frame, /WorkspaceSkeleton/);
  assert.doesNotMatch(routeLoading, /PreparingWorkspace|G7 BLUE/);
});
