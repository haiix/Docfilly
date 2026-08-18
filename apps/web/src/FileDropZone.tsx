import { useEffect, useRef, useState, type ChangeEvent, type RefObject } from "react";
import { supportedFileDescription } from "./document-file";

interface FileDropZoneProps {
  inputRef: RefObject<HTMLInputElement | null>;
  onFile: (file: File) => void | Promise<void>;
  onValidationError: (message: string) => void;
}

const multipleFilesMessage = "ファイルは1つずつドロップしてください。";

function hasFiles(dataTransfer: DataTransfer | null): boolean {
  return dataTransfer !== null && Array.from(dataTransfer.types).includes("Files");
}

export function FileDropZone({ inputRef, onFile, onValidationError }: FileDropZoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const dragDepth = useRef(0);

  useEffect(() => {
    const resetDragState = (): void => {
      dragDepth.current = 0;
      setIsDragging(false);
    };

    const handleDragEnter = (event: DragEvent): void => {
      if (!hasFiles(event.dataTransfer)) return;
      event.preventDefault();
      dragDepth.current += 1;
      setIsDragging(true);
    };

    const handleDragOver = (event: DragEvent): void => {
      if (!hasFiles(event.dataTransfer)) return;
      event.preventDefault();
      if (event.dataTransfer !== null) event.dataTransfer.dropEffect = "copy";
    };

    const handleDragLeave = (event: DragEvent): void => {
      if (!hasFiles(event.dataTransfer)) return;
      event.preventDefault();
      dragDepth.current = Math.max(0, dragDepth.current - 1);
      if (dragDepth.current === 0 || event.relatedTarget === null) resetDragState();
    };

    const handleDrop = (event: DragEvent): void => {
      if (!hasFiles(event.dataTransfer)) return;
      event.preventDefault();
      resetDragState();

      const files = event.dataTransfer?.files;
      if (files === undefined || files.length === 0) return;
      if (files.length > 1) {
        onValidationError(multipleFilesMessage);
        return;
      }

      const file = files.item(0);
      if (file !== null) void onFile(file);
    };

    window.addEventListener("dragenter", handleDragEnter);
    window.addEventListener("dragover", handleDragOver);
    window.addEventListener("dragleave", handleDragLeave);
    window.addEventListener("drop", handleDrop);
    return () => {
      window.removeEventListener("dragenter", handleDragEnter);
      window.removeEventListener("dragover", handleDragOver);
      window.removeEventListener("dragleave", handleDragLeave);
      window.removeEventListener("drop", handleDrop);
    };
  }, [onFile, onValidationError]);

  const handleChange = (event: ChangeEvent<HTMLInputElement>): void => {
    const file = event.currentTarget.files?.[0];
    if (file !== undefined) void onFile(file);
    event.currentTarget.value = "";
  };

  return (
    <>
      <label className="toolbar-button file-picker">
        <span>開く</span>
        <input
          ref={inputRef}
          type="file"
          aria-label="ファイルを開く"
          accept=".md,.markdown,.txt,text/markdown,text/plain"
          onChange={handleChange}
        />
      </label>
      <div
        className={`drop-overlay${isDragging ? " is-visible" : ""}`}
        aria-label="ファイルのドロップ領域"
        aria-hidden={!isDragging}
      >
        <div className="drop-overlay__message">
          <strong>ここにファイルをドロップ</strong>
          <span>{supportedFileDescription}（1ファイル）</span>
        </div>
      </div>
    </>
  );
}
