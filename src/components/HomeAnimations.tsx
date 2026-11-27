"use client";

import { useEffect } from "react";

/**
 * Homepage motion: scroll-reveal for [data-reveal] sections and the
 * sequential light-up for the [data-journey] step strip.
 *
 * Progressive enhancement only: content is fully visible with JS off.
 * The `home-anim` class is added to <html> by this effect, and the CSS
 * hides [data-reveal] / dims journey steps ONLY under that class: so
 * nothing is ever hidden before (or without) this code running.
 * prefers-reduced-motion is honored in CSS (everything static/visible)
 * and here (classes applied immediately, no observation needed).
 */
export default function HomeAnimations() {
  useEffect(() => {
    const root = document.documentElement;
    root.classList.add("home-anim");

    const revealEls = Array.from(document.querySelectorAll("[data-reveal]"));
    const journeyEls = Array.from(document.querySelectorAll("[data-journey]"));
    const showAll = () => {
      revealEls.forEach((el) => el.classList.add("in"));
      journeyEls.forEach((el) => el.classList.add("lit"));
    };

    if (
      !("IntersectionObserver" in window) ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      showAll();
      return;
    }

    const revealIO = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            entry.target.classList.add("in");
            revealIO.unobserve(entry.target);
          }
        }
      },
      { threshold: 0.1, rootMargin: "0px 0px -40px 0px" }
    );
    revealEls.forEach((el) => revealIO.observe(el));

    const journeyIO = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            entry.target.classList.add("lit");
            journeyIO.unobserve(entry.target);
          }
        }
      },
      { threshold: 0.3 }
    );
    journeyEls.forEach((el) => journeyIO.observe(el));

    // Count-up stats ([data-count]): the markup already carries the
    // final value, so no-JS and reduced-motion visitors see the real
    // number; everyone else gets a gentle count when it scrolls in.
    const counters = Array.from(
      document.querySelectorAll<HTMLElement>("[data-count]")
    );
    let countIO: IntersectionObserver | null = null;
    if (counters.length > 0) {
      countIO = new IntersectionObserver(
        (entries) => {
          for (const entry of entries) {
            if (!entry.isIntersecting) continue;
            const el = entry.target as HTMLElement;
            countIO?.unobserve(el);
            const target = Number(el.dataset.count ?? "0");
            if (!Number.isFinite(target) || target <= 0) continue;
            const start = performance.now();
            const tick = (now: number) => {
              const t = Math.min(1, (now - start) / 1100);
              const eased = 1 - Math.pow(1 - t, 3);
              el.textContent = String(Math.round(target * eased));
              if (t < 1) requestAnimationFrame(tick);
            };
            requestAnimationFrame(tick);
          }
        },
        { threshold: 0.4 }
      );
      counters.forEach((el) => countIO?.observe(el));
    }

    return () => {
      revealIO.disconnect();
      journeyIO.disconnect();
      countIO?.disconnect();
    };
  }, []);

  return null;
}
