// Marketplace categories: the single source of truth for the homepage
// category grid, the /explore directory filters, and the owner-side
// category picker (signup + settings). Slugs are stored in
// businesses.category (migration 0007).

export type CategoryIconName =
  | "scissors"
  | "comb"
  | "sparkle"
  | "scale"
  | "tooth"
  | "stethoscope"
  | "paw"
  | "wrench"
  | "star";

export interface Category {
  slug: string;
  label: string;
  /** Tile/card image under public/images; null = no tile (Other). */
  image: string | null;
  blurb: string;
  icon: CategoryIconName;
}

export const CATEGORIES: Category[] = [
  { slug: "barbershops", label: "Barbershops", image: "/images/barbershop.jpg", blurb: "Fades, cuts and beard trims, booked by the chair.", icon: "scissors" },
  { slug: "hair-salons", label: "Hair Salons", image: "/images/cat-hair-salons.jpg", blurb: "Color, cuts and styling with your favorite stylist.", icon: "comb" },
  { slug: "nail-salons-spas", label: "Nail Salons & Spas", image: "/images/nail-salon.jpg", blurb: "Manicures, pedicures and spa time, booked ahead.", icon: "sparkle" },
  { slug: "law-offices", label: "Law Offices", image: "/images/law-office.jpg", blurb: "Consultations scheduled without the phone tag.", icon: "scale" },
  { slug: "dental-offices", label: "Dental Offices", image: "/images/cat-dental.jpg", blurb: "Cleanings and checkups patients actually keep.", icon: "tooth" },
  { slug: "doctors-clinics", label: "Doctors & Clinics", image: "/images/cat-clinics.jpg", blurb: "Appointments with reminders patients can act on.", icon: "stethoscope" },
  { slug: "pet-groomers", label: "Pet Groomers", image: "/images/cat-pet.jpg", blurb: "Baths, cuts and nail trims for four-legged clients.", icon: "paw" },
  { slug: "auto-repair", label: "Auto Repair", image: "/images/cat-auto.jpg", blurb: "Service appointments that keep the bays on schedule.", icon: "wrench" },
  { slug: "other", label: "Other", image: null, blurb: "Every other appointment based business.", icon: "star" },
];

export const DEFAULT_CATEGORY = "other";

export function categoryBySlug(slug: string | null | undefined): Category {
  return CATEGORIES.find((c) => c.slug === slug) ?? CATEGORIES[CATEGORIES.length - 1];
}

export function categoryLabel(slug: string | null | undefined): string {
  return categoryBySlug(slug).label;
}

/** Categories that get a homepage tile (all except Other). */
export const TILE_CATEGORIES = CATEGORIES.filter((c) => c.image !== null);
