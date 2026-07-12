import type { Locale } from "../locales";
import type { CrmRole } from "../../admin/users/schemas";

export interface AdminUsersDictionary {
  locale: Locale;
  page: {
    title: string;
    subtitle: string;
    loadUsersFailed: string;
    invitationsWarning: string;
  };
  invite: {
    title: string;
    email: string;
    emailPlaceholder: string;
    role: string;
    submit: string;
    submitting: string;
    success: string;
    failed: string;
  };
  tabs: {
    users: string;
    invitations: string;
  };
  usersTable: {
    user: string;
    role: string;
    status: string;
    joined: string;
    actions: string;
    empty: string;
    unnamed: string;
    active: string;
    inactive: string;
    activate: string;
    deactivate: string;
  };
  invitationsTable: {
    email: string;
    intendedRole: string;
    sentAt: string;
    actions: string;
    empty: string;
    revoke: string;
  };
  revokeModal: {
    title: string;
    body: string;
    cancel: string;
    confirm: string;
  };
  clientErrors: {
    cannotChangeOwnRole: string;
    updateStatusFailed: string;
    updateRoleFailed: string;
    revokeFailed: string;
  };
  roles: Record<CrmRole, string>;
  actionErrorMap: Record<string, string>;
}

const adminUsersDictionaryEn: AdminUsersDictionary = {
  locale: "en",
  page: {
    title: "User Management",
    subtitle: "Invite users, manage roles, and control access.",
    loadUsersFailed: "Unable to load users",
    invitationsWarning:
      "Unable to load pending invitations. User management remains available.",
  },
  invite: {
    title: "Invite New User",
    email: "Email Address",
    emailPlaceholder: "user@example.com",
    role: "Role",
    submit: "Send Invite",
    submitting: "Sending...",
    success: "Invitation sent to {email}",
    failed: "Failed to send invitation",
  },
  tabs: {
    users: "Active Users ({count})",
    invitations: "Pending Invitations ({count})",
  },
  usersTable: {
    user: "User",
    role: "Role",
    status: "Status",
    joined: "Joined",
    actions: "Actions",
    empty: "No users found.",
    unnamed: "Unnamed User",
    active: "Active",
    inactive: "Inactive",
    activate: "Activate",
    deactivate: "Deactivate",
  },
  invitationsTable: {
    email: "Email",
    intendedRole: "Intended Role",
    sentAt: "Sent At",
    actions: "Actions",
    empty: "No pending invitations.",
    revoke: "Revoke",
  },
  revokeModal: {
    title: "Revoke invitation",
    body: "This will revoke the pending invitation for {email}.",
    cancel: "Cancel",
    confirm: "Revoke invitation",
  },
  clientErrors: {
    cannotChangeOwnRole: "You cannot change your own role.",
    updateStatusFailed: "Failed to update user status.",
    updateRoleFailed: "Failed to update role.",
    revokeFailed: "Failed to revoke invitation.",
  },
  roles: {
    admin: "Admin",
    manager: "Manager",
    sales: "Sales",
    operations: "Operations",
    accountant: "Accountant",
    viewer: "Viewer",
  },
  actionErrorMap: {
    Unauthorized: "You must be signed in.",
    Forbidden: "You do not have permission to perform this action.",
    "Validation failed": "Please check the form values and try again.",
    "Email is required": "Email is required",
    "Invalid email address": "Invalid email address",
    "Invalid role selected.": "Invalid role selected.",
    "Invalid user ID": "Invalid user ID",
    "Invalid invitation ID.": "Invalid invitation ID.",
    "This email already has a pending invitation.":
      "This email already has a pending invitation.",
    "A user with this email already exists in Clerk.":
      "A user with this email already exists in Clerk.",
    "Failed to send invitation. Please try again.":
      "Failed to send invitation. Please try again.",
    "You cannot change your own role.": "You cannot change your own role.",
    "You cannot deactivate your own account.":
      "You cannot deactivate your own account.",
    "User not found.": "User not found.",
    "Failed to load user. Please try again.":
      "Failed to load user. Please try again.",
    "At least one active admin must remain.":
      "At least one active admin must remain.",
    "Failed to verify admin access safety. Please try again.":
      "Failed to verify admin access safety. Please try again.",
    "Failed to update role. Please try again.":
      "Failed to update role. Please try again.",
    "Failed to update user status. Please try again.":
      "Failed to update user status. Please try again.",
    "Failed to revoke invitation. Please try again.":
      "Failed to revoke invitation. Please try again.",
    "An unexpected error occurred.": "An unexpected error occurred.",
  },
};

const adminUsersDictionaryAr: AdminUsersDictionary = {
  locale: "ar",
  page: {
    title: "إدارة المستخدمين",
    subtitle: "دعوة المستخدمين وإدارة الأدوار والتحكم في الوصول.",
    loadUsersFailed: "تعذر تحميل المستخدمين",
    invitationsWarning:
      "تعذر تحميل الدعوات المعلقة. تظل إدارة المستخدمين متاحة.",
  },
  invite: {
    title: "دعوة مستخدم جديد",
    email: "البريد الإلكتروني",
    emailPlaceholder: "user@example.com",
    role: "الدور",
    submit: "إرسال الدعوة",
    submitting: "جارٍ الإرسال...",
    success: "تم إرسال الدعوة إلى {email}",
    failed: "تعذر إرسال الدعوة",
  },
  tabs: {
    users: "المستخدمون النشطون ({count})",
    invitations: "الدعوات المعلقة ({count})",
  },
  usersTable: {
    user: "المستخدم",
    role: "الدور",
    status: "الحالة",
    joined: "تاريخ الانضمام",
    actions: "الإجراءات",
    empty: "لم يتم العثور على مستخدمين.",
    unnamed: "مستخدم بلا اسم",
    active: "نشط",
    inactive: "غير نشط",
    activate: "تفعيل",
    deactivate: "إلغاء التفعيل",
  },
  invitationsTable: {
    email: "البريد الإلكتروني",
    intendedRole: "الدور المقصود",
    sentAt: "تاريخ الإرسال",
    actions: "الإجراءات",
    empty: "لا توجد دعوات معلقة.",
    revoke: "إلغاء",
  },
  revokeModal: {
    title: "إلغاء الدعوة",
    body: "سيؤدي هذا إلى إلغاء الدعوة المعلقة لـ {email}.",
    cancel: "إلغاء",
    confirm: "إلغاء الدعوة",
  },
  clientErrors: {
    cannotChangeOwnRole: "لا يمكنك تغيير دورك الخاص.",
    updateStatusFailed: "تعذر تحديث حالة المستخدم.",
    updateRoleFailed: "تعذر تحديث الدور.",
    revokeFailed: "تعذر إلغاء الدعوة.",
  },
  roles: {
    admin: "مسؤول",
    manager: "مدير",
    sales: "مبيعات",
    operations: "عمليات",
    accountant: "محاسب",
    viewer: "عرض فقط",
  },
  actionErrorMap: {
    Unauthorized: "يجب تسجيل الدخول أولاً.",
    Forbidden: "ليس لديك صلاحية لتنفيذ هذا الإجراء.",
    "Validation failed": "يرجى التحقق من قيم النموذج ثم المحاولة مرة أخرى.",
    "Email is required": "البريد الإلكتروني مطلوب",
    "Invalid email address": "عنوان البريد الإلكتروني غير صالح",
    "Invalid role selected.": "الدور المحدد غير صالح.",
    "Invalid user ID": "معرّف المستخدم غير صالح",
    "Invalid invitation ID.": "معرّف الدعوة غير صالح.",
    "This email already has a pending invitation.":
      "يوجد بالفعل دعوة معلقة لهذا البريد الإلكتروني.",
    "A user with this email already exists in Clerk.":
      "يوجد مستخدم بهذا البريد الإلكتروني بالفعل في Clerk.",
    "Failed to send invitation. Please try again.":
      "تعذر إرسال الدعوة. يرجى المحاولة مرة أخرى.",
    "You cannot change your own role.": "لا يمكنك تغيير دورك الخاص.",
    "You cannot deactivate your own account.":
      "لا يمكنك إلغاء تفعيل حسابك الخاص.",
    "User not found.": "المستخدم غير موجود.",
    "Failed to load user. Please try again.":
      "تعذر تحميل المستخدم. يرجى المحاولة مرة أخرى.",
    "At least one active admin must remain.":
      "يجب أن يبقى مسؤول نشط واحد على الأقل.",
    "Failed to verify admin access safety. Please try again.":
      "تعذر التحقق من سلامة وصول المسؤول. يرجى المحاولة مرة أخرى.",
    "Failed to update role. Please try again.":
      "تعذر تحديث الدور. يرجى المحاولة مرة أخرى.",
    "Failed to update user status. Please try again.":
      "تعذر تحديث حالة المستخدم. يرجى المحاولة مرة أخرى.",
    "Failed to revoke invitation. Please try again.":
      "تعذر إلغاء الدعوة. يرجى المحاولة مرة أخرى.",
    "An unexpected error occurred.": "حدث خطأ غير متوقع.",
  },
};

const adminUsersDictionaries: Record<Locale, AdminUsersDictionary> = {
  en: adminUsersDictionaryEn,
  ar: adminUsersDictionaryAr,
};

export function getAdminUsersDictionary(locale: Locale): AdminUsersDictionary {
  return adminUsersDictionaries[locale];
}

export function getCrmRoleLabel(locale: Locale, role: string): string {
  const dictionary = getAdminUsersDictionary(locale);
  if (role in dictionary.roles) {
    return dictionary.roles[role as CrmRole];
  }
  return role;
}

export function formatAdminUsersCopy(
  template: string,
  values: Record<string, string | number>,
): string {
  return template.replace(/\{(\w+)\}/g, (_, key) => String(values[key] ?? ""));
}

export function mapAdminUsersActionError(
  locale: Locale,
  error: string | null | undefined,
  fallback: string,
): string {
  if (!error) return fallback;
  const dictionary = getAdminUsersDictionary(locale);
  return dictionary.actionErrorMap[error] ?? error;
}
