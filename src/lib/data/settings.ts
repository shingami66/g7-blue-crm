import { Settings } from "@/types";

export const settingsData: Settings = {
  company: {
    name: "G SEVEN BLUE Company",
    brandName: "G7 BLUE",
    email: "info@g7blue.com",
    phone: "+966 55 570 0349",
    address: "RBDA7036, Building 7036, Sayida / صيدا, Al Duraihemiyah Dist. / حي الدريهمية, Riyadh 12796",
  },
  legal: {
    vat: "Not registered",
    tin: "3146944674",
    entityUnifiedNumber: "7053901414",
  },
  bank: {
    name: "Alinma Bank / مصرف الإنماء",
    accountNo: "68207417001000",
    iban: "SA5005000068207417001000",
    accountName: "G SEVEN BLUE Company",
  },
  finance: {
    currency: "SAR",
    vatPercent: 0,
    terms: "Payment is due within 30 days of invoice date. Late payments may be subject to a 2% monthly fee. Goods remain property of G7 BLUE until full payment."
  }
};
