import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";
import { App } from "../src/App";

afterEach(cleanup);

function readableFile(source: string, name: string): File {
  const file = new File([source], name, { type: "text/plain" });
  Object.defineProperty(file, "text", { value: () => Promise.resolve(source) });
  return file;
}

describe("App", () => {
  it("shows the sample document and preserves form state across React renders", async () => {
    render(<App />);

    const input = await screen.findByLabelText<HTMLInputElement>("作成者");
    expect(screen.getByText("サンプル.md")).toBeTruthy();
    expect(screen.getByRole("status").textContent).toContain("4個の設定項目を読み込みました。");

    fireEvent.input(input, { target: { value: "鈴木花子" } });

    await waitFor(() =>
      expect(screen.getByText(/作成者:/).textContent).toContain("作成者: 鈴木花子"),
    );
    expect(screen.getByLabelText("作成者")).toBe(input);
    expect(input.value).toBe("鈴木花子");
    expect(document.querySelectorAll(".docfilly")).toHaveLength(1);
  });

  it("loads a selected plain-text file through the React file input", async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.upload(screen.getByLabelText("ファイルを選択"), readableFile("Hello", "notes.txt"));

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

    await user.upload(screen.getByLabelText("ファイルを選択"), readableFile(source, "warning.txt"));

    const status = await screen.findByRole("status");
    await waitFor(() => expect(status.classList.contains("is-warning")).toBe(true));
    expect(status.textContent).toContain("1件の注意点があります");
    expect(status.getAttribute("title")).toBeTruthy();
  });

  it("keeps the current document when multiple files are dropped", async () => {
    render(<App />);
    await screen.findByLabelText("作成者");
    const files = [readableFile("first", "first.txt"), readableFile("second", "second.txt")];

    fireEvent.drop(screen.getByLabelText("ファイルのドロップ領域"), {
      dataTransfer: {
        dropEffect: "none",
        files: { ...files, item: (index: number) => files[index] ?? null, length: files.length },
        types: ["Files"],
      },
    });

    expect(screen.getByText("サンプル.md")).toBeTruthy();
    expect(screen.getByRole("status").textContent).toContain(
      "ファイルは1つずつドロップしてください。",
    );
  });
});
