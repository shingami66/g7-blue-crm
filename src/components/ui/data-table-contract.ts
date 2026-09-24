import type { CSSProperties, ReactNode } from "react";

export type DataTableAlignment = "start" | "end" | "center";

export type DataTableColumnKind =
  | "text"
  | "identifier"
  | "number"
  | "money"
  | "date"
  | "status"
  | "actions";

export type DataTableColumn = {
  key: string;
  header: ReactNode;
  align: DataTableAlignment;
  kind?: DataTableColumnKind;
  minWidth?: CSSProperties["minWidth"];
  noWrap?: boolean;
};

/** String headers remain a backward-compatible, start-aligned presentation only. */
export type DataTableColumnInput = DataTableColumn | string;

export function normalizeDataTableColumns(
  columns: readonly DataTableColumnInput[],
  centeredColumns: readonly number[] = [],
): DataTableColumn[] {
  return columns.map((column, index) => {
    if (typeof column !== "string") return column;

    return {
      key: `legacy-${index}`,
      header: column,
      align: centeredColumns.includes(index) ? "center" : "start",
      kind: "text",
    };
  });
}

/** A single alignment resolver is shared by each column's header and body cells. */
export function getDataTableColumnAlignment(
  column: DataTableColumn,
): DataTableAlignment {
  return column.align;
}

export function getDataTableColumnCellStyle(
  column: DataTableColumn,
  placement: "header" | "body",
): CSSProperties {
  return {
    textAlign: getDataTableColumnAlignment(column),
    ...(column.minWidth !== undefined ? { minWidth: column.minWidth } : {}),
    ...(placement === "body" && column.noWrap ? { whiteSpace: "nowrap" } : {}),
  };
}
