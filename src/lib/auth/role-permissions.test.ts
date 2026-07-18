import assert from "node:assert/strict";
import { createRequire } from "node:module";
import test from "node:test";
import { APPROVED_BILLING_SCOPE_PERMISSIONS } from "../approved-billing-scopes/permissions.ts";

type ResolveResult = { url: string; shortCircuit?: true };
type ResolveContext = { parentURL?: string };

const require = createRequire(import.meta.url);
const sourceRootUrl = new URL("../../", import.meta.url).href;
const { registerHooks } = require("node:module") as {
  registerHooks: (hooks: {
    resolve: (
      specifier: string,
      context: ResolveContext,
      nextResolve: (specifier: string, context: ResolveContext) => ResolveResult,
    ) => ResolveResult;
  }) => void;
};

registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier.startsWith("@/")) {
      return {
        shortCircuit: true,
        url: new URL(`../../${specifier.slice(2)}.ts`, import.meta.url).href,
      };
    }

    if (
      specifier.startsWith(".") &&
      !specifier.endsWith(".ts") &&
      context.parentURL?.startsWith(sourceRootUrl)
    ) {
      return nextResolve(`${specifier}.ts`, context);
    }

    return nextResolve(specifier, context);
  },
});

const {
  INVOICE_PERMISSIONS,
  ROLE_PERMISSIONS,
  hasPermissionForRole,
} = await import("./role-permissions.ts");

const absMutationPermissions = [
  APPROVED_BILLING_SCOPE_PERMISSIONS.create,
  APPROVED_BILLING_SCOPE_PERMISSIONS.update,
  APPROVED_BILLING_SCOPE_PERMISSIONS.review,
  APPROVED_BILLING_SCOPE_PERMISSIONS.approve,
  APPROVED_BILLING_SCOPE_PERMISSIONS.void,
  APPROVED_BILLING_SCOPE_PERMISSIONS.supersede,
  APPROVED_BILLING_SCOPE_PERMISSIONS.discard,
] as const;

test("Admin and Manager share bounded financial lifecycle mutation authority", () => {
  for (const role of ["admin", "manager"] as const) {
    assert.equal(hasPermissionForRole(role, INVOICE_PERMISSIONS.write), true);
    for (const permission of absMutationPermissions) {
      assert.equal(hasPermissionForRole(role, permission), true);
    }
  }
});

test("Accountant retains financial reads without Invoice or ABS mutation authority", () => {
  assert.equal(hasPermissionForRole("accountant", INVOICE_PERMISSIONS.read), true);
  assert.equal(
    hasPermissionForRole(
      "accountant",
      APPROVED_BILLING_SCOPE_PERMISSIONS.read,
    ),
    true,
  );
  assert.equal(hasPermissionForRole("accountant", "payments:read"), true);
  assert.equal(hasPermissionForRole("accountant", INVOICE_PERMISSIONS.write), false);

  for (const permission of absMutationPermissions) {
    assert.equal(hasPermissionForRole("accountant", permission), false);
  }
});

test("Other roles keep their existing access without financial mutation expansion", () => {
  assert.equal(hasPermissionForRole("sales", "services:write"), true);
  assert.equal(hasPermissionForRole("operations", "services:update_status"), true);
  assert.equal(hasPermissionForRole("viewer", INVOICE_PERMISSIONS.read), true);

  for (const role of ["sales", "operations", "viewer"] as const) {
    assert.equal(hasPermissionForRole(role, INVOICE_PERMISSIONS.write), false);
    for (const permission of absMutationPermissions) {
      assert.equal(hasPermissionForRole(role, permission), false);
    }
  }
});

test("Unknown or malformed role evidence fails closed", () => {
  for (const role of ["unknown", "", null, undefined, 42, {}]) {
    assert.equal(hasPermissionForRole(role, INVOICE_PERMISSIONS.write), false);
    assert.equal(
      hasPermissionForRole(role, APPROVED_BILLING_SCOPE_PERMISSIONS.approve),
      false,
    );
  }
});

test("Canonical role inventory remains complete", () => {
  assert.deepEqual(Object.keys(ROLE_PERMISSIONS).sort(), [
    "accountant",
    "admin",
    "manager",
    "operations",
    "sales",
    "viewer",
  ]);
});

test("Supplier bank and deletion permissions remain Admin-only", () => {
  const protectedPermissions = [
    "suppliers:read_bank",
    "suppliers:write_bank",
    "suppliers:delete",
  ];

  for (const permission of protectedPermissions) {
    assert.equal(hasPermissionForRole("admin", permission), true);
    for (const role of ["manager", "operations", "sales", "accountant", "viewer"] as const) {
      assert.equal(hasPermissionForRole(role, permission), false);
    }
  }
});
