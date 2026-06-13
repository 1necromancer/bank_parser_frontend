"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Trash2, Filter, X } from "lucide-react";
import { api } from "@/lib/api";
import type { Account, Category, Transaction } from "@/types";

function fmt(n: number) {
  return new Intl.NumberFormat("ru-RU", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n);
}

function toggleInArray(arr: string[], value: string): string[] {
  return arr.includes(value) ? arr.filter((v) => v !== value) : [...arr, value];
}

function HeaderDropdown({
  label,
  active,
  align = "left",
  width = "w-64",
  textAlign = "left",
  children,
}: {
  label: string;
  active: boolean;
  align?: "left" | "right";
  width?: string;
  textAlign?: "left" | "right";
  children: (close: () => void) => React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handle(e: MouseEvent) {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, [open]);

  return (
    <div
      ref={ref}
      className={`relative inline-block ${textAlign === "right" ? "text-right" : "text-left"}`}
    >
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={`inline-flex items-center gap-1.5 rounded px-1.5 py-1 text-xs font-medium uppercase tracking-wider transition-colors ${
          active ? "text-primary" : "text-muted hover:text-foreground"
        }`}
      >
        {label}
        <Filter
          className={`h-3 w-3 ${active ? "fill-primary/30 text-primary" : ""}`}
        />
      </button>
      {open && (
        <div
          className={`absolute z-20 mt-1 ${width} rounded-lg border border-border bg-surface p-3 text-left shadow-lg ${
            align === "right" ? "right-0" : "left-0"
          }`}
        >
          {children(() => setOpen(false))}
        </div>
      )}
    </div>
  );
}

function ResetButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-1 pt-1 text-xs text-muted hover:text-red-500 transition-colors"
    >
      <X className="h-3 w-3" /> Сбросить
    </button>
  );
}

export default function TransactionsPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [categories, setCategories] = useState<Category[]>([]);
  const perPage = 30;

  const [accounts, setAccounts] = useState<Account[]>([]);

  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [bankFilter, setBankFilter] = useState<string[]>([]);
  const [merchantContains, setMerchantContains] = useState("");
  const [descriptionFilter, setDescriptionFilter] = useState<string[]>([]);
  const [categoryContains, setCategoryContains] = useState("");
  const [amountMin, setAmountMin] = useState("");
  const [amountMax, setAmountMax] = useState("");

  const [deleteFrom, setDeleteFrom] = useState("");
  const [deleteTo, setDeleteTo] = useState("");
  const [deleteAccountId, setDeleteAccountId] = useState("");
  const [deleteResult, setDeleteResult] = useState<number | null>(null);

  const load = useCallback(async () => {
    const params: Record<string, string> = {
      page: String(page),
      per_page: String(perPage),
    };
    if (dateFrom) params.date_from = dateFrom;
    if (dateTo) params.date_to = dateTo;
    if (bankFilter.length) params.bank = bankFilter.join(",");
    if (merchantContains) params.merchant_contains = merchantContains;
    if (descriptionFilter.length) params.description_in = descriptionFilter.join(",");
    if (categoryContains) params.category_contains = categoryContains;
    if (amountMin) params.amount_min = amountMin;
    if (amountMax) params.amount_max = amountMax;

    try {
      const res = await api.getTransactions(params);
      setTransactions(res.transactions);
      setTotal(res.total);
    } catch {
      /* ignore */
    }
  }, [
    page,
    dateFrom,
    dateTo,
    bankFilter,
    merchantContains,
    descriptionFilter,
    categoryContains,
    amountMin,
    amountMax,
  ]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    api.getCategories().then(setCategories).catch(() => {});
    api.getAccounts().then(setAccounts).catch(() => {});
  }, []);

  // Сбрасываем страницу на 1 при любой смене фильтров, чтобы не оказаться на пустой странице.
  useEffect(() => {
    setPage(1);
  }, [
    dateFrom,
    dateTo,
    bankFilter,
    merchantContains,
    descriptionFilter,
    categoryContains,
    amountMin,
    amountMax,
  ]);

  // Активные значения вмёрживаем в списки, чтобы их можно было снять, даже если backend
  // больше не возвращает соответствующие строки.
  const uniqueBanks = useMemo(
    () =>
      Array.from(
        new Set(
          [
            ...accounts.map((a) => a.bank_name),
            ...transactions.map((t) => t.bank_name ?? ""),
            ...bankFilter,
          ].filter(Boolean),
        ),
      ).sort() as string[],
    [accounts, transactions, bankFilter],
  );

  const uniqueDescriptions = useMemo(
    () =>
      Array.from(
        new Set(
          [
            ...transactions.map((t) => t.description ?? ""),
            ...descriptionFilter,
          ].filter(Boolean),
        ),
      ).sort() as string[],
    [transactions, descriptionFilter],
  );

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

  async function handleDeleteTransaction(id: number) {
    if (!confirm("Удалить эту транзакцию?")) return;
    try {
      await api.deleteTransaction(id);
      setTransactions((prev) => prev.filter((t) => t.id !== id));
      setTotal((t) => t - 1);
    } catch (e) {
      alert(e instanceof Error ? e.message : "Ошибка удаления");
    }
  }

  async function handleDeleteRange() {
    if (!deleteAccountId || !deleteFrom || !deleteTo) {
      alert("Укажите счёт и диапазон дат");
      return;
    }
    const accName =
      accounts.find((a) => a.id === Number(deleteAccountId))?.name || deleteAccountId;
    if (!confirm(`Удалить транзакции по счёту «${accName}» с ${deleteFrom} по ${deleteTo}?`))
      return;
    try {
      const res = await api.deleteTransactionsByRange(
        Number(deleteAccountId),
        deleteFrom,
        deleteTo,
      );
      setDeleteResult(res.deleted);
      setTimeout(() => setDeleteResult(null), 4000);
      load();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Ошибка удаления");
    }
  }

  const totalPages = Math.ceil(total / perPage);

  const dateActive = Boolean(dateFrom || dateTo);
  const bankActive = bankFilter.length > 0;
  const merchantActive = Boolean(merchantContains);
  const descriptionActive = descriptionFilter.length > 0;
  const categoryActive = Boolean(categoryContains);
  const amountActive = Boolean(amountMin || amountMax);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Транзакции</h1>

      {/* Delete by range */}
      <div className="rounded-xl bg-surface p-4 shadow-sm border border-border/50">
        <h3 className="mb-3 text-sm font-semibold text-muted uppercase tracking-wider">
          Удалить транзакции по диапазону дат
        </h3>
        {deleteResult !== null && (
          <div className="mb-3 rounded-lg bg-green-50 px-3 py-2 text-sm text-green-700">
            Удалено {deleteResult} транзакций
          </div>
        )}
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <label className="mb-1 block text-xs text-muted">Счёт</label>
            <select
              value={deleteAccountId}
              onChange={(e) => setDeleteAccountId(e.target.value)}
              className="rounded-lg border border-border px-3 py-1.5 text-sm focus:border-primary focus:outline-none"
            >
              <option value="">Выбрать</option>
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs text-muted">С</label>
            <input
              type="date"
              value={deleteFrom}
              onChange={(e) => setDeleteFrom(e.target.value)}
              className="rounded-lg border border-border px-3 py-1.5 text-sm focus:border-primary focus:outline-none"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-muted">По</label>
            <input
              type="date"
              value={deleteTo}
              onChange={(e) => setDeleteTo(e.target.value)}
              className="rounded-lg border border-border px-3 py-1.5 text-sm focus:border-primary focus:outline-none"
            />
          </div>
          <button
            onClick={handleDeleteRange}
            className="inline-flex items-center gap-1.5 rounded-lg bg-red-500 px-4 py-1.5 text-sm font-medium text-white hover:bg-red-600 transition-colors"
          >
            <Trash2 className="h-4 w-4" />
            Удалить
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-xl bg-surface shadow-sm border border-border/50">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left">
              <th className="px-4 py-3">
                <HeaderDropdown label="Дата" active={dateActive}>
                  {() => (
                    <div className="space-y-2">
                      <div>
                        <label className="mb-1 block text-xs text-muted">С</label>
                        <input
                          type="date"
                          value={dateFrom}
                          onChange={(e) => setDateFrom(e.target.value)}
                          className="w-full rounded-lg border border-border px-2 py-1 text-sm focus:border-primary focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-xs text-muted">По</label>
                        <input
                          type="date"
                          value={dateTo}
                          onChange={(e) => setDateTo(e.target.value)}
                          className="w-full rounded-lg border border-border px-2 py-1 text-sm focus:border-primary focus:outline-none"
                        />
                      </div>
                      {dateActive && (
                        <ResetButton
                          onClick={() => {
                            setDateFrom("");
                            setDateTo("");
                          }}
                        />
                      )}
                    </div>
                  )}
                </HeaderDropdown>
              </th>

              <th className="px-4 py-3">
                <HeaderDropdown label="Банк" active={bankActive}>
                  {() => (
                    <div className="space-y-2">
                      <div className="max-h-64 space-y-1.5 overflow-y-auto">
                        {uniqueBanks.length === 0 && (
                          <p className="text-xs text-muted">Нет данных</p>
                        )}
                        {uniqueBanks.map((b) => (
                          <label
                            key={b}
                            className="flex cursor-pointer items-center gap-2 text-sm"
                          >
                            <input
                              type="checkbox"
                              checked={bankFilter.includes(b)}
                              onChange={() =>
                                setBankFilter((arr) => toggleInArray(arr, b))
                              }
                            />
                            <span className="truncate">{b}</span>
                          </label>
                        ))}
                      </div>
                      {bankActive && <ResetButton onClick={() => setBankFilter([])} />}
                    </div>
                  )}
                </HeaderDropdown>
              </th>

              <th className="px-4 py-3">
                <HeaderDropdown label="Получатель" active={merchantActive}>
                  {() => (
                    <div className="space-y-2">
                      <input
                        autoFocus
                        type="text"
                        value={merchantContains}
                        onChange={(e) => setMerchantContains(e.target.value)}
                        placeholder="Содержит..."
                        className="w-full rounded-lg border border-border px-2 py-1 text-sm focus:border-primary focus:outline-none"
                      />
                      {merchantActive && (
                        <ResetButton onClick={() => setMerchantContains("")} />
                      )}
                    </div>
                  )}
                </HeaderDropdown>
              </th>

              <th className="px-4 py-3">
                <HeaderDropdown label="Описание" active={descriptionActive}>
                  {() => (
                    <div className="space-y-2">
                      <div className="max-h-64 space-y-1.5 overflow-y-auto">
                        {uniqueDescriptions.length === 0 && (
                          <p className="text-xs text-muted">Нет данных</p>
                        )}
                        {uniqueDescriptions.map((d) => (
                          <label
                            key={d}
                            className="flex cursor-pointer items-center gap-2 text-sm"
                          >
                            <input
                              type="checkbox"
                              checked={descriptionFilter.includes(d)}
                              onChange={() =>
                                setDescriptionFilter((arr) => toggleInArray(arr, d))
                              }
                            />
                            <span className="truncate">{d}</span>
                          </label>
                        ))}
                      </div>
                      {descriptionActive && (
                        <ResetButton onClick={() => setDescriptionFilter([])} />
                      )}
                    </div>
                  )}
                </HeaderDropdown>
              </th>

              <th className="px-4 py-3">
                <HeaderDropdown label="Категория" active={categoryActive}>
                  {() => (
                    <div className="space-y-2">
                      <input
                        autoFocus
                        type="text"
                        value={categoryContains}
                        onChange={(e) => setCategoryContains(e.target.value)}
                        placeholder="Содержит..."
                        className="w-full rounded-lg border border-border px-2 py-1 text-sm focus:border-primary focus:outline-none"
                      />
                      {categoryActive && (
                        <ResetButton onClick={() => setCategoryContains("")} />
                      )}
                    </div>
                  )}
                </HeaderDropdown>
              </th>

              <th className="px-4 py-3 text-right">
                <HeaderDropdown
                  label="Сумма"
                  active={amountActive}
                  align="right"
                  width="w-56"
                  textAlign="right"
                >
                  {() => (
                    <div className="space-y-2">
                      <div>
                        <label className="mb-1 block text-xs text-muted">От</label>
                        <input
                          type="number"
                          step="0.01"
                          value={amountMin}
                          onChange={(e) => setAmountMin(e.target.value)}
                          className="w-full rounded-lg border border-border px-2 py-1 text-sm focus:border-primary focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-xs text-muted">До</label>
                        <input
                          type="number"
                          step="0.01"
                          value={amountMax}
                          onChange={(e) => setAmountMax(e.target.value)}
                          className="w-full rounded-lg border border-border px-2 py-1 text-sm focus:border-primary focus:outline-none"
                        />
                      </div>
                      {amountActive && (
                        <ResetButton
                          onClick={() => {
                            setAmountMin("");
                            setAmountMax("");
                          }}
                        />
                      )}
                    </div>
                  )}
                </HeaderDropdown>
              </th>

              <th className="px-4 py-3 w-10"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/50">
            {transactions.map((tx) => (
              <tr key={tx.id} className="group hover:bg-gray-50/50 transition-colors">
                <td className="whitespace-nowrap px-4 py-3 text-muted">{tx.date}</td>
                <td className="whitespace-nowrap px-4 py-3 text-xs text-muted">
                  {tx.bank_name || "—"}
                </td>
                <td className="px-4 py-3 font-medium max-w-48 truncate">
                  {tx.merchant || "—"}
                </td>
                <td className="px-4 py-3 text-muted max-w-64 truncate">
                  {tx.description || "—"}
                </td>
                <td className="px-4 py-3">
                  <select
                    value={tx.category_id ?? ""}
                    onChange={(e) => handleCategoryChange(tx.id, e.target.value)}
                    className="rounded border border-border/50 px-2 py-1 text-xs focus:border-primary focus:outline-none bg-transparent"
                  >
                    <option value="">—</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </td>
                <td
                  className={`whitespace-nowrap px-4 py-3 text-right font-semibold ${
                    tx.is_income ? "text-income" : "text-expense"
                  }`}
                >
                  {tx.is_income ? "+" : "−"}
                  {fmt(Math.abs(tx.amount))} ₸
                </td>
                <td className="px-2 py-3">
                  <button
                    onClick={() => handleDeleteTransaction(tx.id)}
                    className="rounded p-1 text-muted hover:bg-red-50 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                    title="Удалить"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </td>
              </tr>
            ))}
            {transactions.length === 0 && (
              <tr>
                <td colSpan={7} className="py-12 text-center text-muted">
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
