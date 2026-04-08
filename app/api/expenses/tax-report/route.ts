import { getAuthContext, json, error } from "@/lib/api-helpers";
import { TAX_BUCKETS, EXPENSE_CATEGORIES, type TaxBucket, type ExpenseCategory } from "@/types/expense";

export async function GET(request: Request) {
  const ctx = await getAuthContext(["owner", "manager"]);
  if ("error" in ctx) return ctx.error;

  const { searchParams } = new URL(request.url);
  const startDate = searchParams.get("start_date");
  const endDate = searchParams.get("end_date");

  if (!startDate || !endDate) {
    return error("start_date and end_date are required");
  }

  const { data: expenses, error: dbError } = await ctx.supabase
    .from("expenses")
    .select("category, tax_bucket, amount")
    .eq("operator_id", ctx.operatorId)
    .gte("date", startDate)
    .lte("date", endDate);

  if (dbError) return error(dbError.message);

  // Build summary grouped by tax_bucket and category
  const byTaxBucket: Record<string, { total: number; categories: Record<string, number> }> = {};

  for (const bucket of TAX_BUCKETS) {
    byTaxBucket[bucket] = { total: 0, categories: {} };
    for (const cat of EXPENSE_CATEGORIES) {
      byTaxBucket[bucket].categories[cat] = 0;
    }
  }

  let total = 0;

  for (const expense of (expenses || []) as { category: ExpenseCategory; tax_bucket: TaxBucket; amount: number }[]) {
    const bucket = expense.tax_bucket;
    const cat = expense.category;
    const amt = Number(expense.amount) || 0;

    total += amt;
    if (byTaxBucket[bucket]) {
      byTaxBucket[bucket].total += amt;
      byTaxBucket[bucket].categories[cat] += amt;
    }
  }

  // Clean up zero-value categories
  for (const bucket of TAX_BUCKETS) {
    const cats = byTaxBucket[bucket].categories;
    for (const cat of Object.keys(cats)) {
      if (cats[cat] === 0) delete cats[cat];
    }
  }

  // Remove empty buckets
  for (const bucket of TAX_BUCKETS) {
    if (byTaxBucket[bucket].total === 0) delete byTaxBucket[bucket];
  }

  // Format period label
  const start = new Date(startDate + "T00:00:00");
  const end = new Date(endDate + "T00:00:00");
  const fmt = (d: Date) =>
    d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  const period = `${fmt(start)} - ${fmt(end)}`;

  return json({
    period,
    start_date: startDate,
    end_date: endDate,
    total: Math.round(total * 100) / 100,
    by_tax_bucket: byTaxBucket,
  });
}
