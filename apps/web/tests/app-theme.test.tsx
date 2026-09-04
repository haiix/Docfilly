import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { renderApp, setupAppTests } from "./app-test-utils";

setupAppTests();

function mockColorScheme(initialMatches: boolean) {
  let matches = initialMatches;
  const listeners = new Set<() => void>();
  vi.stubGlobal("matchMedia", () => ({
    get matches() {
      return matches;
    },
    media: "(prefers-color-scheme: dark)",
    onchange: null,
    addEventListener: (_type: string, listener: () => void) => listeners.add(listener),
    removeEventListener: (_type: string, listener: () => void) => listeners.delete(listener),
    addListener: () => undefined,
    removeListener: () => undefined,
    dispatchEvent: () => true,
  }));
  return (nextMatches: boolean): void => {
    matches = nextMatches;
    listeners.forEach((listener) => listener());
  };
}

describe("App theme", () => {
  it("follows system changes and updates browser theme metadata", async () => {
    const changeColorScheme = mockColorScheme(false);
    const meta = document.createElement("meta");
    meta.name = "theme-color";
    document.head.append(meta);
    renderApp();

    expect(document.documentElement.dataset.theme).toBe("light");
    expect(document.documentElement.style.colorScheme).toBe("light");
    expect(meta.content).toBe("#f3f5f8");

    changeColorScheme(true);
    await waitFor(() => expect(document.documentElement.dataset.theme).toBe("dark"));
    expect(meta.content).toBe("#111827");
    meta.remove();
  });

  it("persists an explicit theme and ignores later system changes", async () => {
    const user = userEvent.setup();
    const changeColorScheme = mockColorScheme(true);
    const firstRender = renderApp();
    await user.click(screen.getAllByRole("button", { name: "設定" })[0]);
    await user.selectOptions(screen.getByLabelText("テーマ"), "light");

    expect(document.documentElement.dataset.theme).toBe("light");
    expect(JSON.parse(localStorage.getItem("docfilly-web-preferences")!)).toMatchObject({
      theme: "light",
    });
    changeColorScheme(false);
    changeColorScheme(true);
    expect(document.documentElement.dataset.theme).toBe("light");
    firstRender.unmount();

    renderApp();
    expect(document.documentElement.dataset.theme).toBe("light");
    await user.click(screen.getAllByRole("button", { name: "設定" })[0]);
    expect(screen.getByLabelText<HTMLSelectElement>("テーマ").value).toBe("light");
  });
});
