import { getAuthContext, error } from "@/lib/api-helpers";
import { renderInvoiceHTML } from "@/lib/pdf-templates";
import { invoiceFilename } from "@/lib/document-numbers";

export async function GET(
  _request: Request,
  { params }: { params: { id: string } }
) {
  const ctx = await getAuthContext(["owner", "manager"]);
  if ("error" in ctx) return ctx.error;

  const { data: invoice, error: dbError } = await ctx.supabase
    .from("invoices")
    .select("*")
    .eq("id", params.id)
    .eq("operator_id", ctx.operatorId)
    .single();

  if (dbError || !invoice) return error("Invoice not found", 404);

  const invoiceNumber = invoice.invoice_number || `P-${invoice.id.slice(0, 6)}`;
  const html = renderInvoiceHTML({ ...invoice, invoice_number: invoiceNumber });
  const filename = invoiceFilename(invoice.customer_name, invoiceNumber);

  return new Response(html, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Content-Disposition": `inline; filename="${filename}"`,
    },
  });
}
