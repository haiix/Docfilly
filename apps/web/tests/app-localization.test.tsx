import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { openSample, readableFile, renderApp, setupAppTests } from "./app-test-utils";

setupAppTests();

describe("App localization", () => {
  it("switches all app-owned UI, the sample, html lang, and Core diagnostics", async () => {
    const user = userEvent.setup();
    renderApp();

    await user.click(screen.getAllByRole("button", { name: "設定" })[0]);
    await user.selectOptions(screen.getByLabelText("言語"), "en");
    expect(document.documentElement.lang).toBe("en");
    expect(screen.getByRole("heading", { name: "Open a Docfilly document" })).toBeTruthy();
    await user.keyboard("{Escape}");

    await user.click(screen.getByRole("button", { name: "Open sample" }));
    expect(await screen.findByLabelText("Project name")).toBeTruthy();
    expect(screen.getByText("docfilly-tutorial.md")).toBeTruthy();

    const source = "#!docfilly\nbroken setting\n---\nBody";
    await user.upload(screen.getByLabelText("Open file"), readableFile(source, "warning.txt"));
    await waitFor(() => expect(screen.getByRole("status").textContent).toContain("1 diagnostic"));
    await user.click(screen.getAllByRole("button", { name: "Diagnostics (1)" })[0]);
    expect(screen.getByRole("dialog", { name: "Document diagnostics (1)" }).textContent).toContain(
      "Line 2 was skipped as a setting",
    );
  });

  it("keeps an opened sample and its values unchanged when the UI locale changes", async () => {
    const user = userEvent.setup();
    renderApp();
    await openSample(user);

    const projectName = await screen.findByLabelText<HTMLInputElement>("プロジェクト名");
    await user.clear(projectName);
    await user.type(projectName, "Atlas");
    await user.click(screen.getAllByRole("button", { name: "設定" })[0]);
    await user.selectOptions(screen.getByLabelText("言語"), "en");
    await user.keyboard("{Escape}");

    expect(document.documentElement.lang).toBe("en");
    expect(screen.getByRole("navigation", { name: "Document actions" })).toBeTruthy();
    expect(screen.getByLabelText<HTMLInputElement>("プロジェクト名").value).toBe("Atlas");
    expect(screen.getByRole("heading", { name: "Atlas 5分チュートリアル" })).toBeTruthy();
    expect(screen.getByText("サンプル.md")).toBeTruthy();
    expect(screen.queryByLabelText("Project name")).toBeNull();
  });

  it("persists an explicit language and can return to the browser language", async () => {
    const user = userEvent.setup();
    const firstRender = renderApp();
    await user.click(screen.getAllByRole("button", { name: "設定" })[0]);
    await user.selectOptions(screen.getByLabelText("言語"), "en");
    firstRender.unmount();

    renderApp();
    expect(document.documentElement.lang).toBe("en");
    expect(screen.getByRole("heading", { name: "Open a Docfilly document" })).toBeTruthy();
    await user.click(screen.getAllByRole("button", { name: "Settings" })[0]);
    expect(screen.getByLabelText<HTMLSelectElement>("Language").value).toBe("en");
    await user.selectOptions(screen.getByLabelText("Language"), "browser");

    expect(document.documentElement.lang).toBe("ja");
    expect(screen.getByLabelText<HTMLSelectElement>("言語").value).toBe("browser");
  });
});
