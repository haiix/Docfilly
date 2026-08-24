import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import {
  createFileList,
  openSample,
  readableFile,
  renderApp,
  setupAppTests,
  unreadableFile,
} from "./app-test-utils";

setupAppTests();

describe("App document opening", () => {
  it("starts empty and opens the sample only when requested", async () => {
    const user = userEvent.setup();
    renderApp();

    expect(screen.getByRole("heading", { name: "Docfilly文書を開く" })).toBeTruthy();
    expect(screen.getByText("ファイル未選択")).toBeTruthy();
    expect(screen.queryByLabelText("作成者")).toBeNull();

    await openSample(user);
    expect(await screen.findByLabelText("作成者")).toBeTruthy();
  });

  it("keeps the built-in sample valid and interactive", async () => {
    const user = userEvent.setup();
    renderApp();
    await openSample(user);

    const projectName = screen.getByLabelText<HTMLInputElement>("プロジェクト名");
    const environment = screen.getByLabelText<HTMLSelectElement>("実行環境");
    const teamWork = screen.getByLabelText<HTMLInputElement>("チームで作業する");
    expect(projectName.type).toBe("text");
    expect(environment.tagName).toBe("SELECT");
    expect(teamWork.type).toBe("checkbox");
    expect(screen.queryByRole("button", { name: /診断/ })).toBeNull();

    await user.clear(projectName);
    await user.type(projectName, "Atlas");
    expect(await screen.findByRole("heading", { name: "Atlas 5分チュートリアル" })).toBeTruthy();
    await user.selectOptions(environment, "production");
    expect(await screen.findByText(/本番環境です。変更前にレビュー/)).toBeTruthy();
    expect(screen.queryByText(/ステージング環境で、本番前/)).toBeNull();
    await user.click(teamWork);
    expect(await screen.findByRole("heading", { name: "個人で作業する場合" })).toBeTruthy();
    expect(screen.queryByRole("heading", { name: "チームで作業する場合" })).toBeNull();

    const codeExamples = Array.from(
      document.querySelectorAll("pre code"),
      (code) => code.textContent,
    ).join("\n");
    expect(codeExamples).toContain("[[project_name]]");
    expect(codeExamples).toContain("[[プロジェクト名]]");
    expect(codeExamples).toContain("[[#if team_work]]");
    expect(codeExamples).toContain("[[#else]]");
    expect(screen.getByRole("link", { name: "詳細なDocfillyフォーマット仕様" })).toBeTruthy();
  });

  it("loads a selected plain-text file through the toolbar file input", async () => {
    const user = userEvent.setup();
    renderApp();
    await user.upload(screen.getByLabelText("ファイルを開く"), readableFile("Hello", "notes.txt"));

    expect(await screen.findByText("notes.txt")).toBeTruthy();
    expect(screen.getByRole("status").textContent).toContain(
      "#!docfilly識別子がないため、通常のテキストとして表示しています。",
    );
    expect(screen.getByText("Hello")).toBeTruthy();
  });

  it("lists every diagnostic separately from app notifications", async () => {
    const user = userEvent.setup();
    renderApp();
    const source = "#!docfilly\nbroken setting\nalso broken\n---\nBody";
    await user.upload(screen.getByLabelText("ファイルを開く"), readableFile(source, "warning.txt"));

    const status = await screen.findByRole("status");
    await waitFor(() => expect(status.textContent).toContain("文書に2件の診断があります"));
    expect(status.classList.contains("is-warning")).toBe(false);
    expect(status.getAttribute("title")).toBeNull();
    const overflowButton = screen.getByRole("button", { name: "その他の操作" });
    await user.click(overflowButton);
    await user.click(
      within(document.getElementById("toolbar-overflow-menu")!).getByRole("button", {
        name: "診断 2件",
      }),
    );

    const dialog = screen.getByRole("dialog", { name: "文書の診断（2件）" });
    expect(overflowButton.getAttribute("aria-expanded")).toBe("false");
    expect(dialog.textContent).toContain("2行目は「=」がないため");
    expect(dialog.textContent).toContain("3行目は「=」がないため");
    expect(dialog.textContent).toContain("broken setting");
    expect(dialog.textContent).toContain("also broken");
    expect(screen.getByText("Body")).toBeTruthy();
  });

  it("keeps the current document when multiple files are dropped", async () => {
    const user = userEvent.setup();
    renderApp();
    await openSample(user);
    const files = [readableFile("first", "first.txt"), readableFile("second", "second.txt")];
    fireEvent.drop(window, {
      dataTransfer: { dropEffect: "none", files: createFileList(files), types: ["Files"] },
    });
    expect(screen.getByText("サンプル.md")).toBeTruthy();
    expect(screen.getByRole("status").textContent).toContain(
      "ファイルは1つずつドロップしてください。",
    );
  });

  it("keeps the current document when an unsupported file is dropped", async () => {
    const user = userEvent.setup();
    renderApp();
    await openSample(user);
    fireEvent.drop(window, {
      dataTransfer: {
        dropEffect: "none",
        files: createFileList([readableFile("PDF", "document.pdf")]),
        types: ["Files"],
      },
    });
    expect(screen.getByText("サンプル.md")).toBeTruthy();
    expect((await screen.findByRole("status")).textContent).toContain(
      "対応しているファイル形式は.md、.markdown、.txtです。",
    );
  });

  it("keeps the current document when reading a file fails", async () => {
    const user = userEvent.setup();
    renderApp();
    await openSample(user);
    await user.upload(screen.getByLabelText("ファイルを開く"), unreadableFile("broken.md"));
    expect(screen.getByText("サンプル.md")).toBeTruthy();
    expect((await screen.findByRole("status")).textContent).toContain(
      "ファイルを読み込めませんでした。もう一度選択してください。",
    );
  });
});
