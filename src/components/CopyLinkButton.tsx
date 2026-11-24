"use client";

import { useState } from "react";

export default function CopyLinkButton({ url, label = "Copy booking link" }: { url: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard unavailable (older browser) — the URL is visible next to it.
    }
  }
  return (
    <button className="btn" onClick={copy} type="button">
      {copied ? "Copied ✓" : label}
    </button>
  );
}
