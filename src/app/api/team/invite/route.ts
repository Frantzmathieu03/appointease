import { NextRequest, NextResponse } from "next/server";
import { requireBusiness, siteUrl } from "@/lib/owner";
import { planById, seatLimitMessage } from "@/lib/plans";
import { sendEmail } from "@/lib/notify";
import { createAdminSupabase } from "@/lib/supabase";

// POST /api/team/invite — team invites (Owner Dashboard Plan,
// 2026-11-26). OWNER ONLY: managers see the whole business except
// Billing and Team management, so creating or re-sending an invite
// is gated here on the server as well as in the UI (migration 0015
// also tightens the RLS insert policies to the owner — this route
// behaves the same before and after it lands).
//
// Body (new invite): { name, contact, role: "manager" | "staff",
// serviceIds?: string[] }
//   - contact must be an email: the join link is emailed via Resend
//     and acceptance matches on the invite address. A mobile number
//     gets a plain "not yet" answer — texting invites waits on the
//     same Twilio setup as texting reminders; no dead invite is
//     created.
//   - a staff invite links (or creates) the staff calendar carrying
//     the person's name, and merges the picked services into that
//     calendar's staff_services.
// Body (re-send): { resendOf: inviteId } — emails the existing link
// again.
// Response: { ok, link, emailed } — the link is always returned so
// the owner can also copy and send it themselves.
export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body) return NextResponse.json({ error: "Bad request." }, { status: 400 });

  const { supabase, user, business, role } = await requireBusiness();
  if (role !== "owner") {
    return NextResponse.json(
      { error: "Only the business owner can invite team members." },
      { status: 403 }
    );
  }

  const base = siteUrl();
  const inviterName =
    (user.user_metadata?.full_name as string | undefined) ??
    (user.user_metadata?.name as string | undefined) ??
    null;
  const emailInvite = async (
    to: string,
    link: string,
    inviteName: string | null,
    forRole: string
  ) => {
    const roleWords = forRole === "manager" ? "a manager" : "a staff member";
    const res = await sendEmail({
      to,
      subject: `You're invited to join ${business.name} on AppointEase`,
      text: [
        `Hello${inviteName ? ` ${inviteName}` : ""},`,
        "",
        `${inviterName ? `${inviterName} from ` : ""}${business.name} invited you to join their team on AppointEase as ${roleWords}.`,
        "Open this link, sign in with this email address, and you're in. You can also decline the invite on that page.",
        "",
        link,
        "",
        "The link works for 7 days. If it expires, ask the business to send a new one.",
      ].join("\n"),
      html: [
        `<p>Hello${inviteName ? ` ${inviteName}` : ""},</p>`,
        `<p>${inviterName ? `${inviterName} from ` : ""}<strong>${business.name}</strong> invited you to join their team on AppointEase as ${roleWords}.</p>`,
        `<p><a href="${link}" style="display:inline-block;background:#1e4d33;color:#ffffff;padding:12px 22px;border-radius:10px;text-decoration:none;font-weight:700">Accept or decline the invite</a></p>`,
        `<p>Sign in with this email address (${to}) to accept. The link works for 7 days. If it expires, ask the business to send a new one.</p>`,
        `<p style="color:#5b6b61;font-size:13px">Or open this link: ${link}</p>`,
      ].join("\n"),
    });
    // Record the send in the operator audit log (same table the
    // message dispatcher uses). Best effort: the log never blocks
    // the invite itself.
    try {
      const admin = createAdminSupabase();
      await admin.from("notifications_log").insert({
        kind: "team_invite",
        business_id: business.id,
        channel: "email",
        recipient: to,
        status: res.delivered ? "sent" : "failed",
        detail: res.detail,
      });
    } catch {
      // Audit only.
    }
    return res.delivered;
  };

  // — Re-send an existing pending invite —
  if (typeof body.resendOf === "string" && body.resendOf) {
    const { data: invite } = await supabase
      .from("team_invites")
      .select("id, email, name, token, accepted_at, role")
      .eq("business_id", business.id)
      .eq("id", body.resendOf)
      .maybeSingle();
    if (!invite) return NextResponse.json({ error: "That invite is gone." }, { status: 404 });
    if (invite.accepted_at) {
      return NextResponse.json({ error: "That invite was already accepted." }, { status: 409 });
    }
    const link = `${base}/invite/${invite.token}`;
    const emailed = await emailInvite(
      invite.email as string,
      link,
      (invite as { name?: string | null }).name ?? null,
      (invite as { role?: string }).role ?? "staff"
    );
    return NextResponse.json({ ok: true, link, emailed });
  }

  // — New invite —
  const name = typeof body.name === "string" ? body.name.trim() : "";
  const contact = typeof body.contact === "string" ? body.contact.trim() : "";
  const inviteRole = body.role === "manager" ? "manager" : "staff";
  const serviceIds = Array.isArray(body.serviceIds)
    ? body.serviceIds.filter((x): x is string => typeof x === "string")
    : [];

  if (!contact.includes("@")) {
    return NextResponse.json(
      {
        error:
          "Texting invites isn't on yet — use their email address for now, and they'll get the join link by email.",
      },
      { status: 400 }
    );
  }
  const email = contact.toLowerCase();

  let staffId: string | null = null;
  if (inviteRole === "staff") {
    if (!name) {
      return NextResponse.json(
        { error: "Add their name — it becomes the name on their calendar." },
        { status: 400 }
      );
    }
    const { data: existing } = await supabase
      .from("staff")
      .select("id, name")
      .eq("business_id", business.id)
      .eq("active", true);
    const match = (existing ?? []).find(
      (s) => String(s.name).trim().toLowerCase() === name.toLowerCase()
    );
    if (match) {
      staffId = match.id as string;
    } else {
      // SEAT LIMIT (Frantz, 2026-11-26): a staff invite creates a new
      // calendar, and calendars are what the plan counts (owner
      // included). At the cap the add stops here — server-side, not
      // just in the UI — with the upgrade prompt. Linking an existing
      // calendar (the match above) adds no seat and stays allowed;
      // manager invites carry no calendar and are not seat-capped.
      const plan = planById(business.plan);
      if ((existing ?? []).length >= plan.staffLimit) {
        return NextResponse.json(
          { error: seatLimitMessage(plan), seatLimit: true },
          { status: 409 }
        );
      }
      const { data: created, error: staffErr } = await supabase
        .from("staff")
        .insert({ business_id: business.id, name })
        .select("id")
        .single();
      if (staffErr || !created) {
        // The migration 0015 trigger says the same thing at the
        // database level — surface it as the seat-limit prompt.
        if (staffErr && /seat limit/i.test(staffErr.message)) {
          return NextResponse.json(
            { error: seatLimitMessage(planById(business.plan)), seatLimit: true },
            { status: 409 }
          );
        }
        return NextResponse.json(
          { error: "Could not create their calendar — please try again." },
          { status: 500 }
        );
      }
      staffId = created.id as string;
    }
    // Merge the services they offer into that calendar (never removes
    // services someone already had).
    if (serviceIds.length > 0) {
      const { data: svcRows } = await supabase
        .from("services")
        .select("id")
        .eq("business_id", business.id)
        .in("id", serviceIds);
      const valid = (svcRows ?? []).map((s) => s.id as string);
      if (valid.length > 0) {
        await supabase
          .from("staff_services")
          .upsert(
            valid.map((sid) => ({ staff_id: staffId, service_id: sid })),
            { onConflict: "staff_id,service_id", ignoreDuplicates: true }
          );
      }
    }
  }

  const insertInvite = async (withName: boolean) => {
    const row: Record<string, unknown> = {
      business_id: business.id,
      email,
      role: inviteRole,
      staff_id: staffId,
      created_by: user.id,
    };
    if (withName && name) row.name = name;
    return supabase.from("team_invites").insert(row).select("token").single();
  };
  // The name column arrives with migration 0015 — fall back quietly
  // until it lands so invites keep working either way.
  let { data, error } = await insertInvite(true);
  if (error) ({ data, error } = await insertInvite(false));
  if (error || !data) {
    return NextResponse.json(
      { error: "Could not send the invite — please try again." },
      { status: 500 }
    );
  }

  const link = `${base}/invite/${data.token}`;
  const emailed = await emailInvite(email, link, name || null, inviteRole);
  return NextResponse.json({ ok: true, link, emailed });
}
