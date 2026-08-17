import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { FileDropZone } from "../src/FileDropZone";

afterEach(cleanup);

function createFileList(files: File[]): FileList {
  return {
    ...files,
    item: (index: number) => files[index] ?? null,
    length: files.length,
  };
}

function dataTransfer(files: File[]) {
  return {
    dropEffect: "none",
    files: createFileList(files),
    types: ["Files"],
  };
}

describe("FileDropZone", () => {
  it("shows drag state until the pointer leaves the complete drop zone", () => {
    render(<FileDropZone onFile={vi.fn()} onValidationError={vi.fn()} />);
    const dropZone = screen.getByLabelText("ファイルのドロップ領域");
    const transfer = dataTransfer([new File(["content"], "document.md")]);

    fireEvent.dragEnter(dropZone, { dataTransfer: transfer });
    fireEvent.dragEnter(dropZone, { dataTransfer: transfer });
    fireEvent.dragLeave(dropZone, { dataTransfer: transfer });
    expect(dropZone.classList.contains("is-dragging")).toBe(true);

    fireEvent.dragLeave(dropZone, { dataTransfer: transfer });
    expect(dropZone.classList.contains("is-dragging")).toBe(false);
  });

  it("passes a single dropped file to the callback", () => {
    const onFile = vi.fn();
    render(<FileDropZone onFile={onFile} onValidationError={vi.fn()} />);
    const file = new File(["content"], "document.md");

    fireEvent.drop(screen.getByLabelText("ファイルのドロップ領域"), {
      dataTransfer: dataTransfer([file]),
    });

    expect(onFile).toHaveBeenCalledWith(file);
  });

  it("rejects multiple dropped files", () => {
    const onFile = vi.fn();
    const onValidationError = vi.fn();
    render(<FileDropZone onFile={onFile} onValidationError={onValidationError} />);

    fireEvent.drop(screen.getByLabelText("ファイルのドロップ領域"), {
      dataTransfer: dataTransfer([new File(["a"], "a.md"), new File(["b"], "b.md")]),
    });

    expect(onFile).not.toHaveBeenCalled();
    expect(onValidationError).toHaveBeenCalledWith("ファイルは1つずつドロップしてください。");
  });
});
