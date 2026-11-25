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
