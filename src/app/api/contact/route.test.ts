import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { POST } from "./route";

function req(body: unknown): Request {
  return new Request("http://localhost/api/contact", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/contact", () => {
  const OLD = process.env.RESEND_API_KEY;
  afterEach(() => {
    process.env.RESEND_API_KEY = OLD;
    vi.unstubAllGlobals();
  });

  it("returns 503 when Resend isn't configured", async () => {
    delete process.env.RESEND_API_KEY;
    const res = await POST(req({ kind: "visitor", name: "A", email: "a@b.co", topic: "auctions", message: "hi" }));
    expect(res.status).toBe(503);
  });

  describe("with an API key", () => {
    beforeEach(() => {
      process.env.RESEND_API_KEY = "test-key";
      vi.stubGlobal(
        "fetch",
        vi.fn(async () => new Response(JSON.stringify({ id: "email_1" }), { status: 200 }))
      );
    });

    it("rejects an invalid payload with 400", async () => {
      const res = await POST(req({ kind: "visitor", name: "", email: "nope", topic: "auctions", message: "" }));
      expect(res.status).toBe(400);
      expect(fetch).not.toHaveBeenCalled();
    });

    it("rejects an unknown topic with 400", async () => {
      const res = await POST(
        req({ kind: "visitor", name: "A", email: "a@b.co", topic: "weird", message: "hi" })
      );
      expect(res.status).toBe(400);
    });

    it("sends a visitor message and sets reply_to to the submitter", async () => {
      const res = await POST(
        req({ kind: "visitor", name: "Ada", email: "ada@x.co", topic: "tournaments", message: "Let's talk" })
      );
      expect(res.status).toBe(200);
      await expect(res.json()).resolves.toMatchObject({ success: true });

      expect(fetch).toHaveBeenCalledOnce();
      const [url, init] = (fetch as unknown as ReturnType<typeof vi.fn>).mock.calls[0];
      expect(url).toBe("https://api.resend.com/emails");
      const sent = JSON.parse((init as RequestInit).body as string);
      expect(sent.reply_to).toBe("ada@x.co");
      expect(sent.subject).toContain("Tournaments");
    });

    it("validates the member shape too", async () => {
      const res = await POST(
        req({ kind: "member", name: "Ada", game: "wotblitz", email: "ada@x.co", reason: "bug", message: "broken" })
      );
      // 'bug' isn't a valid reason value ('error' is), so expect 400.
      expect(res.status).toBe(400);
    });
  });
});
