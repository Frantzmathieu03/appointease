// Outbound message providers.
//
// HONESTY RULE: a message is only ever reported as "sent" when a real
// provider accepted it. When a provider is not configured, the send functions
// return { delivered: false } and the reminder engine records the reminder
// as "skipped" with the reason: never as sent.

export interface SendResult {
  delivered: boolean;
  detail: string;
}

// ---------------------------------------------------------------------------
// Email: Resend when RESEND_API_KEY is set; otherwise log-only.
// Swap providers by implementing this one function.
// ---------------------------------------------------------------------------
export async function sendEmail(opts: {
  to: string;
  subject: string;
  text: string;
  /** Optional HTML version (sent alongside the text version). */
  html?: string;
}): Promise<SendResult> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM ?? "AppointEase <reminders@appointease.io>";

  if (!apiKey) {
    console.log(
      `[email:log-only] To: ${opts.to}\nSubject: ${opts.subject}\n${opts.text}\n---`
    );
    return {
      delivered: false,
      detail: "Email provider not configured (RESEND_API_KEY missing). Logged only.",
    };
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
        to: opts.to,
        subject: opts.subject,
        text: opts.text,
        ...(opts.html ? { html: opts.html } : {}),
      }),
    });
    if (!res.ok) {
      return { delivered: false, detail: `Resend responded ${res.status}` };
    }
    return { delivered: true, detail: "Accepted by Resend." };
  } catch (err) {
    return { delivered: false, detail: `Email send error: ${String(err)}` };
  }
}

// ---------------------------------------------------------------------------
// SMS: Twilio interface stub.
// Until TWILIO_* credentials exist (Phase 2, incl. A2P 10DLC registration),
// this no-ops safely and reports not-delivered. When credentials land, the
// real send goes in this same function: callers do not change.
// ---------------------------------------------------------------------------
export async function sendSms(opts: {
  to: string;
  body: string;
}): Promise<SendResult> {
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  const from = process.env.TWILIO_FROM_NUMBER;

  if (!sid || !token || !from) {
    console.log(`[sms:stub] Would send to ${opts.to}: ${opts.body}`);
    return {
      delivered: false,
      detail: "SMS not configured (Twilio credentials missing). Logged instead of sent.",
    };
  }

  try {
    const res = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`,
      {
        method: "POST",
        headers: {
          Authorization: "Basic " + Buffer.from(`${sid}:${token}`).toString("base64"),
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({ From: from, To: opts.to, Body: opts.body }),
      }
    );
    if (!res.ok) {
      return { delivered: false, detail: `Twilio responded ${res.status}` };
    }
    return { delivered: true, detail: "Accepted by Twilio." };
  } catch (err) {
    return { delivered: false, detail: `SMS send error: ${String(err)}` };
  }
}
