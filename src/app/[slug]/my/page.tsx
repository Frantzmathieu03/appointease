import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getBusinessPageDataWithPreview } from "@/lib/data";
import { isDemoShop } from "@/lib/demo";
import { createServerSupabase, isSupabaseConfigured } from "@/lib/supabase";
import { ensureBusinessMembership, ensureCustomerProfile } from "@/lib/profile";
import { formatPhone } from "@/lib/types";
import { formatDateInZone, formatTimeInZone } from "@/lib/slots";
import ReviewForm from "@/components/ReviewForm";
import ThreadView from "@/components/ThreadView";

interface ApptRow {
  id: string;
  starts_at: string;
  status: string;
  manage_token: string;
  confirmation_code: string | null;
  service_id: string;
  services: { name: string } | null;
}

// The customer's dashboard AT ONE BUSINESS (per-business account
// model, Frantz 2026-11-25): each business is its own separate world.
// Everything here is scoped to this business and this customer —
// their upcoming and past appointments here, the visit summaries this
// business shared with them, their next steps, and their two-way
// message thread with this business. Nothing from any other business
// can appear: the queries filter by this business_id throughout, and
// RLS underneath only ever returns this customer's own rows.
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

  const { data } = await supabase
    .from("appointments")
    .select(
      "id, starts_at, status, manage_token, confirmation_code, service_id, services:service_id ( name )"
    )
    .eq("business_id", business.id)
    .eq("customer_id", user.id)
    .order("starts_at", { ascending: true });
  const appts = (data ?? []) as unknown as ApptRow[];

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

  const card = (a: ApptRow) => (
    <div className="card" key={a.id}>
      <h3 style={{ marginTop: 0 }}>
        {a.services?.name ?? "Appointment"}
      </h3>
      <p className="small" style={{ margin: "2px 0 10px" }}>
        {formatDateInZone(new Date(a.starts_at), tz)} at {formatTimeInZone(new Date(a.starts_at), tz)}
        {business.address ? ` · ${business.address}` : ""}
        {a.status !== "confirmed" ? ` · ${a.status.replace("_", " ")}` : ""}
        {a.confirmation_code ? (
          <>
            <br />
            Confirmation #: <strong>{a.confirmation_code}</strong>
          </>
        ) : null}
      </p>
      {sharedByAppt.get(a.id)?.shared_summary && (
        <div style={{ margin: "0 0 10px" }}>
          <p className="small" style={{ margin: "2px 0" }}>
            <strong>Visit summary from {business.name}:</strong>{" "}
            {sharedByAppt.get(a.id)!.shared_summary}
          </p>
          {sharedByAppt.get(a.id)!.steps.length > 0 && (
            <ul style={{ margin: "4px 0 0", paddingLeft: 18 }}>
              {sharedByAppt.get(a.id)!.steps.map((s) => (
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
        </div>
      )}
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
      </div>
      {a.status !== "confirmed" || new Date(a.starts_at).getTime() < now
        ? !reviewed.has(a.id) && a.status !== "cancelled"
          ? <ReviewForm appointmentId={a.id} />
          : null
        : null}
    </div>
  );

  return (
    <main className="column">
      <p className="eyebrow">{business.name}</p>
      <h1 style={{ fontSize: 28, marginBottom: 4 }}>My dashboard</h1>
      <p className="small" style={{ margin: "0 0 16px" }}>
        Your appointments, messages and history with {business.name} — all
        in one place.
        {business.phone ? <> Questions? Call {formatPhone(business.phone)}.</> : null}
      </p>

      <div style={{ marginBottom: 16 }}>
        <Link href={`/${slug}/book`} className="btn btn-primary btn-block" style={{ textAlign: "center" }}>
          Book appointment
        </Link>
      </div>

      <h2 style={{ marginTop: 10 }}>Upcoming</h2>
      {upcoming.length === 0 && (
        <div className="card">
          <p className="lede" style={{ marginBottom: 0 }}>
            Nothing coming up at {business.name} yet. Book your first
            visit above.
          </p>
        </div>
      )}
      {upcoming.map(card)}

      {past.length > 0 && (
        <>
          <h2 style={{ marginTop: 22 }}>Your history here</h2>
          {past.map(card)}
        </>
      )}

      <h2 style={{ marginTop: 22 }}>Messages</h2>
      <div className="card">
        <ThreadView businessId={business.id} customerId={user.id} viewer="customer" />
      </div>

      <form action="/auth/signout" method="post" style={{ textAlign: "center", marginTop: 18 }}>
        <button className="btn" type="submit">Sign out</button>
      </form>
    </main>
  );
}
