"use client";

import { useCallback, useEffect, useState } from "react";
import { createBrowserSupabase } from "@/lib/supabase-browser";
import type {
  FormQuestion,
  FormQuestionType,
  IntakeForm,
  NoteTemplate,
  Service,
} from "@/lib/types";
import FormFields from "@/components/FormFields";

const QUESTION_TYPES: { value: FormQuestionType; label: string }[] = [
  { value: "short_text", label: "Short answer" },
  { value: "long_text", label: "Long answer" },
  { value: "multiple_choice", label: "Multiple choice" },
  { value: "yes_no", label: "Yes / No" },
  { value: "date", label: "Date" },
  { value: "file", label: "File upload" },
];

const NOT_READY =
  "Forms aren't available yet — they turn on with the next database update.";

/** The PDF §4 law-firm intake starter: case type, a description of the
 *  matter, the opposing party (for the conflict check), and documents. */
const LAW_TEMPLATE: {
  label: string;
  type: FormQuestionType;
  required: boolean;
  options?: string[];
}[] = [
  {
    label: "What type of case is this?",
    type: "multiple_choice",
    required: true,
    options: [
      "Family law",
      "Criminal defense",
      "Immigration",
      "Personal injury",
      "Business / contracts",
      "Real estate",
      "Other",
    ],
  },
  { label: "Please describe your matter", type: "long_text", required: true },
  {
    label: "Opposing party (the other side — used for our conflict check)",
    type: "short_text",
    required: false,
  },
  { label: "Documents (anything that helps us review your case)", type: "file", required: false },
];

export default function FormsManager({
  businessId,
  services,
}: {
  businessId: string;
  services: Service[];
}) {
  const [ready, setReady] = useState<boolean | null>(null);
  const [forms, setForms] = useState<IntakeForm[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [questions, setQuestions] = useState<FormQuestion[]>([]);
  const [newForm, setNewForm] = useState({ name: "", description: "" });
  const [draft, setDraft] = useState<{
    label: string;
    type: FormQuestionType;
    required: boolean;
    options: string;
  }>({ label: "", type: "short_text", required: false, options: "" });
  const [showPreview, setShowPreview] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  const [templates, setTemplates] = useState<NoteTemplate[]>([]);
  const [tpl, setTpl] = useState({ name: "", service_id: "", discussed: "", actions: "" });

  const loadForms = useCallback(async () => {
    const supabase = createBrowserSupabase();
    const { data, error } = await supabase
      .from("forms")
      .select("*")
      .eq("business_id", businessId)
      .order("created_at", { ascending: true });
    if (error) {
      setReady(false);
      return;
    }
    setReady(true);
    setForms((data ?? []) as IntakeForm[]);
  }, [businessId]);

  const loadTemplates = useCallback(async () => {
    const supabase = createBrowserSupabase();
    const { data, error } = await supabase
      .from("note_templates")
      .select("*")
      .eq("business_id", businessId)
      .order("created_at", { ascending: true });
    if (!error) setTemplates((data ?? []) as NoteTemplate[]);
  }, [businessId]);

  useEffect(() => {
    loadForms();
    loadTemplates();
  }, [loadForms, loadTemplates]);

  const loadQuestions = useCallback(async (formId: string) => {
    const supabase = createBrowserSupabase();
    const { data } = await supabase
      .from("form_questions")
      .select("*")
      .eq("form_id", formId)
      .order("position", { ascending: true })
      .order("created_at", { ascending: true });
    setQuestions(
      ((data ?? []) as FormQuestion[]).map((q) => ({
        ...q,
        options: Array.isArray(q.options) ? q.options : [],
      }))
    );
  }, []);

  useEffect(() => {
    if (selectedId) loadQuestions(selectedId);
    else setQuestions([]);
  }, [selectedId, loadQuestions]);

  const selected = forms.find((f) => f.id === selectedId) ?? null;

  async function createForm(name: string, description: string) {
    const supabase = createBrowserSupabase();
    const { data, error } = await supabase
      .from("forms")
      .insert({ business_id: businessId, name, description: description || null })
      .select("*")
      .single();
    if (error || !data) {
      setMsg(NOT_READY);
      return null;
    }
    await loadForms();
    return data as IntakeForm;
  }

  async function addForm(e: React.FormEvent) {
    e.preventDefault();
    if (!newForm.name.trim()) return;
    setBusy(true);
    const created = await createForm(newForm.name.trim(), newForm.description.trim());
    if (created) {
      setNewForm({ name: "", description: "" });
      setSelectedId(created.id);
    }
    setBusy(false);
  }

  async function createLawTemplate() {
    setBusy(true);
    setMsg("");
    const form = await createForm(
      "Law firm intake",
      "Tell us about your case before your consultation."
    );
    if (form) {
      const supabase = createBrowserSupabase();
      await supabase.from("form_questions").insert(
        LAW_TEMPLATE.map((q, i) => ({
          form_id: form.id,
          label: q.label,
          type: q.type,
          required: q.required,
          options: q.options ?? [],
          position: i,
        }))
      );
      setSelectedId(form.id);
      setMsg("Law firm intake created — attach it to a service in Settings → Services.");
    }
    setBusy(false);
  }

  async function deleteForm(f: IntakeForm) {
    const ok = window.confirm(
      `Delete the form “${f.name}”? Its questions go with it. Submissions customers already sent are kept in their history.`
    );
    if (!ok) return;
    const supabase = createBrowserSupabase();
    // Submissions reference the form; keep them readable by detaching
    // first is not possible (FK is not null) — so deletion is refused
    // by the database when submissions exist, and we say so plainly.
    const { error } = await supabase.from("forms").delete().eq("id", f.id);
    if (error) {
      setMsg(
        "That form already has submissions, so it can't be deleted — it stays as the record of what customers were asked."
      );
      return;
    }
    if (selectedId === f.id) setSelectedId(null);
    loadForms();
  }

  async function addQuestion(e: React.FormEvent) {
    e.preventDefault();
    if (!selected || !draft.label.trim()) return;
    setBusy(true);
    const supabase = createBrowserSupabase();
    const options =
      draft.type === "multiple_choice"
        ? draft.options.split("\n").map((s) => s.trim()).filter(Boolean)
        : [];
    const { error } = await supabase.from("form_questions").insert({
      form_id: selected.id,
      label: draft.label.trim(),
      type: draft.type,
      required: draft.required,
      options,
      position: questions.length,
    });
    if (!error) {
      setDraft({ label: "", type: "short_text", required: false, options: "" });
      loadQuestions(selected.id);
    }
    setBusy(false);
  }

  async function move(q: FormQuestion, dir: -1 | 1) {
    const idx = questions.findIndex((x) => x.id === q.id);
    const swap = questions[idx + dir];
    if (!swap) return;
    const supabase = createBrowserSupabase();
    await supabase.from("form_questions").update({ position: swap.position }).eq("id", q.id);
    await supabase.from("form_questions").update({ position: q.position }).eq("id", swap.id);
    loadQuestions(selected!.id);
  }

  async function toggleRequired(q: FormQuestion) {
    const supabase = createBrowserSupabase();
    await supabase.from("form_questions").update({ required: !q.required }).eq("id", q.id);
    loadQuestions(selected!.id);
  }

  async function deleteQuestion(q: FormQuestion) {
    const ok = window.confirm(`Remove the question “${q.label}”?`);
    if (!ok) return;
    const supabase = createBrowserSupabase();
    await supabase.from("form_questions").delete().eq("id", q.id);
    loadQuestions(selected!.id);
  }

  async function addTemplate(e: React.FormEvent) {
    e.preventDefault();
    if (!tpl.name.trim()) return;
    setBusy(true);
    const supabase = createBrowserSupabase();
    const { error } = await supabase.from("note_templates").insert({
      business_id: businessId,
      service_id: tpl.service_id || null,
      name: tpl.name.trim(),
      discussed_prompt: tpl.discussed,
      actions_prompt: tpl.actions,
    });
    if (!error) {
      setTpl({ name: "", service_id: "", discussed: "", actions: "" });
      loadTemplates();
    }
    setBusy(false);
  }

  async function deleteTemplate(t: NoteTemplate) {
    const ok = window.confirm(`Delete the note template “${t.name}”?`);
    if (!ok) return;
    const supabase = createBrowserSupabase();
    await supabase.from("note_templates").delete().eq("id", t.id);
    loadTemplates();
  }

  if (ready === false) {
    return (
      <div className="card">
        <p className="small" style={{ margin: 0 }}>{NOT_READY}</p>
      </div>
    );
  }

  return (
    <div>
      {msg && <div className="notice">{msg}</div>}

      <div className="card">
        <h2 style={{ marginTop: 0 }}>Your forms</h2>
        {forms.length === 0 && (
          <p className="small">
            No forms yet. Create one below, or start from the law-firm
            intake template. Attach a form to a service in Settings →
            Services, and customers complete it before their visit.
          </p>
        )}
        {forms.map((f) => (
          <div key={f.id} className="service-row">
            <div>
              <div className="service-name">{f.name}</div>
              {f.description && <div className="service-meta">{f.description}</div>}
            </div>
            <span style={{ display: "flex", gap: 6 }}>
              <button className="btn" style={{ padding: "7px 13px" }} onClick={() => setSelectedId(f.id)}>
                {selectedId === f.id ? "Building…" : "Build"}
              </button>
              <button className="btn" style={{ padding: "7px 13px" }} onClick={() => deleteForm(f)}>
                Delete
              </button>
            </span>
          </div>
        ))}
        <form onSubmit={addForm} style={{ marginTop: 14 }}>
          <label className="field">
            <span>New form name</span>
            <input
              value={newForm.name}
              onChange={(e) => setNewForm({ ...newForm, name: e.target.value })}
              placeholder="New client intake"
              required
            />
          </label>
          <label className="field">
            <span>Description (optional — shown to the customer)</span>
            <input
              value={newForm.description}
              onChange={(e) => setNewForm({ ...newForm, description: e.target.value })}
              placeholder="A few questions before your visit"
            />
          </label>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button className="btn btn-primary" type="submit" disabled={busy || !newForm.name.trim()}>
              Create form
            </button>
            <button className="btn" type="button" onClick={createLawTemplate} disabled={busy}>
              Start from the law-firm intake template
            </button>
          </div>
        </form>
      </div>

      {selected && (
        <div className="card">
          <h2 style={{ marginTop: 0 }}>Building: {selected.name}</h2>
          {questions.length === 0 && (
            <p className="small">No questions yet — add the first one below.</p>
          )}
          {questions.map((q, i) => (
            <div key={q.id} className="service-row">
              <div>
                <div className="service-name">
                  {i + 1}. {q.label}
                </div>
                <div className="service-meta">
                  {QUESTION_TYPES.find((t) => t.value === q.type)?.label ?? q.type}
                  {q.type === "multiple_choice" && q.options.length > 0
                    ? ` · ${q.options.join(" / ")}`
                    : ""}
                  {q.required ? " · Required" : " · Optional"}
                </div>
              </div>
              <span style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                <button className="btn" style={{ padding: "6px 10px" }} onClick={() => move(q, -1)} disabled={i === 0}>
                  ↑
                </button>
                <button
                  className="btn"
                  style={{ padding: "6px 10px" }}
                  onClick={() => move(q, 1)}
                  disabled={i === questions.length - 1}
                >
                  ↓
                </button>
                <button className="btn" style={{ padding: "6px 10px" }} onClick={() => toggleRequired(q)}>
                  {q.required ? "Make optional" : "Make required"}
                </button>
                <button className="btn" style={{ padding: "6px 10px" }} onClick={() => deleteQuestion(q)}>
                  Delete
                </button>
              </span>
            </div>
          ))}

          <form onSubmit={addQuestion} style={{ marginTop: 14 }}>
            <label className="field">
              <span>Question</span>
              <input
                value={draft.label}
                onChange={(e) => setDraft({ ...draft, label: e.target.value })}
                placeholder="What should we know before your visit?"
                required
              />
            </label>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <label className="field" style={{ flex: 1, minWidth: 160 }}>
                <span>Answer type</span>
                <select
                  value={draft.type}
                  onChange={(e) => setDraft({ ...draft, type: e.target.value as FormQuestionType })}
                >
                  {QUESTION_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="field" style={{ flex: 1, minWidth: 160 }}>
                <span>Required?</span>
                <select
                  value={draft.required ? "yes" : "no"}
                  onChange={(e) => setDraft({ ...draft, required: e.target.value === "yes" })}
                >
                  <option value="no">Optional</option>
                  <option value="yes">Required</option>
                </select>
              </label>
            </div>
            {draft.type === "multiple_choice" && (
              <label className="field">
                <span>Choices (one per line)</span>
                <textarea
                  value={draft.options}
                  onChange={(e) => setDraft({ ...draft, options: e.target.value })}
                  rows={4}
                  placeholder={"Family law\nCriminal defense\nOther"}
                />
              </label>
            )}
            <button className="btn btn-primary" type="submit" disabled={busy || !draft.label.trim()}>
              Add question
            </button>
          </form>

          <div style={{ marginTop: 18 }}>
            <button className="btn" onClick={() => setShowPreview((v) => !v)}>
              {showPreview ? "Hide preview" : "Preview — as the customer sees it"}
            </button>
            {showPreview && (
              <div
                style={{
                  maxWidth: 360,
                  margin: "14px auto 0",
                  border: "10px solid #1c2b1c",
                  borderRadius: 36,
                  padding: "18px 16px",
                  background: "#f7f9f7",
                }}
              >
                <p className="eyebrow" style={{ marginTop: 0 }}>{selected.name}</p>
                {selected.description && <p className="small">{selected.description}</p>}
                <FormFields questions={questions} answers={{}} disabled />
                <button className="btn btn-primary btn-block" disabled>
                  Send answers
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      <div className="card">
        <h2 style={{ marginTop: 0 }}>Visit-note templates</h2>
        <p className="small" style={{ marginTop: 0 }}>
          A template pre-fills a new visit note with starter text, so
          notes stay fast and consistent. Templates for a specific service
          are offered first on that service&apos;s appointments.
        </p>
        {templates.map((t) => (
          <div key={t.id} className="service-row">
            <div>
              <div className="service-name">{t.name}</div>
              <div className="service-meta">
                {t.service_id
                  ? services.find((s) => s.id === t.service_id)?.name ?? "A service"
                  : "All services"}
              </div>
            </div>
            <button className="btn" style={{ padding: "7px 13px" }} onClick={() => deleteTemplate(t)}>
              Delete
            </button>
          </div>
        ))}
        <form onSubmit={addTemplate} style={{ marginTop: 12 }}>
          <label className="field">
            <span>Template name</span>
            <input
              value={tpl.name}
              onChange={(e) => setTpl({ ...tpl, name: e.target.value })}
              placeholder="Initial consultation"
              required
            />
          </label>
          <label className="field">
            <span>For which service?</span>
            <select value={tpl.service_id} onChange={(e) => setTpl({ ...tpl, service_id: e.target.value })}>
              <option value="">All services</option>
              {services.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>Starter text — “What we discussed”</span>
            <textarea
              value={tpl.discussed}
              onChange={(e) => setTpl({ ...tpl, discussed: e.target.value })}
              rows={3}
              placeholder="Reviewed the client's goals, the timeline, and what happens next."
            />
          </label>
          <label className="field">
            <span>Starter text — “What the customer did / decided”</span>
            <textarea
              value={tpl.actions}
              onChange={(e) => setTpl({ ...tpl, actions: e.target.value })}
              rows={3}
              placeholder="Agreed to… Will provide… by…"
            />
          </label>
          <button className="btn btn-primary" type="submit" disabled={busy || !tpl.name.trim()}>
            Add template
          </button>
        </form>
      </div>
    </div>
  );
}
