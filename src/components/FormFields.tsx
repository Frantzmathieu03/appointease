import type { FormAnswers, FormQuestion } from "@/lib/types";

/**
 * Renders an intake form's questions exactly as the customer sees them.
 * Shared by the owner's phone-frame Preview and the real customer form
 * page (/manage/<token>/form) so the two can never drift apart.
 *
 * File questions are handled by the parent: in interactive mode the
 * parent passes `files` (question id → chosen Files) and `onFiles`;
 * stored answers for file questions are storage-path arrays, rendered
 * by the parent (owner views) — here they show as a read-only note.
 */
export default function FormFields({
  questions,
  answers,
  onAnswer,
  files,
  onFiles,
  disabled,
}: {
  questions: FormQuestion[];
  answers: FormAnswers;
  onAnswer?: (questionId: string, value: string) => void;
  files?: Record<string, File[]>;
  onFiles?: (questionId: string, list: File[]) => void;
  disabled?: boolean;
}) {
  const str = (q: FormQuestion) => {
    const v = answers[q.id];
    return typeof v === "string" ? v : "";
  };

  return (
    <div>
      {questions.map((q) => (
        <div key={q.id} style={{ marginBottom: 16 }}>
          <label className="field" style={{ marginBottom: 6 }}>
            <span>
              {q.label}
              {q.required ? " *" : ""}
            </span>
          </label>
          {q.type === "short_text" && (
            <input
              value={str(q)}
              disabled={disabled}
              onChange={(e) => onAnswer?.(q.id, e.target.value)}
              style={{ width: "100%" }}
            />
          )}
          {q.type === "long_text" && (
            <textarea
              value={str(q)}
              disabled={disabled}
              onChange={(e) => onAnswer?.(q.id, e.target.value)}
              rows={4}
              style={{ width: "100%" }}
            />
          )}
          {q.type === "multiple_choice" && (
            <div>
              {(q.options ?? []).map((opt) => (
                <label key={opt} style={{ display: "block", marginBottom: 4 }}>
                  <input
                    type="radio"
                    name={`q-${q.id}`}
                    checked={str(q) === opt}
                    disabled={disabled}
                    onChange={() => onAnswer?.(q.id, opt)}
                  />{" "}
                  {opt}
                </label>
              ))}
            </div>
          )}
          {q.type === "yes_no" && (
            <div>
              {["Yes", "No"].map((opt) => (
                <label key={opt} style={{ marginRight: 16 }}>
                  <input
                    type="radio"
                    name={`q-${q.id}`}
                    checked={str(q) === opt}
                    disabled={disabled}
                    onChange={() => onAnswer?.(q.id, opt)}
                  />{" "}
                  {opt}
                </label>
              ))}
            </div>
          )}
          {q.type === "date" && (
            <input
              type="date"
              value={str(q)}
              disabled={disabled}
              onChange={(e) => onAnswer?.(q.id, e.target.value)}
            />
          )}
          {q.type === "file" && (
            <div>
              <input
                type="file"
                multiple
                disabled={disabled}
                onChange={(e) => onFiles?.(q.id, Array.from(e.target.files ?? []))}
              />
              {(files?.[q.id] ?? []).length > 0 && (
                <p className="small" style={{ margin: "4px 0 0" }}>
                  {(files?.[q.id] ?? []).map((f) => f.name).join(", ")}
                </p>
              )}
              {Array.isArray(answers[q.id]) && (
                <p className="small" style={{ margin: "4px 0 0" }}>
                  {(answers[q.id] as string[]).length} file
                  {(answers[q.id] as string[]).length === 1 ? "" : "s"} on file
                </p>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

/** Read-only rendering of a submitted form's answers (owner views). */
export function AnswerList({
  questions,
  answers,
  fileLinks,
}: {
  questions: FormQuestion[];
  answers: FormAnswers;
  /** storage path → signed download URL, for file answers. */
  fileLinks?: Record<string, string>;
}) {
  if (questions.length === 0) {
    return <p className="small" style={{ margin: 0 }}>This form has no questions.</p>;
  }
  return (
    <div>
      {questions.map((q) => {
        const v = answers[q.id];
        return (
          <div key={q.id} style={{ marginBottom: 12 }}>
            <p className="small" style={{ margin: "0 0 2px", fontWeight: 600 }}>{q.label}</p>
            {q.type === "file" ? (
              Array.isArray(v) && v.length > 0 ? (
                v.map((path) => (
                  <p key={path} className="small" style={{ margin: "2px 0" }}>
                    {fileLinks?.[path] ? (
                      <a href={fileLinks[path]} target="_blank" rel="noreferrer">
                        📎 {path.split("/").pop()}
                      </a>
                    ) : (
                      <>📎 {path.split("/").pop()}</>
                    )}
                  </p>
                ))
              ) : (
                <p className="small" style={{ margin: 0 }}>No file uploaded</p>
              )
            ) : (
              <p className="small" style={{ margin: 0, whiteSpace: "pre-wrap" }}>
                {typeof v === "string" && v ? v : "—"}
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
}
