import Link from "next/link";
import { notFound } from "next/navigation";
import { getBusinessPageData, hoursSummary } from "@/lib/data";
import { createServerSupabase, isSupabaseConfigured } from "@/lib/supabase";
import { formatPrice } from "@/lib/types";
import { formatDateInZone, formatTimeInZone } from "@/lib/slots";

export default async function BusinessPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const page = await getBusinessPageData(slug);
  if (!page) notFound();
  const { business, services } = page;
  const tz = business.timezone;

  // Reviews (carried over from the old app): average + latest few, public.
  let reviewSummary: { avg: number; total: number; latest: { rating: number; comment: string | null; name: string }[] } | null = null;
  if (!page.demoMode && isSupabaseConfigured()) {
    const supabase = await createServerSupabase();
    const { data: revs } = await supabase
      .from("reviews")
      .select("rating, comment, created_at, customers:customer_id ( full_name )")
      .eq("business_id", business.id)
      .order("created_at", { ascending: false });
    if (revs && revs.length > 0) {
      const avg = revs.reduce((s, r) => s + r.rating, 0) / revs.length;
      reviewSummary = {
        avg: Math.round(avg * 10) / 10,
        total: revs.length,
        latest: revs.slice(0, 3).map((r) => ({
          rating: r.rating,
          comment: r.comment,
          name:
            (r as unknown as { customers: { full_name: string } }).customers?.full_name ?? "Customer",
        })),
      };
    }
  }

  // If the signed-in customer has a next appointment here, it sits on top —
  // with Reschedule / Cancel one tap away (owner spec).
  let nextAppt: { starts_at: string; manage_token: string; serviceName: string } | null = null;
  if (!page.demoMode && isSupabaseConfigured()) {
    const supabase = await createServerSupabase();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) {
      const { data } = await supabase
        .from("appointments")
        .select("starts_at, manage_token, services:service_id ( name )")
        .eq("business_id", business.id)
        .eq("customer_id", user.id)
        .eq("status", "confirmed")
        .gte("starts_at", new Date().toISOString())
        .order("starts_at", { ascending: true })
        .limit(1)
        .maybeSingle();
      if (data) {
        nextAppt = {
          starts_at: data.starts_at,
          manage_token: data.manage_token,
          serviceName:
            (data as unknown as { services: { name: string } }).services?.name ?? "Appointment",
        };
      }
    }
  }

  return (
    <main className="column">
      {page.demoMode && (
        <div className="notice">Demo business — running on sample data until the live database is connected.</div>
      )}

      <div className="hero-card">
        <p className="eyebrow">{business.type}</p>
        <h1>{business.name}</h1>
        <p className="lede" style={{ marginBottom: 6 }}>
          {business.address} · {hoursSummary(page.availability)}
        </p>
        {business.description && <p className="lede" style={{ marginBottom: 0 }}>{business.description}</p>}
      </div>

      {nextAppt && (
        <div className="card">
          <p className="eyebrow">Your next appointment</p>
          <h3>
            {nextAppt.serviceName} — {formatDateInZone(new Date(nextAppt.starts_at), tz)} at{" "}
            {formatTimeInZone(new Date(nextAppt.starts_at), tz)}
          </h3>
          <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
            <Link href={`/manage/${nextAppt.manage_token}`} className="btn">Reschedule</Link>
            <Link href={`/manage/${nextAppt.manage_token}`} className="btn">Cancel</Link>
          </div>
        </div>
      )}

      <div className="action-row">
        <Link href={`/${slug}/book`} className="btn btn-primary">Book appointment</Link>
        <Link href={`/${slug}/message`} className="btn">Message us</Link>
        {business.phone ? (
          <a href={`tel:${business.phone.replace(/[^+\d]/g, "")}`} className="btn">Call office</a>
        ) : (
          <span className="btn" aria-disabled="true">Call office</span>
        )}
      </div>

      <div className="card">
        <h2>Services</h2>
        {services.length === 0 && <p className="small">Services coming soon.</p>}
        {services.map((s) => (
          <div key={s.id} className="service-row">
            <div>
              <div className="service-name">{s.name}</div>
              <div className="service-meta">{s.duration_minutes} min · {formatPrice(s.price_cents)}</div>
            </div>
            <Link href={`/${slug}/book?service=${s.id}`} className="btn" style={{ padding: "8px 14px" }}>
              Select
            </Link>
          </div>
        ))}
      </div>

      {reviewSummary && (
        <div className="card">
          <h2>
            {reviewSummary.avg} ★ <span className="small">· {reviewSummary.total} review{reviewSummary.total === 1 ? "" : "s"}</span>
          </h2>
          {reviewSummary.latest.map((r, i) => (
            <div key={i} style={{ padding: "8px 0", borderBottom: i < reviewSummary!.latest.length - 1 ? "1px solid var(--line)" : "none" }}>
              <div style={{ fontWeight: 600 }}>
                {"★".repeat(r.rating)}
                <span style={{ color: "var(--line)" }}>{"★".repeat(5 - r.rating)}</span>
                <span className="small" style={{ fontWeight: 400 }}> — {r.name}</span>
              </div>
              {r.comment && <p className="small" style={{ margin: "2px 0 0" }}>{r.comment}</p>}
            </div>
          ))}
        </div>
      )}

      <p className="small center">
        <Link href="/login">Sign in</Link> · <Link href="/signup">Create an account</Link> ·{" "}
        <Link href="/my-appointments">My appointments</Link>
      </p>
    </main>
  );
}
