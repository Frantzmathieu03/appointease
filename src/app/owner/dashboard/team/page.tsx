import { requireBusiness, siteUrl } from "@/lib/owner";
import StaffManager from "@/components/owner/StaffManager";
import TeamManager from "@/components/owner/TeamManager";
import { planById } from "@/lib/plans";
import type { BusinessMember, StaffMember, TeamInvite } from "@/lib/types";

// Team = bookable staff calendars (StaffManager) + team logins with
// roles and invites (TeamManager, migration 0011). A staff login is
// linked to one staff calendar and sees only that calendar's assigned
// customers. Everything degrades quietly before migration 0011 lands:
// the logins card explains itself and the calendars keep working.
export default async function DashboardTeamPage() {
  const { supabase, user, business, role } = await requireBusiness();

  const { data: staffRows } = await supabase
    .from("staff")
    .select("id, business_id, name, active")
    .eq("business_id", business.id)
    .eq("active", true)
    .order("created_at", { ascending: true });
  const staff = (staffRows ?? []) as StaffMember[];

  // Membership data — the table doesn't exist pre-0011, so an error here
  // just means "not available yet".
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

  // Assigned-client counts per staff member (for the roster rows).
  const assignedCounts: Record<string, number> = {};
  const { data: rels } = await supabase
    .from("business_customers")
    .select("assigned_staff_id")
    .eq("business_id", business.id);
  for (const r of rels ?? []) {
    const sid = (r as { assigned_staff_id?: string | null }).assigned_staff_id;
    if (sid) assignedCounts[sid] = (assignedCounts[sid] ?? 0) + 1;
  }

  const plan = planById(business.plan);

  return (
    <div>
      <h1 style={{ fontSize: 26 }}>Team</h1>
      <p className="lede">
        The people who work at {business.name} — their bookable calendars
        and their own sign-ins.
      </p>
      <div className="card">
        <h2>Team sign-ins</h2>
        <TeamManager
          businessId={business.id}
          currentUserId={user.id}
          role={role}
          available={available}
          members={members}
          invites={invites}
          staff={staff}
          assignedCounts={assignedCounts}
          seatsUsed={1 + members.length}
          seatLimit={plan.staffLimit}
          siteUrl={siteUrl()}
        />
      </div>
      <div className="card">
        <h2>Bookable staff</h2>
        <StaffManager businessId={business.id} />
      </div>
    </div>
  );
}
