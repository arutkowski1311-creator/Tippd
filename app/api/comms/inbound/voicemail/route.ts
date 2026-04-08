import { createAdminClient } from "@/lib/supabase/admin";
import { json, error } from "@/lib/api-helpers";
import { transcribeVoicemail } from "@/lib/whisper";

// Twilio webhook — receives voicemail recording
export async function POST(request: Request) {
  const formData = await request.formData();
  const from = formData.get("From") as string;
  const recordingUrl = formData.get("RecordingUrl") as string;
  const to = formData.get("To") as string;
  const sid = formData.get("CallSid") as string;

  if (!from || !recordingUrl) return error("Missing data", 400);

  const admin = createAdminClient();

  const { data: operator } = await admin
    .from("operators")
    .select("id")
    .eq("twilio_number", to)
    .single();

  if (!operator) return error("Operator not found", 404);

  const { data: customer } = await admin
    .from("customers")
    .select("id")
    .eq("operator_id", operator.id)
    .eq("phone", from)
    .single();

  // Transcribe voicemail with Whisper (falls back to placeholder if not configured)
  let transcript = "[Voicemail — transcription unavailable]";
  try {
    transcript = await transcribeVoicemail(recordingUrl);
  } catch {
    // Whisper not configured or audio fetch failed — store without transcript
  }

  const { data, error: dbError } = await admin
    .from("communications")
    .insert({
      operator_id: operator.id,
      customer_id: customer?.id || null,
      direction: "inbound",
      channel: "voicemail",
      from_number: from,
      to_number: to,
      raw_content: transcript,
      voicemail_url: recordingUrl,
      twilio_sid: sid,
    })
    .select()
    .single();

  if (dbError) return error(dbError.message);
  return json(data, 201);
}
