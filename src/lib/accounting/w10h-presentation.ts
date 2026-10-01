export type W10HLocale = "en" | "ar";

const TOTAL_LABELS: Record<string, Record<W10HLocale, string>> = {
  ending_debit_halalah: { en: "Ending debits", ar: "إجمالي الأرصدة المدينة" },
  ending_credit_halalah: { en: "Ending credits", ar: "إجمالي الأرصدة الدائنة" },
  account_count: { en: "Accounts", ar: "الحسابات" },
  debits_equal_credits: { en: "Debits equal credits", ar: "تساوي المدين والدائن" },
  revenue_halalah: { en: "Revenue", ar: "الإيرادات" },
  expense_halalah: { en: "Expenses", ar: "المصروفات" },
  profit_loss_halalah: { en: "Profit / (loss)", ar: "الربح / (الخسارة)" },
  assets_halalah: { en: "Assets", ar: "الأصول" },
  liabilities_halalah: { en: "Liabilities", ar: "الالتزامات" },
  equity_before_current_result_halalah: { en: "Equity before current result", ar: "حقوق الملكية قبل نتيجة السنة الحالية" },
  current_year_earnings_halalah: { en: "Current-year earnings", ar: "نتيجة السنة الحالية" },
  presented_equity_halalah: { en: "Presented equity", ar: "حقوق الملكية المعروضة" },
  equation_difference_halalah: { en: "Balance-sheet equation difference", ar: "فرق معادلة الميزانية" },
  current_result_already_transferred: { en: "Current result already transferred", ar: "تم تحويل نتيجة السنة الحالية" },
  prior_year_result_unresolved: { en: "Prior-year result unresolved", ar: "نتيجة سنة سابقة غير مسوّاة" },
};

export function getW10HTotalLabel(key: string, locale: W10HLocale): string {
  return TOTAL_LABELS[key]?.[locale] ?? key.replaceAll("_", " ");
}
