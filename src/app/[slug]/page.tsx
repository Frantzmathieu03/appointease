import Link from "next/link";
import { notFound } from "next/navigation";
import { getBusinessPageData, hoursSummary } from "@/lib/data";
import { isDemoShop } from "@/lib/demo";
import { createServerSupabase, isSupabaseConfigured } from "@/lib/supabase";
import { getBillingState } from "@/lib/plans";
import { formatPrice } from "@/lib/types";
import AddressDirections from "@/components/AddressDirections";
import { categoryLabel } from "@/lib/categories";
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
  // Demo shops (public examples): labeled as demos, contact rows hidden,
  // no call/message actions — booking is a safe simulation (see lib/demo).
  const demoShop = isDemoShop(slug);

  // Billing gate: a business whose trial ended with no active subscription
  // (or whose subscription lapsed past its grace window) shows a paused
  // notice instead of the booking page. Nothing is deleted — existing
  // appointments stay manageable and the owner dashboard stays open.
  if (!getBillingState(business).bookingLive) {
    return (
      <main className="column">
        <div className="hero-card">
          <p className="eyebrow">{business.category ? categoryLabel(business.category) : business.type}</p>
          <h1>{business.name}</h1>
          {business.address && <p className="lede">{business.address}</p>}
        </div>
        <div className="card center">
          <h2>Online booking is temporarily unavailable</h2>
          <p className="lede">
            {business.name} isn&apos;t taking online bookings right now.
            {business.phone && !demoShop && (
              <>
                {" "}You can still reach them at{" "}
                <a href={`tel:${business.phone.replace(/[^+\d]/g, "")}`}>{business.phone}</a>.
              </>
            )}
          </p>
          <p className="small">
            Already have an appointment? You can still view, reschedule or
            cancel it from <Link href="/my-appointments">My appointments</Link>.
          </p>
          <p className="small">
            Business owner? <Link href="/owner">Sign in</Link> to reactivate
            your booking page.
          </p>
        </div>
      </main>
    );
  }

  // Reviews (carried over from the old app): average + latest few, public.
  let reviewSummary: { avg: number; total: number; latest: { rating: number; comment: string | null; name: string }[] } | null = null;
  if (!page.demoMode && !demoShop && isSupabaseConfigured()) {
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
  let nextAppt: { starts_at: string; manage_token: string; serviceName: string; confirmationCode: string | null } | null = null;
  if (!page.demoMode && !demoShop && isSupabaseConfigured()) {
    const supabase = await createServerSupabase();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) {
      const { data } = await supabase
        .from("appointments")
        .select("starts_at, manage_token, confirmation_code, services:service_id ( name )")
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
          confirmationCode: data.confirmation_code ?? null,
          serviceName:
            (data as unknown as { services: { name: string } }).services?.name ?? "Appointment",
        };
      }
    }
  }

  return (
    <main className="column">
      {page.demoMode && !demoShop && (
        <div className="notice">Demo business — running on sample data until the live database is connected.</div>
      )}
      {demoShop && (
        <div className="notice" role="note">
          <strong>Demo shop</strong> — this is a live demo of an AppointEase
          booking page. Try booking, nothing is real: no appointment is
          saved and no messages are sent.
        </div>
      )}

      <div className="hero-card">
        {business.logo_url && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={business.logo_url}
            alt={`${business.name} logo`}
            style={{
              width: 76,
              height: 76,
              objectFit: "cover",
              borderRadius: "50%",
              border: "2px solid rgba(255,255,255,0.65)",
              marginBottom: 10,
              background: "#fff",
            }}
          />
        )}
        <p className="eyebrow">{business.category ? categoryLabel(business.category) : business.type}</p>
        <h1>{business.name}</h1>
        {demoShop && (
          <p style={{ margin: "0 0 8px" }}>
            <span className="demo-badge">Demo shop</span>
          </p>
        )}
        {business.address && (
          <p className="lede" style={{ marginBottom: 6 }}>📍 {business.address}</p>
        )}
        <p className="lede" style={{ marginBottom: 6 }}>
          {hoursSummary(page.availability)}
        </p>
        {business.description && <p className="lede" style={{ marginBottom: 0 }}>{business.description}</p>}

        <div
          className="action-row"
          style={{ margin: "16px 0 0", ...(demoShop ? { gridTemplateColumns: "1fr" } : {}) }}
        >
          <Link
            href={`/${slug}/book`}
            className="btn"
            style={{ background: "#fff", color: "var(--green)", borderColor: "#fff" }}
          >
            Book appointment
          </Link>
          {!demoShop && (
            <Link
              href={`/${slug}/message`}
              className="btn"
              style={{ background: "transparent", color: "#fff", borderColor: "rgba(255,255,255,0.65)" }}
            >
              Message us
            </Link>
          )}
          {!demoShop &&
            (business.phone ? (
              <a
                href={`tel:${business.phone.replace(/[^+\d]/g, "")}`}
                className="btn"
                style={{ background: "transparent", color: "#fff", borderColor: "rgba(255,255,255,0.65)" }}
              >
                Call {business.phone}
              </a>
            ) : (
              <span
                className="btn"
                aria-disabled="true"
                style={{ background: "transparent", color: "#fff", borderColor: "rgba(255,255,255,0.65)" }}
              >
                Call office
              </span>
            ))}
        </div>
      </div>

      {nextAppt && (
        <div className="card">
          <p className="eyebrow">Your next appointment</p>
          <h3>
            {nextAppt.serviceName} — {formatDateInZone(new Date(nextAppt.starts_at), tz)} at{" "}
            {formatTimeInZone(new Date(nextAppt.starts_at), tz)}
          </h3>
          {nextAppt.confirmationCode && (
            <p className="small" style={{ margin: "0 0 4px" }}>
              Confirmation #: <strong>{nextAppt.confirmationCode}</strong>
            </p>
          )}
          <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
            <Link href={`/manage/${nextAppt.manage_token}`} className="btn">Reschedule</Link>
            <Link href={`/manage/${nextAppt.manage_token}`} className="btn">Cancel</Link>
          </div>
        </div>
      )}

      {(business.address || business.phone || business.email) && (
        <div className="card">
          <h2>Visit us</h2>
          {business.address && (
            <p style={{ margin: "4px 0" }}>
              📍 <AddressDirections address={business.address} />{" "}
              <span className="small">— tap for directions</span>
            </p>
          )}
          {business.phone && !demoShop && (
            <p style={{ margin: "4px 0" }}>
              📞 <a href={`tel:${business.phone.replace(/[^+\d]/g, "")}`}>{business.phone}</a>
            </p>
          )}
          {business.email && !demoShop && (
            <p style={{ margin: "4px 0" }}>
              ✉️ <a href={`mailto:${business.email}`}>{business.email}</a>
            </p>
          )}
          <p className="small" style={{ margin: "6px 0 0" }}>
            Hours: {hoursSummary(page.availability)}
          </p>
        </div>
      )}

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

      {page.photos.length > 0 && (
        <div className="card">
          <h2>Our work</h2>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 10,
            }}
          >
            {page.photos.map((p) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                key={p.id}
                src={p.url}
                alt={`Work by ${business.name}`}
                style={{
                  width: "100%",
                  aspectRatio: "4 / 3",
                  objectFit: "cover",
                  borderRadius: 14,
                  border: "1px solid var(--line)",
                  display: "block",
                }}
              />
            ))}
          </div>
        </div>
      )}

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
