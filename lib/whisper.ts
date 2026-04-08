/**
 * OpenAI Whisper — Voicemail Transcription
 * Blueprint Section 09
 *
 * Transcribes voicemail recordings from Twilio.
 * Requires OPENAI_API_KEY environment variable.
 */

/**
 * Transcribe a voicemail audio URL using OpenAI Whisper API.
 * Downloads the audio from Twilio, sends to Whisper, returns text.
 */
export async function transcribeVoicemail(audioUrl: string): Promise<string> {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY not configured");
  }

  // Download audio from Twilio
  const audioResponse = await fetch(audioUrl, {
    headers: {
      Authorization:
        "Basic " +
        Buffer.from(
          `${process.env.TWILIO_ACCOUNT_SID}:${process.env.TWILIO_AUTH_TOKEN}`
        ).toString("base64"),
    },
  });

  if (!audioResponse.ok) {
    throw new Error(`Failed to download voicemail: ${audioResponse.status}`);
  }

  const audioBuffer = await audioResponse.arrayBuffer();

  // Create form data for Whisper API
  const formData = new FormData();
  formData.append(
    "file",
    new Blob([audioBuffer], { type: "audio/wav" }),
    "voicemail.wav"
  );
  formData.append("model", "whisper-1");
  formData.append("language", "en");

  const whisperResponse = await fetch(
    "https://api.openai.com/v1/audio/transcriptions",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: formData,
    }
  );

  if (!whisperResponse.ok) {
    const err = await whisperResponse.text();
    throw new Error(`Whisper API error: ${err}`);
  }

  const result = await whisperResponse.json();
  return result.text || "";
}
