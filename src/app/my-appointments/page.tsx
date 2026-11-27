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
  service_id: string;
  businesses: { name: string; slug: string; address: string | null; timezone: string; logo_url: string | null; phone: string | null } | null;
  services: { name: string } | null;
}

interface BizLite {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
}

// Customer appointments, PER-BUSINESS model (Frantz, 2026-11-25):
// there is no cross-business customer home anymore. With a business
// in context (?business=<slug>: old links, the sign-in default) this
// page shows ONLY that business's appointments; the full dashboard
// for a business lives at /<slug>/my. Without a business in context
// it is a plain picker: "Your businesses": listing the businesses
// this customer has joined, each opening its own separate dashboard.
// Appointments, messages and history never mix across businesses.
export default async function MyAppointmentsPage({
  searchParams,
}: {
  searchParams: Promise<{ business?: string }>;
}) {
  const { business: focusSlug } = await searchParams;
  if (!isSupabaseConfigured()) {
    return (
      <main className="column">
        <div className="notice">
          Demo mode. Accounts and saved appointments turn on when the live
          database is connected. Try the sample business meanwhile:
        </div>
        <Link href="/main-street-barbers" className="btn btn-primary btn-block">
          Visit Main Street Barbers
        </Link>
      </main>
    );
  }

  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    const dest = focusSlug ? `/my-appointments?business=${focusSlug}` : "/my-appointments";
    redirect(`/login?next=${encodeURIComponent(dest)}`);
  }
  await ensureCustomerProfile(supabase, user);

  // The business in context, if any (published businesses are public).
  let focusBiz: BizLite | null = null;
  if (focusSlug) {
    const { data: biz } = await supabase
      .from("businesses")
      .select("id, name, slug, logo_url")
      .eq("slug", focusSlug)
      .eq("published", true)
      .maybeSingle();
    focusBiz = (biz as BizLite) ?? null;
  }

  const { data } = await supabase
    .from("appointments")
    .select(
      "id, starts_at, status, manage_token, confirmation_code, business_id, service_id, businesses:business_id ( name, slug, address, timezone, logo_url, phone ), services:service_id ( name )"
    )
    .eq("customer_id", user.id)
    .order("starts_at", { ascending: true });
  const allAppts = (data ?? []) as unknown as ApptRow[];
  // Scoped mode: only the focus business's appointments exist here.
  const appts = focusBiz
    ? allAppts.filter((a) => a.business_id === focusBiz.id)
    : allAppts;

  // Intake forms (migration 0012): which of these appointments'
  // services have a form attached, and which appointments already have
  // a submission. Both queries degrade to empty before the migration.
  const intakeByAppt = new Map<string, { formName: string; submitted: boolean }>();
  if (appts.length > 0) {
    try {
      const serviceIds = [...new Set(appts.map((a) => a.service_id))];
      const { data: svcRows, error: svcErr } = await supabase
        .from("services")
        .select("id, form_id")
        .in("id", serviceIds);
      if (!svcErr && svcRows) {
        const formIds = [
          ...new Set(
            svcRows
              .map((s) => (s as { form_id: string | null }).form_id)
              .filter((f): f is string => !!f)
          ),
        ];
        if (formIds.length > 0) {
          const [{ data: formRows }, { data: subRows }] = await Promise.all([
            supabase.from("forms").select("id, name").in("id", formIds),
            supabase
              .from("form_submissions")
              .select("appointment_id")
              .eq("customer_id", user.id)
              .in(
                "appointment_id",
                appts.map((a) => a.id)
              ),
          ]);
          const formName = new Map(
            (formRows ?? []).map((f) => [f.id as string, f.name as string])
          );
          const submittedAppts = new Set(
            (subRows ?? []).map((s) => s.appointment_id as string)
          );
          const formByService = new Map(
            svcRows.map((s) => [
              s.id as string,
              (s as { form_id: string | null }).form_id,
            ])
          );
          for (const a of appts) {
            const fid = formByService.get(a.service_id);
            if (fid && formName.has(fid)) {
              intakeByAppt.set(a.id, {
                formName: formName.get(fid)!,
                submitted: submittedAppts.has(a.id),
              });
            }
          }
        }
      }
    } catch {
      // Intake display is additive: never break the appointments list.
    }
  }

  const { data: myReviews } = await supabase
    .from("reviews")
    .select("appointment_id")
    .eq("customer_id", user.id);
  const reviewed = new Set((myReviews ?? []).map((r) => r.appointment_id));

  // Shared visit summaries (migration 0010): when a business shares a
  // visit summary, the customer sees it here with their own to-dos.
  // RLS only ever returns this customer's shared notes: internal notes
  // are never visible on this side. Empty until the migration lands.
  interface SharedNote {
    appointment_id: string;
    shared_summary: string | null;
    steps: { id: string; text: string; due_date: string | null; done_at: string | null }[];
  }
  const sharedByAppt = new Map<string, SharedNote>();
  const { data: sharedNotes } = await supabase
    .from("visit_notes")
    .select("id, appointment_id, shared_summary")
    .eq("customer_id", user.id)
    .eq("visibility", "shared");
  if (sharedNotes && sharedNotes.length > 0) {
    const { data: stepRows } = await supabase
      .from("next_steps")
      .select("id, visit_note_id, text, due_date, done_at")
      .in(
        "visit_note_id",
        sharedNotes.map((n) => n.id)
      )
      .eq("owner", "client");
    for (const n of sharedNotes) {
      sharedByAppt.set(n.appointment_id, {
        appointment_id: n.appointment_id,
        shared_summary: n.shared_summary,
        steps: (stepRows ?? [])
          .filter((s) => s.visit_note_id === n.id)
          .map((s) => ({ id: s.id, text: s.text, due_date: s.due_date, done_at: s.done_at })),
      });
    }
  }

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
        <h3 style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {a.businesses?.logo_url && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={a.businesses.logo_url}
              alt={`${a.businesses.name} logo`}
              width={34}
              height={34}
              style={{ borderRadius: 9, objectFit: "cover" }}
            />
          )}
          <span>
            {a.services?.name ?? "Appointment"} · {a.businesses?.name}
          </span>
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
          {intakeByAppt.has(a.id) &&
            (intakeByAppt.get(a.id)!.submitted ? (
              <span className="btn" aria-disabled="true" style={{ opacity: 0.75 }}>
                ✓ Form sent
              </span>
            ) : (
              <Link href={`/manage/${a.manage_token}/form`} className="btn btn-primary">
                Fill in the form
              </Link>
            ))}
          {a.businesses && (
            <Link href={`/${a.businesses.slug}/message`} className="btn">
              Message
              <UnreadBadge variant="customer" businessId={a.business_id} />
            </Link>
          )}
        </div>
        {sharedByAppt.get(a.id)?.shared_summary && (
          <div style={{ margin: "0 0 10px" }}>
            <p className="small" style={{ margin: "2px 0" }}>
              <strong>Visit summary from {a.businesses?.name}:</strong>{" "}
              {sharedByAppt.get(a.id)!.shared_summary}
            </p>
            {sharedByAppt.get(a.id)!.steps.length > 0 && (
              <ul style={{ margin: "4px 0 0", paddingLeft: 18 }}>
                {sharedByAppt.get(a.id)!.steps.map((s) => (
                  <li key={s.id} className="small" style={{ textDecoration: s.done_at ? "line-through" : "none" }}>
                    {s.text}
                    {s.due_date ? ` · by ${s.due_date}` : ""}
                    {s.done_at ? " · done" : ""}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
        {a.status !== "confirmed" || new Date(a.starts_at).getTime() < now ? (
          !reviewed.has(a.id) && a.status !== "cancelled" ? (
            <ReviewForm appointmentId={a.id} />
          ) : null
        ) : null}
      </div>
    );
  };

  // ── No business in context: the picker. Names and logos only: 
  // no appointment, message or history data from any business here.
  if (!focusBiz) {
    const { data: memberRows } = await supabase
      .from("business_customers")
      .select("business_id, businesses:business_id ( id, name, slug, logo_url )")
      .eq("customer_id", user.id);
    const bizById = new Map<string, BizLite>();
    for (const r of memberRows ?? []) {
      const b = (r as unknown as { businesses: BizLite | null }).businesses;
      if (b) bizById.set(b.id, b);
    }
    // Anyone with appointments at a business belongs in its world even
    // if a membership row is somehow missing (older bookings).
    for (const a of allAppts) {
      if (a.businesses && !bizById.has(a.business_id)) {
        bizById.set(a.business_id, {
          id: a.business_id,
          name: a.businesses.name,
          slug: a.businesses.slug,
          logo_url: a.businesses.logo_url,
        });
      }
    }
    const myBusinesses = [...bizById.values()].sort((x, y) => x.name.localeCompare(y.name));

    return (
      <main className="column">
        <h1 style={{ fontSize: 28 }}>Your businesses</h1>
        <p className="small" style={{ margin: "0 0 16px" }}>
          Each business has its own dashboard. Your appointments,
          messages and history with that business live there, and only
          there.
        </p>

        {myBusinesses.length === 0 && (
          <div className="card">
            <p className="lede" style={{ marginBottom: 10 }}>
              You haven&apos;t joined a business yet. Open a business&apos;s
              page link and sign up there, or browse businesses near you.
            </p>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <Link href="/explore" className="btn btn-primary">Find a business</Link>
              <Link href="/main-street-barbers" className="btn">Try the sample shop</Link>
            </div>
          </div>
        )}

        {myBusinesses.map((b) => (
          <div className="card" key={b.id}>
            <h3 style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 0 }}>
              {b.logo_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={b.logo_url}
                  alt={`${b.name} logo`}
                  width={34}
                  height={34}
                  style={{ borderRadius: 9, objectFit: "cover" }}
                />
              ) : (
                <span className="biz-header-initial" aria-hidden="true">
                  {b.name.trim().charAt(0).toUpperCase() || "?"}
                </span>
              )}
              <span>{b.name}</span>
            </h3>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <Link href={`/${b.slug}/my`} className="btn btn-primary">
                Open my dashboard
              </Link>
              <Link href={`/${b.slug}`} className="btn">
                Visit page
              </Link>
            </div>
          </div>
        ))}

        <div className="card">
          <h3>Message alerts</h3>
          <p className="small" style={{ marginBottom: 10 }}>
            When a business replies, we email you right away. Turn on push as well
            so replies reach this device instantly:
          </p>
          <PushOptIn />
        </div>

        <form action="/auth/signout" method="post" style={{ textAlign: "center" }}>
          <button className="btn" type="submit">Log out</button>
        </form>
      </main>
    );
  }

  // ── Business in context: ONLY that business's appointments.
  return (
    <main className="column">
      <p className="eyebrow">{focusBiz.name}</p>
      <h1 style={{ fontSize: 28, marginBottom: 10 }}>My appointments</h1>
      <p className="small" style={{ margin: "0 0 16px" }}>
        Only your appointments with {focusBiz.name} are shown here.{" "}
        <Link href={`/${focusBiz.slug}/my`}>Open your full dashboard at {focusBiz.name}</Link>{" "}
        for messages and your visit history.
      </p>

      {appts.length === 0 && (
        <div className="card">
          <p className="lede" style={{ marginBottom: 10 }}>
            Nothing booked with {focusBiz.name} yet.
          </p>
          <Link href={`/${focusBiz.slug}/book`} className="btn btn-primary">
            Book at {focusBiz.name}
          </Link>
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

      <form action="/auth/signout" method="post" style={{ textAlign: "center" }}>
        <button className="btn" type="submit">Log out</button>
      </form>
    </main>
  );
}
