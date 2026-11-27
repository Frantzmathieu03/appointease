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
  /** Wide cover photo across the top of the public page (migration
      0014). Optional: rows fetched before the migration lands won't
      have it; the page renders a plain soft-green block instead. */
  cover_url?: string | null;
  /** The owner's name for the photos section (migration 0014).
      Null/absent = the page shows "Our work". */
  gallery_title?: string | null;
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
  // Customer-side booking rules (migration 0016). Optional: rows
  // fetched before the migration lands won't have them — the helpers
  // below supply the defaults (no policy words, 12 / 24 hours).
  /** The business's own cancellation words ("Late-cancellation note"
      in Settings). Null/absent = the friendly standard note shows. */
  cancellation_policy?: string | null;
  /** Inside this many hours of the appointment, customers are asked
      to call the office to reschedule instead of picking a time. */
  reschedule_cutoff_hours?: number | null;
  /** The business's free cancellation window, in hours. */
  cancel_window_hours?: number | null;
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
  /** Null = no public price (migration 0009). 0 = explicitly free. */
  price_cents: number | null;
  /** How the price is shown to customers (migration 0014):
      "none" = no price text, "exact" = "$250", "from" = "from $350",
      "free" = "Free". Optional: rows fetched before the migration
      lands won't have it — formatServicePrice derives the same answer
      from price_cents in that case. */
  price_type?: PriceType;
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
  | "profile_changed"
  // Offline bookkeeping only (migration 0015): the front desk marked
  // the customer as having paid AT THE OFFICE. No money ever moves
  // through AppointEase.
  | "marked_paid";

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
  /** When the customer ticked the texting consent box on this
   *  business's sign-up screen (migration 0016). Optional: rows
   *  fetched before the migration lands won't have it. */
  sms_consent_at?: string | null;
}

// --- Customer-side booking rules (migration 0016) ---------------------------

/** The friendly standard cancellation note, shown when the business
 *  has not written its own words (revised Customer Side Plan,
 *  Frantz 2026-11-26). Words only — nothing is ever charged. */
export const DEFAULT_CANCEL_NOTE =
  "Thanks for letting us know — please cancel at least 24 hours before when you can, so someone else can take this time. There's nothing to pay online.";

/** The business's cancellation words, or null when it has none set
 *  (callers then show DEFAULT_CANCEL_NOTE or omit the line). */
export function businessCancelNote(b: {
  cancellation_policy?: string | null;
}): string | null {
  const words = (b.cancellation_policy ?? "").trim();
  return words ? words : null;
}

/** Reschedule cut-off in hours; 12 until the business changes it (or
 *  before migration 0016 lands). */
export function rescheduleCutoffHours(b: {
  reschedule_cutoff_hours?: number | null;
}): number {
  const n = b.reschedule_cutoff_hours;
  return typeof n === "number" && n >= 0 ? n : 12;
}

/** Free cancellation window in hours; 24 by default. */
export function cancelWindowHours(b: {
  cancel_window_hours?: number | null;
}): number {
  const n = b.cancel_window_hours;
  return typeof n === "number" && n >= 0 ? n : 24;
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
  /** The person's name from the invite card (migration 0015). */
  name?: string | null;
  role: "manager" | "staff";
  staff_id: string | null;
  token: string;
  expires_at: string;
  accepted_at: string | null;
  /** When the person declined the invite (migration 0019). */
  declined_at?: string | null;
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

/**
 * Display-only US phone format (Frantz, 2026-11-25): 2958532555 shows
 * as 295-853-2555. An 11-digit number with a leading 1 (US country
 * code) formats on its last 10 digits. Anything else renders exactly
 * as stored. Storage and validation are untouched — format at render.
 */
export function formatPhone(phone: string | null | undefined): string {
  if (!phone) return "";
  const digits = phone.replace(/\D/g, "");
  // 11 digits: keep every digit — leading digit separated, then the
  // usual 3-3-4 grouping ("7 786-985-8449"). Display only; the stored
  // value never changes.
  if (digits.length === 11) {
    return `${digits.slice(0, 1)} ${digits.slice(1, 4)}-${digits.slice(4, 7)}-${digits.slice(7)}`;
  }
  if (digits.length !== 10) return phone;
  return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`;
}

export function formatPrice(priceCents: number | null): string {
  if (priceCents === null) return "Price confirmed with the business";
  if (priceCents === 0) return "Free";
  return `$${(priceCents / 100).toFixed(priceCents % 100 === 0 ? 0 : 2)}`;
}

/** How a service's price is displayed (migration 0014). */
export type PriceType = "none" | "exact" | "from" | "free";

function money(cents: number): string {
  return `$${(cents / 100).toFixed(cents % 100 === 0 ? 0 : 2)}`;
}

/**
 * The customer-facing price words for a service, per the business
 * page plan (Frantz, 2026-11-26): an exact price ("$250"), a starting
 * price ("from $350"), "Free", or NOTHING when no price is set —
 * there is deliberately no "price confirmed with the business"
 * fallback anymore. When price_type is absent (rows from before
 * migration 0014, demo data), the same answer is derived from
 * price_cents: null = nothing, 0 = "Free", otherwise the exact price.
 */
export function formatServicePrice(s: {
  price_cents: number | null;
  price_type?: PriceType | null;
}): string {
  const type =
    s.price_type ??
    (s.price_cents === null ? "none" : s.price_cents === 0 ? "free" : "exact");
  switch (type) {
    case "free":
      return "Free";
    case "from":
      return s.price_cents ? `from ${money(s.price_cents)}` : "";
    case "exact":
      return s.price_cents !== null ? money(s.price_cents) : "";
    default:
      return "";
  }
}

export function slugify(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}
