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

const { default: ModuleSearchInput } = await import("./ModuleSearchInput.tsx");

test("module search input renders accessible search control and conditional clear action", () => {
  // Empty value state: search input rendered, clear button absent
  const emptyHtml = renderToStaticMarkup(
    React.createElement(ModuleSearchInput, {
      value: "",
      onChange: () => {},
      placeholder: "Search customers...",
    }),
  );

  assert.ok(emptyHtml.includes('type="search"'), "Input must have type='search'");
  assert.ok(emptyHtml.includes('placeholder="Search customers..."'));
  assert.ok(emptyHtml.includes('aria-label="Search customers..."'));
  assert.ok(!emptyHtml.includes("<button"), "Clear button must not be rendered when value is empty");

  // Non-empty value state: clear button rendered with accessible label
  const filledHtml = renderToStaticMarkup(
    React.createElement(ModuleSearchInput, {
      value: "Acme",
      onChange: () => {},
      placeholder: "Search customers...",
      clearLabel: "Clear",
    }),
  );

  assert.ok(filledHtml.includes('value="Acme"'));
  assert.ok(filledHtml.includes('aria-label="Clear: Search customers..."'), "Clear button must have composite accessible label");
});

test("module search input supports custom ariaLabel and clearLabel", () => {
  const customHtml = renderToStaticMarkup(
    React.createElement(ModuleSearchInput, {
      value: "123",
      onChange: () => {},
      placeholder: "Filter...",
      ariaLabel: "Filter by customer name",
      clearLabel: "Reset field",
    }),
  );

  assert.ok(customHtml.includes('aria-label="Filter by customer name"'), "Input must prioritize custom ariaLabel");
  assert.ok(
    customHtml.includes('aria-label="Reset field: Filter by customer name"'),
    "Clear button must combine custom clearLabel and custom ariaLabel",
  );
});

test("module search input renders disabled state on input and clear button", () => {
  const disabledHtml = renderToStaticMarkup(
    React.createElement(ModuleSearchInput, {
      value: "query",
      onChange: () => {},
      placeholder: "Search...",
      disabled: true,
    }),
  );

  assert.ok(disabledHtml.includes("<input"), "Input element rendered");
  assert.ok(disabledHtml.includes("disabled"), "Input must have disabled attribute");
  assert.ok(disabledHtml.includes("<button"), "Clear button rendered");
  assert.ok(disabledHtml.includes('disabled=""') || disabledHtml.includes("disabled"), "Clear button must be disabled");
});
