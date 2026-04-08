import { getAuthContext, json, error } from "@/lib/api-helpers";
import { z } from "zod";

// Approve and send AI-drafted response
const respondSchema = z.object({
  response_content: z.string().min(1),
});

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  const ctx = await getAuthContext(["owner", "manager"]);
  if ("error" in ctx) return ctx.error;

  const body = await request.json();
  const parsed = respondSchema.safeParse(body);
  if (!parsed.success) return error(parsed.error.message);

  // TODO: Send response via SMS/email to customer

  const { data, error: dbError } = await ctx.supabase
    .from("communications")
    .update({
      response_content: parsed.data.response_content,
      responded_at: new Date().toISOString(),
      auto_responded: false,
    })
    .eq("id", params.id)
    .eq("operator_id", ctx.operatorId)
    .select()
    .single();

  if (dbError) return error(dbError.message);
  return json(data);
}
