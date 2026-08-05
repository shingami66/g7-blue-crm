import type { ButtonHTMLAttributes, ReactNode } from "react";

type DenseTableIconActionProps = Omit<
  ButtonHTMLAttributes<HTMLButtonElement>,
  "aria-label" | "title"
> & {
  label: string;
  children: ReactNode;
};

/** Quiet, keyboard-accessible 32px action treatment for dense data-table rows. */
export default function DenseTableIconAction({
  label,
  children,
  className = "",
  type = "button",
  ...props
}: DenseTableIconActionProps) {
  return (
    <button
      {...props}
      type={type}
      aria-label={label}
      title={label}
      className={`inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-transparent text-on-surface-variant transition-colors hover:bg-surface-container-low hover:text-on-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-1 focus-visible:ring-offset-surface ${className}`}
    >
      {children}
    </button>
  );
}
