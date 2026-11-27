"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createBrowserSupabase } from "@/lib/supabase-browser";
import type { StaffMember } from "@/lib/types";

/**
 * "Assigned to: <name> [Change]": per-business client assignment
 * (business_customers.assigned_staff_id, migration 0010). Every change
 * also appends an `assigned` row to the customer's timeline. Until
 * migration 0010 is applied the update fails softly with a note.
 */
export default function AssignControl({
  businessId,
  customerId,
  staff,
  assignedStaffId,
  actorId,
  compact = false,
}: {
  businessId: string;
  customerId: string;
  staff: StaffMember[];
  assignedStaffId: string | null;
  actorId: string;
  compact?: boolean;
}) {
  const router = useRouter();
  const [value, setValue] = useState(assignedStaffId ?? "");
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState("");
  const current = staff.find((s) => s.id === assignedStaffId);

  async function change(next: string) {
    setValue(next);
    setBusy(true);
    setNote("");
    const supabase = createBrowserSupabase();
    const { error } = await supabase
      .from("business_customers")
      .update({ assigned_staff_id: next || null })
      .eq("business_id", businessId)
      .eq("customer_id", customerId);
    if (error) {
      setNote("Assignment isn't available yet. It turns on with the next database update.");
      setValue(assignedStaffId ?? "");
      setBusy(false);
      return;
    }
    const to = staff.find((s) => s.id === next);
    await supabase.from("customer_events").insert({
      business_id: businessId,
      customer_id: customerId,
      type: "assigned",
      actor_type: "team_member",
      actor_id: actorId,
      details: {
        from_staff_id: assignedStaffId,
        from_staff_name: current?.name ?? null,
        to_staff_id: next || null,
        to_staff_name: to?.name ?? null,
      },
    });
    setBusy(false);
    router.refresh();
  }

  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
      <span className={compact ? "small" : undefined}>
        Assigned to: <strong>{current?.name ?? "Unassigned"}</strong>
      </span>
      <select
        aria-label="Change assignment"
        value={value}
        disabled={busy}
        onChange={(e) => change(e.target.value)}
        style={{ maxWidth: 200 }}
      >
        <option value="">Unassigned</option>
        {staff.map((s) => (
          <option key={s.id} value={s.id}>
            {s.name}
          </option>
        ))}
      </select>
      {note && (
        <span className="small" style={{ color: "var(--red, #b3261e)" }}>
          {note}
        </span>
      )}
    </span>
  );
}
