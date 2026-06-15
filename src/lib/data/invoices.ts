import { Invoice } from "@/types";

export const invoicesData: Invoice[] = [
  {
    id: "INV-2023-0892",
    customerId: "CUST-000", // using placeholder customer id since none existed
    customer: "Acme Corporation",
    date: "2023-10-24",
    dueDate: "2023-11-23",
    amount: "177,100.00",
    status: "sent",
    type: "Commercial Invoice",
    relatedQuote: "QT-2023-1104",
    quotationId: "QT-2023-1104",
    items: [
      {
        description: "Enterprise CRM License - Annual",
        details: "Includes core modules, 50 user seats, and standard SLA support for 12 months.",
        qty: 1,
        unitPrice: 120000,
        vat: 18000,
        total: 138000,
      },
      {
        description: "System Integration & Setup",
        details: "One-time implementation fee including data migration from legacy systems.",
        qty: 1,
        unitPrice: 25000,
        vat: 3750,
        total: 28750,
      },
      {
        description: "On-site Training Session",
        details: "2-day comprehensive training for administrators and key stakeholders.",
        qty: 2,
        unitPrice: 4500,
        vat: 1350,
        total: 10350,
      },
    ]
  },
  {
    id: "INV-2023-0893",
    customerId: "CUST-001",
    customer: "Saudi Aramco Events",
    date: "2023-10-20",
    dueDate: "2023-11-19",
    amount: "64,400.00",
    status: "paid",
    type: "Commercial Invoice",
    relatedQuote: "QT-2023-10-046",
    quotationId: "QT-2023-10-046",
    items: []
  },
  {
    id: "INV-2023-0894",
    customerId: "CUST-002",
    customer: "Riyadh Season",
    date: "2023-09-15",
    dueDate: "2023-10-15",
    amount: "450,000.00",
    status: "overdue",
    type: "Commercial Invoice",
    relatedQuote: "QT-2023-09-012",
    quotationId: "QT-2023-09-012",
    items: []
  },
  {
    id: "INV-2023-0895",
    customerId: "CUST-003",
    customer: "NEOM Logistics",
    date: "2023-10-25",
    dueDate: "2023-11-24",
    amount: "215,050.00",
    status: "sent",
    type: "Commercial Invoice",
    relatedQuote: "QT-2023-10-049",
    quotationId: "QT-2023-10-049",
    items: []
  },
];
