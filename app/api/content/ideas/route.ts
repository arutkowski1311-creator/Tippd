import { getAuthContext, json, error } from "@/lib/api-helpers";
import { generateContentIdeas } from "@/lib/anthropic";

function getSeason(date: Date): string {
  const month = date.getMonth();
  if (month >= 2 && month <= 4) return "spring";
  if (month >= 5 && month <= 7) return "summer";
  if (month >= 8 && month <= 10) return "fall";
  return "winter";
}

export async function POST(request: Request) {
  const ctx = await getAuthContext(["owner", "manager"]);
  if ("error" in ctx) return ctx.error;

  const body = await request.json().catch(() => ({}));

  // Get operator info
  const { data: operator } = await ctx.supabase
    .from("operators")
    .select("name, service_area_description")
    .eq("id", ctx.operatorId)
    .single();

  // Get recent job counts for business context
  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const fourteenDaysAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000).toISOString();

  const [{ count: jobs7d }, { count: jobs14d }] = await Promise.all([
    ctx.supabase
      .from("jobs")
      .select("id", { count: "exact", head: true })
      .eq("operator_id", ctx.operatorId)
      .gte("created_at", sevenDaysAgo),
    ctx.supabase
      .from("jobs")
      .select("id", { count: "exact", head: true })
      .eq("operator_id", ctx.operatorId)
      .gte("created_at", fourteenDaysAgo),
  ]);

  const serviceArea = ["Middlesex County", "Somerset County", "Monmouth County", "Mercer County"];
  const currentDate = now.toISOString().split("T")[0];
  const season = getSeason(now);

  try {
    const rawResult = await generateContentIdeas({
      operatorName: operator?.name || "Dumpster Rental Co",
      serviceArea,
      currentDate,
      season,
      businessContext: {
        lead_goal: body.lead_goal || "steady residential and contractor leads",
        active_promotions: body.active_promotions || [],
        capacity_status: body.capacity_status || "normal",
        recent_job_count_7d: jobs7d ?? undefined,
        recent_job_count_14d: jobs14d ?? undefined,
      },
    });

    // Parse and validate the JSON response
    const cleaned = rawResult.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    const parsed = JSON.parse(cleaned);
    return json(parsed);
  } catch (err) {
    return error(
      `Idea generation failed: ${err instanceof Error ? err.message : "Unknown error"}`,
      500
    );
  }
}
