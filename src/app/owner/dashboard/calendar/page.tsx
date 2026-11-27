import Link from "next/link";
import { requireBusiness } from "@/lib/owner";
import { formatTimeInZone, zonedTimeToUtc } from "@/lib/slots";
import CalendarGrid, { type CalAppt, type CalColumn } from "@/components/owner/CalendarGrid";

interface Row {
  id: string;
  starts_at: string;
  ends_at: string;
  status: string;
  staff_id: string | null;
  location_id?: string | null;
  customers: { full_name: string } | null;
  services: { name: string } | null;
  staff: { name: string } | null;
}

// Calendar (Owner Dashboard Plan, 2026-11-26): ‹ › arrows, date
// title, Today button; Day/Week toggle and "+ New appointment" on
// the right. Day view: one column per staff member. Week view: 7 day
// columns for ONE person, chosen with the person picker (a staff
// login always sees their own week). Working hours come from
// availability: outside them the grid is grey and not clickable,
// gaps between stretches are striped breaks.
export default async function DashboardCalendarPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string; date?: string; loc?: string; person?: string }>;
}) {
  const sp = await searchParams;
  const { supabase, business, memberStaffId } = await requireBusiness();
  const tz = business.timezone;
  const view = sp.view === "week" ? "week" : "day";

  const dateFmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const todayStr = dateFmt.format(new Date());
  const anchor = sp.date && /^\d{4}-\d{2}-\d{2}$/.test(sp.date) ? sp.date : todayStr;

  const dayCount = view === "day" ? 1 : 7;
  const dates: string[] = [];
  const anchorUtc = zonedTimeToUtc(anchor, "12:00", tz);
  for (let i = 0; i < dayCount; i++) {
    dates.push(dateFmt.format(new Date(anchorUtc.getTime() + i * 86400000)));
  }
  const rangeStartUtc = zonedTimeToUtc(dates[0], "00:00", tz);
  const rangeEndUtc = new Date(
    zonedTimeToUtc(dates[dates.length - 1], "00:00", tz).getTime() + 86400000
  );

  const apptSelect =
    "id, starts_at, ends_at, status, staff_id, customers:customer_id ( full_name ), services:service_id ( name ), staff:staff_id ( name )";
  const apptQuery = (cols: string) =>
    supabase
      .from("appointments")
      .select(cols)
      .eq("business_id", business.id)
      .gte("starts_at", rangeStartUtc.toISOString())
      .lt("starts_at", rangeEndUtc.toISOString())
      .order("starts_at", { ascending: true });
  const fetchAppointments = async () => {
    const withLoc = await apptQuery(`${apptSelect}, location_id`);
    if (!withLoc.error) return { res: withLoc, hasLoc: true };
    const plain = await apptQuery(apptSelect);
    return { res: plain, hasLoc: false };
  };

  const [locRes, apptFetch, { data: staffRows }, { data: availRows }] = await Promise.all([
    supabase
      .from("locations")
      .select("id, name")
      .eq("business_id", business.id)
      .order("created_at", { ascending: true }),
    fetchAppointments(),
    supabase
      .from("staff")
      .select("id, name")
      .eq("business_id", business.id)
      .eq("active", true)
      .order("created_at", { ascending: true }),
    supabase
      .from("availability")
      .select("weekday, open_time, close_time, staff_id")
      .eq("business_id", business.id),
  ]);

  const locations = locRes.error ? [] : ((locRes.data ?? []) as { id: string; name: string }[]);
  const locFilter =
    locations.length >= 2 && sp.loc && locations.some((l) => l.id === sp.loc) ? sp.loc : null;

  const staffList = (staffRows ?? []) as { id: string; name: string }[];

  // Week view person: a staff login is pinned to their own calendar;
  // everyone else picks (default: the first staff member, or "First
  // available" when the business has no staff rows).
  const personParam = sp.person ?? "";
  const person: string | null =
    memberStaffId ??
    (personParam === "none"
      ? null
      : staffList.some((s) => s.id === personParam)
        ? personParam
        : (staffList[0]?.id ?? null));

  const allRows = (apptFetch.res.data ?? []) as unknown as Row[];
  let rows = locFilter && apptFetch.hasLoc ? allRows.filter((r) => r.location_id === locFilter) : allRows;
  if (view === "week") {
    rows = rows.filter((r) => (person === null ? r.staff_id === null : r.staff_id === person));
  }

  // Form-missing set for the visible confirmed appointments (orange
  // blocks). Degrades quietly until migration 0012 lands.
  const formMissingIds = new Set<string>();
  try {
    const { data: formServices, error: fsErr } = await supabase
      .from("services")
      .select("id")
      .eq("business_id", business.id)
      .not("form_id", "is", null);
    if (!fsErr && formServices && formServices.length > 0) {
      const { data: visAppts } = await supabase
        .from("appointments")
        .select("id, service_id")
        .eq("business_id", business.id)
        .eq("status", "confirmed")
        .gte("starts_at", rangeStartUtc.toISOString())
        .lt("starts_at", rangeEndUtc.toISOString())
        .in(
          "service_id",
          formServices.map((s) => s.id)
        );
      const candidateIds = (visAppts ?? []).map((a) => a.id as string);
      if (candidateIds.length > 0) {
        const { data: subs } = await supabase
          .from("form_submissions")
          .select("appointment_id")
          .in("appointment_id", candidateIds);
        const done = new Set((subs ?? []).map((s) => s.appointment_id));
        for (const id of candidateIds) if (!done.has(id)) formMissingIds.add(id);
      }
    }
  } catch {
    formMissingIds.clear();
  }

  // Grid hours: the business's opening span, defaulting to 8 AM to 6 PM.
  const toMin = (t: string) => {
    const [h, m] = String(t).split(":").map(Number);
    return h * 60 + m;
  };
  let rangeStart = 8 * 60;
  let rangeEnd = 18 * 60;
  const avail = (availRows ?? []) as unknown as {
    weekday: number;
    open_time: string;
    close_time: string;
    staff_id: string | null;
  }[];
  if (avail.length > 0) {
    rangeStart = Math.floor(Math.min(...avail.map((a) => toMin(a.open_time))) / 60) * 60;
    rangeEnd = Math.ceil(Math.max(...avail.map((a) => toMin(a.close_time))) / 60) * 60;
  }

  // Working intervals for one column: staff-specific rows win over
  // business-wide rows for that weekday.
  const intervalsFor = (dateStr: string, staffId: string | null): [number, number][] => {
    const [y, mo, d] = dateStr.split("-").map(Number);
    const weekday = new Date(Date.UTC(y, mo - 1, d)).getUTCDay();
    const own = avail.filter((a) => a.weekday === weekday && a.staff_id === staffId && staffId !== null);
    const biz = avail.filter((a) => a.weekday === weekday && a.staff_id === null);
    const use = staffId !== null && own.length > 0 ? own : biz;
    return use
      .map((a): [number, number] => [toMin(a.open_time), toMin(a.close_time)])
      .sort((x, y2) => x[0] - y2[0]);
  };

  const minutesOfDay = (iso: string) => {
    const parts = Object.fromEntries(
      new Intl.DateTimeFormat("en-US", {
        timeZone: tz,
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      })
        .formatToParts(new Date(iso))
        .map((p) => [p.type, p.value])
    );
    return (Number(parts.hour) % 24) * 60 + Number(parts.minute);
  };

  const statusWord = (r: Row) => {
    if (r.status === "completed") return "Completed";
    if (r.status === "no_show") return "No show";
    if (r.status === "cancelled") return "Cancelled";
    if (formMissingIds.has(r.id)) return "Form missing";
    return "Confirmed";
  };

  const appointments: CalAppt[] = rows.map((r) => ({
    id: r.id,
    dateStr: dateFmt.format(new Date(r.starts_at)),
    staffId: r.staff_id,
    startMinutes: minutesOfDay(r.starts_at),
    durationMinutes: Math.max(
      15,
      Math.round((new Date(r.ends_at).getTime() - new Date(r.starts_at).getTime()) / 60000)
    ),
    title: r.customers?.full_name ?? "Customer",
    sub: `${r.services?.name ?? "Appointment"} · ${statusWord(r)}`,
    status: r.status,
    formMissing: formMissingIds.has(r.id),
  }));

  const dayLabel = (dateStr: string) =>
    new Intl.DateTimeFormat("en-US", {
      timeZone: tz,
      weekday: "short",
      month: "short",
      day: "numeric",
    }).format(zonedTimeToUtc(dateStr, "12:00", tz));
  const titleLabel = (dateStr: string) =>
    new Intl.DateTimeFormat("en-US", {
      timeZone: tz,
      weekday: "long",
      month: "short",
      day: "numeric",
    }).format(zonedTimeToUtc(dateStr, "12:00", tz));

  const columns: CalColumn[] =
    view === "day"
      ? [
          ...staffList.map((s) => ({
            key: `staff-${s.id}`,
            label: s.name,
            dateStr: dates[0],
            staffId: s.id as string | null,
          })),
          { key: "staff-none", label: "First available", dateStr: dates[0], staffId: null },
        ]
      : dates.map((d) => ({ key: `day-${d}`, label: dayLabel(d), dateStr: d, staffId: person }));

  const working: Record<string, [number, number][]> = {};
  for (const c of columns) working[c.key] = intervalsFor(c.dateStr, c.staffId);

  const shift = view === "day" ? 1 : 7;
  const shiftDate = (days: number) => dateFmt.format(new Date(anchorUtc.getTime() + days * 86400000));
  const qs = (v: string, d: string, p?: string | null) =>
    `?view=${v}&date=${d}${locFilter ? `&loc=${locFilter}` : ""}${
      v === "week" ? `&person=${p === null ? "none" : (p ?? person ?? "none")}` : ""
    }`;
  const locQs = (loc: string | null) =>
    `?view=${view}&date=${anchor}${loc ? `&loc=${loc}` : ""}${view === "week" ? `&person=${person ?? "none"}` : ""}`;

  return (
    <div>
      <div className="d2-cal-head">
        <div className="d2-cal-nav">
          <Link href={qs(view, shiftDate(-shift))} className="d2-arrow" aria-label="Previous">
            ‹
          </Link>
          <span className="d2-cal-title">
            {view === "day" ? titleLabel(dates[0]) : `${dayLabel(dates[0])} to ${dayLabel(dates[dates.length - 1])}`}
          </span>
          <Link href={qs(view, shiftDate(shift))} className="d2-arrow" aria-label="Next">
            ›
          </Link>
          <Link href={qs(view, todayStr)} className="d2-today-btn">
            Today
          </Link>
        </div>
        <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
          <span className="d2-seg">
            <Link href={qs("day", anchor)} className={view === "day" ? "active" : ""}>
              Day
            </Link>
            <Link href={qs("week", anchor)} className={view === "week" ? "active" : ""}>
              Week
            </Link>
          </span>
          <Link href="/owner/dashboard/calendar/new" className="btn btn-primary">
            + New appointment
          </Link>
        </div>
      </div>

      {view === "week" && !memberStaffId && staffList.length > 0 && (
        <div className="tabs" style={{ marginTop: 0 }}>
          <span className="small" style={{ alignSelf: "center" }}>Person:</span>
          {staffList.map((s) => (
            <Link key={s.id} href={qs("week", anchor, s.id)} className={person === s.id ? "active" : ""}>
              {s.name}
            </Link>
          ))}
          <Link href={qs("week", anchor, null)} className={person === null ? "active" : ""}>
            First available
          </Link>
        </div>
      )}
      {locations.length >= 2 && (
        <div className="tabs" style={{ marginTop: 8 }}>
          <span className="small" style={{ alignSelf: "center" }}>Location:</span>
          <Link href={locQs(null)} className={!locFilter ? "active" : ""}>
            All locations
          </Link>
          {locations.map((l) => (
            <Link key={l.id} href={locQs(l.id)} className={locFilter === l.id ? "active" : ""}>
              {l.name}
            </Link>
          ))}
        </div>
      )}

      <div className="card" style={{ marginBottom: 0 }}>
        <CalendarGrid
          columns={columns}
          appointments={appointments}
          rangeStart={rangeStart}
          rangeEnd={rangeEnd}
          timezone={tz}
          mode={view}
          working={working}
        />
        <div className="d2-legend">
          <span>
            <span className="d2-swatch" style={{ background: "#e1f2e6", boxShadow: "inset 3px 0 0 #2e9e57" }} /> Completed
          </span>
          <span>
            <span className="d2-swatch" style={{ background: "#e7f1fb", boxShadow: "inset 3px 0 0 #2f6fb2" }} /> Confirmed
          </span>
          <span>
            <span className="d2-swatch" style={{ background: "#fcebd5", boxShadow: "inset 3px 0 0 #dd8a1e" }} /> Needs action
          </span>
          <span>
            <span className="d2-swatch" style={{ background: "#f0f3f0" }} /> Not working
          </span>
        </div>
      </div>
      <p className="small" style={{ marginTop: 10 }}>
        {formatTimeInZone(new Date(), tz)} now · Click an empty time in someone&apos;s working
        hours to book there.
      </p>
    </div>
  );
}
