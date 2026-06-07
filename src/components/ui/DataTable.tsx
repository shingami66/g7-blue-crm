import { ReactNode } from "react";

export default function DataTable({
  columns,
  children,
}: {
  columns: string[];
  children: ReactNode;
}) {
  return (
    <div className="overflow-x-auto w-full border border-surface-variant rounded-b-xl bg-surface-container-lowest">
      <table className="w-full text-left border-collapse">
        <thead>
          <tr className="bg-surface-container-low border-b border-surface-variant">
            {columns.map((col, i) => (
              <th
                key={i}
                className="text-[12px] leading-[16px] tracking-[0.05em] font-semibold text-on-surface-variant uppercase px-4 py-3"
              >
                {col}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-surface-variant text-[14px] leading-[20px]">
          {children}
        </tbody>
      </table>
    </div>
  );
}
