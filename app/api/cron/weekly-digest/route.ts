import { createAdminClient } from "@/lib/supabase/admin";
import { json, error } from "@/lib/api-helpers";
import { sendSMS } from "@/lib/twilio";
import Anthropic from "@anthropic-ai/sdk";
import { NextRequest } from "next/server";

/**
 * Vercel Cron: runs every Monday at 7am.
 * Generates AI-powered weekly digest with 5 actionable insights.
 * Sends SMS to owner: "Your Tippd weekly insight is ready."
 * Blueprint Section 10 — The AI Weekly Digest
 */
export async function GET(request: NextRequest) {
  const secret = request.headers.get("authorization")?.replace("Bearer ", "");
  if (secret !== process.env.CRON_SECRET) return error("Unauthorized", 401);

  const admin = createAdminClient();
  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  const { data: operators } = await admin.from("operators").select("id, name");
  if (!operators?.length) return json({ message: "No operators" });

  let digestsGenerated = 0;

  for (const op of operators) {
    try {
      // Gather last week's data
      const lastWeek = new Date(Date.now() - 7 * 86400000).toISOString();
      const twoWeeksAgo = new Date(Date.now() - 14 * 86400000).toISOString();

      const [
        { count: jobsThisWeek },
        { count: jobsLastWeek },
        { data: routes },
        { data: invoices },
        { data: exceptions },
      ] = await Promise.all([
        admin.from("jobs").select("id", { count: "exact", head: true }).eq("operator_id", op.id).gte("created_at", lastWeek).neq("status", "cancelled"),
        admin.from("jobs").select("id", { count: "exact", head: true }).eq("operator_id", op.id).gte("created_at", twoWeeksAgo).lt("created_at", lastWeek).neq("status", "cancelled"),
        admin.from("routes").select("total_miles, miles_per_box, dead_mile_pct, revenue_generated").eq("operator_id", op.id).gte("date", lastWeek.split("T")[0]).eq("status", "completed"),
        admin.from("invoices").select("total_amount, status, amount_paid").eq("operator_id", op.id).gte("created_at", lastWeek),
        admin.from("exceptions").select("type, severity, status").eq("operator_id", op.id).gte("created_at", lastWeek),
      ]);

      const totalRevenue = (routes || []).reduce((s: number, r: any) => s + (r.revenue_generated || 0), 0);
      const avgDeadMile = routes?.length
        ? (routes.reduce((s: number, r: any) => s + (r.dead_mile_pct || 0), 0) / routes.length)
        : 0;
      const avgMilesPerBox = routes?.length
        ? (routes.reduce((s: number, r: any) => s + (r.miles_per_box || 0), 0) / routes.length)
        : 0;
      const invoiceTotal = (invoices || []).reduce((s: number, i: any) => s + (i.total_amount || 0), 0);
      const paidTotal = (invoices || []).reduce((s: number, i: any) => s + (i.amount_paid || 0), 0);

      // Generate insights with Claude
      const prompt = `You are the AI advisor for ${op.name}, a dumpster rental business. Generate exactly 5 insights for their weekly digest.

Data from last week:
- Jobs this week: ${jobsThisWeek || 0} (prior week: ${jobsLastWeek || 0})
- Routes completed: ${routes?.length || 0}
- Route revenue: $${totalRevenue.toFixed(0)}
- Avg dead mile %: ${avgDeadMile.toFixed(1)}%
- Avg miles per box: ${avgMilesPerBox.toFixed(1)}
- Invoices generated: ${invoices?.length || 0} totaling $${invoiceTotal.toFixed(0)}
- Payments received: $${paidTotal.toFixed(0)}
- Exceptions: ${exceptions?.length || 0} (${(exceptions || []).filter((e: any) => e.severity === "critical").length} critical)

Format each insight as a JSON array with objects: {type, title, body, dollar_impact}
Types: route, customer, asset, pricing, labor, payment, opportunity
Each insight must be specific and actionable with a dollar estimate where possible.
Return ONLY the JSON array, no markdown.`;

      const response = await anthropic.messages.create({
        model: "claude-sonnet-4-20250514",
        max_tokens: 2048,
        messages: [{ role: "user", content: prompt }],
      });

      const content = (response.content[0] as any).text;
      let insights: any[] = [];
      try {
        insights = JSON.parse(content);
      } catch {
        // If parsing fails, skip this operator
        continue;
      }

      const weekOf = new Date().toISOString().split("T")[0];

      // Store insights
      for (const insight of insights.slice(0, 5)) {
        await admin.from("insights").insert({
          operator_id: op.id,
          type: insight.type || "opportunity",
          title: insight.title,
          body: insight.body,
          dollar_impact: insight.dollar_impact || null,
          week_of: weekOf,
        } as any);
      }

      // SMS the owner
      const { data: owners } = await admin
        .from("users")
        .select("phone")
        .eq("operator_id", op.id)
        .eq("role", "owner")
        .eq("is_active", true);

      for (const owner of owners || []) {
        if (owner.phone) {
          try {
            await sendSMS({
              to: owner.phone,
              body: `${op.name} weekly insight is ready. ${insights[0]?.title || "Check your dashboard for this week's analysis."}`,
            });
          } catch {
            // SMS failure shouldn't block
          }
        }
      }

      digestsGenerated++;
    } catch {
      // Continue with other operators
    }
  }

  return json({ digests_generated: digestsGenerated });
}
