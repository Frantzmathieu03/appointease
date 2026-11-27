"use client";

import { useCallback, useEffect, useId, useState } from "react";
import { createBrowserSupabase } from "@/lib/supabase-browser";
import { isSupabaseConfigured } from "@/lib/supabase-config";

/**
 * New-bookings count badge for the Appointments menu item, mirroring
 * UnreadBadge: the count of appointments nobody on the team has
 * opened yet (appointments.owner_seen_at is null, not cancelled,
 * migration 0018). Updates live via Supabase Realtime on the
 * appointments table, with a 30-second polling fallback.
 *
 * Feature detection: before migration 0018 lands, the count query
 * errors on the missing column and the badge simply never renders.
 * Staff logins (memberStaffId set) count only bookings for their
 * assigned customers, matching the rest of the dashboard.
 *
 * The realtime channel name is unique per mounted instance (useId):
 * the browser Supabase client is a singleton, and reusing a channel
 * name after subscribe() throws. That was the dashboard crash fixed
 * in UnreadBadge; the same rule is kept here.
 */
export default function NewBookingsBadge({
  businessId,
  memberStaffId,
}: {
  businessId: string;
  memberStaffId?: string | null;
}) {
  const [count, setCount] = useState(0);
  const instanceId = useId().replace(/[^a-zA-Z0-9]/g, "");

  const load = useCallback(async () => {
    if (!isSupabaseConfigured()) return;
    const supabase = createBrowserSupabase();
    let customerIds: string[] | null = null;
    if (memberStaffId) {
      const { data: rels } = await supabase
        .from("business_customers")
        .select("customer_id")
        .eq("business_id", businessId)
        .eq("assigned_staff_id", memberStaffId);
      customerIds = (rels ?? []).map((r) => r.customer_id as string);
      if (customerIds.length === 0) {
        setCount(0);
        return;
      }
    }
    let q = supabase
      .from("appointments")
      .select("id", { count: "exact", head: true })
      .eq("business_id", businessId)
      .is("owner_seen_at", null)
      .neq("status", "cancelled");
    if (customerIds) q = q.in("customer_id", customerIds);
    const { count: c, error } = await q;
    if (error) {
      // Column missing (pre-0018) or a transient failure: no badge.
      setCount(0);
      return;
    }
    setCount(c ?? 0);
  }, [businessId, memberStaffId]);

  useEffect(() => {
    load();
    if (!isSupabaseConfigured()) return;
    const supabase = createBrowserSupabase();
    const channel = supabase
      .channel(`new-bookings-${businessId}-${instanceId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "appointments" },
        () => load()
      )
      .subscribe();
    const t = setInterval(load, 30000);
    return () => {
      supabase.removeChannel(channel);
      clearInterval(t);
    };
  }, [load, businessId, instanceId]);

  if (count === 0) return null;
  return <span className="badge">{count}</span>;
}
