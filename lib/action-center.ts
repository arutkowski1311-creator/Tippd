/**
 * Action Center — helper functions to create action items from various sources.
 * Every system (SMS handler, driver app, maintenance cron, invoice cron, etc.)
 * can push items here so nothing falls through the cracks.
 */

type SupabaseClient = any; // works with both browser and server clients

export type ActionType =
  | "callback"
  | "driver_flag"
  | "truck_alert"
  | "overtime_warning"
  | "box_pulled"
  | "overdue_invoice"
  | "complaint"
  | "maintenance"
  | "pickup_request"
  | "general";

export type ActionPriority = "urgent" | "high" | "normal" | "low";
export type ActionStatus = "open" | "in_progress" | "resolved";

export interface ActionItemInput {
  operator_id: string;
  type: ActionType | string;
  priority: ActionPriority;
  title: string;
  description?: string;
  customer_id?: string;
  customer_name?: string;
  customer_phone?: string;
  job_id?: string;
  truck_id?: string;
  dumpster_id?: string;
  driver_id?: string;
  invoice_id?: string;
  communication_id?: string;
}

/**
 * Core function — insert one action item into the action_items table.
 */
export async function createActionItem(
  supabase: SupabaseClient,
  item: ActionItemInput
): Promise<void> {
  const { error } = await (supabase as any)
    .from("action_items")
    .insert({
      ...item,
      status: "open",
    });

  if (error) {
    console.error("[ActionCenter] Failed to create action item:", error.message);
  }
}

// ─── Pre-built helpers ────────────────────────────────────────────────────────

export async function createCallbackAction(
  supabase: SupabaseClient,
  operatorId: string,
  customerName: string,
  customerPhone: string,
  reason: string,
  jobId?: string
) {
  await createActionItem(supabase, {
    operator_id: operatorId,
    type: "callback",
    priority: "high",
    title: `Callback requested — ${customerName}`,
    description: reason,
    customer_name: customerName,
    customer_phone: customerPhone,
    job_id: jobId,
  });
}

export async function createDriverFlagAction(
  supabase: SupabaseClient,
  operatorId: string,
  driverName: string,
  flagType: string,
  details: string,
  truckId?: string,
  dumpsterId?: string
) {
  const isUrgent = ["accident", "breakdown", "injury"].includes(flagType);
  await createActionItem(supabase, {
    operator_id: operatorId,
    type: "driver_flag",
    priority: isUrgent ? "urgent" : "high",
    title: `Driver flag — ${driverName}: ${flagType}`,
    description: details,
    truck_id: truckId,
    dumpster_id: dumpsterId,
  });
}

export async function createTruckAlertAction(
  supabase: SupabaseClient,
  operatorId: string,
  truckName: string,
  truckId: string,
  alertType: string,
  details: string
) {
  const isUrgent = ["breakdown", "check_engine", "overheating"].includes(alertType);
  await createActionItem(supabase, {
    operator_id: operatorId,
    type: "truck_alert",
    priority: isUrgent ? "urgent" : "normal",
    title: `Truck alert — ${truckName}: ${alertType.replace(/_/g, " ")}`,
    description: details,
    truck_id: truckId,
  });
}

export async function createOvertimeWarningAction(
  supabase: SupabaseClient,
  operatorId: string,
  driverName: string,
  driverId: string,
  hoursWorked: number
) {
  const priority: ActionPriority = hoursWorked >= 12 ? "urgent" : "high";
  await createActionItem(supabase, {
    operator_id: operatorId,
    type: "overtime_warning",
    priority,
    title: `Overtime warning — ${driverName}`,
    description: `${driverName} has been on the clock for ${hoursWorked.toFixed(1)} hours today.`,
    driver_id: driverId,
  });
}

export async function createBoxPulledAction(
  supabase: SupabaseClient,
  operatorId: string,
  boxUnit: string,
  boxId: string,
  driverName: string,
  reason: string
) {
  await createActionItem(supabase, {
    operator_id: operatorId,
    type: "box_pulled",
    priority: "normal",
    title: `Box pulled — ${boxUnit}`,
    description: `${driverName} pulled box ${boxUnit}. Reason: ${reason}`,
    dumpster_id: boxId,
  });
}

export async function createOverdueInvoiceAction(
  supabase: SupabaseClient,
  operatorId: string,
  customerName: string,
  customerPhone: string,
  invoiceId: string,
  amount: number,
  daysPastDue: number
) {
  const priority: ActionPriority = daysPastDue >= 60 ? "urgent" : daysPastDue >= 30 ? "high" : "normal";
  await createActionItem(supabase, {
    operator_id: operatorId,
    type: "overdue_invoice",
    priority,
    title: `Overdue invoice — ${customerName} ($${amount.toFixed(2)})`,
    description: `${daysPastDue} days past due.`,
    customer_name: customerName,
    customer_phone: customerPhone,
    invoice_id: invoiceId,
  });
}

export async function createComplaintAction(
  supabase: SupabaseClient,
  operatorId: string,
  customerName: string,
  customerPhone: string,
  complaint: string,
  jobId?: string,
  communicationId?: string
) {
  await createActionItem(supabase, {
    operator_id: operatorId,
    type: "complaint",
    priority: "urgent",
    title: `Complaint — ${customerName}`,
    description: complaint,
    customer_name: customerName,
    customer_phone: customerPhone,
    job_id: jobId,
    communication_id: communicationId,
  });
}
