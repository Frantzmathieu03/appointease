"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

/** Accept button for /invite/[token] — posts to the accept API route. */
export default function InviteAccept({ token }: { token: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function accept() {
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/invite/accept", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Could not accept the invite.");
        setBusy(false);
        return;
      }
      router.push("/owner/dashboard");
      router.refresh();
    } catch {
      setError("Could not accept the invite.");
      setBusy(false);
    }
  }

  return (
    <div>
      {error && <div className="error">{error}</div>}
      <button className="btn btn-primary btn-block" onClick={accept} disabled={busy}>
        {busy ? "Joining…" : "Accept invite"}
      </button>
    </div>
  );
}
