"use client";

import { useEffect, useState } from "react";

/**
 * Tappable business address (PDF §7): tapping opens a small sheet with
 * Google Maps / Apple Maps / Waze deep links plus Copy address.
 * Apple Maps is listed first on iOS, Google Maps first everywhere else.
 */
export default function AddressDirections({
  address,
  variant = "link",
}: {
  address: string;
  /**
   * "link" (default): the address itself is the underlined trigger —
   * the original inline use. "action": the trigger is a small quiet
   * "Get directions" button and the parent renders the address as
   * plain text (the business page's contact card — no underlined
   * link look, Frantz 2026-11-25). "square": the trigger is the
   * full Directions square of the rebuilt business page (Frantz's
   * page plan, 2026-11-26) — icon above the word "Directions",
   * filling its grid cell; the menu opens right-aligned so it stays
   * on screen.
   */
  variant?: "link" | "action" | "square";
}) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [appleFirst, setAppleFirst] = useState(false);

  useEffect(() => {
    const ua = window.navigator.userAgent;
    setAppleFirst(/iPhone|iPad|iPod/i.test(ua));
  }, []);

  const q = encodeURIComponent(address);
  const maps = [
    { label: "Google Maps", href: `https://www.google.com/maps/search/?api=1&query=${q}` },
    { label: "Apple Maps", href: `https://maps.apple.com/?q=${q}` },
  ];
  if (appleFirst) maps.reverse();
  const options = [
    ...maps,
    { label: "Waze", href: `https://waze.com/ul?q=${q}&navigate=yes` },
  ];

  async function copy() {
    try {
      await navigator.clipboard.writeText(address);
      setCopied(true);
      window.setTimeout(() => {
        setOpen(false);
        setCopied(false);
      }, 900);
    } catch {
      setOpen(false);
    }
  }

  const rowStyle: React.CSSProperties = {
    display: "block",
    width: "100%",
    textAlign: "left",
    padding: "10px 12px",
    borderRadius: 10,
    fontWeight: 600,
    color: "var(--ink)",
    textDecoration: "none",
    background: "transparent",
    border: "none",
    fontSize: 15,
    cursor: "pointer",
  };

  if (variant === "square") {
    return (
      <span style={{ position: "relative", display: "block", height: "100%" }}>
        <button
          type="button"
          className="bp-square"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M12 21s-7-5.6-7-11a7 7 0 1 1 14 0c0 5.4-7 11-7 11z" />
            <circle cx="12" cy="10" r="2.6" />
          </svg>
          Directions
        </button>
        {open && (
          <>
            <span
              onClick={() => setOpen(false)}
              style={{ position: "fixed", inset: 0, zIndex: 40, background: "transparent" }}
            />
            <span
              role="menu"
              style={{
                position: "absolute",
                top: "calc(100% + 6px)",
                right: 0,
                zIndex: 41,
                display: "flex",
                flexDirection: "column",
                gap: 2,
                minWidth: 220,
                padding: 8,
                background: "#fff",
                borderRadius: 14,
                boxShadow: "0 14px 34px rgba(20, 60, 35, 0.20)",
                textAlign: "left",
              }}
            >
              <span className="small" style={{ padding: "4px 12px 6px" }}>
                Open address in…
              </span>
              {options.map((o) => (
                <a
                  key={o.label}
                  href={o.href}
                  target="_blank"
                  rel="noreferrer"
                  style={rowStyle}
                  onClick={() => setOpen(false)}
                >
                  {o.label}
                </a>
              ))}
              <button type="button" style={rowStyle} onClick={copy}>
                {copied ? "Copied ✓" : "Copy address"}
              </button>
            </span>
          </>
        )}
      </span>
    );
  }

  return (
    <span style={{ position: "relative", display: "inline-block" }}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        style={
          variant === "action"
            ? {
                background: "none",
                border: "none",
                padding: 0,
                font: "inherit",
                fontSize: 14,
                fontWeight: 600,
                color: "var(--green)",
                textDecoration: "none",
                cursor: "pointer",
                whiteSpace: "nowrap",
              }
            : {
                background: "none",
                border: "none",
                padding: 0,
                font: "inherit",
                color: "var(--green)",
                textDecoration: "underline",
                cursor: "pointer",
              }
        }
      >
        {variant === "action" ? "Get directions" : address}
      </button>
      {open && (
        <>
          <span
            onClick={() => setOpen(false)}
            style={{ position: "fixed", inset: 0, zIndex: 40, background: "transparent" }}
          />
          <span
            role="menu"
            style={{
              position: "absolute",
              top: "calc(100% + 6px)",
              left: 0,
              zIndex: 41,
              display: "flex",
              flexDirection: "column",
              gap: 2,
              minWidth: 220,
              padding: 8,
              background: "#fff",
              borderRadius: 14,
              boxShadow: "0 14px 34px rgba(20, 60, 35, 0.20)",
            }}
          >
            <span className="small" style={{ padding: "4px 12px 6px" }}>
              Open address in…
            </span>
            {options.map((o) => (
              <a
                key={o.label}
                href={o.href}
                target="_blank"
                rel="noreferrer"
                style={rowStyle}
                onClick={() => setOpen(false)}
              >
                {o.label}
              </a>
            ))}
            <button type="button" style={rowStyle} onClick={copy}>
              {copied ? "Copied ✓" : "Copy address"}
            </button>
          </span>
        </>
      )}
    </span>
  );
}
