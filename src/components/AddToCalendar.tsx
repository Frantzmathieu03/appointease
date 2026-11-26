"use client";

import { useState } from "react";

// "Add to my calendar" for the customer's next-appointment card
// (Customer Side Plan, Frantz 2026-11-26): one button that opens the
// three calendar choices — Google (web), Apple (ICS download),
// Outlook (web). Links are built by the server page from the real
// appointment, so this component only toggles.
export default function AddToCalendar({
  googleUrl,
  icsHref,
  outlookUrl,
  dark = false,
}: {
  googleUrl: string;
  icsHref: string;
  outlookUrl: string;
  /** Rendered on the dark green next-appointment card. */
  dark?: boolean;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        className={dark ? "btn c3-btn-ghostw" : "btn"}
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
      >
        Add to my calendar
      </button>
      {open && (
        <div
          style={{
            display: "flex",
            gap: 8,
            flexWrap: "wrap",
            marginTop: 10,
            justifyContent: "center",
          }}
        >
          <a className="btn" href={googleUrl} target="_blank" rel="noreferrer">
            Google
          </a>
          <a className="btn" href={icsHref} download="appointment.ics">
            Apple
          </a>
          <a className="btn" href={outlookUrl} target="_blank" rel="noreferrer">
            Outlook
          </a>
        </div>
      )}
    </>
  );
}
