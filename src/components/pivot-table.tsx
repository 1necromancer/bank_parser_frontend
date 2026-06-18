"use client";

import { useState } from "react";
import { ChevronRight, TrendingDown, TrendingUp } from "lucide-react";
import type { PivotCategoryNode, PivotResponse, PivotSide } from "@/types";

function fmt(n: number) {
  return new Intl.NumberFormat("ru-RU", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(n);
}

interface Props {
  data: PivotResponse;
}

export default function PivotTable({ data }: Props) {
  // Свёрнутые ноды храним по уникальному ключу. По умолчанию свёрнуто всё
  // кроме двух корней — иначе на больших деревьях рендер становится тяжёлым.
  const [collapsed, setCollapsed] = useState<Set<string>>(() => {
    return collectAllKeys(data);
  });

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

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border text-left text-xs uppercase text-muted">
            <th className="py-2 pl-2 pr-4 font-medium">Категория / получатель</th>
            <th className="py-2 pr-4 text-right font-medium">Сумма</th>
            <th className="py-2 pr-4 text-right font-medium">% стороны</th>
            <th className="py-2 pr-2 text-right font-medium">Транз.</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border/40">
          <SideRows
            side={data.income}
            sideKey="income"
            collapsed={collapsed}
            onToggle={toggle}
          />
          <SideRows
            side={data.expense}
            sideKey="expense"
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
  collapsed,
  onToggle,
}: {
  side: PivotSide;
  sideKey: "income" | "expense";
  collapsed: Set<string>;
  onToggle: (key: string) => void;
}) {
  const rootKey = `side:${sideKey}`;
  const isOpen = !collapsed.has(rootKey);
  const isIncome = sideKey === "income";

  return (
    <>
      <tr
        className={`cursor-pointer ${
          isIncome ? "bg-green-50/50" : "bg-red-50/50"
        }`}
        onClick={() => onToggle(rootKey)}
      >
        <td className="py-2.5 pl-2 pr-4">
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
            <span className="font-semibold uppercase tracking-wider text-xs">
              {isIncome ? "Доходы" : "Расходы"}
            </span>
          </span>
        </td>
        <td
          className={`py-2.5 pr-4 text-right font-semibold ${
            isIncome ? "text-income" : "text-expense"
          }`}
        >
          {isIncome ? "+" : "−"}
          {fmt(side.total)} ₸
        </td>
        <td className="py-2.5 pr-4 text-right text-muted">100%</td>
        <td className="py-2.5 pr-2 text-right text-muted">{side.count}</td>
      </tr>
      {isOpen &&
        side.categories.map((node) => (
          <CategoryRows
            key={`${sideKey}:c:${node.category_id ?? "none"}`}
            node={node}
            sideTotal={side.total}
            isIncome={isIncome}
            depth={1}
            parentPath={sideKey}
            collapsed={collapsed}
            onToggle={onToggle}
          />
        ))}
    </>
  );
}

function CategoryRows({
  node,
  sideTotal,
  isIncome,
  depth,
  parentPath,
  collapsed,
  onToggle,
}: {
  node: PivotCategoryNode;
  sideTotal: number;
  isIncome: boolean;
  depth: number;
  parentPath: string;
  collapsed: Set<string>;
  onToggle: (key: string) => void;
}) {
  const path = `${parentPath}/${node.category_id ?? "none"}`;
  const hasChildren = node.children.length > 0 || node.items.length > 0;
  const isOpen = !collapsed.has(path);
  const pct = sideTotal > 0 ? (node.total / sideTotal) * 100 : 0;
  const pad = 8 + depth * 18;

  return (
    <>
      <tr
        className={`${hasChildren ? "cursor-pointer" : ""} hover:bg-gray-50/60`}
        onClick={() => hasChildren && onToggle(path)}
      >
        <td className="py-2 pl-2 pr-4">
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
            <span className={depth === 1 ? "font-medium" : ""}>
              {node.name}
            </span>
          </span>
        </td>
        <td
          className={`py-2 pr-4 text-right tabular-nums ${
            depth === 1 ? "font-semibold" : ""
          } ${isIncome ? "text-income" : "text-expense"}`}
        >
          {fmt(node.total)} ₸
        </td>
        <td className="py-2 pr-4 text-right text-muted tabular-nums">
          {pct.toFixed(1)}%
        </td>
        <td className="py-2 pr-2 text-right text-muted tabular-nums">
          {node.count}
        </td>
      </tr>

      {isOpen &&
        node.children.map((child) => (
          <CategoryRows
            key={`c:${child.category_id ?? "none"}-${child.name}`}
            node={child}
            sideTotal={sideTotal}
            isIncome={isIncome}
            depth={depth + 1}
            parentPath={path}
            collapsed={collapsed}
            onToggle={onToggle}
          />
        ))}

      {isOpen &&
        node.items.map((item, i) => {
          const itemPct = sideTotal > 0 ? (item.total / sideTotal) * 100 : 0;
          return (
            <tr key={`${path}/i/${i}`} className="hover:bg-gray-50/60">
              <td className="py-1.5 pl-2 pr-4">
                <span
                  className="inline-flex items-center gap-1.5 text-muted"
                  style={{ paddingLeft: pad + 18 }}
                >
                  <span className="inline-block w-3.5" />
                  <span className="truncate">{item.merchant || "—"}</span>
                </span>
              </td>
              <td
                className={`py-1.5 pr-4 text-right tabular-nums ${
                  isIncome ? "text-income/80" : "text-expense/80"
                }`}
              >
                {fmt(item.total)} ₸
              </td>
              <td className="py-1.5 pr-4 text-right text-muted tabular-nums">
                {itemPct.toFixed(1)}%
              </td>
              <td className="py-1.5 pr-2 text-right text-muted tabular-nums">
                {item.count}
              </td>
            </tr>
          );
        })}
    </>
  );
}

function collectAllKeys(data: PivotResponse): Set<string> {
  // Сворачиваем всё, КРОМЕ двух корней (Доходы / Расходы).
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
