import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import {
  getSettingsDictionary,
  getSettingsVatModeLabel,
  mapSettingsActionMessage,
} from "./dictionaries/settings.ts";

const REPO_ROOT = join(import.meta.dirname, "../../..");
const PAGE = join(REPO_ROOT, "src/app/(dashboard)/settings/page.tsx");
const FORM = join(REPO_ROOT, "src/app/(dashboard)/settings/SettingsForm.tsx");
const ACTIONS = join(REPO_ROOT, "src/lib/settings/actions.ts");
const SCHEMAS = join(REPO_ROOT, "src/lib/settings/schemas.ts");
const PERMISSIONS = join(REPO_ROOT, "src/lib/auth/role-permissions.ts");

function listNestedKeys(value: unknown, prefix = ""): string[] {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return prefix ? [prefix] : [];
  }
  return Object.entries(value as Record<string, unknown>).flatMap(([key, nested]) => {
    const path = prefix ? `${prefix}.${key}` : key;
    if (nested && typeof nested === "object" && !Array.isArray(nested)) {
      return listNestedKeys(nested, path);
    }
    return [path];
  });
}

function read(path: string) {
  return readFileSync(path, "utf8");
}

test("1. Settings dictionary EN/AR shapes aligned", () => {
  const en = getSettingsDictionary("en");
  const ar = getSettingsDictionary("ar");
  assert.deepEqual(listNestedKeys(en).sort(), listNestedKeys(ar).sort());
});

test("2. Page headings and actions localize", () => {
  const en = getSettingsDictionary("en");
  const ar = getSettingsDictionary("ar");
  assert.equal(en.page.title, "Company Settings");
  assert.equal(
    en.page.subtitle,
    "Manage the company profile, VAT defaults, and banking details for future documents.",
  );
  assert.equal(ar.page.title, "إعدادات الشركة");
  assert.equal(
    ar.page.subtitle,
    "إدارة ملف الشركة وإعدادات ضريبة القيمة المضافة الافتراضية والبيانات البنكية للمستندات المستقبلية.",
  );
  assert.doesNotMatch(en.page.subtitle, /seller profile/i);
  assert.equal(ar.actions.edit, "تعديل الإعدادات");
  assert.equal(ar.actions.save, "حفظ التغييرات");
  assert.equal(ar.actions.saving, "جارٍ الحفظ...");
  assert.equal(ar.states.readOnly, "للقراءة فقط");
  assert.match(read(FORM), /dictionary\.page\.title/);
  assert.match(read(PAGE), /getCurrentSessionEffectiveLocale/);
});

test("3. Sections and labels localize", () => {
  const en = getSettingsDictionary("en");
  const ar = getSettingsDictionary("ar");
  assert.equal(ar.sections.companyProfile, "ملف الشركة");
  assert.equal(ar.sections.legalVat, "البيانات النظامية وضريبة القيمة المضافة");
  assert.equal(ar.sections.bankDetails, "البيانات البنكية");
  assert.equal(ar.sections.financeDefaults, "الإعدادات المالية الافتراضية");
  assert.equal(ar.labels.iban, "رقم الآيبان");
  assert.equal(ar.labels.defaultVatPercent.includes("%"), true);
  assert.equal(en.labels.tinNumber, "Tax Identification Number (TIN)");
  assert.equal(ar.labels.tinNumber, "الرقم المميز (TIN)");
  assert.doesNotMatch(en.labels.tinNumber, /الرقم المميز/);
});

test("4-6. VAT modes: internal codes stable; Phase 2 not selectable; not_registered forces 0", () => {
  assert.equal(getSettingsVatModeLabel("ar", "not_registered"), "غير مسجل");
  assert.equal(
    getSettingsVatModeLabel("ar", "vat_registered_phase_1"),
    "مسجل في ضريبة القيمة المضافة - المرحلة 1",
  );
  const form = read(FORM);
  assert.match(form, /value="not_registered"/);
  assert.match(form, /value="vat_registered_phase_1"/);
  assert.doesNotMatch(form, /value="phase2_integrated"/);
  assert.match(form, /phase2_integrated.*vat_registered_phase_1|vat_registered_phase_1/);
  assert.match(form, /not_registered.*\? "0"/);
  assert.match(form, /setDefaultVatPercent\(nextVatMode === "not_registered" \? "0" : "15"\)/);
  assert.match(read(SCHEMAS), /not_registered|vat_registered_phase_1/);
  assert.doesNotMatch(read(SCHEMAS), /phase2_integrated/);
});

test("7-9. Permissions, bank masking, singleton action payload", () => {
  const form = read(FORM);
  assert.match(form, /canEdit/);
  assert.match(form, /canViewBankDetails/);
  assert.match(form, /bankRestricted|help\.bankRestricted/);
  assert.match(form, /currency.*"SAR"|value="SAR"/);
  assert.match(read(ACTIONS), /setting_key:\s*"default"/);
  assert.match(read(ACTIONS), /requirePermission\("settings:write"\)/);
  assert.match(read(PERMISSIONS), /settings:read|settings:write/);
});

test("10-12. Action message mapping; no schema/action behavior rewrite; no ZATCA claims", () => {
  assert.equal(
    mapSettingsActionMessage("ar", "Company settings saved."),
    "تم حفظ إعدادات الشركة.",
  );
  assert.equal(
    mapSettingsActionMessage("ar", "Unauthorized"),
    "يجب تسجيل الدخول أولاً.",
  );
  assert.match(read(FORM), /mapSettingsActionMessage/);
  assert.match(read(ACTIONS), /Company settings saved\./);
  assert.match(read(ACTIONS), /Failed to update company settings/);
  for (const file of [PAGE, FORM]) {
    assert.doesNotMatch(read(file), /ZATCA|FATOORA|QR|XML|clearance|فاتورة ضريبية/i);
  }
  assert.doesNotMatch(read(FORM), /phase2_integrated.*option|Phase 2 integration/i);
});

test("13-15. Historical help text; field names preserved; denied/unavailable distinct", () => {
  const en = getSettingsDictionary("en");
  const ar = getSettingsDictionary("ar");
  assert.notEqual(en.states.accessDeniedMessage, en.states.unavailableMessage);
  assert.equal(
    en.help.historicalSnapshot,
    "Changes apply to new records only and do not update previously created quotations, invoices, or generated documents.",
  );
  assert.equal(
    ar.help.historicalSnapshot,
    "تُطبَّق التغييرات على السجلات الجديدة فقط، ولا تُحدِّث عروض الأسعار أو الفواتير أو المستندات المُنشأة سابقاً.",
  );
  // No customer-facing CS-A token in Settings dictionary UI copy.
  assert.doesNotMatch(en.help.historicalSnapshot, /CS-A/);
  assert.doesNotMatch(ar.help.historicalSnapshot, /CS-A/);
  assert.doesNotMatch(JSON.stringify(en.page) + JSON.stringify(en.labels) + JSON.stringify(en.help), /CS-A/);
  assert.doesNotMatch(JSON.stringify(ar.page) + JSON.stringify(ar.labels) + JSON.stringify(ar.help), /CS-A/);
  assert.match(read(FORM), /legal_name_en|vat_mode|bank_iban|default_vat_percent/);
  assert.match(read(FORM), /historicalSnapshot|help\.historicalSnapshot/);
  assert.match(read(PAGE), /accessDeniedMessage|unavailableMessage/);
  // Field name payload contract unchanged (label-only change).
  assert.match(read(FORM), /name="tin_number"|tinNumber/);
});

test("16. No hardcoded English shells on Settings UI sources", () => {
  const forbidden = [
    "Access Denied",
    "Company Settings",
    "Edit Settings",
    "Save Changes",
    "Company Profile",
    "Bank Details",
    "Read only",
    "Settings Unavailable",
  ];
  for (const file of [PAGE, FORM]) {
    const source = read(file);
    const offenders = forbidden.filter(
      (phrase) =>
        source.includes(`"${phrase}"`) ||
        source.includes(`'${phrase}'`) ||
        source.includes(`>${phrase}<`),
    );
    assert.deepEqual(offenders, [], `Hardcoded English in ${file}: ${offenders.join(", ")}`);
  }
});

test("17. Bidi: LTR on identifiers; auto on free text", () => {
  const form = read(FORM);
  assert.match(form, /dir="ltr"/);
  assert.match(form, /dir="auto"/);
  assert.match(form, /legal_name_ar[\s\S]*dir="auto"|dir="auto"[\s\S]*legal_name_ar/);
});
