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

test("R04-B-UX1: Event Brief omits lifecycle details while retaining Service context and status", () => {
  const brief = readFileSync(EVENT_BRIEF, "utf8");

  for (const field of [
    "service.serviceNumber",
    "service.serviceTitle",
    "service.customerId",
    "service.customer?.company",
    "service.customer?.contact",
    "service.customer?.customerNumber",
    "service.eventName",
    "service.eventType",
    "service.eventStartDate",
    "service.eventEndDate",
    "service.eventLocation",
    "service.description",
  ]) {
    assert.equal(brief.includes(field), true, "Expected Event Brief to render each Service and Customer field");
  }

  assert.doesNotMatch(brief, /lifecycle/i);
  assert.match(
    brief,
    /<BriefItem label=\{dictionary\.detail\.labels\.status\}>[\s\S]*?<StatusBadge[\s\S]*?getServiceStatusLabel\(dictionary\.locale, service\.status\)/,
  );
  assert.match(brief, /min-w-0 break-words/);
  assert.doesNotMatch(brief, /getQuotationsByServiceIdResult|event_snapshot|estimatedBudget/i);
});

test("R04-B-UX1: Event Lifecycle remains separate and Event Brief no longer requires lifecycle data", () => {
  const detail = readFileSync(DETAIL_PAGE, "utf8");
  const eventBriefInvocation = detail.match(/<EventBrief\b[^>]*\/>/)?.[0];
  const lifecycleSection = detail.match(/<ServiceLifecycleActions[\s\S]*?\/>/)?.[0];

  assert.ok(eventBriefInvocation, "Expected Event Brief on Service detail");
  assert.doesNotMatch(eventBriefInvocation, /lifecycle=/);
  assert.ok(lifecycleSection, "Expected the dedicated Event Lifecycle section on Service detail");
  assert.match(detail, /checkPermission\("services:update_status"\)/);
  assert.match(detail, /\{canUpdateServiceStatus && \(\s*<ServiceLifecycleActions[\s\S]*?\/>\s*\)\}/);
  assert.match(lifecycleSection, /lifecycle=\{lifecycle\}/);
});

test("R04-B-UX1: Operational Details keeps exactly three facts in responsive columns", () => {
  const detail = readFileSync(DETAIL_PAGE, "utf8");
  const sectionStart = detail.indexOf("<SectionHeader title={dictionary.detail.sections.operationalDetails} />");
  const sectionEnd = detail.indexOf("</dl>", sectionStart);
  const operationalDetails = detail.slice(sectionStart, sectionEnd);

  assert.notEqual(sectionStart, -1, "Expected Operational Details section");
  assert.notEqual(sectionEnd, -1, "Expected Operational Details facts");
  assert.equal((operationalDetails.match(/<DetailItem\b/g) ?? []).length, 3);
  for (const field of [
    "dictionary.detail.labels.estimatedBudget",
    "dictionary.detail.labels.createdAt",
    "dictionary.detail.labels.updatedAt",
  ]) {
    assert.equal(operationalDetails.includes(field), true, "Expected all three Operational Details facts");
  }
  assert.match(operationalDetails, /grid-cols-1[^"]*md:grid-cols-3/);
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
