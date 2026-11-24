"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createBrowserSupabase } from "@/lib/supabase-browser";

export default function PublishButton({
  businessId,
  published,
  ready,
}: {
  businessId: string;
  published: boolean;
  ready: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

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
  return (
    <div>
      <button className="btn btn-primary btn-block" onClick={toggle} disabled={busy || !ready}>
        {busy ? "Publishing…" : "Publish booking page"}
      </button>
      {!ready && (
        <p className="small" style={{ marginTop: 8 }}>
          Add at least one service and your opening hours first — then this button lights up.
        </p>
      )}
    </div>
  );
}
