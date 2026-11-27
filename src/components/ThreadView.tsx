"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { createBrowserSupabase } from "@/lib/supabase-browser";
import type { Message } from "@/lib/types";

/**
 * Two-way in-app chat between one customer and one business.
 * - Loads the thread, subscribes to Supabase Realtime inserts, and polls
 *   every 15 seconds as a fallback: a message sent on one side appears
 *   on the other without a manual refresh.
 * - Opening/reading the thread marks the other side's messages read,
 *   which clears the unread badges.
 * - Sending goes through POST /api/messages so the server can run the
 *   notification dispatcher (email / SMS / push alerts + audit log).
 */
export default function ThreadView({
  businessId,
  customerId,
  viewer,
  customerName,
  teamName,
  signatureName,
  senderNames,
}: {
  businessId: string;
  customerId: string;
  viewer: "customer" | "business";
  /** For the captions under bubbles (owner inbox): the customer's name. */
  customerName?: string;
  /** For the captions under bubbles: the business's name. Used for a
   *  business reply whose author is not recorded (rows sent before
   *  migration 0020, or a sender no longer on the team). */
  teamName?: string;
  /** Customer view only (Customer Side Plan, Frantz 2026-11-26):
   *  business bubbles carry a signature line inside the bubble with
   *  the sender's first name. The recorded sender's first name wins (migration 0020);
   *  this prop is the fallback for replies with no author recorded:
   *  the customer's own person's first name when they have one, else
   *  the business's name. */
  signatureName?: string;
  /** user id → display name for everyone who can speak for this
   *  business (owner + team), resolved server side. A business
   *  message with a recorded sender_user_id signs with that person's
   *  first name. */
  senderNames?: Record<string, string>;
}) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);
  // Unique realtime channel per mounted instance (same singleton-client
  // collision as UnreadBadge: a shared channel name throws when a second
  // instance adds callbacks after the first subscribed).
  const instanceId = useId().replace(/[^a-zA-Z0-9]/g, "");
  const otherSender = viewer === "customer" ? "business" : "customer";

  const markRead = useCallback(async () => {
    const supabase = createBrowserSupabase();
    await supabase
      .from("messages")
      .update({ read_at: new Date().toISOString() })
      .eq("business_id", businessId)
      .eq("customer_id", customerId)
      .eq("sender", otherSender)
      .is("read_at", null);
  }, [businessId, customerId, otherSender]);

  const load = useCallback(async () => {
    const supabase = createBrowserSupabase();
    const { data } = await supabase
      .from("messages")
      .select("*")
      .eq("business_id", businessId)
      .eq("customer_id", customerId)
      .order("created_at", { ascending: true })
      .limit(200);
    if (data) {
      setMessages(data as Message[]);
      if ((data as Message[]).some((m) => m.sender === otherSender && !m.read_at)) {
        await markRead();
      }
    }
  }, [businessId, customerId, otherSender, markRead]);

  useEffect(() => {
    load();
    const supabase = createBrowserSupabase();
    const channel = supabase
      .channel(`thread-${businessId}-${customerId}-${instanceId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `business_id=eq.${businessId}`,
        },
        (payload) => {
          const m = payload.new as Message;
          if (m.customer_id === customerId) load();
        }
      )
      .subscribe();
    const t = setInterval(load, 15000); // polling fallback
    return () => {
      supabase.removeChannel(channel);
      clearInterval(t);
    };
  }, [load, businessId, customerId, instanceId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    const body = draft.trim();
    if (!body || sending) return;
    setSending(true);
    setError("");
    try {
      const res = await fetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ businessId, customerId, body }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Message failed to send.");
      } else {
        setDraft("");
        await load();
      }
    } catch {
      setError("Message failed to send.");
    }
    setSending(false);
  }

  const dayLabel = (iso: string) => {
    const d = new Date(iso);
    const now = new Date();
    if (d.toDateString() === now.toDateString()) return "Today";
    if (d.toDateString() === new Date(now.getTime() - 86400000).toDateString()) return "Yesterday";
    return d.toLocaleDateString([], { weekday: "long", month: "short", day: "numeric" });
  };
  const timeLabel = (iso: string) =>
    new Date(iso).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  const firstNameOf = (n?: string) => (n ?? "").trim().split(/\s+/)[0] ?? "";

  let lastDay = "";
  return (
    <div>
      <div className="thread" style={{ marginBottom: 12 }}>
        {messages.length === 0 && (
          <p className="small">No messages yet. Say hello below.</p>
        )}
        {messages.map((m) => {
          const day = dayLabel(m.created_at);
          const showDay = day !== lastDay;
          lastDay = day;
          const mine = m.sender === viewer;
          const senderFirst = firstNameOf(
            m.sender_user_id ? senderNames?.[m.sender_user_id] : undefined
          );
          const caption =
            viewer === "business"
              ? m.sender === "customer"
                ? `${firstNameOf(customerName) || "Customer"} · ${timeLabel(m.created_at)} · in app`
                : `${senderFirst || teamName || "Your team"} · ${timeLabel(m.created_at)}${m.read_at ? " · Read" : ""}`
              : `${timeLabel(m.created_at)}`;
          const sig = senderFirst || signatureName;
          return (
            <div key={m.id} style={{ display: "contents" }}>
              {showDay && <div className="d2-daylabel">{day}</div>}
              <div className={mine ? "msg-wrap mine" : "msg-wrap"}>
                <div className={mine ? "bubble mine" : "bubble"}>
                  <div>{m.body}</div>
                  {viewer === "customer" && m.sender === "business" && sig && (
                    <div className="c3-sig">{sig}</div>
                  )}
                </div>
                <div className="msg-cap">{caption}</div>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>
      {error && <div className="error">{error}</div>}
      <form onSubmit={send}>
        <label className="field" style={{ marginBottom: 8 }}>
          <span>Your message</span>
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                e.currentTarget.form?.requestSubmit();
              }
            }}
            placeholder="Write a message…"
            aria-label="Your message"
            rows={2}
          />
        </label>
        <button className="btn btn-primary" type="submit" disabled={sending || !draft.trim()}>
          {sending ? "Sending…" : "Send message"}
        </button>
      </form>
    </div>
  );
}
