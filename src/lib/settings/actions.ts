"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { requirePermission } from "@/lib/auth/permissions";
import { UnauthorizedError, ForbiddenError } from "@/lib/auth/errors";
import {
  normalizeCompanySettingsInput,
  updateCompanySettingsSchema,
} from "./schemas";

export type CompanySettingsActionState = {
  success: boolean;
  message?: string;
  error?: string;
};

function readFormData(formData: FormData) {
  return {
    legal_name_en: formData.get("legal_name_en"),
    legal_name_ar: formData.get("legal_name_ar"),
    cr_number: formData.get("cr_number"),
    tin_number: formData.get("tin_number"),
    vat_mode: formData.get("vat_mode"),
    vat_effective_date: formData.get("vat_effective_date"),
    vat_number: formData.get("vat_number"),
    official_email: formData.get("official_email"),
    official_phone: formData.get("official_phone"),
    national_address: formData.get("national_address"),
    bank_name: formData.get("bank_name"),
    bank_iban: formData.get("bank_iban"),
    bank_account_holder: formData.get("bank_account_holder"),
    currency: formData.get("currency"),
    default_vat_percent: formData.get("default_vat_percent"),
    default_terms: formData.get("default_terms"),
  };
}

export async function updateCompanySettings(
  _previousState: CompanySettingsActionState,
  formData: FormData
): Promise<CompanySettingsActionState> {
  try {
    const user = await requirePermission("settings:write");
    const parsed = updateCompanySettingsSchema.safeParse(readFormData(formData));

    if (!parsed.success) {
      const firstError = parsed.error.issues[0]?.message ?? "Validation failed";
      return { success: false, error: firstError };
    }

    const settings = normalizeCompanySettingsInput(parsed.data);
    const supabase = createAdminClient();
    const { error } = await supabase
      .from("company_settings")
      .upsert(
        {
          setting_key: "default",
          legal_name_en: settings.legal_name_en,
          legal_name_ar: settings.legal_name_ar,
          cr_number: settings.cr_number,
          tin_number: settings.tin_number,
          vat_mode: settings.vat_mode,
          vat_effective_date: settings.vat_effective_date,
          vat_number: settings.vat_number,
          official_email: settings.official_email,
          official_phone: settings.official_phone,
          national_address: settings.national_address,
          bank_name: settings.bank_name,
          bank_iban: settings.bank_iban,
          bank_account_holder: settings.bank_account_holder,
          currency: settings.currency,
          default_vat_percent: settings.default_vat_percent,
          default_terms: settings.default_terms,
          updated_by: user.clerk_user_id,
        },
        { onConflict: "setting_key" }
      );

    if (error) {
      console.error("[updateCompanySettings] Supabase error:", error.message);
      return { success: false, error: "Failed to update company settings. Please try again." };
    }

    revalidatePath("/settings");
    return { success: true, message: "Company settings saved." };
  } catch (err) {
    if (err instanceof UnauthorizedError) return { success: false, error: "Unauthorized" };
    if (err instanceof ForbiddenError) return { success: false, error: "Forbidden" };
    console.error(
      "[updateCompanySettings] Unexpected error:",
      err instanceof Error ? err.message : "Unknown"
    );
    return { success: false, error: "An unexpected error occurred." };
  }
}
