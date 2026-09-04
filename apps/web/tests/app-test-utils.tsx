import { cleanup, render, screen } from "@testing-library/react";
import type { UserEvent } from "@testing-library/user-event";
import { IDBFactory as FDBFactory } from "fake-indexeddb";
import { afterEach, beforeEach, vi } from "vitest";
import { App } from "../src/App";

export function setupAppTests(): void {
  beforeEach(() => {
    window.localStorage.clear();
    vi.stubGlobal("indexedDB", new FDBFactory());
    vi.spyOn(window.navigator, "languages", "get").mockReturnValue(["ja-JP"]);
    vi.spyOn(window.navigator, "language", "get").mockReturnValue("ja-JP");
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });
}

export function renderApp() {
  return render(<App />);
}

export async function openSample(user: UserEvent): Promise<void> {
  await user.click(screen.getByRole("button", { name: "サンプルを開く" }));
  await screen.findByText("サンプル.md");
}

export function readBlob(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.addEventListener("load", () => {
      if (typeof reader.result === "string") {
        resolve(reader.result);
      } else {
        reject(new Error("The Blob could not be read as text."));
      }
    });
    reader.addEventListener("error", () =>
      reject(reader.error ?? new Error("Reading the Blob failed.")),
    );
    reader.readAsText(blob);
  });
}

export function readableFile(source: string, name: string): File {
  const file = new File([source], name, { type: "text/plain" });
  Object.defineProperty(file, "text", { value: () => Promise.resolve(source) });
  return file;
}

export function unreadableFile(name: string): File {
  const file = new File(["content"], name, { type: "text/plain" });
  Object.defineProperty(file, "text", { value: () => Promise.reject(new Error("read failed")) });
  return file;
}

export function createFileList(files: File[]): FileList {
  return {
    ...files,
    item: (index: number) => files[index] ?? null,
    length: files.length,
  };
}
