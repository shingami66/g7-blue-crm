import "server-only";

import { requirePermission } from "@/lib/auth/permissions";
import {
  EXPENSE_PERMISSIONS,
  CASH_ADVANCE_PERMISSIONS,
  PETTY_CASH_PERMISSIONS,
} from "@/lib/auth/role-permissions";
import { createAdminClient } from "@/lib/supabase/admin";
import type {
  ExpenseAccountabilitySummary,
  EmployeeCashAdvance,
  EnrichedCashAdvance,
  PettyCashFund,
  PettyCashTransaction,
  CashAdvanceExpenseSettlement,
  EnrichedCashAdvanceExpenseSettlement,
  CashAdvanceReturn,
  ExpenseReimbursementSettlement,
  ExpenseDocumentLink,
  ExpenseServiceOption,
  ExpenseDocumentDetail,
  LinkedCashAdvanceExpense,
  CashAdvanceBalanceSummary,
  PettyCashCustodianOption,
  PettyCashExpenseSummary,
} from "./types";

export interface ExpenseListFilters {
  serviceId?: string;
  contextType?: "company" | "event";
  status?: string;
  pettyCashFundId?: string;
  limit?: number;
}

// Helper to query unapplied W5A tables before migration is applied
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getExpenseClient(): any {
  return createAdminClient();
}

export async function getExpensesAccountabilityList(
  filters?: ExpenseListFilters,
): Promise<ExpenseAccountabilitySummary[]> {
  await requirePermission(EXPENSE_PERMISSIONS.read);
  const supabase = getExpenseClient();

  let query = supabase
    .from("expense_accountability_summaries")
    .select("*")
    .order("expense_date", { ascending: false });

  if (filters?.serviceId) {
    query = query.eq("service_id", filters.serviceId);
  }
  if (filters?.contextType) {
    query = query.eq("context_type", filters.contextType);
  }
  if (filters?.status) {
    query = query.eq("status", filters.status);
  }
  if (filters?.pettyCashFundId) {
    query = query.eq("petty_cash_fund_id", filters.pettyCashFundId);
  }
  if (filters?.limit) {
    query = query.limit(filters.limit);
  } else {
    query = query.limit(100);
  }

  const { data, error } = await query;
  if (error) {
    throw new Error(`Failed to load expenses: ${error.message}`);
  }

  return (data ?? []) as ExpenseAccountabilitySummary[];
}

export async function getExpenseDetailById(id: string): Promise<{
  expense: ExpenseAccountabilitySummary | null;
  documents: ExpenseDocumentLink[];
  reimbursements: ExpenseReimbursementSettlement[];
  advanceAllocations: CashAdvanceExpenseSettlement[];
}> {
  await requirePermission(EXPENSE_PERMISSIONS.read);
  const supabase = getExpenseClient();

  const { data: expenseData, error: expenseError } = await supabase
    .from("expense_accountability_summaries")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (expenseError) {
    throw new Error(`Failed to load expense: ${expenseError.message}`);
  }
  if (!expenseData) {
    return {
      expense: null,
      documents: [],
      reimbursements: [],
      advanceAllocations: [],
    };
  }

  const [docsRes, reimbursementsRes, advanceAllocationsRes] = await Promise.all([
    supabase
      .from("expense_documents")
      .select("*")
      .eq("expense_id", id)
      .order("attached_at", { ascending: false }),
    supabase
      .from("expense_reimbursement_settlements")
      .select("*")
      .eq("expense_id", id)
      .order("settled_at", { ascending: false }),
    supabase
      .from("cash_advance_expense_settlements")
      .select("*")
      .eq("expense_id", id)
      .order("settled_at", { ascending: false }),
  ]);

  return {
    expense: expenseData as ExpenseAccountabilitySummary,
    documents: (docsRes.data ?? []) as ExpenseDocumentLink[],
    reimbursements: (reimbursementsRes.data ?? []) as ExpenseReimbursementSettlement[],
    advanceAllocations: (advanceAllocationsRes.data ?? []) as CashAdvanceExpenseSettlement[],
  };
}

export async function getOwnExpensesAccountabilityList(
  filters?: ExpenseListFilters,
): Promise<ExpenseAccountabilitySummary[]> {
  const user = await requirePermission(EXPENSE_PERMISSIONS.readOwn);
  const supabase = getExpenseClient();

  let query = supabase
    .from("expense_accountability_summaries")
    .select("*")
    .or(`submitted_by.eq.${user.id},claimant_id.eq.${user.id}`)
    .order("expense_date", { ascending: false });

  if (filters?.serviceId) {
    query = query.eq("service_id", filters.serviceId);
  }
  if (filters?.contextType) {
    query = query.eq("context_type", filters.contextType);
  }
  if (filters?.status) {
    query = query.eq("status", filters.status);
  }
  if (filters?.limit) {
    query = query.limit(filters.limit);
  } else {
    query = query.limit(100);
  }

  const { data, error } = await query;
  if (error) {
    throw new Error(`Failed to load own expenses: ${error.message}`);
  }

  return (data ?? []) as ExpenseAccountabilitySummary[];
}

export async function getOwnExpenseDetailById(id: string): Promise<{
  expense: ExpenseAccountabilitySummary | null;
  documents: ExpenseDocumentLink[];
  documentDetails: ExpenseDocumentDetail[];
  reimbursements: ExpenseReimbursementSettlement[];
  advanceAllocations: CashAdvanceExpenseSettlement[];
}> {
  const user = await requirePermission(EXPENSE_PERMISSIONS.readOwn);
  const supabase = getExpenseClient();

  const { data: expenseData, error: expenseError } = await supabase
    .from("expense_accountability_summaries")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (expenseError) {
    throw new Error(`Failed to load expense: ${expenseError.message}`);
  }
  if (!expenseData) {
    return {
      expense: null,
      documents: [],
      documentDetails: [],
      reimbursements: [],
      advanceAllocations: [],
    };
  }

  if (expenseData.submitted_by !== user.id && expenseData.claimant_id !== user.id) {
    return {
      expense: null,
      documents: [],
      documentDetails: [],
      reimbursements: [],
      advanceAllocations: [],
    };
  }

  const [docsRes, reimbursementsRes, advanceAllocationsRes] = await Promise.all([
    supabase
      .from("expense_documents")
      .select("*")
      .eq("expense_id", id)
      .order("attached_at", { ascending: false }),
    supabase
      .from("expense_reimbursement_settlements")
      .select("*")
      .eq("expense_id", id)
      .order("settled_at", { ascending: false }),
    supabase
      .from("cash_advance_expense_settlements")
      .select("*")
      .eq("expense_id", id)
      .order("settled_at", { ascending: false }),
  ]);

  const docLinks = (docsRes.data ?? []) as ExpenseDocumentLink[];
  let documentDetails: ExpenseDocumentDetail[] = [];
  if (docLinks.length > 0) {
    const docIds = docLinks.map((d) => d.document_id);
    const { data: metaRows } = await supabase
      .from("business_documents")
      .select("id, original_filename, mime_type, file_size")
      .in("id", docIds);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const metaMap = new Map<string, any>(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ((metaRows as any[]) ?? []).map((m: any) => [m.id, m]),
    );

    documentDetails = docLinks.map((link) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const meta = metaMap.get(link.document_id) as any;
      return {
        documentId: link.document_id,
        originalFilename: meta?.original_filename ?? "receipt",
        mimeType: meta?.mime_type ?? "application/octet-stream",
        fileSize: Number(meta?.file_size ?? 0),
        attachedAt: link.attached_at,
        attachedBy: link.attached_by,
      };
    });
  }

  return {
    expense: expenseData as ExpenseAccountabilitySummary,
    documents: docLinks,
    documentDetails,
    reimbursements: (reimbursementsRes.data ?? []) as ExpenseReimbursementSettlement[],
    advanceAllocations: (advanceAllocationsRes.data ?? []) as CashAdvanceExpenseSettlement[],
  };
}

export async function getEligibleServicesForExpenseSelector(): Promise<ExpenseServiceOption[]> {
  await requirePermission("services:read");
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("services")
    .select("id, service_number, service_title, event_name, status")
    .is("deleted_at", null)
    .order("service_number", { ascending: true });

  if (error) {
    console.error("[getEligibleServicesForExpenseSelector] Supabase error:", error.message);
    return [];
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (data ?? []).map((row: any) => ({
    id: row.id,
    serviceNumber: row.service_number,
    serviceTitle: row.service_title,
    eventName: row.event_name,
    status: row.status,
  }));
}



export async function getCashAdvancesList(filters?: {
  recipientId?: string;
  status?: string;
  limit?: number;
}): Promise<EmployeeCashAdvance[]> {
  await requirePermission(CASH_ADVANCE_PERMISSIONS.read);
  const supabase = getExpenseClient();

  let query = supabase
    .from("employee_cash_advances")
    .select("*")
    .order("requested_at", { ascending: false });

  if (filters?.recipientId) {
    query = query.eq("recipient_id", filters.recipientId);
  }
  if (filters?.status) {
    query = query.eq("status", filters.status);
  }
  if (filters?.limit) {
    query = query.limit(filters.limit);
  } else {
    query = query.limit(100);
  }

  const { data, error } = await query;
  if (error) {
    throw new Error(`Failed to load cash advances: ${error.message}`);
  }

  return (data ?? []) as EmployeeCashAdvance[];
}

export async function getCashAdvanceDetailById(id: string): Promise<{
  advance: EmployeeCashAdvance | null;
  allocations: CashAdvanceExpenseSettlement[];
  returns: CashAdvanceReturn[];
}> {
  await requirePermission(CASH_ADVANCE_PERMISSIONS.read);
  const supabase = getExpenseClient();

  const { data: advanceData, error: advanceError } = await supabase
    .from("employee_cash_advances")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (advanceError) {
    throw new Error(`Failed to load cash advance: ${advanceError.message}`);
  }
  if (!advanceData) {
    return { advance: null, allocations: [], returns: [] };
  }

  const [allocationsRes, returnsRes] = await Promise.all([
    supabase
      .from("cash_advance_expense_settlements")
      .select("*")
      .eq("cash_advance_id", id)
      .order("settled_at", { ascending: false }),
    supabase
      .from("cash_advance_returns")
      .select("*")
      .eq("cash_advance_id", id)
      .order("returned_at", { ascending: false }),
  ]);

  return {
    advance: advanceData as EmployeeCashAdvance,
    allocations: (allocationsRes.data ?? []) as CashAdvanceExpenseSettlement[],
    returns: (returnsRes.data ?? []) as CashAdvanceReturn[],
  };
}

export async function getOwnCashAdvancesList(filters?: {
  status?: string;
  limit?: number;
}): Promise<EmployeeCashAdvance[]> {
  const user = await requirePermission(CASH_ADVANCE_PERMISSIONS.readOwn);
  const supabase = getExpenseClient();

  let query = supabase
    .from("employee_cash_advances")
    .select("*")
    .eq("recipient_id", user.id)
    .order("requested_at", { ascending: false });

  if (filters?.status) {
    query = query.eq("status", filters.status);
  }
  if (filters?.limit) {
    query = query.limit(filters.limit);
  } else {
    query = query.limit(100);
  }

  const { data, error } = await query;
  if (error) {
    throw new Error(`Failed to load own cash advances: ${error.message}`);
  }

  return (data ?? []) as EmployeeCashAdvance[];
}

export async function getOwnCashAdvanceDetailById(id: string): Promise<{
  advance: EmployeeCashAdvance | null;
  allocations: CashAdvanceExpenseSettlement[];
  returns: CashAdvanceReturn[];
}> {
  const user = await requirePermission(CASH_ADVANCE_PERMISSIONS.readOwn);
  const supabase = getExpenseClient();

  const { data: advanceData, error: advanceError } = await supabase
    .from("employee_cash_advances")
    .select("*")
    .eq("id", id)
    .eq("recipient_id", user.id)
    .maybeSingle();

  if (advanceError) {
    throw new Error(`Failed to load own cash advance: ${advanceError.message}`);
  }
  if (!advanceData) {
    return { advance: null, allocations: [], returns: [] };
  }

  const [allocationsRes, returnsRes] = await Promise.all([
    supabase
      .from("cash_advance_expense_settlements")
      .select("*")
      .eq("cash_advance_id", id)
      .order("settled_at", { ascending: false }),
    supabase
      .from("cash_advance_returns")
      .select("*")
      .eq("cash_advance_id", id)
      .order("returned_at", { ascending: false }),
  ]);

  return {
    advance: advanceData as EmployeeCashAdvance,
    allocations: (allocationsRes.data ?? []) as CashAdvanceExpenseSettlement[],
    returns: (returnsRes.data ?? []) as CashAdvanceReturn[],
  };
}

export async function enrichCashAdvancesBatch(
  advances: EmployeeCashAdvance[],
): Promise<EnrichedCashAdvance[]> {
  if (advances.length === 0) return [];
  const supabase = createAdminClient();

  const serviceIds = Array.from(
    new Set(
      advances
        .map((a) => a.service_id)
        .filter((id): id is string => Boolean(id)),
    ),
  );

  const recipientIds = Array.from(
    new Set(
      advances
        .map((a) => a.recipient_id)
        .filter((id): id is string => Boolean(id)),
    ),
  );

  const [servicesRes, recipientsRes] = await Promise.all([
    serviceIds.length > 0
      ? supabase
          .from("services")
          .select("id, service_number, service_title, event_name")
          .in("id", serviceIds)
      : Promise.resolve({ data: [] }),
    recipientIds.length > 0
      ? supabase
          .from("app_users")
          .select("id, name, email")
          .in("id", recipientIds)
      : Promise.resolve({ data: [] }),
  ]);

  const serviceMap = new Map<
    string,
    { serviceNumber: string; serviceTitle: string; eventName: string | null }
  >();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  for (const s of (servicesRes.data ?? []) as any[]) {
    serviceMap.set(s.id, {
      serviceNumber: s.service_number,
      serviceTitle: s.service_title,
      eventName: s.event_name,
    });
  }

  const recipientMap = new Map<string, string>();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  for (const u of (recipientsRes.data ?? []) as any[]) {
    const displayName =
      u.name && typeof u.name === "string" && u.name.trim().length > 0
        ? u.name.trim()
        : (u.email ?? "");
    recipientMap.set(u.id, displayName);
  }

  return advances.map((a) => {
    const s = a.service_id ? serviceMap.get(a.service_id) : undefined;
    const recipientName = recipientMap.get(a.recipient_id);
    return {
      ...a,
      recipientName,
      serviceNumber: s?.serviceNumber,
      serviceTitle: s?.serviceTitle,
      eventName: s?.eventName,
    };
  });
}

export async function enrichExpenseSettlements(
  allocations: CashAdvanceExpenseSettlement[],
): Promise<EnrichedCashAdvanceExpenseSettlement[]> {
  if (allocations.length === 0) return [];
  const supabase = getExpenseClient();

  const expenseIds = Array.from(
    new Set(
      allocations
        .map((al) => al.expense_id)
        .filter((id): id is string => Boolean(id)),
    ),
  );

  if (expenseIds.length === 0) return allocations;

  const { data } = await supabase
    .from("expenses")
    .select("id, expense_number")
    .in("id", expenseIds);

  const expenseNumberMap = new Map<string, string>();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  for (const exp of (data ?? []) as any[]) {
    expenseNumberMap.set(exp.id, exp.expense_number);
  }

  return allocations.map((al) => ({
    ...al,
    expenseNumber: expenseNumberMap.get(al.expense_id),
  }));
}

export async function getPettyCashFundsList(): Promise<PettyCashFund[]> {
  await requirePermission(PETTY_CASH_PERMISSIONS.read);
  const supabase = getExpenseClient();

  const { data, error } = await supabase
    .from("petty_cash_funds")
    .select("*")
    .order("fund_name", { ascending: true });

  if (error) {
    throw new Error("Failed to load petty cash funds");
  }

  const funds = (data ?? []) as PettyCashFund[];
  if (funds.length === 0) return [];

  const custodianIds = [...new Set(funds.map((fund) => fund.custodian_id))];
  const { data: users, error: usersError } = await supabase
    .from("app_users")
    .select("id, name, email")
    .in("id", custodianIds);
  if (usersError) {
    throw new Error("Failed to load petty cash custodians");
  }
  const usersById = new Map<string, { id: string; name: string | null; email: string | null }>(
    (users ?? []).map((user: { id: string; name: string | null; email: string | null }) => [
      user.id,
      user,
    ] as [string, { id: string; name: string | null; email: string | null }]),
  );

  return funds.map((fund) => {
    const custodian = usersById.get(fund.custodian_id);
    return {
      ...fund,
      custodian_name: custodian?.name ?? custodian?.email ?? "",
      custodian_email: custodian?.email ?? "",
      last_activity_at: fund.updated_at ?? null,
    };
  });
}

export async function getPettyCashFundDetailById(id: string): Promise<{
  fund: PettyCashFund | null;
  transactions: PettyCashTransaction[];
}> {
  await requirePermission(PETTY_CASH_PERMISSIONS.read);
  const supabase = getExpenseClient();

  const { data: fundData, error: fundError } = await supabase
    .from("petty_cash_funds")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (fundError) {
    throw new Error("Failed to load petty cash fund");
  }
  if (!fundData) {
    return { fund: null, transactions: [] };
  }

  const [{ data: txData, error: txError }, { data: custodianData }] = await Promise.all([
    supabase
    .from("petty_cash_transactions")
    .select("*")
    .eq("fund_id", id)
    .order("recorded_at", { ascending: false })
    .limit(100),
    supabase
      .from("app_users")
      .select("id, name, email")
      .eq("id", fundData.custodian_id)
      .maybeSingle(),
  ]);

  if (txError) {
    throw new Error("Failed to load petty cash transactions");
  }

  const custodian = custodianData as { name: string | null; email: string | null } | null;
  return {
    fund: {
      ...(fundData as PettyCashFund),
      custodian_name: custodian?.name ?? custodian?.email ?? "",
      custodian_email: custodian?.email ?? "",
    },
    transactions: (txData ?? []) as PettyCashTransaction[],
  };
}

export async function getPettyCashCustodianOptions(): Promise<PettyCashCustodianOption[]> {
  await requirePermission(PETTY_CASH_PERMISSIONS.manage);
  const supabase = getExpenseClient();
  const { data, error } = await supabase
    .from("app_users")
    .select("id, name, email, role")
    .eq("is_active", true)
    .in("role", ["admin", "accountant"])
    .order("name", { ascending: true });
  if (error) throw new Error("Failed to load petty cash custodians");
  return (data ?? []).map((user: PettyCashCustodianOption) => ({
    id: user.id,
    name: user.name ?? user.email ?? "",
    email: user.email ?? "",
    role: user.role,
  }));
}

export async function getPettyCashExpensesByFund(
  fundId: string,
): Promise<PettyCashExpenseSummary[]> {
  const expenses = await getExpensesAccountabilityList({ pettyCashFundId: fundId, limit: 100 });
  return expenses.map((expense) => ({
    id: expense.id,
    expense_number: expense.expense_number,
    status: expense.status,
    expense_date: expense.expense_date,
    context_type: expense.context_type,
    expense_category: expense.expense_category,
    description: expense.description,
    amount: Number(expense.amount),
    finance_reviewed_at: expense.finance_reviewed_at,
    approved_at: expense.approved_at,
    petty_cash_allocated_amount: Number(expense.petty_cash_allocated_amount ?? 0),
    remaining_petty_cash_amount: Math.max(
      0,
      Number(expense.amount) - Number(expense.petty_cash_allocated_amount ?? 0),
    ),
  }));
}

export async function getLinkedCashAdvanceExpenses(
  advanceId: string,
): Promise<LinkedCashAdvanceExpense[]> {
  await requirePermission(CASH_ADVANCE_PERMISSIONS.read);
  const supabase = getExpenseClient();

  const { data, error } = await supabase.rpc("get_linked_cash_advance_expenses", {
    p_advance_id: advanceId,
  });

  if (error) {
    console.error("[getLinkedCashAdvanceExpenses] rpc_failed");
    throw new Error("Failed to load linked cash advance expenses");
  }

  return (data ?? []) as LinkedCashAdvanceExpense[];
}

export async function getOwnLinkedCashAdvanceExpenses(
  advanceId: string,
): Promise<LinkedCashAdvanceExpense[]> {
  const user = await requirePermission(CASH_ADVANCE_PERMISSIONS.readOwn);
  const supabase = getExpenseClient();

  const { data: advance, error: advErr } = await supabase
    .from("employee_cash_advances")
    .select("id")
    .eq("id", advanceId)
    .eq("recipient_id", user.id)
    .maybeSingle();

  if (advErr) {
    console.error("[getOwnLinkedCashAdvanceExpenses] advance_lookup_failed");
    throw new Error("Failed to load cash advance");
  }
  if (!advance) {
    return [];
  }

  const { data, error } = await supabase.rpc("get_linked_cash_advance_expenses", {
    p_advance_id: advanceId,
  });

  if (error) {
    console.error("[getOwnLinkedCashAdvanceExpenses] rpc_failed");
    throw new Error("Failed to load own linked cash advance expenses");
  }

  return (data ?? []) as LinkedCashAdvanceExpense[];
}

export async function getCashAdvanceBalanceSummary(
  advanceId: string,
): Promise<CashAdvanceBalanceSummary | null> {
  await requirePermission(CASH_ADVANCE_PERMISSIONS.read);
  const supabase = getExpenseClient();

  const { data, error } = await supabase.rpc("get_cash_advance_balance_summary", {
    p_advance_id: advanceId,
  });

  if (error) {
    console.error("[getCashAdvanceBalanceSummary] rpc_failed");
    throw new Error("Failed to load cash advance balance summary");
  }

  return (data?.[0] as CashAdvanceBalanceSummary) ?? null;
}

export async function getOwnCashAdvanceBalanceSummary(
  advanceId: string,
): Promise<CashAdvanceBalanceSummary | null> {
  const user = await requirePermission(CASH_ADVANCE_PERMISSIONS.readOwn);
  const supabase = getExpenseClient();

  const { data: advance, error: advErr } = await supabase
    .from("employee_cash_advances")
    .select("id")
    .eq("id", advanceId)
    .eq("recipient_id", user.id)
    .maybeSingle();

  if (advErr) {
    console.error("[getOwnCashAdvanceBalanceSummary] advance_lookup_failed");
    throw new Error("Failed to load own cash advance balance summary");
  }
  if (!advance) {
    return null;
  }

  const { data, error } = await supabase.rpc("get_cash_advance_balance_summary", {
    p_advance_id: advanceId,
  });

  if (error) {
    console.error("[getOwnCashAdvanceBalanceSummary] rpc_failed");
    throw new Error("Failed to load own cash advance balance summary");
  }

  return (data?.[0] as CashAdvanceBalanceSummary) ?? null;
}
