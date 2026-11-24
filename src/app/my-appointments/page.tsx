import Link from "next/link";
import { redirect } from "next/navigation";
import { createServerSupabase, isSupabaseConfigured } from "@/lib/supabase";
import { ensureCustomerProfile } from "@/lib/profile";
import { formatDateInZone, formatTimeInZone } from "@/lib/slots";
import PushOptIn from "@/components/PushOptIn";
import ReviewForm from "@/components/ReviewForm";
import UnreadBadge from "@/components/UnreadBadge";

interface ApptRow {
  id: string;
  starts_at: string;
  status: string;
  manage_token: string;
  confirmation_code: string | null;
  business_id: string;
  businesses: { name: string; slug: string; address: string | null; timezone: string } | null;
  services: { name: string } | null;
}

export default async function MyAppointmentsPage() {
  if (!isSupabaseConfigured()) {
    return (
      <main className="column">
        <div className="notice">
          Demo mode — accounts and saved appointments turn on when the live
          database is connected. Try the sample booking flow meanwhile:
        </div>
        <Link href="/jesus-barber-shop" className="btn btn-primary btn-block">
          Visit Jesus Barber Shop
        </Link>
      </main>
    );
  }

  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/my-appointments");
  await ensureCustomerProfile(supabase, user);

  const { data } = await supabase
    .from("appointments")
    .select(
      "id, starts_at, status, manage_token, confirmation_code, business_id, businesses:business_id ( name, slug, address, timezone ), services:service_id ( name )"
    )
    .eq("customer_id", user.id)
    .order("starts_at", { ascending: true });
  const appts = (data ?? []) as unknown as ApptRow[];

  const { data: myReviews } = await supabase
    .from("reviews")
    .select("appointment_id")
    .eq("customer_id", user.id);
  const reviewed = new Set((myReviews ?? []).map((r) => r.appointment_id));

  const now = Date.now();
  const isUpcoming = (a: ApptRow) =>
    a.status === "confirmed" && new Date(a.starts_at).getTime() >= now;
  const upcoming = appts.filter(isUpcoming);
  const past = appts.filter((a) => !isUpcoming(a)).reverse();
  const next = upcoming[0];
  const rest = upcoming.slice(1);

  const card = (a: ApptRow, big = false) => {
    const tz = a.businesses?.timezone ?? "America/New_York";
    return (
      <div className="card" key={a.id}>
        {big && <p className="eyebrow">Your next appointment</p>}
        <h3>
          {a.services?.name ?? "Appointment"} — {a.businesses?.name}
        </h3>
        <p className="small" style={{ margin: "2px 0 10px" }}>
          {formatDateInZone(new Date(a.starts_at), tz)} at {formatTimeInZone(new Date(a.starts_at), tz)}
          {a.businesses?.address ? ` · ${a.businesses.address}` : ""}
          {a.status !== "confirmed" ? ` · ${a.status.replace("_", " ")}` : ""}
          {a.confirmation_code ? (
            <>
              <br />
              Confirmation #: <strong>{a.confirmation_code}</strong>
            </>
          ) : null}
        </p>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {a.status === "confirmed" && new Date(a.starts_at).getTime() >= now && (
            <>
              <Link href={`/manage/${a.manage_token}`} className="btn">Reschedule</Link>
              <Link href={`/manage/${a.manage_token}`} className="btn">Cancel</Link>
            </>
          )}
          {a.businesses && (
            <Link href={`/${a.businesses.slug}/message`} className="btn">
              Message
              <UnreadBadge variant="customer" businessId={a.business_id} />
            </Link>
          )}
        </div>
        {a.status !== "confirmed" || new Date(a.starts_at).getTime() < now ? (
          !reviewed.has(a.id) && a.status !== "cancelled" ? (
            <ReviewForm appointmentId={a.id} />
          ) : null
        ) : null}
      </div>
    );
  };

  return (
    <main className="column">
      <h1 style={{ fontSize: 28 }}>My appointments</h1>

      {appts.length === 0 && (
        <div className="card">
          <p className="lede" style={{ marginBottom: 10 }}>
            Nothing booked yet. Find a business page link — or try the sample shop.
          </p>
          <Link href="/jesus-barber-shop" className="btn btn-primary">Book at Jesus Barber Shop</Link>
        </div>
      )}

      {next && card(next, true)}
      {rest.map((a) => card(a))}

      {past.length > 0 && (
        <>
          <h2 style={{ marginTop: 22 }}>Past appointments</h2>
          {past.map((a) => card(a))}
        </>
      )}

      <div className="card">
        <h3>Message alerts</h3>
        <p className="small" style={{ marginBottom: 10 }}>
          When a business replies, we email you right away. Turn on push as well
          so replies reach this device instantly:
        </p>
        <PushOptIn />
      </div>

      <form action="/auth/signout" method="post" style={{ textAlign: "center" }}>
        <button className="btn" type="submit">Sign out</button>
      </form>
    </main>
  );
}
