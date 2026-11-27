"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { createBrowserSupabase } from "@/lib/supabase-browser";
import { planById, seatLimitMessage, type Plan } from "@/lib/plans";
import type { StaffMember } from "@/lib/types";

/**
 * Bookable staff calendars. Plan team-size bands live in
 * src/lib/plans.ts (Solo 1 person · Team 2 to 5 people · Business
 * 6 to 15 people with a calendar, owner included: Frantz, 2026-11-26,
 * range wording 2026-11-27). Adding past
 * the cap stops with the upgrade prompt, here in the UI and again on
 * the server (the invite route, and a database trigger in migration
 * 0015 for direct inserts like this one).
 */
export default function StaffManager({ businessId }: { businessId: string }) {
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [plan, setPlan] = useState<Plan | null>(null);
  const [limitHit, setLimitHit] = useState(false);

  const load = useCallback(async () => {
    const supabase = createBrowserSupabase();
    const [{ data }, { data: biz }] = await Promise.all([
      supabase
        .from("staff")
        .select("*")
        .eq("business_id", businessId)
        .eq("active", true)
        .order("created_at", { ascending: true }),
      supabase.from("businesses").select("plan").eq("id", businessId).maybeSingle(),
    ]);
    setStaff((data ?? []) as StaffMember[]);
    if (biz) setPlan(planById((biz as { plan: string }).plan));
  }, [businessId]);

  useEffect(() => {
    load();
  }, [load]);

  const atCap = plan !== null && staff.length >= plan.staffLimit;

  async function add(e: React.FormEvent) {
    e.preventDefault();
    // At the plan's cap the add stops here with the upgrade prompt;
    // the invite route and (once migration 0015 lands) a database
    // trigger enforce the same limit on the server.
    if (atCap) {
      setLimitHit(true);
      return;
    }
    setBusy(true);
    const supabase = createBrowserSupabase();
    const { error } = await supabase
      .from("staff")
      .insert({ business_id: businessId, name: name.trim() });
    if (error && /seat limit/i.test(error.message)) setLimitHit(true);
    setName("");
    setBusy(false);
    load();
  }

  async function remove(m: StaffMember) {
    const ok = window.confirm(
      `Remove ${m.name} from bookable staff? They'll disappear from your booking page and take no new bookings. Their existing appointments and history stay as they are.`
    );
    if (!ok) return;
    const supabase = createBrowserSupabase();
    await supabase.from("staff").update({ active: false }).eq("id", m.id);
    load();
  }

  return (
    <div>
      {staff.length === 0 && (
        <p className="small">No team members yet. Add the people customers can book with. For a solo shop, that&apos;s you.</p>
      )}
      {staff.map((m) => (
        <div key={m.id} className="service-row">
          <div>
            <div className="service-name">{m.name}</div>
            <div className="service-meta">Bookable staff</div>
          </div>
          <button className="btn" style={{ padding: "7px 13px" }} onClick={() => remove(m)}>
            Remove
          </button>
        </div>
      ))}
      {limitHit && plan ? (
        <div className="notice" style={{ marginTop: 14 }}>
          <p style={{ margin: "0 0 10px" }}>{seatLimitMessage(plan)}</p>
          {plan.id !== "business" && (
            <Link href="/owner/dashboard/billing" className="btn btn-primary">
              Go to Billing
            </Link>
          )}
        </div>
      ) : (
        <form onSubmit={add} style={{ display: "flex", gap: 8, marginTop: 14 }}>
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Staff name" required aria-label="Staff name" />
          <button className="btn btn-primary" type="submit" disabled={busy || !name.trim()}>
            Add staff member
          </button>
        </form>
      )}
      <p className="small" style={{ marginTop: 10 }}>
        {staff.length} active. Solo is 1 person, Team is 2 to 5 people, Business is 6 to 15 people.
      </p>
    </div>
  );
}
