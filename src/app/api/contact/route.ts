import { NextRequest, NextResponse } from "next/server";

// POST /api/contact { name, email, topic, message }
// Sends the message to the AppointEase inbox via Resend (same provider and
// env as the reminder engine — see src/lib/notify.ts). reply_to is set to
// the submitter so replies go straight back to them. Honest errors: if the
// email provider is not configured, we say so instead of pretending to send.
const CONTACT_TO = "appointeaseapp@gmail.com";
const TOPICS = ["Business owner", "Customer", "Other"];

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const name: string = String(body?.name ?? "").trim().slice(0, 120);
  const email: string = String(body?.email ?? "").trim().slice(0, 200);
  const topic: string = TOPICS.includes(body?.topic) ? body.topic : "Other";
  const message: string = String(body?.message ?? "").trim().slice(0, 4000);

  if (!name || !email || !message) {
    return NextResponse.json({ error: "Name, email and a message are required." }, { status: 400 });
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: "That email address doesn't look right." }, { status: 400 });
  }

  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM ?? "AppointEase <reminders@appointease.io>";
  if (!apiKey) {
    return NextResponse.json(
      { error: "Email is not configured yet — please write to support@appointease.io directly." },
      { status: 503 }
    );
  }

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: CONTACT_TO,
        reply_to: email,
        subject: `AppointEase contact — ${topic}: ${name}`,
        text: `New message from the AppointEase contact page.\n\nName: ${name}\nEmail: ${email}\nTopic: ${topic}\n\n${message}\n`,
      }),
    });
    if (!res.ok) {
      return NextResponse.json(
        { error: "The message could not be sent right now — please email support@appointease.io directly." },
        { status: 502 }
      );
    }
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json(
      { error: "The message could not be sent right now — please email support@appointease.io directly." },
      { status: 502 }
    );
  }
}
