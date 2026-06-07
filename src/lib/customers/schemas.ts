import { z } from "zod";

/** Schema for creating a new customer (used by the Server Action). */
export const createCustomerSchema = z.object({
  company: z.string().min(1, "Company is required"),
  contact: z.string().min(1, "Contact is required"),
  phone: z.string().min(1, "Phone is required"),
  email: z.string().email("Invalid email address"),
  city: z.string().min(1, "City is required"),
  status: z.enum(["active", "inactive", "lead"]).default("lead"),
  projects_count: z.coerce.number().int().nonnegative().default(0),
  revenue: z.coerce.number().nonnegative().default(0),
});

export type CreateCustomerInput = z.infer<typeof createCustomerSchema>;

/** Schema for updating an existing customer (all fields optional). */
export const updateCustomerSchema = z.object({
  company: z.string().min(1, "Company is required").optional(),
  contact: z.string().min(1, "Contact is required").optional(),
  phone: z.string().min(1, "Phone is required").optional(),
  email: z.string().email("Invalid email address").optional(),
  city: z.string().min(1, "City is required").optional(),
  status: z.enum(["active", "inactive", "lead"]).optional(),
});

export type UpdateCustomerInput = z.infer<typeof updateCustomerSchema>;
