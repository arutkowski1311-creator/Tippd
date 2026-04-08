import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default function PricingSettings() {
  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <Link href="/dashboard/settings" className="text-tippd-smoke hover:text-white"><ArrowLeft className="w-5 h-5" /></Link>
        <h1 className="text-2xl font-bold text-white">Pricing Configuration</h1>
      </div>
      <div className="max-w-lg rounded-lg border border-white/10 bg-tippd-charcoal p-6 space-y-4">
        <h2 className="text-sm font-medium text-tippd-smoke">Base Rates</h2>
        <div className="grid grid-cols-3 gap-4">
          <div><label className="block text-xs text-tippd-ash mb-1">10 Yard</label><input defaultValue="550" className="w-full h-10 px-3 rounded-md bg-tippd-steel border border-white/10 text-white text-sm" /></div>
          <div><label className="block text-xs text-tippd-ash mb-1">20 Yard</label><input defaultValue="750" className="w-full h-10 px-3 rounded-md bg-tippd-steel border border-white/10 text-white text-sm" /></div>
          <div><label className="block text-xs text-tippd-ash mb-1">30 Yard</label><input defaultValue="850" className="w-full h-10 px-3 rounded-md bg-tippd-steel border border-white/10 text-white text-sm" /></div>
        </div>
        <h2 className="text-sm font-medium text-tippd-smoke pt-2">Overage</h2>
        <div className="grid grid-cols-3 gap-4">
          <div><label className="block text-xs text-tippd-ash mb-1">Overage Rate ($/ton)</label><input defaultValue="150" className="w-full h-10 px-3 rounded-md bg-tippd-steel border border-white/10 text-white text-sm" /></div>
          <div><label className="block text-xs text-tippd-ash mb-1">Daily Overage ($/day)</label><input defaultValue="25" className="w-full h-10 px-3 rounded-md bg-tippd-steel border border-white/10 text-white text-sm" /></div>
          <div><label className="block text-xs text-tippd-ash mb-1">Weight Rate ($/lb)</label><input defaultValue="0.05" className="w-full h-10 px-3 rounded-md bg-tippd-steel border border-white/10 text-white text-sm" /></div>
        </div>
        <h2 className="text-sm font-medium text-tippd-smoke pt-2">Rental Terms</h2>
        <div className="grid grid-cols-2 gap-4">
          <div><label className="block text-xs text-tippd-ash mb-1">Standard Rental Days</label><input defaultValue="7" className="w-full h-10 px-3 rounded-md bg-tippd-steel border border-white/10 text-white text-sm" /></div>
          <div><label className="block text-xs text-tippd-ash mb-1">Quote Expiry Days</label><input defaultValue="7" className="w-full h-10 px-3 rounded-md bg-tippd-steel border border-white/10 text-white text-sm" /></div>
        </div>
        <button className="w-full py-2.5 bg-tippd-blue text-white rounded-md text-sm font-semibold hover:opacity-90">Save Pricing</button>
      </div>
    </div>
  );
}
