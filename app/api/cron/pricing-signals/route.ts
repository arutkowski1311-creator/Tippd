import { createAdminClient } from "@/lib/supabase/admin";
import { json, error } from "@/lib/api-helpers";
import { runPricingSignalCheck } from "@/lib/pricing-signals";
import { NextRequest } from "next/server";

/**
 * Vercel Cron: runs daily.
 * Checks all four pricing signals for each operator and creates recommendations.
 */
export async function GET(request: NextRequest) {
  const secret = request.headers.get("authorization")?.replace("Bearer ", "");
  if (secret !== process.env.CRON_SECRET) return error("Unauthorized", 401);

  const admin = createAdminClient();

  const { data: operators } = await admin.from("operators").select("id");
  if (!operators?.length) return json({ message: "No operators", created: 0 });

  let totalCreated = 0;
  for (const op of operators) {
    try {
      const created = await runPricingSignalCheck(admin, op.id);
      totalCreated += created;
    } catch {
      // Continue with other operators
    }
  }

  return json({ operators_checked: operators.length, recommendations_created: totalCreated });
}
