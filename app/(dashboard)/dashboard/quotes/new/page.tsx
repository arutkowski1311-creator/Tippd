"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Plus, Trash2, Eye, Save, Send } from "lucide-react";
const DEFAULT_TERMS = `Payment is due upon approval of this estimate. Prices are valid for 7 days from the date shown above. Disposal fees for prohibited materials (hazmat, tires, paint, batteries) are not included and will be charged at cost if found. Dumpster must be accessible for delivery and pickup. Customer is responsible for any damage to property during placement. Overweight charges apply at $150/ton over the included weight allowance.`;

interface LineItem {
  id: string;
  description: string;
  qty: number;
  unit_price: number;
}

function uid() {
  return Math.random().toString(36).slice(2, 10);
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(amount);
}

export default function NewQuotePage() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);

  // Customer
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");

  // Line items
  const [lineItems, setLineItems] = useState<LineItem[]>([
    { id: uid(), description: "20yd Dumpster — 7 day rental", qty: 1, unit_price: 400 },
  ]);

  // Discount
  const [discountType, setDiscountType] = useState<"flat" | "percent">("flat");
  const [discountValue, setDiscountValue] = useState(0);

  // Other
  const [depositPercent, setDepositPercent] = useState(0);
  const [terms, setTerms] = useState(DEFAULT_TERMS);
  const [internalNotes, setInternalNotes] = useState("");

  // Preview toggle
  const [showPreview, setShowPreview] = useState(false);

  // Computed totals
  const subtotal = useMemo(
    () => lineItems.reduce((sum, item) => sum + item.qty * item.unit_price, 0),
    [lineItems]
  );

  const discountAmount = useMemo(() => {
    if (discountValue <= 0) return 0;
    return discountType === "percent"
      ? (subtotal * discountValue) / 100
      : discountValue;
  }, [subtotal, discountType, discountValue]);

  const total = Math.max(0, subtotal - discountAmount);
  const depositAmount = depositPercent > 0 ? (total * depositPercent) / 100 : 0;

  // Line item management
  function addLineItem() {
    setLineItems((prev) => [
      ...prev,
      { id: uid(), description: "", qty: 1, unit_price: 0 },
    ]);
  }

  function removeLineItem(id: string) {
    setLineItems((prev) => prev.filter((item) => item.id !== id));
  }

  function updateLineItem(id: string, field: keyof LineItem, value: string | number) {
    setLineItems((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, [field]: value } : item
      )
    );
  }

  // Save
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async function handleSave(sendToCustomer: boolean) {
    if (!customerName.trim() || !customerPhone.trim()) {
      alert("Customer name and phone are required.");
      return;
    }
    if (lineItems.length === 0 || lineItems.every((li) => li.qty === 0)) {
      alert("Add at least one line item.");
      return;
    }

    setSaving(true);
    try {
      const payload = {
        customer_name: customerName.trim(),
        customer_phone: customerPhone.trim(),
        customer_email: customerEmail.trim() || undefined,
        line_items: lineItems.map((li) => ({
          description: li.description,
          qty: li.qty,
          unit_price: li.unit_price,
          total: li.qty * li.unit_price,
        })),
        discount_type: discountValue > 0 ? discountType : undefined,
        discount_value: discountValue,
        deposit_percent: depositPercent,
        subtotal,
        total,
        terms: terms.trim() || undefined,
        internal_notes: internalNotes.trim() || undefined,
      };

      const res = await fetch("/api/quotes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const err = await res.json();
        alert(err.error || "Failed to create quote");
        return;
      }

      const quote = await res.json();
      router.push(`/dashboard/quotes/${quote.id}`);
    } catch (e) {
      console.error(e);
      alert("Network error creating quote");
    } finally {
      setSaving(false);
    }
  }

  // Input class helper
  const inputCls =
    "w-full h-10 px-3 rounded-md bg-tippd-steel border border-white/10 text-white text-sm placeholder:text-tippd-ash focus:outline-none focus:border-tippd-blue";

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard/quotes"
            className="text-tippd-smoke hover:text-white"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <h1 className="text-2xl font-bold text-white">New Quote</h1>
        </div>
        <button
          onClick={() => setShowPreview(!showPreview)}
          className="flex items-center gap-2 px-3 py-2 rounded-md border border-white/10 text-sm text-tippd-smoke hover:text-white hover:border-white/20"
        >
          <Eye className="w-4 h-4" />
          {showPreview ? "Edit" : "Preview"}
        </button>
      </div>

      <div className={`grid gap-6 ${showPreview ? "grid-cols-2" : "grid-cols-1 max-w-2xl"}`}>
        {/* Form */}
        <div className="rounded-lg border border-white/10 bg-tippd-charcoal p-6 space-y-5">
          {/* Customer Info */}
          <div>
            <h2 className="text-sm font-semibold text-white mb-3 uppercase tracking-wide">
              Customer Information
            </h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-tippd-smoke mb-1">
                  Customer Name *
                </label>
                <input
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="John Martinez"
                  className={inputCls}
                />
              </div>
              <div>
                <label className="block text-xs text-tippd-smoke mb-1">
                  Phone *
                </label>
                <input
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  placeholder="(908) 555-1234"
                  className={inputCls}
                />
              </div>
            </div>
            <div className="mt-3">
              <label className="block text-xs text-tippd-smoke mb-1">
                Email
              </label>
              <input
                type="email"
                value={customerEmail}
                onChange={(e) => setCustomerEmail(e.target.value)}
                placeholder="john@example.com"
                className={inputCls}
              />
            </div>
          </div>

          {/* Line Items */}
          <div>
            <h2 className="text-sm font-semibold text-white mb-3 uppercase tracking-wide">
              Line Items
            </h2>
            <div className="space-y-2">
              {/* Column headers */}
              <div className="grid grid-cols-12 gap-2 text-xs text-tippd-ash px-1">
                <span className="col-span-5">Description</span>
                <span className="col-span-2">Qty</span>
                <span className="col-span-2">Unit Price</span>
                <span className="col-span-2">Total</span>
                <span className="col-span-1"></span>
              </div>
              {lineItems.map((item) => (
                <div key={item.id} className="grid grid-cols-12 gap-2 items-center">
                  <input
                    value={item.description}
                    onChange={(e) =>
                      updateLineItem(item.id, "description", e.target.value)
                    }
                    placeholder="Dumpster rental..."
                    className="col-span-5 h-9 px-2 rounded bg-tippd-steel border border-white/10 text-white text-sm focus:outline-none focus:border-tippd-blue"
                  />
                  <input
                    type="number"
                    min="1"
                    value={item.qty}
                    onChange={(e) =>
                      updateLineItem(item.id, "qty", parseInt(e.target.value) || 0)
                    }
                    className="col-span-2 h-9 px-2 rounded bg-tippd-steel border border-white/10 text-white text-sm focus:outline-none focus:border-tippd-blue"
                  />
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={item.unit_price}
                    onChange={(e) =>
                      updateLineItem(
                        item.id,
                        "unit_price",
                        parseFloat(e.target.value) || 0
                      )
                    }
                    className="col-span-2 h-9 px-2 rounded bg-tippd-steel border border-white/10 text-white text-sm focus:outline-none focus:border-tippd-blue"
                  />
                  <span className="col-span-2 h-9 flex items-center text-sm text-white font-medium">
                    {formatCurrency(item.qty * item.unit_price)}
                  </span>
                  <button
                    onClick={() => removeLineItem(item.id)}
                    className="col-span-1 h-9 flex items-center justify-center text-tippd-ash hover:text-red-400"
                    title="Remove"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
            <button
              onClick={addLineItem}
              className="mt-3 flex items-center gap-1 text-xs text-tippd-blue hover:underline"
            >
              <Plus className="w-3 h-3" /> Add line item
            </button>
          </div>

          {/* Discount & Deposit */}
          <div>
            <h2 className="text-sm font-semibold text-white mb-3 uppercase tracking-wide">
              Pricing
            </h2>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-xs text-tippd-smoke mb-1">
                  Discount Type
                </label>
                <select
                  value={discountType}
                  onChange={(e) =>
                    setDiscountType(e.target.value as "flat" | "percent")
                  }
                  className="w-full h-10 px-3 rounded-md bg-tippd-steel border border-white/10 text-white text-sm focus:outline-none focus:border-tippd-blue"
                >
                  <option value="flat">Flat ($)</option>
                  <option value="percent">Percent (%)</option>
                </select>
              </div>
              <div>
                <label className="block text-xs text-tippd-smoke mb-1">
                  Discount Value
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={discountValue}
                  onChange={(e) =>
                    setDiscountValue(parseFloat(e.target.value) || 0)
                  }
                  className={inputCls}
                />
              </div>
              <div>
                <label className="block text-xs text-tippd-smoke mb-1">
                  Deposit %
                </label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={depositPercent}
                  onChange={(e) =>
                    setDepositPercent(parseInt(e.target.value) || 0)
                  }
                  className={inputCls}
                />
              </div>
            </div>
          </div>

          {/* Totals Summary */}
          <div className="border-t border-white/10 pt-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-tippd-smoke">Subtotal</span>
              <span className="text-white">{formatCurrency(subtotal)}</span>
            </div>
            {discountAmount > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-tippd-smoke">
                  Discount{" "}
                  {discountType === "percent" ? `(${discountValue}%)` : ""}
                </span>
                <span className="text-red-400">
                  -{formatCurrency(discountAmount)}
                </span>
              </div>
            )}
            <div className="flex justify-between text-lg font-bold">
              <span className="text-white">Total</span>
              <span className="text-white">{formatCurrency(total)}</span>
            </div>
            {depositPercent > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-tippd-smoke">
                  Deposit Required ({depositPercent}%)
                </span>
                <span className="text-amber-400">
                  {formatCurrency(depositAmount)}
                </span>
              </div>
            )}
          </div>

          {/* Terms */}
          <div>
            <label className="block text-xs text-tippd-smoke mb-1">
              Terms &amp; Conditions
            </label>
            <textarea
              rows={4}
              value={terms}
              onChange={(e) => setTerms(e.target.value)}
              className="w-full px-3 py-2 rounded-md bg-tippd-steel border border-white/10 text-white text-sm resize-none focus:outline-none focus:border-tippd-blue"
            />
          </div>

          {/* Internal Notes */}
          <div>
            <label className="block text-xs text-tippd-smoke mb-1">
              Internal Notes (not shown to customer)
            </label>
            <textarea
              rows={2}
              value={internalNotes}
              onChange={(e) => setInternalNotes(e.target.value)}
              placeholder="Job site notes, special instructions..."
              className="w-full px-3 py-2 rounded-md bg-tippd-steel border border-white/10 text-white text-sm resize-none focus:outline-none focus:border-tippd-blue"
            />
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button
              onClick={() => handleSave(false)}
              disabled={saving}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 border border-white/10 text-white rounded-md text-sm font-semibold hover:bg-white/5 disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              {saving ? "Saving..." : "Save as Draft"}
            </button>
            <button
              onClick={() => handleSave(true)}
              disabled={saving}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-tippd-blue text-white rounded-md text-sm font-semibold hover:opacity-90 disabled:opacity-50"
            >
              <Send className="w-4 h-4" />
              {saving ? "Saving..." : "Save & Send"}
            </button>
          </div>
        </div>

        {/* Preview Panel */}
        {showPreview && (
          <div className="rounded-lg border border-white/10 bg-white p-6 overflow-auto max-h-[85vh]">
            <div
              style={{
                fontFamily: "system-ui, sans-serif",
                color: "#222",
                fontSize: "12px",
                lineHeight: "1.5",
              }}
            >
              {/* Mini preview header */}
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  borderBottom: "3px solid #1B3A6B",
                  paddingBottom: "12px",
                  marginBottom: "16px",
                }}
              >
                <div>
                  <div
                    style={{
                      fontSize: "18px",
                      fontWeight: 800,
                      color: "#1B3A6B",
                    }}
                  >
                    Metro Waste Services
                  </div>
                  <div style={{ fontSize: "10px", color: "#666" }}>
                    1 Drake St, Bound Brook, NJ 08805
                  </div>
                  <div style={{ fontSize: "10px", color: "#666" }}>
                    (908) 725-0456
                  </div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div
                    style={{
                      fontSize: "20px",
                      fontWeight: 800,
                      color: "#1B3A6B",
                    }}
                  >
                    ESTIMATE
                  </div>
                  <div style={{ fontSize: "10px", color: "#666" }}>
                    {new Date().toLocaleDateString()}
                  </div>
                </div>
              </div>

              {/* Customer */}
              <div
                style={{
                  background: "#f5f5f5",
                  padding: "10px",
                  borderRadius: "4px",
                  marginBottom: "12px",
                }}
              >
                <div
                  style={{
                    fontSize: "9px",
                    textTransform: "uppercase",
                    letterSpacing: "1px",
                    color: "#1B3A6B",
                    fontWeight: 700,
                    marginBottom: "4px",
                  }}
                >
                  Prepared For
                </div>
                <div style={{ fontWeight: 700 }}>
                  {customerName || "Customer Name"}
                </div>
                <div>{customerPhone || "(000) 000-0000"}</div>
                {customerEmail && <div>{customerEmail}</div>}
              </div>

              {/* Items */}
              <table
                style={{
                  width: "100%",
                  borderCollapse: "collapse",
                  marginBottom: "12px",
                }}
              >
                <thead>
                  <tr>
                    <th
                      style={{
                        background: "#1B3A6B",
                        color: "#fff",
                        fontSize: "9px",
                        textTransform: "uppercase",
                        padding: "6px 8px",
                        textAlign: "left",
                      }}
                    >
                      Description
                    </th>
                    <th
                      style={{
                        background: "#1B3A6B",
                        color: "#fff",
                        fontSize: "9px",
                        textTransform: "uppercase",
                        padding: "6px 8px",
                        textAlign: "center",
                      }}
                    >
                      Qty
                    </th>
                    <th
                      style={{
                        background: "#1B3A6B",
                        color: "#fff",
                        fontSize: "9px",
                        textTransform: "uppercase",
                        padding: "6px 8px",
                        textAlign: "right",
                      }}
                    >
                      Price
                    </th>
                    <th
                      style={{
                        background: "#1B3A6B",
                        color: "#fff",
                        fontSize: "9px",
                        textTransform: "uppercase",
                        padding: "6px 8px",
                        textAlign: "right",
                      }}
                    >
                      Total
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {lineItems.map((item) => (
                    <tr
                      key={item.id}
                      style={{ borderBottom: "1px solid #eee" }}
                    >
                      <td style={{ padding: "6px 8px" }}>
                        {item.description || "—"}
                      </td>
                      <td
                        style={{ padding: "6px 8px", textAlign: "center" }}
                      >
                        {item.qty}
                      </td>
                      <td style={{ padding: "6px 8px", textAlign: "right" }}>
                        {formatCurrency(item.unit_price)}
                      </td>
                      <td style={{ padding: "6px 8px", textAlign: "right" }}>
                        {formatCurrency(item.qty * item.unit_price)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Totals */}
              <div
                style={{
                  display: "flex",
                  justifyContent: "flex-end",
                  marginBottom: "12px",
                }}
              >
                <div style={{ width: "200px" }}>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      padding: "3px 0",
                      borderTop: "1px solid #ddd",
                    }}
                  >
                    <span>Subtotal</span>
                    <span>{formatCurrency(subtotal)}</span>
                  </div>
                  {discountAmount > 0 && (
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        padding: "3px 0",
                        color: "#c0392b",
                      }}
                    >
                      <span>Discount</span>
                      <span>-{formatCurrency(discountAmount)}</span>
                    </div>
                  )}
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      padding: "6px 0",
                      borderTop: "2px solid #1B3A6B",
                      marginTop: "4px",
                      fontSize: "14px",
                      fontWeight: 800,
                      color: "#1B3A6B",
                    }}
                  >
                    <span>Total</span>
                    <span>{formatCurrency(total)}</span>
                  </div>
                </div>
              </div>

              {/* Terms */}
              {terms && (
                <div
                  style={{
                    background: "#f5f5f5",
                    padding: "10px",
                    borderRadius: "4px",
                    borderLeft: "3px solid #6DB33F",
                  }}
                >
                  <div
                    style={{
                      fontSize: "9px",
                      textTransform: "uppercase",
                      letterSpacing: "0.5px",
                      color: "#1B3A6B",
                      fontWeight: 700,
                      marginBottom: "4px",
                    }}
                  >
                    Terms &amp; Conditions
                  </div>
                  <div
                    style={{
                      fontSize: "10px",
                      color: "#555",
                      whiteSpace: "pre-wrap",
                    }}
                  >
                    {terms}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
