-- ═══════════════════════════════════════════════════════════════
-- Action Center — Boss/Manager To-Do List
-- Run in Supabase SQL Editor
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS action_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  operator_id uuid NOT NULL REFERENCES operators(id),

  -- What needs attention
  type text NOT NULL CHECK (type IN (
    'callback_request',      -- Customer wants a callback
    'payment_plan_request',  -- Customer wants payment arrangement
    'reschedule_request',    -- Customer wants different date
    'new_booking',           -- New booking needs approval
    'pickup_request',        -- Customer requested pickup
    'driver_flag',           -- Driver flagged something (box condition, access issue, etc.)
    'truck_alert',           -- Truck maintenance due/overdue
    'box_pulled',            -- Box pulled from service (Grade F)
    'overtime_warning',      -- Driver approaching overtime
    'weather_review',        -- Weather-related schedule review needed
    'invoice_overdue',       -- Invoice hit collections threshold
    'customer_complaint',    -- Customer complaint via SMS
    'general'                -- Catch-all
  )),
  priority text DEFAULT 'normal' CHECK (priority IN ('urgent', 'high', 'normal', 'low')),
  status text DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'resolved', 'dismissed')),

  -- Context
  title text NOT NULL,
  description text,
  customer_id uuid REFERENCES customers(id),
  customer_name text,
  customer_phone text,
  job_id uuid REFERENCES jobs(id),
  truck_id uuid REFERENCES trucks(id),
  dumpster_id uuid REFERENCES dumpsters(id),
  driver_id uuid REFERENCES users(id),
  invoice_id uuid REFERENCES invoices(id),
  communication_id uuid REFERENCES communications(id),

  -- Resolution
  resolved_by uuid REFERENCES users(id),
  resolved_at timestamptz,
  resolution_notes text,

  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_action_items_operator ON action_items(operator_id);
CREATE INDEX idx_action_items_status ON action_items(operator_id, status);
CREATE INDEX idx_action_items_type ON action_items(operator_id, type);
CREATE INDEX idx_action_items_priority ON action_items(operator_id, priority, status);

ALTER TABLE action_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Tenant isolation" ON action_items
  FOR ALL USING (operator_id = public.get_operator_id());
