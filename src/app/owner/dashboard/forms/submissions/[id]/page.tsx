import Link from "next/link";
import { notFound } from "next/navigation";
import { requireBusiness } from "@/lib/owner";
import { createAdminSupabase } from "@/lib/supabase";
import { formatDateInZone, formatTimeInZone } from "@/lib/slots";
import { AnswerList } from "@/components/FormFields";
import type { FormQuestion, FormSubmission } from "@/lib/types";

// One submitted intake form, as the business sees it: the questions,
// the customer's answers, and signed download links for uploaded
// files. Access is verified against the signed-in user's business
// first; the signed URLs are then minted with the service role (the
// form-uploads bucket is private: links expire in an hour).
export default async function DashboardSubmissionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { supabase, business } = await requireBusiness();
  const tz = business.timezone;

  const { data: subRow, error } = await supabase
    .from("form_submissions")
    .select("*")
    .eq("id", id)
    .eq("business_id", business.id)
    .maybeSingle();
  if (error || !subRow) notFound();
  const submission = subRow as FormSubmission;

  const [{ data: formRow }, { data: questionRows }, { data: customer }] = await Promise.all([
    supabase.from("forms").select("name").eq("id", submission.form_id).maybeSingle(),
    supabase
      .from("form_questions")
      .select("*")
      .eq("form_id", submission.form_id)
      .order("position", { ascending: true })
      .order("created_at", { ascending: true }),
    supabase
      .from("customers")
      .select("full_name")
      .eq("id", submission.customer_id)
      .maybeSingle(),
  ]);
  const questions = ((questionRows ?? []) as FormQuestion[]).map((q) => ({
    ...q,
    options: Array.isArray(q.options) ? q.options : [],
  }));

  // Signed URLs for every uploaded file in this submission.
  const paths = Object.values(submission.answers ?? {})
    .filter((v): v is string[] => Array.isArray(v))
    .flat();
  const fileLinks: Record<string, string> = {};
  if (paths.length > 0) {
    const admin = createAdminSupabase();
    const { data: signed } = await admin.storage
      .from("form-uploads")
      .createSignedUrls(paths, 3600);
    for (const s of signed ?? []) {
      if (s.path && s.signedUrl) fileLinks[s.path] = s.signedUrl;
    }
  }

  const submittedWhen = `${formatDateInZone(new Date(submission.submitted_at), tz)} · ${formatTimeInZone(new Date(submission.submitted_at), tz)}`;

  return (
    <div>
      <p className="eyebrow">
        <Link href={`/owner/dashboard/customers/${submission.customer_id}`}>
          ← {customer?.full_name ?? "Customer profile"}
        </Link>
      </p>
      <h1 style={{ fontSize: 25 }}>{formRow?.name ?? "Form"}</h1>
      <p className="small" style={{ marginTop: 0 }}>
        Filled in by {customer?.full_name ?? "the customer"} · {submittedWhen}
        {submission.appointment_id && (
          <>
            {" · "}
            <Link href={`/owner/dashboard/appointments/${submission.appointment_id}`}>
              View the appointment
            </Link>
          </>
        )}
      </p>
      <div className="card">
        <AnswerList questions={questions} answers={submission.answers ?? {}} fileLinks={fileLinks} />
      </div>
    </div>
  );
}
