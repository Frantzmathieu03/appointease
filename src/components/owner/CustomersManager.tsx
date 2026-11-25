"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createBrowserSupabase } from "@/lib/supabase-browser";
import type { StaffMember } from "@/lib/types";
import { formatPhone } from "@/lib/types";

export interface CustomerRow {
  id: string;
  full_name: string;
  email: string | null;
  phone: string | null;
  assigned_staff_id: string | null;
  total: number;
  lastLabel: string | null;
  unread: number;
}

/**
 * Customers list with per-row assignment and bulk "Assign to…"
 * (PDF §4 / migration 0010). Selection is local state; assignments write
 * through the browser client under the owner's RLS policies and each one
 * appends an `assigned` timeline event.
 */
export default function CustomersManager({
  businessId,
  actorId,
  staff,
  rows,
}: {
  businessId: string;
  actorId: string;
  staff: StaffMember[];
  rows: CustomerRow[];
}) {
  const router = useRouter();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkStaff, setBulkStaff] = useState("");
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState("");

  const staffName = (id: string | null) => staff.find((s) => s.id === id)?.name ?? null;

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function applyBulk() {
    if (selected.size === 0) return;
    setBusy(true);
    setNote("");
    const supabase = createBrowserSupabase();
    const toName = staffName(bulkStaff || null);
    let failed = false;
    for (const customerId of selected) {
      const row = rows.find((r) => r.id === customerId);
      const { error } = await supabase
        .from("business_customers")
        .update({ assigned_staff_id: bulkStaff || null })
        .eq("business_id", businessId)
        .eq("customer_id", customerId);
      if (error) {
        failed = true;
        break;
      }
      await supabase.from("customer_events").insert({
        business_id: businessId,
        customer_id: customerId,
        type: "assigned",
        actor_type: "team_member",
        actor_id: actorId,
        details: {
          from_staff_id: row?.assigned_staff_id ?? null,
          from_staff_name: staffName(row?.assigned_staff_id ?? null),
          to_staff_id: bulkStaff || null,
          to_staff_name: toName,
          bulk: true,
        },
      });
    }
    setBusy(false);
    if (failed) {
      setNote("Assignment isn't available yet — it turns on with the next database update.");
      return;
    }
    setSelected(new Set());
    router.refresh();
  }

  if (rows.length === 0) {
    return (
      <div className="card">
        <p className="lede" style={{ marginBottom: 0 }}>
          No customers yet — the first person who books or messages you appears here.
        </p>
      </div>
    );
  }

  return (
    <div>
      {selected.size > 0 && (
        <div className="card" style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          <strong>
            {selected.size} selected — Assign to…
          </strong>
          <select
            aria-label="Assign selected customers to"
            value={bulkStaff}
            onChange={(e) => setBulkStaff(e.target.value)}
            style={{ maxWidth: 220 }}
          >
            <option value="">Unassigned</option>
            {staff.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
          <button className="btn btn-primary" onClick={applyBulk} disabled={busy}>
            {busy ? "Assigning…" : "Apply"}
          </button>
          <button className="btn" onClick={() => setSelected(new Set())} disabled={busy}>
            Clear
          </button>
          {note && <span className="small">{note}</span>}
        </div>
      )}
      {rows.map((c) => (
        <div
          className="card"
          key={c.id}
          style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center" }}
        >
          <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
            <input
              type="checkbox"
              aria-label={`Select ${c.full_name || "customer"}`}
              checked={selected.has(c.id)}
              onChange={() => toggle(c.id)}
              style={{ marginTop: 4 }}
            />
            <div>
              <h3 style={{ marginBottom: 2 }}>{c.full_name || "Customer"}</h3>
              <p className="small" style={{ margin: 0 }}>
                {[c.phone ? formatPhone(c.phone) : null, c.email].filter(Boolean).join(" · ")}
                {c.total > 0
                  ? ` · ${c.total} appointment${c.total === 1 ? "" : "s"}` +
                    (c.lastLabel ? ` · last ${c.lastLabel}` : "")
                  : ""}
              </p>
              <p className="small" style={{ margin: "2px 0 0" }}>
                Assigned to: <strong>{staffName(c.assigned_staff_id) ?? "Unassigned"}</strong>
              </p>
            </div>
          </div>
          <Link href={`/owner/dashboard/customers/${c.id}`} className="btn">
            Open profile
            {c.unread > 0 && <span className="badge">{c.unread}</span>}
          </Link>
        </div>
      ))}
    </div>
  );
}
