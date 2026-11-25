import type { MetadataRoute } from "next";

const BASE = "https://www.appointease.io";

// Public pages only — booking pages (/<slug>) are per-business and
// discovered through /explore, so they are not listed here.
export default function sitemap(): MetadataRoute.Sitemap {
  const paths = ["", "/explore", "/about", "/terms", "/privacy", "/contact", "/login", "/signup"];
  return paths.map((path) => ({
    url: `${BASE}${path === "" ? "/" : path}`,
  }));
}
