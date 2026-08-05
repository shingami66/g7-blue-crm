"use client";

import {
  Children,
  cloneElement,
  isValidElement,
  type MouseEvent,
  type ButtonHTMLAttributes,
  type HTMLAttributes,
  type ReactElement,
  type ReactNode,
} from "react";

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger" | "outline";
type ButtonSize = "sm" | "md" | "lg" | "icon";

type ButtonProps = {
  asChild?: boolean;
  children: ReactNode;
  className?: string;
  loading?: boolean;
  loadingLabel?: string;
  size?: ButtonSize;
  variant?: ButtonVariant;
} & ButtonHTMLAttributes<HTMLButtonElement>;

const baseClassName =
  "inline-flex items-center justify-center gap-2 rounded-lg font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-tertiary-fixed focus-visible:ring-offset-2 focus-visible:ring-offset-surface disabled:cursor-not-allowed disabled:opacity-60";

const variantClassNames: Record<ButtonVariant, string> = {
  primary: "bg-primary text-on-primary hover:bg-primary-container",
  secondary:
    "bg-surface-container-high text-on-surface hover:bg-surface-container-highest",
  ghost:
    "bg-transparent text-on-surface-variant hover:bg-surface-container-low hover:text-on-surface",
  danger: "bg-error text-on-error hover:bg-[#8C1D18]",
  outline:
    "border border-outline-variant bg-surface-container-lowest text-on-surface hover:bg-surface-container-low",
};

const sizeClassNames: Record<ButtonSize, string> = {
  sm: "min-h-9 px-3 py-2 text-sm",
  md: "min-h-10 px-4 py-2 text-[14px] leading-[20px]",
  lg: "min-h-11 px-5 py-2.5 text-[14px] leading-[20px]",
  icon: "h-10 w-10 p-0",
};

function cx(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(" ");
}

export default function Button({
  asChild = false,
  children,
  className,
  disabled,
  loading = false,
  loadingLabel,
  size = "md",
  type = "button",
  variant = "primary",
  ...props
}: ButtonProps) {
  const isDisabled = disabled || loading;
  const buttonContent = children;

  const classes = cx(
    baseClassName,
    variantClassNames[variant],
    sizeClassNames[size],
    className
  );

  // Kept for call-site compatibility; loading remains local to this control.
  void loadingLabel;

  if (asChild) {
    const child = Children.only(children);

    if (!isValidElement(child)) {
      throw new Error("Button with asChild requires a single valid React element.");
    }

    const childElement = child as ReactElement<HTMLAttributes<HTMLElement>>;
    const childProps = childElement.props;

    const handleChildClick = (event: MouseEvent<HTMLElement>) => {
      if (isDisabled) {
        event.preventDefault();
        event.stopPropagation();
        return;
      }

      childProps.onClick?.(event);
      (props.onClick as ((event: MouseEvent<HTMLElement>) => void) | undefined)?.(
        event
      );
    };

    return cloneElement(childElement, {
      "aria-busy": loading || undefined,
      "aria-disabled": isDisabled || undefined,
      className: cx(classes, childProps.className),
      onClick: handleChildClick,
      tabIndex: isDisabled ? -1 : childProps.tabIndex,
    }, childProps.children);
  }

  return (
    <button
      {...props}
      aria-busy={loading || undefined}
      className={classes}
      disabled={isDisabled}
      type={type}
    >
      {buttonContent}
    </button>
  );
}
