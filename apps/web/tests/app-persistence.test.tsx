import { fireEvent, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { saveDocumentSession } from "../src/document-session";
import {
  createFileList,
  openSample,
  readableFile,
  renderApp,
  setupAppTests,
} from "./app-test-utils";

setupAppTests();

describe("App persistence", () => {
  it("preserves form state across React renders", async () => {
    const user = userEvent.setup();
    renderApp();
    await openSample(user);
    const input = await screen.findByLabelText<HTMLInputElement>("作成者");
    fireEvent.input(input, { target: { value: "鈴木花子" } });

    await waitFor(() => expect(screen.getByText("鈴木花子", { exact: true })).toBeTruthy());
    expect(screen.getByLabelText("作成者")).toBe(input);
    expect(input.value).toBe("鈴木花子");
    expect(document.querySelectorAll(".docfilly")).toHaveLength(1);
  });

  it("restores the last document and its form values after reopening", async () => {
    const user = userEvent.setup();
    const firstRender = renderApp();
    await openSample(user);
    const input = await screen.findByLabelText<HTMLInputElement>("作成者");
    await user.clear(input);
    await user.type(input, "復元する名前");
    await waitFor(() => expect(screen.getByText("復元する名前", { exact: true })).toBeTruthy());
    await new Promise((resolve) => setTimeout(resolve, 600));
    firstRender.unmount();

    renderApp();
    expect(await screen.findByText("サンプル.md")).toBeTruthy();
    expect(await screen.findByDisplayValue("復元する名前")).toBeTruthy();
    expect(screen.getByRole("status").textContent).toContain("前回の文書を復元しました。");
  });

  it("does not replace a document opened while startup restoration is pending", async () => {
    await saveDocumentSession(
      { name: "previous.txt", source: "Previous", sourceType: "text" },
      new Map(),
    );
    renderApp();
    fireEvent.click(screen.getByRole("button", { name: "サンプルを開く" }));
    expect(await screen.findByText("サンプル.md")).toBeTruthy();
    await waitFor(() => expect(screen.queryByText("previous.txt")).toBeNull());
  });

  it("continues startup restoration while a selected file fails to load", async () => {
    await saveDocumentSession(
      { name: "previous.txt", source: "Previous", sourceType: "text" },
      new Map(),
    );
    let rejectFileRead!: (reason?: unknown) => void;
    const fileRead = new Promise<string>((_resolve, reject) => {
      rejectFileRead = reject;
    });
    const file = new File(["content"], "broken.md", { type: "text/plain" });
    Object.defineProperty(file, "text", { value: () => fileRead });
    renderApp();
    fireEvent.change(screen.getByLabelText("ファイルを開く"), { target: { files: [file] } });

    expect(await screen.findByText("previous.txt")).toBeTruthy();
    rejectFileRead(new Error("read failed"));
    await waitFor(() =>
      expect(screen.getByRole("status").textContent).toContain(
        "ファイルを読み込めませんでした。もう一度選択してください。",
      ),
    );
    await waitFor(() =>
      expect(screen.getByRole("status").textContent).not.toContain("前回の文書を復元しました。"),
    );
    expect(screen.getByText("previous.txt")).toBeTruthy();
    expect(screen.getByText("Previous")).toBeTruthy();
  });

  it("does not overwrite a multiple-file drop error with restoration completion", async () => {
    await saveDocumentSession(
      { name: "previous.txt", source: "Previous", sourceType: "text" },
      new Map(),
    );
    renderApp();
    expect(await screen.findByText("previous.txt")).toBeTruthy();

    const files = [readableFile("first", "first.txt"), readableFile("second", "second.txt")];
    fireEvent.drop(window, {
      dataTransfer: { dropEffect: "none", files: createFileList(files), types: ["Files"] },
    });

    await waitFor(() =>
      expect(screen.getByRole("status").textContent).toContain(
        "ファイルは1つずつドロップしてください。",
      ),
    );
    expect(screen.getByRole("status").textContent).not.toContain("前回の文書を復元しました。");
    expect(screen.getByText("previous.txt")).toBeTruthy();
    expect(screen.getByText("Previous")).toBeTruthy();
  });

  it("closes the document, cancels its pending save, and can open another document", async () => {
    const user = userEvent.setup();
    const firstRender = renderApp();
    await openSample(user);
    const input = await screen.findByLabelText<HTMLInputElement>("作成者");
    await user.clear(input);
    await user.type(input, "閉じる直前の値");
    await user.click(screen.getAllByRole("button", { name: "文書を閉じる" })[0]);

    expect(screen.getByRole("heading", { name: "Docfilly文書を開く" })).toBeTruthy();
    expect(screen.getByText("ファイル未選択")).toBeTruthy();
    await waitFor(() =>
      expect(screen.getByRole("status").textContent).toContain(
        "元のローカルファイルは変更されていません",
      ),
    );
    await new Promise((resolve) => setTimeout(resolve, 600));
    firstRender.unmount();
    renderApp();
    expect(await screen.findByRole("heading", { name: "Docfilly文書を開く" })).toBeTruthy();
    await openSample(user);
    expect(await screen.findByLabelText("作成者")).toBeTruthy();
  });

  it("confirms before resetting app data and closes the document after reset", async () => {
    const user = userEvent.setup();
    const firstRender = renderApp();
    await openSample(user);
    await screen.findByLabelText("作成者");
    await new Promise((resolve) => setTimeout(resolve, 600));
    await user.click(screen.getAllByRole("button", { name: "設定" })[0]);
    await user.selectOptions(screen.getByLabelText("言語"), "ja");
    expect(window.localStorage.getItem("docfilly-web-preferences")).not.toBeNull();

    const resetDataButton = screen.getByRole<HTMLButtonElement>("button", {
      name: "アプリデータをリセット",
    });
    await user.click(resetDataButton);
    const confirmation = screen.getByRole("dialog", {
      name: "アプリデータをリセットしますか？",
    });
    expect(confirmation.textContent).toContain("表示中の文書を閉じ");
    expect(confirmation.textContent).toContain("ユーザー設定");
    expect(confirmation.textContent).toContain("オフライン起動用データを削除");
    expect(confirmation.textContent).toContain("次回の利用にはインターネット接続が必要");
    expect(confirmation.textContent).toContain(
      "インストール済みアプリ自体はアンインストールされません",
    );
    expect(confirmation.textContent).toContain("元のローカルファイルとダウンロード済みファイル");
    expect(document.activeElement).toBe(screen.getByRole("button", { name: "キャンセル" }));

    await user.keyboard("{Escape}");
    expect(screen.queryByRole("dialog", { name: "アプリデータをリセットしますか？" })).toBeNull();
    expect(document.activeElement).toBe(resetDataButton);
    expect(screen.getByText("サンプル.md")).toBeTruthy();
    await user.click(resetDataButton);
    await user.click(screen.getByRole("button", { name: /^アプリデータをリセット$/ }));
    await waitFor(() =>
      expect(screen.getByRole("status").textContent).toContain("アプリデータをリセット"),
    );
    expect(screen.queryByRole("dialog", { name: "設定" })).toBeNull();
    expect(window.localStorage.getItem("docfilly-web-preferences")).toBeNull();
    expect(screen.getByRole("heading", { name: "Docfilly文書を開く" })).toBeTruthy();
    firstRender.unmount();
    renderApp();
    expect(await screen.findByRole("heading", { name: "Docfilly文書を開く" })).toBeTruthy();
  });

  it("warns when app data can only be partially reset", async () => {
    vi.stubGlobal("caches", {
      keys: vi.fn(() => Promise.reject(new Error("cache cleanup failed"))),
      delete: vi.fn(() => Promise.resolve(true)),
    });
    const user = userEvent.setup();
    renderApp();
    await openSample(user);
    await user.click(screen.getAllByRole("button", { name: "設定" })[0]);
    await user.click(screen.getByRole("button", { name: "アプリデータをリセット" }));
    await user.click(screen.getByRole("button", { name: /^アプリデータをリセット$/ }));

    await waitFor(() =>
      expect(screen.getByRole("status").textContent).toContain(
        "アプリデータを完全にはリセットできませんでした",
      ),
    );
    expect(screen.getByRole("status").classList.contains("is-warning")).toBe(true);
    expect(screen.getByRole("heading", { name: "Docfilly文書を開く" })).toBeTruthy();
  });

  it("prevents reset and cancellation actions while app data is being reset", async () => {
    let resolveCacheNames!: (cacheNames: string[]) => void;
    const cacheNames = new Promise<string[]>((resolve) => {
      resolveCacheNames = resolve;
    });
    const keys = vi.fn(() => cacheNames);
    vi.stubGlobal("caches", {
      keys,
      delete: vi.fn(() => Promise.resolve(true)),
    });
    const user = userEvent.setup();
    renderApp();
    await openSample(user);
    await user.click(screen.getAllByRole("button", { name: "設定" })[0]);
    await user.click(screen.getByRole("button", { name: "アプリデータをリセット" }));

    const confirmation = screen.getByRole("dialog", {
      name: "アプリデータをリセットしますか？",
    });
    const confirmButton = screen.getByRole<HTMLButtonElement>("button", {
      name: /^アプリデータをリセット$/,
    });
    await user.click(confirmButton);
    await waitFor(() => expect(keys).toHaveBeenCalledOnce());

    expect(confirmButton.disabled).toBe(true);
    expect(screen.getByRole<HTMLButtonElement>("button", { name: "キャンセル" }).disabled).toBe(
      true,
    );
    expect(
      screen.getByRole<HTMLButtonElement>("button", {
        name: "アプリデータをリセットしますか？を閉じる",
      }).disabled,
    ).toBe(true);
    expect(confirmation.getAttribute("aria-busy")).toBe("true");
    fireEvent.click(confirmButton);
    await user.keyboard("{Escape}");
    expect(screen.getByRole("dialog", { name: "アプリデータをリセットしますか？" })).toBeTruthy();
    expect(keys).toHaveBeenCalledOnce();

    resolveCacheNames([]);
    await waitFor(() =>
      expect(screen.queryByRole("dialog", { name: "アプリデータをリセットしますか？" })).toBeNull(),
    );
    expect(screen.getByRole("status").textContent).toContain("アプリデータをリセット");
  });
});
