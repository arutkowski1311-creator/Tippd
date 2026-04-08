import Link from "next/link";
import { CheckCircle, Truck, Clock, MapPin, Scale } from "lucide-react";

export default function DriverEndOfDay() {
  return (
    <div className="p-4 pb-24">
      <div className="text-center py-8">
        <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-4">
          <CheckCircle className="w-8 h-8 text-emerald-600" />
        </div>
        <h1 className="text-2xl font-bold">Route Complete!</h1>
        <p className="text-gray-500 mt-1">Great work today</p>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        <div className="rounded-2xl border-2 border-gray-200 p-4 text-center">
          <Truck className="w-6 h-6 text-tippd-blue mx-auto mb-1" />
          <p className="text-2xl font-bold">5</p>
          <p className="text-xs text-gray-500">Jobs Completed</p>
        </div>
        <div className="rounded-2xl border-2 border-gray-200 p-4 text-center">
          <MapPin className="w-6 h-6 text-tippd-blue mx-auto mb-1" />
          <p className="text-2xl font-bold">42</p>
          <p className="text-xs text-gray-500">Miles Driven</p>
        </div>
        <div className="rounded-2xl border-2 border-gray-200 p-4 text-center">
          <Clock className="w-6 h-6 text-tippd-blue mx-auto mb-1" />
          <p className="text-2xl font-bold">7.5h</p>
          <p className="text-xs text-gray-500">Hours Logged</p>
        </div>
        <div className="rounded-2xl border-2 border-gray-200 p-4 text-center">
          <Scale className="w-6 h-6 text-tippd-blue mx-auto mb-1" />
          <p className="text-2xl font-bold">4.2t</p>
          <p className="text-xs text-gray-500">Total Weight</p>
        </div>
      </div>

      {/* Job summary */}
      <div className="rounded-2xl border-2 border-gray-200 p-4 mb-6">
        <h2 className="font-semibold mb-3">Completed Stops</h2>
        <div className="space-y-2">
          {[
            { customer: "Johnson", type: "Drop", time: "9:15 AM" },
            { customer: "Williams", type: "Drop", time: "10:45 AM" },
            { customer: "Chen", type: "Pickup", time: "12:20 PM" },
            { customer: "Roberts", type: "Drop", time: "2:10 PM" },
            { customer: "Premier Roofing", type: "Pickup", time: "3:45 PM" },
          ].map((stop, i) => (
            <div key={i} className="flex items-center justify-between text-sm py-1 border-b border-gray-100 last:border-0">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-emerald-500" />
                <span>{stop.customer}</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs text-gray-500">{stop.type}</span>
                <span className="text-xs text-gray-400">{stop.time}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      <Link
        href="/driver"
        className="block w-full py-4 bg-tippd-blue text-white rounded-2xl text-center text-lg font-bold active:opacity-80"
      >
        Done
      </Link>
    </div>
  );
}
