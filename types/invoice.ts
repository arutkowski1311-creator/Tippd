export const INVOICE_STATUSES = [
  "draft",
  "sent",
  "partial",
  "paid",
  "overdue_30",
  "overdue_45",
  "overdue_60",
  "overdue_80",
  "collections",
  "disputed",
  "written_off",
] as const;
export type InvoiceStatus = (typeof INVOICE_STATUSES)[number];

export interface InvoiceReminderEntry {
  day: number;
  sent_at: string;
  channel: "sms" | "email";
}

export interface Invoice {
  id: string;
  operator_id: string;
  invoice_number: string | null;
  job_id: string;
  customer_id: string;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  status: InvoiceStatus;
  issued_date: string;
  due_date: string;
  base_amount: number;
  weight_amount: number;
  daily_overage_amount: number;
  discount_amount: number;
  late_fee_amount: number;
  total_amount: number;
  amount_paid: number;
  stripe_invoice_id: string | null;
  stripe_payment_intent_id: string | null;
  pay_link: string | null;
  reminder_log: InvoiceReminderEntry[];
  paid_at: string | null;
  created_at: string;
}
