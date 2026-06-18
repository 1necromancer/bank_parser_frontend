"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { Wallet, Trash2, Pencil, Check, X } from "lucide-react";
import { api } from "@/lib/api";
import type { Account } from "@/types";

export default function AccountsPage() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editName, setEditName] = useState("");
  const [saving, setSaving] = useState(false);

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

  function startEdit(acc: Account) {
    setEditingId(acc.id);
    setEditName(acc.name);
  }

  function cancelEdit() {
    setEditingId(null);
    setEditName("");
  }

  async function saveEdit(e: FormEvent) {
    e.preventDefault();
    if (editingId == null) return;
    const name = editName.trim();
    if (!name || saving) return;
    setSaving(true);
    try {
      const updated = await api.updateAccount(editingId, { name });
      setAccounts((prev) => prev.map((a) => (a.id === updated.id ? updated : a)));
      cancelEdit();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Не удалось сохранить");
    } finally {
      setSaving(false);
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
          {accounts.map((acc) => {
            const isEditing = editingId === acc.id;
            return (
              <div
                key={acc.id}
                className="group rounded-xl bg-surface p-5 shadow-sm border border-border/50"
              >
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <Wallet className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    {isEditing ? (
                      <form onSubmit={saveEdit} className="flex items-center gap-1">
                        <input
                          autoFocus
                          type="text"
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Escape") cancelEdit();
                          }}
                          className="min-w-0 flex-1 rounded border border-border px-2 py-1 text-sm focus:border-primary focus:outline-none"
                        />
                        <button
                          type="submit"
                          disabled={!editName.trim() || saving}
                          className="rounded bg-primary p-1 text-white hover:bg-primary-hover disabled:opacity-40"
                          title="Сохранить"
                        >
                          <Check className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={cancelEdit}
                          className="rounded p-1 text-muted hover:bg-gray-100"
                          title="Отмена"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </form>
                    ) : (
                      <p className="truncate font-semibold">{acc.name}</p>
                    )}
                    <p className="text-xs text-muted">{acc.bank_name}</p>
                  </div>
                  {!isEditing && (
                    <div className="flex shrink-0 items-center gap-1 sm:opacity-0 sm:transition-opacity sm:group-hover:opacity-100">
                      <button
                        onClick={() => startEdit(acc)}
                        className="rounded p-1.5 text-muted hover:bg-gray-100 hover:text-foreground"
                        title="Переименовать"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(acc.id, acc.name)}
                        className="rounded p-1.5 text-muted hover:bg-red-50 hover:text-red-500"
                        title="Удалить счёт"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  )}
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
            );
          })}
        </div>
      )}
    </div>
  );
}
