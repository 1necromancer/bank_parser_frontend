"use client";

import { useCallback, useEffect, useState } from "react";
import { Wallet, Trash2 } from "lucide-react";
import { api } from "@/lib/api";
import type { Account } from "@/types";

export default function AccountsPage() {
  const [accounts, setAccounts] = useState<Account[]>([]);

  const load = useCallback(() => {
    api.getAccounts().then(setAccounts).catch(() => {});
  }, []);

  useEffect(() => { load(); }, [load]);

  async function handleDelete(id: number, name: string) {
    if (!confirm(`Удалить счёт «${name}»? Все транзакции и импорты этого счёта будут удалены.`)) return;
    try {
      await api.deleteAccount(id);
      setAccounts((prev) => prev.filter((a) => a.id !== id));
    } catch (e) {
      alert(e instanceof Error ? e.message : "Ошибка удаления");
    }
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Счета</h1>

      {accounts.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl bg-surface py-20 shadow-sm border border-border/50">
          <Wallet className="mb-4 h-12 w-12 text-muted" />
          <p className="text-muted">Счета появятся автоматически при импорте выписок</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {accounts.map((acc) => (
            <div
              key={acc.id}
              className="group rounded-xl bg-surface p-5 shadow-sm border border-border/50"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Wallet className="h-5 w-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold">{acc.name}</p>
                  <p className="text-xs text-muted">{acc.bank_name}</p>
                </div>
                <button
                  onClick={() => handleDelete(acc.id, acc.name)}
                  className="hidden group-hover:block rounded p-1.5 text-muted hover:bg-red-50 hover:text-red-500 transition-colors"
                  title="Удалить счёт"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
              <div className="mt-4 flex items-center justify-between text-sm">
                <span className="text-muted">Валюта</span>
                <span className="font-medium">{acc.currency}</span>
              </div>
              {acc.account_number && (
                <div className="mt-1 flex items-center justify-between text-sm">
                  <span className="text-muted">Счёт</span>
                  <span className="font-mono text-xs">{acc.account_number}</span>
                </div>
              )}
              <div className="mt-1 flex items-center justify-between text-sm">
                <span className="text-muted">Создан</span>
                <span className="text-muted">{new Date(acc.created_at).toLocaleDateString("ru-RU")}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
