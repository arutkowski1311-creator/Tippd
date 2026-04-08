export const EXPENSE_CATEGORIES = [
  "fuel",
  "repair",
  "wages",
  "tolls",
  "utilities",
  "office",
  "insurance",
  "registration",
  "other",
] as const;
export type ExpenseCategory = (typeof EXPENSE_CATEGORIES)[number];

export const TAX_BUCKETS = ["COGS", "vehicle", "payroll", "SGA"] as const;
export type TaxBucket = (typeof TAX_BUCKETS)[number];

export const CATEGORY_TAX_BUCKET: Record<ExpenseCategory, TaxBucket> = {
  fuel: "vehicle",
  repair: "vehicle",
  wages: "payroll",
  tolls: "vehicle",
  utilities: "SGA",
  office: "SGA",
  insurance: "vehicle",
  registration: "vehicle",
  other: "SGA",
};

export const TAX_BUCKET_LABELS: Record<TaxBucket, string> = {
  COGS: "Cost of Goods Sold",
  vehicle: "Vehicle & Equipment",
  payroll: "Payroll & Labor",
  SGA: "Selling, General & Administrative",
};

export const CATEGORY_LABELS: Record<ExpenseCategory, string> = {
  fuel: "Fuel",
  repair: "Repairs & Maintenance",
  wages: "Wages & Labor",
  tolls: "Tolls & Fees",
  utilities: "Utilities",
  office: "Office Supplies",
  insurance: "Insurance",
  registration: "Registration & Licensing",
  other: "Other",
};

export interface Expense {
  id: string;
  operator_id: string;
  date: string;
  category: ExpenseCategory;
  tax_bucket: TaxBucket;
  amount: number;
  vendor: string | null;
  truck_id: string | null;
  job_id: string | null;
  receipt_url: string | null;
  ocr_raw: Record<string, unknown> | null;
  notes: string | null;
  created_by: string;
  created_at: string;
}
