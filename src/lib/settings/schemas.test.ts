import test from "node:test";
import assert from "node:assert/strict";

import {
  normalizeCompanySettingsInput,
  updateCompanySettingsSchema,
} from "./schemas.ts";

const baseInput = {
  legal_name_en: "  G7 BLUE Logistics & Events  ",
  legal_name_ar: "  G7 BLUE  ",
  cr_number: "1010123456",
  tin_number: "",
  vat_mode: "not_registered",
  vat_effective_date: "",
  vat_number: "",
  official_email: "contact@g7blue.com.sa",
  official_phone: "+966 11 234 5678",
  national_address: "Riyadh, Saudi Arabia",
  bank_name: "Al Rajhi Bank",
  bank_iban: "SA1280000000608012345678",
  bank_account_holder: "G7 BLUE FOR LOGISTICS",
  currency: "SAR",
  default_vat_percent: "0",
  default_terms: "Payment is due within 30 days.",
};

test("normalizes not_registered settings with no VAT details and 0 percent", () => {
  const result = normalizeCompanySettingsInput(baseInput);

  assert.equal(result.legal_name_en, "G7 BLUE Logistics & Events");
  assert.equal(result.vat_mode, "not_registered");
  assert.equal(result.default_vat_percent, 0);
  assert.equal(result.vat_number, null);
  assert.equal(result.vat_effective_date, null);
});

test("rejects VAT details when company is not registered", () => {
  const result = updateCompanySettingsSchema.safeParse({
    ...baseInput,
    vat_number: "300123456700003",
  });

  assert.equal(result.success, false);
});

test("requires VAT number and positive VAT percent for registered mode", () => {
  const result = updateCompanySettingsSchema.safeParse({
    ...baseInput,
    vat_mode: "vat_registered_phase_1",
    default_vat_percent: "0",
  });

  assert.equal(result.success, false);
});

test("rejects phase2_integrated in CS-A form validation", () => {
  const result = updateCompanySettingsSchema.safeParse({
    ...baseInput,
    vat_mode: "phase2_integrated",
  });

  assert.equal(result.success, false);
});
