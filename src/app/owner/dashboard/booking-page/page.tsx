import { redirect } from "next/navigation";
import { requireBusiness, siteUrl } from "@/lib/owner";
import { hoursSummary } from "@/lib/data";
import { categoryLabel } from "@/lib/categories";
import BookingPageEditor from "@/components/owner/BookingPageEditor";
import type { Availability, BusinessPhoto } from "@/lib/types";

// Booking page editor: one screen for everything a customer sees —
// name, description, phone, address, logo and photos — with a live
// preview of the public page header beside the form. Same data as
// Settings (businesses row + business_photos); nothing is forked.
export default async function DashboardBookingPageEditor() {
  const { supabase, business, role } = await requireBusiness();
  if (role === "staff") redirect("/owner/dashboard");

  const [{ data: photoRows }, { data: availability }, { count: serviceCount }] = await Promise.all([
    supabase
      .from("business_photos")
      .select("*")
      .eq("business_id", business.id)
      .order("position", { ascending: true })
      .order("created_at", { ascending: true }),
    supabase.from("availability").select("*").eq("business_id", business.id),
    supabase
      .from("services")
      .select("id", { count: "exact", head: true })
      .eq("business_id", business.id)
      .eq("active", true),
  ]);
  const hours = (availability ?? []) as Availability[];

  return (
    <div>
      <h1 style={{ fontSize: 26 }}>Booking page</h1>
      <p className="small" style={{ marginTop: 0 }}>
        This is what customers see when they open your booking link. Type
        on the left — the preview on the right changes as you go.
      </p>
      <BookingPageEditor
        business={business}
        initialPhotos={(photoRows ?? []) as BusinessPhoto[]}
        hoursLabel={hoursSummary(hours)}
        categoryText={business.category ? categoryLabel(business.category) : business.type}
        bookingLink={`${siteUrl()}/${business.slug}`}
        publishReady={(serviceCount ?? 0) >= 1 && hours.length >= 1}
      />
    </div>
  );
}
