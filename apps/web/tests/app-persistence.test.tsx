import { fireEvent, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { saveDocumentSession } from "../src/document-session";
import { openSample, renderApp, setupAppTests } from "./app-test-utils";

setupAppTests();

describe("App persistence", () => {
  it("preserves form state across React renders", async () => {
    const user = userEvent.setup();
    renderApp();
    await openSample(user);
    const input = await screen.findByLabelText<HTMLInputElement>("作成者");
    fireEvent.input(input, { target: { value: "鈴木花子" } });

    await waitFor(() =>
      expect(screen.getByText(/作成者:/).textContent).toContain("作成者: 鈴木花子"),
    );
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
    await waitFor(() => expect(screen.getByText(/作成者:/).textContent).toContain("復元する名前"));
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

  it("confirms before deleting saved data and keeps the document after deletion", async () => {
    const user = userEvent.setup();
    const firstRender = renderApp();
    await openSample(user);
    await screen.findByLabelText("作成者");
    await new Promise((resolve) => setTimeout(resolve, 600));
    await user.click(screen.getAllByRole("button", { name: "ヘルプ" })[0]);

    const clearDataButton = screen.getByRole<HTMLButtonElement>("button", {
      name: "この端末の保存データを削除",
    });
    await user.click(clearDataButton);
    const confirmation = screen.getByRole("dialog", {
      name: "この端末の保存データを削除しますか？",
    });
    expect(confirmation.textContent).toContain("ファイル名、元ソース、形式、フォーム値");
    expect(confirmation.textContent).toContain("元のローカルファイルは削除されません");
    expect(confirmation.textContent).toContain("オフライン起動用のアプリデータも対象外");
    expect(document.activeElement).toBe(screen.getByRole("button", { name: "キャンセル" }));

    await user.keyboard("{Escape}");
    expect(
      screen.queryByRole("dialog", { name: "この端末の保存データを削除しますか？" }),
    ).toBeNull();
    expect(document.activeElement).toBe(clearDataButton);
    await user.click(clearDataButton);
    await user.click(screen.getByRole("button", { name: /^保存データを削除$/ }));
    expect(screen.getByText("サンプル.md")).toBeTruthy();
    await waitFor(() =>
      expect(screen.getByRole("status").textContent).toContain("保存した文書データを削除しました"),
    );
    firstRender.unmount();
    renderApp();
    expect(await screen.findByRole("heading", { name: "Docfilly文書を開く" })).toBeTruthy();
  });
});
