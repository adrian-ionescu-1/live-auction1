// Client helper to POST a contact message to /api/contact. Returns a normalized
// result so the forms can show a success or error state without duplicating fetch
// logic.

export type ContactPayload =
  | {
      kind: "visitor";
      name: string;
      email: string;
      discord?: string;
      topic: string;
      message: string;
    }
  | {
      kind: "member";
      name: string;
      game: string;
      email: string;
      reason: string;
      message: string;
    };

export async function sendContact(
  payload: ContactPayload
): Promise<{ success: boolean; error: string | null }> {
  try {
    const res = await fetch("/api/contact", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = (await res.json().catch(() => ({}))) as { success?: boolean; error?: string };
    if (!res.ok || !data.success) {
      return { success: false, error: data.error ?? "Could not send your message." };
    }
    return { success: true, error: null };
  } catch {
    return { success: false, error: "Network error. Please try again." };
  }
}
