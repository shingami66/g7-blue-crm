import SharedAuthenticatedStatePanel from "@/components/ui/SharedAuthenticatedStatePanel";
import type { ReportReadState } from "@/lib/reports/types";
import type { ReportCenterDictionary } from "@/lib/i18n/dictionaries/report-center";

export default function ReportState({ status, dictionary }: { status: ReportReadState; dictionary: ReportCenterDictionary }) {
  const copy = status === "forbidden"
    ? dictionary.workspace.forbidden
    : status === "invalid"
      ? dictionary.workspace.invalid
    : status === "unavailable"
      ? dictionary.workspace.unavailable
      : status === "partial"
        ? dictionary.workspace.partial
        : status === "empty"
          ? dictionary.workspace.empty
          : dictionary.workspace.error;
  const title = status === "forbidden" ? dictionary.catalog.unavailable : status === "empty" ? dictionary.workspace.empty : status === "invalid" ? dictionary.workspace.invalid : dictionary.workspace.error;
  return <SharedAuthenticatedStatePanel title={title} message={copy} role={status === "error" || status === "unavailable" || status === "invalid" ? "alert" : "status"} />;
}
