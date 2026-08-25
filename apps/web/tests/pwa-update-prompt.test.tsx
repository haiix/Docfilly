import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { webMessages } from "../src/locale";
import { PwaUpdateNotice } from "../src/PwaUpdatePrompt";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("PwaUpdatePrompt", () => {
  it("lets the reader defer or apply an available update", async () => {
    const user = userEvent.setup();
    const onDefer = vi.fn();
    const onUpdate = vi.fn();
    render(<PwaUpdateNotice messages={webMessages.ja} onDefer={onDefer} onUpdate={onUpdate} />);

    expect(screen.getByRole("status").textContent).toContain(
      "新しいバージョンのDocfillyを利用できます",
    );

    await user.click(screen.getByRole("button", { name: "後で" }));
    expect(onDefer).toHaveBeenCalledOnce();

    await user.click(screen.getByRole("button", { name: "再読み込みして更新" }));
    expect(onUpdate).toHaveBeenCalledOnce();
  });
});
