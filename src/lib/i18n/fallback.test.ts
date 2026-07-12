import assert from "node:assert/strict";
import test from "node:test";
import { resolveDictionaryValue } from "./fallback.ts";
import {
  reportMissingDictionaryEntry,
  type DictionaryDefectReport,
} from "./reporting.ts";

const lookup = (overrides: Partial<Parameters<typeof resolveDictionaryValue>[0]> = {}) =>
  resolveDictionaryValue({
    activeValue: "حفظ",
    category: "action",
    englishValue: "Save",
    key: "actions.save",
    locale: "ar",
    namespace: "common",
    reporter: () => {},
    surface: "selector",
    ...overrides,
  });

const collectReports = () => {
  const reports: DictionaryDefectReport[] = [];
  return { reports, reporter: (report: DictionaryDefectReport) => reports.push(report) };
};

test("usable Arabic copy wins over the English source", () => {
  assert.equal(lookup(), "حفظ");
});

test("missing Arabic copy falls back to the English source", () => {
  assert.equal(lookup({ activeValue: undefined }), "Save");
});

test("usable active-locale copy produces no report", () => {
  const { reports, reporter } = collectReports();

  assert.equal(lookup({ reporter }), "حفظ");
  assert.deepEqual(reports, []);
});

test("English fallback produces one bounded report", () => {
  const { reports, reporter } = collectReports();

  assert.equal(lookup({ activeValue: undefined, reporter }), "Save");
  assert.deepEqual(reports, [
    {
      namespace: "common",
      key: "actions.save",
      surface: "selector",
      locale: "ar",
      fallbackTier: "english",
    },
  ]);
  assert.deepEqual(Object.keys(reports[0] ?? {}).sort(), [
    "fallbackTier",
    "key",
    "locale",
    "namespace",
    "surface",
  ]);
});

test("default reporter strips runtime extra fields before reaching the sink", () => {
  const originalWarn = console.warn;
  const sinkCalls: unknown[][] = [];
  const runtimeReport = {
    namespace: "common",
    key: "actions.save",
    surface: "selector",
    locale: "ar",
    fallbackTier: "english",
    resolvedCopy: "Customer Name customer@example.com SAR 1000",
    rawError: new Error("database response"),
  } as unknown as DictionaryDefectReport;

  console.warn = (...argumentsList: unknown[]) => sinkCalls.push(argumentsList);
  try {
    reportMissingDictionaryEntry(runtimeReport);
  } finally {
    console.warn = originalWarn;
  }

  const payload = sinkCalls[0]?.[1] as Record<string, unknown>;
  assert.deepEqual(Object.keys(payload).sort(), [
    "fallbackTier",
    "key",
    "locale",
    "namespace",
    "surface",
  ]);
  assert.equal("resolvedCopy" in payload, false);
  assert.equal("rawError" in payload, false);
  assert.deepEqual(payload, {
    namespace: "common",
    key: "actions.save",
    surface: "selector",
    locale: "ar",
    fallbackTier: "english",
  });
});

test("missing Arabic and English copy uses the localized generic category fallback", () => {
  const genericFallbacks = {
    action: "إجراء غير متاح",
    content: "محتوى غير متاح",
    field: "حقل غير متاح",
    label: "تسمية غير متاحة",
    message: "حدث خطأ ما",
  } as const;

  for (const [category, expected] of Object.entries(genericFallbacks)) {
    assert.equal(
      lookup({ activeValue: undefined, englishValue: undefined, category: category as keyof typeof genericFallbacks }),
      expected,
    );
  }
});

test("whitespace-only values are unusable", () => {
  assert.equal(lookup({ activeValue: "   ", englishValue: "  Save  " }), "Save");
});

test("raw translation keys are rejected from both dictionary tiers", () => {
  assert.equal(
    lookup({ activeValue: "actions.save", englishValue: "actions.save" }),
    "إجراء غير متاح",
  );
});

test("generic fallback produces one bounded report without resolved or sensitive values", () => {
  const { reports, reporter } = collectReports();
  const sensitiveCopy = "Customer Name customer@example.com SAR 1000 token document";

  assert.equal(
    lookup({
      activeValue: undefined,
      englishValue: sensitiveCopy,
      reporter,
    }),
    sensitiveCopy,
  );

  reports.length = 0;
  assert.equal(
    lookup({
      activeValue: undefined,
      englishValue: undefined,
      reporter,
    }),
    "إجراء غير متاح",
  );
  assert.deepEqual(reports, [
    {
      namespace: "common",
      key: "actions.save",
      surface: "selector",
      locale: "ar",
      fallbackTier: "generic",
    },
  ]);
  assert.equal(JSON.stringify(reports).includes(sensitiveCopy), false);
});

test("a throwing reporter cannot break fallback resolution", () => {
  const throwingReporter = () => {
    throw new Error("reporting failure");
  };

  assert.equal(lookup({ activeValue: undefined, reporter: throwingReporter }), "Save");
  assert.equal(
    lookup({ activeValue: undefined, englishValue: undefined, reporter: throwingReporter }),
    "إجراء غير متاح",
  );
});

test("raw active copy falls back to a usable English source", () => {
  assert.equal(
    lookup({ activeValue: "actions.save", englishValue: "Save" }),
    "Save",
  );
});

test("fallback applies only resolved wording to a control fixture", () => {
  const control = {
    disabled: false,
    href: "/customers",
    label: "customers",
    permission: "customers:read",
    visible: true,
  };
  const resolvedLabel = lookup({
    activeValue: undefined,
    category: "label",
    englishValue: "Customers",
  });
  const renderedControl = { ...control, label: resolvedLabel };

  assert.deepEqual(renderedControl, {
    disabled: false,
    href: "/customers",
    label: "Customers",
    permission: "customers:read",
    visible: true,
  });
});
