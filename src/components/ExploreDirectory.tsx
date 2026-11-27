"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { CATEGORIES, categoryBySlug } from "@/lib/categories";
import type { DirectoryBusiness } from "@/lib/data";

/**
 * Client-side filtering over the server-fetched directory: category pills
 * (synced to ?category=), a city/ZIP input (matches the address line),
 * and a name search. On mobile the filters hide behind a toggle.
 */
export default function ExploreDirectory({
  businesses,
  initialCategory,
  initialQuery = "",
  initialPlace = "",
}: {
  businesses: DirectoryBusiness[];
  initialCategory: string;
  initialQuery?: string;
  initialPlace?: string;
}) {
  const [category, setCategory] = useState(initialCategory);
  const [place, setPlace] = useState(initialPlace);
  const [query, setQuery] = useState(initialQuery);
  const [filtersOpen, setFiltersOpen] = useState(false);

  function pickCategory(slug: string) {
    setCategory(slug);
    const url = new URL(window.location.href);
    if (slug === "all") url.searchParams.delete("category");
    else url.searchParams.set("category", slug);
    window.history.replaceState(null, "", url.toString());
  }

  const filtered = useMemo(
    () =>
      businesses.filter((b) => {
        if (category !== "all" && b.category !== category) return false;
        if (place && !(b.address ?? "").toLowerCase().includes(place.trim().toLowerCase()))
          return false;
        if (query && !b.name.toLowerCase().includes(query.trim().toLowerCase()))
          return false;
        return true;
      }),
    [businesses, category, place, query]
  );

  return (
    <div>
      <button
        type="button"
        className="btn filters-toggle"
        aria-expanded={filtersOpen}
        onClick={() => setFiltersOpen(!filtersOpen)}
      >
        Filters {filtersOpen ? "▲" : "▼"}
      </button>

      <div className={`explore-filters${filtersOpen ? " open" : ""}`}>
        <div className="pill-row" role="group" aria-label="Filter by category">
          <button
            type="button"
            className={`filter-pill${category === "all" ? " active" : ""}`}
            onClick={() => pickCategory("all")}
          >
            All
          </button>
          {CATEGORIES.map((c) => (
            <button
              key={c.slug}
              type="button"
              className={`filter-pill${category === c.slug ? " active" : ""}`}
              onClick={() => pickCategory(c.slug)}
            >
              {c.label}
            </button>
          ))}
        </div>
        <div className="filter-inputs">
          <input
            type="text"
            placeholder="City or ZIP"
            value={place}
            onChange={(e) => setPlace(e.target.value)}
            aria-label="Filter by city or ZIP"
          />
          <input
            type="text"
            placeholder="Search by name"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label="Search by business name"
          />
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="explore-empty">
          <p>No businesses listed here yet — new shops are joining.</p>
          <Link href="/owner/signup" className="btn btn-primary">
            List your business
          </Link>
        </div>
      ) : (
        <div className="biz-grid">
          {filtered.map((b) => {
            const cat = categoryBySlug(b.category);
            const img = b.photoUrl ?? b.logo_url ?? cat.image ?? "/images/reception.jpg";
            return (
              <div className="biz-card" key={b.id}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={img} alt="" />
                <div className="biz-card-body">
                  <h3>{b.name}</h3>
                  <p className="biz-meta">
                    <span className="chip">{cat.label}</span>
                  </p>
                  {b.address && <p className="biz-addr">{b.address}</p>}
                  <Link href={`/${b.slug}`} className="btn btn-primary btn-block">
                    View &amp; book
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
