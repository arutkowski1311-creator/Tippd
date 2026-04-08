"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { ArrowLeft, Camera, Loader2, CheckCircle, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import {
  EXPENSE_CATEGORIES,
  CATEGORY_LABELS,
  TAX_BUCKETS,
  TAX_BUCKET_LABELS,
  CATEGORY_TAX_BUCKET,
  type ExpenseCategory,
  type TaxBucket,
} from "@/types/expense";

interface Truck {
  id: string;
  name: string;
}

interface OcrResult {
  vendor: string | null;
  amount: number | null;
  date: string | null;
  category: ExpenseCategory;
  tax_bucket: TaxBucket;
  confidence: number | null;
  receipt_url: string | null;
  ocr_raw: Record<string, unknown> | null;
  line_items: { description: string; amount: number }[] | null;
}

export default function NewExpensePage() {
  const supabase = createClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Form state
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState<ExpenseCategory>("fuel");
  const [taxBucket, setTaxBucket] = useState<TaxBucket>("vehicle");
  const [vendor, setVendor] = useState("");
  const [truckId, setTruckId] = useState("");
  const [notes, setNotes] = useState("");

  // Receipt state
  const [receiptPreview, setReceiptPreview] = useState<string | null>(null);
  const [receiptUrl, setReceiptUrl] = useState<string | null>(null);
  const [ocrRaw, setOcrRaw] = useState<Record<string, unknown> | null>(null);
  const [ocrLoading, setOcrLoading] = useState(false);
  const [ocrDone, setOcrDone] = useState(false);
  const [ocrError, setOcrError] = useState<string | null>(null);

  // Page state
  const [trucks, setTrucks] = useState<Truck[]>([]);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Fetch trucks
  useEffect(() => {
    fetch("/api/trucks")
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) setTrucks(data);
      })
      .catch(() => {});
  }, []);

  // Auto-set tax bucket when category changes
  useEffect(() => {
    setTaxBucket(CATEGORY_TAX_BUCKET[category]);
  }, [category]);

  async function handleReceiptUpload(file: File) {
    setOcrError(null);
    setOcrDone(false);

    // Show preview
    const reader = new FileReader();
    reader.onload = (e) => setReceiptPreview(e.target?.result as string);
    reader.readAsDataURL(file);

    // Send to OCR
    setOcrLoading(true);
    try {
      const formData = new FormData();
      formData.append("receipt", file);

      const res = await fetch("/api/expenses/receipt", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "OCR failed");
      }

      const result: OcrResult = await res.json();

      // Pre-fill form with OCR results
      if (result.vendor) setVendor(result.vendor);
      if (result.amount) setAmount(result.amount.toFixed(2));
      if (result.date) setDate(result.date);
      if (result.category) setCategory(result.category);
      if (result.tax_bucket) setTaxBucket(result.tax_bucket);
      if (result.receipt_url) setReceiptUrl(result.receipt_url);
      if (result.ocr_raw) setOcrRaw(result.ocr_raw);

      setOcrDone(true);
    } catch (err) {
      setOcrError(err instanceof Error ? err.message : "OCR processing failed");
    } finally {
      setOcrLoading(false);
    }
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) handleReceiptUpload(file);
  }

  async function handleSave() {
    setSaveError(null);

    if (!amount || parseFloat(amount) <= 0) {
      setSaveError("Amount is required");
      return;
    }

    setSaving(true);
    try {
      const body: Record<string, unknown> = {
        date,
        amount: parseFloat(amount),
        category,
        tax_bucket: taxBucket,
        vendor: vendor || undefined,
        truck_id: truckId || undefined,
        notes: notes || undefined,
        receipt_url: receiptUrl || undefined,
      };

      // If we have OCR raw data, save it via a separate update after creation
      const res = await fetch("/api/expenses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to save expense");
      }

      const expense = await res.json();

      // Update with OCR raw data if present
      if (ocrRaw && expense.id) {
        await supabase
          .from("expenses")
          .update({ ocr_raw: ocrRaw, receipt_url: receiptUrl })
          .eq("id", expense.id);
      }

      setSaved(true);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  if (saved) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <CheckCircle className="w-16 h-16 text-tippd-green mb-4" />
        <h2 className="text-xl font-bold text-white mb-2">Expense Saved</h2>
        <p className="text-tippd-smoke mb-6">
          ${parseFloat(amount).toFixed(2)} at {vendor || "Unknown vendor"}
        </p>
        <div className="flex gap-3">
          <Link
            href="/dashboard/expenses"
            className="px-4 py-2 bg-tippd-steel text-white rounded-md text-sm hover:bg-tippd-graphite"
          >
            View All Expenses
          </Link>
          <button
            onClick={() => {
              setSaved(false);
              setAmount("");
              setVendor("");
              setNotes("");
              setReceiptPreview(null);
              setReceiptUrl(null);
              setOcrRaw(null);
              setOcrDone(false);
              setDate(new Date().toISOString().split("T")[0]);
              setCategory("fuel");
              setTaxBucket("vehicle");
              setTruckId("");
            }}
            className="px-4 py-2 bg-tippd-blue text-white rounded-md text-sm hover:opacity-90"
          >
            Add Another
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <Link href="/dashboard/expenses" className="text-tippd-smoke hover:text-white">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <h1 className="text-2xl font-bold text-white">Add Expense</h1>
      </div>

      <div className="max-w-lg space-y-5">
        {/* Receipt Upload — Prominent */}
        <div className="rounded-lg border border-white/10 bg-tippd-charcoal p-5">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={handleFileChange}
          />

          {!receiptPreview && !ocrLoading && (
            <button
              onClick={() => fileInputRef.current?.click()}
              className="w-full py-8 rounded-lg border-2 border-dashed border-tippd-blue/40 bg-tippd-blue/5 hover:bg-tippd-blue/10 hover:border-tippd-blue/60 transition-all flex flex-col items-center gap-3"
            >
              <Camera className="w-10 h-10 text-tippd-blue" />
              <div>
                <p className="text-white font-semibold text-lg">Snap Receipt</p>
                <p className="text-tippd-smoke text-sm mt-1">
                  Take a photo or upload — AI reads it for you
                </p>
              </div>
            </button>
          )}

          {ocrLoading && (
            <div className="flex flex-col items-center py-8 gap-3">
              <Loader2 className="w-8 h-8 text-tippd-blue animate-spin" />
              <p className="text-white font-medium">Reading receipt...</p>
              <p className="text-tippd-smoke text-sm">AI is extracting vendor, amount, and date</p>
            </div>
          )}

          {receiptPreview && !ocrLoading && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {ocrDone && <CheckCircle className="w-4 h-4 text-tippd-green" />}
                  <span className="text-sm text-tippd-smoke">
                    {ocrDone ? "Receipt scanned — verify details below" : "Receipt uploaded"}
                  </span>
                </div>
                <button
                  onClick={() => {
                    setReceiptPreview(null);
                    setReceiptUrl(null);
                    setOcrDone(false);
                    setOcrRaw(null);
                  }}
                  className="text-tippd-ash hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <img
                src={receiptPreview}
                alt="Receipt"
                className="w-full max-h-48 object-contain rounded-md bg-black/20"
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                className="text-sm text-tippd-blue hover:underline"
              >
                Replace photo
              </button>
            </div>
          )}

          {ocrError && (
            <p className="text-red-400 text-sm mt-2">{ocrError}</p>
          )}
        </div>

        {/* Form Fields */}
        <div className="rounded-lg border border-white/10 bg-tippd-charcoal p-5 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-tippd-smoke mb-1">Date</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full h-10 px-3 rounded-md bg-tippd-steel border border-white/10 text-white text-sm"
              />
            </div>
            <div>
              <label className="block text-sm text-tippd-smoke mb-1">Amount ($)</label>
              <input
                type="number"
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                className="w-full h-10 px-3 rounded-md bg-tippd-steel border border-white/10 text-white text-sm"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-tippd-smoke mb-1">Category</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as ExpenseCategory)}
                className="w-full h-10 px-3 rounded-md bg-tippd-steel border border-white/10 text-white text-sm"
              >
                {EXPENSE_CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {CATEGORY_LABELS[cat]}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm text-tippd-smoke mb-1">Tax Bucket</label>
              <select
                value={taxBucket}
                onChange={(e) => setTaxBucket(e.target.value as TaxBucket)}
                className="w-full h-10 px-3 rounded-md bg-tippd-steel border border-white/10 text-white text-sm"
              >
                {TAX_BUCKETS.map((b) => (
                  <option key={b} value={b}>
                    {TAX_BUCKET_LABELS[b]}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm text-tippd-smoke mb-1">Vendor</label>
            <input
              value={vendor}
              onChange={(e) => setVendor(e.target.value)}
              placeholder="Business name"
              className="w-full h-10 px-3 rounded-md bg-tippd-steel border border-white/10 text-white text-sm"
            />
          </div>

          <div>
            <label className="block text-sm text-tippd-smoke mb-1">Truck</label>
            <select
              value={truckId}
              onChange={(e) => setTruckId(e.target.value)}
              className="w-full h-10 px-3 rounded-md bg-tippd-steel border border-white/10 text-white text-sm"
            >
              <option value="">None (general expense)</option>
              {trucks.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm text-tippd-smoke mb-1">Notes</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              placeholder="Optional notes..."
              className="w-full px-3 py-2 rounded-md bg-tippd-steel border border-white/10 text-white text-sm resize-none"
            />
          </div>

          {saveError && (
            <p className="text-red-400 text-sm">{saveError}</p>
          )}

          <button
            onClick={handleSave}
            disabled={saving}
            className="w-full py-2.5 bg-tippd-blue text-white rounded-md text-sm font-semibold hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" /> Saving...
              </>
            ) : (
              "Save Expense"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
