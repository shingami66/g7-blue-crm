"use client";

import type { DocumentLocale, DocumentDictionary } from "@/lib/documents/locale";
import DocumentLocaleSelect from "./DocumentLocaleSelect";
import PrintButton from "./PrintButton";

type DocumentPreviewToolbarProps = {
  documentLocale: DocumentLocale;
  dictionary: DocumentDictionary;
  id?: string;
};

export default function DocumentPreviewToolbar({
  documentLocale,
  dictionary,
  id = "documentPrintLanguage",
}: DocumentPreviewToolbarProps) {
  return (
    <aside
      aria-label={dictionary.locale.label}
      dir="ltr"
      className="no-print w-full max-w-[210mm] mb-5 flex flex-wrap items-center justify-end gap-2 text-on-surface"
    >
      <DocumentLocaleSelect
        value={documentLocale}
        labels={dictionary.locale}
        id={id}
      />
      <div className="flex items-center" title={dictionary.common.printHelp}>
        <PrintButton
          label={dictionary.common.print}
          loadingLabel={dictionary.common.preparingPrint}
        />
        <span className="sr-only">{dictionary.common.printHelp}</span>
      </div>
    </aside>
  );
}
