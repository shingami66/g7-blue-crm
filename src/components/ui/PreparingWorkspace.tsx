"use client";

export interface PreparingWorkspaceProps {
  message?: string;
  direction?: "ltr" | "rtl";
}

export default function PreparingWorkspace({
  message = "Preparing your workspace…",
  direction = "ltr",
}: PreparingWorkspaceProps) {
  return (
    <main
      aria-busy="true"
      className="fixed inset-0 z-[100] flex min-h-screen items-center justify-center bg-surface px-6 text-center"
      dir={direction}
    >
      <style>{`
        @keyframes g7-brand-ring {
          0% {
            transform: rotate(0deg);
          }
          12.5%, 100% {
            transform: rotate(360deg);
          }
        }
        .g7-brand-ring {
          animation: g7-brand-ring 8s ease-in-out infinite;
          transform-origin: center;
        }
        @media (prefers-reduced-motion: reduce) {
          .g7-brand-ring {
            animation: none;
          }
        }
      `}</style>

      <div className="space-y-4">
        <div
          aria-label="G7 BLUE"
          className="relative mx-auto flex h-16 w-16 items-center justify-center"
        >
          <span
            aria-hidden="true"
            className="g7-brand-ring absolute inset-0 rounded-full border border-primary/30 border-l-transparent"
          />
          <div className="relative z-10 text-center">
            <div className="text-[2rem] font-bold leading-none tracking-[-0.08em] text-primary">
              G7
            </div>
            <div className="mt-0.5 pl-[0.35em] text-[0.55rem] font-semibold uppercase tracking-[0.35em] text-primary/70">
              BLUE
            </div>
          </div>
        </div>
        <p
          aria-live="polite"
          role="status"
          className="text-sm font-medium text-on-surface-variant"
        >
          {message}
        </p>
      </div>
    </main>
  );
}
