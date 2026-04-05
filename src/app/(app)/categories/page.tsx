"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { Plus, Trash2, Wand2, ChevronRight } from "lucide-react";
import { api } from "@/lib/api";
import type { Category, CategoryTree, Rule } from "@/types";

export default function CategoriesPage() {
  const [tree, setTree] = useState<CategoryTree[]>([]);
  const [flatCategories, setFlatCategories] = useState<Category[]>([]);
  const [rules, setRules] = useState<Rule[]>([]);
  const [newCatName, setNewCatName] = useState("");
  const [newCatParent, setNewCatParent] = useState("");
  const [newRuleKeyword, setNewRuleKeyword] = useState("");
  const [newRuleCatId, setNewRuleCatId] = useState("");
  const [applyResult, setApplyResult] = useState<number | null>(null);

  const load = useCallback(async () => {
    try {
      const [t, c, r] = await Promise.all([
        api.getCategoryTree(),
        api.getCategories(),
        api.getRules(),
      ]);
      setTree(t);
      setFlatCategories(c);
      setRules(r);
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function handleCreateCategory(e: FormEvent) {
    e.preventDefault();
    if (!newCatName.trim()) return;
    try {
      await api.createCategory({
        name: newCatName.trim(),
        parent_id: newCatParent ? Number(newCatParent) : undefined,
      });
      setNewCatName("");
      setNewCatParent("");
      load();
    } catch { /* ignore */ }
  }

  async function handleCreateRule(e: FormEvent) {
    e.preventDefault();
    if (!newRuleKeyword.trim() || !newRuleCatId) return;
    try {
      await api.createRule({
        keyword: newRuleKeyword.trim(),
        category_id: Number(newRuleCatId),
      });
      setNewRuleKeyword("");
      setNewRuleCatId("");
      load();
    } catch { /* ignore */ }
  }

  async function handleDeleteRule(id: number) {
    try {
      await api.deleteRule(id);
      setRules((prev) => prev.filter((r) => r.id !== id));
    } catch { /* ignore */ }
  }

  async function handleApplyRules() {
    try {
      const res = await api.applyRules();
      setApplyResult(res.updated);
      setTimeout(() => setApplyResult(null), 3000);
    } catch { /* ignore */ }
  }

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold">Категории и правила</h1>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Categories */}
        <div className="rounded-xl bg-surface p-5 shadow-sm border border-border/50">
          <h2 className="mb-4 text-sm font-semibold text-muted uppercase tracking-wider">
            Категории
          </h2>

          <div className="mb-5 space-y-1">
            {tree.map((node) => (
              <TreeNode key={node.id} node={node} depth={0} />
            ))}
            {tree.length === 0 && (
              <p className="py-4 text-center text-sm text-muted">Нет категорий</p>
            )}
          </div>

          <form onSubmit={handleCreateCategory} className="flex items-end gap-2 border-t border-border pt-4">
            <div className="flex-1">
              <label className="mb-1 block text-xs text-muted">Название</label>
              <input
                type="text"
                value={newCatName}
                onChange={(e) => setNewCatName(e.target.value)}
                placeholder="Новая категория"
                className="w-full rounded-lg border border-border px-3 py-1.5 text-sm focus:border-primary focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-muted">Родитель</label>
              <select
                value={newCatParent}
                onChange={(e) => setNewCatParent(e.target.value)}
                className="rounded-lg border border-border px-3 py-1.5 text-sm focus:border-primary focus:outline-none"
              >
                <option value="">Корень</option>
                {flatCategories.filter((c) => !c.parent_id).map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
            <button
              type="submit"
              className="rounded-lg bg-primary p-2 text-white hover:bg-primary-hover transition-colors"
            >
              <Plus className="h-4 w-4" />
            </button>
          </form>
        </div>

        {/* Rules */}
        <div className="rounded-xl bg-surface p-5 shadow-sm border border-border/50">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-muted uppercase tracking-wider">
              Правила автокатегоризации
            </h2>
            <button
              onClick={handleApplyRules}
              className="inline-flex items-center gap-1.5 rounded-lg bg-primary/10 px-3 py-1.5 text-xs font-medium text-primary hover:bg-primary/20 transition-colors"
            >
              <Wand2 className="h-3.5 w-3.5" />
              Применить
            </button>
          </div>

          {applyResult !== null && (
            <div className="mb-3 rounded-lg bg-green-50 px-3 py-2 text-sm text-green-700">
              Обновлено {applyResult} транзакций
            </div>
          )}

          <div className="mb-5 space-y-2">
            {rules.map((rule) => (
              <div key={rule.id} className="flex items-center justify-between rounded-lg bg-gray-50 px-3 py-2">
                <div className="text-sm">
                  <span className="font-mono text-xs bg-gray-200 rounded px-1.5 py-0.5">{rule.keyword}</span>
                  <span className="mx-2 text-muted">→</span>
                  <span className="font-medium">{rule.category_name || `#${rule.category_id}`}</span>
                </div>
                <button
                  onClick={() => handleDeleteRule(rule.id)}
                  className="rounded p-1 text-muted hover:bg-red-50 hover:text-red-500 transition-colors"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
            {rules.length === 0 && (
              <p className="py-4 text-center text-sm text-muted">Нет правил</p>
            )}
          </div>

          <form onSubmit={handleCreateRule} className="flex items-end gap-2 border-t border-border pt-4">
            <div className="flex-1">
              <label className="mb-1 block text-xs text-muted">Ключевое слово</label>
              <input
                type="text"
                value={newRuleKeyword}
                onChange={(e) => setNewRuleKeyword(e.target.value)}
                placeholder="kaspi gold"
                className="w-full rounded-lg border border-border px-3 py-1.5 text-sm focus:border-primary focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-muted">Категория</label>
              <select
                value={newRuleCatId}
                onChange={(e) => setNewRuleCatId(e.target.value)}
                className="rounded-lg border border-border px-3 py-1.5 text-sm focus:border-primary focus:outline-none"
              >
                <option value="">Выбрать</option>
                {flatCategories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.parent_id ? "  " : ""}{c.name}
                  </option>
                ))}
              </select>
            </div>
            <button
              type="submit"
              className="rounded-lg bg-primary p-2 text-white hover:bg-primary-hover transition-colors"
            >
              <Plus className="h-4 w-4" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

function TreeNode({ node, depth }: { node: CategoryTree; depth: number }) {
  const hasChildren = node.children && node.children.length > 0;
  return (
    <>
      <div
        className="flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm hover:bg-gray-50 transition-colors"
        style={{ paddingLeft: `${12 + depth * 20}px` }}
      >
        {hasChildren ? (
          <ChevronRight className="h-3.5 w-3.5 text-muted rotate-90" />
        ) : (
          <span className="w-3.5" />
        )}
        <span className={depth === 0 ? "font-medium" : "text-muted"}>{node.name}</span>
      </div>
      {hasChildren &&
        node.children.map((child) => (
          <TreeNode key={child.id} node={child} depth={depth + 1} />
        ))}
    </>
  );
}
