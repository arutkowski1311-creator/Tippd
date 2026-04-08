/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * POST /api/driver/segment/[id]/complete
 * Complete a route segment (dump, yard_return, yard_depart, lunch, pull_from_service)
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient();
  const { id } = await params;

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const body = await request.json();
  const { type, action, weight, job_id, notes, condition, photos } = body;

  const { data: profile } = await supabase
    .from("users")
    .select("operator_id")
    .eq("id", user.id)
    .single() as any;

  if (!profile) {
    return NextResponse.json({ error: "Profile not found" }, { status: 404 });
  }

  // Handle STAGE OUTSIDE GATE — box dropped outside a closed transfer station
  if (type === "dump" && action === "stage_outside_gate") {
    const { dump_location_id } = body;

    // Get driver's current GPS from driver_state (updated every 30s by the driver app)
    const { data: driverState } = await supabase
      .from("driver_state")
      .select("lat, lng")
      .eq("driver_id", user.id)
      .single() as any;

    // Get the dump location name for the label
    let dumpLocationName = "transfer station";
    if (dump_location_id) {
      const { data: dumpLoc } = await supabase
        .from("dump_locations")
        .select("name")
        .eq("id", dump_location_id)
        .single() as any;
      if (dumpLoc?.name) dumpLocationName = dumpLoc.name;
    }

    // Find the dumpster(s) associated with the job
    if (job_id) {
      const { data: job } = await supabase
        .from("jobs")
        .select("dumpster_id, dumpster_unit_number")
        .eq("id", job_id)
        .single() as any;

      if (job?.dumpster_id) {
        await supabase
          .from("dumpsters")
          .update({
            status: "staged",
            fill_status: "full",
            current_lat: driverState?.lat ?? null,
            current_lng: driverState?.lng ?? null,
            current_location_label: `Staged outside ${dumpLocationName}`,
            staged_at: new Date().toISOString(),
            staged_near_dump_id: dump_location_id || null,
          })
          .eq("id", job.dumpster_id) as any;
      }

      // Create an action item so the owner knows
      const unitLabel = job?.dumpster_unit_number ? ` (${job.dumpster_unit_number})` : "";
      await supabase
        .from("action_items")
        .insert({
          operator_id: profile.operator_id,
          type: "driver_flag",
          priority: "high",
          title: `📦 Box${unitLabel} staged near ${dumpLocationName} — full, not yet dumped`,
          description: `Driver staged the box at their current location. It is full and needs to be dumped before it can be returned to service.`,
          status: "open",
        }) as any;
    }

    return NextResponse.json({ ok: true, completed: id, type: "staged" });
  }

  // Handle DUMP actions
  if (type === "dump") {
    if (action === "dump_arrived" && job_id) {
      // Record dump arrival time on the job
      await supabase
        .from("jobs")
        .update({ dump_arrival_time: new Date().toISOString() })
        .eq("id", job_id) as any;
    }

    if (action === "dump_complete" && job_id) {
      // Record dump departure and weight
      const update: Record<string, any> = {
        dump_departure_time: new Date().toISOString(),
      };

      if (weight) {
        update.weight_lbs = weight;

        // Check if over weight allowance and calculate overage charge
        const { data: job } = await supabase
          .from("jobs")
          .select("base_rate, dumpster_unit_number")
          .eq("id", job_id)
          .single() as any;

        if (job) {
          // Weight allowances: 10yd=2tons(4000lbs), 20yd=3tons(6000lbs), 30yd=4tons(8000lbs)
          const unit = job.dumpster_unit_number || "";
          let allowedLbs = 4000; // default 10yd = 2 tons
          if (unit.startsWith("M-2")) allowedLbs = 6000; // 20yd = 3 tons
          if (unit.startsWith("M-3")) allowedLbs = 8000; // 30yd = 4 tons

          if (weight > allowedLbs) {
            const overageTons = (weight - allowedLbs) / 2000;
            const overageCharge = Math.ceil(overageTons * 150); // $150/ton
            update.weight_charge = overageCharge;
          } else {
            update.weight_charge = 0;
          }
        }
      }

      // Save scale receipt photos
      if (photos && photos.length > 0) {
        update.photos_dump = photos;
      }

      await supabase
        .from("jobs")
        .update(update)
        .eq("id", job_id) as any;

      // Return weight info for UI
      const isOver = update.weight_charge && update.weight_charge > 0;
      return NextResponse.json({
        ok: true,
        completed: id,
        type: "dump",
        weight_lbs: weight,
        weight_charge: update.weight_charge || 0,
        is_over: isOver,
      });
    }

    return NextResponse.json({ ok: true, completed: id, type: "dump" });
  }

  // Handle PULL FROM SERVICE
  if (type === "pull_from_service" && job_id) {
    // Update dumpster to Grade F + repair status
    const { data: job } = await supabase
      .from("jobs")
      .select("dumpster_id")
      .eq("id", job_id)
      .single() as any;

    if (job?.dumpster_id) {
      await supabase
        .from("dumpsters")
        .update({
          condition_grade: "F",
          status: "repair",
          repair_notes: notes || "Pulled from service by driver",
        })
        .eq("id", job.dumpster_id);
    }

    // Create action item for owner
    await supabase
      .from("action_items")
      .insert({
        operator_id: profile.operator_id,
        type: "box_pulled",
        priority: "urgent",
        title: `Driver pulled dumpster from service`,
        description: notes || "Driver marked unit as Grade F",
        customer_id: null,
        status: "open",
      }) as any;

    return NextResponse.json({ ok: true, completed: id, type: "pull_from_service" });
  }

  // Handle YARD RETURN / YARD DEPART / LUNCH
  if (type === "yard_return") {
    await supabase
      .from("driver_state")
      .upsert({
        driver_id: user.id,
        operator_id: profile.operator_id,
        status: "at_yard",
        current_segment_type: "yard_return",
        updated_at: new Date().toISOString(),
      }, { onConflict: "driver_id" }) as any;
  }

  return NextResponse.json({ ok: true, completed: id, type });
}
