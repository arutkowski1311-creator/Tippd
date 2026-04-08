import { cn } from "@/lib/utils";

const MOCK_INVOICES = [
  { id: "1", amount: 845, status: "sent", date: "Mar 24", due: "Apr 23" },
  { id: "2", amount: 400, status: "paid", date: "Mar 10", due: "Apr 9" },
  { id: "3", amount: 315, status: "paid", date: "Feb 20", due: "Mar 22" },
];

export default function PortalInvoices() {
  const outstanding = MOCK_INVOICES.filter((i) => i.status !== "paid").reduce((s, i) => s + i.amount, 0);
  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Invoices</h1>
        <div className="text-right">
          <p className="text-xs text-gray-500">Outstanding</p>
          <p className="text-xl font-bold text-tippd-blue">${outstanding.toLocaleString()}</p>
        </div>
      </div>
      <div className="space-y-3">
        {MOCK_INVOICES.map((inv) => (
          <div key={inv.id} className="rounded-lg border border-gray-200 bg-white p-4 flex items-center justify-between">
            <div>
              <p className="font-medium">${inv.amount.toLocaleString()}</p>
              <p className="text-sm text-gray-500">Issued {inv.date} — Due {inv.due}</p>
            </div>
            <div className="flex items-center gap-3">
              <span className={cn(
                "px-2.5 py-0.5 rounded-full text-xs font-medium",
                inv.status === "paid" ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"
              )}>
                {inv.status === "paid" ? "Paid" : "Due"}
              </span>
              {inv.status !== "paid" && (
                <button className="px-3 py-1.5 bg-tippd-blue text-white rounded-md text-xs font-semibold hover:opacity-90">
                  Pay Now
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
