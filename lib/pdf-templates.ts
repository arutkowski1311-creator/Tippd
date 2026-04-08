/**
 * HTML templates for quote and invoice PDFs.
 * These produce print-optimized HTML that the user can Ctrl+P / Save as PDF.
 */

import type { Quote, QuoteLineItem } from "@/types/quote";
import type { Invoice } from "@/types/invoice";
import { quoteFilename, invoiceFilename } from "./document-numbers";

// ─── Metro Waste Branding ───
const NAVY = "#1B3A6B";
const GREEN = "#6DB33F";
const LIGHT_GRAY = "#F5F5F5";
const COMPANY_NAME = "Metro Waste Services";
const COMPANY_ADDRESS = "1 Drake St, Bound Brook, NJ 08805";
const COMPANY_PHONE = "(908) 725-0456";

function baseStyles(): string {
  return `
    <style>
      @page { margin: 0.5in; size: letter; }
      * { box-sizing: border-box; margin: 0; padding: 0; }
      body {
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        color: #222;
        font-size: 13px;
        line-height: 1.5;
        background: #fff;
      }
      .page { max-width: 8.5in; margin: 0 auto; padding: 0.5in; }
      .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 24px; padding-bottom: 16px; border-bottom: 3px solid ${NAVY}; }
      .brand h1 { font-size: 22px; font-weight: 800; color: ${NAVY}; letter-spacing: -0.5px; }
      .brand p { font-size: 11px; color: #666; margin-top: 2px; }
      .doc-info { text-align: right; }
      .doc-info .doc-type { font-size: 24px; font-weight: 800; color: ${NAVY}; text-transform: uppercase; }
      .doc-info .doc-number { font-size: 14px; font-weight: 700; color: ${GREEN}; margin-top: 2px; }
      .doc-info .doc-date { font-size: 11px; color: #666; margin-top: 4px; }
      .meta-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin-bottom: 24px; }
      .meta-box { padding: 14px; background: ${LIGHT_GRAY}; border-radius: 4px; }
      .meta-box h3 { font-size: 10px; text-transform: uppercase; letter-spacing: 1px; color: ${NAVY}; font-weight: 700; margin-bottom: 6px; }
      .meta-box p { font-size: 12px; color: #333; }
      table.items { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
      table.items thead th { background: ${NAVY}; color: #fff; font-size: 10px; text-transform: uppercase; letter-spacing: 0.5px; padding: 8px 10px; text-align: left; font-weight: 600; }
      table.items thead th:last-child,
      table.items thead th:nth-child(3),
      table.items thead th:nth-child(4) { text-align: right; }
      table.items tbody td { padding: 8px 10px; border-bottom: 1px solid #e5e5e5; font-size: 12px; }
      table.items tbody td:last-child,
      table.items tbody td:nth-child(3),
      table.items tbody td:nth-child(4) { text-align: right; }
      table.items tbody tr:nth-child(even) { background: #fafafa; }
      .totals { display: flex; justify-content: flex-end; margin-bottom: 24px; }
      .totals-box { width: 260px; }
      .totals-row { display: flex; justify-content: space-between; padding: 5px 0; font-size: 12px; }
      .totals-row.subtotal { border-top: 1px solid #ddd; padding-top: 8px; }
      .totals-row.grand-total { border-top: 2px solid ${NAVY}; padding-top: 10px; margin-top: 4px; font-size: 16px; font-weight: 800; color: ${NAVY}; }
      .terms { margin-top: 24px; padding: 14px; background: ${LIGHT_GRAY}; border-radius: 4px; border-left: 3px solid ${GREEN}; }
      .terms h3 { font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; color: ${NAVY}; font-weight: 700; margin-bottom: 6px; }
      .terms p { font-size: 11px; color: #555; white-space: pre-wrap; }
      .footer { margin-top: 40px; padding-top: 12px; border-top: 1px solid #ddd; text-align: center; font-size: 10px; color: #999; }
      .status-badge { display: inline-block; padding: 3px 10px; border-radius: 3px; font-size: 11px; font-weight: 600; text-transform: uppercase; }
      .badge-paid { background: #d4edda; color: #155724; }
      .badge-overdue { background: #f8d7da; color: #721c24; }
      .badge-sent { background: #d1ecf1; color: #0c5460; }
      .badge-draft { background: #e2e3e5; color: #383d41; }
      .payment-box { margin-top: 20px; padding: 16px; background: #fffbe6; border: 1px solid #ffe58f; border-radius: 4px; text-align: center; }
      .payment-box .amount-due { font-size: 24px; font-weight: 800; color: ${NAVY}; }
      @media print {
        body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        .no-print { display: none; }
      }
    </style>
  `;
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(amount);
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + (dateStr.includes("T") ? "" : "T00:00:00"));
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

// ─── QUOTE HTML ───

export function renderQuoteHTML(quote: Quote & { quote_number: string }): string {
  const lineItems = (quote.line_items || []) as QuoteLineItem[];
  const discountLabel =
    quote.discount_type === "percent"
      ? `Discount (${quote.discount_value}%)`
      : quote.discount_value > 0
      ? "Discount"
      : null;
  const discountAmount =
    quote.discount_type === "percent"
      ? (quote.subtotal * quote.discount_value) / 100
      : quote.discount_value || 0;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${quoteFilename(quote.customer_name, quote.created_at.split("T")[0], quote.quote_number)}</title>
  ${baseStyles()}
</head>
<body>
  <div class="page">
    <!-- Header -->
    <div class="header">
      <div class="brand">
        <h1>${COMPANY_NAME}</h1>
        <p>${COMPANY_ADDRESS}</p>
        <p>${COMPANY_PHONE}</p>
      </div>
      <div class="doc-info">
        <div class="doc-type">Estimate</div>
        <div class="doc-number">#${quote.quote_number}</div>
        <div class="doc-date">Created: ${formatDate(quote.created_at)}</div>
        <div class="doc-date">Valid Until: ${formatDate(quote.expiry_date)}</div>
      </div>
    </div>

    <!-- Customer Info -->
    <div class="meta-grid">
      <div class="meta-box">
        <h3>Prepared For</h3>
        <p><strong>${quote.customer_name}</strong></p>
        <p>${quote.customer_phone}</p>
        ${quote.customer_email ? `<p>${quote.customer_email}</p>` : ""}
      </div>
      <div class="meta-box">
        <h3>From</h3>
        <p><strong>${COMPANY_NAME}</strong></p>
        <p>${COMPANY_ADDRESS}</p>
        <p>${COMPANY_PHONE}</p>
      </div>
    </div>

    <!-- Line Items -->
    <table class="items">
      <thead>
        <tr>
          <th style="width:50%">Description</th>
          <th style="width:10%">Qty</th>
          <th style="width:20%">Unit Price</th>
          <th style="width:20%">Total</th>
        </tr>
      </thead>
      <tbody>
        ${lineItems.map(item => `
          <tr>
            <td>${item.description}</td>
            <td style="text-align:center">${item.qty}</td>
            <td>${formatCurrency(item.unit_price)}</td>
            <td>${formatCurrency(item.total)}</td>
          </tr>
        `).join("")}
      </tbody>
    </table>

    <!-- Totals -->
    <div class="totals">
      <div class="totals-box">
        <div class="totals-row subtotal">
          <span>Subtotal</span>
          <span>${formatCurrency(quote.subtotal)}</span>
        </div>
        ${discountLabel ? `
        <div class="totals-row" style="color:#c0392b">
          <span>${discountLabel}</span>
          <span>-${formatCurrency(discountAmount)}</span>
        </div>
        ` : ""}
        ${quote.deposit_percent > 0 ? `
        <div class="totals-row">
          <span>Deposit Required (${quote.deposit_percent}%)</span>
          <span>${formatCurrency(quote.deposit_amount)}</span>
        </div>
        ` : ""}
        <div class="totals-row grand-total">
          <span>Total</span>
          <span>${formatCurrency(quote.total)}</span>
        </div>
      </div>
    </div>

    ${quote.terms ? `
    <div class="terms">
      <h3>Terms &amp; Conditions</h3>
      <p>${quote.terms}</p>
    </div>
    ` : ""}

    <div class="footer">
      <p>${COMPANY_NAME} &bull; ${COMPANY_ADDRESS} &bull; ${COMPANY_PHONE}</p>
      <p style="margin-top:4px">Thank you for your business!</p>
    </div>
  </div>

  <script class="no-print">
    // Auto-trigger print dialog for quick PDF save
    // window.onload = () => window.print();
  </script>
</body>
</html>`;
}

// ─── INVOICE HTML ───

export function renderInvoiceHTML(invoice: Invoice & { invoice_number: string }): string {
  const balanceDue = invoice.total_amount - invoice.amount_paid;
  const statusBadge =
    invoice.status === "paid" ? "badge-paid"
    : invoice.status.startsWith("overdue") ? "badge-overdue"
    : invoice.status === "sent" ? "badge-sent"
    : "badge-draft";

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${invoiceFilename(invoice.customer_name, invoice.invoice_number)}</title>
  ${baseStyles()}
</head>
<body>
  <div class="page">
    <!-- Header -->
    <div class="header">
      <div class="brand">
        <h1>${COMPANY_NAME}</h1>
        <p>${COMPANY_ADDRESS}</p>
        <p>${COMPANY_PHONE}</p>
      </div>
      <div class="doc-info">
        <div class="doc-type">Invoice</div>
        <div class="doc-number">#${invoice.invoice_number}</div>
        <div class="doc-date">Issued: ${formatDate(invoice.issued_date)}</div>
        <div class="doc-date">Due: ${formatDate(invoice.due_date)}</div>
        <div style="margin-top:6px"><span class="status-badge ${statusBadge}">${invoice.status.replace("_", " ")}</span></div>
      </div>
    </div>

    <!-- Customer / Company Info -->
    <div class="meta-grid">
      <div class="meta-box">
        <h3>Bill To</h3>
        <p><strong>${invoice.customer_name}</strong></p>
        <p>${invoice.customer_phone}</p>
        ${invoice.customer_email ? `<p>${invoice.customer_email}</p>` : ""}
      </div>
      <div class="meta-box">
        <h3>From</h3>
        <p><strong>${COMPANY_NAME}</strong></p>
        <p>${COMPANY_ADDRESS}</p>
        <p>${COMPANY_PHONE}</p>
      </div>
    </div>

    <!-- Charges Table -->
    <table class="items">
      <thead>
        <tr>
          <th style="width:60%">Description</th>
          <th style="width:40%">Amount</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>Dumpster Rental — Base Rate</td>
          <td>${formatCurrency(invoice.base_amount)}</td>
        </tr>
        ${invoice.weight_amount > 0 ? `
        <tr>
          <td>Weight / Overage Charges</td>
          <td>${formatCurrency(invoice.weight_amount)}</td>
        </tr>` : ""}
        ${invoice.daily_overage_amount > 0 ? `
        <tr>
          <td>Daily Overage Charges (Extended Rental)</td>
          <td>${formatCurrency(invoice.daily_overage_amount)}</td>
        </tr>` : ""}
        ${invoice.late_fee_amount > 0 ? `
        <tr>
          <td>Late Fees</td>
          <td style="color:#c0392b">${formatCurrency(invoice.late_fee_amount)}</td>
        </tr>` : ""}
      </tbody>
    </table>

    <!-- Totals -->
    <div class="totals">
      <div class="totals-box">
        <div class="totals-row subtotal">
          <span>Subtotal</span>
          <span>${formatCurrency(invoice.base_amount + invoice.weight_amount + invoice.daily_overage_amount + invoice.late_fee_amount)}</span>
        </div>
        ${invoice.discount_amount > 0 ? `
        <div class="totals-row" style="color:#c0392b">
          <span>Discount</span>
          <span>-${formatCurrency(invoice.discount_amount)}</span>
        </div>` : ""}
        <div class="totals-row grand-total">
          <span>Total</span>
          <span>${formatCurrency(invoice.total_amount)}</span>
        </div>
        ${invoice.amount_paid > 0 ? `
        <div class="totals-row" style="color:${GREEN}">
          <span>Amount Paid</span>
          <span>-${formatCurrency(invoice.amount_paid)}</span>
        </div>` : ""}
        <div class="totals-row" style="font-weight:700; font-size:14px; border-top:1px solid #ddd; padding-top:8px; margin-top:4px;">
          <span>Balance Due</span>
          <span style="color:${balanceDue > 0 ? '#c0392b' : GREEN}">${formatCurrency(balanceDue)}</span>
        </div>
      </div>
    </div>

    ${balanceDue > 0 && invoice.pay_link ? `
    <div class="payment-box no-print">
      <p style="font-size:12px; color:#666; margin-bottom:6px">Pay online securely:</p>
      <div class="amount-due">${formatCurrency(balanceDue)}</div>
      <a href="${invoice.pay_link}" style="display:inline-block; margin-top:10px; padding:10px 24px; background:${GREEN}; color:#fff; text-decoration:none; border-radius:4px; font-weight:700; font-size:14px;">Pay Now</a>
    </div>
    ` : ""}

    <div class="terms">
      <h3>Payment Terms</h3>
      <p>Payment is due within 30 days of the invoice date. Late payments are subject to a 7% fee after 60 days and an additional 10% after 80 days. Accounts over 90 days past due may be sent to collections.</p>
    </div>

    <div class="footer">
      <p>${COMPANY_NAME} &bull; ${COMPANY_ADDRESS} &bull; ${COMPANY_PHONE}</p>
      <p style="margin-top:4px">Thank you for your business!</p>
    </div>
  </div>
</body>
</html>`;
}
