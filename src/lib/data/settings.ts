import { Settings } from "@/types";

export const settingsData: Settings = {
  company: {
    name: "G7 BLUE Logistics & Events",
    email: "contact@g7blue.com.sa",
    phone: "+966 11 234 5678",
    address: "King Abdullah Financial District (KAFD)\nRiyadh, Saudi Arabia",
  },
  legal: {
    cr: "1010123456",
    vat: "Not registered",
  },
  bank: {
    name: "Al Rajhi Bank",
    iban: "SA 12 8000 0000 6080 1234 5678",
    accountName: "G7 BLUE FOR LOGISTICS",
  },
  finance: {
    currency: "SAR",
    vatPercent: 0,
    terms: "Payment is due within 30 days of invoice date. Late payments may be subject to a 2% monthly fee. Goods remain property of G7 BLUE until full payment."
  }
};
