import {
  DEFAULT_LOCALE,
  isSupportedLocale,
  type Locale,
} from "../i18n/locales.ts";

export type DocumentLocale = Locale;

export type DocumentDictionary = {
  locale: {
    label: string;
    hint: string;
    english: string;
    arabic: string;
  };
  common: {
    notAvailable: string;
    notCaptured: string;
    notApplied: string;
    unknownCompany: string;
    headquarters: string;
    entityUnifiedNo: string;
    tin: string;
    taxStatus: string;
    notRegistered: string;
    vatRegistered: string;
    bank: string;
    accountName: string;
    accountNo: string;
    iban: string;
    officialStamp: string;
    companyStamp: string;
    clientApproval: string;
    signatureDate: string;
    print: string;
    preparingPrint: string;
    printHelp: string;
    addressNotProvided: string;
    attn: string;
    customerTaxDetails: string;
    invoiceNumber: string;
    type: string;
    issueDate: string;
    relatedQuote: string;
    status: string;
    issued: string;
    paid: string;
    partial: string;
    overdue: string;
    cancelled: string;
    voided: string;
    draftPreview: string;
    commercialPreview: string;
    paymentInstructions: string;
    bankTransferDetails: string;
    amountPaid: string;
    balanceDue: string;
  };
  quotation: {
    title: string;
    documentDetails: string;
    quotationNumber: string;
    validUntil: string;
    clientEvent: string;
    client: string;
    contact: string;
    eventName: string;
    serviceDescription: string;
    category: string;
    qty: string;
    unitPrice: string;
    taxVat: string;
    total: string;
    noLineItems: string;
    subtotal: string;
    discount: string;
    grandTotal: string;
    termsAndConditions: string;
  };
  invoice: {
    commercialInvoice: string;
    taxInvoice: string;
    billedTo: string;
    invoiceDetails: string;
    deposit: string;
    final: string;
    invoiceSummary: string;
    depositSummary: string;
    finalSummary: string;
    approvedBillingScopeTotal: string;
    approvedQuotationTotal: string;
    previousInvoices: string;
    subtotal: string;
    discount: string;
    taxVat: string;
    depositAmount: string;
    finalAmountDue: string;
    totalAmount: string;
    approvedServiceScope: string;
    approvedQuotationItems: string;
    approvedServiceScopeDescription: string;
    approvedQuotationItemsDescription: string;
    description: string;
    lineTotal: string;
  };
};

const english: DocumentDictionary = {
  locale: {
    label: "Print language",
    hint: "Choose Arabic or English for this preview. The saved business document does not change.",
    english: "English",
    arabic: "Arabic",
  },
  common: {
    notAvailable: "Not available",
    notCaptured: "Not captured",
    notApplied: "Not applied",
    unknownCompany: "Unknown Company",
    headquarters: "Headquarters",
    entityUnifiedNo: "Entity Unified No:",
    tin: "TIN / الرقم المميز:",
    taxStatus: "Tax/VAT Status:",
    notRegistered: "Not registered",
    vatRegistered: "VAT registered",
    bank: "Bank:",
    accountName: "Account Name:",
    accountNo: "Account No:",
    iban: "IBAN:",
    officialStamp: "Official Stamp:",
    companyStamp: "Company Stamp Here",
    clientApproval: "Client Approval",
    signatureDate: "Signature & Date",
    print: "Print / Save as PDF",
    preparingPrint: "Preparing print preview…",
    printHelp: "For best PDF output: use A4 paper, enable background graphics, and disable browser headers and footers if they appear in print preview.",
    addressNotProvided: "Address not provided",
    attn: "Attn:",
    customerTaxDetails: "Customer Tax Details:",
    invoiceNumber: "Invoice Number:",
    type: "Type:",
    issueDate: "Issue Date:",
    relatedQuote: "Related Quote:",
    status: "Status:",
    issued: "Issued",
    paid: "Paid",
    partial: "Partially paid",
    overdue: "Overdue",
    cancelled: "Cancelled",
    voided: "Voided",
    draftPreview: "DRAFT PREVIEW",
    commercialPreview: "Commercial Preview",
    paymentInstructions: "Payment Instructions",
    bankTransferDetails: "Bank Transfer Details",
    amountPaid: "Amount Paid",
    balanceDue: "Balance Due",
  },
  quotation: {
    title: "Quotation",
    documentDetails: "Document Details",
    quotationNumber: "Quote No:",
    validUntil: "Valid Until:",
    clientEvent: "Client & Event Information",
    client: "Client:",
    contact: "Contact:",
    eventName: "Event Name:",
    serviceDescription: "Service Description",
    category: "Category",
    qty: "Qty",
    unitPrice: "Unit Price",
    taxVat: "Tax/VAT",
    total: "Total",
    noLineItems: "No line items.",
    subtotal: "Subtotal:",
    discount: "Discount:",
    grandTotal: "Grand Total:",
    termsAndConditions: "Terms & Conditions",
  },
  invoice: {
    commercialInvoice: "Commercial Invoice",
    taxInvoice: "Tax Invoice",
    billedTo: "Billed To",
    invoiceDetails: "Invoice Details",
    deposit: "Deposit",
    final: "Final",
    invoiceSummary: "Invoice Summary",
    depositSummary: "Deposit Summary",
    finalSummary: "Final Settlement Summary",
    approvedBillingScopeTotal: "Approved Billing Scope Total",
    approvedQuotationTotal: "Approved Quotation Total",
    previousInvoices: "Previous Invoices / Deposits",
    subtotal: "Subtotal",
    discount: "Discount",
    taxVat: "Tax/VAT",
    depositAmount: "Deposit Amount",
    finalAmountDue: "Final Amount Due",
    totalAmount: "Total Amount",
    approvedServiceScope: "Approved Service Scope",
    approvedQuotationItems: "Approved Quotation Items",
    approvedServiceScopeDescription: "Accepted service scope items connected to this Invoice.",
    approvedQuotationItemsDescription: "Full approved service items connected to this Invoice.",
    description: "Description",
    lineTotal: "Line Total",
  },
};

const arabic: DocumentDictionary = {
  locale: {
    label: "لغة الطباعة",
    hint: "اختر العربية أو الإنجليزية لهذه المعاينة. لا يتغير مستند الأعمال المحفوظ.",
    english: "الإنجليزية",
    arabic: "العربية",
  },
  common: {
    notAvailable: "غير متاح",
    notCaptured: "غير مسجل",
    notApplied: "غير مطبقة",
    unknownCompany: "جهة غير معروفة",
    headquarters: "المقر الرئيسي",
    entityUnifiedNo: "الرقم الموحد للمنشأة:",
    tin: "الرقم المميز / TIN:",
    taxStatus: "حالة الضريبة/ضريبة القيمة المضافة:",
    notRegistered: "غير مسجلة",
    vatRegistered: "مسجلة في ضريبة القيمة المضافة",
    bank: "البنك:",
    accountName: "اسم الحساب:",
    accountNo: "رقم الحساب:",
    iban: "الآيبان:",
    officialStamp: "الختم الرسمي:",
    companyStamp: "ختم الشركة هنا",
    clientApproval: "اعتماد العميل",
    signatureDate: "التوقيع والتاريخ",
    print: "طباعة / حفظ كملف PDF",
    preparingPrint: "جارٍ تجهيز معاينة الطباعة…",
    printHelp: "لأفضل إخراج لملف PDF: استخدم ورق A4، فعّل رسومات الخلفية، وعطّل ترويسات وتذييلات المتصفح إذا ظهرت في معاينة الطباعة.",
    addressNotProvided: "العنوان غير مسجل",
    attn: "عناية:",
    customerTaxDetails: "البيانات الضريبية للعميل:",
    invoiceNumber: "رقم الفاتورة:",
    type: "النوع:",
    issueDate: "تاريخ الإصدار:",
    relatedQuote: "عرض السعر المرتبط:",
    status: "الحالة:",
    issued: "مصدرة",
    paid: "مدفوعة",
    partial: "مدفوعة جزئيًا",
    overdue: "متأخرة",
    cancelled: "ملغاة",
    voided: "ملغاة نهائيًا",
    draftPreview: "معاينة مسودة",
    commercialPreview: "معاينة تجارية",
    paymentInstructions: "تعليمات الدفع",
    bankTransferDetails: "بيانات التحويل البنكي",
    amountPaid: "المبلغ المدفوع",
    balanceDue: "الرصيد المستحق",
  },
  quotation: {
    title: "عرض سعر",
    documentDetails: "تفاصيل المستند",
    quotationNumber: "رقم عرض السعر:",
    validUntil: "صالح حتى:",
    clientEvent: "بيانات العميل والفعالية",
    client: "العميل:",
    contact: "جهة الاتصال:",
    eventName: "اسم الفعالية:",
    serviceDescription: "وصف الخدمة",
    category: "الفئة",
    qty: "الكمية",
    unitPrice: "سعر الوحدة",
    taxVat: "الضريبة/ضريبة القيمة المضافة",
    total: "الإجمالي",
    noLineItems: "لا توجد بنود.",
    subtotal: "المجموع الفرعي:",
    discount: "الخصم:",
    grandTotal: "الإجمالي الكلي:",
    termsAndConditions: "الشروط والأحكام",
  },
  invoice: {
    commercialInvoice: "فاتورة تجارية",
    taxInvoice: "فاتورة ضريبية",
    billedTo: "مفوتر إلى",
    invoiceDetails: "تفاصيل الفاتورة",
    deposit: "دفعة مقدمة",
    final: "نهائية",
    invoiceSummary: "ملخص الفاتورة",
    depositSummary: "ملخص الدفعة المقدمة",
    finalSummary: "ملخص التسوية النهائية",
    approvedBillingScopeTotal: "إجمالي نطاق الفوترة المعتمد",
    approvedQuotationTotal: "إجمالي عرض السعر المعتمد",
    previousInvoices: "الفواتير / الدفعات السابقة",
    subtotal: "المجموع الفرعي",
    discount: "الخصم",
    taxVat: "الضريبة/ضريبة القيمة المضافة",
    depositAmount: "مبلغ الدفعة المقدمة",
    finalAmountDue: "المبلغ النهائي المستحق",
    totalAmount: "إجمالي المبلغ",
    approvedServiceScope: "نطاق الخدمة المعتمد",
    approvedQuotationItems: "بنود عرض السعر المعتمد",
    approvedServiceScopeDescription: "بنود نطاق الخدمة المقبولة والمرتبطة بهذه الفاتورة.",
    approvedQuotationItemsDescription: "بنود الخدمة المعتمدة الكاملة المرتبطة بهذه الفاتورة.",
    description: "الوصف",
    lineTotal: "إجمالي البند",
  },
};

const dictionaries: Record<DocumentLocale, DocumentDictionary> = { en: english, ar: arabic };

export function normalizeDocumentLocale(value: unknown, fallback: DocumentLocale = DEFAULT_LOCALE): DocumentLocale {
  return isSupportedLocale(value) ? value : fallback;
}

export function resolveDocumentLocale(searchParams?: { lang?: string | string[] }): DocumentLocale {
  const requestedLocale = Array.isArray(searchParams?.lang) ? searchParams.lang[0] : searchParams?.lang;
  return normalizeDocumentLocale(requestedLocale);
}

export function getInvoiceDocumentPresentation(locale: DocumentLocale, vatMode: string) {
  const dictionary = getDocumentDictionary(locale);
  const isNotRegistered = vatMode === "not_registered";

  return {
    title: isNotRegistered ? dictionary.invoice.commercialInvoice : dictionary.invoice.taxInvoice,
    vatStatus: isNotRegistered ? dictionary.common.notRegistered : dictionary.common.vatRegistered,
  };
}

export function getDocumentDictionary(locale: DocumentLocale): DocumentDictionary {
  return dictionaries[locale];
}

export function formatDocumentDate(value: string | null | undefined, locale: DocumentLocale): string {
  if (!value) return "-";
  const date = new Date(/^\d{4}-\d{2}-\d{2}$/.test(value) ? `${value}T00:00:00.000Z` : value);
  if (Number.isNaN(date.getTime())) return "-";
  return new Intl.DateTimeFormat(`${locale}-SA-u-nu-latn`, {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);
}

export function formatDocumentAmount(value: number | null | undefined, locale: DocumentLocale): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return "0.00";
  return new Intl.NumberFormat(`${locale}-SA-u-nu-latn`, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
    useGrouping: true,
  }).format(value);
}

export function formatDocumentQuantity(value: number | null | undefined, locale: DocumentLocale): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return "0";
  return new Intl.NumberFormat(`${locale}-SA-u-nu-latn`, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
    useGrouping: true,
  }).format(value);
}
