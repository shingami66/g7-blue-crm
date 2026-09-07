import type { Locale } from "../locales";

export interface ProcurementCommitmentDictionary {
  locale: Locale;
  title: string;
  subtitle: string;
  backToService: string;
  empty: string;
  loadError: string;
  noPermission: string;
  chooseFiles: string;
  noFilesSelected: string;
  datePlaceholder: string;
  openCalendar: string;
  sources: Record<string, string>;
  statuses: Record<string, string>;
  acceptanceStatuses: Record<string, string>;
  fields: {
    supplier: string;
    service: string;
    source: string;
    sourceReference: string;
    supplierQuotation: string;
    originalAmount: string;
    authorizedAmount: string;
    acceptedAmount: string;
    pendingAmount: string;
    openAmount: string;
    approvedAt: string;
    approvedBy: string;
    reviewedBy: string;
    submittedBy: string;
    submittedAt: string;
    reviewedAt: string;
    lifecycleAt: string;
    lifecycleBy: string;
    lifecycleReason: string;
    performanceDate: string;
    deliveredScope: string;
    actualQuantity: string;
    actualHours: string;
    unit: string;
    receivedAmount: string;
    missingScope: string;
    extraScope: string;
    defectsIncidents: string;
    conditionsNotes: string;
    reason: string;
    evidence: string;
    approvalEvidenceReference: string;
    amendmentType: string;
    amendmentAmount: string;
    amendment: string;
    receipt: string;
    documents: string;
    correction: string;
    priorOutcome: string;
    correctedOutcome: string;
    correctedConditions: string;
    correctionReason: string;
    correctionBy: string;
  };
  forms: {
    createTitle: string;
    amendmentTitle: string;
    receiptTitle: string;
    sourceReferencePlaceholder: string;
    quotationPlaceholder: string;
    amountPlaceholder: string;
    reasonPlaceholder: string;
    evidencePlaceholder: string;
    scopePlaceholder: string;
    optionalPlaceholder: string;
    create: string;
    amend: string;
    submitReceipt: string;
    accepted: string;
    conditional: string;
    rejected: string;
    reopen: string;
    close: string;
    cancel: string;
    upload: string;
    correctionTitle: string;
    correctionReasonPlaceholder: string;
    correct: string;
    action: string;
    executeAction: string;
    increase: string;
    reduction: string;
  };
  notices: {
    bookingSeparation: string;
    receiptSeparation: string;
    historyPreserved: string;
    pendingReview: string;
    noAmount: string;
    noDocuments: string;
    noReceipts: string;
    noAmendments: string;
    documentHelper: string;
    unknownQuotationReference: string;
    correctionHelper: string;
  };
  errors: Record<string, string>;
  success: {
    commitmentCreated: string;
    amendmentCreated: string;
    receiptCreated: string;
    receiptReviewed: string;
    transition: string;
    documentUploaded: string;
    receiptCorrected: string;
  };
}

const english: ProcurementCommitmentDictionary = {
  locale: "en",
  title: "Commitments and Service Receipt",
  subtitle: "Approved supplier obligations and delivery evidence for this Service.",
  backToService: "Back to Service",
  empty: "No Approved Commitments have been recorded for this Service.",
  loadError: "Commitment data could not be loaded. Please try again.",
  noPermission: "Commitment and receipt information is restricted to authorized users.",
  chooseFiles: "Choose files",
  noFilesSelected: "No files selected",
  datePlaceholder: "YYYY-MM-DD",
  openCalendar: "Open calendar",
  sources: {
    purchase_order: "Approved Purchase Order",
    approved_contract: "Approved contract",
    supplier_quotation: "Accepted Supplier Quotation",
    other_authorized: "Other authorized commitment",
  },
  statuses: { open: "Open", closed: "Closed", cancelled: "Cancelled" },
  acceptanceStatuses: {
    PENDING: "Pending",
    ACCEPTED: "Accepted",
    ACCEPTED_WITH_CONDITIONS: "Accepted with conditions",
    REJECTED: "Rejected",
  },
  fields: {
    supplier: "Supplier", service: "Service", source: "Commitment source", sourceReference: "Authorized source reference",
    supplierQuotation: "Supplier quotation", originalAmount: "Original approved amount (SAR)", authorizedAmount: "Authorized amount (SAR)",
    acceptedAmount: "Accepted value (SAR)", pendingAmount: "Pending value (SAR)", openAmount: "Open commitment amount (SAR)",
    approvedAt: "Approval date", approvedBy: "Approved by", reviewedBy: "Reviewed by", submittedBy: "Submitted by", submittedAt: "Submitted at", reviewedAt: "Reviewed at", lifecycleAt: "Lifecycle updated at", lifecycleBy: "Lifecycle updated by", lifecycleReason: "Lifecycle reason", performanceDate: "Delivery/performance date", deliveredScope: "Delivered scope",
    actualQuantity: "Actual quantity", actualHours: "Actual hours", unit: "Unit", receivedAmount: "Received amount",
    missingScope: "Missing scope", extraScope: "Extra scope", defectsIncidents: "Defects/incidents", conditionsNotes: "Conditions/notes",
    reason: "Reason", evidence: "Evidence reference", approvalEvidenceReference: "Approval evidence reference", amendmentType: "Amendment type", amendmentAmount: "Amendment amount", amendment: "Amendment", receipt: "Service Receipt", documents: "Supporting documents", correction: "Receipt correction history", priorOutcome: "Prior reviewed outcome", correctedOutcome: "Corrected outcome", correctedConditions: "Corrected conditions/notes", correctionReason: "Correction reason", correctionBy: "Corrected by",
  },
  forms: {
    createTitle: "Approve a Commitment", amendmentTitle: "Add an approved amendment", receiptTitle: "Record Service Receipt",
    sourceReferencePlaceholder: "PO, contract, or authorized record reference", quotationPlaceholder: "Select a quotation source",
    amountPlaceholder: "0.00", reasonPlaceholder: "Explain the authorized change or lifecycle decision", evidencePlaceholder: "Approval or supporting evidence reference",
    scopePlaceholder: "Describe what was delivered", optionalPlaceholder: "Optional", create: "Approve Commitment", amend: "Add Amendment",
    submitReceipt: "Submit Receipt for Review", accepted: "Accept", conditional: "Accept with Conditions", rejected: "Reject", reopen: "Reopen for Receipt Correction", close: "Close Commitment", cancel: "Cancel Commitment", upload: "Attach documents", correctionTitle: "Correct reviewed receipt", correctionReasonPlaceholder: "Explain the correction or reversal", correct: "Record correction", action: "Action", executeAction: "Execute Action", increase: "Increase", reduction: "Reduction",
  },
  notices: {
    bookingSeparation: "Supplier Booking remains an operational reservation and is not this Approved Commitment.",
    receiptSeparation: "Service Receipt is delivery evidence and is separate from supplier invoicing, payables, and payment.",
    historyPreserved: "Prior approved authority remains visible after amendments or cancellation.", pendingReview: "Pending receipts reserve stated value until reviewed.", noAmount: "No value was recorded for this receipt.", noDocuments: "No supporting documents are attached.", noReceipts: "No Service Receipts have been recorded.", noAmendments: "No amendments have been recorded.", documentHelper: "Private PDF, JPEG, or PNG evidence; original bytes are retained and not copied.", unknownQuotationReference: "Recorded supplier quotation; supplier reference unknown", correctionHelper: "Corrections preserve the prior reviewed outcome and require an explicit reason.",
  },
  errors: {
    service_receipt_self_review_forbidden: "A different authorized reviewer must review this receipt.",
    approved_commitment_reopen_ineligible: "Only a closed commitment can be reopened. Cancelled commitments remain cancelled.",
    approved_commitment_request_conflict: "This request was already used with different commitment data.", approved_commitment_source_invalid: "Provide one valid authorized source without duplicating quotation identity.",
    approved_commitment_service_unavailable: "This Service is not available for a new commitment.", approved_commitment_supplier_unavailable: "This Supplier is not available for a new commitment.",
    approved_commitment_supplier_quotation_unavailable: "The selected supplier quotation does not belong to this Service and Supplier.", approved_commitment_reduction_exceeds_open: "The reduction is greater than the open commitment amount.",
    approved_commitment_not_open: "This commitment is no longer open for amendment.", approved_commitment_open_amount_remaining: "The commitment still has an open amount and cannot be closed.", approved_commitment_pending_receipts: "Review pending receipts before closing or cancelling the commitment.",
    service_receipt_value_exceeds_open: "The receipt value exceeds the remaining authorized commitment.", service_receipt_commitment_not_open: "This commitment is not open. Reopen a closed commitment before correcting its receipts.", service_receipt_already_reviewed: "This receipt has already been reviewed.", service_receipt_not_reviewed: "Only a reviewed receipt can be corrected.", service_receipt_correction_request_conflict: "This correction request was already used with different data.", service_receipt_correction_invalid: "Provide a valid corrected outcome, value, and reason.", service_receipt_correction_permission_denied: "You do not have permission to correct a reviewed receipt.",
    INVALID_INPUT: "Please review the fields.", UNAUTHORIZED: "You must be signed in.", FORBIDDEN: "You do not have permission for this action.", PROCUREMENT_COMMITMENT_WRITE_FAILED: "The operation could not be completed. Please try again.",
  },
  success: { commitmentCreated: "Approved Commitment recorded.", amendmentCreated: "Approved amendment recorded.", receiptCreated: "Service Receipt submitted for review.", receiptReviewed: "Receipt review recorded.", transition: "Commitment lifecycle updated.", documentUploaded: "Supporting documents attached.", receiptCorrected: "Receipt correction recorded." },
};

const arabic: ProcurementCommitmentDictionary = {
  ...english,
  locale: "ar",
  title: "الالتزامات وإيصال الخدمة",
  subtitle: "التزامات المورد المعتمدة وأدلة التسليم لهذه الخدمة.",
  backToService: "العودة إلى الخدمة",
  empty: "لم يتم تسجيل التزامات معتمدة لهذه الخدمة.",
  loadError: "تعذر تحميل بيانات الالتزام. يرجى المحاولة مرة أخرى.",
  noPermission: "معلومات الالتزامات والإيصالات مقيدة بالمستخدمين المصرح لهم.",
  chooseFiles: "اختيار الملفات",
  noFilesSelected: "لم يتم اختيار ملفات",
  datePlaceholder: "YYYY-MM-DD",
  openCalendar: "فتح التقويم",
  sources: { purchase_order: "أمر شراء معتمد", approved_contract: "عقد معتمد", supplier_quotation: "عرض سعر مورد مقبول", other_authorized: "التزام آخر معتمد" },
  statuses: { open: "مفتوح", closed: "مغلق", cancelled: "ملغى" },
  acceptanceStatuses: { PENDING: "قيد المراجعة", ACCEPTED: "مقبول", ACCEPTED_WITH_CONDITIONS: "مقبول بشروط", REJECTED: "مرفوض" },
  fields: {
    supplier: "المورد", service: "الخدمة", source: "مصدر الالتزام", sourceReference: "مرجع المصدر المعتمد", supplierQuotation: "عرض سعر المورد",
    originalAmount: "القيمة الأصلية المعتمدة (ريال)", authorizedAmount: "القيمة المعتمدة (ريال)", acceptedAmount: "القيمة المقبولة (ريال)", pendingAmount: "القيمة قيد المراجعة (ريال)", openAmount: "قيمة الالتزام المفتوحة (ريال)",
    approvedAt: "تاريخ الاعتماد", approvedBy: "اعتمد بواسطة", reviewedBy: "راجع بواسطة", submittedBy: "أرسل بواسطة", submittedAt: "وقت الإرسال", reviewedAt: "وقت المراجعة", lifecycleAt: "وقت تحديث دورة الحياة", lifecycleBy: "حدّث بواسطة", lifecycleReason: "سبب دورة الحياة", performanceDate: "تاريخ التسليم/الأداء", deliveredScope: "النطاق المسلم", actualQuantity: "الكمية الفعلية", actualHours: "الساعات الفعلية", unit: "الوحدة", receivedAmount: "قيمة الجزء المستلم من الالتزام",
    missingScope: "النطاق الناقص", extraScope: "النطاق الإضافي", defectsIncidents: "العيوب/الحوادث", conditionsNotes: "الشروط/الملاحظات", reason: "السبب", evidence: "مرجع الدليل", approvalEvidenceReference: "مرجع دليل الاعتماد", amendmentType: "نوع التعديل", amendmentAmount: "قيمة التعديل", amendment: "التعديل", receipt: "استلام الخدمة", documents: "المستندات الداعمة", correction: "سجل تصحيحات الإيصال", priorOutcome: "النتيجة السابقة التي تمت مراجعتها", correctedOutcome: "النتيجة المصححة", correctedConditions: "الشروط/الملاحظات المصححة", correctionReason: "سبب التصحيح", correctionBy: "صحح بواسطة",
  },
  forms: {
    createTitle: "اعتماد التزام", amendmentTitle: "إضافة تعديل معتمد", receiptTitle: "تسجيل إيصال خدمة", sourceReferencePlaceholder: "مرجع أمر الشراء أو العقد أو السجل المعتمد", quotationPlaceholder: "اختر مصدر عرض السعر", amountPlaceholder: "0.00", reasonPlaceholder: "اشرح التغيير أو قرار دورة الحياة المعتمد", evidencePlaceholder: "مرجع الاعتماد أو الدليل الداعم", scopePlaceholder: "صف ما تم تسليمه", optionalPlaceholder: "اختياري", create: "اعتماد الالتزام", amend: "إضافة التعديل", submitReceipt: "إرسال الإيصال للمراجعة", accepted: "قبول", conditional: "قبول بشروط", rejected: "رفض", reopen: "إعادة الفتح لتصحيح الإيصال", close: "إغلاق الالتزام", cancel: "إلغاء الالتزام", upload: "إرفاق المستندات", correctionTitle: "تصحيح إيصال تمت مراجعته", correctionReasonPlaceholder: "اشرح التصحيح أو الإلغاء", correct: "تسجيل التصحيح", action: "الإجراء", executeAction: "تنفيذ الإجراء", increase: "زيادة", reduction: "تخفيض",
  },
  notices: {
    bookingSeparation: "يبقى حجز المورد حجزًا تشغيليًا ولا يمثل هذا الالتزام المعتمد.", receiptSeparation: "استلام الخدمة دليل تسليم منفصل عن فاتورة المورد والذمم والدفع.", historyPreserved: "يبقى الاعتماد السابق ظاهرًا بعد التعديلات أو الإلغاء.", pendingReview: "تحجز الإيصالات قيد المراجعة القيمة المسجلة حتى تتم مراجعتها.", noAmount: "لم يتم تسجيل قيمة لهذا الاستلام.", noDocuments: "لا توجد مستندات داعمة مرفقة.", noReceipts: "لم يتم تسجيل استلام خدمة.", noAmendments: "لم يتم تسجيل تعديلات.", documentHelper: "مستندات PDF أو JPEG أو PNG خاصة؛ يتم الاحتفاظ بالملفات الأصلية دون نسخها.", unknownQuotationReference: "عرض سعر مورد مسجل؛ مرجع المورد غير معروف", correctionHelper: "تحافظ التصحيحات على نتيجة المراجعة السابقة وتتطلب سببًا صريحًا.",
  },
  errors: { ...english.errors, service_receipt_self_review_forbidden: "يجب أن يراجع هذا الإيصال مستخدم مخول آخر.", approved_commitment_reopen_ineligible: "يمكن إعادة فتح الالتزام المغلق فقط. تبقى الالتزامات الملغاة ملغاة.", approved_commitment_source_invalid: "أدخل مصدرًا معتمدًا صالحًا دون تكرار هوية عرض السعر.", approved_commitment_reduction_exceeds_open: "قيمة التخفيض أكبر من قيمة الالتزام المفتوحة.", approved_commitment_open_amount_remaining: "لا تزال هناك قيمة مفتوحة ولا يمكن إغلاق الالتزام.", approved_commitment_pending_receipts: "راجع الإيصالات قيد المراجعة قبل إغلاق الالتزام أو إلغائه.", service_receipt_value_exceeds_open: "تتجاوز قيمة الإيصال القيمة المعتمدة المتبقية.", service_receipt_commitment_not_open: "هذا الالتزام غير مفتوح. أعد فتح الالتزام المغلق قبل تصحيح إيصالاته.", service_receipt_already_reviewed: "تمت مراجعة هذا الإيصال بالفعل.", service_receipt_not_reviewed: "لا يمكن تصحيح إيصال لم تتم مراجعته.", service_receipt_correction_request_conflict: "تم استخدام طلب التصحيح ببيانات مختلفة.", service_receipt_correction_invalid: "أدخل نتيجة وقيمة وسببًا صالحًا للتصحيح.", service_receipt_correction_permission_denied: "ليست لديك صلاحية لتصحيح إيصال تمت مراجعته.", INVALID_INPUT: "راجع الحقول.", UNAUTHORIZED: "يجب تسجيل الدخول.", FORBIDDEN: "ليست لديك صلاحية لهذا الإجراء." },
  success: { commitmentCreated: "تم تسجيل الالتزام المعتمد.", amendmentCreated: "تم تسجيل التعديل المعتمد.", receiptCreated: "تم إرسال إيصال الخدمة للمراجعة.", receiptReviewed: "تم تسجيل مراجعة الإيصال.", transition: "تم تحديث دورة حياة الالتزام.", documentUploaded: "تم إرفاق المستندات الداعمة.", receiptCorrected: "تم تسجيل تصحيح الإيصال." },
};

export function getProcurementCommitmentDictionary(locale: Locale): ProcurementCommitmentDictionary {
  return locale === "ar" ? arabic : english;
}
