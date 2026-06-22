"use client";

import { useState, type CSSProperties } from "react";
import { ChevronRight, TrendingDown, TrendingUp } from "lucide-react";
import type {
  PivotCategoryNode,
  PivotGranularity,
  PivotResponse,
  PivotSide,
} from "@/types";

// Фиксированные ширины sticky-колонок — нужны, чтобы:
//   1. left-смещение для sticky «Итого» совпадало с реальной шириной «Имени»;
//   2. ширины колонок не плавали в зависимости от контента.
const NAME_W = 220;
const TOTAL_W = 110;
const NAME_STYLE: CSSProperties = {
  width: NAME_W,
  minWidth: NAME_W,
  maxWidth: NAME_W,
};
const TOTAL_STYLE: CSSProperties = {
  width: TOTAL_W,
  minWidth: TOTAL_W,
  maxWidth: TOTAL_W,
  left: NAME_W,
};

function fmt(n: number) {
  if (!n) return "—";
  return new Intl.NumberFormat("ru-RU", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(n);
}

const MONTH_SHORT = [
  "янв",
  "фев",
  "мар",
  "апр",
  "май",
  "июн",
  "июл",
  "авг",
  "сен",
  "окт",
  "ноя",
  "дек",
];

function formatPeriodLabel(period: string, granularity: PivotGranularity): string {
  if (granularity === "year") return period;
  if (granularity === "month") {
    const [y, m] = period.split("-");
    return `${MONTH_SHORT[parseInt(m, 10) - 1]} ${y.slice(-2)}`;
  }
  if (granularity === "week") {
    // "2026-W03" → "W03 26"
    const m = period.match(/^(\d+)-W(\d+)$/);
    if (!m) return period;
    return `W${m[2]} ${m[1].slice(-2)}`;
  }
  // day "2026-01-15" → "15 янв"
  const [, mm, dd] = period.split("-");
  return `${parseInt(dd, 10)} ${MONTH_SHORT[parseInt(mm, 10) - 1]}`;
}

interface Props {
  data: PivotResponse;
}

export default function PivotTable({ data }: Props) {
  const [collapsed, setCollapsed] = useState<Set<string>>(() =>
    collectAllKeys(data),
  );

  function toggle(key: string) {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  const isEmpty = data.income.total === 0 && data.expense.total === 0;
  if (isEmpty) {
    return <p className="py-12 text-center text-sm text-muted">Нет данных</p>;
  }

  const { periods, granularity } = data;
  const periodWidth = granularity === "day" ? 70 : 90;
  const minW = NAME_W + TOTAL_W + periods.length * periodWidth;

  return (
    <div className="overflow-x-auto">
      <table
        className="w-full text-sm"
        style={{ minWidth: `${minW}px` }}
      >
        <thead>
          <tr className="border-b border-border text-xs uppercase text-muted">
            <th
              className="sticky left-0 z-20 bg-surface py-2 pl-2 pr-4 text-left font-medium"
              style={NAME_STYLE}
            >
              Категория / получатель
            </th>
            <th
              className="sticky z-20 border-r border-border bg-surface py-2 pl-2 pr-3 text-right font-medium"
              style={TOTAL_STYLE}
            >
              Итого
            </th>
            {periods.map((p) => (
              <th
                key={p}
                className="py-2 px-2 text-right font-medium tabular-nums"
                style={{ minWidth: `${periodWidth}px` }}
              >
                {formatPeriodLabel(p, granularity)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-border/40">
          <SideRows
            side={data.income}
            sideKey="income"
            periods={periods}
            collapsed={collapsed}
            onToggle={toggle}
          />
          <SideRows
            side={data.expense}
            sideKey="expense"
            periods={periods}
            collapsed={collapsed}
            onToggle={toggle}
          />
        </tbody>
      </table>
    </div>
  );
}

function SideRows({
  side,
  sideKey,
  periods,
  collapsed,
  onToggle,
}: {
  side: PivotSide;
  sideKey: "income" | "expense";
  periods: string[];
  collapsed: Set<string>;
  onToggle: (key: string) => void;
}) {
  const rootKey = `side:${sideKey}`;
  const isOpen = !collapsed.has(rootKey);
  const isIncome = sideKey === "income";
  // Сплошные (opaque) фоны — иначе при горизонтальном скролле сквозь
  // sticky-ячейки просвечивают цифры из периодов.
  const bg = isIncome ? "bg-green-50" : "bg-red-50";
  const colorText = isIncome ? "text-income" : "text-expense";

  return (
    <>
      <tr className={`cursor-pointer ${bg}`} onClick={() => onToggle(rootKey)}>
        <td
          className={`sticky left-0 z-10 ${bg} py-2.5 pl-2 pr-4`}
          style={NAME_STYLE}
        >
          <span className="inline-flex items-center gap-2">
            <ChevronRight
              className={`h-3.5 w-3.5 text-muted transition-transform ${
                isOpen ? "rotate-90" : ""
              }`}
            />
            {isIncome ? (
              <TrendingUp className="h-4 w-4 text-income" />
            ) : (
              <TrendingDown className="h-4 w-4 text-expense" />
            )}
            <span className="text-xs font-semibold uppercase tracking-wider">
              {isIncome ? "Доходы" : "Расходы"}
            </span>
          </span>
        </td>
        <td
          className={`sticky z-10 border-r border-border ${bg} py-2.5 pl-2 pr-3 text-right font-bold tabular-nums ${colorText}`}
          style={TOTAL_STYLE}
        >
          {isIncome ? "+" : "−"}
          {fmt(side.total)}
        </td>
        {periods.map((p) => (
          <td
            key={p}
            className={`py-2.5 px-2 text-right font-semibold tabular-nums ${colorText}`}
          >
            {fmt(side.by_period[p] ?? 0)}
          </td>
        ))}
      </tr>
      {isOpen &&
        side.categories.map((node) => (
          <CategoryRows
            key={`${sideKey}:c:${node.category_id ?? "none"}`}
            node={node}
            isIncome={isIncome}
            depth={1}
            parentPath={sideKey}
            periods={periods}
            collapsed={collapsed}
            onToggle={onToggle}
          />
        ))}
    </>
  );
}

function CategoryRows({
  node,
  isIncome,
  depth,
  parentPath,
  periods,
  collapsed,
  onToggle,
}: {
  node: PivotCategoryNode;
  isIncome: boolean;
  depth: number;
  parentPath: string;
  periods: string[];
  collapsed: Set<string>;
  onToggle: (key: string) => void;
}) {
  const path = `${parentPath}/${node.category_id ?? "none"}`;
  const hasChildren = node.children.length > 0 || node.items.length > 0;
  const isOpen = !collapsed.has(path);
  const pad = 8 + depth * 18;
  const colorText = isIncome ? "text-income" : "text-expense";

  return (
    <>
      <tr
        className={`${hasChildren ? "cursor-pointer" : ""} hover:bg-gray-50/60`}
        onClick={() => hasChildren && onToggle(path)}
      >
        <td
          className="sticky left-0 z-10 bg-surface py-2 pl-2 pr-4"
          style={NAME_STYLE}
        >
          <span
            className="inline-flex items-center gap-1.5"
            style={{ paddingLeft: pad }}
          >
            {hasChildren ? (
              <ChevronRight
                className={`h-3.5 w-3.5 text-muted transition-transform ${
                  isOpen ? "rotate-90" : ""
                }`}
              />
            ) : (
              <span className="inline-block w-3.5" />
            )}
            <span className={`truncate ${depth === 1 ? "font-medium" : ""}`}>
              {node.name}
            </span>
          </span>
        </td>
        <td
          className={`sticky z-10 border-r border-border bg-surface py-2 pl-2 pr-3 text-right font-semibold tabular-nums ${colorText}`}
          style={TOTAL_STYLE}
        >
          {fmt(node.total)}
        </td>
        {periods.map((p) => (
          <td
            key={p}
            className={`py-2 px-2 text-right tabular-nums ${colorText}`}
          >
            {fmt(node.by_period[p] ?? 0)}
          </td>
        ))}
      </tr>

      {isOpen &&
        node.children.map((child) => (
          <CategoryRows
            key={`c:${child.category_id ?? "none"}-${child.name}`}
            node={child}
            isIncome={isIncome}
            depth={depth + 1}
            parentPath={path}
            periods={periods}
            collapsed={collapsed}
            onToggle={onToggle}
          />
        ))}

      {isOpen &&
        node.items.map((item, i) => (
          <tr key={`${path}/i/${i}`} className="hover:bg-gray-50/60">
            <td
              className="sticky left-0 z-10 bg-surface py-1.5 pl-2 pr-4"
              style={NAME_STYLE}
            >
              <span
                className="inline-flex items-center gap-1.5 text-muted"
                style={{ paddingLeft: pad + 18 }}
              >
                <span className="inline-block w-3.5" />
                <span className="truncate">{item.merchant || "—"}</span>
              </span>
            </td>
            <td
              className={`sticky z-10 border-r border-border bg-surface py-1.5 pl-2 pr-3 text-right font-medium tabular-nums opacity-80 ${colorText}`}
              style={TOTAL_STYLE}
            >
              {fmt(item.total)}
            </td>
            {periods.map((p) => (
              <td
                key={p}
                className={`py-1.5 px-2 text-right tabular-nums opacity-80 ${colorText}`}
              >
                {fmt(item.by_period[p] ?? 0)}
              </td>
            ))}
          </tr>
        ))}
    </>
  );
}

function collectAllKeys(data: PivotResponse): Set<string> {
  const keys = new Set<string>();
  function walk(node: PivotCategoryNode, prefix: string) {
    const key = `${prefix}/${node.category_id ?? "none"}`;
    keys.add(key);
    node.children.forEach((c) => walk(c, key));
  }
  data.income.categories.forEach((c) => walk(c, "income"));
  data.expense.categories.forEach((c) => walk(c, "expense"));
  return keys;
}

export type { Props as PivotTableProps };
