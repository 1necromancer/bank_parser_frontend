"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
import {
  TrendingUp,
  TrendingDown,
  Wallet,
  RefreshCw,
  Table2,
  Filter,
  X,
} from "lucide-react";
import { api } from "@/lib/api";
import StatsCard from "@/components/stats-card";
import PivotTable from "@/components/pivot-table";
import type {
  Account,
  CashflowPoint,
  CategoryBreakdown,
  DashboardSummary,
  PivotGranularity,
  PivotResponse,
  RecurringTransaction,
} from "@/types";

const PIE_COLORS = [
  "#4f46e5", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6",
  "#06b6d4", "#ec4899", "#14b8a6", "#f97316", "#6366f1",
];

const GRANULARITY_LABELS: Record<PivotGranularity, string> = {
  day: "День",
  week: "Неделя",
  month: "Месяц",
  year: "Год",
};

function fmt(n: number) {
  return new Intl.NumberFormat("ru-RU", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(n);
}

// Узел графика «по категориям» — топ-N + опциональный «Прочие» с
// прикреплённым breakdown для подсказки.
interface CategoryChartItem extends CategoryBreakdown {
  _isOthers?: boolean;
  _breakdown?: CategoryBreakdown[];
}

function CategoryPieTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{ payload: CategoryChartItem }>;
}) {
  if (!active || !payload?.length) return null;
  const item = payload[0].payload;
  return (
    <div className="max-w-xs rounded-lg border border-border bg-white p-3 text-xs shadow-lg">
      <p className="font-semibold">{item.category_name}</p>
      <p className="mt-0.5 text-muted">
        {fmt(item.total)} ₸ · {item.percentage.toFixed(1)}% ·{" "}
        {item.transactions_count} транз.
      </p>
      {item._isOthers && item._breakdown && item._breakdown.length > 0 && (
        <div className="mt-2 max-h-56 space-y-1 overflow-y-auto border-t border-border pt-2">
          {item._breakdown.map((c) => (
            <div
              key={c.category_id ?? c.category_name}
              className="flex items-center justify-between gap-3"
            >
              <span className="truncate">{c.category_name}</span>
              <span className="shrink-0 tabular-nums text-muted">
                {fmt(c.total)} ₸
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function PivotFilters({
  granularity,
  onGranularity,
  dateFrom,
  dateTo,
  onDateFrom,
  onDateTo,
  accounts,
  accountIds,
  onAccountIds,
}: {
  granularity: PivotGranularity;
  onGranularity: (g: PivotGranularity) => void;
  dateFrom: string;
  dateTo: string;
  onDateFrom: (v: string) => void;
  onDateTo: (v: string) => void;
  accounts: Account[];
  accountIds: number[];
  onAccountIds: (ids: number[]) => void;
}) {
  const [accOpen, setAccOpen] = useState(false);
  const accRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!accOpen) return;
    function handle(e: MouseEvent) {
      if (!accRef.current?.contains(e.target as Node)) setAccOpen(false);
    }
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, [accOpen]);

  function toggleAccount(id: number) {
    onAccountIds(
      accountIds.includes(id)
        ? accountIds.filter((x) => x !== id)
        : [...accountIds, id],
    );
  }

  const accLabel =
    accountIds.length === 0
      ? "Все счета"
      : accountIds.length === 1
        ? accounts.find((a) => a.id === accountIds[0])?.name ?? "1 счёт"
        : `${accountIds.length} счетов`;

  const hasAnyFilter =
    accountIds.length > 0 || Boolean(dateFrom) || Boolean(dateTo);

  return (
    <div className="mb-4 flex flex-wrap items-end gap-3">
      {/* Granularity */}
      <div>
        <label className="mb-1 block text-xs text-muted">Период</label>
        <div className="inline-flex overflow-hidden rounded-lg border border-border">
          {(Object.keys(GRANULARITY_LABELS) as PivotGranularity[]).map((g) => (
            <button
              key={g}
              type="button"
              onClick={() => onGranularity(g)}
              className={`px-2.5 py-1.5 text-xs transition-colors ${
                granularity === g
                  ? "bg-primary text-white"
                  : "bg-transparent text-muted hover:bg-gray-50"
              }`}
            >
              {GRANULARITY_LABELS[g]}
            </button>
          ))}
        </div>
      </div>

      {/* Date range */}
      <div>
        <label className="mb-1 block text-xs text-muted">С</label>
        <input
          type="date"
          value={dateFrom}
          onChange={(e) => onDateFrom(e.target.value)}
          className="rounded-lg border border-border px-2 py-1.5 text-sm focus:border-primary focus:outline-none"
        />
      </div>
      <div>
        <label className="mb-1 block text-xs text-muted">По</label>
        <input
          type="date"
          value={dateTo}
          onChange={(e) => onDateTo(e.target.value)}
          className="rounded-lg border border-border px-2 py-1.5 text-sm focus:border-primary focus:outline-none"
        />
      </div>

      {/* Accounts multi-select */}
      <div ref={accRef} className="relative">
        <label className="mb-1 block text-xs text-muted">Счета</label>
        <button
          type="button"
          onClick={() => setAccOpen((o) => !o)}
          className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm transition-colors ${
            accountIds.length > 0
              ? "border-primary/40 bg-primary/5 text-primary"
              : "border-border hover:bg-gray-50"
          }`}
        >
          <Filter className="h-3.5 w-3.5" />
          {accLabel}
        </button>
        {accOpen && (
          <div className="absolute left-0 top-full z-30 mt-1 w-64 max-w-[calc(100vw-2rem)] rounded-lg border border-border bg-surface p-3 shadow-lg">
            <div className="max-h-64 space-y-1.5 overflow-y-auto">
              {accounts.length === 0 && (
                <p className="text-xs text-muted">Нет счетов</p>
              )}
              {accounts.map((a) => (
                <label
                  key={a.id}
                  className="flex cursor-pointer items-center gap-2 text-sm"
                >
                  <input
                    type="checkbox"
                    checked={accountIds.includes(a.id)}
                    onChange={() => toggleAccount(a.id)}
                  />
                  <span className="truncate">
                    {a.name}{" "}
                    <span className="text-xs text-muted">({a.bank_name})</span>
                  </span>
                </label>
              ))}
            </div>
            {accountIds.length > 0 && (
              <button
                type="button"
                onClick={() => onAccountIds([])}
                className="mt-2 inline-flex items-center gap-1 text-xs text-muted hover:text-red-500"
              >
                <X className="h-3 w-3" /> Сбросить
              </button>
            )}
          </div>
        )}
      </div>

      {hasAnyFilter && (
        <button
          type="button"
          onClick={() => {
            onDateFrom("");
            onDateTo("");
            onAccountIds([]);
          }}
          className="inline-flex items-center gap-1 self-end pb-2 text-xs text-muted hover:text-red-500 transition-colors"
        >
          <X className="h-3 w-3" /> Сбросить фильтры
        </button>
      )}
    </div>
  );
}

export default function DashboardPage() {
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [categories, setCategories] = useState<CategoryBreakdown[]>([]);
  const [cashflow, setCashflow] = useState<CashflowPoint[]>([]);
  const [recurring, setRecurring] = useState<RecurringTransaction[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [categoriesTopN, setCategoriesTopN] = useState(5);

  // Берём топ-N категорий, остальные складываем в синтетический «Прочие»
  // с прикреплённым breakdown — для подсказки при hover.
  const categoriesChartData = useMemo<CategoryChartItem[]>(() => {
    const sorted = [...categories].sort((a, b) => b.total - a.total);
    if (sorted.length <= categoriesTopN) return sorted;
    const top = sorted.slice(0, categoriesTopN);
    const rest = sorted.slice(categoriesTopN);
    const others: CategoryChartItem = {
      category_name: `Прочие (${rest.length})`,
      total: rest.reduce((s, c) => s + c.total, 0),
      percentage: rest.reduce((s, c) => s + c.percentage, 0),
      transactions_count: rest.reduce((s, c) => s + c.transactions_count, 0),
      _isOthers: true,
      _breakdown: rest,
    };
    return [...top, others];
  }, [categories, categoriesTopN]);

  // Pivot-фильтры (применяются только к pivot, остальное — без изменений)
  const [pivot, setPivot] = useState<PivotResponse | null>(null);
  const [pivotLoading, setPivotLoading] = useState(false);
  const [granularity, setGranularity] = useState<PivotGranularity>("month");
  const [pivotDateFrom, setPivotDateFrom] = useState("");
  const [pivotDateTo, setPivotDateTo] = useState("");
  const [pivotAccountIds, setPivotAccountIds] = useState<number[]>([]);

  const load = useCallback(async () => {
    setLoading(true);
    const results = await Promise.allSettled([
      api.getSummary(),
      api.getCategoryBreakdown(),
      api.getCashflow("monthly"),
      api.getRecurring(),
      api.getAccounts(),
    ]);

    if (results[0].status === "fulfilled") setSummary(results[0].value);
    else console.error("dashboard/summary:", results[0].reason);

    if (results[1].status === "fulfilled") setCategories(results[1].value);
    else console.error("dashboard/categories:", results[1].reason);

    if (results[2].status === "fulfilled") setCashflow(results[2].value.points);
    else console.error("dashboard/cashflow:", results[2].reason);

    if (results[3].status === "fulfilled") setRecurring(results[3].value);
    else console.error("dashboard/recurring:", results[3].reason);

    if (results[4].status === "fulfilled") setAccounts(results[4].value);
    else console.error("dashboard/accounts:", results[4].reason);

    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    setPivotLoading(true);
    api
      .getPivot({
        granularity,
        dateFrom: pivotDateFrom || undefined,
        dateTo: pivotDateTo || undefined,
        accountIds: pivotAccountIds.length ? pivotAccountIds : undefined,
      })
      .then(setPivot)
      .catch((e) => console.error("dashboard/pivot:", e))
      .finally(() => setPivotLoading(false));
  }, [granularity, pivotDateFrom, pivotDateTo, pivotAccountIds]);

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
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-sm font-semibold text-muted uppercase tracking-wider">
              Расходы по категориям
            </h2>
            <label className="flex items-center gap-2 text-xs text-muted">
              Топ
              <input
                type="number"
                min={1}
                max={50}
                value={categoriesTopN}
                onChange={(e) => {
                  const v = parseInt(e.target.value, 10);
                  if (Number.isFinite(v) && v >= 1) {
                    setCategoriesTopN(Math.min(50, v));
                  }
                }}
                className="w-14 rounded border border-border px-2 py-0.5 text-center text-xs focus:border-primary focus:outline-none"
              />
              <span>
                из <b>{categories.length}</b>
              </span>
            </label>
          </div>
          {categoriesChartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie
                  data={categoriesChartData}
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
                  {categoriesChartData.map((d, i) => (
                    <Cell
                      key={i}
                      fill={
                        d._isOthers
                          ? "#94a3b8"
                          : PIE_COLORS[i % PIE_COLORS.length]
                      }
                    />
                  ))}
                </Pie>
                <Tooltip content={<CategoryPieTooltip />} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <p className="py-20 text-center text-sm text-muted">Нет данных</p>
          )}
        </div>
      </div>

      {/* Pivot table */}
      <div className="rounded-xl bg-surface p-5 shadow-sm border border-border/50">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-sm font-semibold text-muted uppercase tracking-wider">
            <Table2 className="mr-2 inline h-4 w-4" />
            Сводная таблица
          </h2>
          {pivotLoading && (
            <span className="text-xs text-muted">Загрузка...</span>
          )}
        </div>

        <PivotFilters
          granularity={granularity}
          onGranularity={setGranularity}
          dateFrom={pivotDateFrom}
          dateTo={pivotDateTo}
          onDateFrom={setPivotDateFrom}
          onDateTo={setPivotDateTo}
          accounts={accounts}
          accountIds={pivotAccountIds}
          onAccountIds={setPivotAccountIds}
        />

        {pivot ? (
          <PivotTable data={pivot} />
        ) : (
          <p className="py-12 text-center text-sm text-muted">Загрузка...</p>
        )}
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
