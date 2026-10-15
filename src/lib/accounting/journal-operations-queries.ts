import "server-only";

import { z } from "zod";
import { AuthDependencyError } from "@/lib/auth/errors";
import { requirePermission } from "@/lib/auth/permissions";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAccountingProfile } from "./queries";

const pageSize = 50;
const cursorSchema = z.object({
  created_at: z.string().datetime({ offset: true }),
  id: z.string().uuid(),
}).strict();

const journalSummarySchema = z.object({
  version: z.number().int().positive(),
  status: z.enum(["DRAFT", "POSTED"]),
  accounting_date: z.string(),
  source_domain: z.enum(["CONTROLLED_MANUAL", "INCEPTION", "AR_BRIDGE", "AP_BRIDGE", "EXPENSE_BRIDGE", "REVENUE_RECOGNITION"]),
  source_record_key: z.string(),
  economic_event_key: z.string(),
  posting_purpose: z.string(),
  description_en: z.string(),
  description_ar: z.string(),
  prepared_by: z.string().uuid(),
  prepared_at: z.string(),
  posted_by: z.string().uuid().nullable(),
  posted_at: z.string().nullable(),
  period_id: z.string().uuid(),
  period_version: z.number().int().positive(),
  posting_rule_id: z.string().uuid(),
  rule_version: z.number().int().positive(),
  reason: z.string(),
  evidence_ref: z.string().nullable(),
  currency: z.literal("SAR"),
}).strict();

const journalRowSchema = z.object({
  id: z.string().uuid(),
  profile_id: z.string().uuid(),
  current_version: z.number().int().positive(),
  correction_group_id: z.string().uuid(),
  reversal_of_journal_id: z.string().uuid().nullable(),
  created_at: z.string().datetime({ offset: true }),
  current: z.union([journalSummarySchema, z.array(journalSummarySchema).length(1)]),
}).strict();

export type AccountingJournalListItem = {
  journal_id: string;
  profile_id: string;
  current_version: number;
  correction_group_id: string;
  reversal_of_journal_id: string | null;
  created_at: string;
  current: z.infer<typeof journalSummarySchema>;
};

function encodeCursor(value: { created_at: string; id: string }): string {
  return Buffer.from(JSON.stringify(value), "utf8").toString("base64url");
}

function decodeCursor(value: string | null | undefined) {
  if (!value) return null;
  if (value.length > 512) throw new AuthDependencyError("Accounting journal page request was invalid");
  try {
    const parsed = cursorSchema.safeParse(JSON.parse(Buffer.from(value, "base64url").toString("utf8")));
    if (!parsed.success) throw new Error("invalid cursor");
    return parsed.data;
  } catch {
    throw new AuthDependencyError("Accounting journal page request was invalid");
  }
}

export async function listAccountingJournals(cursorValue?: string | null): Promise<{
  items: AccountingJournalListItem[];
  nextCursor: string | null;
}> {
  await requirePermission("accounting:view");
  const profile = await getAccountingProfile();
  if ("state" in profile) throw new AuthDependencyError("Accounting journal profile is unavailable");
  const cursor = decodeCursor(cursorValue);

  let result;
  try {
    let query = createAdminClient()
      .from("accounting_journals")
      .select("id,profile_id,current_version,correction_group_id,reversal_of_journal_id,created_at,current:accounting_journal_versions!accounting_journals_current_version_fkey(version,status,accounting_date,source_domain,source_record_key,economic_event_key,posting_purpose,description_en,description_ar,prepared_by,prepared_at,posted_by,posted_at,period_id,period_version,posting_rule_id,rule_version,reason,evidence_ref,currency)")
      .eq("profile_id", profile.id)
      .order("created_at", { ascending: false })
      .order("id", { ascending: false })
      .limit(pageSize + 1);
    if (cursor) {
      query = query.or(
        "created_at.lt." + cursor.created_at + ",and(created_at.eq." + cursor.created_at + ",id.lt." + cursor.id + ")",
      );
    }
    result = await query;
  } catch {
    throw new AuthDependencyError("Accounting journal list dependency failed");
  }
  if (result.error || !Array.isArray(result.data)) {
    throw new AuthDependencyError("Accounting journal list dependency failed");
  }
  const parsedRows = z.array(journalRowSchema).safeParse(result.data);
  if (!parsedRows.success) throw new AuthDependencyError("Accounting journal list response was invalid");

  const hasMore = parsedRows.data.length > pageSize;
  const page = parsedRows.data.slice(0, pageSize).map((row) => {
    const current = Array.isArray(row.current) ? row.current[0]! : row.current;
    if (current.version !== row.current_version) {
      throw new AuthDependencyError("Accounting journal list response was inconsistent");
    }
    return {
      journal_id: row.id,
      profile_id: row.profile_id,
      current_version: row.current_version,
      correction_group_id: row.correction_group_id,
      reversal_of_journal_id: row.reversal_of_journal_id,
      created_at: row.created_at,
      current,
    };
  });
  const last = page.at(-1);
  return {
    items: page,
    nextCursor: hasMore && last ? encodeCursor({ created_at: last.created_at, id: last.journal_id }) : null,
  };
}

export async function getAccountingJournalReversalId(journalId: string): Promise<string | null> {
  await requirePermission("accounting:view");
  const profile = await getAccountingProfile();
  if ("state" in profile) throw new AuthDependencyError("Accounting journal profile is unavailable");
  const parsedId = z.string().uuid().safeParse(journalId);
  if (!parsedId.success) throw new AuthDependencyError("Accounting journal request was invalid");

  let result;
  try {
    result = await createAdminClient()
      .from("accounting_journals")
      .select("id")
      .eq("profile_id", profile.id)
      .eq("reversal_of_journal_id", parsedId.data)
      .limit(1);
  } catch {
    throw new AuthDependencyError("Accounting journal reversal dependency failed");
  }
  if (result.error || !Array.isArray(result.data)) {
    throw new AuthDependencyError("Accounting journal reversal dependency failed");
  }
  const parsed = z.array(z.object({ id: z.string().uuid() }).strict()).safeParse(result.data);
  if (!parsed.success) throw new AuthDependencyError("Accounting journal reversal response was invalid");
  return parsed.data[0]?.id ?? null;
}

export type AccountingServiceDimension = {
  id: string;
  service_number: string;
  service_title: string;
  event_name: string | null;
  event_type: string | null;
};

export async function findAccountingServiceByNumber(serviceNumber: string): Promise<AccountingServiceDimension | null> {
  await requirePermission("accounting:view");
  await requirePermission("services:read");
  const normalized = serviceNumber.trim().toUpperCase();
  if (!/^[A-Z0-9][A-Z0-9-]{1,39}$/.test(normalized)) {
    throw new AuthDependencyError("Accounting service request was invalid");
  }

  let result;
  try {
    result = await createAdminClient()
      .from("services")
      .select("id,service_number,service_title,event_name,event_type")
      .eq("service_number", normalized)
      .is("deleted_at", null)
      .limit(2);
  } catch {
    throw new AuthDependencyError("Accounting service dependency failed");
  }
  if (result.error || !Array.isArray(result.data)) {
    throw new AuthDependencyError("Accounting service dependency failed");
  }
  const rows = z.array(z.object({
    id: z.string().uuid(),
    service_number: z.string().min(1).max(40),
    service_title: z.string().min(1).max(300),
    event_name: z.string().nullable(),
    event_type: z.string().nullable(),
  }).strict()).safeParse(result.data);
  if (!rows.success || rows.data.length > 1) {
    throw new AuthDependencyError("Accounting service response was invalid");
  }
  return rows.data[0] ?? null;
}
