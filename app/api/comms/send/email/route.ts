import { getAuthContext, json, error } from "@/lib/api-helpers";
import { sendEmail } from "@/lib/resend";
import { z } from "zod";

const emailSchema = z.object({
  to: z.string().email(),
  subject: z.string().min(1),
  html: z.string().min(1),
  customer_id: z.string().uuid().optional(),
  job_id: z.string().uuid().optional(),
});

export async function POST(request: Request) {
  const ctx = await getAuthContext(["owner", "manager"]);
  if ("error" in ctx) return ctx.error;

  const body = await request.json();
  const parsed = emailSchema.safeParse(body);
  if (!parsed.success) return error(parsed.error.message);

  try {
    await sendEmail({
      to: parsed.data.to,
      subject: parsed.data.subject,
      html: parsed.data.html,
    });

    // Log outbound comm
    await ctx.supabase.from("communications").insert({
      operator_id: ctx.operatorId,
      customer_id: parsed.data.customer_id || null,
      job_id: parsed.data.job_id || null,
      direction: "outbound",
      channel: "email",
      raw_content: parsed.data.html,
    });

    return json({ success: true });
  } catch (err) {
    return error(`Email failed: ${err instanceof Error ? err.message : "Unknown error"}`, 500);
  }
}
