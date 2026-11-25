"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createBrowserSupabase } from "@/lib/supabase-browser";
import type { NextStep, NoteTemplate, VisitNote, VisitNoteAddendum, VisitNoteOutcome } from "@/lib/types";
import NextStepsList from "./NextStepsList";

export interface NoteBundle {
  note: VisitNote;
  addenda: VisitNoteAddendum[];
  steps: NextStep[];
}

const OUTCOMES: { value: VisitNoteOutcome; label: string }[] = [
  { value: "completed", label: "Completed" },
  { value: "no_show", label: "No-show" },
  { value: "cancelled_late", label: "Cancelled late" },
  { value: "rescheduled", label: "Rescheduled" },
];

interface DraftStep {
  text: string;
  owner: "client" | "team";
  due_date: string;
}

/**
 * Visit notes for one appointment (PDF §7): what was discussed, what the
 * customer did/decided, next steps, and an internal/shared visibility
 * choice. Saving a note with outcome Completed / No-show also sets the
 * appointment's status. Notes are editable for 24 hours; after that,
 * changes are appended as addenda (author + time) — the original text
 * is never rewritten. Every save appends a `note_added` timeline event.
 */
export default function VisitNotes({
  businessId,
  customerId,
  appointmentId,
  appointmentStatus,
  actorId,
  tz,
  bundles,
  templates,
  serviceId,
}: {
  businessId: string;
  customerId: string;
  appointmentId: string;
  appointmentStatus: string;
  actorId: string;
  tz: string;
  bundles: NoteBundle[];
  /** Note templates (migration 0012) — service-matching ones first. */
  templates?: NoteTemplate[];
  serviceId?: string;
}) {
  const router = useRouter();
  const [showForm, setShowForm] = useState(false);
  const [outcome, setOutcome] = useState<VisitNoteOutcome>("completed");
  const [discussed, setDiscussed] = useState("");
  const [actions, setActions] = useState("");
  const [visibility, setVisibility] = useState<"internal" | "shared">("internal");
  const [summary, setSummary] = useState("");
  const [steps, setSteps] = useState<DraftStep[]>([]);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState("");
  const [status, setStatus] = useState(appointmentStatus);
  const [addendumDrafts, setAddendumDrafts] = useState<Record<string, string>>({});
  const [editDrafts, setEditDrafts] = useState<Record<string, { discussed: string; actions: string }>>({});

  const fmtWhen = (iso: string) =>
    new Intl.DateTimeFormat("en-US", {
      timeZone: tz,
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    }).format(new Date(iso));

  async function logEvent(type: string, details: Record<string, unknown>) {
    const supabase = createBrowserSupabase();
    await supabase.from("customer_events").insert({
      business_id: businessId,
      customer_id: customerId,
      appointment_id: appointmentId,
      type,
      actor_type: "team_member",
      actor_id: actorId,
      details,
    });
  }

  async function markStatus(next: "completed" | "no_show") {
    setBusy(true);
    const supabase = createBrowserSupabase();
    const patch: Record<string, unknown> = { status: next };
    if (next === "completed") patch.completed_at = new Date().toISOString();
    let { error } = await supabase.from("appointments").update(patch).eq("id", appointmentId);
    if (error && next === "completed") {
      // completed_at arrives with migration 0010 — retry without it.
      ({ error } = await supabase.from("appointments").update({ status: next }).eq("id", appointmentId));
    }
    if (!error) {
      setStatus(next);
      await logEvent(next, { via: "appointment page" });
    }
    setBusy(false);
    router.refresh();
  }

  async function saveNote(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setNote("");
    const supabase = createBrowserSupabase();
    const { data: created, error } = await supabase
      .from("visit_notes")
      .insert({
        business_id: businessId,
        appointment_id: appointmentId,
        customer_id: customerId,
        author_id: actorId,
        outcome,
        discussed: discussed.trim(),
        customer_actions: actions.trim(),
        visibility,
        shared_summary: visibility === "shared" ? summary.trim() || null : null,
      })
      .select("*")
      .single();
    if (error || !created) {
      setNote("Visit notes aren't available yet — they turn on with the next database update.");
      setBusy(false);
      return;
    }
    const cleanSteps = steps.filter((s) => s.text.trim());
    if (cleanSteps.length > 0) {
      await supabase.from("next_steps").insert(
        cleanSteps.map((s) => ({
          visit_note_id: created.id,
          business_id: businessId,
          customer_id: customerId,
          text: s.text.trim(),
          owner: s.owner,
          due_date: s.due_date || null,
        }))
      );
    }
    // Outcome drives the appointment status for completed / no-show.
    if (outcome === "completed" || outcome === "no_show") {
      const patch: Record<string, unknown> = { status: outcome };
      if (outcome === "completed") patch.completed_at = new Date().toISOString();
      let res = await supabase.from("appointments").update(patch).eq("id", appointmentId);
      if (res.error && outcome === "completed") {
        res = await supabase.from("appointments").update({ status: outcome }).eq("id", appointmentId);
      }
      if (!res.error) setStatus(outcome);
    }
    await logEvent("note_added", { outcome, note_id: created.id });
    setBusy(false);
    setShowForm(false);
    setDiscussed("");
    setActions("");
    setSummary("");
    setSteps([]);
    router.refresh();
  }

  async function saveEdit(bundle: NoteBundle) {
    const draft = editDrafts[bundle.note.id];
    if (!draft) return;
    setBusy(true);
    const supabase = createBrowserSupabase();
    await supabase
      .from("visit_notes")
      .update({
        discussed: draft.discussed,
        customer_actions: draft.actions,
        updated_at: new Date().toISOString(),
      })
      .eq("id", bundle.note.id);
    setBusy(false);
    setEditDrafts((prev) => {
      const next = { ...prev };
      delete next[bundle.note.id];
      return next;
    });
    router.refresh();
  }

  async function saveAddendum(bundle: NoteBundle) {
    const body = (addendumDrafts[bundle.note.id] ?? "").trim();
    if (!body) return;
    setBusy(true);
    const supabase = createBrowserSupabase();
    await supabase.from("visit_note_addenda").insert({
      visit_note_id: bundle.note.id,
      author_id: actorId,
      body,
    });
    setBusy(false);
    setAddendumDrafts((prev) => ({ ...prev, [bundle.note.id]: "" }));
    router.refresh();
  }

  const editable = (n: VisitNote) =>
    Date.now() - new Date(n.created_at).getTime() < 24 * 3600 * 1000;

  return (
    <div className="card">
      <h2 style={{ marginTop: 0 }}>Visit notes</h2>

      {status === "confirmed" && (
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
          <button className="btn" onClick={() => markStatus("completed")} disabled={busy}>
            Mark completed
          </button>
          <button className="btn" onClick={() => markStatus("no_show")} disabled={busy}>
            Mark no-show
          </button>
        </div>
      )}

      {bundles.length === 0 && !showForm && (
        <p className="small">No visit notes yet for this appointment.</p>
      )}

      {bundles.map((b) => (
        <div key={b.note.id} style={{ borderTop: "1px solid #e3eae3", paddingTop: 12, marginTop: 12 }}>
          <p style={{ margin: "0 0 4px" }}>
            <strong>{OUTCOMES.find((o) => o.value === b.note.outcome)?.label ?? b.note.outcome}</strong>{" "}
            <span className="small">
              · {fmtWhen(b.note.created_at)} · {b.note.visibility === "shared" ? "Summary shared with the customer" : "Internal only"}
            </span>
          </p>
          {editDrafts[b.note.id] ? (
            <div>
              <label className="small">What we discussed</label>
              <textarea
                value={editDrafts[b.note.id].discussed}
                onChange={(e) =>
                  setEditDrafts((p) => ({ ...p, [b.note.id]: { ...p[b.note.id], discussed: e.target.value } }))
                }
                rows={3}
                style={{ width: "100%" }}
              />
              <label className="small">What the customer did / decided</label>
              <textarea
                value={editDrafts[b.note.id].actions}
                onChange={(e) =>
                  setEditDrafts((p) => ({ ...p, [b.note.id]: { ...p[b.note.id], actions: e.target.value } }))
                }
                rows={3}
                style={{ width: "100%" }}
              />
              <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                <button className="btn btn-primary" onClick={() => saveEdit(b)} disabled={busy}>
                  Save changes
                </button>
                <button
                  className="btn"
                  onClick={() =>
                    setEditDrafts((p) => {
                      const n = { ...p };
                      delete n[b.note.id];
                      return n;
                    })
                  }
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <>
              {b.note.discussed && (
                <p className="small" style={{ margin: "2px 0" }}>
                  <strong>Discussed:</strong> {b.note.discussed}
                </p>
              )}
              {b.note.customer_actions && (
                <p className="small" style={{ margin: "2px 0" }}>
                  <strong>Customer did / decided:</strong> {b.note.customer_actions}
                </p>
              )}
              {b.note.visibility === "shared" && b.note.shared_summary && (
                <p className="small" style={{ margin: "2px 0" }}>
                  <strong>Shared summary:</strong> {b.note.shared_summary}
                </p>
              )}
              <NextStepsList steps={b.steps} actorId={actorId} tz={tz} />
              {editable(b.note) ? (
                <button
                  className="btn"
                  style={{ marginTop: 8, padding: "6px 12px" }}
                  onClick={() =>
                    setEditDrafts((p) => ({
                      ...p,
                      [b.note.id]: { discussed: b.note.discussed, actions: b.note.customer_actions },
                    }))
                  }
                >
                  Edit note (within 24 hours)
                </button>
              ) : (
                <div style={{ marginTop: 10 }}>
                  {b.addenda.map((a) => (
                    <p key={a.id} className="small" style={{ margin: "2px 0" }}>
                      <strong>Addendum · {fmtWhen(a.created_at)}:</strong> {a.body}
                    </p>
                  ))}
                  <div style={{ display: "flex", gap: 8, marginTop: 6 }}>
                    <input
                      placeholder="Add an addendum (the original note stays as written)…"
                      value={addendumDrafts[b.note.id] ?? ""}
                      onChange={(e) => setAddendumDrafts((p) => ({ ...p, [b.note.id]: e.target.value }))}
                      style={{ flex: 1 }}
                    />
                    <button className="btn" onClick={() => saveAddendum(b)} disabled={busy}>
                      Add
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      ))}

      {!showForm && (
        <button className="btn btn-primary" style={{ marginTop: 14 }} onClick={() => setShowForm(true)}>
          Add visit notes
        </button>
      )}
      {note && <p className="small" style={{ marginTop: 8 }}>{note}</p>}

      {showForm && (
        <form onSubmit={saveNote} style={{ marginTop: 12 }}>
          {templates && templates.length > 0 && (
            <>
              <label className="small">Start from a template (optional)</label>
              <select
                defaultValue=""
                style={{ display: "block", marginBottom: 10 }}
                onChange={(e) => {
                  const t = templates.find((x) => x.id === e.target.value);
                  if (!t) return;
                  // The template's prompts are starter text — the
                  // author edits them into the real note before saving.
                  if (t.discussed_prompt) setDiscussed(t.discussed_prompt);
                  if (t.actions_prompt) setActions(t.actions_prompt);
                }}
              >
                <option value="">Blank note</option>
                {[...templates]
                  .sort((a, b) => {
                    const am = a.service_id && a.service_id === serviceId ? 0 : 1;
                    const bm = b.service_id && b.service_id === serviceId ? 0 : 1;
                    return am - bm;
                  })
                  .map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                      {t.service_id && t.service_id === serviceId ? " (for this service)" : ""}
                    </option>
                  ))}
              </select>
            </>
          )}
          <label className="small">Outcome</label>
          <select value={outcome} onChange={(e) => setOutcome(e.target.value as VisitNoteOutcome)} style={{ display: "block", marginBottom: 10 }}>
            {OUTCOMES.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
          <label className="small">What we discussed</label>
          <textarea value={discussed} onChange={(e) => setDiscussed(e.target.value)} rows={3} style={{ width: "100%", marginBottom: 10 }} />
          <label className="small">What the customer did / decided</label>
          <textarea value={actions} onChange={(e) => setActions(e.target.value)} rows={3} style={{ width: "100%", marginBottom: 10 }} />
          <label className="small">Next steps</label>
          {steps.map((s, i) => (
            <div key={i} style={{ display: "flex", gap: 6, marginBottom: 6, flexWrap: "wrap" }}>
              <input
                placeholder="Next step…"
                value={s.text}
                onChange={(e) => setSteps((p) => p.map((x, j) => (j === i ? { ...x, text: e.target.value } : x)))}
                style={{ flex: 2, minWidth: 180 }}
              />
              <select
                value={s.owner}
                onChange={(e) => setSteps((p) => p.map((x, j) => (j === i ? { ...x, owner: e.target.value as "client" | "team" } : x)))}
              >
                <option value="team">Team</option>
                <option value="client">Customer</option>
              </select>
              <input
                type="date"
                value={s.due_date}
                onChange={(e) => setSteps((p) => p.map((x, j) => (j === i ? { ...x, due_date: e.target.value } : x)))}
              />
              <button type="button" className="btn" onClick={() => setSteps((p) => p.filter((_, j) => j !== i))}>
                Remove
              </button>
            </div>
          ))}
          <button type="button" className="btn" style={{ marginBottom: 12 }} onClick={() => setSteps((p) => [...p, { text: "", owner: "team", due_date: "" }])}>
            + Add a step
          </button>
          <div style={{ marginBottom: 10 }}>
            <label className="small" style={{ display: "block", marginBottom: 4 }}>Visibility</label>
            <label style={{ marginRight: 16 }}>
              <input type="radio" checked={visibility === "internal"} onChange={() => setVisibility("internal")} /> Internal only — team
            </label>
            <label>
              <input type="radio" checked={visibility === "shared"} onChange={() => setVisibility("shared")} /> Share a summary with the client
            </label>
          </div>
          {visibility === "shared" && (
            <>
              <label className="small">Summary the customer will see</label>
              <textarea value={summary} onChange={(e) => setSummary(e.target.value)} rows={2} style={{ width: "100%", marginBottom: 10 }} />
            </>
          )}
          <div style={{ display: "flex", gap: 8 }}>
            <button className="btn btn-primary" type="submit" disabled={busy}>
              {busy ? "Saving…" : "Save notes"}
            </button>
            <button className="btn" type="button" onClick={() => setShowForm(false)}>
              Cancel
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
