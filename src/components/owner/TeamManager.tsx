"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createBrowserSupabase } from "@/lib/supabase-browser";
import type { BusinessMember, MemberRole, Service, StaffMember, TeamInvite } from "@/lib/types";

/**
 * Team (Owner Dashboard Plan, 2026-11-26): member cards on the left
 * (owner first — dark green Owner tag; Manager blue-grey; Staff
 * light green; invited people on a dashed card with an orange
 * Invited tag and a Resend button), the invite card on the right
 * (Name / Email or mobile number / Role buttons with Owner disabled
 * / Services they offer / Send invite).
 *
 * Only the OWNER manages the team. Managers see everything at the
 * business EXCEPT Billing and Team management, so for them (and for
 * staff logins) this renders read-only: no invite card, no Edit, no
 * Remove. The server enforces the same rule (POST /api/team/invite
 * is owner-only; migration 0015 makes the RLS insert policies
 * owner-only too). Sending an invite goes through that route, which
 * also emails the join link via Resend; the copy-link stays as a
 * fallback either way.
 */
export default function TeamManager({
  businessId,
  currentUserId,
  role,
  available,
  members,
  invites,
  staff,
  services,
  staffServices,
  assignedCounts,
  ownerName,
  ownerEmail,
  siteUrl,
  showGrowNote,
}: {
  businessId: string;
  currentUserId: string;
  role: MemberRole;
  available: boolean;
  members: BusinessMember[];
  invites: TeamInvite[];
  staff: StaffMember[];
  services: Service[];
  staffServices: Record<string, string[]>;
  assignedCounts: Record<string, number>;
  ownerName: string;
  ownerEmail: string | null;
  siteUrl: string;
  /** At/over the plan's seat count: inviting still works; the plan
   * simply grows (Frantz's revised Build Plan, 2026-11-26). */
  showGrowNote?: boolean;
}) {
  const router = useRouter();
  const isOwner = role === "owner";
  const [name, setName] = useState("");
  const [contact, setContact] = useState("");
  const [inviteRole, setInviteRole] = useState<"manager" | "staff">("staff");
  const [pickedServices, setPickedServices] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [lastLink, setLastLink] = useState("");
  const [copied, setCopied] = useState("");
  const [resending, setResending] = useState("");
  const [editId, setEditId] = useState<string | null>(null);
  const [editRole, setEditRole] = useState<"manager" | "staff">("staff");
  const [editServices, setEditServices] = useState<Set<string>>(new Set());
  const [editNote, setEditNote] = useState("");

  const pending = invites.filter((i) => !i.accepted_at && new Date(i.expires_at).getTime() > Date.now());
  const staffName = (id: string | null) => staff.find((s) => s.id === id)?.name ?? null;
  const initialsOf = (label: string) => {
    const p = label.replace(/@.*$/, "").trim().split(/[\s._-]+/).filter(Boolean);
    return ((p[0]?.[0] ?? "?") + (p.length > 1 ? p[p.length - 1][0] : "")).toUpperCase();
  };

  async function copy(text: string, key: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(key);
      setTimeout(() => setCopied(""), 2000);
    } catch {
      setCopied("");
    }
  }

  async function sendInvite(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    setSuccess("");
    setLastLink("");
    try {
      const res = await fetch("/api/team/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          contact: contact.trim(),
          role: inviteRole,
          serviceIds: inviteRole === "staff" ? [...pickedServices] : [],
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Could not send the invite — please try again.");
      } else {
        setLastLink(data.link as string);
        setSuccess(
          data.emailed
            ? `Invite emailed to ${contact.trim().toLowerCase()}. You can also send them the link yourself:`
            : "Invite created. Email isn't sending right now, so send them this link yourself:"
        );
        setName("");
        setContact("");
        setPickedServices(new Set());
        router.refresh();
      }
    } catch {
      setError("Could not send the invite — please try again.");
    }
    setBusy(false);
  }

  async function resendInvite(i: TeamInvite) {
    setResending(i.id);
    try {
      const res = await fetch("/api/team/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resendOf: i.id }),
      });
      const data = await res.json();
      if (res.ok) {
        setLastLink(data.link as string);
        setSuccess(
          data.emailed
            ? `Invite emailed to ${i.email} again. The link, if you want to send it yourself:`
            : "Email isn't sending right now — send them this link yourself:"
        );
        setError("");
      } else {
        setError(data.error ?? "Could not re-send that invite.");
      }
    } catch {
      setError("Could not re-send that invite.");
    }
    setResending("");
  }

  async function removeMember(m: BusinessMember) {
    const ok = window.confirm(
      `Remove ${m.email ?? "this team member"} from the team? They will no longer be able to sign in to this business's dashboard. Their customers become unassigned, and their past work stays in your customer histories.`
    );
    if (!ok) return;
    const supabase = createBrowserSupabase();
    await supabase.from("business_members").update({ status: "removed" }).eq("id", m.id);
    if (m.staff_id) {
      await supabase
        .from("business_customers")
        .update({ assigned_staff_id: null })
        .eq("business_id", businessId)
        .eq("assigned_staff_id", m.staff_id);
    }
    router.refresh();
  }

  async function revokeInvite(i: TeamInvite) {
    const ok = window.confirm(
      `Revoke the invite for ${i.email}? The link will stop working and they won't be able to join with it.`
    );
    if (!ok) return;
    const supabase = createBrowserSupabase();
    await supabase.from("team_invites").delete().eq("id", i.id);
    router.refresh();
  }

  function openEdit(m: BusinessMember) {
    setEditId(m.id);
    setEditRole(m.role === "manager" ? "manager" : "staff");
    setEditServices(new Set(m.staff_id ? (staffServices[m.staff_id] ?? []) : []));
    setEditNote("");
  }

  async function saveEdit(m: BusinessMember) {
    setEditNote("");
    const supabase = createBrowserSupabase();
    const { error: roleErr } = await supabase
      .from("business_members")
      .update({ role: editRole })
      .eq("id", m.id);
    if (roleErr) {
      setEditNote("That change didn't save — please try again.");
      return;
    }
    if (m.staff_id) {
      await supabase.from("staff_services").delete().eq("staff_id", m.staff_id);
      const rows = [...editServices].map((sid) => ({ staff_id: m.staff_id as string, service_id: sid }));
      if (rows.length > 0) await supabase.from("staff_services").insert(rows);
    }
    setEditId(null);
    router.refresh();
  }

  if (!available) {
    return (
      <div className="card">
        <p className="small" style={{ margin: 0 }}>
          Team sign-ins turn on with the next database update — for now your
          team works under your one owner login.
        </p>
      </div>
    );
  }

  const ownerSelf = role === "owner";

  return (
    <div className={isOwner ? "d2-team-grid" : undefined}>
      <div>
        {/* Owner card */}
        <div className="d2-member">
          <span className="d2-ava" aria-hidden="true">{initialsOf(ownerName)}</span>
          <div className="d2-member-main">
            <p className="d2-member-name">
              {ownerName}
              {ownerSelf ? " (you)" : ""}
            </p>
            <p className="d2-member-sub">{ownerEmail ?? "The account holder"} · Sees everything</p>
          </div>
          <span className="tag tag-owner">Owner</span>
        </div>

        {/* Member cards */}
        {members.map((m) => {
          const label = m.email ?? "Team member";
          const isSelf = m.user_id === currentUserId;
          return (
            <div key={m.id} style={{ marginBottom: 12 }}>
              <div className="d2-member" style={{ marginBottom: 0 }}>
                <span className="d2-ava" aria-hidden="true">{initialsOf(label)}</span>
                <div className="d2-member-main">
                  <p className="d2-member-name">
                    {label}
                    {isSelf ? " (you)" : ""}
                  </p>
                  <p className="d2-member-sub">
                    {m.staff_id
                      ? `Calendar: ${staffName(m.staff_id) ?? "—"}`
                      : m.role === "manager"
                        ? "Sees the whole business"
                        : "No calendar linked"}
                  </p>
                </div>
                <span className={m.role === "manager" ? "tag tag-manager" : "tag tag-staff"}>
                  {m.role === "manager" ? "Manager" : "Staff"}
                </span>
                <span style={{ fontWeight: 700, fontSize: 14.5, minWidth: 52, textAlign: "right" }}>
                  {m.staff_id ? (assignedCounts[m.staff_id] ?? 0) : ""}
                  {m.staff_id ? <span className="small" style={{ display: "block", fontWeight: 500 }}>clients</span> : null}
                </span>
                {isOwner && !isSelf && (
                  <button className="btn" style={{ minHeight: 38, padding: "0 13px" }} onClick={() => (editId === m.id ? setEditId(null) : openEdit(m))}>
                    Edit
                  </button>
                )}
              </div>
              {isOwner && editId === m.id && (
                <div className="d2-member" style={{ marginBottom: 0, borderTop: "none", borderRadius: "0 0 16px 16px" }}>
                  <div className="d2-editbox" style={{ borderTop: "none", marginTop: 0, paddingTop: 0 }}>
                    <label className="field">
                      <span>Role</span>
                      <span className="d2-rolebtns">
                        <button type="button" className={editRole === "manager" ? "sel" : ""} onClick={() => setEditRole("manager")}>
                          Manager
                        </button>
                        <button type="button" className={editRole === "staff" ? "sel" : ""} onClick={() => setEditRole("staff")}>
                          Staff
                        </button>
                      </span>
                    </label>
                    {m.staff_id && services.length > 0 && (
                      <div style={{ marginBottom: 12 }}>
                        <p className="small" style={{ fontWeight: 600, margin: "0 0 6px" }}>Services they offer</p>
                        <span className="d2-svc-chips">
                          {services.map((s) => (
                            <button
                              key={s.id}
                              type="button"
                              className={editServices.has(s.id) ? "d2-svc-chip sel" : "d2-svc-chip"}
                              onClick={() =>
                                setEditServices((prev) => {
                                  const next = new Set(prev);
                                  if (next.has(s.id)) next.delete(s.id);
                                  else next.add(s.id);
                                  return next;
                                })
                              }
                            >
                              {s.name}
                            </button>
                          ))}
                        </span>
                      </div>
                    )}
                    <p className="small" style={{ margin: "0 0 10px" }}>
                      Working hours live in{" "}
                      <Link href="/owner/dashboard/settings">Settings → Opening hours</Link>.
                    </p>
                    {editNote && <div className="error">{editNote}</div>}
                    <span style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                      <button className="btn btn-primary" onClick={() => saveEdit(m)}>
                        Save changes
                      </button>
                      <button className="btn btn-outline-danger" onClick={() => removeMember(m)}>
                        Remove from team
                      </button>
                    </span>
                  </div>
                </div>
              )}
            </div>
          );
        })}
        {members.length === 0 && pending.length === 0 && (
          <p className="small">No team logins yet — invite your first team member.</p>
        )}

        {/* Invited cards */}
        {pending.map((i) => (
          <div key={i.id} className="d2-member invited">
            <span className="d2-ava" aria-hidden="true">{initialsOf(i.name || i.email)}</span>
            <div className="d2-member-main">
              <p className="d2-member-name">{i.name || i.email}</p>
              <p className="d2-member-sub">
                {i.name ? `${i.email} · ` : ""}Invite sent{" "}
                {new Date(i.created_at).toLocaleDateString([], { month: "short", day: "numeric" })} · not
                accepted yet
              </p>
            </div>
            <span className="tag tag-invited">Invited</span>
            {isOwner && (
              <span style={{ display: "inline-flex", gap: 6 }}>
                <button
                  className="btn"
                  style={{ minHeight: 38, padding: "0 13px" }}
                  onClick={() => resendInvite(i)}
                  disabled={resending === i.id}
                >
                  {resending === i.id ? "Sending…" : "Resend"}
                </button>
                <button
                  className="btn"
                  style={{ minHeight: 38, padding: "0 13px" }}
                  onClick={() => copy(`${siteUrl}/invite/${i.token}`, i.id)}
                >
                  {copied === i.id ? "Copied" : "Copy link"}
                </button>
                <button
                  className="btn"
                  style={{ minHeight: 38, padding: "0 13px" }}
                  onClick={() => revokeInvite(i)}
                >
                  Revoke
                </button>
              </span>
            )}
          </div>
        ))}
      </div>

      {/* Invite card — owner only */}
      {isOwner && (
        <div className="card" style={{ marginBottom: 0 }}>
          <h2 style={{ marginTop: 0 }}>Invite a team member</h2>
          {showGrowNote && (
            <p className="small" style={{ marginTop: 0 }}>
              Your plan grows with your team — we&apos;ll let you know when
              it&apos;s time to upgrade.
            </p>
          )}
          {error && <div className="error">{error}</div>}
          {success && (
            <div className="success">
              {success}{" "}
              {lastLink && (
                <>
                  <strong style={{ wordBreak: "break-all" }}>{lastLink}</strong>{" "}
                  <button className="btn" style={{ padding: "4px 10px", minHeight: 32 }} onClick={() => copy(lastLink, "new")}>
                    {copied === "new" ? "Copied" : "Copy"}
                  </button>
                </>
              )}
            </div>
          )}
          <form onSubmit={sendInvite}>
            <label className="field">
              <span>Name</span>
              <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Jordan Patel" />
            </label>
            <label className="field">
              <span>Email or mobile number</span>
              <input
                value={contact}
                onChange={(e) => setContact(e.target.value)}
                placeholder="teammate@example.com"
                required
              />
            </label>
            <div style={{ marginBottom: 14 }}>
              <p className="small" style={{ fontWeight: 600, margin: "0 0 6px", color: "inherit" }}>Role</p>
              <span className="d2-rolebtns">
                <button type="button" disabled title="The owner is the account holder">
                  Owner
                </button>
                <button
                  type="button"
                  className={inviteRole === "manager" ? "sel" : ""}
                  onClick={() => setInviteRole("manager")}
                >
                  Manager
                </button>
                <button
                  type="button"
                  className={inviteRole === "staff" ? "sel" : ""}
                  onClick={() => setInviteRole("staff")}
                >
                  Staff
                </button>
              </span>
              <p className="small" style={{ margin: "8px 0 0" }}>
                {inviteRole === "staff"
                  ? "Staff see only their own calendar, clients and messages."
                  : "Managers see the whole business, but can't manage the team or billing."}{" "}
                The owner is the account holder — there's one owner per business.
              </p>
            </div>
            {inviteRole === "staff" && services.length > 0 && (
              <div style={{ marginBottom: 14 }}>
                <p className="small" style={{ fontWeight: 600, margin: "0 0 6px", color: "inherit" }}>
                  Services they offer
                </p>
                <span className="d2-svc-chips">
                  {services.map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      className={pickedServices.has(s.id) ? "d2-svc-chip sel" : "d2-svc-chip"}
                      onClick={() =>
                        setPickedServices((prev) => {
                          const next = new Set(prev);
                          if (next.has(s.id)) next.delete(s.id);
                          else next.add(s.id);
                          return next;
                        })
                      }
                    >
                      {s.name}
                    </button>
                  ))}
                </span>
              </div>
            )}
            <button className="btn btn-primary btn-block" type="submit" disabled={busy || !contact.trim()}>
              {busy ? "Sending…" : "Send invite"}
            </button>
          </form>
        </div>
      )}
      {!isOwner && (
        <div className="card">
          <p className="small" style={{ margin: 0 }}>
            Only the business owner can invite or remove team members.
          </p>
        </div>
      )}
    </div>
  );
}
