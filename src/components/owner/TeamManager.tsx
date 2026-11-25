"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createBrowserSupabase } from "@/lib/supabase-browser";
import type { BusinessMember, MemberRole, StaffMember, TeamInvite } from "@/lib/types";

/**
 * Team logins (migration 0011): the owner invites people by email with a
 * role. Managers can invite but cannot remove anyone (owner-only, in the
 * UI and in RLS). Staff logins are linked to a bookable staff row — that
 * link is what scopes everything they see to their assigned customers.
 * Before migration 0011 is applied, `available` is false and the page
 * says so plainly instead of failing.
 */
export default function TeamManager({
  businessId,
  currentUserId,
  role,
  available,
  members,
  invites,
  staff,
  assignedCounts,
  seatsUsed,
  seatLimit,
  siteUrl,
}: {
  businessId: string;
  currentUserId: string;
  role: MemberRole;
  available: boolean;
  members: BusinessMember[];
  invites: TeamInvite[];
  staff: StaffMember[];
  assignedCounts: Record<string, number>;
  seatsUsed: number;
  seatLimit: number;
  siteUrl: string;
}) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<"manager" | "staff">("staff");
  const [staffChoice, setStaffChoice] = useState("");
  const [newStaffName, setNewStaffName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [lastLink, setLastLink] = useState("");
  const [copied, setCopied] = useState("");

  const canInvite = role === "owner" || role === "manager";
  const isOwner = role === "owner";
  const pending = invites.filter((i) => !i.accepted_at && new Date(i.expires_at).getTime() > Date.now());

  async function sendInvite(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    setLastLink("");
    const supabase = createBrowserSupabase();
    let staffId: string | null = null;
    if (inviteRole === "staff") {
      if (staffChoice === "__new") {
        if (!isOwner) {
          setError("Only the owner can create a new staff calendar — pick an existing team member.");
          setBusy(false);
          return;
        }
        const { data, error: staffErr } = await supabase
          .from("staff")
          .insert({ business_id: businessId, name: newStaffName.trim() })
          .select("id")
          .single();
        if (staffErr || !data) {
          setError("Could not create that staff calendar — please try again.");
          setBusy(false);
          return;
        }
        staffId = data.id as string;
      } else if (staffChoice) {
        staffId = staffChoice;
      } else {
        setError("Pick which staff calendar this login belongs to (or create a new one).");
        setBusy(false);
        return;
      }
    }
    const { data, error: invErr } = await supabase
      .from("team_invites")
      .insert({
        business_id: businessId,
        email: email.trim().toLowerCase(),
        role: inviteRole,
        staff_id: staffId,
        created_by: currentUserId,
      })
      .select("token")
      .single();
    if (invErr || !data) {
      setError("Could not send the invite — please try again.");
      setBusy(false);
      return;
    }
    setLastLink(`${siteUrl}/invite/${data.token}`);
    setEmail("");
    setNewStaffName("");
    setStaffChoice("");
    setBusy(false);
    router.refresh();
  }

  async function removeMember(m: BusinessMember) {
    const ok = window.confirm(
      `Remove ${m.email ?? "this team member"} from the team? They will no longer be able to sign in to this business's dashboard. Their past work stays in your customer histories.`
    );
    if (!ok) return;
    const supabase = createBrowserSupabase();
    await supabase.from("business_members").update({ status: "removed" }).eq("id", m.id);
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

  async function copy(text: string, key: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(key);
      setTimeout(() => setCopied(""), 2000);
    } catch {
      setCopied("");
    }
  }

  if (!available) {
    return (
      <p className="small">
        Team sign-ins turn on with the next database update — for now your
        team works under your one owner login.
      </p>
    );
  }

  const staffName = (id: string | null) => staff.find((s) => s.id === id)?.name ?? null;

  return (
    <div>
      <p className="small" style={{ marginTop: 0 }}>
        <strong>
          {seatsUsed} of {seatLimit} seats used
        </strong>{" "}
        on your current plan (the owner plus everyone with a team login).
      </p>

      <div className="service-row">
        <div>
          <div className="service-name">Business owner</div>
          <div className="service-meta">Owner · Active · sees everything, manages billing and the team</div>
        </div>
      </div>
      {members.map((m) => (
        <div key={m.id} className="service-row">
          <div>
            <div className="service-name">{m.email ?? "Team member"}</div>
            <div className="service-meta">
              {m.role === "manager" ? "Manager" : "Staff"} · Active
              {m.staff_id
                ? ` · calendar: ${staffName(m.staff_id) ?? "—"} · ${assignedCounts[m.staff_id] ?? 0} assigned client${(assignedCounts[m.staff_id] ?? 0) === 1 ? "" : "s"}`
                : ""}
              {m.user_id === currentUserId ? " · You" : ""}
            </div>
          </div>
          {isOwner && m.user_id !== currentUserId && (
            <button className="btn" style={{ padding: "7px 13px" }} onClick={() => removeMember(m)}>
              Remove
            </button>
          )}
        </div>
      ))}
      {members.length === 0 && (
        <p className="small">No team logins yet — invite your first team member below.</p>
      )}

      {pending.length > 0 && (
        <>
          <h3 style={{ marginBottom: 6 }}>Pending invites</h3>
          {pending.map((i) => (
            <div key={i.id} className="service-row">
              <div>
                <div className="service-name">{i.email}</div>
                <div className="service-meta">
                  Invited · {i.role === "manager" ? "Manager" : "Staff"}
                  {i.staff_id ? ` · calendar: ${staffName(i.staff_id) ?? "—"}` : ""} · expires{" "}
                  {new Date(i.expires_at).toLocaleDateString([], { month: "short", day: "numeric" })}
                </div>
              </div>
              <span style={{ display: "flex", gap: 6 }}>
                <button
                  className="btn"
                  style={{ padding: "7px 13px" }}
                  onClick={() => copy(`${siteUrl}/invite/${i.token}`, i.id)}
                >
                  {copied === i.id ? "Copied" : "Copy link"}
                </button>
                {isOwner && (
                  <button className="btn" style={{ padding: "7px 13px" }} onClick={() => revokeInvite(i)}>
                    Revoke
                  </button>
                )}
              </span>
            </div>
          ))}
        </>
      )}

      {canInvite && (
        <>
          <h3 style={{ marginBottom: 6 }}>Invite a team member</h3>
          <p className="small">
            They get a link to join with their own sign-in. Staff members see only the
            customers assigned to their calendar; managers see the whole business but
            can&apos;t remove team members or manage billing.
          </p>
          {error && <div className="error">{error}</div>}
          {lastLink && (
            <div className="success">
              Invite created — send them this link: <strong>{lastLink}</strong>{" "}
              <button className="btn" style={{ padding: "4px 10px" }} onClick={() => copy(lastLink, "new")}>
                {copied === "new" ? "Copied" : "Copy"}
              </button>
            </div>
          )}
          <form onSubmit={sendInvite} style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "flex-end" }}>
            <label className="field" style={{ flex: "1 1 220px", marginBottom: 0 }}>
              <span>Email</span>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="teammate@example.com"
              />
            </label>
            <label className="field" style={{ marginBottom: 0 }}>
              <span>Role</span>
              <select value={inviteRole} onChange={(e) => setInviteRole(e.target.value as "manager" | "staff")}>
                <option value="staff">Staff</option>
                <option value="manager">Manager</option>
              </select>
            </label>
            {inviteRole === "staff" && (
              <label className="field" style={{ marginBottom: 0 }}>
                <span>Their calendar</span>
                <select value={staffChoice} onChange={(e) => setStaffChoice(e.target.value)}>
                  <option value="">Choose…</option>
                  {staff.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                  {isOwner && <option value="__new">+ New staff calendar…</option>}
                </select>
              </label>
            )}
            {inviteRole === "staff" && staffChoice === "__new" && (
              <label className="field" style={{ marginBottom: 0 }}>
                <span>New calendar name</span>
                <input value={newStaffName} onChange={(e) => setNewStaffName(e.target.value)} placeholder="Attorney Chen" required />
              </label>
            )}
            <button className="btn btn-primary" type="submit" disabled={busy || !email.trim()}>
              {busy ? "Sending…" : "Send invite"}
            </button>
          </form>
        </>
      )}
    </div>
  );
}
