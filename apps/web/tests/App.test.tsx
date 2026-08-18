import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { App } from "../src/App";

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

  it("shows diagnostics reported by the React wrapper", async () => {
    const user = userEvent.setup();
    render(<App />);
    const source = "#!docfilly\nbroken setting\n---\nBody";

    await user.upload(screen.getByLabelText("ファイルを開く"), readableFile(source, "warning.txt"));

    const status = await screen.findByRole("status");
    await waitFor(() => expect(status.classList.contains("is-warning")).toBe(true));
    expect(status.textContent).toContain("1件の注意点があります");
    expect(status.getAttribute("title")).toBeTruthy();
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
