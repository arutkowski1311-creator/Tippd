import Link from "next/link";
import { Palette, DollarSign, Users, Plug } from "lucide-react";

const SETTINGS_SECTIONS = [
  { href: "/dashboard/settings/brand", icon: Palette, title: "Brand Profile", desc: "Logo, colors, contact info, domain" },
  { href: "/dashboard/settings/pricing", icon: DollarSign, title: "Pricing", desc: "Base rates, weight rate, overage, discounts" },
  { href: "/dashboard/settings/users", icon: Users, title: "User Management", desc: "Invite drivers and managers, manage roles" },
  { href: "/dashboard/settings/integrations", icon: Plug, title: "Integrations", desc: "Twilio, Stripe, Google, Resend status" },
];

export default function SettingsPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold text-white mb-6">Settings</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {SETTINGS_SECTIONS.map((s) => (
          <Link
            key={s.href}
            href={s.href}
            className="rounded-lg border border-white/10 bg-tippd-charcoal p-5 hover:border-tippd-blue/50 transition-colors"
          >
            <s.icon className="w-6 h-6 text-tippd-blue mb-3" />
            <h2 className="text-sm font-semibold text-white">{s.title}</h2>
            <p className="text-xs text-tippd-ash mt-1">{s.desc}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
