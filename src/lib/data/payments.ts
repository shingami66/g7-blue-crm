import { Payment } from "@/types";

export const paymentsData: Payment[] = [
  {
    id: "PAY-1045",
    invoiceId: "INV-2023-0893",
    customer: "Saudi Aramco Events",
    date: "2023-10-25",
    amount: "64,400.00",
    method: "bank_transfer",
    reference: "TRX-8839201",
    status: "confirmed",
  },
  {
    id: "PAY-1046",
    invoiceId: "INV-2023-0880",
    customer: "Vision Motors",
    date: "2023-10-24",
    amount: "12,500.00",
    method: "online",
    reference: "CHG-992011",
    status: "confirmed",
  },
  {
    id: "PAY-1047",
    invoiceId: "INV-2023-0894",
    customer: "Riyadh Season",
    date: "2023-10-26",
    amount: "450,000.00",
    method: "bank_transfer",
    reference: "TRX-PENDING",
    status: "pending",
  },
  {
    id: "PAY-1048",
    invoiceId: "INV-2023-0850",
    customer: "Red Sea Film Festival",
    date: "2023-10-20",
    amount: "85,000.00",
    method: "cheque",
    reference: "CHQ-004521",
    status: "confirmed",
  },
];
