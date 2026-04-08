/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { calculateWeightOverage } from "@/lib/weight-calc";

/**
 * POST /api/driver/dump-weight
 *
 * Records the dump scale weight, calculates overage charges,
 * and optionally processes a photo of the scale ticket via OCR.
 *
 * Body: {
 *   job_id: string,
 *   weight_lbs: number,
 *   dump_ticket_photo?: string (base64 image),
 *   dump_location_id?: string,
 *   dump_cost?: number (facility charge from ticket)
 * }
 */
export async function POST(request: NextRequest) {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const body = await request.json();
  const { job_id, weight_lbs, dump_ticket_photo, dump_location_id, dump_cost } = body;

  if (!job_id || !weight_lbs) {
    return NextResponse.json({ error: "job_id and weight_lbs required" }, { status: 400 });
  }

  // Get the job to find dumpster size
  const { data: job } = await supabase
    .from("jobs")
    .select("id, dumpster_id, dumpster_unit_number, base_rate, weight_charge, daily_overage_charge")
    .eq("id", job_id)
    .single() as any;

  if (!job) {
    return NextResponse.json({ error: "Job not found" }, { status: 404 });
  }

  // Determine dumpster size from unit number (M-1xx = 10yd, M-2xx = 20yd, M-3xx = 30yd)
  let dumpsterSize = "20yd"; // default
  if (job.dumpster_unit_number) {
    const match = job.dumpster_unit_number.match(/M-(\d)/);
    if (match) {
      const prefix = parseInt(match[1]);
      if (prefix === 1) dumpsterSize = "10yd";
      else if (prefix === 2) dumpsterSize = "20yd";
      else if (prefix === 3) dumpsterSize = "30yd";
    }
  }

  // Also try to get size from dumpster record
  if (job.dumpster_id) {
    const { data: dumpster } = await supabase
      .from("dumpsters")
      .select("size")
      .eq("id", job.dumpster_id)
      .single() as any;
    if (dumpster?.size) dumpsterSize = dumpster.size;
  }

  // Calculate overage
  const overage = calculateWeightOverage(weight_lbs, dumpsterSize);

  // Upload scale ticket photo if provided
  let ticketPhotoUrl: string | null = null;
  if (dump_ticket_photo) {
    try {
      // Store as base64 reference for now (in production, upload to Supabase Storage)
      ticketPhotoUrl = `dump-ticket-${job_id}-${Date.now()}`;
    } catch {
      // Non-fatal
    }
  }

  // Update the job with weight data
  const updateData: any = {
    weight_lbs: weight_lbs,
    dump_weight_lbs: weight_lbs,
    dump_ticket_photo: ticketPhotoUrl || dump_ticket_photo,
    weight_overage_lbs: overage.overageLbs,
    weight_overage_charge: overage.overageCharge,
    weight_charge: overage.overageCharge, // this is what shows on the invoice
  };

  if (dump_location_id) updateData.dump_location_id = dump_location_id;
  if (dump_cost) updateData.dump_cost = dump_cost;

  const { error: updateError } = await supabase
    .from("jobs")
    .update(updateData)
    .eq("id", job_id);

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    weight_lbs,
    dumpster_size: dumpsterSize,
    included_lbs: overage.includedLbs,
    overage_lbs: overage.overageLbs,
    overage_tons: overage.overageTons,
    overage_charge: overage.overageCharge,
    is_over: overage.isOver,
    message: overage.isOver
      ? `Weight overage: ${overage.overageLbs} lbs over (${overage.overageTons} tons). Additional charge: $${overage.overageCharge}`
      : `Within included weight (${weight_lbs} / ${overage.includedLbs} lbs)`,
  });
}
