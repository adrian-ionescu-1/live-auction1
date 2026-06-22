// POST /api/contact — send a contact message to the site owner via Resend.
//
// Two shapes:
//   * visitor — public page: name, email, optional discord, topic, message
//   * member  — signed-in dashboard: in-game name, game, email, reason, message
//
// Setup (see .env.example):
//   RESEND_API_KEY  — required; from your Resend dashboard.
//   CONTACT_TO      — optional; defaults to theadrianone.dev@gmail.com.
//   CONTACT_FROM    — optional; defaults to "Auction App <onboarding@resend.dev>".
//
// We call the Resend HTTP API directly (no extra dependency) and set reply_to to
// the submitter so the owner can reply straight from their inbox. Validation is
// done by hand to match the other /api routes (no zod).

import { NextResponse } from "next/server";
import {
  GAME_VALUES,
  REASON_VALUES,
  TOPIC_VALUES,
  labelFor,
  CONTACT_TOPICS,
  CONTACT_GAMES,
  CONTACT_REASONS,
} from "@/lib/contactOptions";

export const runtime = "nodejs";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function str(v: unknown, max: number): string | null {
  if (typeof v !== "string") return null;
  const t = v.trim();
  if (t.length === 0 || t.length > max) return null;
  return t;
}

// Minimal HTML escaping so user input can't inject markup into the email body.
function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function row(label: string, value: string): string {
  return `<tr>
    <td style="padding:6px 12px;color:#71717a;font-size:13px;white-space:nowrap;vertical-align:top">${esc(label)}</td>
    <td style="padding:6px 12px;color:#18181b;font-size:14px;font-weight:600">${esc(value)}</td>
  </tr>`;
}

export async function POST(request: Request) {
  const apiKey = process.env.RESEND_API_KEY;
  const to = process.env.CONTACT_TO || "theadrianone.dev@gmail.com";
  const from = process.env.CONTACT_FROM || "Auction App <onboarding@resend.dev>";

  if (!apiKey) {
    return NextResponse.json(
      { error: "Email isn't configured yet (missing RESEND_API_KEY)." },
      { status: 503 }
    );
  }

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const name = str(body.name, 120);
  const email = str(body.email, 200);
  const message = str(body.message, 5000);
  const invalid = NextResponse.json(
    { error: "Please fill in all required fields correctly." },
    { status: 400 }
  );
  if (!name || !email || !message || !EMAIL_RE.test(email)) return invalid;

  let subject: string;
  let rows: string;

  if (body.kind === "visitor") {
    const topic = typeof body.topic === "string" ? body.topic : "";
    if (!(TOPIC_VALUES as readonly string[]).includes(topic)) return invalid;
    const discord = str(body.discord, 120); // optional
    const topicLabel = labelFor(CONTACT_TOPICS, topic);
    subject = `Contact (visitor): ${topicLabel} — ${name}`;
    rows =
      row("From", name) +
      row("Email", email) +
      (discord ? row("Discord", discord) : "") +
      row("Topic", topicLabel);
  } else if (body.kind === "member") {
    const game = typeof body.game === "string" ? body.game : "";
    const reason = typeof body.reason === "string" ? body.reason : "";
    if (
      !(GAME_VALUES as readonly string[]).includes(game) ||
      !(REASON_VALUES as readonly string[]).includes(reason)
    )
      return invalid;
    const gameLabel = labelFor(CONTACT_GAMES, game);
    const reasonLabel = labelFor(CONTACT_REASONS, reason);
    subject = `Contact (member): ${reasonLabel} — ${name}`;
    rows =
      row("In-game name", name) +
      row("Game", gameLabel) +
      row("Email", email) +
      row("Reason", reasonLabel);
  } else {
    return invalid;
  }

  const html = `<div style="font-family:ui-sans-serif,system-ui,Arial,sans-serif;max-width:560px;margin:0 auto">
    <h2 style="color:#18181b;font-size:18px;margin:0 0 12px">New contact message</h2>
    <table style="border-collapse:collapse;background:#fafafa;border:1px solid #e4e4e7;border-radius:8px;width:100%">${rows}</table>
    <p style="color:#71717a;font-size:13px;margin:16px 0 4px">Message</p>
    <div style="white-space:pre-wrap;color:#18181b;font-size:14px;line-height:1.6;background:#fafafa;border:1px solid #e4e4e7;border-radius:8px;padding:12px">${esc(
      message
    )}</div>
  </div>`;

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ from, to: [to], reply_to: email, subject, html }),
    });

    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      console.error("Resend error:", res.status, detail);
      return NextResponse.json(
        { error: "Could not send your message. Please try again or reach out on Discord." },
        { status: 502 }
      );
    }
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Contact send failed:", err);
    return NextResponse.json({ error: "Could not send your message." }, { status: 502 });
  }
}
