"use client";

import { useState } from "react";

// Contact form — posts to /api/contact, which emails the AppointEase inbox
// via Resend with reply_to set to the submitter.
export default function ContactForm() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [topic, setTopic] = useState("Business owner");
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [error, setError] = useState("");

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("sending");
    setError("");
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, topic, message }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setError(data?.error ?? "Something went wrong — please email us directly.");
        setStatus("error");
        return;
      }
      setStatus("sent");
      setName("");
      setEmail("");
      setMessage("");
      setTopic("Business owner");
    } catch {
      setError("Something went wrong — please email us directly.");
      setStatus("error");
    }
  }

  if (status === "sent") {
    return (
      <div className="success">
        Thanks — your message is on its way. We read every message and will
        reply to the email address you gave us.
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit}>
      {status === "error" && <div className="error">{error}</div>}
      <label className="field">
        <span>Your name</span>
        <input value={name} onChange={(e) => setName(e.target.value)} required autoComplete="name" placeholder="Jane Smith" />
      </label>
      <label className="field">
        <span>Email address</span>
        <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" placeholder="you@example.com" />
      </label>
      <label className="field">
        <span>I am a…</span>
        <select value={topic} onChange={(e) => setTopic(e.target.value)}>
          <option>Business owner</option>
          <option>Customer</option>
          <option>Other</option>
        </select>
      </label>
      <label className="field">
        <span>Message</span>
        <textarea value={message} onChange={(e) => setMessage(e.target.value)} required placeholder="How can we help?" />
      </label>
      <button type="submit" className="btn btn-primary btn-block" disabled={status === "sending"}>
        {status === "sending" ? "Sending…" : "Send message"}
      </button>
    </form>
  );
}
