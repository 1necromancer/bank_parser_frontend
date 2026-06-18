"use client";

import {
  FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  Plus,
  Trash2,
  Wand2,
  ChevronRight,
  Pencil,
  Check,
  X,
  GripVertical,
  Home,
} from "lucide-react";
import { api } from "@/lib/api";
import type { Category, CategoryTree, Rule, RuleMatchType } from "@/types";

// Ключ DataTransfer для drag-and-drop категорий.
const DND_TYPE = "application/x-category-id";

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
  const [draggedId, setDraggedId] = useState<number | null>(null);

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

  // Множество id-потомков заданной категории (включая её саму).
  // Нужно для валидации dnd на клиенте — нельзя сделать категорию потомком
  // самой себя или собственного поддерева.
  const descendantsMap = useMemo(() => {
    const childrenOf = new Map<number | null, Category[]>();
    for (const c of flatCategories) {
      const k = c.parent_id ?? null;
      const arr = childrenOf.get(k) ?? [];
      arr.push(c);
      childrenOf.set(k, arr);
    }
    const out = new Map<number, Set<number>>();
    function collect(id: number): Set<number> {
      const cached = out.get(id);
      if (cached) return cached;
      const acc = new Set<number>([id]);
      for (const child of childrenOf.get(id) ?? []) {
        for (const d of collect(child.id)) acc.add(d);
      }
      out.set(id, acc);
      return acc;
    }
    for (const c of flatCategories) collect(c.id);
    return out;
  }, [flatCategories]);

  async function handleMoveCategory(
    categoryId: number,
    newParentId: number | null,
  ) {
    // Локальная защита от циклов до запроса на сервер.
    if (newParentId !== null) {
      const subtree = descendantsMap.get(categoryId);
      if (subtree?.has(newParentId)) return;
    }
    const current = flatCategories.find((c) => c.id === categoryId);
    if (current && (current.parent_id ?? null) === newParentId) return;
    try {
      await api.updateCategory(categoryId, { parent_id: newParentId });
      load();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Не удалось переместить");
    }
  }

  async function handleRenameCategory(id: number, name: string) {
    const trimmed = name.trim();
    if (!trimmed) return;
    try {
      await api.updateCategory(id, { name: trimmed });
      load();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Не удалось переименовать");
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

          <p className="mb-2 text-xs text-muted">
            Перетащите категорию на другую, чтобы сделать её дочерней, или в зону «В
            корень», чтобы убрать родителя.
          </p>

          <RootDropZone
            draggedId={draggedId}
            flatCategories={flatCategories}
            onDrop={(id) => handleMoveCategory(id, null)}
          />

          <div className="mb-5 space-y-1">
            {tree.map((node) => (
              <TreeNode
                key={node.id}
                node={node}
                depth={0}
                descendantsMap={descendantsMap}
                draggedId={draggedId}
                onDragStart={setDraggedId}
                onDragEnd={() => setDraggedId(null)}
                onDelete={handleDeleteCategory}
                onMove={handleMoveCategory}
                onRename={handleRenameCategory}
              />
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

function RootDropZone({
  draggedId,
  flatCategories,
  onDrop,
}: {
  draggedId: number | null;
  flatCategories: Category[];
  onDrop: (id: number) => void;
}) {
  const [hover, setHover] = useState(false);

  // Активна только если тащат корневую категорию (parent_id уже null) ИЛИ нет —
  // как раз для перевода в корень. Если у dragged уже null — дроп бесполезен.
  const draggedCat = draggedId
    ? flatCategories.find((c) => c.id === draggedId)
    : null;
  const isActive = Boolean(draggedId);
  const isUseful = Boolean(draggedCat && draggedCat.parent_id != null);

  function readId(e: React.DragEvent): number | null {
    const raw = e.dataTransfer.getData(DND_TYPE);
    if (!raw) return null;
    const n = Number(raw);
    return Number.isFinite(n) ? n : null;
  }

  return (
    <div
      onDragOver={(e) => {
        if (!e.dataTransfer.types.includes(DND_TYPE)) return;
        if (!isUseful) return;
        e.preventDefault();
        e.dataTransfer.dropEffect = "move";
        setHover(true);
      }}
      onDragLeave={() => setHover(false)}
      onDrop={(e) => {
        e.preventDefault();
        setHover(false);
        const id = readId(e);
        if (id != null) onDrop(id);
      }}
      className={`mb-2 flex items-center gap-2 rounded-lg border-2 border-dashed px-3 py-2 text-xs transition-colors ${
        hover
          ? "border-primary bg-primary/10 text-primary"
          : isActive && isUseful
            ? "border-primary/40 text-primary"
            : "border-border text-muted"
      }`}
    >
      <Home className="h-3.5 w-3.5" />
      В корень
    </div>
  );
}

function TreeNode({
  node,
  depth,
  descendantsMap,
  draggedId,
  onDragStart,
  onDragEnd,
  onDelete,
  onMove,
  onRename,
}: {
  node: CategoryTree;
  depth: number;
  descendantsMap: Map<number, Set<number>>;
  draggedId: number | null;
  onDragStart: (id: number) => void;
  onDragEnd: () => void;
  onDelete: (id: number) => void;
  onMove: (categoryId: number, newParentId: number | null) => void;
  onRename: (id: number, name: string) => void;
}) {
  const hasChildren = node.children && node.children.length > 0;
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState(node.name);
  const [dragOver, setDragOver] = useState(false);

  const isDragging = draggedId === node.id;
  // Можем ли мы принять текущую перетаскиваемую категорию.
  const canAcceptDragged =
    draggedId != null &&
    draggedId !== node.id &&
    !descendantsMap.get(draggedId)?.has(node.id);

  function readDraggedId(e: React.DragEvent): number | null {
    const raw = e.dataTransfer.getData(DND_TYPE);
    if (!raw) return null;
    const n = Number(raw);
    return Number.isFinite(n) ? n : null;
  }

  function handleSubmitRename(e: FormEvent) {
    e.preventDefault();
    onRename(node.id, editName);
    setEditing(false);
  }

  return (
    <>
      <div
        draggable={!editing}
        onDragStart={(e) => {
          e.dataTransfer.setData(DND_TYPE, String(node.id));
          e.dataTransfer.effectAllowed = "move";
          onDragStart(node.id);
        }}
        onDragEnd={() => {
          setDragOver(false);
          onDragEnd();
        }}
        onDragOver={(e) => {
          if (!e.dataTransfer.types.includes(DND_TYPE)) return;
          if (!canAcceptDragged) return;
          e.preventDefault();
          e.dataTransfer.dropEffect = "move";
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          const id = readDraggedId(e);
          if (id == null || !canAcceptDragged) return;
          onMove(id, node.id);
        }}
        className={`group flex items-center gap-1 rounded-lg px-2 py-1.5 text-sm transition-colors ${
          dragOver
            ? "bg-primary/10 ring-1 ring-primary/40"
            : isDragging
              ? "opacity-40"
              : draggedId != null && !canAcceptDragged && !isDragging
                ? "opacity-60"
                : "hover:bg-gray-50"
        }`}
        style={{ paddingLeft: `${8 + depth * 20}px` }}
      >
        <GripVertical
          className="hidden h-3.5 w-3.5 shrink-0 cursor-grab text-muted/60 sm:block"
          aria-hidden
        />
        {hasChildren ? (
          <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted rotate-90" />
        ) : (
          <span className="w-3.5 shrink-0" />
        )}

        {editing ? (
          <form
            onSubmit={handleSubmitRename}
            className="flex flex-1 items-center gap-1"
          >
            <input
              autoFocus
              type="text"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Escape") {
                  setEditing(false);
                  setEditName(node.name);
                }
              }}
              className="min-w-0 flex-1 rounded border border-border px-2 py-0.5 text-sm focus:border-primary focus:outline-none"
            />
            <button
              type="submit"
              disabled={!editName.trim()}
              className="rounded bg-primary p-1 text-white hover:bg-primary-hover disabled:opacity-40"
              title="Сохранить"
            >
              <Check className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={() => {
                setEditing(false);
                setEditName(node.name);
              }}
              className="rounded p-1 text-muted hover:bg-gray-100"
              title="Отмена"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </form>
        ) : (
          <span
            className={`flex-1 truncate ${
              depth === 0 ? "font-medium" : "text-muted"
            }`}
          >
            {node.name}
          </span>
        )}

        {!editing && (
          <div className="flex shrink-0 items-center gap-0.5 sm:opacity-0 sm:transition-opacity sm:group-hover:opacity-100">
            <button
              onClick={() => {
                setEditName(node.name);
                setEditing(true);
              }}
              className="rounded p-1 text-muted hover:bg-gray-100 hover:text-foreground"
              title="Переименовать"
            >
              <Pencil className="h-3.5 w-3.5" />
            </button>
            {node.parent_id != null && (
              <button
                onClick={() => onMove(node.id, null)}
                className="rounded p-1 text-muted hover:bg-gray-100 hover:text-foreground"
                title="В корень"
              >
                <Home className="h-3.5 w-3.5" />
              </button>
            )}
            <button
              onClick={() => onDelete(node.id)}
              className="rounded p-1 text-muted hover:bg-red-50 hover:text-red-500"
              title="Удалить категорию"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        )}
      </div>
      {hasChildren &&
        node.children.map((child) => (
          <TreeNode
            key={child.id}
            node={child}
            depth={depth + 1}
            descendantsMap={descendantsMap}
            draggedId={draggedId}
            onDragStart={onDragStart}
            onDragEnd={onDragEnd}
            onDelete={onDelete}
            onMove={onMove}
            onRename={onRename}
          />
        ))}
    </>
  );
}
