"use client";

import { useEffect, useState } from "react";
import { Wallet } from "lucide-react";
import { api } from "@/lib/api";
import type { Account } from "@/types";

export default function AccountsPage() {
  const [accounts, setAccounts] = useState<Account[]>([]);

  useEffect(() => {
    api.getAccounts().then(setAccounts).catch(() => {});
  }, []);

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
              className="rounded-xl bg-surface p-5 shadow-sm border border-border/50"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Wallet className="h-5 w-5" />
                </div>
                <div>
                  <p className="font-semibold">{acc.name}</p>
                  <p className="text-xs text-muted">{acc.bank_name}</p>
                </div>
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
