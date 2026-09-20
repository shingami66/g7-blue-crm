import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { test } from "node:test";
import assert from "node:assert/strict";
import { createElement } from "react";
import { normalizeAsChild } from "./normalizeAsChild.ts";

const buttonSource = readFileSync(
  fileURLToPath(new URL("./Button.tsx", import.meta.url)),
  "utf8",
);

test("Button asChild normalizes one server-provided child safely", () => {
  const child = createElement("a", { href: "/quotations" }, "Quotations");
  const normalized = normalizeAsChild([child]);

  assert.equal(normalized?.type, "a");
  assert.equal(
    (normalized?.props as { children?: string } | undefined)?.children,
    "Quotations",
  );
  assert.equal(normalizeAsChild([child, createElement("span")]), null);
  assert.equal(normalizeAsChild(["text"]), null);
  assert.match(buttonSource, /normalizeAsChild\(children\)/);
  assert.match(
    buttonSource,
    /Button with asChild requires a single valid React element\./,
  );
  assert.doesNotMatch(buttonSource, /Children\.only\(children\)/);
});
