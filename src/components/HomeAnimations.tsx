"use client";

import { useEffect } from "react";

/**
 * Homepage motion — scroll-reveal for [data-reveal] sections and the
 * sequential light-up for the [data-journey] step strip.
 *
 * Progressive enhancement only: content is fully visible with JS off.
 * The `home-anim` class is added to <html> by this effect, and the CSS
 * hides [data-reveal] / dims journey steps ONLY under that class — so
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

    return () => {
      revealIO.disconnect();
      journeyIO.disconnect();
    };
  }, []);

  return null;
}
