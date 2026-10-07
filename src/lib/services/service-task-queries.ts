import "server-only";

import { requirePermission } from "@/lib/auth/permissions";
import { ForbiddenError, UnauthorizedError } from "@/lib/auth/errors";
import { SERVICE_TASK_PERMISSIONS } from "@/lib/auth/role-permissions";
import { createAdminClient } from "@/lib/supabase/admin";
import { isServiceTaskStatus, type ServiceTaskStatus } from "./service-task-contract";

export type ServiceTaskAssignee = {
  id: string;
  name: string | null;
  isActive: boolean;
};

export type ServiceTask = {
  id: string;
  serviceId: string;
  title: string;
  description: string | null;
  assigneeUserId: string | null;
  assignee: ServiceTaskAssignee | null;
  status: ServiceTaskStatus;
  dueDate: string | null;
  createdAt: string;
};

export type ServiceTasksResult =
  | { status: "ready"; tasks: ServiceTask[] }
  | { status: "error"; tasks: [] };

export type ServiceTaskAssigneesResult =
  | { status: "ready"; assignees: ServiceTaskAssignee[] }
  | { status: "error"; assignees: [] };

export const SERVICE_TASK_ASSIGNEE_RESULT_LIMIT = 20;
const MAX_SERVICE_TASK_ASSIGNEE_SEARCH_LENGTH = 80;

export async function getServiceTasks(serviceId: string): Promise<ServiceTasksResult> {
  await requirePermission("services:read");

  try {
    const { data, error } = await createAdminClient()
      .from("service_tasks")
      .select(
        "id, service_id, title, description, assignee_user_id, status, due_date, created_at, assignee:app_users!service_tasks_assignee_user_id_fkey(id, name, is_active)",
      )
      .eq("service_id", serviceId)
      .order("created_at", { ascending: true })
      .order("id", { ascending: true });

    if (error || !data) {
      console.error("[getServiceTasks] Query failed: service_task_list_unavailable");
      return { status: "error", tasks: [] };
    }

    const tasks: ServiceTask[] = [];
    for (const row of data) {
      if (!isServiceTaskStatus(row.status)) {
        console.error("[getServiceTasks] Query failed: service_task_status_invalid");
        return { status: "error", tasks: [] };
      }

      tasks.push({
        id: row.id,
        serviceId: row.service_id,
        title: row.title,
        description: row.description,
        assigneeUserId: row.assignee_user_id,
        assignee: row.assignee
          ? {
              id: row.assignee.id,
              name: row.assignee.name,
              isActive: row.assignee.is_active === true,
            }
          : null,
        status: row.status,
        dueDate: row.due_date,
        createdAt: row.created_at,
      });
    }

    return { status: "ready", tasks };
  } catch (error) {
    if (error instanceof UnauthorizedError || error instanceof ForbiddenError) throw error;
    console.error("[getServiceTasks] Query failed: service_task_list_unavailable");
    return { status: "error", tasks: [] };
  }
}

export async function searchActiveServiceTaskAssignees(
  search = "",
): Promise<ServiceTaskAssigneesResult> {
  await requirePermission(SERVICE_TASK_PERMISSIONS.write);

  try {
    const normalizedSearch = search.trim().slice(0, MAX_SERVICE_TASK_ASSIGNEE_SEARCH_LENGTH);
    let query = createAdminClient()
      .from("app_users")
      .select("id, name")
      .eq("is_active", true);

    if (normalizedSearch) {
      const escapedSearch = normalizedSearch.replace(/[\\%_]/g, "\\$&");
      query = query.ilike("name", `%${escapedSearch}%`);
    }

    const { data, error } = await query
      .order("name", { ascending: true })
      .order("id", { ascending: true })
      .limit(SERVICE_TASK_ASSIGNEE_RESULT_LIMIT);

    if (error || !data) {
      console.error("[searchActiveServiceTaskAssignees] Query failed: service_task_assignees_unavailable");
      return { status: "error", assignees: [] };
    }

    return {
      status: "ready",
      assignees: data.map((user) => ({
        id: user.id,
        name: user.name,
        isActive: true,
      })),
    };
  } catch (error) {
    if (error instanceof UnauthorizedError || error instanceof ForbiddenError) throw error;
    console.error("[searchActiveServiceTaskAssignees] Query failed: service_task_assignees_unavailable");
    return { status: "error", assignees: [] };
  }
}
