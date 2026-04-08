import { getAuthContext, error } from "@/lib/api-helpers";
import { renderQuoteHTML } from "@/lib/pdf-templates";
import { quoteFilename } from "@/lib/document-numbers";

export async function GET(
  _request: Request,
  { params }: { params: { id: string } }
) {
  const ctx = await getAuthContext(["owner", "manager"]);
  if ("error" in ctx) return ctx.error;

  const { data: quote, error: dbError } = await ctx.supabase
    .from("quotes")
    .select("*")
    .eq("id", params.id)
    .eq("operator_id", ctx.operatorId)
    .single();

  if (dbError || !quote) return error("Quote not found", 404);

  const quoteNumber = quote.quote_number || `E-${quote.id.slice(0, 6)}`;
  const html = renderQuoteHTML({ ...quote, quote_number: quoteNumber });
  const filename = quoteFilename(
    quote.customer_name,
    quote.created_at.split("T")[0],
    quoteNumber
  );

  return new Response(html, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Content-Disposition": `inline; filename="${filename}"`,
    },
  });
}
