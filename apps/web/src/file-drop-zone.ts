export interface FileDropZoneOptions {
  onFile: (file: File) => void;
  onValidationError: (message: string) => void;
}

const multipleFilesMessage = "ファイルは1つずつドロップしてください。";

function hasFiles(event: DragEvent): boolean {
  return event.dataTransfer?.types.includes("Files") ?? false;
}

/**
 * Adds file drag-and-drop behavior to an element.
 *
 * @param dropZone - The element that accepts a dropped file.
 * @param options - File and validation callbacks.
 * @returns A function that removes all registered event listeners.
 */
export function setupFileDropZone(
  dropZone: HTMLElement,
  { onFile, onValidationError }: FileDropZoneOptions,
): () => void {
  let dragDepth = 0;

  const resetDragState = (): void => {
    dragDepth = 0;
    dropZone.classList.remove("is-dragging");
  };

  const handleDragEnter = (event: DragEvent): void => {
    if (!hasFiles(event)) return;
    event.preventDefault();
    dragDepth += 1;
    dropZone.classList.add("is-dragging");
  };

  const handleDragOver = (event: DragEvent): void => {
    if (!hasFiles(event)) return;
    event.preventDefault();
    if (event.dataTransfer) event.dataTransfer.dropEffect = "copy";
  };

  const handleDragLeave = (event: DragEvent): void => {
    if (!hasFiles(event)) return;
    event.preventDefault();
    dragDepth = Math.max(0, dragDepth - 1);
    if (dragDepth === 0) resetDragState();
  };

  const handleDrop = (event: DragEvent): void => {
    if (!hasFiles(event)) return;
    event.preventDefault();
    const files = event.dataTransfer?.files;
    resetDragState();

    if (!files || files.length === 0) return;
    if (files.length > 1) {
      onValidationError(multipleFilesMessage);
      return;
    }

    const file = files.item(0);
    if (file) onFile(file);
  };

  dropZone.addEventListener("dragenter", handleDragEnter);
  dropZone.addEventListener("dragover", handleDragOver);
  dropZone.addEventListener("dragleave", handleDragLeave);
  dropZone.addEventListener("drop", handleDrop);

  return () => {
    dropZone.removeEventListener("dragenter", handleDragEnter);
    dropZone.removeEventListener("dragover", handleDragOver);
    dropZone.removeEventListener("dragleave", handleDragLeave);
    dropZone.removeEventListener("drop", handleDrop);
  };
}
