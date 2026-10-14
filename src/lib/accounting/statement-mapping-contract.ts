import type { AccountingAccountVersion, AccountingStatementMappingEntry } from "./types";

export type AccountingStatementSection = "REVENUE" | "EXPENSE" | "ASSETS" | "LIABILITIES" | "EQUITY";
export type AccountingStatementClassification = {
  statement_type: AccountingStatementMappingEntry["statement_type"];
  section_key: AccountingStatementSection;
};

const classificationByAccountType: Record<AccountingAccountVersion["account_type"], AccountingStatementClassification> = {
  REVENUE: { statement_type: "PROFIT_LOSS", section_key: "REVENUE" },
  EXPENSE: { statement_type: "PROFIT_LOSS", section_key: "EXPENSE" },
  ASSET: { statement_type: "BALANCE_SHEET", section_key: "ASSETS" },
  LIABILITY: { statement_type: "BALANCE_SHEET", section_key: "LIABILITIES" },
  EQUITY: { statement_type: "BALANCE_SHEET", section_key: "EQUITY" },
};

export function getAccountingStatementClassification(accountType: AccountingAccountVersion["account_type"]) {
  return classificationByAccountType[accountType];
}
