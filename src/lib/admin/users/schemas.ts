import { z } from "zod";

/**
 * CRM role whitelist. Must match the CHECK constraint on app_users.role
 * and the ROLE_PERMISSIONS keys in src/lib/auth/permissions.ts.
 */
export const CRM_ROLES = [
  "admin",
  "manager",
  "sales",
  "operations",
  "accountant",
  "viewer",
] as const;

export type CrmRole = (typeof CRM_ROLES)[number];

export const crmRoleSchema = z.enum(CRM_ROLES);

export const inviteUserSchema = z.object({
  email: z
    .string()
    .min(1, "Email is required")
    .email("Invalid email address")
    .transform((v) => v.toLowerCase().trim()),
  role: crmRoleSchema,
}).strict();

export const updateUserRoleSchema = z.object({
  userId: z.string().uuid("Invalid user ID"),
  role: crmRoleSchema,
}).strict();

export const toggleUserActiveSchema = z.object({
  userId: z.string().uuid("Invalid user ID"),
}).strict();
