import type { Locale } from "../locales";
import type { PaymentMethod, PaymentStatus } from "../../payments/types";
import { resolveDictionaryValue } from "../fallback.ts";

export interface PaymentsDictionary {
  locale: Locale;
  title: string;
  subtitle: string;
  searchPlaceholder: string;
  stats: {
    confirmedCollected: string;
    paymentRecords: string;
    pendingPayments: string;
  };
  table: {
    payment: string;
    date: string;
    customer: string;
    invoice: string;
    service: string;
    method: string;
    reference: string;
    amount: string;
    status: string;
    empty: string;
  };
  methods: Record<PaymentMethod, string>;
  statuses: Record<PaymentStatus, string>;
  states: {
    loadError: string;
    accessDenied: string;
    accessDeniedMessage: string;
    inlineError: string;
    paymentDataUnavailable: string;
    noFilteredPayments: string;
  };
}

const paymentsDictionaryEn: PaymentsDictionary = {
  locale: "en",
  title: "Payments",
  subtitle: "Track recorded payments linked to invoices and services.",
  searchPlaceholder: "Search payment, invoice, reference, customer, or service",
  stats: {
    confirmedCollected: "Confirmed Collected",
    paymentRecords: "Payment Records",
    pendingPayments: "Pending Payments",
  },
  table: {
    payment: "Payment Number",
    date: "Payment Date",
    customer: "Customer",
    invoice: "Invoice Number",
    service: "Service",
    method: "Payment Method",
    reference: "Reference",
    amount: "Amount",
    status: "Status",
    empty: "No payments found.",
  },
  methods: {
    bank_transfer: "Bank Transfer",
    cash: "Cash",
    cheque: "Cheque",
    online: "Online Payment",
  },
  statuses: {
    pending: "Pending",
    confirmed: "Confirmed",
    failed: "Failed",
    refunded: "Refunded",
  },
  states: {
    loadError: "Something went wrong",
    accessDenied: "Access Denied",
    accessDeniedMessage: "You don't have permission to view the payments module.",
    inlineError: "Payments could not be loaded right now.",
    paymentDataUnavailable: "Payment data unavailable",
    noFilteredPayments: "No payments match the search.",
  },
};

const paymentsDictionaryAr: PaymentsDictionary = {
  locale: "ar",
  title: "المدفوعات",
  subtitle: "متابعة المدفوعات المسجلة المرتبطة بالفواتير والخدمات.",
  searchPlaceholder: "ابحث عن الدفعة أو الفاتورة أو المرجع أو العميل أو الخدمة",
  stats: {
    confirmedCollected: "المبالغ المحصلة المؤكدة",
    paymentRecords: "سجلات المدفوعات",
    pendingPayments: "المدفوعات المعلقة",
  },
  table: {
    payment: "رقم الدفعة",
    date: "تاريخ الدفع",
    customer: "العميل",
    invoice: "رقم الفاتورة",
    service: "الخدمة",
    method: "طريقة الدفع",
    reference: "المرجع",
    amount: "المبلغ",
    status: "الحالة",
    empty: "لم يتم العثور على مدفوعات",
  },
  methods: {
    bank_transfer: "تحويل بنكي",
    cash: "نقداً",
    cheque: "شيك",
    online: "دفع إلكتروني",
  },
  statuses: {
    pending: "معلقة",
    confirmed: "مؤكدة",
    failed: "فاشلة",
    refunded: "مستردة",
  },
  states: {
    loadError: "حدث خطأ ما",
    accessDenied: "تم رفض الوصول",
    accessDeniedMessage: "ليس لديك صلاحية لعرض وحدة المدفوعات.",
    inlineError: "تعذر تحميل المدفوعات في الوقت الحالي.",
    paymentDataUnavailable: "بيانات المدفوعات غير متاحة",
    noFilteredPayments: "لا توجد مدفوعات مطابقة للبحث.",
  },
};

const paymentsDictionaries: Record<Locale, PaymentsDictionary> = {
  en: paymentsDictionaryEn,
  ar: paymentsDictionaryAr,
};

export function getPaymentsDictionary(locale: Locale): PaymentsDictionary {
  return paymentsDictionaries[locale];
}

export function getPaymentStatusLabel(locale: Locale, status: PaymentStatus): string {
  const activeDictionary = getPaymentsDictionary(locale);
  const englishDictionary = getPaymentsDictionary("en");
  const key = `statuses.${status}`;

  return resolveDictionaryValue({
    activeValue: activeDictionary.statuses[status],
    category: "label",
    englishValue: englishDictionary.statuses[status],
    key,
    locale,
    namespace: "payments",
    surface: "payment-status",
  });
}

export function getPaymentMethodLabel(locale: Locale, method: PaymentMethod): string {
  const activeDictionary = getPaymentsDictionary(locale);
  const englishDictionary = getPaymentsDictionary("en");
  const key = `methods.${method}`;

  return resolveDictionaryValue({
    activeValue: activeDictionary.methods[method],
    category: "label",
    englishValue: englishDictionary.methods[method],
    key,
    locale,
    namespace: "payments",
    surface: "payment-method",
  });
}
