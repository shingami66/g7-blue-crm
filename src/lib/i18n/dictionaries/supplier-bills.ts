import type { Locale } from "../locales";

export interface SupplierBillsDictionary {
  locale: Locale;
  title: string;
  subtitle: string;
  newBill: string;
  backToList: string;
  fields: {
    billNumber: string;
    supplier: string;
    service: string;
    commitment: string;
    receipt: string;
    invoiceNumber: string;
    invoiceDate: string;
    dueDate: string;
    currency: string;
    subtotal: string;
    vat: string;
    total: string;
    status: string;
    evidence: string;
    recordedAt: string;
    recordedBy: string;
    approvedAt: string;
    approvedBy: string;
    receiptStatus: string;
    receivedValue: string;
    commitmentCeiling: string;
    acceptedValue: string;
    performanceDate: string;
    commitmentStatus: string;
    commitmentSource: string;
    sourceReference: string;
    supplierQuotation: string;
    commercialRegistration: string;
    vatNumber: string;
  };
  columns: {
    bill: string;
    supplier: string;
    service: string;
    invoiceDate: string;
    total: string;
    status: string;
    actions: string;
  };
  actions: {
    view: string;
    create: string;
    save: string;
    saveChanges: string;
    editBill: string;
    closeEdit: string;
    approve: string;
    attachInvoice: string;
    openDocument: string;
  };
  forms: {
    selectSupplier: string;
    selectService: string;
    selectCommitment: string;
    selectReceipt: string;
    invoiceFile: string;
    invoiceFileHelp: string;
    pendingNotice: string;
    eventOnlyNotice: string;
  };
  statuses: { pending: string; approved: string };
  acceptanceStatuses: Record<string, string>;
  commitmentStatuses: Record<string, string>;
  commitmentSources: Record<string, string>;
  states: {
    accessDenied: string;
    loadError: string;
    empty: string;
    notFound: string;
    noOptions: string;
  };
  notices: {
    approvalGate: string;
    approvedImmutable: string;
    evidenceRequired: string;
    saved: string;
    invoiceAttached: string;
    attachmentWarning: string;
  };
  errors: Record<string, string>;
}

const errorsEn: Record<string, string> = {
  supplier_bill_request_invalid: "Review the Supplier Bill details and try again.",
  supplier_bill_fields_invalid: "Complete all required fields with valid values.",
  supplier_bill_total_mismatch: "Total must equal subtotal plus VAT.",
  supplier_bill_due_date_invalid: "Due date cannot precede invoice date.",
  supplier_bill_approval_request_invalid: "The approval request is incomplete or invalid.",
  supplier_bill_permission_denied: "You are not authorized for this Supplier Bill action.",
  supplier_bill_approval_permission_denied: "You are not authorized to approve this Supplier Bill.",
  supplier_bill_approval_request_conflict: "This approval request was already used for a different bill.",
  supplier_bill_unavailable: "This Supplier Bill is no longer available.",
  supplier_bill_not_found: "Supplier Bill not found.",
  supplier_bill_already_approved: "This Supplier Bill has already been approved.",
  supplier_bill_supplier_unavailable: "Select an active supplier.",
  supplier_bill_commitment_mismatch: "The commitment does not belong to this supplier and service.",
  supplier_bill_commitment_not_eligible: "The approved commitment is not eligible.",
  supplier_bill_currency_mismatch: "The bill currency must match the approved commitment.",
  supplier_bill_receipt_mismatch: "The receipt does not match the selected commitment.",
  supplier_bill_receipt_not_accepted: "An accepted service receipt with received value is required.",
  supplier_bill_duplicate_invoice: "This supplier invoice number already exists.",
  supplier_bill_invoice_evidence_required: "Attach the supplier invoice before approval.",
  supplier_bill_invoice_evidence_unavailable: "The invoice evidence could not be verified.",
  supplier_bill_invoice_file_required: "Select the supplier invoice file.",
  supplier_bill_document_not_found: "The supplier invoice document was not found.",
  supplier_bill_document_read_failed: "The supplier invoice could not be opened.",
  supplier_bill_approved_immutable: "Approved Supplier Bills cannot be edited.",
  supplier_bill_self_approval_forbidden: "Only non-Admin reviewers must be different from the person who recorded the bill.",
  supplier_bill_commitment_ceiling_exceeded: "The approved bills exceed the commitment ceiling.",
  supplier_bill_received_value_ceiling_exceeded: "The approved bills exceed accepted receipt value.",
  supplier_bill_record_failed: "The Supplier Bill could not be recorded.",
  supplier_bill_update_failed: "The Supplier Bill could not be updated.",
  supplier_bill_approval_failed: "The Supplier Bill could not be approved.",
  supplier_bill_document_attach_failed: "The invoice evidence could not be attached.",
  document_storage_cleanup_failed: "The invoice upload needs administrator attention.",
};

const errorsAr: Record<string, string> = {
  supplier_bill_request_invalid: "راجع بيانات فاتورة المورد وحاول مرة أخرى.",
  supplier_bill_fields_invalid: "أكمل الحقول المطلوبة بقيم صحيحة.",
  supplier_bill_total_mismatch: "يجب أن يساوي الإجمالي المبلغ قبل الضريبة مضافًا إليه الضريبة.",
  supplier_bill_due_date_invalid: "لا يجوز أن يسبق تاريخ الاستحقاق تاريخ الفاتورة.",
  supplier_bill_approval_request_invalid: "طلب الاعتماد غير مكتمل أو غير صحيح.",
  supplier_bill_permission_denied: "لا تملك الصلاحية لتنفيذ هذا الإجراء.",
  supplier_bill_approval_permission_denied: "لا تملك الصلاحية لاعتماد فاتورة المورد هذه.",
  supplier_bill_approval_request_conflict: "تم استخدام طلب الاعتماد هذا لفاتورة مختلفة.",
  supplier_bill_unavailable: "لم تعد فاتورة المورد هذه متاحة.",
  supplier_bill_not_found: "لم يتم العثور على فاتورة المورد.",
  supplier_bill_already_approved: "تم اعتماد فاتورة المورد هذه بالفعل.",
  supplier_bill_supplier_unavailable: "اختر موردًا نشطًا.",
  supplier_bill_commitment_mismatch: "الالتزام لا ينتمي إلى هذا المورد والخدمة.",
  supplier_bill_commitment_not_eligible: "الالتزام المالي المعتمد غير مؤهل.",
  supplier_bill_currency_mismatch: "يجب أن تطابق العملة الالتزام المالي المعتمد.",
  supplier_bill_receipt_mismatch: "إيصال الخدمة لا يطابق الالتزام المحدد.",
  supplier_bill_receipt_not_accepted: "يلزم وجود إيصال خدمة مقبول بقيمة مستلمة.",
  supplier_bill_duplicate_invoice: "رقم فاتورة المورد موجود مسبقًا.",
  supplier_bill_invoice_evidence_required: "أرفق فاتورة المورد قبل الاعتماد.",
  supplier_bill_invoice_evidence_unavailable: "تعذر التحقق من مستند الفاتورة.",
  supplier_bill_invoice_file_required: "اختر ملف فاتورة المورد.",
  supplier_bill_document_not_found: "لم يتم العثور على مستند فاتورة المورد.",
  supplier_bill_document_read_failed: "تعذر فتح مستند فاتورة المورد.",
  supplier_bill_approved_immutable: "لا يمكن تعديل فاتورة مورد معتمدة.",
  supplier_bill_self_approval_forbidden: "يجب أن يختلف المراجع غير المسؤول عن النظام عن الشخص الذي سجّل الفاتورة.",
  supplier_bill_commitment_ceiling_exceeded: "تتجاوز الفواتير المعتمدة سقف الالتزام.",
  supplier_bill_received_value_ceiling_exceeded: "تتجاوز الفواتير المعتمدة قيمة الإيصالات المقبولة.",
  supplier_bill_record_failed: "تعذر تسجيل فاتورة المورد.",
  supplier_bill_update_failed: "تعذر تحديث فاتورة المورد.",
  supplier_bill_approval_failed: "تعذر اعتماد فاتورة المورد.",
  supplier_bill_document_attach_failed: "تعذر إرفاق مستند الفاتورة.",
  document_storage_cleanup_failed: "يحتاج رفع الفاتورة إلى مراجعة المسؤول.",
};

export const supplierBillsDictionaryEn: SupplierBillsDictionary = {
  locale: "en",
  title: "Supplier Bills",
  subtitle: "Event and Service supplier obligations recorded against approved commitments.",
  newBill: "New Supplier Bill",
  backToList: "Back to Supplier Bills",
  fields: {
    billNumber: "Bill Number", supplier: "Supplier", service: "Event / Service", commitment: "Approved Commitment", receipt: "Service Receipt", invoiceNumber: "Supplier Invoice Number", invoiceDate: "Invoice Date", dueDate: "Due Date", currency: "Currency", subtotal: "Subtotal", vat: "VAT", total: "Total", status: "Status", evidence: "Invoice Evidence", recordedAt: "Recorded At", recordedBy: "Recorded By", approvedAt: "Approved At", approvedBy: "Approved By", receiptStatus: "Receipt Status", receivedValue: "Accepted Receipt Value", commitmentCeiling: "Commitment Ceiling", acceptedValue: "Accepted Value", performanceDate: "Performance Date", commitmentStatus: "Commitment Status", commitmentSource: "Commitment Source", sourceReference: "Source Reference", supplierQuotation: "Supplier Quotation", commercialRegistration: "Commercial Registration", vatNumber: "VAT Number",
  },
  columns: { bill: "Bill", supplier: "Supplier", service: "Event / Service", invoiceDate: "Invoice Date", total: "Total", status: "Status", actions: "Actions" },
  actions: { view: "View bill", create: "Record Supplier Bill", save: "Record Bill", saveChanges: "Save Changes", editBill: "Edit Bill", closeEdit: "Close edit", approve: "Approve", attachInvoice: "Attach Invoice", openDocument: "Open document" },
  forms: { selectSupplier: "Select supplier", selectService: "Select event/service", selectCommitment: "Select approved commitment", selectReceipt: "Select service receipt", invoiceFile: "Supplier invoice file", invoiceFileHelp: "PDF, JPG, or PNG. Approval requires canonical invoice evidence.", pendingNotice: "Pending bills can be edited until approval.", eventOnlyNotice: "Supplier Bills are only for Event / Service obligations against an approved commitment.", },
  statuses: { pending: "Pending", approved: "Approved" },
  acceptanceStatuses: { PENDING: "Pending", ACCEPTED: "Accepted", ACCEPTED_WITH_CONDITIONS: "Accepted with conditions", REJECTED: "Rejected" },
  commitmentStatuses: { open: "Open", closed: "Closed", cancelled: "Cancelled" },
  commitmentSources: { purchase_order: "Approved Purchase Order", approved_contract: "Approved contract", supplier_quotation: "Accepted Supplier Quotation", other_authorized: "Other authorized commitment" },
  states: { accessDenied: "Access denied", loadError: "Supplier Bills could not be loaded.", empty: "No Supplier Bills recorded yet.", notFound: "Supplier Bill not found.", noOptions: "No eligible commitment or receipt options are available." },
  notices: { approvalGate: "Approval requires invoice evidence, an eligible commitment, and accepted matching receipt evidence.", approvedImmutable: "This bill is approved and immutable.", evidenceRequired: "Attach at least one supplier invoice before approval.", saved: "Supplier Bill saved.", invoiceAttached: "Invoice evidence attached.", attachmentWarning: "The bill was recorded, but the invoice could not be attached. Add it from the bill detail." },
  errors: errorsEn,
};

export const supplierBillsDictionaryAr: SupplierBillsDictionary = {
  ...supplierBillsDictionaryEn,
  locale: "ar",
  title: "فواتير الموردين",
  subtitle: "التزامات موردي الفعاليات والخدمات المسجلة على التزامات مالية معتمدة.",
  newBill: "فاتورة مورد جديدة",
  backToList: "العودة إلى فواتير الموردين",
  fields: { billNumber: "رقم الفاتورة الداخلي", supplier: "المورد", service: "الفعالية / الخدمة", commitment: "الالتزام المالي المعتمد", receipt: "إيصال الخدمة", invoiceNumber: "رقم فاتورة المورد", invoiceDate: "تاريخ الفاتورة", dueDate: "تاريخ الاستحقاق", currency: "العملة", subtotal: "المبلغ قبل الضريبة", vat: "ضريبة القيمة المضافة", total: "الإجمالي", status: "الحالة", evidence: "مستند الفاتورة", recordedAt: "تاريخ التسجيل", recordedBy: "سجّلها", approvedAt: "تاريخ الاعتماد", approvedBy: "اعتمدها", receiptStatus: "حالة الإيصال", receivedValue: "قيمة الإيصالات المقبولة", commitmentCeiling: "سقف الالتزام", acceptedValue: "القيمة المقبولة", performanceDate: "تاريخ الأداء", commitmentStatus: "حالة الالتزام", commitmentSource: "مصدر الالتزام", sourceReference: "مرجع المصدر", supplierQuotation: "عرض سعر المورد", commercialRegistration: "السجل التجاري", vatNumber: "الرقم الضريبي" },
  columns: { bill: "الفاتورة", supplier: "المورد", service: "الفعالية / الخدمة", invoiceDate: "تاريخ الفاتورة", total: "الإجمالي", status: "الحالة", actions: "الإجراءات" },
  actions: { view: "عرض الفاتورة", create: "تسجيل فاتورة مورد", save: "تسجيل الفاتورة", saveChanges: "حفظ التعديلات", editBill: "تعديل الفاتورة", closeEdit: "إغلاق التعديل", approve: "اعتماد", attachInvoice: "إرفاق الفاتورة", openDocument: "فتح المستند" },
  forms: { selectSupplier: "اختر المورد", selectService: "اختر الفعالية / الخدمة", selectCommitment: "اختر الالتزام المالي المعتمد", selectReceipt: "اختر إيصال الخدمة", invoiceFile: "ملف فاتورة المورد", invoiceFileHelp: "PDF أو JPG أو PNG. يتطلب الاعتماد مستند فاتورة مؤيدًا.", pendingNotice: "يمكن تعديل الفواتير المعلقة حتى اعتمادها.", eventOnlyNotice: "فواتير الموردين مخصصة لالتزامات الفعاليات والخدمات المرتبطة بالتزام مالي معتمد." },
  statuses: { pending: "معلقة", approved: "معتمدة" },
  acceptanceStatuses: { PENDING: "قيد المراجعة", ACCEPTED: "مقبول", ACCEPTED_WITH_CONDITIONS: "مقبول بشروط", REJECTED: "مرفوض" },
  commitmentStatuses: { open: "مفتوح", closed: "مغلق", cancelled: "ملغى" },
  commitmentSources: { purchase_order: "أمر شراء معتمد", approved_contract: "عقد معتمد", supplier_quotation: "عرض سعر مورد مقبول", other_authorized: "التزام آخر معتمد" },
  states: { accessDenied: "لا توجد صلاحية", loadError: "تعذر تحميل فواتير الموردين.", empty: "لا توجد فواتير موردين مسجلة.", notFound: "لم يتم العثور على فاتورة المورد.", noOptions: "لا توجد خيارات مؤهلة من الالتزامات والإيصالات." },
  notices: { approvalGate: "يتطلب الاعتماد مستند الفاتورة، والتزامًا مؤهلًا، وإيصال خدمة مقبولًا ومطابقًا.", approvedImmutable: "هذه الفاتورة معتمدة وغير قابلة للتعديل.", evidenceRequired: "أرفق مستند فاتورة مورد واحدًا على الأقل قبل الاعتماد.", saved: "تم حفظ فاتورة المورد.", invoiceAttached: "تم إرفاق مستند الفاتورة.", attachmentWarning: "تم تسجيل الفاتورة، لكن تعذر إرفاق المستند. أضفه من تفاصيل الفاتورة." },
  errors: errorsAr,
};

export function getSupplierBillsDictionary(locale: Locale): SupplierBillsDictionary {
  return locale === "ar" ? supplierBillsDictionaryAr : supplierBillsDictionaryEn;
}
