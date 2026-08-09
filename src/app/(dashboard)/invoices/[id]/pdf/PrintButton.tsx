"use client";

import { useEffect, useRef, useState } from "react";
import { Printer } from "lucide-react";
import Button from "@/components/ui/Button";

type PrintButtonProps = {
  label?: string;
  loadingLabel?: string;
};

export default function PrintButton({
  label = "Print / Save as PDF",
  loadingLabel = "Preparing print preview…",
}: PrintButtonProps) {
  const [isPrinting, setIsPrinting] = useState(false);
  const frameRef = useRef<number | null>(null);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    const finishPrinting = () => setIsPrinting(false);
    window.addEventListener("afterprint", finishPrinting);

    return () => {
      window.removeEventListener("afterprint", finishPrinting);
      if (frameRef.current !== null) window.cancelAnimationFrame(frameRef.current);
      if (timerRef.current !== null) window.clearTimeout(timerRef.current);
    };
  }, []);

  const handlePrint = () => {
    if (isPrinting) return;
    setIsPrinting(true);
    frameRef.current = window.requestAnimationFrame(() => {
      try {
        window.print();
        timerRef.current = window.setTimeout(() => setIsPrinting(false), 800);
      } catch {
        setIsPrinting(false);
      }
    });
  };

  return (
    <Button
      type="button"
      className="bg-primary-container text-on-primary text-[12px] font-semibold px-4 py-2 rounded shadow hover:bg-primary transition-colors flex items-center gap-2"
      loading={isPrinting}
      loadingLabel={loadingLabel}
      onClick={handlePrint}
    >
      <Printer size={16} />
      {label}
    </Button>
  );
}
