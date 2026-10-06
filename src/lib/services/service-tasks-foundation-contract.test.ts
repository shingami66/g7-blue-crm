import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const migration = readFileSync(
  join(process.cwd(), "supabase/migrations/20261006092707_service_tasks.sql"),
  "utf8",
);

function functionBody(name: string): string {
  const start = migration.indexOf(`CREATE FUNCTION public.${name}(`);
  assert.notEqual(start, -1, `missing function ${name}`);
  const bodyStart = migration.indexOf("AS $$", start);
  assert.notEqual(bodyStart, -1, `missing body for ${name}`);
  const bodyEnd = migration.indexOf("$$;", bodyStart);
  assert.notEqual(bodyEnd, -1, `unterminated body for ${name}`);
  return migration.slice(bodyStart + "AS $$".length, bodyEnd);
}

const createTask = functionBody("create_service_task_atomic");
const updateTask = functionBody("update_service_task_fields_atomic");
const transitionTask = functionBody("transition_service_task_status_atomic");

test("R05 task schema is Service-scoped and contains only the approved states", () => {
  assert.match(migration, /CREATE TABLE public\.service_tasks\s*\(/);
  assert.match(migration, /service_id uuid NOT NULL REFERENCES public\.services\(id\) ON DELETE RESTRICT/);
  assert.match(migration, /assignee_user_id uuid REFERENCES public\.app_users\(id\) ON DELETE RESTRICT/);
  assert.match(migration, /CHECK \(length\(btrim\(title\)\) > 0\)/);
  assert.match(migration, /CHECK \(status IN \('open', 'in_progress', 'completed'\)\)/);
  assert.equal((migration.match(/CREATE INDEX\b/gi) ?? []).length, 1);
  assert.match(migration, /CREATE INDEX idx_service_tasks_service_id\s+ON public\.service_tasks\s*\(service_id\)/);
  assert.doesNotMatch(migration, /CREATE TABLE public\.project_tasks|\bproject_tasks\b/i);
  assert.doesNotMatch(migration, /completed_at|completed_by|priority|task_number|soft_deleted_at|milestone_id|issue_id/i);
});

test("R05 task mutation RPCs enforce the parent Service boundary and serialize on it", () => {
  for (const body of [createTask, updateTask, transitionTask]) {
    assert.match(body, /FROM public\.services AS s[\s\S]*s\.deleted_at IS NULL[\s\S]*FOR UPDATE/);
    assert.match(body, /v_service_status IN \('Completed', 'Cancelled'\)/);
  }
  assert.match(updateTask, /st\.service_id = p_service_id/);
  assert.match(transitionTask, /st\.service_id = p_service_id/);
  assert.doesNotMatch(migration, /UPDATE public\.services\b/i);
});

test("R05 task assignment requires active users for new assignment and progress", () => {
  assert.match(createTask, /u\.id = p_assignee_user_id[\s\S]*u\.is_active IS TRUE[\s\S]*FOR SHARE/);
  assert.match(updateTask, /v_task\.assignee_user_id IS DISTINCT FROM v_assignee_user_id[\s\S]*u\.is_active IS TRUE[\s\S]*FOR SHARE/);
  assert.match(transitionTask, /v_task\.assignee_user_id IS NULL/);
  assert.match(transitionTask, /u\.id = v_task\.assignee_user_id[\s\S]*u\.is_active IS TRUE[\s\S]*FOR SHARE/);
});

test("R05 task updates are field-limited and completion is terminal", () => {
  assert.match(updateTask, /p_changes - ARRAY\['title', 'description', 'assignee_user_id', 'due_date'\]::text\[\]/);
  assert.match(updateTask, /v_task\.status = 'completed'[\s\S]*service_task_completed_read_only/);
  assert.match(transitionTask, /v_task\.status = 'completed'[\s\S]*service_task_completed_read_only/);
  assert.match(transitionTask, /v_task\.status = 'open' AND p_to_status IN \('in_progress', 'completed'\)/);
  assert.match(transitionTask, /v_task\.status = 'in_progress' AND p_to_status = 'completed'/);
  assert.doesNotMatch(migration, /DELETE\s+FROM\s+public\.service_tasks|CREATE FUNCTION public\.delete_service_task/i);
  assert.doesNotMatch(transitionTask, /p_to_status\s*=\s*'open'/);
});

test("R05 task and audit writes are atomic and use one generic audit action each", () => {
  for (const [body, mutation] of [
    [createTask, /INSERT INTO public\.service_tasks/],
    [updateTask, /UPDATE public\.service_tasks/],
    [transitionTask, /UPDATE public\.service_tasks/],
  ] as const) {
    assert.match(body, mutation);
    assert.equal((body.match(/INSERT INTO public\.audit_logs/g) ?? []).length, 1);
    assert.ok(body.indexOf("INSERT INTO public.audit_logs") > body.search(mutation));
  }
  assert.match(createTask, /'create'[\s\S]*'task_created'/);
  assert.match(updateTask, /'update'[\s\S]*'task_updated'[\s\S]*'changes', v_audit_changes/);
  assert.match(transitionTask, /'status_change'[\s\S]*'event_type', v_event_type[\s\S]*'from_status', v_from_status[\s\S]*'to_status', p_to_status/);
  assert.match(transitionTask, /p_to_status = 'completed' THEN 'task_completed'[\s\S]*ELSE 'task_status_changed'/);
  assert.equal((transitionTask.match(/INSERT INTO public\.audit_logs/g) ?? []).length, 1);
  assert.doesNotMatch(migration, /ALTER TABLE public\.audit_logs|audit_logs_action_check/i);
});

test("R05 task table and RPCs remain server-mediated", () => {
  assert.match(migration, /ALTER TABLE public\.service_tasks ENABLE ROW LEVEL SECURITY/);
  assert.match(migration, /REVOKE ALL ON TABLE public\.service_tasks FROM PUBLIC, anon, authenticated, service_role/);
  assert.match(migration, /GRANT SELECT, INSERT, UPDATE ON TABLE public\.service_tasks TO service_role/);
  assert.doesNotMatch(migration, /CREATE\s+POLICY/i);
  assert.doesNotMatch(migration, /SECURITY\s+DEFINER/i);

  for (const name of [
    "create_service_task_atomic",
    "update_service_task_fields_atomic",
    "transition_service_task_status_atomic",
  ]) {
    assert.match(migration, new RegExp(`CREATE FUNCTION public\\.${name}\\([\\s\\S]*?SECURITY INVOKER`));
    assert.match(migration, new RegExp(`REVOKE ALL ON FUNCTION public\\.${name}\\(`));
    assert.match(migration, new RegExp(`GRANT EXECUTE ON FUNCTION public\\.${name}[\\s\\S]*TO service_role`));
  }
});
