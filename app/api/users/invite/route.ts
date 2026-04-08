import { getAuthContext, json, error } from "@/lib/api-helpers";
import { z } from "zod";

const inviteSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1),
  role: z.enum(["manager", "driver"]),
});

export async function POST(request: Request) {
  const ctx = await getAuthContext(["owner"]);
  if ("error" in ctx) return ctx.error;

  const body = await request.json();
  const parsed = inviteSchema.safeParse(body);
  if (!parsed.success) return error(parsed.error.message);

  // TODO: Send invite email via Resend with role-specific link
  // For now, return the invite details
  return json({
    message: "Invite sent",
    invite: { ...parsed.data, operator_id: ctx.operatorId },
  });
}
