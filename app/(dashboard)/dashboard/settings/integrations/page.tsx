import Link from "next/link";
import { ArrowLeft, CheckCircle, XCircle, AlertCircle } from "lucide-react";

function getIntegrations() {
  return [
    {
      name: "Supabase",
      desc: "Database, Auth, Storage",
      connected: !!(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY),
      hint: "Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY",
    },
    {
      name: "Stripe",
      desc: "Payment processing",
      connected: !!(process.env.STRIPE_SECRET_KEY),
      hint: "Set STRIPE_SECRET_KEY in Vercel environment variables",
    },
    {
      name: "Twilio",
      desc: "SMS & Voice messaging",
      connected: !!(process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN),
      hint: "Set TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN",
    },
    {
      name: "Resend",
      desc: "Transactional email",
      connected: !!(process.env.RESEND_API_KEY),
      hint: "Set RESEND_API_KEY",
    },
    {
      name: "Google Maps",
      desc: "Geocoding, routing, address autocomplete",
      connected: !!(process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || process.env.GOOGLE_MAPS_API_KEY),
      hint: "Set NEXT_PUBLIC_GOOGLE_MAPS_API_KEY",
    },
    {
      name: "Claude AI",
      desc: "AI insights, content generation, SMS conversations",
      connected: !!(process.env.ANTHROPIC_API_KEY),
      hint: "Set ANTHROPIC_API_KEY",
    },
    {
      name: "HERE Routing",
      desc: "Truck-aware routing and route optimization",
      connected: !!(process.env.HERE_API_KEY),
      hint: "Set HERE_API_KEY",
    },
    {
      name: "OpenAI Whisper",
      desc: "Voicemail transcription",
      connected: !!(process.env.OPENAI_API_KEY),
      hint: "Set OPENAI_API_KEY — only needed if using voicemail transcription",
    },
  ];
}

export default function IntegrationsSettings() {
  const integrations = getIntegrations();
  const connectedCount = integrations.filter((i) => i.connected).length;

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <Link href="/dashboard/settings" className="text-tippd-smoke hover:text-white">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <h1 className="text-2xl font-bold text-white">Integrations</h1>
      </div>

      <div className="max-w-2xl space-y-3">
        <div className="flex items-center gap-2 mb-4">
          {connectedCount === integrations.length ? (
            <><CheckCircle className="w-4 h-4 text-emerald-400" /><span className="text-sm text-emerald-400">All integrations connected</span></>
          ) : (
            <><AlertCircle className="w-4 h-4 text-amber-400" /><span className="text-sm text-amber-400">{connectedCount} of {integrations.length} connected</span></>
          )}
        </div>

        {integrations.map((int) => (
          <div key={int.name} className="rounded-lg border border-white/10 bg-tippd-charcoal p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-white">{int.name}</p>
                <p className="text-xs text-tippd-ash">{int.desc}</p>
              </div>
              <div className="flex items-center gap-2">
                {int.connected ? (
                  <><CheckCircle className="w-4 h-4 text-emerald-400" /><span className="text-xs text-emerald-400">Connected</span></>
                ) : (
                  <><XCircle className="w-4 h-4 text-tippd-ash" /><span className="text-xs text-tippd-ash">Not configured</span></>
                )}
              </div>
            </div>
            {!int.connected && (
              <p className="text-xs text-tippd-ash/60 mt-2 border-t border-white/5 pt-2">{int.hint}</p>
            )}
          </div>
        ))}

        <div className="rounded-lg border border-white/5 bg-tippd-charcoal/50 p-4 mt-4">
          <p className="text-xs text-tippd-ash leading-relaxed">
            API keys are set as environment variables in Vercel. Go to your Vercel project
            dashboard → Settings → Environment Variables to add or update keys.
            Changes require a redeploy to take effect.
          </p>
        </div>
      </div>
    </div>
  );
}
