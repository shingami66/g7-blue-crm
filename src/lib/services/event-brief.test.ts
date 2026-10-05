import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import { getServicesDictionary } from "../i18n/dictionaries/services.ts";
import { canEditEventBrief, eventBriefValue } from "./event-brief.ts";
import type { ServiceStatus } from "../../types/service.ts";

const REPO_ROOT = join(import.meta.dirname, "../../..");
const DETAIL_PAGE = join(REPO_ROOT, "src/app/(dashboard)/services/[id]/page.tsx");
const EVENT_BRIEF = join(REPO_ROOT, "src/app/(dashboard)/services/[id]/EventBrief.tsx");

const STATUSES: readonly ServiceStatus[] = [
  "Inquiry",
  "Quoted",
  "Approved",
  "Deposit Paid",
  "In Progress",
  "Completed",
  "Cancelled",
];

test("R04-B: Event Brief edit control follows the existing Inquiry/Quoted write boundary", () => {
  for (const status of STATUSES) {
    assert.equal(canEditEventBrief(status, true), status === "Inquiry" || status === "Quoted");
    assert.equal(canEditEventBrief(status, false), false);
  }

  const detail = readFileSync(DETAIL_PAGE, "utf8");
  assert.match(detail, /isEventBriefEditable\(service\.status, canEditService\)/);
  assert.match(detail, /<ServiceLifecycleActions/);
});

test("R04-B: Event Brief presents current Service and Customer context without quotation or budget dependency", () => {
  const brief = readFileSync(EVENT_BRIEF, "utf8");

  for (const field of [
    "service.serviceNumber",
    "service.serviceTitle",
    "service.customerId",
    "service.customer?.contact",
    "service.eventName",
    "service.eventType",
    "service.eventStartDate",
    "service.eventEndDate",
    "service.eventLocation",
    "service.description",
    "lifecycle.commercialState",
  ]) {
    assert.equal(brief.includes(field), true, `Expected Event Brief to render ${field}`);
  }

  assert.doesNotMatch(brief, /getQuotationsByServiceIdResult|event_snapshot|estimatedBudget/i);
});

test("R04-B: Event Brief empty values use the localized empty label", () => {
  assert.equal(eventBriefValue(null, "Not set"), "Not set");
  assert.equal(eventBriefValue(undefined, "Not set"), "Not set");
  assert.equal(eventBriefValue("   ", "Not set"), "Not set");
  assert.equal(eventBriefValue("Riyadh", "Not set"), "Riyadh");
});

test("R04-B: Event Brief label is present in English and Arabic dictionaries", () => {
  assert.equal(getServicesDictionary("en").detail.sections.eventBrief, "Event Brief");
  assert.equal(getServicesDictionary("ar").detail.sections.eventBrief, "موجز الفعالية");
});
