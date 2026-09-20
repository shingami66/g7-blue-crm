import { z } from "zod";

const commercialRoleSchema = z.enum([
  "authority_line",
  "included_component",
  "optional_add_on",
]);

export const approvedCommercialAmendmentDraftLineSchema = z
  .object({
    line_key: z.string().trim().min(1).max(100),
    parent_line_key: z.string().trim().max(100).nullable(),
    commercial_role: commercialRoleSchema,
    description: z.string().trim().min(1).max(2000),
    description_ar: z.string().trim().max(2000).nullable(),
    details: z.string().trim().max(4000).nullable(),
    category: z.string().trim().max(200),
    qty: z.number().finite().positive(),
    unit: z.string().trim().min(1).max(80),
    unit_price: z.number().finite().nonnegative(),
    is_selected: z.boolean(),
  })
  .strict();

export const approvedCommercialAmendmentDraftSchema = z
  .object({
    quotation_id: z.string().uuid(),
    event: z.string().trim().min(1).max(500),
    date: z.string().min(1),
    valid_until: z.string().nullable(),
    discount: z.number().finite().nonnegative(),
    expected_updated_at: z.string().datetime({ offset: true }),
    lines: z.array(approvedCommercialAmendmentDraftLineSchema).min(1).max(200),
  })
  .strict()
  .superRefine((value, ctx) => {
    const keys = new Set<string>();
    const roots = new Set<string>();
    for (const [index, line] of value.lines.entries()) {
      if (keys.has(line.line_key)) {
        ctx.addIssue({ code: "custom", path: ["lines", index, "line_key"], message: "Line keys must be unique." });
      }
      keys.add(line.line_key);
      if (line.commercial_role === "authority_line") {
        roots.add(line.line_key);
        if (line.parent_line_key !== null || !line.is_selected) {
          ctx.addIssue({ code: "custom", path: ["lines", index], message: "Authority Lines must be roots and selected." });
        }
      } else if (!line.parent_line_key) {
        ctx.addIssue({ code: "custom", path: ["lines", index, "parent_line_key"], message: "Commercial child lines require an Authority Line parent." });
      }
      if (line.commercial_role === "included_component" && (!line.is_selected || line.unit_price !== 0)) {
        ctx.addIssue({ code: "custom", path: ["lines", index], message: "Included Components cannot carry a price or be unselected." });
      }
    }
    if (roots.size === 0) {
      ctx.addIssue({ code: "custom", path: ["lines"], message: "At least one Authority Line is required." });
    }
    for (const [index, line] of value.lines.entries()) {
      if (line.parent_line_key && !roots.has(line.parent_line_key)) {
        ctx.addIssue({ code: "custom", path: ["lines", index, "parent_line_key"], message: "Child parent must be an Authority Line." });
      }
    }
    if (value.valid_until && value.valid_until < value.date) {
      ctx.addIssue({ code: "custom", path: ["valid_until"], message: "Valid until date must be on or after the quotation date." });
    }
  });

const rpcResultSchema = z
  .object({
    error_code: z.string().nullable(),
    quotation_id: z.string().uuid().nullable(),
    updated_at: z.string().datetime({ offset: true }).nullable(),
    line_count: z.number().int().nullable(),
    subtotal: z.number().nullable(),
    discount: z.number().nullable(),
    vat_amount: z.number().nullable(),
    grand_total: z.number().nullable(),
  })
  .strict();

type RpcResponse = {
  data: unknown;
  error: { code?: string; message?: string } | null;
};

const ERROR_MESSAGES: Record<string, string> = {
  invalid_input: "Invalid amendment draft details.",
  quotation_not_found: "The amendment draft was not found.",
  quotation_amendment_draft_ineligible: "Only an eligible commercial amendment Draft can be edited.",
  quotation_amendment_draft_concurrency_conflict: "This amendment changed elsewhere. Reload the workspace before saving again.",
  quotation_not_current_approved: "The predecessor is no longer the current approved authority.",
  quotation_service_lifecycle_ineligible: "Commercial amendment is unavailable because the Service is no longer eligible.",
  invalid_validity_window: "The quotation validity window is not allowed for this Service.",
  invalid_commercial_hierarchy: "The commercial structure is invalid. Check each child and Authority Line.",
  discount_exceeds_subtotal: "The fixed discount cannot exceed the proposed subtotal.",
  w2c_discount_currency_unsupported: "Only fixed SAR discounts are supported for this amendment.",
  commercial_draft_update_failed: "The amendment draft could not be saved. No changes were made.",
};

const GENERIC_ERROR = "The amendment draft could not be saved. Please try again.";

function oneRow(data: unknown): unknown | null {
  return Array.isArray(data) && data.length === 1 ? data[0] : null;
}

export async function executeUpdateApprovedCommercialAmendmentDraft(input: {
  value: unknown;
  actor: { clerk_user_id: string; role: string };
  invoke: (params: Record<string, unknown>) => Promise<RpcResponse>;
}): Promise<
  | { success: true; data: z.infer<typeof rpcResultSchema> }
  | { success: false; code: "INVALID_INPUT" | "STRUCTURE_UPDATE_FAILED"; error: string; errorCode?: string }
> {
  const parsed = approvedCommercialAmendmentDraftSchema.safeParse(input.value);
  if (!parsed.success || !input.actor.clerk_user_id || !input.actor.role) {
    return { success: false, code: "INVALID_INPUT", error: "Invalid amendment draft details." };
  }

  let response: RpcResponse;
  try {
    response = await input.invoke({
      p_quotation_id: parsed.data.quotation_id,
      p_quotation: {
        event: parsed.data.event,
        date: parsed.data.date,
        valid_until: parsed.data.valid_until,
        discount: parsed.data.discount,
      },
      p_lines: parsed.data.lines,
      p_expected_updated_at: parsed.data.expected_updated_at,
      p_user_id: input.actor.clerk_user_id,
    });
  } catch {
    return { success: false, code: "STRUCTURE_UPDATE_FAILED", error: GENERIC_ERROR };
  }

  if (response.error) return { success: false, code: "STRUCTURE_UPDATE_FAILED", error: GENERIC_ERROR };
  const result = rpcResultSchema.safeParse(oneRow(response.data));
  if (!result.success || result.data.error_code) {
    const errorCode = result.success ? result.data.error_code ?? undefined : undefined;
    return {
      success: false,
      code: "STRUCTURE_UPDATE_FAILED",
      error: (errorCode && ERROR_MESSAGES[errorCode]) || GENERIC_ERROR,
      errorCode,
    };
  }
  if (!result.data.quotation_id || !result.data.updated_at || result.data.subtotal === null || result.data.grand_total === null) {
    return { success: false, code: "STRUCTURE_UPDATE_FAILED", error: GENERIC_ERROR };
  }
  return { success: true, data: result.data };
}
