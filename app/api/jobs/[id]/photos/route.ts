import { getAuthContext, json, error } from "@/lib/api-helpers";
import { z } from "zod";

const photoSchema = z.object({
  type: z.enum(["drop", "pickup"]),
  url: z.string().url(),
});

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  const ctx = await getAuthContext(["driver"]);
  if ("error" in ctx) return ctx.error;

  const body = await request.json();
  const parsed = photoSchema.safeParse(body);
  if (!parsed.success) return error(parsed.error.message);

  // Get current photos
  const { data: job, error: fetchError } = await ctx.supabase
    .from("jobs")
    .select("photos_drop, photos_pickup")
    .eq("id", params.id)
    .eq("operator_id", ctx.operatorId)
    .single();

  if (fetchError || !job) return error("Job not found", 404);

  const field = parsed.data.type === "drop" ? "photos_drop" : "photos_pickup";
  const currentPhotos = (job[field] as string[]) || [];
  const updatedPhotos = [...currentPhotos, parsed.data.url];

  const { data, error: dbError } = await ctx.supabase
    .from("jobs")
    .update({ [field]: updatedPhotos })
    .eq("id", params.id)
    .select()
    .single();

  if (dbError) return error(dbError.message);
  return json(data);
}
