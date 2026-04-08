/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * POST /api/driver/state
 * Update driver's real-time GPS position and status.
 * Upserts into driver_state table.
 */
export async function POST(request: NextRequest) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const body = await request.json();
  const { lat, lng, status, segment_id, heading, speed } = body;

  if (lat == null || lng == null) {
    return NextResponse.json({ error: "lat and lng required" }, { status: 400 });
  }

  // Get operator_id
  const { data: profile } = await supabase
    .from("users")
    .select("operator_id")
    .eq("id", user.id)
    .single() as any;

  if (!profile) {
    return NextResponse.json({ error: "Profile not found" }, { status: 404 });
  }

  // Upsert driver state (unique on driver_id)
  const { data, error } = await supabase
    .from("driver_state")
    .upsert(
      {
        driver_id: user.id,
        operator_id: profile.operator_id,
        lat,
        lng,
        heading: heading || null,
        speed: speed || null,
        status: status || "on_route",
        current_segment_id: segment_id || null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "driver_id" }
    )
    .select()
    .single() as any;

  if (error) {
    console.error("Driver state upsert error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, state: data });
}
