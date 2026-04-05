import type { ReactNode } from "react";

interface Props {
  title: string;
  value: string;
  subtitle?: string;
  icon?: ReactNode;
  variant?: "default" | "income" | "expense";
}

const COLORS = {
  default: "text-foreground",
  income: "text-income",
  expense: "text-expense",
};

export default function StatsCard({ title, value, subtitle, icon, variant = "default" }: Props) {
  return (
    <div className="rounded-xl bg-surface p-5 shadow-sm border border-border/50">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-muted">{title}</p>
        {icon && <span className="text-muted">{icon}</span>}
      </div>
      <p className={`mt-2 text-2xl font-bold tracking-tight ${COLORS[variant]}`}>{value}</p>
      {subtitle && <p className="mt-1 text-xs text-muted">{subtitle}</p>}
    </div>
  );
}
