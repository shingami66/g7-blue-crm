import type { ReactNode } from "react";

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
