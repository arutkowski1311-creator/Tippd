import { getAuthContext, json, error } from "@/lib/api-helpers";
import { generateContent, generateStructuredContent } from "@/lib/anthropic";
import { z } from "zod";

const legacySchema = z.object({
  type: z.string().min(1),
  platform: z.string().min(1),
  tone: z.string().min(1),
  context: z.string().optional(),
});

const structuredSchema = z.object({
  structured: z.literal(true),
  idea: z.object({
    title: z.string(),
    category: z.string(),
    audience: z.string(),
    why_now: z.string(),
    signal_summary: z.array(z.string()),
    cta_suggestion: z.string(),
    sensitivity_level: z.string(),
  }),
  content_type: z.string().min(1),
  platform: z.string().min(1),
  tone: z.string().min(1),
  custom_idea: z.string().optional(),
  promo_or_offer: z.string().optional(),
  target_customer: z.string().optional(),
  town_or_county_focus: z.string().optional(),
});

export async function POST(request: Request) {
  const ctx = await getAuthContext(["owner", "manager"]);
  if ("error" in ctx) return ctx.error;

  const body = await request.json();

  // Get operator name for branding
  const { data: operator } = await ctx.supabase
    .from("operators")
    .select("name")
    .eq("id", ctx.operatorId)
    .single();

  const operatorName = operator?.name || "Dumpster Rental Co";

  // Check if this is the new structured format
  if (body.structured) {
    const parsed = structuredSchema.safeParse(body);
    if (!parsed.success) return error(parsed.error.message);

    try {
      const rawResult = await generateStructuredContent({
        operatorName,
        idea: parsed.data.idea,
        contentType: parsed.data.content_type,
        platform: parsed.data.platform,
        tone: parsed.data.tone,
        customIdea: parsed.data.custom_idea,
        promoOrOffer: parsed.data.promo_or_offer,
        targetCustomer: parsed.data.target_customer,
        townOrCountyFocus: parsed.data.town_or_county_focus,
      });

      const cleaned = rawResult.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
      const content = JSON.parse(cleaned);
      return json({ content });
    } catch (err) {
      return error(
        `Content generation failed: ${err instanceof Error ? err.message : "Unknown error"}`,
        500
      );
    }
  }

  // Legacy simple format
  const parsed = legacySchema.safeParse(body);
  if (!parsed.success) return error(parsed.error.message);

  try {
    const content = await generateContent({
      ...parsed.data,
      operatorName,
    });

    return json({ content });
  } catch (err) {
    return error(
      `Content generation failed: ${err instanceof Error ? err.message : "Unknown error"}`,
      500
    );
  }
}
