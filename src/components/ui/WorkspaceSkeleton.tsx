import type { WorkspaceSkeletonVariant } from "./workspace-loading";

export type { WorkspaceSkeletonVariant } from "./workspace-loading";
export { resolveWorkspaceSkeletonVariant } from "./workspace-loading";

function SkeletonLine({ className = "w-32" }: { className?: string }) {
  return <div className={`g7-skeleton h-3 rounded-md ${className}`} />;
}

function SkeletonPanel({ className = "" }: { className?: string }) {
  return (
    <div
      className={`rounded-xl border border-surface-variant bg-surface-container-lowest p-4 ${className}`}
    >
      <SkeletonLine className="mb-4 w-28" />
      <div className="space-y-3">
        <SkeletonLine className="w-full" />
        <SkeletonLine className="w-4/5" />
      </div>
    </div>
  );
}

function ListSkeleton() {
  return (
    <div className="min-h-[34rem] space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="space-y-3">
          <SkeletonLine className="h-7 w-44" />
          <SkeletonLine className="w-64" />
        </div>
        <SkeletonLine className="h-10 w-28" />
      </div>
      <div className="rounded-xl border border-surface-variant bg-surface-container-lowest p-4">
        <div className="flex flex-wrap gap-3">
          <SkeletonLine className="h-10 w-full sm:w-64" />
          <SkeletonLine className="h-10 w-32" />
          <SkeletonLine className="h-10 w-28" />
        </div>
      </div>
      {/* Desktop Table View (>= md) */}
      <div
        className="hidden md:block overflow-hidden rounded-xl border border-surface-variant bg-surface-container-lowest"
        data-testid="desktop-list-skeleton"
      >
        <div className="grid grid-cols-3 gap-4 border-b border-surface-variant bg-surface-container-low p-4">
          <SkeletonLine className="w-24" />
          <SkeletonLine className="w-28" />
          <SkeletonLine className="w-16" />
        </div>
        <div className="divide-y divide-surface-variant">
          {Array.from({ length: 6 }, (_, index) => (
            <div className="grid grid-cols-3 gap-4 p-4" key={index}>
              <SkeletonLine className="w-32" />
              <SkeletonLine className="w-40" />
              <SkeletonLine className="w-20" />
            </div>
          ))}
        </div>
      </div>
      {/* Mobile Cards View (< md) */}
      <div
        className="block md:hidden divide-y divide-surface-variant overflow-hidden rounded-xl border border-surface-variant bg-surface-container-lowest"
        data-testid="mobile-list-skeleton"
      >
        {Array.from({ length: 3 }, (_, index) => (
          <div key={index} className="p-4 space-y-3">
            <div className="flex items-start justify-between gap-2">
              <div className="space-y-1.5">
                <SkeletonLine className="h-4 w-36" />
                <SkeletonLine className="h-3 w-20" />
              </div>
              <div className="g7-skeleton h-6 w-16 rounded-full" />
            </div>
            <div className="space-y-2 pt-1">
              <div className="flex justify-between items-center">
                <SkeletonLine className="h-3 w-20" />
                <SkeletonLine className="h-3 w-28" />
              </div>
              <div className="flex justify-between items-center">
                <SkeletonLine className="h-3 w-16" />
                <SkeletonLine className="h-3 w-24" />
              </div>
            </div>
            <div className="pt-1">
              <SkeletonLine className="h-8 w-full rounded-lg" />
            </div>
          </div>
        ))}
      </div>
      <div className="flex justify-end">
        <SkeletonLine className="h-9 w-48" />
      </div>
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="min-h-[34rem] space-y-6">
      <div className="space-y-3">
        <SkeletonLine className="h-7 w-52" />
        <SkeletonLine className="w-72" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }, (_, index) => (
          <SkeletonPanel key={index} />
        ))}
      </div>
      <div className="grid gap-5 xl:grid-cols-2">
        <SkeletonPanel className="min-h-48" />
        <SkeletonPanel className="min-h-48" />
      </div>
      <SkeletonPanel className="min-h-56" />
    </div>
  );
}

function DetailSkeleton() {
  return (
    <div className="min-h-[34rem] space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="max-w-full space-y-3">
          <SkeletonLine className="h-7 w-48 max-w-full" />
          <SkeletonLine className="w-64 max-w-full" />
        </div>
        <div className="flex flex-wrap gap-2 sm:justify-end">
          <SkeletonLine className="h-9 w-24 rounded-lg" />
          <SkeletonLine className="h-9 w-24 rounded-lg" />
        </div>
      </div>
      <div className="grid gap-5 xl:grid-cols-[1.4fr_1fr]">
        <SkeletonPanel className="min-h-64" />
        <SkeletonPanel className="min-h-64" />
      </div>
      <SkeletonPanel className="min-h-56" />
    </div>
  );
}

function ReportsSkeleton() {
  return (
    <div className="min-h-[34rem] space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="space-y-3">
          <SkeletonLine className="h-7 w-48" />
          <SkeletonLine className="w-80" />
        </div>
        <SkeletonLine className="h-10 w-56" />
      </div>
      <div className="grid gap-5 xl:grid-cols-2">
        {Array.from({ length: 4 }, (_, index) => (
          <SkeletonPanel className="min-h-56" key={index} />
        ))}
      </div>
    </div>
  );
}

function FormSkeleton() {
  return (
    <div className="min-h-[34rem] space-y-6">
      <div className="space-y-3">
        <SkeletonLine className="h-7 w-52" />
        <SkeletonLine className="w-72" />
      </div>
      <SkeletonPanel className="min-h-64" />
      <SkeletonPanel className="min-h-48" />
      <div className="flex justify-end gap-3">
        <SkeletonLine className="h-10 w-24" />
        <SkeletonLine className="h-10 w-28" />
      </div>
    </div>
  );
}

function VariantSkeleton({ variant }: { variant: WorkspaceSkeletonVariant }) {
  switch (variant) {
    case "dashboard":
      return <DashboardSkeleton />;
    case "detail":
      return <DetailSkeleton />;
    case "reports":
      return <ReportsSkeleton />;
    case "form":
      return <FormSkeleton />;
    case "list":
    default:
      return <ListSkeleton />;
  }
}

export default function WorkspaceSkeleton({
  label,
  revealed = true,
  variant,
}: {
  label: string;
  revealed?: boolean;
  variant: WorkspaceSkeletonVariant;
}) {
  return (
    <section
      aria-busy="true"
      aria-label={label}
      aria-live="polite"
      className="g7-workspace-loading g7-workspace-loading__reveal"
      data-revealed={revealed}
      role="status"
    >
      <div aria-hidden="true">
        <VariantSkeleton variant={variant} />
      </div>
    </section>
  );
}
