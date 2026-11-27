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
import { INDUSTRY_TEMPLATES, type IndustryTemplates } from "@/lib/form-templates";

const QUESTION_TYPES: { value: FormQuestionType; label: string }[] = [
  { value: "short_text", label: "Short answer" },
  { value: "long_text", label: "Long answer" },
  { value: "multiple_choice", label: "Multiple choice" },
  { value: "yes_no", label: "Yes / No" },
  { value: "date", label: "Date" },
  { value: "file", label: "File upload" },
];

const NOT_READY = "Forms aren't ready yet. Please check back soon.";

export default function FormsManager({
  businessId,
  services,
  category,
}: {
  businessId: string;
  services: Service[];
  category?: string | null;
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
  const [tplMsg, setTplMsg] = useState("");

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
    try {
      const created = await createForm(newForm.name.trim(), newForm.description.trim());
      if (created) {
        setNewForm({ name: "", description: "" });
        setSelectedId(created.id);
      }
    } catch {
      setMsg("That form could not be created just now. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  /** One click in the pre-made gallery: create this business's own
   *  editable copy of the industry form, questions included. */
  async function createFromTemplate(t: IndustryTemplates) {
    setBusy(true);
    setMsg("");
    try {
      const form = await createForm(t.form.name, t.form.description);
      if (form) {
        const supabase = createBrowserSupabase();
        await supabase.from("form_questions").insert(
          t.form.questions.map((q, i) => ({
            form_id: form.id,
            label: q.label,
            type: q.type,
            required: q.required,
            options: q.options ?? [],
            position: i,
          }))
        );
        setSelectedId(form.id);
        setMsg(
          `Your ${t.form.name} is ready below. Attach it to a service in Settings → Services, and customers will fill it in before their visit.`
        );
      }
    } catch {
      setMsg("That template could not be added just now. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  /** One click in the gallery: add the industry note template as
   *  this business's own copy. */
  async function useNoteTemplate(t: IndustryTemplates) {
    setBusy(true);
    setTplMsg("");
    try {
      const supabase = createBrowserSupabase();
      const { error } = await supabase.from("note_templates").insert({
        business_id: businessId,
        service_id: null,
        name: t.note.name,
        discussed_prompt: t.note.discussed,
        actions_prompt: t.note.actions,
      });
      if (error) {
        setTplMsg("That template could not be added just now. Please try again.");
      } else {
        await loadTemplates();
        setTplMsg(`Added: ${t.note.name}. It is in your note templates below.`);
      }
    } catch {
      setTplMsg("That template could not be added just now. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  async function deleteForm(f: IntakeForm) {
    const ok = window.confirm(
      `Delete the form “${f.name}”? Its questions go with it. Submissions customers already sent are kept in their history.`
    );
    if (!ok) return;
    const supabase = createBrowserSupabase();
    // A form customers have already answered can't be deleted. The
    // database refuses (submissions reference it), and we say so
    // plainly instead of letting the answers vanish.
    const { error } = await supabase.from("forms").delete().eq("id", f.id);
    if (error) {
      setMsg(
        "Customers have already answered this form, so it can't be deleted. It stays as the record of what they were asked."
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
    try {
      const { error } = await supabase.from("form_questions").insert({
        form_id: selected.id,
        label: draft.label.trim(),
        type: draft.type,
        required: draft.required,
        options,
        position: questions.length,
      });
      if (error) {
        setMsg("That question could not be added just now. Please try again.");
      } else {
        setDraft({ label: "", type: "short_text", required: false, options: "" });
        loadQuestions(selected.id);
      }
    } catch {
      setMsg("That question could not be added just now. Please try again.");
    } finally {
      setBusy(false);
    }
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
    setTplMsg("");
    // The old version of this handler swallowed every failure: a
    // rejected or failed insert left the busy flag on and the button
    // dead with no message, which reads as "the button does nothing"
    // (Frantz, 2026-11-26). Now a failure always shows, and the
    // button always frees up again.
    try {
      const supabase = createBrowserSupabase();
      const { error } = await supabase.from("note_templates").insert({
        business_id: businessId,
        service_id: tpl.service_id || null,
        name: tpl.name.trim(),
        discussed_prompt: tpl.discussed,
        actions_prompt: tpl.actions,
      });
      if (error) {
        setTplMsg("That template could not be saved. Please try again.");
      } else {
        setTpl({ name: "", service_id: "", discussed: "", actions: "" });
        await loadTemplates();
        setTplMsg("Template saved. It is in your list above, ready to pick when you write a visit note.");
      }
    } catch {
      setTplMsg("That template could not be saved. Please check your connection and try again.");
    } finally {
      setBusy(false);
    }
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

  const gallery = [...INDUSTRY_TEMPLATES].sort((a, b) => {
    if (a.category === category) return -1;
    if (b.category === category) return 1;
    return 0;
  });
  const formAdded = (t: IndustryTemplates) =>
    forms.some((f) => f.name.trim().toLowerCase() === t.form.name.toLowerCase());
  const noteAdded = (t: IndustryTemplates) =>
    templates.some((x) => x.name.trim().toLowerCase() === t.note.name.toLowerCase());

  return (
    <div>
      {msg && <div className="notice">{msg}</div>}

      <div className="card">
        <h2 style={{ marginTop: 0 }}>Pre-made templates</h2>
        <p className="small" style={{ maxWidth: 560 }}>
          Ready-made starting points for your kind of business. Use one and
          it becomes yours: your own copy, ready to edit below. Your own
          industry is first.
        </p>
        <div className="tpl-gallery">
          {gallery.map((t) => (
            <div key={t.category} className="tpl-card">
              <div className="tpl-card-head">
                <span className="tpl-card-name">{t.industry}</span>
                {t.category === category && <span className="tpl-card-yours">Your industry</span>}
              </div>
              <div className="tpl-row">
                <div>
                  <div className="tpl-row-title">Customer form: {t.form.name}</div>
                  <div className="tpl-row-line">{t.form.line}</div>
                </div>
                {formAdded(t) ? (
                  <span className="tpl-added">Added. Edit it below.</span>
                ) : (
                  <button className="btn" style={{ padding: "7px 13px" }} onClick={() => createFromTemplate(t)} disabled={busy}>
                    Use this template
                  </button>
                )}
              </div>
              <div className="tpl-row">
                <div>
                  <div className="tpl-row-title">Note template: {t.note.name}</div>
                  <div className="tpl-row-line">{t.note.line}</div>
                </div>
                {noteAdded(t) ? (
                  <span className="tpl-added">Added. Edit it below.</span>
                ) : (
                  <button className="btn" style={{ padding: "7px 13px" }} onClick={() => useNoteTemplate(t)} disabled={busy}>
                    Use this template
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="card">
        <h2 style={{ marginTop: 0 }}>Your forms</h2>
        {forms.length === 0 && (
          <p className="small">
            No forms yet. Create one below, or start from a pre-made
            template above. Then attach it to a service in Settings →
            Services, and customers will fill it in before their visit.
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
                {selectedId === f.id ? "Editing…" : "Edit form"}
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
              placeholder="New client form"
              required
            />
          </label>
          <label className="field">
            <span>Description (optional, shown to the customer)</span>
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
          </div>
        </form>
      </div>

      {selected && (
        <div className="card">
          <h2 style={{ marginTop: 0 }}>Editing: {selected.name}</h2>
          {questions.length === 0 && (
            <p className="small">No questions yet. Add the first one below.</p>
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
              {showPreview ? "Hide preview" : "Preview: as the customer sees it"}
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
        <h2 style={{ marginTop: 0 }}>Note templates</h2>
        <p className="small" style={{ marginTop: 0 }}>
          Pick a template when writing a visit note and the note starts
          with this text already filled in. You just edit it. A template
          made for one service shows first on that service&apos;s
          appointments.
        </p>
        {templates.length === 0 && (
          <p className="small">No templates yet. Add your first one below.</p>
        )}
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
        {tplMsg && <div className="notice" style={{ marginTop: 12 }}>{tplMsg}</div>}
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
            <span>Starter text: “What we discussed”</span>
            <textarea
              value={tpl.discussed}
              onChange={(e) => setTpl({ ...tpl, discussed: e.target.value })}
              rows={3}
              placeholder="Reviewed the client's goals, the timeline, and what happens next."
            />
          </label>
          <label className="field">
            <span>Starter text: “What the customer did / decided”</span>
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
