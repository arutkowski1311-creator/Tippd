import { getAuthContext, json, error } from "@/lib/api-helpers";
import { sendSMS } from "@/lib/twilio";
import { z } from "zod";

const smsSchema = z.object({
  to: z.string(),
  body: z.string().min(1),
  customer_id: z.string().uuid().optional(),
  job_id: z.string().uuid().optional(),
});

export async function POST(request: Request) {
  const ctx = await getAuthContext(["owner", "manager"]);
  if ("error" in ctx) return ctx.error;

  const body = await request.json();
  const parsed = smsSchema.safeParse(body);
  if (!parsed.success) return error(parsed.error.message);

  // Get operator's Twilio number
  const { data: operator } = await ctx.supabase
    .from("operators")
    .select("twilio_number")
    .eq("id", ctx.operatorId)
    .single();

  try {
    const message = await sendSMS({
      to: parsed.data.to,
      body: parsed.data.body,
      from: operator?.twilio_number,
    });

    // Log outbound comm
    await ctx.supabase.from("communications").insert({
      operator_id: ctx.operatorId,
      customer_id: parsed.data.customer_id || null,
      job_id: parsed.data.job_id || null,
      direction: "outbound",
      channel: "sms",
      from_number: operator?.twilio_number,
      to_number: parsed.data.to,
      raw_content: parsed.data.body,
      twilio_sid: message.sid,
    });

    return json({ success: true, sid: message.sid });
  } catch (err) {
    return error(`SMS failed: ${err instanceof Error ? err.message : "Unknown error"}`, 500);
  }
}
