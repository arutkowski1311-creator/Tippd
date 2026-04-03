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
  const {
    nominee_id,
    category,
    raw_text,
    ai_text,
    ai_category,
    ai_confidence,
    ai_reasoning,
    is_anonymous,
    tags,
  } = body;

  // Get user's hospital
  const { data: currentUser } = await supabase
    .from("users")
    .select("hospital_id, department_id")
    .eq("id", user.id)
    .single();

  if (!currentUser?.hospital_id) {
    return NextResponse.json(
      { error: "User not assigned to a hospital" },
      { status: 400 }
    );
  }

  // Find active cycle for this hospital
  const { data: activeCycle } = await supabase
    .from("recognition_cycles")
    .select("id")
    .eq("hospital_id", currentUser.hospital_id)
    .eq("status", "active")
    .single();

  const { data: nomination, error } = await supabase
    .from("nominations")
    .insert({
      nominee_id,
      nominator_id: is_anonymous ? null : user.id,
      is_anonymous: is_anonymous || false,
      category,
      raw_text,
      ai_text,
      ai_category,
      ai_confidence,
      ai_reasoning,
      tags: tags || [],
      status: "submitted",
      hospital_id: currentUser.hospital_id,
      department_id: currentUser.department_id,
      cycle_id: activeCycle?.id || null,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(nomination);
}

export async function GET(request: NextRequest) {
  const supabase = createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status");
  const category = searchParams.get("category");
  const cycle_id = searchParams.get("cycle_id");

  let query = supabase
    .from("nominations")
    .select("*, nominee:users!nominee_id(*), reviews(*)")
    .order("created_at", { ascending: false });

  if (status) query = query.eq("status", status);
  if (category) query = query.eq("category", category);
  if (cycle_id) query = query.eq("cycle_id", cycle_id);

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}
