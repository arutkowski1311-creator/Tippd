"use client";

import { useState, useEffect, useCallback } from "react";
import { cn } from "@/lib/utils";
import {
  MessageSquare, Phone, Mail, Sparkles, Send, ArrowLeft,
  Calendar, PhoneCall, X, Loader2, User, Clock,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type Comm = {
  id: string;
  customer_id: string | null;
  customer_name: string | null;
  customer_phone: string | null;
  channel: string;
  direction: string;
  message: string;
  intent: string | null;
  status: string;
  created_at: string;
  read: boolean;
};

const INTENT_COLORS: Record<string, string> = {
  pickup_request: "bg-blue-900/30 text-blue-400",
  reschedule: "bg-amber-900/30 text-amber-400",
  complaint: "bg-red-900/30 text-red-400",
  drop_request: "bg-green-900/30 text-green-400",
  booking: "bg-green-900/30 text-green-400",
  payment: "bg-purple-900/30 text-purple-400",
  general: "bg-gray-700/30 text-gray-400",
  other: "bg-gray-700/30 text-gray-400",
};

const INTENT_ACTIONS: Record<string, { label: string; icon: React.ElementType; action: string }[]> = {
  pickup_request: [
    { label: "Schedule Pickup", icon: Calendar, action: "schedule_pickup" },
    { label: "Reply", icon: Send, action: "reply" },
  ],
  reschedule: [
    { label: "Check Availability", icon: Calendar, action: "check_availability" },
    { label: "Reply", icon: Send, action: "reply" },
  ],
  drop_request: [
    { label: "Create Booking", icon: Calendar, action: "create_booking" },
    { label: "Reply", icon: Send, action: "reply" },
  ],
  booking: [
    { label: "Create Booking", icon: Calendar, action: "create_booking" },
    { label: "Reply", icon: Send, action: "reply" },
  ],
  complaint: [
    { label: "Call Back", icon: PhoneCall, action: "callback" },
    { label: "Reply", icon: Send, action: "reply" },
  ],
};

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

export default function CommsPage() {
  const [comms, setComms] = useState<Comm[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Comm | null>(null);
  const [replyText, setReplyText] = useState("");
  const [sending, setSending] = useState(false);
  const [thread, setThread] = useState<Comm[]>([]);
  const [actionFeedback, setActionFeedback] = useState<string | null>(null);

  const supabase = createClient();

  const loadComms = useCallback(async () => {
    const { data } = await supabase
      .from("communications")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(50);
    if (data) setComms(data as Comm[]);
    setLoading(false);
  }, []);

  useEffect(() => { loadComms(); }, [loadComms]);

  // Load thread for selected conversation
  const loadThread = useCallback(async (comm: Comm) => {
    if (!comm.customer_phone) {
      setThread([comm]);
      return;
    }
    const { data } = await supabase
      .from("communications")
      .select("*")
      .eq("customer_phone", comm.customer_phone)
      .order("created_at", { ascending: true })
      .limit(100);
    setThread((data as Comm[]) || [comm]);
  }, []);

  const openConversation = (comm: Comm) => {
    setSelected(comm);
    setReplyText("");
    setActionFeedback(null);
    loadThread(comm);
    // Mark as read
    if (!comm.read) {
      supabase.from("communications").update({ read: true }).eq("id", comm.id).then(() => {
        setComms((prev) => prev.map((c) => c.id === comm.id ? { ...c, read: true } : c));
      });
    }
  };

  const handleAction = async (action: string) => {
    if (!selected) return;
    setActionFeedback(null);

    switch (action) {
      case "schedule_pickup":
        // Create action item for scheduling
        await supabase.from("action_items").insert({
          operator_id: (await supabase.from("operators").select("id").limit(1).single()).data?.id,
          type: "pickup_request",
          priority: "normal",
          title: `Schedule pickup for ${selected.customer_name || "Unknown"}`,
          description: `Customer requested pickup via SMS: "${selected.message}". Phone: ${selected.customer_phone}`,
          customer_name: selected.customer_name,
          customer_phone: selected.customer_phone,
          customer_id: selected.customer_id,
          status: "open",
        });
        setActionFeedback("✅ Pickup request sent to Action Center");
        break;

      case "check_availability":
        await supabase.from("action_items").insert({
          operator_id: (await supabase.from("operators").select("id").limit(1).single()).data?.id,
          type: "reschedule_request",
          priority: "normal",
          title: `Reschedule request from ${selected.customer_name || "Unknown"}`,
          description: `Customer wants to reschedule: "${selected.message}". Phone: ${selected.customer_phone}`,
          customer_name: selected.customer_name,
          customer_phone: selected.customer_phone,
          customer_id: selected.customer_id,
          status: "open",
        });
        setActionFeedback("✅ Reschedule request sent to Action Center");
        break;

      case "create_booking":
        await supabase.from("action_items").insert({
          operator_id: (await supabase.from("operators").select("id").limit(1).single()).data?.id,
          type: "new_booking",
          priority: "normal",
          title: `New booking request from ${selected.customer_name || "Unknown"}`,
          description: `Customer wants a dumpster: "${selected.message}". Phone: ${selected.customer_phone}`,
          customer_name: selected.customer_name,
          customer_phone: selected.customer_phone,
          customer_id: selected.customer_id,
          status: "open",
        });
        setActionFeedback("✅ Booking request sent to Action Center");
        break;

      case "callback":
        await supabase.from("action_items").insert({
          operator_id: (await supabase.from("operators").select("id").limit(1).single()).data?.id,
          type: "callback_request",
          priority: "high",
          title: `Callback needed: ${selected.customer_name || "Unknown"}`,
          description: `Customer complaint via SMS: "${selected.message}". Phone: ${selected.customer_phone}`,
          customer_name: selected.customer_name,
          customer_phone: selected.customer_phone,
          customer_id: selected.customer_id,
          status: "open",
        });
        setActionFeedback("✅ Callback flagged in Action Center");
        break;

      case "reply":
        // Just focus the reply input
        break;
    }
  };

  const sendReply = async () => {
    if (!replyText.trim() || !selected) return;
    setSending(true);

    // Save to DB
    const opRes = await supabase.from("operators").select("id").limit(1).single();
    await supabase.from("communications").insert({
      operator_id: opRes.data?.id,
      customer_id: selected.customer_id,
      customer_name: selected.customer_name,
      customer_phone: selected.customer_phone,
      channel: "sms",
      direction: "outbound",
      message: replyText.trim(),
      status: "sent",
      read: true,
    });

    // Add to thread
    setThread((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        customer_id: selected.customer_id,
        customer_name: "Metro Waste",
        customer_phone: selected.customer_phone,
        channel: "sms",
        direction: "outbound",
        message: replyText.trim(),
        intent: null,
        status: "sent",
        created_at: new Date().toISOString(),
        read: true,
      },
    ]);

    setReplyText("");
    setSending(false);
    setActionFeedback("✅ Reply saved (SMS will send when Twilio 10DLC is approved)");
  };

  const unreadCount = comms.filter((c) => !c.read).length;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-6 h-6 animate-spin text-tippd-blue" />
      </div>
    );
  }

  // ─── Thread View ───
  if (selected) {
    const actions = INTENT_ACTIONS[selected.intent || ""] || [
      { label: "Reply", icon: Send, action: "reply" },
    ];

    return (
      <div className="flex flex-col h-[calc(100vh-120px)]">
        {/* Header */}
        <div className="flex items-center gap-3 pb-4 border-b border-white/10">
          <button onClick={() => setSelected(null)} className="p-2 rounded hover:bg-white/5">
            <ArrowLeft className="w-5 h-5 text-tippd-smoke" />
          </button>
          <div className="flex-1">
            <h2 className="text-lg font-semibold text-white">{selected.customer_name || "Unknown"}</h2>
            <p className="text-xs text-tippd-ash">{selected.customer_phone || "No phone"}</p>
          </div>
          {selected.intent && (
            <span className={cn("px-2 py-1 rounded text-xs font-medium flex items-center gap-1", INTENT_COLORS[selected.intent] || INTENT_COLORS.other)}>
              <Sparkles className="w-3 h-3" />
              {selected.intent.replace(/_/g, " ")}
            </span>
          )}
        </div>

        {/* Action buttons */}
        <div className="flex gap-2 py-3 border-b border-white/10">
          {actions.map((a) => (
            <button
              key={a.action}
              onClick={() => handleAction(a.action)}
              className={cn(
                "px-3 py-2 rounded text-xs font-medium flex items-center gap-1.5 transition-colors",
                a.action === "reply"
                  ? "border border-white/10 text-tippd-smoke hover:text-white hover:border-white/20"
                  : "bg-tippd-blue text-white hover:opacity-90"
              )}
            >
              <a.icon className="w-3.5 h-3.5" />
              {a.label}
            </button>
          ))}
          {selected.customer_phone && (
            <a
              href={`tel:${selected.customer_phone}`}
              className="px-3 py-2 rounded text-xs font-medium flex items-center gap-1.5 border border-white/10 text-tippd-smoke hover:text-white"
            >
              <Phone className="w-3.5 h-3.5" />
              Call
            </a>
          )}
        </div>

        {actionFeedback && (
          <div className="mt-2 px-3 py-2 rounded bg-tippd-green/10 text-tippd-green text-sm">
            {actionFeedback}
          </div>
        )}

        {/* Thread */}
        <div className="flex-1 overflow-y-auto py-4 space-y-3">
          {thread.map((msg) => (
            <div
              key={msg.id}
              className={cn(
                "max-w-[80%] rounded-xl px-4 py-2.5",
                msg.direction === "outbound"
                  ? "ml-auto bg-tippd-blue text-white"
                  : "bg-tippd-charcoal border border-white/10 text-white"
              )}
            >
              <p className="text-sm">{msg.message}</p>
              <p className={cn("text-[10px] mt-1", msg.direction === "outbound" ? "text-blue-200" : "text-tippd-ash")}>
                {timeAgo(msg.created_at)}
              </p>
            </div>
          ))}
        </div>

        {/* Reply input */}
        <div className="flex gap-2 pt-3 border-t border-white/10">
          <input
            type="text"
            value={replyText}
            onChange={(e) => setReplyText(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && sendReply()}
            placeholder="Type a reply..."
            className="flex-1 px-4 py-2.5 rounded-lg bg-tippd-charcoal border border-white/10 text-white text-sm placeholder:text-tippd-ash focus:outline-none focus:border-tippd-blue"
          />
          <button
            onClick={sendReply}
            disabled={!replyText.trim() || sending}
            className="px-4 py-2.5 bg-tippd-blue text-white rounded-lg text-sm font-medium hover:opacity-90 disabled:opacity-50"
          >
            {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </button>
        </div>
      </div>
    );
  }

  // ─── Inbox View ───
  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Communications</h1>
          <p className="text-sm text-tippd-smoke mt-1">
            {unreadCount > 0 ? `${unreadCount} unread messages` : "All caught up"}
          </p>
        </div>
      </div>

      {comms.length === 0 ? (
        <div className="text-center py-16">
          <MessageSquare className="w-12 h-12 text-tippd-ash mx-auto mb-3" />
          <p className="text-tippd-smoke">No messages yet</p>
          <p className="text-sm text-tippd-ash mt-1">
            Messages will appear here when customers text the Metro Waste number
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {comms.map((comm) => (
            <div
              key={comm.id}
              onClick={() => openConversation(comm)}
              className={cn(
                "rounded-lg border p-4 transition-colors cursor-pointer hover:border-tippd-blue/50 active:bg-tippd-charcoal/80",
                !comm.read ? "border-white/10 bg-tippd-charcoal" : "border-white/5 bg-tippd-charcoal/50"
              )}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3 flex-1 min-w-0">
                  <div className="w-8 h-8 rounded-full bg-tippd-steel flex items-center justify-center shrink-0 mt-0.5">
                    {comm.channel === "sms" ? (
                      <MessageSquare className="w-4 h-4 text-tippd-smoke" />
                    ) : comm.channel === "voicemail" ? (
                      <Phone className="w-4 h-4 text-tippd-smoke" />
                    ) : (
                      <Mail className="w-4 h-4 text-tippd-smoke" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className={cn("text-sm font-medium", !comm.read ? "text-white" : "text-tippd-smoke")}>
                        {comm.customer_name || comm.customer_phone || "Unknown"}
                      </p>
                      {!comm.read && <span className="w-2 h-2 rounded-full bg-tippd-blue" />}
                    </div>
                    <p className="text-sm text-tippd-ash mt-0.5 truncate">{comm.message}</p>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1 shrink-0">
                  <span className="text-xs text-tippd-ash">{timeAgo(comm.created_at)}</span>
                  {comm.intent && (
                    <span
                      className={cn(
                        "px-2 py-0.5 rounded text-xs font-medium flex items-center gap-1",
                        INTENT_COLORS[comm.intent] || INTENT_COLORS.other
                      )}
                    >
                      <Sparkles className="w-3 h-3" />
                      {comm.intent.replace(/_/g, " ")}
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
