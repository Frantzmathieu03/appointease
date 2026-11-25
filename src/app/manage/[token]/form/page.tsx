"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { formatDateInZone, formatTimeInZone } from "@/lib/slots";
import FormFields from "@/components/FormFields";
import type { FormAnswers, FormQuestion } from "@/lib/types";

// The customer's intake form, behind the same secure manage link as
// reschedule/cancel — the token is the credential, no account needed.
// Branding is the BUSINESS's (PDF §5), like the manage page.
interface FormData {
  business: { name: string; logo_url: string | null; phone: string | null; timezone: string } | null;
  appointment: { id: string; status: string; starts_at: string; service_name: string };
  form: { id: string; name: string; description: string | null } | null;
  questions: FormQuestion[];
  submission: { id: string; answers: FormAnswers; submitted_at: string } | null;
}

export default function ManageFormPage({ params }: { params: Promise<{ token: string }> }) {
  const [token, setToken] = useState("");
  const [data, setData] = useState<FormData | null>(null);
  const [loadError, setLoadError] = useState("");
  const [answers, setAnswers] = useState<FormAnswers>({});
  const [files, setFiles] = useState<Record<string, File[]>>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  useEffect(() => {
    params.then((p) => setToken(p.token));
  }, [params]);

  useEffect(() => {
    if (!token) return;
    fetch(`/api/manage/${token}/form`)
      .then(async (r) => {
        const d = await r.json();
        if (!r.ok) throw new Error(d.error ?? "Not found");
        setData(d as FormData);
      })
      .catch((e) => setLoadError(e.message));
  }, [token]);

  const poweredBy = (
    <p className="small center" style={{ marginTop: 22, color: "var(--muted)" }}>
      Powered by AppointEase
    </p>
  );

  if (loadError) {
    return (
      <main className="column">
        <div className="error">{loadError}</div>
        {poweredBy}
      </main>
    );
  }
  if (!data) {
    return (
      <main className="column">
        <p className="small center">Loading your form…</p>
        {poweredBy}
      </main>
    );
  }

  const biz = data.business;
  const tz = biz?.timezone ?? "America/New_York";
  const when = `${formatDateInZone(new Date(data.appointment.starts_at), tz)} at ${formatTimeInZone(new Date(data.appointment.starts_at), tz)}`;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const fd = new FormData();
    const textAnswers: Record<string, string> = {};
    for (const [k, v] of Object.entries(answers)) {
      if (typeof v === "string") textAnswers[k] = v;
    }
    fd.append("answers", JSON.stringify(textAnswers));
    for (const [qid, list] of Object.entries(files)) {
      for (const f of list) fd.append(`file_${qid}`, f);
    }
    try {
      const res = await fetch(`/api/manage/${token}/form`, { method: "POST", body: fd });
      const d = await res.json();
      if (!res.ok) {
        setError(d.error ?? "Something went wrong.");
        setBusy(false);
        return;
      }
      setDone(true);
    } catch {
      setError("Something went wrong.");
    }
    setBusy(false);
  }

  return (
    <main className="column">
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 6 }}>
        {biz?.logo_url && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={biz.logo_url}
            alt={`${biz.name} logo`}
            width={48}
            height={48}
            style={{ borderRadius: 12, objectFit: "cover" }}
          />
        )}
        <div>
          <p className="eyebrow" style={{ margin: 0 }}>{biz?.name}</p>
          {biz?.phone && (
            <p className="small" style={{ margin: 0 }}>
              <a href={`tel:${biz.phone}`}>{biz.phone}</a>
            </p>
          )}
        </div>
      </div>

      {!data.form ? (
        <div className="card">
          <h2 style={{ marginTop: 0 }}>No form to fill in</h2>
          <p className="small" style={{ margin: 0 }}>
            {biz?.name} doesn&apos;t have a form for your{" "}
            {data.appointment.service_name} appointment ({when}) — there&apos;s
            nothing to fill in here.
          </p>
        </div>
      ) : done || data.submission ? (
        <div className="card">
          <div style={{ fontSize: 34, marginBottom: 4 }}>✓</div>
          <h2 style={{ marginTop: 0 }}>
            {done ? "Thank you — your answers are in." : "You've already sent this form."}
          </h2>
          <p className="small" style={{ margin: 0 }}>
            {biz?.name} has your {data.form.name} answers for your{" "}
            {data.appointment.service_name} appointment on {when}.
            {data.submission && !done
              ? ` Sent ${formatDateInZone(new Date(data.submission.submitted_at), tz)}.`
              : ""}
          </p>
        </div>
      ) : (
        <div className="card">
          <h2 style={{ marginTop: 0 }}>{data.form.name}</h2>
          {data.form.description && <p className="small">{data.form.description}</p>}
          <p className="small">
            For your {data.appointment.service_name} appointment · {when}
          </p>
          {error && <div className="error">{error}</div>}
          <form onSubmit={submit}>
            <FormFields
              questions={data.questions}
              answers={answers}
              onAnswer={(qid, v) => setAnswers((p) => ({ ...p, [qid]: v }))}
              files={files}
              onFiles={(qid, list) => setFiles((p) => ({ ...p, [qid]: list }))}
            />
            <button className="btn btn-primary btn-block" type="submit" disabled={busy}>
              {busy ? "Sending…" : "Send answers"}
            </button>
          </form>
        </div>
      )}

      <p className="small center" style={{ marginTop: 16 }}>
        <Link href={`/manage/${token}`}>← Back to your appointment</Link>
      </p>
      {poweredBy}
    </main>
  );
}
