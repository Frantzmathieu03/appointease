import Link from "next/link";
import { requireBusiness, siteUrl } from "@/lib/owner";
import StaffManager from "@/components/owner/StaffManager";
import TeamManager from "@/components/owner/TeamManager";
import { planById } from "@/lib/plans";
import type { BusinessMember, Service, StaffMember, TeamInvite } from "@/lib/types";

// Team (Owner Dashboard Plan, 2026-11-26): heading + the seat line
// ("N of M seats used on the <Plan> plan · Upgrade"), member cards
// on the left, the invite card on the right (TeamManager), and the
// bookable calendars below (StaffManager — a login is linked to one
// calendar, and that link scopes everything a staff login sees).
// Only the OWNER manages the team: managers get this page read-only
// and staff logins keep their narrower view.
export default async function DashboardTeamPage() {
  const { supabase, user, business, role } = await requireBusiness();

  const { data: staffRows } = await supabase
    .from("staff")
    .select("id, business_id, name, active")
    .eq("business_id", business.id)
    .eq("active", true)
    .order("created_at", { ascending: true });
  const staff = (staffRows ?? []) as StaffMember[];

  const membersRes = await supabase
    .from("business_members")
    .select("*")
    .eq("business_id", business.id)
    .eq("status", "active")
    .order("created_at", { ascending: true });
  const available = !membersRes.error;
  const members = available ? ((membersRes.data ?? []) as BusinessMember[]) : [];
  let invites: TeamInvite[] = [];
  if (available && role !== "staff") {
    const invRes = await supabase
      .from("team_invites")
      .select("*")
      .eq("business_id", business.id)
      .order("created_at", { ascending: false });
    if (!invRes.error) invites = (invRes.data ?? []) as TeamInvite[];
  }

  const assignedCounts: Record<string, number> = {};
  const { data: rels } = await supabase
    .from("business_customers")
    .select("assigned_staff_id")
    .eq("business_id", business.id);
  for (const r of rels ?? []) {
    const sid = (r as { assigned_staff_id?: string | null }).assigned_staff_id;
    if (sid) assignedCounts[sid] = (assignedCounts[sid] ?? 0) + 1;
  }

  const { data: serviceRows } = await supabase
    .from("services")
    .select("*")
    .eq("business_id", business.id)
    .eq("active", true)
    .order("created_at", { ascending: true });
  const services = (serviceRows ?? []) as Service[];
  const staffServices: Record<string, string[]> = {};
  if (staff.length > 0) {
    const { data: ssRows } = await supabase
      .from("staff_services")
      .select("staff_id, service_id")
      .in(
        "staff_id",
        staff.map((s) => s.id)
      );
    for (const r of ssRows ?? []) {
      const row = r as { staff_id: string; service_id: string };
      (staffServices[row.staff_id] ??= []).push(row.service_id);
    }
  }

  const plan = planById(business.plan);
  const seatsUsed = 1 + members.length;
  const ownerName =
    role === "owner"
      ? (((user.user_metadata?.full_name as string | undefined) ??
          (user.user_metadata?.name as string | undefined) ??
          "") ||
          user.email ||
          "Business owner")
      : "Business owner";
  const ownerEmail = role === "owner" ? (user.email ?? null) : null;

  return (
    <div>
      <h1 style={{ fontSize: 26, marginBottom: 2 }}>Team</h1>
      <p className="small" style={{ margin: "0 0 18px" }}>
        {Number.isFinite(plan.staffLimit) ? (
          <>
            {seatsUsed} of {plan.staffLimit} seats used on the {plan.name} plan
          </>
        ) : (
          <>
            {seatsUsed} team member{seatsUsed === 1 ? "" : "s"} on the {plan.name} plan
          </>
        )}
        {role === "owner" && (
          <>
            {" · "}
            <Link href="/owner/dashboard/billing" style={{ fontWeight: 600 }}>
              Upgrade
            </Link>
          </>
        )}
      </p>
      <TeamManager
        businessId={business.id}
        currentUserId={user.id}
        role={role}
        available={available}
        members={members}
        invites={invites}
        staff={staff}
        services={services}
        staffServices={staffServices}
        assignedCounts={assignedCounts}
        ownerName={ownerName}
        ownerEmail={ownerEmail}
        siteUrl={siteUrl()}
        showGrowNote={Number.isFinite(plan.staffLimit) && seatsUsed >= plan.staffLimit}
      />
      <div className="card" style={{ marginTop: 16 }}>
        <h2>Bookable staff calendars</h2>
        <p className="small" style={{ marginTop: 0 }}>
          The calendars customers can book. A team sign-in is linked to one of
          these — that link decides whose customers they see.
        </p>
        <StaffManager businessId={business.id} />
      </div>
    </div>
  );
}
