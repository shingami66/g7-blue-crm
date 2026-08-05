import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import {
  formatAdminUsersCopy,
  getAdminUsersDictionary,
  getCrmRoleLabel,
  mapAdminUsersActionError,
} from "./dictionaries/admin-users.ts";
import { navigationDictionaryAr } from "./dictionaries/navigation.ts";
import { CRM_ROLES } from "../admin/users/schemas.ts";

const REPO_ROOT = join(import.meta.dirname, "../../..");
const PAGE = join(REPO_ROOT, "src/app/(dashboard)/admin/users/page.tsx");
const CLIENT = join(REPO_ROOT, "src/app/(dashboard)/admin/users/AdminUsersClient.tsx");
const SIDEBAR = join(REPO_ROOT, "src/components/layout/Sidebar.tsx");
const ACTIONS = join(REPO_ROOT, "src/lib/admin/users/actions.ts");
const SCHEMAS = join(REPO_ROOT, "src/lib/admin/users/schemas.ts");
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

test("1. Admin Users dictionary EN/AR shapes aligned", () => {
  const en = getAdminUsersDictionary("en");
  const ar = getAdminUsersDictionary("ar");
  assert.deepEqual(listNestedKeys(en).sort(), listNestedKeys(ar).sort());
});

test("2. Page and invite copy localize", () => {
  const en = getAdminUsersDictionary("en");
  const ar = getAdminUsersDictionary("ar");
  assert.equal(en.page.title, "User Management");
  assert.equal(ar.page.title, "إدارة المستخدمين");
  assert.equal(ar.invite.title, "دعوة مستخدم جديد");
  assert.equal(ar.invite.submit, "إرسال الدعوة");
  assert.match(
    formatAdminUsersCopy(ar.invite.success, { email: "a@b.com" }),
    /a@b\.com/,
  );
  assert.match(read(PAGE), /getCurrentSessionEffectiveLocale/);
  assert.match(read(PAGE), /getAdminUsersDictionary/);
  assert.match(read(PAGE), /generateMetadata/);
  assert.match(read(PAGE), /إدارة المستخدمين - G7 BLUE CRM/);
  assert.match(read(CLIENT), /dictionary\.invite\.title/);
});

test("3-5. Roles stable; default viewer; labels display-only", () => {
  assert.deepEqual([...CRM_ROLES], [
    "admin",
    "manager",
    "sales",
    "operations",
    "accountant",
    "viewer",
  ]);
  assert.deepEqual(
    Object.keys(getAdminUsersDictionary("en").roles).sort(),
    [...CRM_ROLES].sort(),
  );
  assert.equal(getCrmRoleLabel("ar", "admin"), "مدير النظام");
  assert.equal(getCrmRoleLabel("ar", "viewer"), "عرض فقط");
  assert.match(read(CLIENT), /useState<string>\("viewer"\)|setInviteRole\("viewer"\)/);
  assert.match(read(CLIENT), /CRM_ROLES\.map/);
  assert.match(read(SCHEMAS), /"viewer"/);
});

test("6-8. Security locks preserved: self role/deactivation and last admin", () => {
  const client = read(CLIENT);
  const actions = read(ACTIONS);
  assert.match(client, /cannotChangeOwnRole|currentUserId === user\.id/);
  assert.match(actions, /You cannot change your own role/);
  assert.match(actions, /You cannot deactivate your own account/);
  assert.match(actions, /At least one active admin must remain/);
  assert.match(actions, /hasOtherActiveAdmin/);
  assert.match(actions, /publicMetadata.*crm_role|crm_role/);
  assert.match(actions, /requirePermission\("users:invite"\)/);
  assert.match(actions, /requirePermission\("users:manage"\)/);
  assert.match(read(PERMISSIONS), /users:invite|users:manage/);
  assert.match(read(PAGE), /requirePermission\("users:manage"\)/);
});

test("9-11. Tabs, tables, revoke modal, activate/deactivate localized", () => {
  const ar = getAdminUsersDictionary("ar");
  assert.match(ar.tabs.users, /\{count\}/);
  assert.equal(ar.usersTable.activate, "تفعيل");
  assert.equal(ar.usersTable.deactivate, "إلغاء التفعيل");
  assert.equal(ar.invitationsTable.revoke, "إلغاء");
  assert.equal(ar.revokeModal.title, "إلغاء الدعوة");
  assert.match(read(CLIENT), /dictionary\.revokeModal/);
  assert.match(read(CLIENT), /revokeInvitation/);
  assert.match(read(CLIENT), /toggleUserActive|handleToggleActive/);
});

test("12-14. Safe error mapping; no real Clerk calls in tests; formatters/bidi", () => {
  assert.equal(
    mapAdminUsersActionError("ar", "Unauthorized", "fallback"),
    "يجب تسجيل الدخول أولاً.",
  );
  assert.equal(
    mapAdminUsersActionError("ar", "At least one active admin must remain.", "x"),
    "يجب أن يبقى مسؤول نشط واحد على الأقل.",
  );
  assert.match(read(CLIENT), /mapAdminUsersActionError/);
  assert.match(read(CLIENT), /UiDateText|UiDateTimeText|formatUiNumber/);
  assert.match(read(CLIENT), /isolateBidiText/);
  assert.match(read(CLIENT), /dir="ltr"/);
  assert.match(read(CLIENT), /dir="auto"/);
  // Tests must not invoke Clerk invitation creation
  assert.doesNotMatch(read(join(import.meta.dirname, "admin-users.test.ts")), /inviteUser\(/);
});

test("15. Sidebar Admin/Users already dictionary-driven", () => {
  assert.equal(navigationDictionaryAr.admin, "الإدارة");
  assert.equal(navigationDictionaryAr.modules.users, "المستخدمون");
  assert.match(read(SIDEBAR), /dictionary\.admin|dictionary\.modules\.users/);
  assert.match(read(SIDEBAR), /\/admin\/users/);
});

test("16. No hardcoded English shells on Admin Users UI", () => {
  const forbidden = [
    "User Management",
    "Invite New User",
    "Send Invite",
    "Active Users",
    "Pending Invitations",
    "No users found",
    "Revoke invitation",
    "Deactivate",
  ];
  for (const file of [PAGE, CLIENT]) {
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

test("17. No schema/action/permission contract changes required for localization", () => {
  assert.match(read(ACTIONS), /inviteUser|updateUserRole|toggleUserActive|revokeInvitation/);
  assert.match(read(SCHEMAS), /CRM_ROLES/);
  assert.doesNotMatch(read(CLIENT), /users:write|bulkInvite|audit log/i);
});
