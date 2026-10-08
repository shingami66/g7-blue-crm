import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { register } from "node:module";
import test, { mock } from "node:test";
import { ForbiddenError } from "../auth/errors.ts";
import { getServicesDictionary } from "../i18n/dictionaries/services.ts";

type Filter = { column: string; value: unknown };
type Order = { column: string; ascending: boolean };
type QueryCall = {
  table: string;
  selection: string;
  filters: Filter[];
  ilikes: Array<{ column: string; pattern: string }>;
  orders: Order[];
  limit: number | null;
  operations: string[];
};
type Scenario = {
  permissionCalls: string[];
  deniedPermission: string | null;
  queryCalls: QueryCall[];
  tableData: Record<string, Array<Record<string, unknown>> | null>;
  queryErrors: Record<string, string>;
  rpcCalls: Array<{ name: string; args: Record<string, unknown> }>;
  rpcData: unknown;
  rpcError: { message: string } | null;
  revalidatedPaths: string[];
};

const REPO_ROOT = join(import.meta.dirname, "../../..");
const CARD_PATH = join(REPO_ROOT, "src/app/(dashboard)/services/[id]/ServiceTasksCard.tsx");
const DETAIL_PATH = join(REPO_ROOT, "src/app/(dashboard)/services/[id]/page.tsx");
const TABS_PATH = join(REPO_ROOT, "src/app/(dashboard)/services/[id]/ServiceDetailTabs.tsx");
const SERVICE_TASK_ACTIONS_PATH = join(REPO_ROOT, "src/lib/services/service-task-actions.ts");
const SERVICE_TASK_QUERIES_PATH = join(REPO_ROOT, "src/lib/services/service-task-queries.ts");
const SERVICE_TASK_CONTRACT_PATH = join(REPO_ROOT, "src/lib/services/service-task-contract.ts");
const SERVICE_TASK_RUNTIME_TEST_PATH = join(REPO_ROOT, "src/lib/services/service-tasks-runtime.test.ts");
const SERVICE_TASK_FOUNDATION_TEST_PATH = join(REPO_ROOT, "src/lib/services/service-tasks-foundation-contract.test.ts");
const SERVICE_TASK_MIGRATION_PATH = join(REPO_ROOT, "supabase/migrations/20261007063746_service_tasks.sql");
const GENERATED_TYPES_PATH = join(REPO_ROOT, "src/lib/supabase/database.types.ts");

let activeScenario: Scenario;

function resetScenario(overrides: Partial<Scenario> = {}) {
  activeScenario = {
    permissionCalls: [],
    deniedPermission: null,
    queryCalls: [],
    tableData: {},
    queryErrors: {},
    rpcCalls: [],
    rpcData: {
      id: "44444444-4444-4444-8444-444444444444",
      service_id: "22222222-2222-4222-8222-222222222222",
      status: "open",
    },
    rpcError: null,
    revalidatedPaths: [],
    ...overrides,
  };
}

const testModuleLoader = [
  'export async function resolve(specifier, context, nextResolve) {',
  '  if (specifier === "server-only") return { url: "data:text/javascript,", shortCircuit: true };',
  '  if (specifier === "next/cache") return { url: "data:text/javascript,export function revalidatePath() {}", shortCircuit: true };',
  '  if (specifier.startsWith("@/")) return { url: new URL("./src/" + specifier.slice(2) + ".ts", "file:///" + process.cwd().replaceAll(String.fromCharCode(92), "/") + "/").href, shortCircuit: true };',
  '  if (specifier.startsWith(".") && !specifier.endsWith(".ts") && !specifier.endsWith(".tsx") && !specifier.endsWith(".js")) return { url: new URL(specifier + ".ts", context.parentURL).href, shortCircuit: true };',
  "  return nextResolve(specifier, context);",
  "}",
].join("\n");

register("data:text/javascript," + encodeURIComponent(testModuleLoader), import.meta.url);

mock.module("server-only", { namedExports: {} });
mock.module("next/cache", {
  namedExports: {
    revalidatePath: (path: string) => activeScenario.revalidatedPaths.push(path),
  },
});
mock.module("@/lib/auth/permissions", {
  namedExports: {
    requirePermission: async (permission: string) => {
      activeScenario.permissionCalls.push(permission);
      if (activeScenario.deniedPermission === permission) {
        throw new ForbiddenError("Permission denied");
      }
      return {
        id: "app-user-1",
        clerk_user_id: "clerk_server_actor",
        role: "manager",
        is_active: true,
      };
    },
  },
});

function createQueryBuilder(table: string) {
  const call: QueryCall = {
    table,
    selection: "",
    filters: [],
    ilikes: [],
    orders: [],
    limit: null,
    operations: [],
  };
  activeScenario.queryCalls.push(call);

  const builder = {
    select(selection: string) {
      call.selection = selection;
      call.operations.push("select");
      return builder;
    },
    eq(column: string, value: unknown) {
      call.filters.push({ column, value });
      call.operations.push("eq");
      return builder;
    },
    ilike(column: string, pattern: string) {
      call.ilikes.push({ column, pattern });
      call.operations.push("ilike");
      return builder;
    },
    order(column: string, options?: { ascending?: boolean }) {
      call.orders.push({ column, ascending: options?.ascending !== false });
      call.operations.push("order");
      return builder;
    },
    limit(maximum: number) {
      call.limit = maximum;
      call.operations.push("limit");
      return builder;
    },
    then(
      onfulfilled?: (value: { data: Array<Record<string, unknown>> | null; error: { message: string } | null }) => unknown,
      onrejected?: (reason: unknown) => unknown,
    ) {
      call.operations.push("execute");
      const errorMessage = activeScenario.queryErrors[table];
      if (errorMessage) {
        return Promise.resolve({
          data: null,
          error: { message: errorMessage },
        }).then(onfulfilled, onrejected);
      }

      let rows = [...(activeScenario.tableData[table] ?? [])];
      for (const filter of call.filters) {
        rows = rows.filter((row) => row[filter.column] === filter.value);
      }
      for (const filter of call.ilikes) {
        const search = filter.pattern
          .slice(1, -1)
          .replace(/\\([\\%_])/g, "$1")
          .toLocaleLowerCase();
        rows = rows.filter((row) =>
          String(row[filter.column] ?? "").toLocaleLowerCase().includes(search),
        );
      }
      for (const order of [...call.orders].reverse()) {
        rows.sort((left, right) => {
          const a = String(left[order.column] ?? "");
          const b = String(right[order.column] ?? "");
          const result = a.localeCompare(b);
          return order.ascending ? result : -result;
        });
      }
      if (call.limit !== null) rows = rows.slice(0, call.limit);
      return Promise.resolve({ data: rows, error: null }).then(onfulfilled, onrejected);
    },
  };

  return builder;
}

mock.module("@/lib/supabase/admin", {
  namedExports: {
    createAdminClient: () => ({
      from: (table: string) => createQueryBuilder(table),
      rpc: async (name: string, args: Record<string, unknown>) => {
        activeScenario.rpcCalls.push({ name, args });
        return { data: activeScenario.rpcData, error: activeScenario.rpcError };
      },
    }),
  },
});

const {
  searchActiveServiceTaskAssignees,
  SERVICE_TASK_ASSIGNEE_RESULT_LIMIT,
  getServiceTasks,
} = await import("./service-task-queries.ts");
const {
  createServiceTask,
  searchServiceTaskAssignees,
  transitionServiceTaskStatus,
  updateServiceTaskFields,
} = await import("./service-task-actions.ts");

const SERVICE_ID = "22222222-2222-4222-8222-222222222222";
const OTHER_SERVICE_ID = "33333333-3333-4333-8333-333333333333";
const TASK_ID = "44444444-4444-4444-8444-444444444444";

test("R05 task query is permission-gated, Service-scoped, stably ordered, and retains inactive history", async () => {
  resetScenario({
    tableData: {
      service_tasks: [
        {
          id: TASK_ID,
          service_id: SERVICE_ID,
          title: "Confirm venue access",
          description: null,
          assignee_user_id: "inactive-user",
          status: "open",
          due_date: null,
          created_at: "2026-10-01T08:00:00.000Z",
          assignee: { id: "inactive-user", name: "Historic Owner", is_active: false },
        },
        {
          id: "55555555-5555-4555-8555-555555555555",
          service_id: OTHER_SERVICE_ID,
          title: "Other service task",
          description: null,
          assignee_user_id: null,
          status: "open",
          due_date: null,
          created_at: "2026-10-01T09:00:00.000Z",
          assignee: null,
        },
      ],
    },
  });

  const result = await getServiceTasks(SERVICE_ID);
  assert.equal(result.status, "ready");
  if (result.status !== "ready") return;
  assert.equal(result.tasks.length, 1);
  assert.equal(result.tasks[0].serviceId, SERVICE_ID);
  assert.deepEqual(result.tasks[0].assignee, {
    id: "inactive-user",
    name: "Historic Owner",
    isActive: false,
  });
  assert.deepEqual(activeScenario.permissionCalls, ["services:read"]);
  assert.deepEqual(activeScenario.queryCalls[0].filters, [
    { column: "service_id", value: SERVICE_ID },
  ]);
  assert.deepEqual(activeScenario.queryCalls[0].orders.map((order) => order.column), [
    "created_at",
    "id",
  ]);
  assert.match(activeScenario.queryCalls[0].selection, /assignee:app_users!service_tasks_assignee_user_id_fkey/);
  assert.doesNotMatch(activeScenario.queryCalls[0].selection, /email|role/);

  resetScenario({ deniedPermission: "services:read" });
  await assert.rejects(() => getServiceTasks(SERVICE_ID), ForbiddenError);
  assert.equal(activeScenario.queryCalls.length, 0);
});

test("R05 active-assignee query is permission-gated, searchable, deterministic, and capped at 20", async () => {
  const activeUsers = Array.from({ length: 24 }, (_, index) => ({
    id: `active-${String(index).padStart(2, "0")}`,
    name: `Operator ${String(index).padStart(2, "0")}`,
    is_active: true,
  }));
  resetScenario({
    tableData: {
      app_users: [
        { id: "inactive-user", name: "Aaron Inactive", is_active: false },
        ...activeUsers,
        { id: "z-user", name: "Zelda Beyond First Window", is_active: true },
      ],
    },
  });

  assert.equal(SERVICE_TASK_ASSIGNEE_RESULT_LIMIT, 20);
  const firstWindow = await searchActiveServiceTaskAssignees();
  assert.equal(firstWindow.status, "ready");
  if (firstWindow.status !== "ready") return;
  assert.equal(firstWindow.assignees.length, 20);
  assert.deepEqual(firstWindow.assignees.map((assignee) => assignee.id),
    activeUsers.slice(0, 20).map((user) => user.id));
  assert.equal(firstWindow.assignees.some((assignee) => assignee.id === "inactive-user"), false);
  assert.deepEqual(activeScenario.queryCalls[0].filters, [
    { column: "is_active", value: true },
  ]);
  assert.equal(activeScenario.queryCalls[0].selection, "id, name");
  assert.deepEqual(activeScenario.queryCalls[0].ilikes, []);
  assert.equal(activeScenario.queryCalls[0].limit, 20);
  assert.deepEqual(activeScenario.queryCalls[0].orders.map((order) => order.column), ["name", "id"]);
  assert.deepEqual(activeScenario.queryCalls[0].operations, [
    "select", "eq", "order", "order", "limit", "execute",
  ]);

  const beyondFirstWindow = await searchServiceTaskAssignees("  Zelda  ");
  assert.equal(beyondFirstWindow.status, "ready");
  if (beyondFirstWindow.status !== "ready") return;
  assert.deepEqual(beyondFirstWindow.assignees.map((assignee) => assignee.id), ["z-user"]);
  assert.deepEqual(activeScenario.queryCalls[1].ilikes, [
    { column: "name", pattern: "%Zelda%" },
  ]);
  assert.equal(activeScenario.queryCalls[1].limit, 20);
  assert.deepEqual(activeScenario.queryCalls[1].operations, [
    "select", "eq", "ilike", "order", "order", "limit", "execute",
  ]);
  assert.deepEqual(activeScenario.permissionCalls, ["service_tasks:write", "service_tasks:write"]);
  assert.equal(activeScenario.permissionCalls.includes("users:manage"), false);

  const querySource = readFileSync(join(REPO_ROOT, "src/lib/services/service-task-queries.ts"), "utf8");
  assert.match(querySource, /searchActiveServiceTaskAssignees\(\s*search = ""/);
  assert.match(querySource, /limit\(SERVICE_TASK_ASSIGNEE_RESULT_LIMIT\)/);
  assert.doesNotMatch(querySource, /\.limit\(\s*search/);
});

test("R05 assignee-search action rejects unreasonable input without loading the directory", async () => {
  resetScenario();
  const result = await searchServiceTaskAssignees("x".repeat(81));
  assert.deepEqual(result, { status: "error", assignees: [] });
  assert.equal(activeScenario.queryCalls.length, 0);
});

test("R05 create action uses the atomic RPC, trusted actor, writer permission, and Service-only revalidation", async () => {
  resetScenario();
  const invalid = await createServiceTask({
    serviceId: SERVICE_ID,
    title: "  Confirm venue access  ",
    description: "Check loading access",
    assigneeUserId: null,
    dueDate: null,
    actorId: "client-forged-actor",
  });

  assert.deepEqual(invalid, { success: false, code: "INVALID_INPUT" });
  assert.equal(activeScenario.rpcCalls.length, 0);

  const success = await createServiceTask({
    serviceId: SERVICE_ID,
    title: "  Confirm venue access  ",
    description: "Check loading access",
    assigneeUserId: null,
    dueDate: null,
  });
  assert.deepEqual(success, { success: true });
  assert.deepEqual(activeScenario.permissionCalls, ["service_tasks:write"]);
  assert.equal(activeScenario.rpcCalls.length, 1);
  assert.equal(activeScenario.rpcCalls[0].name, "create_service_task_atomic");
  assert.equal(activeScenario.rpcCalls[0].args.p_actor_id, "clerk_server_actor");
  assert.equal(activeScenario.rpcCalls[0].args.p_title, "Confirm venue access");
  assert.deepEqual(activeScenario.revalidatedPaths, ["/services/" + SERVICE_ID]);
});

test("R05 update action maps only the four approved fields to its atomic RPC", async () => {
  resetScenario();
  const invalid = await updateServiceTaskFields({
    serviceId: SERVICE_ID,
    taskId: TASK_ID,
    changes: { title: "Changed", status: "completed" },
  });
  assert.deepEqual(invalid, { success: false, code: "INVALID_INPUT" });
  assert.equal(activeScenario.rpcCalls.length, 0);

  const result = await updateServiceTaskFields({
    serviceId: SERVICE_ID,
    taskId: TASK_ID,
    changes: {
      title: "Updated task",
      description: null,
      assigneeUserId: "66666666-6666-4666-8666-666666666666",
      dueDate: "2026-10-20",
    },
  });
  assert.deepEqual(result, { success: true });
  assert.deepEqual(activeScenario.permissionCalls, ["service_tasks:write"]);
  assert.equal(activeScenario.rpcCalls.length, 1);
  assert.equal(activeScenario.rpcCalls[0].name, "update_service_task_fields_atomic");
  assert.equal(activeScenario.rpcCalls[0].args.p_actor_id, "clerk_server_actor");
  assert.deepEqual(activeScenario.rpcCalls[0].args.p_changes, {
    title: "Updated task",
    description: null,
    assignee_user_id: "66666666-6666-4666-8666-666666666666",
    due_date: "2026-10-20",
  });
  assert.deepEqual(activeScenario.revalidatedPaths, ["/services/" + SERVICE_ID]);
});

test("R05 status action accepts only approved targets and calls only the transition RPC", async () => {
  resetScenario();
  const invalid = await transitionServiceTaskStatus({
    serviceId: SERVICE_ID,
    taskId: TASK_ID,
    toStatus: "open",
  });
  assert.deepEqual(invalid, { success: false, code: "INVALID_INPUT" });
  assert.equal(activeScenario.rpcCalls.length, 0);

  const result = await transitionServiceTaskStatus({
    serviceId: SERVICE_ID,
    taskId: TASK_ID,
    toStatus: "in_progress",
  });
  assert.deepEqual(result, { success: true });
  assert.deepEqual(activeScenario.permissionCalls, ["service_tasks:write"]);
  assert.equal(activeScenario.rpcCalls.length, 1);
  assert.equal(activeScenario.rpcCalls[0].name, "transition_service_task_status_atomic");
  assert.equal(activeScenario.rpcCalls[0].args.p_actor_id, "clerk_server_actor");
  assert.deepEqual(activeScenario.revalidatedPaths, ["/services/" + SERVICE_ID]);
});

test("R05 RPC errors map to stable codes without returning database messages", async () => {
  resetScenario({ rpcError: { message: "service_task_active_assignee_required: raw details" } });
  const result = await transitionServiceTaskStatus({
    serviceId: SERVICE_ID,
    taskId: TASK_ID,
    toStatus: "completed",
  });
  assert.deepEqual(result, { success: false, code: "ACTIVE_ASSIGNEE_REQUIRED" });
  assert.equal(JSON.stringify(result).includes("raw details"), false);
  assert.equal(activeScenario.revalidatedPaths.length, 0);
});

test("R05 mutation actions do not report success when the RPC response is missing or belongs to another task", async () => {
  resetScenario({ rpcData: null });
  const missingResponse = await createServiceTask({
    serviceId: SERVICE_ID,
    title: "Confirm access",
  });
  assert.deepEqual(missingResponse, { success: false, code: "GENERIC_FAILURE" });
  assert.equal(activeScenario.revalidatedPaths.length, 0);

  resetScenario({
    rpcData: {
      id: "77777777-7777-4777-8777-777777777777",
      service_id: SERVICE_ID,
      status: "completed",
    },
  });
  const mismatchedResponse = await updateServiceTaskFields({
    serviceId: SERVICE_ID,
    taskId: TASK_ID,
    changes: { title: "Updated title" },
  });
  assert.deepEqual(mismatchedResponse, { success: false, code: "GENERIC_FAILURE" });
  assert.equal(activeScenario.revalidatedPaths.length, 0);
});

test("R05 dormant Event Tasks card remains read-only for closed Services, unauthorized writers, and completed tasks", () => {
  const card = readFileSync(CARD_PATH, "utf8");

  assert.match(card, /const canMutate = canWrite && !serviceClosed && !loadError/);
  assert.match(card, /searchServiceTaskAssignees\(search\)/);
  assert.match(card, /type="search"/);
  assert.match(card, /maxLength=\{80\}/);
  assert.match(card, /searchState === "loading"/);
  assert.match(card, /dictionary\.noMatchingAssignee/);
  assert.match(card, /dictionary\.assigneeOptionsUnavailable/);
  assert.match(card, /task\.status !== "completed"/);
  assert.match(card, /dictionary\.statuses\[task\.status\]/);
  assert.match(card, /task\.assignee\.isActive/);
});

test("R05-P3 removes Event Tasks from Service detail and preserves the dormant foundation", () => {
  const page = readFileSync(DETAIL_PATH, "utf8");

  assert.doesNotMatch(
    page,
    /ServiceDetailTabs|ServiceTasksCard|ServiceDetailPageTasks|getServiceTasks|SERVICE_TASK_PERMISSIONS|searchActiveServiceTaskAssignees|searchServiceTaskAssignees|service-task-queries|dictionary\.detail\.tabs|dictionary\.eventTasks|service_tasks|Event Tasks|eventTasks/,
  );
  assert.doesNotMatch(page, /\/tasks(?:["'/?#]|$)/);

  assert.match(page, /<div className="min-w-0 max-w-full space-y-6">/);
  assert.match(page, /<RecordBackButton/);
  assert.match(page, /<RecordNavigationSlot/);
  for (const workflow of [
    "<EventBrief",
    "<ServiceLifecycleActions",
    "<SectionHeader title={dictionary.detail.sections.operationalDetails}",
    "<RelatedQuotationsCard",
    "<ProcurementSummaryCard",
    "<CommitmentSummaryCard",
    "<EventCostingSummaryCard",
    "<ServiceBillingSummaryCard",
    "<ServiceActivityHistory",
    "<ServiceCancellationActions",
  ]) {
    assert.ok(page.includes(workflow), "Service detail must retain " + workflow);
  }

  const overviewIndex = page.indexOf("<EventBrief");
  const secondaryComponentIndex = page.indexOf("async function ServiceDetailPageSecondary(");
  assert.ok(overviewIndex >= 0 && overviewIndex < secondaryComponentIndex);

  for (const filePath of [
    CARD_PATH,
    TABS_PATH,
    SERVICE_TASK_ACTIONS_PATH,
    SERVICE_TASK_QUERIES_PATH,
    SERVICE_TASK_CONTRACT_PATH,
    SERVICE_TASK_RUNTIME_TEST_PATH,
    SERVICE_TASK_FOUNDATION_TEST_PATH,
    SERVICE_TASK_MIGRATION_PATH,
    GENERATED_TYPES_PATH,
  ]) {
    assert.ok(existsSync(filePath), "Dormant R05 source must remain: " + filePath);
  }

  const generatedTypes = readFileSync(GENERATED_TYPES_PATH, "utf8");
  const migration = readFileSync(SERVICE_TASK_MIGRATION_PATH, "utf8");
  for (const rpc of [
    "create_service_task_atomic",
    "update_service_task_fields_atomic",
    "transition_service_task_status_atomic",
  ]) {
    assert.ok(generatedTypes.includes(rpc + ":"), "Generated R05 RPC type must remain: " + rpc);
    assert.ok(migration.includes("CREATE FUNCTION public." + rpc + "("), "R05 migration RPC must remain: " + rpc);
  }
  assert.match(generatedTypes, /service_tasks:/);
  assert.match(migration, /CREATE TABLE public\.service_tasks\s*\(/);
});

test("R05 C5 keeps creation closed until requested and lets users dismiss without mutation", () => {
  const card = readFileSync(CARD_PATH, "utf8");
  const closeHandler = card.match(/function closeCreateDialog\(\) \{([\s\S]*?)\n  \}/)?.[1] ?? "";

  assert.match(card, /const \[createDialogOpen, setCreateDialogOpen\] = useState\(false\)/);
  assert.match(card, /if \(createDialogOpen && !dialog\.open\) dialog\.showModal\(\)/);
  assert.match(card, /aria-haspopup="dialog"/);
  assert.match(card, /onClick=\{\(\) => \{[\s\S]*?setCreateDialogOpen\(true\)/);
  assert.match(card, /<dialog[\s\S]*?aria-labelledby=\{createDialogTitleId\}/);
  assert.match(card, /<h3 id=\{createDialogTitleId\}/);
  assert.match(card, /max-h-\[calc\(100dvh-2rem\)\][\s\S]*?overflow-y-auto/);
  assert.match(card, /onCancel=\{\(event\) => \{[\s\S]*?event\.preventDefault\(\)/);
  assert.ok(closeHandler.length > 0, "Create dialog has an explicit close handler");
  assert.doesNotMatch(closeHandler, /createServiceTask|updateServiceTaskFields|transitionServiceTaskStatus/);
  assert.match(card, /if \(result\.success\) \{[\s\S]*?setCreateDialogOpen\(false\)/);
  assert.match(card, /createServiceTask\(/);
  assert.match(card, /updateServiceTaskFields\(/);
  assert.match(card, /transitionServiceTaskStatus\(/);
  assert.match(card, /<bdi dir="auto">\{task\.title\}<\/bdi>/);
  assert.match(card, /dictionary\.summary\.total/);
  assert.match(card, /dictionary\.summary\.completed/);
});

test("R05 EN/AR labels, inactive assignment display, generated types, and scope firewall are present", () => {
  const english = getServicesDictionary("en").eventTasks;
  const arabic = getServicesDictionary("ar").eventTasks;
  const englishDetail = getServicesDictionary("en").detail;
  const arabicDetail = getServicesDictionary("ar").detail;
  assert.equal(englishDetail.tabs.overview, "Overview");
  assert.equal(englishDetail.tabs.eventTasks, "Event Tasks");
  assert.equal(arabicDetail.tabs.overview, "نظرة عامة");
  assert.equal(arabicDetail.tabs.eventTasks, "مهام الفعالية");
  assert.equal(english.summary.total, "Total tasks");
  assert.equal(arabic.summary.total, "إجمالي المهام");
  assert.equal(english.statuses.open, "Open");
  assert.equal(english.statuses.in_progress, "In progress");
  assert.equal(english.statuses.completed, "Completed");
  assert.equal(arabic.statuses.open, "مفتوحة");
  assert.equal(arabic.statuses.in_progress, "قيد التنفيذ");
  assert.equal(arabic.statuses.completed, "مكتملة");
  assert.notEqual(arabic.inactiveAssignee, english.inactiveAssignee);
  assert.notEqual(arabic.serviceClosed, english.serviceClosed);
  assert.notEqual(arabic.searchAssignees, english.searchAssignees);
  assert.notEqual(arabic.noMatchingAssignee, english.noMatchingAssignee);
  assert.notEqual(arabic.assigneeSearchLoading, english.assigneeSearchLoading);

  const card = readFileSync(CARD_PATH, "utf8");
  assert.match(card, /task\?\.assigneeUserId === value \? task\.assignee : null/);
  assert.match(card, /selectedAssignee\.isActive \? "" :/);
  assert.match(card, /dictionary\.inactiveAssignee/);
  assert.match(card, /dictionary\.unknownAssignee/);

  const generatedTypes = readFileSync(GENERATED_TYPES_PATH, "utf8");
  for (const rpc of [
    "service_tasks:",
    "create_service_task_atomic:",
    "update_service_task_fields_atomic:",
    "transition_service_task_status_atomic:",
  ]) {
    assert.equal(generatedTypes.includes(rpc), true);
  }

  const implementation = [
    readFileSync(CARD_PATH, "utf8"),
    readFileSync(DETAIL_PATH, "utf8"),
    readFileSync(join(REPO_ROOT, "src/lib/services/service-task-queries.ts"), "utf8"),
    readFileSync(join(REPO_ROOT, "src/lib/services/service-task-actions.ts"), "utf8"),
    readFileSync(join(REPO_ROOT, "src/lib/services/service-task-contract.ts"), "utf8"),
  ].join("\n");
  assert.doesNotMatch(implementation, /project_tasks|Action Center|milestone|issue|team roster/i);
});
