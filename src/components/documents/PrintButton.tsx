"use client";

import { useEffect, useRef, useState } from "react";
import { Printer } from "lucide-react";
import Button from "@/components/ui/Button";

type PrintButtonProps = {
  label?: string;
  loadingLabel?: string;
};

export default function PrintButton({
  label = "Print",
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
      variant="primary"
      size="sm"
      loading={isPrinting}
      loadingLabel={loadingLabel}
      onClick={handlePrint}
    >
      <span className="inline-flex items-center gap-2 whitespace-nowrap">
        <Printer size={16} aria-hidden="true" />
        <span>{label}</span>
      </span>
    </Button>
  );
}
