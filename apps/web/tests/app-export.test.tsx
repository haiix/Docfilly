import { fireEvent, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { openSample, readBlob, readableFile, renderApp, setupAppTests } from "./app-test-utils";

setupAppTests();

describe("App document saving and export", () => {
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
    renderApp();
    await user.upload(
      screen.getByLabelText("ファイルを開く"),
      readableFile(
        ["#!docfilly", "author | 作成者 = 山田太郎", "", "---", "", "作成者: **[[author]]**"].join(
          "\n",
        ),
        "guide.md",
      ),
    );
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
    expect(downloadedName).toBe("guide-output.md");
    expect(downloadedBlob?.type).toBe("text/markdown;charset=utf-8");
    const exportedText = await readBlob(downloadedBlob!);
    expect(exportedText).toContain("作成者: **鈴木花子**");
    expect(exportedText).not.toContain("#!docfilly");
    expect(exportedText).not.toContain("author | 作成者");
    expect(exportedText).not.toContain("[[author]]");
  });

  it("flushes pending text, select, and checkbox changes before exporting", async () => {
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
    renderApp();
    await user.upload(
      screen.getByLabelText("ファイルを開く"),
      readableFile(
        [
          "#!docfilly",
          "name = Before",
          "region = [*east, west]",
          "enabled = [ ]",
          "---",
          "[[name]] / [[region]] / [[enabled]]",
        ].join("\n"),
        "settings.txt",
      ),
    );
    const name = await screen.findByLabelText<HTMLInputElement>("name");
    const region = screen.getByLabelText<HTMLSelectElement>("region");
    const enabled = screen.getByLabelText<HTMLInputElement>("enabled");

    vi.useFakeTimers();
    fireEvent.input(name, { target: { value: "After" } });
    fireEvent.change(region, { target: { value: "west" } });
    fireEvent.click(enabled);
    fireEvent.click(screen.getAllByRole("button", { name: "表示結果を書き出す" })[0]);
    vi.useRealTimers();

    expect(downloadedBlob).toBeDefined();
    await expect(readBlob(downloadedBlob!)).resolves.toBe("After / west / true");
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
    renderApp();
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

  it("saves current values in Docfilly format while preserving the source template", async () => {
    const user = userEvent.setup();
    let downloadedBlob: Blob | undefined;
    let downloadedName: string | undefined;
    vi.stubGlobal("URL", {
      createObjectURL: vi.fn((blob: Blob) => {
        downloadedBlob = blob;
        return "blob:docfilly-export";
      }),
      revokeObjectURL: vi.fn(),
    });
    vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(function (
      this: HTMLAnchorElement,
    ) {
      downloadedName = this.download;
    });
    renderApp();
    const source = [
      "#!docfilly",
      "name = Before",
      "region = [*east, west]",
      "enabled = [ ]",
      "---",
      "# [[name]]",
      "[[#if enabled]]",
      "Region: [[region]]",
      "[[#endif]]",
    ].join("\n");
    await user.upload(
      screen.getByLabelText("ファイルを開く"),
      readableFile(source, "settings.markdown"),
    );

    const nameInput = await screen.findByLabelText<HTMLInputElement>("name");
    await user.clear(nameInput);
    await user.type(nameInput, '彼は "はい" と言った');
    await user.selectOptions(screen.getByLabelText("region"), "west");
    await user.click(screen.getByLabelText("enabled"));
    await waitFor(() => expect(screen.getByText("Region: west")).toBeTruthy());
    await user.click(screen.getAllByRole("button", { name: "Docfilly形式で保存" })[0]);

    expect(downloadedName).toBe("settings.markdown");
    const savedSource = await readBlob(downloadedBlob!);
    expect(savedSource).toContain('name = "彼は ""はい"" と言った"');
    expect(savedSource).toContain("region = [east, *west]");
    expect(savedSource).toContain("enabled = [x]");
    expect(savedSource).toContain("[[#if enabled]]\nRegion: [[region]]\n[[#endif]]");
    expect(screen.getByDisplayValue('彼は "はい" と言った')).toBeTruthy();
  });

  it("does not allow an ordinary document to be saved as Docfilly", async () => {
    const user = userEvent.setup();
    renderApp();
    await user.upload(
      screen.getByLabelText("ファイルを開く"),
      readableFile("ordinary text", "notes.txt"),
    );
    await screen.findByText("notes.txt");
    expect(
      screen.getAllByRole<HTMLButtonElement>("button", { name: "Docfilly形式で保存" })[0].disabled,
    ).toBe(true);
  });

  it("keeps the current values when Docfilly saving fails", async () => {
    const user = userEvent.setup();
    vi.stubGlobal("URL", {
      createObjectURL: vi.fn(() => {
        throw new Error("download failed");
      }),
      revokeObjectURL: vi.fn(),
    });
    renderApp();
    await openSample(user);
    const input = await screen.findByLabelText<HTMLInputElement>("作成者");
    await user.clear(input);
    await user.type(input, "保存失敗後も残る値");
    await user.click(screen.getAllByRole("button", { name: "Docfilly形式で保存" })[0]);
    expect(screen.getByDisplayValue("保存失敗後も残る値")).toBeTruthy();
    expect(screen.getByRole("status").textContent).toContain(
      "Docfilly形式で保存できませんでした。文書とフォーム値は維持されています。",
    );
  });

  it("keeps the current document and reports an export failure", async () => {
    const user = userEvent.setup();
    vi.stubGlobal("URL", {
      createObjectURL: vi.fn(() => {
        throw new Error("download failed");
      }),
      revokeObjectURL: vi.fn(),
    });
    renderApp();
    await openSample(user);
    await user.click(screen.getAllByRole("button", { name: "表示結果を書き出す" })[0]);
    expect(screen.getByText("サンプル.md")).toBeTruthy();
    expect(screen.getByLabelText("作成者")).toBeTruthy();
    expect(screen.getByRole("status").textContent).toContain(
      "表示結果を書き出せませんでした。文書はそのまま表示されています。",
    );
  });
});
