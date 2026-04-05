"use client";

import { useCallback, useEffect, useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import { TrendingUp, TrendingDown, Wallet, RefreshCw } from "lucide-react";
import { api } from "@/lib/api";
import StatsCard from "@/components/stats-card";
import type {
  CashflowPoint,
  CategoryBreakdown,
  DashboardSummary,
  RecurringTransaction,
} from "@/types";

const PIE_COLORS = [
  "#4f46e5", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6",
  "#06b6d4", "#ec4899", "#14b8a6", "#f97316", "#6366f1",
];

function fmt(n: number) {
  return new Intl.NumberFormat("ru-RU", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(n);
}

export default function DashboardPage() {
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [categories, setCategories] = useState<CategoryBreakdown[]>([]);
  const [cashflow, setCashflow] = useState<CashflowPoint[]>([]);
  const [recurring, setRecurring] = useState<RecurringTransaction[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [s, c, cf, r] = await Promise.all([
        api.getSummary(),
        api.getCategoryBreakdown(),
        api.getCashflow("monthly"),
        api.getRecurring(),
      ]);
      setSummary(s);
      setCategories(c);
      setCashflow(cf.points);
      setRecurring(r);
    } catch {
      /* silent — empty dashboard */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold">Дашборд</h1>

      {/* Summary cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          title="Доходы"
          value={`${fmt(summary?.total_income ?? 0)} ₸`}
          icon={<TrendingUp className="h-5 w-5" />}
          variant="income"
        />
        <StatsCard
          title="Расходы"
          value={`${fmt(summary?.total_expense ?? 0)} ₸`}
          icon={<TrendingDown className="h-5 w-5" />}
          variant="expense"
        />
        <StatsCard
          title="Баланс"
          value={`${fmt(summary?.net ?? 0)} ₸`}
          icon={<Wallet className="h-5 w-5" />}
          variant={(summary?.net ?? 0) >= 0 ? "income" : "expense"}
        />
        <StatsCard
          title="Транзакций"
          value={String(summary?.transactions_count ?? 0)}
          subtitle={
            summary?.period_from && summary?.period_to
              ? `${summary.period_from} — ${summary.period_to}`
              : undefined
          }
        />
      </div>

      {/* Charts row */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Cashflow */}
        <div className="rounded-xl bg-surface p-5 shadow-sm border border-border/50">
          <h2 className="mb-4 text-sm font-semibold text-muted uppercase tracking-wider">
            Денежный поток
          </h2>
          {cashflow.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={cashflow}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="period" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => fmt(v)} />
                <Tooltip formatter={(v) => fmt(Number(v))} />
                <Bar dataKey="income" name="Доходы" fill="#10b981" radius={[4, 4, 0, 0]} />
                <Bar dataKey="expense" name="Расходы" fill="#f43f5e" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="py-20 text-center text-sm text-muted">Нет данных</p>
          )}
        </div>

        {/* Categories pie */}
        <div className="rounded-xl bg-surface p-5 shadow-sm border border-border/50">
          <h2 className="mb-4 text-sm font-semibold text-muted uppercase tracking-wider">
            Расходы по категориям
          </h2>
          {categories.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie
                  data={categories}
                  dataKey="total"
                  nameKey="category_name"
                  cx="50%"
                  cy="50%"
                  outerRadius={100}
                  innerRadius={50}
                  paddingAngle={2}
                  label={(props) => {
                    const name = props.name ?? "";
                    const pct = ((props.percent ?? 0) * 100).toFixed(0);
                    return `${name} ${pct}%`;
                  }}
                  labelLine={false}
                >
                  {categories.map((_, i) => (
                    <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(v) => fmt(Number(v))} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <p className="py-20 text-center text-sm text-muted">Нет данных</p>
          )}
        </div>
      </div>

      {/* Recurring */}
      {recurring.length > 0 && (
        <div className="rounded-xl bg-surface p-5 shadow-sm border border-border/50">
          <h2 className="mb-4 text-sm font-semibold text-muted uppercase tracking-wider">
            <RefreshCw className="mr-2 inline h-4 w-4" />
            Регулярные платежи
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs text-muted uppercase">
                  <th className="pb-3 pr-4">Получатель</th>
                  <th className="pb-3 pr-4">Ср. сумма</th>
                  <th className="pb-3 pr-4">Частота</th>
                  <th className="pb-3 pr-4">Последний</th>
                  <th className="pb-3">Раз</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {recurring.map((r, i) => (
                  <tr key={i}>
                    <td className="py-3 pr-4 font-medium">{r.merchant}</td>
                    <td className="py-3 pr-4 text-expense">{fmt(r.average_amount)} ₸</td>
                    <td className="py-3 pr-4">
                      {r.frequency_days > 0 ? `~${r.frequency_days} дн.` : "—"}
                    </td>
                    <td className="py-3 pr-4 text-muted">{r.last_date}</td>
                    <td className="py-3">{r.occurrences}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
