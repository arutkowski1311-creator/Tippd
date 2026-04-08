import { createClient } from "@/lib/supabase/server";
import { json, error } from "@/lib/api-helpers";

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  const body = await request.json();
  const { token, reason } = body as { token: string; reason?: string };

  if (!token) return error("Token required", 400);

  const supabase = await createClient();

  const { data, error: dbError } = await supabase
    .from("quotes")
    .update({
      status: "declined",
      declined_at: new Date().toISOString(),
      decline_reason: reason || null,
    })
    .eq("id", params.id)
    .eq("approve_token", token)
    .select()
    .single();

  if (dbError) return error("Quote not found", 404);
  return json(data);
}
