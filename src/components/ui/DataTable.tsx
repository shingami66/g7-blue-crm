import {
  Children,
  cloneElement,
  isValidElement,
  type CSSProperties,
  type ReactElement,
  type ReactNode,
} from "react";

interface TableChildProps {
  children?: ReactNode;
  style?: CSSProperties;
  className?: string;
}

function mergeStyle(
  baseStyle: CSSProperties | undefined,
  addedStyle: CSSProperties
): CSSProperties {
  return {
    ...(baseStyle ?? {}),
    ...addedStyle,
  };
}

export default function DataTable({
  columns,
  centeredColumns = [],
  children,
}: {
  columns: string[];
  centeredColumns?: readonly number[];
  children: ReactNode;
}) {
  const hasActionColumn =
    columns.length > 0 &&
    columns[columns.length - 1].toLowerCase().includes("action");

  const rows = hasActionColumn || centeredColumns.length > 0
    ? Children.map(children, (row) => {
        if (!isValidElement<TableChildProps>(row)) {
          return row;
        }

        const rowElement = row as ReactElement<TableChildProps>;
        const rowChildren = Children.toArray(rowElement.props.children);

        if (rowChildren.length <= 1) {
          return row;
        }

        const lastIndex = rowChildren.length - 1;
        const nextChildren = rowChildren.map((cell, index) => {
          const isActionCell = hasActionColumn && index === lastIndex;
          const isCenteredCell = centeredColumns.includes(index) && !isActionCell;
          if ((!isCenteredCell && !isActionCell) || !isValidElement<TableChildProps>(cell)) {
            return cell;
          }

          const cellElement = cell as ReactElement<TableChildProps>;
          const nextStyle = mergeStyle(cellElement.props.style, {
            textAlign: isActionCell ? "end" : "center",
          });
          let nextCellChildren = cellElement.props.children;

          if (isValidElement<TableChildProps>(nextCellChildren)) {
            const childElement = nextCellChildren as ReactElement<TableChildProps>;
            const currentClassName =
              typeof childElement.props.className === "string"
                ? childElement.props.className
                : "";

            if (currentClassName.split(" ").includes("flex") && !currentClassName.includes("justify-")) {
              nextCellChildren = cloneElement(childElement, {
                className: `${currentClassName} ${isActionCell ? "justify-end" : "justify-center"}`,
              });
            }
          }

          return cloneElement(cellElement, { style: nextStyle }, nextCellChildren);
        });

        return cloneElement(rowElement, {}, nextChildren);
      })
    : children;

  return (
    <div className="w-full min-w-0 max-w-full overflow-x-auto border border-surface-variant rounded-b-xl bg-surface-container-lowest">
      <table className="w-full border-collapse" style={{ textAlign: "start" }}>
        <thead>
          <tr className="bg-surface-container-low border-b border-surface-variant">
            {columns.map((col, i) => (
              <th
                key={i}
                className={`text-[12px] leading-[16px] tracking-[0.05em] font-semibold text-on-surface-variant uppercase px-4 py-3 ${centeredColumns.includes(i) && !(hasActionColumn && i === columns.length - 1) ? "text-center" : ""}`}
                style={
                  hasActionColumn && i === columns.length - 1
                    ? { textAlign: "end" }
                    : centeredColumns.includes(i)
                      ? { textAlign: "center" }
                    : undefined
                }
              >
                {col}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-surface-variant text-[14px] leading-[20px]">
          {rows}
        </tbody>
      </table>
    </div>
  );
}
