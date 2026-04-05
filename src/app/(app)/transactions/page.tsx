"use client";

import { useCallback, useEffect, useState } from "react";
import { Search, ChevronLeft, ChevronRight } from "lucide-react";
import { api } from "@/lib/api";
import type { Category, Transaction } from "@/types";

function fmt(n: number) {
  return new Intl.NumberFormat("ru-RU", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n);
}

export default function TransactionsPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [categories, setCategories] = useState<Category[]>([]);
  const perPage = 30;

  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [merchantSearch, setMerchantSearch] = useState("");
  const [incomeFilter, setIncomeFilter] = useState("");

  const load = useCallback(async () => {
    const params: Record<string, string> = {
      page: String(page),
      per_page: String(perPage),
    };
    if (dateFrom) params.date_from = dateFrom;
    if (dateTo) params.date_to = dateTo;
    if (categoryId) params.category_id = categoryId;
    if (merchantSearch) params.merchant_contains = merchantSearch;
    if (incomeFilter === "true") params.is_income = "true";
    if (incomeFilter === "false") params.is_income = "false";

    try {
      const res = await api.getTransactions(params);
      setTransactions(res.transactions);
      setTotal(res.total);
    } catch {
      /* ignore */
    }
  }, [page, dateFrom, dateTo, categoryId, merchantSearch, incomeFilter]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    api.getCategories().then(setCategories).catch(() => {});
  }, []);

  async function handleCategoryChange(txId: number, newCatId: string) {
    try {
      const updated = await api.updateTransaction(txId, {
        category_id: newCatId ? Number(newCatId) : undefined,
      });
      setTransactions((prev) =>
        prev.map((t) => (t.id === txId ? { ...t, ...updated } : t)),
      );
    } catch {
      /* ignore */
    }
  }

  const totalPages = Math.ceil(total / perPage);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Транзакции</h1>

      {/* Filters */}
      <div className="flex flex-wrap items-end gap-3 rounded-xl bg-surface p-4 shadow-sm border border-border/50">
        <div>
          <label className="mb-1 block text-xs text-muted">С</label>
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => { setDateFrom(e.target.value); setPage(1); }}
            className="rounded-lg border border-border px-3 py-1.5 text-sm focus:border-primary focus:outline-none"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs text-muted">По</label>
          <input
            type="date"
            value={dateTo}
            onChange={(e) => { setDateTo(e.target.value); setPage(1); }}
            className="rounded-lg border border-border px-3 py-1.5 text-sm focus:border-primary focus:outline-none"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs text-muted">Категория</label>
          <select
            value={categoryId}
            onChange={(e) => { setCategoryId(e.target.value); setPage(1); }}
            className="rounded-lg border border-border px-3 py-1.5 text-sm focus:border-primary focus:outline-none"
          >
            <option value="">Все</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs text-muted">Тип</label>
          <select
            value={incomeFilter}
            onChange={(e) => { setIncomeFilter(e.target.value); setPage(1); }}
            className="rounded-lg border border-border px-3 py-1.5 text-sm focus:border-primary focus:outline-none"
          >
            <option value="">Все</option>
            <option value="true">Доходы</option>
            <option value="false">Расходы</option>
          </select>
        </div>
        <div className="relative">
          <label className="mb-1 block text-xs text-muted">Поиск</label>
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
            <input
              type="text"
              placeholder="Получатель..."
              value={merchantSearch}
              onChange={(e) => { setMerchantSearch(e.target.value); setPage(1); }}
              className="rounded-lg border border-border py-1.5 pl-8 pr-3 text-sm focus:border-primary focus:outline-none"
            />
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-xl bg-surface shadow-sm border border-border/50">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs text-muted uppercase">
              <th className="px-4 py-3">Дата</th>
              <th className="px-4 py-3">Получатель</th>
              <th className="px-4 py-3">Описание</th>
              <th className="px-4 py-3">Категория</th>
              <th className="px-4 py-3 text-right">Сумма</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/50">
            {transactions.map((tx) => (
              <tr key={tx.id} className="hover:bg-gray-50/50 transition-colors">
                <td className="whitespace-nowrap px-4 py-3 text-muted">{tx.date}</td>
                <td className="px-4 py-3 font-medium max-w-48 truncate">{tx.merchant || "—"}</td>
                <td className="px-4 py-3 text-muted max-w-64 truncate">{tx.description || "—"}</td>
                <td className="px-4 py-3">
                  <select
                    value={tx.category_id ?? ""}
                    onChange={(e) => handleCategoryChange(tx.id, e.target.value)}
                    className="rounded border border-border/50 px-2 py-1 text-xs focus:border-primary focus:outline-none bg-transparent"
                  >
                    <option value="">—</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </td>
                <td className={`whitespace-nowrap px-4 py-3 text-right font-semibold ${tx.is_income ? "text-income" : "text-expense"}`}>
                  {tx.is_income ? "+" : "−"}{fmt(Math.abs(tx.amount))} ₸
                </td>
              </tr>
            ))}
            {transactions.length === 0 && (
              <tr>
                <td colSpan={5} className="py-12 text-center text-muted">
                  Нет транзакций
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted">
            {total} транзакций · стр. {page} из {totalPages}
          </span>
          <div className="flex gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="inline-flex items-center gap-1 rounded-lg border border-border px-3 py-1.5 hover:bg-gray-50 disabled:opacity-40 transition-colors"
            >
              <ChevronLeft className="h-4 w-4" /> Назад
            </button>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="inline-flex items-center gap-1 rounded-lg border border-border px-3 py-1.5 hover:bg-gray-50 disabled:opacity-40 transition-colors"
            >
              Вперёд <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
