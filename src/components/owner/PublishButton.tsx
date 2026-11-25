"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createBrowserSupabase } from "@/lib/supabase-browser";

// The publish gate reads the SAVED state, straight from the database.
// Publishing needs ONE thing (Frantz, 2026-11-25): opening hours — at
// least one availability row for this business (any staff_id,
// including the business-wide null rows). Services are NOT required
// to publish; a page with no services yet simply says it is not taking
// bookings yet. The count is re-checked when the card appears and
// whenever the owner comes back to this tab, so the button lights up
// as soon as the hours are saved — no page reload needed. (Before
// this, the gate only saw the values the page first loaded with, so
// an owner who saved hours in the same visit was told they were still
// missing.) The words under the button name only what is missing.
export default function PublishButton({
  businessId,
  published,
  initialMissing,
}: {
  businessId: string;
  published: boolean;
  initialMissing: string[];
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [missing, setMissing] = useState<string[]>(initialMissing);

  const recheck = useCallback(async () => {
    const supabase = createBrowserSupabase();
    const { count: hoursCount } = await supabase
      .from("availability")
      .select("id", { count: "exact", head: true })
      .eq("business_id", businessId);
    setMissing((hoursCount ?? 0) < 1 ? ["opening hours"] : []);
  }, [businessId]);

  useEffect(() => {
    void recheck();
    const onFocus = () => void recheck();
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [recheck]);

  async function toggle() {
    setBusy(true);
    const supabase = createBrowserSupabase();
    await supabase.from("businesses").update({ published: !published }).eq("id", businessId);
    setBusy(false);
    router.refresh();
  }

  if (published) {
    return (
      <div>
        <p className="success">Your booking page is live — customers can book right now.</p>
        <button className="btn" onClick={toggle} disabled={busy}>
          Unpublish page
        </button>
      </div>
    );
  }
  const ready = missing.length === 0;
  return (
    <div>
      <button className="btn btn-primary btn-block" onClick={toggle} disabled={busy || !ready}>
        {busy ? "Publishing…" : "Publish booking page"}
      </button>
      {!ready && (
        <p className="small" style={{ marginTop: 8 }}>
          You still need: {missing.join(" and ")}.
        </p>
      )}
    </div>
  );
}
