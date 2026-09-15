import type { Locale } from "../locales";

export interface SupplierAdvancesDictionary {
  locale: Locale;
  title: string;
  subtitle: string;
  authorizeAdvance: string;
  backToList: string;
  fields: {
    advanceNumber: string;
    commitment: string;
    supplier: string;
    service: string;
    source: string;
    authorizedAmount: string;
    authorized: string;
    paid: string;
    allocated: string;
    refunded: string;
    reversed: string;
    remaining: string;
    commitmentOpen: string;
    reserved: string;
    availableCapacity: string;
    reason: string;
    authorizationAudit: string;
    authorizedBy: string;
    authorizedAt: string;
    paymentHistory: string;
    paymentDate: string;
    amount: string;
    method: string;
    reference: string;
    notes: string;
    evidence: string;
    recordedBy: string;
    recordedAt: string;
    status: string;
    bill: string;
    invoiceNumber: string;
    payable: string;
    outstanding: string;
    allocationHistory: string;
    refundHistory: string;
    refundDate: string;
    reversalAudit: string;
    reversalReason: string;
    reversedAt: string;
    reversedBy: string;
    correctedAt: string;
    correctedBy: string;
    bankName: string;
    accountName: string;
    ibanSnapshot: string;
    noActivity: string;
  };
  columns: {
    advance: string;
    supplier: string;
    service: string;
    date: string;
    amount: string;
    status: string;
    actions: string;
  };
  methods: Record<string, string>;
  statuses: Record<string, string>;
  sources: Record<string, string>;
  actions: {
    view: string;
    save: string;
    cancel: string;
    recordPayment: string;
    allocate: string;
    refund: string;
    reversePayment: string;
    correctAllocation: string;
    confirm: string;
    openDocument: string;
  };
  forms: {
    selectCommitment: string;
    authorizationEvidence: string;
    paymentEvidence: string;
    refundEvidence: string;
    selectMethod: string;
    referenceHelp: string;
    bankDetailsNotice: string;
    selectBill: string;
    reversalReason: string;
    refundReason: string;
  };
  states: {
    accessDenied: string;
    loadError: string;
    empty: string;
    notFound: string;
    noCommitments: string;
    noBills: string;
    unknownUser: string;
  };
  notices: {
    authorized: string;
    paid: string;
    allocated: string;
    refunded: string;
    reversed: string;
    allocationCorrected: string;
  };
  errors: Record<string, string>;
}

const errorsEn: Record<string, string> = {
  supplier_advance_request_invalid: "Complete the Supplier Advance details with valid values.",
  supplier_advance_permission_denied: "You are not authorized for this Supplier Advance action.",
  supplier_advance_commitment_not_found: "The approved commitment was not found.",
  supplier_advance_commitment_not_eligible: "Only an open approved commitment can authorize an advance.",
  supplier_advance_commitment_mismatch: "The commitment does not match the supplier and Event / Service.",
  supplier_advance_currency_mismatch: "The advance currency must match the approved commitment.",
  supplier_advance_ceiling_exceeded: "The requested authorization exceeds the remaining commitment capacity.",
  supplier_advance_evidence_required: "Attach the required evidence before continuing.",
  supplier_advance_supplier_not_found: "The supplier is no longer available.",
  supplier_advance_request_conflict: "This request was already used for different details.",
  supplier_advance_not_found: "Supplier Advance not found.",
  supplier_advance_payment_exceeds_authorized: "The payment cannot exceed the unpaid authorized amount.",
  supplier_advance_bank_details_required: "The supplier's stored bank details are incomplete.",
  supplier_advance_bill_not_found: "The Supplier Bill was not found.",
  supplier_advance_bill_not_approved: "An advance can only be allocated to an approved Supplier Bill.",
  supplier_advance_allocation_mismatch: "The Supplier Bill does not match this advance's supplier, service, commitment, and currency.",
  supplier_advance_allocation_exceeds_unallocated: "The allocation exceeds the available unallocated advance.",
  supplier_advance_allocation_exceeds_outstanding: "The allocation exceeds the Supplier Bill's outstanding balance.",
  supplier_advance_refund_exceeds_unallocated: "The refund exceeds the unallocated advance balance.",
  supplier_advance_payment_not_found: "The advance payment was not found.",
  supplier_advance_payment_already_reversed: "This advance payment has already been reversed.",
  supplier_advance_payment_reverse_unavailable: "Reverse or correct related allocations and refunds before reversing this payment.",
  supplier_advance_allocation_not_found: "The advance allocation was not found.",
  supplier_advance_allocation_already_corrected: "This advance allocation has already been corrected.",
  supplier_advance_commitment_capacity_changed: "The commitment no longer has enough open capacity to restore this allocation.",
  supplier_advance_record_failed: "The Supplier Advance could not be authorized.",
  supplier_advance_payment_failed: "The advance payment could not be recorded.",
  supplier_advance_allocation_failed: "The advance could not be allocated.",
  supplier_advance_refund_failed: "The Supplier Advance refund could not be recorded.",
  supplier_advance_reversal_failed: "The advance payment could not be reversed.",
  supplier_advance_correction_failed: "The advance allocation could not be corrected.",
  supplier_advance_document_failed: "The private evidence document could not be opened.",
};

const errorsAr: Record<string, string> = {
  supplier_advance_request_invalid: "أكمل بيانات السلفة بقيم صحيحة.",
  supplier_advance_permission_denied: "لا تملك الصلاحية لتنفيذ هذا الإجراء على سلفة المورد.",
  supplier_advance_commitment_not_found: "لم يتم العثور على الالتزام المالي المعتمد.",
  supplier_advance_commitment_not_eligible: "لا يمكن اعتماد السلفة إلا على التزام مفتوح ومعتمد.",
  supplier_advance_commitment_mismatch: "الالتزام لا يطابق المورد والفعالية أو الخدمة.",
  supplier_advance_currency_mismatch: "يجب أن تطابق عملة السلفة عملة الالتزام المعتمد.",
  supplier_advance_ceiling_exceeded: "يتجاوز مبلغ الاعتماد سعة الالتزام المتبقية.",
  supplier_advance_evidence_required: "أرفق المستند المطلوب قبل المتابعة.",
  supplier_advance_supplier_not_found: "لم يعد المورد متاحًا.",
  supplier_advance_request_conflict: "تم استخدام هذا الطلب لبيانات مختلفة.",
  supplier_advance_not_found: "لم يتم العثور على سلفة المورد.",
  supplier_advance_payment_exceeds_authorized: "لا يجوز أن تتجاوز الدفعة المبلغ المعتمد غير المدفوع.",
  supplier_advance_bank_details_required: "بيانات البنك المحفوظة للمورد غير مكتملة.",
  supplier_advance_bill_not_found: "لم يتم العثور على فاتورة المورد.",
  supplier_advance_bill_not_approved: "لا يمكن تخصيص السلفة إلا لفاتورة مورد معتمدة.",
  supplier_advance_allocation_mismatch: "لا تطابق فاتورة المورد بيانات المورد والفعالية والالتزام والعملة لهذه السلفة.",
  supplier_advance_allocation_exceeds_unallocated: "يتجاوز التخصيص رصيد السلفة غير المخصص.",
  supplier_advance_allocation_exceeds_outstanding: "يتجاوز التخصيص الرصيد المستحق على فاتورة المورد.",
  supplier_advance_refund_exceeds_unallocated: "يتجاوز الاسترداد رصيد السلفة غير المخصص.",
  supplier_advance_payment_not_found: "لم يتم العثور على دفعة السلفة.",
  supplier_advance_payment_already_reversed: "تم عكس دفعة السلفة هذه بالفعل.",
  supplier_advance_payment_reverse_unavailable: "عالج التخصيصات أو المبالغ المستردة المرتبطة قبل عكس هذه الدفعة.",
  supplier_advance_allocation_not_found: "لم يتم العثور على تخصيص السلفة.",
  supplier_advance_allocation_already_corrected: "تم تصحيح تخصيص السلفة هذا بالفعل.",
  supplier_advance_commitment_capacity_changed: "لم تعد سعة الالتزام المفتوحة كافية لإعادة هذا التخصيص.",
  supplier_advance_record_failed: "تعذر اعتماد سلفة المورد.",
  supplier_advance_payment_failed: "تعذر تسجيل دفعة السلفة.",
  supplier_advance_allocation_failed: "تعذر تخصيص السلفة.",
  supplier_advance_refund_failed: "تعذر تسجيل المبلغ المسترد من سلفة المورد.",
  supplier_advance_reversal_failed: "تعذر عكس دفعة السلفة.",
  supplier_advance_correction_failed: "تعذر تصحيح تخصيص السلفة.",
  supplier_advance_document_failed: "تعذر فتح مستند التأييد الخاص.",
};

const base: Omit<SupplierAdvancesDictionary, "locale"> = {
  title: "Supplier Advances",
  subtitle: "Authorized supplier advances kept separate from Supplier Bills and Supplier Payments.",
  authorizeAdvance: "Authorize Advance",
  backToList: "Back to Supplier Advances",
  fields: {
    advanceNumber: "Advance Number", commitment: "Approved Commitment", supplier: "Supplier", service: "Event / Service", source: "Commitment Source",
    authorizedAmount: "Authorized Amount", authorized: "Authorized", paid: "Advance Paid", allocated: "Allocated to Bills", refunded: "Refunded", reversed: "Reversed", remaining: "Unallocated Balance",
    commitmentOpen: "Open Commitment", reserved: "Reserved by Advances", availableCapacity: "Available Authorization Capacity", reason: "Authorization Reason", authorizationAudit: "Authorization", authorizedBy: "Authorized By", authorizedAt: "Authorized At",
    paymentHistory: "Advance Payments", paymentDate: "Payment Date", amount: "Amount", method: "Method", reference: "Reference", notes: "Notes", evidence: "Evidence", recordedBy: "Recorded By", recordedAt: "Recorded At", status: "Status", bill: "Supplier Bill", invoiceNumber: "Supplier Invoice Number", payable: "Payable", outstanding: "Outstanding", allocationHistory: "Bill Allocations", refundHistory: "Supplier Refunds", refundDate: "Refund Date", reversalAudit: "Correction Reversal", reversalReason: "Reason", reversedAt: "Reversed At", reversedBy: "Reversed By", correctedAt: "Corrected At", correctedBy: "Corrected By", bankName: "Bank", accountName: "Account Name", ibanSnapshot: "IBAN at Payment Time", noActivity: "No activity recorded yet.",
  },
  columns: { advance: "Advance", supplier: "Supplier", service: "Event / Service", date: "Authorized", amount: "Authorized Amount", status: "Status", actions: "Actions" },
  methods: { bank_transfer: "Bank transfer", cash: "Cash", cheque: "Cheque" },
  statuses: { authorized: "Authorized", partially_paid: "Partially paid", paid: "Paid", recorded: "Recorded", reversed: "Reversed", allocated: "Allocated", corrected: "Corrected" },
  sources: { purchase_order: "Purchase order", approved_contract: "Approved contract", supplier_quotation: "Supplier quotation", other_authorized: "Other authorized commitment" },
  actions: { view: "View advance", save: "Save", cancel: "Cancel", recordPayment: "Record Advance Payment", allocate: "Allocate to Bill", refund: "Record Refund", reversePayment: "Reverse Payment", correctAllocation: "Correct Allocation", confirm: "Confirm", openDocument: "Open document" },
  forms: { selectCommitment: "Select an eligible approved commitment", authorizationEvidence: "Authorization evidence", paymentEvidence: "Payment evidence", refundEvidence: "Refund evidence", selectMethod: "Select payment method", referenceHelp: "Bank transfer and cheque require a reference.", bankDetailsNotice: "Bank transfers use the supplier's stored details; bank details cannot be entered here.", selectBill: "Select an approved Supplier Bill", reversalReason: "Explain why this payment is being reversed.", refundReason: "Describe the supplier refund and its reason." },
  states: { accessDenied: "Access denied", loadError: "Supplier Advances could not be loaded.", empty: "No Supplier Advances recorded yet.", notFound: "Supplier Advance not found.", noCommitments: "No open commitment has remaining authorization capacity.", noBills: "No matching approved Supplier Bills have an outstanding balance.", unknownUser: "Unavailable" },
  notices: { authorized: "Supplier Advance authorized.", paid: "Advance payment recorded.", allocated: "Advance allocated to Supplier Bill.", refunded: "Supplier refund recorded.", reversed: "Advance payment reversed.", allocationCorrected: "Advance allocation corrected." },
  errors: errorsEn,
};

export const supplierAdvancesDictionaryEn: SupplierAdvancesDictionary = { locale: "en", ...base };
export const supplierAdvancesDictionaryAr: SupplierAdvancesDictionary = {
  locale: "ar",
  ...base,
  title: "سلف الموردين",
  subtitle: "سلف الموردين المعتمدة منفصلة عن فواتير الموردين ومدفوعاتهم.",
  authorizeAdvance: "اعتماد سلفة",
  backToList: "العودة إلى سلف الموردين",
  fields: {
    advanceNumber: "رقم السلفة", commitment: "الالتزام المالي المعتمد", supplier: "المورد", service: "الفعالية / الخدمة", source: "مصدر الالتزام",
    authorizedAmount: "المبلغ المعتمد", authorized: "المعتمد", paid: "السلفة المدفوعة", allocated: "المخصص للفواتير", refunded: "المسترد", reversed: "المعكوس", remaining: "الرصيد غير المخصص",
    commitmentOpen: "الالتزام المفتوح", reserved: "محجوز للسلف", availableCapacity: "سعة الاعتماد المتاحة", reason: "سبب اعتماد السلفة", authorizationAudit: "الاعتماد", authorizedBy: "اعتمدها", authorizedAt: "تاريخ الاعتماد",
    paymentHistory: "دفعات السلفة", paymentDate: "تاريخ الدفع", amount: "المبلغ", method: "طريقة الدفع", reference: "المرجع", notes: "ملاحظات", evidence: "مستند التأييد", recordedBy: "سجلها", recordedAt: "تاريخ التسجيل", status: "الحالة", bill: "فاتورة المورد", invoiceNumber: "رقم فاتورة المورد", payable: "المستحق", outstanding: "المتبقي", allocationHistory: "تخصيصات الفواتير", refundHistory: "المبالغ المستردة من المورد", refundDate: "تاريخ الاسترداد", reversalAudit: "عكس التصحيح", reversalReason: "السبب", reversedAt: "تاريخ العكس", reversedBy: "عكسها", correctedAt: "تاريخ التصحيح", correctedBy: "صححها", bankName: "البنك", accountName: "اسم الحساب", ibanSnapshot: "IBAN وقت الدفع", noActivity: "لا توجد حركات مسجلة بعد.",
  },
  columns: { advance: "السلفة", supplier: "المورد", service: "الفعالية / الخدمة", date: "تاريخ الاعتماد", amount: "المبلغ المعتمد", status: "الحالة", actions: "الإجراءات" },
  methods: { bank_transfer: "تحويل بنكي", cash: "نقدًا", cheque: "شيك" },
  statuses: { authorized: "معتمدة", partially_paid: "مدفوعة جزئيًا", paid: "مدفوعة", recorded: "مسجلة", reversed: "معكوسة", allocated: "مخصصة", corrected: "مصححة" },
  sources: { purchase_order: "أمر شراء", approved_contract: "عقد معتمد", supplier_quotation: "عرض سعر المورد", other_authorized: "التزام معتمد آخر" },
  actions: { view: "عرض السلفة", save: "حفظ", cancel: "إلغاء", recordPayment: "تسجيل دفعة سلفة", allocate: "تخصيص لفاتورة", refund: "تسجيل مبلغ مسترد", reversePayment: "عكس الدفعة", correctAllocation: "تصحيح التخصيص", confirm: "تأكيد", openDocument: "فتح المستند" },
  forms: { selectCommitment: "اختر التزامًا معتمدًا مؤهلًا", authorizationEvidence: "مستند تأييد الاعتماد", paymentEvidence: "مستند تأييد الدفع", refundEvidence: "مستند تأييد الاسترداد", selectMethod: "اختر طريقة الدفع", referenceHelp: "يلزم مرجع للتحويل البنكي والشيك.", bankDetailsNotice: "يستخدم التحويل بيانات المورد المحفوظة، ولا يمكن إدخال بيانات البنك هنا.", selectBill: "اختر فاتورة مورد معتمدة", reversalReason: "وضح سبب عكس هذه الدفعة.", refundReason: "صف مبلغ المورد المسترد وسببه." },
  states: { accessDenied: "لا توجد صلاحية", loadError: "تعذر تحميل سلف الموردين.", empty: "لا توجد سلف موردين مسجلة.", notFound: "لم يتم العثور على سلفة المورد.", noCommitments: "لا توجد التزامات مفتوحة ذات سعة اعتماد متبقية.", noBills: "لا توجد فواتير موردين معتمدة مطابقة ذات رصيد مستحق.", unknownUser: "غير متاح" },
  notices: { authorized: "تم اعتماد سلفة المورد.", paid: "تم تسجيل دفعة السلفة.", allocated: "تم تخصيص السلفة لفاتورة المورد.", refunded: "تم تسجيل المبلغ المسترد من المورد.", reversed: "تم عكس دفعة السلفة.", allocationCorrected: "تم تصحيح تخصيص السلفة." },
  errors: errorsAr,
};

export function getSupplierAdvancesDictionary(locale: Locale): SupplierAdvancesDictionary {
  return locale === "ar" ? supplierAdvancesDictionaryAr : supplierAdvancesDictionaryEn;
}
