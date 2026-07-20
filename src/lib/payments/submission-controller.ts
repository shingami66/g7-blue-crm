export type PaymentIntent = {
  invoiceId: string;
  amount: number;
  date: string;
  method: "bank_transfer" | "cash" | "cheque" | "online";
  reference?: string;
};

export type RecordPaymentResult = {
  success: boolean;
  paymentId?: string;
  paymentNumber?: string;
  newAmountPaid?: number;
  newBalanceDue?: number;
  newStatus?: string;
  error?: string;
};

type InFlightRecord = {
  requestId: string;
  intent: string;
  promise: Promise<RecordPaymentResult>;
  status: "pending" | "success" | "failure";
};

// Module-scoped registry to persist in-flight status across modal mount/unmount lifecycles
const registry = new Map<string, InFlightRecord>();

export function getNormalizedIntentString(intent: PaymentIntent): string {
  return JSON.stringify({
    invoiceId: intent.invoiceId,
    amount: Number(intent.amount).toFixed(2),
    date: intent.date.trim(),
    method: intent.method,
    reference: intent.reference?.trim() || "",
  });
}

export function resetRegistryForTesting(): void {
  registry.clear();
}

export class PaymentSubmissionController {
  private isSubmitting: boolean = false;
  private uuidFactory: () => string;

  constructor(uuidFactory: () => string) {
    this.uuidFactory = uuidFactory;
  }

  public begin(
    intent: PaymentIntent,
    execute: (reqId: string) => Promise<RecordPaymentResult>
  ): { accepted: boolean; requestId?: string; inFlightPromise?: Promise<RecordPaymentResult> } {
    if (this.isSubmitting) {
      return { accepted: false };
    }

    const normalizedIntent = getNormalizedIntentString(intent);
    const key = `${intent.invoiceId}:${normalizedIntent}`;

    // Block any changed intent if there is an active pending request for this invoice
    for (const [recKey, record] of registry.entries()) {
      if (recKey.startsWith(`${intent.invoiceId}:`) && record.status === "pending") {
        if (recKey !== key) {
          return { accepted: false };
        }
      }
    }

    const existing = registry.get(key);
    if (existing && existing.status === "pending") {
      this.isSubmitting = true;
      return {
        accepted: true,
        requestId: existing.requestId,
        inFlightPromise: existing.promise,
      };
    }

    // Set synchronous lock
    this.isSubmitting = true;

    // Reuse request ID if retrying same failed intent, otherwise generate new
    let requestId: string;
    if (existing && existing.status === "failure") {
      requestId = existing.requestId;
    } else {
      requestId = this.uuidFactory();
    }

    const promise = execute(requestId);
    const record: InFlightRecord = {
      requestId,
      intent: normalizedIntent,
      promise,
      status: "pending",
    };
    registry.set(key, record);

    return {
      accepted: true,
      requestId,
      inFlightPromise: promise,
    };
  }

  public settleSuccess(intent: PaymentIntent): void {
    this.isSubmitting = false;
    const normalizedIntent = getNormalizedIntentString(intent);
    const key = `${intent.invoiceId}:${normalizedIntent}`;
    registry.delete(key);
  }

  public settleFailure(intent: PaymentIntent): void {
    this.isSubmitting = false;
    const normalizedIntent = getNormalizedIntentString(intent);
    const key = `${intent.invoiceId}:${normalizedIntent}`;
    const record = registry.get(key);
    if (record && record.status === "pending") {
      record.status = "failure";
    }
  }

  public reset(intent?: PaymentIntent): void {
    this.isSubmitting = false;
    if (intent) {
      const normalizedIntent = getNormalizedIntentString(intent);
      const key = `${intent.invoiceId}:${normalizedIntent}`;
      const record = registry.get(key);
      // Only delete from registry if it is not pending (resolved to success or failure)
      if (record && record.status !== "pending") {
        registry.delete(key);
      }
    }
  }
}

const SAFE_ERROR_CODES = new Set([
  "invalid_payment_input",
  "invoice_not_found",
  "invoice_not_payable",
  "payment_exceeds_balance",
  "idempotency_conflict",
  "unauthorized",
  "forbidden",
  "payment_record_failed"
]);

function isUuid(str: unknown): boolean {
  if (typeof str !== "string") return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);
}

export function mapPaymentRpcResult(data: unknown, error: unknown): RecordPaymentResult {
  if (error) {
    console.error("[recordPaymentAction] RPC error:", error);
    return { success: false, error: "payment_record_failed" };
  }

  const result = Array.isArray(data) ? data[0] : data;

  if (!result || typeof result !== "object") {
    return { success: false, error: "payment_record_failed" };
  }

  if (result.error_code !== undefined && result.error_code !== null) {
    const code = String(result.error_code);
    if (SAFE_ERROR_CODES.has(code)) {
      return { success: false, error: code };
    }
    return { success: false, error: "payment_record_failed" };
  }

  // Validate success fields strictly
  if (!isUuid(result.payment_id)) {
    return { success: false, error: "payment_record_failed" };
  }
  if (typeof result.payment_number !== "string" || result.payment_number.trim() === "") {
    return { success: false, error: "payment_record_failed" };
  }
  if (typeof result.amount_paid !== "number" || !Number.isFinite(result.amount_paid)) {
    return { success: false, error: "payment_record_failed" };
  }
  if (typeof result.balance_due !== "number" || !Number.isFinite(result.balance_due)) {
    return { success: false, error: "payment_record_failed" };
  }
  if (typeof result.invoice_status !== "string" || result.invoice_status.trim() === "") {
    return { success: false, error: "payment_record_failed" };
  }

  return {
    success: true,
    paymentId: result.payment_id,
    paymentNumber: result.payment_number,
    newAmountPaid: result.amount_paid,
    newBalanceDue: result.balance_due,
    newStatus: result.invoice_status,
  };
}
