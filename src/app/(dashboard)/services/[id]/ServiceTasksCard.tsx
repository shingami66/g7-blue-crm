"use client";

import { useEffect, useRef, useState, useTransition, type FormEvent } from "react";
import {
  createServiceTask,
  searchServiceTaskAssignees,
  transitionServiceTaskStatus,
  updateServiceTaskFields,
} from "@/lib/services/service-task-actions";
import type { ServiceTaskErrorCode } from "@/lib/services/service-task-contract";
import { isClosedServiceStatus } from "@/lib/services/service-task-contract";
import type { ServiceTask, ServiceTaskAssignee } from "@/lib/services/service-task-queries";
import type { ServicesDictionary } from "@/lib/i18n/dictionaries/services";

type EventTasksDictionary = ServicesDictionary["eventTasks"];

type ServiceTasksCardProps = {
  serviceId: string;
  serviceStatus: string;
  tasks: ServiceTask[];
  canWrite: boolean;
  loadError: boolean;
  dictionary: EventTasksDictionary;
  locale: string;
};

type TaskFormValues = {
  title: string;
  description: string;
  assigneeUserId: string;
  dueDate: string;
};

type Feedback =
  | { kind: "success"; message: string }
  | { kind: "error"; message: string };

const EMPTY_FORM: TaskFormValues = {
  title: "",
  description: "",
  assigneeUserId: "",
  dueDate: "",
};

function formValues(task: ServiceTask): TaskFormValues {
  return {
    title: task.title,
    description: task.description ?? "",
    assigneeUserId: task.assigneeUserId ?? "",
    dueDate: task.dueDate ?? "",
  };
}

function taskErrorMessage(dictionary: EventTasksDictionary, code: ServiceTaskErrorCode) {
  return dictionary.errors[code];
}

function formatDueDate(locale: string, value: string) {
  const date = new Date(value + "T00:00:00.000Z");
  return new Intl.DateTimeFormat(locale === "ar" ? "ar-SA" : "en-SA", {
    dateStyle: "medium",
    timeZone: "UTC",
  }).format(date);
}

function AssigneeSelect({
  value,
  task,
  dictionary,
  disabled,
  onChange,
}: {
  value: string;
  task?: ServiceTask;
  dictionary: EventTasksDictionary;
  disabled: boolean;
  onChange: (value: string) => void;
}) {
  const [search, setSearch] = useState("");
  const [searchStarted, setSearchStarted] = useState(false);
  const [searchState, setSearchState] = useState<"idle" | "loading" | "ready" | "error">("idle");
  const [assignees, setAssignees] = useState<ServiceTaskAssignee[]>([]);
  const [chosenAssignee, setChosenAssignee] = useState<ServiceTaskAssignee | null>(null);
  const requestSequence = useRef(0);

  useEffect(() => {
    if (!searchStarted) return;

    let cancelled = false;
    const sequence = ++requestSequence.current;
    const timeout = window.setTimeout(() => {
      void searchServiceTaskAssignees(search).then((result) => {
        if (cancelled || sequence !== requestSequence.current) return;
        if (result.status === "ready") {
          setAssignees(result.assignees);
          setSearchState("ready");
        } else {
          setAssignees([]);
          setSearchState("error");
        }
      }).catch(() => {
        if (cancelled || sequence !== requestSequence.current) return;
        setAssignees([]);
        setSearchState("error");
      });
    }, 200);

    return () => {
      cancelled = true;
      window.clearTimeout(timeout);
    };
  }, [search, searchStarted]);

  const selectedAssignee = assignees.find((assignee) => assignee.id === value)
    ?? (chosenAssignee?.id === value ? chosenAssignee : null)
    ?? (task?.assigneeUserId === value ? task.assignee : null);

  function changeSearch(nextSearch: string) {
    setSearch(nextSearch.slice(0, 80));
    setSearchStarted(true);
    setSearchState("loading");
    setAssignees([]);
  }

  function changeAssignee(nextValue: string) {
    if (!nextValue) {
      setChosenAssignee(null);
    } else {
      const nextAssignee = assignees.find((assignee) => assignee.id === nextValue)
        ?? selectedAssignee;
      if (nextAssignee) setChosenAssignee(nextAssignee);
    }
    onChange(nextValue);
  }

  return (
    <div className="min-w-0 space-y-2">
      <input
        type="search"
        aria-label={dictionary.searchAssignees}
        placeholder={dictionary.searchAssignees}
        value={search}
        maxLength={80}
        disabled={disabled}
        onFocus={() => {
          if (!searchStarted) {
            setSearchStarted(true);
            setSearchState("loading");
          }
        }}
        onChange={(event) => changeSearch(event.target.value)}
        className="min-w-0 w-full rounded-lg border border-outline-variant bg-surface-container-lowest px-3 py-2 text-sm text-on-surface disabled:opacity-60"
      />
      <select
        aria-label={dictionary.assigneeLabel}
        value={value}
        disabled={disabled}
        onChange={(event) => changeAssignee(event.target.value)}
        className="min-w-0 w-full rounded-lg border border-outline-variant bg-surface-container-lowest px-3 py-2 text-sm text-on-surface disabled:opacity-60"
      >
        <option value="">{dictionary.unassigned}</option>
        {selectedAssignee && !assignees.some((assignee) => assignee.id === selectedAssignee.id) && (
          <option value={selectedAssignee.id}>
            {(selectedAssignee.name || dictionary.unknownAssignee) +
              (selectedAssignee.isActive ? "" : " (" + dictionary.inactiveAssignee + ")")}
          </option>
        )}
        {assignees.map((assignee) => (
          <option key={assignee.id} value={assignee.id}>
            {assignee.name || dictionary.unknownAssignee}
          </option>
        ))}
      </select>
      {searchState === "loading" && (
        <p role="status" className="text-sm text-on-surface-variant">{dictionary.assigneeSearchLoading}</p>
      )}
      {searchState === "ready" && assignees.length === 0 && (
        <p role="status" className="text-sm text-on-surface-variant">{dictionary.noMatchingAssignee}</p>
      )}
      {searchState === "error" && (
        <p role="alert" className="text-sm text-error">{dictionary.assigneeOptionsUnavailable}</p>
      )}
    </div>
  );
}

export default function ServiceTasksCard({
  serviceId,
  serviceStatus,
  tasks,
  canWrite,
  loadError,
  dictionary,
  locale,
}: ServiceTasksCardProps) {
  const [pending, startTransition] = useTransition();
  const [createForm, setCreateForm] = useState<TaskFormValues>(EMPTY_FORM);
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<TaskFormValues>(EMPTY_FORM);
  const [feedback, setFeedback] = useState<Feedback | null>(null);

  const serviceClosed = isClosedServiceStatus(serviceStatus);
  const canMutate = canWrite && !serviceClosed && !loadError;

  function showResult(
    result: { success: true } | { success: false; code: ServiceTaskErrorCode },
    successMessage: string,
  ) {
    setFeedback(
      result.success
        ? { kind: "success", message: successMessage }
        : { kind: "error", message: taskErrorMessage(dictionary, result.code) },
    );
  }

  function submitCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFeedback(null);
    startTransition(async () => {
      const result = await createServiceTask({
        serviceId,
        title: createForm.title,
        description: createForm.description || null,
        assigneeUserId: createForm.assigneeUserId || null,
        dueDate: createForm.dueDate || null,
      });
      showResult(result, dictionary.messages.created);
      if (result.success) setCreateForm(EMPTY_FORM);
    });
  }

  function submitEdit(event: FormEvent<HTMLFormElement>, task: ServiceTask) {
    event.preventDefault();
    setFeedback(null);

    const previous = formValues(task);
    const changes: {
      title?: string;
      description?: string | null;
      assigneeUserId?: string | null;
      dueDate?: string | null;
    } = {};

    if (editForm.title.trim() !== previous.title) changes.title = editForm.title;
    const nextDescription = editForm.description === "" ? null : editForm.description;
    if (nextDescription !== (task.description ?? null)) changes.description = nextDescription;
    if (editForm.assigneeUserId !== previous.assigneeUserId) {
      changes.assigneeUserId = editForm.assigneeUserId || null;
    }
    if (editForm.dueDate !== previous.dueDate) changes.dueDate = editForm.dueDate || null;

    if (Object.keys(changes).length === 0) {
      setFeedback({ kind: "error", message: dictionary.messages.noChanges });
      return;
    }

    startTransition(async () => {
      const result = await updateServiceTaskFields({
        serviceId,
        taskId: task.id,
        changes,
      });
      showResult(result, dictionary.messages.updated);
      if (result.success) setEditingTaskId(null);
    });
  }

  function transition(task: ServiceTask, toStatus: "in_progress" | "completed") {
    setFeedback(null);
    startTransition(async () => {
      const result = await transitionServiceTaskStatus({
        serviceId,
        taskId: task.id,
        toStatus,
      });
      showResult(result, dictionary.messages.transitioned);
    });
  }

  function updateCreateForm(field: keyof TaskFormValues, value: string) {
    setCreateForm((current) => ({ ...current, [field]: value }));
  }

  function updateEditForm(field: keyof TaskFormValues, value: string) {
    setEditForm((current) => ({ ...current, [field]: value }));
  }

  return (
    <section className="min-w-0 max-w-full overflow-hidden rounded-xl border border-surface-variant bg-surface-container-lowest">
      <div className="border-b border-surface-variant bg-surface-bright px-5 py-4 sm:px-6">
        <h2 className="font-semibold text-primary">{dictionary.title}</h2>
        <p className="mt-1 break-words text-sm text-on-surface-variant">{dictionary.subtitle}</p>
      </div>
      <div className="min-w-0 space-y-4 p-4 sm:p-6">
        {serviceClosed && (
          <p className="rounded-lg bg-surface-container-low px-3 py-2 text-sm text-on-surface-variant">
            {dictionary.serviceClosed}
          </p>
        )}
        {!serviceClosed && !canWrite && (
          <p className="rounded-lg bg-surface-container-low px-3 py-2 text-sm text-on-surface-variant">
            {dictionary.permissionReadOnly}
          </p>
        )}
        {loadError ? (
          <p role="alert" className="rounded-lg border border-error/30 bg-error-container px-4 py-3 text-sm text-on-error-container">
            {dictionary.loadError}
          </p>
        ) : (
          <>
            {feedback && (
              <p
                role={feedback.kind === "error" ? "alert" : "status"}
                className={
                  feedback.kind === "error"
                    ? "rounded-lg border border-error/30 bg-error-container px-4 py-3 text-sm text-on-error-container"
                    : "rounded-lg bg-surface-container-low px-4 py-3 text-sm text-on-surface"
                }
              >
                {feedback.message}
              </p>
            )}

            {tasks.length === 0 && (
              <p className="rounded-lg bg-surface-container-low px-4 py-4 text-sm text-on-surface-variant">
                {dictionary.empty}
              </p>
            )}

            {canMutate && (
              <form onSubmit={submitCreate} className="min-w-0 space-y-3 rounded-lg border border-outline-variant p-4">
                <h3 className="font-medium text-on-surface">{dictionary.createTask}</h3>
                <label className="block min-w-0 space-y-1 text-sm">
                  <span>{dictionary.titleLabel}</span>
                  <input
                    required
                    value={createForm.title}
                    onChange={(event) => updateCreateForm("title", event.target.value)}
                    className="min-w-0 w-full rounded-lg border border-outline-variant bg-surface-container-lowest px-3 py-2"
                  />
                </label>
                <label className="block min-w-0 space-y-1 text-sm">
                  <span>{dictionary.descriptionLabel}</span>
                  <textarea
                    value={createForm.description}
                    onChange={(event) => updateCreateForm("description", event.target.value)}
                    rows={2}
                    className="min-w-0 w-full resize-y rounded-lg border border-outline-variant bg-surface-container-lowest px-3 py-2"
                  />
                </label>
                <div className="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2">
                  <div className="block min-w-0 space-y-1 text-sm">
                    <span>{dictionary.assigneeLabel}</span>
                    <AssigneeSelect
                      value={createForm.assigneeUserId}
                      dictionary={dictionary}
                      disabled={pending}
                      onChange={(value) => updateCreateForm("assigneeUserId", value)}
                    />
                  </div>
                  <label className="block min-w-0 space-y-1 text-sm">
                    <span>{dictionary.dueDateLabel}</span>
                    <input
                      type="date"
                      dir="ltr"
                      value={createForm.dueDate}
                      onChange={(event) => updateCreateForm("dueDate", event.target.value)}
                      className="min-w-0 w-full rounded-lg border border-outline-variant bg-surface-container-lowest px-3 py-2"
                    />
                  </label>
                </div>
                <button
                  type="submit"
                  disabled={pending || !createForm.title.trim()}
                  className="w-full rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-on-primary disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
                >
                  {pending ? dictionary.buttons.saving : dictionary.buttons.create}
                </button>
              </form>
            )}

            {tasks.length > 0 && (
              <ul className="grid min-w-0 grid-cols-1 gap-3">
                {tasks.map((task) => {
                  const isEditing =
                    canMutate && task.status !== "completed" && editingTaskId === task.id;
                  const isMutableTask = canMutate && task.status !== "completed";
                  const assigneeLabel = task.assignee
                    ? task.assignee.name || dictionary.unknownAssignee
                    : dictionary.unassigned;

                  return (
                    <li key={task.id} className="min-w-0">
                      <article className="min-w-0 rounded-lg border border-outline-variant p-4">
                        {isEditing ? (
                          <form onSubmit={(event) => submitEdit(event, task)} className="min-w-0 space-y-3">
                            <h3 className="font-medium text-on-surface">{dictionary.editTask}</h3>
                            <label className="block min-w-0 space-y-1 text-sm">
                              <span>{dictionary.titleLabel}</span>
                              <input
                                required
                                value={editForm.title}
                                onChange={(event) => updateEditForm("title", event.target.value)}
                                className="min-w-0 w-full rounded-lg border border-outline-variant bg-surface-container-lowest px-3 py-2"
                              />
                            </label>
                            <label className="block min-w-0 space-y-1 text-sm">
                              <span>{dictionary.descriptionLabel}</span>
                              <textarea
                                value={editForm.description}
                                onChange={(event) => updateEditForm("description", event.target.value)}
                                rows={2}
                                className="min-w-0 w-full resize-y rounded-lg border border-outline-variant bg-surface-container-lowest px-3 py-2"
                              />
                            </label>
                            <div className="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2">
                              <div className="block min-w-0 space-y-1 text-sm">
                                <span>{dictionary.assigneeLabel}</span>
                                <AssigneeSelect
                                  value={editForm.assigneeUserId}
                                  task={task}
                                  dictionary={dictionary}
                                  disabled={pending}
                                  onChange={(value) => updateEditForm("assigneeUserId", value)}
                                />
                              </div>
                              <label className="block min-w-0 space-y-1 text-sm">
                                <span>{dictionary.dueDateLabel}</span>
                                <input
                                  type="date"
                                  dir="ltr"
                                  value={editForm.dueDate}
                                  onChange={(event) => updateEditForm("dueDate", event.target.value)}
                                  className="min-w-0 w-full rounded-lg border border-outline-variant bg-surface-container-lowest px-3 py-2"
                                />
                              </label>
                            </div>
                            {task.assignee && !task.assignee.isActive && (
                              <p className="text-sm text-on-surface-variant">
                                {assigneeLabel} — {dictionary.inactiveAssignee}
                              </p>
                            )}
                            <div className="flex min-w-0 flex-col gap-2 sm:flex-row">
                              <button
                                type="submit"
                                disabled={pending || !editForm.title.trim()}
                                className="w-full rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-on-primary disabled:opacity-60 sm:w-auto"
                              >
                                {pending ? dictionary.buttons.saving : dictionary.buttons.save}
                              </button>
                              <button
                                type="button"
                                disabled={pending}
                                onClick={() => setEditingTaskId(null)}
                                className="w-full rounded-lg border border-outline-variant px-4 py-2 text-sm font-semibold text-on-surface sm:w-auto"
                              >
                                {dictionary.buttons.cancel}
                              </button>
                            </div>
                          </form>
                        ) : (
                          <>
                            <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                              <div className="min-w-0">
                                <h3 className="break-words font-semibold text-on-surface">{task.title}</h3>
                                {task.description && (
                                  <p className="mt-1 break-words text-sm text-on-surface-variant">
                                    {task.description}
                                  </p>
                                )}
                              </div>
                              <span className="w-fit shrink-0 rounded-full bg-surface-container-low px-3 py-1 text-xs font-medium text-on-surface">
                                {dictionary.statuses[task.status]}
                              </span>
                            </div>
                            <dl className="mt-3 grid min-w-0 grid-cols-1 gap-3 text-sm sm:grid-cols-2">
                              <div className="min-w-0">
                                <dt className="text-xs text-on-surface-variant">{dictionary.assigneeLabel}</dt>
                                <dd className="mt-1 min-w-0 break-words text-on-surface">
                                  {assigneeLabel}
                                  {task.assignee && !task.assignee.isActive && (
                                    <span className="ms-2 rounded bg-surface-container-high px-2 py-0.5 text-xs">
                                      {dictionary.inactiveAssignee}
                                    </span>
                                  )}
                                </dd>
                              </div>
                              <div className="min-w-0">
                                <dt className="text-xs text-on-surface-variant">{dictionary.dueDateLabel}</dt>
                                <dd className="mt-1 text-on-surface">
                                  {task.dueDate ? (
                                    <time dir="ltr" dateTime={task.dueDate}>
                                      {formatDueDate(locale, task.dueDate)}
                                    </time>
                                  ) : dictionary.noDueDate}
                                </dd>
                              </div>
                            </dl>
                            {task.status === "completed" && (
                              <p className="mt-3 text-sm text-on-surface-variant">
                                {dictionary.readOnly}
                              </p>
                            )}
                            {isMutableTask && task.status !== "completed" && (
                              <div className="mt-4 flex min-w-0 flex-col gap-2 sm:flex-row">
                                <button
                                  type="button"
                                  disabled={pending}
                                  onClick={() => {
                                    setEditForm(formValues(task));
                                    setEditingTaskId(task.id);
                                    setFeedback(null);
                                  }}
                                  className="w-full rounded-lg border border-outline-variant px-4 py-2 text-sm font-semibold text-on-surface sm:w-auto"
                                >
                                  {dictionary.buttons.edit}
                                </button>
                                {task.status === "open" && (
                                  <button
                                    type="button"
                                    disabled={pending}
                                    onClick={() => transition(task, "in_progress")}
                                    className="w-full rounded-lg border border-outline-variant px-4 py-2 text-sm font-semibold text-on-surface sm:w-auto"
                                  >
                                    {dictionary.buttons.start}
                                  </button>
                                )}
                                <button
                                  type="button"
                                  disabled={pending}
                                  onClick={() => transition(task, "completed")}
                                  className="w-full rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-on-primary sm:w-auto"
                                >
                                  {dictionary.buttons.complete}
                                </button>
                              </div>
                            )}
                            {canMutate &&
                              task.status !== "completed" &&
                              (!task.assignee || !task.assignee.isActive) && (
                                <p className="mt-3 text-sm text-on-surface-variant">
                                  {dictionary.activeAssigneeRequired}
                                </p>
                              )}
                          </>
                        )}
                      </article>
                    </li>
                  );
                })}
              </ul>
            )}
          </>
        )}
      </div>
    </section>
  );
}
