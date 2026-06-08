"use client";

import { Printer } from "lucide-react";

export default function PrintButton() {
  return (
    <button
      className="bg-primary-container text-on-primary text-[12px] font-semibold px-4 py-2 rounded shadow hover:bg-primary transition-colors flex items-center gap-2"
      onClick={() => window.print()}
    >
      <Printer size={16} />
      Print / Save as PDF
    </button>
  );
}
