/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * POST /api/driver/segment/[id]
 * Complete a segment action (arrived, dropped, picked_up, dump_complete, pull_from_service).
 * Updates route_segments with actual times, updates job status, logs to route_learning.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = await createClient();
  const segmentId = params.id;

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const body = await request.json();
  const {
    action,
    actual_minutes,
    photos,
    weight,
    condition,
    notes,
  } = body;

  if (!action) {
    return NextResponse.json({ error: "action required" }, { status: 400 });
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

  // Get the segment
  const { data: segment, error: segErr } = await supabase
    .from("route_segments")
    .select("*")
    .eq("id", segmentId)
    .single() as any;

  if (segErr || !segment) {
    return NextResponse.json({ error: "Segment not found" }, { status: 404 });
  }

  const now = new Date().toISOString();

  // Build update payload based on action
  const updates: Record<string, any> = {};
  const jobUpdates: Record<string, any> = {};

  // Fetch current job status so we only apply transitions that are valid
  let currentJobStatus: string | null = null;
  if (segment.job_id) {
    const { data: jobRow } = await supabase
      .from("jobs")
      .select("status")
      .eq("id", segment.job_id)
      .single() as any;
    currentJobStatus = jobRow?.status ?? null;
  }

  switch (action) {
    case "arrived":
      updates.arrived_at = now;
      updates.status = "active";
      if (segment.job_id) {
        if (segment.type === "drop" && currentJobStatus === "scheduled") {
          // Only advance to en_route_drop if the job hasn't moved past scheduled
          jobUpdates.status = "en_route_drop";
        } else if (
          segment.type === "pickup" &&
          ["dropped", "pickup_requested", "pickup_scheduled"].includes(currentJobStatus ?? "")
        ) {
          jobUpdates.status = "en_route_pickup";
        }
        // If already at a further status (e.g. already dropped/picked_up), leave it alone
      }
      break;

    case "dropped":
      updates.completed_at = now;
      updates.status = "completed";
      updates.photos = photos || [];
      updates.notes = notes || null;
      if (actual_minutes) updates.actual_total_minutes = actual_minutes;
      // Calculate actual times
      if (segment.arrived_at) {
        const arrivedMs = new Date(segment.arrived_at).getTime();
        const nowMs = new Date(now).getTime();
        updates.actual_stop_minutes = Math.round((nowMs - arrivedMs) / 60000);
      }
      if (segment.job_id) {
        // Only set dropped if not already further along
        if (!["picked_up", "invoiced", "paid"].includes(currentJobStatus ?? "")) {
          jobUpdates.status = "dropped";
        }
        jobUpdates.actual_drop_time = now;
        if (photos && photos.length > 0) {
          jobUpdates.photos_drop = photos;
        }
        if (notes) {
          jobUpdates.driver_notes = notes;
        }
      }
      break;

    case "picked_up":
      updates.completed_at = now;
      updates.status = "completed";
      updates.photos = photos || [];
      updates.weight_lbs = weight || null;
      updates.condition_grade = condition || null;
      updates.notes = notes || null;
      if (segment.arrived_at) {
        const arrivedMs = new Date(segment.arrived_at).getTime();
        const nowMs = new Date(now).getTime();
        updates.actual_stop_minutes = Math.round((nowMs - arrivedMs) / 60000);
      }
      if (segment.job_id) {
        // Only set picked_up if not already invoiced/paid
        if (!["invoiced", "paid"].includes(currentJobStatus ?? "")) {
          jobUpdates.status = "picked_up";
        }
        jobUpdates.actual_pickup_time = now;
        jobUpdates.weight_lbs = weight || null;
        if (photos && photos.length > 0) {
          jobUpdates.photos_pickup = photos;
        }
        if (notes) {
          jobUpdates.driver_notes = notes;
        }
      }
      // Update dumpster condition if graded
      if (condition && segment.box_id) {
        // Get current condition for the log
        const { data: dumpster } = await supabase
          .from("dumpsters")
          .select("condition_grade")
          .eq("id", segment.box_id)
          .single() as any;

        const prevGrade = dumpster?.condition_grade || "A";

        await supabase
          .from("dumpsters")
          .update({ condition_grade: condition })
          .eq("id", segment.box_id) as any;

        // Log the condition change
        await supabase.from("dumpster_condition_log").insert({
          dumpster_id: segment.box_id,
          job_id: segment.job_id,
          previous_grade: prevGrade,
          new_grade: condition,
          changed_by: user.id,
          notes: notes || `Graded ${condition} during pickup`,
        } as any);
      }
      break;

    case "dump_arrived":
      updates.arrived_at = now;
      updates.status = "active";
      if (segment.job_id) {
        jobUpdates.dump_arrival_time = now;
        if (segment.dump_location_id) {
          jobUpdates.dump_location_id = segment.dump_location_id;
        }
      }
      break;

    case "dump_complete":
      updates.completed_at = now;
      updates.status = "completed";
      if (segment.arrived_at) {
        const arrivedMs = new Date(segment.arrived_at).getTime();
        const nowMs = new Date(now).getTime();
        updates.actual_stop_minutes = Math.round((nowMs - arrivedMs) / 60000);
      }
      if (segment.job_id) {
        jobUpdates.dump_departure_time = now;
      }
      break;

    case "pull_from_service":
      updates.completed_at = now;
      updates.status = "completed";
      updates.condition_grade = "F";
      updates.notes = notes || "Pulled from service by driver";
      updates.box_action = "pulled_from_service";
      // Update the dumpster to Grade F and repair status
      if (segment.box_id) {
        const { data: dumpster } = await supabase
          .from("dumpsters")
          .select("condition_grade")
          .eq("id", segment.box_id)
          .single() as any;

        await supabase
          .from("dumpsters")
          .update({
            condition_grade: "F",
            status: "repair",
            repair_notes: notes || "Pulled from service by driver",
          })
          .eq("id", segment.box_id) as any;

        await supabase.from("dumpster_condition_log").insert({
          dumpster_id: segment.box_id,
          job_id: segment.job_id,
          previous_grade: dumpster?.condition_grade || "A",
          new_grade: "F",
          changed_by: user.id,
          notes: notes || "Pulled from service by driver",
        } as any);
      }
      break;

    default:
      return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 });
  }

  // Update the segment
  const { error: updateErr } = await supabase
    .from("route_segments")
    .update(updates)
    .eq("id", segmentId) as any;

  if (updateErr) {
    console.error("Segment update error:", updateErr);
    return NextResponse.json({ error: updateErr.message }, { status: 500 });
  }

  // Update job if applicable
  if (segment.job_id && Object.keys(jobUpdates).length > 0) {
    await supabase
      .from("jobs")
      .update(jobUpdates)
      .eq("id", segment.job_id) as any;
  }

  // Log to route_learning when segment is completed
  if (updates.status === "completed" && segment.arrived_at) {
    const hour = new Date().getHours();
    const timeOfDay =
      hour < 10 ? "morning" : hour < 14 ? "midday" : hour < 17 ? "afternoon" : "evening";

    await supabase.from("route_learning").insert({
      operator_id: profile.operator_id,
      segment_type: segment.type,
      entity_id: segment.job_id || segment.dump_location_id || null,
      box_size: segment.box_size || null,
      time_of_day: timeOfDay,
      day_of_week: new Date().getDay(),
      planned_minutes: segment.planned_total_minutes,
      actual_minutes: updates.actual_stop_minutes || actual_minutes || null,
      planned_miles: segment.planned_drive_miles,
      actual_miles: null,
    } as any);
  }

  // Get the next segment
  const { data: nextSegment } = await supabase
    .from("route_segments")
    .select("*")
    .eq("driver_id", user.id)
    .eq("date", segment.date)
    .eq("status", "pending")
    .order("sequence_number", { ascending: true })
    .limit(1)
    .single() as any;

  // ─── End-of-Day Mileage Rollup ───
  // When the last segment (yard_return) is completed, sum all segment miles
  // and add to the truck's current_mileage + maintenance counters
  if (segment.type === "yard_return" && !nextSegment && segment.truck_id) {
    try {
      // Sum all completed segment miles for today's route
      const { data: todaySegments } = await supabase
        .from("route_segments")
        .select("planned_drive_miles")
        .eq("truck_id", segment.truck_id)
        .eq("date", segment.date)
        .eq("status", "completed") as any;

      const totalMilesToday = (todaySegments || []).reduce(
        (sum: number, s: any) => sum + (s.planned_drive_miles || 0), 0
      );

      if (totalMilesToday > 0) {
        const roundedMiles = Math.round(totalMilesToday);

        // Update truck mileage
        const { data: truck } = await supabase
          .from("trucks")
          .select("current_mileage, current_hours")
          .eq("id", segment.truck_id)
          .single() as any;

        if (truck) {
          const newMileage = (truck.current_mileage || 0) + roundedMiles;
          // Estimate hours: ~25mph average = miles/25 hours
          const hoursToday = Math.round((totalMilesToday / 25) * 10) / 10;
          const newHours = (truck.current_hours || 0) + Math.round(hoursToday);

          await supabase
            .from("trucks")
            .update({
              current_mileage: newMileage,
              current_hours: newHours,
            })
            .eq("id", segment.truck_id);

          // Update maintenance_settings: increment current_miles_since for all items
          const { data: maintSettings } = await supabase
            .from("maintenance_settings")
            .select("id, current_miles_since, current_hours_since")
            .eq("truck_id", segment.truck_id) as any;

          if (maintSettings) {
            for (const setting of maintSettings) {
              await supabase
                .from("maintenance_settings")
                .update({
                  current_miles_since: (setting.current_miles_since || 0) + roundedMiles,
                  current_hours_since: (setting.current_hours_since || 0) + Math.round(hoursToday),
                })
                .eq("id", setting.id);
            }
          }

          console.log(`[end-of-day] Truck ${segment.truck_id}: +${roundedMiles}mi (${newMileage} total), +${hoursToday}hrs`);
        }
      }
    } catch (err) {
      console.error("[end-of-day] Mileage rollup error:", err);
      // Non-fatal — don't block the response
    }
  }

  return NextResponse.json({
    ok: true,
    segment: { ...segment, ...updates },
    next_segment: nextSegment || null,
    ...(segment.type === "yard_return" && !nextSegment ? { route_complete: true } : {}),
  });
}
