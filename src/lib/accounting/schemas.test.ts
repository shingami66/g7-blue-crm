import assert from "node:assert/strict";
import { createRequire } from "node:module";
import test from "node:test";

const require = createRequire(import.meta.url);
const sourceRootUrl = new URL("../../", import.meta.url).href;
const { registerHooks } = require("node:module") as {
  registerHooks: (hooks: {
    resolve: (
      specifier: string,
      context: { parentURL?: string },
      nextResolve: (specifier: string, context: { parentURL?: string }) => { url: string; shortCircuit?: true },
    ) => { url: string; shortCircuit?: true };
  }) => void;
};

registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier.startsWith(".") && !specifier.endsWith(".ts") && context.parentURL?.startsWith(sourceRootUrl)) {
      return nextResolve(`${specifier}.ts`, context);
    }
    return nextResolve(specifier, context);
  },
});

const {
  accountingCapabilitySchema,
  accountingProfileInputSchema,
  setAccountingCapabilityInputSchema,
} = await import("./schemas.ts");

const inactiveProfile = {
  framework_key: "SA_IFRS_FOR_SMES",
  framework_edition: 2025,
  policy_version: "W10 provisional policy",
  endorsement_context: "Controller approved provisional baseline",
  professional_validation_state: "DEFERRED",
  professional_validation_evidence_ref: null,
  functional_currency: "SAR",
  fiscal_start_month: 1,
  fiscal_start_day: 1,
  fiscal_end_month: 12,
  fiscal_end_day: 31,
  fiscal_timezone: "Asia/Riyadh",
  accounting_start_date: null,
  cutover_boundary_date: null,
  legal_fiscal_evidence_pending: true,
  legal_fiscal_evidence_ref: null,
  vat_mode: "not_registered",
  zatca_state: "INACTIVE",
  fatoora_state: "INACTIVE",
  activation_state: "INACTIVE",
} as const;

test("capability schema recognizes only the fixed W10 vocabulary", () => {
  assert.equal(accountingCapabilitySchema.parse("accounting:view"), "accounting:view");
  assert.equal(accountingCapabilitySchema.parse("accounting:manage_chart"), "accounting:manage_chart");
  assert.equal(accountingCapabilitySchema.safeParse("accounting:future_key").success, false);
});

test("profile schema fixes the provisional accounting basis and defers professional validation", () => {
  assert.equal(accountingProfileInputSchema.safeParse(inactiveProfile).success, true);
  assert.equal(
    accountingProfileInputSchema.safeParse({ ...inactiveProfile, functional_currency: "USD" }).success,
    false,
  );
  assert.equal(
    accountingProfileInputSchema.safeParse({ ...inactiveProfile, framework_edition: 2024 }).success,
    false,
  );
  assert.equal(
    accountingProfileInputSchema.safeParse({ ...inactiveProfile, vat_mode: "registered" }).success,
    false,
  );
  assert.equal(
    accountingProfileInputSchema.safeParse({ ...inactiveProfile, activation_state: "PRODUCTION_ACTIVE" }).success,
    false,
  );
  assert.equal(
    accountingProfileInputSchema.safeParse({ ...inactiveProfile, professional_validation_state: "VALIDATED" }).success,
    false,
  );
});

test("DEV_PROVISIONAL requires ordered start and cutover dates", () => {
  assert.equal(
    accountingProfileInputSchema.safeParse({
      ...inactiveProfile,
      accounting_start_date: "2026-01-01",
      cutover_boundary_date: "2026-01-01",
      activation_state: "DEV_PROVISIONAL",
    }).success,
    true,
  );
  assert.equal(
    accountingProfileInputSchema.safeParse({
      ...inactiveProfile,
      accounting_start_date: null,
      cutover_boundary_date: null,
      activation_state: "DEV_PROVISIONAL",
    }).success,
    false,
  );
  assert.equal(
    accountingProfileInputSchema.safeParse({
      ...inactiveProfile,
      accounting_start_date: "2026-02-01",
      cutover_boundary_date: "2026-01-31",
      activation_state: "DEV_PROVISIONAL",
    }).success,
    false,
  );
});

test("authority request schema requires revisions, request identity, and no expiry for deny or revoke", () => {
  const base = {
    target_user_id: "9f09e715-9698-4804-a72b-331ebc776b8d",
    capability: "accounting:view",
    effect: "ALLOW",
    expires_at: null,
    expected_revision: 0,
    reason: "Approved by the Controller",
    evidence_ref: null,
    request_id: "6f5b2999-ea2b-4c2e-8928-93220196a910",
  } as const;
  assert.equal(setAccountingCapabilityInputSchema.safeParse(base).success, true);
  assert.equal(
    setAccountingCapabilityInputSchema.safeParse({ ...base, effect: "DENY", expires_at: "2027-01-01T00:00:00Z" }).success,
    false,
  );
  assert.equal(
    setAccountingCapabilityInputSchema.safeParse({ ...base, expected_revision: -1 }).success,
    false,
  );
  assert.equal(
    setAccountingCapabilityInputSchema.safeParse({ ...base, unexpected_actor_id: "browser-controlled" }).success,
    false,
  );
});
