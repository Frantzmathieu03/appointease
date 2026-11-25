import { requireBusiness } from "@/lib/owner";
import StaffManager from "@/components/owner/StaffManager";

// Team = the business's bookable staff (presentation of the existing
// StaffManager data/logic). Team logins, roles and invites are the
// separate team-structure build — nothing here pretends otherwise.
export default async function DashboardTeamPage() {
  const { business } = await requireBusiness();

  return (
    <div>
      <h1 style={{ fontSize: 26 }}>Team</h1>
      <p className="lede">
        The people customers can book with at {business.name}. Everyone here
        is a bookable calendar on your booking page.
      </p>
      <div className="card">
        <h2>Bookable staff</h2>
        <StaffManager businessId={business.id} />
      </div>
      <p className="small">
        Staff sign-ins, roles and invites are coming in a later build — for
        now your team works under your one owner login.
      </p>
    </div>
  );
}
