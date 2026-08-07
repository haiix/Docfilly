import { describe, expect, it, vi } from "vitest";
import { setupFileDropZone } from "../src/file-drop-zone";

function createFileList(files: File[]): FileList {
  return {
    ...files,
    item: (index: number) => files[index] ?? null,
    length: files.length,
  };
}

function createDragEvent(type: string, files: File[]): DragEvent {
  const event = new Event(type, { bubbles: true, cancelable: true }) as DragEvent;
  Object.defineProperty(event, "dataTransfer", {
    value: {
      dropEffect: "none",
      files: createFileList(files),
      types: ["Files"],
    },
  });
  return event;
}

describe("file drop zone", () => {
  it("shows drag state until the pointer leaves the complete drop zone", () => {
    const dropZone = document.createElement("div");
    setupFileDropZone(dropZone, {
      onFile: vi.fn(),
      onValidationError: vi.fn(),
    });
    const file = new File(["content"], "document.md");

    dropZone.dispatchEvent(createDragEvent("dragenter", [file]));
    dropZone.dispatchEvent(createDragEvent("dragenter", [file]));
    dropZone.dispatchEvent(createDragEvent("dragleave", [file]));
    expect(dropZone.classList.contains("is-dragging")).toBe(true);

    dropZone.dispatchEvent(createDragEvent("dragleave", [file]));
    expect(dropZone.classList.contains("is-dragging")).toBe(false);
  });

  it("passes a single dropped file to the callback", () => {
    const dropZone = document.createElement("div");
    const onFile = vi.fn();
    setupFileDropZone(dropZone, {
      onFile,
      onValidationError: vi.fn(),
    });
    const file = new File(["content"], "document.md");

    const event = createDragEvent("drop", [file]);
    dropZone.dispatchEvent(event);

    expect(event.defaultPrevented).toBe(true);
    expect(onFile).toHaveBeenCalledWith(file);
  });

  it("rejects multiple dropped files", () => {
    const dropZone = document.createElement("div");
    const onFile = vi.fn();
    const onValidationError = vi.fn();
    setupFileDropZone(dropZone, { onFile, onValidationError });

    dropZone.dispatchEvent(
      createDragEvent("drop", [new File(["a"], "a.md"), new File(["b"], "b.md")]),
    );

    expect(onFile).not.toHaveBeenCalled();
    expect(onValidationError).toHaveBeenCalledWith("ファイルは1つずつドロップしてください。");
  });
});
