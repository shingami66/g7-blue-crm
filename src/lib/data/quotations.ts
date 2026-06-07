import { Quotation } from "@/types";

export const quotationsData: Quotation[] = [
  {
    id: "QT-2023-10-045",
    customer: "Visionary Tech Solutions",
    event: "Annual Tech Summit 2023",
    date: "2023-10-24",
    validUntil: "2023-10-31",
    amount: "162,725.00",
    status: "sent",
    items: [
      {
        description: "Main Stage Setup",
        details: "Includes custom backdrop (10x4m), staging (12x6m), and standard executive furniture setup.",
        category: "Production",
        qty: 1,
        unitPrice: 45000,
        vat: 6750,
        total: 51750,
      },
      {
        description: "Professional AV Equipment",
        details: "Line array sound system, 4x wireless mics, digital mixer, LED screen (P2.5, 8x3m), lighting rig (wash & spot).",
        category: "A/V Tech",
        qty: 3,
        unitPrice: 22000,
        vat: 9900,
        total: 75900,
      },
      {
        description: "Registration Desk & Manpower",
        details: "Custom branded registration counters (x4), badging system, 8 bilingual hostesses for 3 days.",
        category: "Logistics",
        qty: 1,
        unitPrice: 18500,
        vat: 2775,
        total: 21275,
      },
      {
        description: "VIP Lounge Furniture",
        details: "Premium leather seating, coffee tables, ambient lighting, floral arrangements for VIP holding area.",
        category: "Rentals",
        qty: 1,
        unitPrice: 12000,
        vat: 1800,
        total: 13800,
      },
    ]
  },
  {
    id: "QT-2023-10-046",
    customer: "Saudi Aramco",
    event: "Innovation Week",
    date: "2023-10-25",
    validUntil: "2023-11-05",
    amount: "85,500.00",
    status: "approved",
    items: [
      {
        description: "Exhibition Booth (6x6m)",
        details: "Custom build with raised floor, LED counters, and storage room.",
        category: "Production",
        qty: 1,
        unitPrice: 65000,
        vat: 9750,
        total: 74750,
      },
    ]
  },
  {
    id: "QT-2023-10-047",
    customer: "Ministry of Health",
    event: "Medical Conference 2024",
    date: "2023-10-26",
    validUntil: "2023-11-10",
    amount: "320,000.00",
    status: "draft",
    items: []
  },
  {
    id: "QT-2023-10-048",
    customer: "Red Sea Global",
    event: "Sustainable Tourism Expo",
    date: "2023-10-27",
    validUntil: "2023-11-03",
    amount: "145,200.00",
    status: "rejected",
    items: []
  },
  {
    id: "QT-2023-10-049",
    customer: "NEOM",
    event: "The Line Unveiling",
    date: "2023-10-28",
    validUntil: "2023-11-15",
    amount: "2,450,000.00",
    status: "sent",
    items: []
  }
];
