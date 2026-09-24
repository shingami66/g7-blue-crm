import {
  Children,
  cloneElement,
  Fragment,
  isValidElement,
  type CSSProperties,
  type ReactElement,
  type ReactNode,
} from "react";
import {
  getDataTableColumnAlignment,
  normalizeDataTableColumns,
  type DataTableAlignment,
  type DataTableColumnInput,
} from "./data-table-contract";

interface TableChildProps {
  children?: ReactNode;
  style?: CSSProperties;
  className?: string;
  colSpan?: number;
}

function flattenRowFragments(children: ReactNode): ReactNode[] {
  return Children.toArray(children).flatMap((child) => {
    if (
      isValidElement<{ children?: ReactNode }>(child) &&
      child.type === Fragment
    ) {
      return flattenRowFragments(child.props.children);
    }

    return [child];
  });
}

function alignActionFlexChild(
  children: ReactNode,
  alignment: DataTableAlignment,
): ReactNode {
  if (!isValidElement<TableChildProps>(children)) return children;

  const className = children.props.className ?? "";
  if (!/(?:^|\s)flex(?:\s|$)/.test(className)) return children;
  if (/\bjustify-(?:start|end|center|between|around|evenly|stretch)\b/.test(className)) {
    return children;
  }

  return cloneElement(children, {
    style: {
      ...children.props.style,
      justifyContent: alignment,
    },
  });
}

function alignRow(
  row: ReactNode,
  columns: ReturnType<typeof normalizeDataTableColumns>,
): ReactNode {
  if (!isValidElement<TableChildProps>(row) || row.type !== "tr") return row;

  const rowElement = row as ReactElement<TableChildProps>;
  const cells = flattenRowFragments(rowElement.props.children);
  const actualCells = cells.filter(
    (cell) =>
      isValidElement<TableChildProps>(cell) &&
      (cell.type === "td" || cell.type === "th"),
  );

  // Preserve full-row empty-state alignment such as a centered colspan cell.
  if (
    actualCells.length === 1 &&
    isValidElement<TableChildProps>(actualCells[0]) &&
    (actualCells[0].props.colSpan ?? 1) > 1
  ) {
    return row;
  }

  let columnIndex = 0;
  const alignedCells = cells.map((cell) => {
    if (
      !isValidElement<TableChildProps>(cell) ||
      (cell.type !== "td" && cell.type !== "th")
    ) {
      return cell;
    }

    const cellElement = cell as ReactElement<TableChildProps>;
    const column = columns[columnIndex];
    columnIndex += Math.max(1, cellElement.props.colSpan ?? 1);
    if (!column) return cell;

    const alignment = getDataTableColumnAlignment(column);
    const nextChildren =
      column.kind === "actions"
        ? alignActionFlexChild(cellElement.props.children, alignment)
        : cellElement.props.children;

    return cloneElement(
      cellElement,
      {
        style: {
          ...cellElement.props.style,
          textAlign: alignment,
        },
      },
      nextChildren,
    );
  });

  return cloneElement(rowElement, {}, alignedCells);
}

export default function DataTable({
  columns,
  centeredColumns = [],
  children,
}: {
  columns: readonly DataTableColumnInput[];
  /** @deprecated Prefer explicit `align` metadata on each column. */
  centeredColumns?: readonly number[];
  children: ReactNode;
}) {
  const tableColumns = normalizeDataTableColumns(columns, centeredColumns);
  const rows = Children.map(children, (row) => alignRow(row, tableColumns));

  return (
    <div className="w-full min-w-0 max-w-full overflow-x-auto rounded-b-xl border border-surface-variant bg-surface-container-lowest">
      <table className="w-full border-collapse text-start">
        <thead>
          <tr className="border-b border-surface-variant bg-surface-container-low">
            {tableColumns.map((column) => (
              <th
                key={column.key}
                data-column-kind={column.kind}
                className="px-4 py-3 text-[12px] font-semibold uppercase leading-[16px] tracking-[0.05em] text-on-surface-variant"
                style={{ textAlign: getDataTableColumnAlignment(column) }}
              >
                {column.header}
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
