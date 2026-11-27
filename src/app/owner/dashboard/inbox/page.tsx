import { requireBusiness } from "@/lib/owner";
import InboxShell from "@/components/owner/InboxShell";

// Two-column inbox (PDF §4): conversation list + open thread. With no
// thread selected, the right pane explains the inbox; tapping a
// conversation opens it in the thread route (same shell).
export default async function DashboardInboxPage() {
  const { supabase, business, memberStaffId } = await requireBusiness();

  return (
    <div>
      <h1 style={{ fontSize: 26 }}>Inbox</h1>
      <InboxShell supabase={supabase} business={business} myStaffId={memberStaffId}>
        <div className="card">
          <p className="lede" style={{ marginBottom: 0 }}>
            Pick a conversation to read and reply. When a customer messages
            you, it lands here, and we email you the moment it arrives, so
            nothing sits unseen.
          </p>
        </div>
      </InboxShell>
    </div>
  );
}
