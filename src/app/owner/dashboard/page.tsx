import Link from "next/link";
import { requireBusiness, siteUrl } from "@/lib/owner";
import { formatDateInZone, formatTimeInZone, zonedTimeToUtc } from "@/lib/slots";
import CopyLinkButton from "@/components/CopyLinkButton";

interface Row {
  id: string;
  starts_at: string;
  status: string;
  staff_id: string | null;
  confirmation_code: string | null;
  customers: { full_name: string; phone: string | null } | null;
  services: { name: string; duration_minutes: number | null } | null;
  staff: { name: string } | null;
}

// Dashboard home (Owner Dashboard Plan, 2026-11-26): date line,
// greeting, three actions, FIVE stat cards (Appointments today,
// Unread messages, Forms not submitted, No-shows this week, Bookings
// this week: bookings, never revenue: AppointEase does not touch
// client money), today's schedule grouped by staff with status tags
// (Completed green tint, Confirmed blue tint, Form missing orange
// tint), and a Needs attention card. A business with nothing set up
// yet gets the setup checklist instead of an empty schedule.
export default async function DashboardTodayPage() {
  const { supabase, business, user, role } = await requireBusiness();
  const tz = business.timezone;
  const link = `${siteUrl()}/${business.slug}`;

  const dateFmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const todayStr = dateFmt.format(new Date());
  const dayStart = zonedTimeToUtc(todayStr, "00:00", tz);
  const dayEnd = new Date(dayStart.getTime() + 86400000);

  // This week in the business zone: Monday 00:00 → next Monday 00:00.
  // todayStr is a calendar date in the business zone, so its weekday
  // is the UTC weekday of that same calendar date.
  const [ty, tm, td] = todayStr.split("-").map(Number);
  const weekday = new Date(Date.UTC(ty, tm - 1, td)).getUTCDay();
  const mondayOffset = (weekday + 6) % 7;
  const mondayStr = dateFmt.format(new Date(dayStart.getTime() - mondayOffset * 86400000 + 43200000));
  const weekStart = zonedTimeToUtc(mondayStr, "00:00", tz);
  const weekEnd = new Date(weekStart.getTime() + 7 * 86400000);

  const [{ data }, { data: staffRows }] = await Promise.all([
    supabase
      .from("appointments")
      .select(
        "id, starts_at, status, staff_id, confirmation_code, customers:customer_id ( full_name, phone ), services:service_id ( name, duration_minutes ), staff:staff_id ( name )"
      )
      .eq("business_id", business.id)
      .gte("starts_at", dayStart.toISOString())
      .lt("starts_at", dayEnd.toISOString())
      .order("starts_at", { ascending: true }),
    supabase
      .from("staff")
      .select("id, name")
      .eq("business_id", business.id)
      .eq("active", true)
      .order("created_at", { ascending: true }),
  ]);
  const rows = (data ?? []) as unknown as Row[];
  const todays = rows.filter((r) => r.status !== "cancelled");
  const cancelled = rows.filter((r) => r.status === "cancelled");

  const groups: { key: string; name: string; rows: Row[] }[] = (staffRows ?? []).map((s) => ({
    key: s.id as string,
    name: s.name as string,
    rows: todays.filter((r) => r.staff_id === s.id),
  }));
  const unassigned = todays.filter(
    (r) => !r.staff_id || !groups.some((g) => g.key === r.staff_id)
  );
  if (unassigned.length > 0) {
    groups.push({ key: "unassigned", name: "First available / Unassigned", rows: unassigned });
  }
  const visibleGroups = groups.filter((g) => g.rows.length > 0);

  // Unread messages + how many sit in unassigned customers' threads.
  const { data: unreadRows } = await supabase
    .from("messages")
    .select("customer_id")
    .eq("business_id", business.id)
    .eq("sender", "customer")
    .is("read_at", null)
    .limit(2000);
  const unread = (unreadRows ?? []).length;
  const { data: relRows } = await supabase
    .from("business_customers")
    .select("customer_id, assigned_staff_id")
    .eq("business_id", business.id);
  const assignedBy = new Map<string, string | null>();
  for (const r of (relRows ?? []) as { customer_id: string; assigned_staff_id?: string | null }[]) {
    assignedBy.set(r.customer_id, r.assigned_staff_id ?? null);
  }
  const unreadUnassigned = (unreadRows ?? []).filter(
    (m) => !assignedBy.get(m.customer_id as string)
  ).length;
  const unassignedCount = [...assignedBy.values()].filter((v) => !v).length;

  // Week stats: bookings scheduled this week + no-shows this week.
  const [{ count: weekBookings }, { count: weekNoShows }] = await Promise.all([
    supabase
      .from("appointments")
      .select("id", { count: "exact", head: true })
      .eq("business_id", business.id)
      .neq("status", "cancelled")
      .gte("starts_at", weekStart.toISOString())
      .lt("starts_at", weekEnd.toISOString()),
    supabase
      .from("appointments")
      .select("id", { count: "exact", head: true })
      .eq("business_id", business.id)
      .eq("status", "no_show")
      .gte("starts_at", weekStart.toISOString())
      .lt("starts_at", weekEnd.toISOString()),
  ]);

  // Forms not submitted (migration 0012): upcoming confirmed
  // appointments whose service has a form attached but no submission
  // yet. Degrades to an empty set until the migration lands. Also
  // drives the orange "Form missing" tags on today's schedule.
  const formMissingIds = new Set<string>();
  const formMissingNames: string[] = [];
  try {
    const { data: formServices, error: fsErr } = await supabase
      .from("services")
      .select("id")
      .eq("business_id", business.id)
      .not("form_id", "is", null);
    if (!fsErr && formServices && formServices.length > 0) {
      const { data: upcoming } = await supabase
        .from("appointments")
        .select("id, customers:customer_id ( full_name )")
        .eq("business_id", business.id)
        .eq("status", "confirmed")
        .gte("starts_at", new Date().toISOString())
        .in(
          "service_id",
          formServices.map((s) => s.id)
        )
        .limit(200);
      if (upcoming && upcoming.length > 0) {
        const { data: subs } = await supabase
          .from("form_submissions")
          .select("appointment_id")
          .in(
            "appointment_id",
            upcoming.map((a) => a.id)
          );
        const done = new Set((subs ?? []).map((s) => s.appointment_id));
        for (const a of upcoming as unknown as {
          id: string;
          customers: { full_name: string } | null;
        }[]) {
          if (!done.has(a.id)) {
            formMissingIds.add(a.id);
            if (a.customers?.full_name) formMissingNames.push(a.customers.full_name);
          }
        }
      }
    }
  } catch {
    formMissingIds.clear();
  }
  const intakesMissing = formMissingIds.size;

  // Visits without notes (last 30 days): Needs attention.
  const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString();
  const { data: pastAppts } = await supabase
    .from("appointments")
    .select("id, starts_at, customers:customer_id ( full_name ), services:service_id ( name )")
    .eq("business_id", business.id)
    .neq("status", "cancelled")
    .gte("starts_at", thirtyDaysAgo)
    .lt("starts_at", new Date().toISOString())
    .order("starts_at", { ascending: false })
    .limit(50);
  let withoutNotes: { id: string; starts_at: string; label: string }[] = [];
  if (pastAppts && pastAppts.length > 0) {
    const { data: noteRows, error: noteErr } = await supabase
      .from("visit_notes")
      .select("appointment_id")
      .in(
        "appointment_id",
        pastAppts.map((a) => a.id)
      );
    if (!noteErr) {
      const noted = new Set((noteRows ?? []).map((n) => n.appointment_id));
      withoutNotes = pastAppts
        .filter((a) => !noted.has(a.id))
        .slice(0, 5)
        .map((a) => {
          const row = a as unknown as {
            id: string;
            starts_at: string;
            customers: { full_name: string } | null;
            services: { name: string } | null;
          };
          return {
            id: row.id,
            starts_at: row.starts_at,
            label: `${row.customers?.full_name ?? "Customer"} · ${row.services?.name ?? "Appointment"}`,
          };
        });
    }
  }

  // Setup state for the empty-business checklist.
  const [{ count: serviceCount }, { count: hoursCount }, { count: photoCount }, { count: memberCount }] =
    await Promise.all([
      supabase
        .from("services")
        .select("id", { count: "exact", head: true })
        .eq("business_id", business.id)
        .eq("active", true),
      supabase
        .from("availability")
        .select("id", { count: "exact", head: true })
        .eq("business_id", business.id),
      supabase
        .from("business_photos")
        .select("id", { count: "exact", head: true })
        .eq("business_id", business.id),
      supabase
        .from("business_members")
        .select("id", { count: "exact", head: true })
        .eq("business_id", business.id)
        .eq("status", "active"),
    ]);
  const isNewBusiness = (serviceCount ?? 0) === 0 && todays.length === 0;

  const niceDate = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    weekday: "long",
    month: "long",
    day: "numeric",
  }).format(new Date());
  const hour = Number(
    new Intl.DateTimeFormat("en-US", { timeZone: tz, hour: "numeric", hour12: false }).format(new Date())
  );
  const daypart = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
  const fullName =
    (user.user_metadata?.full_name as string | undefined) ??
    (user.user_metadata?.name as string | undefined) ??
    "";
  const firstName = fullName.trim().split(/\s+/)[0] || (user.email ?? "").split("@")[0] || "there";

  // Appointments-today subtext: counts by service, top two.
  const byService = new Map<string, number>();
  for (const r of todays) {
    const name = r.services?.name ?? "Appointment";
    byService.set(name, (byService.get(name) ?? 0) + 1);
  }
  const serviceSub = [...byService.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 2)
    .map(([n, c]) => `${c} ${n}`)
    .join(" · ");

  const tagFor = (r: Row): { label: string; cls: string } => {
    if (r.status === "completed") return { label: "Completed", cls: "tag tag-completed" };
    if (r.status === "no_show") return { label: "No show", cls: "tag tag-red" };
    if (formMissingIds.has(r.id)) return { label: "Form missing", cls: "tag tag-action" };
    return { label: "Confirmed", cls: "tag tag-confirmed" };
  };

  const checklist: { done: boolean; label: string; href: string }[] = [
    {
      done: !!business.logo_url || (photoCount ?? 0) > 0,
      label: "Add your logo and photos",
      href: "/owner/dashboard/booking-page",
    },
    { done: (serviceCount ?? 0) > 0, label: "Add your services", href: "/owner/dashboard/settings#services" },
    { done: (hoursCount ?? 0) > 0, label: "Set your opening hours", href: "/owner/dashboard/settings" },
    { done: (memberCount ?? 0) > 0, label: "Invite your team", href: "/owner/dashboard/team" },
    { done: business.published, label: "Publish and share your booking link", href: "/owner/setup" },
  ];

  const hasAttention = unassignedCount > 0 || intakesMissing > 0 || withoutNotes.length > 0;

  return (
    <div>
      <div className="d2-head-row">
        <div>
          <p className="d2-date-line">{niceDate}</p>
          <h1 className="d2-greeting">
            {daypart}, {firstName}
          </h1>
        </div>
        <div className="d2-head-actions">
          <CopyLinkButton url={link} label="Copy booking link" />
          {role !== "staff" && (
            <Link href="/owner/dashboard/team" className="btn">
              Invite team member
            </Link>
          )}
          <Link href="/owner/dashboard/calendar/new" className="btn btn-primary">
            New appointment
          </Link>
        </div>
      </div>

      <div className="d2-stats">
        <div className="d2-stat">
          <p className="d2-stat-label">Appointments today</p>
          <p className="d2-stat-num">{todays.length}</p>
          <p className="d2-stat-sub">{serviceSub || "Nothing booked yet"}</p>
        </div>
        <div className="d2-stat">
          <p className="d2-stat-label">Unread messages</p>
          <p className="d2-stat-num">{unread}</p>
          <p className="d2-stat-sub">
            {unreadUnassigned > 0 ? `${unreadUnassigned} unassigned` : "All assigned"}
          </p>
        </div>
        <div className="d2-stat">
          <p className="d2-stat-label">Forms not submitted</p>
          <p className={`d2-stat-num${intakesMissing > 0 ? " orange" : ""}`}>{intakesMissing}</p>
          <p className="d2-stat-sub">for upcoming visits</p>
        </div>
        <div className="d2-stat">
          <p className="d2-stat-label">No shows this week</p>
          <p className="d2-stat-num">{weekNoShows ?? 0}</p>
          <p className="d2-stat-sub">since Monday</p>
        </div>
        <div className="d2-stat">
          <p className="d2-stat-label">Bookings this week</p>
          <p className="d2-stat-num">{weekBookings ?? 0}</p>
          <p className="d2-stat-sub">on the calendar</p>
        </div>
      </div>

      {isNewBusiness ? (
        <div className="card">
          <h2 style={{ marginTop: 0 }}>Finish setting up {business.name}</h2>
          <p className="small">
            A few quick steps and your page starts taking bookings on its own.
          </p>
          <ul className="checklist">
            {checklist.map((c) => (
              <li key={c.label}>
                <span className={c.done ? "check-dot done" : "check-dot"}>{c.done ? "✓" : ""}</span>
                {c.done ? (
                  <span>{c.label}</span>
                ) : (
                  <Link href={c.href} style={{ fontWeight: 600 }}>
                    {c.label}
                  </Link>
                )}
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <div className="d2-today-grid">
          <div className="card" style={{ marginBottom: 0 }}>
            <div className="d2-card-head">
              <h2>Today&apos;s schedule</h2>
              <Link href="/owner/dashboard/calendar" style={{ fontSize: 13.5, fontWeight: 600 }}>
                Open calendar
              </Link>
            </div>
            {todays.length === 0 && (
              <p className="small" style={{ margin: "6px 0 2px" }}>
                No appointments today yet. Share your booking link and this page fills itself.
              </p>
            )}
            {visibleGroups.map((g) => (
              <div key={g.key}>
                <p className="d2-sched-group">{g.name}</p>
                {g.rows.map((r) => {
                  const tag = tagFor(r);
                  return (
                    <Link key={r.id} href={`/owner/dashboard/appointments/${r.id}`} className="d2-appt-row">
                      <span className="d2-appt-time">{formatTimeInZone(new Date(r.starts_at), tz)}</span>
                      <span className="d2-appt-main">
                        <span className="d2-appt-name">{r.customers?.full_name ?? "Customer"}</span>
                        <br />
                        <span className="d2-appt-sub">
                          {r.services?.name ?? "Appointment"}
                          {r.services?.duration_minutes ? ` · ${r.services.duration_minutes} min` : ""}
                        </span>
                      </span>
                      <span className={tag.cls}>{tag.label}</span>
                    </Link>
                  );
                })}
              </div>
            ))}
            {cancelled.length > 0 && (
              <>
                <p className="d2-sched-group">Cancelled today</p>
                {cancelled.map((r) => (
                  <Link key={r.id} href={`/owner/dashboard/appointments/${r.id}`} className="d2-appt-row">
                    <span className="d2-appt-time">{formatTimeInZone(new Date(r.starts_at), tz)}</span>
                    <span className="d2-appt-main">
                      <span className="d2-appt-name">{r.customers?.full_name ?? "Customer"}</span>
                      <br />
                      <span className="d2-appt-sub">{r.services?.name ?? "Appointment"}</span>
                    </span>
                    <span className="tag tag-grey">Cancelled</span>
                  </Link>
                ))}
              </>
            )}
          </div>

          <div className="card" style={{ marginBottom: 0 }}>
            <div className="d2-card-head">
              <h2>Needs attention</h2>
            </div>
            {!hasAttention && (
              <p className="small" style={{ margin: "4px 0 0" }}>
                Nothing needs you right now. New bookings, unassigned customers and missing forms
                show up here.
              </p>
            )}
            {unassignedCount > 0 && (
              <div className="d2-attn hot">
                <p className="d2-attn-title">
                  {unassignedCount} new client{unassignedCount === 1 ? "" : "s"} not assigned
                </p>
                <p className="d2-attn-sub">Booked with &ldquo;First available&rdquo;</p>
                <Link href="/owner/dashboard/customers">Assign now</Link>
              </div>
            )}
            {intakesMissing > 0 && (
              <div className="d2-attn">
                <p className="d2-attn-title">
                  {intakesMissing} form{intakesMissing === 1 ? "" : "s"} not submitted
                </p>
                <p className="d2-attn-sub">{[...new Set(formMissingNames)].slice(0, 3).join(" · ")}</p>
                <Link href="/owner/dashboard/forms">See forms</Link>
              </div>
            )}
            {withoutNotes.length > 0 && (
              <div className="d2-attn">
                <p className="d2-attn-title">
                  {withoutNotes.length} visit{withoutNotes.length === 1 ? "" : "s"} without notes
                </p>
                {withoutNotes.slice(0, 3).map((a) => (
                  <p key={a.id} className="d2-attn-sub" style={{ margin: "2px 0" }}>
                    {a.label} · {formatDateInZone(new Date(a.starts_at), tz)}{" "}
                    <Link href={`/owner/dashboard/appointments/${a.id}`}>Add visit notes</Link>
                  </p>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
