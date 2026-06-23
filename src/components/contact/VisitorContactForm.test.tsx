import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import VisitorContactForm from "./VisitorContactForm";

describe("VisitorContactForm", () => {
  beforeEach(() => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(JSON.stringify({ success: true }), { status: 200 }))
    );
  });
  afterEach(() => vi.unstubAllGlobals());

  it("keeps submit disabled until the required fields are valid", () => {
    render(<VisitorContactForm />);
    const submit = screen.getByRole("button", { name: /send message/i });
    expect(submit).toBeDisabled();

    fireEvent.change(screen.getByPlaceholderText("Your name"), { target: { value: "Ada" } });
    fireEvent.change(screen.getByPlaceholderText("you@example.com"), {
      target: { value: "ada@example.com" },
    });
    fireEvent.change(screen.getByPlaceholderText(/what you have in mind/i), {
      target: { value: "Hello there" },
    });
    expect(submit).toBeEnabled();
  });

  it("posts to /api/contact and shows a success state", async () => {
    render(<VisitorContactForm />);
    fireEvent.change(screen.getByPlaceholderText("Your name"), { target: { value: "Ada" } });
    fireEvent.change(screen.getByPlaceholderText("you@example.com"), {
      target: { value: "ada@example.com" },
    });
    fireEvent.change(screen.getByPlaceholderText(/what you have in mind/i), {
      target: { value: "Hello there" },
    });
    fireEvent.click(screen.getByRole("button", { name: /send message/i }));

    await waitFor(() => expect(screen.getByText(/message sent/i)).toBeInTheDocument());

    expect(fetch).toHaveBeenCalledOnce();
    const [url, init] = (fetch as unknown as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(url).toBe("/api/contact");
    const body = JSON.parse((init as RequestInit).body as string);
    expect(body).toMatchObject({ kind: "visitor", name: "Ada", email: "ada@example.com" });
  });
});
