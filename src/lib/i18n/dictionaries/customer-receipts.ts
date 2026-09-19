import type { Locale } from "../locales";
import type { CustomerReceiptMethod } from "@/lib/customer-receipts/types";

export interface CustomerReceiptsDictionary {
  locale: Locale;
  title: string;
  subtitle: string;
  backToPayments: string;
  recordTitle: string;
  allocationTitle: string;
  fields: {
    customer: string;
    customerSearch: string;
    date: string;
    amount: string;
    method: string;
    reference: string;
    notes: string;
    invoiceSearch: string;
    invoice: string;
    reason: string;
    unapplied: string;
    allocated: string;
  };
  actions: {
    record: string;
    search: string;
    searchInvoices: string;
    allocate: string;
    reverseAllocation: string;
    reverseReceipt: string;
    select: string;
  };
  methods: Record<CustomerReceiptMethod, string>;
  statuses: Record<string, string>;
  states: {
    empty: string;
    noInvoices: string;
    selectReceipt: string;
    activeAllocationsBlockReversal: string;
    success: string;
    failed: string;
    loadError: string;
    accessDenied: string;
    accessDeniedMessage: string;
  };
}

const en: CustomerReceiptsDictionary = {
  locale: "en",
  title: "Customer Receipts",
  subtitle: "Record customer cash independently, then allocate it to eligible invoices.",
  backToPayments: "Back to Payments",
  recordTitle: "Record independent receipt",
  allocationTitle: "Receipt allocation",
  fields: {
    customer: "Customer",
    customerSearch: "Find customer",
    date: "Receipt date",
    amount: "Amount",
    method: "Method",
    reference: "Reference",
    notes: "Notes",
    invoiceSearch: "Search same-customer invoices",
    invoice: "Invoice",
    reason: "Correction reason",
    unapplied: "Unapplied",
    allocated: "Allocated",
  },
  actions: {
    record: "Record receipt",
    search: "Search",
    searchInvoices: "Search invoices",
    allocate: "Allocate",
    reverseAllocation: "Reverse allocation",
    reverseReceipt: "Reverse receipt",
    select: "Select",
  },
  methods: {
    bank_transfer: "Bank transfer",
    cash: "Cash",
    cheque: "Cheque",
    online: "Online payment",
  },
  statuses: {
    unapplied: "Unapplied",
    partially_allocated: "Partially allocated",
    fully_allocated: "Fully allocated",
    reversed: "Reversed",
  },
  states: {
    empty: "No customer receipts found.",
    noInvoices: "No eligible same-customer invoices found.",
    selectReceipt: "Select a receipt to allocate or correct it.",
    activeAllocationsBlockReversal: "Reverse all active allocations before reversing this receipt.",
    success: "Change completed.",
    failed: "The change could not be completed.",
    loadError: "Customer receipts are unavailable right now.",
    accessDenied: "Access denied",
    accessDeniedMessage: "You do not have permission to use customer receipts.",
  },
};

const ar: CustomerReceiptsDictionary = {
  ...en,
  locale: "ar",
  title: "إيصالات العملاء",
  subtitle: "تسجيل مبالغ العملاء بشكل مستقل ثم تخصيصها للفواتير المؤهلة.",
  backToPayments: "العودة إلى المدفوعات",
  recordTitle: "تسجيل إيصال مستقل",
  allocationTitle: "تخصيص الإيصال",
  fields: {
    customer: "العميل",
    customerSearch: "البحث عن عميل",
    date: "تاريخ الإيصال",
    amount: "المبلغ",
    method: "الطريقة",
    reference: "المرجع",
    notes: "ملاحظات",
    invoiceSearch: "البحث في فواتير العميل نفسه",
    invoice: "الفاتورة",
    reason: "سبب التصحيح",
    unapplied: "غير مخصص",
    allocated: "مخصص",
  },
  actions: {
    record: "تسجيل الإيصال",
    search: "بحث",
    searchInvoices: "البحث عن الفواتير",
    allocate: "تخصيص",
    reverseAllocation: "عكس التخصيص",
    reverseReceipt: "عكس الإيصال",
    select: "اختيار",
  },
  methods: {
    bank_transfer: "تحويل بنكي",
    cash: "نقداً",
    cheque: "شيك",
    online: "دفع إلكتروني",
  },
  statuses: {
    unapplied: "غير مخصص",
    partially_allocated: "مخصص جزئياً",
    fully_allocated: "مخصص بالكامل",
    reversed: "معكوس",
  },
  states: {
    empty: "لا توجد إيصالات عملاء.",
    noInvoices: "لا توجد فواتير مؤهلة للعميل نفسه.",
    selectReceipt: "اختر إيصالاً لتخصيصه أو تصحيحه.",
    activeAllocationsBlockReversal: "اعكس جميع التخصيصات النشطة قبل عكس الإيصال.",
    success: "اكتملت العملية.",
    failed: "تعذر إكمال العملية.",
    loadError: "إيصالات العملاء غير متاحة حالياً.",
    accessDenied: "تم رفض الوصول",
    accessDeniedMessage: "ليس لديك صلاحية لاستخدام إيصالات العملاء.",
  },
};

export function getCustomerReceiptsDictionary(locale: Locale): CustomerReceiptsDictionary {
  return locale === "ar" ? ar : en;
}
