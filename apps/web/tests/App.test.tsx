import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { IDBFactory as FDBFactory } from "fake-indexeddb";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { App } from "../src/App";
import { saveDocumentSession } from "../src/document-session";

beforeEach(() => {
  vi.stubGlobal("indexedDB", new FDBFactory());
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

function readBlob(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.addEventListener("load", () => {
      if (typeof reader.result === "string") {
        resolve(reader.result);
      } else {
        reject(new Error("Blobをテキストとして読み取れませんでした。"));
      }
    });
    reader.addEventListener("error", () =>
      reject(reader.error ?? new Error("Blobの読み取りに失敗しました。")),
    );
    reader.readAsText(blob);
  });
}

function readableFile(source: string, name: string): File {
  const file = new File([source], name, { type: "text/plain" });
  Object.defineProperty(file, "text", { value: () => Promise.resolve(source) });
  return file;
}

function unreadableFile(name: string): File {
  const file = new File(["content"], name, { type: "text/plain" });
  Object.defineProperty(file, "text", { value: () => Promise.reject(new Error("read failed")) });
  return file;
}

function createFileList(files: File[]): FileList {
  return {
    ...files,
    item: (index: number) => files[index] ?? null,
    length: files.length,
  };
}

describe("App", () => {
  it("starts empty and opens the sample only when requested", async () => {
    const user = userEvent.setup();
    render(<App />);

    expect(screen.getByRole("heading", { name: "Docfilly文書を開く" })).toBeTruthy();
    expect(screen.getByText("ファイル未選択")).toBeTruthy();
    expect(screen.queryByLabelText("作成者")).toBeNull();

    await user.click(screen.getByRole("button", { name: "サンプルを開く" }));

    expect(await screen.findByLabelText("作成者")).toBeTruthy();
    expect(screen.getByText("サンプル.md")).toBeTruthy();
  });

  it("preserves form state across React renders", async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole("button", { name: "サンプルを開く" }));
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
    const firstRender = render(<App />);
    await user.click(screen.getByRole("button", { name: "サンプルを開く" }));
    const input = await screen.findByLabelText<HTMLInputElement>("作成者");
    await user.clear(input);
    await user.type(input, "復元する名前");
    await waitFor(() => expect(screen.getByText(/作成者:/).textContent).toContain("復元する名前"));
    await new Promise((resolve) => setTimeout(resolve, 600));
    firstRender.unmount();

    render(<App />);

    expect(await screen.findByText("サンプル.md")).toBeTruthy();
    expect(await screen.findByDisplayValue("復元する名前")).toBeTruthy();
    expect(screen.getByRole("status").textContent).toContain("前回の文書を復元しました。");
  });

  it("does not replace a document opened while startup restoration is pending", async () => {
    await saveDocumentSession(
      { name: "previous.txt", source: "Previous", sourceType: "text" },
      new Map(),
    );
    render(<App />);

    fireEvent.click(screen.getByRole("button", { name: "サンプルを開く" }));

    expect(await screen.findByText("サンプル.md")).toBeTruthy();
    await waitFor(() => expect(screen.queryByText("previous.txt")).toBeNull());
  });

  it("deletes locally saved data without closing the current document", async () => {
    const user = userEvent.setup();
    const firstRender = render(<App />);
    await user.click(screen.getByRole("button", { name: "サンプルを開く" }));
    await screen.findByLabelText("作成者");
    await new Promise((resolve) => setTimeout(resolve, 600));
    await user.click(screen.getAllByRole("button", { name: "ヘルプ" })[0]);

    await user.click(screen.getByRole("button", { name: "この端末の保存データを削除" }));

    expect(screen.getByText("サンプル.md")).toBeTruthy();
    await waitFor(() =>
      expect(screen.getByRole("status").textContent).toContain("保存した文書データを削除しました"),
    );
    firstRender.unmount();
    render(<App />);
    expect(await screen.findByRole("heading", { name: "Docfilly文書を開く" })).toBeTruthy();
  });

  it("exports the latest rendered output without the Docfilly header", async () => {
    const user = userEvent.setup();
    let downloadedBlob: Blob | undefined;
    let downloadedName: string | undefined;
    vi.stubGlobal("URL", {
      createObjectURL: vi.fn((blob: Blob) => {
        downloadedBlob = blob;
        return "blob:document-export";
      }),
      revokeObjectURL: vi.fn(),
    });
    vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(function (
      this: HTMLAnchorElement,
    ) {
      downloadedName = this.download;
    });
    render(<App />);
    await user.click(screen.getByRole("button", { name: "サンプルを開く" }));
    const input = await screen.findByLabelText<HTMLInputElement>("作成者");

    await user.clear(input);
    await user.type(input, "鈴木花子");
    await waitFor(() =>
      expect(screen.getByText(/作成者:/).textContent).toContain("作成者: 鈴木花子"),
    );
    const exportButton = screen.getAllByRole<HTMLButtonElement>("button", {
      name: "表示結果を書き出す",
    })[0];
    exportButton.focus();
    await user.keyboard("{Enter}");

    expect(document.activeElement).toBe(exportButton);
    expect(downloadedName).toBe("サンプル-output.md");
    expect(downloadedBlob?.type).toBe("text/markdown;charset=utf-8");
    const exportedText = await readBlob(downloadedBlob!);
    expect(exportedText).toContain("作成者: **鈴木花子**");
    expect(exportedText).not.toContain("#!docfilly");
    expect(exportedText).not.toContain("author | 作成者");
    expect(exportedText).not.toContain("[[author]]");
  });

  it("exports an ordinary text document without changing its content", async () => {
    const user = userEvent.setup();
    let downloadedBlob: Blob | undefined;
    vi.stubGlobal("URL", {
      createObjectURL: vi.fn((blob: Blob) => {
        downloadedBlob = blob;
        return "blob:document-export";
      }),
      revokeObjectURL: vi.fn(),
    });
    vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => undefined);
    render(<App />);

    await user.upload(
      screen.getByLabelText("ファイルを開く"),
      readableFile("first\nsecond", "notes.txt"),
    );
    await screen.findByText("notes.txt");
    await waitFor(() =>
      expect(
        screen.getAllByRole<HTMLButtonElement>("button", {
          name: "表示結果を書き出す",
        })[0].disabled,
      ).toBe(false),
    );
    await user.click(screen.getAllByRole("button", { name: "表示結果を書き出す" })[0]);

    await expect(readBlob(downloadedBlob!)).resolves.toBe("first\nsecond");
  });

  it("keeps the current document and reports an export failure", async () => {
    const user = userEvent.setup();
    vi.stubGlobal("URL", {
      createObjectURL: vi.fn(() => {
        throw new Error("download failed");
      }),
      revokeObjectURL: vi.fn(),
    });
    render(<App />);
    await user.click(screen.getByRole("button", { name: "サンプルを開く" }));
    await screen.findByLabelText("作成者");

    await user.click(screen.getAllByRole("button", { name: "表示結果を書き出す" })[0]);

    expect(screen.getByText("サンプル.md")).toBeTruthy();
    expect(screen.getByLabelText("作成者")).toBeTruthy();
    expect(screen.getByRole("status").textContent).toContain(
      "表示結果を書き出せませんでした。文書はそのまま表示されています。",
    );
  });

  it("loads a selected plain-text file through the toolbar file input", async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.upload(screen.getByLabelText("ファイルを開く"), readableFile("Hello", "notes.txt"));

    expect(await screen.findByText("notes.txt")).toBeTruthy();
    expect(screen.getByRole("status").textContent).toContain(
      "#!docfilly識別子がないため、通常のテキストとして表示しています。",
    );
    expect(screen.getByText("Hello")).toBeTruthy();
  });

  it("lists every diagnostic separately from app notifications", async () => {
    const user = userEvent.setup();
    render(<App />);
    const source = "#!docfilly\nbroken setting\nalso broken\n---\nBody";

    await user.upload(screen.getByLabelText("ファイルを開く"), readableFile(source, "warning.txt"));

    const status = await screen.findByRole("status");
    await waitFor(() => expect(status.textContent).toContain("文書に2件の診断があります"));
    expect(status.classList.contains("is-warning")).toBe(false);
    expect(status.getAttribute("title")).toBeNull();

    await user.click(screen.getAllByRole("button", { name: "診断 2件" })[0]);

    const dialog = screen.getByRole("dialog", { name: "文書の診断（2件）" });
    expect(dialog.textContent).toContain("2行目は「=」がないため");
    expect(dialog.textContent).toContain("3行目は「=」がないため");
    expect(dialog.textContent).toContain("broken setting");
    expect(dialog.textContent).toContain("also broken");
    expect(screen.getByText("Body")).toBeTruthy();
  });

  it("opens the help dialog, supports keyboard closing, and restores focus", async () => {
    const user = userEvent.setup();
    render(<App />);
    const helpButton = screen.getAllByRole<HTMLButtonElement>("button", { name: "ヘルプ" })[0];

    helpButton.focus();
    await user.keyboard("{Enter}");

    const dialog = screen.getByRole("dialog", { name: "Docfillyの使い方" });
    expect(dialog.textContent).toContain("ドラッグ＆ドロップ");
    expect(dialog.textContent).toContain("Docfilly形式での保存は、現在のWebビューアーでは未対応");
    expect(dialog.textContent).toContain("外部サーバーへ送信されず");
    expect(dialog.textContent).toContain("最後に開いた1文書");
    expect(screen.getByRole("link", { name: "詳細なDocfillyフォーマット仕様" })).toBeTruthy();
    expect(document.activeElement).toBe(screen.getByRole("heading", { name: "Docfillyの使い方" }));

    await user.keyboard("{Escape}");

    expect(screen.queryByRole("dialog")).toBeNull();
    expect(document.activeElement).toBe(helpButton);
  });

  it("keeps tab focus inside the help dialog and opens its sample", async () => {
    const user = userEvent.setup();
    render(<App />);
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

  it("keeps the current document when multiple files are dropped", async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole("button", { name: "サンプルを開く" }));
    await screen.findByLabelText("作成者");
    const files = [readableFile("first", "first.txt"), readableFile("second", "second.txt")];

    fireEvent.drop(window, {
      dataTransfer: {
        dropEffect: "none",
        files: createFileList(files),
        types: ["Files"],
      },
    });

    expect(screen.getByText("サンプル.md")).toBeTruthy();
    expect(screen.getByRole("status").textContent).toContain(
      "ファイルは1つずつドロップしてください。",
    );
  });

  it("keeps the current document when an unsupported file is dropped", async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole("button", { name: "サンプルを開く" }));
    await screen.findByLabelText("作成者");
    const file = readableFile("PDF", "document.pdf");

    fireEvent.drop(window, {
      dataTransfer: {
        dropEffect: "none",
        files: createFileList([file]),
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
    render(<App />);
    await user.click(screen.getByRole("button", { name: "サンプルを開く" }));
    await screen.findByLabelText("作成者");

    await user.upload(screen.getByLabelText("ファイルを開く"), unreadableFile("broken.md"));

    expect(screen.getByText("サンプル.md")).toBeTruthy();
    expect((await screen.findByRole("status")).textContent).toContain(
      "ファイルを読み込めませんでした。もう一度選択してください。",
    );
  });
});
