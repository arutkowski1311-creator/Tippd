/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * POST /api/driver/audible
 * Driver calls an audible: box can't be reused for next stop.
 * Recalculates remaining route by inserting a yard visit.
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
  const { segment_id, reason } = body;

  if (!segment_id) {
    return NextResponse.json({ error: "segment_id required" }, { status: 400 });
  }

  // Get user profile
  const { data: profile } = await supabase
    .from("users")
    .select("operator_id")
    .eq("id", user.id)
    .single() as any;

  if (!profile) {
    return NextResponse.json({ error: "Profile not found" }, { status: 404 });
  }

  // Get the current segment
  const { data: segment } = await supabase
    .from("route_segments")
    .select("*")
    .eq("id", segment_id)
    .single() as any;

  if (!segment) {
    return NextResponse.json({ error: "Segment not found" }, { status: 404 });
  }

  // Mark the current segment's decision as overridden
  await supabase
    .from("route_segments")
    .update({
      decision: "audible_override",
      decision_reason: reason || "Driver called audible - box cannot be reused",
      box_reused: false,
    })
    .eq("id", segment_id) as any;

  // Get all remaining pending segments after this one
  const { data: remainingSegments } = await supabase
    .from("route_segments")
    .select("*")
    .eq("driver_id", user.id)
    .eq("date", segment.date)
    .gt("sequence_number", segment.sequence_number)
    .eq("status", "pending")
    .order("sequence_number", { ascending: true }) as any;

  if (!remainingSegments || remainingSegments.length === 0) {
    return NextResponse.json({
      ok: true,
      message: "Audible noted. No remaining segments to reroute.",
      remaining_segments: [],
    });
  }

  // Strategy: If the next segment was supposed to be a drop (reuse), we need to:
  // 1. Insert a "reposition" segment to go back to yard
  // 2. Keep the drop but now the truck loads from yard
  const nextSeg = remainingSegments[0];

  // If next segment is a drop that was expecting a reused box, insert yard visit
  if (nextSeg.type === "drop" && segment.box_reused) {
    // Bump sequence numbers for all remaining segments
    for (let i = remainingSegments.length - 1; i >= 0; i--) {
      await supabase
        .from("route_segments")
        .update({ sequence_number: remainingSegments[i].sequence_number + 1 })
        .eq("id", remainingSegments[i].id) as any;
    }

    // Insert yard reposition segment
    const { data: yardSegment } = await supabase
      .from("route_segments")
      .insert({
        route_id: segment.route_id,
        operator_id: profile.operator_id,
        driver_id: user.id,
        date: segment.date,
        sequence_number: segment.sequence_number + 1,
        type: "reposition",
        label: "Return to yard for replacement box",
        from_address: segment.to_address,
        from_lat: segment.to_lat,
        from_lng: segment.to_lng,
        to_address: "Metro Waste Yard",
        box_action: "returned_to_yard",
        decision: "audible_yard_return",
        decision_reason: reason || "Box cannot be reused - returning for replacement",
        planned_drive_minutes: 15,
        planned_stop_minutes: 5,
        planned_total_minutes: 20,
        planned_drive_miles: 8,
        status: "pending",
      } as any)
      .select()
      .single() as any;

    // Get updated remaining segments
    const { data: updatedRemaining } = await supabase
      .from("route_segments")
      .select("*")
      .eq("driver_id", user.id)
      .eq("date", segment.date)
      .gt("sequence_number", segment.sequence_number)
      .eq("status", "pending")
      .order("sequence_number", { ascending: true }) as any;

    return NextResponse.json({
      ok: true,
      message: "Audible accepted. Rerouted through yard for replacement box.",
      inserted_segment: yardSegment,
      remaining_segments: updatedRemaining || [],
    });
  }

  return NextResponse.json({
    ok: true,
    message: "Audible noted. Route continues as planned.",
    remaining_segments: remainingSegments,
  });
}
