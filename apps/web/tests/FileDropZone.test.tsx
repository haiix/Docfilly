import { createRef } from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { FileDropZone } from "../src/FileDropZone";
import { webMessages } from "../src/locale";

afterEach(cleanup);

function createFileList(files: File[]): FileList {
  return {
    ...files,
    item: (index: number) => files[index] ?? null,
    length: files.length,
  };
}

function dataTransfer(files: File[], types = ["Files"]): DataTransfer {
  return {
    dropEffect: "none",
    files: createFileList(files),
    types,
  } as unknown as DataTransfer;
}

function renderDropZone(onFile = vi.fn(), onValidationError = vi.fn()) {
  return render(
    <FileDropZone
      inputRef={createRef<HTMLInputElement>()}
      onFile={onFile}
      onValidationError={onValidationError}
      messages={webMessages.ja}
    />,
  );
}

describe("FileDropZone", () => {
  it("shows the full-screen overlay only while a file is dragged over the window", () => {
    renderDropZone();
    const overlay = document.querySelector(".drop-overlay");
    const transfer = dataTransfer([new File(["content"], "document.md")]);

    expect(overlay?.classList.contains("is-visible")).toBe(false);
    fireEvent.dragEnter(window, { dataTransfer: transfer });
    expect(overlay?.classList.contains("is-visible")).toBe(true);

    fireEvent.dragLeave(window, { dataTransfer: transfer });
    expect(overlay?.classList.contains("is-visible")).toBe(false);
  });

  it("ignores drags that do not contain files", () => {
    renderDropZone();
    const overlay = document.querySelector(".drop-overlay");

    fireEvent.dragEnter(window, { dataTransfer: dataTransfer([], ["text/plain"]) });

    expect(overlay?.classList.contains("is-visible")).toBe(false);
  });

  it("prevents navigation and passes a single file dropped anywhere to the callback", () => {
    const onFile = vi.fn();
    renderDropZone(onFile);
    const file = new File(["content"], "document.md");
    const event = new Event("drop", { bubbles: true, cancelable: true });
    Object.defineProperty(event, "dataTransfer", { value: dataTransfer([file]) });

    window.dispatchEvent(event);

    expect(event.defaultPrevented).toBe(true);
    expect(onFile).toHaveBeenCalledWith(file);
  });

  it("rejects multiple dropped files", () => {
    const onFile = vi.fn();
    const onValidationError = vi.fn();
    renderDropZone(onFile, onValidationError);

    fireEvent.drop(window, {
      dataTransfer: dataTransfer([new File(["a"], "a.md"), new File(["b"], "b.md")]),
    });

    expect(onFile).not.toHaveBeenCalled();
    expect(onValidationError).toHaveBeenCalledWith("ファイルは1つずつドロップしてください。");
  });

  it("keeps a keyboard-accessible file input", () => {
    renderDropZone();

    const input = screen.getByLabelText("ファイルを開く");
    expect(input.getAttribute("type")).toBe("file");
    expect(input.getAttribute("accept")).toBe(".md,.markdown,.txt,text/markdown,text/plain");
  });
});
