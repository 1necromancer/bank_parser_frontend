"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Trash2,
  Filter,
  X,
  Pencil,
  Check,
  Plus,
  TrendingUp,
  TrendingDown,
} from "lucide-react";
import { api } from "@/lib/api";
import type { Account, Category, Transaction } from "@/types";

interface TxTotals {
  total_income: number;
  total_expense: number;
  income_count: number;
  expense_count: number;
}

type Mode = "normal" | "edit" | "delete";

interface PendingEdit {
  category_id?: number | null;
}

function fmt(n: number) {
  return new Intl.NumberFormat("ru-RU", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
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
          className={`absolute z-20 mt-1 ${width} max-w-[calc(100vw-2rem)] rounded-lg border border-border bg-surface p-3 text-left shadow-lg ${
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

function CategoryPicker({
  value,
  categories,
  disabled,
  onChange,
  onCreate,
}: {
  value: number | null;
  categories: Category[];
  disabled: boolean;
  onChange: (id: number | null) => void;
  onCreate: (name: string) => Promise<Category>;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [saving, setSaving] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handle(e: MouseEvent) {
      if (!ref.current?.contains(e.target as Node)) {
        setOpen(false);
        setCreating(false);
        setNewName("");
        setQuery("");
      }
    }
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, [open]);

  const current = categories.find((c) => c.id === value);
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return categories;
    return categories.filter((c) => c.name.toLowerCase().includes(q));
  }, [categories, query]);

  function pick(id: number | null) {
    onChange(id);
    setOpen(false);
    setCreating(false);
    setNewName("");
    setQuery("");
  }

  async function handleCreate(e?: React.FormEvent) {
    e?.preventDefault();
    const name = newName.trim();
    if (!name || saving) return;
    setSaving(true);
    try {
      const created = await onCreate(name);
      pick(created.id);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Не удалось создать категорию");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div ref={ref} className="relative inline-block">
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((o) => !o)}
        className="min-w-[100px] rounded border border-border/50 bg-transparent px-2 py-1 text-left text-xs hover:bg-gray-50 focus:border-primary focus:outline-none disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-transparent"
      >
        {current ? current.name : <span className="text-muted">—</span>}
      </button>

      {open && (
        <div className="absolute left-0 top-full z-30 mt-1 w-64 max-w-[calc(100vw-2rem)] rounded-lg border border-border bg-surface shadow-lg">
          {creating ? (
            <form
              onSubmit={handleCreate}
              className="flex items-center gap-1 border-b border-border p-2"
            >
              <input
                autoFocus
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Название категории"
                className="flex-1 rounded border border-border px-2 py-1 text-sm focus:border-primary focus:outline-none"
              />
              <button
                type="submit"
                disabled={!newName.trim() || saving}
                className="rounded bg-primary p-1 text-white hover:bg-primary-hover disabled:opacity-40"
                title="Создать"
              >
                <Check className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={() => {
                  setCreating(false);
                  setNewName("");
                }}
                className="rounded p-1 text-muted hover:bg-gray-100"
                title="Отмена"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </form>
          ) : (
            <button
              type="button"
              onClick={() => setCreating(true)}
              className="flex w-full items-center gap-1.5 border-b border-border px-3 py-2 text-sm font-medium text-primary hover:bg-primary/5"
            >
              <Plus className="h-4 w-4" /> Новая категория
            </button>
          )}

          <div className="border-b border-border p-2">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Поиск..."
              className="w-full rounded border border-border px-2 py-1 text-sm focus:border-primary focus:outline-none"
            />
          </div>

          <div className="max-h-56 overflow-y-auto py-1">
            <button
              type="button"
              onClick={() => pick(null)}
              className={`flex w-full items-center px-3 py-1.5 text-left text-sm hover:bg-gray-50 ${
                value === null ? "font-semibold" : "text-muted"
              }`}
            >
              — без категории
            </button>
            {filtered.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => pick(c.id)}
                className={`flex w-full items-center justify-between gap-2 px-3 py-1.5 text-left text-sm hover:bg-gray-50 ${
                  value === c.id ? "font-semibold text-primary" : ""
                }`}
              >
                <span className="truncate">{c.name}</span>
                {value === c.id && <Check className="h-3.5 w-3.5 shrink-0" />}
              </button>
            ))}
            {filtered.length === 0 && (
              <p className="px-3 py-4 text-center text-xs text-muted">
                Нет совпадений
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function TransactionsPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [categories, setCategories] = useState<Category[]>([]);
  const [totals, setTotals] = useState<TxTotals | null>(null);
  const perPage = 30;

  const [accounts, setAccounts] = useState<Account[]>([]);

  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [bankFilter, setBankFilter] = useState<string[]>([]);
  const [merchantContains, setMerchantContains] = useState("");
  const [descriptionFilter, setDescriptionFilter] = useState<string[]>([]);
  const [categoryContains, setCategoryContains] = useState("");
  const [categoryUncategorized, setCategoryUncategorized] = useState(false);
  const [amountMin, setAmountMin] = useState("");
  const [amountMax, setAmountMax] = useState("");

  // Bulk-режимы
  const [mode, setMode] = useState<Mode>("normal");
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [pendingEdit, setPendingEdit] = useState<PendingEdit>({});

  const buildFilterParams = useCallback((): Record<string, string> => {
    const p: Record<string, string> = {};
    if (dateFrom) p.date_from = dateFrom;
    if (dateTo) p.date_to = dateTo;
    if (bankFilter.length) p.bank = bankFilter.join(",");
    if (merchantContains) p.merchant_contains = merchantContains;
    if (descriptionFilter.length) p.description_in = descriptionFilter.join(",");
    if (categoryUncategorized) {
      p.uncategorized = "true";
    } else if (categoryContains) {
      p.category_contains = categoryContains;
    }
    if (amountMin) p.amount_min = amountMin;
    if (amountMax) p.amount_max = amountMax;
    return p;
  }, [
    dateFrom,
    dateTo,
    bankFilter,
    merchantContains,
    descriptionFilter,
    categoryContains,
    categoryUncategorized,
    amountMin,
    amountMax,
  ]);

  const load = useCallback(async () => {
    const params: Record<string, string> = {
      page: String(page),
      per_page: String(perPage),
      ...buildFilterParams(),
    };

    try {
      const res = await api.getTransactions(params);
      setTransactions(res.transactions);
      setTotal(res.total);
    } catch {
      /* ignore */
    }
  }, [page, buildFilterParams]);

  useEffect(() => {
    load();
  }, [load]);

  // Тоталы зависят только от фильтров (не от страницы) — отдельный эффект,
  // чтобы не дёргать /totals при пагинации.
  useEffect(() => {
    let cancelled = false;
    api
      .getTransactionTotals(buildFilterParams())
      .then((t) => {
        if (!cancelled) setTotals(t);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [buildFilterParams]);

  useEffect(() => {
    api.getCategories().then(setCategories).catch(() => {});
    api.getAccounts().then(setAccounts).catch(() => {});
  }, []);

  // Сбрасываем страницу на 1 при любой смене фильтров.
  useEffect(() => {
    setPage(1);
  }, [
    dateFrom,
    dateTo,
    bankFilter,
    merchantContains,
    descriptionFilter,
    categoryContains,
    categoryUncategorized,
    amountMin,
    amountMax,
  ]);

  // При смене фильтров (но НЕ страницы) сбрасываем выбор и pending-правки.
  // Страница не сбрасывает выбор — иначе сломается «выделено все по фильтру»
  // при пролистывании страниц.
  useEffect(() => {
    setSelectedIds(new Set());
    setPendingEdit({});
  }, [
    dateFrom,
    dateTo,
    bankFilter,
    merchantContains,
    descriptionFilter,
    categoryContains,
    categoryUncategorized,
    amountMin,
    amountMax,
  ]);

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

  function exitBulkMode() {
    setMode("normal");
    setSelectedIds(new Set());
    setPendingEdit({});
  }

  function toggleRowSelected(id: number) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function togglePageSelected() {
    const pageIds = transactions.map((t) => t.id);
    setSelectedIds((prev) => {
      const allOnPageSelected = pageIds.every((id) => prev.has(id));
      const next = new Set(prev);
      if (allOnPageSelected) pageIds.forEach((id) => next.delete(id));
      else pageIds.forEach((id) => next.add(id));
      return next;
    });
  }

  async function handleSelectAllMatching() {
    try {
      const ids = await api.getTransactionIds(buildFilterParams());
      setSelectedIds(new Set(ids));
    } catch (e) {
      alert(e instanceof Error ? e.message : "Не удалось выделить все");
    }
  }

  async function handleCreateCategory(name: string): Promise<Category> {
    const created = await api.createCategory({ name });
    setCategories((prev) =>
      [...prev, created].sort((a, b) => a.name.localeCompare(b.name, "ru")),
    );
    return created;
  }

  async function handleCategoryChange(txId: number, newCatId: string) {
    // В edit-режиме изменение распространяется на ВСЕ выделенные строки
    // и применится только при «Сохранить».
    if (mode === "edit") {
      if (!selectedIds.has(txId)) return;
      const parsed = newCatId ? Number(newCatId) : null;
      setPendingEdit((prev) => ({ ...prev, category_id: parsed }));
      return;
    }
    // Normal mode — мгновенное inline-сохранение
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

  async function handleBulkDelete() {
    if (selectedIds.size === 0) {
      exitBulkMode();
      return;
    }
    if (!confirm(`Удалить ${selectedIds.size} транзакций?`)) return;
    try {
      await api.bulkDeleteTransactions([...selectedIds]);
      exitBulkMode();
      load();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Ошибка удаления");
    }
  }

  async function handleSaveEdits() {
    if (selectedIds.size === 0 || Object.keys(pendingEdit).length === 0) {
      exitBulkMode();
      return;
    }
    try {
      await api.bulkUpdateTransactions([...selectedIds], pendingEdit);
      exitBulkMode();
      load();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Ошибка сохранения");
    }
  }

  const totalPages = Math.ceil(total / perPage);

  const dateActive = Boolean(dateFrom || dateTo);
  const bankActive = bankFilter.length > 0;
  const merchantActive = Boolean(merchantContains);
  const descriptionActive = descriptionFilter.length > 0;
  const categoryActive = Boolean(categoryContains) || categoryUncategorized;
  const amountActive = Boolean(amountMin || amountMax);
  const anyFilterActive =
    dateActive ||
    bankActive ||
    merchantActive ||
    descriptionActive ||
    categoryActive ||
    amountActive;

  function resetAllFilters() {
    setDateFrom("");
    setDateTo("");
    setBankFilter([]);
    setMerchantContains("");
    setDescriptionFilter([]);
    setCategoryContains("");
    setCategoryUncategorized(false);
    setAmountMin("");
    setAmountMax("");
  }

  const showSelectColumn = mode !== "normal";
  const pageIds = transactions.map((t) => t.id);
  const allOnPageSelected =
    pageIds.length > 0 && pageIds.every((id) => selectedIds.has(id));
  const someOnPageSelected =
    !allOnPageSelected && pageIds.some((id) => selectedIds.has(id));
  const colSpan = 7 + (showSelectColumn ? 1 : 0);

  // Баннер «выделить всё по фильтру» — показываем только если фильтр выдал
  // больше, чем помещается на одной странице.
  const allMatchingSelected = total > 0 && selectedIds.size >= total;
  const showExpandPrompt =
    showSelectColumn &&
    !allMatchingSelected &&
    allOnPageSelected &&
    total > pageIds.length;
  const showBanner = showSelectColumn && (allMatchingSelected || showExpandPrompt);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-bold">Транзакции</h1>
          {anyFilterActive && (
            <button
              type="button"
              onClick={resetAllFilters}
              className="inline-flex items-center gap-1.5 rounded-lg border border-primary/30 bg-primary/5 px-2.5 py-1 text-xs font-medium text-primary hover:bg-primary/10 transition-colors"
            >
              <X className="h-3.5 w-3.5" />
              Сбросить все фильтры
            </button>
          )}
        </div>

        {/* Toolbar */}
        <div className="flex flex-wrap items-center gap-2">
          {mode === "normal" && (
            <>
              <button
                type="button"
                onClick={() => setMode("edit")}
                className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-sm font-medium hover:bg-gray-50 transition-colors"
              >
                <Pencil className="h-4 w-4" />
                Изменить
              </button>
              <button
                type="button"
                onClick={() => setMode("delete")}
                className="inline-flex items-center gap-1.5 rounded-lg border border-red-300 bg-red-50 px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-100 transition-colors"
              >
                <Trash2 className="h-4 w-4" />
                Удалить
              </button>
            </>
          )}

          {mode === "edit" && (
            <>
              <span className="text-sm text-muted">
                Выделено: {selectedIds.size}
                {Object.keys(pendingEdit).length > 0 && " · есть изменения"}
              </span>
              <button
                type="button"
                onClick={handleSaveEdits}
                disabled={
                  selectedIds.size === 0 || Object.keys(pendingEdit).length === 0
                }
                className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-sm font-medium text-white hover:bg-primary-hover disabled:opacity-40 transition-colors"
              >
                <Check className="h-4 w-4" />
                Сохранить ({selectedIds.size})
              </button>
              <button
                type="button"
                onClick={exitBulkMode}
                className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-sm font-medium hover:bg-gray-50 transition-colors"
              >
                <X className="h-4 w-4" />
                Отмена
              </button>
            </>
          )}

          {mode === "delete" && (
            <>
              <span className="text-sm text-muted">
                Выделено: {selectedIds.size}
              </span>
              <button
                type="button"
                onClick={handleBulkDelete}
                disabled={selectedIds.size === 0}
                className="inline-flex items-center gap-1.5 rounded-lg bg-red-500 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-600 disabled:opacity-40 transition-colors"
              >
                <Trash2 className="h-4 w-4" />
                Удалить ({selectedIds.size})
              </button>
              <button
                type="button"
                onClick={exitBulkMode}
                className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-sm font-medium hover:bg-gray-50 transition-colors"
              >
                <X className="h-4 w-4" />
                Отмена
              </button>
            </>
          )}
        </div>
      </div>

      {/* Bulk-select banner */}
      {showBanner && (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-primary/30 bg-primary/5 px-4 py-2 text-sm">
          {allMatchingSelected ? (
            <>
              <span>
                Выделено все <b>{total}</b> транзакций по фильтру
              </span>
              <button
                type="button"
                onClick={() => setSelectedIds(new Set())}
                className="text-primary font-medium hover:underline"
              >
                Очистить выделение
              </button>
            </>
          ) : (
            <>
              <span>
                Выделено <b>{selectedIds.size}</b> на странице
              </span>
              <button
                type="button"
                onClick={handleSelectAllMatching}
                className="text-primary font-medium hover:underline"
              >
                Выделить все {total} по фильтру
              </button>
            </>
          )}
        </div>
      )}

      {/* Totals — компактная строка, прижата к правому краю над колонкой «Сумма» */}
      <div className="flex flex-wrap justify-end gap-x-5 gap-y-1 text-sm">
        <span className="inline-flex items-center gap-1.5">
          <TrendingUp className="h-3.5 w-3.5 text-income" />
          <span className="font-semibold text-income tabular-nums">
            +{fmt(totals?.total_income ?? 0)} ₸
          </span>
          <span className="text-xs text-muted">
            · {totals?.income_count ?? 0}
          </span>
        </span>
        <span className="inline-flex items-center gap-1.5">
          <TrendingDown className="h-3.5 w-3.5 text-expense" />
          <span className="font-semibold text-expense tabular-nums">
            −{fmt(totals?.total_expense ?? 0)} ₸
          </span>
          <span className="text-xs text-muted">
            · {totals?.expense_count ?? 0}
          </span>
        </span>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-xl bg-surface shadow-sm border border-border/50">
        <table className="w-full min-w-[860px] text-sm">
          <thead>
            <tr className="border-b border-border text-left">
              {showSelectColumn && (
                <th className="w-10 px-4 py-3">
                  <input
                    type="checkbox"
                    checked={allOnPageSelected}
                    ref={(el) => {
                      if (el) el.indeterminate = someOnPageSelected;
                    }}
                    onChange={togglePageSelected}
                    aria-label="Выделить всё на странице"
                  />
                </th>
              )}
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
                                setDescriptionFilter((arr) =>
                                  toggleInArray(arr, d),
                                )
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
                      <label className="flex cursor-pointer items-center gap-2 rounded border border-border bg-gray-50 px-2 py-1.5 text-sm">
                        <input
                          type="checkbox"
                          checked={categoryUncategorized}
                          onChange={(e) => {
                            setCategoryUncategorized(e.target.checked);
                            if (e.target.checked) setCategoryContains("");
                          }}
                        />
                        <span>Без категории</span>
                      </label>
                      <input
                        type="text"
                        value={categoryContains}
                        onChange={(e) => setCategoryContains(e.target.value)}
                        placeholder="Содержит..."
                        disabled={categoryUncategorized}
                        className="w-full rounded-lg border border-border px-2 py-1 text-sm focus:border-primary focus:outline-none disabled:bg-gray-50 disabled:text-muted"
                      />
                      {categoryActive && (
                        <ResetButton
                          onClick={() => {
                            setCategoryContains("");
                            setCategoryUncategorized(false);
                          }}
                        />
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

              {mode === "normal" && <th className="w-10 px-4 py-3"></th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-border/50">
            {transactions.map((tx) => {
              const isSelected = selectedIds.has(tx.id);
              // В edit-режиме для выделенных строк показываем pending-значение категории
              const categoryCellValue: number | null =
                mode === "edit" && isSelected && "category_id" in pendingEdit
                  ? pendingEdit.category_id ?? null
                  : tx.category_id ?? null;
              const categoryDisabled =
                mode === "delete" || (mode === "edit" && !isSelected);

              return (
                <tr
                  key={tx.id}
                  className={`group transition-colors ${
                    isSelected ? "bg-primary/5" : "hover:bg-gray-50/50"
                  }`}
                >
                  {showSelectColumn && (
                    <td className="w-10 px-4 py-3">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleRowSelected(tx.id)}
                        aria-label={`Выделить транзакцию #${tx.id}`}
                      />
                    </td>
                  )}
                  <td className="whitespace-nowrap px-4 py-3 text-muted">
                    {tx.date}
                  </td>
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
                    <CategoryPicker
                      value={categoryCellValue}
                      categories={categories}
                      disabled={categoryDisabled}
                      onChange={(id) =>
                        handleCategoryChange(tx.id, id !== null ? String(id) : "")
                      }
                      onCreate={handleCreateCategory}
                    />
                  </td>
                  <td
                    className={`whitespace-nowrap px-4 py-3 text-right font-semibold ${
                      tx.is_income ? "text-income" : "text-expense"
                    }`}
                  >
                    {tx.is_income ? "+" : "−"}
                    {fmt(Math.abs(tx.amount))} ₸
                  </td>
                  {mode === "normal" && (
                    <td className="px-2 py-3">
                      <button
                        onClick={() => handleDeleteTransaction(tx.id)}
                        className="rounded p-1 text-muted hover:bg-red-50 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                        title="Удалить"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </td>
                  )}
                </tr>
              );
            })}
            {transactions.length === 0 && (
              <tr>
                <td colSpan={colSpan} className="py-12 text-center text-muted">
                  Нет транзакций
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex flex-col items-stretch gap-3 text-sm sm:flex-row sm:items-center sm:justify-between">
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
