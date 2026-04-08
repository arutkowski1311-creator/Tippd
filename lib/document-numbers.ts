/**
 * Sequential document number generation for quotes and invoices.
 *
 * Quote numbers:   E1000, E1001, E1002 ...
 * Invoice numbers: P1000, P1001, P1002 ...
 *
 * Revisions append: E1001-R1, E1001-R2, etc.
 */

import type { SupabaseClient } from "@supabase/supabase-js";

const QUOTE_PREFIX = "E";
const INVOICE_PREFIX = "P";
const STARTING_NUMBER = 1000;

/**
 * Parse the numeric portion from a document number like "E1042" or "P1007".
 * Returns the integer, or null if the format doesn't match.
 */
function parseNumber(docNumber: string, prefix: string): number | null {
  // Strip any revision suffix  (e.g. "E1001-R2" -> "E1001")
  const base = docNumber.split("-")[0];
  if (!base.startsWith(prefix)) return null;
  const n = parseInt(base.slice(prefix.length), 10);
  return Number.isNaN(n) ? null : n;
}

/**
 * Get the next available quote number for an operator.
 * Returns e.g. "E1000" for the first quote, "E1001" for the second, etc.
 */
export async function getNextQuoteNumber(
  supabase: SupabaseClient,
  operatorId: string
): Promise<string> {
  const { data } = await supabase
    .from("quotes")
    .select("quote_number")
    .eq("operator_id", operatorId)
    .not("quote_number", "is", null)
    .order("created_at", { ascending: false })
    .limit(200);

  if (!data || data.length === 0) {
    return `${QUOTE_PREFIX}${STARTING_NUMBER}`;
  }

  let max = STARTING_NUMBER - 1;
  for (const row of data as { quote_number: string }[]) {
    const n = parseNumber(row.quote_number, QUOTE_PREFIX);
    if (n !== null && n > max) max = n;
  }

  return `${QUOTE_PREFIX}${max + 1}`;
}

/**
 * Get the next available invoice number for an operator.
 * Returns e.g. "P1000" for the first invoice, "P1001" for the second, etc.
 */
export async function getNextInvoiceNumber(
  supabase: SupabaseClient,
  operatorId: string
): Promise<string> {
  const { data } = await supabase
    .from("invoices")
    .select("invoice_number")
    .eq("operator_id", operatorId)
    .not("invoice_number", "is", null)
    .order("created_at", { ascending: false })
    .limit(200);

  if (!data || data.length === 0) {
    return `${INVOICE_PREFIX}${STARTING_NUMBER}`;
  }

  let max = STARTING_NUMBER - 1;
  for (const row of data as { invoice_number: string }[]) {
    const n = parseNumber(row.invoice_number, INVOICE_PREFIX);
    if (n !== null && n > max) max = n;
  }

  return `${INVOICE_PREFIX}${max + 1}`;
}

/**
 * Generate the next revision label for a given quote number.
 * E.g. "E1001" -> "E1001-R1", "E1001-R1" -> "E1001-R2"
 */
export function nextRevision(quoteNumber: string): string {
  const parts = quoteNumber.split("-R");
  const base = parts[0];
  const currentRev = parts.length > 1 ? parseInt(parts[1], 10) : 0;
  return `${base}-R${currentRev + 1}`;
}

/**
 * Build PDF-friendly filename for a quote.
 * e.g. "JohnMartinez_Quote_2026-03-27_E1001.pdf"
 */
export function quoteFilename(
  customerName: string,
  date: string,
  quoteNumber: string
): string {
  const safe = customerName.replace(/[^a-zA-Z0-9]/g, "");
  return `${safe}_Quote_${date}_${quoteNumber}.pdf`;
}

/**
 * Build PDF-friendly filename for an invoice.
 * e.g. "JohnMartinez_Invoice_P1001.pdf"
 */
export function invoiceFilename(
  customerName: string,
  invoiceNumber: string
): string {
  const safe = customerName.replace(/[^a-zA-Z0-9]/g, "");
  return `${safe}_Invoice_${invoiceNumber}.pdf`;
}
