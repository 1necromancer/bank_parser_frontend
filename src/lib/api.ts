import type {
  Account,
  Category,
  CategoryBreakdown,
  CategoryTree,
  CashflowResponse,
  DashboardSummary,
  ImportUploadResponse,
  RecurringTransaction,
  Rule,
  Transaction,
  TransactionListResponse,
  User,
} from "@/types";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8123";

class ApiClient {
  private token: string | null = null;
  private onUnauthorized: (() => void) | null = null;

  setToken(token: string | null) {
    this.token = token;
  }

  setOnUnauthorized(cb: () => void) {
    this.onUnauthorized = cb;
  }

  private async request<T>(
    path: string,
    options: RequestInit = {},
  ): Promise<T> {
    const headers: Record<string, string> = {};

    if (this.token) {
      headers["Authorization"] = `Bearer ${this.token}`;
    }

    if (
      !(options.body instanceof FormData) &&
      !(options.body instanceof URLSearchParams)
    ) {
      headers["Content-Type"] = "application/json";
    }

    const response = await fetch(`${API_URL}${path}`, {
      ...options,
      headers: { ...headers, ...(options.headers as Record<string, string>) },
    });

    if (response.status === 204) return undefined as T;

    if (response.status === 401) {
      this.onUnauthorized?.();
      throw new Error("Сессия истекла");
    }

    if (!response.ok) {
      const error = await response
        .json()
        .catch(() => ({ detail: "Unknown error" }));
      throw new Error(error.detail || `HTTP ${response.status}`);
    }

    return response.json();
  }

  // ---- Auth ----
  login(email: string, password: string) {
    const body = new URLSearchParams();
    body.append("username", email);
    body.append("password", password);
    return this.request<{ access_token: string; token_type: string }>(
      "/auth/token",
      {
        method: "POST",
        body,
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
      },
    );
  }

  register(email: string, password: string, name?: string) {
    return this.request<User>("/auth/register", {
      method: "POST",
      body: JSON.stringify({ email, password, name }),
    });
  }

  // ---- Dashboard ----
  getSummary(dateFrom?: string, dateTo?: string) {
    const p = new URLSearchParams();
    if (dateFrom) p.set("date_from", dateFrom);
    if (dateTo) p.set("date_to", dateTo);
    return this.request<DashboardSummary>(`/dashboard/summary?${p}`);
  }

  getCategoryBreakdown(dateFrom?: string, dateTo?: string) {
    const p = new URLSearchParams();
    if (dateFrom) p.set("date_from", dateFrom);
    if (dateTo) p.set("date_to", dateTo);
    return this.request<CategoryBreakdown[]>(`/dashboard/categories?${p}`);
  }

  getCashflow(
    granularity = "monthly",
    dateFrom?: string,
    dateTo?: string,
  ) {
    const p = new URLSearchParams({ granularity });
    if (dateFrom) p.set("date_from", dateFrom);
    if (dateTo) p.set("date_to", dateTo);
    return this.request<CashflowResponse>(`/dashboard/cashflow?${p}`);
  }

  getRecurring(minOccurrences = 3) {
    return this.request<RecurringTransaction[]>(
      `/dashboard/recurring?min_occurrences=${minOccurrences}`,
    );
  }

  // ---- Transactions ----
  getTransactions(params: Record<string, string> = {}) {
    return this.request<TransactionListResponse>(
      `/transactions?${new URLSearchParams(params)}`,
    );
  }

  updateTransaction(
    id: number,
    data: { category_id?: number; merchant?: string; description?: string },
  ) {
    return this.request<Transaction>(`/transactions/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    });
  }

  // ---- Import ----
  uploadPdf(file: File) {
    const fd = new FormData();
    fd.append("file", file);
    return this.request<ImportUploadResponse>("/import", {
      method: "POST",
      body: fd,
    });
  }

  // ---- Categories ----
  getCategories() {
    return this.request<Category[]>("/categories");
  }

  getCategoryTree() {
    return this.request<CategoryTree[]>("/categories/tree");
  }

  createCategory(data: { name: string; parent_id?: number; icon?: string }) {
    return this.request<Category>("/categories", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  // ---- Rules ----
  getRules() {
    return this.request<Rule[]>("/categories/rules");
  }

  createRule(data: { keyword: string; category_id: number }) {
    return this.request<Rule>("/categories/rules", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  deleteRule(id: number) {
    return this.request<void>(`/categories/rules/${id}`, {
      method: "DELETE",
    });
  }

  applyRules() {
    return this.request<{ updated: number }>("/categories/apply-rules", {
      method: "POST",
    });
  }

  deleteTransaction(id: number) {
    return this.request<void>(`/transactions/${id}`, { method: "DELETE" });
  }

  deleteTransactionsByRange(accountId: number, dateFrom: string, dateTo: string) {
    const p = new URLSearchParams({
      account_id: String(accountId),
      date_from: dateFrom,
      date_to: dateTo,
    });
    return this.request<{ deleted: number }>(`/transactions?${p}`, {
      method: "DELETE",
    });
  }

  // ---- Categories ----  (delete)
  deleteCategory(id: number) {
    return this.request<void>(`/categories/${id}`, { method: "DELETE" });
  }

  // ---- Accounts ----
  getAccounts() {
    return this.request<Account[]>("/accounts");
  }

  deleteAccount(id: number) {
    return this.request<void>(`/accounts/${id}`, { method: "DELETE" });
  }
}

export const api = new ApiClient();
