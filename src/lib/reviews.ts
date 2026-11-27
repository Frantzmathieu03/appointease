/**
 * Customer reviews for the homepage (Frantz, 2026-11-26).
 *
 * REAL quotes from REAL businesses only, added here with the
 * business's permission when the first pilot shops give their words.
 * The homepage reviews section renders ONLY when at least two
 * entries exist. Until then it stays hidden. Never add placeholder
 * quotes, invented names, invented star ratings, or invented
 * results: honest claims only, always.
 *
 * To turn the section on, add entries like:
 * {
 *   quote: "The words the owner actually said.",
 *   name: "Owner's name",
 *   business: "Business name",
 *   stars: 5,
 *   photo: "/images/reviews/their-photo.jpg",
 * }
 */
export interface Review {
  quote: string;
  name: string;
  business: string;
  stars: 1 | 2 | 3 | 4 | 5;
  photo: string;
}

export const REVIEWS: Review[] = [];
