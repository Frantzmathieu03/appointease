/**
 * Pre-built service templates per category (Frantz, 2026-11-27):
 * the services version of the form templates gallery. One tap adds
 * a common service for the business's kind of work, with a sensible
 * name and duration. The price is left for the owner to set: a
 * template never invents a price for a real business.
 */
export interface ServiceTemplate {
  name: string;
  durationMinutes: number;
}

export const SERVICE_TEMPLATES: Record<string, ServiceTemplate[]> = {
  "barbershops": [
    { name: "Classic haircut", durationMinutes: 30 },
    { name: "Skin fade", durationMinutes: 45 },
    { name: "Beard trim", durationMinutes: 20 },
    { name: "Haircut and beard trim", durationMinutes: 45 },
    { name: "Kids haircut", durationMinutes: 30 },
    { name: "Hot towel shave", durationMinutes: 30 },
  ],
  "hair-salons": [
    { name: "Haircut", durationMinutes: 60 },
    { name: "Color", durationMinutes: 120 },
    { name: "Highlights", durationMinutes: 150 },
    { name: "Blowout", durationMinutes: 45 },
    { name: "Deep conditioning treatment", durationMinutes: 30 },
    { name: "Kids haircut", durationMinutes: 30 },
  ],
  "nail-salons-spas": [
    { name: "Manicure", durationMinutes: 45 },
    { name: "Pedicure", durationMinutes: 60 },
    { name: "Gel nails", durationMinutes: 60 },
    { name: "Acrylic full set", durationMinutes: 90 },
    { name: "Facial", durationMinutes: 60 },
    { name: "Massage", durationMinutes: 60 },
  ],
  "law-offices": [
    { name: "Consultation", durationMinutes: 30 },
    { name: "Case review", durationMinutes: 60 },
    { name: "Document review", durationMinutes: 30 },
    { name: "Follow up meeting", durationMinutes: 30 },
  ],
  "dental-offices": [
    { name: "Cleaning and checkup", durationMinutes: 60 },
    { name: "New patient exam", durationMinutes: 45 },
    { name: "Whitening", durationMinutes: 45 },
    { name: "Filling", durationMinutes: 60 },
    { name: "Crown consultation", durationMinutes: 30 },
  ],
  "doctors-clinics": [
    { name: "New patient visit", durationMinutes: 30 },
    { name: "Follow up visit", durationMinutes: 15 },
    { name: "Annual physical", durationMinutes: 45 },
    { name: "Sick visit", durationMinutes: 20 },
  ],
  "pet-groomers": [
    { name: "Bath and brush", durationMinutes: 60 },
    { name: "Full groom", durationMinutes: 90 },
    { name: "Nail trim", durationMinutes: 15 },
    { name: "De shedding treatment", durationMinutes: 45 },
    { name: "Puppy groom", durationMinutes: 45 },
  ],
  "auto-repair": [
    { name: "Oil change", durationMinutes: 45 },
    { name: "Tire rotation", durationMinutes: 30 },
    { name: "Brake inspection", durationMinutes: 30 },
    { name: "Diagnostic check", durationMinutes: 60 },
    { name: "State inspection", durationMinutes: 30 },
  ],
  other: [
    { name: "Appointment", durationMinutes: 30 },
    { name: "Consultation", durationMinutes: 30 },
    { name: "Follow up appointment", durationMinutes: 30 },
  ],
};

export function serviceTemplatesFor(category: string | null | undefined): ServiceTemplate[] {
  return SERVICE_TEMPLATES[category ?? "other"] ?? SERVICE_TEMPLATES.other;
}

/**
 * Loose name comparison for the near duplicate warning: case,
 * spacing, punctuation and a trailing "s" are ignored, so
 * "Dental implant" and "Dental Implants" count as the same name.
 */
export function normalizedServiceName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9 ]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/s$/, "");
}
