export const QUOTE_STATUSES = [
  "draft",
  "sent",
  "viewed",
  "approved",
  "declined",
  "expired",
  "converted",
] as const;
export type QuoteStatus = (typeof QUOTE_STATUSES)[number];

export interface QuoteLineItem {
  description: string;
  qty: number;
  unit_price: number;
  total: number;
}

export interface Quote {
  id: string;
  operator_id: string;
  quote_number: string | null;
  customer_id: string | null;
  customer_name: string;
  customer_phone: string;
  customer_email: string | null;
  status: QuoteStatus;
  line_items: QuoteLineItem[];
  discount_type: "flat" | "percent" | null;
  discount_value: number;
  deposit_percent: number;
  deposit_amount: number;
  subtotal: number;
  total: number;
  expiry_date: string;
  terms: string | null;
  internal_notes: string | null;
  approve_token: string;
  approved_at: string | null;
  declined_at: string | null;
  decline_reason: string | null;
  created_at: string;
}
