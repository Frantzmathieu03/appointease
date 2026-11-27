"use client";

import { useMemo, useState } from "react";
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
  nextLabel: string | null;
  hasUpcoming: boolean;
  joinedAt: string | null;
  unread: number;
}

type Chip = "all" | "unassigned" | "upcoming" | "new";

/**
 * Customers (Owner Dashboard Plan, 2026-11-26): count line, Export
 * (CSV of the visible list), search, filter chips (All / Not
 * assigned / Upcoming / New this month) and a table: checkbox,
 * Name, Phone (with dashes), Assigned to, Next appointment, Visits.
 * Ticking rows raises the dark green Assign bar; assignments write
 * through the browser client under RLS and each one appends an
 * `assigned` timeline event. There is deliberately NO "+ Add
 * customer" button: customers are accounts people create themselves
 * on the business's page: the business cannot create one for them.
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
  const [query, setQuery] = useState("");
  const [chip, setChip] = useState<Chip>("all");

  const staffName = (id: string | null) => staff.find((s) => s.id === id)?.name ?? null;
  const notAssigned = rows.filter((r) => !r.assigned_staff_id).length;

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    const now = new Date();
    return rows.filter((r) => {
      if (chip === "unassigned" && r.assigned_staff_id) return false;
      if (chip === "upcoming" && !r.hasUpcoming) return false;
      if (chip === "new") {
        if (!r.joinedAt) return false;
        const j = new Date(r.joinedAt);
        if (j.getFullYear() !== now.getFullYear() || j.getMonth() !== now.getMonth()) return false;
      }
      if (q) {
        const hay = [r.full_name, r.phone ?? "", formatPhone(r.phone), r.email ?? ""]
          .join(" ")
          .toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [rows, chip, query]);

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
      setNote("Assignment isn't available yet. It turns on with the next database update.");
      return;
    }
    setSelected(new Set());
    router.refresh();
  }

  function exportCsv() {
    const esc = (v: string) => `"${v.replace(/"/g, '""')}"`;
    const lines = [
      ["Name", "Phone", "Email", "Assigned to", "Next appointment", "Visits"].join(","),
      ...visible.map((r) =>
        [
          esc(r.full_name || "Customer"),
          esc(r.phone ? formatPhone(r.phone) : ""),
          esc(r.email ?? ""),
          esc(staffName(r.assigned_staff_id) ?? "Not assigned"),
          esc(r.nextLabel ?? ""),
          String(r.total),
        ].join(",")
      ),
    ];
    const blob = new Blob([lines.join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "customers.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  if (rows.length === 0) {
    return (
      <div className="card">
        <p className="lede" style={{ marginBottom: 0 }}>
          No customers yet. The first person who books or messages you appears here.
        </p>
      </div>
    );
  }

  const chips: { id: Chip; label: string }[] = [
    { id: "all", label: "All" },
    { id: "unassigned", label: "Not assigned" },
    { id: "upcoming", label: "Upcoming" },
    { id: "new", label: "New this month" },
  ];

  return (
    <div>
      <p className="d2-count-line">
        {rows.length} client{rows.length === 1 ? "" : "s"} · {notAssigned} not assigned
      </p>
      <div className="d2-toolbar">
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by name, phone or email"
          aria-label="Search customers"
        />
        <button className="btn" type="button" onClick={exportCsv}>
          Export
        </button>
      </div>
      <div className="d2-chips" style={{ marginBottom: 14 }} role="tablist" aria-label="Filter customers">
        {chips.map((c) => (
          <button
            key={c.id}
            type="button"
            className={chip === c.id ? "d2-chipbtn active" : "d2-chipbtn"}
            onClick={() => setChip(c.id)}
          >
            {c.label}
          </button>
        ))}
      </div>

      {selected.size > 0 && (
        <div className="d2-assignbar">
          <strong>
            {selected.size} selected
          </strong>
          <span style={{ display: "inline-flex", gap: 8, alignItems: "center" }}>
            Assign to
            <select
              aria-label="Assign selected customers to"
              value={bulkStaff}
              onChange={(e) => setBulkStaff(e.target.value)}
            >
              <option value="">Unassigned</option>
              {staff.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </span>
          <button className="btn btn-assign" onClick={applyBulk} disabled={busy}>
            {busy ? "Assigning…" : "Assign"}
          </button>
          <button className="btn" onClick={() => setSelected(new Set())} disabled={busy}>
            Clear
          </button>
          {note && <span style={{ fontSize: 13 }}>{note}</span>}
        </div>
      )}

      <div className="d2-table-wrap">
        <table className="d2-table">
          <thead>
            <tr>
              <th style={{ width: 36 }} aria-label="Select" />
              <th>Name</th>
              <th>Phone</th>
              <th>Assigned to</th>
              <th>Next appointment</th>
              <th>Visits</th>
            </tr>
          </thead>
          <tbody>
            {visible.map((c) => (
              <tr key={c.id}>
                <td>
                  <input
                    type="checkbox"
                    aria-label={`Select ${c.full_name || "customer"}`}
                    checked={selected.has(c.id)}
                    onChange={() => toggle(c.id)}
                  />
                </td>
                <td>
                  <Link href={`/owner/dashboard/customers/${c.id}`} className="who">
                    {c.full_name || "Customer"}
                  </Link>
                  {c.unread > 0 && <span className="badge">{c.unread}</span>}
                </td>
                <td>{c.phone ? formatPhone(c.phone) : "None"}</td>
                <td>
                  {staffName(c.assigned_staff_id) ?? (
                    <span className="d2-notassigned">Not assigned</span>
                  )}
                </td>
                <td>{c.nextLabel ?? "None"}</td>
                <td>{c.total}</td>
              </tr>
            ))}
            {visible.length === 0 && (
              <tr>
                <td colSpan={6} style={{ color: "#5b6b61" }}>
                  No customers match. Try a different search or filter.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
