import test from "node:test";
import assert from "node:assert/strict";
import { createRequire, register } from "node:module";
import { pathToFileURL } from "node:url";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";

const require = createRequire(import.meta.url);
const tsUrl = pathToFileURL(require.resolve("typescript")).href;

const testModuleLoader = `
import ts from ${JSON.stringify(tsUrl)};
import { readFileSync, existsSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";
import { join } from "node:path";

export async function resolve(specifier, context, nextResolve) {
  if (specifier === "server-only") {
    return { url: "data:text/javascript,export default {}", shortCircuit: true };
  }
  if (specifier.startsWith("@/")) {
    const rel = specifier.slice(2);
    const basePath = join(process.cwd(), "src", rel);
    if (existsSync(basePath + ".tsx")) {
      return { url: pathToFileURL(basePath + ".tsx").href, shortCircuit: true };
    }
    if (existsSync(basePath + ".ts")) {
      return { url: pathToFileURL(basePath + ".ts").href, shortCircuit: true };
    }
  }
  if (specifier.startsWith(".")) {
    const parentDir = context.parentURL ? fileURLToPath(new URL(".", context.parentURL)) : process.cwd();
    const candidate = join(parentDir, specifier);
    if (existsSync(candidate + ".tsx")) {
      return { url: pathToFileURL(candidate + ".tsx").href, shortCircuit: true };
    }
    if (existsSync(candidate + ".ts")) {
      return { url: pathToFileURL(candidate + ".ts").href, shortCircuit: true };
    }
  }
  return nextResolve(specifier, context);
}

export async function load(url, context, nextLoad) {
  if (url.startsWith("file:") && (url.endsWith(".tsx") || url.endsWith(".ts"))) {
    const filePath = fileURLToPath(url);
    const source = readFileSync(filePath, "utf8");
    const transpiled = ts.transpileModule(source, {
      compilerOptions: {
        target: ts.ScriptTarget.ES2022,
        module: ts.ModuleKind.ESNext,
        jsx: ts.JsxEmit.ReactJSX,
      },
    });
    return {
      format: "module",
      shortCircuit: true,
      source: transpiled.outputText,
    };
  }
  return nextLoad(url, context);
}
`;

register(`data:text/javascript,${encodeURIComponent(testModuleLoader)}`, import.meta.url);

const { default: ModuleSearchControl } = await import("./ModuleSearchControl.tsx");

const sampleModes = [
  { value: "customer", label: "Customer Name", placeholder: "Search by customer name" },
  { value: "phone", label: "Phone Number", placeholder: "Search by phone number" },
] as const;

test("module search control renders labeled mode selector, disabled input when unselected, and action buttons", () => {
  // Unselected mode state: input and submit button disabled
  const unselectedHtml = renderToStaticMarkup(
    React.createElement(ModuleSearchControl, {
      mode: undefined,
      modes: sampleModes,
      query: "",
      modeLabel: "Search Category",
      selectModeLabel: "Select Mode",
      disabledPlaceholder: "Pick a category first",
    }),
  );

  assert.ok(
    unselectedHtml.includes('<label class="sr-only" for="module-search-mode">Search Category</label>'),
    "Mode selector must have associated label",
  );
  assert.ok(unselectedHtml.includes('id="module-search-mode"'));
  assert.ok(unselectedHtml.includes("Select Mode"), "Option with text 'Select Mode' must be rendered");
  assert.ok(unselectedHtml.includes("Customer Name"), "Option with text 'Customer Name' must be rendered");
  assert.ok(unselectedHtml.includes("Phone Number"), "Option with text 'Phone Number' must be rendered");

  assert.ok(
    unselectedHtml.includes('placeholder="Pick a category first"'),
    "Input must show disabled placeholder when no mode is selected",
  );
  assert.ok(unselectedHtml.includes("disabled"), "Input must be disabled when no mode is selected");
});

test("module search control renders active mode with enabled input and search submission", () => {
  const activeHtml = renderToStaticMarkup(
    React.createElement(ModuleSearchControl, {
      mode: "customer",
      modes: sampleModes,
      query: "Acme",
      modeLabel: "Search Category",
      submitLabel: "Search",
      resetLabel: "Reset",
      onReset: () => {},
    }),
  );

  assert.ok(activeHtml.includes('value="Acme"'), "Input must contain query text");
  assert.ok(activeHtml.includes('placeholder="Search by customer name"'));
  assert.ok(activeHtml.includes('aria-label="Search"'));
  assert.ok(activeHtml.includes('aria-label="Reset"'), "Reset button must be rendered when resetLabel and onReset are provided");
});

test("module search control reflects pending state and aria-busy", () => {
  const pendingHtml = renderToStaticMarkup(
    React.createElement(ModuleSearchControl, {
      mode: "customer",
      modes: sampleModes,
      query: "Acme",
      modeLabel: "Search Category",
      isSearchPending: true,
      pendingLabel: "Searching…",
    }),
  );

  assert.ok(pendingHtml.includes('aria-busy="true"'), "Form must expose aria-busy when searching");
  assert.ok(pendingHtml.includes('aria-label="Searching…"'), "Submit button must display pending accessible label");
});
