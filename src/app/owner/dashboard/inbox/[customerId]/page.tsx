import Link from "next/link";
import { notFound } from "next/navigation";
import { requireBusiness } from "@/lib/owner";
import ThreadView from "@/components/ThreadView";

export default async function DashboardThreadPage({
  params,
}: {
  params: Promise<{ customerId: string }>;
}) {
  const { customerId } = await params;
  const { supabase, business } = await requireBusiness();

  const { data: customer } = await supabase
    .from("customers")
    .select("id, full_name, email, phone")
    .eq("id", customerId)
    .maybeSingle();
  if (!customer) notFound();

  return (
    <div>
      <p className="eyebrow">
        <Link href="/owner/dashboard/inbox">← Inbox</Link>
        {"  ·  "}
        <Link href="/owner/dashboard/customers">View customer</Link>
      </p>
      <h1 style={{ fontSize: 25 }}>Conversation with {customer.full_name || "Customer"}</h1>
      <p className="small" style={{ marginTop: -6, marginBottom: 14 }}>
        {[customer.phone, customer.email].filter(Boolean).join(" · ")}
      </p>
      <div className="card">
        <ThreadView businessId={business.id} customerId={customerId} viewer="business" />
      </div>
      <p className="small">
        Replies alert the customer by email (and text/push where enabled) the
        moment you send — and their replies alert you the same way.
      </p>
    </div>
  );
}
