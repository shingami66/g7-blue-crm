export function ListInlineError({
  message,
  retryLabel,
  onRetry,
  pending = false,
}: {
  message: string;
  retryLabel: string;
  onRetry: () => void;
  pending?: boolean;
}) {
  return (
    <div className="mx-4 my-4 flex flex-wrap items-center justify-between gap-3 rounded-lg bg-error-container p-3 text-[14px] text-on-error-container" role="alert">
      <span>{message}</span>
      <button
        type="button"
        onClick={onRetry}
        disabled={pending}
        aria-busy={pending || undefined}
        className="rounded-md border border-on-error-container/30 px-3 py-1.5 font-semibold hover:bg-on-error-container/10 focus:outline-none focus:ring-2 focus:ring-on-error-container/40 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {retryLabel}
      </button>
    </div>
  );
}
