import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import { requirePermission, checkPermission } from "@/lib/auth/permissions";
import { UnauthorizedError, ForbiddenError } from "@/lib/auth/errors";
import type { CompanySettingsPageData } from "@/types/settings";
import { EMPTY_COMPANY_SETTINGS, mapRowToCompanySettings } from "./mappers";
import type { CompanySettingsRow } from "./types";

const BANK_DETAIL_ROLES = new Set(["admin", "accountant"]);
const NO_SETTINGS_ROW_ERROR_CODE = "PGRST116";

export type CompanySettingsPageResult =
  | CompanySettingsPageData
  | { error: "settings_unavailable" };

export async function getCompanySettingsForPage(): Promise<CompanySettingsPageResult> {
  const user = await requirePermission("settings:read");
  const canEdit = await checkPermission("settings:write");
  const canViewBankDetails = BANK_DETAIL_ROLES.has(user.role);

  try {
    const supabase = createAdminClient();
    const { data: settingsRow, error } = await supabase
      .from("company_settings")
      .select("*")
      .eq("setting_key", "default")
      .maybeSingle();

    if (error) {
      console.error("[getCompanySettingsForPage] Supabase error:", error.message);
      if (error.code !== NO_SETTINGS_ROW_ERROR_CODE) {
        return { error: "settings_unavailable" };
      }

      return {
        settings: EMPTY_COMPANY_SETTINGS,
        canEdit,
        canViewBankDetails,
      };
    }

    return {
      settings: settingsRow
        ? mapRowToCompanySettings(settingsRow as CompanySettingsRow, canViewBankDetails)
        : EMPTY_COMPANY_SETTINGS,
      canEdit,
      canViewBankDetails,
    };
  } catch (err) {
    if (err instanceof UnauthorizedError || err instanceof ForbiddenError) throw err;
    console.error(
      "[getCompanySettingsForPage] Unexpected error:",
      err instanceof Error ? err.message : "Unknown"
    );
    return { error: "settings_unavailable" };
  }
}
