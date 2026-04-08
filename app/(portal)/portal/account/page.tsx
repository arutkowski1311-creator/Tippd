"use client";

import { CreditCard } from "lucide-react";

export default function PortalAccount() {
  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Account Settings</h1>

      {/* Contact info */}
      <div className="rounded-lg border border-gray-200 bg-white p-5 mb-4">
        <h2 className="font-semibold mb-3">Contact Information</h2>
        <div className="space-y-3">
          <div><label className="block text-sm text-gray-500 mb-1">Company Name</label><input defaultValue="Premier Roofing LLC" className="w-full h-10 px-3 rounded-md border border-gray-300 text-sm" /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="block text-sm text-gray-500 mb-1">Phone</label><input defaultValue="(555) 777-8888" className="w-full h-10 px-3 rounded-md border border-gray-300 text-sm" /></div>
            <div><label className="block text-sm text-gray-500 mb-1">Email</label><input defaultValue="billing@premierroofing.com" className="w-full h-10 px-3 rounded-md border border-gray-300 text-sm" /></div>
          </div>
          <div><label className="block text-sm text-gray-500 mb-1">Billing Address</label><input defaultValue="100 Main St, Springfield NJ" className="w-full h-10 px-3 rounded-md border border-gray-300 text-sm" /></div>
        </div>
        <button className="mt-4 px-4 py-2 bg-tippd-blue text-white rounded-md text-sm font-semibold hover:opacity-90">Save Changes</button>
      </div>

      {/* Payment */}
      <div className="rounded-lg border border-gray-200 bg-white p-5 mb-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold">Payment Method</h2>
          <CreditCard className="w-5 h-5 text-gray-400" />
        </div>
        <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
          <div className="flex items-center gap-3">
            <div className="w-10 h-7 bg-blue-600 rounded flex items-center justify-center text-white text-xs font-bold">VISA</div>
            <span className="text-sm">Ending in 4242</span>
          </div>
          <button className="text-xs text-tippd-blue hover:underline">Update</button>
        </div>
      </div>

      {/* Autopay */}
      <div className="rounded-lg border border-gray-200 bg-white p-5">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-semibold">Autopay</h2>
            <p className="text-sm text-gray-500 mt-1">Automatically pay invoices when issued</p>
          </div>
          <button className="relative w-12 h-7 rounded-full bg-emerald-500 transition-colors">
            <span className="absolute right-1 top-1 w-5 h-5 rounded-full bg-white shadow transition-transform" />
          </button>
        </div>
        <p className="text-xs text-gray-400 mt-2">Autopay earns an automatic 2% early payment discount</p>
      </div>
    </div>
  );
}
