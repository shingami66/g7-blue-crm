import { checkPermission } from "@/lib/auth/permissions";
import { CASH_ADVANCE_PERMISSIONS } from "@/lib/auth/role-permissions";
import {
  getCashAdvanceDetailById,
  getOwnCashAdvanceDetailById,
  enrichCashAdvancesBatch,
  enrichExpenseSettlements,
} from "@/lib/expenses/queries";
import { createAdminClient } from "@/lib/supabase/admin";
import type {
  EmployeeCashAdvance,
  CashAdvanceExpenseSettlement,
  CashAdvanceReturn,
} from "@/lib/expenses/types";
import AdvanceDetailClient from "./AdvanceDetailClient";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function CashAdvanceDetailPage({ params }: PageProps) {
  const { id } = await params;

  const [canReadOwn, canReadBroad] = await Promise.all([
    checkPermission(CASH_ADVANCE_PERMISSIONS.readOwn),
    checkPermission(CASH_ADVANCE_PERMISSIONS.read),
  ]);

  const canRead = canReadOwn || canReadBroad;
  if (!canRead) {
    return (
      <AdvanceDetailClient
        canRead={false}
        advance={null}
        allocations={[]}
        returns={[]}
      />
    );
  }

  let detailData: {
    advance: EmployeeCashAdvance | null;
    allocations: CashAdvanceExpenseSettlement[];
    returns: CashAdvanceReturn[];
  } = { advance: null, allocations: [], returns: [] };

  try {
    if (canReadBroad) {
      detailData = await getCashAdvanceDetailById(id);
    } else if (canReadOwn) {
      detailData = await getOwnCashAdvanceDetailById(id);
    }
  } catch {
    detailData = { advance: null, allocations: [], returns: [] };
  }

  if (!detailData.advance) {
    return (
      <AdvanceDetailClient
        canRead={true}
        advance={null}
        allocations={[]}
        returns={[]}
      />
    );
  }

  const [enrichedAdvances, enrichedAllocations] = await Promise.all([
    enrichCashAdvancesBatch([detailData.advance]),
    enrichExpenseSettlements(detailData.allocations),
  ]);

  const advance = enrichedAdvances[0] ?? null;

  // Resolve actor names safely via batched app_users lookup
  const actorIds = Array.from(
    new Set(
      [
        detailData.advance.requested_by,
        detailData.advance.approved_by,
        detailData.advance.issued_by,
        detailData.advance.rejected_by,
        detailData.advance.cancelled_by,
      ].filter((val): val is string => Boolean(val)),
    ),
  );

  const actorMap = new Map<string, string>();
  if (actorIds.length > 0) {
    try {
      const supabase = createAdminClient();
      const { data: actorUsers } = await supabase
        .from("app_users")
        .select("id, name, email")
        .in("id", actorIds);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      for (const u of (actorUsers ?? []) as any[]) {
        const name =
          u.name && typeof u.name === "string" && u.name.trim().length > 0
            ? u.name.trim()
            : (u.email ?? "");
        actorMap.set(u.id, name);
      }
    } catch {
      // Degrade gracefully if user lookup fails
    }
  }

  return (
    <AdvanceDetailClient
      canRead={true}
      advance={advance}
      allocations={enrichedAllocations}
      returns={detailData.returns}
      requesterName={actorMap.get(detailData.advance.requested_by)}
      approverName={
        detailData.advance.approved_by
          ? actorMap.get(detailData.advance.approved_by)
          : null
      }
      issuerName={
        detailData.advance.issued_by
          ? actorMap.get(detailData.advance.issued_by)
          : null
      }
      rejecterName={
        detailData.advance.rejected_by
          ? actorMap.get(detailData.advance.rejected_by)
          : null
      }
      cancellerName={
        detailData.advance.cancelled_by
          ? actorMap.get(detailData.advance.cancelled_by)
          : null
      }
    />
  );
}
