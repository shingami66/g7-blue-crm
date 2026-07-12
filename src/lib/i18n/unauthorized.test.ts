import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import { getUnauthorizedDictionary } from "./dictionaries/unauthorized.ts";
import { getDirection } from "./direction.ts";
import { DEFAULT_LOCALE, getLocale } from "./locales.ts";

const REPO_ROOT = join(import.meta.dirname, "../../..");
const PAGE = join(REPO_ROOT, "src/app/unauthorized/page.tsx");
const ROOT_LAYOUT = join(REPO_ROOT, "src/app/layout.tsx");
const SESSION_LOCALE = join(REPO_ROOT, "src/lib/i18n/session-locale.ts");
const DASHBOARD_LAYOUT = join(REPO_ROOT, "src/app/(dashboard)/layout.tsx");
const PERMISSIONS = join(REPO_ROOT, "src/lib/auth/permissions.ts");

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

test("1. Unauthorized dictionary EN/AR shapes aligned", () => {
  const en = getUnauthorizedDictionary("en");
  const ar = getUnauthorizedDictionary("ar");
  assert.deepEqual(listNestedKeys(en).sort(), listNestedKeys(ar).sort());
});

test("2. English and Arabic copy for heading, body, sign-out, metadata", () => {
  const en = getUnauthorizedDictionary("en");
  const ar = getUnauthorizedDictionary("ar");
  assert.equal(en.title, "Access Pending");
  assert.equal(ar.title, "الوصول قيد الانتظار");
  assert.match(en.body, /sign-in was successful/i);
  assert.match(ar.body, /تم تسجيل الدخول بنجاح/);
  assert.equal(en.signOut, "Sign Out");
  assert.equal(ar.signOut, "تسجيل الخروج");
  assert.match(en.metaTitle, /Access Pending/);
  assert.match(ar.metaTitle, /الوصول قيد الانتظار/);
  assert.match(en.metaTitle, /G7 BLUE CRM/);
  assert.match(ar.metaTitle, /G7 BLUE CRM/);
});

test("3. Brand marks remain English product branding", () => {
  const en = getUnauthorizedDictionary("en");
  const ar = getUnauthorizedDictionary("ar");
  assert.equal(en.brandMark, "G7 BLUE");
  assert.equal(ar.brandMark, "G7 BLUE");
  assert.equal(en.footer, "G7 BLUE Events CRM");
  assert.equal(ar.footer, "G7 BLUE Events CRM");
});

test("4. Direction helpers for LTR/RTL", () => {
  assert.equal(getDirection("en"), "ltr");
  assert.equal(getDirection("ar"), "rtl");
});

test("5. Page uses public cookie locale authority, not session-effective or app_users", () => {
  const page = read(PAGE);
  const sessionLocale = read(SESSION_LOCALE);
  assert.match(page, /getPublicRequestLocale/);
  assert.match(page, /getUnauthorizedDictionary/);
  assert.match(page, /getDirection/);
  assert.match(page, /dir=\{direction\}/);
  assert.match(page, /lang=\{locale\}/);
  assert.match(page, /generateMetadata/);
  assert.doesNotMatch(page, /getCurrentSessionEffectiveLocale/);
  assert.doesNotMatch(page, /getCurrentAppUser|requireUser|requirePermission/);
  assert.doesNotMatch(page, /getCurrentUserLocale/);
  assert.match(sessionLocale, /getPublicRequestLocale/);
  assert.match(sessionLocale, /getCurrentSessionLocaleOverride\(\)\) \?\? getLocale\(\)/);
  assert.match(sessionLocale, /Does not call `getCurrentUserLocale`/);
});

test("6. Clerk SignOutButton contract preserved", () => {
  const page = read(PAGE);
  assert.match(page, /SignOutButton/);
  assert.match(page, /redirectUrl="\/sign-in"/);
  assert.match(page, /dictionary\.signOut/);
});

test("7. No hardcoded English UI shells remain in unauthorized page source", () => {
  const page = read(PAGE);
  const forbidden = [
    "Access Pending",
    "Your sign-in was successful",
    "Sign Out",
    "Please contact your administrator",
  ];
  const offenders = forbidden.filter(
    (phrase) =>
      page.includes(`"${phrase}"`) ||
      page.includes(`'${phrase}'`) ||
      page.includes(`>${phrase}<`),
  );
  assert.deepEqual(offenders, [], `Hardcoded English: ${offenders.join(", ")}`);
  // Brands may appear only via dictionary bindings, not as page-local prose for translated fields.
  assert.match(page, /dictionary\.brandMark|dictionary\.footer|dictionary\.title/);
});

test("8. Dashboard membership gate still blocks inactive users from shell", () => {
  const layout = read(DASHBOARD_LAYOUT);
  assert.match(layout, /getCurrentAppUser/);
  assert.match(layout, /!appUser\.is_active|!appUser \|\| !appUser\.is_active/);
  assert.match(layout, /redirect\("\/unauthorized"\)/);
  const permissions = read(PERMISSIONS);
  assert.match(permissions, /is_active/);
  assert.match(permissions, /requireUser/);
});

test("9. Public default locale remains English without inventing new persistence", () => {
  assert.equal(DEFAULT_LOCALE, "en");
  assert.equal(getLocale(), "en");
  const sessionLocale = read(SESSION_LOCALE);
  assert.doesNotMatch(sessionLocale, /from\("app_users"\)|createAdminClient/);
  // getPublicRequestLocale body is only override cookie ?? getLocale() — no app_users.
  const start = sessionLocale.indexOf("export const getPublicRequestLocale");
  const end = sessionLocale.indexOf("export async function setCurrentSessionLocaleOverride");
  assert.ok(start >= 0 && end > start);
  const publicReader = sessionLocale.slice(start, end);
  assert.match(publicReader, /getCurrentSessionLocaleOverride\(\)\) \?\? getLocale\(\)/);
  assert.doesNotMatch(publicReader, /getCurrentUserLocale|requireUser|requirePermission/);
});

test("10. Page does not expose CRM navigation or identity fields", () => {
  const page = read(PAGE);
  assert.doesNotMatch(page, /Sidebar|Topbar|\/dashboard|\/customers|\/admin/);
  assert.doesNotMatch(page, /email|clerk_user_id|app_users|userId|firstName/i);
  assert.doesNotMatch(page, /LocaleProvider|LocaleSelector/);
});

test("11. Root html lang/dir aligns with public locale for inactive/missing app_users", () => {
  const root = read(ROOT_LAYOUT);
  const page = read(PAGE);
  // Active path preserved
  assert.match(root, /appUser\?\.is_active/);
  assert.match(root, /getCurrentSessionEffectiveLocale/);
  // Inactive/missing uses public request locale (same as /unauthorized), not bare getLocale()
  assert.match(root, /getPublicRequestLocale/);
  assert.match(root, /lang=\{locale\}/);
  assert.match(root, /dir=\{direction\}/);
  assert.doesNotMatch(root, /getLocale\(\)/);
  // Both surfaces share the public authority name
  assert.match(page, /getPublicRequestLocale/);
  // No new persistence / write / permission paths on root
  assert.doesNotMatch(root, /setCurrentSessionLocaleOverride|applyCurrentUserLocalePreference/);
  assert.doesNotMatch(root, /requirePermission|requireUser|getCurrentUserLocale/);
});
