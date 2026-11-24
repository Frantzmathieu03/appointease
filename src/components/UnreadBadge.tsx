"use client";

import { useCallback, useEffect, useState } from "react";
import { createBrowserSupabase } from "@/lib/supabase-browser";
import { isSupabaseConfigured } from "@/lib/supabase-config";

/**
 * Exact unread-message count badge (owner requirement, 2026-11-24):
 * 1 unread message shows "1", 2 shows "2" — visible without opening the
 * inbox. Updates live via Supabase Realtime on the messages table, with a
 * 30-second polling fallback so a missed event never leaves a stale count.
 * RLS scopes every count: a customer only ever counts their own threads;
 * an owner only counts threads inside their own business.
 */
export default function UnreadBadge({
  variant,
  businessId,
}: {
  variant: "customer" | "owner";
  businessId?: string;
}) {
  const [count, setCount] = useState(0);

  const load = useCallback(async () => {
    if (!isSupabaseConfigured()) return;
    const supabase = createBrowserSupabase();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setCount(0);
      return;
    }
    let q = supabase
      .from("messages")
      .select("id", { count: "exact", head: true })
      .is("read_at", null);
    if (variant === "customer") {
      q = q.eq("customer_id", user.id).eq("sender", "business");
    } else {
      q = q.eq("sender", "customer");
    }
    if (businessId) q = q.eq("business_id", businessId);
    const { count: c } = await q;
    setCount(c ?? 0);
  }, [variant, businessId]);

  useEffect(() => {
    load();
    if (!isSupabaseConfigured()) return;
    const supabase = createBrowserSupabase();
    const channel = supabase
      .channel(`unread-${variant}-${businessId ?? "all"}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "messages" },
        () => load()
      )
      .subscribe();
    const t = setInterval(load, 30000);
    return () => {
      supabase.removeChannel(channel);
      clearInterval(t);
    };
  }, [load, variant, businessId]);

  if (count === 0) return null;
  return <span className="badge">{count}</span>;
}
