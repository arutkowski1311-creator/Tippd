import { MapPin, Truck, Clock, CheckCircle } from "lucide-react";

export default function TrackJob({ params }: { params: { jobId: string } }) {
  // TODO: Fetch job status from API using jobId
  return (
    <div className="max-w-lg mx-auto px-4 py-12">
      <h1 className="text-2xl font-bold mb-2">Track Your Dumpster</h1>
      <p className="text-gray-500 text-sm mb-8">Job #{params.jobId}</p>

      {/* Status timeline */}
      <div className="space-y-6">
        <TimelineStep
          icon={CheckCircle}
          title="Booking Confirmed"
          description="Your rental has been scheduled"
          status="complete"
        />
        <TimelineStep
          icon={Truck}
          title="En Route"
          description="Driver is on the way to your location"
          status="active"
        />
        <TimelineStep
          icon={MapPin}
          title="Delivered"
          description="Dumpster dropped at your address"
          status="pending"
        />
        <TimelineStep
          icon={Clock}
          title="In Use"
          description="Fill it up — request pickup when ready"
          status="pending"
        />
      </div>

      <div className="mt-10 rounded-xl border border-gray-200 p-6">
        <h2 className="font-semibold mb-2">Need to request pickup?</h2>
        <p className="text-sm text-gray-500 mb-4">
          Text &quot;PICKUP&quot; to your operator&apos;s number or tap below.
        </p>
        <button className="w-full py-3 bg-tippd-blue text-white rounded-md font-semibold hover:opacity-90">
          Request Pickup
        </button>
      </div>
    </div>
  );
}

function TimelineStep({
  icon: Icon,
  title,
  description,
  status,
}: {
  icon: React.ElementType;
  title: string;
  description: string;
  status: "complete" | "active" | "pending";
}) {
  return (
    <div className="flex gap-4">
      <div
        className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
          status === "complete"
            ? "bg-emerald-100 text-emerald-600"
            : status === "active"
            ? "bg-tippd-blue/10 text-tippd-blue"
            : "bg-gray-100 text-gray-400"
        }`}
      >
        <Icon className="w-5 h-5" />
      </div>
      <div>
        <p
          className={`font-medium ${
            status === "pending" ? "text-gray-400" : ""
          }`}
        >
          {title}
        </p>
        <p className="text-sm text-gray-500">{description}</p>
      </div>
    </div>
  );
}
