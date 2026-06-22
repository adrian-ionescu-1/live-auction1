// Public contact form (visitors): name, email, optional Discord, a topic, and a
// message. Submits to /api/contact which emails the owner via Resend.

"use client";

import { useState } from "react";
import { CONTACT_TOPICS } from "@/lib/contactOptions";
import { sendContact } from "@/lib/contactClient";

const inputClass =
  "w-full min-w-0 rounded-xl bg-black/30 px-4 py-3 text-zinc-100 ring-1 ring-white/10 focus:outline-none focus:ring-2 focus:ring-emerald-400/40";
const selectClass =
  "w-full min-w-0 rounded-xl bg-zinc-900 px-3 py-3 text-sm text-zinc-100 ring-1 ring-white/10 focus:outline-none focus:ring-2 focus:ring-emerald-400/40";

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <label className="block min-w-0">
      <span className="block text-sm font-semibold text-zinc-300">
        {label} {required && <span className="text-red-300">*</span>}
      </span>
      <div className="mt-1.5">{children}</div>
    </label>
  );
}

export default function VisitorContactForm() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [discord, setDiscord] = useState("");
  const [topic, setTopic] = useState<string>(CONTACT_TOPICS[0].value);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  const canSubmit =
    name.trim() && /\S+@\S+\.\S+/.test(email) && message.trim() && !busy;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    setBusy(true);
    setError(null);
    const res = await sendContact({
      kind: "visitor",
      name: name.trim(),
      email: email.trim(),
      discord: discord.trim() || undefined,
      topic,
      message: message.trim(),
    });
    setBusy(false);
    if (res.success) setSent(true);
    else setError(res.error);
  };

  if (sent) {
    return (
      <div className="rounded-3xl bg-emerald-500/10 p-8 text-center ring-1 ring-emerald-400/25">
        <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-emerald-500/20 text-2xl ring-1 ring-emerald-400/30">
          ✓
        </span>
        <h3 className="mt-4 text-lg font-extrabold text-zinc-100">Message sent</h3>
        <p className="mt-1 text-sm text-zinc-400">
          Thanks for reaching out — I&apos;ll get back to you by email. For a faster reply, ping me
          on Discord.
        </p>
        <button
          type="button"
          onClick={() => {
            setSent(false);
            setName("");
            setEmail("");
            setDiscord("");
            setTopic(CONTACT_TOPICS[0].value);
            setMessage("");
          }}
          className="mt-5 rounded-2xl bg-white/5 px-5 py-2.5 text-sm font-bold text-zinc-200 ring-1 ring-white/10 transition hover:bg-white/10"
        >
          Send another
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-4 rounded-3xl bg-white/5 p-5 ring-1 ring-white/10 sm:p-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Name" required>
          <input className={inputClass} value={name} onChange={(e) => setName(e.target.value)} maxLength={120} placeholder="Your name" />
        </Field>
        <Field label="Email" required>
          <input className={inputClass} type="email" value={email} onChange={(e) => setEmail(e.target.value)} maxLength={200} placeholder="you@example.com" inputMode="email" />
        </Field>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Discord (optional)">
          <input className={inputClass} value={discord} onChange={(e) => setDiscord(e.target.value)} maxLength={120} placeholder="your_handle" />
        </Field>
        <Field label="I'd like to talk about" required>
          <select className={selectClass} value={topic} onChange={(e) => setTopic(e.target.value)}>
            {CONTACT_TOPICS.map((t) => (
              <option key={t.value} value={t.value} className="bg-zinc-900">
                {t.label}
              </option>
            ))}
          </select>
        </Field>
      </div>

      <Field label="Message" required>
        <textarea className={`${inputClass} min-h-[8rem] resize-y`} value={message} onChange={(e) => setMessage(e.target.value)} maxLength={5000} placeholder="Tell me what you have in mind…" />
      </Field>

      {error && <p className="text-sm font-semibold text-red-200">{error}</p>}

      <button
        type="submit"
        disabled={!canSubmit}
        className="w-full rounded-2xl bg-emerald-500/20 px-6 py-3.5 text-sm font-bold text-emerald-100 ring-1 ring-emerald-400/30 transition hover:bg-emerald-500/30 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
      >
        {busy ? "Sending…" : "Send message"}
      </button>
    </form>
  );
}
