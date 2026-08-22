import { formatUsdc } from "../lib/money";

export type Kpi = {
  label: string;
  value: string;
  money?: boolean;
};

export function KpiRow({ items }: { items: Kpi[] }) {
  return (
    <div className="grid overflow-hidden rounded-[8px] border-2 border-ink/20 bg-surface md:grid-cols-4">
      {items.map((item, index) => (
        <div
          key={item.label}
          className={`px-5 py-4 ${index === items.length - 1 ? "" : "border-b border-rule md:border-b-0 md:border-r"}`}
        >
          <div className="text-xs text-muted">{item.label}</div>
          <div className="mt-1 text-[20px] font-medium tracking-[-0.02em] text-ink tabular-nums">
            {item.money ? formatUsdc(item.value) : item.value}
          </div>
        </div>
      ))}
    </div>
  );
}
