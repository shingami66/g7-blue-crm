import type { ServiceStatus } from "@/types/service";

const EVENT_BRIEF_EDITABLE_STATUSES: readonly ServiceStatus[] = ["Inquiry", "Quoted"];

export function canEditEventBrief(status: ServiceStatus, canWriteServices: boolean) {
  return canWriteServices && EVENT_BRIEF_EDITABLE_STATUSES.includes(status);
}

export function eventBriefValue(value: string | null | undefined, emptyLabel: string) {
  return value?.trim() || emptyLabel;
}
