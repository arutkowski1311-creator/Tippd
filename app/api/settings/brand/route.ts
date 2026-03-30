import { getAuthContext, json, error } from "@/lib/api-helpers";
import { createAdminClient } from "@/lib/supabase/admin";
import { z } from "zod";

const brandSchema = z.object({
  name: z.string().optional(),
  slug: z.string().optional(),
  logo_url: z.string().optional(),
  primary_color: z.string().optional(),
  accent_color: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email().optional(),
  address: z.string().optional(),
  service_area_description: z.string().optional(),
  tagline: z.string().optional(),
});

export async function PATCH(request: Request) {
  const ctx = await getAuthContext(["owner"]);
  if ("error" in ctx) return ctx.error;

  const body = await request.json();
  const parsed = brandSchema.safeParse(body);
  if (!parsed.success) return error(parsed.error.message);

  // Use admin client to bypass RLS — auth already verified above
  const admin = createAdminClient();
  const { data, error: dbError } = await admin
    .from("operators")
    .update(parsed.data)
    .eq("id", ctx.operatorId)
    .select()
    .maybeSingle();

  if (dbError) return error(dbError.message);
  if (!data) return error("Operator not found", 404);
  return json(data);
}
