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

// Calendar = time grid (PDF §4). Day view: one column per staff member
// for a single date. Week view: one column per day. Rows span the
// business's opening hours. Click an empty slot to book there; click a
// block to open the appointment.
export default async function DashboardCalendarPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string; date?: string; loc?: string }>;
}) {
  const sp = await searchParams;
  const { supabase, business } = await requireBusiness();
  const tz = business.timezone;
  const view = sp.view === "day" ? "day" : "week";

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
  // location_id arrives with migration 0013 — always select it and
  // apply the location filter in memory, so this query does not have
  // to wait for the locations result. Fall back to the plain select
  // if the column isn't there yet (rows then stay unfiltered, exactly
  // as the old fallback behaved).
  const fetchAppointments = async () => {
    const withLoc = await apptQuery(`${apptSelect}, location_id`);
    if (!withLoc.error) return { res: withLoc, hasLoc: true };
    const plain = await apptQuery(apptSelect);
    return { res: plain, hasLoc: false };
  };

  // Locations, appointments, staff, and availability are independent
  // of each other — fire them together instead of in sequence.
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
      .select("open_time, close_time")
      .eq("business_id", business.id),
  ]);

  // Locations (migration 0013): the filter only appears when the
  // business actually has 2+ branches — one-location shops never see it.
  const locations = locRes.error ? [] : ((locRes.data ?? []) as { id: string; name: string }[]);
  const locFilter =
    locations.length >= 2 && sp.loc && locations.some((l) => l.id === sp.loc) ? sp.loc : null;

  const allRows = (apptFetch.res.data ?? []) as unknown as Row[];
  const rows =
    locFilter && apptFetch.hasLoc ? allRows.filter((r) => r.location_id === locFilter) : allRows;
  const staffList = (staffRows ?? []) as { id: string; name: string }[];

  // Grid hours: the business's opening span, defaulting to 8 AM–6 PM.
  let rangeStart = 8 * 60;
  let rangeEnd = 18 * 60;
  if (availRows && availRows.length > 0) {
    const toMin = (t: string) => {
      const [h, m] = String(t).split(":").map(Number);
      return h * 60 + m;
    };
    rangeStart = Math.min(...availRows.map((a) => toMin(a.open_time as string)));
    rangeEnd = Math.max(...availRows.map((a) => toMin(a.close_time as string)));
    rangeStart = Math.floor(rangeStart / 60) * 60;
    rangeEnd = Math.ceil(rangeEnd / 60) * 60;
  }

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

  const appointments: CalAppt[] = rows.map((r) => ({
    id: r.id,
    dateStr: dateFmt.format(new Date(r.starts_at)),
    staffId: r.staff_id,
    startMinutes: minutesOfDay(r.starts_at),
    durationMinutes: Math.max(
      15,
      Math.round((new Date(r.ends_at).getTime() - new Date(r.starts_at).getTime()) / 60000)
    ),
    title: `${formatTimeInZone(new Date(r.starts_at), tz)} · ${r.customers?.full_name ?? "Customer"}`,
    sub: r.services?.name ?? "Appointment",
    status: r.status,
  }));

  const dayLabel = (dateStr: string) =>
    new Intl.DateTimeFormat("en-US", {
      timeZone: tz,
      weekday: "short",
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
      : dates.map((d) => ({ key: `day-${d}`, label: dayLabel(d), dateStr: d, staffId: null }));

  const shift = view === "day" ? 1 : 7;
  const shiftDate = (days: number) => dateFmt.format(new Date(anchorUtc.getTime() + days * 86400000));
  const qs = (v: string, d: string) =>
    `?view=${v}&date=${d}${locFilter ? `&loc=${locFilter}` : ""}`;
  const locQs = (loc: string | null) =>
    `?view=${view}&date=${anchor}${loc ? `&loc=${loc}` : ""}`;

  return (
    <div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          gap: 12,
          flexWrap: "wrap",
          marginBottom: 12,
        }}
      >
        <h1 style={{ fontSize: 26, margin: 0 }}>Calendar</h1>
        <Link href="/owner/dashboard/calendar/new" className="btn btn-primary">
          New appointment
        </Link>
      </div>
      <div className="tabs">
        <Link href={qs("day", anchor)} className={view === "day" ? "active" : ""}>
          Day
        </Link>
        <Link href={qs("week", anchor)} className={view === "week" ? "active" : ""}>
          Week
        </Link>
        <Link href={qs(view, shiftDate(-shift))}>← Prev</Link>
        <Link href={qs(view, todayStr)}>Today</Link>
        <Link href={qs(view, shiftDate(shift))}>Next →</Link>
      </div>
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
      <p className="small" style={{ marginTop: 0 }}>
        {view === "day"
          ? `${dayLabel(dates[0])} — one column per team member.`
          : `${dayLabel(dates[0])} – ${dayLabel(dates[dates.length - 1])}`}{" "}
        Click an empty time to book there.
      </p>
      <div className="card">
        <CalendarGrid
          columns={columns}
          appointments={appointments}
          rangeStart={rangeStart}
          rangeEnd={rangeEnd}
          timezone={tz}
          mode={view}
        />
      </div>
    </div>
  );
}
