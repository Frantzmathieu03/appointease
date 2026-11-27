import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import {
  getBusinessPageDataWithPreview,
  hoursLines,
  openStatus,
  parseCityState,
} from "@/lib/data";
import { isDemoShop } from "@/lib/demo";
import { createAdminSupabase, createServerSupabase, isSupabaseConfigured } from "@/lib/supabase";
import {
  ensureBusinessMembership,
  ensureCustomerProfile,
  isBusinessMember,
  isBusinessTeamMember,
  recordSmsConsent,
} from "@/lib/profile";
import { getBillingState } from "@/lib/plans";
import { formatPhone, formatServicePrice } from "@/lib/types";
import AddressDirections from "@/components/AddressDirections";
import { categoryLabel } from "@/lib/categories";
import { formatDateInZone, formatTimeInZone } from "@/lib/slots";

// The public business page, rebuilt to Frantz's written page plan +
// design pictures (2026-11-26): everything centered in a 390–480px
// column — top-right Log in / Sign up (the page's only auth buttons),
// a cover photo with the round logo overlapping it, the name and a
// quiet "Type · City, ST" line, an open-status pill, the owner's own
// words, one big Book button, Call / Message / Directions squares,
// then white cards for photos, services and hours & location, and a
// small footer (Privacy · Terms, Powered by AppointEase). Reviews no
// longer render on this page (the plan has no reviews section; the
// data and dashboard features are untouched). All data, gates and
// join behavior are exactly what the previous design ran on.

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const page = await getBusinessPageDataWithPreview(slug);
  if (!page) return {};
  const { business, photos } = page;
  const typeLabel = business.type ?? categoryLabel(business.category);
  const cityState = parseCityState(business.address);
  const description =
    business.description?.trim() ||
    (cityState ? `${typeLabel} · ${cityState}` : typeLabel);
  const image =
    business.cover_url ??
    business.logo_url ??
    photos[0]?.url ??
    "/hero/hero-poster.jpg";
  return {
    title: business.name,
    description,
    openGraph: { title: business.name, description, images: [{ url: image }] },
    twitter: {
      card: "summary_large_image",
      title: business.name,
      description,
      images: [image],
    },
  };
}

const PhoneIcon = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M5 4h4l2 5-2.5 1.5a12 12 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2z" />
  </svg>
);

const MessageIcon = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M21 12a8 8 0 0 1-8 8H4l2.3-2.9A8 8 0 1 1 21 12z" />
  </svg>
);

export default async function BusinessPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ join?: string; consent?: string }>;
}) {
  const { slug } = await params;
  const { join, consent } = await searchParams;
  const page = await getBusinessPageDataWithPreview(slug);
  if (!page) {
    // Join on return for an UNPUBLISHED business (Frantz, 2026-11-25):
    // the preview above serves insiders only, so a brand-new customer
    // returning from sign-up with the join marker is not a member yet
    // and the fetch misses — the page must not 404 before the join can
    // run. Look the business up by slug without the published filter
    // (service-role, minimal fields; RLS hides the row from a new
    // customer), and when it exists and the signed-in user is not the
    // owner, join them and redirect to their customer dashboard
    // (/<slug>/my) — which now renders for them as a member. A
    // business that truly does not exist still 404s, signed-out
    // returns still 404, and the owner never joins their own business.
    if (join && !isDemoShop(slug) && isSupabaseConfigured()) {
      const supabase = await createServerSupabase();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        const admin = createAdminSupabase();
        const { data: biz } = await admin
          .from("businesses")
          .select("id, owner_id")
          .eq("slug", slug)
          .maybeSingle();
        if (biz && biz.owner_id !== user.id) {
          await ensureCustomerProfile(supabase, user);
          await ensureBusinessMembership(supabase, biz.id, user.id, {
            smsConsent: consent === "1",
          });
          redirect(`/${slug}/my`);
        }
      }
    }
    notFound();
  }
  const { business, services } = page;
  const tz = business.timezone;
  // The Book button always shows (Frantz, 2026-11-26): a business is
  // never blocked from taking bookings for having no services yet —
  // page data supplies the generic default appointment in that case
  // (see lib/default-service), and every business also gets a real
  // default service at creation and by backfill.
  // Demo shops (public examples): labeled as demos, contact rows hidden,
  // no call/message actions — booking is a safe simulation (see lib/demo).
  const demoShop = isDemoShop(slug);

  // Join on return (per-business account model, Frantz 2026-11-25):
  // the header's Sign up / Sign in buttons on this business's own
  // pages carry the join marker (?join=1) in their return path, so a
  // visitor who just completed sign-up or sign-in through them lands
  // back here WITH the marker — that deliberate completion is what
  // joins them to this business, exactly like the booking and
  // message gates. Join, then land them on their own customer
  // dashboard (/<slug>/my) — after sign-in a customer should see
  // THEIR name and THEIR information, not the business storefront
  // again (Frantz, 2026-11-26). An already-joined member returning
  // through the same buttons lands there too. A plain page view (no
  // marker) never joins anyone and still renders the storefront, and
  // the owner never joins their own business as a customer.
  if (join && !page.demoMode && !demoShop && isSupabaseConfigured()) {
    const supabase = await createServerSupabase();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user && user.id !== business.owner_id) {
      const member = await isBusinessMember(supabase, business.id, user.id);
      if (!member) {
        await ensureCustomerProfile(supabase, user);
        await ensureBusinessMembership(supabase, business.id, user.id, {
          smsConsent: consent === "1",
        });
      } else if (consent === "1") {
        await recordSmsConsent(supabase, business.id, user.id);
      }
      redirect(`/${slug}/my`);
    }
  }

  // The top-right auth row (the plan replaces the old slim header on
  // this page): "My dashboard" for anyone signed in with a home at
  // this business — the OWNER dashboard for the owner and active
  // team members, the customer dashboard for a joined customer (the
  // exact rule BusinessHeader applies on the book / message / my
  // surfaces, Frantz 2026-11-26). Demo shops keep their sample
  // behavior (any signed-in visitor sees the dashboard pill).
  // Everyone else sees Log in / Sign up, both carrying
  // next=/<slug>?join=1 so completing auth joins them here.
  let signedInUser: { id: string } | null = null;
  let dashboardHref: string | null = null;
  if (!page.demoMode && isSupabaseConfigured()) {
    try {
      const supabase = await createServerSupabase();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        signedInUser = user;
        if (demoShop) {
          dashboardHref = `/${slug}/my`;
        } else if (
          user.id === business.owner_id ||
          (await isBusinessTeamMember(createAdminSupabase(), business.id, user.id))
        ) {
          dashboardHref = "/owner/dashboard";
        } else if (await isBusinessMember(supabase, business.id, user.id)) {
          dashboardHref = `/${slug}/my`;
        }
      }
    } catch {
      dashboardHref = null;
    }
  }
  const nextPath = demoShop ? `/${slug}` : `/${slug}?join=1`;
  const authRow = (
    <div className="bp-auth">
      {dashboardHref ? (
        <Link className="bp-auth-btn bp-auth-signup" href={dashboardHref}>
          My dashboard
        </Link>
      ) : (
        <>
          <Link
            className="bp-auth-btn bp-auth-login"
            href={`/login?next=${encodeURIComponent(nextPath)}`}
          >
            Log in
          </Link>
          <Link
            className="bp-auth-btn bp-auth-signup"
            href={`/signup?next=${encodeURIComponent(nextPath)}`}
          >
            Sign up
          </Link>
        </>
      )}
    </div>
  );

  // Billing gate: a business whose trial ended with no active subscription
  // (or whose subscription lapsed past its grace window) shows a paused
  // notice instead of the booking page. Nothing is deleted — existing
  // appointments stay manageable and the owner dashboard stays open.
  if (!getBillingState(business).bookingLive) {
    return (
      <main className="bp-column">
        {authRow}
        <h1 className="bp-name">{business.name}</h1>
        <section className="bp-card" style={{ textAlign: "center" }}>
          <h2 style={{ marginTop: 0 }}>Online booking is temporarily unavailable</h2>
          <p style={{ color: "#5b6b61" }}>
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
          <p className="small" style={{ marginBottom: 0 }}>
            Business owner? <Link href="/owner">Sign in</Link> to reactivate
            your booking page.
          </p>
        </section>
      </main>
    );
  }

  // Per-business accounts (Frantz, 2026-11-25): merely VIEWING this
  // page does not join anyone to the business. Being signed in to
  // AppointEase does not make you a client of this business — the
  // membership starts at the deliberate join steps: the booking
  // account step, the message join step, or opening the customer's
  // dashboard for this business. That is what lets the page show
  // Sign up / Log in honestly to everyone who is not yet a customer
  // here, the owner included.

  // Open/closed pill, from the real hours.
  const status = openStatus(page.availability, tz);

  // If the signed-in customer has a next appointment here, it sits on
  // the page — with Reschedule / Cancel one tap away (owner spec).
  let nextAppt: { starts_at: string; manage_token: string; serviceName: string; confirmationCode: string | null } | null = null;
  if (!page.demoMode && !demoShop && signedInUser) {
    const supabase = await createServerSupabase();
    const { data } = await supabase
      .from("appointments")
      .select("starts_at, manage_token, confirmation_code, services:service_id ( name )")
      .eq("business_id", business.id)
      .eq("customer_id", signedInUser.id)
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

  const typeLabel = business.type ?? categoryLabel(business.category);
  const cityState = parseCityState(business.address);
  const tagline = cityState ? `${typeLabel} · ${cityState}` : typeLabel;
  const hourLines = hoursLines(page.availability);

  // The address on two lines: split at the first comma when that
  // reads sensibly ("120 Harbor Walk" / "Suite 4, Boston, MA"); if it
  // cannot be split, it shows as stored, wrapped.
  const addressLines = ((): string[] => {
    const addr = business.address?.trim();
    if (!addr) return [];
    const idx = addr.indexOf(",");
    if (idx > 0) {
      const first = addr.slice(0, idx).trim();
      const rest = addr.slice(idx + 1).trim();
      if (first && rest) return [first, rest];
    }
    return [addr];
  })();

  // The three squares. Demo shops keep their behavior: no Call and no
  // Message (booking there is a simulation), Directions only.
  const squares: ("call" | "message" | "directions")[] = [];
  if (business.phone && !demoShop) squares.push("call");
  if (!demoShop && !page.demoMode) squares.push("message");
  if (business.address) squares.push("directions");

  return (
    <main className="bp-column">
      {authRow}

      {page.demoMode && !demoShop && (
        <div className="notice" style={{ marginBottom: 14 }}>
          Demo business — running on sample data until the live database is connected.
        </div>
      )}
      {demoShop && (
        <div className="notice" role="note" style={{ marginBottom: 14 }}>
          <strong>Demo shop</strong> — this is a live demo of an AppointEase
          booking page. Try booking, nothing is real: no appointment is
          saved and no messages are sent.
        </div>
      )}

      {/* Cover photo — its own image (businesses.cover_url); with no
          cover set, a plain soft-green block of the same size. */}
      <div className="bp-cover-wrap">
        <div className="bp-cover">
          {business.cover_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={business.cover_url} alt="" />
          ) : null}
        </div>
      </div>

      {/* Round logo overlapping the cover's bottom edge. */}
      {business.logo_url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img className="bp-logo" src={business.logo_url} alt={`${business.name} logo`} />
      ) : (
        <div className="bp-logo bp-logo-initial" aria-hidden="true">
          {business.name.trim().charAt(0).toUpperCase() || "?"}
        </div>
      )}

      <h1 className="bp-name">{business.name}</h1>
      <p className="bp-tagline">{tagline}</p>
      {demoShop && (
        <div style={{ textAlign: "center", marginBottom: 8 }}>
          <span className="demo-badge">Demo shop</span>
        </div>
      )}

      {/* Open status pill — hidden when the business has no hours. */}
      {status && (
        <div className="bp-status">
          <span className="bp-pill">
            <span className={`bp-pill-dot${status.state === "open" ? "" : " bp-pill-dot-closed"}`} />
            {status.pill}
          </span>
        </div>
      )}

      {/* The owner's own words — one centered paragraph, no card. */}
      {business.description?.trim() && (
        <p className="bp-about">{business.description.trim()}</p>
      )}

      {nextAppt && (
        <section className="bp-card bp-next">
          <p className="eyebrow" style={{ margin: "0 0 6px" }}>Your next appointment</p>
          <p className="bp-next-when">
            {nextAppt.serviceName} — {formatDateInZone(new Date(nextAppt.starts_at), tz)} at{" "}
            {formatTimeInZone(new Date(nextAppt.starts_at), tz)}
          </p>
          {nextAppt.confirmationCode && (
            <p className="small" style={{ margin: 0 }}>
              Confirmation #: <strong>{nextAppt.confirmationCode}</strong>
            </p>
          )}
          <div className="bp-next-actions">
            <Link href={`/manage/${nextAppt.manage_token}`} className="btn">Reschedule</Link>
            <Link href={`/manage/${nextAppt.manage_token}`} className="btn">Cancel</Link>
          </div>
        </section>
      )}

      {/* The one big Book button — always shown, no matter how many
          services the business has added (Frantz, 2026-11-26). The
          booking page runs its account/join steps from here. */}
      <Link className="bp-book" href={`/${slug}/book`}>
        Book an appointment
      </Link>

      {squares.length > 0 && (
        <div
          className={`bp-actions${squares.length === 2 ? " bp-actions-2" : ""}${squares.length === 1 ? " bp-actions-1" : ""}`}
        >
          {squares.map((sq) =>
            sq === "call" ? (
              <a
                key="call"
                className="bp-square"
                href={`tel:${business.phone!.replace(/[^+\d]/g, "")}`}
              >
                {PhoneIcon}
                Call
              </a>
            ) : sq === "message" ? (
              <Link key="message" className="bp-square" href={`/${slug}/message`}>
                {MessageIcon}
                Message
              </Link>
            ) : (
              <AddressDirections
                key="directions"
                address={business.address!}
                variant="square"
              />
            )
          )}
        </div>
      )}

      {/* Photos — the whole card is hidden when the owner has none. */}
      {page.photos.length > 0 && (
        <section className="bp-card">
          <h2 className="bp-card-title">{business.gallery_title?.trim() || "Our work"}</h2>
          <div className="bp-photos">
            {page.photos.slice(0, 4).map((p) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img key={p.id} src={p.url} alt={`Work by ${business.name}`} loading="lazy" />
            ))}
          </div>
        </section>
      )}

      {services.length > 0 && (
        <section className="bp-card">
          <h2 className="bp-card-title">Services</h2>
          {services.map((s) => {
            const price = formatServicePrice(s);
            const meta = [`${s.duration_minutes} min`, price]
              .filter(Boolean)
              .join(" · ");
            return (
              <div className="bp-service" key={s.id}>
                <div className="bp-service-name">{s.name}</div>
                <div className="bp-service-meta">{meta}</div>
              </div>
            );
          })}
        </section>
      )}

      {(addressLines.length > 0 || hourLines.length > 0 || (business.phone && !demoShop) || (business.email && !demoShop) || page.locations.length > 0) && (
        <section className="bp-card">
          <h2 className="bp-card-title">Hours &amp; location</h2>
          {addressLines.length > 0 && (
            <p className="bp-loc">
              {addressLines.map((line, i) => (
                <span key={i}>
                  {line}
                  {i < addressLines.length - 1 && <br />}
                </span>
              ))}
            </p>
          )}
          {hourLines.length > 0 && (
            <p className="bp-hours">
              {hourLines.map((line, i) => (
                <span key={line}>
                  {line}
                  {i < hourLines.length - 1 && <br />}
                </span>
              ))}
            </p>
          )}
          {business.phone && !demoShop && (
            <p className="bp-phone">
              <a href={`tel:${business.phone.replace(/[^+\d]/g, "")}`}>
                {formatPhone(business.phone)}
              </a>
            </p>
          )}
          {business.email && !demoShop && (
            <p className="bp-phone bp-email">
              <a href={`mailto:${business.email}`}>{business.email}</a>
            </p>
          )}
          {page.locations.length > 0 &&
            page.locations.map((loc) => (
              <div className="bp-branch" key={loc.id}>
                <p className="bp-branch-name">{loc.name}</p>
                {loc.address && <p className="bp-branch-line">{loc.address}</p>}
                {loc.phone && !demoShop && (
                  <p className="bp-branch-line">
                    <a href={`tel:${loc.phone.replace(/[^+\d]/g, "")}`}>
                      {formatPhone(loc.phone)}
                    </a>
                  </p>
                )}
              </div>
            ))}
        </section>
      )}

      <footer className="bp-footer">
        <div className="bp-footer-links">
          <Link href="/privacy">Privacy</Link>
          {" · "}
          <Link href="/terms">Terms</Link>
        </div>
        <p className="bp-powered">
          <a href="https://www.appointease.io" target="_blank" rel="noreferrer">
            Powered by AppointEase
          </a>
        </p>
      </footer>
    </main>
  );
}
