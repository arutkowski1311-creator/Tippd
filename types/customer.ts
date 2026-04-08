export const CUSTOMER_TYPES = ["residential", "contractor"] as const;
export type CustomerType = (typeof CUSTOMER_TYPES)[number];

export interface Customer {
  id: string;
  operator_id: string;
  name: string;
  phone: string;
  email: string | null;
  type: CustomerType;
  billing_address: string | null;
  autopay_enabled: boolean;
  stripe_customer_id: string | null;
  stripe_payment_method_id: string | null;
  pain_score: number;
  notes: string | null;
  created_at: string;
}
