import {
  Children,
  isValidElement,
  type ReactElement,
  type ReactNode,
} from "react";

export function normalizeAsChild(children: ReactNode): ReactElement | null {
  const childNodes = Children.toArray(children);
  const child = childNodes.length === 1 ? childNodes[0] : null;

  return isValidElement(child) ? child : null;
}
