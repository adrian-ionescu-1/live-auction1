import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import SymbolPicker from "./SymbolPicker";
import { TEAM_SYMBOLS } from "@/lib/teamSymbols";

describe("SymbolPicker", () => {
  it("calls onChange with the picked symbol", () => {
    const onChange = vi.fn();
    render(<SymbolPicker value={null} onChange={onChange} />);
    fireEvent.click(screen.getByRole("button", { name: TEAM_SYMBOLS[0] }));
    expect(onChange).toHaveBeenCalledWith(TEAM_SYMBOLS[0]);
  });

  it("shows a Clear action only when a symbol is selected", () => {
    const onChange = vi.fn();
    const { rerender } = render(<SymbolPicker value={null} onChange={onChange} />);
    expect(screen.queryByRole("button", { name: "Clear" })).toBeNull();

    rerender(<SymbolPicker value={TEAM_SYMBOLS[1]} onChange={onChange} />);
    fireEvent.click(screen.getByRole("button", { name: "Clear" }));
    expect(onChange).toHaveBeenCalledWith(null);
  });
});
