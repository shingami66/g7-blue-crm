import "server-only";

import { requirePermission } from "@/lib/auth/permissions";
import { createAdminClient } from "@/lib/supabase/admin";
import type { RecordNavigationState } from "@/components/records/RecordNavigation";

type Candidate = { id: string };
type SupplierCandidate = { id: string; is_preferred: boolean; name: string };
type SupplierQueryResult = { data: unknown[] | null };
type SupplierQueryBuilder = {
  eq: (column: string, value: string | boolean) => SupplierQueryBuilder;
  gt: (column: string, value: string) => SupplierQueryBuilder;
  lt: (column: string, value: string) => SupplierQueryBuilder;
  order: (column: string, options: { ascending: boolean }) => SupplierQueryBuilder;
  limit: (count: number) => SupplierQueryBuilder;
};

function candidateId(data: Candidate[] | null | undefined): string | null {
  return data?.[0]?.id ?? null;
}

async function finishNavigation(loaders: {
  first: () => Promise<Candidate[]>;
  previous: () => Promise<Candidate[]>;
  next: () => Promise<Candidate[]>;
  last: () => Promise<Candidate[]>;
}): Promise<RecordNavigationState> {
  const [first, previous, next, last] = await Promise.all([
    loaders.first(),
    loaders.previous(),
    loaders.next(),
    loaders.last(),
  ]);
  return {
    first: candidateId(first),
    previous: candidateId(previous),
    next: candidateId(next),
    last: candidateId(last),
  };
}

export async function getCustomerRecordNavigation(id: string, customerNumber: string): Promise<RecordNavigationState> {
  await requirePermission("customers:read");
  const supabase = createAdminClient();
  const base = () => supabase.from("customers").select("id").eq("is_deleted", false);
  return finishNavigation({
    first: async () => { const { data } = await base().order("customer_number", { ascending: true }).order("id", { ascending: true }).limit(1); return (data ?? []) as Candidate[]; },
    last: async () => { const { data } = await base().order("customer_number", { ascending: false }).order("id", { ascending: false }).limit(1); return (data ?? []) as Candidate[]; },
    previous: async () => { const { data } = await base().lt("customer_number", customerNumber).order("customer_number", { ascending: false }).order("id", { ascending: false }).limit(1); return (data ?? []) as Candidate[]; },
    next: async () => { const { data } = await base().gt("customer_number", customerNumber).order("customer_number", { ascending: true }).order("id", { ascending: true }).limit(1); return (data ?? []) as Candidate[]; },
  }).then((navigation) => ({ ...navigation, first: navigation.first === id ? null : navigation.first, last: navigation.last === id ? null : navigation.last }));
}

export async function getServiceRecordNavigation(id: string, serviceNumber: string): Promise<RecordNavigationState> {
  await requirePermission("services:read");
  const supabase = createAdminClient();
  const base = () => supabase.from("services").select("id").is("deleted_at", null);
  const navigation = await finishNavigation({
    first: async () => { const { data } = await base().order("service_number", { ascending: true }).order("id", { ascending: true }).limit(1); return (data ?? []) as Candidate[]; },
    last: async () => { const { data } = await base().order("service_number", { ascending: false }).order("id", { ascending: false }).limit(1); return (data ?? []) as Candidate[]; },
    previous: async () => { const { data } = await base().lt("service_number", serviceNumber).order("service_number", { ascending: false }).order("id", { ascending: false }).limit(1); return (data ?? []) as Candidate[]; },
    next: async () => { const { data } = await base().gt("service_number", serviceNumber).order("service_number", { ascending: true }).order("id", { ascending: true }).limit(1); return (data ?? []) as Candidate[]; },
  });
  return { ...navigation, first: navigation.first === id ? null : navigation.first, last: navigation.last === id ? null : navigation.last };
}

export async function getQuotationRecordNavigation(id: string, quotationNumber: string): Promise<RecordNavigationState> {
  await requirePermission("quotations:read");
  const supabase = createAdminClient();
  const base = () => supabase.from("quotations").select("id").eq("is_deleted", false);
  const navigation = await finishNavigation({
    first: async () => { const { data } = await base().order("quotation_number", { ascending: true }).order("created_at", { ascending: true }).order("id", { ascending: true }).limit(1); return (data ?? []) as Candidate[]; },
    last: async () => { const { data } = await base().order("quotation_number", { ascending: false }).order("created_at", { ascending: false }).order("id", { ascending: false }).limit(1); return (data ?? []) as Candidate[]; },
    previous: async () => { const { data } = await base().lt("quotation_number", quotationNumber).order("quotation_number", { ascending: false }).order("created_at", { ascending: false }).order("id", { ascending: false }).limit(1); return (data ?? []) as Candidate[]; },
    next: async () => { const { data } = await base().gt("quotation_number", quotationNumber).order("quotation_number", { ascending: true }).order("created_at", { ascending: true }).order("id", { ascending: true }).limit(1); return (data ?? []) as Candidate[]; },
  });
  return { ...navigation, first: navigation.first === id ? null : navigation.first, last: navigation.last === id ? null : navigation.last };
}

export async function getInvoiceRecordNavigation(id: string, invoiceNumber: string): Promise<RecordNavigationState> {
  await requirePermission("invoices:read");
  const supabase = createAdminClient();
  const base = () => supabase.from("invoices").select("id").eq("is_deleted", false);
  const navigation = await finishNavigation({
    first: async () => { const { data } = await base().order("invoice_number", { ascending: true }).order("created_at", { ascending: true }).order("id", { ascending: true }).limit(1); return (data ?? []) as Candidate[]; },
    last: async () => { const { data } = await base().order("invoice_number", { ascending: false }).order("created_at", { ascending: false }).order("id", { ascending: false }).limit(1); return (data ?? []) as Candidate[]; },
    previous: async () => { const { data } = await base().lt("invoice_number", invoiceNumber).order("invoice_number", { ascending: false }).order("created_at", { ascending: false }).order("id", { ascending: false }).limit(1); return (data ?? []) as Candidate[]; },
    next: async () => { const { data } = await base().gt("invoice_number", invoiceNumber).order("invoice_number", { ascending: true }).order("created_at", { ascending: true }).order("id", { ascending: true }).limit(1); return (data ?? []) as Candidate[]; },
  });
  return { ...navigation, first: navigation.first === id ? null : navigation.first, last: navigation.last === id ? null : navigation.last };
}

export async function getSupplierRecordNavigation(id: string, supplier: { isPreferred: boolean; name: string }, includeDeleted = false): Promise<RecordNavigationState> {
  await requirePermission("suppliers:read");
  if (includeDeleted) await requirePermission("suppliers:delete");
  const supabase = createAdminClient();
  const base = () => {
    const query = supabase.from("suppliers").select("id, is_preferred, name").eq("is_deleted", includeDeleted);
    return includeDeleted ? query : query.is("deleted_at", null);
  };
  const navigation = await finishNavigation({
    first: async () => { const { data } = await base().order("is_preferred", { ascending: false }).order("name", { ascending: true }).order("id", { ascending: true }).limit(1); return (data ?? []) as Candidate[]; },
    last: async () => { const { data } = await base().order("is_preferred", { ascending: true }).order("name", { ascending: false }).order("id", { ascending: false }).limit(1); return (data ?? []) as Candidate[]; },
    previous: () => getSupplierNeighbor(() => base() as unknown as SupplierQueryBuilder, id, supplier, "previous"),
    next: () => getSupplierNeighbor(() => base() as unknown as SupplierQueryBuilder, id, supplier, "next"),
  });
  return { ...navigation, first: navigation.first === id ? null : navigation.first, last: navigation.last === id ? null : navigation.last };
}

function compareSupplierCandidates(a: SupplierCandidate, b: SupplierCandidate): number {
  if (a.is_preferred !== b.is_preferred) return a.is_preferred ? -1 : 1;
  const nameCompare = a.name.localeCompare(b.name);
  return nameCompare || a.id.localeCompare(b.id);
}

async function getSupplierNeighbor(
  base: () => SupplierQueryBuilder,
  id: string,
  supplier: { isPreferred: boolean; name: string },
  direction: "previous" | "next",
): Promise<Candidate[]> {
  const ascending = direction === "next";
  const comparison = ascending ? "gt" : "lt";
  const sameGroupName = (comparison === "gt"
    ? base().eq("is_preferred", supplier.isPreferred).eq("name", supplier.name).gt("id", id)
    : base().eq("is_preferred", supplier.isPreferred).eq("name", supplier.name).lt("id", id))
    .order("id", { ascending })
    .limit(1);
  const sameGroupLaterName = (comparison === "gt"
    ? base().eq("is_preferred", supplier.isPreferred).gt("name", supplier.name)
    : base().eq("is_preferred", supplier.isPreferred).lt("name", supplier.name))
    .order("name", { ascending })
    .order("id", { ascending })
    .limit(1);
  const crossGroup = supplier.isPreferred === ascending
    ? base()
      .eq("is_preferred", !supplier.isPreferred)
      .order("name", { ascending })
      .order("id", { ascending })
      .limit(1)
    : null;

  const execute = async (query: SupplierQueryBuilder): Promise<SupplierQueryResult> =>
    (await (query as unknown as PromiseLike<SupplierQueryResult>));
  const results: SupplierQueryResult[] = await Promise.all([
    execute(sameGroupName),
    execute(sameGroupLaterName),
    crossGroup ? execute(crossGroup) : Promise.resolve({ data: [] }),
  ]);
  const candidates = results.flatMap((result) => (result.data ?? []) as SupplierCandidate[]);
  const ordered = candidates.sort(compareSupplierCandidates);
  const selected = ascending ? ordered[0] : ordered[ordered.length - 1];
  return selected ? [{ id: selected.id }] : [];
}

export function safeRecordReturnTo(value: unknown, fallback: string): string {
  if (typeof value !== "string" || !value.startsWith("/") || value.startsWith("//") || /[\r\n]/.test(value)) return fallback;
  const allowed = ["/customers", "/services", "/quotations", "/invoices", "/suppliers"];
  return allowed.some((prefix) => value === prefix || value.startsWith(`${prefix}?`)) ? value : fallback;
}
