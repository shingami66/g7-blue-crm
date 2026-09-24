import test from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { relative, resolve } from "node:path";
import ts from "typescript";

import {
  getDataTableColumnAlignment,
  getDataTableColumnCellStyle,
  normalizeDataTableColumns,
} from "../../components/ui/data-table-contract.ts";

const root = process.cwd();

function read(path: string) {
  return readFileSync(resolve(root, path), "utf8");
}

function collectTsxFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = resolve(directory, entry.name);
    if (entry.isDirectory()) return collectTsxFiles(path);
    return entry.isFile() && entry.name.endsWith(".tsx") ? [path] : [];
  });
}

function parseTsx(path: string) {
  return ts.createSourceFile(path, read(path), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
}

function visit(source: ts.Node, callback: (node: ts.Node) => void) {
  const walk = (node: ts.Node) => {
    callback(node);
    ts.forEachChild(node, walk);
  };
  walk(source);
}

function dataTableColumnContracts(source: ts.SourceFile) {
  const initializers = new Map<string, ts.Expression>();
  visit(source, (node) => {
    if (
      ts.isVariableDeclaration(node) &&
      ts.isIdentifier(node.name) &&
      node.initializer
    ) {
      initializers.set(node.name.text, node.initializer);
    }
  });

  function collectColumnVariants(expression: ts.Expression, seen = new Set<string>()): ts.ObjectLiteralExpression[][] {
    let current = expression;
    while (
      ts.isParenthesizedExpression(current) ||
      ts.isAsExpression(current) ||
      ts.isSatisfiesExpression(current)
    ) {
      current = current.expression;
    }

    if (ts.isIdentifier(current)) {
      assert.ok(!seen.has(current.text), `cyclic DataTable columns reference: ${current.text}`);
      const initializer = initializers.get(current.text);
      assert.ok(initializer, `DataTable columns variable ${current.text} must have a static initializer`);
      const nextSeen = new Set(seen).add(current.text);
      return collectColumnVariants(initializer, nextSeen);
    }

    if (ts.isConditionalExpression(current)) {
      return [
        ...collectColumnVariants(current.whenTrue, seen),
        ...collectColumnVariants(current.whenFalse, seen),
      ];
    }

    if (ts.isObjectLiteralExpression(current)) return [[current]];
    assert.ok(ts.isArrayLiteralExpression(current), "DataTable columns must be a static array contract");

    return current.elements.reduce<ts.ObjectLiteralExpression[][]>(
      (variants, element) => {
        const entryVariants = ts.isSpreadElement(element)
          ? collectColumnVariants(element.expression, seen)
          : collectColumnVariants(element as ts.Expression, seen);
        return variants.flatMap((prefix) => entryVariants.map((suffix) => [...prefix, ...suffix]));
      },
      [[]],
    );
  }

  const contracts: ts.ObjectLiteralExpression[][][] = [];
  visit(source, (node) => {
    if (!ts.isJsxOpeningElement(node) && !ts.isJsxSelfClosingElement(node)) return;
    if (!ts.isIdentifier(node.tagName) || node.tagName.text !== "DataTable") return;

    const columnsAttribute = node.attributes.properties.find(
      (property) => ts.isJsxAttribute(property) &&
        ts.isIdentifier(property.name) && property.name.text === "columns",
    );
    assert.ok(columnsAttribute && ts.isJsxAttribute(columnsAttribute), "DataTable requires a columns contract");
    assert.ok(columnsAttribute.initializer && ts.isJsxExpression(columnsAttribute.initializer));
    assert.ok(columnsAttribute.initializer.expression, "DataTable columns expression must be static");
    contracts.push(collectColumnVariants(columnsAttribute.initializer.expression));
  });

  return contracts;
}

function functionDeclaration(source: ts.SourceFile, name: string) {
  return source.statements.find(
    (statement): statement is ts.FunctionDeclaration =>
      ts.isFunctionDeclaration(statement) && statement.name?.text === name,
  );
}

function hasBdiDirection(source: ts.SourceFile, functionName: string, direction: string) {
  const declaration = functionDeclaration(source, functionName);
  if (!declaration) return false;

  let found = false;
  visit(declaration, (node) => {
    if (!ts.isJsxOpeningElement(node) && !ts.isJsxSelfClosingElement(node)) return;
    if (!ts.isIdentifier(node.tagName) || node.tagName.text !== "bdi") return;
    found ||= node.attributes.properties.some(
      (property) => ts.isJsxAttribute(property) &&
        ts.isIdentifier(property.name) && property.name.text === "dir" &&
        property.initializer && ts.isStringLiteral(property.initializer) &&
        property.initializer.text === direction,
    );
  });
  return found;
}

function componentContainsTag(source: ts.SourceFile, functionName: string, tagName: string) {
  const declaration = functionDeclaration(source, functionName);
  if (!declaration) return false;

  let found = false;
  visit(declaration, (node) => {
    if ((!ts.isJsxOpeningElement(node) && !ts.isJsxSelfClosingElement(node)) || !ts.isIdentifier(node.tagName)) return;
    if (node.tagName.text === tagName) found = true;
  });
  return found;
}

function jsxTags(source: ts.SourceFile) {
  const tags = new Set<string>();
  visit(source, (node) => {
    if (!ts.isJsxOpeningElement(node) && !ts.isJsxSelfClosingElement(node)) return;
    if (ts.isIdentifier(node.tagName)) tags.add(node.tagName.text);
  });
  return tags;
}

function directionAttributes(source: ts.SourceFile) {
  const directions: string[] = [];
  visit(source, (node) => {
    if (!ts.isJsxAttribute(node) || !ts.isIdentifier(node.name) || node.name.text !== "dir") return;
    if (node.initializer && ts.isStringLiteral(node.initializer)) directions.push(node.initializer.text);
  });
  return directions;
}

function directionElements(source: ts.Node) {
  const declarations: Array<{ direction: string; tagName: string }> = [];
  visit(source, (node) => {
    if (!ts.isJsxAttribute(node) || !ts.isIdentifier(node.name) || node.name.text !== "dir") return;
    if (!node.initializer || !ts.isStringLiteral(node.initializer)) return;

    const attributes = node.parent;
    const element = attributes.parent;
    if (!ts.isJsxAttributes(attributes) || (!ts.isJsxOpeningElement(element) && !ts.isJsxSelfClosingElement(element))) return;
    declarations.push({
      direction: node.initializer.text,
      tagName: ts.isIdentifier(element.tagName) ? element.tagName.text : "",
    });
  });
  return declarations;
}

function dataTableCallSitePaths() {
  return collectTsxFiles(resolve(root, "src"))
    .filter((path) => {
      const source = ts.createSourceFile(
        path,
        readFileSync(path, "utf8"),
        ts.ScriptTarget.Latest,
        true,
        ts.ScriptKind.TSX,
      );
      let found = false;
      visit(source, (node) => {
        if (!ts.isJsxOpeningElement(node) && !ts.isJsxSelfClosingElement(node)) return;
        if (ts.isIdentifier(node.tagName) && node.tagName.text === "DataTable") found = true;
      });
      return found;
    })
    .map((path) => relative(root, path).replace(/\\/g, "/"))
    .sort();
}

test("legacy table labels never infer action columns or direction from translated text", () => {
  const [english, arabic] = normalizeDataTableColumns(["Actions", "الإجراءات"]);
  assert.deepEqual(english, { key: "legacy-0", header: "Actions", align: "start", kind: "text" });
  assert.deepEqual(arabic, { key: "legacy-1", header: "الإجراءات", align: "start", kind: "text" });

  const englishAction = { key: "row-actions", header: "Actions", align: "end" as const, kind: "actions" as const };
  const arabicAction = { key: "row-actions", header: "الإجراءات", align: "end" as const, kind: "actions" as const };
  assert.deepEqual(normalizeDataTableColumns([englishAction]), [englishAction]);
  assert.deepEqual(normalizeDataTableColumns([arabicAction]), [arabicAction]);
  assert.equal(getDataTableColumnAlignment(englishAction), getDataTableColumnAlignment(arabicAction));
  assert.equal(normalizeDataTableColumns(["Date"], [0])[0]?.align, "center");
});

test("wide DataTable cells preserve explicit minimum widths and no-wrap financial values", () => {
  const money = { key: "amount", header: "Amount", align: "end" as const, kind: "money" as const, minWidth: 168, noWrap: true };
  assert.deepEqual(getDataTableColumnCellStyle(money, "header"), { textAlign: "end", minWidth: 168 });
  assert.deepEqual(getDataTableColumnCellStyle(money, "body"), { textAlign: "end", minWidth: 168, whiteSpace: "nowrap" });
  assert.deepEqual(getDataTableColumnCellStyle({ key: "name", header: "Name", align: "start" }, "body"), { textAlign: "start" });
});

test("every application DataTable consumer is explicitly governed", () => {
  assert.deepEqual(dataTableCallSitePaths(), [
    "src/app/(dashboard)/customers/[id]/Customer360Workspace.tsx",
    "src/app/(dashboard)/payments/PaymentsClient.tsx",
    "src/app/(dashboard)/reports/accounts-payable/page.tsx",
    "src/app/(dashboard)/reports/accounts-receivable/page.tsx",
    "src/app/(dashboard)/reports/event-economics/page.tsx",
    "src/app/(dashboard)/services/[id]/SupplierAllocationsPanel.tsx",
    "src/app/(dashboard)/services/[id]/SupplierBookingsPanel.tsx",
  ]);
});

test("DataTable shares explicit cell styles between headers and body cells", () => {
  const source = read("src/components/ui/DataTable.tsx");
  const styleCalls: ts.CallExpression[] = [];
  visit(parseTsx("src/components/ui/DataTable.tsx"), (node) => {
    if (ts.isCallExpression(node) && ts.isIdentifier(node.expression) && node.expression.text === "getDataTableColumnCellStyle") styleCalls.push(node);
  });

  assert.equal(styleCalls.length, 2);
  assert.match(read("src/components/ui/data-table-contract.ts"), /textAlign: getDataTableColumnAlignment\(column\)/);
  assert.match(source, /column\.kind === "actions"/);
  assert.doesNotMatch(source, /\.includes\(\s*["'`][^"'`]*actions?/i);
  assert.match(source, /data-column-kind=\{column\.kind\}/);
  assert.match(source, /overflow-x-auto[\s\S]*?role=\{minWidth !== undefined \? "region" : undefined\}[\s\S]*?aria-label=\{minWidth !== undefined \? ariaLabel : undefined\}[\s\S]*?<table[^>]*style=\{minWidth !== undefined \? \{ minWidth \} : undefined\}/);
});

test("governed tables declare stable keys, semantic kinds, and explicit logical alignment", () => {
  const cases = [
    ["src/app/(dashboard)/payments/PaymentsClient.tsx", 9],
    ["src/app/(dashboard)/customers/[id]/Customer360Workspace.tsx", 15],
    ["src/app/(dashboard)/services/[id]/SupplierBookingsPanel.tsx", 7],
    ["src/app/(dashboard)/services/[id]/SupplierAllocationsPanel.tsx", 7],
    ["src/app/(dashboard)/reports/accounts-receivable/page.tsx", 9],
    ["src/app/(dashboard)/reports/accounts-payable/page.tsx", 8],
  ] as const;

  for (const [path, minimumColumns] of cases) {
    const contracts = dataTableColumnContracts(parseTsx(path));
    assert.ok(contracts.length > 0, `${path} must render a DataTable`);
    const columns = contracts.flat(2);
    assert.ok(columns.length >= minimumColumns, `${path} must keep its explicit DataTable column contract`);
    if (
      path === "src/app/(dashboard)/reports/accounts-receivable/page.tsx" ||
      path === "src/app/(dashboard)/reports/accounts-payable/page.tsx"
    ) {
      const primaryColumns = contracts[0]?.[0]?.map((column) => {
        const key = column.properties.find((property) =>
          ts.isPropertyAssignment(property) &&
          ts.isIdentifier(property.name) &&
          property.name.text === "key",
        );
        assert.ok(key && ts.isPropertyAssignment(key) && ts.isStringLiteral(key.initializer));
        return key.initializer.text;
      });
      const expectedColumns = path === "src/app/(dashboard)/reports/accounts-receivable/page.tsx"
        ? ["invoice", "customer", "service", "due", "net", "settled", "outstanding"]
        : ["bill", "supplier", "service", "dueDate", "status", "payable", "paid", "outstanding"];
      assert.deepEqual(primaryColumns, expectedColumns);
    }
    for (const variants of contracts) {
      assert.ok(variants.length > 0, `${path} must have at least one columns variant`);
      for (const contract of variants) {
        const keys = new Set<string>();
        for (const column of contract) {
          const properties = new Set(column.properties.flatMap((property) => {
            if (!ts.isPropertyAssignment(property)) return [];
            if (ts.isIdentifier(property.name) || ts.isStringLiteral(property.name)) return [property.name.text];
            return [];
          }));
          for (const field of ["key", "header", "align", "kind"]) assert.ok(properties.has(field), `${path} column is missing ${field}`);

          const key = column.properties.find((property) =>
            ts.isPropertyAssignment(property) &&
            ts.isIdentifier(property.name) &&
            property.name.text === "key",
          );
          assert.ok(key && ts.isPropertyAssignment(key) && ts.isStringLiteral(key.initializer));
          assert.ok(!keys.has(key.initializer.text), `${path} repeats DataTable key ${key.initializer.text}`);
          keys.add(key.initializer.text);

          const kind = column.properties.find((property) =>
            ts.isPropertyAssignment(property) &&
            ts.isIdentifier(property.name) &&
            property.name.text === "kind",
          );
          const align = column.properties.find((property) =>
            ts.isPropertyAssignment(property) &&
            ts.isIdentifier(property.name) &&
            property.name.text === "align",
          );
          assert.ok(kind && ts.isPropertyAssignment(kind) && ts.isStringLiteral(kind.initializer));
          assert.ok(align && ts.isPropertyAssignment(align) && ts.isStringLiteral(align.initializer));
          assert.ok(["start", "end", "center"].includes(align.initializer.text));
          if (kind.initializer.text === "money" || kind.initializer.text === "number") {
            assert.equal(align.initializer.text, "end", `${path} ${kind.initializer.text} columns should compare at logical end`);
          }
          if (kind.initializer.text === "status") {
            assert.equal(align.initializer.text, "center", `${path} status columns should be centered`);
          }
          if (kind.initializer.text === "actions") {
            assert.equal(align.initializer.text, "end", `${path} action columns should align at logical end`);
          }
        }
      }
    }
  }
});

test("Event Economics views resolve stable keys through semantic RTL-aware column definitions", () => {
  const page = read("src/app/(dashboard)/reports/event-economics/page.tsx");
  assert.match(page, /EVENT_ECONOMICS_VIEW_COLUMNS\[view\]\.map\(\(key\) => eventColumnDefinition\(key, dictionary\)\)/);
  assert.match(page, /return \{ key, header: header\[key\], kind, align, minWidth, noWrap:/);
  assert.match(page, /kind === "money" \? "end" : kind === "status" \? "center" : "start"/);
});

test("shared semantic values use leaf-level bidi isolation and KPI values inherit locale direction", () => {
  const values = parseTsx("src/components/i18n/UiValueText.tsx");
  assert.ok(hasBdiDirection(values, "UiBidiText", "auto"));
  assert.ok(hasBdiDirection(values, "UiLtrText", "ltr"));
  assert.ok(componentContainsTag(values, "UiMoneyText", "UiLtrText"));
  assert.ok(componentContainsTag(values, "UiNumberText", "UiLtrText"));
  assert.deepEqual(directionAttributes(parseTsx("src/components/ui/KpiCard.tsx")), []);

  const tags = jsxTags(values);
  assert.ok(tags.has("bdi"));
  assert.ok(tags.has("UiLtrText"));
  assert.match(read("src/components/i18n/UiValueText.tsx"), /formatSarAmount\(locale, value, \{ \.\.\.options, isolate: false \}\)/);
  assert.match(read("src/components/i18n/UiValueText.tsx"), /formatUiNumber\(locale, value, \{ \.\.\.options, isolate: false \}\)/);
});

test("governed RTL-safe surfaces avoid physical alignment utilities and block-level LTR overrides", () => {
  const paths = [
    "src/components/ui/DataTable.tsx",
    "src/components/ui/KpiCard.tsx",
    "src/components/i18n/UiValueText.tsx",
    "src/app/(dashboard)/dashboard/page.tsx",
    "src/app/(dashboard)/payments/PaymentsClient.tsx",
    "src/app/(dashboard)/customers/[id]/Customer360Workspace.tsx",
    "src/app/(dashboard)/services/[id]/SupplierAllocationsPanel.tsx",
    "src/app/(dashboard)/services/[id]/SupplierBookingsPanel.tsx",
    "src/app/(dashboard)/reports/accounts-receivable/page.tsx",
    "src/app/(dashboard)/reports/accounts-payable/page.tsx",
    "src/app/(dashboard)/reports/event-economics/page.tsx",
    "src/app/(dashboard)/services/[id]/SupplierAllocationStatusActions.tsx",
    "src/app/(dashboard)/services/[id]/ServiceStatusTimeline.tsx",
  ];
  const physicalDirectionUtility = /\b(?:text-(?:left|right)|(?:ml|mr|pl|pr|left|right)-[^\s"'`]+)/;

  for (const path of paths) {
    assert.doesNotMatch(read(path), physicalDirectionUtility, `${path} must use logical alignment`);
    for (const declaration of directionElements(parseTsx(path))) {
      if (declaration.direction === "ltr") {
        assert.equal(declaration.tagName, "bdi", `${path} must isolate LTR at an inline bidi leaf`);
      }
    }
  }
});

test("root direction remains authoritative and Arabic date phrases are not wrapped as LTR blocks", () => {
  assert.match(read("src/app/layout.tsx"), /<html lang=\{locale\} dir=\{direction\}/);

  const dates = parseTsx("src/components/i18n/UiDateText.tsx");
  const renderTokens = dates.statements.find((statement) =>
    ts.isFunctionDeclaration(statement) && statement.name?.text === "renderTokens",
  );
  assert.ok(renderTokens && ts.isFunctionDeclaration(renderTokens));

  const ltrElements: Array<{ tagName: string; isPlainDateBranch: boolean }> = [];
  visit(renderTokens, (node) => {
    if (!ts.isJsxAttribute(node) || !ts.isIdentifier(node.name) || node.name.text !== "dir") return;
    if (!node.initializer || !ts.isStringLiteral(node.initializer) || node.initializer.text !== "ltr") return;

    const attributes = node.parent;
    const element = attributes.parent;
    if (!ts.isJsxAttributes(attributes) || (!ts.isJsxOpeningElement(element) && !ts.isJsxSelfClosingElement(element))) return;

    let isPlainDateBranch = false;
    for (let parent: ts.Node | undefined = element; parent; parent = parent.parent) {
      if (!ts.isIfStatement(parent)) continue;
      if (parent.expression.getText(dates).replace(/\s/g, "") === 'tokens.kind==="plain"') {
        isPlainDateBranch = true;
        break;
      }
    }

    ltrElements.push({
      tagName: ts.isIdentifier(element.tagName) ? element.tagName.text : "",
      isPlainDateBranch,
    });
  });

  assert.ok(ltrElements.some(({ tagName }) => tagName === "bdi"));
  assert.ok(ltrElements.some(({ tagName }) => tagName === "span"));
  for (const element of ltrElements) {
    assert.ok(
      element.tagName === "bdi" || (element.tagName === "span" && element.isPlainDateBranch),
      "only isolated date segments or the plain English date may be LTR",
    );
  }
  assert.ok(directionElements(renderTokens).some(({ tagName, direction }) => tagName === "span" && direction === "rtl"));
  assert.match(read("src/components/ui/DataTable.tsx"), /overflow-x-auto[\s\S]*?<table\b/);
});

test("representative consumers preserve mobile alternatives and structured date rendering", () => {
  const payments = parseTsx("src/app/(dashboard)/payments/PaymentsClient.tsx");
  const customer360 = parseTsx("src/app/(dashboard)/customers/[id]/Customer360Workspace.tsx");
  const bookings = read("src/app/(dashboard)/services/[id]/SupplierBookingsPanel.tsx");
  const allocations = read("src/app/(dashboard)/services/[id]/SupplierAllocationsPanel.tsx");

  assert.ok(jsxTags(payments).has("UiMoneyText"));
  assert.ok(jsxTags(payments).has("UiDateText"));
  assert.match(read("src/app/(dashboard)/payments/PaymentsClient.tsx"), /data-testid="mobile-payment-cards"/);
  assert.match(bookings, /lg:hidden/);
  assert.match(allocations, /lg:hidden/);
  assert.match(read("src/app/(dashboard)/customers/[id]/Customer360Workspace.tsx"), /<UiDateText locale=\{locale\} value=\{quotation\.date\} \/>/);
  assert.ok(jsxTags(customer360).has("UiBidiText"));
  assert.ok(jsxTags(customer360).has("UiLtrText"));
});

test("AGENTS routes relevant presentation work to the narrow RTL/Bidi guard", () => {
  const routing = read("AGENTS.md");
  const skill = read(".agents/skills/g7-rtl-bidi-guard/SKILL.md");
  for (const trigger of [
    "tables",
    "metrics",
    "reports",
    "Arabic UI",
    "mixed-language text",
    "money/numbers",
    "business identifiers",
    "dates",
    "pagination",
    "directional navigation/icons",
    "responsive tabular/list surfaces",
  ]) {
    assert.ok(routing.includes(trigger), `AGENTS.md must route ${trigger}`);
    assert.ok(skill.includes(trigger), `the RTL/Bidi skill description must cover ${trigger}`);
  }
});
