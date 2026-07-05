import {
  Children,
  cloneElement,
  isValidElement,
  type CSSProperties,
  type ReactElement,
  type ReactNode,
} from "react";

interface FilterBarChildProps {
  className?: string;
  style?: CSSProperties;
}

export default function FilterBar({ children }: { children: ReactNode }) {
  const nextChildren = Children.map(children, (child) => {
    if (
      !isValidElement<FilterBarChildProps>(child) ||
      typeof child.props.className !== "string"
    ) {
      return child;
    }

    const childElement = child as ReactElement<FilterBarChildProps>;
    const classes = childElement.props.className!.split(" ").filter(Boolean);
    const hasMlAuto = classes.includes("ml-auto");
    const hasMrAuto = classes.includes("mr-auto");

    if (!hasMlAuto && !hasMrAuto) {
      return child;
    }

    const className = classes
      .filter(
        (classItem: string) => classItem !== "ml-auto" && classItem !== "mr-auto"
      )
      .join(" ");

    const style: CSSProperties = {
      ...(childElement.props.style ?? {}),
    };

    if (hasMlAuto) {
      style.marginInlineStart = "auto";
    }

    if (hasMrAuto) {
      style.marginInlineEnd = "auto";
    }

    return cloneElement(childElement, {
      className,
      style,
    });
  });

  return (
    <div
      className="flex flex-wrap gap-3 items-center p-4 bg-surface-container-lowest border border-surface-variant rounded-t-xl border-b-0"
      style={{ textAlign: "start" }}
    >
      {nextChildren}
    </div>
  );
}
