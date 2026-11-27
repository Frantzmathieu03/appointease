// Demo-mode fallback data: mirrors supabase/seed.sql exactly.
// Used only while NEXT_PUBLIC_SUPABASE_URL is still a placeholder, so the
// public page and booking flow can be shown before the real project exists.
import type { Availability, Business, Service, StaffMember } from "./types";
import { TRIAL_DAYS } from "./plans";

export const DEMO_BUSINESS: Business = {
  id: "22222222-2222-2222-2222-222222222222",
  owner_id: "11111111-1111-1111-1111-111111111111",
  slug: "main-street-barbers",
  name: "Main Street Barbers",
  type: "Barbershop",
  category: "barbershops",
  logo_url: null,
  description: "Walk ins welcome. Book ahead to skip the wait.",
  address: "25 Main St, Boston, MA",
  phone: "617-555-0142",
  email: "owner@mainstreetbarber.example",
  timezone: "America/New_York",
  published: true,
  trial_ends_at: new Date(Date.now() + TRIAL_DAYS * 864e5).toISOString(),
  created_at: new Date().toISOString(),
  plan: "solo",
  stripe_customer_id: null,
  stripe_subscription_id: null,
  subscription_status: null,
  subscription_current_period_end: null,
  billing_lapsed_at: null,
};

export const DEMO_SERVICES: Service[] = [
  { id: "demo-svc-1", business_id: DEMO_BUSINESS.id, name: "Classic haircut", duration_minutes: 30, price_cents: 3500, active: true },
  { id: "demo-svc-2", business_id: DEMO_BUSINESS.id, name: "Haircut & beard trim", duration_minutes: 45, price_cents: 4500, active: true },
  { id: "demo-svc-3", business_id: DEMO_BUSINESS.id, name: "Beard trim", duration_minutes: 20, price_cents: 2000, active: true },
];

export const DEMO_STAFF: StaffMember[] = [
  { id: "33333333-3333-3333-3333-333333333333", business_id: DEMO_BUSINESS.id, name: "Marcus", active: true },
];

export const DEMO_AVAILABILITY: Availability[] = [1, 2, 3, 4, 5, 6].map((weekday) => ({
  id: `demo-av-${weekday}`,
  business_id: DEMO_BUSINESS.id,
  staff_id: null,
  weekday,
  open_time: "09:00:00",
  close_time: "18:00:00",
}));
