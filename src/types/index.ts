export interface User {
  id: number;
  email: string;
  name?: string;
  is_active: boolean;
  is_admin: boolean;
}

export interface Account {
  id: number;
  name: string;
  bank_name: string;
  currency: string;
  account_number?: string;
  created_at: string;
}

export interface Transaction {
  id: number;
  account_id: number;
  category_id?: number;
  category_name?: string;
  date: string;
  amount: number;
  description?: string;
  merchant?: string;
  is_income: boolean;
  raw_data?: Record<string, string>;
  created_at: string;
}

export interface TransactionListResponse {
  transactions: Transaction[];
  total: number;
  page: number;
  per_page: number;
}

export interface Category {
  id: number;
  name: string;
  icon?: string;
  parent_id?: number;
}

export interface CategoryTree extends Category {
  children: CategoryTree[];
}

export interface Rule {
  id: number;
  keyword: string;
  category_id: number;
  category_name?: string;
}

export interface DashboardSummary {
  total_income: number;
  total_expense: number;
  net: number;
  transactions_count: number;
  period_from?: string;
  period_to?: string;
}

export interface CategoryBreakdown {
  category_id?: number;
  category_name: string;
  total: number;
  percentage: number;
  transactions_count: number;
}

export interface CashflowPoint {
  period: string;
  income: number;
  expense: number;
  net: number;
}

export interface CashflowResponse {
  points: CashflowPoint[];
  granularity: string;
}

export interface RecurringTransaction {
  merchant: string;
  average_amount: number;
  frequency_days: number;
  last_date: string;
  occurrences: number;
}

export interface ImportUploadResponse {
  import_id: number;
  bank: string;
  filename: string;
  created: number;
  replaced: number;
  account_id: number;
  date_from?: string;
  date_to?: string;
}
