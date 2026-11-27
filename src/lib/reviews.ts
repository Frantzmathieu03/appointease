/**
 * Customer reviews for the homepage, in the format Frantz picked
 * from the reference he sent (2026-11-26): a mix of VIDEO entries
 * (a real person talking to camera, a big bold quote line over the
 * video, a small name and business label under it) and TEXT entries
 * (round photo, name, business, star rating, the quote in plain
 * text).
 *
 * HOW THIS TURNS ON: each real quote becomes ONE entry in the list
 * below, and the section appears on its own once at least two
 * entries exist. Until then the homepage renders nothing for this
 * section.
 *
 * HARD RULE: real words from real businesses only, added with the
 * business's permission. Never add placeholder entries, invented
 * people, invented names, invented quotes, invented star ratings,
 * or invented results. Honest claims only, always.
 *
 * Entry shapes (the business name is OPTIONAL on both, per
 * Frantz's call on 2026-11-27: a first name alone is enough):
 * Video: { kind: "video", video: "/videos/reviews/name.mp4",
 *          poster: "/videos/reviews/name.jpg" (optional),
 *          quote: "The short bold line over the video.",
 *          name: "Person's name", business: "Business name" }
 * Text:  { kind: "text", photo: "/images/reviews/name.jpg",
 *          name: "Person's name", business: "Business name",
 *          stars: 5, quote: "The words they actually said." }
 */
export type ReviewEntry =
  | {
      kind: "video";
      video: string;
      poster?: string;
      quote: string;
      name: string;
      business?: string;
    }
  | {
      kind: "text";
      photo: string;
      name: string;
      business?: string;
      stars: 1 | 2 | 3 | 4 | 5;
      quote: string;
    };

export const REVIEWS: ReviewEntry[] = [];
