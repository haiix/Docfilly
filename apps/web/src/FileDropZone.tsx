import { useRef, type ChangeEvent, type DragEvent } from "react";
import { supportedFileDescription } from "./document-file";

interface FileDropZoneProps {
  onFile: (file: File) => void | Promise<void>;
  onValidationError: (message: string) => void;
}

const multipleFilesMessage = "ファイルは1つずつドロップしてください。";

function hasFiles(event: DragEvent<HTMLElement>): boolean {
  return event.dataTransfer.types.includes("Files");
}

export function FileDropZone({ onFile, onValidationError }: FileDropZoneProps) {
  const dropZoneRef = useRef<HTMLDivElement>(null);
  const dragDepth = useRef(0);

  const resetDragState = (): void => {
    dragDepth.current = 0;
    dropZoneRef.current?.classList.remove("is-dragging");
  };

  const handleDragEnter = (event: DragEvent<HTMLDivElement>): void => {
    if (!hasFiles(event)) return;
    event.preventDefault();
    dragDepth.current += 1;
    event.currentTarget.classList.add("is-dragging");
  };

  const handleDragOver = (event: DragEvent<HTMLDivElement>): void => {
    if (!hasFiles(event)) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = "copy";
  };

  const handleDragLeave = (event: DragEvent<HTMLDivElement>): void => {
    if (!hasFiles(event)) return;
    event.preventDefault();
    dragDepth.current = Math.max(0, dragDepth.current - 1);
    if (dragDepth.current === 0) resetDragState();
  };

  const handleDrop = (event: DragEvent<HTMLDivElement>): void => {
    if (!hasFiles(event)) return;
    event.preventDefault();
    resetDragState();

    if (event.dataTransfer.files.length === 0) return;
    if (event.dataTransfer.files.length > 1) {
      onValidationError(multipleFilesMessage);
      return;
    }

    const file = event.dataTransfer.files.item(0);
    if (file !== null) void onFile(file);
  };

  const handleChange = (event: ChangeEvent<HTMLInputElement>): void => {
    const file = event.currentTarget.files?.[0];
    if (file !== undefined) void onFile(file);
    event.currentTarget.value = "";
  };

  return (
    <div
      ref={dropZoneRef}
      className="file-drop-zone"
      aria-label="ファイルのドロップ領域"
      onDragEnter={handleDragEnter}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <p>
        <strong>ファイルをドロップ</strong>
        <span>または</span>
      </p>
      <label className="file-picker">
        <span>ファイルを選択</span>
        <input
          type="file"
          aria-label="ファイルを選択"
          accept=".md,.markdown,.txt,text/markdown,text/plain"
          onChange={handleChange}
        />
      </label>
      <small>{supportedFileDescription}（1ファイル）</small>
    </div>
  );
}
