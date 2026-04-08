import Link from "next/link";
import { ArrowLeft, Plus, User } from "lucide-react";

const MOCK_USERS = [
  { name: "John Smith", role: "owner", email: "john@example.com", active: true },
  { name: "Jane Doe", role: "manager", email: "jane@example.com", active: true },
  { name: "Mike Rodriguez", role: "driver", email: "mike@example.com", active: true },
  { name: "Carlos Rivera", role: "driver", email: "carlos@example.com", active: true },
];

export default function UsersSettings() {
  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Link href="/dashboard/settings" className="text-tippd-smoke hover:text-white"><ArrowLeft className="w-5 h-5" /></Link>
          <h1 className="text-2xl font-bold text-white">User Management</h1>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 bg-tippd-blue text-white rounded-md text-sm font-semibold hover:opacity-90">
          <Plus className="w-4 h-4" /> Invite User
        </button>
      </div>
      <div className="space-y-2">
        {MOCK_USERS.map((u, i) => (
          <div key={i} className="rounded-lg border border-white/10 bg-tippd-charcoal p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-tippd-steel flex items-center justify-center"><User className="w-5 h-5 text-tippd-smoke" /></div>
              <div>
                <p className="text-sm font-medium text-white">{u.name}</p>
                <p className="text-xs text-tippd-ash">{u.email}</p>
              </div>
            </div>
            <span className="px-2 py-0.5 bg-tippd-steel rounded text-xs text-tippd-smoke capitalize">{u.role}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
