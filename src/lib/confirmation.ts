// Booking confirmation numbers (owner requirement, Frantz 2026-11-24).
// Every appointment gets a short, human-friendly code a customer can read
// over the phone: "AE-" + 6 characters from an unambiguous alphabet
// (no 0/O, 1/I/L). Uniqueness is guaranteed by the unique constraint on
// appointments.confirmation_code (migration 0005): callers retry on a
// 23505 collision. A SQL twin of this generator lives in the migration as
// the column default / backfill.

const ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789"; // 31 chars, unambiguous

export function generateConfirmationCode(): string {
  let out = "";
  for (let i = 0; i < 6; i++) {
    out += ALPHABET[Math.floor(Math.random() * ALPHABET.length)];
  }
  return `AE-${out}`;
}
