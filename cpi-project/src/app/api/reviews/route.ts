import { createServerSupabase } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  const supabase = createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { nomination_id, is_valid, strength_score, impact_score, notes } = body;

  // If not valid, just save the validation gate
  const reviewData: Record<string, unknown> = {
    nomination_id,
    reviewer_id: user.id,
    is_valid,
    notes,
  };

  if (is_valid) {
    reviewData.strength_score = strength_score;
    reviewData.impact_score = impact_score;
  }

  const { data: review, error } = await supabase
    .from("reviews")
    .upsert(reviewData, { onConflict: "nomination_id,reviewer_id" })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Update nomination status if it was submitted
  if (is_valid) {
    await supabase
      .from("nominations")
      .update({ status: "scored" })
      .eq("id", nomination_id)
      .in("status", ["submitted", "in_review"]);
  }

  return NextResponse.json(review);
}
