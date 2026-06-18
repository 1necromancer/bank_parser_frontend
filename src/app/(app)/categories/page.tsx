"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { Plus, Trash2, Wand2, ChevronRight } from "lucide-react";
import { api } from "@/lib/api";
import type { Category, CategoryTree, Rule, RuleMatchType } from "@/types";

export default function CategoriesPage() {
  const [tree, setTree] = useState<CategoryTree[]>([]);
  const [flatCategories, setFlatCategories] = useState<Category[]>([]);
  const [rules, setRules] = useState<Rule[]>([]);
  const [newCatName, setNewCatName] = useState("");
  const [newCatParent, setNewCatParent] = useState("");
  const [newRuleKeyword, setNewRuleKeyword] = useState("");
  const [newRuleCatId, setNewRuleCatId] = useState("");
  const [newRuleMatch, setNewRuleMatch] = useState<RuleMatchType>("contains");
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
        match_type: newRuleMatch,
      });
      setNewRuleKeyword("");
      setNewRuleCatId("");
      setNewRuleMatch("contains");
      load();
    } catch { /* ignore */ }
  }

  async function handleDeleteCategory(id: number) {
    if (!confirm("Удалить категорию? Транзакции останутся без категории.")) return;
    try {
      await api.deleteCategory(id);
      load();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Ошибка удаления");
    }
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
              <TreeNode key={node.id} node={node} depth={0} onDelete={handleDeleteCategory} />
            ))}
            {tree.length === 0 && (
              <p className="py-4 text-center text-sm text-muted">Нет категорий</p>
            )}
          </div>

          <form
            onSubmit={handleCreateCategory}
            className="flex flex-col gap-2 border-t border-border pt-4 sm:flex-row sm:items-end"
          >
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
            <div className="sm:w-auto">
              <label className="mb-1 block text-xs text-muted">Родитель</label>
              <select
                value={newCatParent}
                onChange={(e) => setNewCatParent(e.target.value)}
                className="w-full rounded-lg border border-border px-3 py-1.5 text-sm focus:border-primary focus:outline-none sm:w-auto"
              >
                <option value="">Корень</option>
                {flatCategories.filter((c) => !c.parent_id).map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
            <button
              type="submit"
              className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-sm font-medium text-white hover:bg-primary-hover transition-colors sm:px-2"
            >
              <Plus className="h-4 w-4" />
              <span className="sm:hidden">Добавить</span>
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
            {rules.map((rule) => {
              const isExact = (rule.match_type ?? "contains") === "exact";
              return (
                <div
                  key={rule.id}
                  className="flex items-center justify-between gap-2 rounded-lg bg-gray-50 px-3 py-2"
                >
                  <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 text-sm">
                    <span
                      className={`rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase ${
                        isExact
                          ? "bg-amber-100 text-amber-700"
                          : "bg-blue-100 text-blue-700"
                      }`}
                      title={
                        isExact
                          ? "Точное совпадение"
                          : "Содержит подстроку"
                      }
                    >
                      {isExact ? "exact" : "contains"}
                    </span>
                    <span className="font-mono text-xs bg-gray-200 rounded px-1.5 py-0.5 max-w-[60vw] truncate">
                      {rule.keyword}
                    </span>
                    <span className="text-muted">→</span>
                    <span className="font-medium truncate">
                      {rule.category_name || `#${rule.category_id}`}
                    </span>
                  </div>
                  <button
                    onClick={() => handleDeleteRule(rule.id)}
                    className="shrink-0 rounded p-1 text-muted hover:bg-red-50 hover:text-red-500 transition-colors"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              );
            })}
            {rules.length === 0 && (
              <p className="py-4 text-center text-sm text-muted">Нет правил</p>
            )}
          </div>

          <form
            onSubmit={handleCreateRule}
            className="space-y-3 border-t border-border pt-4"
          >
            <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
              <div className="flex-1">
                <label className="mb-1 block text-xs text-muted">
                  Ключевое слово
                </label>
                <input
                  type="text"
                  value={newRuleKeyword}
                  onChange={(e) => setNewRuleKeyword(e.target.value)}
                  placeholder="kaspi gold"
                  className="w-full rounded-lg border border-border px-3 py-1.5 text-sm focus:border-primary focus:outline-none"
                />
              </div>
              <div className="sm:w-auto">
                <label className="mb-1 block text-xs text-muted">Категория</label>
                <select
                  value={newRuleCatId}
                  onChange={(e) => setNewRuleCatId(e.target.value)}
                  className="w-full rounded-lg border border-border px-3 py-1.5 text-sm focus:border-primary focus:outline-none sm:w-auto"
                >
                  <option value="">Выбрать</option>
                  {flatCategories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.parent_id ? "  " : ""}
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
              <button
                type="submit"
                className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-sm font-medium text-white hover:bg-primary-hover transition-colors sm:px-2"
              >
                <Plus className="h-4 w-4" />
                <span className="sm:hidden">Добавить правило</span>
              </button>
            </div>

            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span className="text-muted">Совпадение:</span>
              <div className="inline-flex overflow-hidden rounded-lg border border-border">
                <button
                  type="button"
                  onClick={() => setNewRuleMatch("contains")}
                  className={`px-2.5 py-1 transition-colors ${
                    newRuleMatch === "contains"
                      ? "bg-primary text-white"
                      : "bg-transparent text-muted hover:bg-gray-50"
                  }`}
                >
                  Содержит
                </button>
                <button
                  type="button"
                  onClick={() => setNewRuleMatch("exact")}
                  className={`px-2.5 py-1 transition-colors ${
                    newRuleMatch === "exact"
                      ? "bg-primary text-white"
                      : "bg-transparent text-muted hover:bg-gray-50"
                  }`}
                >
                  Точно
                </button>
              </div>
              <span className="text-muted">
                {newRuleMatch === "contains"
                  ? "— подстрока в получателе или описании"
                  : "— полное совпадение (без учёта регистра)"}
              </span>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

function TreeNode({ node, depth, onDelete }: { node: CategoryTree; depth: number; onDelete: (id: number) => void }) {
  const hasChildren = node.children && node.children.length > 0;
  return (
    <>
      <div
        className="group flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm hover:bg-gray-50 transition-colors"
        style={{ paddingLeft: `${12 + depth * 20}px` }}
      >
        {hasChildren ? (
          <ChevronRight className="h-3.5 w-3.5 text-muted rotate-90" />
        ) : (
          <span className="w-3.5" />
        )}
        <span className={`flex-1 truncate ${depth === 0 ? "font-medium" : "text-muted"}`}>{node.name}</span>
        <button
          onClick={() => onDelete(node.id)}
          className="block shrink-0 rounded p-1 text-muted hover:bg-red-50 hover:text-red-500 transition-colors sm:hidden sm:group-hover:block"
          title="Удалить категорию"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
      {hasChildren &&
        node.children.map((child) => (
          <TreeNode key={child.id} node={child} depth={depth + 1} onDelete={onDelete} />
        ))}
    </>
  );
}
