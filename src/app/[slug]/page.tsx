import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getBusinessPageDataWithPreview, hoursSummary, openStatus } from "@/lib/data";
import { isDemoShop } from "@/lib/demo";
import { createServerSupabase, isSupabaseConfigured } from "@/lib/supabase";
import {
  ensureBusinessMembership,
  ensureCustomerProfile,
  isBusinessMember,
} from "@/lib/profile";
import { getBillingState } from "@/lib/plans";
import { formatPhone, formatPrice, visitTypeLabel } from "@/lib/types";
import AddressDirections from "@/components/AddressDirections";
import { categoryLabel } from "@/lib/categories";
import { formatDateInZone, formatTimeInZone } from "@/lib/slots";

// Contact-card line icons (Visit us restyle, Frantz 2026-11-25): one
// small consistent set, single color via currentColor, no emojis.
function PinIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 21s-7-5.6-7-11a7 7 0 1 1 14 0c0 5.4-7 11-7 11z" />
      <circle cx="12" cy="10" r="2.6" />
    </svg>
  );
}
function PhoneIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M5 4h4l1.5 4.5L8 10a12.5 12.5 0 0 0 6 6l1.5-2.5L20 15v4a2 2 0 0 1-2.2 2A17.5 17.5 0 0 1 3 6.2 2 2 0 0 1 5 4z" />
    </svg>
  );
}
function MailIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="M3.5 6.5 12 13l8.5-6.5" />
    </svg>
  );
}
function ClockIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 7.5V12l3 2" />
    </svg>
  );
}

export default async function BusinessPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ join?: string }>;
}) {
  const { slug } = await params;
  const { join } = await searchParams;
  const page = await getBusinessPageDataWithPreview(slug);
  if (!page) notFound();
  const { business, services } = page;
  const tz = business.timezone;
  // A published business with no services yet is not bookable: the page
  // says so in one plain line and shows no booking button (Frantz,
  // 2026-11-25 — services are added later, in the dashboard).
  const hasServices = services.length > 0;
  // Demo shops (public examples): labeled as demos, contact rows hidden,
  // no call/message actions — booking is a safe simulation (see lib/demo).
  const demoShop = isDemoShop(slug);

  // Join on return (per-business account model, Frantz 2026-11-25):
  // the header's Sign up / Sign in buttons on this business's own
  // pages carry the join marker (?join=1) in their return path, so a
  // visitor who just completed sign-up or sign-in through them lands
  // back here WITH the marker — that deliberate completion is what
  // joins them to this business, exactly like the booking and
  // message gates. Join, then redirect to the clean page so the
  // header renders their new "My dashboard". A plain page view (no
  // marker) never joins anyone, and the owner never joins their own
  // business as a customer.
  if (join && !page.demoMode && !demoShop && isSupabaseConfigured()) {
    const supabase = await createServerSupabase();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user && user.id !== business.owner_id) {
      const member = await isBusinessMember(supabase, business.id, user.id);
      if (!member) {
        await ensureCustomerProfile(supabase, user);
        await ensureBusinessMembership(supabase, business.id, user.id);
        redirect(`/${slug}`);
      }
    }
  }

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
                <a href={`tel:${business.phone.replace(/[^+\d]/g, "")}`}>{formatPhone(business.phone)}</a>.
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

  // Per-business accounts (Frantz, 2026-11-25): merely VIEWING this
  // page does not join anyone to the business. Being signed in to
  // AppointEase does not make you a client of this business — the
  // membership starts at the deliberate join steps: the booking
  // account step, the message join step, or opening the customer's
  // dashboard for this business. That is what lets the header show
  // Sign up / Sign in honestly to everyone who is not yet a customer
  // here, the owner included.

  // Open/closed for the contact card, from the real hours.
  const status = openStatus(page.availability, tz);

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

      <div className="hero-card biz-hero">
        {business.logo_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={business.logo_url}
            alt={`${business.name} logo`}
            className="biz-hero-logo"
          />
        ) : (
          <div className="biz-hero-logo biz-hero-initial" aria-hidden="true">
            {business.name.trim().charAt(0).toUpperCase() || "?"}
          </div>
        )}
        <p className="eyebrow" style={{ marginTop: 14 }}>{business.category ? categoryLabel(business.category) : business.type}</p>
        <h1 style={{ marginBottom: 8 }}>{business.name}</h1>
        {demoShop && (
          <p style={{ margin: "0 0 8px" }}>
            <span className="demo-badge">Demo shop</span>
          </p>
        )}
        {business.description && (
          <p className="biz-hero-about">{business.description}</p>
        )}
        <p className="biz-hero-line">
          {[business.address, hoursSummary(page.availability)].filter(Boolean).join(" · ")}
        </p>
        {!hasServices && (
          <p className="lede" style={{ margin: "10px 0 0" }}>
            This business is not taking bookings yet.
          </p>
        )}

        <div
          className="action-row"
          style={{
            margin: "18px 0 0",
            ...(demoShop
              ? { gridTemplateColumns: "1fr" }
              : !hasServices
                ? { gridTemplateColumns: "1fr 1fr" }
                : {}),
          }}
        >
          {hasServices && (
            <Link
              href={`/${slug}/book`}
              className="btn"
              style={{ background: "#fff", color: "var(--green)", borderColor: "#fff" }}
            >
              Book appointment
            </Link>
          )}
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
                Call {formatPhone(business.phone)}
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

      {(business.address || business.phone || business.email) && (
        <div className="card">
          <h2>Visit us</h2>
          {/* Clean contact card (Frantz, 2026-11-25): line icons on a
              shared left edge, plain text with NO underlined links,
              even rows with thin dividers. The address row keeps the
              directions sheet (Google Maps / Apple Maps / Waze / Copy
              address) behind a quiet "Get directions" action. */}
          <div className="contact-list">
            {business.address && (
              <div className="contact-row">
                <span className="contact-icon"><PinIcon /></span>
                <span style={{ flex: 1 }}>{business.address}</span>
                <AddressDirections address={business.address} variant="action" />
              </div>
            )}
            {business.phone && !demoShop && (
              <div className="contact-row">
                <span className="contact-icon"><PhoneIcon /></span>
                <a href={`tel:${business.phone.replace(/[^+\d]/g, "")}`}>{formatPhone(business.phone)}</a>
              </div>
            )}
            {business.email && !demoShop && (
              <div className="contact-row">
                <span className="contact-icon"><MailIcon /></span>
                <a href={`mailto:${business.email}`}>{business.email}</a>
              </div>
            )}
            <div className="contact-row">
              <span className="contact-icon"><ClockIcon /></span>
              <span style={{ flex: 1 }}>
                {status
                  ? status.todayLabel
                    ? `Today · ${status.todayLabel}`
                    : "Today · Closed"
                  : hoursSummary(page.availability)}
              </span>
              {status && (
                <span className="open-note">
                  <span className={status.state === "open" ? "open-dot" : "closed-dot"} aria-hidden="true" />
                  {status.note}
                </span>
              )}
            </div>
          </div>
          {status && (
            <p className="small" style={{ margin: "10px 0 0" }}>
              Hours: {hoursSummary(page.availability)}
            </p>
          )}
          {page.locations.length > 0 && (
            <div style={{ marginTop: 6 }}>
              <p style={{ margin: "10px 0 0", fontWeight: 600 }}>Our locations</p>
              {page.locations.map((loc) => (
                <div key={loc.id} className="contact-loc">
                  <p style={{ margin: "0 0 2px", fontWeight: 600 }}>{loc.name}</p>
                  {loc.address && (
                    <div className="contact-loc-row">
                      <span style={{ flex: 1 }}>{loc.address}</span>
                      <AddressDirections address={loc.address} variant="action" />
                    </div>
                  )}
                  {loc.phone && !demoShop && (
                    <div className="contact-loc-row">
                      <a href={`tel:${loc.phone.replace(/[^+\d]/g, "")}`}>{formatPhone(loc.phone)}</a>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {hasServices && (
        <div className="card">
          <h2>Services</h2>
          {services.map((s) => (
            <div key={s.id} className="service-row">
              <div>
                <div className="service-name">{s.name}</div>
                <div className="service-meta">
                  {s.duration_minutes} min · {formatPrice(s.price_cents)} · {visitTypeLabel(s.visit_type)}
                </div>
              </div>
              <Link href={`/${slug}/book?service=${s.id}`} className="btn" style={{ padding: "8px 14px" }}>
                Select
              </Link>
            </div>
          ))}
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

    </main>
  );
}
