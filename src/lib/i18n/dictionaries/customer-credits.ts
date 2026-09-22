import type { Locale } from "../locales";
import type { CustomerRefundMethod } from "@/lib/customer-credits/types";

export interface CustomerCreditsDictionary {
  locale: Locale;
  title: string;
  fields: {
    amount: string;
    reasonCode: string;
    reason: string;
    date: string;
    method: string;
    reference: string;
    source: string;
    target: string;
  };
  reasonCodes: Record<"invoice_correction" | "pricing_correction" | "duplicate_charge" | "other", string>;
  methods: Record<CustomerRefundMethod, string>;
  actions: {
    createCredit: string;
    refund: string;
    apply: string;
    submit: string;
  };
  states: {
    noCredit: string;
    noEligibleInvoice: string;
    success: string;
    failed: string;
    reasonRequired: string;
  };
}

const en: CustomerCreditsDictionary = {
  locale: "en",
  title: "Customer Credit Actions",
  fields: {
    amount: "Amount (SAR)",
    reasonCode: "Reason",
    reason: "Reason details",
    date: "Business date",
    method: "Refund method",
    reference: "Refund reference",
    source: "Source credit",
    target: "Eligible invoice",
  },
  reasonCodes: {
    invoice_correction: "Invoice correction",
    pricing_correction: "Pricing correction",
    duplicate_charge: "Duplicate charge",
    other: "Other governed correction",
  },
  methods: {
    bank_transfer: "Bank transfer",
    cash: "Cash",
    cheque: "Cheque",
    online: "Online payment",
  },
  actions: {
    createCredit: "Record Internal Credit Adjustment",
    refund: "Refund customer credit",
    apply: "Apply retained credit",
    submit: "Submit",
  },
  states: {
    noCredit: "No available customer credit.",
    noEligibleInvoice: "No eligible future invoice is available for this customer.",
    success: "Change completed.",
    failed: "The change could not be completed.",
    reasonRequired: "Enter a reason of at least 5 characters.",
  },
};

const ar: CustomerCreditsDictionary = {
  ...en,
  locale: "ar",
  title: "إجراءات رصيد العميل",
  fields: {
    amount: "المبلغ (ريال سعودي)",
    reasonCode: "السبب",
    reason: "تفاصيل السبب",
    date: "التاريخ التجاري",
    method: "طريقة الاسترداد",
    reference: "مرجع الاسترداد",
    source: "الرصيد الدائن المصدر",
    target: "الفاتورة المؤهلة",
  },
  reasonCodes: {
    invoice_correction: "تصحيح الفاتورة",
    pricing_correction: "تصحيح التسعير",
    duplicate_charge: "تحصيل مكرر",
    other: "تصحيح آخر محكوم",
  },
  methods: {
    bank_transfer: "تحويل بنكي",
    cash: "نقداً",
    cheque: "شيك",
    online: "دفع إلكتروني",
  },
  actions: {
    createCredit: "تسجيل تعديل دائن داخلي",
    refund: "استرداد رصيد العميل",
    apply: "تطبيق الرصيد المحتفظ به",
    submit: "إرسال",
  },
  states: {
    noCredit: "لا يوجد رصيد دائن متاح للعميل.",
    noEligibleInvoice: "لا توجد فاتورة مستقبلية مؤهلة لهذا العميل.",
    success: "اكتملت العملية.",
    failed: "تعذر إكمال العملية.",
    reasonRequired: "أدخل سبباً لا يقل عن 5 أحرف.",
  },
};

export function getCustomerCreditsDictionary(locale: Locale): CustomerCreditsDictionary {
  return locale === "ar" ? ar : en;
}
