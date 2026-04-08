import { getAuthContext, json, error } from "@/lib/api-helpers";
import { getNextQuoteNumber } from "@/lib/document-numbers";
import { z } from "zod";

export async function GET(request: Request) {
  const ctx = await getAuthContext(["owner", "manager"]);
  if ("error" in ctx) return ctx.error;

  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status");

  let query = ctx.supabase
    .from("quotes")
    .select("*")
    .eq("operator_id", ctx.operatorId)
    .order("created_at", { ascending: false });

  if (status) query = query.eq("status", status);

  const { data, error: dbError } = await query;
  if (dbError) return error(dbError.message);
  return json(data);
}

const createSchema = z.object({
  customer_id: z.string().uuid().optional(),
  customer_name: z.string(),
  customer_phone: z.string(),
  customer_email: z.string().email().optional(),
  line_items: z.array(z.object({
    description: z.string(),
    qty: z.number(),
    unit_price: z.number(),
    total: z.number(),
  })),
  discount_type: z.enum(["flat", "percent"]).optional(),
  discount_value: z.number().default(0),
  deposit_percent: z.number().int().default(0),
  subtotal: z.number(),
  total: z.number(),
  terms: z.string().optional(),
  internal_notes: z.string().optional(),
});

export async function POST(request: Request) {
  const ctx = await getAuthContext(["owner", "manager"]);
  if ("error" in ctx) return ctx.error;

  const body = await request.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) return error(parsed.error.message);

  // Generate sequential quote number
  const quoteNumber = await getNextQuoteNumber(ctx.supabase, ctx.operatorId);

  // Get operator's quote expiry setting
  const { data: operator } = await ctx.supabase
    .from("operators")
    .select("quote_expiry_days")
    .eq("id", ctx.operatorId)
    .single();

  const expiryDays = operator?.quote_expiry_days || 7;
  const expiryDate = new Date();
  expiryDate.setDate(expiryDate.getDate() + expiryDays);

  const depositAmount = parsed.data.deposit_percent > 0
    ? (parsed.data.total * parsed.data.deposit_percent) / 100
    : 0;

  const { data, error: dbError } = await ctx.supabase
    .from("quotes")
    .insert({
      ...parsed.data,
      operator_id: ctx.operatorId,
      quote_number: quoteNumber,
      deposit_amount: depositAmount,
      expiry_date: expiryDate.toISOString().split("T")[0],
    })
    .select()
    .single();

  if (dbError) return error(dbError.message);
  return json(data, 201);
}
