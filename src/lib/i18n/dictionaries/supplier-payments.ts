import type { Locale } from "../locales";

export interface SupplierPaymentsDictionary {
  locale: Locale;
  title: string;
  subtitle: string;
  recordPayment: string;
  backToList: string;
  fields: {
    paymentNumber: string;
    bill: string;
    supplier: string;
    service: string;
    paymentDate: string;
    currency: string;
    amount: string;
    method: string;
    reference: string;
    evidence: string;
    notes: string;
    recordedAt: string;
    recordedBy: string;
    status: string;
    payable: string;
    paid: string;
    outstanding: string;
    bankName: string;
    accountName: string;
    iban: string;
    reversalReason: string;
    reversedAt: string;
  };
  columns: {
    payment: string;
    bill: string;
    supplier: string;
    date: string;
    amount: string;
    method: string;
    status: string;
    actions: string;
  };
  methods: Record<string, string>;
  statuses: Record<string, string>;
  billStatuses: Record<string, string>;
  actions: {
    view: string;
    save: string;
    cancel: string;
    openDocument: string;
    reverse: string;
    confirmReverse: string;
  };
  forms: {
    paymentEvidence: string;
    paymentEvidenceHelp: string;
    selectMethod: string;
    referenceHelp: string;
    bankDetailsNotice: string;
    approvedBillOnly: string;
    reversalReason: string;
  };
  states: {
    accessDenied: string;
    loadError: string;
    empty: string;
    notFound: string;
    invalidBill: string;
  };
  notices: {
    saved: string;
    reversed: string;
    noOutstanding: string;
  };
  errors: Record<string, string>;
}

const errorsEn: Record<string, string> = {
  supplier_payment_request_invalid: "Complete the payment details with valid values.",
  supplier_payment_permission_denied: "You are not authorized to record or reverse Supplier Payments.",
  supplier_payment_bill_not_found: "The Supplier Bill was not found.",
  supplier_payment_bill_not_approved: "Only an approved Supplier Bill can be paid.",
  supplier_payment_supplier_not_found: "The supplier is no longer available.",
  supplier_payment_evidence_required: "Attach payment evidence before recording the payment.",
  supplier_payment_bank_details_required: "The supplier's stored bank details are incomplete.",
  supplier_payment_exceeds_outstanding: "The payment cannot exceed the remaining payable balance.",
  supplier_payment_request_conflict: "This request was already used for a different payment.",
  supplier_payment_not_found: "Supplier Payment not found.",
  supplier_payment_already_reversed: "This Supplier Payment has already been reversed.",
  supplier_payment_reversal_request_invalid: "Enter a clear reversal reason.",
  supplier_payment_record_failed: "The Supplier Payment could not be recorded.",
  supplier_payment_reversal_failed: "The Supplier Payment could not be reversed.",
  supplier_payment_document_failed: "The payment evidence could not be saved.",
};

const errorsAr: Record<string, string> = {
  supplier_payment_request_invalid: "أكمل بيانات الدفع بقيم صحيحة.",
  supplier_payment_permission_denied: "لا تملك الصلاحية لتسجيل مدفوعات الموردين أو عكسها.",
  supplier_payment_bill_not_found: "لم يتم العثور على فاتورة المورد.",
  supplier_payment_bill_not_approved: "لا يمكن دفع إلا فاتورة مورد معتمدة.",
  supplier_payment_supplier_not_found: "لم يعد المورد متاحًا.",
  supplier_payment_evidence_required: "أرفق مستند تأييد الدفع قبل تسجيله.",
  supplier_payment_bank_details_required: "بيانات البنك المحفوظة للمورد غير مكتملة.",
  supplier_payment_exceeds_outstanding: "لا يجوز أن يتجاوز الدفع الرصيد المستحق المتبقي.",
  supplier_payment_request_conflict: "تم استخدام هذا الطلب لدفعة مختلفة.",
  supplier_payment_not_found: "لم يتم العثور على دفعة المورد.",
  supplier_payment_already_reversed: "تم عكس دفعة المورد هذه بالفعل.",
  supplier_payment_reversal_request_invalid: "أدخل سببًا واضحًا للعكس.",
  supplier_payment_record_failed: "تعذر تسجيل دفعة المورد.",
  supplier_payment_reversal_failed: "تعذر عكس دفعة المورد.",
  supplier_payment_document_failed: "تعذر حفظ مستند تأييد الدفع.",
};

const base: Omit<SupplierPaymentsDictionary, "locale"> = {
  title: "Supplier Payments",
  subtitle: "Outbound payments recorded against approved Event / Service Supplier Bills.",
  recordPayment: "Record Payment",
  backToList: "Back to Supplier Payments",
  fields: {
    paymentNumber: "Payment Number", bill: "Supplier Bill", supplier: "Supplier", service: "Event / Service", paymentDate: "Payment Date", currency: "Currency", amount: "Amount", method: "Method", reference: "Payment Reference", evidence: "Payment Evidence", notes: "Notes", recordedAt: "Recorded At", recordedBy: "Recorded By", status: "Status", payable: "Payable", paid: "Paid", outstanding: "Outstanding", bankName: "Bank", accountName: "Account Name", iban: "IBAN snapshot", reversalReason: "Reversal Reason", reversedAt: "Reversed At",
  },
  columns: { payment: "Payment", bill: "Bill", supplier: "Supplier", date: "Date", amount: "Amount", method: "Method", status: "Status", actions: "Actions" },
  methods: { bank_transfer: "Bank transfer", cash: "Cash", cheque: "Cheque" },
  statuses: { recorded: "Recorded", reversed: "Reversed" },
  billStatuses: { unpaid: "Unpaid", partially_paid: "Partially paid", paid: "Paid" },
  actions: { view: "View payment", save: "Record Payment", cancel: "Cancel", openDocument: "Open document", reverse: "Reverse Payment", confirmReverse: "Confirm reversal" },
  forms: { paymentEvidence: "Payment evidence", paymentEvidenceHelp: "PDF, JPG, or PNG. Evidence is required for every payment.", selectMethod: "Select payment method", referenceHelp: "Reference is required for bank transfer and cheque.", bankDetailsNotice: "Bank transfer uses the supplier's stored bank details; IBAN cannot be entered here.", approvedBillOnly: "Payments can only be recorded against approved Supplier Bills.", reversalReason: "Explain why this payment is being reversed." },
  states: { accessDenied: "Access denied", loadError: "Supplier Payments could not be loaded.", empty: "No Supplier Payments recorded yet.", notFound: "Supplier Payment not found.", invalidBill: "Select an approved Supplier Bill to record a payment." },
  notices: { saved: "Supplier Payment recorded.", reversed: "Supplier Payment reversed.", noOutstanding: "This Supplier Bill has no outstanding balance." },
  errors: errorsEn,
};

export const supplierPaymentsDictionaryEn: SupplierPaymentsDictionary = { locale: "en", ...base };
export const supplierPaymentsDictionaryAr: SupplierPaymentsDictionary = {
  locale: "ar",
  ...base,
  title: "مدفوعات الموردين",
  subtitle: "المدفوعات المسجلة مقابل فواتير موردي الفعاليات والخدمات المعتمدة.",
  recordPayment: "تسجيل دفعة",
  backToList: "العودة إلى مدفوعات الموردين",
  fields: { paymentNumber: "رقم الدفعة", bill: "فاتورة المورد", supplier: "المورد", service: "الفعالية / الخدمة", paymentDate: "تاريخ الدفع", currency: "العملة", amount: "المبلغ", method: "طريقة الدفع", reference: "مرجع الدفع", evidence: "مستند تأييد الدفع", notes: "ملاحظات", recordedAt: "تاريخ التسجيل", recordedBy: "سجّلها", status: "الحالة", payable: "المستحق", paid: "المدفوع", outstanding: "المتبقي", bankName: "البنك", accountName: "اسم الحساب", iban: "نسخة IBAN", reversalReason: "سبب العكس", reversedAt: "تاريخ العكس" },
  columns: { payment: "الدفعة", bill: "الفاتورة", supplier: "المورد", date: "التاريخ", amount: "المبلغ", method: "الطريقة", status: "الحالة", actions: "الإجراءات" },
  methods: { bank_transfer: "تحويل بنكي", cash: "نقدًا", cheque: "شيك" },
  statuses: { recorded: "مسجلة", reversed: "معكوسة" },
  billStatuses: { unpaid: "غير مدفوعة", partially_paid: "مدفوعة جزئيًا", paid: "مدفوعة" },
  actions: { view: "عرض الدفعة", save: "تسجيل الدفعة", cancel: "إلغاء", openDocument: "فتح المستند", reverse: "عكس الدفعة", confirmReverse: "تأكيد العكس" },
  forms: { paymentEvidence: "مستند تأييد الدفع", paymentEvidenceHelp: "PDF أو JPG أو PNG. يلزم مستند لكل دفعة.", selectMethod: "اختر طريقة الدفع", referenceHelp: "يلزم المرجع للتحويل البنكي والشيك.", bankDetailsNotice: "يستخدم التحويل البنكي بيانات المورد المحفوظة، ولا يمكن إدخال IBAN من هنا.", approvedBillOnly: "لا يمكن تسجيل الدفع إلا مقابل فاتورة مورد معتمدة.", reversalReason: "وضّح سبب عكس هذه الدفعة." },
  states: { accessDenied: "لا توجد صلاحية", loadError: "تعذر تحميل مدفوعات الموردين.", empty: "لا توجد مدفوعات موردين مسجلة.", notFound: "لم يتم العثور على دفعة المورد.", invalidBill: "اختر فاتورة مورد معتمدة لتسجيل الدفعة." },
  notices: { saved: "تم تسجيل دفعة المورد.", reversed: "تم عكس دفعة المورد.", noOutstanding: "لا يوجد رصيد مستحق على فاتورة المورد هذه." },
  errors: errorsAr,
};

export function getSupplierPaymentsDictionary(locale: Locale): SupplierPaymentsDictionary {
  return locale === "ar" ? supplierPaymentsDictionaryAr : supplierPaymentsDictionaryEn;
}
