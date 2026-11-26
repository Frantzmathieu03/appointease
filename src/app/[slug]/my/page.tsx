import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getBusinessPageDataWithPreview } from "@/lib/data";
import { isDemoShop } from "@/lib/demo";
import { createAdminSupabase, createServerSupabase, isSupabaseConfigured } from "@/lib/supabase";
import { ensureBusinessMembership, ensureCustomerProfile } from "@/lib/profile";
import { formatPhone } from "@/lib/types";
import { formatDateInZone, formatTimeInZone } from "@/lib/slots";
import ReviewForm from "@/components/ReviewForm";
import ThreadView from "@/components/ThreadView";
import AddToCalendar from "@/components/AddToCalendar";

interface ApptRow {
  id: string;
  starts_at: string;
  status: string;
  manage_token: string;
  confirmation_code: string | null;
  service_id: string;
  staff_id: string | null;
  services: { name: string } | null;
}

function icsStamp(d: Date): string {
  return d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}

function tzAbbrev(d: Date, tz: string): string {
  return (
    new Intl.DateTimeFormat("en-US", { timeZone: tz, timeZoneName: "short" })
      .formatToParts(d)
      .find((p) => p.type === "timeZoneName")?.value ?? ""
  );
}

// The customer's dashboard AT ONE BUSINESS (per-business account
// model, Frantz 2026-11-25): each business is its own separate world.
// Everything here is scoped to this business and this customer —
// their upcoming and past appointments here, the visit summaries this
// business shared with them, their next steps, and their two-way
// message thread with this business. Nothing from any other business
// can appear: the queries filter by this business_id throughout, and
// RLS underneath only ever returns this customer's own rows.
//
// Customer Side Plan (Frantz, 2026-11-26): the page leads with the
// customer's own name ("Hi, <first name>"), their person at the
// business when they have one, the next appointment on a dark green
// card, four big buttons (Book new / Message / Call office / Upload
// files), the real conversation embedded, and their history with
// statuses and shared summaries.
export default async function BusinessCustomerDashboard({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const page = await getBusinessPageDataWithPreview(slug);
  if (!page) notFound();
  const { business } = page;
  const tz = business.timezone;

  if (page.demoMode || isDemoShop(slug) || !isSupabaseConfigured()) {
    return (
      <main className="column">
        <div className="card center">
          <h2>Your dashboard at {business.name}</h2>
          <p className="lede">
            This is where your appointments, messages and history with{" "}
            {business.name} will live. Customer accounts turn on with the
            live business — this demo shop keeps everything as a sample.
          </p>
          <Link href={`/${slug}`} className="btn btn-primary">
            Back to {business.name}
          </Link>
        </div>
      </main>
    );
  }

  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect(`/login?next=${encodeURIComponent(`/${slug}/my`)}`);
  }
  await ensureCustomerProfile(supabase, user);
  // Opening this dashboard joins the customer to this business (the
  // per-business membership) if they somehow arrived without one.
  await ensureBusinessMembership(supabase, business.id, user.id);

  // The dashboard leads with the CUSTOMER, not the business (Frantz,
  // 2026-11-26): their own name is the heading — from their customer
  // profile first, then the sign-in account's name — with the
  // business as the smaller line under it. No name on file falls
  // back to their email, then to a plain "My dashboard".
  const { data: profile } = await supabase
    .from("customers")
    .select("full_name, email")
    .eq("id", user.id)
    .maybeSingle();
  const meta = (user.user_metadata ?? {}) as Record<string, unknown>;
  const customerName =
    (profile?.full_name && profile.full_name.trim()) ||
    (meta.full_name as string) ||
    (meta.name as string) ||
    "";
  const firstName = customerName ? customerName.split(/\s+/)[0] : "";
  const heading = firstName
    ? `Hi, ${firstName}`
    : customerName || profile?.email || user.email || "My dashboard";

  // Their person at this business (the membership's assignment).
  // Feature-safe: the column arrives with migration 0010 and the read
  // simply comes back empty before it.
  let assignedStaffId: string | null = null;
  try {
    const { data: rel } = await supabase
      .from("business_customers")
      .select("assigned_staff_id")
      .eq("business_id", business.id)
      .eq("customer_id", user.id)
      .maybeSingle();
    assignedStaffId =
      (rel as { assigned_staff_id: string | null } | null)?.assigned_staff_id ?? null;
  } catch {
    assignedStaffId = null;
  }
  const staffNameById = new Map(page.staff.map((s) => [s.id, s.name]));
  const assignedName = assignedStaffId ? staffNameById.get(assignedStaffId) : undefined;
  const assignedLine = assignedName
    ? business.category === "law-offices"
      ? `Your attorney: ${assignedName}`
      : `Your person here: ${assignedName}`
    : null;
  const signatureName = assignedName
    ? assignedName.split(/\s+/)[0]
    : business.name;

  // Unread business messages, for the Message button's red badge.
  let unread = 0;
  try {
    const { count } = await supabase
      .from("messages")
      .select("id", { count: "exact", head: true })
      .eq("business_id", business.id)
      .eq("customer_id", user.id)
      .eq("sender", "business")
      .is("read_at", null);
    unread = count ?? 0;
  } catch {
    unread = 0;
  }

  const { data } = await supabase
    .from("appointments")
    .select(
      "id, starts_at, status, manage_token, confirmation_code, service_id, staff_id, services:service_id ( name )"
    )
    .eq("business_id", business.id)
    .eq("customer_id", user.id)
    .order("starts_at", { ascending: true });
  const appts = (data ?? []) as unknown as ApptRow[];

  // Service names for the appointment cards. The join above runs on
  // the customer's own session, and RLS hides an unpublished
  // business's service rows even from its joined customers — so at an
  // unpublished business the joined name comes back null and the card
  // would fall back to the word "Appointment". This page only renders
  // for a verified insider of the business (the page-data lookup
  // above, plus the membership ensure), so resolve any missing names
  // the insider-safe way: from the already-fetched page data first,
  // and for an id it doesn't carry (a service deactivated since the
  // booking) through the service-role client.
  const serviceNameById = new Map(page.services.map((s) => [s.id, s.name]));
  const missingServiceIds = [
    ...new Set(
      appts
        .filter((a) => !a.services?.name && !serviceNameById.has(a.service_id))
        .map((a) => a.service_id)
    ),
  ];
  if (missingServiceIds.length > 0) {
    try {
      const admin = createAdminSupabase();
      const { data: svcNames } = await admin
        .from("services")
        .select("id, name")
        .eq("business_id", business.id)
        .in("id", missingServiceIds);
      for (const s of svcNames ?? []) {
        serviceNameById.set(s.id as string, s.name as string);
      }
    } catch {
      // Name display is additive — never break the dashboard.
    }
  }
  const serviceName = (a: ApptRow) =>
    a.services?.name ?? serviceNameById.get(a.service_id) ?? "Appointment";
  const withName = (a: ApptRow) =>
    (a.staff_id && staffNameById.get(a.staff_id)) || "First available";
  const durationOf = (a: ApptRow) =>
    page.services.find((s) => s.id === a.service_id)?.duration_minutes ?? 30;

  // Intake forms for this business's appointments (same pattern as
  // My Appointments; degrades to empty if anything is unavailable).
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
            svcRows.map((s) => [s.id as string, (s as { form_id: string | null }).form_id])
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
      // Intake display is additive — never break the dashboard.
    }
  }

  const { data: myReviews } = await supabase
    .from("reviews")
    .select("appointment_id")
    .eq("customer_id", user.id)
    .in(
      "appointment_id",
      appts.map((a) => a.id)
    );
  const reviewed = new Set((myReviews ?? []).map((r) => r.appointment_id));

  // Shared visit summaries + the customer's own next steps, for THIS
  // business's appointments only. RLS only returns this customer's
  // shared notes — internal notes never reach this side.
  interface SharedNote {
    shared_summary: string | null;
    steps: { id: string; text: string; due_date: string | null; done_at: string | null }[];
  }
  const sharedByAppt = new Map<string, SharedNote>();
  if (appts.length > 0) {
    const { data: sharedNotes } = await supabase
      .from("visit_notes")
      .select("id, appointment_id, shared_summary")
      .eq("customer_id", user.id)
      .eq("visibility", "shared")
      .in(
        "appointment_id",
        appts.map((a) => a.id)
      );
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
          shared_summary: n.shared_summary,
          steps: (stepRows ?? [])
            .filter((s) => s.visit_note_id === n.id)
            .map((s) => ({ id: s.id, text: s.text, due_date: s.due_date, done_at: s.done_at })),
        });
      }
    }
  }

  const now = Date.now();
  const isUpcoming = (a: ApptRow) =>
    a.status === "confirmed" && new Date(a.starts_at).getTime() >= now;
  const upcoming = appts.filter(isUpcoming);
  const past = appts.filter((a) => !isUpcoming(a)).reverse();
  const next = upcoming[0];
  const later = upcoming.slice(1);

  // The Upload files button exists only when a form exists for this
  // customer — it points at the soonest appointment whose form is
  // still open (an upcoming one first).
  const formTarget =
    [...upcoming, ...past].find(
      (a) => intakeByAppt.has(a.id) && !intakeByAppt.get(a.id)!.submitted
    ) ?? [...upcoming, ...past].find((a) => intakeByAppt.has(a.id));

  const calendarFor = (a: ApptRow) => {
    const start = new Date(a.starts_at);
    const end = new Date(start.getTime() + durationOf(a) * 60000);
    const title = `${serviceName(a)} at ${business.name}`;
    return {
      googleUrl:
        "https://calendar.google.com/calendar/render?action=TEMPLATE" +
        `&text=${encodeURIComponent(title)}` +
        `&dates=${icsStamp(start)}/${icsStamp(end)}` +
        (business.address ? `&location=${encodeURIComponent(business.address)}` : ""),
      icsHref: `data:text/calendar;charset=utf8,${encodeURIComponent(
        "BEGIN:VCALENDAR\r\nVERSION:2.0\r\nBEGIN:VEVENT\r\n" +
          `DTSTART:${icsStamp(start)}\r\nDTEND:${icsStamp(end)}\r\n` +
          `SUMMARY:${title.replace(/[\r\n]/g, " ")}\r\n` +
          (business.address ? `LOCATION:${business.address.replace(/[\r\n]/g, " ")}\r\n` : "") +
          "END:VEVENT\r\nEND:VCALENDAR"
      )}`,
      outlookUrl:
        "https://outlook.live.com/calendar/0/deeplink/compose?path=/calendar/action/compose&rru=addevent" +
        `&subject=${encodeURIComponent(title)}` +
        `&startdt=${encodeURIComponent(start.toISOString())}` +
        `&enddt=${encodeURIComponent(end.toISOString())}` +
        (business.address ? `&location=${encodeURIComponent(business.address)}` : ""),
    };
  };

  const statusWord = (a: ApptRow) =>
    a.status === "no_show"
      ? "No-show"
      : a.status.replace("_", " ").replace(/^\w/, (c) => c.toUpperCase());

  const laterCard = (a: ApptRow) => (
    <div className="card" key={a.id}>
      <h3 style={{ marginTop: 0 }}>{serviceName(a)}</h3>
      <p className="small" style={{ margin: "2px 0 10px" }}>
        {formatDateInZone(new Date(a.starts_at), tz)} at {formatTimeInZone(new Date(a.starts_at), tz)}
        {" · "}with {withName(a)}
        {business.address ? ` · ${business.address}` : ""}
        {a.confirmation_code ? (
          <>
            <br />
            Confirmation #: <strong>{a.confirmation_code}</strong>
          </>
        ) : null}
      </p>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <Link href={`/manage/${a.manage_token}`} className="btn">Reschedule</Link>
        <Link href={`/manage/${a.manage_token}`} className="btn">Cancel</Link>
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
      </div>
    </div>
  );

  const historyEntry = (a: ApptRow) => {
    const shared = sharedByAppt.get(a.id);
    const d = new Date(a.starts_at);
    return (
      <div className="card c3-history-entry" key={a.id}>
        <p className="c3-history-title">
          {new Intl.DateTimeFormat("en-US", { timeZone: tz, month: "short", day: "numeric" }).format(d)}
          {" · "}
          {serviceName(a)}
        </p>
        <p className={`c3-history-status st-${a.status}`}>
          {statusWord(a)}
          {" · "}
          {formatTimeInZone(d, tz)} · with {withName(a)}
        </p>
        {shared?.shared_summary && (
          <details className="c3-summary">
            <summary>View summary</summary>
            <p className="small" style={{ margin: "8px 0 0" }}>
              <strong>Visit summary from {business.name}:</strong> {shared.shared_summary}
            </p>
            {shared.steps.length > 0 && (
              <ul style={{ margin: "6px 0 0", paddingLeft: 18, textAlign: "left" }}>
                {shared.steps.map((s) => (
                  <li
                    key={s.id}
                    className="small"
                    style={{ textDecoration: s.done_at ? "line-through" : "none" }}
                  >
                    {s.text}
                    {s.due_date ? ` · by ${s.due_date}` : ""}
                    {s.done_at ? " · done" : ""}
                  </li>
                ))}
              </ul>
            )}
          </details>
        )}
        {intakeByAppt.has(a.id) && (
          <div style={{ marginTop: 10 }}>
            {intakeByAppt.get(a.id)!.submitted ? (
              <span className="small">✓ Form sent</span>
            ) : (
              <Link href={`/manage/${a.manage_token}/form`} className="c3-underlink">
                Fill in the form
              </Link>
            )}
          </div>
        )}
        {a.status !== "cancelled" && !reviewed.has(a.id) ? (
          <ReviewForm appointmentId={a.id} />
        ) : null}
      </div>
    );
  };

  return (
    <main className="column">
      <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <h1 style={{ fontSize: 28, marginBottom: 4 }}>{heading}</h1>
          <p className="small" style={{ margin: "0 0 4px" }}>
            Your appointments, messages and history at {business.name} — all
            in one place.
          </p>
          {assignedLine && (
            <p style={{ margin: "0 0 4px", fontWeight: 600 }}>{assignedLine}</p>
          )}
        </div>
        <form action="/auth/signout" method="post" style={{ flex: "0 0 auto" }}>
          <button className="c3-underlink" type="submit" style={{ fontSize: 15, whiteSpace: "nowrap" }}>
            Log out
          </button>
        </form>
      </div>

      {next ? (
        <div className="c3-next">
          <p className="c3-next-label">Next appointment</p>
          <p className="c3-next-when">
            {formatDateInZone(new Date(next.starts_at), tz)} ·{" "}
            {formatTimeInZone(new Date(next.starts_at), tz)} {tzAbbrev(new Date(next.starts_at), tz)}
          </p>
          <p className="c3-next-meta">
            {serviceName(next)} · with {withName(next)}
            {business.address ? ` · ${business.address}` : ""}
          </p>
          {next.confirmation_code && (
            <p className="c3-next-meta">Confirmation {next.confirmation_code}</p>
          )}
          <div className="c3-next-actions">
            <Link href={`/manage/${next.manage_token}`} className="btn c3-btn-white">
              Reschedule
            </Link>
            <Link href={`/manage/${next.manage_token}`} className="btn c3-btn-ghostw">
              Cancel
            </Link>
            <AddToCalendar dark {...calendarFor(next)} />
          </div>
        </div>
      ) : (
        <div className="c3-next center">
          <p className="c3-next-when" style={{ fontSize: 21 }}>No upcoming appointments</p>
          <p className="c3-next-meta">When you book with {business.name}, it shows up here.</p>
          <div className="c3-next-actions" style={{ justifyContent: "center" }}>
            <Link href={`/${slug}/book`} className="btn c3-btn-white">
              Book now
            </Link>
          </div>
        </div>
      )}

      <div className="c3-grid">
        <Link href={`/${slug}/book`} className="c3-big-btn">
          <span className="c3-big-btn-label">Book new</span>
          <span className="c3-big-btn-sub">Pick a service and time</span>
        </Link>
        <a href="#messages" className="c3-big-btn">
          <span className="c3-big-btn-label">Message</span>
          <span className="c3-big-btn-sub">Talk to {business.name}</span>
          {unread > 0 && <span className="c3-badge-dot">{unread}</span>}
        </a>
        {business.phone && (
          <a href={`tel:${business.phone}`} className="c3-big-btn">
            <span className="c3-big-btn-label">Call office</span>
            <span className="c3-big-btn-sub">{formatPhone(business.phone)}</span>
          </a>
        )}
        {formTarget && (
          <Link href={`/manage/${formTarget.manage_token}/form`} className="c3-big-btn">
            <span className="c3-big-btn-label">Upload files</span>
            <span className="c3-big-btn-sub">{intakeByAppt.get(formTarget.id)!.formName}</span>
          </Link>
        )}
      </div>

      {later.length > 0 && (
        <>
          <h2 style={{ marginTop: 22 }}>Also coming up</h2>
          {later.map(laterCard)}
        </>
      )}

      <h2 id="messages" style={{ marginTop: 22 }}>Messages</h2>
      <div className="card">
        <ThreadView
          businessId={business.id}
          customerId={user.id}
          viewer="customer"
          signatureName={signatureName}
        />
      </div>

      {past.length > 0 && (
        <>
          <h2 style={{ marginTop: 22 }}>My history</h2>
          {past.map(historyEntry)}
        </>
      )}
    </main>
  );
}
