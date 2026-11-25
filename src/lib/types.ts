// Shared types matching the Supabase schema in supabase/migrations/0001_schema.sql

export interface Business {
  id: string;
  owner_id: string;
  slug: string;
  name: string;
  type: string;
  /** Marketplace category slug from src/lib/categories.ts (migration 0007).
      Optional: rows fetched before the migration lands won't have it. */
  category?: string;
  logo_url: string | null;
  description: string | null;
  address: string | null;
  phone: string | null;
  email: string | null;
  timezone: string;
  published: boolean;
  trial_ends_at: string;
  created_at: string;
  // Billing (migration 0004) — the business's AppointEase subscription.
  plan: string; // PlanId from src/lib/plans.ts
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  subscription_status: string | null;
  subscription_current_period_end: string | null;
  billing_lapsed_at: string | null;
}

export interface BusinessPhoto {
  id: string;
  business_id: string;
  url: string;
  position: number;
  created_at: string;
}

export interface Service {
  id: string;
  business_id: string;
  name: string;
  duration_minutes: number;
  /** Null = no public price; the price is confirmed with the business
      (migration 0009). 0 = explicitly free. */
  price_cents: number | null;
  active: boolean;
  /** Attached intake form, if any (migration 0012). Optional: rows
      fetched before the migration lands won't have it. */
  form_id?: string | null;
  /** Where the service happens (migration 0013). Optional: rows
      fetched before the migration lands won't have it. */
  visit_type?: VisitType;
}

export type VisitType = "in_person" | "online" | "both";

/** Plain words for a service's visit type, shown to customers. */
export function visitTypeLabel(v: VisitType | null | undefined): string {
  switch (v) {
    case "online":
      return "Online";
    case "both":
      return "Your choice";
    default:
      return "At the business";
  }
}

/** A business's branch (migration 0013). Optional feature: a business
 *  with no location rows just uses its main address, as before. */
export interface Location {
  id: string;
  business_id: string;
  name: string;
  address: string | null;
  phone: string | null;
  created_at: string;
}

/** Who offers a service (staff_services, migration 0001). Rows for a
 *  service = only those team members offer it; no rows = everyone. */
export interface StaffService {
  staff_id: string;
  service_id: string;
}

export interface StaffMember {
  id: string;
  business_id: string;
  name: string;
  active: boolean;
}

export interface Availability {
  id: string;
  business_id: string;
  staff_id: string | null;
  weekday: number; // 0 = Sunday … 6 = Saturday
  open_time: string; // "09:00:00"
  close_time: string;
}

export interface Customer {
  id: string;
  full_name: string;
  email: string | null;
  phone: string | null;
}

export type AppointmentStatus = "confirmed" | "cancelled" | "completed" | "no_show";

export interface Appointment {
  id: string;
  business_id: string;
  customer_id: string;
  service_id: string;
  staff_id: string | null;
  starts_at: string;
  ends_at: string;
  status: AppointmentStatus;
  notes: string | null;
  manage_token: string;
  confirmation_code: string; // "AE-XXXXXX" (migration 0005)
  created_at: string;
  // Optional: only present when selected. cancellation_reason is from
  // migration 0002; cancelled_by / completed_at from migration 0010.
  cancellation_reason?: string | null;
  cancelled_by?: string | null;
  completed_at?: string | null;
  /** Which branch the appointment is at (migration 0013). Optional:
      rows fetched before the migration lands won't have it. */
  location_id?: string | null;
}

// --- Customer history (migration 0010) ------------------------------------
// Payment event types are intentionally absent: AppointEase never receives
// or holds client money, so there is nothing to log about payments.
export type CustomerEventType =
  | "registered"
  | "booked"
  | "rescheduled"
  | "cancelled"
  | "no_show"
  | "completed"
  | "form_submitted"
  | "reminder_sent"
  | "message"
  | "assigned"
  | "note_added"
  | "profile_changed";

export type EventActorType = "customer" | "team_member" | "system";

export interface CustomerEvent {
  id: string;
  business_id: string;
  customer_id: string;
  appointment_id: string | null;
  type: CustomerEventType;
  actor_type: EventActorType;
  actor_id: string | null;
  details: Record<string, unknown>;
  created_at: string;
}

export type VisitNoteOutcome = "completed" | "no_show" | "cancelled_late" | "rescheduled";

export interface VisitNote {
  id: string;
  business_id: string;
  appointment_id: string;
  customer_id: string;
  author_id: string | null;
  outcome: VisitNoteOutcome;
  discussed: string;
  customer_actions: string;
  visibility: "internal" | "shared";
  shared_summary: string | null;
  locked_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface VisitNoteAddendum {
  id: string;
  visit_note_id: string;
  author_id: string | null;
  body: string;
  created_at: string;
}

export interface NextStep {
  id: string;
  visit_note_id: string;
  business_id: string;
  customer_id: string;
  text: string;
  owner: "client" | "team";
  due_date: string | null;
  done_at: string | null;
  done_by: string | null;
  created_at: string;
}

/** Per-business relationship row (business_customers), with assignment. */
export interface BusinessCustomerRel {
  business_id: string;
  customer_id: string;
  assigned_staff_id: string | null;
  created_at: string;
}

export interface Message {
  id: string;
  business_id: string;
  customer_id: string;
  sender: "customer" | "business";
  body: string;
  read_at: string | null;
  created_at: string;
}

// Team logins (migration 0011). The business owner is an implicit member
// with role "owner" — no row required. Rows exist for invited logins.
export type MemberRole = "owner" | "manager" | "staff";

export interface BusinessMember {
  id: string;
  business_id: string;
  user_id: string;
  email: string | null;
  role: MemberRole;
  staff_id: string | null;
  status: "active" | "removed";
  created_at: string;
}

export interface TeamInvite {
  id: string;
  business_id: string;
  email: string;
  role: "manager" | "staff";
  staff_id: string | null;
  token: string;
  expires_at: string;
  accepted_at: string | null;
  created_at: string;
}

// --- Intake forms (migration 0012) -----------------------------------------
// No fee/deposit question types exist: forms never collect money data
// for AppointEase — the app never receives or holds client money.
export type FormQuestionType =
  | "short_text"
  | "long_text"
  | "multiple_choice"
  | "yes_no"
  | "date"
  | "file";

export interface IntakeForm {
  id: string;
  business_id: string;
  name: string;
  description: string | null;
  created_at: string;
}

export interface FormQuestion {
  id: string;
  form_id: string;
  label: string;
  type: FormQuestionType;
  /** Choice labels for multiple_choice; empty for other types. */
  options: string[];
  required: boolean;
  position: number;
  created_at: string;
}

/** answers maps question id → answer: a string for text/choice/yes-no/
 *  date questions, or an array of form-uploads storage paths for file
 *  questions. */
export type FormAnswers = Record<string, string | string[]>;

export interface FormSubmission {
  id: string;
  form_id: string;
  business_id: string;
  customer_id: string;
  appointment_id: string | null;
  answers: FormAnswers;
  submitted_at: string;
}

/** Visit-note starter text (migration 0012, PDF §7): picking a template
 *  pre-fills the note's discussed / customer-actions fields. service_id
 *  null = offered for every service. */
export interface NoteTemplate {
  id: string;
  business_id: string;
  service_id: string | null;
  name: string;
  discussed_prompt: string;
  actions_prompt: string;
  created_at: string;
}

export type ReminderKind = "confirmation" | "before_24h" | "before_2h";
export type ReminderChannel = "email" | "sms";

export interface Review {
  id: string;
  business_id: string;
  customer_id: string;
  appointment_id: string;
  rating: number;
  comment: string | null;
  created_at: string;
}

export interface PushSubscriptionRow {
  id: string;
  user_id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
  user_agent: string | null;
  created_at: string;
}

export function formatPrice(priceCents: number | null): string {
  if (priceCents === null) return "Price confirmed with the business";
  if (priceCents === 0) return "Free";
  return `$${(priceCents / 100).toFixed(priceCents % 100 === 0 ? 0 : 2)}`;
}

export function slugify(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}
