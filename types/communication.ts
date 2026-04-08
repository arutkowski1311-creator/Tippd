export const COMM_DIRECTIONS = ["inbound", "outbound"] as const;
export type CommDirection = (typeof COMM_DIRECTIONS)[number];

export const COMM_CHANNELS = ["sms", "voicemail", "email"] as const;
export type CommChannel = (typeof COMM_CHANNELS)[number];

export const COMM_INTENTS = [
  "drop_request",
  "pickup_request",
  "reschedule",
  "driver_note",
  "complaint",
  "other",
] as const;
export type CommIntent = (typeof COMM_INTENTS)[number];

export interface Communication {
  id: string;
  operator_id: string;
  customer_id: string | null;
  job_id: string | null;
  direction: CommDirection;
  channel: CommChannel;
  from_number: string | null;
  to_number: string | null;
  raw_content: string;
  voicemail_url: string | null;
  intent: CommIntent | null;
  intent_confidence: number | null;
  auto_responded: boolean;
  response_content: string | null;
  responded_at: string | null;
  twilio_sid: string | null;
  created_at: string;
}
