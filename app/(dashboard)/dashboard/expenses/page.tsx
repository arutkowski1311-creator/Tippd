"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Plus, Filter, Download, X, ChevronDown, ChevronUp, Receipt } from "lucide-react";
import {
  EXPENSE_CATEGORIES,
  CATEGORY_LABELS,
  TAX_BUCKETS,
  TAX_BUCKET_LABELS,
  type Expense,
  type ExpenseCategory,
  type TaxBucket,
} from "@/types/expense";

interface Truck {
  id: string;
  name: string;
}

interface TaxReportData {
  period: string;
  total: number;
  by_tax_bucket: Record<string, { total: number; categories: Record<string, number> }>;
}

export default function ExpensesPage() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [trucks, setTrucks] = useState<Truck[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [filterCategory, setFilterCategory] = useState<ExpenseCategory | "">("");
  const [filterTaxBucket, setFilterTaxBucket] = useState<TaxBucket | "">("");
  const [filterStartDate, setFilterStartDate] = useState("");
  const [filterEndDate, setFilterEndDate] = useState("");
  const [showFilters, setShowFilters] = useState(false);

  // Detail view
  const [selectedExpense, setSelectedExpense] = useState<Expense | null>(null);

  // Tax report
  const [showTaxReport, setShowTaxReport] = useState(false);
  const [taxReport, setTaxReport] = useState<TaxReportData | null>(null);
  const [taxReportLoading, setTaxReportLoading] = useState(false);

  // View mode
  const [viewMode, setViewMode] = useState<"list" | "tax">("list");

  const truckName = useCallback(
    (id: string | null) => {
      if (!id) return null;
      const t = trucks.find((t) => t.id === id);
      return t?.name || null;
    },
    [trucks]
  );

  // Fetch expenses
  const fetchExpenses = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filterCategory) params.set("category", filterCategory);

      const res = await fetch(`/api/expenses?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setExpenses(Array.isArray(data) ? data : []);
      }
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, [filterCategory]);

  // Fetch trucks
  useEffect(() => {
    fetch("/api/trucks")
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) setTrucks(data);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    fetchExpenses();
  }, [fetchExpenses]);

  // Apply client-side filters
  const filteredExpenses = expenses.filter((e) => {
    if (filterTaxBucket && e.tax_bucket !== filterTaxBucket) return false;
    if (filterStartDate && e.date < filterStartDate) return false;
    if (filterEndDate && e.date > filterEndDate) return false;
    return true;
  });

  // Monthly totals for the current period
  const monthlyTotal = filteredExpenses.reduce((sum, e) => sum + Number(e.amount), 0);

  // Group by tax bucket for tax view
  const byTaxBucket = filteredExpenses.reduce(
    (acc, e) => {
      if (!acc[e.tax_bucket]) acc[e.tax_bucket] = { total: 0, expenses: [] };
      acc[e.tax_bucket].total += Number(e.amount);
      acc[e.tax_bucket].expenses.push(e);
      return acc;
    },
    {} as Record<string, { total: number; expenses: Expense[] }>
  );

  // Generate tax report
  async function handleExportTaxReport() {
    const start = filterStartDate || `${new Date().getFullYear()}-01-01`;
    const end = filterEndDate || new Date().toISOString().split("T")[0];

    setTaxReportLoading(true);
    try {
      const res = await fetch(
        `/api/expenses/tax-report?start_date=${start}&end_date=${end}`
      );
      if (res.ok) {
        const data = await res.json();
        setTaxReport(data);
        setShowTaxReport(true);
      }
    } catch {
      // silent
    } finally {
      setTaxReportLoading(false);
    }
  }

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Expenses</h1>
          <p className="text-sm text-tippd-smoke mt-1">
            {filteredExpenses.length} expenses &middot; ${monthlyTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
              showFilters ? "bg-tippd-blue/20 text-tippd-blue" : "bg-tippd-steel text-tippd-smoke hover:text-white"
            }`}
          >
            <Filter className="w-4 h-4" />
            Filters
          </button>
          <button
            onClick={handleExportTaxReport}
            disabled={taxReportLoading}
            className="flex items-center gap-1.5 px-3 py-2 bg-tippd-steel text-tippd-smoke hover:text-white rounded-md text-sm font-medium"
          >
            <Download className="w-4 h-4" />
            Tax Report
          </button>
          <Link
            href="/dashboard/expenses/new"
            className="flex items-center gap-2 px-4 py-2 bg-tippd-blue text-white rounded-md text-sm font-semibold hover:opacity-90"
          >
            <Plus className="w-4 h-4" /> Add Expense
          </Link>
        </div>
      </div>

      {/* Filters */}
      {showFilters && (
        <div className="rounded-lg border border-white/10 bg-tippd-charcoal p-4 mb-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div>
              <label className="block text-xs text-tippd-smoke mb-1">Category</label>
              <select
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value as ExpenseCategory | "")}
                className="w-full h-9 px-2 rounded-md bg-tippd-steel border border-white/10 text-white text-sm"
              >
                <option value="">All Categories</option>
                {EXPENSE_CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {CATEGORY_LABELS[cat]}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-tippd-smoke mb-1">Tax Bucket</label>
              <select
                value={filterTaxBucket}
                onChange={(e) => setFilterTaxBucket(e.target.value as TaxBucket | "")}
                className="w-full h-9 px-2 rounded-md bg-tippd-steel border border-white/10 text-white text-sm"
              >
                <option value="">All Buckets</option>
                {TAX_BUCKETS.map((b) => (
                  <option key={b} value={b}>
                    {TAX_BUCKET_LABELS[b]}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-tippd-smoke mb-1">From</label>
              <input
                type="date"
                value={filterStartDate}
                onChange={(e) => setFilterStartDate(e.target.value)}
                className="w-full h-9 px-2 rounded-md bg-tippd-steel border border-white/10 text-white text-sm"
              />
            </div>
            <div>
              <label className="block text-xs text-tippd-smoke mb-1">To</label>
              <input
                type="date"
                value={filterEndDate}
                onChange={(e) => setFilterEndDate(e.target.value)}
                className="w-full h-9 px-2 rounded-md bg-tippd-steel border border-white/10 text-white text-sm"
              />
            </div>
          </div>
          <div className="flex items-center gap-2 mt-3">
            <button
              onClick={() => {
                setFilterCategory("");
                setFilterTaxBucket("");
                setFilterStartDate("");
                setFilterEndDate("");
              }}
              className="text-xs text-tippd-smoke hover:text-white"
            >
              Clear all filters
            </button>
          </div>
        </div>
      )}

      {/* View Toggle */}
      <div className="flex gap-1 mb-4 bg-tippd-steel/50 rounded-lg p-1 w-fit">
        <button
          onClick={() => setViewMode("list")}
          className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
            viewMode === "list" ? "bg-tippd-charcoal text-white" : "text-tippd-smoke hover:text-white"
          }`}
        >
          List View
        </button>
        <button
          onClick={() => setViewMode("tax")}
          className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
            viewMode === "tax" ? "bg-tippd-charcoal text-white" : "text-tippd-smoke hover:text-white"
          }`}
        >
          Tax Buckets
        </button>
      </div>

      {loading ? (
        <div className="text-center py-12 text-tippd-smoke">Loading expenses...</div>
      ) : filteredExpenses.length === 0 ? (
        <div className="text-center py-12">
          <Receipt className="w-12 h-12 text-tippd-ash mx-auto mb-3" />
          <p className="text-tippd-smoke">No expenses found</p>
          <Link
            href="/dashboard/expenses/new"
            className="inline-block mt-3 text-sm text-tippd-blue hover:underline"
          >
            Add your first expense
          </Link>
        </div>
      ) : viewMode === "list" ? (
        /* List View */
        <div className="rounded-lg border border-white/10 overflow-hidden">
          <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-tippd-steel/50 text-left">
                <th className="px-4 py-3 text-xs sm:text-sm font-medium text-tippd-smoke uppercase whitespace-nowrap">Date</th>
                <th className="px-4 py-3 text-xs sm:text-sm font-medium text-tippd-smoke uppercase whitespace-nowrap">Category</th>
                <th className="px-4 py-3 text-xs sm:text-sm font-medium text-tippd-smoke uppercase whitespace-nowrap">Vendor</th>
                <th className="px-4 py-3 text-xs sm:text-sm font-medium text-tippd-smoke uppercase whitespace-nowrap hidden sm:table-cell">Tax Bucket</th>
                <th className="px-4 py-3 text-xs sm:text-sm font-medium text-tippd-smoke uppercase whitespace-nowrap hidden sm:table-cell">Truck</th>
                <th className="px-4 py-3 text-xs sm:text-sm font-medium text-tippd-smoke uppercase text-right whitespace-nowrap">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filteredExpenses.map((e) => (
                <tr
                  key={e.id}
                  className="hover:bg-white/5 cursor-pointer"
                  onClick={() => setSelectedExpense(e)}
                >
                  <td className="px-4 py-3 text-sm text-tippd-smoke whitespace-nowrap">
                    {new Date(e.date + "T00:00:00").toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                    })}
                  </td>
                  <td className="px-4 py-3">
                    <span className="px-2 py-0.5 bg-tippd-steel rounded text-xs text-tippd-smoke whitespace-nowrap">
                      {CATEGORY_LABELS[e.category] || e.category}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-white whitespace-nowrap">{e.vendor || "—"}</td>
                  <td className="px-4 py-3 hidden sm:table-cell">
                    <span className="text-xs text-tippd-ash whitespace-nowrap">
                      {TAX_BUCKET_LABELS[e.tax_bucket] || e.tax_bucket}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-tippd-smoke hidden sm:table-cell whitespace-nowrap">
                    {truckName(e.truck_id) || "—"}
                  </td>
                  <td className="px-4 py-3 text-sm text-white text-right font-medium whitespace-nowrap">
                    ${Number(e.amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        </div>
      ) : (
        /* Tax Bucket View */
        <div className="space-y-4">
          {TAX_BUCKETS.map((bucket) => {
            const group = byTaxBucket[bucket];
            if (!group) return null;
            return (
              <TaxBucketGroup
                key={bucket}
                label={TAX_BUCKET_LABELS[bucket]}
                total={group.total}
                expenses={group.expenses}
                truckName={truckName}
                onSelect={setSelectedExpense}
              />
            );
          })}
        </div>
      )}

      {/* Expense Detail Modal */}
      {selectedExpense && (
        <ExpenseDetailModal
          expense={selectedExpense}
          truckName={truckName(selectedExpense.truck_id)}
          onClose={() => setSelectedExpense(null)}
        />
      )}

      {/* Tax Report Modal */}
      {showTaxReport && taxReport && (
        <TaxReportModal report={taxReport} onClose={() => setShowTaxReport(false)} />
      )}
    </div>
  );
}

/* ---- Sub-components ---- */

function TaxBucketGroup({
  label,
  total,
  expenses,
  truckName,
  onSelect,
}: {
  label: string;
  total: number;
  expenses: Expense[];
  truckName: (id: string | null) => string | null;
  onSelect: (e: Expense) => void;
}) {
  const [open, setOpen] = useState(true);

  return (
    <div className="rounded-lg border border-white/10 overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-4 py-3 bg-tippd-steel/50 hover:bg-tippd-steel/70"
      >
        <div className="flex items-center gap-3">
          {open ? <ChevronUp className="w-4 h-4 text-tippd-ash" /> : <ChevronDown className="w-4 h-4 text-tippd-ash" />}
          <div className="text-left">
            <p className="text-sm font-medium text-white">{label}</p>
            <p className="text-xs text-tippd-smoke">{expenses.length} expenses</p>
          </div>
        </div>
        <span className="text-white font-semibold">
          ${total.toLocaleString(undefined, { minimumFractionDigits: 2 })}
        </span>
      </button>
      {open && (
        <div className="divide-y divide-white/5">
          {expenses.map((e) => (
            <div
              key={e.id}
              className="flex items-center justify-between px-4 py-2.5 hover:bg-white/5 cursor-pointer"
              onClick={() => onSelect(e)}
            >
              <div className="flex items-center gap-3">
                <span className="text-xs text-tippd-smoke w-16">
                  {new Date(e.date + "T00:00:00").toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                  })}
                </span>
                <span className="px-2 py-0.5 bg-tippd-steel rounded text-xs text-tippd-smoke">
                  {CATEGORY_LABELS[e.category] || e.category}
                </span>
                <span className="text-sm text-white">{e.vendor || "—"}</span>
                {truckName(e.truck_id) && (
                  <span className="text-xs text-tippd-ash">{truckName(e.truck_id)}</span>
                )}
              </div>
              <span className="text-sm text-white font-medium">
                ${Number(e.amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ExpenseDetailModal({
  expense,
  truckName,
  onClose,
}: {
  expense: Expense;
  truckName: string | null;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-tippd-charcoal border border-white/10 rounded-lg w-full max-w-md max-h-[80vh] overflow-y-auto">
        <div className="flex items-center justify-between p-4 border-b border-white/10">
          <h3 className="text-lg font-semibold text-white">Expense Detail</h3>
          <button onClick={onClose} className="text-tippd-ash hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-4 space-y-3">
          <div className="flex justify-between">
            <span className="text-sm text-tippd-smoke">Amount</span>
            <span className="text-lg font-bold text-white">
              ${Number(expense.amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm text-tippd-smoke">Date</span>
            <span className="text-sm text-white">
              {new Date(expense.date + "T00:00:00").toLocaleDateString("en-US", {
                month: "long",
                day: "numeric",
                year: "numeric",
              })}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm text-tippd-smoke">Vendor</span>
            <span className="text-sm text-white">{expense.vendor || "—"}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm text-tippd-smoke">Category</span>
            <span className="px-2 py-0.5 bg-tippd-steel rounded text-xs text-tippd-smoke">
              {CATEGORY_LABELS[expense.category] || expense.category}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm text-tippd-smoke">Tax Bucket</span>
            <span className="text-sm text-tippd-ash">
              {TAX_BUCKET_LABELS[expense.tax_bucket] || expense.tax_bucket}
            </span>
          </div>
          {truckName && (
            <div className="flex justify-between">
              <span className="text-sm text-tippd-smoke">Truck</span>
              <span className="text-sm text-white">{truckName}</span>
            </div>
          )}
          {expense.notes && (
            <div>
              <span className="text-sm text-tippd-smoke">Notes</span>
              <p className="text-sm text-white mt-1">{expense.notes}</p>
            </div>
          )}
          {expense.receipt_url && (
            <div>
              <span className="text-sm text-tippd-smoke block mb-2">Receipt</span>
              <img
                src={expense.receipt_url}
                alt="Receipt"
                className="w-full max-h-64 object-contain rounded-md bg-black/20"
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function TaxReportModal({
  report,
  onClose,
}: {
  report: TaxReportData;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-tippd-charcoal border border-white/10 rounded-lg w-full max-w-lg max-h-[80vh] overflow-y-auto">
        <div className="flex items-center justify-between p-4 border-b border-white/10">
          <div>
            <h3 className="text-lg font-semibold text-white">Tax Report</h3>
            <p className="text-xs text-tippd-smoke">{report.period}</p>
          </div>
          <button onClick={onClose} className="text-tippd-ash hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-4">
          <div className="flex justify-between items-center mb-4 pb-3 border-b border-white/10">
            <span className="text-sm font-medium text-tippd-smoke">Total Expenses</span>
            <span className="text-xl font-bold text-white">
              ${report.total.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </span>
          </div>

          <div className="space-y-4">
            {Object.entries(report.by_tax_bucket).map(([bucket, data]) => (
              <div key={bucket} className="rounded-md border border-white/5 p-3">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-medium text-white">
                    {TAX_BUCKET_LABELS[bucket as TaxBucket] || bucket}
                  </span>
                  <span className="text-sm font-bold text-white">
                    ${data.total.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="space-y-1">
                  {Object.entries(data.categories).map(([cat, amt]) => (
                    <div key={cat} className="flex justify-between text-xs">
                      <span className="text-tippd-smoke">
                        {CATEGORY_LABELS[cat as ExpenseCategory] || cat}
                      </span>
                      <span className="text-tippd-ash">
                        ${(amt as number).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <p className="text-xs text-tippd-ash mt-4 text-center">
            Maps to Schedule C line items. Consult your accountant for filing.
          </p>
        </div>
      </div>
    </div>
  );
}
