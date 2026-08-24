import { fireEvent, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { renderApp, setupAppTests } from "./app-test-utils";

setupAppTests();

describe("App menus and dialogs", () => {
  it("opens the overflow menu with an accessible icon button and closes outside", async () => {
    const user = userEvent.setup();
    renderApp();
    const overflowButton = screen.getByRole("button", { name: "その他の操作" });

    expect(overflowButton.getAttribute("aria-expanded")).toBe("false");
    expect(overflowButton.textContent).toBe("⋮");
    await user.click(overflowButton);
    expect(overflowButton.getAttribute("aria-expanded")).toBe("true");
    expect(
      within(document.getElementById("toolbar-overflow-menu")!).getByRole("button", {
        name: "ヘルプ",
      }),
    ).toBeTruthy();
    await user.click(screen.getByRole("heading", { name: "Docfilly文書を開く" }));
    expect(overflowButton.getAttribute("aria-expanded")).toBe("false");

    await user.click(overflowButton);
    fireEvent.pointerDown(document.body, { pointerType: "touch" });
    expect(overflowButton.getAttribute("aria-expanded")).toBe("false");
  });

  it("closes the overflow menu with Escape and restores focus to its button", async () => {
    const user = userEvent.setup();
    renderApp();
    const overflowButton = screen.getByRole<HTMLButtonElement>("button", {
      name: "その他の操作",
    });
    overflowButton.focus();
    await user.keyboard("{Enter}");
    expect(overflowButton.getAttribute("aria-expanded")).toBe("true");
    await user.keyboard("{Escape}");
    expect(overflowButton.getAttribute("aria-expanded")).toBe("false");
    expect(document.activeElement).toBe(overflowButton);
  });

  it("closes the overflow menu before opening help and restores focus after the dialog", async () => {
    const user = userEvent.setup();
    renderApp();
    const overflowButton = screen.getByRole<HTMLButtonElement>("button", {
      name: "その他の操作",
    });
    await user.click(overflowButton);
    await user.click(
      within(document.getElementById("toolbar-overflow-menu")!).getByRole("button", {
        name: "ヘルプ",
      }),
    );
    expect(overflowButton.getAttribute("aria-expanded")).toBe("false");
    expect(screen.getByRole("dialog", { name: "Docfillyの使い方" })).toBeTruthy();
    await user.keyboard("{Escape}");
    expect(document.activeElement).toBe(overflowButton);
  });

  it("opens the help dialog, supports keyboard closing, and restores focus", async () => {
    const user = userEvent.setup();
    renderApp();
    const helpButton = screen.getAllByRole<HTMLButtonElement>("button", { name: "ヘルプ" })[0];
    helpButton.focus();
    await user.keyboard("{Enter}");

    const dialog = screen.getByRole("dialog", { name: "Docfillyの使い方" });
    expect(
      within(dialog)
        .getAllByRole("heading", { level: 3 })
        .map((heading) => heading.textContent),
    ).toEqual([
      "Docfillyとは？",
      "サンプルと詳細仕様",
      "文書を開く",
      "フォームと表示内容",
      "Docfilly形式で保存",
      "表示結果を書き出す",
      "プライバシーと端末内の保存",
    ]);
    const introduction = screen.getByRole("heading", { name: "Docfillyとは？" }).parentElement!;
    const form = screen.getByRole("heading", { name: "フォームと表示内容" }).parentElement!;
    const save = screen.getByRole("heading", { name: "Docfilly形式で保存" }).parentElement!;
    const exportResult = screen.getByRole("heading", {
      name: "表示結果を書き出す",
    }).parentElement!;
    const privacy = screen.getByRole("heading", {
      name: "プライバシーと端末内の保存",
    }).parentElement!;
    expect(introduction.textContent).toContain("書き手があらかじめDocfilly形式に沿って");
    expect(introduction.textContent).toContain("書き手の設定に基づくフォーム");
    expect(introduction.textContent).toContain("手順の内容そのものに集中できます");
    expect(form.textContent).toContain(
      "通常のMarkdown／テキスト文書にはフォームがなく、内容がそのまま表示",
    );
    expect(introduction.textContent).not.toContain("外部サーバー");
    expect(dialog.textContent).toContain("書き手が文書内に定義した入力項目をもとに生成");
    expect(dialog.textContent).toContain("ドラッグ＆ドロップ");
    expect(save.textContent).toContain("現在のフォーム値を次回開いたときの初期値");
    expect(save.textContent).toContain("通常のMarkdown／テキスト文書では利用できません");
    expect(exportResult.textContent).toContain("現在のフォーム値を反映した本文だけを保存");
    expect(exportResult.textContent).toContain("内容を変更せずに保存");
    expect(privacy.textContent).toContain(
      "ブラウザー内だけで処理され、外部サーバーへ送信されません",
    );
    expect(dialog.textContent).toContain("最後に開いた1文書");
    expect(dialog.textContent).toContain("インストールとオフライン起動には未対応");
    const sampleButton = screen.getByRole("button", { name: "サンプル文書を開く" });
    expect(sampleButton.parentElement?.classList.contains("help-actions")).toBe(true);
    const specificationLink = screen.getByRole("link", {
      name: "詳細なDocfillyフォーマット仕様",
    });
    expect(specificationLink.parentElement).toBe(sampleButton.parentElement);
    expect(specificationLink.getAttribute("target")).toBe("_blank");
    expect(specificationLink.getAttribute("rel")).toBe("noopener noreferrer");
    expect(document.activeElement).toBe(screen.getByRole("heading", { name: "Docfillyの使い方" }));

    await user.keyboard("{Escape}");
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(document.activeElement).toBe(helpButton);
  });

  it("keeps tab focus inside the help dialog and opens its sample", async () => {
    const user = userEvent.setup();
    renderApp();
    await user.click(screen.getAllByRole("button", { name: "ヘルプ" })[0]);
    await user.keyboard("{Shift>}{Tab}{/Shift}");
    expect(document.activeElement).toBe(
      screen.getByRole("button", { name: "この端末の保存データを削除" }),
    );
    await user.keyboard("{Tab}");
    expect(document.activeElement).toBe(
      screen.getByRole("button", { name: "Docfillyの使い方を閉じる" }),
    );
    await user.click(screen.getByRole("button", { name: "サンプル文書を開く" }));
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(await screen.findByLabelText("作成者")).toBeTruthy();
  });
});
