import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import TeamLabel from "./TeamLabel";

describe("TeamLabel", () => {
  it("shows the team name", () => {
    render(<TeamLabel team={{ name: "Alpha", country: "ro", eliminated: false }} />);
    expect(screen.getByText("Alpha")).toBeInTheDocument();
  });

  it("renders a flag image for a known country", () => {
    const { container } = render(
      <TeamLabel team={{ name: "Alpha", country: "ro", eliminated: false }} />
    );
    const img = container.querySelector("img");
    expect(img).not.toBeNull();
    expect(img?.getAttribute("src")).toContain("twemoji");
  });

  it("falls back to a neutral flag when the country is unknown", () => {
    const { container } = render(
      <TeamLabel team={{ name: "Alpha", country: null, eliminated: false }} />
    );
    expect(container.querySelector("img")).toBeNull();
    expect(screen.getByText("🏳️")).toBeInTheDocument();
  });

  it("strikes through an eliminated team when muted", () => {
    render(<TeamLabel team={{ name: "Out", country: null, eliminated: true }} muted />);
    expect(screen.getByText("Out").className).toContain("line-through");
  });
});
